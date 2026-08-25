"use client";

/**
 * Agent panel — the 400px card that opens upward from the bottom agent
 * toolbar's `data-agent-panel-anchor` (CAPTURED geometry, capture-new-chat
 * §6d). Same chat state, same adapter and same composer as the full page;
 * `Cmd/Ctrl+J` opens or focuses it from anywhere (§21).
 */

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import Link from "next/link";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { useSyncClient } from "@/lib/data/DataProvider";
import { useAgentChats } from "@/lib/agent/chats";
import { LocalAgentAdapter } from "@/lib/agent/engine";
import type { AttachmentData } from "@/lib/data/types";
import { Composer, withAttachmentNote } from "./Composer";
import { Transcript } from "./Transcript";
import { GlyphClose } from "./glyphs";
import styles from "./agent.module.css";

export const AgentPanel = observer(function AgentPanel({
  workspace,
  onClose,
  focusToken,
}: {
  workspace: string;
  onClose: () => void;
  /** Bumped by the caller (Cmd/Ctrl+J) to re-focus an already-open panel. */
  focusToken: number;
}): JSX.Element {
  const client = useSyncClient();
  const chats = useAgentChats();
  const adapter = useMemo(() => new LocalAgentAdapter(client), [client]);

  const [text, setText] = useState("");
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const chat = chats.active;
  const working = chat?.status === "working";
  const messageCount = chat?.messages.length ?? 0;
  const streamedLength = chat?.messages[messageCount - 1]?.text.length ?? 0;

  useEffect(() => {
    editorRef.current?.focus();
  }, [focusToken]);

  useEffect(() => {
    if (chat !== null) chats.markRead(chat.id);
  }, [chat, chats, messageCount]);

  useEffect(() => {
    const el = transcriptRef.current;
    if (el !== null) el.scrollTop = el.scrollHeight;
  }, [messageCount, streamedLength]);

  const send = useCallback(
    (attachments: AttachmentData[]) => {
      const body = withAttachmentNote(text.trim(), attachments);
      if (body === "") return;
      const chatId = chats.activeId ?? chats.newChat();
      setText("");
      void chats.sendMessage(chatId, body, adapter, { workspace });
    },
    [adapter, chats, text, workspace],
  );

  return (
    <div
      className={styles.panel}
      role="dialog"
      aria-label="Agent chat"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          onClose();
        }
      }}
    >
      <div className={styles.panelHeader}>
        <Icon name="Agent" size={13} />
        <span className={styles.panelTitle}>{chat?.title ?? "New chat"}</span>
        <Link
          href={`/${workspace}/agent`}
          className={styles.panelIconBtn}
          aria-label="Open agent in full view"
          onClick={onClose}
        >
          <Icon name="SidePanel" size={14} />
        </Link>
        <button
          type="button"
          className={styles.panelIconBtn}
          aria-label="Close agent panel"
          onClick={onClose}
        >
          <GlyphClose size={14} />
        </button>
      </div>

      <div className={styles.panelBody}>
        {chat !== null && messageCount > 0 ? (
          <Transcript chat={chat} workspace={workspace} scrollRef={transcriptRef} />
        ) : (
          <p className={styles.panelEmpty}>
            Ask about your workspace, or tell me what to create. Type
            {" "}
            <code>/</code> for skills.
          </p>
        )}
        <Composer
          compact
          value={text}
          onChange={setText}
          onSubmit={send}
          onStop={() => {
            if (chats.activeId !== null) chats.cancel(chats.activeId);
          }}
          working={working}
          textareaRef={editorRef}
        />
      </div>
    </div>
  );
});
