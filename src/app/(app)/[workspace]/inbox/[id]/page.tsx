import type { Metadata } from "next";
import { InboxClient } from "../InboxClient";

export const metadata: Metadata = { title: "Inbox" };

/** `/:workspace/inbox/:id` — the list row links resolve here (capture §6). */
export default async function InboxNotificationPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  return <InboxClient workspace={workspace} selectedId={id} />;
}
