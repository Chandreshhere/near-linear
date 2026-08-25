"use client";

/**
 * Loops — MASTER_PROMPT.md §21 / docs/analysis/research-agent-sync.md §1.
 * "Loops let you define scheduled or event-driven operations for the agent to
 * run across your workspace."
 *
 * Model: trigger (schedule | issue created | issue updated) + conditions +
 * instructions + connectors + per-loop permissions, draft → published
 * versioning with restore, real run history, enable/disable.
 *
 * MobX store mirrored to localStorage under "agentLoops".
 *
 * `runLoop()` is NOT decorative: it resolves the issues that match the loop's
 * conditions out of the live store and drives the SAME AgentAdapter the chat
 * uses over each one, so the run row records the mutations that actually
 * landed.
 */

import { makeObservable, observable, runInAction } from "mobx";
import { useEffect, useState } from "react";
import type { AgentAction, AgentAdapter } from "@/lib/agent/engine";
import type { SyncStore } from "@/lib/data/store";
import type { IssueData } from "@/lib/data/types";

/* ================================================================
 * Shape
 * ================================================================ */

export type LoopStatus = "draft" | "published" | "disabled";
export type LoopTriggerKind = "schedule" | "issueCreated" | "issueUpdated";

export type LoopConditionProperty =
  | "team"
  | "status"
  | "priority"
  | "label"
  | "assignee";

export interface LoopCondition {
  id: string;
  property: LoopConditionProperty;
  /** Entity id, priority number as text, or "unassigned". */
  value: string;
}

export interface LoopTrigger {
  kind: LoopTriggerKind;
  /** Human cadence phrasing, schedule triggers only ("Every Monday morning"). */
  cadence?: string;
}

export interface LoopRun {
  id: string;
  startedAt: string;
  durationMs: number;
  actions: AgentAction[];
  outcome: "success" | "noMatches" | "failed";
  /** One-line human summary shown in the run history row. */
  detail: string;
}

/** Everything `publish` snapshots (restorable from the Versions menu). */
export interface LoopSnapshot {
  name: string;
  trigger: LoopTrigger;
  conditions: LoopCondition[];
  instructions: string;
  connectors: string[];
  permissions: Record<string, boolean>;
}

export interface LoopVersion {
  id: string;
  version: number;
  publishedAt: string;
  snapshot: LoopSnapshot;
}

export interface LoopData extends LoopSnapshot {
  id: string;
  status: LoopStatus;
  versions: LoopVersion[];
  runs: LoopRun[];
  createdAt: string;
  updatedAt: string;
  lastRunAt?: string;
}

/* ================================================================
 * Catalogues (labels live with the data so the builder stays declarative)
 * ================================================================ */

export const LOOP_CADENCES: readonly string[] = [
  "Every weekday morning",
  "Every Monday afternoon",
  "Every day at 09:00",
  "Every hour",
  "Every Friday at 16:00",
  "First of the month",
];

export const LOOP_TRIGGERS: readonly { kind: LoopTriggerKind; label: string; hint: string }[] =
  [
    {
      kind: "schedule",
      label: "Schedule",
      hint: "Run on a cadence, whatever changed.",
    },
    {
      kind: "issueCreated",
      label: "Issue created",
      hint: "Run when a new issue matches the conditions.",
    },
    {
      kind: "issueUpdated",
      label: "Issue updated",
      hint: "Run when a matching issue changes.",
    },
  ];

export const LOOP_CONDITION_PROPERTIES: readonly {
  property: LoopConditionProperty;
  label: string;
}[] = [
  { property: "team", label: "Team" },
  { property: "status", label: "Status" },
  { property: "priority", label: "Priority" },
  { property: "label", label: "Label" },
  { property: "assignee", label: "Assignee" },
];

/**
 * The connector catalogue (§21). Toggling one is real and persisted — the id
 * lands in `LoopData.connectors`, which is what a run would consult before
 * reaching outside the workspace.
 *
 * BACKEND SEAM: what a connector cannot do here is actually connect. Each of
 * these is an MCP endpoint registered server-side, reached with an OAuth grant
 * the user completes against that third party; there is no server to hold the
 * grant and no third party to grant it. The builder says so next to the
 * toggles rather than implying a live integration.
 */
export const LOOP_CONNECTORS: readonly { id: string; name: string; hint: string }[] = [
  { id: "github", name: "GitHub", hint: "Pull request and repository context" },
  { id: "slack", name: "Slack", hint: "Post summaries to a channel" },
  { id: "notion", name: "Notion", hint: "Read specs and product docs" },
  { id: "sentry", name: "Sentry", hint: "Attach error events to issues" },
];

/** The documented per-loop permission toggles (research §1 → Loops). */
export const LOOP_PERMISSIONS: readonly {
  id: string;
  label: string;
  hint: string;
}[] = [
  { id: "teamRead", label: "Team read access", hint: "Read issues, projects and comments in scope" },
  { id: "teamWrite", label: "Team write access", hint: "Create and update issues and projects" },
  { id: "webAccess", label: "Web access", hint: "Fetch public pages while running" },
  { id: "codeIntelligence", label: "Code intelligence", hint: "Browse and analyze connected repositories" },
  { id: "codingSessions", label: "Coding sessions", hint: "Start sandboxed sessions and open draft PRs" },
  {
    id: "externalSyncWrite",
    label: "Write to externally synced issues",
    hint: "Edit issues mirrored from GitHub, Jira or Intercom",
  },
  {
    id: "actOutsideIssue",
    label: "Act outside the triggering issue",
    hint: "Touch issues other than the one that started the run",
  },
];

/** One-line trigger summary for the loop list row. */
export function describeTrigger(loop: LoopData): string {
  const base =
    loop.trigger.kind === "schedule"
      ? loop.trigger.cadence ?? "On a schedule"
      : loop.trigger.kind === "issueCreated"
        ? "When an issue is created"
        : "When an issue is updated";
  const count = loop.conditions.length;
  return count === 0
    ? base
    : `${base} · ${count} ${count === 1 ? "condition" : "conditions"}`;
}

function defaultPermissions(): Record<string, boolean> {
  const permissions: Record<string, boolean> = {};
  for (const permission of LOOP_PERMISSIONS) {
    // Read is on by default; every write-shaped capability is opt-in.
    permissions[permission.id] = permission.id === "teamRead";
  }
  return permissions;
}

/* ================================================================
 * Storage
 * ================================================================ */

const STORAGE_KEY = "agentLoops";
/** Safety rail so one "Run now" can never storm the whole workspace. */
const MAX_ISSUES_PER_RUN = 5;

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `l-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function isLoop(value: unknown): value is LoopData {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.instructions === "string" &&
    typeof row.trigger === "object" &&
    row.trigger !== null
  );
}

function parseLoops(raw: string | null): LoopData[] {
  if (raw === null || raw === "") return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isLoop).map((loop) => ({
      ...loop,
      conditions: Array.isArray(loop.conditions) ? loop.conditions : [],
      connectors: Array.isArray(loop.connectors) ? loop.connectors : [],
      permissions:
        typeof loop.permissions === "object" && loop.permissions !== null
          ? loop.permissions
          : defaultPermissions(),
      versions: Array.isArray(loop.versions) ? loop.versions : [],
      runs: Array.isArray(loop.runs) ? loop.runs : [],
    }));
  } catch {
    return [];
  }
}

/* ================================================================
 * Store
 * ================================================================ */

export class AgentLoopStore {
  loops: LoopData[] = [];
  hydrated = false;

  constructor() {
    makeObservable(this, { loops: observable, hydrated: observable });
  }

  hydrate(): void {
    if (this.hydrated || typeof window === "undefined") return;
    const stored = parseLoops(window.localStorage.getItem(STORAGE_KEY));
    runInAction(() => {
      this.loops = stored;
      this.hydrated = true;
    });
  }

  private persist(): void {
    if (!this.hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.loops));
    } catch {
      /* best-effort */
    }
  }

  get(id: string): LoopData | undefined {
    return this.loops.find((loop) => loop.id === id);
  }

  /** Most recently touched first. */
  byRecency(): LoopData[] {
    return this.loops.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  create(name = "New loop"): LoopData {
    const now = new Date().toISOString();
    const loop: LoopData = {
      id: newId(),
      name,
      status: "draft",
      trigger: { kind: "schedule", cadence: LOOP_CADENCES[0] },
      conditions: [],
      instructions: "",
      connectors: [],
      permissions: defaultPermissions(),
      versions: [],
      runs: [],
      createdAt: now,
      updatedAt: now,
    };
    runInAction(() => {
      this.loops.push(loop);
    });
    this.persist();
    return loop;
  }

  update(id: string, patch: Partial<LoopSnapshot>): void {
    const loop = this.get(id);
    if (loop === undefined) return;
    runInAction(() => {
      Object.assign(loop, patch);
      loop.updatedAt = new Date().toISOString();
    });
    this.persist();
  }

  /** Draft → published: snapshot the current definition as a new version. */
  publish(id: string): LoopVersion | undefined {
    const loop = this.get(id);
    if (loop === undefined) return undefined;
    const version: LoopVersion = {
      id: newId(),
      version: loop.versions.length + 1,
      publishedAt: new Date().toISOString(),
      snapshot: {
        name: loop.name,
        trigger: { ...loop.trigger },
        conditions: loop.conditions.map((c) => ({ ...c })),
        instructions: loop.instructions,
        connectors: [...loop.connectors],
        permissions: { ...loop.permissions },
      },
    };
    runInAction(() => {
      loop.versions.push(version);
      loop.status = "published";
      loop.updatedAt = version.publishedAt;
    });
    this.persist();
    return version;
  }

  /** "All published versions of a loop are saved and can be restored." */
  restoreVersion(id: string, versionId: string): void {
    const loop = this.get(id);
    const version = loop?.versions.find((v) => v.id === versionId);
    if (loop === undefined || version === undefined) return;
    runInAction(() => {
      Object.assign(loop, {
        name: version.snapshot.name,
        trigger: { ...version.snapshot.trigger },
        conditions: version.snapshot.conditions.map((c) => ({ ...c })),
        instructions: version.snapshot.instructions,
        connectors: [...version.snapshot.connectors],
        permissions: { ...version.snapshot.permissions },
      });
      loop.updatedAt = new Date().toISOString();
    });
    this.persist();
  }

  setStatus(id: string, status: LoopStatus): void {
    const loop = this.get(id);
    if (loop === undefined) return;
    runInAction(() => {
      loop.status = status;
      loop.updatedAt = new Date().toISOString();
    });
    this.persist();
  }

  duplicate(id: string): LoopData | undefined {
    const loop = this.get(id);
    if (loop === undefined) return undefined;
    const now = new Date().toISOString();
    const copy: LoopData = {
      ...loop,
      id: newId(),
      name: `${loop.name} copy`,
      status: "draft",
      versions: [],
      runs: [],
      createdAt: now,
      updatedAt: now,
      lastRunAt: undefined,
      trigger: { ...loop.trigger },
      conditions: loop.conditions.map((c) => ({ ...c, id: newId() })),
      connectors: [...loop.connectors],
      permissions: { ...loop.permissions },
    };
    runInAction(() => {
      this.loops.push(copy);
    });
    this.persist();
    return copy;
  }

  /** Deletion is permanent (documented behavior). */
  remove(id: string): void {
    runInAction(() => {
      this.loops = this.loops.filter((loop) => loop.id !== id);
    });
    this.persist();
  }

  recordRun(id: string, run: LoopRun): void {
    const loop = this.get(id);
    if (loop === undefined) return;
    runInAction(() => {
      loop.runs.unshift(run);
      loop.lastRunAt = run.startedAt;
      loop.updatedAt = run.startedAt;
    });
    this.persist();
  }
}

/* ================================================================
 * Condition matching + execution
 * ================================================================ */

function matchesCondition(
  issue: IssueData,
  condition: LoopCondition,
): boolean {
  switch (condition.property) {
    case "team":
      return issue.teamId === condition.value;
    case "status":
      return issue.stateId === condition.value;
    case "priority":
      return String(issue.priority) === condition.value;
    case "label":
      return issue.labelIds.includes(condition.value);
    case "assignee":
      return condition.value === "unassigned"
        ? issue.assigneeId === undefined
        : issue.assigneeId === condition.value;
    default:
      return false;
  }
}

/** Issues the loop would fire on right now (all conditions must hold). */
export function matchingIssues(loop: LoopData, store: SyncStore): IssueData[] {
  return store
    .all("Issue")
    .filter((issue) => !issue.archivedAt)
    .filter((issue) => loop.conditions.every((c) => matchesCondition(issue, c)))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/**
 * Execute one run. Issue-triggered loops drive the adapter once per matching
 * issue (with that issue as focus context, so bare instructions like "set
 * priority to high" resolve); scheduled loops without conditions run once at
 * workspace scope.
 */
export async function runLoop(
  loop: LoopData,
  store: SyncStore,
  adapter: AgentAdapter,
  workspace: string,
): Promise<LoopRun> {
  const startedAt = new Date().toISOString();
  const t0 = Date.now();
  const instructions = loop.instructions.trim();
  const finish = (
    outcome: LoopRun["outcome"],
    detail: string,
    actions: AgentAction[],
  ): LoopRun => ({
    id: newId(),
    startedAt,
    durationMs: Math.max(1, Date.now() - t0),
    actions,
    outcome,
    detail,
  });

  if (instructions === "") {
    return finish("failed", "No instructions — nothing to run.", []);
  }

  const controller = new AbortController();
  const noop = (): void => {
    /* run history keeps the result, not the token stream */
  };
  const actions: AgentAction[] = [];

  const scoped = loop.trigger.kind !== "schedule" || loop.conditions.length > 0;
  const targets = scoped ? matchingIssues(loop, store).slice(0, MAX_ISSUES_PER_RUN) : [];

  try {
    if (scoped) {
      if (targets.length === 0) {
        return finish("noMatches", "No issues matched the loop conditions.", []);
      }
      for (const issue of targets) {
        const result = await adapter.send(
          {
            text: instructions,
            context: { workspace, focus: { kind: "issue", id: issue.id } },
          },
          noop,
          controller.signal,
        );
        actions.push(...result.actions);
      }
      const changed = actions.length;
      return finish(
        "success",
        `Reviewed ${targets.length} matching ${
          targets.length === 1 ? "issue" : "issues"
        } · ${changed} ${changed === 1 ? "change" : "changes"} applied`,
        actions,
      );
    }

    const result = await adapter.send(
      { text: instructions, context: { workspace } },
      noop,
      controller.signal,
    );
    actions.push(...result.actions);
    return finish(
      "success",
      actions.length > 0
        ? `${actions.length} ${actions.length === 1 ? "change" : "changes"} applied`
        : "Reviewed the workspace · no changes needed",
      actions,
    );
  } catch {
    return finish("failed", "The run stopped before it finished.", actions);
  }
}

/* ================================================================
 * Singleton + hook
 * ================================================================ */

let instance: AgentLoopStore | null = null;

export function getAgentLoops(): AgentLoopStore {
  if (instance === null) instance = new AgentLoopStore();
  return instance;
}

export function useAgentLoops(): AgentLoopStore {
  const [store] = useState(getAgentLoops);
  useEffect(() => {
    store.hydrate();
  }, [store]);
  return store;
}
