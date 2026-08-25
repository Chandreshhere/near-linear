"use client";

/**
 * Agent chat page (`/:ws/agent`) — docs/analysis/capture-new-chat.md +
 * MASTER_PROMPT.md §10.8.
 *
 * Header: 57px, NO bottom border, one "Switch agent chat" pill (h2 = current
 * chat title + chevron) opening the open-chat menu. Content: centered column
 * max-width 712px, padding-inline 24, margin-bottom 8vh, with the original
 * line-art watermark floating behind the composer. Empty chats show the
 * dismissible "Get started with some examples" row (video-timeline-1
 * f0012–f0013); a live chat renders the transcript above the composer.
 */

import { useCallback, useEffect, useMemo, useRef, useState, type JSX } from "react";
import { observer } from "mobx-react-lite";
import { Header } from "@/components/shell/Header";
import { Icon } from "@/components/icons/Icon";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { useSyncClient } from "@/lib/data/DataProvider";
import { useAgentChats } from "@/lib/agent/chats";
import { LocalAgentAdapter } from "@/lib/agent/engine";
import type { AttachmentData } from "@/lib/data/types";
import { AgentWatermark, GlyphClose, GlyphResearch } from "./glyphs";
import { Composer, withAttachmentNote } from "./Composer";
import { Transcript } from "./Transcript";
import styles from "./agent.module.css";

/* ---- examples row (exact titles/subtitles from the timeline capture) ---- */

const EXAMPLES_DISMISSED_KEY = "agentExamplesDismissed";

interface ExampleCard {
  icon: JSX.Element;
  title: string;
  subtitle: string;
  /** What clicking the card puts in the composer. */
  prompt: string;
}

const EXAMPLES: ExampleCard[] = [
  {
    icon: <Icon name="Project" size={16} />,
    title: "Create a new project",
    subtitle: "Turn an idea into a well-scoped project",
    prompt: 'Create a project called "Driver App v2" for TRENDZO',
  },
  {
    icon: <GlyphResearch size={16} />,
    title: "Research a topic",
    subtitle: "Research a topic across the issue backlog",
    prompt: "Summarize the backlog and tell me what needs attention",
  },
  {
    icon: <Icon name="Loop" size={16} />,
    title: "Create automated loop",
    subtitle: "Learn what loops can do and create your first one",
    prompt: "What can loops do, and how do I create one?",
  },
];

export const AgentView = observer(function AgentView({
  workspace,
}: {
  workspace: string;
}): JSX.Element {
  const client = useSyncClient();
  const chats = useAgentChats();
  // ADAPTER SEAM: swap LocalAgentAdapter for an HttpAgentAdapter here and the
  // whole surface keeps working — same streaming contract, same actions.
  const adapter = useMemo(() => new LocalAgentAdapter(client), [client]);

  const [text, setText] = useState("");
  const [examplesDismissed, setExamplesDismissed] = useState(true);
  const editorRef = useRef<HTMLTextAreaElement>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  const chat = chats.active;
  const working = chat?.status === "working";
  const messageCount = chat?.messages.length ?? 0;
  const streamedLength = chat?.messages[messageCount - 1]?.text.length ?? 0;

  /* SSR-safe: the dismissal flag is only read in the browser. */
  useEffect(() => {
    try {
      setExamplesDismissed(
        window.localStorage.getItem(EXAMPLES_DISMISSED_KEY) === "1",
      );
    } catch {
      setExamplesDismissed(false);
    }
  }, []);

  /* Reading a chat clears its unread dot (§21 tab badges). */
  useEffect(() => {
    if (chat !== null) chats.markRead(chat.id);
  }, [chat, chats, messageCount]);

  /* Keep the newest turn in view while streaming. */
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

  const dismissExamples = (): void => {
    setExamplesDismissed(true);
    try {
      window.localStorage.setItem(EXAMPLES_DISMISSED_KEY, "1");
    } catch {
      /* best-effort */
    }
  };

  /* ---- header menu: open chats + New chat ---- */
  const menuItems: MenuItem[] = [
    ...chats.openChats.map((open) => ({
      label: open.title,
      icon: <Icon name="Agent" size={14} />,
      onSelect: () => chats.openChat(open.id),
    })),
    ...(chats.openChats.length > 0 ? [{ type: "separator" as const }] : []),
    {
      label: "New chat",
      icon: <Icon name="Plus" size={14} />,
      onSelect: () => {
        chats.newChat();
        setText("");
      },
    },
  ];

  const showExamples = messageCount === 0 && !examplesDismissed;

  return (
    <>
      <Header
        noBorder
        left={
          <Menu
            align="start"
            items={menuItems}
            trigger={
              <button
                type="button"
                className={styles.switcher}
                aria-label="Switch agent chat"
                aria-haspopup="menu"
              >
                <h2 className={styles.switcherTitle}>{chat?.title ?? "New chat"}</h2>
                <span className={styles.switcherChevron} aria-hidden="true">
                  <Icon name="ChevronDown" size={12} />
                </span>
              </button>
            }
          />
        }
      />

      <div className={styles.chatArea}>
        <div className={styles.column}>
          {chat !== null && messageCount > 0 ? (
            <Transcript chat={chat} workspace={workspace} scrollRef={transcriptRef} />
          ) : null}

          {showExamples ? (
            <div className={styles.examples}>
              <div className={styles.examplesHead}>
                <span className={styles.examplesTitle}>
                  Get started with some examples
                </span>
                <button
                  type="button"
                  className={styles.panelIconBtn}
                  aria-label="Dismiss examples"
                  onClick={dismissExamples}
                >
                  <GlyphClose size={14} />
                </button>
              </div>
              <div className={styles.examplesCards}>
                {EXAMPLES.map((example) => (
                  <button
                    key={example.title}
                    type="button"
                    className={styles.exampleCard}
                    onClick={() => {
                      setText(example.prompt);
                      editorRef.current?.focus();
                    }}
                  >
                    <span className={styles.exampleIcon} aria-hidden="true">
                      {example.icon}
                    </span>
                    <span className={styles.exampleTitle}>{example.title}</span>
                    <span className={styles.exampleSub}>{example.subtitle}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className={styles.inputRegion}>
            <div className={styles.watermark} aria-hidden="true">
              <AgentWatermark />
            </div>
            <Composer
              value={text}
              onChange={setText}
              onSubmit={send}
              onStop={() => {
                if (chats.activeId !== null) chats.cancel(chats.activeId);
              }}
              working={working}
              textareaRef={editorRef}
              autoFocus
            />
          </div>
        </div>
      </div>
    </>
  );
});
