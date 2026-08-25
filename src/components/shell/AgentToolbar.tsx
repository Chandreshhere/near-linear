"use client";

/**
 * 28px bottom agent strip (CAPTURED, capture-new-chat.md §6d) — now carrying
 * the documented chat surface (§21): one tab per OPEN chat with unread /
 * working dots, "+" for a new chat, the Agent pill toggling the 400px panel
 * anchored above the strip, and "Chat history" listing past chats by recency.
 * `Cmd/Ctrl+J` opens or focuses the panel from anywhere.
 */

import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { useAgentChats } from "@/lib/agent/chats";
import { useShortcut } from "@/lib/keyboard";
import styles from "./shell.module.css";

export const AgentToolbar = observer(function AgentToolbar({
  workspace,
}: {
  workspace: string;
}) {
  const chats = useAgentChats();
  const [open, setOpen] = useState(false);
  const [focusToken, setFocusToken] = useState(0);

  const openPanel = (chatId?: string): void => {
    if (chatId !== undefined) chats.openChat(chatId);
    else if (chats.activeId === null) chats.newChat();
    setOpen(true);
    setFocusToken((token) => token + 1);
  };

  // §21: Cmd/Ctrl+J opens the agent chat (or focuses it when already open).
  useShortcut({
    id: "agent-panel",
    keys: "mod+j",
    scope: "global",
    description: "Open agent chat",
    allowInInput: true,
    handler: () => openPanel(),
  });

  const historyItems: MenuItem[] = (() => {
    const rows = chats.byRecency();
    if (rows.length === 0) {
      return [{ label: "No past chats", disabled: true }];
    }
    return rows.slice(0, 12).map((chat) => ({
      label: chat.title,
      icon: <Icon name="Agent" size={14} />,
      onSelect: () => openPanel(chat.id),
    }));
  })();

  return (
    <div className={styles.agentToolbar} data-agent-toolbar-bounds="true">
      <div className={styles.agentToolbarInner}>
        <div className={styles.agentPanelAnchor} data-agent-panel-anchor="true">
          {open ? (
            <AgentPanel
              workspace={workspace}
              focusToken={focusToken}
              onClose={() => setOpen(false)}
            />
          ) : null}
        </div>

        {chats.openChats.map((chat) => {
          const working = chat.status === "working";
          const unread = chats.isUnread(chat.id);
          return (
            <button
              key={chat.id}
              type="button"
              className={styles.chatTab}
              data-active={chats.activeId === chat.id ? "true" : undefined}
              aria-label={`Open chat: ${chat.title}`}
              onClick={() => openPanel(chat.id)}
            >
              {working || unread ? (
                <span
                  className={styles.chatTabDot}
                  data-working={working ? "true" : undefined}
                  aria-hidden="true"
                />
              ) : null}
              <span className={styles.chatTabLabel}>{chat.title}</span>
            </button>
          );
        })}

        <button
          type="button"
          className={styles.toolbarIconBtn}
          aria-label="New chat"
          onClick={() => {
            chats.newChat();
            setOpen(true);
            setFocusToken((token) => token + 1);
          }}
        >
          <Icon name="Plus" size={14} />
        </button>

        <button
          type="button"
          className={styles.agentPill}
          aria-label="Agent"
          data-menu-open={open ? "true" : undefined}
          onClick={() => (open ? setOpen(false) : openPanel())}
        >
          <Icon name="Agent" size={14} />
          Agent
        </button>

        <Menu
          side="top"
          align="end"
          items={historyItems}
          trigger={
            <button
              type="button"
              className={styles.toolbarIconBtn}
              aria-label="Chat history"
            >
              <Icon name="ClockOutline" size={14} />
            </button>
          }
        />
      </div>
    </div>
  );
});
