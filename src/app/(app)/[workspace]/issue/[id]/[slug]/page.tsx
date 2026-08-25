import type { Metadata } from "next";
import { IssueDetailView } from "./IssueDetailView";

/** Tab title: "IDENTIFIER Title-from-slug" (e.g. "TRENDZO-37 Research Work"). */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string; slug: string }>;
}): Promise<Metadata> {
  const { id, slug } = await params;
  const title = slug
    .split("-")
    .filter((word) => word !== "")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return { title: `${id.toUpperCase()} ${title}`.trim() };
}

export default async function IssuePage({
  params,
}: {
  params: Promise<{ workspace: string; id: string }>;
}) {
  const { workspace, id } = await params;
  return <IssueDetailView workspace={workspace} identifier={id.toUpperCase()} />;
}
