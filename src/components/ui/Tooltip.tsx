"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { Kbd } from "./Kbd";
import styles from "./tooltip.module.css";

/**
 * Tooltip primitive (Radix Tooltip) — MASTER_PROMPT.md §6.4 (CAPTURED).
 * Small elevated panel: 12px/500 label + optional keycap chips ("Go to
 * my issues" + G M). Anchored bottom-center by default, flips on
 * collision (8px viewport padding), 6px offset.
 *
 * Wrap the app once in <TooltipProvider> (shared 400ms open delay with
 * instant re-open while moving between triggers).
 */

export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return (
    <TooltipPrimitive.Provider delayDuration={400} skipDelayDuration={300}>
      {children}
    </TooltipPrimitive.Provider>
  );
}

export function Tooltip({
  content,
  keys,
  side = "bottom",
  align = "center",
  children,
}: {
  /** Label text (or free-form inline content). */
  content: React.ReactNode;
  /** Optional pre-formatted keycap chips, e.g. ["G", "M"] or ["⌘", "K"]. */
  keys?: string[];
  side?: "top" | "bottom" | "left" | "right";
  align?: "start" | "center" | "end";
  /** Single trigger element (receives the Radix trigger props via asChild). */
  children: React.ReactElement;
}) {
  return (
    <TooltipPrimitive.Root>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          className={styles.content}
          side={side}
          align={align}
          sideOffset={6}
          collisionPadding={8}
        >
          <span>{content}</span>
          {keys && keys.length > 0 ? <Kbd keys={keys} /> : null}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}
