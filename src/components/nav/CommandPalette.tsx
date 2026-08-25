"use client";

/**
 * Command palette + workspace search — MASTER_PROMPT.md §13 (DOCUMENTED),
 * docs/analysis/research-nav-auth.md §2 "Search & command palette".
 *
 * <CommandPaletteHost/> is a mount-once host (workspace layout) that owns the
 * open state and registers the two global entries through the §12 registry:
 *   mod+k → command mode · "/" → search mode
 * Any other surface opens it with openCommandPalette(mode) (window event, so
 * callers never need the host's identity).
 *
 * Everything is served from the local MobX pool — no network round-trip, ever
 * (§13 "<100ms first paint", §25). Matching is a case-insensitive
 * prefix > word-start > subsequence score, capped at 8 rows per entity group.
 *
 * Typed entity prefixes (§13): "i " issues · "p " projects · "u " users ·
 * "t " teams · "l " labels. ("f " favorites / "d " documents arrive with
 * those surfaces.)
 *
 * Grouping is context-first (§13 "groups prioritized by current context"):
 * on an issue route an "Issue" group is hoisted above everything with actions
 * that mutate THAT issue optimistically (§6.8) through an inline sub-list;
 * likewise "Project" on a project route. Otherwise: Commands, Issues,
 * Projects, Teams, Users, Labels.
 *
 * Keyboard: ↑/↓/Enter/Escape are handled locally on the input — never through
 * the global registry (which skips editable targets anyway). Escape follows
 * the §6.9 hierarchy: leave the sub-list → clear the text → close.
 *
 * Radix Dialog is used directly rather than the ui/Dialog primitive: the
 * palette is TOP-anchored (15vh), and the primitive's geometry/keyframes are
 * built around a vertically-centred panel. The surface re-states the same
 * enter/exit vocabulary in commandpalette.module.css.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type JSX,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
} from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { observer } from "mobx-react-lite";
import { useParams, usePathname, useRouter } from "next/navigation";
import { Avatar } from "@/components/ui/Avatar";
import { Kbd } from "@/components/ui/Kbd";
import { Icon } from "@/components/icons/Icon";
import { PriorityIcon, StatusIcon } from "@/components/icons/StatusIcon";
import { ProjectStatusIcon, projectIconFor } from "@/components/projects/glyphs";
import { openCreateIssue } from "@/components/issues/CreateIssueModal";
import { useSyncClient } from "@/lib/data/DataProvider";
import {
  FILTER_PARAM,
  parseFilters,
  serializeFilters,
} from "@/lib/issues/filters";
import { useViewPreference } from "@/lib/issues/viewPrefs";
import { formatKeys, useShortcut } from "@/lib/keyboard";
import type {
  IssueData,
  Priority,
  ProjectData,
  ProjectStatusCategory,
} from "@/lib/data/types";
import styles from "./commandpalette.module.css";

/* ================================================================
 * Module-level open event (sidebar search row, header, empty states…)
 * ================================================================ */

export type PaletteMode = "command" | "search";

const OPEN_EVENT = "linear:command-palette:open";

/** Ask the mounted <CommandPaletteHost/> to open. Safe to call during SSR. */
export function openCommandPalette(mode: PaletteMode = "command"): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<PaletteMode>(OPEN_EVENT, { detail: mode }));
}

/* ================================================================
 * Matching — prefix > word-start > subsequence (§13 "fuzzy commands")
 * ================================================================ */

/** Characters that start a "word" for word-boundary scoring. */
const WORD_BREAK = /[\s\-_/.:,()[\]]/;

function isWordStart(haystack: string, index: number): boolean {
  return index === 0 || WORD_BREAK.test(haystack.charAt(index - 1));
}

/**
 * Score `needle` against `haystack`; negative means "no match".
 * exact 1000 > prefix ~900 > word-start ~700 > substring ~500 > subsequence
 * ~300. Longer haystacks are nudged down so short, tight matches float up.
 */
function scoreText(haystack: string, needle: string): number {
  if (needle === "") return 0;
  const h = haystack.toLowerCase();
  const n = needle.toLowerCase();
  if (h === n) return 1000;

  const at = h.indexOf(n);
  if (at === 0) return 900 - Math.min(h.length - n.length, 60);
  if (at > 0) {
    return (isWordStart(h, at) ? 700 : 500) - Math.min(at, 60);
  }

  // Subsequence: every needle char must appear in order.
  let score = 300;
  let from = 0;
  let previous = -1;
  for (let i = 0; i < n.length; i++) {
    const found = h.indexOf(n.charAt(i), from);
    if (found < 0) return -1;
    if (found === previous + 1) score += 6; // contiguous run
    if (isWordStart(h, found)) score += 4; // hit a word boundary
    previous = found;
    from = found + 1;
  }
  return score - Math.min(h.length, 80) / 8;
}

/* ================================================================
 * Item model
 * ================================================================ */

interface PaletteItem {
  key: string;
  label: string;
  icon: ReactNode;
  /** Muted right-aligned text (current value, issue identifier, team key…). */
  hint?: string;
  /** Registry key string ("mod+k", "g i") rendered as keycaps. */
  keys?: string;
  /** Sub-list openers keep the palette open. */
  keepOpen?: boolean;
  onSelect: () => void;
}

interface PaletteGroup {
  key: string;
  heading: string;
  items: PaletteItem[];
}

/** An inline sub-list of options (Change status…, Set priority…, Assign…). */
interface SubList {
  key: string;
  title: string;
  placeholder: string;
  items: PaletteItem[];
}

/** Filter + rank commands (no cap — the command set is small and curated). */
function rankItems(items: PaletteItem[], needle: string): PaletteItem[] {
  if (needle === "") return items;
  const scored: { item: PaletteItem; score: number }[] = [];
  for (const item of items) {
    const score = scoreText(item.label, needle);
    if (score >= 0) scored.push({ item, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.item);
}

const GROUP_LIMIT = 8; // §13 — 8 rows per entity group

/**
 * Filter + rank store rows across several fields (first field is primary;
 * later ones are penalised so a title hit outranks an identifier hit).
 * An empty needle keeps the caller's own order (prefix-only queries).
 */
function rankRows<T>(
  rows: T[],
  needle: string,
  fields: (row: T) => string[],
): T[] {
  if (needle === "") return rows.slice(0, GROUP_LIMIT);
  const scored: { row: T; score: number }[] = [];
  for (const row of rows) {
    let best = -1;
    const values = fields(row);
    for (let i = 0; i < values.length; i++) {
      const raw = scoreText(values[i], needle);
      const adjusted = raw < 0 ? -1 : raw - i * 25;
      if (adjusted > best) best = adjusted;
    }
    if (best >= 0) scored.push({ row, score: best });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, GROUP_LIMIT).map((entry) => entry.row);
}

/* ================================================================
 * Typed prefixes (§13)
 * ================================================================ */

type EntityKind = "issue" | "project" | "user" | "team" | "label";

const PREFIXES: Record<string, EntityKind> = {
  i: "issue",
  p: "project",
  u: "user",
  t: "team",
  l: "label",
};

/** "p driver" → { kind: "project", text: "driver" }; else the raw text. */
function parsePrefix(raw: string): { kind: EntityKind | null; text: string } {
  const match = /^([a-z])[ ](.*)$/i.exec(raw);
  if (match === null) return { kind: null, text: raw };
  const kind = PREFIXES[match[1].toLowerCase()];
  if (kind === undefined) return { kind: null, text: raw };
  return { kind, text: match[2] };
}

/* ================================================================
 * Small local glyphs (not in the sprite sheet)
 * ================================================================ */

/** ⌘ — square with four tangent loops (command mode input glyph). */
function GlyphCommand(): JSX.Element {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M4.1 1.75a2.35 2.35 0 1 0 0 4.7 2.35 2.35 0 0 0 0-4.7Zm0 1.3a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM11.9 1.75a2.35 2.35 0 1 0 0 4.7 2.35 2.35 0 0 0 0-4.7Zm0 1.3a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM4.1 9.55a2.35 2.35 0 1 0 0 4.7 2.35 2.35 0 0 0 0-4.7Zm0 1.3a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1ZM11.9 9.55a2.35 2.35 0 1 0 0 4.7 2.35 2.35 0 0 0 0-4.7Zm0 1.3a1.05 1.05 0 1 1 0 2.1 1.05 1.05 0 0 1 0-2.1Z"
      />
      <path
        fillRule="evenodd"
        d="M5.4 5.4h5.2v5.2H5.4V5.4Zm1.3 1.3v2.6h2.6V6.7H6.7Z"
      />
    </svg>
  );
}

/** Half-filled disc — theme toggle. */
function GlyphTheme(): JSX.Element {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M8 1.85a6.15 6.15 0 1 0 0 12.3 6.15 6.15 0 0 0 0-12.3Zm0 1.3a4.85 4.85 0 1 1 0 9.7 4.85 4.85 0 0 1 0-9.7Z"
      />
      <path d="M8 3.15a4.85 4.85 0 0 1 0 9.7V3.15Z" />
    </svg>
  );
}

/** Dashed "unassigned person" — assignee / lead placeholder. */
function GlyphPersonDashed(): JSX.Element {
  return <Icon name="PersonDashed" size={16} color="currentColor" />;
}

/* ================================================================
 * Labels + route helpers
 * ================================================================ */

const PRIORITY_LABELS: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

const PRIORITY_VALUES: Priority[] = [0, 1, 2, 3, 4];

const PROJECT_STATUS_LABELS: Record<ProjectStatusCategory, string> = {
  backlog: "Backlog",
  planned: "Planned",
  started: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

const PROJECT_STATUS_VALUES: ProjectStatusCategory[] = [
  "backlog",
  "planned",
  "started",
  "completed",
  "canceled",
];

/** "Research Work" → "research-work" (issue route: /issue/[id]/[slug]). */
function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

/**
 * Keycap chips for a registry key string. formatKeys() inserts a "then"
 * separator for sequences ("g i" → G · then · I); the captured tooltip idiom
 * shows sequences as bare chips (G M), so the separator is dropped.
 */
function keycaps(keys: string): string[] {
  return formatKeys(keys).filter((chip) => chip !== "then");
}

/**
 * Theme toggle (§3 boot contract): flip html.dark and persist darkMode into
 * localStorage.splashScreenConfig, which the pre-paint boot script reads.
 */
function toggleTheme(): void {
  const root = document.documentElement;
  const dark = !root.classList.contains("dark");
  root.classList.toggle("dark", dark);
  try {
    const raw = window.localStorage.getItem("splashScreenConfig");
    const config: Record<string, unknown> =
      raw !== null ? (JSON.parse(raw) as Record<string, unknown>) : {};
    config.darkMode = dark;
    window.localStorage.setItem("splashScreenConfig", JSON.stringify(config));
  } catch {
    /* storage unavailable — the class flip still applies for this session */
  }
}

/** ViewPreference key for routes that own a list↔board layout (§11.1). */
function layoutViewKeyFor(segments: string[]): string | null {
  if (segments[1] === "team" && segments[2] !== undefined && segments[3] === "all") {
    return `team/${segments[2].toUpperCase()}/all`;
  }
  return null;
}

/**
 * Does the route currently on screen render an issue list that reads
 * `?filter=`? Those are the views a label chip can be applied *in place* to;
 * anywhere else the palette navigates to a team's issue list instead of
 * silently dropping the filter on a page that ignores it.
 */
function isFilterableIssueView(segments: string[]): boolean {
  if (segments[1] === "my-issues") return true;
  if (segments[1] !== "team" || segments[2] === undefined) return false;
  return (
    segments[3] === "all" ||
    segments[3] === "triage" ||
    segments[3] === "cycle" ||
    (segments[3] === "views" && segments[4] === "issues")
  );
}

/**
 * Merge a `labels` chip into a serialized chip row, adding the label to an
 * existing labels chip rather than stacking a second one (two `includesAny`
 * chips would AND, which is never what picking a second label means).
 */
function withLabelFilter(rawFilter: string, labelId: string): string {
  const filters = parseFilters(rawFilter);
  const existing = filters.find((filter) => filter.property === "labels");
  if (existing === undefined) {
    return serializeFilters([
      ...filters,
      { property: "labels", operator: "includesAny", values: [labelId] },
    ]);
  }
  if (existing.values.includes(labelId)) return serializeFilters(filters);
  return serializeFilters(
    filters.map((filter) =>
      filter === existing
        ? { ...filter, values: [...filter.values, labelId] }
        : filter,
    ),
  );
}

/** Placeholder key for the hook when no layout-bearing view is active. */
const NO_LAYOUT_VIEW = "palette/no-layout-view";

/* ================================================================
 * Host
 * ================================================================ */

export const CommandPaletteHost = observer(function CommandPaletteHost(): JSX.Element {
  const client = useSyncClient();
  const store = client.store;
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ workspace: string }>();
  const baseId = useId();

  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<PaletteMode>("command");
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [subList, setSubList] = useState<SubList | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const lastGroupsRef = useRef<PaletteGroup[]>([]);

  const workspace = params.workspace || client.workspaceSlug;

  /* ---------------- open / close ---------------- */

  // Reset on the rising edge only: clearing on close would flash an empty
  // panel through the 100ms exit fade (same idiom as PickerMenu).
  const openPalette = useCallback((next: PaletteMode) => {
    setMode(next);
    setQuery("");
    setActiveIndex(0);
    setSubList(null);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
  }, []);

  /* ---------------- global entries (§12 registry) ---------------- */

  useShortcut({
    id: "palette.open",
    keys: "mod+k",
    scope: "global",
    description: "Open command palette",
    // Reachable while typing anywhere, including inside the palette itself
    // (where it toggles the surface closed).
    allowInInput: true,
    handler: () => {
      if (open) close();
      else openPalette("command");
    },
  });

  useShortcut({
    id: "palette.search",
    keys: "/",
    scope: "global",
    description: "Search",
    handler: () => openPalette("search"),
  });

  // openCommandPalette() bridge.
  useEffect(() => {
    const onOpen = (event: Event): void => {
      const detail = (event as CustomEvent<PaletteMode>).detail;
      openPalette(detail === "search" ? "search" : "command");
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [openPalette]);

  /* ---------------- route context (§13 contextual grouping) ---------------- */

  const segments = (pathname ?? "").split("/").filter((part) => part !== "");
  const issueParam = segments[1] === "issue" ? segments[2] : undefined;
  const projectParam = segments[1] === "project" ? segments[2] : undefined;

  const contextIssue =
    issueParam !== undefined
      ? store.issueByIdentifier(decodeURIComponent(issueParam))
      : undefined;
  const contextProject =
    projectParam !== undefined
      ? store.projectBySlug(decodeURIComponent(projectParam))
      : undefined;

  const layoutViewKey = layoutViewKeyFor(segments);
  const { pref, update } = useViewPreference(layoutViewKey ?? NO_LAYOUT_VIEW);

  /* ---------------- navigation ---------------- */

  const go = useCallback(
    (path: string) => {
      router.push(`/${workspace}${path}`);
    },
    [router, workspace],
  );

  /**
   * §11.2 "apply as a label filter on the current view". Applied in place on
   * an issue list that reads `?filter=`; otherwise the label's own team's
   * issue list (workspace labels fall back to the first team, since there is
   * no cross-team issue route to land on).
   */
  const applyLabelFilter = useCallback(
    (labelId: string, labelTeamId: string | undefined) => {
      const parts = (pathname ?? "").split("/").filter((part) => part !== "");
      const inPlace = isFilterableIssueView(parts);

      const currentFilter = inPlace
        ? new URLSearchParams(window.location.search).get(FILTER_PARAM) ?? ""
        : "";
      const nextFilter = withLabelFilter(currentFilter, labelId);

      if (inPlace) {
        // Preserve every other query parameter (layout, grouping deep links).
        const search = new URLSearchParams(window.location.search);
        search.delete(FILTER_PARAM);
        const rest: string[] = [];
        search.forEach((value, key) => {
          rest.push(`${key}=${encodeURIComponent(value)}`);
        });
        if (nextFilter !== "") rest.push(`${FILTER_PARAM}=${nextFilter}`);
        const query = rest.join("&");
        router.push(query === "" ? (pathname ?? "") : `${pathname}?${query}`);
        return;
      }

      const teams = store.all("Team").slice().sort((a, b) => a.sortOrder - b.sortOrder);
      const teamKey =
        (labelTeamId !== undefined
          ? teams.find((team) => team.id === labelTeamId)?.key
          : undefined) ?? teams[0]?.key;
      if (teamKey === undefined) return;
      go(`/team/${teamKey}/all?${FILTER_PARAM}=${nextFilter}`);
    },
    [go, pathname, router, store],
  );

  const openSubList = useCallback((next: SubList) => {
    setSubList(next);
    setQuery("");
    setActiveIndex(0);
  }, []);

  /* ---------------- contextual actions ---------------- */

  /**
   * Issue actions — every option applies through client.mutate (optimistic,
   * reconciled by the delta stream) and closes the palette immediately (§6.8).
   */
  function issueActions(issue: IssueData): PaletteItem[] {
    const state = store.get("WorkflowState", issue.stateId);
    const assignee =
      issue.assigneeId !== undefined ? store.get("User", issue.assigneeId) : undefined;
    const users = store
      .all("User")
      .slice()
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return [
      {
        key: "issue.status",
        label: "Change status…",
        keys: "s",
        hint: state?.name,
        keepOpen: true,
        icon:
          state !== undefined ? (
            <StatusIcon category={state.category} color={state.color} size={16} />
          ) : (
            <Icon name="Hash" size={16} />
          ),
        onSelect: () =>
          openSubList({
            key: "issue.status",
            title: "Change status",
            placeholder: "Change status to…",
            items: store.statesForTeam(issue.teamId).map((option) => ({
              key: option.id,
              label: option.name,
              icon: (
                <StatusIcon category={option.category} color={option.color} size={16} />
              ),
              onSelect: () => client.mutate.updateIssue(issue.id, { stateId: option.id }),
            })),
          }),
      },
      {
        key: "issue.priority",
        label: "Set priority…",
        keys: "p",
        hint: PRIORITY_LABELS[issue.priority],
        keepOpen: true,
        icon: <PriorityIcon priority={issue.priority} size={16} />,
        onSelect: () =>
          openSubList({
            key: "issue.priority",
            title: "Set priority",
            placeholder: "Set priority to…",
            items: PRIORITY_VALUES.map((value) => ({
              key: String(value),
              label: PRIORITY_LABELS[value],
              icon: <PriorityIcon priority={value} size={16} />,
              onSelect: () => client.mutate.updateIssue(issue.id, { priority: value }),
            })),
          }),
      },
      {
        key: "issue.assignee",
        label: "Assign…",
        keys: "a",
        hint: assignee?.displayName,
        keepOpen: true,
        icon:
          assignee !== undefined ? (
            <Avatar size={16} initials={assignee.initials} color={assignee.avatarColor} />
          ) : (
            <GlyphPersonDashed />
          ),
        onSelect: () =>
          openSubList({
            key: "issue.assignee",
            title: "Assign",
            placeholder: "Assign to…",
            items: [
              {
                key: "none",
                label: "No assignee",
                icon: <GlyphPersonDashed />,
                // Wire `null` clears an optional field (JSON cannot carry
                // undefined); the pool normalises it back on merge (§19).
                onSelect: () =>
                  client.queue.enqueue("update", "Issue", issue.id, {
                    assigneeId: null,
                  }),
              },
              ...users.map((user) => ({
                key: user.id,
                label: user.displayName,
                icon: (
                  <Avatar size={16} initials={user.initials} color={user.avatarColor} />
                ),
                onSelect: () =>
                  client.mutate.updateIssue(issue.id, { assigneeId: user.id }),
              })),
            ],
          }),
      },
    ];
  }

  /** Project actions — same optimistic pipeline via mutate.updateProject. */
  function projectActions(project: ProjectData): PaletteItem[] {
    const lead =
      project.leadId !== undefined ? store.get("User", project.leadId) : undefined;
    const users = store
      .all("User")
      .slice()
      .sort((a, b) => a.displayName.localeCompare(b.displayName));

    return [
      {
        key: "project.status",
        label: "Change status…",
        hint: PROJECT_STATUS_LABELS[project.statusCategory],
        keepOpen: true,
        icon: (
          <ProjectStatusIcon category={project.statusCategory} color={project.color} />
        ),
        onSelect: () =>
          openSubList({
            key: "project.status",
            title: "Change status",
            placeholder: "Change project status to…",
            items: PROJECT_STATUS_VALUES.map((category) => ({
              key: category,
              label: PROJECT_STATUS_LABELS[category],
              icon: <ProjectStatusIcon category={category} />,
              onSelect: () =>
                client.mutate.updateProject(project.id, { statusCategory: category }),
            })),
          }),
      },
      {
        key: "project.priority",
        label: "Set priority…",
        hint: PRIORITY_LABELS[project.priority],
        keepOpen: true,
        icon: <PriorityIcon priority={project.priority} size={16} />,
        onSelect: () =>
          openSubList({
            key: "project.priority",
            title: "Set priority",
            placeholder: "Set priority to…",
            items: PRIORITY_VALUES.map((value) => ({
              key: String(value),
              label: PRIORITY_LABELS[value],
              icon: <PriorityIcon priority={value} size={16} />,
              onSelect: () =>
                client.mutate.updateProject(project.id, { priority: value }),
            })),
          }),
      },
      {
        key: "project.lead",
        label: "Set lead…",
        hint: lead?.displayName,
        keepOpen: true,
        icon:
          lead !== undefined ? (
            <Avatar size={16} initials={lead.initials} color={lead.avatarColor} />
          ) : (
            <GlyphPersonDashed />
          ),
        onSelect: () =>
          openSubList({
            key: "project.lead",
            title: "Set lead",
            placeholder: "Set lead to…",
            items: [
              {
                key: "none",
                label: "No lead",
                icon: <GlyphPersonDashed />,
                onSelect: () =>
                  client.queue.enqueue("update", "Project", project.id, {
                    leadId: null,
                  }),
              },
              ...users.map((user) => ({
                key: user.id,
                label: user.displayName,
                icon: (
                  <Avatar size={16} initials={user.initials} color={user.avatarColor} />
                ),
                onSelect: () =>
                  client.mutate.updateProject(project.id, { leadId: user.id }),
              })),
            ],
          }),
      },
      {
        key: "project.issues",
        label: "Open project issues",
        icon: projectIconFor(project),
        onSelect: () => go(`/project/${project.slug}/issues`),
      },
    ];
  }

  /* ---------------- commands ---------------- */

  function commands(): PaletteItem[] {
    const items: PaletteItem[] = [
      {
        key: "cmd.create-issue",
        label: "Create new issue",
        keys: "c",
        icon: <Icon name="Compose" size={16} />,
        onSelect: () => openCreateIssue(),
      },
      {
        key: "cmd.inbox",
        label: "Go to Inbox",
        keys: "g i",
        icon: <Icon name="Inbox" size={16} />,
        onSelect: () => go("/inbox"),
      },
      {
        key: "cmd.my-issues",
        label: "Go to My Issues",
        keys: "g m",
        icon: <Icon name="MyIssues" size={16} />,
        onSelect: () => go("/my-issues/assigned"),
      },
      {
        key: "cmd.projects",
        label: "Go to Projects",
        icon: <Icon name="Project" size={16} />,
        onSelect: () => go("/projects/all"),
      },
      {
        key: "cmd.views",
        label: "Go to Views",
        icon: <Icon name="CustomView" size={16} />,
        onSelect: () => go("/views/issues"),
      },
      {
        key: "cmd.loops",
        label: "Go to Loops",
        icon: <Icon name="Loop" size={16} />,
        onSelect: () => go("/loops"),
      },
      {
        key: "cmd.agent",
        label: "Open Agent",
        keys: "mod+j",
        icon: <Icon name="Agent" size={16} />,
        onSelect: () => go("/agent"),
      },
      {
        key: "cmd.theme",
        label: "Toggle theme",
        icon: <GlyphTheme />,
        onSelect: toggleTheme,
      },
    ];

    // Only offered where a view actually owns a layout preference (§11.1).
    if (layoutViewKey !== null) {
      const board = pref.layout === "board";
      items.push({
        key: "cmd.layout",
        label: board ? "Switch to list layout" : "Switch to board layout",
        keys: "mod+b",
        icon: <Icon name="SidePanel" size={16} />,
        onSelect: () => update({ layout: board ? "list" : "board" }),
      });
    }

    return items;
  }

  /* ---------------- entity search groups ---------------- */

  function entityGroups(kind: EntityKind | null, needle: string): PaletteGroup[] {
    const groups: PaletteGroup[] = [];
    const wants = (candidate: EntityKind): boolean =>
      kind === null || kind === candidate;

    if (wants("issue")) {
      const rows = rankRows(
        store
          .all("Issue")
          .filter((issue) => issue.archivedAt === undefined)
          .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
        needle,
        (issue) => [issue.title, issue.identifier],
      );
      if (rows.length > 0) {
        groups.push({
          key: "issues",
          heading: "Issues",
          items: rows.map((issue) => {
            const state = store.get("WorkflowState", issue.stateId);
            return {
              key: issue.id,
              label: issue.title,
              hint: issue.identifier,
              icon:
                state !== undefined ? (
                  <StatusIcon category={state.category} color={state.color} size={16} />
                ) : (
                  <Icon name="Hash" size={16} />
                ),
              onSelect: () =>
                go(`/issue/${issue.identifier}/${slugifyTitle(issue.title)}`),
            };
          }),
        });
      }
    }

    if (wants("project")) {
      const rows = rankRows(
        store.all("Project").sort((a, b) => a.sortOrder - b.sortOrder),
        needle,
        (project) => [project.name],
      );
      if (rows.length > 0) {
        groups.push({
          key: "projects",
          heading: "Projects",
          items: rows.map((project) => ({
            key: project.id,
            label: project.name,
            hint: PROJECT_STATUS_LABELS[project.statusCategory],
            icon: (
              <ProjectStatusIcon
                category={project.statusCategory}
                color={project.color}
              />
            ),
            onSelect: () => go(`/project/${project.slug}/overview`),
          })),
        });
      }
    }

    if (wants("team")) {
      const rows = rankRows(
        store.all("Team").sort((a, b) => a.sortOrder - b.sortOrder),
        needle,
        (team) => [team.name, team.key],
      );
      if (rows.length > 0) {
        groups.push({
          key: "teams",
          heading: "Teams",
          items: rows.map((team) => ({
            key: team.id,
            label: team.name,
            hint: team.key,
            icon: <Icon name={team.icon} size={16} color={team.color} />,
            onSelect: () => go(`/team/${team.key}/all`),
          })),
        });
      }
    }

    if (wants("user")) {
      const rows = rankRows(
        store.all("User").sort((a, b) => a.displayName.localeCompare(b.displayName)),
        needle,
        (user) => [user.displayName, user.name, user.email],
      );
      if (rows.length > 0) {
        groups.push({
          key: "users",
          heading: "Users",
          items: rows.map((user) => ({
            key: user.id,
            label: user.displayName,
            hint: user.email,
            icon: <Avatar size={16} initials={user.initials} color={user.avatarColor} />,
            // The member directory IS the profile view (§17.2): it carries
            // the avatar, email, role, join date and the row's actions. The
            // query parameter focuses and highlights that member's row.
            onSelect: () => go(`/members?member=${encodeURIComponent(user.id)}`),
          })),
        });
      }
    }

    if (wants("label")) {
      const rows = rankRows(
        store
          .all("Label")
          .filter((label) => !label.isGroup)
          .sort((a, b) => a.name.localeCompare(b.name)),
        needle,
        (label) => [label.name],
      );
      if (rows.length > 0) {
        groups.push({
          key: "labels",
          heading: "Labels",
          items: rows.map((label) => ({
            key: label.id,
            label: label.name,
            hint: "Filter by label",
            icon: (
              <span className={styles.labelDot} style={{ background: label.color }} />
            ),
            onSelect: () => applyLabelFilter(label.id, label.teamId),
          })),
        });
      }
    }

    return groups;
  }

  /* ---------------- assemble ---------------- */

  const parsed = parsePrefix(query);
  const needle = parsed.text.trim();

  let groups: PaletteGroup[] = [];
  if (!open) {
    // Closed: skip all store scans (also keeps SSR/first paint free of work).
    groups = [];
  } else if (subList !== null) {
    groups = [
      { key: subList.key, heading: subList.title, items: rankItems(subList.items, needle) },
    ];
  } else if (mode === "search") {
    if (needle === "" && parsed.kind === null) {
      // §13: opening search shows recent issues before anything is typed.
      const recent = store
        .all("Issue")
        .filter((issue) => issue.archivedAt === undefined)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))
        .slice(0, GROUP_LIMIT);
      groups =
        recent.length === 0
          ? []
          : [
              {
                key: "recent",
                heading: "Recent issues",
                items: recent.map((issue) => {
                  const state = store.get("WorkflowState", issue.stateId);
                  return {
                    key: issue.id,
                    label: issue.title,
                    hint: issue.identifier,
                    icon:
                      state !== undefined ? (
                        <StatusIcon
                          category={state.category}
                          color={state.color}
                          size={16}
                        />
                      ) : (
                        <Icon name="Hash" size={16} />
                      ),
                    onSelect: () =>
                      go(`/issue/${issue.identifier}/${slugifyTitle(issue.title)}`),
                  };
                }),
              },
            ];
    } else {
      groups = entityGroups(parsed.kind, needle);
    }
  } else {
    // Command mode — context first (§13), then commands, then entities.
    if (parsed.kind === null) {
      if (contextIssue !== undefined) {
        const items = rankItems(issueActions(contextIssue), needle);
        if (items.length > 0) {
          groups.push({ key: "context-issue", heading: "Issue", items });
        }
      }
      if (contextProject !== undefined) {
        const items = rankItems(projectActions(contextProject), needle);
        if (items.length > 0) {
          groups.push({ key: "context-project", heading: "Project", items });
        }
      }
      const commandItems = rankItems(commands(), needle);
      if (commandItems.length > 0) {
        groups.push({ key: "commands", heading: "Commands", items: commandItems });
      }
    }
    if (needle !== "" || parsed.kind !== null) {
      groups.push(...entityGroups(parsed.kind, needle));
    }
  }

  // Keep the last rendered result set through the 100ms exit fade so the
  // panel dissolves with its content instead of flashing "No results".
  if (open) lastGroupsRef.current = groups;
  const shown = open ? groups : lastGroupsRef.current;

  // Flat ordering drives the keyboard cursor across group boundaries.
  const flat: PaletteItem[] = [];
  const offsets: number[] = [];
  for (const group of shown) {
    offsets.push(flat.length);
    flat.push(...group.items);
  }
  const active = flat.length === 0 ? -1 : Math.min(activeIndex, flat.length - 1);
  const activeId = active >= 0 ? `${baseId}-opt-${active}` : undefined;

  /* ---------------- interaction ---------------- */

  const run = useCallback(
    (item: PaletteItem) => {
      // §6.8 close-then-sync: the handler applies its optimistic mutation or
      // navigation synchronously, then the surface closes. Sub-list openers
      // opt out (they replace the list in place).
      item.onSelect();
      if (item.keepOpen !== true) close();
    },
    [close],
  );

  const step = useCallback(
    (delta: number) => {
      setActiveIndex((current) => {
        if (flat.length === 0) return 0;
        const from = Math.min(current, flat.length - 1);
        return (from + delta + flat.length) % flat.length;
      });
    },
    [flat.length],
  );

  const onInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>): void => {
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        step(1);
        break;
      case "ArrowUp":
        event.preventDefault();
        step(-1);
        break;
      case "Enter": {
        event.preventDefault();
        const item = active >= 0 ? flat[active] : undefined;
        if (item !== undefined) run(item);
        break;
      }
      case "Backspace": {
        // Leaving a sub-list by erasing past its start reads like a token.
        if (subList !== null && query === "") {
          event.preventDefault();
          setSubList(null);
          setActiveIndex(0);
        }
        break;
      }
      case "Escape": {
        // §6.9 order: nested sub-list → clear the text → close the dialog.
        // preventDefault marks the native event so Radix's dismissable layer
        // stands down — this handler owns Escape.
        event.preventDefault();
        if (subList !== null) {
          setSubList(null);
          setQuery("");
          setActiveIndex(0);
        } else if (query !== "") {
          setQuery("");
          setActiveIndex(0);
        } else {
          close();
        }
        break;
      }
      default:
        break;
    }
  };

  // Keep the keyboard cursor visible while arrowing a long result list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active, subList]);

  /* ---------------- render ---------------- */

  const placeholder =
    subList !== null
      ? subList.placeholder
      : mode === "search"
        ? "Search issues, projects, users…"
        : "Type a command or search…";

  return (
    <RadixDialog.Root
      open={open}
      onOpenChange={(next) => {
        if (!next) close();
      }}
    >
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content
          className={styles.content}
          aria-label="Command palette"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            // Deterministic focus on the input (never the first row).
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            // Escape landing outside the input (edge case after Tab): §6.9
            // still applies — leave the sub-list / clear the text first.
            if (subList !== null || query !== "") {
              event.preventDefault();
              setSubList(null);
              setQuery("");
              setActiveIndex(0);
            }
          }}
        >
          <div className={styles.inputRow}>
            <span className={styles.inputIcon} aria-hidden="true">
              {mode === "search" ? <Icon name="Search" size={16} /> : <GlyphCommand />}
            </span>
            {subList !== null && (
              <span className={styles.contextChip}>{subList.title}</span>
            )}
            <input
              ref={inputRef}
              className={styles.input}
              type="text"
              value={query}
              placeholder={placeholder}
              aria-label={placeholder}
              role="combobox"
              aria-expanded="true"
              aria-controls={`${baseId}-list`}
              aria-activedescendant={activeId}
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => {
                setQuery(event.target.value);
                setActiveIndex(0);
              }}
              onKeyDown={onInputKeyDown}
            />
          </div>

          <div ref={listRef} id={`${baseId}-list`} className={styles.list} role="listbox">
            {shown.map((group, groupIndex) => (
              <div className={styles.group} key={group.key}>
                <div className={styles.groupHeading}>{group.heading}</div>
                {group.items.map((item, itemIndex) => {
                  const index = offsets[groupIndex] + itemIndex;
                  return (
                    <div
                      key={item.key}
                      id={`${baseId}-opt-${index}`}
                      role="option"
                      aria-selected={index === active}
                      className={styles.row}
                      data-active={index === active ? "true" : undefined}
                      onMouseEnter={() => setActiveIndex(index)}
                      onMouseDown={(event) => {
                        // Keep focus (and the caret) in the input on click.
                        event.preventDefault();
                      }}
                      onClick={() => run(item)}
                    >
                      <span className={styles.rowIcon} aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className={styles.rowLabel}>{item.label}</span>
                      {item.hint !== undefined && (
                        <span className={styles.rowHint}>{item.hint}</span>
                      )}
                      {item.keys !== undefined && (
                        <span className={styles.rowKeys}>
                          <Kbd keys={keycaps(item.keys)} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
            {flat.length === 0 && <div className={styles.empty}>No results</div>}
          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
});
