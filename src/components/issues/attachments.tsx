"use client";

/**
 * Issue attachments — MASTER_PROMPT.md §10.3 (the "Attach images, files, or
 * videos" control under the description) and §14 (the create modal's
 * paperclip). One implementation serves both.
 *
 * There is no blob storage in the local-first engine, so an attachment is
 * metadata (name/size/type) plus, for small images only, an inline data URL
 * that renders a real thumbnail. Anything larger is recorded by name — the
 * row is honest about it rather than pretending to hold the bytes.
 */

import * as React from "react";
import {
  ATTACHMENT_INLINE_MAX_BYTES,
  type AttachmentData,
} from "@/lib/data/types";
import { Icon } from "@/components/icons/Icon";
import styles from "./attachments.module.css";

/** "12 KB" / "1.4 MB" — the size shown on an attachment row. */
export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function readAsDataUrl(file: File): Promise<string | undefined> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : undefined);
    reader.onerror = () => resolve(undefined);
    reader.readAsDataURL(file);
  });
}

function newId(): string {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `att-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Turn a file input's selection into storable rows. Small images carry a
 * data URL (thumbnail); everything else is metadata only.
 */
export async function filesToAttachments(
  files: FileList | null,
): Promise<AttachmentData[]> {
  if (files === null || files.length === 0) return [];
  const out: AttachmentData[] = [];
  for (const file of Array.from(files)) {
    const inlineable =
      file.type.startsWith("image/") && file.size <= ATTACHMENT_INLINE_MAX_BYTES;
    out.push({
      id: newId(),
      name: file.name,
      size: file.size,
      type: file.type,
      dataUrl: inlineable ? await readAsDataUrl(file) : undefined,
    });
  }
  return out;
}

/**
 * The hidden <input type="file"> the paperclip drives, plus an imperative
 * `open()`. Mirrors the captured DOM (a visually hidden multiple-file input
 * next to the button, both labelled "Attach images, files, or videos").
 */
export function useAttachmentInput(
  onFiles: (attachments: AttachmentData[]) => void,
): { open: () => void; input: React.ReactElement } {
  const ref = React.useRef<HTMLInputElement>(null);

  const input = (
    <input
      ref={ref}
      type="file"
      multiple
      className={styles.hiddenInput}
      aria-label="Attach images, files, or videos"
      tabIndex={-1}
      onChange={(event) => {
        const target = event.currentTarget;
        void filesToAttachments(target.files).then((next) => {
          if (next.length > 0) onFiles(next);
          // Reset so picking the same file twice fires change again.
          target.value = "";
        });
      }}
    />
  );

  return { open: () => ref.current?.click(), input };
}

/** The list rendered under the description / in the create modal footer. */
export function AttachmentList({
  items,
  onRemove,
}: {
  items: readonly AttachmentData[];
  onRemove: (id: string) => void;
}) {
  if (items.length === 0) return null;

  return (
    <ul className={styles.list} aria-label="Attachments">
      {items.map((attachment) => (
        <li key={attachment.id} className={styles.item}>
          <span className={styles.thumb} aria-hidden="true">
            {attachment.dataUrl !== undefined ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                className={styles.thumbImage}
                src={attachment.dataUrl}
                alt=""
                loading="lazy"
              />
            ) : (
              <Icon name="Attachment" size={14} />
            )}
          </span>
          <span className={styles.name} title={attachment.name}>
            {attachment.name}
          </span>
          <span className={styles.size}>{formatBytes(attachment.size)}</span>
          <button
            type="button"
            className={styles.remove}
            aria-label={`Remove ${attachment.name}`}
            onClick={() => onRemove(attachment.id)}
          >
            <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
              <path d="M2.71 2.71a.7.7 0 0 1 .99 0L6 5.01l2.3-2.3a.7.7 0 1 1 .99.99L6.99 6l2.3 2.3a.7.7 0 1 1-.99.99L6 6.99l-2.3 2.3a.7.7 0 0 1-.99-.99L5.01 6l-2.3-2.3a.7.7 0 0 1 0-.99Z" fill="currentColor" />
            </svg>
          </button>
        </li>
      ))}
    </ul>
  );
}
