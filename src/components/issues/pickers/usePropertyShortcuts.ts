"use client";

import { useCallback, useState } from "react";
import { useShortcut } from "@/lib/keyboard";

/**
 * usePropertyShortcuts — the S / P / A / L issue-action shortcuts
 * (MASTER_PROMPT.md §12) for list/board views.
 *
 * Registers the four single-key shortcuts through the central registry
 * (useShortcut — never a scattered listener; the registry already ignores
 * keystrokes inside editable targets) and returns controlled-open state the
 * view feeds into StatusPicker / PriorityPicker / AssigneePicker /
 * LabelPicker via their `open` + `onOpenChange` props.
 *
 * `getIds` returns the issue ids the shortcut should act on (current
 * selection, else the keyboard-highlighted row); a shortcut is a no-op while
 * it returns []. `getTeamId` returns the shared team of those issues, or
 * null for a mixed-team selection — status needs a single team's workflow,
 * so `S` is a no-op on null. Opening one picker closes the others.
 */

export interface PropertyShortcutsState {
  statusOpen: boolean;
  priorityOpen: boolean;
  assigneeOpen: boolean;
  labelOpen: boolean;
  setStatusOpen: (open: boolean) => void;
  setPriorityOpen: (open: boolean) => void;
  setAssigneeOpen: (open: boolean) => void;
  setLabelOpen: (open: boolean) => void;
}

export function usePropertyShortcuts(
  getIds: () => string[],
  getTeamId: () => string | null,
): PropertyShortcutsState {
  const [statusOpen, setStatusOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [labelOpen, setLabelOpen] = useState(false);

  const openOnly = useCallback(
    (which: "status" | "priority" | "assignee" | "label"): void => {
      setStatusOpen(which === "status");
      setPriorityOpen(which === "priority");
      setAssigneeOpen(which === "assignee");
      setLabelOpen(which === "label");
    },
    [],
  );

  useShortcut({
    id: "property.status",
    keys: "s",
    scope: "global",
    description: "Change status",
    handler: () => {
      if (getIds().length === 0) return;
      if (getTeamId() === null) return; // mixed teams — no shared workflow
      openOnly("status");
    },
  });

  useShortcut({
    id: "property.priority",
    keys: "p",
    scope: "global",
    description: "Change priority",
    handler: () => {
      if (getIds().length === 0) return;
      openOnly("priority");
    },
  });

  useShortcut({
    id: "property.assignee",
    keys: "a",
    scope: "global",
    description: "Assign to",
    handler: () => {
      if (getIds().length === 0) return;
      openOnly("assignee");
    },
  });

  useShortcut({
    id: "property.label",
    keys: "l",
    scope: "global",
    description: "Change labels",
    handler: () => {
      if (getIds().length === 0) return;
      openOnly("label");
    },
  });

  return {
    statusOpen,
    priorityOpen,
    assigneeOpen,
    labelOpen,
    setStatusOpen,
    setPriorityOpen,
    setAssigneeOpen,
    setLabelOpen,
  };
}
