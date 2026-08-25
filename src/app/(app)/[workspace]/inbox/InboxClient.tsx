"use client";

/**
 * Client boundary for the inbox routes. The view is observer-driven and
 * reads the MobX pool, so the server pages only resolve route params and
 * hand the workspace slug (plus the open notification id, when the URL
 * carries one) across this boundary.
 */

import { InboxView } from "@/components/inbox/InboxView";

export function InboxClient({
  workspace,
  selectedId,
}: {
  workspace: string;
  selectedId?: string;
}) {
  return <InboxView workspace={workspace} selectedId={selectedId} />;
}
