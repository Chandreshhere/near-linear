import type { Metadata } from "next";
import { ViewsClient } from "./ViewsClient";

export const metadata: Metadata = { title: "Views" };

export default async function ViewsRoute({
  params,
}: {
  params: Promise<{ workspace: string; tab: string }>;
}) {
  const { workspace, tab } = await params;
  // ViewsClient validates the segment (unknown → "issues", §10.7).
  return <ViewsClient workspace={workspace} tab={tab} />;
}
