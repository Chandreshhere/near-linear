"use client";

/**
 * "Add document or link…" (capture §6.4 Resources) — title + URL, handed to
 * the caller's `onAdd` so it can append the row through whichever optimistic
 * write owns the list (§6.8): `updateProject` for a project's resources,
 * `update Team` for Team Home's. The URL is normalized (bare hosts get
 * https://) so the rendered row is a working external link.
 */

import * as React from "react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { showToast } from "@/lib/toast";
import type { ResourceLink } from "@/lib/data/types";
import css from "./dialogs.module.css";

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `res-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 8)}`;
}

/** "github.com/x" → "https://github.com/x"; existing schemes are kept. */
export function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed === "") return "";
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function ResourceDialog({
  open,
  onOpenChange,
  onAdd,
  title: heading = "Add document or link",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Persist the new row — the owner decides which model it lands on. */
  onAdd: (resource: ResourceLink) => void;
  /** Dialog heading + accessible name. */
  title?: string;
}) {
  const [title, setTitle] = React.useState("");
  const [url, setUrl] = React.useState("");

  React.useEffect(() => {
    if (!open) return;
    setTitle("");
    setUrl("");
  }, [open]);

  const trimmedUrl = url.trim();

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (trimmedUrl === "") return;
    const href = normalizeUrl(trimmedUrl);
    const resource: ResourceLink = {
      id: newId(),
      title: title.trim() === "" ? href.replace(/^https?:\/\//, "") : title.trim(),
      url: href,
    };
    onAdd(resource);
    onOpenChange(false);
    showToast(`Added “${resource.title}”`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} width={420} label={heading}>
      <form className={css.dialog} onSubmit={submit}>
        <div className={css.header}>
          <span className={css.title}>{heading}</span>
        </div>

        <div className={css.body}>
          <Input
            inputSize="sm"
            value={title}
            placeholder="Title (optional)"
            aria-label="Resource title"
            autoComplete="off"
            autoFocus
            onChange={(event) => setTitle(event.target.value)}
          />
          <Input
            inputSize="sm"
            value={url}
            placeholder="https://…"
            aria-label="Resource URL"
            autoComplete="off"
            spellCheck={false}
            inputMode="url"
            onChange={(event) => setUrl(event.target.value)}
          />
        </div>

        <div className={css.footer}>
          <Button variant="ghost" size={28} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size={28} type="submit" disabled={trimmedUrl === ""}>
            Add
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
