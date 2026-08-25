"use client";

/**
 * Read/write access to the signed-in user's `UserSettings` row through the
 * optimistic transaction queue (§19 write path) — the same pipeline every
 * other edit uses, so a Preferences change applies instantly, persists to
 * IndexedDB and survives a reload.
 *
 * Call inside `observer()` components: the read is an observable pool read.
 */

import { useCallback } from "react";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import type { UserSettingsData } from "@/lib/data/types";

/** Captured defaults (MASTER_PROMPT §10.9) — used until the row hydrates. */
export const DEFAULT_USER_SETTINGS: UserSettingsData = {
  id: CURRENT_USER_ID,
  homeView: "agent",
  theme: "dark",
  firstDayOfWeek: "Monday",
  displayFullNames: true,
  convertEmoticons: true,
  commentSubmitKey: "Enter",
  fontSize: "default",
  pointerCursor: false,
  underlineLinks: false,
  disableAnimations: false,
  openInDesktop: false,
  autoAssignSelf: false,
  assignOnStart: false,
};

export type UserSettingsPatch = Partial<Omit<UserSettingsData, "id">>;

export function useUserSettings(): {
  settings: UserSettingsData;
  /** true once the row exists in the pool (controls stay live either way). */
  loaded: boolean;
  patch: (fields: UserSettingsPatch) => void;
} {
  const store = useStore();
  const client = useSyncClient();
  const row = store.get("UserSettings", CURRENT_USER_ID);

  const patch = useCallback(
    (fields: UserSettingsPatch) => {
      const exists = store.get("UserSettings", CURRENT_USER_ID) !== undefined;
      client.queue.enqueue(
        exists ? "update" : "create",
        "UserSettings",
        CURRENT_USER_ID,
        exists
          ? (fields as Record<string, unknown>)
          : ({ ...DEFAULT_USER_SETTINGS, ...fields } as unknown as Record<string, unknown>),
      );
    },
    [client, store],
  );

  return {
    settings: row ?? DEFAULT_USER_SETTINGS,
    loaded: row !== undefined,
    patch,
  };
}
