import type { Metadata } from "next";
import { TeamProjectsView } from "./TeamProjectsView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: `${key.toUpperCase()} › Projects` };
}

export default async function TeamProjectsPage({
  params,
}: {
  params: Promise<{ workspace: string; key: string }>;
}) {
  const { workspace, key } = await params;
  return <TeamProjectsView workspace={workspace} teamKey={key} />;
}
