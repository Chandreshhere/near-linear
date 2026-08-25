"use client";

/**
 * Sidebar "More" popover — docs/analysis/video-timeline-1.md finding 3
 * (CAPTURED): clicking More opens a click-anchored popover with
 * `Members / Releases / Teams / ─── / Customize sidebar` overlapping the
 * team list; rows highlight on hover; dismissed by click-away (MASTER_PROMPT.md
 * §5, §16 item 3).
 *
 * The item list is exactly what the capture shows — do not add rows. All
 * three destinations are real workspace pages now (`/:ws/members`,
 * `/:ws/releases`, `/:ws/teams`) and render as real <a href> rows, so the
 * browser status line shows where they go and ⌘-click opens a tab.
 * "Customize sidebar" opens the same dialog Settings → Preferences → App
 * sidebar → Customize uses (§10.9) — one implementation, two entry points.
 */

import { useState, type JSX, type ReactElement } from "react";
import { useParams } from "next/navigation";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { SidebarCustomizeDialog } from "@/components/settings/SidebarCustomizeDialog";

/** Pencil (edit) — a one-off stroke glyph, not in the sprite sheet. */
function GlyphPencil(): JSX.Element {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M11.1 1.9a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3l-7 7c-.2.2-.4.3-.6.4l-3 .8a.6.6 0 0 1-.8-.8l.8-3c.1-.2.2-.5.4-.6l7.2-7.8Zm-6.5 8.4-.4 1.5 1.5-.4 6.6-6.6-1.1-1.1-6.6 6.6Z" />
    </svg>
  );
}

export function SidebarMoreMenu({
  trigger,
}: {
  trigger: ReactElement;
}): JSX.Element {
  const { workspace } = useParams<{ workspace: string }>();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const ws = `/${workspace}`;

  const items: MenuItem[] = [
    { label: "Members", href: `${ws}/members` },
    { label: "Releases", href: `${ws}/releases` },
    { label: "Teams", href: `${ws}/teams` },
    { type: "separator" },
    {
      label: "Customize sidebar",
      icon: <GlyphPencil />,
      // Opened after the menu's close-auto-focus has run, so the dialog's
      // focus trap wins (the HelpMenu → shortcuts window does the same).
      onSelect: () => window.requestAnimationFrame(() => setCustomizeOpen(true)),
    },
  ];

  return (
    <>
      <Menu trigger={trigger} items={items} align="start" side="bottom" />
      <SidebarCustomizeDialog open={customizeOpen} onOpenChange={setCustomizeOpen} />
    </>
  );
}
