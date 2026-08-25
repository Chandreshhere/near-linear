import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Templates" };

export default function IssueTemplatesPage() {
  return (
    <NotConfiguredPage
      title="Templates"
      description="Reusable starting points for issues that get filed the same way every time."
      sectionTitle="Issue templates"
      glyph="template"
      panelTitle="No issue templates yet"
      body="A template pre-fills an issue's title, description, labels, assignee and estimate, and can be applied from the create dialog with ⌥C. Template authoring is not part of this build, so no templates exist for this workspace."
      action="New template"
    />
  );
}
