import type { Metadata } from "next";
import { InboxClient } from "./InboxClient";

export const metadata: Metadata = { title: "Inbox" };

export default async function InboxPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <InboxClient workspace={workspace} />;
}
