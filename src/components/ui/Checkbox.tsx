"use client";

import styles from "./checkbox.module.css";

/**
 * Row-selector checkbox — MASTER_PROMPT §6.7 / §7.5 usage (CAPTURED).
 * 14px square, radius 4px (--control-border-radius), 1px solid border;
 * checked = accent fill + white check path. Hover-reveal on list rows is
 * the parent's job (row styles the wrapper opacity) — this stays inert.
 */
export function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <label className={styles.root}>
      <span className={styles.control}>
        <input
          type="checkbox"
          className={styles.input}
          checked={checked}
          onChange={(e) => onChange(e.currentTarget.checked)}
        />
        <svg
          className={styles.check}
          viewBox="0 0 14 14"
          width={14}
          height={14}
          aria-hidden="true"
          focusable="false"
        >
          <path d="M11.18 4.13a.66.66 0 0 1 0 .93l-4.37 4.37a.66.66 0 0 1-.93 0L3.7 7.25a.66.66 0 1 1 .93-.93l1.71 1.71 3.91-3.9a.66.66 0 0 1 .93 0Z" fill="currentColor" />
        </svg>
      </span>
      {label ? <span className={styles.label}>{label}</span> : null}
    </label>
  );
}
