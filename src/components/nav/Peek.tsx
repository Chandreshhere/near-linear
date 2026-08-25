"use client";

/**
 * Peek — MASTER_PROMPT.md §12 (`Space` peek: "tap toggles, hold = momentary;
 * ↑/↓ moves while peeking"), docs/analysis/research-nav-auth.md §2 (DOCUMENTED:
 * "Space — Peek: tap to toggle, hold for temporary preview; arrows move between
 * adjacent issues while peeking; Esc closes. Shows description, assignee,
 * status, priority, cycle, labels, estimate, created/updated dates").
 *
 * Peek is an OVERLAY, never a navigation: no route replacement and no scroll
 * reset in the view behind it (§12 / §6.10 — popovers float above, the list
 * keeps its route, its highlight and its scroll offset). Opening the issue for
 * real is an explicit "Open" click.
 *
 * Source of truth for *what* is peeked is the ACTIVE VIEW, not this module:
 * a list/board registers a getter with setActivePeekSource() and Peek reads
 * the highlighted id (§6.7 highlight — never the selection) through it on
 * every render. Because the getter reads the view's MobX SelectionStore
 * inside this observer, walking the list with ↑/↓ (whoever handles the key)
 * re-renders the panel onto the newly highlighted issue for free.
 *
 * With nothing registered — or nothing highlighted — `Space` does nothing.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { Avatar } from "@/components/ui/Avatar";
import { Button, IconButton } from "@/components/ui/Button";
import { PriorityIcon, StatusIcon } from "@/components/icons/StatusIcon";
import { projectIconFor } from "@/components/projects/glyphs";
import { useStore } from "@/lib/data/DataProvider";
import { KeyboardProvider, useShortcut } from "@/lib/keyboard";
import type { SyncStore } from "@/lib/data/store";
import type { IssueData, Priority, UUID } from "@/lib/data/types";
import styles from "./peek.module.css";
import { Icon } from "@/components/icons/Icon";

/* ================================================================
 * Active-source registry (the contract list/board views implement)
 * ================================================================ */

export interface PeekSource {
  /** The highlighted row id (§6.7 highlight), or null when nothing is. */
  id: string | null;
  /** Walk the highlight while peeking (§12 "↑/↓ moves while peeking"). */
  move?: (delta: 1 | -1) => void;
}

/** Read the live source. Called during render, so MobX reads are tracked. */
export type PeekSourceGetter = () => PeekSource | null;

let activeSource: PeekSourceGetter | null = null;
const sourceListeners = new Set<() => void>();

/**
 * Register the view `Space` peeks (last registration wins), or pass `null`
 * to clear it. Views should register on mount and clear on unmount — see
 * useActivePeekSource() for the guarded version of exactly that.
 *
 *   setActivePeekSource(() => ({
 *     id: selection.highlightedId,
 *     move: (d) => selection.moveHighlight(d),
 *   }));
 */
export function setActivePeekSource(get: PeekSourceGetter | null): void {
  activeSource = get;
  for (const fn of Array.from(sourceListeners)) fn();
}

/** The registered getter (null when no view claims Peek). */
export function getActivePeekSource(): PeekSourceGetter | null {
  return activeSource;
}

function subscribeSource(fn: () => void): () => void {
  sourceListeners.add(fn);
  return () => {
    sourceListeners.delete(fn);
  };
}

function serverSource(): PeekSourceGetter | null {
  return null; // SSR: no view has registered yet
}

/**
 * Register `get` as the active Peek source while mounted. The latest `get`
 * is always used without re-registering, and unmount only clears the
 * registry when this view still owns it (so a route change that mounts the
 * next view before unmounting the previous one is not clobbered).
 */
export function useActivePeekSource(get: PeekSourceGetter): void {
  const latest = useRef<PeekSourceGetter>(get);
  useEffect(() => {
    latest.current = get;
  });
  useEffect(() => {
    const stable: PeekSourceGetter = () => latest.current();
    setActivePeekSource(stable);
    return () => {
      if (getActivePeekSource() === stable) setActivePeekSource(null);
    };
  }, []);
}

/* ================================================================
 * Pure helpers
 * ================================================================ */

/** Exit animation length — keep in sync with peek.module.css. */
const EXIT_MS = 100;

/**
 * Longer than this and the Space press counts as a HOLD: the preview is
 * momentary and closes on key-up (§12 "tap toggles, hold = momentary").
 */
const HOLD_MS = 250;

const DESCRIPTION_LIMIT = 600;

const PRIORITY_LABEL: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

const CREATED_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatCreated(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "—" : CREATED_FORMAT.format(time);
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

/** Real issue route: /:ws/issue/:identifier/:slug (same shape as the list). */
function issueUrl(workspace: string, issue: IssueData): string {
  return `/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`;
}

/** Markdown snapshot → one flat paragraph (the peek summary is read-only). */
function toPlainText(markdown: string): string {
  return markdown
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]*)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s{0,3}>\s?/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/[*_~]{1,3}/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  const cut = text.slice(0, limit);
  const lastSpace = cut.lastIndexOf(" ");
  const kept = lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut;
  return `${kept.trimEnd()}…`;
}

/* ================================================================
 * Glyphs (local, per the codebase idiom for one-off strokes)
 * ================================================================ */

function GlyphClose(): JSX.Element {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M4.99 4a.7.7 0 0 0-.99.99L7.01 8l-3.01 3.01a.7.7 0 1 0 .99.99L8 8.99l3.01 3.01a.7.7 0 0 0 .99-.99L8.99 8 12 4.99A.7.7 0 0 0 11.01 4L8 7.01 4.99 4Z" />
    </svg>
  );
}

/** Dashed "unassigned person" — the shared empty-assignee idiom (§10.4). */
function GlyphPersonDashed(): JSX.Element {
  return <Icon name="PersonDashed" size={16} color="currentColor" />;
}

/* ================================================================
 * Panel body
 * ================================================================ */

function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): JSX.Element {
  return (
    <>
      <dt className={styles.propLabel}>{label}</dt>
      <dd className={styles.propValue}>{children}</dd>
    </>
  );
}

/**
 * Read-only summary of one issue. Every read goes through the MobX pool, so
 * an inbound delta (someone else changing the status) repaints the peek.
 */
const PeekBody = observer(function PeekBody({
  store,
  issue,
}: {
  store: SyncStore;
  issue: IssueData;
}): JSX.Element {
  const state = store.get("WorkflowState", issue.stateId);
  const assignee =
    issue.assigneeId !== undefined ? store.get("User", issue.assigneeId) : undefined;
  const project =
    issue.projectId !== undefined ? store.get("Project", issue.projectId) : undefined;
  const labels = issue.labelIds
    .map((id: UUID) => store.get("Label", id))
    .filter((label): label is NonNullable<typeof label> => label !== undefined);

  const description =
    issue.description !== undefined && issue.description.trim() !== ""
      ? truncate(toPlainText(issue.description), DESCRIPTION_LIMIT)
      : "";

  const activityCount = store.activitiesForIssue(issue.id).length;
  const commentCount = store.commentsForIssue(issue.id).length;

  return (
    <div className={styles.body}>
      <h2 className={styles.title}>{issue.title}</h2>

      {description !== "" ? (
        <p className={styles.description}>{description}</p>
      ) : (
        <p className={styles.descriptionEmpty}>No description</p>
      )}

      <dl className={styles.properties}>
        <PropertyRow label="Status">
          {state !== undefined ? (
            <>
              <StatusIcon category={state.category} color={state.color} size={14} />
              {state.name}
            </>
          ) : (
            <span className={styles.muted}>—</span>
          )}
        </PropertyRow>

        <PropertyRow label="Priority">
          <PriorityIcon priority={issue.priority} size={16} />
          {PRIORITY_LABEL[issue.priority]}
        </PropertyRow>

        <PropertyRow label="Assignee">
          {assignee !== undefined ? (
            <>
              <Avatar
                initials={assignee.initials}
                color={assignee.avatarColor}
                size={16}
                src={assignee.avatarUrl}
              />
              {assignee.displayName}
            </>
          ) : (
            <>
              <span className={styles.placeholderGlyph}>
                <GlyphPersonDashed />
              </span>
              <span className={styles.muted}>Unassigned</span>
            </>
          )}
        </PropertyRow>

        <PropertyRow label="Project">
          {project !== undefined ? (
            <>
              <span className={styles.propGlyph}>{projectIconFor(project)}</span>
              {project.name}
            </>
          ) : (
            <span className={styles.muted}>No project</span>
          )}
        </PropertyRow>

        <PropertyRow label="Labels">
          {labels.length > 0 ? (
            <span className={styles.labelChips}>
              {labels.map((label) => (
                <span key={label.id} className={styles.labelChip}>
                  <span
                    className={styles.labelDot}
                    style={{ background: label.color }}
                    aria-hidden="true"
                  />
                  {label.name}
                </span>
              ))}
            </span>
          ) : (
            <span className={styles.muted}>No labels</span>
          )}
        </PropertyRow>

        <PropertyRow label="Created">{formatCreated(issue.createdAt)}</PropertyRow>
      </dl>

      <p className={styles.activity}>
        {activityCount} {activityCount === 1 ? "activity event" : "activity events"}
        {commentCount > 0
          ? ` · ${commentCount} ${commentCount === 1 ? "comment" : "comments"}`
          : ""}
      </p>
    </div>
  );
});

/**
 * Shortcuts that only exist WHILE peeking. They are the fallback path: when
 * a list owns the same keys it registered earlier and wins the registry
 * match (one handler fires per keystroke — never both), and its own
 * moveHighlight() walks the very store this panel reads.
 */
function PeekKeys({
  onClose,
  onMove,
}: {
  onClose: () => void;
  onMove: (delta: 1 | -1) => void;
}): null {
  useShortcut({
    id: "peek.close",
    keys: "escape",
    description: "Close peek",
    handler: onClose,
  });
  useShortcut({
    id: "peek.next",
    keys: "arrowdown",
    description: "Peek next issue",
    handler: () => onMove(1),
  });
  useShortcut({
    id: "peek.prev",
    keys: "arrowup",
    description: "Peek previous issue",
    handler: () => onMove(-1),
  });
  useShortcut({
    id: "peek.next-vim",
    keys: "j",
    description: "Peek next issue",
    handler: () => onMove(1),
  });
  useShortcut({
    id: "peek.prev-vim",
    keys: "k",
    description: "Peek previous issue",
    handler: () => onMove(-1),
  });
  return null;
}

/* ================================================================
 * Host
 * ================================================================ */

/**
 * Mount-once host (workspace layout). Owns the `space` shortcut, the panel's
 * open/exit state and the momentary-hold timing. Renders nothing until a
 * peek is open.
 */
export const PeekHost = observer(function PeekHost(): JSX.Element {
  const store = useStore();
  const router = useRouter();
  const pathname = usePathname();
  const { workspace } = useParams<{ workspace: string }>();

  const [open, setOpen] = useState(false);
  const [exiting, setExiting] = useState(false);

  const openRef = useRef(false);
  openRef.current = open;
  /** Last id shown — survives the exit animation and a null-ing highlight. */
  const shownIdRef = useRef<string | null>(null);
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Timestamp of the Space keydown that opened the panel (hold detection). */
  const holdStartRef = useRef<number | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);

  const getter = useSyncExternalStore(subscribeSource, getActivePeekSource, serverSource);

  const close = useCallback(() => {
    holdStartRef.current = null;
    if (!openRef.current) return;
    openRef.current = false;
    setOpen(false);
    setExiting(true);
    if (exitTimer.current !== null) clearTimeout(exitTimer.current);
    exitTimer.current = setTimeout(() => {
      exitTimer.current = null;
      setExiting(false);
    }, EXIT_MS);
    // Hand focus back to whatever had it (the list row, the board card…).
    const restore = restoreFocusRef.current;
    restoreFocusRef.current = null;
    if (restore !== null && restore.isConnected) restore.focus();
  }, []);

  const openPeek = useCallback((holdStart: number | null) => {
    // Read the LIVE source (an event handler runs outside the render pass).
    const source = getActivePeekSource()?.() ?? null;
    const id = source?.id ?? null;
    if (id === null) return; // §12: nothing registered / nothing highlighted
    if (exitTimer.current !== null) {
      clearTimeout(exitTimer.current);
      exitTimer.current = null;
    }
    const active = document.activeElement;
    restoreFocusRef.current = active instanceof HTMLElement ? active : null;
    shownIdRef.current = id;
    holdStartRef.current = holdStart;
    openRef.current = true;
    setExiting(false);
    setOpen(true);
  }, []);

  const move = useCallback((delta: 1 | -1) => {
    getActivePeekSource()?.()?.move?.(delta);
  }, []);

  /* ---------------- keys ---------------- */

  useShortcut({
    id: "peek.toggle",
    keys: "space",
    description: "Peek at the highlighted issue",
    allowInInput: false,
    handler: (e) => {
      // Auto-repeat while the key is held must not flip the panel per frame.
      if (e.repeat) return;
      if (openRef.current) close();
      else openPeek(Date.now());
    },
  });

  // Hold = momentary preview: a Space that stayed down past HOLD_MS closes
  // on key-up; a tap leaves the panel pinned open (§12).
  useEffect(() => {
    if (!open) return;
    const onKeyUp = (e: KeyboardEvent): void => {
      if (e.key !== " " && e.key !== "Spacebar") return;
      const start = holdStartRef.current;
      holdStartRef.current = null;
      if (start !== null && Date.now() - start >= HOLD_MS) close();
    };
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [open, close]);

  /** Focus the panel so its own key handling wins over the view behind it. */
  useEffect(() => {
    if (open) panelRef.current?.focus();
  }, [open]);

  /** A real navigation supersedes the preview. */
  useEffect(() => {
    close();
    // Only a pathname change closes an open peek; close() no-ops otherwise.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  useEffect(
    () => () => {
      if (exitTimer.current !== null) clearTimeout(exitTimer.current);
    },
    [],
  );

  /* ---------------- what is shown ---------------- */

  // Tracked read: the getter reaches into the view's SelectionStore, so a
  // highlight move (from ANY handler) repaints the panel onto that issue.
  const liveId = getter !== null ? (getter()?.id ?? null) : null;
  if (open && liveId !== null) shownIdRef.current = liveId;
  const shownId = shownIdRef.current;
  const issue = shownId !== null ? store.get("Issue", shownId) : undefined;
  const visible = (open || exiting) && issue !== undefined;

  const onPanelKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>): void => {
    // React handlers run before the registry's window listener, so
    // preventDefault() here makes the registry stand down (§6.9 order:
    // close the overlay before the list clears its selection).
    switch (e.key) {
      case "Escape":
      case " ":
      case "Spacebar":
        e.preventDefault();
        close();
        return;
      case "ArrowDown":
      case "j":
        e.preventDefault();
        move(1);
        return;
      case "ArrowUp":
      case "k":
        e.preventDefault();
        move(-1);
        return;
      default:
    }
  };

  return (
    // KeyboardProvider mounts the single window keydown listener the registry
    // needs; duplicate providers never double-fire (handleKeydown bails on
    // e.defaultPrevented), matching CreateIssueHost.
    <KeyboardProvider>
      {visible ? (
        <div
          ref={panelRef}
          className={styles.panel}
          data-state={open ? "open" : "closed"}
          role="complementary"
          aria-label={`Peek: ${issue.identifier} ${issue.title}`}
          tabIndex={-1}
          onKeyDown={onPanelKeyDown}
        >
          <div className={styles.header}>
            <span className={styles.identifier}>{issue.identifier}</span>
            <span className={styles.spacer} />
            <Button
              variant="ghost"
              size={24}
              onClick={() => {
                close();
                router.push(issueUrl(workspace, issue));
              }}
            >
              Open
            </Button>
            <IconButton label="Close peek" size={24} onClick={close}>
              <GlyphClose />
            </IconButton>
          </div>
          <PeekBody store={store} issue={issue} />
        </div>
      ) : null}
      {open ? <PeekKeys onClose={close} onMove={move} /> : null}
    </KeyboardProvider>
  );
});
