"use client";

/**
 * Project update composer + renderer — MASTER_PROMPT.md §10.2 (the bordered
 * "Write first project update" strip) and capture §6.4.
 *
 * Posting writes TWO optimistic transactions: the new ProjectUpdate row and
 * the project's `health` (the update IS the health declaration — that is why
 * the projects table's health cell reads "No updates. Click to write
 * update."). The body is stored as the same markdown-ish snapshot
 * `IssueData.description` uses, so the Tiptap document round-trips through
 * the shared markdown helpers.
 *
 * The editor is configured exactly like issues/detail/DescriptionEditor
 * (StarterKit + task lists + placeholder) but keeps its own aria-label and
 * writes to local state — a composer has no debounce contract to honour, and
 * DescriptionEditor's label/placeholder are issue-specific.
 */

import * as React from "react";
import { observer } from "mobx-react-lite";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  editorDocToMarkdownish,
  markdownishToHtml,
} from "@/components/issues/detail/markdown";
import { useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";
import type { ProjectHealth, ProjectUpdateData } from "@/lib/data/types";
import { HealthIcon } from "./glyphs";
import css from "./dialogs.module.css";

/** The three health values an update can declare (capture §10.1 health cell). */
const HEALTH_CHOICES: { health: ProjectHealth; label: string }[] = [
  { health: "onTrack", label: "On track" },
  { health: "atRisk", label: "At risk" },
  { health: "offTrack", label: "Off track" },
];

export const HEALTH_LABEL: Record<ProjectHealth, string> = {
  noUpdate: "No updates",
  onTrack: "On track",
  atRisk: "At risk",
  offTrack: "Off track",
};

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `upd-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
}

/** Project updates, newest first. */
export function updatesForProject(
  all: ProjectUpdateData[],
  projectId: string,
): ProjectUpdateData[] {
  return all
    .filter((update) => update.projectId === projectId)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

function UpdateEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (markdown: string) => void;
}) {
  const editor = useEditor({
    immediatelyRender: false, // SSR-safe
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder: "What changed since the last update?" }),
    ],
    content: markdownishToHtml(value),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Project update",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: instance }) => {
      onChange(editorDocToMarkdownish(instance.getJSON()));
    },
  });

  return <EditorContent className={css.composer} editor={editor} />;
}

export const UpdateComposer = observer(function UpdateComposer({
  open,
  onOpenChange,
  projectId,
  projectName,
  currentHealth,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  projectName: string;
  currentHealth: ProjectHealth;
}) {
  const client = useSyncClient();
  const [health, setHealth] = React.useState<ProjectHealth>("onTrack");
  const [body, setBody] = React.useState("");
  // Remounts the editor on every open so it never reopens with stale content.
  const [seed, setSeed] = React.useState(0);

  React.useEffect(() => {
    if (!open) return;
    setHealth(currentHealth === "noUpdate" ? "onTrack" : currentHealth);
    setBody("");
    setSeed((value) => value + 1);
  }, [open, currentHealth]);

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    const trimmed = body.trim();
    if (trimmed === "") return;
    const now = new Date().toISOString();
    const row: ProjectUpdateData = {
      id: newId(),
      projectId,
      authorId: CURRENT_USER_ID,
      health,
      body: trimmed,
      createdAt: now,
      updatedAt: now,
    };
    client.queue.enqueue(
      "create",
      "ProjectUpdate",
      row.id,
      row as unknown as Record<string, unknown>,
    );
    // The update declares the project's health — same write the health picker
    // makes, so the table cell and the rail agree instantly.
    client.mutate.updateProject(projectId, { health, updatedAt: now });
    onOpenChange(false);
    showToast(`Posted update on ${projectName}`);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      width={560}
      label="Write project update"
    >
      <form className={css.dialog} onSubmit={submit}>
        <div className={css.header}>
          <span className={css.title}>Project update</span>
          <span className={css.headerMeta}>{projectName}</span>
        </div>

        <div className={css.body}>
          <div className={css.field}>
            <span className={css.fieldLabel}>Health</span>
            <div className={css.healthRow} role="group" aria-label="Project health">
              {HEALTH_CHOICES.map((choice) => (
                <button
                  key={choice.health}
                  type="button"
                  className={css.healthChoice}
                  aria-pressed={health === choice.health}
                  onClick={() => setHealth(choice.health)}
                >
                  <HealthIcon health={choice.health} size={16} />
                  {choice.label}
                </button>
              ))}
            </div>
          </div>

          <UpdateEditor key={seed} value="" onChange={setBody} />
        </div>

        <div className={css.footer}>
          <Button variant="ghost" size={28} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size={28} type="submit" disabled={body.trim() === ""}>
            Post update
          </Button>
        </div>
      </form>
    </Dialog>
  );
});
