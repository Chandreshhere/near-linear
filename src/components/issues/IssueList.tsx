"use client";

/**
 * Grouped team issue list — MASTER_PROMPT.md §10.6 (row anatomy, group
 * headers, tabs), §6.1 (hover reveals), §6.7 (highlight vs selection),
 * §7.5 (ListCell), video-timeline-1 f0033 (TRENDZO-37 row).
 *
 * Reads only from the MobX pool (observer); selection/highlight state lives
 * in the per-view SelectionStore; property pickers open through
 * usePropertyShortcuts on the current effective ids. The active filter chips
 * (§11.2) narrow the set before grouping — they live in `?filter=`, so this
 * component must be mounted under a <Suspense> boundary (useSearchParams
 * opts its subtree out of static prerendering).
 *
 * NOTE: the floating BulkBar and the invisible picker anchors position
 * against the nearest positioned ancestor — mount this list inside a
 * `position: relative` container that wraps the scroller (TeamIssuesView's
 * `.listArea`), like BulkBar documents.
 */

import { Fragment, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { useStore } from "@/lib/data/DataProvider";
import type {
  IssueData,
  Priority,
  StateCategory,
  WorkflowStateData,
} from "@/lib/data/types";
import {
  getSelectionStore,
  useListNavigation,
  type SelectionStore,
} from "@/lib/issues/selection";
import { applyFilters, useFilters } from "@/lib/issues/filters";
import { withoutTriageStates } from "@/lib/issues/triage";
import { useViewPreference } from "@/lib/issues/viewPrefs";
import { BulkBar } from "@/components/issues/BulkBar";
import { StatusPicker } from "@/components/issues/pickers/StatusPicker";
import { PriorityPicker } from "@/components/issues/pickers/PriorityPicker";
import { AssigneePicker } from "@/components/issues/pickers/AssigneePicker";
import { LabelPicker } from "@/components/issues/pickers/LabelPicker";
import { usePropertyShortcuts } from "@/components/issues/pickers/usePropertyShortcuts";
import { openCreateIssue } from "@/components/issues/CreateIssueModal";
import { IssueContextMenu } from "@/components/issues/IssueContextMenu";
import { IssuePropertyChips } from "@/components/issues/PropertyChips";
import { useActivePeekSource } from "@/components/nav/Peek";
import { openContextMenuFromButton } from "@/components/ui/ContextMenu";
import { ListRow, RowCheckbox } from "@/components/ui/ListRow";
import { GroupHeader } from "@/components/ui/GroupHeader";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Kbd } from "@/components/ui/Kbd";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import styles from "./issuelist.module.css";

export type IssuesTab = "active" | "backlog" | "all";

/* ================================================================
 * Pure helpers
 * ================================================================ */

/** Tab → visible workflow-state categories (null = everything). */
// §22: "triage" is deliberately absent from every tab — a triage arrival is
// not workflow yet, it lives in the team's Triage inbox until it is accepted.
const TAB_CATEGORIES: Record<IssuesTab, ReadonlySet<StateCategory> | null> = {
  active: new Set<StateCategory>(["unstarted", "started"]),
  backlog: new Set<StateCategory>(["backlog"]),
  all: null,
};

/** Priority ordering: urgent, high, medium, low, then no-priority last. */
const PRIORITY_RANK: Record<Priority, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 };

function orderIssues(issues: IssueData[], ordering: string): IssueData[] {
  const sorted = issues.slice();
  if (ordering === "priority") {
    sorted.sort((a, b) => {
      const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
      if (byPriority !== 0) return byPriority;
      return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    });
  } else {
    sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }
  return sorted;
}

/** One rendered row: the issue plus its nesting depth (0 = top level). */
interface ListEntry {
  issue: IssueData;
  depth: number;
}

/**
 * §11.1 "Nested sub-issues": children follow their parent immediately and
 * carry a depth for the title indent. With the option off (or when the parent
 * is not in this group) every row stays flat at depth 0. Cycles — a hand-
 * edited parentId pointing back up the chain — are broken by the `seen` set.
 */
function nestIssues(issues: IssueData[], nested: boolean): ListEntry[] {
  if (!nested) return issues.map((issue) => ({ issue, depth: 0 }));

  const byId = new Map(issues.map((issue) => [issue.id, issue]));
  const childrenOf = new Map<string, IssueData[]>();
  const roots: IssueData[] = [];
  for (const issue of issues) {
    const parent =
      issue.parentId !== undefined ? byId.get(issue.parentId) : undefined;
    if (parent === undefined || parent.id === issue.id) {
      roots.push(issue);
      continue;
    }
    const siblings = childrenOf.get(parent.id);
    if (siblings) siblings.push(issue);
    else childrenOf.set(parent.id, [issue]);
  }

  const out: ListEntry[] = [];
  const seen = new Set<string>();
  const visit = (issue: IssueData, depth: number): void => {
    if (seen.has(issue.id)) return;
    seen.add(issue.id);
    out.push({ issue, depth });
    for (const child of childrenOf.get(issue.id) ?? []) visit(child, depth + 1);
  };
  for (const root of roots) visit(root, 0);
  // Anything stranded by a cycle still renders rather than vanishing.
  for (const issue of issues) {
    if (!seen.has(issue.id)) out.push({ issue, depth: 0 });
  }
  return out;
}

/** "Aug 24" (f0033 date column). */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatCreatedAt(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "" : DATE_FORMAT.format(time);
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

/** Real row link target: /:ws/issue/:identifier/:slug (f0045 route shape). */
function issueUrl(workspace: string, issue: IssueData): string {
  return `/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`;
}

/** Team empty state copy — capture f0041 ("All issues"); other tabs extrapolated. */
const EMPTY_COPY: Record<IssuesTab, { heading: string; body: string }> = {
  all: {
    heading: "All issues",
    body: "All issues is the place where you can see all your team's work in one view. Once you have created issues for this team, they will show up here.",
  },
  active: {
    heading: "Active issues",
    body: "Active shows the issues your team is currently working on. Once issues move into Todo or In Progress, they will show up here.",
  },
  backlog: {
    heading: "Backlog",
    body: "The backlog collects issues your team has captured but not yet started. Once you add issues to the backlog, they will show up here.",
  },
};

/** Shown instead of the tab copy while the chip row excludes every issue. */
const FILTERED_EMPTY_COPY = {
  heading: "No matching issues",
  body: "No issues in this view match the filters you applied. Widen a filter or clear the chips above to see more.",
};

/* ================================================================
 * Row pieces
 * ================================================================ */

/** Dashed-person empty-assignee placeholder (f0033), 18px like the avatar. */
function AssigneePlaceholder() {
  return (
    <span className={styles.assigneePlaceholder} aria-hidden="true">
      <Icon name="PersonDashed" size={18} color="currentColor" />
    </span>
  );
}

const IssueRow = observer(function IssueRow({
  issue,
  state,
  workspace,
  selection,
  firstInGroup,
  lastInGroup,
  depth,
  displayProperties,
}: {
  issue: IssueData;
  state: WorkflowStateData | undefined;
  workspace: string;
  selection: SelectionStore;
  firstInGroup: boolean;
  lastInGroup: boolean;
  /** Nesting level from "Nested sub-issues" (§11.1); 0 when flat. */
  depth: number;
  /** Enabled display-property keys (§11.1) — gates the right-side chips. */
  displayProperties: readonly string[];
}) {
  const store = useStore();
  const moreRef = useRef<HTMLButtonElement>(null);
  const assignee =
    issue.assigneeId !== undefined ? store.get("User", issue.assigneeId) : undefined;
  const selected = selection.isSelected(issue.id);

  return (
    <IssueContextMenu issue={issue} selection={selection}>
      <ListRow
        href={issueUrl(workspace, issue)}
        height={44}
        selected={selected}
        keyboardActive={selection.highlightedId === issue.id}
        firstInGroup={firstInGroup}
        lastInGroup={lastInGroup}
        listKey={issue.id}
        onClick={(e) => {
          // Shift+Click extends the selection instead of navigating (§6.7).
          if (e.shiftKey) {
            e.preventDefault();
            selection.selectRange(issue.id);
          }
        }}
      >
        <div
          className={styles.rowGrid}
          onMouseEnter={() => selection.highlight(issue.id)}
        >
          <span className={styles.cellCheckbox}>
            <RowCheckbox
              checked={selected}
              onChange={() => selection.toggleSelect(issue.id)}
            />
          </span>
          <span className={styles.cellId}>
            <button
              ref={moreRef}
              type="button"
              className={styles.moreBtn}
              aria-label={`${issue.identifier} options`}
              aria-haspopup="menu"
              tabIndex={-1}
              onClick={(e) => {
                // §6.3: the ⋯ affordance opens the row's context menu — the
                // same surface right-click opens, anchored under the button.
                e.preventDefault();
                e.stopPropagation();
                selection.highlight(issue.id);
                openContextMenuFromButton(moreRef.current);
              }}
              onPointerDown={(e) => e.stopPropagation()}
            >
              <Icon name="More" size={14} />
            </button>
            <span className={styles.idText}>{issue.identifier}</span>
          </span>
          <span className={styles.cellStatus}>
            <StatusIcon
              category={state?.category ?? "backlog"}
              color={state?.color}
            />
          </span>
          <span
            className={styles.cellTitle}
            style={depth > 0 ? { paddingLeft: depth * 20 } : undefined}
          >
            {depth > 0 && (
              <span className={styles.subIssueTick} aria-hidden="true" />
            )}
            {issue.title}
          </span>
          {/* Right-aligned property chips before the assignee/date cells
              (reference row anatomy). One line, max 3 pills + "+N" overflow;
              the inner chips hide under ~900px container width (container
              query in issuelist.module.css) so the cell collapses without
              shifting the grid columns. */}
          <span className={styles.cellChips}>
            <IssuePropertyChips
              issue={issue}
              displayProperties={displayProperties}
              max={3}
              className={styles.rowChips}
            />
          </span>
          <span aria-hidden="true" />
          <span className={styles.cellAssignee}>
            {assignee !== undefined ? (
              <Avatar
                initials={assignee.initials}
                color={assignee.avatarColor}
                size={18}
                src={assignee.avatarUrl}
              />
            ) : (
              <AssigneePlaceholder />
            )}
          </span>
          <span className={styles.cellDate}>{formatCreatedAt(issue.createdAt)}</span>
        </div>
      </ListRow>
    </IssueContextMenu>
  );
});

/* ================================================================
 * The list
 * ================================================================ */

interface IssueGroup {
  key: string;
  state: WorkflowStateData | undefined;
  entries: ListEntry[];
}

export const IssueList = observer(function IssueList({
  teamId,
  viewKey,
  tab,
}: {
  teamId: string;
  viewKey: string;
  tab: IssuesTab;
}) {
  const store = useStore();
  const router = useRouter();
  const { workspace } = useParams<{ workspace: string }>();
  const { pref } = useViewPreference(viewKey);
  const { filters } = useFilters(viewKey);
  const selection = getSelectionStore(viewKey);

  // ---------- derive groups (tab filter → grouping → ordering) ----------

  // The Triage state is not a column of this list, so it never enters the
  // lookup — which also drops its issues from the unfiltered "All" tab (§22).
  const states = withoutTriageStates(store.statesForTeam(teamId));
  const stateById = new Map<string, WorkflowStateData>(
    states.map((state) => [state.id, state]),
  );
  const allowed = TAB_CATEGORIES[tab];
  const tabIssues = store.issuesForTeam(teamId).filter((issue) => {
    const state = stateById.get(issue.stateId);
    if (state === undefined) return false;
    return allowed === null || allowed.has(state.category);
  });

  // The chip row narrows the set the tab already chose, before grouping — so
  // group counts and the selection ids describe what is actually on screen
  // (§11.2). `applyFilters` returns `tabIssues` untouched when no chip holds
  // a value, which keeps the unfiltered path allocation-free.
  const filteredIssues = applyFilters(tabIssues, filters, store);

  // §11.1 "Show sub-issues": off hides every issue that hangs off a parent
  // still present in this team, so the list reads as top-level work only.
  const nested = pref.nestedSubIssues ?? true;
  const visibleIssues = pref.showSubIssues
    ? filteredIssues
    : filteredIssues.filter(
        (issue) =>
          issue.parentId === undefined ||
          store.get("Issue", issue.parentId) === undefined,
      );

  let groups: IssueGroup[];
  if (pref.grouping === "status") {
    const byState = new Map<string, IssueData[]>();
    for (const issue of visibleIssues) {
      const list = byState.get(issue.stateId);
      if (list) list.push(issue);
      else byState.set(issue.stateId, [issue]);
    }
    const visibleStates =
      allowed === null ? states : states.filter((s) => allowed.has(s.category));
    groups = visibleStates
      .map((state) => ({
        key: state.id,
        state,
        entries: nestIssues(
          orderIssues(byState.get(state.id) ?? [], pref.ordering),
          nested,
        ),
      }))
      .filter((group) => group.entries.length > 0 || pref.showEmptyGroups);
  } else {
    // Only "status" grouping is fully implemented this phase; anything else
    // renders as a flat ungrouped list.
    const ordered = nestIssues(orderIssues(visibleIssues, pref.ordering), nested);
    groups =
      ordered.length > 0 ? [{ key: "all", state: undefined, entries: ordered }] : [];
  }

  // ---------- selection wiring ----------

  const idsKey = groups
    .flatMap((group) => group.entries.map((entry) => entry.issue.id))
    .join("\n");
  useEffect(() => {
    selection.setItems(idsKey === "" ? [] : idsKey.split("\n"));
  }, [selection, idsKey]);

  useListNavigation(selection, {
    scope: "list",
    onOpen: (id) => {
      const issue = store.get("Issue", id);
      if (issue !== undefined) router.push(issueUrl(workspace, issue));
    },
  });

  // §12 `Space` peek: this list is the source PeekHost reads. The getter
  // touches the SelectionStore, so walking the highlight with ↑/↓ (handled
  // by useListNavigation above) repaints the panel onto the new issue.
  // Registered on mount, cleared on unmount by the hook.
  useActivePeekSource(() => ({
    id: selection.highlightedId,
    move: (delta) => selection.moveHighlight(delta),
  }));

  const shortcuts = usePropertyShortcuts(
    () => selection.effectiveIds,
    () => teamId,
  );

  // A filtered view that matches nothing is a different sentence from a team
  // that has no issues yet — the tab copy ("once you have created issues…")
  // would be plainly wrong while rows exist just outside the chips.
  const filtered = filters.some((filter) => filter.values.length > 0);
  const empty = filtered ? FILTERED_EMPTY_COPY : EMPTY_COPY[tab];

  return (
    <>
      {/* Invisible picker anchors pinned top-left of the visible list area;
          the S/A/P/L shortcuts and BulkBar buttons open these. */}
      <div className={styles.pickerAnchors}>
        <StatusPicker
          teamId={teamId}
          issueIds={selection.effectiveIds}
          open={shortcuts.statusOpen}
          onOpenChange={shortcuts.setStatusOpen}
          trigger={<span className={styles.pickerAnchor} />}
        />
        <PriorityPicker
          issueIds={selection.effectiveIds}
          open={shortcuts.priorityOpen}
          onOpenChange={shortcuts.setPriorityOpen}
          trigger={<span className={styles.pickerAnchor} />}
        />
        <AssigneePicker
          issueIds={selection.effectiveIds}
          open={shortcuts.assigneeOpen}
          onOpenChange={shortcuts.setAssigneeOpen}
          trigger={<span className={styles.pickerAnchor} />}
        />
        <LabelPicker
          issueIds={selection.effectiveIds}
          open={shortcuts.labelOpen}
          onOpenChange={shortcuts.setLabelOpen}
          trigger={<span className={styles.pickerAnchor} />}
        />
      </div>

      {groups.length === 0 ? (
        <div className={styles.emptyFill}>
          <EmptyState
            illustration={
              <div className={styles.statusCluster} aria-hidden="true">
                <span>
                  <StatusIcon category="backlog" size={18} />
                </span>
                <span>
                  <StatusIcon category="unstarted" size={18} />
                </span>
                <span>
                  <StatusIcon category="started" size={18} />
                </span>
                <span>
                  <StatusIcon category="completed" size={18} />
                </span>
              </div>
            }
            heading={empty.heading}
            primary={
              <Button
                variant="primary"
                size={32}
                onClick={() => openCreateIssue({ teamId })}
              >
                Create new issue
                <Kbd keys={["C"]} />
              </Button>
            }
            secondary={
              <Button variant="secondary" size={32}>
                Documentation
              </Button>
            }
          >
            {empty.body}
          </EmptyState>
        </div>
      ) : (
        <div className={styles.list}>
          {groups.map((group) => {
            const state = group.state;
            return (
              <Fragment key={group.key}>
                {state !== undefined && (
                  <GroupHeader
                    icon={
                      <StatusIcon category={state.category} color={state.color} />
                    }
                    label={state.name}
                    count={group.entries.length}
                    onAdd={() => openCreateIssue({ teamId, stateId: state.id })}
                  />
                )}
                {group.entries.map(({ issue, depth }, index) => (
                  <IssueRow
                    key={issue.id}
                    issue={issue}
                    state={stateById.get(issue.stateId)}
                    workspace={workspace}
                    selection={selection}
                    depth={depth}
                    displayProperties={pref.displayProperties}
                    firstInGroup={index === 0}
                    lastInGroup={index === group.entries.length - 1}
                  />
                ))}
              </Fragment>
            );
          })}
        </div>
      )}

      <BulkBar store={selection}>
        <Button size={24} onClick={() => shortcuts.setStatusOpen(true)}>
          Status
        </Button>
        <Button size={24} onClick={() => shortcuts.setPriorityOpen(true)}>
          Priority
        </Button>
        <Button size={24} onClick={() => shortcuts.setAssigneeOpen(true)}>
          Assignee
        </Button>
      </BulkBar>
    </>
  );
});
