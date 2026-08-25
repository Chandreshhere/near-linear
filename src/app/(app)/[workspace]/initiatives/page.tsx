import type { Metadata } from "next";
import { InitiativesView } from "@/components/workspace/InitiativesView";

export const metadata: Metadata = { title: "Initiatives" };

export default function InitiativesPage() {
  return <InitiativesView />;
}
