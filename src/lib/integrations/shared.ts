/**
 * Isomorphic core of the chat-integrations pipeline — imported by BOTH sides.
 *
 *   client: src/lib/integrations/store.ts (MobX + localStorage + the settings
 *           simulator) re-exports everything here, so nothing downstream had
 *           to change when this module was split out.
 *   server: src/app/api/integrations/inbound/route.ts (the webhook receiver)
 *           and src/server/integrations/rules.ts (the env rules source).
 *
 * WHY THE SPLIT: `store.ts` carries the "use client" directive, so a server
 * route cannot import from it — importing it would turn the module into a
 * client reference. The rule SHAPE, the trigger vocabulary and the
 * message→task extraction are pure functions of their input, so they live
 * here instead: one definition, two runtimes, no drift.
 *
 * Nothing in this file touches the browser, the network or a store.
 */

import type { Priority } from "@/lib/data/types";

/* ================================================================
 * Connections + channels
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

export const PROVIDER_LABELS: Record<IntegrationProvider, string> = {
  slack: "Slack",
  msteams: "Microsoft Teams",
};

/* ================================================================
 * THE RULE SHAPE (BACKEND_API.md §7.4 step 3)
 * ================================================================ */

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

export const MENTION_RE = /@linear\b/i;
export const COMMAND_RE = /^\/task\b/i;

/** A rule for the exact channel wins over the "*" catch-all. */
export function pickRule(
  rules: readonly RoutingRule[],
  channelId: string,
): RoutingRule | undefined {
  return (
    rules.find((rule) => rule.channelId === channelId) ??
    rules.find((rule) => rule.channelId === "*")
  );
}

/**
 * Trigger gate. Returns `undefined` when the message passes, or the
 * human-readable ignore reason when it does not — the exact strings the
 * activity log and the webhook response report.
 */
export function triggerRejection(
  triggerMode: TriggerMode,
  text: string,
): string | undefined {
  if (triggerMode === "mention" && !MENTION_RE.test(text)) {
    return "No @linear mention (rule requires mentions)";
  }
  if (triggerMode === "command" && !COMMAND_RE.test(text)) {
    return "Not a /task command (rule requires /task)";
  }
  return undefined;
}

/* ================================================================
 * Activity-log rows
 * ================================================================ */

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

/** Activity log cap — oldest entries fall off. */
export const INBOUND_LOG_LIMIT = 100;

/* ================================================================
 * Message → task extraction
 * (mirrors LocalAgentAdapter's parsing — src/lib/agent/engine.ts —
 *  trimmed to the inbound-message dialect)
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

export const TITLE_MAX_LENGTH = 140;

export interface ExtractedTask {
  title: string;
  /** Message remainder after the title (no footer). Empty string = none. */
  body: string;
  priority?: Priority;
  assignSelf: boolean;
}

export function clampPriority(value: number | undefined): Priority | undefined {
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
export function extractTask(
  rawText: string,
  triggerMode: TriggerMode,
): ExtractedTask | undefined {
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

/** `Created from Slack · #eng · sana`, appended to every generated issue. */
export function provenanceFooter(
  provider: IntegrationProvider,
  channelName: string,
  author: string,
): string {
  return `Created from ${PROVIDER_LABELS[provider]} · #${channelName} · ${author}`;
}

/** Body + footer, separated by a blank line (footer alone when body is empty). */
export function describeTask(body: string, footer: string): string {
  return body === "" ? footer : `${body}\n\n${footer}`;
}
