"use client";

/**
 * Cycle detail (`/team/:KEY/cycle/:number`) — MASTER_PROMPT.md §22:
 * header + the scope/progress graph large + the cycle's issues grouped by
 * workflow state + a real "Move unfinished to next cycle" rollover action
 * (updates `cycleId` on every not-completed/canceled issue, with a toast).
 */

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type { CycleData, IssueData, WorkflowStateData } from "@/lib/data/types";
import {
  cycleName,
  cyclePhase,
  cycleStats,
  daysLeftLabel,
  formatCycleRange,
  issueCountLabel,
  type CyclePhase,
} from "@/lib/cycles/cycles";
import { Header } from "@/components/shell/Header";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GroupHeader } from "@/components/ui/GroupHeader";
import { ListRow } from "@/components/ui/ListRow";
import { CycleGraph } from "@/components/cycles/CycleGraph";
import { showToast } from "@/lib/toast";
import listStyles from "@/components/issues/issuelist.module.css";
import styles from "./cycles.module.css";

const PHASE_LABEL: Record<CyclePhase, string> = {
  upcoming: "Upcoming",
  active: "Active",
  cooldown: "Cooldown",
  past: "Past",
};

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

function issueUrl(workspace: string, issue: IssueData): string {
  return `/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`;
}

const CycleIssueRow = observer(function CycleIssueRow({
  issue,
  state,
  workspace,
  firstInGroup,
  lastInGroup,
}: {
  issue: IssueData;
  state: WorkflowStateData | undefined;
  workspace: string;
  firstInGroup: boolean;
  lastInGroup: boolean;
}) {
  const store = useStore();
  const assignee =
    issue.assigneeId !== undefined ? store.get("User", issue.assigneeId) : undefined;
  const created = Date.parse(issue.createdAt);

  return (
    <ListRow
      href={issueUrl(workspace, issue)}
      height={44}
      listKey={issue.id}
      firstInGroup={firstInGroup}
      lastInGroup={lastInGroup}
    >
      <div className={styles.issueRowGrid}>
        <span className={styles.issueId}>{issue.identifier}</span>
        <span className={styles.issueStatus}>
          <StatusIcon
            category={state?.category ?? "backlog"}
            color={state?.color}
          />
        </span>
        <span className={styles.issueTitle}>{issue.title}</span>
        <span aria-hidden="true" />
        <span className={styles.issueAssignee}>
          {assignee !== undefined ? (
            <Avatar
              initials={assignee.initials}
              color={assignee.avatarColor}
              size={18}
              src={assignee.avatarUrl}
            />
          ) : (
            <Icon name="PersonDashed" size={18} color="currentColor" />
          )}
        </span>
        <span className={styles.issueDate}>
          {Number.isNaN(created) ? "" : DATE_FORMAT.format(created)}
        </span>
      </div>
    </ListRow>
  );
});

export const CycleDetailView = observer(function CycleDetailView({
  workspace,
  teamKey,
  cycleNumber,
}: {
  workspace: string;
  teamKey: string;
  cycleNumber: number;
}) {
  const store = useStore();
  const client = useSyncClient();
  const team = store.teamByKey(teamKey);
  const ready = client.status === "ready";
  const now = Date.now();

  const cycles = team !== undefined ? store.cyclesForTeam(team.id) : [];
  const cycle = cycles.find((c) => c.number === cycleNumber);
  const nextCycle: CycleData | undefined = cycles.find(
    (c) => c.number > cycleNumber,
  );

  const states = team !== undefined ? store.statesForTeam(team.id) : [];
  const stateById = new Map<string, WorkflowStateData>(
    states.map((state) => [state.id, state]),
  );
  const issues = cycle !== undefined ? store.issuesForCycle(cycle.id) : [];
  const stats = cycleStats(issues, stateById);

  /** §22 rollover: unfinished (not completed/canceled) issues move on. */
  const moveUnfinished = (): void => {
    if (cycle === undefined || nextCycle === undefined) return;
    const unfinished = issues.filter((issue) => {
      const category = stateById.get(issue.stateId)?.category;
      return category !== "completed" && category !== "canceled";
    });
    if (unfinished.length === 0) {
      showToast("No unfinished issues to move");
      return;
    }
    for (const issue of unfinished) {
      client.mutate.updateIssue(issue.id, { cycleId: nextCycle.id });
    }
    showToast(
      `Moved ${unfinished.length} ${unfinished.length === 1 ? "issue" : "issues"} to ${cycleName(nextCycle)}`,
    );
  };

  const breadcrumb = (
    <div className={listStyles.crumbs}>
      {team !== undefined ? (
        <span className={listStyles.crumbTeam}>{team.name}</span>
      ) : (
        <span className={listStyles.crumbSkeleton} aria-hidden="true" />
      )}
      <span className={listStyles.crumbSep}>›</span>
      <Link
        className={listStyles.crumbTeam}
        href={`/${workspace}/team/${teamKey}/cycles`}
      >
        Cycles
      </Link>
      <span className={listStyles.crumbSep}>›</span>
      <span className={listStyles.crumbCurrent}>
        {cycle !== undefined ? cycleName(cycle) : `Cycle ${cycleNumber}`}
      </span>
      <IconButton label="Add to favorites" size={28}>
        <Icon name="Favorite" size={14} />
      </IconButton>
    </div>
  );

  let body: React.ReactNode = null;
  if (team === undefined || cycle === undefined) {
    body = ready ? (
      <div className={styles.emptyFill}>
        <EmptyState heading="Cycle not found">
          {team === undefined
            ? `No team with the key “${teamKey.toUpperCase()}” exists in this workspace.`
            : `${team.name} has no cycle ${cycleNumber}.`}
        </EmptyState>
      </div>
    ) : null;
  } else {
    const phase = cyclePhase(cycle, now);

    // Group the cycle's issues by workflow state, in category order.
    const byState = new Map<string, IssueData[]>();
    for (const issue of issues) {
      const list = byState.get(issue.stateId);
      if (list) list.push(issue);
      else byState.set(issue.stateId, [issue]);
    }
    const groups = states
      .map((state) => ({ state, issues: byState.get(state.id) ?? [] }))
      .filter((group) => group.issues.length > 0);

    body = (
      <div
        className={styles.scroller}
        tabIndex={0}
        data-scroll-container="true"
      >
        <div className={styles.column}>
          <div className={styles.detailHero}>
            <div className={styles.detailTitleRow}>
              <h1 className={styles.detailTitle}>{cycleName(cycle)}</h1>
              <span className={styles.phaseBadge} data-phase={phase}>
                {PHASE_LABEL[phase]}
              </span>
            </div>
            <div className={styles.detailMeta}>
              <span>{formatCycleRange(cycle)}</span>
              {phase === "active" && (
                <>
                  <span className={styles.metaDot} aria-hidden="true">
                    ·
                  </span>
                  <span className={styles.metaStrong}>
                    {daysLeftLabel(cycle, now)}
                  </span>
                </>
              )}
              <span className={styles.metaDot} aria-hidden="true">
                ·
              </span>
              <span>{issueCountLabel(stats)}</span>
            </div>
          </div>

          <CycleGraph
            cycle={cycle}
            issues={issues}
            stateById={stateById}
            now={now}
            height={220}
          />

          <section className={styles.issuesSection} aria-label="Cycle issues">
            {groups.length === 0 ? (
              <EmptyState
                illustration={<Icon name="Cycle" size={40} />}
                heading="No issues in this cycle"
              >
                Issues planned into {cycleName(cycle)} will show up here. Set
                an issue&apos;s Cycle property to add it.
              </EmptyState>
            ) : (
              groups.map((group) => (
                <div key={group.state.id}>
                  <GroupHeader
                    icon={
                      <StatusIcon
                        category={group.state.category}
                        color={group.state.color}
                      />
                    }
                    label={group.state.name}
                    count={group.issues.length}
                  />
                  {group.issues.map((issue, index) => (
                    <CycleIssueRow
                      key={issue.id}
                      issue={issue}
                      state={group.state}
                      workspace={workspace}
                      firstInGroup={index === 0}
                      lastInGroup={index === group.issues.length - 1}
                    />
                  ))}
                </div>
              ))
            )}
          </section>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header
        left={breadcrumb}
        right={
          cycle !== undefined ? (
            <Button
              variant="secondary"
              size={28}
              disabled={nextCycle === undefined}
              title={
                nextCycle === undefined
                  ? "No next cycle to move issues into"
                  : `Move unfinished issues to ${cycleName(nextCycle)}`
              }
              onClick={moveUnfinished}
            >
              Move unfinished to next cycle
            </Button>
          ) : undefined
        }
      />
      <div className={styles.page}>{body}</div>
    </>
  );
});
