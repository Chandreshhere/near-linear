/**
 * Minimal markdown-ish ⇄ editor bridge for the issue description
 * (MASTER_PROMPT.md §10.3 / capture-trendzo-37 §6).
 *
 * The stored `Issue.description` is a markdown snapshot (types.ts). This
 * module keeps a tiny, LOSSLESS round-trip for exactly the constructs the
 * fixtures/capture use:
 *
 *   "- [ ] text" / "- [x] text"  ⇄  taskList / taskItem[data-checked]
 *   "- text"                     ⇄  bulletList item
 *   "1. text"                    ⇄  orderedList item
 *   "plain line"                 ⇄  paragraph
 *
 * Deliberate degradations (kept tiny on purpose — Yjs replaces this later):
 *   - inline marks (bold/italic/…) serialize to their plain text;
 *   - hardBreak (`Shift+Enter`) serializes to a newline and re-parses as a
 *     separate paragraph;
 *   - unknown blocks (heading, blockquote, codeBlock, …) degrade to their
 *     text content — content is never dropped, formatting outside the
 *     contract is.
 */

import type { JSONContent } from "@tiptap/react";

const TASK_LINE = /^\s*[-*]\s+\[([ xX])\]\s?(.*)$/;
const BULLET_LINE = /^\s*[-*]\s+(?!\[[ xX]\]\s?)(.*)$/;
const ORDERED_LINE = /^\s*\d+[.)]\s+(.*)$/;

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Markdown-ish description → HTML the Tiptap schema parses 1:1. */
export function markdownishToHtml(md: string): string {
  const lines = md.split(/\r?\n/);
  const html: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (TASK_LINE.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = TASK_LINE.exec(lines[i]);
        if (m === null) break;
        const checked = m[1].toLowerCase() === "x";
        items.push(
          `<li data-type="taskItem" data-checked="${checked ? "true" : "false"}"><p>${escapeHtml(m[2])}</p></li>`,
        );
        i += 1;
      }
      html.push(`<ul data-type="taskList">${items.join("")}</ul>`);
      continue;
    }

    if (BULLET_LINE.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = BULLET_LINE.exec(lines[i]);
        if (m === null || TASK_LINE.test(lines[i])) break;
        items.push(`<li><p>${escapeHtml(m[1])}</p></li>`);
        i += 1;
      }
      html.push(`<ul>${items.join("")}</ul>`);
      continue;
    }

    if (ORDERED_LINE.test(line)) {
      const items: string[] = [];
      while (i < lines.length) {
        const m = ORDERED_LINE.exec(lines[i]);
        if (m === null) break;
        items.push(`<li><p>${escapeHtml(m[1])}</p></li>`);
        i += 1;
      }
      html.push(`<ol>${items.join("")}</ol>`);
      continue;
    }

    if (line.trim() !== "") {
      html.push(`<p>${escapeHtml(line)}</p>`);
    }
    i += 1;
  }

  return html.join("");
}

/** Concatenated inline text of a node subtree; hardBreak becomes "\n". */
function inlineText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  return (node.content ?? []).map(inlineText).join("");
}

/** One-line text of a block subtree (list items): newlines collapse to spaces. */
function blockText(node: JSONContent): string {
  return inlineText(node).replace(/\s*\n\s*/g, " ").trim();
}

/** Editor JSON document → markdown-ish description (save path). */
export function editorDocToMarkdownish(doc: JSONContent): string {
  const lines: string[] = [];

  for (const block of doc.content ?? []) {
    switch (block.type) {
      case "taskList": {
        for (const item of block.content ?? []) {
          const checked = item.attrs?.checked === true;
          lines.push(`- [${checked ? "x" : " "}] ${blockText(item)}`);
        }
        break;
      }
      case "bulletList": {
        for (const item of block.content ?? []) {
          lines.push(`- ${blockText(item)}`);
        }
        break;
      }
      case "orderedList": {
        (block.content ?? []).forEach((item, index) => {
          lines.push(`${index + 1}. ${blockText(item)}`);
        });
        break;
      }
      case "paragraph": {
        for (const piece of inlineText(block).split("\n")) {
          if (piece.trim() !== "") lines.push(piece);
        }
        break;
      }
      default: {
        const text = blockText(block);
        if (text !== "") lines.push(text);
      }
    }
  }

  return lines.join("\n");
}
