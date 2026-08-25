import type { Metadata } from "next";
import { JoinTeamView } from "./JoinTeamView";

export const metadata: Metadata = { title: "Join or create a team" };

export default async function JoinTeamPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <JoinTeamView workspace={workspace} />;
}
