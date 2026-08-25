"use client";

/**
 * Narrow-viewport sidebar drawer (§5 responsive behaviour).
 *
 * The 244px sidebar is permanent from 1024px up. Below that it would eat most
 * of the window — at 390px it left ~146px for the issue list, which clipped
 * every row — so it becomes an off-canvas drawer: hidden by default, opened
 * from the header's menu button, dismissed by Escape, the backdrop, or
 * navigating.
 *
 * State is module-level and broadcast on a window event, the same idiom the
 * command palette, the create-issue modal and the invite dialog already use,
 * so the Header (rendered deep inside each route) can drive the AppShell
 * without threading props through every page.
 *
 * `NARROW_QUERY` is the single source of truth for the breakpoint and is
 * mirrored by the `@media (max-width: 1023px)` blocks in shell.module.css and
 * sidebar.module.css — change it in all three or none.
 */

import { useCallback, useEffect, useState } from "react";

export const NARROW_QUERY = "(max-width: 1023px)";

const CHANGE_EVENT = "linear:sidebar-drawer";

let drawerOpen = false;

function broadcast(): void {
  window.dispatchEvent(new CustomEvent<boolean>(CHANGE_EVENT, { detail: drawerOpen }));
}

export function setSidebarDrawer(open: boolean): void {
  if (typeof window === "undefined" || drawerOpen === open) return;
  drawerOpen = open;
  broadcast();
}

export function toggleSidebarDrawer(): void {
  if (typeof window === "undefined") return;
  drawerOpen = !drawerOpen;
  broadcast();
}

export function closeSidebarDrawer(): void {
  setSidebarDrawer(false);
}

/** True while the viewport is at or below the drawer breakpoint. */
export function useIsNarrow(): boolean {
  // Starts false so SSR and the first client paint agree; the effect
  // corrects it before paint-relevant work happens.
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const media = window.matchMedia(NARROW_QUERY);
    const sync = (): void => setNarrow(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  return narrow;
}

/** Drawer state for the current viewport. `open` is always false when wide. */
export function useSidebarDrawer(): {
  narrow: boolean;
  open: boolean;
  toggle: () => void;
  close: () => void;
} {
  const narrow = useIsNarrow();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onChange = (event: Event): void => {
      setOpen((event as CustomEvent<boolean>).detail);
    };
    window.addEventListener(CHANGE_EVENT, onChange);
    setOpen(drawerOpen);
    return () => window.removeEventListener(CHANGE_EVENT, onChange);
  }, []);

  // Widening the window must never leave a drawer "open" behind the
  // permanent sidebar.
  useEffect(() => {
    if (!narrow) closeSidebarDrawer();
  }, [narrow]);

  return {
    narrow,
    open: narrow && open,
    toggle: useCallback(() => toggleSidebarDrawer(), []),
    close: useCallback(() => closeSidebarDrawer(), []),
  };
}
