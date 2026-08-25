import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Code & reviews" };

export default function CodeAndReviewsPage() {
  return (
    <NotConfiguredPage
      title="Code & reviews"
      description="Link a code host so branches, pull requests and reviews stay attached to issues."
      sectionTitle="Code host"
      glyph="code"
      panelTitle="No code host connected"
      body="Connecting GitHub or GitLab gives every issue a copyable branch name, links its pull requests into the activity feed, and moves it to a started or completed status when a branch opens or merges. This build ships without an integration server, so there is nothing to authorize yet."
      action="Connect GitHub"
    />
  );
}
