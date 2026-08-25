import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Initiatives" };

export default function InitiativesPage() {
  return (
    <NotConfiguredPage
      title="Initiatives"
      description="Group projects under a longer-term goal and roll their progress into one view."
      sectionTitle="Initiatives"
      glyph="initiative"
      panelTitle="No initiatives in this workspace"
      body="An initiative sits above projects: it carries an owner, a status, and the projects contributing to it, so a quarter or a strategic bet can be tracked as one line. None have been created here."
      action="New initiative"
    />
  );
}
