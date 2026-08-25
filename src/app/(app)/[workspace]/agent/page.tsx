import type { Metadata } from "next";
import { AgentView } from "@/components/agent/AgentView";

export const metadata: Metadata = { title: "New chat" };

export default async function AgentPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <AgentView workspace={workspace} />;
}
