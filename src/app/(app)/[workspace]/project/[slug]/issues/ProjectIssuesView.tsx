"use client";

/**
 * Project Issues (`/project/:slug/issues`) — breadcrumb header
 * "Projects › {name} › Issues" + the project's issues with the real list
 * chrome: filter menu + chip row (§11.2), display options (§11.1) and the
 * `?projectMilestoneId=` scope the milestone links carry (capture §4:
 * `…/issues?projectMilestoneId=<uuid>`; `none` = the "No milestone" row).
 *
 * IssueList itself is team-scoped (`store.issuesForTeam`), so this page
 * renders equivalent rows against `store.issuesForProject` while REUSING the
 * shared machinery around them: `useFilters`/`applyFilters`, the issue
 * `useViewPreference` (grouping + ordering) and the same FilterBar /
 * DisplayOptions surfaces the team list mounts.
 *
 * `useSearchParams` opts its subtree out of static prerendering, so the body
 * sits under its own <Suspense> boundary.
 */

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { observer } from "mobx-react-lite";
import { Header } from "@/components/shell/Header";
import { IconButton } from "@/components/ui/Button";
import { GroupHeader } from "@/components/ui/GroupHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon, PriorityIcon } from "@/components/icons/StatusIcon";
import { Avatar } from "@/components/ui/Avatar";
import { AddFilterButton, FilterBar } from "@/components/issues/FilterBar";
import { DisplayOptionsButton } from "@/components/issues/DisplayOptions";
import { projectIconFor } from "@/components/projects/glyphs";
import { applyFilters, useFilters } from "@/lib/issues/filters";
import { withoutTriageIssues } from "@/lib/issues/triage";
import { useViewPreference } from "@/lib/issues/viewPrefs";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { CATEGORY_ORDER } from "@/lib/data/store";
import type { IssueData, Priority, StateCategory } from "@/lib/data/types";
import shellStyles from "@/components/shell/shell.module.css";
import styles from "@/components/projects/overview.module.css";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/** Query parameter the milestone links carry (CAPTURED). */
const MILESTONE_PARAM = "projectMilestoneId";

/** Emoji icons start with a non-ASCII unit (same heuristic as glyphs). */
function isEmojiIcon(icon: string | undefined): icon is string {
  return icon !== undefined && icon !== "" && icon.charCodeAt(0) > 0x7f;
}

/** Fallback group label when the team has no state in a category. */
const CATEGORY_FALLBACK: Record<StateCategory, string> = {
  triage: "Triage",
  backlog: "Backlog",
  unstarted: "Todo",
  started: "In Progress",
  completed: "Done",
  canceled: "Canceled",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

/** Urgent, high, medium, low; no-priority last (same rank as issue lists). */
const PRIORITY_RANK: Record<Priority, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 0: 4 };

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

const IssueRow = observer(function IssueRow({
  workspace,
  issue,
}: {
  workspace: string;
  issue: IssueData;
}) {
  const store = useStore();
  const state = store.get("WorkflowState", issue.stateId);
  const created = Date.parse(issue.createdAt);

  return (
    <Link
      className={styles.issueRow}
      href={`/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`}
    >
      <span className={styles.issueId}>{issue.identifier}</span>
      <span className={styles.issueStatus} aria-hidden="true">
        <StatusIcon
          category={state?.category ?? "backlog"}
          color={state?.color}
          size={14}
        />
      </span>
      <span className={styles.issueTitle}>{issue.title}</span>
      <span className={styles.issueDate}>
        {Number.isNaN(created) ? "" : DATE_FORMAT.format(created)}
      </span>
    </Link>
  );
});

/* ================================================================
 * Body (reads ?filter= and ?projectMilestoneId=)
 * ================================================================ */

interface IssueGroup {
  key: string;
  label: string;
  icon: React.ReactNode;
  issues: IssueData[];
}

const ProjectIssuesBody = observer(function ProjectIssuesBody({
  workspace,
  projectId,
  viewKey,
}: {
  workspace: string;
  projectId: string;
  viewKey: string;
}) {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { pref } = useViewPreference(viewKey);
  const { filters } = useFilters(viewKey);

  const project = store.get("Project", projectId);
  const milestoneScope = searchParams.get(MILESTONE_PARAM);
  const scopedMilestone =
    milestoneScope !== null && milestoneScope !== "none"
      ? store.get("Milestone", milestoneScope)
      : undefined;

  const clearScope = (): void => {
    const parts: string[] = [];
    searchParams.forEach((value, key) => {
      if (key !== MILESTONE_PARAM) parts.push(`${key}=${encodeURIComponent(value)}`);
    });
    const query = parts.join("&");
    router.replace(query === "" ? pathname : `${pathname}?${query}`, { scroll: false });
  };

  // §22: a triage arrival belongs to the team's inbox, not to the project's
  // issue list — even when it already carries a project.
  let issues = withoutTriageIssues(store.issuesForProject(projectId), store);
  if (milestoneScope !== null) {
    issues = issues.filter((issue) =>
      milestoneScope === "none"
        ? issue.milestoneId === undefined
        : issue.milestoneId === milestoneScope,
    );
  }
  issues = applyFilters(issues, filters, store);

  // ---- ordering ----
  const ordered = issues.slice();
  ordered.sort((a, b) => {
    switch (pref.ordering) {
      case "priority": {
        const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (byPriority !== 0) return byPriority;
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
      }
      case "title":
        return a.title.localeCompare(b.title);
      case "updated":
        return Date.parse(b.updatedAt) - Date.parse(a.updatedAt);
      default:
        return Date.parse(b.createdAt) - Date.parse(a.createdAt);
    }
  });

  // ---- grouping ----
  const team =
    project?.teamIds[0] !== undefined ? store.get("Team", project.teamIds[0]) : undefined;
  const states = team !== undefined ? store.statesForTeam(team.id) : [];

  let groups: IssueGroup[];
  if (pref.grouping === "assignee") {
    const buckets = new Map<string, IssueData[]>();
    for (const issue of ordered) {
      const key = issue.assigneeId ?? "unassigned";
      const list = buckets.get(key);
      if (list) list.push(issue);
      else buckets.set(key, [issue]);
    }
    groups = Array.from(buckets, ([key, list]) => {
      const user = key === "unassigned" ? undefined : store.get("User", key);
      return {
        key,
        label: user?.displayName ?? "Unassigned",
        icon:
          user !== undefined ? (
            <Avatar initials={user.initials} color={user.avatarColor} size={16} />
          ) : (
            <Icon name="MyIssues" size={14} />
          ),
        issues: list,
      };
    });
  } else if (pref.grouping === "priority") {
    groups = ([1, 2, 3, 4, 0] as Priority[])
      .map((priority) => ({
        key: String(priority),
        label: PRIORITY_LABEL[priority],
        icon: <PriorityIcon priority={priority} size={14} />,
        issues: ordered.filter((issue) => issue.priority === priority),
      }))
      .filter((group) => group.issues.length > 0 || pref.showEmptyGroups);
  } else if (pref.grouping === "status") {
    groups = CATEGORY_ORDER.filter((category) => category !== "triage").map((category) => ({
      key: category,
      label:
        states.find((state) => state.category === category)?.name ??
        CATEGORY_FALLBACK[category],
      icon: <StatusIcon category={category} size={14} />,
      issues: ordered.filter(
        (issue) => store.get("WorkflowState", issue.stateId)?.category === category,
      ),
    })).filter((group) => group.issues.length > 0 || pref.showEmptyGroups);
  } else {
    groups =
      ordered.length > 0
        ? [{ key: "all", label: "", icon: null, issues: ordered }]
        : [];
  }

  const grouped = pref.grouping !== "none";
  const narrowed =
    milestoneScope !== null || filters.some((filter) => filter.values.length > 0);

  return (
    <>
      {milestoneScope !== null ? (
        <div className={styles.scopeBar}>
          <span className={styles.scopeChip}>
            <Icon name="MilestoneNone" size={14} />
            {scopedMilestone?.name ?? "No milestone"}
            <button
              type="button"
              className={styles.scopeClear}
              aria-label="Clear milestone filter"
              onClick={clearScope}
            >
              <svg width={10} height={10} viewBox="0 0 12 12" aria-hidden="true">
                <path d="M2.71 2.71a.7.7 0 0 1 .99 0L6 5.01l2.3-2.3a.7.7 0 1 1 .99.99L6.99 6l2.3 2.3a.7.7 0 1 1-.99.99L6 6.99l-2.3 2.3a.7.7 0 0 1-.99-.99L5.01 6l-2.3-2.3a.7.7 0 0 1 0-.99Z" fill="currentColor" />
              </svg>
            </button>
          </span>
        </div>
      ) : null}

      <FilterBar viewKey={viewKey} />

      <div className={styles.issuesScroller} tabIndex={0} data-scroll-container="true">
        {groups.length === 0 ? (
          <EmptyState heading={narrowed ? "No matching issues" : "No issues in this project"}>
            {narrowed
              ? "No issues in this project match the current scope. Widen a filter or clear the chips above."
              : `Issues added to ${project?.name ?? "this project"} will show up here, grouped by status.`}
          </EmptyState>
        ) : (
          groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              {grouped ? (
                <GroupHeader
                  icon={group.icon}
                  label={group.label}
                  count={group.issues.length}
                />
              ) : null}
              {group.issues.map((issue) => (
                <IssueRow key={issue.id} workspace={workspace} issue={issue} />
              ))}
            </section>
          ))
        )}
      </div>
    </>
  );
});

/* ================================================================
 * View
 * ================================================================ */

export const ProjectIssuesView = observer(function ProjectIssuesView({
  workspace,
  slug,
}: {
  workspace: string;
  slug: string;
}) {
  const client = useSyncClient();
  const store = useStore();

  const project = store.projectBySlug(slug);
  const base = `/${workspace}/project/${slug}`;
  const booting = project === undefined && client.status === "booting";
  const viewKey = `project/${slug}/issues`;

  const breadcrumb = (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      <Link className={styles.crumb} href={`/${workspace}/projects/all`}>
        Projects
      </Link>
      <span className={styles.crumbSep} aria-hidden="true">
        ›
      </span>
      {project !== undefined ? (
        <Link className={styles.crumb} href={`${base}/overview`} title={project.name}>
          <span className={styles.crumbProjectIcon} data-type="emoji" aria-hidden="true">
            {isEmojiIcon(project.icon) ? project.icon : projectIconFor(project)}
          </span>
          {project.name}
        </Link>
      ) : (
        <span
          className={`${styles.skeleton} ${styles.crumbSkeleton}`}
          aria-hidden="true"
        />
      )}
      <span className={styles.crumbSep} aria-hidden="true">
        ›
      </span>
      <span className={styles.crumbCurrent}>Issues</span>
    </nav>
  );

  const tabsRow =
    project !== undefined ? (
      <>
        <div className={shellStyles.tabStrip}>
          <Link className={shellStyles.tab} href={`${base}/overview`}>
            Overview
          </Link>
          <Link className={shellStyles.tab} href={`${base}/activity`}>
            Activity
          </Link>
          <Link className={shellStyles.tab} href={`${base}/issues`} data-active="true">
            Issues
          </Link>
        </div>
        <span className={shellStyles.headerSpacer} />
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
      </>
    ) : undefined;

  if (project === undefined) {
    return (
      <>
        <Header left={breadcrumb} />
        {booting ? null : (
          <div className={styles.notFound}>
            <div className={styles.notFoundTitle}>Project not found</div>
            <div className={styles.notFoundBody}>
              This project doesn&rsquo;t exist or was deleted.
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <>
      <Header left={breadcrumb} tabs={tabsRow} />
      <Suspense fallback={null}>
        <ProjectIssuesBody
          workspace={workspace}
          projectId={project.id}
          viewKey={viewKey}
        />
      </Suspense>
    </>
  );
});
