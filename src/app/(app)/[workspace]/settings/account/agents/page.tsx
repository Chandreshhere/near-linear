import type { Metadata } from "next";
import { AgentPersonalizationView } from "./AgentPersonalizationView";

export const metadata: Metadata = { title: "Agent personalization" };

export default function AgentPersonalizationPage() {
  return <AgentPersonalizationView />;
}
