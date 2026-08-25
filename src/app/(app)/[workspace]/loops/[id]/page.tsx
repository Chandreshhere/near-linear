import type { Metadata } from "next";
import { LoopBuilder } from "@/components/loops/LoopBuilder";

export const metadata: Metadata = { title: "Loop" };

export default async function LoopDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  return <LoopBuilder workspace={workspace} loopId={id} />;
}
