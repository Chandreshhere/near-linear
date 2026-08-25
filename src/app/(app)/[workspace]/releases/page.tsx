import type { Metadata } from "next";
import { ReleasesView } from "@/components/workspace/ReleasesView";

export const metadata: Metadata = { title: "Releases" };

export default function ReleasesPage() {
  return <ReleasesView />;
}
