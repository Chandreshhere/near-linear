"use client";

import * as React from "react";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { PickerMenu } from "./PickerMenu";
import { buildPriorityItems } from "./propertyItems";

/**
 * PriorityPicker — anchored priority picker (MASTER_PROMPT.md §6.3,
 * shortcut `P` per §12). Fixed items No priority/Urgent/High/Medium/Low
 * (Priority 0–4, from buildPriorityItems — shared with the issue context
 * menu's "Priority ▸" submenu); selecting updates every targeted issue
 * optimistically (§6.8) and the menu closes immediately.
 *
 * Uncontrolled by default (click the trigger); pass `open` + `onOpenChange`
 * to drive it from usePropertyShortcuts.
 */
export const PriorityPicker = observer(function PriorityPicker({
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
      items={buildPriorityItems(store, client, issueIds)}
      placeholder="Change priority…"
    />
  );
});
