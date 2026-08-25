"use client";

import * as React from "react";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { PickerMenu } from "./PickerMenu";
import { buildStatusItems } from "./propertyItems";

/**
 * StatusPicker — anchored workflow-state picker (MASTER_PROMPT.md §6.3,
 * shortcut `S` per §12). Items are the team's workflow states in category
 * order (buildStatusItems, shared with the issue context menu's "Status ▸"
 * submenu); selecting updates every targeted issue optimistically (§6.8) and
 * the menu closes immediately.
 *
 * Uncontrolled by default (click the trigger); pass `open` + `onOpenChange`
 * to drive it from usePropertyShortcuts.
 */
export const StatusPicker = observer(function StatusPicker({
  teamId,
  issueIds,
  trigger,
  open,
  onOpenChange,
}: {
  teamId: string;
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
      items={buildStatusItems(store, client, issueIds, teamId)}
      placeholder="Change status…"
    />
  );
});
