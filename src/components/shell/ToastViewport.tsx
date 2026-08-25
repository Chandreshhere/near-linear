"use client";

import { Toaster } from "sonner";

/**
 * Toast viewport (CAPTURED behavior contract, §6.5):
 * bottom-right stack, dark pill, 13px, 8px radius, long-lived with
 * individual close buttons; hotkey Alt+T (sonner default).
 */
export function ToastViewport() {
  return (
    <Toaster
      position="bottom-right"
      closeButton
      duration={6500}
      gap={8}
      toastOptions={{
        style: {
          borderRadius: "var(--radius-row)",
          fontSize: "13px",
          background: "var(--color-bg-elevated)",
          border: "var(--thin-pixel) solid var(--color-border-solid)",
          color: "var(--color-text-base)",
          boxShadow: "var(--shadow-medium)",
        },
      }}
    />
  );
}
