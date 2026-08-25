"use client";

/**
 * FacetPanel — the ONE floating insights overlay shared by the team issues
 * list, My Issues and the projects pages (MASTER_PROMPT.md §11.3 facet
 * stage, unified from the earlier docked InsightsPanel / ProjectsInsightsRail
 * pair).
 *
 * Reference anatomy: a rounded surface floating over the view, docked to the
 * content card's right edge (8px inset, 8px below the header bands), with a
 * segmented pill-tab row — Assignees | Labels | Priority | Projects (Health |
 * Teams | Leads for the projects scope) — over a facet list of
 * [icon/avatar + name] rows with right-aligned counts. Hovering a row reveals
 * a "See issues" affordance; clicking applies that facet as a filter chip on
 * the view through the URL codec, so the row set narrows in place.
 *
 * Because the panel FLOATS (absolute against `.contentCard`, which is the
 * positioning context), the content underneath keeps its full width — the
 * deliberate departure from the §6.10 docked rails this replaces.
 *
 * Every count is computed live off the MobX pool for exactly the issues (or
 * projects) the view currently shows — scope narrowed, then the view's own
 * filter chips applied — so the numbers always describe what is on screen.
 *
 * Uses `useFilters`/`useProjectFilters` (useSearchParams), so callers must
 * render it under a <Suspense> boundary.
 */

import * as React from "react";
import { observer } from "mobx-react-lite";
import { useStore } from "@/lib/data/DataProvider";
import type { SyncStore } from "@/lib/data/store";
import type { IssueData, Priority, ProjectData } from "@/lib/data/types";
import {
  applyFilters,
  useFilters,
  NO_PROJECT,
  UNASSIGNED,
  PRIORITY_LABEL,
  type FiltersApi,
} from "@/lib/issues/filters";
import {
  useProjectFilters,
  useVisibleProjects,
  NO_VALUE,
  type ProjectFilterProperty,
} from "@/lib/projects/filters";
import { withoutTriageIssues } from "@/lib/issues/triage";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { insightsKey, setFlag } from "@/lib/projects/localPrefs";
import { showToast } from "@/lib/toast";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/icons/Icon";
import { PriorityIcon } from "@/components/icons/StatusIcon";
import { HealthIcon, projectIconFor } from "@/components/projects/glyphs";
import css from "./facetpanel.module.css";

/* ================================================================
 * Scope contract
 * ================================================================ */

export type FacetScope =
  | { kind: "team"; teamId: string }
  | { kind: "my-issues"; tab: string }
  | { kind: "projects"; teamId?: string };

const ISSUE_TABS = ["assignees", "labels", "priority", "projects"] as const;
const PROJECT_TABS = ["health", "teams", "leads"] as const;

type IssueFacetTab = (typeof ISSUE_TABS)[number];
type ProjectFacetTab = (typeof PROJECT_TABS)[number];

const TAB_LABEL: Record<IssueFacetTab | ProjectFacetTab, string> = {
  assignees: "Assignees",
  labels: "Labels",
  priority: "Priority",
  projects: "Projects",
  health: "Health",
  teams: "Teams",
  leads: "Leads",
};

function isIssueFacetTab(value: string): value is IssueFacetTab {
  return (ISSUE_TABS as readonly string[]).includes(value);
}

function isProjectFacetTab(value: string): value is ProjectFacetTab {
  return (PROJECT_TABS as readonly string[]).includes(value);
}

/* ================================================================
 * Per-view persisted active tab (localStorage, SSR-safe)
 * ================================================================ */

function tabStorageKey(viewKey: string): string {
  return `facetTab:${viewKey}`;
}

/** SSR-safe read — the panel only mounts client-side (open flag is false on
 * the server), so the lazy initializer never runs during hydration. */
function readStoredTab(viewKey: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(tabStorageKey(viewKey));
  } catch {
    return null; // storage blocked (private mode) — default tab applies
  }
}

function storeTab(viewKey: string, tab: string): void {
  try {
    window.localStorage.setItem(tabStorageKey(viewKey), tab);
  } catch {
    /* per-session only */
  }
}

/* ================================================================
 * Presence — keeps the node mounted through the 100ms exit fade
 * ================================================================ */

function usePresence(open: boolean): "open" | "closing" | null {
  const [phase, setPhase] = React.useState<"open" | "closing" | null>(
    open ? "open" : null,
  );
  React.useEffect(() => {
    if (open) {
      setPhase("open");
      return;
    }
    setPhase((prev) => (prev === "open" ? "closing" : prev));
  }, [open]);
  React.useEffect(() => {
    if (phase !== "closing") return;
    // Matches the 100ms exit animation (+1 frame); also covers
    // prefers-reduced-motion, where no animationend would ever fire.
    const timer = window.setTimeout(() => setPhase(null), 110);
    return () => window.clearTimeout(timer);
  }, [phase]);
  return phase;
}

/* ================================================================
 * Facet row model + renderer
 * ================================================================ */

interface FacetRowModel {
  key: string;
  label: string;
  count: number;
  icon: React.ReactNode;
  /** Applies this facet as a filter chip; absent = readout-only row. */
  onSelect?: () => void;
}

function FacetRows({
  rows,
  verb,
  empty,
}: {
  rows: FacetRowModel[];
  verb: string;
  empty: string;
}) {
  return (
    <div className={css.list}>
      {rows.length === 0 ? (
        <p className={css.empty}>{empty}</p>
      ) : (
        rows.map((row) =>
          row.onSelect === undefined ? (
            <div key={row.key} className={css.row}>
              <span className={css.rowIcon} aria-hidden="true">
                {row.icon}
              </span>
              <span className={css.rowLabel} title={row.label}>
                {row.label}
              </span>
              <span aria-hidden="true" />
              <span className={css.rowCount}>{row.count}</span>
            </div>
          ) : (
            <button
              key={row.key}
              type="button"
              className={css.row}
              aria-label={`${row.label} — ${row.count}. ${verb}.`}
              onClick={row.onSelect}
            >
              <span className={css.rowIcon} aria-hidden="true">
                {row.icon}
              </span>
              <span className={css.rowLabel} title={row.label}>
                {row.label}
              </span>
              <span className={css.see} aria-hidden="true">
                {verb}
              </span>
              <span className={css.rowCount}>{row.count}</span>
            </button>
          ),
        )
      )}
    </div>
  );
}

/* ================================================================
 * Issue facets (team + my-issues scopes)
 * ================================================================ */

/** Count issues per bucket key, insertion-agnostic. */
function tally(issues: readonly IssueData[], keyOf: (issue: IssueData) => string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const issue of issues) {
    for (const key of keyOf(issue)) {
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return counts;
}

/** Busiest bucket first, ties alphabetical (old InsightsPanel ordering). */
function byCountThenLabel(a: FacetRowModel, b: FacetRowModel): number {
  return b.count - a.count || a.label.localeCompare(b.label);
}

/**
 * The issues one scope is about, BEFORE the view's chips narrow them.
 * My Issues tab semantics mirror MyIssuesView.tabIssuesFor (kept local to
 * avoid a circular import — the view imports this panel).
 */
function issuesInScope(
  scope: Extract<FacetScope, { kind: "team" } | { kind: "my-issues" }>,
  store: SyncStore,
): IssueData[] {
  // §22: triage arrivals are counted by the Triage inbox, never by a facet.
  const live = withoutTriageIssues(
    store.all("Issue").filter((issue) => !issue.archivedAt),
    store,
  );
  if (scope.kind === "team") {
    return live.filter((issue) => issue.teamId === scope.teamId);
  }
  switch (scope.tab) {
    case "created":
      return live.filter((issue) => issue.creatorId === CURRENT_USER_ID);
    case "subscribed":
      return live.filter((issue) => issue.subscriberIds.includes(CURRENT_USER_ID));
    case "activity": {
      // The distinct issues the activity feed is talking about.
      const seen = new Set<string>();
      const out: IssueData[] = [];
      for (const activity of store.all("Activity")) {
        if (activity.issueId === undefined || seen.has(activity.issueId)) continue;
        const issue = store.get("Issue", activity.issueId);
        if (issue === undefined || issue.archivedAt) continue;
        const mine =
          activity.actorId === CURRENT_USER_ID ||
          issue.subscriberIds.includes(CURRENT_USER_ID);
        if (!mine) continue;
        seen.add(activity.issueId);
        out.push(issue);
      }
      return out;
    }
    default:
      // "assigned" and any unknown tab value fall back to the assigned set.
      return live.filter((issue) => issue.assigneeId === CURRENT_USER_ID);
  }
}

function issueFacetRows(
  tab: IssueFacetTab,
  issues: readonly IssueData[],
  store: SyncStore,
  filtersApi: FiltersApi,
): FacetRowModel[] {
  const { add } = filtersApi;
  switch (tab) {
    case "assignees": {
      const counts = tally(issues, (issue) => [issue.assigneeId ?? UNASSIGNED]);
      return Array.from(counts, ([key, count]): FacetRowModel => {
        if (key === UNASSIGNED) {
          return {
            key,
            label: "No assignee",
            count,
            icon: <Icon name="PersonDashed" size={16} />,
            onSelect: () =>
              add({ property: "assignee", operator: "is", values: [UNASSIGNED] }),
          };
        }
        const user = store.get("User", key);
        return {
          key,
          label: user?.displayName ?? key,
          count,
          icon: (
            <Avatar
              initials={user?.initials ?? "?"}
              color={user?.avatarColor}
              size={16}
              src={user?.avatarUrl}
            />
          ),
          onSelect: () =>
            add({ property: "assignee", operator: "is", values: [key] }),
        };
      }).sort(byCountThenLabel);
    }
    case "labels": {
      const NONE = "none";
      const counts = tally(issues, (issue) =>
        issue.labelIds.length === 0 ? [NONE] : issue.labelIds,
      );
      return Array.from(counts, ([key, count]): FacetRowModel => {
        if (key === NONE) {
          // The filter codec has no "has no labels" chip — readout only.
          return {
            key,
            label: "No label",
            count,
            icon: <span className={css.labelDot} data-none="true" />,
          };
        }
        const label = store.get("Label", key);
        return {
          key,
          label: label?.name ?? key,
          count,
          icon: (
            <span
              className={css.labelDot}
              style={{ background: label?.color ?? "var(--color-text-faint)" }}
            />
          ),
          onSelect: () =>
            add({ property: "labels", operator: "includesAny", values: [key] }),
        };
      }).sort(byCountThenLabel);
    }
    case "priority": {
      const counts = tally(issues, (issue) => [String(issue.priority)]);
      const isPriority = (value: number): value is Priority =>
        value === 0 || value === 1 || value === 2 || value === 3 || value === 4;
      return Array.from(counts, ([key, count]): FacetRowModel => {
        const numeric = Number(key);
        const priority: Priority = isPriority(numeric) ? numeric : 0;
        return {
          key,
          label: PRIORITY_LABEL[priority],
          count,
          icon: <PriorityIcon priority={priority} size={16} />,
          onSelect: () =>
            add({ property: "priority", operator: "is", values: [key] }),
        };
      }).sort(byCountThenLabel);
    }
    case "projects": {
      const counts = tally(issues, (issue) => [issue.projectId ?? NO_PROJECT]);
      return Array.from(counts, ([key, count]): FacetRowModel => {
        const project = key === NO_PROJECT ? undefined : store.get("Project", key);
        return {
          key,
          label:
            key === NO_PROJECT ? "No project" : (project?.name ?? key),
          count,
          icon:
            project !== undefined ? (
              projectIconFor(project)
            ) : (
              <Icon name="Project" size={16} />
            ),
          onSelect: () =>
            add({ property: "project", operator: "is", values: [key] }),
        };
      }).sort(byCountThenLabel);
    }
  }
}

const IssueFacetList = observer(function IssueFacetList({
  viewKey,
  scope,
  tab,
}: {
  viewKey: string;
  scope: Extract<FacetScope, { kind: "team" } | { kind: "my-issues" }>;
  tab: IssueFacetTab;
}) {
  const store = useStore();
  const filtersApi = useFilters(viewKey);
  // Same derivation the list renders: scope set, then the view's chips.
  const issues = applyFilters(issuesInScope(scope, store), filtersApi.filters, store);
  const rows = issueFacetRows(tab, issues, store, filtersApi);
  return (
    <FacetRows
      rows={rows}
      verb="See issues"
      empty="Nothing to measure yet — this view has no issues."
    />
  );
});

/* ================================================================
 * Project facets (projects scope) — Health | Teams | Leads
 * ================================================================ */

/** An update is "expected" while the project is planned or in progress. */
function updateExpected(project: ProjectData): boolean {
  return project.statusCategory === "planned" || project.statusCategory === "started";
}

interface ProjectChip {
  property: ProjectFilterProperty;
  values: string[];
}

const ProjectFacetList = observer(function ProjectFacetList({
  viewKey,
  teamId,
  tab,
}: {
  viewKey: string;
  teamId?: string;
  tab: ProjectFacetTab;
}) {
  const store = useStore();
  const api = useProjectFilters(viewKey);
  const { projects } = useVisibleProjects(viewKey, store, teamId);

  // Isolate the clicked facet (§10.1 rail behavior): replace the chip row
  // with exactly the chips that describe it.
  const apply = (chips: ProjectChip[]): void => {
    api.clear();
    for (const chip of chips) {
      api.add({
        property: chip.property,
        operator: chip.values.length > 1 ? "isAnyOf" : "is",
        values: chip.values,
      });
    }
  };

  let rows: FacetRowModel[] = [];
  if (tab === "health") {
    const count = (predicate: (project: ProjectData) => boolean): number =>
      projects.filter(predicate).length;
    const health = (
      key: string,
      label: string,
      value: number,
      icon: React.ReactNode,
      chips: ProjectChip[],
    ): FacetRowModel => ({
      key,
      label,
      count: value,
      icon,
      onSelect: () => apply(chips),
    });
    rows = [
      health(
        "onTrack",
        "On track",
        count((project) => project.health === "onTrack"),
        <HealthIcon health="onTrack" size={14} />,
        [{ property: "health", values: ["onTrack"] }],
      ),
      health(
        "atRisk",
        "At risk",
        count((project) => project.health === "atRisk"),
        <HealthIcon health="atRisk" size={14} />,
        [{ property: "health", values: ["atRisk"] }],
      ),
      health(
        "offTrack",
        "Off track",
        count((project) => project.health === "offTrack"),
        <HealthIcon health="offTrack" size={14} />,
        [{ property: "health", values: ["offTrack"] }],
      ),
      health(
        "missing",
        "Update missing",
        count((project) => project.health === "noUpdate" && updateExpected(project)),
        <HealthIcon health="noUpdate" size={14} />,
        [
          { property: "health", values: ["noUpdate"] },
          { property: "status", values: ["planned", "started"] },
        ],
      ),
      health(
        "notExpected",
        "No update expected",
        count((project) => project.health === "noUpdate" && !updateExpected(project)),
        <HealthIcon health="noUpdate" size={14} />,
        [
          { property: "health", values: ["noUpdate"] },
          { property: "status", values: ["backlog", "completed", "canceled"] },
        ],
      ),
    ];
  } else if (tab === "teams") {
    const teams = store.all("Team").sort((a, b) => a.sortOrder - b.sortOrder);
    rows = teams
      .map(
        (team): FacetRowModel => ({
          key: team.id,
          label: team.name,
          count: projects.filter((project) => project.teamIds.includes(team.id)).length,
          icon: <Icon name={team.icon} size={14} color={team.color} />,
          onSelect: () => apply([{ property: "team", values: [team.id] }]),
        }),
      )
      .filter((row) => row.count > 0);
    const noTeam = projects.filter((project) => project.teamIds.length === 0).length;
    if (noTeam > 0) {
      rows.push({
        key: "no-team",
        label: "No team",
        count: noTeam,
        icon: <Icon name="Team" size={14} />,
        onSelect: () => apply([{ property: "team", values: [NO_VALUE] }]),
      });
    }
  } else {
    const users = store
      .all("User")
      .sort((a, b) => a.displayName.localeCompare(b.displayName));
    rows = users
      .map(
        (user): FacetRowModel => ({
          key: user.id,
          label: user.displayName,
          count: projects.filter((project) => project.leadId === user.id).length,
          icon: (
            <Avatar initials={user.initials} color={user.avatarColor} size={16} />
          ),
          onSelect: () => apply([{ property: "lead", values: [user.id] }]),
        }),
      )
      .filter((row) => row.count > 0);
    const noLead = projects.filter((project) => project.leadId === undefined).length;
    if (noLead > 0) {
      rows.push({
        key: "no-lead",
        label: "No lead",
        count: noLead,
        icon: <Icon name="MyIssues" size={14} />,
        onSelect: () => apply([{ property: "lead", values: [NO_VALUE] }]),
      });
    }
  }

  // Team scope reorders nonzero facets first (§10.1 CAPTURED behaviour).
  const ordered =
    teamId === undefined
      ? rows
      : [...rows].sort((a, b) => Number(b.count > 0) - Number(a.count > 0));

  return <FacetRows rows={ordered} verb="See projects" empty="Nothing to show" />;
});

/* ================================================================
 * The panel
 * ================================================================ */

export const FacetPanel = observer(function FacetPanel({
  viewKey,
  scope,
  open,
  topOffset,
}: {
  viewKey: string;
  scope: FacetScope;
  open: boolean;
  /**
   * Height (px) of the header stack above the panel — the panel's top edge
   * lands 8px below it. Default covers the two-band views this panel ships
   * on (57px title band + hairline + 57px tabs band); one-band views pass 58.
   */
  topOffset?: number;
}) {
  const tabs: readonly string[] = scope.kind === "projects" ? PROJECT_TABS : ISSUE_TABS;
  const fallbackTab = tabs[0] ?? "assignees";
  const [tab, setTab] = React.useState<string>(() => {
    const stored = readStoredTab(viewKey);
    return stored !== null && tabs.includes(stored) ? stored : fallbackTab;
  });
  const phase = usePresence(open);
  if (phase === null) return null;

  const active = tabs.includes(tab) ? tab : fallbackTab;

  const selectTab = (id: string): void => {
    setTab(id);
    storeTab(viewKey, id);
  };

  let body: React.ReactNode;
  if (scope.kind === "projects") {
    body = (
      <ProjectFacetList
        viewKey={viewKey}
        teamId={scope.teamId}
        tab={isProjectFacetTab(active) ? active : "health"}
      />
    );
  } else {
    body = (
      <IssueFacetList
        viewKey={viewKey}
        scope={scope}
        tab={isIssueFacetTab(active) ? active : "assignees"}
      />
    );
  }

  const setDefaultForEveryone = (): void => {
    // No server-side workspace settings yet (§11.1) — the shared default
    // lives in localStorage like the display-options default does.
    setFlag(insightsKey(viewKey), true);
    showToast("Set as the default for everyone");
  };

  return (
    <aside
      role="complementary"
      aria-label={scope.kind === "projects" ? "Project insights" : "Issue insights"}
      className={css.panel}
      data-state={phase}
      style={topOffset !== undefined ? { top: topOffset + 8 } : undefined}
    >
      <div className={css.tabs} role="tablist" aria-label="Insights facet">
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={active === id}
            className={css.tab}
            data-active={active === id ? "true" : undefined}
            onClick={() => selectTab(id)}
          >
            {isIssueFacetTab(id) || isProjectFacetTab(id) ? TAB_LABEL[id] : id}
          </button>
        ))}
      </div>
      {body}
      <div className={css.footer}>
        <button
          type="button"
          className={css.defaultBtn}
          onClick={setDefaultForEveryone}
        >
          Set default for everyone
        </button>
      </div>
    </aside>
  );
});
