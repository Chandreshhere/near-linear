"use client";

import * as React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { ItemContent, type MenuItem } from "./Menu";
import styles from "./menu.module.css";
import boundary from "./contextmenu.module.css";

/**
 * Contextual menu boundary (Radix ContextMenu) — MASTER_PROMPT.md §6.3:
 * every interactive region is wrapped in a `data-contextual-menu`
 * boundary; right-click opens the entity's menu anchored at the pointer.
 * Item rendering and surface are identical to Menu (menu.module.css) —
 * `ItemContent` is imported from Menu.tsx so a row never drifts between the
 * two surfaces.
 */

function renderItems(items: MenuItem[]): React.ReactNode {
  return items.map((item, i) => {
    if (item.type === "separator") {
      return (
        <ContextMenuPrimitive.Separator key={i} className={styles.separator} />
      );
    }
    if (item.submenu) {
      return (
        <ContextMenuPrimitive.Sub key={i}>
          <ContextMenuPrimitive.SubTrigger
            className={styles.item}
            disabled={item.disabled}
          >
            <ItemContent item={item} hasSubmenu />
          </ContextMenuPrimitive.SubTrigger>
          <ContextMenuPrimitive.Portal>
            <ContextMenuPrimitive.SubContent
              className={styles.content}
              sideOffset={0}
              alignOffset={-4}
              collisionPadding={8}
            >
              {renderItems(item.submenu)}
            </ContextMenuPrimitive.SubContent>
          </ContextMenuPrimitive.Portal>
        </ContextMenuPrimitive.Sub>
      );
    }
    return (
      <ContextMenuPrimitive.Item
        key={i}
        className={styles.item}
        disabled={item.disabled}
        onSelect={(event) => {
          // preventDefault keeps the surface open (multi-select rows, §6.3).
          if (item.closeOnSelect === false) event.preventDefault();
          item.onSelect?.();
        }}
      >
        <ItemContent item={item} />
      </ContextMenuPrimitive.Item>
    );
  });
}

/**
 * Open the context menu that owns `node` at a point, from code — the ⋯ row
 * affordance (§6.3 "the row overflow opens the same menu as right-click").
 * Radix's trigger listens for a real `contextmenu` event and anchors on its
 * clientX/clientY, so replaying one is the whole mechanism: no second menu
 * implementation, no imperative handle to thread through the row.
 */
export function openContextMenuAt(node: Element | null, x: number, y: number): void {
  if (node === null || typeof MouseEvent === "undefined") return;
  node.dispatchEvent(
    new MouseEvent("contextmenu", {
      bubbles: true,
      cancelable: true,
      clientX: x,
      clientY: y,
    }),
  );
}

/** Replay a contextmenu event under a button, anchored at its bottom-left. */
export function openContextMenuFromButton(button: HTMLElement | null): void {
  if (button === null) return;
  const rect = button.getBoundingClientRect();
  openContextMenuAt(button, Math.round(rect.left), Math.round(rect.bottom));
}

export function AppContextMenu({
  items,
  children,
}: {
  items: MenuItem[];
  children: React.ReactNode;
}) {
  return (
    <ContextMenuPrimitive.Root>
      <ContextMenuPrimitive.Trigger asChild>
        {/* display:contents boundary — zero layout impact (§6.3) */}
        <div className={boundary.triggerWrap} data-contextual-menu="true">
          {children}
        </div>
      </ContextMenuPrimitive.Trigger>
      <ContextMenuPrimitive.Portal>
        <ContextMenuPrimitive.Content
          className={styles.content}
          collisionPadding={8}
        >
          {renderItems(items)}
        </ContextMenuPrimitive.Content>
      </ContextMenuPrimitive.Portal>
    </ContextMenuPrimitive.Root>
  );
}
