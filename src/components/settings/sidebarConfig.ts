"use client";

/**
 * Sidebar customization — the state behind the captured
 * "App sidebar → Customize" row (capture-preferences.md §6).
 *
 * Item visibility lives here; width lives in `splashScreenConfig.sidebarWidth`
 * (the pre-paint boot script already restores it, MASTER_PROMPT §4), so both
 * survive a reload. The app sidebar subscribes through `useHiddenSidebarItems`.
 */

import { useEffect, useState } from "react";

export const SIDEBAR_CONFIG_KEY = "linearSidebarConfig";
export const SIDEBAR_CONFIG_EVENT = "linear:sidebarconfig";

export const SIDEBAR_ITEMS = [
  { key: "inbox", label: "Inbox" },
  { key: "my-issues", label: "My issues" },
  { key: "reviews", label: "Reviews" },
  { key: "agent", label: "Agent" },
  { key: "projects", label: "Projects" },
  { key: "views", label: "Views" },
  { key: "loops", label: "Loops" },
  { key: "try", label: "Try section" },
] as const;

export type SidebarItemKey = (typeof SIDEBAR_ITEMS)[number]["key"];

export const SIDEBAR_WIDTH_MIN = 200;
export const SIDEBAR_WIDTH_MAX = 330;
export const SIDEBAR_WIDTH_DEFAULT = 244;

function isItemKey(value: string): value is SidebarItemKey {
  return SIDEBAR_ITEMS.some((item) => item.key === value);
}

export function readHiddenItems(): SidebarItemKey[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(SIDEBAR_CONFIG_KEY);
    if (raw === null) return [];
    const parsed = JSON.parse(raw) as { hidden?: unknown };
    if (!Array.isArray(parsed.hidden)) return [];
    return parsed.hidden.filter(
      (value): value is SidebarItemKey =>
        typeof value === "string" && isItemKey(value),
    );
  } catch {
    return [];
  }
}

export function writeHiddenItems(hidden: SidebarItemKey[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SIDEBAR_CONFIG_KEY, JSON.stringify({ hidden }));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(SIDEBAR_CONFIG_EVENT));
}

export function readSidebarWidth(): number {
  if (typeof window === "undefined") return SIDEBAR_WIDTH_DEFAULT;
  try {
    const raw = window.localStorage.getItem("splashScreenConfig");
    if (raw === null) return SIDEBAR_WIDTH_DEFAULT;
    const parsed = JSON.parse(raw) as { sidebarWidth?: unknown };
    const width = typeof parsed.sidebarWidth === "number" ? parsed.sidebarWidth : NaN;
    if (Number.isNaN(width)) return SIDEBAR_WIDTH_DEFAULT;
    return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(width)));
  } catch {
    return SIDEBAR_WIDTH_DEFAULT;
  }
}

/**
 * Hidden-item set for the app sidebar. Empty during SSR and on the first
 * client render (no hydration mismatch), then filled from localStorage.
 */
export function useHiddenSidebarItems(): ReadonlySet<SidebarItemKey> {
  const [hidden, setHidden] = useState<ReadonlySet<SidebarItemKey>>(
    () => new Set<SidebarItemKey>(),
  );

  useEffect(() => {
    const sync = () => setHidden(new Set(readHiddenItems()));
    sync();
    window.addEventListener(SIDEBAR_CONFIG_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(SIDEBAR_CONFIG_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return hidden;
}
