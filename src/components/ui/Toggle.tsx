"use client";

import styles from "./toggle.module.css";

/**
 * Signature squish toggle — MASTER_PROMPT §7.3 (CAPTURED, exact).
 * A styled NATIVE input[type=checkbox]: track 30×20 r72; the thumb is the
 * ::before pseudo positioned by BOTH left and right insets (L3/R13 →
 * L13/R3). Each inset transitions .1s ease-out with a 50ms delay that
 * swaps sides per direction, so the leading edge moves first and the
 * thumb stretches mid-travel. Hit area inflated -6px via ::after.
 */
export function Toggle({
  checked,
  onChange,
  "aria-label": ariaLabel,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  "aria-label"?: string;
  disabled?: boolean;
}) {
  return (
    <input
      type="checkbox"
      className={styles.toggle}
      checked={checked}
      disabled={disabled}
      aria-label={ariaLabel}
      onChange={(e) => onChange(e.currentTarget.checked)}
    />
  );
}
