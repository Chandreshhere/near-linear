import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Customer requests" };

export default function CustomerRequestsPage() {
  return (
    <NotConfiguredPage
      title="Customer requests"
      description="Attach who asked for what, so demand can be sorted by impact instead of by volume."
      sectionTitle="Request sources"
      glyph="customer"
      panelTitle="No customer source connected"
      body="A source — a CRM, a support inbox, or a shared Slack channel — links incoming requests to customers and revenue, then attaches them to the issues that would resolve them. Nothing is connected, so no requests are being collected."
      action="Connect a source"
    />
  );
}
