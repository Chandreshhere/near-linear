"use client";

/**
 * List highlight + selection state — MASTER_PROMPT.md §6.7 (fundamental:
 * highlight ≠ selection, never merged) and §12 (list/board keys).
 *
 * - Highlight = the keyboard cursor. One row at a time, moved with ↑/↓ or
 *   J/K, clamped at the ends (no wrap).
 * - Selection = explicit membership (X, Shift+range, Cmd/Ctrl+A). Summons
 *   the bulk bar; Esc clears selection first, then highlight (§6.9 slots
 *   "clear selection" between overlays and navigate-back).
 *
 * One SelectionStore per view key (module-level cache via
 * getSelectionStore) so list↔board toggles and route round-trips keep
 * their selection state.
 */

import { useState } from "react";
import { makeAutoObservable, observable } from "mobx";
import { useScope, useShortcut } from "@/lib/keyboard";

export class SelectionStore {
  /** Ordered visible ids — pushed by the list each render via setItems(). */
  itemIds: string[] = [];
  /** Keyboard cursor (§6.7 highlight). */
  highlightedId: string | null = null;
  /** Explicit selection (§6.7 selection). */
  selectedIds = observable.set<string>();
  /** Range anchor for Shift+Click / Shift+↑↓ (last explicit toggle). */
  lastAnchorId: string | null = null;

  constructor() {
    // isSelected takes an argument, so it must stay a plain (tracked)
    // reader — an auto action would run untracked inside observers.
    makeAutoObservable(this, { isSelected: false }, { autoBind: true });
  }

  /* ---------------- computed ---------------- */

  get hasSelection(): boolean {
    return this.selectedIds.size > 0;
  }

  get selectionCount(): number {
    return this.selectedIds.size;
  }

  isSelected(id: string): boolean {
    return this.selectedIds.has(id);
  }

  /**
   * The ids a context menu / palette / shortcut acts on: the selection
   * when non-empty (in visible order), else the highlighted row, else [].
   */
  get effectiveIds(): string[] {
    if (this.selectedIds.size > 0) {
      const ordered = this.itemIds.filter((id) => this.selectedIds.has(id));
      if (ordered.length < this.selectedIds.size) {
        // Selected ids no longer visible (filter changed) still count.
        const seen = new Set(ordered);
        for (const id of this.selectedIds) {
          if (!seen.has(id)) ordered.push(id);
        }
      }
      return ordered;
    }
    return this.highlightedId !== null ? [this.highlightedId] : [];
  }

  /* ---------------- actions ---------------- */

  /** Called by the list every render; no-op when shallow-equal. */
  setItems(ids: readonly string[]): void {
    if (
      ids.length === this.itemIds.length &&
      ids.every((id, i) => id === this.itemIds[i])
    ) {
      return;
    }
    this.itemIds = ids.slice();
  }

  highlight(id: string | null): void {
    this.highlightedId = id;
  }

  /**
   * Move the keyboard cursor. Clamps at the ends (no wrap); when nothing
   * is highlighted, ↓ starts at the first row and ↑ at the last.
   */
  moveHighlight(delta: 1 | -1): void {
    const ids = this.itemIds;
    if (ids.length === 0) return;
    const current =
      this.highlightedId === null ? -1 : ids.indexOf(this.highlightedId);
    if (current === -1) {
      this.highlightedId = delta === 1 ? ids[0] : ids[ids.length - 1];
      return;
    }
    const next = Math.min(Math.max(current + delta, 0), ids.length - 1);
    this.highlightedId = ids[next];
  }

  /** X key / hover checkbox. Without an argument acts on the highlight. */
  toggleSelect(id?: string): void {
    const target = id ?? this.highlightedId;
    if (target == null) return;
    if (this.selectedIds.has(target)) {
      this.selectedIds.delete(target);
    } else {
      this.selectedIds.add(target);
    }
    this.lastAnchorId = target;
  }

  /** Shift+Click / Shift+↑↓: select the inclusive anchor→toId range. */
  selectRange(toId: string): void {
    const anchor = this.lastAnchorId ?? this.highlightedId ?? toId;
    const to = this.itemIds.indexOf(toId);
    if (to === -1) return;
    const from = this.itemIds.indexOf(anchor);
    if (from === -1) {
      this.selectedIds.add(toId);
      this.lastAnchorId = toId;
      return;
    }
    const lo = Math.min(from, to);
    const hi = Math.max(from, to);
    for (let i = lo; i <= hi; i++) {
      this.selectedIds.add(this.itemIds[i]);
    }
    if (this.lastAnchorId === null) this.lastAnchorId = anchor;
  }

  selectAll(): void {
    this.selectedIds.replace(this.itemIds);
  }

  clearSelection(): void {
    this.selectedIds.clear();
    this.lastAnchorId = null;
  }

  /**
   * Esc semantics (§6.9): with a selection, clear the selection ONLY
   * (highlight survives); otherwise clear the highlight. Returns true
   * when it consumed the event, false when there was nothing to clear.
   */
  clearAll(): boolean {
    if (this.selectedIds.size > 0) {
      this.clearSelection();
      return true;
    }
    if (this.highlightedId !== null) {
      this.highlightedId = null;
      return true;
    }
    return false;
  }
}

/* ================================================================
 * Per-view store cache
 * ================================================================ */

const storeCache = new Map<string, SelectionStore>();

/** One SelectionStore per view key (e.g. "team:TRENDZO:issues"). */
export const getSelectionStore = (key: string): SelectionStore => {
  let store = storeCache.get(key);
  if (store === undefined) {
    store = new SelectionStore();
    storeCache.set(key, store);
  }
  return store;
};

/* ================================================================
 * Keyboard wiring (§12 lists/boards)
 * ================================================================ */

/** Unique id prefix per mounted hook so list + board don't collide. */
let navSeq = 0;

/**
 * Register the §12 list/board navigation keys against a SelectionStore
 * while mounted: ↑/↓ + J/K move highlight, X selects, Shift+↑/↓ extends,
 * Cmd/Ctrl+A selects all, Esc clears (selection first — §6.9), Enter
 * opens the highlighted row. Also pushes the shortcut scope.
 */
export function useListNavigation(
  store: SelectionStore,
  opts: { onOpen?: (id: string) => void; scope?: "list" | "board" },
): void {
  const scope = opts.scope ?? "list";
  const [idBase] = useState(() => `list-nav-${++navSeq}`);

  useScope(scope);

  const extendSelection = (delta: 1 | -1): void => {
    const before = store.highlightedId;
    if (before !== null && !store.isSelected(before)) {
      // Anchor and include the row the cursor is leaving.
      store.toggleSelect(before);
    }
    store.moveHighlight(delta);
    const after = store.highlightedId;
    if (after !== null) store.selectRange(after);
  };

  useShortcut({
    id: `${idBase}:down`,
    keys: "arrowdown",
    scope,
    description: "Move down",
    handler: () => store.moveHighlight(1),
  });
  useShortcut({
    id: `${idBase}:up`,
    keys: "arrowup",
    scope,
    description: "Move up",
    handler: () => store.moveHighlight(-1),
  });
  useShortcut({
    id: `${idBase}:down-vim`,
    keys: "j",
    scope,
    description: "Move down",
    handler: () => store.moveHighlight(1),
  });
  useShortcut({
    id: `${idBase}:up-vim`,
    keys: "k",
    scope,
    description: "Move up",
    handler: () => store.moveHighlight(-1),
  });
  useShortcut({
    id: `${idBase}:select`,
    keys: "x",
    scope,
    description: "Select issue",
    handler: () => store.toggleSelect(),
  });
  useShortcut({
    id: `${idBase}:extend-down`,
    keys: "shift+arrowdown",
    scope,
    description: "Extend selection down",
    handler: () => extendSelection(1),
  });
  useShortcut({
    id: `${idBase}:extend-up`,
    keys: "shift+arrowup",
    scope,
    description: "Extend selection up",
    handler: () => extendSelection(-1),
  });
  useShortcut({
    id: `${idBase}:select-all`,
    keys: "mod+a",
    scope,
    description: "Select all",
    allowInInput: false,
    handler: () => store.selectAll(),
  });
  useShortcut({
    id: `${idBase}:clear`,
    keys: "escape",
    scope,
    description: "Clear selection",
    // The registry always consumes on match; clearAll() is a safe no-op
    // (returns false) when there is nothing to clear.
    handler: () => {
      store.clearAll();
    },
  });
  useShortcut({
    id: `${idBase}:open`,
    keys: "enter",
    scope,
    description: "Open issue",
    handler: () => {
      const id = store.highlightedId;
      if (id !== null) opts.onOpen?.(id);
    },
  });
}
