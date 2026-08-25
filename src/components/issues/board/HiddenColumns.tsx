"use client";

/**
 * Hidden-columns rail — MASTER_PROMPT.md §15 (CAPTURED, video-timeline-2
 * finding 9): with "Show empty columns" off, empty statuses collapse into
 * this right-hand section — one row per status (icon + name + count) — and a
 * column hidden by hand through its ⋯ menu joins them (persisted on the view
 * preference as `hiddenColumnIds`, so it survives a reload).
 *
 * Each row is a droppable target so a card dragged onto it changes status
 * (the column then reappears with the dropped card), and each row carries a
 * hover-revealed "Show column" affordance that puts the column back: for a
 * hand-hidden column that drops its id from `hiddenColumnIds`; for one that
 * collapsed only because it is empty, it turns "Show empty columns" on.
 */

import { observer } from "mobx-react-lite";
import { useDroppable } from "@dnd-kit/core";
import { StatusIcon } from "@/components/icons/StatusIcon";
import type { WorkflowStateData } from "@/lib/data/types";
import type { BoardDndData } from "./Board";
import styles from "./board.module.css";

export interface HiddenColumnItem {
  state: WorkflowStateData;
  count: number;
  /** True when the column was hidden by hand rather than by being empty. */
  manual: boolean;
}

const HiddenColumnRow = observer(function HiddenColumnRow({
  state,
  count,
  manual,
  onShow,
}: HiddenColumnItem & { onShow: (stateId: string, manual: boolean) => void }) {
  const { setNodeRef, isOver } = useDroppable({
    id: `hidden:${state.id}`,
    data: { type: "hidden", stateId: state.id } satisfies BoardDndData,
  });

  return (
    <div
      ref={setNodeRef}
      className={styles.hiddenRow}
      data-drop-over={isOver ? "true" : undefined}
    >
      <span className={styles.hiddenRowIcon}>
        <StatusIcon category={state.category} color={state.color} size={14} />
      </span>
      <span className={styles.hiddenRowName}>{state.name}</span>
      <span className={styles.hiddenRowCount}>{count}</span>
      <button
        type="button"
        className={styles.hiddenRowShow}
        aria-label={`Show ${state.name} column`}
        onClick={() => onShow(state.id, manual)}
      >
        Show column
      </button>
    </div>
  );
});

export const HiddenColumns = observer(function HiddenColumns({
  items,
  onShow,
}: {
  items: HiddenColumnItem[];
  onShow: (stateId: string, manual: boolean) => void;
}) {
  if (items.length === 0) return null;

  return (
    <aside className={styles.hiddenRail} aria-label="Hidden columns">
      <div className={styles.hiddenTitle}>Hidden columns</div>
      {items.map(({ state, count, manual }) => (
        <HiddenColumnRow
          key={state.id}
          state={state}
          count={count}
          manual={manual}
          onShow={onShow}
        />
      ))}
    </aside>
  );
});
