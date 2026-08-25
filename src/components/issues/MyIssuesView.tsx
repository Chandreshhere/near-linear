"use client";

/**
 * My Issues — MASTER_PROMPT.md §10.5, docs/analysis/video-timeline-1.md
 * f0009–f0010 ("My issues" header, segmented Assigned | Created | Subscribed |
 * Activity pills, top-right filter / display / insights / layout icon row,
 * isometric empty state + primary "Create new issue").
 *
 * The four tabs are REAL routes (`/:ws/my-issues/:tab`) so the browser back
 * button, middle-click and URL preview all behave — the sidebar's "My issues"
 * entry already points at `/my-issues/assigned`.
 *
 * Scope note: unlike the team list this view spans every team, so rows carry a
 * team-key chip and grouping is by workflow-state CATEGORY (state *ids* differ
 * per team, categories do not).
 *
 * Deliberate deviations from IssueList's row anatomy, to be reconciled when
 * cross-team selection lands:
 *  - no hover checkbox and no BulkBar: SelectionStore + the S/A/P/L shortcuts
 *    are keyed to a single teamId, and a cross-team selection cannot resolve
 *    one. Right-click still works — <IssueContextMenu> resolves the team from
 *    the row's own issue, so single-row edits are the full vocabulary here.
 * Everything else (ListRow bleed background, 44px height, group headers,
 * 13px/500 title, 18px assignee avatar, "Aug 24" date) matches the team list.
 *
 * Chrome (§11): the toolbar's four icons are all live against this view's own
 * key (`my-issues/<tab>`) — the filter menu and chip row, display options,
 * the floating insights FacetPanel (an overlay: the list keeps its full
 * width, §11.3), and the list ↔ board toggle. The board is cross-team, so
 * its columns are state CATEGORIES and its cards do not drag (manual
 * sortOrder is a per-team axis).
 */

import {
  Fragment,
  Suspense,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useStore } from "@/lib/data/DataProvider";
import { CATEGORY_ORDER } from "@/lib/data/store";
import type {
  ActivityData,
  IssueData,
  Priority,
  StateCategory,
} from "@/lib/data/types";
import { CURRENT_USER_ID, useViewPreference } from "@/lib/issues/viewPrefs";
import { applyFilters, useFilters } from "@/lib/issues/filters";
import { withoutTriageIssues } from "@/lib/issues/triage";
import { useShortcut } from "@/lib/keyboard";
import { openCreateIssue } from "@/components/issues/CreateIssueModal";
import { AddFilterButton, FilterBar } from "@/components/issues/FilterBar";
import { DisplayOptionsButton } from "@/components/issues/DisplayOptions";
import { FacetPanel } from "@/components/panels/FacetPanel";
import { insightsKey, usePersistedFlag } from "@/lib/projects/localPrefs";
import { IssueContextMenu } from "@/components/issues/IssueContextMenu";
import { Header } from "@/components/shell/Header";
import { ListRow } from "@/components/ui/ListRow";
import { GroupHeader } from "@/components/ui/GroupHeader";
import { Button, IconButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { Kbd } from "@/components/ui/Kbd";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import shellStyles from "@/components/shell/shell.module.css";
import boardStyles from "./board/board.module.css";
import styles from "./myissues.module.css";

/* ================================================================
 * Tab contract (shared with the route segment)
 * ================================================================ */

export const MY_ISSUES_TABS = [
  "assigned",
  "created",
  "subscribed",
  "activity",
] as const;

export type MyIssuesTab = (typeof MY_ISSUES_TABS)[number];

/** Route-param guard — anything else falls back to "assigned" (§10.5). */
export function isMyIssuesTab(value: string): value is MyIssuesTab {
  return (MY_ISSUES_TABS as readonly string[]).includes(value);
}

const TAB_LABELS: Record<MyIssuesTab, string> = {
  assigned: "Assigned",
  created: "Created",
  subscribed: "Subscribed",
  activity: "Activity",
};

/* ================================================================
 * Pure helpers
 * ================================================================ */

/** Group titles for the category buckets (fixture state names, §26). */
const CATEGORY_LABEL: Record<StateCategory, string> = {
  triage: "Triage",
  backlog: "Backlog",
  unstarted: "Todo",
  started: "In Progress",
  completed: "Done",
  canceled: "Canceled",
};

/** Urgent → high → medium → low, no-priority last (same rank as IssueList). */
const PRIORITY_RANK: Record<Priority, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 };

function newestFirst(a: { createdAt: string }, b: { createdAt: string }): number {
  return Date.parse(b.createdAt) - Date.parse(a.createdAt);
}

function byPriorityThenRecency(a: IssueData, b: IssueData): number {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  return byPriority !== 0 ? byPriority : newestFirst(a, b);
}

/** "Aug 24" — the list date column (f0033). */
const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function formatDate(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "" : DATE_FORMAT.format(time);
}

/**
 * "just now" → "5m" → "2h" → "Aug 24". Local copy rather than an import from
 * the issue-detail feed so this view owns its own formatting contract.
 */
function formatRelative(iso: string, now: number): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const minutes = Math.floor(Math.max(0, now - time) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return DATE_FORMAT.format(time);
}

function absoluteTime(iso: string): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return iso;
  return new Date(time).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

/** Row link target: /:ws/issue/:identifier/:slug (f0045 route shape). */
function issueUrl(workspace: string, issue: IssueData): string {
  return `/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`;
}

/** One-line phrasing for an activity entry (mirrors the detail feed copy). */
function describeActivity(activity: ActivityData): string {
  switch (activity.type) {
    case "created":
      return "created the issue";
    case "stateChanged":
      return `moved from ${activity.from ?? "?"} to ${activity.to ?? "?"}`;
    case "priorityChanged":
      return activity.to ? `set priority to ${activity.to}` : "removed priority";
    case "assigneeChanged":
      return activity.to ? `assigned ${activity.to}` : "unassigned the issue";
    case "labelAdded":
      return `added label ${activity.to ?? ""}`.trimEnd();
    case "labelRemoved":
      return `removed label ${activity.from ?? ""}`.trimEnd();
    case "projectChanged":
      return activity.to ? `added to project ${activity.to}` : "removed from project";
    case "milestoneCompleted":
      return `completed milestone ${activity.to ?? ""}`.trimEnd();
    case "commented":
      return "commented";
    default:
      return "updated the issue";
  }
}

/** Empty-state copy per tab (f0009 heading is CAPTURED; the rest follow it). */
const EMPTY_COPY: Record<MyIssuesTab, { heading: string; body: string }> = {
  assigned: {
    heading: "No issues assigned to you",
    body: "Issues assigned to you across every team collect here, so this is the list to work down.",
  },
  created: {
    heading: "No issues created by you",
    body: "Every issue you open lands here, newest first, whichever team it belongs to.",
  },
  subscribed: {
    heading: "No issues you follow",
    body: "Subscribe to an issue to follow its updates and it will show up in this list.",
  },
  activity: {
    heading: "No recent activity",
    body: "Changes you make, and changes on the issues you follow, appear here as they happen.",
  },
};

/** Shown instead of the tab copy while the chip row excludes every row. */
const FILTERED_EMPTY_COPY = {
  heading: "No matching issues",
  body: "No issues in this view match the filters you applied. Widen a filter or clear the chips above to see more.",
};

/* ================================================================
 * Small pieces
 * ================================================================ */

/**
 * Empty-state illustration: three rounded slabs stacked and sheared into an
 * isometric pile (f0009's tilted disc stack). Original artwork; painted in
 * back-to-front order so the front slab occludes the ones behind it.
 */
function StackIllustration() {
  return (
    <svg
      width={100}
      height={100}
      viewBox="0 0 100 100"
      fill="none"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <g transform="translate(10 34) skewY(-20)">
        {[0, 22, 44].map((y, index) => (
          <rect
            key={y}
            x={0}
            y={y}
            width={80}
            height={18}
            rx={6}
            fill="var(--color-bg-shade)"
            stroke="currentColor"
            strokeWidth={1.5}
            opacity={0.45 + index * 0.275}
          />
        ))}
      </g>
    </svg>
  );
}

/** Dashed-person empty-assignee placeholder (f0033), sized like the avatar. */
function AssigneePlaceholder() {
  return (
    <span className={styles.assigneePlaceholder} aria-hidden="true">
      <Icon name="PersonDashed" size={18} color="currentColor" />
    </span>
  );
}

const IssueRow = observer(function IssueRow({
  issue,
  workspace,
  firstInGroup,
  lastInGroup,
}: {
  issue: IssueData;
  workspace: string;
  firstInGroup: boolean;
  lastInGroup: boolean;
}) {
  const store = useStore();
  const state = store.get("WorkflowState", issue.stateId);
  const team = store.get("Team", issue.teamId);
  const assignee =
    issue.assigneeId !== undefined ? store.get("User", issue.assigneeId) : undefined;

  return (
    <IssueContextMenu issue={issue}>
      <ListRow
        href={issueUrl(workspace, issue)}
        height={44}
        firstInGroup={firstInGroup}
        lastInGroup={lastInGroup}
        listKey={issue.id}
      >
        <div className={styles.rowGrid}>
          <span className={styles.idText}>{issue.identifier}</span>
          <span className={styles.cellStatus}>
            <StatusIcon category={state?.category ?? "backlog"} color={state?.color} />
          </span>
          <span className={styles.cellTitle}>{issue.title}</span>
          <span aria-hidden="true" />
          {team !== undefined ? (
            <span className={styles.teamChip}>{team.key}</span>
          ) : (
            <span aria-hidden="true" />
          )}
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
          <span className={styles.cellDate}>{formatDate(issue.createdAt)}</span>
        </div>
      </ListRow>
    </IssueContextMenu>
  );
});

/** Cross-team board card: no DnD (sortOrder is per-team), real link + menu. */
const MyIssueCard = observer(function MyIssueCard({
  issue,
  workspace,
}: {
  issue: IssueData;
  workspace: string;
}) {
  const store = useStore();
  const state = store.get("WorkflowState", issue.stateId);
  const team = store.get("Team", issue.teamId);
  const assignee =
    issue.assigneeId !== undefined ? store.get("User", issue.assigneeId) : undefined;

  return (
    <IssueContextMenu issue={issue}>
      <Link href={issueUrl(workspace, issue)} className={boardStyles.card}>
        <div className={boardStyles.cardId}>
          {issue.identifier}
          {team !== undefined ? (
            <span className={styles.cardTeam}>{team.key}</span>
          ) : null}
        </div>
        <div className={boardStyles.cardTitleRow}>
          <span className={boardStyles.cardStatus}>
            <StatusIcon
              category={state?.category ?? "backlog"}
              color={state?.color}
              size={14}
            />
          </span>
          <span className={boardStyles.cardTitle}>{issue.title}</span>
        </div>
        <span className={boardStyles.cardAssignee}>
          {assignee !== undefined ? (
            <Avatar
              initials={assignee.initials}
              color={assignee.avatarColor}
              size={18}
              src={assignee.avatarUrl}
            />
          ) : (
            <span className={boardStyles.assigneePlaceholder} aria-hidden="true" />
          )}
        </span>
      </Link>
    </IssueContextMenu>
  );
});

const ActivityRow = observer(function ActivityRow({
  activity,
  workspace,
  now,
}: {
  activity: ActivityData;
  workspace: string;
  now: number;
}) {
  const store = useStore();
  const actor = store.get("User", activity.actorId);
  const issue =
    activity.issueId !== undefined ? store.get("Issue", activity.issueId) : undefined;

  return (
    <ListRow height={36} listKey={activity.id}>
      <div className={styles.activityGrid}>
        {/*
         * 14px actor avatar (§10.5 feed row). The Avatar primitive's smallest
         * size is 16, so the feed paints its own chip — same approach the
         * issue-detail activity feed takes.
         */}
        <span
          className={styles.actorAvatar}
          style={{ background: actor?.avatarColor }}
          aria-hidden="true"
        >
          {actor?.initials}
        </span>
        <span className={styles.activityText}>
          <b className={styles.actorName}>{actor?.displayName ?? "Someone"}</b>{" "}
          {describeActivity(activity)}
          {issue !== undefined && (
            <>
              {" "}
              <Link className={styles.issueLink} href={issueUrl(workspace, issue)}>
                {issue.identifier}
              </Link>
            </>
          )}
        </span>
        <span className={styles.activityTime} title={absoluteTime(activity.createdAt)}>
          {formatRelative(activity.createdAt, now)}
        </span>
      </div>
    </ListRow>
  );
});

/* ================================================================
 * Derivation
 * ================================================================ */

interface IssueGroup {
  key: string;
  label: string;
  category?: StateCategory;
  issues: IssueData[];
}

/** Re-render tick so relative times age without a reload. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

/* ================================================================
 * Body (filter-aware — must sit under a <Suspense> boundary)
 * ================================================================ */

/** The issues one tab is about, before the chip row narrows them. */
function tabIssuesFor(
  tab: MyIssuesTab,
  live: IssueData[],
  activities: ActivityData[],
  store: ReturnType<typeof useStore>,
): IssueData[] {
  switch (tab) {
    case "assigned":
      return live.filter((issue) => issue.assigneeId === CURRENT_USER_ID);
    case "subscribed":
      return live.filter((issue) => issue.subscriberIds.includes(CURRENT_USER_ID));
    case "created":
      return live.filter((issue) => issue.creatorId === CURRENT_USER_ID);
    case "activity": {
      // Insights and the board still need an issue set here: the distinct
      // issues the feed is talking about.
      const seen = new Set<string>();
      const out: IssueData[] = [];
      for (const activity of activities) {
        if (activity.issueId === undefined || seen.has(activity.issueId)) continue;
        seen.add(activity.issueId);
        const issue = store.get("Issue", activity.issueId);
        if (issue !== undefined && !issue.archivedAt) out.push(issue);
      }
      return out;
    }
  }
}

const MyIssuesBody = observer(function MyIssuesBody({
  workspace,
  tab,
  viewKey,
}: {
  workspace: string;
  tab: MyIssuesTab;
  viewKey: string;
}) {
  const store = useStore();
  const now = useNow(60_000);
  const { pref } = useViewPreference(viewKey);
  const { filters } = useFilters(viewKey);

  // §22: an untriaged arrival is not "my issue" yet, whoever created it.
  const live = withoutTriageIssues(
    store.all("Issue").filter((issue) => !issue.archivedAt),
    store,
  );

  // ---------- activity tab → recency feed ----------

  const allActivities: ActivityData[] =
    tab === "activity"
      ? store
          .all("Activity")
          .filter((activity) => {
            if (activity.issueId === undefined) return false;
            if (activity.actorId === CURRENT_USER_ID) return true;
            const issue = store.get("Issue", activity.issueId);
            return issue !== undefined && issue.subscriberIds.includes(CURRENT_USER_ID);
          })
          .sort(newestFirst)
      : [];

  // The chip row narrows the tab's set before anything is grouped, so the
  // group counts, the board columns and the insights facets all describe the
  // same rows (§11.2).
  const scoped = tabIssuesFor(tab, live, allActivities, store);
  const visibleIssues = applyFilters(scoped, filters, store);
  const visibleIds = new Set(visibleIssues.map((issue) => issue.id));
  const activities = allActivities.filter(
    (activity) => activity.issueId !== undefined && visibleIds.has(activity.issueId),
  );

  // ---------- grouping ----------

  const buckets = new Map<StateCategory, IssueData[]>();
  for (const issue of visibleIssues) {
    const category = store.get("WorkflowState", issue.stateId)?.category ?? "backlog";
    const bucket = buckets.get(category);
    if (bucket) bucket.push(issue);
    else buckets.set(category, [issue]);
  }
  const categoryGroups: IssueGroup[] = CATEGORY_ORDER.filter((category) =>
    buckets.has(category),
  ).map((category) => ({
    key: category,
    label: CATEGORY_LABEL[category],
    category,
    issues: (buckets.get(category) ?? []).slice().sort(byPriorityThenRecency),
  }));

  let groups: IssueGroup[];
  if (tab === "created") {
    // Flat, newest first, under a single "Created" header carrying the count.
    const created = visibleIssues.slice().sort(newestFirst);
    groups = created.length > 0 ? [{ key: "created", label: "Created", issues: created }] : [];
  } else {
    // Grouped by workflow-state CATEGORY: this view spans teams and each team
    // owns its own state rows, so the category is the only shared axis.
    groups = categoryGroups;
  }

  const board = pref.layout === "board" && tab !== "activity";
  const filtered = filters.some((filter) => filter.values.length > 0);
  const isEmpty =
    tab === "activity" && !board ? activities.length === 0 : groups.length === 0;
  const empty = filtered ? FILTERED_EMPTY_COPY : EMPTY_COPY[tab];

  let content: ReactNode;
  if (isEmpty) {
    content = (
      <div className={styles.emptyFill}>
        <EmptyState
          illustration={<StackIllustration />}
          heading={empty.heading}
          primary={
            <Button variant="primary" size={32} onClick={() => openCreateIssue()}>
              Create new issue
              <Kbd keys={["C"]} />
            </Button>
          }
        >
          {empty.body}
        </EmptyState>
      </div>
    );
  } else if (board) {
    // Cross-team board: columns are state CATEGORIES (see the note above),
    // cards are plain links — manual ordering is a per-team axis, so this
    // view deliberately does not offer drag-and-drop.
    content = (
      <div className={boardStyles.board}>
        {categoryGroups.map((group) => (
          <section
            key={group.key}
            className={boardStyles.column}
            aria-label={group.label}
          >
            <header className={boardStyles.columnHeader}>
              <span className={boardStyles.columnIcon}>
                {group.category !== undefined ? (
                  <StatusIcon category={group.category} size={14} />
                ) : (
                  <Icon name="MyIssues" size={14} />
                )}
              </span>
              <span className={boardStyles.columnName}>{group.label}</span>
              <span className={boardStyles.columnCount}>{group.issues.length}</span>
            </header>
            <div className={boardStyles.columnBody}>
              {group.issues.map((issue) => (
                <MyIssueCard key={issue.id} issue={issue} workspace={workspace} />
              ))}
            </div>
          </section>
        ))}
      </div>
    );
  } else if (tab === "activity") {
    content = (
      <div className={styles.list}>
        {activities.map((activity) => (
          <ActivityRow
            key={activity.id}
            activity={activity}
            workspace={workspace}
            now={now}
          />
        ))}
      </div>
    );
  } else {
    content = (
      <div className={styles.list}>
        {groups.map((group) => (
          <Fragment key={group.key}>
            <GroupHeader
              icon={
                group.category !== undefined ? (
                  <StatusIcon category={group.category} />
                ) : (
                  <Icon name="MyIssues" size={14} />
                )
              }
              label={group.label}
              count={group.issues.length}
            />
            {group.issues.map((issue, index) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                workspace={workspace}
                firstInGroup={index === 0}
                lastInGroup={index === group.issues.length - 1}
              />
            ))}
          </Fragment>
        ))}
      </div>
    );
  }

  // Full-width scroller — the floating FacetPanel overlays it (§11.3), so
  // nothing here ever resizes when insights opens.
  return (
    <div
      className={shellStyles.contentScroller}
      tabIndex={0}
      data-scroll-container="true"
    >
      {content}
    </div>
  );
});

/* ================================================================
 * View
 * ================================================================ */

export const MyIssuesView = observer(function MyIssuesView({
  workspace,
  tab,
}: {
  workspace: string;
  tab: MyIssuesTab;
}) {
  // Each tab is its own saved view (§11.1 per-view persistence), matching the
  // route the tabs already navigate to.
  const viewKey = `my-issues/${tab}`;
  const { pref, update } = useViewPreference(viewKey);
  const [insightsOpen, , toggleInsights] = usePersistedFlag(insightsKey(viewKey));

  const boardable = tab !== "activity";
  const toggleLayout = (): void => {
    if (!boardable) return;
    update({ layout: pref.layout === "board" ? "list" : "board" });
  };

  useShortcut(
    {
      id: `my-issues:${viewKey}:layout-toggle`,
      keys: "mod+b",
      description: "Toggle list or board layout",
      handler: toggleLayout,
    },
    [viewKey],
  );

  const tabsRow = (
    <>
      <div className={shellStyles.tabStrip}>
        {MY_ISSUES_TABS.map((id) => (
          <Link
            key={id}
            href={`/${workspace}/my-issues/${id}`}
            className={shellStyles.tab}
            data-active={tab === id ? "true" : undefined}
            aria-current={tab === id ? "page" : undefined}
          >
            {TAB_LABELS[id]}
          </Link>
        ))}
      </div>
      <span className={shellStyles.headerSpacer} />
      {/* Filters live in `?filter=` (useSearchParams), so the funnel sits under
          its own Suspense boundary; the fallback holds the toolbar geometry. */}
      <Suspense
        fallback={
          <IconButton label="Filter" disabled>
            <Icon name="Filter" size={14} />
          </IconButton>
        }
      >
        <AddFilterButton viewKey={viewKey} />
      </Suspense>
      <DisplayOptionsButton viewKey={viewKey} />
      <IconButton
        label={insightsOpen ? "Close insights" : "Open insights"}
        data-state={insightsOpen ? "active" : "inactive"}
        data-active={insightsOpen ? "true" : undefined}
        aria-pressed={insightsOpen}
        onClick={toggleInsights}
      >
        <Icon name="Insights" size={14} />
      </IconButton>
      <IconButton
        label={
          !boardable
            ? "Switch layout (list only on Activity)"
            : pref.layout === "board"
              ? "Switch to list layout"
              : "Switch to board layout"
        }
        disabled={!boardable}
        onClick={toggleLayout}
      >
        <Icon name="SidePanel" size={14} />
      </IconButton>
    </>
  );

  return (
    <>
      <Header title="My issues" tabs={tabsRow} />
      <Suspense fallback={null}>
        <FilterBar viewKey={viewKey} />
      </Suspense>
      <Suspense fallback={null}>
        <MyIssuesBody workspace={workspace} tab={tab} viewKey={viewKey} />
      </Suspense>
      {/* §11.3: the insights panel FLOATS over the list (absolute against
          the content card) — the list keeps its full width underneath.
          Keyed per tab so the persisted facet tab reloads per viewKey. */}
      <Suspense fallback={null}>
        <FacetPanel
          key={viewKey}
          viewKey={viewKey}
          scope={{ kind: "my-issues", tab }}
          open={insightsOpen}
        />
      </Suspense>
    </>
  );
});
