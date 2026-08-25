import type { Metadata } from "next";
import { LabelsView } from "./LabelsView";

export const metadata: Metadata = { title: "Labels" };

export default function IssueLabelsPage() {
  return <LabelsView />;
}
