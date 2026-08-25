import type { Metadata } from "next";
import { TeamSettingsView } from "./TeamSettingsView";

export const metadata: Metadata = { title: "Team settings" };

export default async function TeamSettingsPage({
  params,
}: {
  params: Promise<{ workspace: string; key: string }>;
}) {
  const { workspace, key } = await params;
  return <TeamSettingsView workspace={workspace} teamKey={key} />;
}
