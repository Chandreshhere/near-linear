/**
 * Triage snooze map — MASTER_PROMPT.md §22 (`H` snooze: hide until a time).
 *
 * Snoozing a triage issue is a personal, client-side gesture (it does not
 * change the issue for teammates), so the wake times live in a module-level
 * MobX observable map mirrored to localStorage — the same layer the inbox
 * uses for per-user conveniences. The sidebar badge and the triage list both
 * read through this map, so a snooze hides the issue everywhere at once.
 */

import { observable, runInAction } from "mobx";
import type { UUID } from "@/lib/data/types";

const STORAGE_KEY = "triageSnoozes";

/** issueId → wake time (ISO). Observable so observer components react. */
const snoozes = observable.map<UUID, string>(undefined, {
  name: "triageSnoozes",
});

let loaded = false;

function persist(): void {
  try {
    const entries: Record<string, string> = {};
    for (const [id, until] of snoozes) entries[id] = until;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    /* storage unavailable (private mode) — session-only snoozes */
  }
}

/** Lazy one-time hydrate; expired entries are dropped on load. */
function ensureLoaded(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return;
    const parsed: unknown = JSON.parse(raw);
    if (parsed === null || typeof parsed !== "object") return;
    const now = Date.now();
    runInAction(() => {
      for (const [id, until] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof until !== "string") continue;
        const wake = Date.parse(until);
        if (!Number.isNaN(wake) && wake > now) snoozes.set(id, until);
      }
    });
  } catch {
    /* corrupted payload — start clean */
  }
}

/** Hide `issueId` until `until`. */
export function snoozeTriageIssue(issueId: UUID, until: Date): void {
  ensureLoaded();
  runInAction(() => {
    snoozes.set(issueId, until.toISOString());
  });
  persist();
}

export function unsnoozeTriageIssue(issueId: UUID): void {
  ensureLoaded();
  runInAction(() => {
    snoozes.delete(issueId);
  });
  persist();
}

/**
 * Whether `issueId` is currently snoozed. Reads the observable map, so
 * observer components re-render when a snooze is added or removed (expiry
 * itself is evaluated against the caller's `now`).
 */
export function isTriageSnoozed(issueId: UUID, now: number): boolean {
  ensureLoaded();
  const until = snoozes.get(issueId);
  if (until === undefined) return false;
  const wake = Date.parse(until);
  if (Number.isNaN(wake) || wake <= now) return false;
  return true;
}
