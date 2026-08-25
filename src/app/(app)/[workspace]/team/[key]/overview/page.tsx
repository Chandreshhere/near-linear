import type { Metadata } from "next";
import { TeamHomeClient } from "./TeamHomeClient";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: `${key.toUpperCase()} › Home` };
}

export default async function TeamHomePage({
  params,
}: {
  params: Promise<{ workspace: string; key: string }>;
}) {
  const { workspace, key } = await params;
  return <TeamHomeClient workspace={workspace} teamKey={key} />;
}
