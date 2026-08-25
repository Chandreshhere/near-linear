import type { Metadata } from "next";
import { LoopsView } from "@/components/loops/LoopsView";

export const metadata: Metadata = { title: "Loops" };

export default async function LoopsPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <LoopsView workspace={workspace} />;
}
