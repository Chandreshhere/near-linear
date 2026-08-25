"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import styles from "./popover.module.css";

/**
 * Popover primitive (Radix Popover) — same captured surface as Menu
 * (MASTER_PROMPT.md §6.3), free-form content. Anchored bottom-start by
 * default, flips on collision (8px viewport padding). The trigger
 * element carries `data-menu-open="true"` while open so its highlight
 * persists (§6.2).
 *
 * ANCHORING: the caller's element IS the trigger (and the popper anchor).
 * A `display: contents` wrapper used to sit in between; it generates no box,
 * so the popper measured a 0×0 rect at (0,0) and the surface opened in the
 * viewport corner. Never wrap the trigger in a boxless element.
 */
export function Popover({
  trigger,
  children,
  align = "start",
  side = "bottom",
}: {
  trigger: React.ReactElement;
  children: React.ReactNode;
  align?: "start" | "end";
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        {React.cloneElement(
          trigger as React.ReactElement<Record<string, unknown>>,
          { "data-menu-open": open ? "true" : undefined }
        )}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={styles.content}
          side={side}
          align={align}
          sideOffset={4}
          collisionPadding={8}
        >
          {children}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
