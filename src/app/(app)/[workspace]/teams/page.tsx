import type { Metadata } from "next";
import { TeamsDirectoryView } from "@/components/teams/TeamsDirectoryView";

export const metadata: Metadata = { title: "Teams" };

export default async function TeamsDirectoryPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <TeamsDirectoryView workspace={workspace} />;
}
