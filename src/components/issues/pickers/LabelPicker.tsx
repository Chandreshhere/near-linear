"use client";

import * as React from "react";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { PickerMenu } from "./PickerMenu";
import { buildLabelItems } from "./propertyItems";

/**
 * LabelPicker — anchored multi-select label picker (MASTER_PROMPT.md §6.3,
 * shortcut `L` per §12). Items = every non-group label with its color dot
 * (buildLabelItems, shared with the issue context menu's "Labels ▸"
 * submenu); a row shows the trailing check only when the label is on ALL
 * targeted issues. Selecting TOGGLES the label (checkbox semantics over the
 * whole selection: all-have → remove everywhere, otherwise → add where
 * missing) via per-issue optimistic updateIssue calls (§6.8) — and, as the
 * documented exception to close-then-sync, the menu stays open (`keepOpen`)
 * so several labels can be toggled in a row.
 *
 * Uncontrolled by default (click the trigger); pass `open` + `onOpenChange`
 * to drive it from usePropertyShortcuts.
 */
export const LabelPicker = observer(function LabelPicker({
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
      items={buildLabelItems(store, client, issueIds)}
      placeholder="Change labels…"
    />
  );
});
