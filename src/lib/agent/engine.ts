/**
 * Agent engine — MASTER_PROMPT.md §21 / §10.8 (DOCUMENTED behavior,
 * REIMPLEMENTED internals).
 *
 * THE SEAM. Everything above this file talks to an `AgentAdapter`: one
 * `send()` call that streams text through `onDelta`, honours an AbortSignal
 * and resolves with `{ text, actions }` where every action has ALREADY been
 * applied to the store. Nothing in the UI knows whether the reply came from a
 * language model or from the rule table below.
 *
 *   // ADAPTER SEAM: an `HttpAgentAdapter implements AgentAdapter` would POST
 *   // {text, context} to /api/agent, read an SSE/ReadableStream of tokens
 *   // into onDelta, and map the model's tool-calls onto the same
 *   // `applyX()` helpers used here — no UI change.
 *
 * `LocalAgentAdapter` is deliberately NOT a fake typewriter: it parses intent
 * with explicit rules, DOES the work through `client.mutate` / the optimistic
 * transaction queue (so agent writes travel the exact §6.8 pipeline the UI
 * uses), and reports what actually happened — identifiers, counts and titles
 * read back out of the live store.
 */

import type { SyncClient } from "@/lib/data/SyncClient";
import type { SyncStore } from "@/lib/data/store";
import {
  applyReplyStyle,
  readAgentPersonalization,
  type AgentPersonalization,
} from "@/lib/agent/personalization";
import type {
  IssueData,
  MilestoneData,
  Priority,
  ProjectData,
  StateCategory,
  TeamData,
  UUID,
  WorkflowStateData,
} from "@/lib/data/types";

/* ================================================================
 * Public contract
 * ================================================================ */

export type AgentActionKind =
  | "createIssue"
  | "updateIssue"
  | "createProject"
  | "createMilestone";

/** One structured, ALREADY-APPLIED mutation the agent performed. */
export interface AgentAction {
  kind: AgentActionKind;
  summary: string;
  entityId?: string;
}

export interface AgentResult {
  text: string;
  actions: AgentAction[];
}

/** Optional handoff context (open issue/project, workspace slug) — §21. */
export interface AgentContext {
  workspace?: string;
  focus?: { kind: "issue" | "project"; id: UUID };
}

export interface AgentAdapter {
  send(
    input: { text: string; context?: AgentContext },
    onDelta: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<AgentResult>;
}

/** Thrown by `send()` when the caller aborts mid-stream (stop button). */
export class AgentAbortError extends Error {
  constructor() {
    super("Agent run aborted");
    this.name = "AgentAbortError";
  }
}

export function isAgentAbortError(error: unknown): boolean {
  return error instanceof AgentAbortError;
}

/* ================================================================
 * Streaming
 * ================================================================ */

/** ~12ms per word — slow enough to see, fast enough not to annoy. */
const WORD_DELAY_MS = 12;

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new AgentAbortError());
      return;
    }
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new AgentAbortError());
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

/** Word-by-word emission (whitespace stays attached, so newlines survive). */
async function streamText(
  text: string,
  onDelta: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const tokens = text.match(/\s*\S+/g) ?? [];
  for (const token of tokens) {
    await sleep(WORD_DELAY_MS, signal);
    onDelta(token);
  }
}

/* ================================================================
 * Small shared helpers
 * ================================================================ */

/** Auth lands in §17; the seed session user owns everything the agent does. */
export const AGENT_USER_ID: UUID = "u-yk";

const PRIORITY_LABELS: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

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

/** Palette reused from the fixture projects (§2.2). */
const PROJECT_COLORS: readonly string[] = [
  "#5e6ad2",
  "#26b5ce",
  "#4ea7fc",
  "#bb87fc",
  "#eb5757",
  "#f2994a",
];

function newId(): UUID {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function randomHex(length: number): string {
  let out = "";
  while (out.length < length) out += Math.random().toString(16).slice(2);
  return out.slice(0, length);
}

function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "untitled" : slug;
}

/** Strip surrounding quotes and trailing punctuation from a captured phrase. */
function cleanPhrase(raw: string): string {
  return raw
    .trim()
    .replace(/^["'“”‘’`]+|["'“”‘’`]+$/g, "")
    .replace(/[.,;:!?]+$/g, "")
    .trim();
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/* ================================================================
 * Store lookups (read-only; every answer is real data)
 * ================================================================ */

function teamsBySortOrder(store: SyncStore): TeamData[] {
  return store.all("Team").slice().sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Team from "in ENG", "for the Design team", or a bare team name/key. */
function findTeam(store: SyncStore, text: string): TeamData | undefined {
  const lower = text.toLowerCase();
  const teams = teamsBySortOrder(store);
  const scoped =
    /\b(?:in|for|on|to)\s+(?:the\s+)?["'“]?([a-z0-9][a-z0-9 _-]*?)["'”]?\s*(?:team\b|$|[.,])/i.exec(
      text,
    );
  if (scoped) {
    const needle = scoped[1].trim().toLowerCase();
    const hit = teams.find(
      (t) => t.key.toLowerCase() === needle || t.name.toLowerCase() === needle,
    );
    if (hit) return hit;
  }
  // Bare mention anywhere ("… issue titled X in TRENDZO with high priority").
  for (const team of teams) {
    const key = team.key.toLowerCase();
    const name = team.name.toLowerCase();
    if (new RegExp(`\\b${key}\\b`).test(lower)) return team;
    if (name !== key && new RegExp(`\\b${name}\\b`).test(lower)) return team;
  }
  return undefined;
}

/** Default landing state for a new issue: first Backlog status (§14). */
function defaultState(store: SyncStore, teamId: UUID): WorkflowStateData | undefined {
  const states = store.statesForTeam(teamId);
  return states.find((s) => s.category === "backlog") ?? states[0];
}

const STATE_SYNONYMS: Record<string, StateCategory> = {
  done: "completed",
  complete: "completed",
  completed: "completed",
  closed: "completed",
  started: "started",
  "in progress": "started",
  progress: "started",
  doing: "started",
  todo: "unstarted",
  "to do": "unstarted",
  unstarted: "unstarted",
  backlog: "backlog",
  canceled: "canceled",
  cancelled: "canceled",
  triage: "triage",
};

/** Match a state by exact name first, then by category synonym. */
function findState(
  store: SyncStore,
  teamId: UUID,
  phrase: string,
): WorkflowStateData | undefined {
  const needle = cleanPhrase(phrase).toLowerCase();
  if (needle === "") return undefined;
  const states = store.statesForTeam(teamId);
  const byName = states.find((s) => s.name.toLowerCase() === needle);
  if (byName) return byName;
  const category = STATE_SYNONYMS[needle];
  if (category !== undefined) {
    const byCategory = states.find((s) => s.category === category);
    if (byCategory) return byCategory;
  }
  return states.find((s) => s.name.toLowerCase().includes(needle));
}

function findUser(store: SyncStore, phrase: string): UUID | undefined {
  const needle = cleanPhrase(phrase).toLowerCase();
  if (needle === "") return undefined;
  if (needle === "me" || needle === "myself") return AGENT_USER_ID;
  const user = store
    .all("User")
    .find(
      (u) =>
        u.displayName.toLowerCase() === needle ||
        u.initials.toLowerCase() === needle ||
        u.name.toLowerCase().startsWith(needle),
    );
  return user?.id;
}

function findProject(store: SyncStore, phrase: string): ProjectData | undefined {
  const needle = cleanPhrase(phrase).toLowerCase();
  if (needle === "") return undefined;
  const projects = store.all("Project");
  return (
    projects.find((p) => p.name.toLowerCase() === needle) ??
    projects.find((p) => p.name.toLowerCase().includes(needle))
  );
}

function issueLabel(issue: IssueData): string {
  return `**${issue.identifier}** ${issue.title}`;
}

function stateName(store: SyncStore, issue: IssueData): string {
  return store.get("WorkflowState", issue.stateId)?.name ?? "Unknown";
}

/* ================================================================
 * Intent extraction
 * ================================================================ */

const IDENTIFIER_RE = /\b([A-Za-z][A-Za-z0-9]*-\d+)\b/;

/**
 * Pull a title out of a create phrase. Quoted wins; otherwise everything
 * after the naming verb up to the first trailing clause keyword.
 */
function extractTitle(text: string): string | undefined {
  const quoted = /["'“‘]([^"'“”‘’]{1,200})["'”’]/.exec(text);
  if (quoted) return cleanPhrase(quoted[1]);

  const named =
    /\b(?:titled|called|named|title:|name:|about|for)\s+(.+)$/i.exec(text);
  const bare =
    /\b(?:create|add|make|open|file|new|draft)\s+(?:an?\s+|the\s+)?(?:new\s+)?(?:issue|task|bug|ticket|project|milestone)\s+(.+)$/i.exec(
      text,
    );
  const raw = named?.[1] ?? bare?.[1];
  if (raw === undefined) return undefined;

  // Cut trailing property clauses so "… in TRENDZO with high priority" keeps
  // only the title.
  const cut = raw.split(
    /\s+(?:in\s+(?:the\s+)?(?:project\s+)?|for\s+(?:the\s+)?|under\s+|with\s+|and\s+assign|assigned?\s+to|assign\s+|priority\s|,\s*priority)/i,
  )[0];
  const title = cleanPhrase(cut);
  return title === "" ? undefined : title;
}

function extractPriority(text: string): Priority | undefined {
  const match =
    /\b(urgent|critical|high|medium|normal|low|no|none|p0|p1|p2|p3)\s+priority\b/i.exec(
      text,
    ) ??
    /\bpriority\s*(?:is|to|=|:)?\s*(urgent|critical|high|medium|normal|low|none|no|p0|p1|p2|p3)\b/i.exec(
      text,
    ) ??
    /\bmark(?:\s+\w+)?\s+as\s+(urgent)\b/i.exec(text);
  if (!match) return undefined;
  return PRIORITY_WORDS[match[1].toLowerCase()];
}

function wantsSelfAssign(text: string): boolean {
  return /\b(?:assign(?:ed)?\s+(?:it\s+|this\s+|them\s+)?(?:to\s+)?me|assign\s+me|to\s+myself)\b/i.test(
    text,
  );
}

/* ================================================================
 * The local adapter
 * ================================================================ */

export class LocalAgentAdapter implements AgentAdapter {
  readonly #client: SyncClient;

  constructor(client: SyncClient) {
    this.#client = client;
  }

  private get store(): SyncStore {
    return this.#client.store;
  }

  async send(
    input: { text: string; context?: AgentContext },
    onDelta: (chunk: string) => void,
    signal: AbortSignal,
  ): Promise<AgentResult> {
    if (signal.aborted) throw new AgentAbortError();

    // 0) the reader's standing preferences (Settings → Agent personalization)
    const prefs = readAgentPersonalization();

    // 1) parse + DO the work (writes are optimistic, so they land instantly)
    const raw = this.run(input.text, input.context, prefs);

    // 2) shape the report to the chosen reply style, then stream it. A real
    //    model adapter would send `prefs` as its system-prompt preamble
    //    instead; either way the same three fields drive the answer.
    const text = applyReplyStyle(raw.text, prefs, {
      workspace: input.context?.workspace,
      userName: prefs.useProfile
        ? this.store.get("User", AGENT_USER_ID)?.displayName
        : undefined,
    });

    await streamText(text, onDelta, signal);
    return { text, actions: raw.actions };
  }

  /**
   * Rule table. Ordered: explicit mutations first (they carry verbs), then
   * read-only questions, then the capability card.
   */
  private run(
    raw: string,
    context?: AgentContext,
    prefs?: AgentPersonalization,
  ): AgentResult {
    const text = raw.trim();
    if (text === "") return { text: this.helpText(undefined, prefs), actions: [] };

    const lower = text.toLowerCase();

    // ---- mutations ----
    if (/\bmilestone\b/i.test(text) && /\b(create|add|new|make)\b/i.test(text)) {
      return this.createMilestone(text);
    }
    if (/\bproject\b/i.test(text) && /\b(create|add|new|make|start)\b/i.test(text)) {
      return this.createProject(text);
    }
    if (
      /\b(issue|task|bug|ticket)\b/i.test(text) &&
      /\b(create|add|new|make|open|file|draft)\b/i.test(text)
    ) {
      return this.createIssue(text);
    }
    const update = this.tryUpdateIssue(text, context);
    if (update) return update;

    // ---- questions ----
    if (/\b(in progress|being worked on|working on right now|started)\b/i.test(lower)) {
      return this.reportInProgress();
    }
    if (/\bbacklog\b/i.test(lower)) {
      return this.reportBacklog();
    }
    if (/\b(assigned to me|my issues|what should i work on|on my plate)\b/i.test(lower)) {
      return this.reportMine();
    }
    if (/\bloops?\b/i.test(lower)) {
      return this.explainLoops();
    }
    if (/\bprojects?\b/i.test(lower)) {
      return this.reportProjects();
    }
    if (/\b(summar|status|overview|how many|count|report|standup)\w*\b/i.test(lower)) {
      return this.reportWorkspace(text);
    }
    if (/\b(help|what can you do|capabilities|commands)\b/i.test(lower)) {
      return { text: this.helpText(undefined, prefs), actions: [] };
    }

    return { text: this.helpText(text, prefs), actions: [] };
  }

  /* ---------------- create issue ---------------- */

  private createIssue(text: string): AgentResult {
    const store = this.store;
    const title = extractTitle(text);
    if (title === undefined) {
      return {
        text: 'I need a title to create an issue. Try: `create an issue titled "Fix the sync retry loop" in TRENDZO with high priority`.',
        actions: [],
      };
    }

    const team = findTeam(store, text) ?? teamsBySortOrder(store)[0];
    if (team === undefined) {
      return { text: "No teams exist in this workspace yet.", actions: [] };
    }
    const state = defaultState(store, team.id);
    if (state === undefined) {
      return {
        text: `${team.name} has no workflow states, so I can't place a new issue.`,
        actions: [],
      };
    }

    const priority = extractPriority(text) ?? 0;
    const assigneeId = wantsSelfAssign(text) ? AGENT_USER_ID : undefined;
    const projectMatch = /\b(?:in|to|under)\s+(?:the\s+)?project\s+(.+)$/i.exec(text);
    const project =
      projectMatch !== null ? findProject(store, projectMatch[1]) : undefined;

    // The server owns numbering; allocate max existing + 1 locally (§14).
    const number =
      store.issuesForTeam(team.id).reduce((max, i) => Math.max(max, i.number), 0) + 1;
    const inState = store.issuesForState(state.id);
    const sortOrder = inState.length > 0 ? inState[0].sortOrder - 1 : 1000;
    const now = new Date().toISOString();

    const row: IssueData = {
      id: newId(),
      identifier: `${team.key}-${number}`,
      number,
      teamId: team.id,
      title,
      stateId: state.id,
      priority,
      assigneeId,
      creatorId: AGENT_USER_ID,
      labelIds: [],
      projectId: project?.id,
      subscriberIds: [AGENT_USER_ID],
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
    this.#client.mutate.createIssue(row);

    const details = [`in **${team.name}**`, `status **${state.name}**`];
    if (priority !== 0) details.push(`priority **${PRIORITY_LABELS[priority]}**`);
    if (assigneeId !== undefined) {
      const user = store.get("User", assigneeId);
      details.push(`assigned to **${user?.displayName ?? "you"}**`);
    }
    if (project !== undefined) details.push(`in project **${project.name}**`);

    return {
      text: `Created **${row.identifier}** — "${title}" ${details.join(", ")}.`,
      actions: [
        {
          kind: "createIssue",
          summary: `Created ${row.identifier} — ${title}`,
          entityId: row.id,
        },
      ],
    };
  }

  /* ---------------- update issue ---------------- */

  /**
   * Handles both addressed edits ("set TRENDZO-37 to Done") and, when the UI
   * handed over a focused issue, bare edits ("assign it to me") — the form a
   * Loop run uses against every matching issue.
   */
  private tryUpdateIssue(text: string, context?: AgentContext): AgentResult | null {
    const store = this.store;
    const idMatch = IDENTIFIER_RE.exec(text);
    let issue =
      idMatch !== null ? store.issueByIdentifier(idMatch[1]) : undefined;
    if (issue === undefined && context?.focus?.kind === "issue") {
      issue = store.get("Issue", context.focus.id);
    }
    if (issue === undefined) {
      // An identifier was named but does not exist — say so rather than
      // falling through to the capability card.
      if (idMatch !== null) {
        return {
          text: `I couldn't find **${idMatch[1]}** in this workspace.`,
          actions: [],
        };
      }
      return null;
    }

    const fields: Partial<Omit<IssueData, "id">> = {};
    const changes: string[] = [];

    // priority
    const priority = extractPriority(text);
    if (priority !== undefined && priority !== issue.priority) {
      fields.priority = priority;
      changes.push(`priority → **${PRIORITY_LABELS[priority]}**`);
    }

    // assignee
    if (wantsSelfAssign(text)) {
      if (issue.assigneeId !== AGENT_USER_ID) {
        fields.assigneeId = AGENT_USER_ID;
        const user = store.get("User", AGENT_USER_ID);
        changes.push(`assignee → **${user?.displayName ?? "you"}**`);
      }
    } else {
      const assignMatch =
        /\bassign(?:ed)?\s+(?:it\s+|this\s+)?to\s+([\w.@-]+)/i.exec(text) ??
        /\bassign\s+([\w.@-]+)\s+to\b/i.exec(text);
      if (assignMatch) {
        const userId = findUser(store, assignMatch[1]);
        if (userId !== undefined && userId !== issue.assigneeId) {
          fields.assigneeId = userId;
          const user = store.get("User", userId);
          changes.push(`assignee → **${user?.displayName ?? "unknown"}**`);
        }
      }
    }

    // state
    const stateMatch =
      /\b(?:move|set|change|put|mark)\b(?:\s+(?:it|this|the\s+issue))?(?:\s+[A-Za-z][A-Za-z0-9]*-\d+)?\s+(?:to|as|into|in)\s+(?:the\s+)?(?:status\s+|state\s+)?["'“]?([\w ]+?)["'”]?\s*(?:status|state)?\s*$/i.exec(
        text,
      ) ?? /\b(?:status|state)\s*(?:is|to|=|:)\s*["'“]?([\w ]+?)["'”]?\s*$/i.exec(text);
    if (stateMatch) {
      const candidate = stateMatch[1];
      // "set X to high priority" already consumed above — don't treat the
      // priority word as a state name.
      if (!/\bpriority\b/i.test(candidate)) {
        const state = findState(store, issue.teamId, candidate);
        if (state !== undefined && state.id !== issue.stateId) {
          fields.stateId = state.id;
          changes.push(`status → **${state.name}**`);
        }
      }
    }

    // title
    const renameMatch = /\brename\s+(?:it\s+|this\s+)?(?:[A-Za-z][A-Za-z0-9]*-\d+\s+)?to\s+(.+)$/i.exec(
      text,
    );
    if (renameMatch) {
      const title = cleanPhrase(renameMatch[1]);
      if (title !== "" && title !== issue.title) {
        fields.title = title;
        changes.push(`title → **${title}**`);
      }
    }

    // label
    const labelMatch = /\badd\s+(?:the\s+)?label\s+["'“]?([\w -]+?)["'”]?(?:\s+to\b|\s*$)/i.exec(
      text,
    );
    if (labelMatch) {
      const needle = cleanPhrase(labelMatch[1]).toLowerCase();
      const label = store
        .all("Label")
        .find((l) => !l.isGroup && l.name.toLowerCase() === needle);
      if (label !== undefined && !issue.labelIds.includes(label.id)) {
        fields.labelIds = [...issue.labelIds, label.id];
        changes.push(`label → **${label.name}**`);
      }
    }

    if (changes.length === 0) return null;

    fields.updatedAt = new Date().toISOString();
    this.#client.mutate.updateIssue(issue.id, fields);

    return {
      text: `Updated **${issue.identifier}** — ${changes.join(", ")}.`,
      actions: [
        {
          kind: "updateIssue",
          summary: `Updated ${issue.identifier}: ${changes
            .join(", ")
            .replace(/\*\*/g, "")}`,
          entityId: issue.id,
        },
      ],
    };
  }

  /* ---------------- create project ---------------- */

  private createProject(text: string): AgentResult {
    const store = this.store;
    const name = extractTitle(text);
    if (name === undefined) {
      // Name a team that actually exists — an example pointing at a team the
      // workspace does not have is worse than no example.
      const hint = teamsBySortOrder(store)[0]?.key;
      return {
        text: `I need a name to create a project. Try: \`create a project called "Mobile App v2"${hint === undefined ? "" : ` for ${hint}`}\`.`,
        actions: [],
      };
    }

    const team = findTeam(store, text) ?? teamsBySortOrder(store)[0];
    const existing = store.all("Project");
    const sortOrder = existing.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 1;
    const now = new Date().toISOString();

    const row: ProjectData = {
      id: newId(),
      slug: `${slugify(name)}-${randomHex(12)}`,
      name,
      color: PROJECT_COLORS[existing.length % PROJECT_COLORS.length],
      statusCategory: "backlog",
      health: "noUpdate",
      priority: extractPriority(text) ?? 0,
      leadId: AGENT_USER_ID,
      memberIds: [AGENT_USER_ID],
      teamIds: team ? [team.id] : [],
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
    // No mutate.createProject helper yet — the queue is the public write path.
    this.#client.queue.enqueue(
      "create",
      "Project",
      row.id,
      row as unknown as Record<string, unknown>,
    );

    const scope = team ? ` for **${team.name}**` : "";
    return {
      text: `Created project **${name}**${scope} — status Backlog, no health update yet. Add milestones with \`add a milestone "Beta" to project ${name}\`.`,
      actions: [
        {
          kind: "createProject",
          summary: `Created project ${name}`,
          entityId: row.id,
        },
      ],
    };
  }

  /* ---------------- create milestone ---------------- */

  private createMilestone(text: string): AgentResult {
    const store = this.store;
    const projectMatch =
      /\b(?:to|in|on|for|under)\s+(?:the\s+)?(?:project\s+)?["'“]?([^"'“”]+?)["'”]?\s*$/i.exec(
        text,
      );
    const project =
      projectMatch !== null ? findProject(store, projectMatch[1]) : undefined;
    if (project === undefined) {
      const names = store.all("Project").map((p) => p.name).slice(0, 5);
      return {
        text:
          names.length > 0
            ? `Which project? I know: ${names.join(", ")}. Try: \`add a milestone "Beta" to project ${names[0]}\`.`
            : "There are no projects yet — create one first.",
        actions: [],
      };
    }

    const nameMatch =
      /["'“]([^"'“”]{1,120})["'”]/.exec(text) ??
      /\bmilestone\s+(?:called\s+|named\s+|titled\s+)?(.+?)\s+(?:to|in|on|for|under)\b/i.exec(
        text,
      );
    const name = nameMatch ? cleanPhrase(nameMatch[1]) : "";
    if (name === "") {
      return {
        text: `I need a milestone name. Try: \`add a milestone "Beta" to project ${project.name}\`.`,
        actions: [],
      };
    }

    const siblings = store.milestonesForProject(project.id);
    const row: MilestoneData = {
      id: newId(),
      projectId: project.id,
      name,
      sortOrder: siblings.reduce((max, m) => Math.max(max, m.sortOrder), 0) + 1,
    };
    this.#client.queue.enqueue(
      "create",
      "Milestone",
      row.id,
      row as unknown as Record<string, unknown>,
    );

    return {
      text: `Added milestone **${name}** to **${project.name}** (${plural(
        siblings.length + 1,
        "milestone",
        "milestones",
      )} total).`,
      actions: [
        {
          kind: "createMilestone",
          summary: `Added milestone ${name} to ${project.name}`,
          entityId: row.id,
        },
      ],
    };
  }

  /* ---------------- read-only answers ---------------- */

  private issuesInCategory(category: StateCategory): IssueData[] {
    const store = this.store;
    const stateIds = new Set(
      store.all("WorkflowState").filter((s) => s.category === category).map((s) => s.id),
    );
    return store
      .all("Issue")
      .filter((i) => !i.archivedAt && stateIds.has(i.stateId))
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  private reportInProgress(): AgentResult {
    const store = this.store;
    const issues = this.issuesInCategory("started");
    if (issues.length === 0) {
      return {
        text: "Nothing is in progress right now — every issue sits in Backlog, Todo, Done or Canceled.",
        actions: [],
      };
    }
    const lines = issues.slice(0, 10).map((i) => {
      const team = store.get("Team", i.teamId);
      const assignee =
        i.assigneeId !== undefined ? store.get("User", i.assigneeId) : undefined;
      const who = assignee ? ` · ${assignee.displayName}` : " · unassigned";
      return `- **${i.identifier}** ${i.title} (${team?.name ?? "?"}${who})`;
    });
    const more = issues.length > 10 ? `\n…and ${issues.length - 10} more.` : "";
    return {
      text: `${plural(issues.length, "issue is", "issues are")} in progress:\n${lines.join(
        "\n",
      )}${more}`,
      actions: [],
    };
  }

  private reportBacklog(): AgentResult {
    const store = this.store;
    const issues = this.issuesInCategory("backlog");
    if (issues.length === 0) {
      return { text: "The backlog is empty.", actions: [] };
    }
    const byTeam = new Map<string, number>();
    for (const issue of issues) {
      const team = store.get("Team", issue.teamId);
      const key = team?.name ?? "Unknown";
      byTeam.set(key, (byTeam.get(key) ?? 0) + 1);
    }
    const breakdown = Array.from(byTeam.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => `- **${name}**: ${count}`);
    const top = issues
      .slice(0, 5)
      .map((i) => `- **${i.identifier}** ${i.title}`);
    const urgent = issues.filter((i) => i.priority === 1 || i.priority === 2).length;

    return {
      text: `The backlog holds ${plural(issues.length, "issue", "issues")}${
        urgent > 0 ? `, ${urgent} at High priority or above` : ""
      }.\n\nBy team:\n${breakdown.join("\n")}\n\nMost recently touched:\n${top.join("\n")}`,
      actions: [],
    };
  }

  private reportMine(): AgentResult {
    const store = this.store;
    const mine = store
      .all("Issue")
      .filter((i) => !i.archivedAt && i.assigneeId === AGENT_USER_ID)
      .sort((a, b) => a.priority - b.priority || b.updatedAt.localeCompare(a.updatedAt));
    if (mine.length === 0) {
      return { text: "You have no issues assigned right now.", actions: [] };
    }
    const lines = mine
      .slice(0, 10)
      .map(
        (i) =>
          `- **${i.identifier}** ${i.title} — ${stateName(store, i)}${
            i.priority !== 0 ? ` · ${PRIORITY_LABELS[i.priority]}` : ""
          }`,
      );
    return {
      text: `${plural(mine.length, "issue is", "issues are")} assigned to you:\n${lines.join(
        "\n",
      )}`,
      actions: [],
    };
  }

  private reportProjects(): AgentResult {
    const store = this.store;
    const projects = store.all("Project").sort((a, b) => a.sortOrder - b.sortOrder);
    if (projects.length === 0) {
      return { text: "There are no projects yet.", actions: [] };
    }
    const lines = projects.slice(0, 12).map((p) => {
      const issues = store.issuesForProject(p.id);
      const done = issues.filter((i) => {
        const state = store.get("WorkflowState", i.stateId);
        return state?.category === "completed";
      }).length;
      const milestones = store.milestonesForProject(p.id).length;
      return `- **${p.name}** — ${p.statusCategory}, ${done}/${issues.length} issues done, ${plural(
        milestones,
        "milestone",
        "milestones",
      )}`;
    });
    return {
      text: `${plural(projects.length, "project", "projects")} in this workspace:\n${lines.join(
        "\n",
      )}`,
      actions: [],
    };
  }

  private reportWorkspace(text: string): AgentResult {
    const store = this.store;
    const team = findTeam(store, text);
    const issues = team
      ? store.issuesForTeam(team.id)
      : store.all("Issue").filter((i) => !i.archivedAt);
    const scope = team ? `**${team.name}**` : "The workspace";

    if (issues.length === 0) {
      return { text: `${scope} has no issues yet.`, actions: [] };
    }

    const counts = new Map<StateCategory, number>();
    for (const issue of issues) {
      const state = store.get("WorkflowState", issue.stateId);
      if (state === undefined) continue;
      counts.set(state.category, (counts.get(state.category) ?? 0) + 1);
    }
    const order: StateCategory[] = [
      "triage",
      "backlog",
      "unstarted",
      "started",
      "completed",
      "canceled",
    ];
    const breakdown = order
      .filter((c) => (counts.get(c) ?? 0) > 0)
      .map((c) => `- **${c}**: ${counts.get(c) ?? 0}`);
    const unassigned = issues.filter((i) => i.assigneeId === undefined).length;
    const recent = issues
      .slice()
      .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3)
      .map((i) => `- ${issueLabel(i)} (${stateName(store, i)})`);

    return {
      text: `${scope} has ${plural(issues.length, "issue", "issues")}, ${unassigned} unassigned.\n\nBy status:\n${breakdown.join(
        "\n",
      )}\n\nMost recently updated:\n${recent.join("\n")}`,
      actions: [],
    };
  }

  private explainLoops(): AgentResult {
    return {
      text: `**Loops** are scheduled or event-driven runs of these same instructions.\n\nA loop has four parts:\n- a **trigger** — a cadence, or an issue being created or updated\n- **conditions** — property-is-value rows that decide which issues qualify\n- **instructions** — what I should do on each run\n- **permissions and connectors** — how far I'm allowed to reach\n\nLoops stay drafts until you publish them; every published version is kept and can be restored, and each run is recorded with its timing and the changes it made.\n\nOpen **Loops** in the sidebar and choose *Create new loop* to build one.`,
      actions: [],
    };
  }

  /* ---------------- capability card ---------------- */

  private helpText(unmatched?: string, prefs?: AgentPersonalization): string {
    const store = this.store;
    // A brand-new workspace always has one team; "TEAM" is only ever a
    // placeholder for the moment before the pool has hydrated.
    const team = teamsBySortOrder(store)[0]?.key ?? "TEAM";
    const lead = unmatched
      ? `I couldn't turn that into an action or a question I can answer.\n\n`
      : "";
    // Standing instructions are echoed here so it is verifiable that the
    // adapter really is reading them (Settings → Agent personalization).
    const standing = prefs?.instructions.trim() ?? "";
    const tail =
      standing === ""
        ? ""
        : `\n\n**Your standing instructions**\n> ${standing.replace(/\n+/g, "\n> ")}`;
    return `${lead}Here's what I can do right now, all against your live workspace:\n\n**Make changes**\n- \`create an issue titled "Fix retry loop" in ${team} with high priority assign me\`\n- \`set ${team}-1 to In Progress\` · \`assign ${team}-1 to me\` · \`set priority of ${team}-1 to urgent\` · \`rename ${team}-1 to "New title"\`\n- \`create a project called "Mobile App v2" for ${team}\`\n- \`add a milestone "Beta" to project Mobile App v2\`\n\n**Answer questions**\n- \`what's in progress?\` · \`summarize the backlog\` · \`what's assigned to me?\` · \`list projects\` · \`status of ${team}\`\n\nEverything I change goes through the same optimistic pipeline the UI uses, so you'll see it in the lists immediately.${tail}`;
  }
}
