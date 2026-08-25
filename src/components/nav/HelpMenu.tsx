"use client";

/**
 * Bottom-left "?" help menu (MASTER_PROMPT.md §5 — "Bottom: floating Help `?`
 * button"). Per docs/analysis/research-nav-auth.md §2 the canonical shortcut
 * list lives behind `?` / "Help & Feedback > Keyboard shortcuts", so the first
 * row opens <ShortcutsDialogHost/>'s window.
 *
 * "Toggle theme" flips `html.dark` and persists `splashScreenConfig.darkMode`
 * — the same key the pre-paint boot script in src/app/layout.tsx reads, so the
 * choice survives a reload with no theme flash (§3).
 *
 * Shares the switcher surface (workspacemenu.module.css); opens upward
 * (side="top") from the floating help card.
 */

import { cloneElement, useState, type JSX, type ReactElement } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Kbd } from "@/components/ui/Kbd";
import { openShortcutsDialog } from "./ShortcutsDialog";
import styles from "./workspacemenu.module.css";

const CONFIG_KEY = "splashScreenConfig";

function readConfig(storage: Storage): Record<string, unknown> {
  try {
    const raw = storage.getItem(CONFIG_KEY);
    if (raw === null) return {};
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * Persist `darkMode`. The boot script prefers sessionStorage when it holds a
 * config, so mirror there too — otherwise a reload would resurrect the old
 * theme.
 */
function persistDarkMode(dark: boolean): void {
  try {
    const cfg = readConfig(window.localStorage);
    cfg.darkMode = dark;
    window.localStorage.setItem(CONFIG_KEY, JSON.stringify(cfg));
    if (window.sessionStorage.getItem(CONFIG_KEY) !== null) {
      const session = readConfig(window.sessionStorage);
      session.darkMode = dark;
      window.sessionStorage.setItem(CONFIG_KEY, JSON.stringify(session));
    }
  } catch {
    /* storage unavailable — the class flip still applies for this session */
  }
}

function toggleTheme(): void {
  const de = document.documentElement;
  const dark = !de.classList.contains("dark");
  de.classList.toggle("dark", dark);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta !== null) meta.setAttribute("content", dark ? "#09090A" : "#EFEFF0");
  persistDarkMode(dark);
}

/**
 * Open the shortcuts window after the menu has closed, so Radix's
 * close-auto-focus (which returns focus to the "?" button) cannot steal focus
 * from the dialog's focus trap.
 */
function openShortcutsAfterClose(): void {
  window.requestAnimationFrame(() => openShortcutsDialog());
}

export function HelpMenu({ trigger }: { trigger: ReactElement }): JSX.Element {
  const [open, setOpen] = useState(false);

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        {cloneElement(trigger as ReactElement<Record<string, unknown>>, {
          "aria-expanded": open,
          "data-menu-open": open ? "true" : undefined,
        })}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={styles.content}
          side="top"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          loop
        >
          <DropdownMenu.Item
            className={styles.item}
            onSelect={openShortcutsAfterClose}
          >
            <span className={styles.label}>Keyboard shortcuts</span>
            <span className={styles.keys}>
              <Kbd keys={["?"]} />
            </span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.item}>
            <span className={styles.label}>Documentation</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.item}>
            <span className={styles.label}>Contact support</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.item}>
            <span className={styles.label}>What&rsquo;s new</span>
          </DropdownMenu.Item>

          <DropdownMenu.Separator className={styles.separator} />

          <DropdownMenu.Item className={styles.item} onSelect={toggleTheme}>
            <span className={styles.label}>Toggle theme</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
