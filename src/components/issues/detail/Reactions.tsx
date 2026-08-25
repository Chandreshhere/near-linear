"use client";

/**
 * Issue reactions — the "Add reaction" control captured under the description
 * (capture-trendzo-37-research-work.md §4) made real.
 *
 * The button opens a small anchored picker of the twelve reactions people
 * actually reach for; picking one appends the current user to that emoji's
 * bucket on `IssueData.reactions` (optimistic, §6.8). Existing buckets render
 * as chips ahead of the button: emoji + count, active while the current user
 * is in the bucket, and clicking one toggles membership. A bucket that loses
 * its last member is dropped rather than left at zero.
 */

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { observer } from "mobx-react-lite";
import { useSyncClient } from "@/lib/data/DataProvider";
import type { IssueData, ReactionData } from "@/lib/data/types";
import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { CURRENT_USER_ID } from "./constants";
import styles from "./detail.module.css";

/** The twelve common reactions offered by the picker. */
const EMOJI_CHOICES = [
  "👍",
  "👎",
  "😄",
  "🎉",
  "😕",
  "❤️",
  "🚀",
  "👀",
  "🙌",
  "🔥",
  "💯",
  "✅",
] as const;

/** Plain (non-observable) copy of the stored buckets. */
function currentBuckets(issue: IssueData): ReactionData[] {
  return (issue.reactions ?? []).map((reaction) => ({
    emoji: reaction.emoji,
    userIds: [...reaction.userIds],
  }));
}

/** Add/remove the current user in `emoji`'s bucket; empty buckets are dropped. */
function toggled(buckets: ReactionData[], emoji: string): ReactionData[] {
  const existing = buckets.find((bucket) => bucket.emoji === emoji);
  if (existing === undefined) {
    return [...buckets, { emoji, userIds: [CURRENT_USER_ID] }];
  }
  const has = existing.userIds.includes(CURRENT_USER_ID);
  const userIds = has
    ? existing.userIds.filter((id) => id !== CURRENT_USER_ID)
    : [...existing.userIds, CURRENT_USER_ID];
  return buckets
    .map((bucket) => (bucket.emoji === emoji ? { emoji, userIds } : bucket))
    .filter((bucket) => bucket.userIds.length > 0);
}

export const Reactions = observer(function Reactions({
  issue,
}: {
  issue: IssueData;
}) {
  const client = useSyncClient();
  const [open, setOpen] = React.useState(false);

  const buckets = issue.reactions ?? [];

  const toggle = (emoji: string): void => {
    client.mutate.updateIssue(issue.id, {
      reactions: toggled(currentBuckets(issue), emoji),
    });
  };

  return (
    <>
      {buckets.map((bucket) => {
        const mine = bucket.userIds.includes(CURRENT_USER_ID);
        return (
          <button
            key={bucket.emoji}
            type="button"
            className={styles.reactionChip}
            data-active={mine ? "true" : undefined}
            aria-pressed={mine}
            aria-label={`${bucket.emoji} ${bucket.userIds.length} ${
              mine ? "— remove your reaction" : "— add your reaction"
            }`}
            onClick={() => toggle(bucket.emoji)}
          >
            <span className={styles.reactionEmoji} aria-hidden="true">
              {bucket.emoji}
            </span>
            <span className={styles.reactionCount}>{bucket.userIds.length}</span>
          </button>
        );
      })}

      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <IconButton
            label="Add reaction"
            size={24}
            {...(open ? { "data-menu-open": "true" } : {})}
          >
            <Icon name="Reaction" size={14} />
          </IconButton>
        </PopoverPrimitive.Trigger>
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            className={styles.emojiPopover}
            side="bottom"
            align="start"
            sideOffset={4}
            collisionPadding={8}
          >
            <div className={styles.emojiGrid} role="menu" aria-label="Add reaction">
              {EMOJI_CHOICES.map((emoji) => {
                const mine =
                  buckets
                    .find((bucket) => bucket.emoji === emoji)
                    ?.userIds.includes(CURRENT_USER_ID) === true;
                return (
                  <button
                    key={emoji}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={mine}
                    aria-label={emoji}
                    className={styles.emojiOption}
                    data-active={mine ? "true" : undefined}
                    onClick={() => {
                      toggle(emoji);
                      setOpen(false); // §6.8 close-then-sync
                    }}
                  >
                    {emoji}
                  </button>
                );
              })}
            </div>
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </>
  );
});
