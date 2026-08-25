import type { Metadata } from "next";
import { TeamViewsClient } from "./TeamViewsClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: `${key} › Views` };
}

/**
 * Team-scoped saved views. Renders the SAME page as `/:ws/views/issues`,
 * filtered to the views saved against this team — it used to be an empty
 * placeholder body, which on a fresh workspace was an entirely blank screen.
 */
export default async function TeamViewsPage({
  params,
}: {
  params: Promise<{ workspace: string; key: string }>;
}) {
  const { workspace, key } = await params;
  return <TeamViewsClient workspace={workspace} teamKey={key.toUpperCase()} />;
}
