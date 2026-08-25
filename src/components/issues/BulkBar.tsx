"use client";

import type { ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { IconButton } from "@/components/ui/Button";
import { Kbd } from "@/components/ui/Kbd";
import type { SelectionStore } from "@/lib/issues/selection";
import styles from "./bulkbar.module.css";

/** 14px cross glyph (fill-based per §8) for the clear-selection button. */
function CrossGlyph() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="currentColor"
      role="img"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M3.72 3.72a.75.75 0 0 1 1.06 0L8 6.94l3.22-3.22a.75.75 0 1 1 1.06 1.06L9.06 8l3.22 3.22a.75.75 0 1 1-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 0 1-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 0 1 0-1.06Z" />
    </svg>
  );
}

/**
 * Bottom bulk-actions toolbar — MASTER_PROMPT.md §6.7 (multi-select
 * summons it). Floats bottom-center inside the content card (the mounting
 * container must be a positioning context); renders nothing without a
 * selection. Property pickers are injected by the list via `children`.
 */
export const BulkBar = observer(function BulkBar({
  store,
  children,
}: {
  store: SelectionStore;
  children?: ReactNode;
}) {
  if (!store.hasSelection) return null;

  return (
    <div className={styles.bar} role="toolbar" aria-label="Bulk actions">
      <span className={styles.count}>{store.selectionCount} selected</span>
      <IconButton
        size={24}
        label="Clear selection"
        onClick={() => store.clearSelection()}
      >
        <CrossGlyph />
      </IconButton>
      {children}
      <span className={styles.hint}>
        <Kbd keys={["Esc"]} />
      </span>
    </div>
  );
});
