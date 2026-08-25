"use client";

/**
 * Chat transcript — MASTER_PROMPT.md §10.8/§21.
 * User turns are right-aligned muted chips; agent turns render as rich text
 * behind a small spark glyph, with a streaming caret while the run is live
 * and an "actions taken" strip listing every applied mutation with a link to
 * the entity it touched.
 */

import { Fragment, type JSX, type ReactNode } from "react";
import Link from "next/link";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { useStore } from "@/lib/data/DataProvider";
import type { AgentAction } from "@/lib/agent/engine";
import type { AgentChat, AgentMessage } from "@/lib/agent/chats";
import type { SyncStore } from "@/lib/data/store";
import { GlyphEdit } from "./glyphs";
import styles from "./agent.module.css";

/* ================================================================
 * Minimal rich text (the agent's replies are markdown-flavoured plain text)
 * ================================================================ */

const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|_[^_]+_)/g;

function renderInline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let index = 0;
  let match: RegExpExecArray | null;
  INLINE_RE.lastIndex = 0;
  while ((match = INLINE_RE.exec(text)) !== null) {
    if (match.index > index) out.push(text.slice(index, match.index));
    const token = match[0];
    const key = `${match.index}-${token.length}`;
    if (token.startsWith("**")) {
      out.push(<strong key={key}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("`")) {
      out.push(<code key={key}>{token.slice(1, -1)}</code>);
    } else {
      out.push(<em key={key}>{token.slice(1, -1)}</em>);
    }
    index = match.index + token.length;
  }
  if (index < text.length) out.push(text.slice(index));
  return out;
}

interface Block {
  type: "p" | "ul";
  lines: string[];
}

function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];

  const flushParagraph = (): void => {
    if (paragraph.length === 0) return;
    blocks.push({ type: "p", lines: [paragraph.join(" ")] });
    paragraph = [];
  };

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed === "") {
      flushParagraph();
      continue;
    }
    if (trimmed.startsWith("- ")) {
      flushParagraph();
      const last = blocks[blocks.length - 1];
      if (last !== undefined && last.type === "ul") last.lines.push(trimmed.slice(2));
      else blocks.push({ type: "ul", lines: [trimmed.slice(2)] });
      continue;
    }
    paragraph.push(trimmed);
  }
  flushParagraph();
  return blocks;
}

/**
 * Paragraphs + "- " bullet lists. Nothing else — replies stay simple.
 * `trailing` (the streaming caret) rides along inside the LAST inline run so
 * it never drops onto a line of its own.
 */
export function RichText({
  text,
  trailing,
}: {
  text: string;
  trailing?: ReactNode;
}): JSX.Element {
  const blocks = parseBlocks(text);
  const lastBlock = blocks.length - 1;

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const isLastBlock = blockIndex === lastBlock;
        if (block.type === "p") {
          return (
            <p key={blockIndex}>
              {renderInline(block.lines[0])}
              {isLastBlock ? trailing : null}
            </p>
          );
        }
        return (
          <ul key={blockIndex}>
            {block.lines.map((item, i) => (
              <li key={i}>
                <span>
                  {renderInline(item)}
                  {isLastBlock && i === block.lines.length - 1 ? trailing : null}
                </span>
              </li>
            ))}
          </ul>
        );
      })}
      {blocks.length === 0 ? <p>{trailing}</p> : null}
    </>
  );
}

/* ================================================================
 * Action links
 * ================================================================ */

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

/** Resolve the entity an action touched to a route (issue / project). */
function hrefFor(
  action: AgentAction,
  store: SyncStore,
  workspace: string,
): string | undefined {
  const id = action.entityId;
  if (id === undefined) return undefined;

  const issue = store.get("Issue", id);
  if (issue !== undefined) {
    return `/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`;
  }
  const project = store.get("Project", id);
  if (project !== undefined) {
    return `/${workspace}/project/${project.slug}/overview`;
  }
  const milestone = store.get("Milestone", id);
  if (milestone !== undefined) {
    const parent = store.get("Project", milestone.projectId);
    if (parent !== undefined) {
      return `/${workspace}/project/${parent.slug}/overview`;
    }
  }
  return undefined;
}

export const ActionStrip = observer(function ActionStrip({
  actions,
  workspace,
}: {
  actions: AgentAction[];
  workspace: string;
}): JSX.Element | null {
  const store = useStore();
  if (actions.length === 0) return null;

  return (
    <div className={styles.actions} data-testid="agent-actions">
      <span className={styles.actionsLabel}>
        {actions.length === 1 ? "Action taken" : "Actions taken"}
      </span>
      {actions.map((action, index) => {
        const href = hrefFor(action, store, workspace);
        const body = (
          <>
            <span className={styles.actionIcon} aria-hidden="true">
              {action.kind === "createProject" ? (
                <Icon name="Project" size={13} />
              ) : action.kind === "createMilestone" ? (
                <Icon name="MilestoneNone" size={13} />
              ) : (
                <GlyphEdit size={13} />
              )}
            </span>
            <span className={styles.actionText}>{action.summary}</span>
            {href !== undefined ? (
              <span className={styles.actionOpen}>Open</span>
            ) : null}
          </>
        );
        return href !== undefined ? (
          <Link key={index} href={href} className={styles.actionRow}>
            {body}
          </Link>
        ) : (
          <div key={index} className={styles.actionRow}>
            {body}
          </div>
        );
      })}
    </div>
  );
});

/* ================================================================
 * Transcript
 * ================================================================ */

const AgentTurn = observer(function AgentTurn({
  message,
  streaming,
  workspace,
}: {
  message: AgentMessage;
  streaming: boolean;
  workspace: string;
}): JSX.Element {
  return (
    <div className={styles.agentRow}>
      <span className={styles.spark} aria-hidden="true">
        <Icon name="Agent" size={14} />
      </span>
      <div className={styles.agentBody}>
        <RichText
          text={message.text}
          trailing={
            streaming ? <span className={styles.caret} aria-hidden="true" /> : null
          }
        />
        <ActionStrip actions={message.actions} workspace={workspace} />
      </div>
    </div>
  );
});

export const Transcript = observer(function Transcript({
  chat,
  workspace,
  scrollRef,
}: {
  chat: AgentChat;
  workspace: string;
  scrollRef?: React.RefObject<HTMLDivElement | null>;
}): JSX.Element {
  const lastId = chat.messages[chat.messages.length - 1]?.id;
  return (
    <div
      className={styles.transcript}
      ref={scrollRef}
      role="log"
      aria-label="Agent conversation"
      aria-live="polite"
    >
      {chat.messages.map((message) => (
        <Fragment key={message.id}>
          {message.role === "user" ? (
            <div className={styles.userRow}>
              <div className={styles.userBubble}>{message.text}</div>
            </div>
          ) : (
            <AgentTurn
              message={message}
              streaming={chat.status === "working" && message.id === lastId}
              workspace={workspace}
            />
          )}
        </Fragment>
      ))}
    </div>
  );
});
