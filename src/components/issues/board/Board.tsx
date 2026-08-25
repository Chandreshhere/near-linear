"use client";

/**
 * Board (kanban) view — MASTER_PROMPT.md §15 + §6.8; video-timeline-2
 * findings 9–13 (all CAPTURED).
 *
 * - Columns = store.statesForTeam(teamId) in workflow order. A column renders
 *   only when it has issues or the view preference shows empty groups; the
 *   rest collapse into the right-hand <HiddenColumns> rail (finding 9).
 * - DnD: PointerSensor with a 4px activation distance so a plain click still
 *   navigates the card link (finding 12); closestCorners collision.
 * - Drop on a different column / hidden row → optimistic
 *   client.mutate.updateIssue (stateId + top-of-column sortOrder, §6.8);
 *   drop over nothing/invalid → NO mutation — snap-back is automatic because
 *   nothing changed: no toast, no status change (finding 11);
 *   drop on a sibling card in the same column → sortOrder midpoint reorder.
 */

import { useEffect, useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { observer } from "mobx-react-lite";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type {
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  Over,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useSyncClient } from "@/lib/data/DataProvider";
import { useViewPreference } from "@/lib/issues/viewPrefs";
import { getSelectionStore } from "@/lib/issues/selection";
import { withoutTriageStates } from "@/lib/issues/triage";
import { useActivePeekSource } from "@/components/nav/Peek";
import { EmptyState } from "@/components/ui/EmptyState";
import type { UUID } from "@/lib/data/types";
import { BoardColumn } from "./Column";
import { BoardCardPreview } from "./Card";
import { HiddenColumns } from "./HiddenColumns";
import styles from "./board.module.css";

/**
 * Drag/drop payloads carried by every board draggable & droppable so
 * onDragOver/onDragEnd can resolve any `over` to a workflow state:
 * cards (sortable), column bodies and hidden-column rows.
 */
export type BoardDndData =
  | { type: "card"; issueId: UUID; stateId: UUID }
  | { type: "column"; stateId: UUID }
  | { type: "hidden"; stateId: UUID };

/** Sort order given to a card dropped into a column with no cards yet. */
const EMPTY_COLUMN_SORT_ORDER = 1000;

/** Resolve a dnd-kit `over` to its target column (+ card, when over one). */
function dropTarget(
  over: Over | null,
): { stateId: UUID; overIssueId?: UUID } | null {
  const data = over?.data.current as BoardDndData | undefined;
  if (data === undefined) return null;
  return data.type === "card"
    ? { stateId: data.stateId, overIssueId: data.issueId }
    : { stateId: data.stateId };
}

export const Board = observer(function Board({
  teamId,
  viewKey,
}: {
  teamId: string;
  viewKey: string;
}) {
  const client = useSyncClient();
  const store = client.store;
  const { pref, update } = useViewPreference(viewKey);

  const [activeId, setActiveId] = useState<UUID | null>(null);
  const [overStateId, setOverStateId] = useState<UUID | null>(null);
  /**
   * A drag that actually activated (moved past the 4px threshold) must not
   * navigate the card link on release. The browser still fires a click after
   * pointerup, so we arm this flag on drag start and swallow that click in
   * the capture phase; the next pointerdown (a fresh gesture) disarms it.
   */
  const suppressClickRef = useRef(false);

  // CAPTURED click-vs-drag threshold: plain clicks stay under 4px and
  // navigate; movement beyond it lifts the card (finding 12).
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  /*
   * "Show empty columns" is off by default, which on a board with NO issues at
   * all hid every column and left a blank pane. A board is its columns: with
   * nothing filed yet, show them all — each carries its own "Add issue to …"
   * affordance, which IS the empty state's primary action.
   */
  const boardHasIssues = store.issuesForTeam(teamId).length > 0;
  const showEmpty = pref.showEmptyGroups || !boardHasIssues;
  // Enabled display-property keys (§11.1) — cards render their chip row and
  // "Created …" footer from this list (§15: cards show enabled display props).
  const displayProperties = pref.displayProperties;

  // Two independent reasons a column leaves the board (§15): it was hidden by
  // hand through its ⋯ menu (persisted, survives reload and a layout toggle),
  // or it is empty while "Show empty columns" is off.
  const hiddenIds = new Set(pref.hiddenColumnIds ?? []);
  // §22: the Triage state is an inbox, not a board column — neither it nor
  // its issues belong here (and it must not turn up under "hidden columns").
  const columns = withoutTriageStates(store.statesForTeam(teamId)).map((state) => {
    const issues = store.issuesForState(state.id);
    const manual = hiddenIds.has(state.id);
    return {
      state,
      issues,
      manual,
      hidden: manual || (issues.length === 0 && !showEmpty),
    };
  });
  const visible = columns.filter((column) => !column.hidden);
  const hidden = columns.filter((column) => column.hidden);

  const hideColumn = (stateId: UUID): void => {
    if (hiddenIds.has(stateId)) return;
    update({ hiddenColumnIds: [...hiddenIds, stateId] });
  };

  const showColumn = (stateId: UUID, manual: boolean): void => {
    if (manual) {
      update({
        hiddenColumnIds: [...hiddenIds].filter((id) => id !== stateId),
      });
      return;
    }
    // Collapsed only because it is empty — the display option is what hides it.
    update({ showEmptyGroups: true });
  };

  // Peek (§15: "Space peeks a card"). The board shares the list's selection
  // store for this view, so the highlight survives a Cmd+B layout toggle.
  const selection = getSelectionStore(viewKey);
  const visibleIds = visible.flatMap(({ issues }) => issues.map((i) => i.id));
  const visibleKey = visibleIds.join(",");
  useEffect(() => {
    selection.setItems(visibleKey === "" ? [] : visibleKey.split(","));
  }, [selection, visibleKey]);
  useActivePeekSource(() => ({
    id: selection.highlightedId,
    move: (delta) => selection.moveHighlight(delta),
  }));

  /** Hover = highlight (§6.7), delegated off each card's data-card-id. */
  const handlePointerOver = (event: ReactPointerEvent<HTMLDivElement>): void => {
    const card = (event.target as HTMLElement).closest<HTMLElement>("[data-card-id]");
    selection.highlight(card?.dataset.cardId ?? null);
  };

  const activeIssue = activeId !== null ? store.get("Issue", activeId) : undefined;
  const activeState =
    activeIssue !== undefined
      ? store.get("WorkflowState", activeIssue.stateId)
      : undefined;

  const handleDragStart = (event: DragStartEvent): void => {
    suppressClickRef.current = true;
    setActiveId(String(event.active.id));
    setOverStateId(null);
  };

  const handleDragOver = (event: DragOverEvent): void => {
    setOverStateId(dropTarget(event.over)?.stateId ?? null);
  };

  const handleDragCancel = (): void => {
    setActiveId(null);
    setOverStateId(null);
  };

  const handleDragEnd = (event: DragEndEvent): void => {
    setActiveId(null);
    setOverStateId(null);

    const issue = store.get("Issue", String(event.active.id));
    const target = dropTarget(event.over);
    if (issue === undefined || target === null) {
      // Invalid drop → no mutation. The DragOverlay settles back to the
      // untouched origin card: no toast, no status change (finding 11).
      return;
    }

    if (target.stateId !== issue.stateId) {
      // Cross-column (visible column or hidden row) → optimistic status
      // change, card enters at the top of the column (§15).
      const columnIssues = store.issuesForState(target.stateId);
      client.mutate.updateIssue(issue.id, {
        stateId: target.stateId,
        sortOrder:
          columnIssues.length > 0
            ? columnIssues[0].sortOrder - 1
            : EMPTY_COLUMN_SORT_ORDER,
      });
      // §15: dropping onto a hidden row brings the column back with the card.
      if (hiddenIds.has(target.stateId)) showColumn(target.stateId, true);
      return;
    }

    // Same column: reorder only when dropped over a sibling card; the new
    // sortOrder is the midpoint between the would-be neighbors.
    if (target.overIssueId === undefined || target.overIssueId === issue.id) {
      return;
    }
    const columnIssues = store.issuesForState(issue.stateId);
    const oldIndex = columnIssues.findIndex((i) => i.id === issue.id);
    const newIndex = columnIssues.findIndex((i) => i.id === target.overIssueId);
    if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) return;

    const reordered = arrayMove(columnIssues, oldIndex, newIndex);
    const before = newIndex > 0 ? reordered[newIndex - 1] : undefined;
    const after =
      newIndex < reordered.length - 1 ? reordered[newIndex + 1] : undefined;
    const sortOrder =
      before !== undefined && after !== undefined
        ? (before.sortOrder + after.sortOrder) / 2
        : before !== undefined
          ? before.sortOrder + 1
          : after !== undefined
            ? after.sortOrder - 1
            : issue.sortOrder;
    client.mutate.updateIssue(issue.id, { sortOrder });
  };

  const handleClickCapture = (event: ReactMouseEvent<HTMLDivElement>): void => {
    if (suppressClickRef.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  };

  const handlePointerDownCapture = (): void => {
    suppressClickRef.current = false;
  };

  // A team with no workflow statuses has no board to draw. Every team created
  // through the app gets six, so this is the "someone deleted them all" case.
  if (columns.length === 0) {
    return (
      <div className={styles.boardEmpty}>
        <EmptyState heading="This team has no statuses">
          A board is made of the team&rsquo;s workflow statuses. Add some in
          Settings &rarr; Teams to start dragging work across it.
        </EmptyState>
      </div>
    );
  }

  return (
    <div
      className={styles.board}
      onClickCapture={handleClickCapture}
      onPointerDownCapture={handlePointerDownCapture}
      onPointerOver={handlePointerOver}
    >
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        {visible.map(({ state, issues }) => (
          <BoardColumn
            key={state.id}
            teamId={teamId}
            state={state}
            issues={issues}
            displayProperties={displayProperties}
            isDropTarget={activeId !== null && overStateId === state.id}
            selection={selection}
            onHide={() => hideColumn(state.id)}
          />
        ))}
        <HiddenColumns
          items={hidden.map(({ state, issues, manual }) => ({
            state,
            count: issues.length,
            manual,
          }))}
          onShow={showColumn}
        />
        <DragOverlay
          className={styles.overlay}
          // Post-drop settle ≈180ms (§15: 150–200ms); the same animation
          // snap-returns the copy to the origin card on an invalid drop.
          dropAnimation={{
            duration: 180,
            easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)", /* ease-out-quad */
          }}
        >
          {activeIssue !== undefined && activeState !== undefined ? (
            <BoardCardPreview
              issue={activeIssue}
              state={activeState}
              displayProperties={displayProperties}
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
});
