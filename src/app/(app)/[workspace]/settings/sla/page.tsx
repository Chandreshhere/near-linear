import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "SLAs" };

export default function SlaPage() {
  return (
    <NotConfiguredPage
      title="SLAs"
      description="Put a countdown on issues that match a filter, and escalate them as the deadline nears."
      sectionTitle="SLA rules"
      glyph="sla"
      panelTitle="No SLA rules defined"
      body="An SLA rule watches a filter — a team, a label, a customer tier — and gives matching issues a due countdown that raises priority and surfaces a breach warning as it runs out. No rules are defined for this workspace."
      action="New SLA rule"
    />
  );
}
