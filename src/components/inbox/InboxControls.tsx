"use client";

/**
 * Inbox toolbar surfaces — MASTER_PROMPT.md §10.4 (the list header's "Add
 * filter" and "Display options" buttons) and §11.1/§11.2.
 *
 * Two different jobs, deliberately kept apart:
 *  · <InboxDisplayOptions> owns the PERSISTED shape of the list — ordering
 *    plus the captured "Show snoozed" / "Show read" toggles. It writes a
 *    ViewPreference row keyed "inbox", so the engine persists it to IndexedDB
 *    like every other view preference and it survives a reload.
 *  · <InboxFilterMenu> owns an AD-HOC narrowing of what the display options
 *    already allow — notification type, read state, snoozed state — the
 *    inbox's answer to the issue views' chip row (§11.2). It is session
 *    state on purpose: a triage filter is not a saved view.
 *
 * `matchesInboxFilter` is the single predicate both the list and the
 * keyboard cursor read, so `J`/`K` never walk onto a hidden row.
 */

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { observer } from "mobx-react-lite";
import { IconButton } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Tooltip } from "@/components/ui/Tooltip";
import { Icon } from "@/components/icons/Icon";
import { useViewPreference } from "@/lib/issues/viewPrefs";
import type { NotificationData } from "@/lib/data/types";
import displayCss from "@/components/issues/displayoptions.module.css";
import styles from "./inbox.module.css";

/** Persisted display preferences live under this view key. */
export const INBOX_VIEW_KEY = "inbox";

/* ================================================================
 * Filter model (session state)
 * ================================================================ */

export type ReadFilter = "all" | "unread" | "read";
export type SnoozeFilter = "all" | "snoozed" | "active";

export interface InboxFilter {
  /** Empty = every type. */
  types: string[];
  read: ReadFilter;
  snoozed: SnoozeFilter;
}

export const EMPTY_INBOX_FILTER: InboxFilter = {
  types: [],
  read: "all",
  snoozed: "all",
};

export function isInboxFilterActive(filter: InboxFilter): boolean {
  return (
    filter.types.length > 0 || filter.read !== "all" || filter.snoozed !== "all"
  );
}

/** Human label for a notification type (shared with the row's actor line). */
export const NOTIFICATION_TYPE_LABEL: Record<string, string> = {
  welcome: "Welcome",
  issueAssigned: "Assigned",
  issueUnassigned: "Unassigned",
  issueStatusChanged: "Status changed",
  issuePriorityUrgent: "Marked urgent",
  issueBlocking: "Blocking",
  issueMention: "Mentions",
  issueComment: "Comments",
  issueCommentReply: "Comment replies",
  issueSubscribed: "Subscribed",
};

export function notificationTypeLabel(type: string): string {
  return NOTIFICATION_TYPE_LABEL[type] ?? type;
}

export function isSnoozed(notification: NotificationData, now: number): boolean {
  if (notification.snoozedUntil === undefined) return false;
  const until = Date.parse(notification.snoozedUntil);
  return !Number.isNaN(until) && until > now;
}

/** The chip row's predicate — AND of the three axes, each inert when "all". */
export function matchesInboxFilter(
  notification: NotificationData,
  filter: InboxFilter,
  now: number,
): boolean {
  if (filter.types.length > 0 && !filter.types.includes(notification.type)) {
    return false;
  }
  const unread = notification.readAt === undefined;
  if (filter.read === "unread" && !unread) return false;
  if (filter.read === "read" && unread) return false;
  const snoozed = isSnoozed(notification, now);
  if (filter.snoozed === "snoozed" && !snoozed) return false;
  if (filter.snoozed === "active" && snoozed) return false;
  return true;
}

/* ================================================================
 * Snooze vocabulary (shared by the toolbar menu and the row menu)
 * ================================================================ */

export interface SnoozeOption {
  id: string;
  label: string;
  /** Absolute wake time, computed at click time from `from`. */
  at: (from: number) => Date;
}

/** 09:00 local on the day `dayOffset` days from `from`. */
function morningAfter(from: number, dayOffset: number): Date {
  const date = new Date(from);
  date.setDate(date.getDate() + dayOffset);
  date.setHours(9, 0, 0, 0);
  return date;
}

export const SNOOZE_OPTIONS: SnoozeOption[] = [
  { id: "hour", label: "For 1 hour", at: (from) => new Date(from + 60 * 60 * 1000) },
  { id: "tomorrow", label: "Until tomorrow", at: (from) => morningAfter(from, 1) },
  { id: "week", label: "Until next week", at: (from) => morningAfter(from, 7) },
];

/* ================================================================
 * Display options popover
 * ================================================================ */

const ORDERING_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
];

const MENU_OPEN_ATTR: Record<string, string> = { "data-menu-open": "true" };

export const InboxDisplayOptions = observer(function InboxDisplayOptions() {
  const { pref, update, isDefault, reset } = useViewPreference(INBOX_VIEW_KEY);
  const [open, setOpen] = React.useState(false);

  // DEFAULT_VIEW_PREF.ordering is the issue-list vocabulary; anything that is
  // not an explicit "oldest" reads as newest-first here.
  const ordering = pref.ordering === "oldest" ? "oldest" : "newest";

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      {/* Tooltip outermost: its Trigger clones the Popover Trigger, which
          merges both prop sets onto the button (Tooltip does not forward). */}
      <Tooltip content="Display options">
        <PopoverPrimitive.Trigger asChild>
          <IconButton label="Display options" {...(open ? MENU_OPEN_ATTR : {})}>
            <Icon name="DisplayOptions" size={14} />
            {!isDefault ? (
              <span className={displayCss.badgeDot} aria-hidden="true" />
            ) : null}
          </IconButton>
        </PopoverPrimitive.Trigger>
      </Tooltip>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={displayCss.popover}
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          onInteractOutside={(event) => {
            // The Select menu portals outside this popover — picking an
            // option must not dismiss it (§11.1 CAPTURED).
            const target = event.target;
            if (
              target instanceof Element &&
              target.closest("[data-radix-popper-content-wrapper]") !== null
            ) {
              event.preventDefault();
            }
          }}
        >
          <div className={displayCss.row}>
            <span className={displayCss.rowLabel}>Ordering</span>
            <span className={displayCss.rowControl}>
              <Select
                label="Ordering"
                value={ordering}
                onValueChange={(value) => update({ ordering: value })}
                options={ORDERING_OPTIONS}
              />
            </span>
          </div>
          <div className={displayCss.row}>
            <span className={displayCss.rowLabel}>Show snoozed</span>
            <span className={displayCss.rowControl}>
              <Toggle
                checked={pref.showSnoozed ?? false}
                onChange={(checked) => update({ showSnoozed: checked })}
                aria-label="Show snoozed"
              />
            </span>
          </div>
          <div className={displayCss.row}>
            <span className={displayCss.rowLabel}>Show read</span>
            <span className={displayCss.rowControl}>
              <Toggle
                checked={pref.showRead ?? true}
                onChange={(checked) => update({ showRead: checked })}
                aria-label="Show read"
              />
            </span>
          </div>
          {!isDefault ? (
            <div className={displayCss.footer}>
              <button type="button" className={styles.linkButton} onClick={reset}>
                Reset
              </button>
            </div>
          ) : null}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});

/* ================================================================
 * Filter menu
 * ================================================================ */

function FilterSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <div className={styles.filterSectionLabel}>{label}</div>
      {children}
    </>
  );
}

function FilterRow({
  label,
  checked,
  onSelect,
}: {
  label: string;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitemcheckbox"
      aria-checked={checked}
      className={styles.filterRow}
      onClick={onSelect}
    >
      <span className={styles.filterCheck} data-checked={checked ? "true" : undefined}>
        {checked ? (
          <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
            <path
              d="M9.98 3.05a.8.8 0 0 1 .03 1.13L5.42 9.07a.8.8 0 0 1-1.15.03L2.03 6.87a.8.8 0 1 1 1.14-1.13l1.66 1.68 4.02-4.34a.8.8 0 0 1 1.13-.03Z"
              fill="currentColor"
            />
          </svg>
        ) : null}
      </span>
      <span className={styles.filterRowLabel}>{label}</span>
    </button>
  );
}

export function InboxFilterMenu({
  filter,
  onChange,
  availableTypes,
}: {
  filter: InboxFilter;
  onChange: (next: InboxFilter) => void;
  /** Types actually present in the inbox, so the menu never offers nothing. */
  availableTypes: string[];
}) {
  const [open, setOpen] = React.useState(false);
  const active = isInboxFilterActive(filter);

  const toggleType = (type: string): void => {
    onChange({
      ...filter,
      types: filter.types.includes(type)
        ? filter.types.filter((held) => held !== type)
        : [...filter.types, type],
    });
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <Tooltip content="Add filter">
        <PopoverPrimitive.Trigger asChild>
          <IconButton label="Add filter" {...(open ? MENU_OPEN_ATTR : {})}>
            <Icon name="Filter" size={14} />
            {active ? (
              <span className={displayCss.badgeDot} aria-hidden="true" />
            ) : null}
          </IconButton>
        </PopoverPrimitive.Trigger>
      </Tooltip>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={styles.filterMenu}
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={8}
        >
          <div role="menu" aria-label="Filter notifications">
            <FilterSection label="Status">
              <FilterRow
                label="Unread"
                checked={filter.read === "unread"}
                onSelect={() =>
                  onChange({
                    ...filter,
                    read: filter.read === "unread" ? "all" : "unread",
                  })
                }
              />
              <FilterRow
                label="Read"
                checked={filter.read === "read"}
                onSelect={() =>
                  onChange({
                    ...filter,
                    read: filter.read === "read" ? "all" : "read",
                  })
                }
              />
            </FilterSection>

            <FilterSection label="Snoozed">
              <FilterRow
                label="Snoozed only"
                checked={filter.snoozed === "snoozed"}
                onSelect={() =>
                  onChange({
                    ...filter,
                    snoozed: filter.snoozed === "snoozed" ? "all" : "snoozed",
                  })
                }
              />
              <FilterRow
                label="Not snoozed"
                checked={filter.snoozed === "active"}
                onSelect={() =>
                  onChange({
                    ...filter,
                    snoozed: filter.snoozed === "active" ? "all" : "active",
                  })
                }
              />
            </FilterSection>

            {availableTypes.length > 0 ? (
              <FilterSection label="Type">
                {availableTypes.map((type) => (
                  <FilterRow
                    key={type}
                    label={notificationTypeLabel(type)}
                    checked={filter.types.includes(type)}
                    onSelect={() => toggleType(type)}
                  />
                ))}
              </FilterSection>
            ) : null}

            {active ? (
              <div className={styles.filterFooter}>
                <button
                  type="button"
                  className={styles.linkButton}
                  onClick={() => onChange(EMPTY_INBOX_FILTER)}
                >
                  Clear filters
                </button>
              </div>
            ) : null}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
