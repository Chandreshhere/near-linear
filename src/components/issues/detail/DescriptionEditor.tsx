"use client";

import { useCallback, useRef, useState } from "react";
import { useEffect } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { editorDocToMarkdownish, markdownishToHtml } from "./markdown";
import { useDebouncedSave } from "./useDebouncedSave";
import styles from "./detail.module.css";

const SAVE_DEBOUNCE_MS = 800;

/* ================================================================
 * Slash commands (video-timeline-1 finding 13)
 * ================================================================ */

interface SlashCommand {
  id: string;
  label: string;
  hint: string;
  run: (editor: Editor) => void;
}

/**
 * Deliberately only the blocks the markdown-ish snapshot round-trips
 * (see markdown.ts): a "Heading" row here would look like it worked and
 * then quietly come back as plain text on the next load.
 */
const SLASH_COMMANDS: SlashCommand[] = [
  {
    id: "text",
    label: "Text",
    hint: "Plain paragraph",
    run: (editor) => {
      editor.chain().focus().setParagraph().run();
    },
  },
  {
    id: "todo",
    label: "To-do list",
    hint: "Checklist item",
    run: (editor) => {
      editor.chain().focus().toggleTaskList().run();
    },
  },
  {
    id: "bullet",
    label: "Bulleted list",
    hint: "Unordered item",
    run: (editor) => {
      editor.chain().focus().toggleBulletList().run();
    },
  },
  {
    id: "ordered",
    label: "Numbered list",
    hint: "Ordered item",
    run: (editor) => {
      editor.chain().focus().toggleOrderedList().run();
    },
  },
];

interface SlashState {
  /** Document position of the "/" that opened the menu. */
  from: number;
  query: string;
  active: number;
  left: number;
  top: number;
}

/**
 * Issue description — multiline Tiptap editor (capture §6 tokens:
 * 15px/450, lh 1.6, ls -0.00666667em; 14px todo checkboxes, checked 0.65).
 * Content round-trips through the markdown-ish snapshot in
 * `Issue.description` (see markdown.ts). Checkbox toggles and text edits
 * save through one 800ms debounce; blur flushes.
 *
 * Two affordances from video-timeline-1 finding 13 are live here: the
 * per-line placeholder ("Type / for commands…" on any empty line the cursor
 * is on, "Add description…" only while the whole doc is empty), and the
 * slash-command menu that placeholder advertises.
 */
export function DescriptionEditor({
  description,
  onSave,
}: {
  description: string;
  onSave: (markdown: string) => void;
}) {
  const saver = useDebouncedSave(onSave, SAVE_DEBOUNCE_MS);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [slash, setSlash] = useState<SlashState | null>(null);
  // Read inside editorProps handlers, which close over the first render.
  const slashRef = useRef<SlashState | null>(null);
  slashRef.current = slash;

  const closeSlash = useCallback((): void => {
    setSlash(null);
  }, []);

  const visibleCommands = (query: string): SlashCommand[] => {
    const needle = query.trim().toLowerCase();
    return needle === ""
      ? SLASH_COMMANDS
      : SLASH_COMMANDS.filter((command) =>
          command.label.toLowerCase().includes(needle),
        );
  };

  const editor = useEditor({
    immediatelyRender: false, // SSR-safe
    extensions: [
      // StarterKit defaults stay on; blocks outside the markdown contract
      // degrade to plain text on save (documented in markdown.ts).
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({
        // Per-line: the line the cursor is on advertises the slash menu; the
        // whole-doc-empty case keeps the captured "Add description…".
        placeholder: ({ editor: e, node }) =>
          e.isEmpty && node.type.name === "paragraph"
            ? "Add description…"
            : "Type / for commands…",
        showOnlyCurrent: true,
      }),
    ],
    content: markdownishToHtml(description),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Issue description",
        "aria-multiline": "true",
      },
      handleKeyDown: (view, event) => {
        const open = slashRef.current;
        if (open === null) return false;
        const commands = visibleCommands(open.query);
        switch (event.key) {
          case "ArrowDown":
            event.preventDefault();
            setSlash({
              ...open,
              active: commands.length === 0 ? 0 : (open.active + 1) % commands.length,
            });
            return true;
          case "ArrowUp":
            event.preventDefault();
            setSlash({
              ...open,
              active:
                commands.length === 0
                  ? 0
                  : (open.active - 1 + commands.length) % commands.length,
            });
            return true;
          case "Enter": {
            const command = commands[open.active];
            if (command === undefined) return false;
            event.preventDefault();
            runSlash(command, open, view.state.selection.from);
            return true;
          }
          case "Escape":
            event.preventDefault();
            closeSlash();
            return true;
          default:
            return false;
        }
      },
    },
    onUpdate: ({ editor: e, transaction }) => {
      saver.schedule(editorDocToMarkdownish(e.getJSON()));

      // Track (or open) the slash menu from the text around the caret.
      const { from } = e.state.selection;
      const open = slashRef.current;
      if (open !== null) {
        if (from < open.from + 1) {
          closeSlash();
          return;
        }
        const typed = e.state.doc.textBetween(open.from, from, "\n", "\n");
        if (!typed.startsWith("/") || typed.includes(" ")) {
          closeSlash();
          return;
        }
        setSlash({ ...open, query: typed.slice(1), active: 0 });
        return;
      }

      // Opening: a "/" typed at the very start of an otherwise empty block.
      if (!transaction.docChanged) return;
      const parent = e.state.selection.$from.parent;
      if (parent.textContent !== "/") return;
      const coords = e.view.coordsAtPos(from);
      const box = wrapRef.current?.getBoundingClientRect();
      setSlash({
        from: from - 1,
        query: "",
        active: 0,
        left: box === undefined ? 0 : coords.left - box.left,
        top: box === undefined ? 0 : coords.bottom - box.top + 4,
      });
    },
    onBlur: () => {
      saver.flush();
      closeSlash();
    },
  });

  /** Delete the "/query" text, then apply the block command (§16.7). */
  function runSlash(command: SlashCommand, open: SlashState, to: number): void {
    if (editor === null) return;
    editor.chain().focus().deleteRange({ from: open.from, to }).run();
    command.run(editor);
    closeSlash();
  }

  // External change (realtime delta) → re-parse unless the user is mid-edit.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isFocused || saver.hasPending()) return;
    if (editorDocToMarkdownish(editor.getJSON()) !== description) {
      editor.commands.setContent(markdownishToHtml(description), {
        emitUpdate: false,
      });
    }
  }, [editor, description, saver]);

  const commands = slash === null ? [] : visibleCommands(slash.query);

  return (
    <div className={styles.descriptionWrap} ref={wrapRef}>
      <EditorContent className={styles.descriptionEditor} editor={editor} />
      {slash !== null && commands.length > 0 ? (
        <div
          className={styles.slashMenu}
          style={{ left: slash.left, top: slash.top }}
          role="menu"
          aria-label="Insert block"
        >
          {commands.map((command, index) => (
            <button
              key={command.id}
              type="button"
              role="menuitem"
              className={styles.slashItem}
              data-active={index === slash.active ? "true" : undefined}
              // Keep the editor selection through the click.
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setSlash({ ...slash, active: index })}
              onClick={() => {
                if (editor === null) return;
                runSlash(command, slash, editor.state.selection.from);
              }}
            >
              <span className={styles.slashLabel}>{command.label}</span>
              <span className={styles.slashHint}>{command.hint}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
