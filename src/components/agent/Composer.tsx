"use client";

/**
 * Chat composer — docs/analysis/capture-new-chat.md §6b (CAPTURED).
 * Card: radius 10, padding 12, bg lch(7.32% .85 272); editor scroll area
 * min-height 48px → max-height min(288px, 60vh); placeholder "Ask Linear…"
 * painted from `data-empty-text`; toolbar row = Skills pill (left) and
 * attach + 24px round submit (right). Enter sends, Shift+Enter newlines,
 * `/` in an empty composer opens the skills menu.
 *
 * ATTACHMENTS (§10.8) reuse the issue flow verbatim
 * (components/issues/attachments.tsx): the same hidden multiple-file input,
 * the same "small images carry a data URL, everything else is metadata"
 * rule, and the same removable list. They are handed to `onSubmit` so the
 * chat message can name what was attached.
 *
 * NOTE(§20): the editor is a plain textarea rather than the shared
 * ProseMirror surface used by descriptions and comments — a chat prompt has
 * no block structure to edit, and the geometry, placeholder mechanism and key
 * handling already match the rich editor, so swapping it in later is a
 * component change with no behavioural difference here.
 */

import { useCallback, useEffect, useRef, useState, type JSX, type RefObject } from "react";
import { observer } from "mobx-react-lite";
import clsx from "clsx";
import { Icon } from "@/components/icons/Icon";
import {
  AttachmentList,
  formatBytes,
  useAttachmentInput,
} from "@/components/issues/attachments";
import { useAgentSkills, type AgentSkill } from "@/lib/agent/skills";
import type { AttachmentData } from "@/lib/data/types";
import { GlyphArrowUp, GlyphStop } from "./glyphs";
import { NewSkillDialog } from "./NewSkillDialog";
import { SkillsMenu } from "./SkillsMenu";
import styles from "./agent.module.css";

type MenuSource = "pill" | "slash";

/**
 * Fold the attached files into the message body. There is no blob storage, so
 * what the agent (and the transcript, and anyone reading it later) actually
 * receives is the file manifest — name and size — appended to the prompt.
 * That is the honest representation of "I attached these".
 */
export function withAttachmentNote(
  body: string,
  attachments: readonly AttachmentData[],
): string {
  if (attachments.length === 0) return body;
  const manifest = attachments
    .map((file) => `- ${file.name} (${formatBytes(file.size)})`)
    .join("\n");
  const heading = attachments.length === 1 ? "Attached file" : "Attached files";
  return body === ""
    ? `${heading}:\n${manifest}`
    : `${body}\n\n${heading}:\n${manifest}`;
}

export const Composer = observer(function Composer({
  value,
  onChange,
  onSubmit,
  onStop,
  working,
  compact = false,
  textareaRef,
  autoFocus = false,
}: {
  value: string;
  onChange: (value: string) => void;
  /** Attachments picked since the last send travel with the message. */
  onSubmit: (attachments: AttachmentData[]) => void;
  onStop: () => void;
  working: boolean;
  compact?: boolean;
  textareaRef?: RefObject<HTMLTextAreaElement | null>;
  autoFocus?: boolean;
}): JSX.Element {
  const skills = useAgentSkills();
  const ownRef = useRef<HTMLTextAreaElement>(null);
  const ref = textareaRef ?? ownRef;
  const wrapRef = useRef<HTMLDivElement>(null);

  const [menu, setMenu] = useState<MenuSource | null>(null);
  const [pillQuery, setPillQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const [focused, setFocused] = useState(false);
  const [slashSuppressed, setSlashSuppressed] = useState(false);
  const [newSkillOpen, setNewSkillOpen] = useState(false);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);

  const { open: openFilePicker, input: fileInput } = useAttachmentInput(
    useCallback((added: AttachmentData[]) => {
      setAttachments((current) => [...current, ...added]);
    }, []),
  );

  /* ---- autosize: grow with content, clamped by the scroll area's max ---- */
  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, ref]);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus, ref]);

  /* ---- click-away closes the pill menu ---- */
  useEffect(() => {
    if (menu !== "pill") return;
    const onPointerDown = (e: PointerEvent): void => {
      const wrap = wrapRef.current;
      if (wrap !== null && e.target instanceof Node && !wrap.contains(e.target)) {
        setMenu(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [menu]);

  const query = menu === "pill" ? pillQuery : value.slice(1);
  const results = menu === null ? [] : skills.filter(query);
  // An attachment on its own is a valid message ("here, look at this").
  const empty = value.trim() === "" && attachments.length === 0;

  /** Send, then clear the tray — the files rode along with the message. */
  const submit = useCallback((): void => {
    if (empty) return;
    onSubmit(attachments);
    setAttachments([]);
  }, [attachments, empty, onSubmit]);

  const removeAttachment = useCallback((id: string): void => {
    setAttachments((current) => current.filter((item) => item.id !== id));
  }, []);

  const pick = useCallback(
    (skill: AgentSkill) => {
      // Slash mode replaces the command token; the pill appends to a draft.
      const base = menu === "slash" ? "" : value;
      const next =
        base.trim() === ""
          ? skill.instructions
          : `${base.trimEnd()}\n\n${skill.instructions}`;
      onChange(next);
      setMenu(null);
      setSlashSuppressed(false);
      const el = ref.current;
      if (el !== null) {
        el.focus();
        window.requestAnimationFrame(() => {
          el.selectionStart = el.value.length;
          el.selectionEnd = el.value.length;
        });
      }
    },
    [menu, onChange, ref, value],
  );

  const handleChange = (next: string): void => {
    onChange(next);
    if (menu === "pill") return;
    const isSlash = next.startsWith("/") && !next.includes("\n");
    if (isSlash && !slashSuppressed) {
      setMenu("slash");
      setHighlight(0);
    } else if (!isSlash) {
      setSlashSuppressed(false);
      if (menu === "slash") setMenu(null);
    }
  };

  const moveHighlight = (delta: number): void => {
    if (results.length === 0) return;
    setHighlight((current) => {
      const next = current + delta;
      if (next < 0) return results.length - 1;
      if (next >= results.length) return 0;
      return next;
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>): void => {
    if (menu === "slash") {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        moveHighlight(1);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        moveHighlight(-1);
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        setMenu(null);
        setSlashSuppressed(true);
        return;
      }
      if (e.key === "Enter" && !e.shiftKey && results.length > 0) {
        e.preventDefault();
        pick(results[Math.min(highlight, results.length - 1)]);
        return;
      }
    }
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (working) return;
      submit();
    }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent): void => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      moveHighlight(1);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      moveHighlight(-1);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setMenu(null);
      ref.current?.focus();
      return;
    }
    if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      pick(results[Math.min(highlight, results.length - 1)]);
    }
  };

  return (
    <div
      className={clsx(styles.composer, compact && styles.compact)}
      data-focused={focused ? "true" : undefined}
      onMouseDown={(e) => {
        // Clicking the card's padding focuses the editor (cursor: text).
        if (e.target === e.currentTarget) {
          e.preventDefault();
          ref.current?.focus();
        }
      }}
    >
      <div className={styles.editorScroll}>
        {value.trim() === "" ? (
          <span
            className={styles.placeholder}
            data-empty-text="Ask Linear…"
            aria-hidden="true"
          />
        ) : null}
        <textarea
          ref={ref}
          className={styles.editor}
          value={value}
          rows={1}
          spellCheck
          aria-label="Send a message to Linear AI"
          aria-multiline="true"
          onChange={(e) => handleChange(e.currentTarget.value)}
          onKeyDown={onKeyDown}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </div>

      {attachments.length > 0 ? (
        <div className={styles.attachTray}>
          <AttachmentList items={attachments} onRemove={removeAttachment} />
        </div>
      ) : null}

      <div className={styles.toolbarRow}>
        <div className={styles.skillsWrap} ref={wrapRef}>
          <button
            type="button"
            className={styles.skillsPill}
            aria-label="Skills"
            aria-haspopup="menu"
            aria-expanded={menu !== null}
            data-menu-open={menu !== null ? "true" : undefined}
            onClick={() => {
              setPillQuery("");
              setHighlight(0);
              setMenu((current) => (current === null ? "pill" : null));
            }}
          >
            <Icon name="Agent" size={14} />
            Skills
            <Icon name="ChevronDown" size={12} />
          </button>
          {menu !== null ? (
            <SkillsMenu
              skills={results}
              highlight={highlight}
              onHighlight={setHighlight}
              onPick={pick}
              onNewSkill={() => {
                setMenu(null);
                setNewSkillOpen(true);
              }}
              search={
                menu === "pill"
                  ? {
                      value: pillQuery,
                      onChange: (next) => {
                        setPillQuery(next);
                        setHighlight(0);
                      },
                      onKeyDown: onSearchKeyDown,
                    }
                  : undefined
              }
            />
          ) : null}
        </div>

        <div className={styles.rightGroup}>
          <button
            type="button"
            className={styles.attachBtn}
            aria-label="Attach images, files, or videos"
            onClick={openFilePicker}
          >
            <Icon name="Attachment" size={16} />
          </button>
          {fileInput}
          <button
            type="button"
            className={styles.submitBtn}
            aria-label={working ? "Stop generating" : "Send message"}
            data-stop={working ? "true" : undefined}
            disabled={!working && empty}
            onClick={() => (working ? onStop() : submit())}
          >
            {working ? <GlyphStop size={12} /> : <GlyphArrowUp size={14} />}
          </button>
        </div>
      </div>

      <NewSkillDialog open={newSkillOpen} onOpenChange={setNewSkillOpen} />
    </div>
  );
});
