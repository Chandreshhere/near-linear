"use client";

/**
 * Small typed localStorage store for DEVICE-scoped settings — the ones that
 * are correctly per-browser rather than per-account, so they deliberately do
 * NOT live on the synced `UserSettings` row:
 *
 *   · notification channels (a browser's push permission, the desktop app's
 *     presence and a Slack connection are properties of this device/install,
 *     not of the account; syncing them would turn push on for machines that
 *     never granted permission)
 *   · agent personalization (the instructions and reply style the local agent
 *     adapter reads before answering — see lib/agent/personalization.ts)
 *
 * Account-level preferences go through the transaction queue instead: theme,
 * display names, first day of week, the newsletter opt-in and everything else
 * on `UserSettingsData`.
 *
 * DELIVERY SEAM. Choosing a channel is local; *delivering* to it is not — push
 * needs a push service and a subscription endpoint, Slack needs an installed
 * app with a bot token, email needs a relay. The settings page says so in the
 * section copy rather than implying a message is on its way.
 *
 * Reads happen after mount so SSR and the first client render agree.
 */

import { useCallback, useEffect, useState } from "react";

export function readPrefs<T extends object>(key: string, defaults: T): T {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return defaults;
    const parsed = JSON.parse(raw) as Partial<T>;
    return { ...defaults, ...parsed };
  } catch {
    return defaults;
  }
}

export function useLocalPrefs<T extends object>(
  key: string,
  defaults: T,
): [T, (patch: Partial<T>) => void, boolean] {
  const [value, setValue] = useState<T>(defaults);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setValue(readPrefs(key, defaults));
    setHydrated(true);
    // `defaults` is a literal at every call site — key alone identifies the store.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const patch = useCallback(
    (fields: Partial<T>) => {
      setValue((prev) => {
        const next = { ...prev, ...fields };
        try {
          window.localStorage.setItem(key, JSON.stringify(next));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [key],
  );

  return [value, patch, hydrated];
}
