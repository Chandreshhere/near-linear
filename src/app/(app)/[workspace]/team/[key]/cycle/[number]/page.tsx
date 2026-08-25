import type { Metadata } from "next";
import { CycleDetailView } from "@/components/cycles/CycleDetailView";

/** `/team/:KEY/cycle/:number` — the segment is the per-team cycle number. */
function parseCycleNumber(segment: string): number {
  const parsed = Number.parseInt(segment, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string; number: string }>;
}): Promise<Metadata> {
  const { key, number } = await params;
  return { title: `${key.toUpperCase()} › Cycle ${parseCycleNumber(number)}` };
}

export default async function TeamCycleDetailPage({
  params,
}: {
  params: Promise<{ workspace: string; key: string; number: string }>;
}) {
  const { workspace, key, number } = await params;
  return (
    <CycleDetailView
      workspace={workspace}
      teamKey={key}
      cycleNumber={parseCycleNumber(number)}
    />
  );
}
