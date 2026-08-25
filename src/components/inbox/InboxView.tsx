"use client";

/**
 * Inbox split view — MASTER_PROMPT.md §10.4 + §12 (inbox triage keys),
 * docs/analysis/capture-welcome-to-linear.md §1/§6, research-nav-auth.md §3.
 *
 * Left: a 400px resizable notification list (57px "Inbox" header, 55px rows).
 * Right: the reading pane (57px action bar + centered 860px content column)
 * rendering the welcome document or a compact issue summary.
 *
 * The keyboard cursor here is LOCAL state, deliberately not the issue
 * SelectionStore: inbox rows are never multi-selected, and `data-active`
 * (open in the reading pane) is a different axis from `data-selected`.
 */

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type { NotificationData } from "@/lib/data/types";
import { CURRENT_USER_ID, useViewPreference } from "@/lib/issues/viewPrefs";
import { useScope, useShortcut } from "@/lib/keyboard";
import { showToast } from "@/lib/toast";
import { Header } from "@/components/shell/Header";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { AppContextMenu } from "@/components/ui/ContextMenu";
import type { MenuItem } from "@/components/ui/Menu";
import { Menu } from "@/components/ui/Menu";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import {
  EMPTY_INBOX_FILTER,
  INBOX_VIEW_KEY,
  InboxDisplayOptions,
  InboxFilterMenu,
  SNOOZE_OPTIONS,
  isInboxFilterActive,
  isSnoozed,
  matchesInboxFilter,
  type InboxFilter,
} from "./InboxControls";
import { WelcomeDocument, WorkspaceMark } from "./WelcomeDocument";
import styles from "./inbox.module.css";

/* ================================================================
 * Constants + pure helpers
 * ================================================================ */

const LIST_WIDTH_KEY = "inboxListWidth";
const DEFAULT_LIST_WIDTH = 400; /* CAPTURED --x-width */
const MIN_LIST_WIDTH = 280;
const MAX_LIST_WIDTH = 680;

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

function clampWidth(width: number): number {
  return Math.min(MAX_LIST_WIDTH, Math.max(MIN_LIST_WIDTH, width));
}

/** Row timestamp: "now" · "9m" · "2h" · "3d" · "2w" · "5mo" · "1y" (CAPTURED "2h"). */
function relativeTime(iso: string, now: number): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const elapsed = Math.max(0, now - time);
  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d`;
  if (elapsed < 4 * WEEK) return `${Math.floor(elapsed / WEEK)}w`;
  if (elapsed < 365 * DAY) return `${Math.floor(elapsed / (30 * DAY))}mo`;
  return `${Math.floor(elapsed / (365 * DAY))}y`;
}

/** Hover title on the timestamp (CAPTURED title="Aug 24, 16:20"). */
const ABSOLUTE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function absoluteTime(iso: string): string | undefined {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? undefined : ABSOLUTE_FORMAT.format(time);
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

/** The welcome notification keeps its own captured route; the rest open in place. */
function notificationHref(workspace: string, notification: NotificationData): string {
  return notification.type === "welcome"
    ? `/${workspace}/welcome-message`
    : `/${workspace}/inbox/${notification.id}`;
}

/** Notification type → the verb shown on the actor line. */
const TYPE_LABEL: Record<string, string> = {
  issueAssigned: "assigned this issue to you",
  issueUnassigned: "removed you from this issue",
  issueStatusChanged: "changed the status",
  issuePriorityUrgent: "marked this issue urgent",
  issueBlocking: "changed a blocking relationship",
  issueMention: "mentioned you",
  issueComment: "left a comment",
  issueCommentReply: "replied to your comment",
  issueSubscribed: "subscribed you to this issue",
};

function typeLabel(type: string): string {
  return TYPE_LABEL[type] ?? "updated this issue";
}

/* ================================================================
 * Authored glyphs
 * ================================================================ */

/** 48px outlined tray for the empty reading pane. */
function InboxOutlineGlyph({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fillRule="evenodd"
        d="M4.55 1.5h6.9c.95 0 1.82.54 2.23 1.4l1.1 2.24c.14.3.22.63.22.96V12a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12V6.1c0-.33.08-.66.22-.96l1.1-2.24c.41-.86 1.28-1.4 2.23-1.4ZM4.9 3 3.35 6.9h2.28c.4 0 .77.2.98.54l.53.86c.2.34.58.54.98.54h1.76c.4 0 .77-.2.98-.54l.53-.86c.2-.34.58-.54.98-.54h2.28L12.1 3H4.9Z"
      />
    </svg>
  );
}

/** 16px trash for "Delete notification". */
function TrashGlyph({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6.75 1.5h2.5c.83 0 1.5.67 1.5 1.5v.5h2.5a.75.75 0 0 1 0 1.5h-.53l-.62 8.1A2 2 0 0 1 10.11 15H5.89a2 2 0 0 1-1.99-1.9L3.28 5H2.75a.75.75 0 0 1 0-1.5h2.5V3c0-.83.67-1.5 1.5-1.5Zm2.5 2V3h-2.5v.5h2.5ZM6.4 6.5c-.33 0-.6.27-.6.6v5a.6.6 0 1 0 1.2 0v-5c0-.33-.27-.6-.6-.6Zm3.2 0c-.33 0-.6.27-.6.6v5a.6.6 0 1 0 1.2 0v-5c0-.33-.27-.6-.6-.6Z" />
    </svg>
  );
}

/** 16px read/unread toggle glyph: filled dot unread, hollow ring read. */
function ReadGlyph({ read }: { read: boolean }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 16 16"
      aria-hidden="true"
      focusable="false"
    >
      {read ? (
        <path
          fillRule="evenodd"
          d="M8 2.75a5.25 5.25 0 1 0 0 10.5 5.25 5.25 0 0 0 0-10.5ZM4.25 8a3.75 3.75 0 1 1 7.5 0 3.75 3.75 0 0 1-7.5 0Z"
          fill="currentColor"
        />
      ) : (
        <circle cx="8" cy="8" r="5.25" fill="currentColor" />
      )}
    </svg>
  );
}

/* ================================================================
 * List row (55px, CAPTURED anatomy)
 * ================================================================ */

const NotificationRow = observer(function NotificationRow({
  notification,
  workspace,
  active,
  highlighted,
  now,
  onHighlight,
  menuItems,
}: {
  notification: NotificationData;
  workspace: string;
  active: boolean;
  highlighted: boolean;
  now: number;
  onHighlight: (id: string) => void;
  /** Right-click menu built by the view (§6.3, same actions as the toolbar). */
  menuItems: MenuItem[];
}) {
  const store = useStore();
  const unread = notification.readAt === undefined;
  const snoozed = isSnoozed(notification, now);
  const issue =
    notification.issueId !== undefined
      ? store.get("Issue", notification.issueId)
      : undefined;
  const state = issue !== undefined ? store.get("WorkflowState", issue.stateId) : undefined;

  return (
    <AppContextMenu items={menuItems}>
      <Link
        href={notificationHref(workspace, notification)}
        className={styles.row}
        data-list-row="true"
        data-list-key={notification.id}
        data-active={active ? "true" : "false"}
        data-keyboard-active={highlighted ? "true" : "false"}
        data-unread={unread ? "true" : undefined}
        onMouseEnter={() => onHighlight(notification.id)}
        // Right-click targets the row it is on, not wherever the cursor was.
        onContextMenu={() => onHighlight(notification.id)}
      >
        {unread && <span className={styles.unreadDot} aria-hidden="true" />}
        <span
          className={
            notification.type === "welcome"
              ? `${styles.rowTile} ${styles.rowTileMark}`
              : styles.rowTile
          }
        >
          {notification.type === "welcome" ? (
            <WorkspaceMark size={18} />
          ) : (
            <StatusIcon
              category={state?.category ?? "backlog"}
              color={state?.color}
              size={16}
            />
          )}
        </span>
        <span className={styles.rowText}>
          <span className={styles.rowTitleLine}>
            <span className={styles.rowTitle}>{notification.title}</span>
            {snoozed && (
              <span className={styles.rowSnoozeBadge} aria-label="Snoozed">
                <Icon name="ClockOutline" size={12} />
              </span>
            )}
            <time
              className={styles.rowTime}
              dateTime={notification.createdAt}
              title={absoluteTime(notification.createdAt)}
            >
              {relativeTime(notification.createdAt, now)}
            </time>
          </span>
          {notification.snippet !== undefined && (
            <span className={styles.rowSnippet}>{notification.snippet}</span>
          )}
        </span>
      </Link>
    </AppContextMenu>
  );
});

/* ================================================================
 * Reading pane content for issue notifications
 * ================================================================ */

const IssueNotificationBody = observer(function IssueNotificationBody({
  notification,
  workspace,
}: {
  notification: NotificationData;
  workspace: string;
}) {
  const store = useStore();
  const issue =
    notification.issueId !== undefined
      ? store.get("Issue", notification.issueId)
      : undefined;
  const state = issue !== undefined ? store.get("WorkflowState", issue.stateId) : undefined;
  const actor =
    notification.actorId !== undefined
      ? store.get("User", notification.actorId)
      : undefined;

  return (
    <div className={styles.issueCard}>
      <span className={styles.issueIdentifier}>
        {issue?.identifier ?? "Issue unavailable"}
      </span>
      {issue !== undefined ? (
        <Link
          className={styles.issueTitle}
          href={`/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`}
        >
          {issue.title}
        </Link>
      ) : (
        <span className={styles.issueTitle}>{notification.title}</span>
      )}
      <span className={styles.issueMeta}>
        <span className={styles.issueStatus}>
          <StatusIcon
            category={state?.category ?? "backlog"}
            color={state?.color}
            size={14}
          />
          {state?.name ?? "Unknown status"}
        </span>
      </span>
      <span className={styles.issueActor}>
        {actor !== undefined && (
          <Avatar
            initials={actor.initials}
            color={actor.avatarColor}
            size={18}
            src={actor.avatarUrl}
          />
        )}
        <span>
          <span className={styles.issueActorName}>
            {actor?.displayName ?? "Someone"}
          </span>{" "}
          {typeLabel(notification.type)} ·{" "}
          {absoluteTime(notification.createdAt) ?? ""}
        </span>
      </span>
    </div>
  );
});

/* ================================================================
 * The view
 * ================================================================ */

export const InboxView = observer(function InboxView({
  workspace,
  selectedId,
}: {
  workspace: string;
  selectedId?: string;
}) {
  const store = useStore();
  const client = useSyncClient();
  const router = useRouter();

  const paneRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const quickFilterRef = useRef<HTMLInputElement>(null);

  const [listWidth, setListWidth] = useState(DEFAULT_LIST_WIDTH);
  const [resizing, setResizing] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | undefined>(undefined);
  /** §11.2 `Cmd/Ctrl+F`: a temporary quick-filter over the visible rows. */
  const [quickFilterOpen, setQuickFilterOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<InboxFilter>(EMPTY_INBOX_FILTER);

  // Ordering + show-snoozed/show-read persist through the engine (§11.1).
  const { pref } = useViewPreference(INBOX_VIEW_KEY);
  const showSnoozed = pref.showSnoozed ?? false;
  const showRead = pref.showRead ?? true;

  /* ---------- persisted list width ---------- */

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LIST_WIDTH_KEY);
      if (raw === null) return;
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed)) setListWidth(clampWidth(parsed));
    } catch {
      /* storage unavailable (private mode) — keep the default */
    }
  }, []);

  const onResizeStart = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const pane = paneRef.current;
    if (pane === null) return;
    const left = pane.getBoundingClientRect().left;
    const widthAt = (ev: PointerEvent): number => clampWidth(Math.round(ev.clientX - left));
    setResizing(true);
    const onMove = (ev: PointerEvent): void => {
      pane.style.setProperty("--inbox-list-width", `${widthAt(ev)}px`);
    };
    const onUp = (ev: PointerEvent): void => {
      const width = widthAt(ev);
      setListWidth(width);
      try {
        localStorage.setItem(LIST_WIDTH_KEY, String(width));
      } catch {
        /* storage unavailable — the width still applies for this session */
      }
      setResizing(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }, []);

  /* ---------- derived rows ---------- */

  const now = Date.now();
  const stored = store.notificationsForUser(CURRENT_USER_ID);
  // notificationsForUser sorts newest-first; "Oldest first" reverses it.
  const all = pref.ordering === "oldest" ? stored.slice().reverse() : stored;
  const snoozedCount = all.filter((n) => isSnoozed(n, now)).length;

  const needle = query.trim().toLowerCase();
  const availableTypes = Array.from(new Set(all.map((n) => n.type))).sort();

  /**
   * Three narrowings, in the order the user thinks about them: the persisted
   * display toggles decide the baseline, the filter menu narrows that, and
   * the quick-filter text narrows what is left.
   */
  const visible = all.filter((notification) => {
    if (!showSnoozed && isSnoozed(notification, now)) return false;
    if (!showRead && notification.readAt !== undefined) return false;
    if (!matchesInboxFilter(notification, filter, now)) return false;
    if (needle === "") return true;
    return (
      notification.title.toLowerCase().includes(needle) ||
      (notification.snippet ?? "").toLowerCase().includes(needle)
    );
  });

  const activeNotification =
    selectedId !== undefined ? store.get("Notification", selectedId) : undefined;
  const targetId = highlightedId ?? selectedId;
  const target = targetId !== undefined ? store.get("Notification", targetId) : undefined;

  /* Keep the keyboard cursor on a row that still exists (stable dep: id list). */
  const visibleKey = visible.map((n) => n.id).join("\n");
  useEffect(() => {
    if (highlightedId === undefined) return;
    if (visibleKey.split("\n").includes(highlightedId)) return;
    setHighlightedId(undefined);
  }, [highlightedId, visibleKey]);

  /* Scroll the cursor row into view when it moves off-screen. */
  useEffect(() => {
    if (highlightedId === undefined) return;
    const row = scrollerRef.current?.querySelector(
      `[data-list-key="${CSS.escape(highlightedId)}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [highlightedId]);

  /* ---------- triage actions (§12 Inbox) ---------- */

  const move = (delta: number): void => {
    if (visible.length === 0) return;
    const current = visible.findIndex((n) => n.id === targetId);
    const next =
      current < 0
        ? delta > 0
          ? 0
          : visible.length - 1
        : Math.min(visible.length - 1, Math.max(0, current + delta));
    setHighlightedId(visible[next].id);
  };

  const openTarget = (): void => {
    if (target === undefined) return;
    router.push(notificationHref(workspace, target));
  };

  /* Every action takes an explicit notification so the toolbar (which acts on
     the cursor) and the row context menu (which acts on the row you clicked)
     share one implementation. */

  const setRead = (notification: NotificationData, read: boolean): void => {
    client.mutate.markNotificationRead(notification.id, read);
  };

  const toggleReadOn = (notification: NotificationData): void => {
    setRead(notification, notification.readAt === undefined);
  };

  const toggleRead = (): void => {
    if (target === undefined) return;
    toggleReadOn(target);
  };

  const markAllRead = (): void => {
    for (const notification of all) {
      if (notification.readAt === undefined) {
        client.mutate.markNotificationRead(notification.id, true);
      }
    }
  };

  /** §10.4 snooze: hide until an explicit wake time (1 hour / tomorrow / next week). */
  const snoozeUntil = (notification: NotificationData, until: Date, label: string): void => {
    client.queue.enqueue("update", "Notification", notification.id, {
      snoozedUntil: until.toISOString(),
    });
    showToast(`Snoozed ${label.toLowerCase()}`);
  };

  const unsnooze = (notification: NotificationData): void => {
    // Wire `null` clears the field (JSON cannot carry undefined).
    client.queue.enqueue("update", "Notification", notification.id, {
      snoozedUntil: null,
    });
    showToast("Snooze removed");
  };

  /** `H` keeps the captured default: until tomorrow morning. */
  const snoozeTarget = (): void => {
    if (target === undefined) return;
    const option = SNOOZE_OPTIONS[1];
    snoozeUntil(target, option.at(Date.now()), option.label);
  };

  const deleteNotification = (notification: NotificationData): void => {
    /* Move the cursor to the next surviving row before the row disappears. */
    const index = visible.findIndex((n) => n.id === notification.id);
    const successor = visible[index + 1] ?? visible[index - 1];
    setHighlightedId(successor?.id);
    client.queue.enqueue("delete", "Notification", notification.id);
    if (selectedId === notification.id) router.push(`/${workspace}/inbox`);
  };

  const deleteTarget = (): void => {
    if (target === undefined) return;
    deleteNotification(target);
  };

  /** The row context menu — the same four actions the toolbar exposes (§6.3). */
  const rowMenuItems = (notification: NotificationData): MenuItem[] => {
    const unread = notification.readAt === undefined;
    const snoozed = isSnoozed(notification, now);
    return [
      {
        label: unread ? "Mark as read" : "Mark as unread",
        shortcut: ["U"],
        onSelect: () => setRead(notification, unread),
      },
      {
        label: snoozed ? "Snooze again" : "Snooze",
        submenu: [
          ...SNOOZE_OPTIONS.map((option) => ({
            label: option.label,
            onSelect: () =>
              snoozeUntil(notification, option.at(Date.now()), option.label),
          })),
          ...(snoozed
            ? [
                { type: "separator" as const },
                { label: "Unsnooze", onSelect: () => unsnooze(notification) },
              ]
            : []),
        ],
      },
      { type: "separator" },
      {
        label: "Delete notification",
        shortcut: ["⌫"],
        onSelect: () => deleteNotification(notification),
      },
    ];
  };

  useScope("inbox");

  /* §11.2 `Cmd/Ctrl+F`: open the quick-filter and focus it; Esc clears. */
  useShortcut({
    id: "inbox.quick-filter",
    keys: "mod+f",
    scope: "inbox",
    description: "Filter notifications",
    allowInInput: true,
    handler: (event) => {
      event.preventDefault();
      setQuickFilterOpen(true);
      // Focus after the input has mounted (rising edge of the same tick).
      requestAnimationFrame(() => quickFilterRef.current?.focus());
    },
  });

  useShortcut({ id: "inbox.next", keys: "j", scope: "inbox", description: "Next notification", handler: () => move(1) });
  useShortcut({ id: "inbox.next-arrow", keys: "arrowdown", scope: "inbox", description: "Next notification", handler: () => move(1) });
  useShortcut({ id: "inbox.prev", keys: "k", scope: "inbox", description: "Previous notification", handler: () => move(-1) });
  useShortcut({ id: "inbox.prev-arrow", keys: "arrowup", scope: "inbox", description: "Previous notification", handler: () => move(-1) });
  useShortcut({ id: "inbox.open", keys: "enter", scope: "inbox", description: "Open notification", handler: openTarget });
  useShortcut({ id: "inbox.toggle-read", keys: "u", scope: "inbox", description: "Mark read or unread", handler: toggleRead });
  useShortcut({ id: "inbox.mark-all-read", keys: "alt+u", scope: "inbox", description: "Mark all as read", handler: markAllRead });
  useShortcut({ id: "inbox.snooze", keys: "h", scope: "inbox", description: "Snooze notification", handler: snoozeTarget });
  useShortcut({ id: "inbox.delete", keys: "backspace", scope: "inbox", description: "Delete notification", handler: deleteTarget });

  /* ---------- render ---------- */

  const paneStyle = { "--inbox-list-width": `${listWidth}px` } as CSSProperties;

  return (
    <TooltipProvider>
      <div className={styles.split}>
        <div className={styles.listPane} ref={paneRef} style={paneStyle}>
          <Header
            title="Inbox"
            right={
              <>
                <InboxFilterMenu
                  filter={filter}
                  onChange={setFilter}
                  availableTypes={availableTypes}
                />
                <InboxDisplayOptions />
              </>
            }
          />
          {quickFilterOpen && (
            <div className={styles.quickFilter}>
              <Icon name="Search" size={14} />
              <input
                ref={quickFilterRef}
                type="text"
                className={styles.quickFilterInput}
                value={query}
                placeholder="Filter notifications…"
                aria-label="Filter notifications"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  // §6.9 escape hierarchy: clear the text, then close the bar.
                  if (event.key !== "Escape") return;
                  event.preventDefault();
                  if (query !== "") setQuery("");
                  else setQuickFilterOpen(false);
                }}
              />
              <button
                type="button"
                className={styles.quickFilterClose}
                aria-label="Close quick filter"
                onClick={() => {
                  setQuery("");
                  setQuickFilterOpen(false);
                }}
              >
                <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
                  <path d="M2.71 2.71a.7.7 0 0 1 .99 0L6 5.01l2.3-2.3a.7.7 0 1 1 .99.99L6.99 6l2.3 2.3a.7.7 0 1 1-.99.99L6 6.99l-2.3 2.3a.7.7 0 0 1-.99-.99L5.01 6l-2.3-2.3a.7.7 0 0 1 0-.99Z" fill="currentColor" />
                </svg>
              </button>
            </div>
          )}
          <div
            className={styles.listScroller}
            ref={scrollerRef}
            data-scroll-container="true"
            data-restore-scroll-view="inbox-list-0"
          >
            {visible.map((notification) => (
              <NotificationRow
                key={notification.id}
                notification={notification}
                workspace={workspace}
                active={notification.id === selectedId}
                highlighted={notification.id === highlightedId}
                now={now}
                onHighlight={setHighlightedId}
                menuItems={rowMenuItems(notification)}
              />
            ))}
            {visible.length === 0 && (
              <p className={styles.listEmpty}>
                {needle !== "" || isInboxFilterActive(filter)
                  ? "No notifications match this filter."
                  : snoozedCount > 0 && !showSnoozed
                    ? "Everything is snoozed."
                    : "You are all caught up."}
              </p>
            )}
          </div>
          <div
            className={styles.resizeHandle}
            data-resizing={resizing || undefined}
            onPointerDown={onResizeStart}
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize notification list"
          />
        </div>

        <div className={styles.readingPane}>
          <Header
            left={<span className={styles.topBarLeft} />}
            right={
              <>
                <Tooltip
                  content={
                    target?.readAt === undefined
                      ? "Mark as read"
                      : "Mark as unread"
                  }
                  keys={["U"]}
                >
                  <IconButton
                    label={
                      target?.readAt === undefined
                        ? "Mark as read"
                        : "Mark as unread"
                    }
                    disabled={target === undefined}
                    onClick={toggleRead}
                  >
                    <ReadGlyph read={target?.readAt !== undefined} />
                  </IconButton>
                </Tooltip>
                <Menu
                  align="end"
                  items={
                    target === undefined
                      ? []
                      : [
                          ...SNOOZE_OPTIONS.map((option) => ({
                            label: option.label,
                            onSelect: () =>
                              snoozeUntil(
                                target,
                                option.at(Date.now()),
                                option.label,
                              ),
                          })),
                          ...(isSnoozed(target, now)
                            ? [
                                { type: "separator" as const },
                                {
                                  label: "Unsnooze",
                                  onSelect: () => unsnooze(target),
                                },
                              ]
                            : []),
                        ]
                  }
                  trigger={
                    <IconButton
                      label="Snooze notification"
                      disabled={target === undefined}
                    >
                      <Icon name="ClockOutline" size={14} />
                    </IconButton>
                  }
                />
                <Tooltip content="Delete notification" keys={["⌫"]}>
                  <IconButton
                    label="Delete notification"
                    disabled={target === undefined}
                    onClick={deleteTarget}
                  >
                    <TrashGlyph />
                  </IconButton>
                </Tooltip>
              </>
            }
          />
          {activeNotification === undefined ? (
            <div className={styles.readingEmpty}>
              {/* An inbox with nothing in it at all is a different message
                  from an inbox where no row happens to be selected. */}
              {all.length === 0 ? (
                <EmptyState
                  illustration={<InboxOutlineGlyph />}
                  heading="Your inbox is empty"
                  primary={
                    <Button
                      variant="primary"
                      size={32}
                      onClick={() => router.push(`/${workspace}/my-issues/assigned`)}
                    >
                      Go to My issues
                    </Button>
                  }
                >
                  Assignments, mentions, comments and status changes on work you
                  subscribe to land here. Nothing has yet.
                </EmptyState>
              ) : (
                <>
                  <span className={styles.readingEmptyGlyph}>
                    <InboxOutlineGlyph />
                  </span>
                  <span className={styles.readingEmptyLabel}>
                    No notification selected
                  </span>
                </>
              )}
            </div>
          ) : (
            <div
              className={styles.readingScroller}
              tabIndex={0}
              data-scroll-container="true"
            >
              <div className={styles.readingColumn}>
                {activeNotification.type === "welcome" ? (
                  <WelcomeDocument />
                ) : (
                  <IssueNotificationBody
                    notification={activeNotification}
                    workspace={workspace}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
});
