import type { Metadata } from "next";
import { CyclesView } from "@/components/cycles/CyclesView";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: `${key.toUpperCase()} › Cycles` };
}

export default async function TeamCyclesPage({
  params,
}: {
  params: Promise<{ workspace: string; key: string }>;
}) {
  const { workspace, key } = await params;
  return <CyclesView workspace={workspace} teamKey={key} />;
}
