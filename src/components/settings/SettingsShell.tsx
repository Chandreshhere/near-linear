"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { AgentToolbar } from "@/components/shell/AgentToolbar";
import { useSidebarDrawer } from "@/components/shell/sidebarDrawer";
import { SettingsSidebar } from "./SettingsSidebar";
import shell from "@/components/shell/shell.module.css";
import styles from "./settings.module.css";

/**
 * Settings chrome (CAPTURED — capture-preferences.md §1): settings mode
 * REPLACES the normal app frame. Settings sidebar (244px) + floating content
 * card (radius 12, 8px gaps) with its own 64px top strip and a 640px content
 * column, over the same window-coloured ground; the 28px agent toolbar stays.
 *
 * RESPONSIVE (≤1023px): same treatment as the app shell — the settings
 * sidebar becomes an off-canvas drawer behind a menu button parked in the
 * 64px top strip, so the settings column gets the whole window instead of
 * ~146px of it. See components/shell/sidebarDrawer.ts.
 */

function MenuGlyph() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M2 4.25c0-.41.34-.75.75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 4.25Zm0 3.75c0-.41.34-.75.75-.75h10.5a.75.75 0 0 1 0 1.5H2.75A.75.75 0 0 1 2 8Zm.75 3c-.41 0-.75.34-.75.75s.34.75.75.75h10.5a.75.75 0 0 0 0-1.5H2.75Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function SettingsShell({
  workspace,
  children,
}: {
  workspace: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { narrow, open, toggle, close } = useSidebarDrawer();
  const layoutRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    close();
  }, [pathname, close]);

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

  useEffect(() => {
    if (!open) {
      const target = returnFocusRef.current;
      returnFocusRef.current = null;
      if (target !== null && document.contains(target)) target.focus();
      return;
    }
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const nav = layoutRef.current?.querySelector<HTMLElement>("nav");
    const first = nav?.querySelector<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    first?.focus();
  }, [open]);

  return (
    <>
      <div
        id="mainLayoutContainer"
        className={styles.layout}
        ref={layoutRef}
        data-narrow={narrow ? "true" : undefined}
        data-drawer-open={open ? "true" : undefined}
      >
        <SettingsSidebar workspace={workspace} />
        {open ? (
          <button
            type="button"
            className={shell.drawerScrim}
            aria-label="Close settings navigation"
            onClick={close}
          />
        ) : null}
        <div className={styles.mainColumn} inert={open ? true : undefined}>
          <main className={styles.contentCard}>
            {/* Skip-link target — tabIndex moves focus, not just scroll. */}
            <div id="skip-nav" tabIndex={-1} />
            <div
              className={styles.scroller}
              tabIndex={-1}
              data-scroll-container="true"
              data-restore-scroll-view={`/${workspace}/settings|0-settings`}
            >
              <div className={styles.topStrip}>
                {narrow ? (
                  <button
                    type="button"
                    className={styles.drawerMenuBtn}
                    aria-label="Open settings navigation"
                    aria-expanded={open}
                    aria-controls="mainLayoutContainer"
                    onClick={toggle}
                  >
                    <MenuGlyph />
                  </button>
                ) : null}
              </div>
              <div className={styles.contentMargins}>
                <div className={styles.content}>{children}</div>
              </div>
            </div>
          </main>
        </div>
      </div>
      <AgentToolbar workspace={workspace} />
    </>
  );
}
