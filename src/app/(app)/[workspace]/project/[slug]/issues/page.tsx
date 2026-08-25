import type { Metadata } from "next";
import { ProjectIssuesView } from "./ProjectIssuesView";

/** "driver-app-0f150687c354" → "Driver App" (strip the 12-hex short id).
 * Kept module-local: Next page modules only allow route-contract exports. */
function projectNameFromSlug(slug: string): string {
  const parts = slug.split("-").filter((part) => part !== "");
  const last = parts[parts.length - 1];
  if (parts.length > 1 && last !== undefined && /^[0-9a-f]{12}$/.test(last)) {
    parts.pop();
  }
  const name = parts
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  return name === "" ? "Project" : name;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${projectNameFromSlug(slug)} › Issues` };
}

export default async function ProjectIssuesPage({
  params,
}: {
  params: Promise<{ workspace: string; slug: string }>;
}) {
  const { workspace, slug } = await params;
  return <ProjectIssuesView workspace={workspace} slug={slug} />;
}
