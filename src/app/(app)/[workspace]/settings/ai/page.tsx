import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "AI & Agents" };

export default function AiSettingsPage() {
  return (
    <NotConfiguredPage
      title="AI & Agents"
      description="Workspace-level controls for what agents may read, write and reach."
      sectionTitle="Workspace agents"
      glyph="ai"
      panelTitle="Agent policy not configured"
      body="This page governs which teams agents may write to, which connectors they can reach, and whether their activity is summarized in the workspace feed. Those controls need an agent runtime; your own agent settings live under Personal → Agent personalization."
      action="Configure agents"
    />
  );
}
