"use client";

/**
 * Board card — MASTER_PROMPT.md §15 card anatomy (CAPTURED):
 * muted ID · status glyph + two-line title · property chip row (enabled
 * display properties: priority glyph, project, milestone, labels, due date…
 * — shared renderer with the list row) · footer with "Created Aug 24" ·
 * assignee avatar / dashed placeholder top-right.
 *
 * The card is a real <a> link to the issue route so a plain click navigates
 * (finding 12); dragging is handled by useSortable and the original dims to
 * a 0.4-opacity placeholder that keeps the column height (finding 11).
 */

import { useRef, type CSSProperties } from "react";
import Link from "next/link";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useSortable } from "@dnd-kit/sortable";
import { useSyncClient } from "@/lib/data/DataProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { openContextMenuFromButton } from "@/components/ui/ContextMenu";
import { IssueContextMenu } from "@/components/issues/IssueContextMenu";
import {
  IssuePropertyChips,
  hasCreatedDisplayProperty,
} from "@/components/issues/PropertyChips";
import type { SelectionStore } from "@/lib/issues/selection";
import type { IssueData, UserData, WorkflowStateData } from "@/lib/data/types";
import type { BoardDndData } from "./Board";
import styles from "./board.module.css";

/** "Research Work" → "research-work" (issue route: /issue/[id]/[slug]). */
function slugify(title: string): string {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "untitled" : slug;
}

/** Footer copy "Created Aug 24" (CAPTURED); year appended when not current. */
function formatCreated(iso: string): string {
  const date = new Date(iso);
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === new Date().getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };
  return `Created ${date.toLocaleDateString("en-US", options)}`;
}

/** Shared inner anatomy: rendered by the sortable card AND the drag overlay. */
function CardContent({
  issue,
  state,
  displayProperties,
  assignee,
  actions,
}: {
  issue: IssueData;
  state: WorkflowStateData;
  /** Enabled display-property keys (§11.1) — gates the chip row + footer. */
  displayProperties: readonly string[];
  assignee: UserData | undefined;
  /** Hover-revealed ⋯ affordance; absent on the static drag preview. */
  actions?: React.ReactNode;
}) {
  return (
    <>
      <div className={styles.cardId}>
        {issue.identifier}
        {actions}
      </div>
      <div className={styles.cardTitleRow}>
        <span className={styles.cardStatus}>
          <StatusIcon category={state.category} color={state.color} size={14} />
        </span>
        <span className={styles.cardTitle}>{issue.title}</span>
      </div>
      {/* Chip row between title and footer (reference card anatomy); wraps
          onto extra lines with a 4px row gap. */}
      <IssuePropertyChips
        issue={issue}
        displayProperties={displayProperties}
        className={styles.cardChips}
      />
      {hasCreatedDisplayProperty(displayProperties) ? (
        <div className={styles.cardFooter}>{formatCreated(issue.createdAt)}</div>
      ) : null}
      <span className={styles.cardAssignee}>
        {assignee !== undefined ? (
          <Avatar
            initials={assignee.initials}
            color={assignee.avatarColor}
            size={18}
            src={assignee.avatarUrl}
          />
        ) : (
          <span className={styles.assigneePlaceholder} aria-hidden="true" />
        )}
      </span>
    </>
  );
}

export const BoardCard = observer(function BoardCard({
  issue,
  state,
  displayProperties,
  selection,
}: {
  issue: IssueData;
  state: WorkflowStateData;
  displayProperties: readonly string[];
  /** Shared with the list view (§6.7) — a selected card acts as a group. */
  selection?: SelectionStore;
}) {
  const client = useSyncClient();
  const moreRef = useRef<HTMLButtonElement>(null);
  const assignee =
    issue.assigneeId !== undefined
      ? client.store.get("User", issue.assigneeId)
      : undefined;

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: issue.id,
      data: {
        type: "card",
        issueId: issue.id,
        stateId: issue.stateId,
      } satisfies BoardDndData,
    });

  const style: CSSProperties = {
    transform:
      transform !== null
        ? `translate3d(${transform.x}px, ${transform.y}px, 0)`
        : undefined,
    transition,
  };

  const href = `/${client.workspaceSlug}/issue/${issue.identifier}/${slugify(issue.title)}`;

  return (
    <IssueContextMenu issue={issue} selection={selection}>
      <Link
        ref={setNodeRef}
        href={href}
        className={clsx(styles.card, isDragging && styles.cardDragging)}
        style={style}
        // Board delegates hover-to-highlight (and therefore Space-to-peek) off
        // this id rather than threading a callback through every column.
        data-card-id={issue.id}
        // Anchors are natively draggable — disable so the pointer sensor owns
        // the gesture instead of the browser's link-drag ghost.
        draggable={false}
        {...attributes}
        {...listeners}
        // Keep link semantics: drop useSortable's role="button"/aria-pressed but
        // keep its aria-roledescription="sortable" + describedby instructions.
        role={undefined}
        aria-pressed={undefined}
      >
        <CardContent
          issue={issue}
          state={state}
          displayProperties={displayProperties}
          assignee={assignee}
          actions={
            <button
              ref={moreRef}
              type="button"
              className={styles.cardMore}
              aria-label={`${issue.identifier} options`}
              aria-haspopup="menu"
              tabIndex={-1}
              onClick={(event) => {
                // §6.3: the card's ⋯ opens the same menu as right-click.
                event.preventDefault();
                event.stopPropagation();
                selection?.highlight(issue.id);
                openContextMenuFromButton(moreRef.current);
              }}
              // Keep the pointer sensor (and the link) out of this gesture.
              onPointerDown={(event) => event.stopPropagation()}
            >
              <Icon name="More" size={14} />
            </button>
          }
        />
      </Link>
    </IssueContextMenu>
  );
});

/**
 * Static copy rendered inside <DragOverlay>: shadow-medium + scale(1.02)
 * (via .cardLifted); the overlay wrapper carries the grabbing cursor.
 */
export const BoardCardPreview = observer(function BoardCardPreview({
  issue,
  state,
  displayProperties,
}: {
  issue: IssueData;
  state: WorkflowStateData;
  displayProperties: readonly string[];
}) {
  const client = useSyncClient();
  const assignee =
    issue.assigneeId !== undefined
      ? client.store.get("User", issue.assigneeId)
      : undefined;

  return (
    <div className={clsx(styles.card, styles.cardLifted)}>
      <CardContent
        issue={issue}
        state={state}
        displayProperties={displayProperties}
        assignee={assignee}
      />
    </div>
  );
});
