"use client";

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import styles from "./picker.module.css";

/**
 * PickerMenu — the shared anchored contextual picker surface
 * (MASTER_PROMPT.md §6.3; property-rail anatomy per
 * docs/analysis/capture-trendzo-37-research-work.md §6).
 *
 * Controlled Radix Popover (the ui/Popover primitive owns its own state, so
 * this uses @radix-ui/react-popover directly): anchored bottom-start, flips
 * on collision (8px viewport padding), fixed 240px width so the surface
 * never resizes while filtering. Top = borderless auto-focused filter input
 * (13px, transparent bg, hairline bottom border) that type-to-filters the
 * items (case-insensitive substring); below, 28px option rows.
 *
 * ↑/↓ + Enter + Escape are handled locally on the input — never through the
 * global shortcut registry (which skips editable targets anyway). Escape
 * follows the §6.9 hierarchy: clear the search text first, then close.
 * Selecting calls `onSelect`, then `onOpenChange(false)` IMMEDIATELY
 * (§6.8 optimistic pipeline: mutate → close, no spinners) — unless the item
 * opts out via `keepOpen` (multi-select label rows).
 */

export interface PickerItem {
  id: string;
  label: string;
  icon?: React.ReactNode;
  hint?: string;
  selected?: boolean;
  /** Multi-select rows (LabelPicker): selecting does NOT close the menu. */
  keepOpen?: boolean;
  onSelect: () => void;
}

function CheckIcon() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
      <path d="M12.78 4.72a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.97 1.97 4.47-4.47a.75.75 0 0 1 1.06 0Z" fill="currentColor" />
    </svg>
  );
}

export function PickerMenu({
  open,
  onOpenChange,
  anchor,
  items,
  placeholder,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  anchor: React.ReactElement;
  items: PickerItem[];
  placeholder: string;
}) {
  const baseId = React.useId();
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const listRef = React.useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = React.useState("");
  const [activeIndex, setActiveIndex] = React.useState(0);

  // Fresh surface on every open. (Resetting on close would flash during the
  // exit fade; keyboard-driven opens flip the `open` prop directly, so the
  // reset lives on the rising edge.)
  React.useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIndex(0);
    }
  }, [open]);

  const needle = query.trim().toLowerCase();
  const filtered =
    needle === ""
      ? items
      : items.filter((item) => item.label.toLowerCase().includes(needle));
  const active =
    filtered.length === 0 ? -1 : Math.min(activeIndex, filtered.length - 1);
  const activeId =
    active >= 0 ? `${baseId}-opt-${filtered[active].id}` : undefined;

  // Keep the keyboard-highlighted row visible while arrowing a long list.
  React.useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector('[data-active="true"]')
      ?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const select = (item: PickerItem): void => {
    // §6.8 close-then-sync: onSelect applies the optimistic mutation
    // synchronously, then the menu closes immediately — no spinners.
    item.onSelect();
    if (item.keepOpen !== true) onOpenChange(false);
  };

  const step = (delta: number): void => {
    if (filtered.length === 0) return;
    const from = active < 0 ? 0 : active;
    setActiveIndex((from + delta + filtered.length) % filtered.length);
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        step(1);
        break;
      case "ArrowUp":
        e.preventDefault();
        step(-1);
        break;
      case "Enter": {
        e.preventDefault();
        const item = active >= 0 ? filtered[active] : undefined;
        if (item !== undefined) select(item);
        break;
      }
      case "Escape":
        // §6.9 escape hierarchy: clear menu search text → close popover.
        // preventDefault marks the native event so Radix's dismissable
        // layer stands down — this handler owns Escape.
        e.preventDefault();
        if (query !== "") {
          setQuery("");
          setActiveIndex(0);
        } else {
          onOpenChange(false);
        }
        break;
      default:
        break;
    }
  };

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <PopoverPrimitive.Trigger asChild>
        {/* The anchor element ITSELF is the Radix trigger. A display:contents
            wrapper generates no layout box, so the positioner would read a
            0×0 rect at (0,0) and park the surface in the viewport corner —
            the same bug fixed in Menu/Popover. data-menu-open per §6.2. */}
        {React.cloneElement(
          anchor as React.ReactElement<Record<string, unknown>>,
          { "data-menu-open": open ? "true" : undefined }
        )}
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={styles.content}
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(event) => {
            // Deterministic auto-focus of the filter input.
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            // Escape landing outside the input (edge case): §6.9 still
            // applies — with search text present it only clears the text.
            if (query !== "") {
              event.preventDefault();
              setQuery("");
              setActiveIndex(0);
            }
          }}
        >
          <input
            ref={inputRef}
            className={styles.filter}
            type="text"
            value={query}
            placeholder={placeholder}
            aria-label={placeholder}
            role="combobox"
            aria-expanded="true"
            aria-controls={`${baseId}-list`}
            aria-activedescendant={activeId}
            aria-autocomplete="list"
            autoComplete="off"
            spellCheck={false}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onInputKeyDown}
          />
          <div
            ref={listRef}
            id={`${baseId}-list`}
            className={styles.list}
            role="listbox"
          >
            {filtered.map((item, index) => (
              <div
                key={item.id}
                id={`${baseId}-opt-${item.id}`}
                role="option"
                aria-selected={item.selected === true}
                className={styles.row}
                data-active={index === active ? "true" : undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(e) => {
                  // Keep the filter input focused through row clicks
                  // (required for keepOpen multi-select rows).
                  e.preventDefault();
                }}
                onClick={() => select(item)}
              >
                {item.icon != null && (
                  <span className={styles.rowIcon} aria-hidden="true">
                    {item.icon}
                  </span>
                )}
                <span className={styles.rowLabel}>{item.label}</span>
                {item.hint != null && (
                  <span className={styles.rowHint}>{item.hint}</span>
                )}
                {item.selected === true && (
                  <span className={styles.rowCheck} aria-hidden="true">
                    <CheckIcon />
                  </span>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <div className={styles.empty}>No matches</div>
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
