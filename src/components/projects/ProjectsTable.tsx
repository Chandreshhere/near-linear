"use client";

/**
 * Projects table (workspace + team scope) — docs/analysis/capture-projects.md
 * §6.2–6.3, MASTER_PROMPT.md §10.1, §11.1–11.2.
 *
 * CAPTURED subgrid table: the outer grid declares the named columns once;
 * the 32px column-header row and each 48px project row (a real <a> to the
 * project overview) render `grid-template-columns: subgrid; grid-column:
 * 1/-1`. Row hover paints on ::before with the 8px bleed inset — the ListRow
 * primitive is display:block, so the row is built here with the same idiom.
 *
 * View state comes from two places, both persisted:
 *   - `useProjectViewPreference(viewKey)` — grouping, ordering and the
 *     display-property chips (which columns exist at all; the grid template
 *     is rebuilt from them so a hidden column leaves no hole).
 *   - `useProjectFilters(viewKey)` — the chip row in `?filter=`.
 * Selection uses the shared SelectionStore, so X / Shift+↑↓ / Cmd+A / Esc and
 * the bottom bulk bar behave exactly like the issue list (§6.7).
 *
 * Reads only from the MobX pool (observer). Property cells wrap their
 * triggers in the shared project pickers; the wrapping cell cancels link
 * navigation AFTER the Radix trigger has toggled (preventDefault at the cell
 * level — never stopPropagation on the trigger itself, which would starve
 * the Popover trigger of its click).
 */

import { Fragment, useEffect, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type {
  MilestoneData,
  Priority,
  ProjectData,
  ProjectHealth,
  ProjectStatusCategory,
} from "@/lib/data/types";
import {
  HealthIcon,
  MilestoneDiamond,
  ProjectSparkline,
  ProjectStatusIcon,
  projectIconFor,
} from "@/components/projects/glyphs";
import {
  ProjectDatePicker,
  ProjectHealthPicker,
  ProjectIconPicker,
  ProjectLeadPicker,
  ProjectPriorityPicker,
  ProjectStatusPicker,
} from "@/components/projects/pickers";
import { UpdateComposer } from "@/components/projects/UpdateComposer";
import {
  PROJECT_HEALTH_LABEL,
  groupProjects,
  orderProjects,
  useProjectViewPreference,
  type ProjectOrdering,
} from "@/lib/projects/viewPrefs";
import { useVisibleProjects } from "@/lib/projects/filters";
import { getSelectionStore, useListNavigation } from "@/lib/issues/selection";
import { BulkBar } from "@/components/issues/BulkBar";
import { GroupHeader } from "@/components/ui/GroupHeader";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { PriorityIcon } from "@/components/icons/StatusIcon";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import styles from "./projectstable.module.css";

/* ================================================================
 * Pure helpers
 * ================================================================ */

type SortKey = Extract<
  ProjectOrdering,
  "name" | "health" | "priority" | "targetDate" | "status"
>;

const HEALTH_LABEL: Record<ProjectHealth, string> = {
  noUpdate: "No updates",
  onTrack: "On track",
  atRisk: "At risk",
  offTrack: "Off track",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  0: "No Priority",
  1: "Urgent",
  2: "High Priority",
  3: "Medium Priority",
  4: "Low Priority",
};

const STATUS_LABEL: Record<ProjectStatusCategory, string> = {
  backlog: "Backlog",
  planned: "Planned",
  started: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

/**
 * Optional columns in captured order. `template` is the column's slice of the
 * grid definition — the table rebuilds `grid-template-columns` from the
 * display-property chips so hiding one removes the column, not just its
 * contents (capture §1 grid).
 */
const COLUMN_SPECS: { key: string; template: string }[] = [
  { key: "health", template: "[health] 130px" },
  { key: "priority", template: "[priority] 68px" },
  { key: "lead", template: "[lead] 48px" },
  { key: "targetDate", template: "[targetDate] 91px" },
  { key: "issues", template: "[issues] 49px" },
  { key: "status", template: "[status] 120px" },
];

function gridTemplate(visible: ReadonlySet<string>): string {
  const middle = COLUMN_SPECS.filter((column) => visible.has(column.key))
    .map((column) => column.template)
    .join(" ");
  return `[indent] 8px [checkbox] 18px [title] minmax(425px, 2fr) ${middle} [end-padding] 8px`;
}

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function dateParts(iso: string): { y: number; m: number; d: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match === null) return null;
  return { y: Number(match[1]), m: Number(match[2]), d: Number(match[3]) };
}

function ordinalSuffix(day: number): string {
  const mod100 = day % 100;
  if (mod100 >= 11 && mod100 <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** "Sep 30th" — target-date ordinal format ("MMM Do", capture §3). */
function formatTargetDate(iso: string): string {
  const p = dateParts(iso);
  if (p === null) return "";
  return `${MONTH_SHORT[p.m - 1]} ${p.d}${ordinalSuffix(p.d)}`;
}

/** "Aug 28" — milestone chip date (capture §6.3 cell 3). */
function formatChipDate(iso: string): string {
  const p = dateParts(iso);
  if (p === null) return "";
  return `${MONTH_SHORT[p.m - 1]} ${p.d}`;
}

/** Overdue = strictly before today (local calendar date). */
function isOverdue(iso: string): boolean {
  const p = dateParts(iso);
  if (p === null) return false;
  const now = new Date();
  const today = now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
  return p.y * 10000 + p.m * 100 + p.d < today;
}

/** Deterministic 32-bit string hash (sparkline gating + pseudo-points). */
function hash32(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  return h | 0;
}

/**
 * Stable pseudo-random 0..1 points derived from the project id (xorshift32)
 * so screenshots stay reproducible across runs.
 */
function sparklinePoints(id: string): number[] {
  let seed = (hash32(id) >>> 0) || 0x9e3779b9;
  const points: number[] = [];
  for (let i = 0; i < 8; i++) {
    seed ^= (seed << 13) >>> 0;
    seed >>>= 0;
    seed ^= seed >>> 17;
    seed ^= (seed << 5) >>> 0;
    seed >>>= 0;
    points.push((seed % 1024) / 1023);
  }
  return points;
}

/* ================================================================
 * Small pieces
 * ================================================================ */

/** Cancel row-link navigation for plain in-row buttons (checkbox, tile, …). */
function blockRowNav(e: MouseEvent<HTMLElement>): void {
  e.preventDefault();
  e.stopPropagation();
}

/**
 * Picker cells cancel navigation at the CELL (outside the Radix trigger):
 * the trigger's click has already toggled the popover by the time the event
 * bubbles here, and preventDefault kills the <a> default without starving
 * Radix (composeEventHandlers skips its handler when defaultPrevented is
 * already set — so never preventDefault below the trigger).
 */
function blockCellNav(e: MouseEvent<HTMLElement>): void {
  e.preventDefault();
  e.stopPropagation();
}

function stopPointer(e: PointerEvent<HTMLElement>): void {
  e.stopPropagation();
}

/** Dashed-person empty-lead glyph — the one shared filled definition. */
function NoLeadGlyph() {
  return <Icon name="PersonDashed" size={16} color="currentColor" />;
}

/** Sortable column header: `aria-label="Order by X"` + hover chevron (§6.2). */
function SortButton({
  label,
  sortKey,
  ordering,
  dir,
  onSort,
}: {
  label: string;
  sortKey: SortKey;
  ordering: string;
  dir: 1 | -1;
  onSort: (key: SortKey) => void;
}) {
  const active = ordering === sortKey;
  return (
    <button
      type="button"
      className={styles.sortBtn}
      aria-label={`Order by ${label}`}
      data-sorted={active ? "true" : undefined}
      data-dir={active ? (dir === 1 ? "asc" : "desc") : undefined}
      onClick={() => onSort(sortKey)}
    >
      <span className={styles.headerLabel}>{label}</span>
      <span className={styles.sortChevron} aria-hidden="true">
        {/* CAPTURED: chevron head + vertical shaft (1.5 wide, y3→13) so
            asc/desc reads as an arrow */}
        <svg width={12} height={12} viewBox="0 0 16 16" focusable="false">
          <path
            d="M8 13a.75.75 0 0 1-.53-.22l-3.25-3.25a.75.75 0 1 1 1.06-1.06l1.97 1.97V3.75a.75.75 0 0 1 1.5 0v6.69l1.97-1.97a.75.75 0 1 1 1.06 1.06l-3.25 3.25A.75.75 0 0 1 8 13Z"
            fill="currentColor"
          />
        </svg>
      </span>
    </button>
  );
}

/* ================================================================
 * Row
 * ================================================================ */

const ProjectRow = observer(function ProjectRow({
  project,
  workspace,
  visible,
  selected,
  keyboardActive,
  onToggleSelect,
  onHover,
  onShiftClick,
  onWriteUpdate,
}: {
  project: ProjectData;
  workspace: string;
  /** Display-property keys currently switched on. */
  visible: ReadonlySet<string>;
  selected: boolean;
  keyboardActive: boolean;
  onToggleSelect: () => void;
  onHover: () => void;
  onShiftClick: () => void;
  onWriteUpdate: () => void;
}) {
  const store = useStore();
  const router = useRouter();

  const lead = project.leadId !== undefined ? store.get("User", project.leadId) : undefined;
  const milestone: MilestoneData | undefined = store.milestonesForProject(project.id)[0];
  const issues = store.issuesForProject(project.id);
  const completedCount = issues.filter(
    (issue) => store.get("WorkflowState", issue.stateId)?.category === "completed",
  ).length;
  const progress = issues.length > 0 ? completedCount / issues.length : 0;
  const progressPct = Math.round(progress * 100);

  let milestonePct = 0;
  if (milestone !== undefined) {
    const msIssues = issues.filter((issue) => issue.milestoneId === milestone.id);
    const msDone = msIssues.filter(
      (issue) => store.get("WorkflowState", issue.stateId)?.category === "completed",
    ).length;
    milestonePct = msIssues.length > 0 ? Math.round((msDone / msIssues.length) * 100) : 0;
  }

  const overdue = project.targetDate !== undefined && isOverdue(project.targetDate);
  // Capture parity: only some rows carry the 32×16 sparkline.
  const hasSparkline = visible.has("progress") && (hash32(project.name) & 1) === 0;
  const issuesHref = `/${workspace}/project/${project.slug}/issues`;

  return (
    <Link
      href={`/${workspace}/project/${project.slug}/overview`}
      className={styles.row}
      data-list-row="true"
      data-list-key={project.id}
      data-selected={selected ? "true" : undefined}
      data-keyboard-active={keyboardActive ? "true" : undefined}
      onMouseEnter={onHover}
      onClick={(e) => {
        // Shift+Click extends the selection instead of navigating (§6.7).
        if (e.shiftKey) {
          e.preventDefault();
          onShiftClick();
        }
      }}
    >
      {/* [indent] 8px */}
      <span data-list-grid-column="indent" aria-hidden="true" />

      {/* [checkbox] 18px — hover-revealed Select project */}
      <span className={styles.cellCheckbox} data-list-grid-column="checkbox">
        <button
          type="button"
          role="checkbox"
          aria-checked={selected}
          aria-label="Select project"
          data-checked={selected ? "true" : undefined}
          className={styles.checkbox}
          onClick={(e) => {
            blockRowNav(e);
            onToggleSelect();
          }}
          onPointerDown={stopPointer}
        >
          <svg viewBox="0 0 16 16" className={styles.checkGlyph} aria-hidden="true" focusable="false">
            <path d="M12.78 4.72a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.97 1.97 4.47-4.47a.75.75 0 0 1 1.06 0Z" />
          </svg>
        </button>
      </span>

      {/* [title] — icon tile + name (+ milestone chip). Only the tile cancels
          navigation (display:contents keeps layout identical while still
          receiving the bubbled click); clicking the NAME still opens the row. */}
      <span className={styles.cellTitle} data-list-grid-column="title">
        <span className={styles.pickerSlot} onClick={blockCellNav}>
          <ProjectIconPicker
            project={project}
            trigger={
              <button
                type="button"
                aria-label="Choose icon"
                className={styles.iconTile}
                style={
                  {
                    "--tile-bg": `color-mix(in srgb, ${project.color} 17.5%, transparent)`,
                  } as CSSProperties
                }
              >
                {projectIconFor(project)}
              </button>
            }
          />
        </span>
        <span className={styles.titleStack}>
          <span
            className={clsx(
              styles.name,
              visible.has("milestone") && milestone !== undefined && styles.nameCapped,
            )}
            title={project.name}
          >
            {project.name}
          </span>
          {visible.has("milestone") && milestone !== undefined && (
            <button
              type="button"
              className={styles.milestoneChip}
              aria-label={`Milestone ${milestone.name}. Progress: ${milestonePct}%.`}
              onClick={(e) => {
                blockRowNav(e);
                router.push(`${issuesHref}?projectMilestoneId=${milestone.id}`);
              }}
              onPointerDown={stopPointer}
            >
              <span className={styles.chipDiamond} aria-hidden="true">
                <MilestoneDiamond color={project.color} size={16} />
              </span>
              <span className={styles.chipLabel}>{milestone.name}</span>
              {milestone.targetDate !== undefined && (
                <span className={styles.chipDate}>{formatChipDate(milestone.targetDate)}</span>
              )}
            </button>
          )}
        </span>
      </span>

      {/* [health] 130px */}
      {visible.has("health") && (
        <span className={styles.cellHealth} data-list-grid-column="health" onClick={blockCellNav}>
          <ProjectHealthPicker
            projectId={project.id}
            onWriteUpdate={onWriteUpdate}
            trigger={
              <button
                type="button"
                className={clsx(styles.propertyBtn, styles.healthBtn)}
                aria-label={
                  project.health === "noUpdate"
                    ? "No updates. Click to write update."
                    : HEALTH_LABEL[project.health]
                }
              >
                <HealthIcon health={project.health} size={16} />
                <span className={styles.propText}>{HEALTH_LABEL[project.health]}</span>
              </button>
            }
          />
        </span>
      )}

      {/* [priority] 68px */}
      {visible.has("priority") && (
        <span className={styles.cellPriority} data-list-grid-column="priority" onClick={blockCellNav}>
          <ProjectPriorityPicker
            projectId={project.id}
            trigger={
              <button
                type="button"
                className={styles.propertyBtn}
                aria-label={PRIORITY_LABEL[project.priority]}
              >
                <PriorityIcon priority={project.priority} size={16} />
              </button>
            }
          />
        </span>
      )}

      {/* [lead] 48px */}
      {visible.has("lead") && (
        <span className={styles.cellLead} data-list-grid-column="lead" onClick={blockCellNav}>
          <ProjectLeadPicker
            projectId={project.id}
            trigger={
              <button
                type="button"
                className={styles.propertyBtn}
                aria-label={lead !== undefined ? lead.displayName : "No lead"}
              >
                {lead !== undefined ? (
                  <Avatar
                    initials={lead.initials}
                    color={lead.avatarColor}
                    size={16}
                    src={lead.avatarUrl}
                  />
                ) : (
                  <span className={clsx(styles.leadEmpty, styles.hoverReveal)} aria-hidden="true">
                    <NoLeadGlyph />
                  </span>
                )}
              </button>
            }
          />
        </span>
      )}

      {/* [targetDate] 91px */}
      {visible.has("targetDate") && (
        <span className={styles.cellDate} data-list-grid-column="targetDate" onClick={blockCellNav}>
          <ProjectDatePicker
            projectId={project.id}
            field="targetDate"
            trigger={
              <button
                type="button"
                className={clsx(
                  styles.propertyBtn,
                  styles.dateBtn,
                  overdue && styles.dateOverdue,
                  project.targetDate === undefined && styles.hoverReveal,
                )}
                aria-label="Change project target date"
              >
                <span className={styles.dateIcon} aria-hidden="true">
                  <Icon name="Calendar" size={14} />
                </span>
                {project.targetDate !== undefined && (
                  <span className={clsx(styles.propText, styles.tabular)}>
                    {formatTargetDate(project.targetDate)}
                  </span>
                )}
              </button>
            }
          />
        </span>
      )}

      {/* [issues] 49px — right-aligned count, opens the project's issues */}
      {visible.has("issues") && (
        <span className={styles.cellIssues} data-list-grid-column="issues">
          <button
            type="button"
            className={styles.propertyBtn}
            aria-label={`${issues.length} issue${issues.length === 1 ? "" : "s"}`}
            onClick={(e) => {
              blockRowNav(e);
              router.push(issuesHref);
            }}
            onPointerDown={stopPointer}
          >
            <span className={clsx(styles.propText, styles.tabular)}>{issues.length}</span>
          </button>
        </span>
      )}

      {/* [status] 120px — shield + % + optional sparkline */}
      {visible.has("status") && (
        <span className={styles.cellStatus} data-list-grid-column="status" onClick={blockCellNav}>
          <ProjectStatusPicker
            projectId={project.id}
            trigger={
              <button
                type="button"
                className={styles.propertyBtn}
                aria-label={STATUS_LABEL[project.statusCategory]}
              >
                <ProjectStatusIcon category={project.statusCategory} progress={progress} size={16} />
                <span className={clsx(styles.propText, styles.tabular)}>{progressPct}%</span>
              </button>
            }
          />
          {hasSparkline && (
            <span className={styles.sparkline} aria-hidden="true">
              <ProjectSparkline
                points={sparklinePoints(project.id)}
                color={project.color}
                width={32}
                height={16}
              />
            </span>
          )}
        </span>
      )}

      {/* [end-padding] 8px */}
      <span data-list-grid-column="end-padding" aria-hidden="true" />
    </Link>
  );
});

/* ================================================================
 * Group header icon (grouping-aware)
 * ================================================================ */

const GroupIcon = observer(function GroupIcon({
  grouping,
  groupKey,
}: {
  grouping: string;
  groupKey: string;
}) {
  const store = useStore();
  switch (grouping) {
    case "status":
      return (
        <ProjectStatusIcon
          category={groupKey as ProjectStatusCategory}
          progress={groupKey === "completed" ? 1 : 0}
          size={14}
        />
      );
    case "health":
      return <HealthIcon health={groupKey as ProjectHealth} size={14} />;
    case "priority":
      return <PriorityIcon priority={Number(groupKey) as Priority} size={14} />;
    case "lead": {
      const user = groupKey === "none" ? undefined : store.get("User", groupKey);
      return user === undefined ? (
        <Icon name="MyIssues" size={14} />
      ) : (
        <Avatar initials={user.initials} color={user.avatarColor} size={16} />
      );
    }
    case "team": {
      const team = groupKey === "none" ? undefined : store.get("Team", groupKey);
      return team === undefined ? (
        <Icon name="Team" size={14} />
      ) : (
        <Icon name={team.icon} size={14} color={team.color} />
      );
    }
    default:
      return null;
  }
});

/* ================================================================
 * The table
 * ================================================================ */

export const ProjectsTable = observer(function ProjectsTable({
  viewKey,
  teamId,
  onCreateProject,
}: {
  /** Persistence key for display options, filters and selection. */
  viewKey: string;
  teamId?: string;
  /**
   * Opens the REAL New project dialog. The empty state's primary action is
   * wired to it, so a workspace with no projects is a starting point rather
   * than a bare column-header row.
   */
  onCreateProject?: () => void;
}) {
  const store = useStore();
  const client = useSyncClient();
  const router = useRouter();
  const { workspace } = useParams<{ workspace: string }>();
  const { pref, update } = useProjectViewPreference(viewKey);
  const { projects: filtered } = useVisibleProjects(viewKey, store, teamId);
  const selection = getSelectionStore(viewKey);

  // Direction is view-local; the KEY lives in the view preference so the
  // display-options "Ordering" select and the column headers stay in sync.
  const [dir, setDir] = useState<1 | -1>(1);
  const [composerFor, setComposerFor] = useState<string | null>(null);

  const visible = new Set(pref.displayProperties);

  const ordered = orderProjects(filtered, pref.ordering);
  if (dir === -1 && pref.ordering !== "manual") ordered.reverse();

  const groups = groupProjects(ordered, pref.grouping, store, pref.showEmptyGroups);
  const grouped = pref.grouping !== "none";

  /*
   * Nothing to show splits in two: a workspace that has no projects yet
   * (invite the first one) and filters that hid the ones it has (say so, so
   * the user does not think their data vanished).
   */
  const rowCount = groups.reduce((total, group) => total + group.projects.length, 0);
  const inScopeCount = store
    .all("Project")
    .filter((project) => teamId === undefined || project.teamIds.includes(teamId)).length;
  const isEmpty = rowCount === 0;
  const hiddenByFilters = isEmpty && inScopeCount > 0;

  // asc → desc → back to manual order.
  const toggleSort = (key: SortKey): void => {
    if (pref.ordering !== key) {
      update({ ordering: key });
      setDir(1);
    } else if (dir === 1) {
      setDir(-1);
    } else {
      update({ ordering: "manual" });
      setDir(1);
    }
  };

  // ---------- selection wiring ----------

  const idsKey = groups
    .flatMap((group) => group.projects.map((project) => project.id))
    .join("\n");
  useEffect(() => {
    selection.setItems(idsKey === "" ? [] : idsKey.split("\n"));
  }, [selection, idsKey]);

  useListNavigation(selection, {
    scope: "list",
    onOpen: (id) => {
      const project = store.get("Project", id);
      if (project !== undefined) {
        router.push(`/${workspace}/project/${project.slug}/overview`);
      }
    },
  });

  const bulkIds = (): string[] => [...selection.effectiveIds];

  const statusItems: MenuItem[] = (
    ["backlog", "planned", "started", "completed", "canceled"] as const
  ).map((category) => ({
    label: STATUS_LABEL[category],
    icon: <ProjectStatusIcon category={category} progress={category === "completed" ? 1 : 0} />,
    onSelect: () => {
      for (const id of bulkIds()) client.mutate.updateProject(id, { statusCategory: category });
    },
  }));

  const priorityItems: MenuItem[] = ([1, 2, 3, 4, 0] as Priority[]).map((value) => ({
    label: PRIORITY_LABEL[value],
    icon: <PriorityIcon priority={value} />,
    onSelect: () => {
      for (const id of bulkIds()) client.mutate.updateProject(id, { priority: value });
    },
  }));

  const healthItems: MenuItem[] = (
    ["onTrack", "atRisk", "offTrack", "noUpdate"] as ProjectHealth[]
  ).map((health) => ({
    label: PROJECT_HEALTH_LABEL[health] ?? health,
    icon: <HealthIcon health={health} />,
    onSelect: () => {
      for (const id of bulkIds()) client.mutate.updateProject(id, { health });
    },
  }));

  const leadItems: MenuItem[] = [
    {
      label: "No lead",
      onSelect: () => {
        for (const id of bulkIds()) {
          client.mutate.updateProject(id, { leadId: null as unknown as string });
        }
      },
    },
    ...store
      .all("User")
      .sort((a, b) => a.displayName.localeCompare(b.displayName))
      .map(
        (user): MenuItem => ({
          label: user.displayName,
          icon: <Avatar initials={user.initials} color={user.avatarColor} size={16} />,
          onSelect: () => {
            for (const id of bulkIds()) client.mutate.updateProject(id, { leadId: user.id });
          },
        }),
      ),
  ];

  const composerProject = composerFor === null ? undefined : store.get("Project", composerFor);

  if (isEmpty) {
    return (
      <div className={styles.emptyFill}>
        <EmptyState
          illustration={<ProjectStatusIcon category="backlog" progress={0} size={28} />}
          heading={
            hiddenByFilters
              ? "No projects match these filters"
              : teamId !== undefined
                ? "This team has no projects yet"
                : "No projects yet"
          }
          primary={
            hiddenByFilters || onCreateProject === undefined ? undefined : (
              <Button variant="primary" size={32} onClick={onCreateProject}>
                New project
              </Button>
            )
          }
        >
          {hiddenByFilters
            ? "Clear or widen the filters above to see the projects in this view."
            : "Projects group the work behind an outcome — issues, milestones, updates and a target date. Create one to get started."}
        </EmptyState>
      </div>
    );
  }

  return (
    <>
      <div
        className={styles.table}
        data-list-container="true"
        style={{ gridTemplateColumns: gridTemplate(visible) }}
      >
        {/* Column header row (32px, §6.2): sortable buttons; Lead/Issues plain. */}
        <div className={styles.headerRow}>
          <span data-list-grid-column="indent" aria-hidden="true" />
          <span data-list-grid-column="checkbox" aria-hidden="true" />
          <span className={styles.headerCell} data-list-grid-column="title">
            <SortButton
              label="Name"
              sortKey="name"
              ordering={pref.ordering}
              dir={dir}
              onSort={toggleSort}
            />
          </span>
          {visible.has("health") && (
            <span className={styles.headerCell} data-list-grid-column="health">
              <SortButton
                label="Health"
                sortKey="health"
                ordering={pref.ordering}
                dir={dir}
                onSort={toggleSort}
              />
            </span>
          )}
          {visible.has("priority") && (
            <span className={styles.headerCell} data-list-grid-column="priority">
              <SortButton
                label="Priority"
                sortKey="priority"
                ordering={pref.ordering}
                dir={dir}
                onSort={toggleSort}
              />
            </span>
          )}
          {visible.has("lead") && (
            <span className={styles.headerCell} data-list-grid-column="lead">
              <span className={styles.headerLabel}>Lead</span>
            </span>
          )}
          {visible.has("targetDate") && (
            <span className={styles.headerCell} data-list-grid-column="targetDate">
              <SortButton
                label="Target date"
                sortKey="targetDate"
                ordering={pref.ordering}
                dir={dir}
                onSort={toggleSort}
              />
            </span>
          )}
          {visible.has("issues") && (
            <span
              className={clsx(styles.headerCell, styles.headerCellEnd)}
              data-list-grid-column="issues"
            >
              <span className={styles.headerLabel}>Issues</span>
            </span>
          )}
          {visible.has("status") && (
            <span className={styles.headerCell} data-list-grid-column="status">
              <SortButton
                label="Status"
                sortKey="status"
                ordering={pref.ordering}
                dir={dir}
                onSort={toggleSort}
              />
            </span>
          )}
          <span data-list-grid-column="end-padding" aria-hidden="true" />
        </div>

        <div className={styles.rows} data-list-wrapper="true">
          {groups.map((group) => (
            <Fragment key={group.key}>
              {grouped ? (
                <div className={styles.groupRow}>
                  <GroupHeader
                    icon={<GroupIcon grouping={pref.grouping} groupKey={group.key} />}
                    label={group.label}
                    count={group.projects.length}
                  />
                </div>
              ) : null}
              {group.projects.map((project) => (
                <ProjectRow
                  key={`${group.key}:${project.id}`}
                  project={project}
                  workspace={workspace}
                  visible={visible}
                  selected={selection.isSelected(project.id)}
                  keyboardActive={selection.highlightedId === project.id}
                  onToggleSelect={() => selection.toggleSelect(project.id)}
                  onHover={() => selection.highlight(project.id)}
                  onShiftClick={() => selection.selectRange(project.id)}
                  onWriteUpdate={() => setComposerFor(project.id)}
                />
              ))}
            </Fragment>
          ))}
        </div>
      </div>

      {/* Bulk actions (§6.7) — every button writes to the whole selection. */}
      <BulkBar store={selection}>
        <Menu trigger={<Button size={24}>Status</Button>} items={statusItems} side="top" />
        <Menu trigger={<Button size={24}>Priority</Button>} items={priorityItems} side="top" />
        <Menu trigger={<Button size={24}>Health</Button>} items={healthItems} side="top" />
        <Menu trigger={<Button size={24}>Lead</Button>} items={leadItems} side="top" />
      </BulkBar>

      {composerProject !== undefined ? (
        <UpdateComposer
          open
          onOpenChange={(next) => {
            if (!next) setComposerFor(null);
          }}
          projectId={composerProject.id}
          projectName={composerProject.name}
          currentHealth={composerProject.health}
        />
      ) : null}
    </>
  );
});
