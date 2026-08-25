"use client";

/**
 * Sub-issues section — the captured "Add sub-issues" bar
 * (capture-trendzo-37-research-work.md §5, video-timeline-1 finding 9) made
 * real, plus the child list it heads once children exist.
 *
 * · The button opens the create modal pre-filled with `parentId`, so a child
 *   is created through exactly the same path as any other issue (§14).
 * · With children present the bar becomes a header: "Sub-issues" + the
 *   captured progress read-out "N of M done" + a progress bar, then one row
 *   per child. Each row's status glyph is a real StatusPicker anchor, so a
 *   child can be moved along without leaving the parent (§6.3).
 */

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useStore } from "@/lib/data/DataProvider";
import type { IssueData } from "@/lib/data/types";
import { openCreateIssue } from "@/components/issues/CreateIssueModal";
import { StatusPicker } from "@/components/issues/pickers/StatusPicker";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import styles from "./detail.module.css";

/** "Research Work" → "research-work" (issue route: /issue/[id]/[slug]). */
function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

const SubIssueRow = observer(function SubIssueRow({
  issue,
  workspace,
}: {
  issue: IssueData;
  workspace: string;
}) {
  const store = useStore();
  const state = store.get("WorkflowState", issue.stateId);
  const assignee =
    issue.assigneeId !== undefined ? store.get("User", issue.assigneeId) : undefined;

  return (
    <div className={styles.subIssueRow}>
      <StatusPicker
        teamId={issue.teamId}
        issueIds={[issue.id]}
        trigger={
          <button
            type="button"
            className={styles.subIssueStatus}
            aria-label={`Change status of ${issue.identifier}: ${state?.name ?? "Unknown"}`}
          >
            <StatusIcon
              category={state?.category ?? "backlog"}
              color={state?.color}
              size={14}
            />
          </button>
        }
      />
      <span className={styles.subIssueId}>{issue.identifier}</span>
      <Link
        className={styles.subIssueTitle}
        href={`/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`}
      >
        {issue.title}
      </Link>
      <span className={styles.subIssueAssignee}>
        {assignee !== undefined ? (
          <Avatar
            initials={assignee.initials}
            color={assignee.avatarColor}
            size={18}
            src={assignee.avatarUrl}
          />
        ) : null}
      </span>
    </div>
  );
});

export const SubIssues = observer(function SubIssues({
  issue,
  workspace,
}: {
  issue: IssueData;
  workspace: string;
}) {
  const store = useStore();

  const children = store
    .all("Issue")
    .filter((child) => child.parentId === issue.id && !child.archivedAt)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const done = children.filter((child) => {
    const category = store.get("WorkflowState", child.stateId)?.category;
    return category === "completed" || category === "canceled";
  }).length;

  const addSubIssue = (): void => {
    openCreateIssue({ teamId: issue.teamId, parentId: issue.id });
  };

  if (children.length === 0) {
    return (
      <div className={styles.subIssuesBar}>
        <button
          type="button"
          className={styles.addSubIssues}
          aria-label="Create new sub-issue"
          onClick={addSubIssue}
        >
          <Icon name="Plus" size={14} />
          Add sub-issues
        </button>
      </div>
    );
  }

  const percent = Math.round((done / children.length) * 100);

  return (
    <section className={styles.subIssues} aria-label="Sub-issues">
      <div className={styles.subIssuesHeader}>
        <span className={styles.subIssuesTitle}>Sub-issues</span>
        <span className={styles.subIssuesProgress}>
          <span
            className={styles.subIssuesTrack}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={children.length}
            aria-valuenow={done}
            aria-label={`${done} of ${children.length} done`}
          >
            <span
              className={styles.subIssuesFill}
              style={{ width: `${percent}%` }}
            />
          </span>
          {done} of {children.length} done
        </span>
        <span className={styles.activitySpacer} />
        <button
          type="button"
          className={styles.addSubIssues}
          aria-label="Create new sub-issue"
          onClick={addSubIssue}
        >
          <Icon name="Plus" size={14} />
          Add sub-issue
        </button>
      </div>
      <div className={styles.subIssueList}>
        {children.map((child) => (
          <SubIssueRow key={child.id} issue={child} workspace={workspace} />
        ))}
      </div>
    </section>
  );
});
