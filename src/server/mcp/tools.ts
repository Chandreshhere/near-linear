/**
 * MCP tool layer — the workspace operations an AI client can perform.
 *
 * ⚠️ WHAT THIS ACTUALLY TALKS TO — read before you believe a demo. ⚠️
 *
 * This app is LOCAL-FIRST. A normal user's data lives in THAT BROWSER's
 * IndexedDB (LocalTransport, the default), and a server route cannot reach
 * it — not this one, not any other. So these tools operate on
 * `ServerSyncStore` (src/server/syncStore.ts), the in-memory server-side
 * store that is the reference implementation of the documented wire contract
 * (BACKEND_API.md). Concretely:
 *
 *   • With `NEXT_PUBLIC_SYNC_TRANSPORT=http` the app IS that store, so an MCP
 *     client creating an issue here shows up in the running app within
 *     milliseconds — the write goes through `applyMutation`, which allocates a
 *     syncId and broadcasts a SyncAction down the existing
 *     `GET /api/sync/events` SSE stream. No side channel, no special casing.
 *   • With the default local transport, these tools operate on the server's
 *     own copy of the workspace, NOT on the browser tab you have open. That is
 *     not a bug to work around; it is what "local-first" means.
 *   • Once a real backend is wired in, this layer is what you re-point at it:
 *     swap `ServerSyncStore` for your database and every tool is correct as
 *     written, because it only ever speaks the mutation contract.
 *
 * DESIGN: transport-free on purpose. Nothing here imports the MCP SDK or
 * touches a Request/Response, so the same catalogue is reusable — and it IS
 * reused: `POST /api/integrations/inbound` creates its issues by calling
 * `createIssueFromChat` below, so the Slack/Teams path and the MCP path share
 * one implementation of "how an issue gets made".
 */

import { randomUUID } from "node:crypto";
import { z } from "zod";

import type {
  ActivityData,
  AnyModelData,
  CommentData,
  IssueData,
  ModelDataMap,
  ModelName,
  Priority,
  ProjectData,
  ProjectStatusCategory,
  StateCategory,
  TeamData,
  TransactionData,
  TransactionKind,
  UserData,
  UUID,
  WorkflowStateData,
} from "@/lib/data/types";
import {
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  toolDoc,
} from "@/lib/mcp/catalogue";
import { ServerSyncStore } from "@/server/syncStore";

export { MCP_SERVER_NAME, MCP_SERVER_VERSION };

/** clientId stamped on every mutation batch this layer submits. */
const MCP_CLIENT_ID = "mcp-server";

/* ================================================================
 * Errors
 * ================================================================ */

/**
 * A failure the caller can act on ("no team matches 'foo'"). The transport
 * turns these into `isError: true` tool results with the message intact —
 * they are answers, not crashes.
 */
export class ToolError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ToolError";
  }
}

/* ================================================================
 * Typed row access over the untyped store maps
 * ================================================================ */

function rows<M extends ModelName>(
  store: ServerSyncStore,
  model: M,
): ModelDataMap[M][] {
  const map = store.rows.get(model);
  if (map === undefined) return [];
  return [...map.values()] as ModelDataMap[M][];
}

function row<M extends ModelName>(
  store: ServerSyncStore,
  model: M,
  id: string,
): ModelDataMap[M] | undefined {
  return store.rows.get(model)?.get(id) as ModelDataMap[M] | undefined;
}

/* ================================================================
 * Write path — everything goes through applyMutation
 * ================================================================ */

interface PendingWrite {
  kind: TransactionKind;
  modelName: ModelName;
  modelId: UUID;
  payload?: Record<string, unknown>;
}

/**
 * Submit a batch as real transactions. This is the ONLY way this module
 * writes: the store allocates syncIds, appends to its action log and fans the
 * deltas out to SSE subscribers, exactly as it does for a browser client.
 */
function commit(store: ServerSyncStore, writes: PendingWrite[]): void {
  const createdAt = new Date().toISOString();
  const transactions: TransactionData[] = writes.map((write, index) => ({
    id: `mcp-${randomUUID()}`,
    kind: write.kind,
    modelName: write.modelName,
    modelId: write.modelId,
    ...(write.payload !== undefined ? { payload: write.payload } : {}),
    batchIndex: index,
    createdAt,
    status: "queued" as const,
  }));
  const result = store.applyMutation({ clientId: MCP_CLIENT_ID, transactions });
  if (!result.ok) {
    const reasons = Object.values(result.rejected ?? {});
    throw new ToolError(
      reasons.length > 0 ? reasons.join("; ") : "The store rejected the write",
    );
  }
}

function asPayload(data: AnyModelData): Record<string, unknown> {
  return data as unknown as Record<string, unknown>;
}

/* ================================================================
 * Lenient resolvers (names → ids)
 * ================================================================ */

function norm(value: string): string {
  return value.trim().toLowerCase();
}

/** Team by key ("TRENDZO"), name ("Trendzo"), id, or unique prefix. */
export function resolveTeam(store: ServerSyncStore, hint: string): TeamData {
  const all = rows(store, "Team");
  if (all.length === 0) throw new ToolError("This workspace has no teams yet");
  const needle = norm(hint);
  const found =
    all.find((team) => norm(team.key) === needle) ??
    all.find((team) => norm(team.name) === needle) ??
    all.find((team) => team.id === hint) ??
    all.find((team) => norm(team.name).startsWith(needle)) ??
    all.find((team) => norm(team.key).startsWith(needle));
  if (found === undefined) {
    const known = all.map((team) => `${team.key} (${team.name})`).join(", ");
    throw new ToolError(`No team matches "${hint}". Known teams: ${known}`);
  }
  return found;
}

function statesForTeam(
  store: ServerSyncStore,
  teamId: string,
): WorkflowStateData[] {
  return rows(store, "WorkflowState")
    .filter((state) => state.teamId === teamId)
    .sort((a, b) => a.position - b.position);
}

const STATE_CATEGORIES: readonly StateCategory[] = [
  "triage",
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
];

function isStateCategory(value: string): value is StateCategory {
  return (STATE_CATEGORIES as readonly string[]).includes(value);
}

/** Workflow state by name ("In Progress"), category ("started") or id. */
export function resolveState(
  store: ServerSyncStore,
  teamId: string,
  hint: string,
): WorkflowStateData {
  const states = statesForTeam(store, teamId);
  if (states.length === 0) {
    throw new ToolError("That team has no workflow states");
  }
  const needle = norm(hint);
  const found =
    states.find((state) => norm(state.name) === needle) ??
    states.find((state) => state.id === hint) ??
    (isStateCategory(needle)
      ? states.find((state) => state.category === needle)
      : undefined) ??
    states.find((state) => norm(state.name).startsWith(needle));
  if (found === undefined) {
    const known = states.map((state) => `${state.name} (${state.category})`).join(", ");
    throw new ToolError(`No state matches "${hint}". Team states: ${known}`);
  }
  return found;
}

/** The state a new issue lands in: first backlog state, else the first state. */
function defaultStateFor(store: ServerSyncStore, teamId: string): WorkflowStateData {
  const states = statesForTeam(store, teamId);
  const state = states.find((s) => s.category === "backlog") ?? states[0];
  if (state === undefined) {
    throw new ToolError("That team has no workflow states");
  }
  return state;
}

/** User by id, email, name, displayName, initials, or a substring of any. */
export function resolveUser(store: ServerSyncStore, hint: string): UserData {
  const all = rows(store, "User");
  if (all.length === 0) throw new ToolError("This workspace has no members yet");
  const needle = norm(hint);
  const found =
    all.find((user) => user.id === hint) ??
    all.find((user) => norm(user.email) === needle) ??
    all.find((user) => norm(user.name) === needle) ??
    all.find((user) => norm(user.displayName) === needle) ??
    all.find((user) => norm(user.initials) === needle) ??
    all.find(
      (user) =>
        norm(user.displayName).includes(needle) || norm(user.email).includes(needle),
    );
  if (found === undefined) {
    const known = all.map((user) => user.displayName).join(", ");
    throw new ToolError(`No member matches "${hint}". Members: ${known}`);
  }
  return found;
}

/** Project by id, slug, exact name, or a name substring. */
export function resolveProject(store: ServerSyncStore, hint: string): ProjectData {
  const all = rows(store, "Project");
  if (all.length === 0) throw new ToolError("This workspace has no projects yet");
  const needle = norm(hint);
  const found =
    all.find((project) => project.id === hint) ??
    all.find((project) => project.slug === hint) ??
    all.find((project) => norm(project.name) === needle) ??
    all.find((project) => norm(project.name).includes(needle));
  if (found === undefined) {
    throw new ToolError(`No project matches "${hint}"`);
  }
  return found;
}

/** Labels by name or id, scoped to the team's labels plus workspace labels. */
function resolveLabels(
  store: ServerSyncStore,
  teamId: string,
  hints: readonly string[],
): { ids: UUID[]; missing: string[] } {
  const candidates = rows(store, "Label").filter(
    (label) => !label.isGroup && (label.teamId === undefined || label.teamId === teamId),
  );
  const ids: UUID[] = [];
  const missing: string[] = [];
  for (const hint of hints) {
    const needle = norm(hint);
    const found =
      candidates.find((label) => label.id === hint) ??
      candidates.find((label) => norm(label.name) === needle);
    if (found === undefined) missing.push(hint);
    else if (!ids.includes(found.id)) ids.push(found.id);
  }
  return { ids, missing };
}

const PRIORITY_WORDS: Record<string, Priority> = {
  none: 0,
  "no priority": 0,
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
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

/** Accepts 0–4 or a word ("urgent", "high", "p2"). */
function resolvePriority(input: number | string): Priority {
  if (typeof input === "number") {
    if (input === 0 || input === 1 || input === 2 || input === 3 || input === 4) {
      return input;
    }
    throw new ToolError(`Priority must be 0–4, got ${input}`);
  }
  const needle = norm(input);
  const numeric = Number(needle);
  if (needle !== "" && Number.isInteger(numeric)) return resolvePriority(numeric);
  const word = PRIORITY_WORDS[needle];
  if (word === undefined) {
    throw new ToolError(
      `Unknown priority "${input}". Use 0–4 or urgent/high/medium/low/none`,
    );
  }
  return word;
}

/**
 * The account writes are attributed to. Real deployments authenticate the MCP
 * client and use ITS identity (BACKEND_API.md §6.6 — `MutationRequest` carries
 * no authenticated actor today); with no auth layer, the workspace's first
 * member stands in, and `MCP_ACTOR` overrides it.
 */
function resolveActor(store: ServerSyncStore): UserData {
  const configured = process.env.MCP_ACTOR;
  if (configured !== undefined && configured !== "") {
    return resolveUser(store, configured);
  }
  const first = rows(store, "User")[0];
  if (first === undefined) {
    throw new ToolError(
      "This workspace has no members, so there is nobody to attribute the write to",
    );
  }
  return first;
}

/* ================================================================
 * Human-readable rendering (tool results are prose, not JSON dumps)
 * ================================================================ */

function stateName(store: ServerSyncStore, stateId: string): string {
  return row(store, "WorkflowState", stateId)?.name ?? "Unknown state";
}

function userName(store: ServerSyncStore, userId: string | undefined): string {
  if (userId === undefined) return "Unassigned";
  return row(store, "User", userId)?.displayName ?? userId;
}

function describeIssue(store: ServerSyncStore, issue: IssueData): string {
  const parts = [
    issue.identifier,
    issue.title,
    `[${stateName(store, issue.stateId)}]`,
    PRIORITY_LABELS[issue.priority],
    userName(store, issue.assigneeId),
  ];
  const project =
    issue.projectId !== undefined
      ? row(store, "Project", issue.projectId)?.name
      : undefined;
  if (project !== undefined) parts.push(`project: ${project}`);
  return parts.join(" · ");
}

function bullets(lines: readonly string[], empty: string): string {
  return lines.length === 0 ? empty : lines.map((line) => `- ${line}`).join("\n");
}

/* ================================================================
 * Issue creation — shared by create_issue AND the chat webhook
 * ================================================================ */

export interface CreateIssueInput {
  teamId: UUID;
  title: string;
  description?: string;
  priority?: Priority;
  assigneeId?: UUID;
  projectId?: UUID;
  labelIds?: UUID[];
  stateId?: UUID;
  creatorId: UUID;
}

/**
 * Allocate an identifier and insert the issue at the top of its state.
 *
 * Numbering matches what the client does (`CreateIssueModal.submit`:
 * `max(existing number) + 1`) but ALSO respects `TeamData.issueCounter`, the
 * server-owned allocator — the two agree on a pristine store and the counter
 * wins whenever it is ahead (e.g. issues were deleted). The counter is bumped
 * in the same batch, so it stays the authority.
 */
export function createIssue(
  store: ServerSyncStore,
  input: CreateIssueInput,
): IssueData {
  const team = row(store, "Team", input.teamId);
  if (team === undefined) throw new ToolError("That team no longer exists");

  const highest = rows(store, "Issue")
    .filter((issue) => issue.teamId === team.id)
    .reduce((max, issue) => Math.max(max, issue.number), 0);
  const number = Math.max(highest + 1, team.issueCounter);

  const stateId = input.stateId ?? defaultStateFor(store, team.id).id;
  // Insert above the state's current top row (ascending sortOrder).
  const inState = rows(store, "Issue")
    .filter((issue) => issue.stateId === stateId)
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const sortOrder = inState.length > 0 ? inState[0].sortOrder - 1 : 1000;

  const now = new Date().toISOString();
  const issue: IssueData = {
    id: randomUUID(),
    identifier: `${team.key}-${number}`,
    number,
    teamId: team.id,
    title: input.title,
    ...(input.description !== undefined && input.description !== ""
      ? { description: input.description }
      : {}),
    stateId,
    priority: input.priority ?? 0,
    ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
    creatorId: input.creatorId,
    labelIds: input.labelIds !== undefined ? [...input.labelIds] : [],
    ...(input.projectId !== undefined ? { projectId: input.projectId } : {}),
    subscriberIds: [input.creatorId],
    sortOrder,
    createdAt: now,
    updatedAt: now,
  };

  const activity: ActivityData = {
    id: randomUUID(),
    issueId: issue.id,
    actorId: input.creatorId,
    type: "created",
    createdAt: now,
  };

  commit(store, [
    { kind: "create", modelName: "Issue", modelId: issue.id, payload: asPayload(issue) },
    {
      kind: "create",
      modelName: "Activity",
      modelId: activity.id,
      payload: asPayload(activity),
    },
    {
      kind: "update",
      modelName: "Team",
      modelId: team.id,
      payload: { issueCounter: number + 1 },
    },
  ]);

  return issue;
}

/**
 * The chat pipeline's entry point (POST /api/integrations/inbound). Kept here
 * so Slack/Teams and MCP mint issues through ONE implementation.
 */
export function createIssueFromChat(
  store: ServerSyncStore,
  args: {
    teamId: UUID;
    title: string;
    description: string;
    priority: Priority;
    assignSelf: boolean;
    /** Label NAMES from the routing rule; unknown ones are skipped. */
    labelNames: readonly string[];
  },
): IssueData {
  const actor = resolveActor(store);
  const labels = resolveLabels(store, args.teamId, args.labelNames);
  return createIssue(store, {
    teamId: args.teamId,
    title: args.title,
    description: args.description,
    priority: args.priority,
    ...(args.assignSelf ? { assigneeId: actor.id } : {}),
    labelIds: labels.ids,
    creatorId: actor.id,
  });
}

/**
 * The workspace's first team by sort order — the destination the webhook's
 * built-in routing rule points at when no INTEGRATIONS_RULES are configured.
 */
export function firstTeam(store: ServerSyncStore): TeamData | undefined {
  return rows(store, "Team").sort((a, b) => a.sortOrder - b.sortOrder)[0];
}

/* ================================================================
 * Tool definition plumbing
 * ================================================================ */

type ToolInputShape = Record<string, z.ZodType>;

/**
 * A tool as the transport sees it: a name, a JSON-Schema-able input shape and
 * a `run` that takes UNVALIDATED input. Validation lives inside `run` so the
 * catalogue is safe to call from anywhere, not just from a transport that
 * already validated (BACKEND_API.md's MCP section documents each schema).
 */
export interface ToolDefinition {
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: ToolInputShape;
  run(rawArgs: unknown, store: ServerSyncStore): string;
}

function defineTool<S extends ToolInputShape>(def: {
  name: string;
  inputSchema: S;
  run: (args: z.infer<z.ZodObject<S>>, store: ServerSyncStore) => string;
}): ToolDefinition {
  const schema = z.object(def.inputSchema);
  // Title + description live in the client-safe catalogue so the settings
  // page advertises exactly what the model is told.
  const doc = toolDoc(def.name);
  return {
    name: def.name,
    title: doc.title,
    description: doc.description,
    inputSchema: def.inputSchema,
    run(rawArgs, store) {
      const parsed = schema.safeParse(rawArgs ?? {});
      if (!parsed.success) {
        const detail = parsed.error.issues
          .map((issue) => {
            const path = issue.path.join(".");
            return path === "" ? issue.message : `${path}: ${issue.message}`;
          })
          .join("; ");
        throw new ToolError(`Invalid arguments for ${def.name} — ${detail}`);
      }
      return def.run(parsed.data, store);
    },
  };
}

/* ---------- shared field schemas ---------- */

const teamField = z
  .string()
  .min(1)
  .describe('Team key ("TRENDZO"), name ("Trendzo") or id');
const priorityField = z
  .union([z.number().int(), z.string()])
  .describe("0–4 or urgent/high/medium/low/none");
const limitField = z
  .number()
  .int()
  .min(1)
  .max(200)
  .optional()
  .describe("Max rows to return (default 50)");

const DEFAULT_LIMIT = 50;

/* ================================================================
 * The catalogue
 * ================================================================ */

const listTeams = defineTool({
  name: "list_teams",
  inputSchema: {},
  run(_args, store) {
    const teams = rows(store, "Team").sort((a, b) => a.sortOrder - b.sortOrder);
    const issues = rows(store, "Issue");
    const lines = teams.map((team) => {
      const count = issues.filter((issue) => issue.teamId === team.id).length;
      const states = statesForTeam(store, team.id)
        .map((state) => state.name)
        .join(", ");
      return `${team.key} · ${team.name} · ${count} issues · states: ${states === "" ? "none" : states}`;
    });
    return bullets(lines, "This workspace has no teams yet.");
  },
});

const listProjects = defineTool({
  name: "list_projects",
  inputSchema: {
    team: teamField.optional(),
    status: z
      .enum(["backlog", "planned", "started", "completed", "canceled"])
      .optional()
      .describe("Filter by project status category"),
    limit: limitField,
  },
  run(args, store) {
    let projects = rows(store, "Project").sort((a, b) => a.sortOrder - b.sortOrder);
    if (args.team !== undefined) {
      const team = resolveTeam(store, args.team);
      projects = projects.filter((project) => project.teamIds.includes(team.id));
    }
    if (args.status !== undefined) {
      const status: ProjectStatusCategory = args.status;
      projects = projects.filter((project) => project.statusCategory === status);
    }
    const issues = rows(store, "Issue");
    const lines = projects.slice(0, args.limit ?? DEFAULT_LIMIT).map((project) => {
      const count = issues.filter((issue) => issue.projectId === project.id).length;
      return `${project.name} · ${project.statusCategory} · health ${project.health} · lead ${userName(store, project.leadId)} · ${count} issues`;
    });
    return bullets(lines, "No projects match that filter.");
  },
});

const listIssues = defineTool({
  name: "list_issues",
  inputSchema: {
    team: teamField.optional(),
    state: z
      .string()
      .min(1)
      .optional()
      .describe('Workflow state name ("In Progress") or category (triage/backlog/unstarted/started/completed/canceled)'),
    assignee: z.string().min(1).optional().describe("Member name, email or id"),
    project: z.string().min(1).optional().describe("Project name, slug or id"),
    limit: limitField,
  },
  run(args, store) {
    let issues = rows(store, "Issue").filter((issue) => issue.archivedAt === undefined);

    if (args.team !== undefined) {
      const team = resolveTeam(store, args.team);
      issues = issues.filter((issue) => issue.teamId === team.id);
    }
    if (args.state !== undefined) {
      const needle = norm(args.state);
      if (isStateCategory(needle)) {
        const ids = new Set(
          rows(store, "WorkflowState")
            .filter((state) => state.category === needle)
            .map((state) => state.id),
        );
        issues = issues.filter((issue) => ids.has(issue.stateId));
      } else {
        const ids = new Set(
          rows(store, "WorkflowState")
            .filter((state) => norm(state.name) === needle)
            .map((state) => state.id),
        );
        if (ids.size === 0) {
          throw new ToolError(
            `No workflow state matches "${args.state}" (try a name or a category)`,
          );
        }
        issues = issues.filter((issue) => ids.has(issue.stateId));
      }
    }
    if (args.assignee !== undefined) {
      const user = resolveUser(store, args.assignee);
      issues = issues.filter((issue) => issue.assigneeId === user.id);
    }
    if (args.project !== undefined) {
      const project = resolveProject(store, args.project);
      issues = issues.filter((issue) => issue.projectId === project.id);
    }

    const limit = args.limit ?? DEFAULT_LIMIT;
    const sorted = issues.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    const lines = sorted.slice(0, limit).map((issue) => describeIssue(store, issue));
    const header =
      sorted.length > limit
        ? `${sorted.length} issues match; showing the first ${limit}.\n`
        : `${sorted.length} issue${sorted.length === 1 ? "" : "s"} match.\n`;
    return sorted.length === 0
      ? "No issues match that filter."
      : header + bullets(lines, "");
  },
});

const getIssue = defineTool({
  name: "get_issue",
  inputSchema: {
    identifier: z.string().min(1).describe('Issue identifier, e.g. "TRENDZO-37"'),
  },
  run(args, store) {
    const needle = norm(args.identifier);
    const issue = rows(store, "Issue").find((i) => norm(i.identifier) === needle);
    if (issue === undefined) {
      throw new ToolError(`No issue with identifier "${args.identifier}"`);
    }
    const labels = issue.labelIds
      .map((id) => row(store, "Label", id)?.name)
      .filter((name): name is string => name !== undefined);
    const comments = rows(store, "Comment").filter((c) => c.issueId === issue.id);
    const team = row(store, "Team", issue.teamId);

    const lines = [
      `${issue.identifier} — ${issue.title}`,
      `Team: ${team?.name ?? issue.teamId}`,
      `State: ${stateName(store, issue.stateId)}`,
      `Priority: ${PRIORITY_LABELS[issue.priority]}`,
      `Assignee: ${userName(store, issue.assigneeId)}`,
      `Creator: ${userName(store, issue.creatorId)}`,
      `Labels: ${labels.length > 0 ? labels.join(", ") : "none"}`,
      `Project: ${issue.projectId !== undefined ? (row(store, "Project", issue.projectId)?.name ?? "unknown") : "none"}`,
      `Created: ${issue.createdAt}`,
      `Updated: ${issue.updatedAt}`,
      `Comments: ${comments.length}`,
      "",
      issue.description !== undefined && issue.description !== ""
        ? issue.description
        : "(no description)",
    ];
    return lines.join("\n");
  },
});

const searchIssues = defineTool({
  name: "search_issues",
  inputSchema: {
    query: z.string().min(1).describe("Text to look for in title or description"),
    team: teamField.optional(),
    limit: limitField,
  },
  run(args, store) {
    const needle = norm(args.query);
    let issues = rows(store, "Issue").filter((issue) => issue.archivedAt === undefined);
    if (args.team !== undefined) {
      const team = resolveTeam(store, args.team);
      issues = issues.filter((issue) => issue.teamId === team.id);
    }
    const scored = issues
      .map((issue) => {
        const inTitle = norm(issue.title).includes(needle);
        const inBody = (issue.description ?? "").toLowerCase().includes(needle);
        return { issue, score: inTitle ? 2 : inBody ? 1 : 0 };
      })
      .filter((entry) => entry.score > 0)
      .sort(
        (a, b) =>
          b.score - a.score || b.issue.updatedAt.localeCompare(a.issue.updatedAt),
      );

    if (scored.length === 0) return `No issues match "${args.query}".`;
    const limit = args.limit ?? DEFAULT_LIMIT;
    const lines = scored
      .slice(0, limit)
      .map((entry) => describeIssue(store, entry.issue));
    return `${scored.length} match${scored.length === 1 ? "" : "es"} for "${args.query}".\n${bullets(lines, "")}`;
  },
});

const createIssueTool = defineTool({
  name: "create_issue",
  inputSchema: {
    team: teamField,
    title: z.string().min(1).max(400).describe("Issue title"),
    description: z.string().optional().describe("Markdown body"),
    priority: priorityField.optional(),
    assignee: z.string().min(1).optional().describe("Member name, email or id"),
    project: z.string().min(1).optional().describe("Project name, slug or id"),
    labels: z
      .array(z.string().min(1))
      .optional()
      .describe("Label names; unknown names are reported back, not invented"),
    state: z
      .string()
      .min(1)
      .optional()
      .describe("Workflow state name or category (default: the team's backlog state)"),
  },
  run(args, store) {
    const team = resolveTeam(store, args.team);
    const actor = resolveActor(store);
    const state =
      args.state !== undefined
        ? resolveState(store, team.id, args.state)
        : defaultStateFor(store, team.id);
    const assignee = args.assignee !== undefined ? resolveUser(store, args.assignee) : undefined;
    const project = args.project !== undefined ? resolveProject(store, args.project) : undefined;
    const labels = resolveLabels(store, team.id, args.labels ?? []);

    const issue = createIssue(store, {
      teamId: team.id,
      title: args.title.trim(),
      ...(args.description !== undefined ? { description: args.description } : {}),
      ...(args.priority !== undefined ? { priority: resolvePriority(args.priority) } : {}),
      ...(assignee !== undefined ? { assigneeId: assignee.id } : {}),
      ...(project !== undefined ? { projectId: project.id } : {}),
      labelIds: labels.ids,
      stateId: state.id,
      creatorId: actor.id,
    });

    const notes: string[] = [];
    if (assignee !== undefined) notes.push(`assigned to ${assignee.displayName}`);
    if (project !== undefined) notes.push(`in project ${project.name}`);
    if (labels.ids.length > 0) notes.push(`${labels.ids.length} label(s)`);
    if (labels.missing.length > 0) {
      notes.push(`unknown labels ignored: ${labels.missing.join(", ")}`);
    }

    return [
      `Created ${issue.identifier} — ${issue.title}`,
      `State ${state.name} · ${PRIORITY_LABELS[issue.priority]}${notes.length > 0 ? ` · ${notes.join(" · ")}` : ""}`,
    ].join("\n");
  },
});

const updateIssue = defineTool({
  name: "update_issue",
  inputSchema: {
    identifier: z.string().min(1).describe('Issue identifier, e.g. "TRENDZO-37"'),
    state: z.string().min(1).optional().describe("Workflow state name or category"),
    priority: priorityField.optional(),
    assignee: z
      .string()
      .min(1)
      .optional()
      .describe('Member name/email/id, or "none" to unassign'),
    title: z.string().min(1).max(400).optional(),
    description: z.string().optional(),
    project: z
      .string()
      .min(1)
      .optional()
      .describe('Project name/slug/id, or "none" to detach'),
  },
  run(args, store) {
    const needle = norm(args.identifier);
    const issue = rows(store, "Issue").find((i) => norm(i.identifier) === needle);
    if (issue === undefined) {
      throw new ToolError(`No issue with identifier "${args.identifier}"`);
    }

    const fields: Record<string, unknown> = {};
    const activities: PendingWrite[] = [];
    const changes: string[] = [];
    const now = new Date().toISOString();
    const actor = resolveActor(store);

    const logActivity = (
      type: ActivityData["type"],
      from: string | undefined,
      to: string | undefined,
    ): void => {
      const activity: ActivityData = {
        id: randomUUID(),
        issueId: issue.id,
        actorId: actor.id,
        type,
        ...(from !== undefined ? { from } : {}),
        ...(to !== undefined ? { to } : {}),
        createdAt: now,
      };
      activities.push({
        kind: "create",
        modelName: "Activity",
        modelId: activity.id,
        payload: asPayload(activity),
      });
    };

    if (args.state !== undefined) {
      const next = resolveState(store, issue.teamId, args.state);
      if (next.id !== issue.stateId) {
        const previous = stateName(store, issue.stateId);
        fields.stateId = next.id;
        logActivity("stateChanged", previous, next.name);
        changes.push(`state ${previous} → ${next.name}`);
      }
    }
    if (args.priority !== undefined) {
      const next = resolvePriority(args.priority);
      if (next !== issue.priority) {
        fields.priority = next;
        logActivity("priorityChanged", PRIORITY_LABELS[issue.priority], PRIORITY_LABELS[next]);
        changes.push(`priority ${PRIORITY_LABELS[issue.priority]} → ${PRIORITY_LABELS[next]}`);
      }
    }
    if (args.assignee !== undefined) {
      if (norm(args.assignee) === "none") {
        if (issue.assigneeId !== undefined) {
          // Wire `null` clears a field — JSON cannot carry undefined (§5.4).
          fields.assigneeId = null;
          logActivity("assigneeChanged", userName(store, issue.assigneeId), undefined);
          changes.push("unassigned");
        }
      } else {
        const user = resolveUser(store, args.assignee);
        if (user.id !== issue.assigneeId) {
          fields.assigneeId = user.id;
          logActivity("assigneeChanged", userName(store, issue.assigneeId), user.displayName);
          changes.push(`assignee → ${user.displayName}`);
        }
      }
    }
    if (args.title !== undefined && args.title.trim() !== issue.title) {
      fields.title = args.title.trim();
      changes.push("title updated");
    }
    if (args.description !== undefined && args.description !== issue.description) {
      fields.description = args.description;
      changes.push("description updated");
    }
    if (args.project !== undefined) {
      if (norm(args.project) === "none") {
        if (issue.projectId !== undefined) {
          fields.projectId = null;
          logActivity("projectChanged", row(store, "Project", issue.projectId)?.name, undefined);
          changes.push("removed from its project");
        }
      } else {
        const project = resolveProject(store, args.project);
        if (project.id !== issue.projectId) {
          const previous =
            issue.projectId !== undefined
              ? row(store, "Project", issue.projectId)?.name
              : undefined;
          fields.projectId = project.id;
          logActivity("projectChanged", previous, project.name);
          changes.push(`project → ${project.name}`);
        }
      }
    }

    if (changes.length === 0) {
      return `${issue.identifier} already matches those values — nothing changed.`;
    }

    fields.updatedAt = now;
    commit(store, [
      { kind: "update", modelName: "Issue", modelId: issue.id, payload: fields },
      ...activities,
    ]);

    return `Updated ${issue.identifier} — ${issue.title}\n${changes.map((c) => `- ${c}`).join("\n")}`;
  },
});

const addComment = defineTool({
  name: "add_comment",
  inputSchema: {
    identifier: z.string().min(1).describe('Issue identifier, e.g. "TRENDZO-37"'),
    body: z.string().min(1).describe("Comment text (markdown)"),
    author: z
      .string()
      .min(1)
      .optional()
      .describe("Member to attribute the comment to (default: the MCP actor)"),
  },
  run(args, store) {
    const needle = norm(args.identifier);
    const issue = rows(store, "Issue").find((i) => norm(i.identifier) === needle);
    if (issue === undefined) {
      throw new ToolError(`No issue with identifier "${args.identifier}"`);
    }
    const author =
      args.author !== undefined ? resolveUser(store, args.author) : resolveActor(store);
    const now = new Date().toISOString();

    const comment: CommentData = {
      id: randomUUID(),
      issueId: issue.id,
      authorId: author.id,
      body: args.body,
      createdAt: now,
      updatedAt: now,
    };
    const activity: ActivityData = {
      id: randomUUID(),
      issueId: issue.id,
      actorId: author.id,
      type: "commented",
      createdAt: now,
    };

    commit(store, [
      {
        kind: "create",
        modelName: "Comment",
        modelId: comment.id,
        payload: asPayload(comment),
      },
      {
        kind: "create",
        modelName: "Activity",
        modelId: activity.id,
        payload: asPayload(activity),
      },
      {
        kind: "update",
        modelName: "Issue",
        modelId: issue.id,
        payload: { updatedAt: now },
      },
    ]);

    const preview = args.body.length > 80 ? `${args.body.slice(0, 80)}…` : args.body;
    return `Commented on ${issue.identifier} as ${author.displayName}: "${preview}"`;
  },
});

/** "Driver App" → "driver-app" (route-safe; matches NewProjectDialog). */
function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "project" : slug;
}

/** First 12 hex digits of the row id — the captured `-0f150687c354` suffix. */
function shortIdOf(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, "").toLowerCase();
  return (hex + "0123456789ab").slice(0, 12);
}

const createProject = defineTool({
  name: "create_project",
  inputSchema: {
    name: z.string().min(1).max(200).describe("Project name"),
    teams: z
      .array(teamField)
      .optional()
      .describe("Team keys/names the project belongs to"),
    summary: z.string().optional().describe("One-line summary shown in tables"),
    description: z.string().optional().describe("Markdown overview"),
    lead: z.string().min(1).optional().describe("Member name, email or id"),
    priority: priorityField.optional(),
    status: z
      .enum(["backlog", "planned", "started", "completed", "canceled"])
      .optional()
      .describe("Status category (default: backlog)"),
    targetDate: z.string().optional().describe("ISO date, e.g. 2026-09-30"),
  },
  run(args, store) {
    const teams = (args.teams ?? []).map((hint) => resolveTeam(store, hint));
    const lead = args.lead !== undefined ? resolveUser(store, args.lead) : undefined;
    const actor = resolveActor(store);

    const id = randomUUID();
    const now = new Date().toISOString();
    const maxSort = rows(store, "Project").reduce(
      (max, project) => Math.max(max, project.sortOrder),
      0,
    );

    const project: ProjectData = {
      id,
      slug: `${slugifyName(args.name)}-${shortIdOf(id)}`,
      name: args.name.trim(),
      color: "#6e79d6",
      ...(args.summary !== undefined && args.summary !== ""
        ? { summary: args.summary }
        : {}),
      ...(args.description !== undefined && args.description !== ""
        ? { description: args.description }
        : {}),
      statusCategory: args.status ?? "backlog",
      health: "noUpdate",
      priority: args.priority !== undefined ? resolvePriority(args.priority) : 0,
      ...(lead !== undefined ? { leadId: lead.id } : {}),
      memberIds: lead !== undefined ? [lead.id] : [],
      teamIds: teams.map((team) => team.id),
      ...(args.targetDate !== undefined && args.targetDate !== ""
        ? { targetDate: args.targetDate }
        : {}),
      labelIds: [],
      resources: [],
      sortOrder: maxSort + 100,
      createdAt: now,
      updatedAt: now,
    };
    const activity: ActivityData = {
      id: randomUUID(),
      projectId: id,
      actorId: actor.id,
      type: "created",
      createdAt: now,
    };

    commit(store, [
      { kind: "create", modelName: "Project", modelId: id, payload: asPayload(project) },
      {
        kind: "create",
        modelName: "Activity",
        modelId: activity.id,
        payload: asPayload(activity),
      },
    ]);

    const teamNote =
      teams.length > 0 ? ` for ${teams.map((team) => team.key).join(", ")}` : "";
    return `Created project "${project.name}"${teamNote} · ${project.statusCategory} · lead ${lead?.displayName ?? "unassigned"}\nslug: ${project.slug}`;
  },
});

/** The catalogue, in the order `tools/list` reports it. */
export const TOOLS: readonly ToolDefinition[] = [
  listTeams,
  listProjects,
  listIssues,
  getIssue,
  searchIssues,
  createIssueTool,
  updateIssue,
  addComment,
  createProject,
];

export function toolByName(name: string): ToolDefinition | undefined {
  return TOOLS.find((tool) => tool.name === name);
}

/**
 * Run a tool against the live server store. Returns the text payload plus
 * whether it failed — the transport maps this onto an MCP tool result.
 */
export function runTool(
  name: string,
  args: unknown,
): { text: string; isError: boolean } {
  const tool = toolByName(name);
  if (tool === undefined) {
    return { text: `Unknown tool "${name}"`, isError: true };
  }
  try {
    return { text: tool.run(args, ServerSyncStore.instance()), isError: false };
  } catch (error) {
    if (error instanceof ToolError) return { text: error.message, isError: true };
    const message = error instanceof Error ? error.message : String(error);
    return { text: `Tool "${name}" failed: ${message}`, isError: true };
  }
}
