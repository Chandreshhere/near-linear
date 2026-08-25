"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { AgentToolbar } from "./AgentToolbar";
import { useSidebarDrawer } from "./sidebarDrawer";
import styles from "./shell.module.css";

/**
 * App frame (CAPTURED geometry): window-colored ground, 244px sidebar,
 * floating 12px-radius content card (8px gaps, left edge at sidebar width),
 * 28px agent toolbar strip pinned to the window bottom.
 *
 * RESPONSIVE (≤1023px): the sidebar leaves the flow and becomes an off-canvas
 * drawer over a dismiss backdrop — see sidebarDrawer.ts. The content card
 * then spans the full window instead of being squeezed into what the 244px
 * sidebar left over.
 *
 * Settings mode REPLACES this chrome entirely (capture-preferences.md §1:
 * settings sidebar + content card with its own 64px strip, no app header), so
 * the shell steps aside there and `settings/layout.tsx` supplies the frame.
 * `children` is passed through untouched, so server components below stay
 * server-rendered.
 */
export function AppShell({
  workspace,
  children,
}: {
  workspace: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { narrow, open, close } = useSidebarDrawer();
  const layoutRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const isSettings =
    pathname === `/${workspace}/settings` ||
    pathname?.startsWith(`/${workspace}/settings/`) === true;

  // Navigating from a drawer link puts the destination on screen; leaving the
  // drawer over it would hide what the user just asked for.
  useEffect(() => {
    close();
  }, [pathname, close]);

  // Escape closes the drawer before anything else claims the key (§6.9).
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        event.stopPropagation();
        close();
      }
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [open, close]);

  /**
   * Focus follows the drawer. The content behind it is marked `inert` (see
   * the render below), so Tab cannot walk out of an open drawer without a
   * hand-rolled trap; opening moves focus into the nav and closing returns it
   * to whatever opened it.
   */
  useEffect(() => {
    if (!open) {
      const target = returnFocusRef.current;
      returnFocusRef.current = null;
      if (target !== null && document.contains(target)) target.focus();
      return;
    }
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const nav = layoutRef.current?.querySelector<HTMLElement>('nav[aria-label="Primary"]');
    const first = nav?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, [open]);

  if (isSettings) return <>{children}</>;

  return (
    <>
      <div
        id="mainLayoutContainer"
        className={styles.mainLayout}
        ref={layoutRef}
        data-narrow={narrow ? "true" : undefined}
        data-drawer-open={open ? "true" : undefined}
      >
        <Sidebar workspace={workspace} />
        {open ? (
          <button
            type="button"
            className={styles.drawerScrim}
            aria-label="Close navigation"
            onClick={close}
          />
        ) : null}
        {/* `inert` while the drawer is open: the content behind it is neither
            clickable nor tabbable nor exposed to screen readers, which is
            what makes the drawer modal without a hand-rolled focus trap. */}
        <div className={styles.mainColumn} inert={open ? true : undefined}>
          <main className={styles.contentCard}>
            {/* Skip-link target. tabIndex is what makes focus actually
                move here — without it the browser scrolls but the next Tab
                resumes from the skip link, which is the classic skip-link
                bug. */}
            <div id="skip-nav" tabIndex={-1} />
            {children}
          </main>
        </div>
      </div>
      <AgentToolbar workspace={workspace} />
    </>
  );
}
