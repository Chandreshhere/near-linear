"use client";

import * as React from "react";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { PickerMenu } from "./PickerMenu";
import { buildAssigneeItems } from "./propertyItems";

/**
 * AssigneePicker — anchored assignee picker (MASTER_PROMPT.md §6.3,
 * shortcut `A` per §12). Items = "No assignee" (dashed 16px circle, echoing
 * the rail's dashed-person "Assign" glyph — capture doc §6) + every user
 * with a 16px avatar, built by buildAssigneeItems (shared with the issue
 * context menu's "Assignee ▸" submenu). Selecting updates every targeted
 * issue optimistically (§6.8) and the menu closes immediately.
 *
 * Clearing the assignee sends `assigneeId: null` on the wire — JSON drops
 * `undefined`, and wire `null` is this codebase's "clear the field" contract
 * (see markNotificationRead's `readAt: null` in SyncClient.ts; the store's
 * mergeInto normalizes null → undefined locally, so consumers only ever see
 * a missing assigneeId as unassigned).
 *
 * Uncontrolled by default (click the trigger); pass `open` + `onOpenChange`
 * to drive it from usePropertyShortcuts.
 */
export const AssigneePicker = observer(function AssigneePicker({
  issueIds,
  trigger,
  open,
  onOpenChange,
}: {
  issueIds: string[];
  trigger: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const store = useStore();
  const client = useSyncClient();
  const [localOpen, setLocalOpen] = React.useState(false);
  const isOpen = open ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;

  return (
    <PickerMenu
      open={isOpen}
      onOpenChange={setOpen}
      anchor={trigger}
      items={buildAssigneeItems(store, client, issueIds)}
      placeholder="Assign to…"
    />
  );
});
