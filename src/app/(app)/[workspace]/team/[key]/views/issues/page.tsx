import type { Metadata } from "next";
import { PagePlaceholder } from "@/components/shell/PagePlaceholder";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  return { title: `${key} › Views` };
}

export default async function TeamViewsPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  return <PagePlaceholder title="Views" headerTitle={`${key} › Views`} />;
}
