import type { Metadata } from "next";
import { TriageView } from "@/components/triage/TriageView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: `${key.toUpperCase()} › Triage` };
}

export default async function TeamTriagePage({
  params,
}: {
  params: Promise<{ workspace: string; key: string }>;
}) {
  const { workspace, key } = await params;
  return <TriageView workspace={workspace} teamKey={key} />;
}
