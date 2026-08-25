"use client";

/**
 * Per-user, per-view display preferences (MASTER_PROMPT.md §11.1, §18
 * ViewPreference). One ViewPreference row per `${userId}:${viewKey}`,
 * created lazily the first time a view is customized (upsert semantics via
 * SyncClient.mutate.updateViewPreference). Until then the view renders the
 * shared defaults below.
 *
 * useViewPreference() is a mobx-react-lite-compatible hook: it reads the
 * observable pool, so call it inside observer() components — deviations
 * (the badge dot, Reset footer) re-render granularly.
 */

import { useCallback, useSyncExternalStore } from "react";
import { toJS } from "mobx";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type { ViewPreferenceData } from "@/lib/data/types";

/** Fixture identity of the signed-in user (seed data — auth comes later). */
export const CURRENT_USER_ID = "u-yk";

/** The tunable half of a ViewPreference row (identity fields excluded). */
export type ViewPrefConfig = Omit<ViewPreferenceData, "id" | "userId" | "viewKey">;

/**
 * Captured default display configuration (§11.1): list layout grouped by
 * status, ordered by priority, default-active display property chips.
 * "milestone" is active here (deviation from the §11.1 capture, where it is
 * inactive) — the reference card/row chip parity shots show the milestone
 * chip ("M3") out of the box, so the default view must render it.
 */
export const DEFAULT_VIEW_PREF: ViewPrefConfig = {
  layout: "list",
  grouping: "status",
  subGrouping: "none",
  ordering: "priority",
  showSubIssues: true,
  showEmptyGroups: false,
  completedFilter: "all",
  displayProperties: [
    "id",
    "status",
    "assignee",
    "priority",
    "project",
    "dueDate",
    "milestone",
    "labels",
    "created",
  ],
  hiddenColumnIds: [],
  nestedSubIssues: true,
  showSnoozed: false,
  showRead: true,
};

function prefId(viewKey: string): string {
  return `${CURRENT_USER_ID}:${viewKey}`;
}

/* ================================================================
 * Workspace defaults ("Set default for everyone", §11.1)
 * ================================================================
 *
 * A view with no ViewPreference row of its own renders the WORKSPACE
 * default; only the workspace default's absence falls back to
 * DEFAULT_VIEW_PREF. There is no server-side workspace settings model yet
 * (§11.1 marks the action permission-gated), so the workspace default lives
 * one level above the per-view rows in localStorage — the same layer the
 * create-modal draft uses — and every mounted view re-reads it through a
 * useSyncExternalStore subscription, so pushing a new default repaints the
 * badge dot and the Reset footer everywhere at once.
 */

const WORKSPACE_DEFAULT_KEY = "viewPreferenceDefault";

/** Cached serialized value; `null` means "not read from storage yet". */
let workspaceDefaultRaw: string | null = null;
let workspaceDefaultParsed: Partial<ViewPrefConfig> | null = null;
const defaultsSubscribers = new Set<() => void>();

function readWorkspaceDefaultRaw(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(WORKSPACE_DEFAULT_KEY) ?? "";
  } catch {
    return ""; // storage unavailable (private mode) — shared defaults apply
  }
}

/** Serialized snapshot (the subscription's identity) — SSR-safe. */
function getDefaultsSnapshot(): string {
  if (workspaceDefaultRaw === null) workspaceDefaultRaw = readWorkspaceDefaultRaw();
  return workspaceDefaultRaw;
}

function getServerDefaultsSnapshot(): string {
  return "";
}

function subscribeDefaults(onChange: () => void): () => void {
  defaultsSubscribers.add(onChange);
  return () => {
    defaultsSubscribers.delete(onChange);
  };
}

/** Parse (memoized on the raw string) the stored workspace default. */
function parseWorkspaceDefault(raw: string): Partial<ViewPrefConfig> | null {
  if (raw === "") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Partial<ViewPrefConfig>)
      : null;
  } catch {
    return null; // hand-edited storage — fall back to the shared defaults
  }
}

function workspaceDefault(): Partial<ViewPrefConfig> | null {
  const raw = getDefaultsSnapshot();
  if (workspaceDefaultParsed === null || workspaceDefaultRaw !== raw) {
    workspaceDefaultParsed = parseWorkspaceDefault(raw);
  }
  return workspaceDefaultParsed;
}

/**
 * The configuration a brand-new view inherits.
 *
 * `raw` MUST be the value `useSyncExternalStore` handed the component, not a
 * fresh localStorage read: during hydration React replays the SERVER snapshot
 * (""), and rendering the stored default there instead would make the first
 * client paint disagree with the server HTML. Passing the subscription's value
 * through keeps hydration honest and lets React re-render once, immediately
 * after mount, with the real default. Event handlers (which run long after
 * hydration) may omit it and read the live cache.
 */
export function effectiveDefaults(raw?: string): ViewPrefConfig {
  const stored = raw === undefined ? workspaceDefault() : parseWorkspaceDefault(raw);
  const merged: ViewPrefConfig = { ...DEFAULT_VIEW_PREF, ...(stored ?? {}) };
  // Never share the module-level arrays with callers that may mutate them.
  return {
    ...merged,
    displayProperties: [...merged.displayProperties],
    hiddenColumnIds: [...(merged.hiddenColumnIds ?? [])],
  };
}

/**
 * Persist `config` as the workspace default every view without its own row
 * inherits, then wake every mounted view.
 */
export function setWorkspaceDefault(config: ViewPrefConfig): void {
  const stored: ViewPrefConfig = {
    ...config,
    displayProperties: [...config.displayProperties],
    hiddenColumnIds: [...(config.hiddenColumnIds ?? [])],
  };
  const raw = JSON.stringify(stored);
  try {
    window.localStorage.setItem(WORKSPACE_DEFAULT_KEY, raw);
  } catch {
    /* storage unavailable — the default still applies for this session */
  }
  workspaceDefaultRaw = raw;
  workspaceDefaultParsed = stored;
  for (const notify of Array.from(defaultsSubscribers)) notify();
}

/** Drop the workspace default (back to the captured shared configuration). */
export function clearWorkspaceDefault(): void {
  try {
    window.localStorage.removeItem(WORKSPACE_DEFAULT_KEY);
  } catch {
    /* ignore */
  }
  workspaceDefaultRaw = "";
  workspaceDefaultParsed = null;
  for (const notify of Array.from(defaultsSubscribers)) notify();
}

/** Chip toggling appends/removes — membership equality, not order. */
function sameMembers(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const set = new Set(b);
  for (const key of a) {
    if (!set.has(key)) return false;
  }
  return true;
}

function matchesDefaults(pref: ViewPreferenceData, base: ViewPrefConfig): boolean {
  return (
    pref.layout === base.layout &&
    pref.grouping === base.grouping &&
    pref.subGrouping === base.subGrouping &&
    pref.ordering === base.ordering &&
    pref.showSubIssues === base.showSubIssues &&
    pref.showEmptyGroups === base.showEmptyGroups &&
    pref.completedFilter === base.completedFilter &&
    (pref.nestedSubIssues ?? true) === (base.nestedSubIssues ?? true) &&
    (pref.showSnoozed ?? false) === (base.showSnoozed ?? false) &&
    (pref.showRead ?? true) === (base.showRead ?? true) &&
    sameMembers(pref.hiddenColumnIds ?? [], base.hiddenColumnIds ?? []) &&
    sameMembers(pref.displayProperties, base.displayProperties)
  );
}

/** A fresh, plain default row (never share the module-level arrays). */
function defaultRow(viewKey: string, raw?: string): ViewPreferenceData {
  return {
    ...effectiveDefaults(raw),
    id: prefId(viewKey),
    userId: CURRENT_USER_ID,
    viewKey,
  };
}

/**
 * Read + write the current user's display preference for one view.
 *  - `pref`   — the stored row (observable) or the defaults
 *  - `update` — merge a patch and upsert the FULL row (optimistic, §6.8)
 *  - `isDefault` — false ⇢ toolbar badge dot + Reset footer (§11.1)
 *  - `reset`  — write the defaults back
 */
export function useViewPreference(viewKey: string): {
  pref: ViewPreferenceData;
  update: (patch: Partial<ViewPreferenceData>) => void;
  isDefault: boolean;
  reset: () => void;
  /** Push this view's current configuration as the workspace default (§11.1). */
  setAsWorkspaceDefault: () => void;
} {
  const client = useSyncClient();
  const store = useStore();
  const id = prefId(viewKey);

  // Re-render when "Set default for everyone" changes the inherited base.
  // The returned snapshot is what renders — see effectiveDefaults().
  const defaultsRaw = useSyncExternalStore(
    subscribeDefaults,
    getDefaultsSnapshot,
    getServerDefaultsSnapshot,
  );

  // Observable read — tracked by the calling observer component; the row
  // appearing later (first customization / delta) re-renders it.
  const row = store.get("ViewPreference", id);
  const pref: ViewPreferenceData = row ?? defaultRow(viewKey, defaultsRaw);

  const update = useCallback(
    (patch: Partial<ViewPreferenceData>): void => {
      // Re-read at call time (event handler — untracked) so merges never
      // work from a stale render closure.
      const current = store.get("ViewPreference", id);
      const base: ViewPreferenceData = current ? toJS(current) : defaultRow(viewKey);
      client.mutate.updateViewPreference({
        ...base,
        ...patch,
        // identity fields always win over a stray patch
        id,
        userId: CURRENT_USER_ID,
        viewKey,
      });
    },
    [client, store, id, viewKey],
  );

  const reset = useCallback((): void => {
    client.mutate.updateViewPreference(defaultRow(viewKey));
  }, [client, viewKey]);

  const setAsWorkspaceDefault = useCallback((): void => {
    // Re-read at call time (untracked event handler) so the pushed default is
    // exactly what the popover shows, not a stale render closure.
    const current = store.get("ViewPreference", id);
    const base: ViewPreferenceData = current ? toJS(current) : defaultRow(viewKey);
    const {
      id: _id,
      userId: _userId,
      viewKey: _viewKey,
      ...config
    } = base;
    void _id;
    void _userId;
    void _viewKey;
    setWorkspaceDefault(config);
  }, [store, id, viewKey]);

  return {
    pref,
    update,
    isDefault: matchesDefaults(pref, effectiveDefaults(defaultsRaw)),
    reset,
    setAsWorkspaceDefault,
  };
}
