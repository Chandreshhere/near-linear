"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import styles from "./select.module.css";

/**
 * Select primitive (Radix Select restyled to the captured Linear
 * geometry). Trigger = small chrome control (28px, elevated bg, ring
 * shadow — §7.1); content = menu surface (§6.2–6.3) with 28px items and
 * a trailing check on the selected option. Anchored below the trigger,
 * flips on collision (8px viewport padding).
 */

export type SelectOption = {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
};

function CheckGlyph() {
  return (
    <svg
      viewBox="0 0 16 16"
      width={16}
      height={16}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M12.78 4.72a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.97 1.97 4.47-4.47a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

/* Dedicated 9×5 form-control chevron (CAPTURED viewBox family). */
function ChevronDownGlyph() {
  return (
    <svg
      viewBox="0 0 9 5"
      width={9}
      height={5}
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M.7.68a.67.67 0 0 1 .94-.09L4.5 2.97 7.36.59a.67.67 0 0 1 .86 1.03L5.16 4.17a.95.95 0 0 1-1.32 0L.78 1.62A.67.67 0 0 1 .7.68Z" />
    </svg>
  );
}

export function Select({
  value,
  onValueChange,
  options,
  placeholder,
  label,
  disabled,
  className,
}: {
  value?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  /** Accessible name for the trigger. */
  label?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <SelectPrimitive.Root
      value={value}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <SelectPrimitive.Trigger
        className={
          className ? `${styles.trigger} ${className}` : styles.trigger
        }
        aria-label={label}
      >
        <span className={styles.triggerValue}>
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <span className={styles.triggerChevron}>
            <ChevronDownGlyph />
          </span>
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={styles.content}
          position="popper"
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
        >
          <SelectPrimitive.Viewport>
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                disabled={option.disabled}
                className={styles.item}
              >
                <span className={styles.itemLabel}>
                  <SelectPrimitive.ItemText>
                    {option.label}
                  </SelectPrimitive.ItemText>
                </span>
                <SelectPrimitive.ItemIndicator asChild>
                  <span className={styles.itemCheck}>
                    <CheckGlyph />
                  </span>
                </SelectPrimitive.ItemIndicator>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}
