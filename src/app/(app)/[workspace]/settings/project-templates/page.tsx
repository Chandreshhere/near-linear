import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Project templates" };

export default function ProjectTemplatesPage() {
  return (
    <NotConfiguredPage
      title="Templates"
      description="Start a project from a known shape instead of an empty page."
      sectionTitle="Project templates"
      glyph="template"
      panelTitle="No project templates yet"
      body="A project template pre-fills the description, milestones, default teams and lead so recurring work — a launch, a migration, a quarterly cycle — starts consistently. None exist for this workspace."
      action="New project template"
    />
  );
}
