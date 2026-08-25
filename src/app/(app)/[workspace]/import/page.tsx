import type { Metadata } from "next";
import { ImportView } from "@/components/workspace/ImportView";

export const metadata: Metadata = { title: "Import issues" };

export default async function ImportPage({
  params,
}: {
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <ImportView workspace={workspace} />;
}
