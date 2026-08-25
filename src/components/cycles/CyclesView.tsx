"use client";

/**
 * Team Cycles page body (`/team/:KEY/cycles`) — MASTER_PROMPT.md §22,
 * research-views-projects.md §4. Chrome mirrors the team issues page
 * (breadcrumb "Team › Cycles" + star). The active cycle renders as a card
 * with the scope/progress graph; other cycles list as rows under Upcoming /
 * Past section headers. Row click → `/team/:KEY/cycle/:number`.
 */

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type { CycleData, TeamData, WorkflowStateData } from "@/lib/data/types";
import {
  activeCycle,
  cycleName,
  cyclePhase,
  cycleStats,
  daysLeftLabel,
  formatCycleRange,
  issueCountLabel,
  trailingCapacity,
  type CyclePhase,
} from "@/lib/cycles/cycles";
import { Header } from "@/components/shell/Header";
import { Icon } from "@/components/icons/Icon";
import { IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { GroupHeader } from "@/components/ui/GroupHeader";
import { ListRow } from "@/components/ui/ListRow";
import { CycleGraph } from "@/components/cycles/CycleGraph";
import type { SyncStore } from "@/lib/data/store";
import listStyles from "@/components/issues/issuelist.module.css";
import styles from "./cycles.module.css";

const PHASE_LABEL: Record<CyclePhase, string> = {
  upcoming: "Upcoming",
  active: "Active",
  cooldown: "Cooldown",
  past: "Past",
};

function cycleUrl(workspace: string, teamKey: string, cycle: CycleData): string {
  return `/${workspace}/team/${teamKey}/cycle/${cycle.number}`;
}

/** Per-cycle stats straight from the pool (observer keeps them live). */
function statsFor(store: SyncStore, team: TeamData, cycle: CycleData) {
  const stateById = new Map<string, WorkflowStateData>(
    store.statesForTeam(team.id).map((state) => [state.id, state]),
  );
  return cycleStats(store.issuesForCycle(cycle.id), stateById);
}

const CycleRow = observer(function CycleRow({
  cycle,
  workspace,
  teamKey,
  team,
}: {
  cycle: CycleData;
  workspace: string;
  teamKey: string;
  team: TeamData;
}) {
  const store = useStore();
  const stats = statsFor(store, team, cycle);
  const percent =
    stats.total === 0 ? 0 : Math.round((stats.completed / stats.total) * 100);

  return (
    <ListRow href={cycleUrl(workspace, teamKey, cycle)} height={44} listKey={cycle.id}>
      <div className={styles.rowGrid}>
        <span className={styles.rowIcon}>
          <Icon name="Cycle" size={16} />
        </span>
        <span className={styles.rowName}>{cycleName(cycle)}</span>
        <span className={styles.rowRange}>{formatCycleRange(cycle)}</span>
        <span className={styles.rowCount}>{issueCountLabel(stats)}</span>
        <span className={styles.rowPercent}>{percent}%</span>
      </div>
    </ListRow>
  );
});

const ActiveCycleCard = observer(function ActiveCycleCard({
  cycle,
  workspace,
  teamKey,
  team,
  now,
}: {
  cycle: CycleData;
  workspace: string;
  teamKey: string;
  team: TeamData;
  now: number;
}) {
  const store = useStore();
  const stateById = new Map<string, WorkflowStateData>(
    store.statesForTeam(team.id).map((state) => [state.id, state]),
  );
  const issues = store.issuesForCycle(cycle.id);
  const stats = cycleStats(issues, stateById);
  const phase = cyclePhase(cycle, now);

  // §22 capacity from trailing velocity: completed counts of past cycles.
  const pastCompleted = store
    .cyclesForTeam(team.id)
    .filter((c) => cyclePhase(c, now) === "past" && c.number < cycle.number)
    .map((c) => statsFor(store, team, c).completed);
  const capacity = trailingCapacity(pastCompleted);

  return (
    <section
      className={styles.activeCard}
      aria-label={`${cycleName(cycle)} (active)`}
    >
      <div className={styles.cardTitleRow}>
        <Link
          className={styles.cardTitle}
          href={cycleUrl(workspace, teamKey, cycle)}
        >
          {cycleName(cycle)}
        </Link>
        <span className={styles.phaseBadge} data-phase={phase}>
          {PHASE_LABEL[phase]}
        </span>
        <span className={styles.cardSpacer} />
        <span className={styles.cardRange}>{formatCycleRange(cycle)}</span>
        <span className={styles.cardDaysLeft}>{daysLeftLabel(cycle, now)}</span>
      </div>
      <div className={styles.capacityLine}>
        {issueCountLabel(stats)}
        {capacity > 0 ? ` · capacity ~${capacity}` : ""}
      </div>
      <CycleGraph
        cycle={cycle}
        issues={issues}
        stateById={stateById}
        now={now}
      />
    </section>
  );
});

export const CyclesView = observer(function CyclesView({
  workspace,
  teamKey,
}: {
  workspace: string;
  teamKey: string;
}) {
  const store = useStore();
  const client = useSyncClient();
  const team = store.teamByKey(teamKey);
  const notFound = team === undefined && client.status === "ready";
  const now = Date.now();

  const cycles = team !== undefined ? store.cyclesForTeam(team.id) : [];
  const active = activeCycle(cycles, now);
  const upcoming = cycles.filter((cycle) => cyclePhase(cycle, now) === "upcoming");
  const past = cycles
    .filter((cycle) => cyclePhase(cycle, now) === "past" && cycle !== active)
    .slice()
    .reverse(); // most recent past cycle first

  const breadcrumb = (
    <div className={listStyles.crumbs}>
      {team !== undefined ? (
        <span className={listStyles.crumbTeam}>{team.name}</span>
      ) : (
        <span className={listStyles.crumbSkeleton} aria-hidden="true" />
      )}
      <span className={listStyles.crumbSep}>›</span>
      <span className={listStyles.crumbCurrent}>Cycles</span>
      <IconButton label="Add to favorites" size={28}>
        <Icon name="Favorite" size={14} />
      </IconButton>
    </div>
  );

  let body: React.ReactNode = null;
  if (team === undefined) {
    body = notFound ? (
      <div className={styles.emptyFill}>
        <EmptyState heading="Team not found">
          No team with the key “{teamKey.toUpperCase()}” exists in this
          workspace.
        </EmptyState>
      </div>
    ) : null;
  } else if (!team.cyclesEnabled) {
    body = (
      <div className={styles.emptyFill}>
        <EmptyState
          illustration={<Icon name="Cycle" size={40} />}
          heading="Cycles are not enabled"
        >
          Cycles give {team.name} a repeating time box for planning work.
          Enable them in the team settings to start Cycle 1.
        </EmptyState>
      </div>
    );
  } else if (cycles.length === 0) {
    body = (
      <div className={styles.emptyFill}>
        <EmptyState
          illustration={<Icon name="Cycle" size={40} />}
          heading="No cycles yet"
        >
          Cycles are enabled for {team.name}, but none are scheduled. Upcoming
          cycles appear here as soon as they are created.
        </EmptyState>
      </div>
    );
  } else {
    body = (
      <div
        className={styles.scroller}
        tabIndex={0}
        data-scroll-container="true"
      >
        <div className={styles.column}>
          {active !== undefined && (
            <ActiveCycleCard
              cycle={active}
              workspace={workspace}
              teamKey={teamKey}
              team={team}
              now={now}
            />
          )}
          {upcoming.length > 0 && (
            <section className={styles.section} aria-label="Upcoming cycles">
              <GroupHeader
                icon={<Icon name="Cycle" size={14} />}
                label="Upcoming"
                count={upcoming.length}
              />
              {upcoming.map((cycle) => (
                <CycleRow
                  key={cycle.id}
                  cycle={cycle}
                  workspace={workspace}
                  teamKey={teamKey}
                  team={team}
                />
              ))}
            </section>
          )}
          {past.length > 0 && (
            <section className={styles.section} aria-label="Past cycles">
              <GroupHeader
                icon={<Icon name="Cycle" size={14} />}
                label="Past"
                count={past.length}
              />
              {past.map((cycle) => (
                <CycleRow
                  key={cycle.id}
                  cycle={cycle}
                  workspace={workspace}
                  teamKey={teamKey}
                  team={team}
                />
              ))}
            </section>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <Header left={breadcrumb} />
      <div className={styles.page}>{body}</div>
    </>
  );
});
