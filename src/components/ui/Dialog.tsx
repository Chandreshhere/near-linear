"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { CSSProperties, ReactNode } from "react";
import styles from "./dialog.module.css";

/**
 * Modal dialog primitive (MASTER_PROMPT §7.6, §6.3/§6.6 motion vocabulary).
 * Radix handles focus trap, Escape-to-close, outside-click dismiss and
 * scroll lock; focus returns to the trigger on close.
 *
 * Overlay: fixed inset-0 rgba(0,0,0,.4), fade-in 150ms.
 * Content: centered, elevated bg, 1px solid border, radius 12px,
 * shadow-medium, default width 640px (max calc(100vw - 32px));
 * enter = fade + scale .98->1 + 2px drop, 150ms ease-out-quad.
 */
export function Dialog({
  open,
  onOpenChange,
  width,
  children,
  label,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  width?: number;
  children: ReactNode;
  label: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className={styles.overlay} />
        <RadixDialog.Content
          className={styles.content}
          aria-label={label}
          aria-describedby={undefined}
          style={
            width !== undefined
              ? ({ "--dialog-width": `${width}px` } as CSSProperties)
              : undefined
          }
        >
          {children}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
