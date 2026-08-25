"use client";

/**
 * The one source of truth for "what can this property be set to, and what
 * happens when you pick a value" — MASTER_PROMPT.md §6.3.
 *
 * The four property pickers (StatusPicker/PriorityPicker/AssigneePicker/
 * LabelPicker) render these rows inside the anchored PickerMenu surface; the
 * issue context menu (§6.3 Status ▸ / Priority ▸ / Assignee ▸ / Labels ▸)
 * renders the SAME rows as Radix submenus. Both therefore share one
 * definition of the vocabulary, the selected-state rule ("checked only when
 * every targeted issue holds the value") and the optimistic write (§6.8).
 *
 * Every builder takes the ids it acts on, so a single row and a whole
 * selection go down the identical path.
 */

import * as React from "react";
import type { SyncClient } from "@/lib/data/SyncClient";
import type { SyncStore } from "@/lib/data/store";
import type { IssueData, Priority } from "@/lib/data/types";
import { Avatar } from "@/components/ui/Avatar";
import { PriorityIcon, StatusIcon } from "@/components/icons/StatusIcon";
import type { PickerItem } from "./PickerMenu";
import { Icon } from "@/components/icons/Icon";

/* ================================================================
 * Glyphs shared by the picker rows
 * ================================================================ */

/** 16px dashed circle — the "no assignee" glyph (dashed-person idiom). */
export function NoAssigneeIcon() {
  return <Icon name="PersonDashed" size={16} color="currentColor" />;
}

/** 16px slot with a 9px round label-color swatch. */
export function LabelDot({ color }: { color: string }) {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="4.5" fill={color} />
    </svg>
  );
}

/* ================================================================
 * Builders
 * ================================================================ */

export const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 0, label: "No priority" },
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Low" },
];

/** Resolve the targeted ids to live rows (ids can go stale mid-interaction). */
function resolveIssues(store: SyncStore, issueIds: readonly string[]): IssueData[] {
  return issueIds
    .map((id) => store.get("Issue", id))
    .filter((issue): issue is IssueData => issue !== undefined);
}

export function buildStatusItems(
  store: SyncStore,
  client: SyncClient,
  issueIds: readonly string[],
  teamId: string,
): PickerItem[] {
  const issues = resolveIssues(store, issueIds);
  return store.statesForTeam(teamId).map((state) => ({
    id: state.id,
    label: state.name,
    icon: <StatusIcon category={state.category} color={state.color} />,
    selected:
      issues.length > 0 && issues.every((issue) => issue.stateId === state.id),
    onSelect: () => {
      for (const id of issueIds) {
        client.mutate.updateIssue(id, { stateId: state.id });
      }
    },
  }));
}

export function buildPriorityItems(
  store: SyncStore,
  client: SyncClient,
  issueIds: readonly string[],
): PickerItem[] {
  const issues = resolveIssues(store, issueIds);
  return PRIORITY_OPTIONS.map(({ value, label }) => ({
    id: String(value),
    label,
    icon: <PriorityIcon priority={value} />,
    selected:
      issues.length > 0 && issues.every((issue) => issue.priority === value),
    onSelect: () => {
      for (const id of issueIds) {
        client.mutate.updateIssue(id, { priority: value });
      }
    },
  }));
}

export function buildAssigneeItems(
  store: SyncStore,
  client: SyncClient,
  issueIds: readonly string[],
): PickerItem[] {
  const issues = resolveIssues(store, issueIds);
  const users = store
    .all("User")
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  return [
    {
      id: "no-assignee",
      label: "No assignee",
      icon: <NoAssigneeIcon />,
      selected:
        issues.length > 0 && issues.every((issue) => issue.assigneeId === undefined),
      onSelect: () => {
        for (const id of issueIds) {
          // Wire `null` clears the field (JSON cannot carry undefined);
          // the store normalizes it back to undefined on merge.
          client.mutate.updateIssue(id, {
            assigneeId: null as unknown as string,
          });
        }
      },
    },
    ...users.map(
      (user): PickerItem => ({
        id: user.id,
        label: user.displayName,
        icon: (
          <Avatar
            initials={user.initials}
            color={user.avatarColor}
            src={user.avatarUrl}
            size={16}
          />
        ),
        hint: user.name !== user.displayName ? user.name : undefined,
        selected:
          issues.length > 0 && issues.every((issue) => issue.assigneeId === user.id),
        onSelect: () => {
          for (const id of issueIds) {
            client.mutate.updateIssue(id, { assigneeId: user.id });
          }
        },
      }),
    ),
  ];
}

/**
 * Label rows use checkbox semantics over the whole selection: all-have →
 * remove everywhere, otherwise → add where missing. `keepOpen` lets the
 * PickerMenu stay open while several labels are toggled in a row.
 */
export function buildLabelItems(
  store: SyncStore,
  client: SyncClient,
  issueIds: readonly string[],
): PickerItem[] {
  const issues = resolveIssues(store, issueIds);
  const labels = store
    .all("Label")
    .filter((label) => !label.isGroup)
    .sort((a, b) => a.name.localeCompare(b.name));

  return labels.map((label) => {
    const allHave =
      issues.length > 0 &&
      issues.every((issue) => issue.labelIds.includes(label.id));
    return {
      id: label.id,
      label: label.name,
      icon: <LabelDot color={label.color} />,
      selected: allHave,
      keepOpen: true,
      onSelect: () => {
        for (const id of issueIds) {
          const issue = store.get("Issue", id);
          if (issue === undefined) continue;
          const has = issue.labelIds.includes(label.id);
          if (allHave) {
            if (has) {
              client.mutate.updateIssue(id, {
                labelIds: issue.labelIds.filter((x) => x !== label.id),
              });
            }
          } else if (!has) {
            client.mutate.updateIssue(id, {
              labelIds: [...issue.labelIds, label.id],
            });
          }
        }
      },
    };
  });
}
