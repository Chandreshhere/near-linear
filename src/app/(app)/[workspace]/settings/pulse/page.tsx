import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Pulse" };

export default function PulsePage() {
  return (
    <NotConfiguredPage
      title="Pulse"
      description="A periodic digest of what moved in the workspace and what stalled."
      sectionTitle="Pulse digest"
      glyph="pulse"
      panelTitle="Pulse is off"
      body="Pulse summarizes the period's activity — issues completed, projects that changed health, work that has not moved — and delivers it on a schedule. It needs an activity index that this build does not compute, so it cannot be enabled."
      action="Enable Pulse"
    />
  );
}
