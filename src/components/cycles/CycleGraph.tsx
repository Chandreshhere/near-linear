"use client";

/**
 * Original scope/progress SVG chart for a cycle — MASTER_PROMPT.md §22
 * ("cycle page with scope/effort graph"). No chart library: two cumulative
 * step series (scope = issues added by createdAt, completed = issues whose
 * state category is completed) computed in src/lib/cycles/cycles.ts from the
 * store's rows, drawn as token-colored paths.
 *
 * The SVG stretches with `preserveAspectRatio="none"`;
 * `vector-effect: non-scaling-stroke` keeps line weights honest under the
 * non-uniform scale. The dashed "today" marker and the axis date labels are
 * HTML siblings so dashes and type never distort.
 */

import { observer } from "mobx-react-lite";
import type { CycleData, IssueData, UUID, WorkflowStateData } from "@/lib/data/types";
import {
  buildCycleGraph,
  cycleName,
  cycleStats,
  type CycleGraphData,
} from "@/lib/cycles/cycles";
import styles from "./cycles.module.css";

/** Internal drawing space (viewBox units — stretched to the container). */
const PLOT_W = 100;
const PLOT_H = 100;
/** Vertical padding inside the plot so peaks never kiss the edges. */
const PAD_TOP = 8;

const AXIS_DATE = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

function xAt(day: number, days: number): number {
  return (day / days) * PLOT_W;
}

function yAt(value: number, maxY: number): number {
  return PLOT_H - (value / maxY) * (PLOT_H - PAD_TOP);
}

/**
 * Step-after path through per-day cumulative samples, extended horizontally
 * to `endX` (the today marker for live cycles, the right edge for past ones).
 */
function stepPath(values: number[], graph: CycleGraphData, endX: number): string {
  if (values.length === 0) return "";
  const parts: string[] = [
    `M0 ${yAt(values[0], graph.maxY).toFixed(2)}`,
  ];
  for (let i = 1; i < values.length; i += 1) {
    parts.push(
      `H${xAt(i, graph.days).toFixed(2)} V${yAt(values[i], graph.maxY).toFixed(2)}`,
    );
  }
  parts.push(`H${endX.toFixed(2)}`);
  return parts.join(" ");
}

/** The step path closed down to the baseline (the completed area fill). */
function stepArea(values: number[], graph: CycleGraphData, endX: number): string {
  const line = stepPath(values, graph, endX);
  if (line === "") return "";
  return `${line} V${PLOT_H} H0 Z`;
}

export const CycleGraph = observer(function CycleGraph({
  cycle,
  issues,
  stateById,
  now,
  height = 140,
}: {
  cycle: CycleData;
  issues: IssueData[];
  stateById: ReadonlyMap<UUID, WorkflowStateData>;
  now: number;
  height?: number;
}) {
  const graph = buildCycleGraph(cycle, issues, stateById, now);
  const stats = cycleStats(issues, stateById);

  const endX =
    graph.todayX !== null ? xAt(graph.todayX, graph.days) : PLOT_W;
  const todayLeft =
    graph.todayX !== null ? (graph.todayX / graph.days) * 100 : null;

  const label =
    `${cycleName(cycle)} progress: ${stats.total} ` +
    `${stats.total === 1 ? "issue" : "issues"} in scope, ` +
    `${stats.completed} completed`;

  return (
    <div className={styles.graph} role="img" aria-label={label}>
      <div className={styles.plotArea}>
        <svg
          className={styles.plot}
          style={{ height }}
          viewBox={`0 0 ${PLOT_W} ${PLOT_H}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <path
            className={styles.completedArea}
            d={stepArea(graph.completed, graph, endX)}
          />
          <path
            className={styles.completedLine}
            d={stepPath(graph.completed, graph, endX)}
          />
          <path
            className={styles.scopeLine}
            d={stepPath(graph.scope, graph, endX)}
          />
        </svg>
        {todayLeft !== null && (
          <>
            <span
              className={styles.todayMarker}
              style={{ left: `${todayLeft}%` }}
              aria-hidden="true"
            />
            <span
              className={styles.todayLabel}
              style={{ left: `${todayLeft}%` }}
              aria-hidden="true"
            >
              Today
            </span>
          </>
        )}
      </div>
      <div className={styles.axisRow}>
        <span>{AXIS_DATE.format(Date.parse(cycle.startsAt))}</span>
        <span className={styles.legend} aria-hidden="true">
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} />
            Scope
          </span>
          <span className={styles.legendItem}>
            <span className={styles.legendSwatch} data-series="completed" />
            Completed
          </span>
        </span>
        <span>{AXIS_DATE.format(Date.parse(cycle.endsAt))}</span>
      </div>
    </div>
  );
});
