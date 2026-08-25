"use client";

import clsx from "clsx";
import { useSidebarDrawer } from "./sidebarDrawer";
import styles from "./shell.module.css";

/**
 * Content header (CAPTURED): 57px title band — hairline divider under it —
 * plus an optional second full-height 57px tabs band. The title band is
 * space-between: [title cluster, 10px inset inside the 8px band pad] …
 * [right cluster, gap 4]. Border suppressed on the Agent page.
 *
 * ≤1023px the sidebar is an off-canvas drawer, so the title cluster gains a
 * leading menu button — the only way to reach navigation at that width.
 */

/** Three-bar menu glyph (14px, matching the header's other icon buttons). */
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

export function Header({
  title,
  left,
  right,
  tabs,
  noBorder,
  wide,
}: {
  title?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  tabs?: React.ReactNode;
  noBorder?: boolean;
  /** Issue detail keeps a 12px right inset on the title row (CAPTURED). */
  wide?: boolean;
}) {
  const { narrow, open, toggle } = useSidebarDrawer();

  return (
    <header
      className={clsx(styles.header, noBorder && styles.headerNoBorder)}
    >
      <div
        className={clsx(
          styles.headerTitleRow,
          wide && styles.headerTitleRowWide
        )}
      >
        <div className={styles.headerTitleCluster}>
          {narrow ? (
            <button
              type="button"
              className={styles.menuBtn}
              aria-label="Open navigation"
              aria-expanded={open}
              aria-controls="mainLayoutContainer"
              onClick={toggle}
            >
              <MenuGlyph />
            </button>
          ) : null}
          {left ?? (title ? <h2 className={styles.headerTitle}>{title}</h2> : null)}
        </div>
        {right != null ? (
          <div className={styles.headerRightCluster}>{right}</div>
        ) : null}
      </div>
      {tabs ? <div className={styles.headerTabsRow}>{tabs}</div> : null}
    </header>
  );
}
