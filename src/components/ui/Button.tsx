"use client";

import { ButtonHTMLAttributes, ReactNode } from "react";
import clsx from "clsx";
import styles from "./button.module.css";

/**
 * Button primitive — MASTER_PROMPT.md §7.1 (CAPTURED).
 * State is expressed via data-attributes styled in CSS (§6):
 * `data-active`, `data-menu-open="true"` (keeps the hover state while a
 * menu/popover anchored to this trigger is open — §6.2).
 * Border is a ring shadow on ::after, never a real border.
 */
export function Button({
  variant = "ghost",
  size = 28,
  pill = true,
  icon,
  children,
  className,
  type,
  ...rest
}: {
  variant?: "primary" | "secondary" | "ghost";
  size?: 24 | 28 | 32 | 44;
  pill?: boolean;
  icon?: ReactNode;
  children?: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const iconOnly = icon != null && children == null;
  return (
    <button
      type={type ?? "button"}
      className={clsx(
        styles.button,
        styles[variant],
        styles[`size${size}`],
        pill ? styles.pill : styles.rect,
        iconOnly && styles.iconOnly,
        className
      )}
      {...rest}
    >
      {icon != null ? (
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
      ) : null}
      {children}
    </button>
  );
}

/**
 * Round icon-only chrome button (28px standard — CAPTURED).
 * Ghost styling, `aria-label` required.
 */
export function IconButton({
  label,
  size = 28,
  children,
  className,
  type,
  ...rest
}: {
  label: string;
  size?: 24 | 28 | 32;
  children: ReactNode;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type ?? "button"}
      aria-label={label}
      className={clsx(
        styles.button,
        styles.ghost,
        styles[`size${size}`],
        styles.pill,
        styles.iconOnly,
        className
      )}
      {...rest}
    >
      <span className={styles.icon} aria-hidden="true">
        {children}
      </span>
    </button>
  );
}
