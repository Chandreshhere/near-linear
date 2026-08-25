import type { Metadata } from "next";
import { WorkspaceProjectsView } from "./WorkspaceProjectsView";

export const metadata: Metadata = { title: "Projects" };

export default function ProjectsPage() {
  return <WorkspaceProjectsView />;
}
