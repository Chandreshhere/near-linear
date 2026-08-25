/**
 * Team creation + membership operations (MASTER_PROMPT.md §5 "Your teams",
 * §10.6, §17.2 "default team auto-created with workspace name").
 *
 * Every write goes through the local-first engine's transaction queue, so a
 * new team is optimistic-applied to the MobX pool (the sidebar re-renders
 * instantly), persisted to IndexedDB and broadcast to the other tabs exactly
 * like any other mutation. No component may build a team row by hand.
 */

import type { SyncClient } from "@/lib/data/SyncClient";
import type { SyncStore } from "@/lib/data/store";
import type {
  StateCategory,
  TeamData,
  UUID,
  WorkflowStateData,
} from "@/lib/data/types";

/** Identifier rules: 2–5 chars, starts with a letter, A–Z0–9 only. */
export const TEAM_KEY_MIN = 2;
export const TEAM_KEY_MAX = 5;
const KEY_SHAPE = /^[A-Z][A-Z0-9]{1,4}$/;

/**
 * The six statuses every new team starts with — the SAME category + color
 * mapping the fixtures seed (src/lib/data/fixtures.ts STATE_SEEDS). Kept
 * here rather than imported so the UI bundle does not pull in the fixture
 * data set; the two lists must stay identical.
 */
export const DEFAULT_TEAM_STATES: {
  slug: string;
  name: string;
  color: string;
  category: StateCategory;
  position: number;
}[] = [
  { slug: "backlog", name: "Backlog", color: "#bec2c8", category: "backlog", position: 0 },
  { slug: "todo", name: "Todo", color: "#e2e2e2", category: "unstarted", position: 0 },
  { slug: "in-progress", name: "In Progress", color: "#f2994a", category: "started", position: 0 },
  { slug: "done", name: "Done", color: "#5e6ad2", category: "completed", position: 0 },
  { slug: "canceled", name: "Canceled", color: "#8a8f98", category: "canceled", position: 0 },
  { slug: "duplicate", name: "Duplicate", color: "#8a8f98", category: "canceled", position: 1 },
];

/** Sprite symbols offered by the team icon picker (all exist in Sprites.tsx). */
export const TEAM_ICON_CHOICES: string[] = [
  "Team",
  "Feather",
  "Chip",
  "Europe",
  "Radar",
  "Rocket",
  "Home",
  "Project",
  "Loop",
  "Folder",
  "Label",
  "Calendar",
  "GitBranch",
  "Insights",
  "Agent",
  "Lock",
];

/** Team tints in the captured range (seed.ts uses the same family). */
export const TEAM_COLOR_CHOICES: string[] = [
  "#00a0ff",
  "#008fff",
  "#5e6ad2",
  "#bb87fc",
  "#f85911",
  "#d67600",
  "#789c00",
  "#00aa00",
  "#00b187",
  "#26b5ce",
  "#eb5757",
  "#95a2b3",
];

/**
 * "Design" → "DES", "Growth Team" → "GT", "Q4 Ops" → "QO".
 * Multi-word names use initials (that is what the reference does); a single
 * word takes its first three characters.
 */
export function deriveTeamKey(name: string): string {
  const words = name
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((w) => w.length > 0);
  if (words.length === 0) return "";
  const raw =
    words.length > 1
      ? words.map((w) => w[0]).join("")
      : words[0].slice(0, 3);
  return raw.replace(/^[^A-Z]+/, "").slice(0, TEAM_KEY_MAX);
}

/**
 * Identifier for the team a NEW WORKSPACE auto-creates (§17.2 "a default team
 * is created with the workspace name"). The captured behaviour takes the first
 * three letters of the name rather than its initials, so "Acme" and
 * "Acme Labs" both land on `ACM` — that is the prefix people expect to see on
 * their very first issue. `deriveTeamKey` above stays the rule for teams a
 * user adds later ("Growth Team" → `GT`).
 */
export function deriveWorkspaceTeamKey(name: string): string {
  const letters = name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
    .replace(/^[^A-Z]+/, "");
  const candidate = letters.slice(0, 3);
  if (candidate.length >= TEAM_KEY_MIN) return candidate;
  const fallback = deriveTeamKey(name);
  return fallback.length >= TEAM_KEY_MIN ? fallback : "TEAM";
}

/** Case-insensitive uniqueness check against the pool (optionally skipping one team). */
export function isTeamKeyTaken(
  store: SyncStore,
  key: string,
  exceptTeamId?: UUID,
): boolean {
  const needle = key.trim().toUpperCase();
  return store
    .all("Team")
    .some((t) => t.key.toUpperCase() === needle && t.id !== exceptTeamId);
}

/** null = valid; otherwise the message to show under the identifier field. */
export function validateTeamKey(
  store: SyncStore,
  key: string,
  exceptTeamId?: UUID,
): string | null {
  const value = key.trim().toUpperCase();
  if (value.length < TEAM_KEY_MIN) {
    return `Identifiers are at least ${TEAM_KEY_MIN} characters.`;
  }
  if (value.length > TEAM_KEY_MAX) {
    return `Identifiers are at most ${TEAM_KEY_MAX} characters.`;
  }
  if (!KEY_SHAPE.test(value)) {
    return "Use letters and numbers only, starting with a letter.";
  }
  if (isTeamKeyTaken(store, value, exceptTeamId)) {
    return `${value} is already used by another team.`;
  }
  return null;
}

/** Local id allocator — crypto.randomUUID when available, else a sortable stub. */
export function newId(prefix: string): UUID {
  const c = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (c !== undefined && typeof c.randomUUID === "function") return c.randomUUID();
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export interface NewTeamInput {
  name: string;
  key: string;
  icon: string;
  color: string;
  /** Members of the new team — the creator is added automatically. */
  memberIds?: UUID[];
}

/**
 * Create a team plus its six default workflow states, all in one batch
 * (same tick → one MutationRequest). Returns the created row.
 */
export function createTeam(
  client: SyncClient,
  input: NewTeamInput,
  creatorId: UUID,
): TeamData {
  const teams = client.store.all("Team");
  const sortOrder = teams.reduce((max, t) => Math.max(max, t.sortOrder), -1) + 1;
  const memberIds = Array.from(
    new Set([creatorId, ...(input.memberIds ?? [])]),
  );

  const team: TeamData = {
    id: newId("team"),
    key: input.key.trim().toUpperCase(),
    name: input.name.trim(),
    icon: input.icon,
    color: input.color,
    sortOrder,
    cyclesEnabled: false,
    triageEnabled: false,
    issueCounter: 1,
    memberIds,
  };

  client.queue.enqueue(
    "create",
    "Team",
    team.id,
    team as unknown as Record<string, unknown>,
  );

  for (const seed of DEFAULT_TEAM_STATES) {
    const state: WorkflowStateData = {
      id: `state-${team.key.toLowerCase()}-${seed.slug}-${newId("s").slice(0, 8)}`,
      teamId: team.id,
      name: seed.name,
      color: seed.color,
      category: seed.category,
      position: seed.position,
    };
    client.queue.enqueue(
      "create",
      "WorkflowState",
      state.id,
      state as unknown as Record<string, unknown>,
    );
  }

  return team;
}

/** Membership helpers — `undefined` memberIds means "everyone" (pre-v4 rows). */
export function isTeamMember(team: TeamData, userId: UUID): boolean {
  return team.memberIds === undefined || team.memberIds.includes(userId);
}

export function setTeamMembership(
  client: SyncClient,
  team: TeamData,
  userId: UUID,
  member: boolean,
): void {
  const current = team.memberIds ?? [];
  const next = member
    ? Array.from(new Set([...current, userId]))
    : current.filter((id) => id !== userId);
  client.queue.enqueue("update", "Team", team.id, { memberIds: next });
}

/** Deleting a team takes its workflow states with it (no orphan rows). */
export function deleteTeam(client: SyncClient, team: TeamData): void {
  for (const state of client.store.statesForTeam(team.id)) {
    client.queue.enqueue("delete", "WorkflowState", state.id);
  }
  client.queue.enqueue("delete", "Team", team.id);
}
