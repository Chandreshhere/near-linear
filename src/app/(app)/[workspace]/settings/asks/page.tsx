import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Asks" };

export default function AsksPage() {
  return (
    <NotConfiguredPage
      title="Asks"
      description="Turn requests from chat and email into tracked issues with their own intake queue."
      sectionTitle="Intake channels"
      glyph="ask"
      panelTitle="No intake channel connected"
      body="An intake channel watches a Slack channel or a shared inbox, files each request as an issue in a triage queue, and reports status back to whoever asked. No channel is connected, so nothing is being collected."
      action="Connect a channel"
    />
  );
}
