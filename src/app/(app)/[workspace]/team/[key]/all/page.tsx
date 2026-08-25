import type { Metadata } from "next";
import { TeamIssuesView } from "./TeamIssuesView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: `${key.toUpperCase()} › Issues` };
}

export default async function TeamIssuesPage({
  params,
}: {
  params: Promise<{ workspace: string; key: string }>;
}) {
  const { workspace, key } = await params;
  return <TeamIssuesView workspace={workspace} teamKey={key} />;
}
