"use client";

import * as React from "react";
import clsx from "clsx";
import styles from "./input.module.css";

/**
 * Text input — MASTER_PROMPT §7.2 (CAPTURED).
 * lg: 44px / r12 / p12 (large forms) · sm: 30px / r8 / p0-10 / 13px (settings).
 * bg elevated, 1px solid border, hover border lch(24.32% 6.48 272) token,
 * focus border = focus-ring color with the global outline suppressed (no
 * double ring). Password-manager overlays suppressed via data-1p-ignore.
 */
export function Input({
  inputSize = "lg",
  className,
  ...rest
}: { inputSize?: "lg" | "sm" } & React.ComponentPropsWithRef<"input">) {
  return (
    <input
      data-1p-ignore=""
      data-lpignore="true"
      {...rest}
      data-size={inputSize}
      className={clsx(
        styles.input,
        inputSize === "sm" ? styles.sm : styles.lg,
        className,
      )}
    />
  );
}
