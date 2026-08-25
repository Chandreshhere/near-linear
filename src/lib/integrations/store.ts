"use client";

/**
 * Integrations state + the inbound-message pipeline (Phase 15 — FRONTEND
 * ONLY, MASTER_PROMPT §22 spirit: real writes, honest seams).
 *
 * A MobX store mirrored to localStorage under "integrations": which chat
 * workspaces are connected (simulated OAuth), the routing rules that decide
 * which Linear team a channel's tasks land in, and a capped log of every
 * inbound message with its outcome.
 *
 * `ingest()` IS the production pipeline: it resolves connection → channel →
 * rule → trigger, extracts a task from the message text and creates a REAL
 * issue through `client.mutate.createIssue` — the same optimistic transaction
 * queue every other write in the app uses. The ONLY missing piece is the
 * webhook receiver that would call it from a provider event; its contract is
 * documented in src/app/api/integrations/inbound/route.ts (dev mock) and the
 * message simulator on the settings page drives this function with the exact
 * payload shape that receiver accepts.
 *
 * SSR-safe: nothing touches the browser at module scope or in the
 * constructor; `hydrate()` runs from a client effect (`useIntegrations`).
 */

import { makeObservable, observable, runInAction } from "mobx";
import { useEffect, useState } from "react";
import type { SyncClient } from "@/lib/data/SyncClient";
import type { IssueData, Priority, UUID } from "@/lib/data/types";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";

/* ================================================================
 * Shapes (this is the localStorage row shape too)
 * ================================================================ */

export type IntegrationProvider = "slack" | "msteams";

export interface IntegrationChannel {
  id: string;
  name: string;
}

export interface IntegrationConnection {
  id: string;
  provider: IntegrationProvider;
  /** Provider-side workspace/tenant name entered in the OAuth dialog. */
  workspaceName: string;
  connectedAt: string;
  status: "connected" | "disconnected";
  channels: IntegrationChannel[];
}

/**
 * Trigger vocabulary:
 *   mention — only messages mentioning the bot ("@linear", case-insensitive)
 *   command — only messages starting with "/task"
 *   all     — every message in the channel
 */
export type TriggerMode = "mention" | "command" | "all";

export interface RoutingRule {
  id: string;
  connectionId: string;
  /** A concrete channel id, or "*" = any channel of the connection. */
  channelId: string | "*";
  teamId: string;
  defaultPriority?: number;
  defaultLabelIds?: string[];
  triggerMode: TriggerMode;
}

export type InboundOutcome =
  | { kind: "created"; issueId: string; identifier: string }
  | { kind: "ignored"; reason: string };

export interface InboundMessage {
  id: string;
  connectionId: string;
  channelId: string;
  author: string;
  text: string;
  receivedAt: string;
  outcome: InboundOutcome;
}

/**
 * The payload `ingest()` accepts — the same fields the webhook receiver
 * (POST /api/integrations/inbound) validates, with the connection already
 * resolved from (provider, workspaceName) by the caller.
 */
export interface IngestInput {
  connectionId: string;
  channelId: string;
  author: string;
  text: string;
}

export const INTEGRATIONS_STORAGE_KEY = "integrations";
/** Activity log cap — oldest entries fall off. */
export const INBOUND_LOG_LIMIT = 100;

export const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  slack: "Slack",
  msteams: "Microsoft Teams",
};

/** Simulated OAuth seeds these channels per provider (plausible defaults). */
const SEED_CHANNELS: Record<IntegrationProvider, IntegrationChannel[]> = {
  slack: [
    { id: "sl-general", name: "general" },
    { id: "sl-eng", name: "eng" },
    { id: "sl-support", name: "support" },
    { id: "sl-bugs", name: "bugs" },
  ],
  msteams: [
    { id: "mst-general", name: "General" },
    { id: "mst-engineering", name: "Engineering" },
    { id: "mst-support", name: "Support" },
  ],
};

function newId(prefix: string): string {
  const c = globalThis.crypto;
  const id =
    typeof c?.randomUUID === "function"
      ? c.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${id}`;
}

/* ================================================================
 * Message → task extraction (mirrors LocalAgentAdapter's parsing —
 * src/lib/agent/engine.ts — trimmed to the inbound-message dialect)
 * ================================================================ */

const PRIORITY_WORDS: Record<string, Priority> = {
  urgent: 1,
  critical: 1,
  p0: 1,
  high: 2,
  p1: 2,
  medium: 3,
  normal: 3,
  p2: 3,
  low: 4,
  p3: 4,
  none: 0,
  no: 0,
};

/** "high priority" / "priority: high" / "priority is urgent" forms. */
const PRIORITY_BEFORE_RE =
  /\b(urgent|critical|high|medium|normal|low|no|none|p0|p1|p2|p3)\s+priority\b[.,;:]?/i;
const PRIORITY_AFTER_RE =
  /\bpriority\s*(?:is|to|=|:)?\s*(urgent|critical|high|medium|normal|low|none|no|p0|p1|p2|p3)\b[.,;:]?/i;

/** "assign me" / "assign it to me" / "assigned to me" / "to myself". */
const ASSIGN_ME_RE =
  /\b(?:assign(?:ed)?\s+(?:it\s+|this\s+)?(?:to\s+)?me|to\s+myself)\b[.,;:]?/i;

const MENTION_RE = /@linear\b/i;
const COMMAND_RE = /^\/task\b/i;

export const TITLE_MAX_LENGTH = 140;

export interface ExtractedTask {
  title: string;
  /** Message remainder after the title (no footer). Empty string = none. */
  body: string;
  priority?: Priority;
  assignSelf: boolean;
}

function clampPriority(value: number | undefined): Priority | undefined {
  if (value === undefined) return undefined;
  const rounded = Math.round(value);
  return rounded === 0 || rounded === 1 || rounded === 2 || rounded === 3 || rounded === 4
    ? (rounded as Priority)
    : undefined;
}

/**
 * Turn a raw chat message into a task. `triggerMode` decides which trigger
 * token to strip; property hints ("priority high", "assign me") are consumed
 * so they never pollute the title. First sentence/line becomes the title
 * (hard cap TITLE_MAX_LENGTH — the overflow stays in the body); everything
 * after becomes the description body.
 */
export function extractTask(rawText: string, triggerMode: TriggerMode): ExtractedTask | undefined {
  let text = rawText.trim();

  // 1) strip the trigger token
  if (triggerMode === "command") text = text.replace(/^\/task\b[:,]?\s*/i, "");
  text = text.replace(/@linear\b[:,]?\s*/gi, " ");

  // 2) consume property hints
  let priority: Priority | undefined;
  const priorityMatch = PRIORITY_BEFORE_RE.exec(text) ?? PRIORITY_AFTER_RE.exec(text);
  if (priorityMatch !== null) {
    priority = PRIORITY_WORDS[priorityMatch[1].toLowerCase()];
    text = text.replace(priorityMatch[0], " ");
  }
  const assignMatch = ASSIGN_ME_RE.exec(text);
  const assignSelf = assignMatch !== null;
  if (assignMatch !== null) text = text.replace(assignMatch[0], " ");

  // 3) first sentence/line = title, remainder = body
  const compact = text.replace(/[ \t]+/g, " ").trim();
  if (compact === "") return undefined;

  const newlineIdx = compact.indexOf("\n");
  const firstLine = (newlineIdx === -1 ? compact : compact.slice(0, newlineIdx)).trim();
  const afterLine = newlineIdx === -1 ? "" : compact.slice(newlineIdx + 1).trim();

  // First sentence of the first line wins ("Fix login. Users report…"); a
  // bare period inside a token ("v1.2") never splits — whitespace required.
  const sentence = /^(.*?[.!?])\s+(\S[\s\S]*)$/.exec(firstLine);
  let title = (sentence !== null ? sentence[1] : firstLine).trim();
  const lineRest = sentence !== null ? sentence[2].trim() : "";
  let body = [lineRest, afterLine].filter((part) => part !== "").join("\n");

  if (title.length > TITLE_MAX_LENGTH) {
    // Hard cap: the overflow moves into the body so nothing is lost.
    const overflow = title.slice(TITLE_MAX_LENGTH).trim();
    title = title.slice(0, TITLE_MAX_LENGTH).trim();
    body = [overflow === "" ? "" : `…${overflow}`, body]
      .filter((part) => part !== "")
      .join("\n");
  }
  // Drop trailing punctuation from the title (engine.ts cleanPhrase idiom).
  title = title.replace(/[.,;:!?]+$/g, "").trim();
  if (title === "") return undefined;

  return { title, body, priority, assignSelf };
}

/* ================================================================
 * Storage (tolerant: hand-edited JSON degrades to "nothing connected")
 * ================================================================ */

interface StoredShape {
  connections: IntegrationConnection[];
  rules: RoutingRule[];
  log: InboundMessage[];
}

function isChannel(value: unknown): value is IntegrationChannel {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return typeof row.id === "string" && typeof row.name === "string";
}

function isConnection(value: unknown): value is IntegrationConnection {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    (row.provider === "slack" || row.provider === "msteams") &&
    typeof row.workspaceName === "string" &&
    typeof row.connectedAt === "string" &&
    (row.status === "connected" || row.status === "disconnected") &&
    Array.isArray(row.channels) &&
    row.channels.every(isChannel)
  );
}

function isRule(value: unknown): value is RoutingRule {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.connectionId === "string" &&
    typeof row.channelId === "string" &&
    typeof row.teamId === "string" &&
    (row.triggerMode === "mention" || row.triggerMode === "command" || row.triggerMode === "all") &&
    (row.defaultPriority === undefined || typeof row.defaultPriority === "number") &&
    (row.defaultLabelIds === undefined ||
      (Array.isArray(row.defaultLabelIds) &&
        row.defaultLabelIds.every((id) => typeof id === "string")))
  );
}

function isOutcome(value: unknown): value is InboundOutcome {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  if (row.kind === "created") {
    return typeof row.issueId === "string" && typeof row.identifier === "string";
  }
  return row.kind === "ignored" && typeof row.reason === "string";
}

function isInbound(value: unknown): value is InboundMessage {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.connectionId === "string" &&
    typeof row.channelId === "string" &&
    typeof row.author === "string" &&
    typeof row.text === "string" &&
    typeof row.receivedAt === "string" &&
    isOutcome(row.outcome)
  );
}

function parseStored(raw: string | null): StoredShape {
  const empty: StoredShape = { connections: [], rules: [], log: [] };
  if (raw === null || raw === "") return empty;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return empty;
    const bag = parsed as Record<string, unknown>;
    return {
      connections: Array.isArray(bag.connections) ? bag.connections.filter(isConnection) : [],
      rules: Array.isArray(bag.rules) ? bag.rules.filter(isRule) : [],
      log: Array.isArray(bag.log)
        ? bag.log.filter(isInbound).slice(0, INBOUND_LOG_LIMIT)
        : [],
    };
  } catch {
    return empty;
  }
}

/* ================================================================
 * Store
 * ================================================================ */

export class IntegrationsStore {
  connections: IntegrationConnection[] = [];
  rules: RoutingRule[] = [];
  /** Newest first, capped at INBOUND_LOG_LIMIT. */
  log: InboundMessage[] = [];
  /** True once localStorage has been read (writes are suppressed before). */
  hydrated = false;

  constructor() {
    makeObservable(this, {
      connections: observable,
      rules: observable,
      log: observable,
      hydrated: observable,
    });
  }

  /* ---------------- lifecycle ---------------- */

  /** Idempotent; called from a client effect so SSR never touches storage. */
  hydrate(): void {
    if (this.hydrated || typeof window === "undefined") return;
    const stored = parseStored(window.localStorage.getItem(INTEGRATIONS_STORAGE_KEY));
    runInAction(() => {
      this.connections = stored.connections;
      this.rules = stored.rules;
      this.log = stored.log;
      this.hydrated = true;
    });
  }

  private persist(): void {
    if (!this.hydrated || typeof window === "undefined") return;
    try {
      const shape: StoredShape = {
        connections: this.connections,
        rules: this.rules,
        log: this.log,
      };
      window.localStorage.setItem(INTEGRATIONS_STORAGE_KEY, JSON.stringify(shape));
    } catch {
      /* storage full or unavailable — state stays in memory */
    }
  }

  /* ---------------- reads ---------------- */

  connectionFor(provider: IntegrationProvider): IntegrationConnection | undefined {
    return this.connections.find((c) => c.provider === provider);
  }

  rulesFor(connectionId: string): RoutingRule[] {
    return this.rules.filter((rule) => rule.connectionId === connectionId);
  }

  channelName(connectionId: string, channelId: string): string {
    const connection = this.connections.find((c) => c.id === connectionId);
    return connection?.channels.find((ch) => ch.id === channelId)?.name ?? channelId;
  }

  /* ---------------- connections ---------------- */

  /**
   * Complete the simulated OAuth grant: reactivate the provider's existing
   * connection (channels — and therefore rules — stay valid) or create a new
   * one seeded with the provider's plausible channel list.
   */
  connect(provider: IntegrationProvider, workspaceName: string): IntegrationConnection {
    const name = workspaceName.trim() === "" ? PROVIDER_LABELS[provider] : workspaceName.trim();
    const now = new Date().toISOString();
    const existing = this.connectionFor(provider);
    if (existing !== undefined) {
      runInAction(() => {
        existing.workspaceName = name;
        existing.connectedAt = now;
        existing.status = "connected";
        if (existing.channels.length === 0) {
          existing.channels = SEED_CHANNELS[provider].map((ch) => ({ ...ch }));
        }
      });
      this.persist();
      return existing;
    }
    const connection: IntegrationConnection = {
      id: newId("conn"),
      provider,
      workspaceName: name,
      connectedAt: now,
      status: "connected",
      channels: SEED_CHANNELS[provider].map((ch) => ({ ...ch })),
    };
    runInAction(() => {
      this.connections.push(connection);
    });
    this.persist();
    return connection;
  }

  /** Pause the connection. Rules and the activity log are kept. */
  disconnect(connectionId: string): void {
    const connection = this.connections.find((c) => c.id === connectionId);
    if (connection === undefined) return;
    runInAction(() => {
      connection.status = "disconnected";
    });
    this.persist();
  }

  /* ---------------- rules ---------------- */

  addRule(connectionId: string, teamId: string): RoutingRule {
    const rule: RoutingRule = {
      id: newId("rule"),
      connectionId,
      channelId: "*",
      teamId,
      triggerMode: "mention",
    };
    runInAction(() => {
      this.rules.push(rule);
    });
    this.persist();
    return rule;
  }

  updateRule(id: string, fields: Partial<Omit<RoutingRule, "id" | "connectionId">>): void {
    const rule = this.rules.find((r) => r.id === id);
    if (rule === undefined) return;
    runInAction(() => {
      Object.assign(rule, fields);
    });
    this.persist();
  }

  removeRule(id: string): void {
    runInAction(() => {
      this.rules = this.rules.filter((rule) => rule.id !== id);
    });
    this.persist();
  }

  /* ---------------- THE PIPELINE ---------------- */

  /**
   * Process one inbound chat message end-to-end:
   *   connection → channel → routing rule (exact channel first, then "*") →
   *   trigger check → task extraction → REAL issue via client.mutate →
   *   log entry (+ toast on success).
   *
   * Every message is logged, matching or not — the activity log is the
   * debugging surface for "why didn't my message become an issue?".
   * The real webhook receiver performs these exact steps server-side
   * (see src/app/api/integrations/inbound/route.ts).
   */
  ingest(input: IngestInput, client: SyncClient): InboundMessage {
    const author = input.author.trim() === "" ? "unknown" : input.author.trim();
    const finish = (outcome: InboundOutcome): InboundMessage =>
      this.appendLog({
        id: newId("msg"),
        connectionId: input.connectionId,
        channelId: input.channelId,
        author,
        text: input.text,
        receivedAt: new Date().toISOString(),
        outcome,
      });

    // 1) connection
    const connection = this.connections.find((c) => c.id === input.connectionId);
    if (connection === undefined) {
      return finish({ kind: "ignored", reason: "Unknown connection" });
    }
    if (connection.status !== "connected") {
      return finish({
        kind: "ignored",
        reason: `${PROVIDER_LABELS[connection.provider]} workspace is disconnected`,
      });
    }

    // 2) channel
    const channel = connection.channels.find((ch) => ch.id === input.channelId);
    if (channel === undefined) {
      return finish({
        kind: "ignored",
        reason: `Unknown channel for ${connection.workspaceName}`,
      });
    }

    // 3) routing rule — exact channel beats the "*" catch-all
    const candidates = this.rulesFor(connection.id);
    const rule =
      candidates.find((r) => r.channelId === channel.id) ??
      candidates.find((r) => r.channelId === "*");
    if (rule === undefined) {
      return finish({ kind: "ignored", reason: `No routing rule for #${channel.name}` });
    }

    // 4) trigger mode
    const text = input.text.trim();
    if (rule.triggerMode === "mention" && !MENTION_RE.test(text)) {
      return finish({ kind: "ignored", reason: "No @linear mention (rule requires mentions)" });
    }
    if (rule.triggerMode === "command" && !COMMAND_RE.test(text)) {
      return finish({ kind: "ignored", reason: "Not a /task command (rule requires /task)" });
    }

    // 5) extraction
    const task = extractTask(text, rule.triggerMode);
    if (task === undefined) {
      return finish({ kind: "ignored", reason: "No text left to use as a title" });
    }

    // 6) create the REAL issue through the optimistic write pipeline
    const store = client.store;
    const team = store.get("Team", rule.teamId);
    if (team === undefined) {
      return finish({ kind: "ignored", reason: "Routed team no longer exists" });
    }
    const states = store.statesForTeam(team.id);
    const state = states.find((s) => s.category === "backlog") ?? states[0];
    if (state === undefined) {
      return finish({ kind: "ignored", reason: `${team.name} has no workflow states` });
    }

    // The server owns numbering; locally allocate max existing number + 1
    // (same idiom as CreateIssueModal / LocalAgentAdapter).
    const number =
      store.issuesForTeam(team.id).reduce((max, issue) => Math.max(max, issue.number), 0) + 1;
    // Insert at the top of the default backlog state (list is sorted asc).
    const inState = store.issuesForState(state.id);
    const sortOrder = inState.length > 0 ? inState[0].sortOrder - 1 : 1000;
    const now = new Date().toISOString();

    const footer = `Created from ${PROVIDER_LABELS[connection.provider]} · #${channel.name} · ${author}`;
    const description = task.body === "" ? footer : `${task.body}\n\n${footer}`;

    const row: IssueData = {
      id: newId("issue") as UUID,
      identifier: `${team.key}-${number}`,
      number,
      teamId: team.id,
      title: task.title,
      description,
      stateId: state.id,
      priority: task.priority ?? clampPriority(rule.defaultPriority) ?? 0,
      assigneeId: task.assignSelf ? CURRENT_USER_ID : undefined,
      creatorId: CURRENT_USER_ID,
      labelIds: rule.defaultLabelIds !== undefined ? [...rule.defaultLabelIds] : [],
      subscriberIds: [CURRENT_USER_ID],
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
    client.mutate.createIssue(row); // optimistic — appears in lists instantly

    showToast(`Created ${row.identifier} from #${channel.name}`);
    return finish({ kind: "created", issueId: row.id, identifier: row.identifier });
  }

  private appendLog(entry: InboundMessage): InboundMessage {
    runInAction(() => {
      this.log = [entry, ...this.log].slice(0, INBOUND_LOG_LIMIT);
    });
    this.persist();
    return entry;
  }
}

/* ================================================================
 * Singleton + hook
 * ================================================================ */

let instance: IntegrationsStore | null = null;

export function getIntegrations(): IntegrationsStore {
  if (instance === null) instance = new IntegrationsStore();
  return instance;
}

export function useIntegrations(): IntegrationsStore {
  const [store] = useState(getIntegrations);
  useEffect(() => {
    store.hydrate();
  }, [store]);
  return store;
}
