"use client";

import { useEffect, useMemo, useRef } from "react";

export interface DebouncedSave {
  /** Arm (or re-arm) the timer with the latest value. */
  schedule: (value: string) => void;
  /** Commit any pending value immediately (blur / unmount). */
  flush: () => void;
  /** True while a local edit is waiting to be saved — guards external sync. */
  hasPending: () => boolean;
}

/**
 * Debounced save channel shared by the title (600ms) and description (800ms)
 * editors — §6.8 optimistic pipeline: the editor mutates locally per
 * keystroke and pushes one updateIssue per pause. Always flushes on unmount.
 */
export function useDebouncedSave(
  save: (value: string) => void,
  delayMs: number,
): DebouncedSave {
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const channel = useMemo<DebouncedSave>(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;
    let pending: string | null = null;

    const flush = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
      if (pending !== null) {
        const value = pending;
        pending = null;
        saveRef.current(value);
      }
    };

    return {
      flush,
      schedule: (value: string) => {
        pending = value;
        if (timer !== null) clearTimeout(timer);
        timer = setTimeout(flush, delayMs);
      },
      hasPending: () => pending !== null,
    };
  }, [delayMs]);

  useEffect(() => () => channel.flush(), [channel]);

  return channel;
}
