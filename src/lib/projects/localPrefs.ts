"use client";

/**
 * Per-user UI flags that are NOT part of the synced data contract: whether a
 * view's insights panel is docked open, and which projects the user asked to
 * be notified about ("Setup project notifications", capture §6.1).
 *
 * These belong to UserSettings conceptually, but UserSettingsData is a fixed
 * captured shape (§18) and these keys are view-local, so they live one layer
 * above it in localStorage — the same layer the create-issue draft and the
 * saved custom views use (components/nav/ViewsPage.tsx). One key per flag,
 * one module-level subscriber set, read through useSyncExternalStore so every
 * mounted copy (and every other tab) stays in step and SSR renders `false`.
 */

import { useCallback, useSyncExternalStore } from "react";

const PREFIX = "linearFlag:";

const listeners = new Set<() => void>();

/** Cache: getSnapshot must return a stable value between real changes. */
const cache = new Map<string, boolean>();

function storageKey(key: string): string {
  return `${PREFIX}${key}`;
}

function readFlag(key: string): boolean {
  const cached = cache.get(key);
  if (cached !== undefined) return cached;
  let value = false;
  try {
    value = window.localStorage.getItem(storageKey(key)) === "1";
  } catch {
    value = false; // storage blocked (private mode) — treat as unset
  }
  cache.set(key, value);
  return value;
}

/** Current value of one flag. SSR-safe (`false` on the server). */
export function getFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  return readFlag(key);
}

export function setFlag(key: string, value: boolean): void {
  if (typeof window === "undefined") return;
  cache.set(key, value);
  try {
    if (value) window.localStorage.setItem(storageKey(key), "1");
    else window.localStorage.removeItem(storageKey(key));
  } catch {
    // Quota/permission failure: the in-memory cache still reflects the click.
  }
  for (const listener of Array.from(listeners)) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (event: StorageEvent): void => {
    // Cross-tab writes (and localStorage.clear(), which sends key === null).
    if (event.key === null || event.key.startsWith(PREFIX)) {
      cache.clear();
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

function serverSnapshot(): boolean {
  return false;
}

/**
 * A boolean flag persisted per browser. `[value, set, toggle]`; the initial
 * render is always `false` (SSR parity) and the stored value arrives on the
 * first client subscription tick.
 */
export function usePersistedFlag(
  key: string,
): [boolean, (value: boolean) => void, () => void] {
  const getSnapshot = useCallback((): boolean => readFlag(key), [key]);
  const value = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const set = useCallback((next: boolean): void => setFlag(key, next), [key]);
  const toggle = useCallback((): void => setFlag(key, !getFlag(key)), [key]);
  return [value, set, toggle];
}

/** localStorage key for "notify me about this project". */
export function projectNotifyKey(projectId: string): string {
  return `project-notify:${projectId}`;
}

/** localStorage key for a view's docked insights panel. */
export function insightsKey(viewKey: string): string {
  return `insights:${viewKey}`;
}
