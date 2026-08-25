"use client";

/**
 * Shared issue property chips — card/row parity (MASTER_PROMPT.md §15 card
 * anatomy: cards show ENABLED DISPLAY PROPERTIES; §11.1 display-properties
 * chip grid is the key vocabulary). ONE renderer used by the board card and
 * the list row so both carry identical chips.
 *
 * Chip ↔ displayProperty mapping (everything gated on membership in
 * `displayProperties` AND on the issue actually holding the value):
 *   priority     → bare PriorityIcon glyph (no ring/padding). Priority 0 has
 *                  its own captured "No priority" glyph, so membership alone
 *                  renders it — matching the reference cards.
 *   project      → pill: 12px project icon (emoji/sprite) + name.
 *   milestone    → pill: 8px MilestoneDiamond in the project color + short
 *                  name ("M3" when the name leads with /^M\d+/, else full).
 *   labels       → one pill per label (8px color dot + name), capped at
 *                  LABEL_CAP with a "+N" overflow pill.
 *   dueDate      → pill: calendar glyph + "Sep 30"; red when overdue.
 *   estimate     → muted text pill (dormant: no §11.1 popover key mints it).
 *   links        → pill: link glyph + count (attachments stand in for links —
 *                  the data layer has no separate link model).
 *   updated      → muted text pill "Updated Aug 24".
 *   timeInStatus → clock glyph + duration since `updatedAt` (approximation:
 *                  state-entry time is not tracked separately).
 *
 * id/status/assignee/created are NOT chips — they map to the existing card
 * and row anatomy (ID text, status glyph, avatar, "Created …" footer / the
 * list date cell).
 *
 * `max` caps the ringed pills — the bare priority glyph is exempt — and
 * folds the remainder into a "+N" tail pill. Every chip wears a Tooltip with
 * the full value. Chips are inert (no hover state, cursor stays the default
 * arrow) and never shift layout on hover.
 */

import type { ReactNode } from "react";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { useStore } from "@/lib/data/DataProvider";
import { Icon } from "@/components/icons/Icon";
import { PriorityIcon } from "@/components/icons/StatusIcon";
import { MilestoneDiamond, projectIconFor } from "@/components/projects/glyphs";
import { Tooltip } from "@/components/ui/Tooltip";
import type { IssueData, LabelData, Priority } from "@/lib/data/types";
import styles from "./propertychips.module.css";

const PRIORITY_LABEL: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

/** Label pills shown before the per-property "+N" overflow pill. */
const LABEL_CAP = 2;

/** Membership test tolerant of "Created" / "created" / "createdAt" spellings. */
export function hasCreatedDisplayProperty(properties: readonly string[]): boolean {
  return properties.some((property) => {
    const normalized = property.toLowerCase().replace(/[^a-z]/g, "");
    return normalized === "created" || normalized === "createdat";
  });
}

/** "Sep 30" — year appended when not the current one ("Sep 30, 2025"). */
function shortDate(date: Date): string {
  const options: Intl.DateTimeFormatOptions =
    date.getFullYear() === new Date().getFullYear()
      ? { month: "short", day: "numeric" }
      : { month: "short", day: "numeric", year: "numeric" };
  return date.toLocaleDateString("en-US", options);
}

/** "Sep 30, 2026" — the tooltip (full-value) form. */
function fullDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Date-only ISO ("2026-09-30") parsed in LOCAL time — `new Date(iso)` would
 * read it as UTC midnight and show the previous day west of Greenwich.
 */
function parseDateOnly(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year ?? 0, (month ?? 1) - 1, day ?? 1);
}

/** Compact duration: "5m" · "3h" · "4d" · "2w". */
function formatDuration(ms: number): string {
  const minutes = Math.floor(Math.max(0, ms) / 60_000);
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

/** One ringed pill: content + the full value its Tooltip carries. */
interface Pill {
  key: string;
  tip: string;
  className?: string;
  content: ReactNode;
}

export const IssuePropertyChips = observer(function IssuePropertyChips({
  issue,
  displayProperties,
  max,
  className,
}: {
  issue: IssueData;
  displayProperties: readonly string[];
  /** Cap on ringed pills (bare priority glyph exempt); rest fold into "+N". */
  max?: number;
  /** Layout-context class for the root (card wraps, list row stays one line). */
  className?: string;
}) {
  const store = useStore();
  const has = (key: string): boolean => displayProperties.includes(key);

  const pills: Pill[] = [];

  const project =
    issue.projectId !== undefined ? store.get("Project", issue.projectId) : undefined;

  if (has("project") && project !== undefined) {
    pills.push({
      key: "project",
      tip: project.name,
      content: (
        <>
          <span className={styles.projectIcon}>{projectIconFor(project, 12)}</span>
          <span className={styles.chipLabel}>{project.name}</span>
        </>
      ),
    });
  }

  const milestone =
    issue.milestoneId !== undefined
      ? store.get("Milestone", issue.milestoneId)
      : undefined;
  if (has("milestone") && milestone !== undefined) {
    // The diamond wears the project color (reference chip); resolve through
    // the milestone's own project when the issue carries none itself.
    const milestoneProject = project ?? store.get("Project", milestone.projectId);
    const short = /^(M\d+)\b/.exec(milestone.name)?.[1];
    pills.push({
      key: "milestone",
      tip: milestone.name,
      content: (
        <>
          <span className={styles.diamond}>
            <MilestoneDiamond size={8} color={milestoneProject?.color} />
          </span>
          <span className={styles.chipLabel}>{short ?? milestone.name}</span>
        </>
      ),
    });
  }

  if (has("labels")) {
    const labels = issue.labelIds
      .map((id) => store.get("Label", id))
      .filter((label): label is LabelData => label !== undefined);
    for (const label of labels.slice(0, LABEL_CAP)) {
      pills.push({
        key: `label:${label.id}`,
        tip: label.name,
        content: (
          <>
            <span className={styles.dot} style={{ background: label.color }} />
            <span className={styles.chipLabel}>{label.name}</span>
          </>
        ),
      });
    }
    if (labels.length > LABEL_CAP) {
      const rest = labels.slice(LABEL_CAP);
      pills.push({
        key: "labels-overflow",
        tip: rest.map((label) => label.name).join(", "),
        content: <>+{rest.length}</>,
      });
    }
  }

  if (has("dueDate") && issue.dueDate !== undefined) {
    const due = parseDateOnly(issue.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const overdue = due.getTime() < today.getTime();
    pills.push({
      key: "dueDate",
      tip: `Due ${fullDate(due)}`,
      className: overdue ? styles.overdue : undefined,
      content: (
        <>
          <Icon name="Calendar" size={12} color="currentColor" />
          <span>{shortDate(due)}</span>
        </>
      ),
    });
  }

  if (has("estimate") && issue.estimate !== undefined) {
    pills.push({
      key: "estimate",
      tip: `Estimate: ${issue.estimate}`,
      content: <span>{issue.estimate}</span>,
    });
  }

  const linkCount = issue.attachments?.length ?? 0;
  if (has("links") && linkCount > 0) {
    pills.push({
      key: "links",
      tip: linkCount === 1 ? "1 link" : `${linkCount} links`,
      content: (
        <>
          <Icon name="Link" size={12} color="currentColor" />
          <span>{linkCount}</span>
        </>
      ),
    });
  }

  if (has("updated")) {
    const updated = new Date(issue.updatedAt);
    pills.push({
      key: "updated",
      tip: `Updated ${fullDate(updated)}`,
      content: <span>Updated {shortDate(updated)}</span>,
    });
  }

  if (has("timeInStatus")) {
    const inStatus = formatDuration(Date.now() - Date.parse(issue.updatedAt));
    pills.push({
      key: "timeInStatus",
      tip: `Time in status: ${inStatus}`,
      content: (
        <>
          <Icon name="ClockOutline" size={12} color="currentColor" />
          <span>{inStatus}</span>
        </>
      ),
    });
  }

  const showPriority = has("priority");
  const visible =
    max !== undefined && pills.length > max ? pills.slice(0, max) : pills;
  const hidden = pills.length > visible.length ? pills.slice(visible.length) : [];

  if (!showPriority && visible.length === 0) return null;

  return (
    <div className={clsx(styles.chips, className)}>
      {showPriority ? (
        <Tooltip content={PRIORITY_LABEL[issue.priority]}>
          <span className={styles.glyph}>
            <PriorityIcon priority={issue.priority} size={14} />
          </span>
        </Tooltip>
      ) : null}
      {visible.map((pill) => (
        <Tooltip key={pill.key} content={pill.tip}>
          <span className={clsx(styles.chip, pill.className)}>{pill.content}</span>
        </Tooltip>
      ))}
      {hidden.length > 0 ? (
        <Tooltip content={hidden.map((pill) => pill.tip).join(" · ")}>
          <span className={styles.chip}>+{hidden.length}</span>
        </Tooltip>
      ) : null}
    </div>
  );
});
