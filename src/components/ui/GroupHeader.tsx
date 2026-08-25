"use client";

import styles from "./list.module.css";

/**
 * Grouped-list header row — MASTER_PROMPT.md §10.6 / §6.1.
 * 36px sticky strip on var(--color-bg-shade) (full-bleed), icon + 13px/500
 * label + muted 13px/450 count, with a hover-revealed 24px "+" button at
 * the far right (create in group).
 */
export function GroupHeader({
  icon,
  label,
  count,
  onAdd,
}: {
  icon?: React.ReactNode;
  label: string;
  count?: number;
  onAdd?: () => void;
}) {
  return (
    <div className={styles.groupHeader}>
      {icon != null && <span className={styles.groupIcon}>{icon}</span>}
      <span className={styles.groupLabel}>{label}</span>
      {count != null && <span className={styles.groupCount}>{count}</span>}
      {onAdd && (
        <button
          type="button"
          className={styles.groupAdd}
          aria-label={`New item in group ${label}`}
          onClick={onAdd}
        >
          <svg
            viewBox="0 0 16 16"
            className={styles.groupAddGlyph}
            aria-hidden="true"
            focusable="false"
          >
            <path d="M8 3.25c.41 0 .75.34.75.75v3.25H12a.75.75 0 0 1 0 1.5H8.75V12a.75.75 0 0 1-1.5 0V8.75H4a.75.75 0 0 1 0-1.5h3.25V4c0-.41.34-.75.75-.75Z" />
          </svg>
        </button>
      )}
    </div>
  );
}
