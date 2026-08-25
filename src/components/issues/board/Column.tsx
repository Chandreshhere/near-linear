"use client";

/**
 * One board column — MASTER_PROMPT.md §15 (CAPTURED).
 * Header: status icon + name + count + hover-revealed ⋯ / + controls.
 * Body: transparent vertical stack of cards (SortableContext), droppable as a
 * whole, with the hover-revealed full-width quick-add pill below the last
 * card (video-timeline-2 finding 10).
 */

import { observer } from "mobx-react-lite";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { openCreateIssue } from "@/components/issues/CreateIssueModal";
import { IconButton } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import type { IssueData, WorkflowStateData } from "@/lib/data/types";
import type { SelectionStore } from "@/lib/issues/selection";
import type { BoardDndData } from "./Board";
import { BoardCard } from "./Card";
import styles from "./board.module.css";

export const BoardColumn = observer(function BoardColumn({
  teamId,
  state,
  issues,
  displayProperties,
  isDropTarget,
  selection,
  onHide,
}: {
  teamId: string;
  state: WorkflowStateData;
  issues: IssueData[];
  /** Enabled display-property keys (§11.1) — passed through to each card. */
  displayProperties: readonly string[];
  isDropTarget: boolean;
  selection?: SelectionStore;
  /** Persisted per view via ViewPreference.hiddenColumnIds (§15). */
  onHide?: () => void;
}) {
  // The whole body is droppable so drops on empty column space land here;
  // drops on a card resolve through the card's own sortable data.
  const { setNodeRef } = useDroppable({
    id: `column:${state.id}`,
    data: { type: "column", stateId: state.id } satisfies BoardDndData,
  });

  const createInColumn = (): void => {
    openCreateIssue({ teamId, stateId: state.id });
  };

  return (
    <section className={styles.column} aria-label={state.name}>
      <header className={styles.columnHeader}>
        <span className={styles.columnIcon}>
          <StatusIcon category={state.category} color={state.color} size={14} />
        </span>
        <span className={styles.columnName}>{state.name}</span>
        <span className={styles.columnCount}>{issues.length}</span>
        <div className={styles.columnActions}>
          <Menu
            align="end"
            trigger={
              <IconButton
                label={`${state.name} options`}
                size={24}
                className={styles.columnAction}
              >
                <Icon name="More" size={14} />
              </IconButton>
            }
            items={[
              {
                label: "Hide column",
                disabled: onHide === undefined,
                onSelect: () => onHide?.(),
              },
              {
                label: `Create issue in ${state.name}`,
                onSelect: createInColumn,
              },
            ]}
          />
          <IconButton
            label={`Create issue in ${state.name}`}
            size={24}
            className={styles.columnAction}
            onClick={createInColumn}
          >
            <Icon name="Plus" size={14} />
          </IconButton>
        </div>
      </header>

      <div
        ref={setNodeRef}
        className={styles.columnBody}
        data-drop-target={isDropTarget ? "true" : undefined}
      >
        <SortableContext
          items={issues.map((issue) => issue.id)}
          strategy={verticalListSortingStrategy}
        >
          {issues.map((issue) => (
            <BoardCard
              key={issue.id}
              issue={issue}
              state={state}
              displayProperties={displayProperties}
              selection={selection}
            />
          ))}
        </SortableContext>
        {/* Quick-add pill: + opens the create modal pre-seeded with this
            column's status (CAPTURED — finding 13). */}
        <button
          type="button"
          className={styles.quickAdd}
          aria-label={`Add issue to ${state.name}`}
          onClick={createInColumn}
        >
          <Icon name="Plus" size={14} />
        </button>
      </div>
    </section>
  );
});
