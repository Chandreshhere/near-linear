import type { Metadata } from "next";
import { NotConfiguredPage } from "@/components/settings/NotConfiguredPage";

export const metadata: Metadata = { title: "Emojis" };

export default function EmojisPage() {
  return (
    <NotConfiguredPage
      title="Emojis"
      description="Custom emojis available to everyone in this workspace."
      sectionTitle="Custom emojis"
      glyph="emoji"
      panelTitle="No custom emojis uploaded"
      body="Uploaded emojis become available in comments, reactions and as project icons under a :shortcode: of your choosing. Uploads need blob storage, which this build does not have, so the workspace uses the standard set only."
      action="Upload emoji"
    />
  );
}
