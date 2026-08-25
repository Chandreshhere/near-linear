import type { Metadata } from "next";
import { SecurityView } from "./SecurityView";

export const metadata: Metadata = { title: "Security & access" };

export default function SecuritySettingsPage() {
  return <SecurityView />;
}
