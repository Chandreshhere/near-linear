"use client";

/**
 * Central keyboard shortcut registry — MASTER_PROMPT.md §12.
 *
 * One window-level keydown listener (mounted by <KeyboardProvider>), a
 * module-level registry, scope stack filtering, and two-step sequence
 * matching ("g i") with a 1.5s timeout + Esc cancel. No scattered
 * listeners: components register via useShortcut() and the help window /
 * tooltips read the registry via getRegisteredShortcuts() + formatKeys().
 *
 * Keys grammar:
 *   - single combos: "c", "mod+k", "shift+v", "alt+shift+arrowup"
 *   - two-step sequences (space-separated): "g i", "o w", "m r"
 *   - "mod" = metaKey (⌘) on macOS, ctrlKey elsewhere
 *   - named keys use lowercase KeyboardEvent.key: "arrowup", "enter",
 *     "escape", "backspace", "space", "/", "?"
 *
 * Note for keycap UI: formatKeys() is OS-dependent ("⌘" vs "Ctrl"). On the
 * server it renders the non-mac form, so render keycaps client-side (after
 * mount) or add suppressHydrationWarning to avoid hydration mismatches.
 */

import {
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactElement,
  type ReactNode,
} from "react";

/* ================================================================
 * Public types
 * ================================================================ */

export type ShortcutScope =
  | "global"
  | "list"
  | "board"
  | "issue"
  | "inbox"
  | "triage"
  | "modal";

export interface Shortcut {
  id: string;
  keys: string;
  scope?: ShortcutScope;
  description?: string;
  allowInInput?: boolean;
  handler: (e: KeyboardEvent) => void;
}

/* ================================================================
 * Key parsing
 * ================================================================ */

interface ComboSpec {
  key: string;
  mod: boolean;
  ctrl: boolean;
  meta: boolean;
  alt: boolean;
  shift: boolean;
}

/** Minimal structural view of a KeyboardEvent (also used for snapshots). */
interface KeyStroke {
  key: string;
  /** Physical key ("KeyV") — the Option-key fallback below reads it. */
  code?: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
}

const SEQUENCE_TIMEOUT_MS = 1500;

const MODIFIER_EVENT_KEYS = new Set([
  "Shift",
  "Control",
  "Alt",
  "Meta",
  "CapsLock",
  "Fn",
  "FnLock",
  "Hyper",
  "Super",
  "NumLock",
  "ScrollLock",
]);

function parseCombo(part: string): ComboSpec {
  const spec: ComboSpec = {
    key: "",
    mod: false,
    ctrl: false,
    meta: false,
    alt: false,
    shift: false,
  };
  for (const token of part.toLowerCase().split("+")) {
    switch (token) {
      case "mod":
        spec.mod = true;
        break;
      case "ctrl":
      case "control":
        spec.ctrl = true;
        break;
      case "meta":
      case "cmd":
      case "command":
        spec.meta = true;
        break;
      case "alt":
      case "option":
        spec.alt = true;
        break;
      case "shift":
        spec.shift = true;
        break;
      default:
        spec.key = token;
    }
  }
  return spec;
}

/** Parse cache — keys strings are static literals in practice. */
const parseCache = new Map<string, ComboSpec[]>();

function parseKeys(keys: string): ComboSpec[] {
  const cached = parseCache.get(keys);
  if (cached) return cached;
  const steps = keys.trim().split(/\s+/).map(parseCombo);
  parseCache.set(keys, steps);
  return steps;
}

function normalizeEventKey(key: string): string {
  if (key === " " || key === "Spacebar") return "space";
  return key.toLowerCase();
}

function isMac(): boolean {
  if (typeof navigator === "undefined") return false;
  const platform = navigator.platform ?? "";
  const ua = navigator.userAgent ?? "";
  return /mac|iphone|ipad|ipod/i.test(platform) || /mac os x|macintosh/i.test(ua);
}

/**
 * macOS rewrites `event.key` for Option combos — ⌥V arrives as "√", ⌥F as
 * "ƒ" — so an alt shortcut can never match on the character alone. The
 * physical `code` is stable across layouts, so alt combos accept it as a
 * fallback. Only consulted when `spec.alt` is set, so nothing else widens.
 */
function codeMatchesKey(key: string, code: string | undefined): boolean {
  if (code === undefined) return false;
  if (/^[a-z]$/.test(key)) return code === `Key${key.toUpperCase()}`;
  if (/^[0-9]$/.test(key)) return code === `Digit${key}`;
  return false;
}

function strokeMatches(spec: ComboSpec, s: KeyStroke, mac: boolean): boolean {
  if (!spec.key) return false;
  const wantMeta = spec.meta || (spec.mod && mac);
  const wantCtrl = spec.ctrl || (spec.mod && !mac);
  if (s.metaKey !== wantMeta) return false;
  if (s.ctrlKey !== wantCtrl) return false;
  if (s.altKey !== spec.alt) return false;
  if (
    normalizeEventKey(s.key) !== spec.key &&
    !(spec.alt && codeMatchesKey(spec.key, s.code))
  ) {
    return false;
  }
  // Shift: letters/digits/named keys require an exact shift match ("v" must
  // not fire on Shift+V). Shifted punctuation ("?", "~") already encodes
  // shift in the produced character, so shiftKey is not compared there.
  const strictShift =
    spec.key.length > 1 || /^[a-z0-9]$/.test(spec.key);
  if (strictShift && s.shiftKey !== spec.shift) return false;
  return true;
}

/* ================================================================
 * Module-level store (registry + scope stack + pending sequence)
 * ================================================================ */

interface ShortcutRef {
  current: Shortcut;
}

const registry = new Map<string, ShortcutRef>();

interface ScopeToken {
  scope: ShortcutScope;
}

const scopeStack: ScopeToken[] = [];

function pushScope(scope: ShortcutScope): ScopeToken {
  const token: ScopeToken = { scope };
  scopeStack.push(token);
  return token;
}

function popScope(token: ScopeToken): void {
  const i = scopeStack.indexOf(token);
  if (i >= 0) scopeStack.splice(i, 1);
}

function scopeIsActive(scope: ShortcutScope | undefined): boolean {
  if (scope === undefined || scope === "global") return true;
  for (let i = scopeStack.length - 1; i >= 0; i--) {
    if (scopeStack[i].scope === scope) return true;
  }
  return false;
}

/* ---- pending sequence (external store for usePendingSequence) ---- */

interface PendingState {
  display: string;
  stroke: KeyStroke;
}

let pending: PendingState | null = null;
let pendingTimer: ReturnType<typeof setTimeout> | null = null;
const pendingSubscribers = new Set<() => void>();

function emitPending(): void {
  for (const fn of Array.from(pendingSubscribers)) fn();
}

function subscribePending(fn: () => void): () => void {
  pendingSubscribers.add(fn);
  return () => {
    pendingSubscribers.delete(fn);
  };
}

function getPendingDisplay(): string | null {
  return pending ? pending.display : null;
}

function getServerPendingDisplay(): string | null {
  return null;
}

function clearPending(): void {
  if (pendingTimer !== null) {
    clearTimeout(pendingTimer);
    pendingTimer = null;
  }
  if (pending !== null) {
    pending = null;
    emitPending();
  }
}

function armPending(state: PendingState): void {
  if (pendingTimer !== null) clearTimeout(pendingTimer);
  pending = state;
  emitPending();
  pendingTimer = setTimeout(() => {
    pendingTimer = null;
    clearPending();
  }, SEQUENCE_TIMEOUT_MS);
}

/* ================================================================
 * Matching
 * ================================================================ */

function isEditableTarget(target: EventTarget | null): boolean {
  if (typeof HTMLElement === "undefined") return false;
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
  return target.isContentEditable;
}

interface ActiveEntry {
  shortcut: Shortcut;
  steps: ComboSpec[];
}

function collectActive(inInput: boolean): ActiveEntry[] {
  const active: ActiveEntry[] = [];
  for (const ref of registry.values()) {
    const shortcut = ref.current;
    if (inInput && !shortcut.allowInInput) continue;
    if (!scopeIsActive(shortcut.scope)) continue;
    active.push({ shortcut, steps: parseKeys(shortcut.keys) });
  }
  return active;
}

function snapshotStroke(e: KeyboardEvent): KeyStroke {
  return {
    key: e.key,
    code: e.code,
    ctrlKey: e.ctrlKey,
    metaKey: e.metaKey,
    altKey: e.altKey,
    shiftKey: e.shiftKey,
  };
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.defaultPrevented) return;
  if (e.isComposing) return;
  // Bare modifier presses neither match nor cancel a pending sequence.
  if (MODIFIER_EVENT_KEYS.has(e.key)) return;

  const mac = isMac();
  const inInput = isEditableTarget(e.target);

  // Esc cancels a pending sequence before anything else (§12 Esc cancel).
  if (pending !== null && e.key === "Escape") {
    clearPending();
    e.preventDefault();
    return;
  }

  const active = collectActive(inInput);

  // 1. Continue a pending sequence: fire shortcuts whose first step matched
  //    the stored prefix stroke and whose second step matches this event.
  if (pending !== null) {
    const prefixStroke = pending.stroke;
    for (const { shortcut, steps } of active) {
      if (steps.length < 2) continue;
      if (!strokeMatches(steps[0], prefixStroke, mac)) continue;
      if (!strokeMatches(steps[1], e, mac)) continue;
      clearPending();
      e.preventDefault();
      shortcut.handler(e);
      return;
    }
    // No continuation — cancel and fall through so the key can still start
    // a new sequence or fire a single combo.
    clearPending();
  }

  // 2. Arm a new sequence if this event matches any active prefix.
  for (const { steps } of active) {
    if (steps.length < 2) continue;
    if (strokeMatches(steps[0], e, mac)) {
      armPending({
        display: comboChips(steps[0], mac).join(""),
        stroke: snapshotStroke(e),
      });
      e.preventDefault();
      return;
    }
  }

  // 3. Single combos.
  for (const { shortcut, steps } of active) {
    if (steps.length !== 1) continue;
    if (strokeMatches(steps[0], e, mac)) {
      e.preventDefault();
      shortcut.handler(e);
      return;
    }
  }
}

/* ================================================================
 * Display formatting
 * ================================================================ */

const KEY_GLYPHS: Record<string, string> = {
  arrowup: "↑",
  arrowdown: "↓",
  arrowleft: "←",
  arrowright: "→",
  enter: "Enter",
  escape: "Esc",
  backspace: "⌫",
  delete: "Del",
  space: "Space",
  tab: "Tab",
  home: "Home",
  end: "End",
  pageup: "PgUp",
  pagedown: "PgDn",
};

function displayKey(key: string): string {
  const glyph = KEY_GLYPHS[key];
  if (glyph) return glyph;
  return key.length === 1 ? key.toUpperCase() : key;
}

function comboChips(spec: ComboSpec, mac: boolean): string[] {
  const chips: string[] = [];
  const ctrl = spec.ctrl || (spec.mod && !mac);
  const meta = spec.meta || (spec.mod && mac);
  if (ctrl) chips.push(mac ? "⌃" : "Ctrl");
  if (spec.alt) chips.push(mac ? "⌥" : "Alt");
  if (spec.shift) chips.push("⇧");
  if (meta) chips.push(mac ? "⌘" : "Win");
  if (spec.key) chips.push(displayKey(spec.key));
  return chips;
}

/**
 * Keycap chips for tooltip/menu/help UI.
 *   "mod+k"  -> ["⌘", "K"] on macOS, ["Ctrl", "K"] elsewhere
 *   "shift+v" -> ["⇧", "V"]
 *   "g i"    -> ["G", "then", "I"]
 */
export function formatKeys(keys: string): string[] {
  const mac = isMac();
  const chips: string[] = [];
  const steps = parseKeys(keys);
  steps.forEach((step, i) => {
    if (i > 0) chips.push("then");
    chips.push(...comboChips(step, mac));
  });
  return chips;
}

/** Registry snapshot for the `?` shortcuts help window. */
export function getRegisteredShortcuts(): Shortcut[] {
  return Array.from(registry.values(), (ref) => ref.current);
}

/* ================================================================
 * Provider + hooks
 * ================================================================ */

/**
 * Mounts the single window keydown listener. Renders nothing of its own —
 * wrap the app once (inside the client shell).
 */
export function KeyboardProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  useEffect(() => {
    const onKeydown = (e: KeyboardEvent): void => handleKeydown(e);
    window.addEventListener("keydown", onKeydown);
    return () => {
      window.removeEventListener("keydown", onKeydown);
      clearPending();
    };
  }, []);
  return <>{children}</>;
}

/**
 * Register a shortcut while mounted. The latest `handler` (and keys/scope/
 * description) is always used without re-registering; pass `deps` only when
 * the shortcut's identity (its `id`) changes.
 */
export function useShortcut(shortcut: Shortcut, deps?: unknown[]): void {
  const ref = useRef<Shortcut>(shortcut);
  useEffect(() => {
    ref.current = shortcut;
  });
  useEffect(() => {
    const id = ref.current.id;
    registry.set(id, ref);
    return () => {
      if (registry.get(id) === ref) registry.delete(id);
    };
    // Intentionally caller-controlled dependency list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps ?? []);
}

/**
 * The pending first key of a two-step sequence ("G" while waiting for the
 * second key), or null. For hint UI; SSR-safe (null on the server).
 */
export function usePendingSequence(): string | null {
  return useSyncExternalStore(
    subscribePending,
    getPendingDisplay,
    getServerPendingDisplay,
  );
}

/**
 * Push a scope onto the active-scope stack while mounted (and `active`).
 * "global"-scoped and scopeless shortcuts are always active.
 */
export function useScope(scope: ShortcutScope, active = true): void {
  useEffect(() => {
    if (!active) return;
    const token = pushScope(scope);
    return () => {
      popScope(token);
    };
  }, [scope, active]);
}
