import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Releases" };

export default function ReleasesPage() {
  return (
    <NotConfiguredPage
      title="Releases"
      description="Bundle completed issues into a version and track what shipped when."
      sectionTitle="Releases"
      glyph="release"
      panelTitle="No releases created"
      body="A release collects the issues that went out together, records the date they shipped, and gives every issue in it a link back to the version. None have been created for this workspace."
      action="New release"
    />
  );
}
