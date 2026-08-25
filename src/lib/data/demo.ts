/**
 * Demo mode — the ONLY thing that puts §26 fixtures in a browser.
 *
 * First run no longer seeds anything (see src/lib/workspace/workspaces.ts): a
 * new browser lands in onboarding and builds its own workspace. The demo data
 * set is still here for screenshots, tests and "show me what a full workspace
 * looks like", but it has to be asked for:
 *
 *   1. `?demo=1` on the way into the app (e.g. http://localhost:3000/app?demo=1).
 *      Provisions/opens the `synquic-labs` workspace and lands in it.
 *   2. Settings → Preferences → Workspace data → "Load demo data".
 *      Merges the fixtures into the workspace you are ALREADY in, so a real
 *      workspace can be filled out without losing what is in it.
 *
 * Both paths go through the transaction queue like every other write; nothing
 * bypasses the engine. The counterpart is `resetWorkspace`, which wipes a
 * workspace's IndexedDB database and the localStorage keys that point at it.
 *
 * NOTE: the dev-only HTTP mock (src/server/syncStore.ts) still seeds fixtures
 * into its in-memory store on boot. It is server-side, never bundled into the
 * client, and only reachable with NEXT_PUBLIC_SYNC_TRANSPORT=http.
 */

import { SyncClient } from "@/lib/data/SyncClient";
import { DEMO_WORKSPACE, buildFixtures } from "@/lib/data/fixtures";
import { AUTH_STORAGE_KEY, ONBOARDING_STORAGE_KEY } from "@/lib/auth/session";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import type { AnyModelData, ModelName } from "@/lib/data/types";
import {
  clearWorkspaceRegistry,
  rememberWorkspace,
} from "@/lib/workspace/active";

/** Query parameter that turns first entry into a demo-workspace entry. */
export const DEMO_QUERY_PARAM = "demo";

export { DEMO_WORKSPACE };

/** True when the current URL asks for demo mode (`?demo=1`). */
export function demoRequested(search: string): boolean {
  try {
    return new URLSearchParams(search).get(DEMO_QUERY_PARAM) === "1";
  } catch {
    return false;
  }
}

/**
 * Rows whose identity belongs to the workspace the user is already in.
 * Merging fixtures must never rewrite who they are or what their theme is.
 */
const IDENTITY_MODELS: ReadonlySet<ModelName> = new Set<ModelName>([
  "Workspace",
  "UserSettings",
]);

function rowId(data: AnyModelData): string {
  return (data as unknown as { id: string }).id;
}

/**
 * Merge the fixture rows into an already-booted workspace.
 *
 * Skips the fixture Workspace + UserSettings rows (the current workspace keeps
 * its own name, slug and preferences) and the current user's own row, then
 * creates every remaining row that is not already present. Idempotent: running
 * it twice adds nothing the second time.
 *
 * Returns how many rows were written.
 */
export function loadDemoDataInto(client: SyncClient): number {
  let created = 0;
  for (const { model, data } of buildFixtures()) {
    const id = rowId(data);
    if (IDENTITY_MODELS.has(model)) continue;
    if (model === "User" && id === CURRENT_USER_ID) continue;
    if (client.store.get(model, id) !== undefined) continue;
    client.queue.enqueue(
      "create",
      model,
      id,
      data as unknown as Record<string, unknown>,
    );
    created += 1;
  }
  return created;
}

/**
 * `?demo=1`: open (creating on first use) the demo workspace and return its
 * slug. Safe to call repeatedly — an already-seeded database is left alone.
 */
export async function provisionDemoWorkspace(): Promise<string> {
  const slug = DEMO_WORKSPACE.slug;
  const client = SyncClient.get(slug);
  await client.start();

  if (client.store.all("Workspace").length === 0) {
    for (const { model, data } of buildFixtures()) {
      client.queue.enqueue(
        "create",
        model,
        rowId(data),
        data as unknown as Record<string, unknown>,
      );
    }
    await client.queue.flush();
  }

  rememberWorkspace({ slug, name: DEMO_WORKSPACE.name });
  return slug;
}

/**
 * "Reset workspace": wipe this workspace's IndexedDB database (rows, sync
 * bookkeeping and the durable transaction queue) and forget the local session
 * + workspace index, so the next entry starts onboarding from scratch.
 *
 * `Persistence.wipe()` clears the stores in place rather than deleting the
 * database, so it can never be blocked by another tab holding a connection.
 */
export async function resetWorkspace(client: SyncClient): Promise<void> {
  await client.resetLocalData();
  clearWorkspaceRegistry();
  if (typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(AUTH_STORAGE_KEY);
      window.localStorage.removeItem(ONBOARDING_STORAGE_KEY);
    } catch {
      /* private mode — nothing was persisted to begin with */
    }
  }
}
