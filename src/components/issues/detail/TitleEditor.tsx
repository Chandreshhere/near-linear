"use client";

import { useEffect } from "react";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useDebouncedSave } from "./useDebouncedSave";
import styles from "./detail.module.css";

const SAVE_DEBOUNCE_MS = 600;

/** Single-paragraph doc for the one-line title. */
function titleDoc(title: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: title === "" ? undefined : [{ type: "text", text: title }],
      },
    ],
  };
}

/**
 * Issue title — single-line Tiptap editor (capture §6):
 * 1.5rem/600, line-height calc(1 + 1/3), letter-spacing -0.00625rem.
 * StarterKit minus headings/lists/blocks; Enter is swallowed so the doc
 * stays one paragraph. Saves via onBlur + 600ms debounce.
 */
export function TitleEditor({
  title,
  onSave,
}: {
  title: string;
  onSave: (title: string) => void;
}) {
  const saver = useDebouncedSave(onSave, SAVE_DEBOUNCE_MS);

  const editor = useEditor({
    immediatelyRender: false, // SSR-safe
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
        link: false,
        underline: false,
        trailingNode: false,
      }),
      Placeholder.configure({ placeholder: "Issue title" }),
    ],
    content: titleDoc(title),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Issue title",
        "aria-multiline": "false",
      },
      // Enforce the single paragraph: every Enter flavor is a no-op.
      handleKeyDown: (_view, event) => event.key === "Enter",
      /**
       * Pasting a multi-line block (a chat message, a heading + body) must
       * not smuggle extra paragraphs into a one-line doc: flatten the clip-
       * board text to a single spaced line and insert that instead.
       */
      handlePaste: (view, event) => {
        const text = event.clipboardData?.getData("text/plain");
        if (text === undefined || text === "") return false;
        const flat = text.replace(/\s*\r?\n\s*/g, " ").trim();
        if (flat === "") return true; // whitespace-only paste: swallow it
        event.preventDefault();
        const { from, to } = view.state.selection;
        view.dispatch(view.state.tr.insertText(flat, from, to));
        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      const value = e.state.doc.textContent;
      if (value.trim() !== "") saver.schedule(value);
    },
    onBlur: () => {
      saver.flush();
    },
  });

  // External change (realtime delta) → replace content unless the user is
  // mid-edit here (focused or unsaved pending value).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isFocused || saver.hasPending()) return;
    if (editor.state.doc.textContent !== title) {
      editor.commands.setContent(titleDoc(title), { emitUpdate: false });
    }
  }, [editor, title, saver]);

  return (
    <div className={styles.titleBlock}>
      <EditorContent className={styles.titleEditor} editor={editor} />
    </div>
  );
}
