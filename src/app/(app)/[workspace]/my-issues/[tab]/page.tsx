import type { Metadata } from "next";
import { MyIssuesClient } from "./MyIssuesClient";

export const metadata: Metadata = { title: "My issues" };

export default async function MyIssuesPage({
  params,
}: {
  params: Promise<{ workspace: string; tab: string }>;
}) {
  const { workspace, tab } = await params;
  // MyIssuesClient validates the segment (unknown → "assigned", §10.5).
  return <MyIssuesClient workspace={workspace} tab={tab} />;
}
