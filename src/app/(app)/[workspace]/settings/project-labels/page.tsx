import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Project labels" };

export default function ProjectLabelsPage() {
  return (
    <NotConfiguredPage
      title="Labels"
      description="Labels applied to projects, kept separate from the labels used on issues."
      sectionTitle="Project labels"
      glyph="label"
      panelTitle="No project labels yet"
      body="Project labels live on a project's own properties and drive filtering on the projects list — they are a different set from the issue labels under Issues → Labels. None have been created for this workspace."
      action="New project label"
    />
  );
}
