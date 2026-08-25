/**
 * Cycle domain helpers — MASTER_PROMPT.md §22 (DOCUMENTED),
 * docs/analysis/research-views-projects.md §4.
 *
 * Pure functions over the wire shapes in types.ts: lifecycle classification
 * (upcoming / active / cooldown / past), display formatting ("Cycle 2",
 * "Aug 24 – Sep 7", days-left) and the scope/progress series the original
 * SVG graph draws. No MobX, no browser APIs — usable from any component and
 * trivially testable.
 */

import type {
  CycleData,
  IssueData,
  StateCategory,
  UUID,
  WorkflowStateData,
} from "@/lib/data/types";

export const DAY_MS = 24 * 60 * 60 * 1000;

export type CyclePhase = "upcoming" | "active" | "cooldown" | "past";

/** "Cycle {number}" unless the team renamed it (§22 sequential numbering). */
export function cycleName(cycle: CycleData): string {
  return cycle.name !== undefined && cycle.name !== ""
    ? cycle.name
    : `Cycle ${cycle.number}`;
}

/**
 * Lifecycle at `now`: active while startsAt ≤ now < endsAt; a cycle with a
 * cooldown window stays "cooldown" until cooldownEndsAt, then is past.
 */
export function cyclePhase(cycle: CycleData, now: number): CyclePhase {
  const starts = Date.parse(cycle.startsAt);
  const ends = Date.parse(cycle.endsAt);
  if (now < starts) return "upcoming";
  if (now < ends) return "active";
  const cooldownEnds =
    cycle.cooldownEndsAt !== undefined ? Date.parse(cycle.cooldownEndsAt) : ends;
  return now < cooldownEnds ? "cooldown" : "past";
}

/** The single active (or cooldown) cycle of a team, if any. */
export function activeCycle(
  cycles: CycleData[],
  now: number,
): CycleData | undefined {
  return cycles.find((cycle) => {
    const phase = cyclePhase(cycle, now);
    return phase === "active" || phase === "cooldown";
  });
}

const RANGE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/** "Aug 24 – Sep 7" (en-dash range, list-row + card subline). */
export function formatCycleRange(cycle: CycleData): string {
  const starts = Date.parse(cycle.startsAt);
  const ends = Date.parse(cycle.endsAt);
  if (Number.isNaN(starts) || Number.isNaN(ends)) return "";
  return `${RANGE_FORMAT.format(starts)} – ${RANGE_FORMAT.format(ends)}`;
}

/** Whole days until the cycle ends (0 on its last day). */
export function daysLeft(cycle: CycleData, now: number): number {
  const ends = Date.parse(cycle.endsAt);
  return Math.max(0, Math.ceil((ends - now) / DAY_MS));
}

/** "13 days left" / "1 day left" / "Ends today". */
export function daysLeftLabel(cycle: CycleData, now: number): string {
  const left = daysLeft(cycle, now);
  if (left === 0) return "Ends today";
  return left === 1 ? "1 day left" : `${left} days left`;
}

// ---------- issue classification ----------

const DONE_CATEGORIES: ReadonlySet<StateCategory> = new Set<StateCategory>([
  "completed",
]);
const CLOSED_CATEGORIES: ReadonlySet<StateCategory> = new Set<StateCategory>([
  "completed",
  "canceled",
]);

export interface CycleStats {
  total: number;
  completed: number;
  /** Neither completed nor canceled — what "Move unfinished" would move. */
  unfinished: number;
}

/** Count a cycle's issues by workflow-state category. */
export function cycleStats(
  issues: IssueData[],
  stateById: ReadonlyMap<UUID, WorkflowStateData>,
): CycleStats {
  let completed = 0;
  let unfinished = 0;
  for (const issue of issues) {
    const category = stateById.get(issue.stateId)?.category;
    if (category !== undefined && DONE_CATEGORIES.has(category)) completed += 1;
    else if (category === undefined || !CLOSED_CATEGORIES.has(category)) {
      unfinished += 1;
    }
  }
  return { total: issues.length, completed, unfinished };
}

/** "6 issues · 2 done" (capacity line on cards and list rows). */
export function issueCountLabel(stats: CycleStats): string {
  const noun = stats.total === 1 ? "issue" : "issues";
  return `${stats.total} ${noun} · ${stats.completed} done`;
}

/**
 * §22 capacity: the trailing velocity — average completed count of up to the
 * three most recent past cycles (0 when there is no history yet).
 */
export function trailingCapacity(completedCounts: number[]): number {
  const trailing = completedCounts.slice(-3);
  if (trailing.length === 0) return 0;
  const sum = trailing.reduce((acc, count) => acc + count, 0);
  return Math.round(sum / trailing.length);
}

// ---------- scope / progress graph series ----------

export interface CycleGraphData {
  /** Total day count of the cycle (x axis spans 0..days). */
  days: number;
  /**
   * Per-day cumulative series, index 0 = cycle start. Both stop at `now`
   * (nothing is projected into the future), so their length is ≤ days + 1.
   */
  scope: number[];
  completed: number[];
  /** Fractional day position of `now`, or null when now is outside the cycle. */
  todayX: number | null;
  /** Headroom for the y scale (≥ 1 so an empty cycle still draws a baseline). */
  maxY: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Build the graph series from the store's rows: scope = cumulative issues
 * added (by createdAt, clamped into the cycle window — §22 "computed from
 * the store's issue createdAt/state"), completed = cumulative issues whose
 * state category is completed (timed by updatedAt, clamped likewise).
 */
export function buildCycleGraph(
  cycle: CycleData,
  issues: IssueData[],
  stateById: ReadonlyMap<UUID, WorkflowStateData>,
  now: number,
): CycleGraphData {
  const starts = Date.parse(cycle.startsAt);
  const ends = Date.parse(cycle.endsAt);
  const days = Math.max(1, Math.round((ends - starts) / DAY_MS));

  // Series stop at now — for a live cycle the lines end at the today marker.
  const lastDay =
    now >= ends ? days : Math.max(0, Math.floor((now - starts) / DAY_MS));

  const addedAt = issues.map((issue) =>
    clamp(Date.parse(issue.createdAt), starts, ends),
  );
  const completedAt = issues.map((issue) => {
    const category = stateById.get(issue.stateId)?.category;
    if (category !== "completed") return null;
    return clamp(Date.parse(issue.updatedAt), starts, ends);
  });

  const scope: number[] = [];
  const completed: number[] = [];
  for (let i = 0; i <= lastDay; i += 1) {
    const t = starts + i * DAY_MS;
    scope.push(addedAt.filter((at) => at <= t).length);
    completed.push(
      completedAt.filter((at): at is number => at !== null && at <= t).length,
    );
  }

  const todayX =
    now >= starts && now <= ends ? clamp((now - starts) / DAY_MS, 0, days) : null;
  const maxY = Math.max(1, ...scope);
  return { days, scope, completed, todayX, maxY };
}
