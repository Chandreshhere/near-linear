"use client";

import type { ReactNode } from "react";
import { toast } from "sonner";

/**
 * Toast helpers (MASTER_PROMPT §6.5 — sonner, exact behavior contract).
 * The viewport (src/components/shell/ToastViewport.tsx) owns position,
 * stacking, styling and per-toast close buttons; these helpers only fire
 * toasts through the sonner API.
 */

/** Small inline clipboard glyph (fill-based per §8, drawn at 14px). */
function ClipboardIcon() {
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
      {/* board: outer rounded rect with even-odd inner cutout */}
      <path
        fillRule="evenodd"
        d="M5 1.5h6c1.1 0 2 .9 2 2v9c0 1.1-.9 2-2 2H5c-1.1 0-2-.9-2-2v-9c0-1.1.9-2 2-2Zm-.5 1.75V13c0 .28.22.5.5.5h6c.28 0 .5-.22.5-.5V3.25c0-.28-.22-.5-.5-.5H5c-.28 0-.5.22-.5.5Z"
      />
      {/* clip tab */}
      <rect x="5.5" y="0.5" width="5" height="3.5" rx="1" />
      {/* content lines */}
      <rect x="6" y="6" width="4" height="1.25" rx="0.625" />
      <rect x="6" y="8.75" width="4" height="1.25" rx="0.625" />
    </svg>
  );
}

/** Fire a standard toast (bottom-right stack, individually dismissible). */
export function showToast(message: string, opts?: { icon?: ReactNode }) {
  toast(message, opts?.icon !== undefined ? { icon: opts.icon } : undefined);
}

/** Clipboard-style toast: clipboard glyph + message (§6.5 copy actions). */
export function showCopyToast(message: string) {
  toast(message, { icon: <ClipboardIcon /> });
}

/** Copy text via the Clipboard API, then confirm with a clipboard toast. */
export async function copyToClipboard(text: string, toastMessage: string) {
  try {
    await navigator.clipboard.writeText(text);
    showCopyToast(toastMessage);
  } catch {
    toast("Failed to copy to clipboard");
  }
}
