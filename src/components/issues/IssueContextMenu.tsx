"use client";

/**
 * The issue entity's context menu — MASTER_PROMPT.md §6.3 ("right-click opens
 * the context menu for that entity … acting on the current selection if the
 * target is selected") and §6.7 (highlight ≠ selection).
 *
 * One definition, two mounts: the list row (IssueList) and the board card
 * (board/Card). Both wrap their row in <IssueContextMenu>, so right-click and
 * the hover ⋯ affordance land on the same items, and both act on the same ids:
 * the whole selection when the target row is part of it, otherwise just the
 * target.
 *
 * The four property submenus render the rows the anchored pickers render —
 * literally the same builders (pickers/propertyItems) — so a status set from
 * the context menu and a status set with `S` are the same optimistic write.
 */

import * as React from "react";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type { IssueData } from "@/lib/data/types";
import type { SelectionStore } from "@/lib/issues/selection";
import {
  buildAssigneeItems,
  buildLabelItems,
  buildPriorityItems,
  buildStatusItems,
} from "@/components/issues/pickers/propertyItems";
import type { PickerItem } from "@/components/issues/pickers/PickerMenu";
import { AppContextMenu } from "@/components/ui/ContextMenu";
import type { MenuItem } from "@/components/ui/Menu";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { copyToClipboard, showToast } from "@/lib/toast";
import styles from "./issuecontextmenu.module.css";

/** "Research Work" → "research-work" (issue route: /issue/[id]/[slug]). */
function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

export function issuePath(workspace: string, issue: IssueData): string {
  return `/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`;
}

/** Picker rows → menu rows: the ✓ carries the pickers' selected-state rule. */
function toMenuItems(items: PickerItem[], keepOpen = false): MenuItem[] {
  return items.map((item) => ({
    label: item.label,
    icon: item.icon,
    checked: item.selected === true,
    closeOnSelect: keepOpen ? false : undefined,
    onSelect: item.onSelect,
  }));
}

export const IssueContextMenu = observer(function IssueContextMenu({
  issue,
  selection,
  children,
}: {
  issue: IssueData;
  /** Omitted on surfaces without a selection model — then the menu is single-row. */
  selection?: SelectionStore;
  children: React.ReactNode;
}) {
  const store = useStore();
  const client = useSyncClient();
  const [confirmingDelete, setConfirmingDelete] = React.useState(false);

  // §6.3: a right-click on a SELECTED row acts on the whole selection; a
  // right-click anywhere else acts on that row alone (and never silently
  // widens to whatever happens to be highlighted).
  const inSelection = selection?.isSelected(issue.id) === true;
  const targetIds = inSelection ? selection.effectiveIds : [issue.id];
  const count = targetIds.length;
  const suffix = count > 1 ? ` (${count})` : "";

  const copyUrl = (): void => {
    const url = `${window.location.origin}${issuePath(client.workspaceSlug, issue)}`;
    void copyToClipboard(url, "Copied issue link to clipboard");
  };

  const copyId = (): void => {
    const ids = targetIds
      .map((id) => store.get("Issue", id)?.identifier)
      .filter((identifier): identifier is string => identifier !== undefined);
    if (ids.length === 0) return;
    void copyToClipboard(
      ids.join(", "),
      ids.length === 1 ? `Copied ${ids[0]}` : `Copied ${ids.length} issue IDs`,
    );
  };

  const confirmDelete = (): void => {
    for (const id of targetIds) client.mutate.deleteIssue(id);
    selection?.clearSelection();
    setConfirmingDelete(false);
    showToast(count === 1 ? `Deleted ${issue.identifier}` : `Deleted ${count} issues`);
  };

  const items: MenuItem[] = [
    {
      label: `Status${suffix}`,
      submenu: toMenuItems(buildStatusItems(store, client, targetIds, issue.teamId)),
    },
    {
      label: `Priority${suffix}`,
      submenu: toMenuItems(buildPriorityItems(store, client, targetIds)),
    },
    {
      label: `Assignee${suffix}`,
      submenu: toMenuItems(buildAssigneeItems(store, client, targetIds)),
    },
    {
      label: `Labels${suffix}`,
      // Multi-select: toggling a label keeps the submenu open (§6.3).
      submenu: toMenuItems(buildLabelItems(store, client, targetIds), true),
    },
    { type: "separator" },
    { label: "Copy issue URL", onSelect: copyUrl },
    { label: "Copy issue ID", onSelect: copyId },
    { type: "separator" },
    {
      label: count > 1 ? `Delete ${count} issues…` : "Delete issue…",
      shortcut: ["⌘", "⌫"],
      onSelect: () => setConfirmingDelete(true),
    },
  ];

  return (
    <>
      <AppContextMenu items={items}>{children}</AppContextMenu>
      <Dialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        width={400}
        label="Delete issue"
      >
        <div className={styles.confirm}>
          <h2 className={styles.confirmTitle}>
            {count > 1 ? `Delete ${count} issues?` : `Delete ${issue.identifier}?`}
          </h2>
          <p className={styles.confirmBody}>
            {count > 1
              ? "The selected issues will be removed from every view. This cannot be undone."
              : `“${issue.title}” will be removed from every view. This cannot be undone.`}
          </p>
          <div className={styles.confirmActions}>
            <Button size={28} onClick={() => setConfirmingDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size={28}
              className={styles.destructive}
              onClick={confirmDelete}
            >
              Delete
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
});
