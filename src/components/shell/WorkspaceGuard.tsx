"use client";

/**
 * Keeps `/<slug>/…` honest.
 *
 * A workspace slug is just a URL segment, so anyone can type one — a stale
 * bookmark from a wiped browser, a link to somebody else's workspace, or the
 * demo slug on a machine that never loaded the demo. Each of those opens an
 * EMPTY IndexedDB database, which used to render a shell full of nothing.
 *
 * Once the engine has finished booting, a workspace with no `Workspace` row is
 * a workspace that does not exist here: send the user to onboarding instead of
 * a hollow app. (Booting is never treated as missing — the pool is empty for a
 * few milliseconds on every cold start.)
 *
 * Also keeps `localStorage.linearWorkspace` in step with the URL, so the next
 * "Open app" lands where the user actually is.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { useSyncClient } from "@/lib/data/DataProvider";
import { readActiveWorkspace, rememberWorkspace } from "@/lib/workspace/active";

export const WorkspaceGuard = observer(function WorkspaceGuard({
  workspace,
}: {
  workspace: string;
}) {
  const router = useRouter();
  const client = useSyncClient();
  const booted = client.status !== "booting";
  const row = client.store.all("Workspace")[0];
  const exists = row !== undefined;
  const name = row?.name;

  useEffect(() => {
    if (!booted) return;
    if (!exists) {
      router.replace("/onboarding/workspace");
      return;
    }
    if (readActiveWorkspace() !== workspace) {
      rememberWorkspace({ slug: workspace, name: name ?? workspace });
    }
  }, [booted, exists, name, router, workspace]);

  return null;
});
