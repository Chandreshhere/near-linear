"use client";

import Link from "next/link";
import { CSSProperties } from "react";
import styles from "./list.module.css";

/**
 * List row primitive (ListCell) — MASTER_PROMPT.md §7.5.
 * Renders a real <Link> when `href` is given (URL preview on hover,
 * middle-click works); otherwise a <div>. Background/ring are painted on
 * ::before with an 8px horizontal bleed inset (see list.module.css).
 *
 * Highlight vs Selection (§6.7): `keyboardActive` is the keyboard cursor
 * (inset ring); `selected` is explicit selection (applied background).
 */
export function ListRow({
  href,
  height = 44,
  selected,
  keyboardActive,
  firstInGroup,
  lastInGroup,
  listKey,
  children,
  onClick,
}: {
  href?: string;
  height?: number;
  selected?: boolean;
  keyboardActive?: boolean;
  firstInGroup?: boolean;
  lastInGroup?: boolean;
  listKey?: string;
  children: React.ReactNode;
  onClick?: React.MouseEventHandler;
}) {
  const style: CSSProperties = { height };

  if (href) {
    return (
      <Link
        href={href}
        className={styles.row}
        style={style}
        data-selected={selected ? true : undefined}
        data-keyboard-active={keyboardActive ? true : undefined}
        data-apply-background={selected ? true : undefined}
        data-first-in-group={firstInGroup ? true : undefined}
        data-last-in-group={lastInGroup ? true : undefined}
        data-list-key={listKey}
        onClick={onClick}
      >
        {children}
      </Link>
    );
  }

  return (
    <div
      className={styles.row}
      style={style}
      data-selected={selected ? true : undefined}
      data-keyboard-active={keyboardActive ? true : undefined}
      data-apply-background={selected ? true : undefined}
      data-first-in-group={firstInGroup ? true : undefined}
      data-last-in-group={lastInGroup ? true : undefined}
      data-list-key={listKey}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

/**
 * Hover-revealed 14px row selector (§6.1) — present in the DOM with
 * opacity 0, revealed via parent [data-row-hover] / :hover / :focus-visible,
 * or persistently while checked. Clicks never trigger row navigation.
 */
export function RowCheckbox({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label="Select"
      data-checked={checked ? true : undefined}
      className={styles.rowCheckbox}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onChange(!checked);
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <svg
        viewBox="0 0 16 16"
        className={styles.rowCheckboxGlyph}
        aria-hidden="true"
        focusable="false"
      >
        <path d="M12.78 4.72a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.97 1.97 4.47-4.47a.75.75 0 0 1 1.06 0Z" />
      </svg>
    </button>
  );
}
