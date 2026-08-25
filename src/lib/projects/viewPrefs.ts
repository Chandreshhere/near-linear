"use client";

/**
 * Project-view display preferences — MASTER_PROMPT.md §11.1 applied to the
 * projects surface (§10.1).
 *
 * Storage is the SAME ViewPreference model the issue views use
 * (`${userId}:${viewKey}` rows, upserted optimistically through
 * `client.mutate.updateViewPreference`), so nothing new lands in the engine.
 * Only the VOCABULARY differs: projects group by status/health/lead/team,
 * order by name/target date/…, and their display-property chips name project
 * columns (Health, Priority, Lead, Target date, Issues, Status, Milestone,
 * Progress) instead of issue ones. `lib/issues/viewPrefs.ts` bakes the issue
 * vocabulary into its defaults and its `isDefault` comparison, hence this
 * sibling hook rather than a parameter on it — the two never share a row.
 */

import { useCallback } from "react";
import { toJS } from "mobx";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import type { ProjectData, ViewPreferenceData } from "@/lib/data/types";
import type { SyncStore } from "@/lib/data/store";

/* ================================================================
 * Vocabulary
 * ================================================================ */

export type ProjectGrouping = "none" | "status" | "health" | "priority" | "lead" | "team";
export type ProjectOrdering =
  | "manual"
  | "name"
  | "health"
  | "priority"
  | "targetDate"
  | "status";

export const PROJECT_GROUPING_OPTIONS: { value: ProjectGrouping; label: string }[] = [
  { value: "none", label: "No grouping" },
  { value: "status", label: "Status" },
  { value: "health", label: "Health" },
  { value: "priority", label: "Priority" },
  { value: "lead", label: "Lead" },
  { value: "team", label: "Team" },
];

export const PROJECT_ORDERING_OPTIONS: { value: ProjectOrdering; label: string }[] = [
  { value: "manual", label: "Manual" },
  { value: "name", label: "Name" },
  { value: "health", label: "Health" },
  { value: "priority", label: "Priority" },
  { value: "targetDate", label: "Target date" },
  { value: "status", label: "Status" },
];

/**
 * The display-property chips (§11.1 chip grid). Every key except `milestone`
 * and `progress` is a real grid column — toggling it removes the column from
 * the subgrid template, so the table never leaves a hole.
 */
export const PROJECT_DISPLAY_PROPERTIES: { key: string; label: string }[] = [
  { key: "milestone", label: "Milestone" },
  { key: "health", label: "Health" },
  { key: "priority", label: "Priority" },
  { key: "lead", label: "Lead" },
  { key: "targetDate", label: "Target date" },
  { key: "issues", label: "Issues" },
  { key: "status", label: "Status" },
  { key: "progress", label: "Progress" },
];

/** Captured default configuration of the projects table (capture §6.2/§6.3). */
export const PROJECT_VIEW_DEFAULTS: Omit<
  ViewPreferenceData,
  "id" | "userId" | "viewKey"
> = {
  layout: "list",
  grouping: "none",
  subGrouping: "none",
  ordering: "manual",
  showSubIssues: false,
  showEmptyGroups: false,
  completedFilter: "all",
  displayProperties: [
    "milestone",
    "health",
    "priority",
    "lead",
    "targetDate",
    "issues",
    "status",
    "progress",
  ],
};

function prefId(viewKey: string): string {
  return `${CURRENT_USER_ID}:${viewKey}`;
}

function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  for (const key of a) {
    if (!set.has(key)) return false;
  }
  return true;
}

function defaultRow(viewKey: string): ViewPreferenceData {
  return {
    ...PROJECT_VIEW_DEFAULTS,
    displayProperties: [...PROJECT_VIEW_DEFAULTS.displayProperties],
    id: prefId(viewKey),
    userId: CURRENT_USER_ID,
    viewKey,
  };
}

function matchesDefaults(pref: ViewPreferenceData): boolean {
  return (
    pref.grouping === PROJECT_VIEW_DEFAULTS.grouping &&
    pref.ordering === PROJECT_VIEW_DEFAULTS.ordering &&
    pref.showEmptyGroups === PROJECT_VIEW_DEFAULTS.showEmptyGroups &&
    sameMembers(pref.displayProperties, PROJECT_VIEW_DEFAULTS.displayProperties)
  );
}

/**
 * Read + write one project view's display preference. Same contract as the
 * issue hook: `pref` is the stored observable row (or the project defaults),
 * `update` merges + upserts the full row optimistically, `isDefault` drives
 * the badge dot and the Reset footer.
 */
export function useProjectViewPreference(viewKey: string): {
  pref: ViewPreferenceData;
  update: (patch: Partial<ViewPreferenceData>) => void;
  isDefault: boolean;
  reset: () => void;
} {
  const client = useSyncClient();
  const store = useStore();
  const id = prefId(viewKey);

  // Observable read — tracked by the calling observer() component.
  const row = store.get("ViewPreference", id);
  const pref: ViewPreferenceData = row ?? defaultRow(viewKey);

  const update = useCallback(
    (patch: Partial<ViewPreferenceData>): void => {
      // Re-read at call time (untracked event handler) so merges never work
      // from a stale render closure.
      const current = store.get("ViewPreference", id);
      const base: ViewPreferenceData = current ? toJS(current) : defaultRow(viewKey);
      client.mutate.updateViewPreference({
        ...base,
        ...patch,
        id,
        userId: CURRENT_USER_ID,
        viewKey,
      });
    },
    [client, store, id, viewKey],
  );

  const reset = useCallback((): void => {
    client.mutate.updateViewPreference(defaultRow(viewKey));
  }, [client, viewKey]);

  return { pref, update, isDefault: matchesDefaults(pref), reset };
}

/* ================================================================
 * Grouping + ordering (pure — the table and the insights rail share them)
 * ================================================================ */

const HEALTH_RANK: Record<string, number> = {
  onTrack: 0,
  atRisk: 1,
  offTrack: 2,
  noUpdate: 3,
};

const STATUS_RANK: Record<string, number> = {
  backlog: 0,
  planned: 1,
  started: 2,
  completed: 3,
  canceled: 4,
};

/** Urgent, high, medium, low; no-priority last (same rank as issue lists). */
const PRIORITY_RANK: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 };

export const PROJECT_HEALTH_LABEL: Record<string, string> = {
  noUpdate: "No updates",
  onTrack: "On track",
  atRisk: "At risk",
  offTrack: "Off track",
};

export const PROJECT_STATUS_LABEL: Record<string, string> = {
  backlog: "Backlog",
  planned: "Planned",
  started: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

export const PROJECT_PRIORITY_LABEL: Record<number, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

/** Sort key extraction shared by the ordering select and the column headers. */
export function compareProjects(
  ordering: string,
  a: ProjectData,
  b: ProjectData,
): number {
  switch (ordering) {
    case "name":
      return a.name.localeCompare(b.name);
    case "health":
      return (HEALTH_RANK[a.health] ?? 9) - (HEALTH_RANK[b.health] ?? 9);
    case "priority":
      return (PRIORITY_RANK[a.priority] ?? 9) - (PRIORITY_RANK[b.priority] ?? 9);
    case "targetDate": {
      const ta = a.targetDate !== undefined ? Date.parse(a.targetDate) : Number.MAX_SAFE_INTEGER;
      const tb = b.targetDate !== undefined ? Date.parse(b.targetDate) : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    }
    case "status":
      return (
        (STATUS_RANK[a.statusCategory] ?? 9) - (STATUS_RANK[b.statusCategory] ?? 9)
      );
    default:
      return a.sortOrder - b.sortOrder;
  }
}

/** Order a project list (ties fall back to manual sortOrder). */
export function orderProjects(projects: ProjectData[], ordering: string): ProjectData[] {
  const sorted = projects.slice();
  sorted.sort((a, b) => {
    const cmp = compareProjects(ordering, a, b);
    return cmp !== 0 ? cmp : a.sortOrder - b.sortOrder;
  });
  return sorted;
}

export interface ProjectGroup {
  /** Grouping value ("started", "u-yk", "none"…) — also the React key. */
  key: string;
  label: string;
  projects: ProjectData[];
}

/** Every bucket a grouping can produce, in menu order (drives empty groups). */
function groupKeysFor(grouping: string, store: SyncStore): { key: string; label: string }[] {
  switch (grouping) {
    case "status":
      return (["backlog", "planned", "started", "completed", "canceled"] as const).map(
        (key) => ({ key, label: PROJECT_STATUS_LABEL[key] ?? key }),
      );
    case "health":
      return (["onTrack", "atRisk", "offTrack", "noUpdate"] as const).map((key) => ({
        key,
        label: PROJECT_HEALTH_LABEL[key] ?? key,
      }));
    case "priority":
      return [1, 2, 3, 4, 0].map((value) => ({
        key: String(value),
        label: PROJECT_PRIORITY_LABEL[value] ?? String(value),
      }));
    case "lead":
      return [
        ...store
          .all("User")
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map((user) => ({ key: user.id, label: user.displayName })),
        { key: "none", label: "No lead" },
      ];
    case "team":
      return [
        ...store
          .all("Team")
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((team) => ({ key: team.id, label: team.name })),
        { key: "none", label: "No team" },
      ];
    default:
      return [];
  }
}

/** The bucket(s) one project belongs to (teams is many-valued). */
function keysOf(project: ProjectData, grouping: string): string[] {
  switch (grouping) {
    case "status":
      return [project.statusCategory];
    case "health":
      return [project.health];
    case "priority":
      return [String(project.priority)];
    case "lead":
      return [project.leadId ?? "none"];
    case "team":
      return project.teamIds.length > 0 ? [...project.teamIds] : ["none"];
    default:
      return [];
  }
}

/**
 * Group an (already ordered) project list. `grouping === "none"` returns one
 * anonymous group so the table can render rows without a header.
 */
export function groupProjects(
  projects: ProjectData[],
  grouping: string,
  store: SyncStore,
  showEmptyGroups = false,
): ProjectGroup[] {
  if (grouping === "none" || grouping === "") {
    return [{ key: "all", label: "", projects }];
  }
  const buckets = new Map<string, ProjectData[]>();
  for (const project of projects) {
    for (const key of keysOf(project, grouping)) {
      const list = buckets.get(key);
      if (list) list.push(project);
      else buckets.set(key, [project]);
    }
  }
  const known = groupKeysFor(grouping, store);
  const groups: ProjectGroup[] = known
    .map(({ key, label }) => ({ key, label, projects: buckets.get(key) ?? [] }))
    .filter((group) => group.projects.length > 0 || showEmptyGroups);
  // Keys the vocabulary does not know (a deleted user, say) still render.
  for (const [key, list] of buckets) {
    if (!known.some((entry) => entry.key === key)) {
      groups.push({ key, label: key, projects: list });
    }
  }
  return groups;
}
