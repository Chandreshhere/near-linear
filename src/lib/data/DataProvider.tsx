"use client";

/**
 * React wiring for the local-first engine. <DataProvider workspace={slug}>
 * creates the per-workspace SyncClient singleton, boots it from a client
 * effect (IndexedDB + EventSource are browser-only) and exposes it through
 * context. Children render immediately — `client.status` drives skeletons.
 */

import { createContext, useContext, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { SyncClient } from "@/lib/data/SyncClient";
import type { SyncStore } from "@/lib/data/store";

const SyncClientContext = createContext<SyncClient | null>(null);

export function DataProvider({
  workspace,
  children,
}: {
  workspace: string;
  children: React.ReactNode;
}) {
  // Singleton lookup is render-safe (no browser APIs until start()).
  const [client] = useState(() => SyncClient.get(workspace));

  useEffect(() => {
    // start() is idempotent — StrictMode double effects and remounts reuse
    // the same boot. The singleton outlives unmounts (workspace-level cache),
    // so no dispose() here.
    void client.start();
  }, [client]);

  return (
    <SyncClientContext.Provider value={client}>
      {children}
    </SyncClientContext.Provider>
  );
}

export function useSyncClient(): SyncClient {
  const client = useContext(SyncClientContext);
  if (client === null) {
    throw new Error("useSyncClient must be used inside <DataProvider>");
  }
  return client;
}

export function useStore(): SyncStore {
  return useSyncClient().store;
}

/**
 * Sync indicator for the sidebar top row (next to the workspace name):
 * visible while booting or while optimistic transactions await their ACK.
 */
export const SyncStatus = observer(function SyncStatus() {
  const client = useContext(SyncClientContext);
  if (client === null) return null;

  const booting = client.status === "booting";
  const syncing = client.queue.syncing;
  const failed = client.status === "error";
  if (!booting && !syncing && !failed) return null;

  const label = failed && !syncing ? "Offline" : "Syncing";
  const count = client.queue.pendingCount;

  return (
    <span
      aria-live="polite"
      title={failed ? "Sync connection lost — retrying" : "Saving changes"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        marginLeft: 6,
        fontSize: 11,
        lineHeight: "16px",
        color: "var(--color-text-tertiary, #8a8f98)",
        whiteSpace: "nowrap",
        flex: "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: failed && !syncing ? "#eb5757" : "#f2994a",
        }}
      />
      {label}
      {count > 0 ? ` ${count}` : ""}
    </span>
  );
});
