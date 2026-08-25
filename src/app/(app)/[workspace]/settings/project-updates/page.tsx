import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Project updates" };

export default function ProjectUpdatesPage() {
  return (
    <NotConfiguredPage
      title="Updates"
      description="Ask project leads for a health check on a schedule."
      sectionTitle="Update reminders"
      glyph="updates"
      panelTitle="No reminder cadence configured"
      body="A cadence prompts each project lead for an update — on track, at risk or off track, plus a short note — and posts the result to the project feed and to subscribers. No cadence is set, so updates are only written by hand."
      action="Set a cadence"
    />
  );
}
