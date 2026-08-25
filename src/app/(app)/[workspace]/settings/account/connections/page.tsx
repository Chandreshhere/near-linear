import type { Metadata } from "next";
import { ConnectionsView } from "./ConnectionsView";

export const metadata: Metadata = { title: "Connected accounts" };

export default function ConnectionsSettingsPage() {
  return <ConnectionsView />;
}
