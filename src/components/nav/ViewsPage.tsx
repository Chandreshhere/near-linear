"use client";

/**
 * Custom Views page (`/:ws/views/:tab`) — MASTER_PROMPT.md §10.7 and
 * docs/analysis/video-timeline-1.md f0022–f0023 (CAPTURED).
 *
 * Header "Views" + "New view"; pill tabs Issues | Projects; a two-column
 * table (Name ↓ / Owner) once views exist, otherwise the layered-stack empty
 * state whose copy points at the `⌥ V` save shortcut.
 *
 * WHERE THE DATA LIVES (deliberate — not a placeholder). A saved view is a
 * filter with a name, and the filter grammar already round-trips through the
 * URL (see lib/issues/filters.ts). So a view is just
 * `{ id, name, icon, color, type, teamKey?, filter, ownerId }` and that
 * record lives in localStorage under "customViews" — one key, one JSON array,
 * read through useSyncExternalStore so every mounted copy of the page (and
 * every other tab) stays in step. It is per-browser personal state, like the
 * agent's chat list, and it needs no server to be complete.
 *
 * The shape below is exactly the row a `CustomView` sync model would carry,
 * so promoting views to shared workspace state later is a store read in
 * `useCustomViews()` plus a `client.queue.enqueue` in `appendCustomView()` —
 * no call site changes.
 */

import * as React from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { observer } from "mobx-react-lite";
import { useStore } from "@/lib/data/DataProvider";
import { FILTER_PARAM } from "@/lib/issues/filters";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { useShortcut } from "@/lib/keyboard";
import { showToast } from "@/lib/toast";
import { Header } from "@/components/shell/Header";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Kbd } from "@/components/ui/Kbd";
import { ListRow } from "@/components/ui/ListRow";
import { Select } from "@/components/ui/Select";
import { Icon } from "@/components/icons/Icon";
import shellStyles from "@/components/shell/shell.module.css";
import css from "./views.module.css";

/* ================================================================
 * Shape
 * ================================================================ */

export type ViewsTab = "issues" | "projects";

export interface CustomView {
  id: string;
  name: string;
  /** Sprite symbol name (see components/icons/Sprites.tsx). */
  icon: string;
  /** Tint applied to the sprite only — never to the label. */
  color: string;
  type: ViewsTab;
  /**
   * Team this view resolves against, chosen when the view is saved. Issue
   * views open `/:ws/team/:teamKey/all?filter=…`; project views open the
   * team's project list. Absent = workspace-wide (project views land on
   * `/:ws/projects/all`; issue views fall back to the first team, since the
   * issue list is always team-scoped).
   */
  teamKey?: string;
  /** Serialized filter chips — exactly what `?filter=` carries. */
  filter: string;
  ownerId: string;
}

const VIEW_TABS: { id: ViewsTab; label: string }[] = [
  { id: "issues", label: "Issues" },
  { id: "projects", label: "Projects" },
];

/** Route-segment guard, so the route file never duplicates the tab list. */
export function isViewsTab(value: string): value is ViewsTab {
  return value === "issues" || value === "projects";
}

/** The six icons offered by the create dialog (shared with project views). */
export const VIEW_ICONS: readonly string[] = [
  "CustomView",
  "Filter",
  "Label",
  "Project",
  "Rocket",
  "Radar",
];

/** The six tints, drawn from the same palette as team/label fixtures (§2.2). */
export const VIEW_COLORS: readonly string[] = [
  "#5e6ad2",
  "#26b5ce",
  "#4ea7fc",
  "#bb87fc",
  "#eb5757",
  "#f2994a",
];

/** Sentinel for the "All teams" option in the save dialogs' team select. */
export const ALL_TEAMS = "__all__";

/* ================================================================
 * Storage (localStorage-backed, subscribable)
 * ================================================================ */

const STORAGE_KEY = "customViews";

/** Shared identity for "no views" — useSyncExternalStore needs a stable ref. */
const NO_VIEWS: readonly CustomView[] = Object.freeze([]);

const listeners = new Set<() => void>();

/* Snapshot cache: the parse result is memoized on the raw string so
   getSnapshot() returns the same array until the stored text actually
   changes (an unstable snapshot would loop the store). */
let cachedRaw: string | null = null;
let cachedViews: readonly CustomView[] = NO_VIEWS;

function isCustomView(value: unknown): value is CustomView {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.icon === "string" &&
    typeof row.color === "string" &&
    (row.type === "issues" || row.type === "projects") &&
    (row.teamKey === undefined || typeof row.teamKey === "string") &&
    typeof row.filter === "string" &&
    typeof row.ownerId === "string"
  );
}

/** Garbled or hand-edited storage degrades to "no views", never to a throw. */
function parseViews(raw: string | null): readonly CustomView[] {
  if (raw === null || raw === "") return NO_VIEWS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return NO_VIEWS;
    const rows = parsed.filter(isCustomView);
    return rows.length === 0 ? NO_VIEWS : rows;
  } catch {
    return NO_VIEWS;
  }
}

/** Current saved views. SSR-safe (empty on the server). */
export function readCustomViews(): readonly CustomView[] {
  if (typeof window === "undefined") return NO_VIEWS;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    // Storage blocked (private mode / disabled cookies) — behave as empty.
    return NO_VIEWS;
  }
  if (raw === cachedRaw) return cachedViews;
  cachedRaw = raw;
  cachedViews = parseViews(raw);
  return cachedViews;
}

function writeCustomViews(views: readonly CustomView[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(views));
  } catch {
    // Quota/permission failure: keep the in-memory snapshot so the UI still
    // reflects the click; the row is simply not durable.
  }
  cachedRaw = null; // force a re-read on the next snapshot
  for (const listener of Array.from(listeners)) listener();
}

/** Append one view and notify every subscriber. */
export function appendCustomView(view: CustomView): void {
  writeCustomViews([...readCustomViews(), view]);
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent): void => {
    // Cross-tab writes (and `localStorage.clear()`, which sends key === null).
    if (event.key === null || event.key === STORAGE_KEY) {
      cachedRaw = null;
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function serverSnapshot(): readonly CustomView[] {
  return NO_VIEWS;
}

/** Subscribe to the saved-view list. */
export function useCustomViews(): readonly CustomView[] {
  return React.useSyncExternalStore(subscribe, readCustomViews, serverSnapshot);
}

export function newViewId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `view-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * The view's filter, replayed as a URL, scoped to the team it was saved
 * against (§10.7):
 *   · issue view + team     → /:ws/team/:KEY/all?filter=…
 *   · issue view, no team   → the fallback team's issue list (the issue list
 *                             is always team-scoped, so there is no
 *                             workspace-wide route to send it to)
 *   · project view + team   → /:ws/team/:KEY/projects/all?filter=…
 *   · project view, no team → /:ws/projects/all?filter=…
 *
 * `fallbackTeamKey` comes from the caller's live team pool, so a view saved
 * before a team was renamed or removed still lands somewhere real.
 */
export function viewHref(
  workspace: string,
  view: CustomView,
  fallbackTeamKey?: string,
): string {
  const teamKey = view.teamKey ?? fallbackTeamKey;
  const base =
    view.type === "projects"
      ? teamKey === undefined
        ? `/${workspace}/projects/all`
        : `/${workspace}/team/${teamKey}/projects/all`
      : teamKey === undefined
        ? `/${workspace}/my-issues/assigned`
        : `/${workspace}/team/${teamKey}/all`;
  // The codec's ";" ":" "," separators are legal query characters and are
  // already percent-escaped inside values, so the string is appended as-is.
  return view.filter === "" ? base : `${base}?${FILTER_PARAM}=${view.filter}`;
}

/* ================================================================
 * Glyphs
 * ================================================================ */

/**
 * Layered-stack illustration (f0022): three offset rounded cards, the front
 * one carrying two content rules. Muted by the EmptyState illustration slot.
 */
function LayeredStack() {
  return (
    <svg
      width={96}
      height={72}
      viewBox="0 0 96 72"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <rect
        x="27.75"
        y="9.75"
        width="40.5"
        height="12.5"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.3"
      />
      <rect
        x="19.75"
        y="23.75"
        width="56.5"
        height="14.5"
        rx="5"
        stroke="currentColor"
        strokeWidth="1.5"
        opacity="0.55"
      />
      <rect
        x="11.75"
        y="39.75"
        width="72.5"
        height="22.5"
        rx="6"
        stroke="currentColor"
        strokeWidth="1.5"
      />
      <path
        d="M20 47.5h32M20 54.5h19"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.45"
      />
    </svg>
  );
}

/* ================================================================
 * "New view" dialog
 * ================================================================ */

const NewViewDialog = observer(function NewViewDialog({
  open,
  onOpenChange,
  type,
  defaultTeamKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ViewsTab;
  /** Pre-selected team (the one the page was opened from, when there is one). */
  defaultTeamKey?: string;
}) {
  const store = useStore();
  const teams = store
    .all("Team")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const [name, setName] = React.useState("");
  const [icon, setIcon] = React.useState(VIEW_ICONS[0]);
  const [color, setColor] = React.useState(VIEW_COLORS[0]);
  const [teamKey, setTeamKey] = React.useState<string>(ALL_TEAMS);

  // Fresh form on every open (resetting on close would flash mid-fade).
  React.useEffect(() => {
    if (open) {
      setName("");
      setIcon(VIEW_ICONS[0]);
      setColor(VIEW_COLORS[0]);
      setTeamKey(defaultTeamKey ?? ALL_TEAMS);
    }
  }, [open, defaultTeamKey]);

  const trimmed = name.trim();

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (trimmed === "") return;
    appendCustomView({
      id: newViewId(),
      name: trimmed,
      icon,
      color,
      type,
      ...(teamKey === ALL_TEAMS ? null : { teamKey }),
      // A view created from this dialog starts unfiltered; `⌥ V` is the path
      // that seeds `filter` from a view the user already narrowed.
      filter: "",
      ownerId: CURRENT_USER_ID,
    });
    onOpenChange(false);
    showToast(`Created “${trimmed}”`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} width={400} label="New view">
      <form className={css.dialog} onSubmit={submit}>
        <div className={css.dialogHeader}>
          <span className={css.dialogTitle}>New view</span>
        </div>

        <div className={css.dialogBody}>
          <div className={css.field}>
            <Input
              inputSize="sm"
              value={name}
              placeholder="View name"
              aria-label="View name"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <div className={css.field}>
            <span className={css.fieldLabel} id="new-view-team">
              Team
            </span>
            <Select
              label="Team this view opens"
              value={teamKey}
              onValueChange={setTeamKey}
              options={[
                {
                  value: ALL_TEAMS,
                  label: type === "projects" ? "All teams" : "No team (My issues)",
                },
                ...teams.map((team) => ({
                  value: team.key,
                  label: `${team.name} (${team.key})`,
                })),
              ]}
            />
          </div>

          <div className={css.field}>
            <span className={css.fieldLabel}>Icon</span>
            <div className={css.choiceRow} role="radiogroup" aria-label="View icon">
              {VIEW_ICONS.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={choice === icon}
                  aria-label={choice}
                  className={css.choice}
                  data-selected={choice === icon ? "true" : undefined}
                  onClick={() => setIcon(choice)}
                >
                  <Icon name={choice} size={16} color={color} />
                </button>
              ))}
            </div>
          </div>

          <div className={css.field}>
            <span className={css.fieldLabel}>Color</span>
            <div className={css.choiceRow} role="radiogroup" aria-label="View color">
              {VIEW_COLORS.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={choice === color}
                  aria-label={choice}
                  className={css.choice}
                  data-selected={choice === color ? "true" : undefined}
                  onClick={() => setColor(choice)}
                >
                  <span
                    className={css.swatch}
                    style={{ "--swatch-color": choice } as React.CSSProperties}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={css.dialogFooter}>
          <Button variant="primary" size={28} type="submit" disabled={trimmed === ""}>
            Create
          </Button>
        </div>
      </form>
    </Dialog>
  );
});

/* ================================================================
 * `⌥ V` — save the current view
 * ================================================================ */

/**
 * Isolated so the `useSearchParams()` read sits under its own <Suspense>
 * boundary (it opts its subtree out of static prerendering) while the page
 * around it still renders on the server.
 */
function SaveViewShortcut({
  onSave,
}: {
  onSave: (filter: string, teamKey: string | undefined) => void;
}) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const filter = searchParams.get(FILTER_PARAM) ?? "";
  // "/:ws/team/:KEY/…" — the team the filter was built on is the team the
  // saved view should reopen against (§10.7 per-view scoping).
  const segments = (pathname ?? "").split("/").filter((part) => part !== "");
  const teamKey = segments[1] === "team" ? segments[2] : undefined;

  // §11.2 "Save as view with Option/Alt+V". Registered once; useShortcut
  // always calls through to the latest handler, so `filter` stays current.
  useShortcut(
    {
      id: "views.save",
      keys: "alt+v",
      description: "Save current view",
      handler: () => onSave(filter, teamKey),
    },
    [],
  );

  return null;
}

/* ================================================================
 * "Documentation" — the in-app explainer (same pattern as the welcome doc)
 * ================================================================ */

const DOC_SECTIONS: { heading: string; body: string }[] = [
  {
    heading: "A view is a named filter",
    body: "Narrow any issue or project list with the filter bar, then press ⌥ V. The chip row you built is stored with a name, an icon and the team it was built on, and reopening the view replays it as a URL — the same link you can paste to a teammate.",
  },
  {
    heading: "Team scope is chosen when you save",
    body: "Issue lists are always team-scoped, so each view remembers its team and reopens there. Pick “No team” to save a personal cross-team slice, which opens in My issues; project views can span all teams because the projects list already does.",
  },
  {
    heading: "Where views show up",
    body: "Every saved view is listed here under Issues or Projects. Favorite one with the star on its destination and it joins the Favorites menu in the sidebar (O then F).",
  },
  {
    heading: "Editing and removing",
    body: "Open a view, change the filter chips, and press ⌥ V again to save the narrowed version alongside the original. Views are personal to this browser profile — nothing is shared until a workspace-level view model exists.",
  },
];

function DocumentationDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      width={520}
      label="About views"
    >
      <div className={css.dialog}>
        <div className={css.dialogHeader}>
          <span className={css.dialogTitle}>About views</span>
        </div>

        <div className={css.docBody}>
          <p className={css.docLead}>
            There is no hosted documentation site in this build, so the guide
            lives here — everything below describes what this workspace
            actually does.
          </p>
          {DOC_SECTIONS.map((section) => (
            <section key={section.heading}>
              <h3 className={css.docHeading}>{section.heading}</h3>
              <p className={css.docText}>{section.body}</p>
            </section>
          ))}
          <p className={css.docText}>
            Press <Kbd keys={["?"]} /> anywhere for the full keyboard map.
          </p>
        </div>

        <div className={css.dialogFooter}>
          <Button variant="primary" size={28} onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

/* ================================================================
 * Table
 * ================================================================ */

const ViewRow = observer(function ViewRow({
  view,
  workspace,
  fallbackTeamKey,
  firstInGroup,
  lastInGroup,
}: {
  view: CustomView;
  workspace: string;
  /** Team an issue view without its own `teamKey` opens against. */
  fallbackTeamKey: string | undefined;
  firstInGroup: boolean;
  lastInGroup: boolean;
}) {
  const store = useStore();
  const owner = store.get("User", view.ownerId);
  const ownerName =
    owner === undefined
      ? view.ownerId
      : owner.displayName !== ""
        ? owner.displayName
        : owner.name;
  const team = view.teamKey === undefined ? undefined : store.teamByKey(view.teamKey);

  return (
    <ListRow
      href={viewHref(workspace, view, fallbackTeamKey)}
      height={40}
      firstInGroup={firstInGroup}
      lastInGroup={lastInGroup}
      listKey={view.id}
    >
      <div className={css.rowGrid}>
        <span className={css.nameCell}>
          <span className={css.viewIcon}>
            <Icon name={view.icon} size={16} color={view.color} />
          </span>
          <span className={css.viewName}>{view.name}</span>
          {view.teamKey !== undefined ? (
            <span className={css.scopeChip} title={team?.name ?? view.teamKey}>
              {view.teamKey}
            </span>
          ) : null}
        </span>
        <span className={css.ownerCell}>
          <Avatar
            initials={owner?.initials ?? "?"}
            color={owner?.avatarColor}
            size={16}
            src={owner?.avatarUrl}
          />
          <span className={css.ownerName}>{ownerName}</span>
        </span>
      </div>
    </ListRow>
  );
});

/* ================================================================
 * ViewsPage
 * ================================================================ */

export const ViewsPage = observer(function ViewsPage({
  workspace,
  tab,
  teamKey,
}: {
  workspace: string;
  tab: ViewsTab;
  /**
   * Team scope (`/:ws/team/:KEY/views/issues`). Present = list only the views
   * saved against that team and pre-select it in the create dialog; absent =
   * the workspace-wide page, which lists everything.
   */
  teamKey?: string;
}) {
  const store = useStore();
  const views = useCustomViews();
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [docsOpen, setDocsOpen] = React.useState(false);

  // Views saved before per-view scoping (or against a team since removed)
  // resolve against the first team in the pool rather than a dead route.
  const fallbackTeamKey = store
    .all("Team")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)[0]?.key;

  // "Name ↓" is the only sort this phase, so it is applied here rather than
  // held as state (the header marker is static to match).
  const rows = React.useMemo(
    () =>
      views
        .filter(
          (view) =>
            view.type === tab &&
            (teamKey === undefined ||
              view.teamKey?.toUpperCase() === teamKey.toUpperCase()),
        )
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name)),
    [views, tab, teamKey],
  );

  const saveCurrentView = React.useCallback(
    (filter: string, teamKey: string | undefined): void => {
      // Read at fire time rather than closing over `views`: the shortcut is
      // registered once and must never append onto a stale list.
      const existing = readCustomViews();
      appendCustomView({
        id: newViewId(),
        name: `Saved view ${existing.length + 1}`,
        icon: VIEW_ICONS[0],
        color: VIEW_COLORS[0],
        type: tab,
        ...(teamKey === undefined ? null : { teamKey }),
        filter,
        ownerId: CURRENT_USER_ID,
      });
      showToast(
        teamKey === undefined
          ? "Saved current view"
          : `Saved current view for ${teamKey}`,
      );
    },
    [tab],
  );

  return (
    <>
      <Header
        title="Views"
        right={
          <Button
            size={28}
            icon={<Icon name="Plus" size={14} />}
            onClick={() => setDialogOpen(true)}
          >
            New view
          </Button>
        }
        tabs={
          // A team has one views route, so its page carries no tab strip.
          teamKey !== undefined ? undefined : (
          <div className={shellStyles.tabStrip}>
            {VIEW_TABS.map(({ id, label }) => (
              <Link
                key={id}
                href={`/${workspace}/views/${id}`}
                className={shellStyles.tab}
                data-active={tab === id ? "true" : undefined}
              >
                {label}
              </Link>
            ))}
          </div>
          )
        }
      />

      <div className={css.body}>
        {rows.length === 0 ? (
          <div className={css.emptyFill}>
            <EmptyState
              illustration={<LayeredStack />}
              heading="Views"
              primary={
                <Button
                  variant="primary"
                  size={32}
                  onClick={() => setDialogOpen(true)}
                >
                  Create new view
                </Button>
              }
              secondary={
                // No hosted docs site in this build — the explainer is
                // in-app, the same pattern the welcome document's resource
                // links use.
                <Button
                  variant="secondary"
                  size={32}
                  onClick={() => setDocsOpen(true)}
                >
                  Documentation
                </Button>
              }
            >
              A view is a set of filters you gave a name, so the slice of work
              you care about is one click away instead of rebuilt every
              morning. Save one for yourself, share it with the team, or
              favorite it to keep it in the sidebar.
              <span className={css.emptyHint}>
                You can also save any view with
                <span className={css.emptyHintKeys}>
                  <Kbd keys={["⌥", "V"]} />
                </span>
              </span>
            </EmptyState>
          </div>
        ) : (
          <div className={css.viewport} tabIndex={0} data-scroll-container="true">
            <div className={css.headerRow}>
              <span className={css.headerLabel}>
                Name
                <span className={css.sortGlyph} aria-hidden="true">
                  ↓
                </span>
              </span>
              <span className={css.headerLabel}>Owner</span>
            </div>
            {rows.map((view, index) => (
              <ViewRow
                key={view.id}
                view={view}
                workspace={workspace}
                fallbackTeamKey={fallbackTeamKey}
                firstInGroup={index === 0}
                lastInGroup={index === rows.length - 1}
              />
            ))}
          </div>
        )}
      </div>

      <NewViewDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        type={tab}
        defaultTeamKey={teamKey}
      />
      <DocumentationDialog open={docsOpen} onOpenChange={setDocsOpen} />

      <React.Suspense fallback={null}>
        <SaveViewShortcut onSave={saveCurrentView} />
      </React.Suspense>
    </>
  );
});
