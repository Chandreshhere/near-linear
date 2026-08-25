"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Toggle } from "@/components/ui/Toggle";
import { patchSplashConfig } from "./theme";
import {
  SIDEBAR_ITEMS,
  SIDEBAR_WIDTH_MAX,
  SIDEBAR_WIDTH_MIN,
  readHiddenItems,
  readSidebarWidth,
  writeHiddenItems,
  type SidebarItemKey,
} from "./sidebarConfig";
import styles from "./settings.module.css";

/**
 * "Customize" (App sidebar row, capture-preferences.md §6). Both controls are
 * live: the width writes `--sidebar-width` on <html> while you drag (the
 * pre-paint boot script restores it on reload), and visibility drives which
 * primary links the app sidebar renders.
 */
export function SidebarCustomizeDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [width, setWidth] = useState(244);
  const [hidden, setHidden] = useState<SidebarItemKey[]>([]);

  useEffect(() => {
    if (!open) return;
    setWidth(readSidebarWidth());
    setHidden(readHiddenItems());
  }, [open]);

  const applyWidth = (next: number) => {
    setWidth(next);
    document.documentElement.style.setProperty("--sidebar-width", `${next}px`);
    patchSplashConfig({ sidebarWidth: next });
  };

  const setVisible = (key: SidebarItemKey, visible: boolean) => {
    const next = visible ? hidden.filter((k) => k !== key) : [...hidden, key];
    setHidden(next);
    writeHiddenItems(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} width={480} label="Customize sidebar">
      <div className={styles.dialogHeader}>
        <span className={styles.dialogTitle}>Customize sidebar</span>
        <span className={styles.fieldHint}>
          Both settings apply immediately and persist across reloads.
        </span>
      </div>
      <div className={styles.dialogBody}>
        <div className={styles.fieldStack}>
          <label className={styles.fieldLabel} htmlFor="sidebar-width">
            Width
          </label>
          <div className={styles.rangeRow}>
            <input
              id="sidebar-width"
              type="range"
              className={styles.range}
              min={SIDEBAR_WIDTH_MIN}
              max={SIDEBAR_WIDTH_MAX}
              step={1}
              value={width}
              onChange={(e) => applyWidth(Number(e.currentTarget.value))}
            />
            <span className={styles.count}>{width}px</span>
          </div>
        </div>

        <div className={styles.fieldStack}>
          <span className={styles.fieldLabel}>Items</span>
          <div className={styles.toggleList}>
            {SIDEBAR_ITEMS.map((item) => (
              <div key={item.key} className={styles.toggleRow}>
                <span className={styles.rowLabel}>{item.label}</span>
                <Toggle
                  checked={!hidden.includes(item.key)}
                  onChange={(v) => setVisible(item.key, v)}
                  aria-label={`Show ${item.label} in the sidebar`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className={styles.dialogFooter}>
        <Button variant="secondary" size={32} onClick={() => onOpenChange(false)}>
          Done
        </Button>
      </div>
    </Dialog>
  );
}
