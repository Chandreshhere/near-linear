"use client";

import { useState } from "react";
import { Icon } from "@/components/icons/Icon";
import { useSyncClient } from "@/lib/data/DataProvider";
import type { ActivityData, CommentData, IssueData } from "@/lib/data/types";
import { CURRENT_USER_ID } from "./constants";
import styles from "./detail.module.css";

/**
 * Comment composer (capture §6): elevated card — radius 8, hairline border,
 * shadow-low, padding 12 — with a borderless "Leave a comment…" field and a
 * 24px round ↑ submit button (disabled while empty). Submitting enqueues a
 * Comment row plus a "commented" Activity row through the optimistic queue
 * (both land in the same per-tick batch), then clears.
 */
export function CommentComposer({ issue }: { issue: IssueData }) {
  const client = useSyncClient();
  const [body, setBody] = useState("");
  const canSubmit = body.trim() !== "";

  const submit = () => {
    const text = body.trim();
    if (text === "") return;
    const now = new Date().toISOString();

    const comment: CommentData = {
      id: crypto.randomUUID(),
      issueId: issue.id,
      authorId: CURRENT_USER_ID,
      body: text,
      createdAt: now,
      updatedAt: now,
    };
    const activity: ActivityData = {
      id: crypto.randomUUID(),
      issueId: issue.id,
      actorId: CURRENT_USER_ID,
      type: "commented",
      createdAt: now,
    };

    client.queue.enqueue(
      "create",
      "Comment",
      comment.id,
      comment as unknown as Record<string, unknown>,
    );
    client.queue.enqueue(
      "create",
      "Activity",
      activity.id,
      activity as unknown as Record<string, unknown>,
    );

    setBody("");
  };

  return (
    <form
      className={styles.composer}
      data-comment-input-editor-container="true"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <textarea
        className={styles.composerInput}
        placeholder="Leave a comment…"
        aria-label="Leave a comment"
        rows={1}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        onKeyDown={(event) => {
          // Default commentSubmitKey ("Enter", §10.9); Shift+Enter = newline.
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className={styles.composerFooter}>
        <button
          type="submit"
          className={styles.composerSubmit}
          aria-label="Submit comment"
          disabled={!canSubmit}
          tabIndex={-1}
        >
          <Icon name="Send" size={14} />
        </button>
      </div>
    </form>
  );
}
