"use client";

/**
 * `?` keyboard-shortcuts window — docs/analysis/research-nav-auth.md §2
 * ("the complete in-app list is behind `?` … or Help & Feedback > Keyboard
 * shortcuts"), rendering the registry documented in MASTER_PROMPT.md §12.
 *
 * <ShortcutsDialogHost/> is a mount-once host (workspace layout): it owns the
 * open state, registers `?` in the central registry (id "help.shortcuts") and
 * listens for openShortcutsDialog() so the Help menu can open it too.
 *
 * The curated SECTIONS below are the documented registry. A final live
 * "Registered this session" section is rendered from getRegisteredShortcuts()
 * + formatKeys(), so whatever is actually mounted (view/list/issue scopes)
 * shows up — deduped by id, and skipped when a curated row already claims the
 * same label.
 */

import { useEffect, useState, type JSX } from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Kbd } from "@/components/ui/Kbd";
import { formatKeys, getRegisteredShortcuts, useShortcut } from "@/lib/keyboard";
import styles from "./shortcuts.module.css";

/* ================================================================
 * Module-level open event (Help menu → this host)
 * ================================================================ */

const OPEN_EVENT = "linear:shortcuts:open";

/** Ask the mounted <ShortcutsDialogHost/> to open the shortcuts window. */
export function openShortcutsDialog(): void {
  if (typeof window === "undefined") return; // SSR guard
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

/* ================================================================
 * Documented registry (§12) — glyphs match the macOS reference capture
 * ================================================================ */

interface ShortcutRow {
  label: string;
  keys: string[];
}

interface ShortcutSection {
  title: string;
  rows: ShortcutRow[];
}

const SECTIONS: ShortcutSection[] = [
  {
    title: "Navigation",
    rows: [
      { label: "Inbox", keys: ["G", "then", "I"] },
      { label: "My issues", keys: ["G", "then", "M"] },
      { label: "Active issues", keys: ["G", "then", "A"] },
      { label: "Backlog", keys: ["G", "then", "B"] },
      { label: "Switch workspace", keys: ["O", "then", "W"] },
      { label: "Favorites", keys: ["O", "then", "F"] },
      { label: "Search", keys: ["/"] },
      { label: "Command palette", keys: ["⌘", "K"] },
      { label: "Agent", keys: ["⌘", "J"] },
    ],
  },
  {
    title: "Issues",
    rows: [
      { label: "Create issue", keys: ["C"] },
      { label: "Status", keys: ["S"] },
      { label: "Priority", keys: ["P"] },
      { label: "Assignee", keys: ["A"] },
      { label: "Label", keys: ["L"] },
      { label: "Select", keys: ["X"] },
      { label: "Extend selection", keys: ["⇧", "↑/↓"] },
      { label: "Select all", keys: ["⌘", "A"] },
      { label: "Peek", keys: ["Space"] },
      { label: "Open", keys: ["Enter"] },
      { label: "Delete", keys: ["⌘", "⌫"] },
    ],
  },
  {
    title: "Views",
    rows: [
      { label: "Toggle board/list", keys: ["⌘", "B"] },
      { label: "Display options", keys: ["⇧", "V"] },
      { label: "Filter", keys: ["F"] },
      { label: "Save view", keys: ["⌥", "V"] },
      { label: "Find in view", keys: ["⌘", "F"] },
    ],
  },
  {
    title: "Inbox",
    rows: [
      { label: "Read/unread", keys: ["U"] },
      { label: "Mark all read", keys: ["⌥", "U"] },
      { label: "Snooze", keys: ["H"] },
      { label: "Delete", keys: ["⌫"] },
    ],
  },
  {
    title: "Editor",
    rows: [
      { label: "Bold", keys: ["⌘", "B"] },
      { label: "Italic", keys: ["⌘", "I"] },
      { label: "Link", keys: ["⌘", "K"] },
      { label: "Slash commands", keys: ["/"] },
    ],
  },
  {
    title: "Application",
    rows: [
      { label: "Shortcuts", keys: ["?"] },
      { label: "Settings", keys: ["⌘", ","] },
      { label: "Full screen", keys: ["⌘", "⇧", "F"] },
    ],
  },
];

const CURATED_LABELS: ReadonlySet<string> = new Set(
  SECTIONS.flatMap((section) =>
    section.rows.map((row) => row.label.toLowerCase())
  )
);

/**
 * Live registry snapshot minus everything the curated sections already show.
 * formatKeys() is OS-dependent, so this only ever runs while the dialog is
 * open (client-side, after mount) — no hydration mismatch.
 */
function registeredRows(): ShortcutRow[] {
  const seen = new Set<string>();
  const rows: ShortcutRow[] = [];
  for (const shortcut of getRegisteredShortcuts()) {
    if (seen.has(shortcut.id)) continue;
    seen.add(shortcut.id);
    const label = shortcut.description ?? shortcut.id;
    if (CURATED_LABELS.has(label.toLowerCase())) continue;
    rows.push({ label, keys: formatKeys(shortcut.keys) });
  }
  return rows;
}

/* ================================================================
 * Rendering
 * ================================================================ */

/** Keycap chips with the sequence joiner ("G then I") rendered as text. */
function KeyChips({ keys }: { keys: string[] }): JSX.Element {
  return (
    <span className={styles.keys}>
      {keys.map((chip, i) =>
        chip === "then" ? (
          <span key={i} className={styles.then}>
            then
          </span>
        ) : (
          <Kbd key={i} keys={[chip]} />
        )
      )}
    </span>
  );
}

function Row({ row }: { row: ShortcutRow }): JSX.Element {
  return (
    <div className={styles.row}>
      <span className={styles.rowLabel}>{row.label}</span>
      <KeyChips keys={row.keys} />
    </div>
  );
}

function ShortcutsBody(): JSX.Element {
  const live = registeredRows();
  return (
    <>
      <div className={styles.header}>
        <h2 className={styles.title}>Keyboard shortcuts</h2>
      </div>
      <div className={styles.body}>
        <div className={styles.grid}>
          {SECTIONS.map((section) => (
            <section key={section.title} className={styles.section}>
              <h3 className={styles.sectionTitle}>{section.title}</h3>
              {section.rows.map((row) => (
                <Row key={row.label} row={row} />
              ))}
            </section>
          ))}
          {live.length > 0 && (
            <section className={`${styles.section} ${styles.live}`}>
              <h3 className={styles.sectionTitle}>Registered this session</h3>
              <div className={styles.liveRows}>
                {live.map((row, i) => (
                  <Row key={`${i}-${row.label}`} row={row} />
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </>
  );
}

/* ================================================================
 * Host
 * ================================================================ */

export function ShortcutsDialogHost(): JSX.Element {
  const [open, setOpen] = useState(false);

  // `?` — the event key already encodes shift ("shift+/" produces "?"), so the
  // registry matches it as a single combo (src/lib/keyboard.tsx strictShift).
  useShortcut({
    id: "help.shortcuts",
    keys: "?",
    scope: "global",
    description: "Keyboard shortcuts",
    handler: () => setOpen((prev) => !prev),
  });

  // openShortcutsDialog() event bridge (Help menu, command palette, …).
  useEffect(() => {
    const onOpen = (): void => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      width={720}
      label="Keyboard shortcuts"
    >
      <ShortcutsBody />
    </Dialog>
  );
}
