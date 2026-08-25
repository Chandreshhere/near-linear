import type { Metadata } from "next";
import { ProjectStatusesView } from "./ProjectStatusesView";

export const metadata: Metadata = { title: "Project statuses" };

export default function ProjectStatusesPage() {
  return <ProjectStatusesView />;
}
