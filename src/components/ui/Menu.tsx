"use client";

import * as React from "react";
import Link from "next/link";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Icon } from "@/components/icons/Icon";
import styles from "./menu.module.css";

/**
 * Dropdown menu primitive (Radix DropdownMenu restyled to the captured
 * Linear geometry — MASTER_PROMPT.md §6.2/§6.3).
 *
 * Anchored bottom-start by default, flips on collision (8px viewport
 * padding). While open, the trigger element itself carries
 * `data-menu-open="true"` so existing chrome styles
 * (`[data-menu-open="true"]`) keep the highlight persistent (§6.2).
 *
 * ANCHORING: the trigger element IS the Radix trigger (cloned, `asChild`).
 * It used to be wrapped in a `display: contents` span — an element that
 * generates no box, so the Popper read a 0×0 rect at (0,0) and every menu
 * built on this primitive opened in the top-left corner of the viewport
 * instead of under its trigger. Never reintroduce a boxless wrapper here.
 */

export type MenuItem = {
  type?: "item" | "separator";
  label?: string;
  icon?: React.ReactNode;
  shortcut?: string[];
  disabled?: boolean;
  /** Trailing ✓ (property submenus reuse the pickers' selected-state rule). */
  checked?: boolean;
  /**
   * `false` keeps the menu open after selecting — the multi-select exception
   * the LabelPicker documents (§6.3), so several labels toggle in a row.
   */
  closeOnSelect?: boolean;
  onSelect?: () => void;
  submenu?: MenuItem[];
  /**
   * Navigation rows render as a real `<a href>` (client-side <Link>), so the
   * browser status line shows the destination and ⌘-click opens a new tab —
   * the same rule the sidebar links follow (§5).
   */
  href?: string;
};

/** Trailing check for `checked` rows — same 12px glyph the filter menu uses. */
export function MenuCheck() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
      <path d="M9.98 3.05a.8.8 0 0 1 .03 1.13L5.42 9.07a.8.8 0 0 1-1.15.03L2.03 6.87a.8.8 0 1 1 1.14-1.13l1.66 1.68 4.02-4.34a.8.8 0 0 1 1.13-.03Z" fill="currentColor" />
    </svg>
  );
}

/** Inner layout of one menu row: icon slot · label · keycaps · ✓ · sub chevron */
export function ItemContent({
  item,
  hasSubmenu = false,
}: {
  item: MenuItem;
  hasSubmenu?: boolean;
}) {
  return (
    <>
      {item.icon != null && (
        <span className={styles.itemIcon} aria-hidden="true">
          {item.icon}
        </span>
      )}
      <span className={styles.itemLabel}>{item.label}</span>
      {item.shortcut && item.shortcut.length > 0 && (
        <span className={styles.shortcut} aria-hidden="true">
          {item.shortcut.map((key, i) => (
            <kbd key={i} className={styles.keycap}>
              {key}
            </kbd>
          ))}
        </span>
      )}
      {item.checked === true && (
        <span className={styles.itemCheck} aria-hidden="true">
          <MenuCheck />
        </span>
      )}
      {hasSubmenu && (
        <Icon name="ChevronRight" size={14} className={styles.subChevron} />
      )}
    </>
  );
}

function renderItems(items: MenuItem[]): React.ReactNode {
  return items.map((item, i) => {
    if (item.type === "separator") {
      return (
        <DropdownMenuPrimitive.Separator key={i} className={styles.separator} />
      );
    }
    if (item.submenu) {
      return (
        <DropdownMenuPrimitive.Sub key={i}>
          <DropdownMenuPrimitive.SubTrigger
            className={styles.item}
            disabled={item.disabled}
          >
            <ItemContent item={item} hasSubmenu />
          </DropdownMenuPrimitive.SubTrigger>
          <DropdownMenuPrimitive.Portal>
            <DropdownMenuPrimitive.SubContent
              className={styles.content}
              sideOffset={0}
              alignOffset={-4}
              collisionPadding={8}
            >
              {renderItems(item.submenu)}
            </DropdownMenuPrimitive.SubContent>
          </DropdownMenuPrimitive.Portal>
        </DropdownMenuPrimitive.Sub>
      );
    }
    const onSelect = (event: Event): void => {
      // preventDefault keeps the surface open (multi-select rows, §6.3).
      if (item.closeOnSelect === false) event.preventDefault();
      item.onSelect?.();
    };

    if (item.href !== undefined) {
      return (
        <DropdownMenuPrimitive.Item
          key={i}
          className={styles.item}
          disabled={item.disabled}
          onSelect={onSelect}
          asChild
        >
          <Link href={item.href}>
            <ItemContent item={item} />
          </Link>
        </DropdownMenuPrimitive.Item>
      );
    }

    return (
      <DropdownMenuPrimitive.Item
        key={i}
        className={styles.item}
        disabled={item.disabled}
        onSelect={onSelect}
      >
        <ItemContent item={item} />
      </DropdownMenuPrimitive.Item>
    );
  });
}

export function Menu({
  trigger,
  items,
  align = "start",
  side = "bottom",
}: {
  trigger: React.ReactElement;
  items: MenuItem[];
  align?: "start" | "end";
  side?: "top" | "bottom";
}) {
  const [open, setOpen] = React.useState(false);

  return (
    <DropdownMenuPrimitive.Root open={open} onOpenChange={setOpen}>
      <DropdownMenuPrimitive.Trigger asChild>
        {/* The caller's element itself is the trigger (and the popper anchor);
            it carries data-menu-open while the surface is open (§6.2). */}
        {React.cloneElement(
          trigger as React.ReactElement<Record<string, unknown>>,
          { "data-menu-open": open ? "true" : undefined }
        )}
      </DropdownMenuPrimitive.Trigger>
      <DropdownMenuPrimitive.Portal>
        <DropdownMenuPrimitive.Content
          className={styles.content}
          side={side}
          align={align}
          sideOffset={4}
          collisionPadding={8}
          loop
        >
          {renderItems(items)}
        </DropdownMenuPrimitive.Content>
      </DropdownMenuPrimitive.Portal>
    </DropdownMenuPrimitive.Root>
  );
}
