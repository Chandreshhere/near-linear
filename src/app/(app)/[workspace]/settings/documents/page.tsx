import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Documents" };

export default function DocumentsPage() {
  return (
    <NotConfiguredPage
      title="Documents"
      description="Long-form pages that live beside the projects and teams they belong to."
      sectionTitle="Documents"
      glyph="document"
      panelTitle="No documents yet"
      body="Documents hold specs, briefs and notes in the same editor as issue descriptions, and can be linked from a project's resources. None have been created in this workspace."
      action="New document"
    />
  );
}
