"use client";

/**
 * Workspace Projects page body (`/projects/all`) — MASTER_PROMPT.md §10.1,
 * docs/analysis/capture-projects.md §6.1: h2 "Projects" + "New project"
 * 28px pill (compose icon + 12px/500 label), tabs row with the "All
 * projects" pill + "Add new view", right controls Add filter / Display
 * options / insights toggle, the filter chip strip, then the subgrid table
 * with the FLOATING insights FacetPanel (Health | Teams | Leads) overlaying
 * it — the table keeps its full width (§11.3).
 *
 * Filters live in `?filter=` (useSearchParams), so every consumer sits under
 * its own <Suspense> boundary — the fallbacks hold the toolbar geometry
 * rather than collapsing it.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Header } from "@/components/shell/Header";
import { Button, IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { SidePanelGlyph } from "@/components/icons/Sprites";
import { ProjectsTable } from "@/components/projects/ProjectsTable";
import {
  AddProjectFilterButton,
  ProjectFilterBar,
} from "@/components/projects/ProjectFilterBar";
import { ProjectDisplayOptionsButton } from "@/components/projects/ProjectDisplayOptions";
import { FacetPanel } from "@/components/panels/FacetPanel";
import { NewProjectDialog } from "@/components/projects/NewProjectDialog";
import { SaveProjectViewDialog } from "@/components/projects/SaveViewDialog";
import { insightsKey, usePersistedFlag } from "@/lib/projects/localPrefs";
import shellStyles from "@/components/shell/shell.module.css";
import styles from "@/components/projects/projectstable.module.css";

/** Canonical view key (ViewPreference row id + selection store key). */
const VIEW_KEY = "projects/all";

export function WorkspaceProjectsView() {
  const { workspace } = useParams<{ workspace: string }>();
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [insightsOpen, , toggleInsights] = usePersistedFlag(insightsKey(VIEW_KEY));

  return (
    <>
      <Header
        // CAPTURED: title cluster left, "New project" in the RIGHT cluster
        // (title band is space-between; button right edge at −8px).
        title="Projects"
        right={
          <Button
            size={28}
            icon={<Icon name="Compose" size={14} />}
            onClick={() => setNewProjectOpen(true)}
          >
            New project
          </Button>
        }
        tabs={
          <>
            <div className={shellStyles.tabStrip}>
              <Link
                href={`/${workspace}/projects/all`}
                className={shellStyles.tab}
                data-active="true"
              >
                All projects
              </Link>
              <IconButton
                label="Add new view"
                className={shellStyles.tabAddBtn}
                onClick={() => setSaveViewOpen(true)}
              >
                <Icon name="Plus" size={14} />
              </IconButton>
            </div>
            <span className={shellStyles.headerSpacer} />
            <Suspense
              fallback={
                <IconButton label="Filter" disabled>
                  <Icon name="Filter" size={14} />
                </IconButton>
              }
            >
              <AddProjectFilterButton viewKey={VIEW_KEY} />
            </Suspense>
            <ProjectDisplayOptionsButton viewKey={VIEW_KEY} />
            <IconButton
              label={insightsOpen ? "Close insights" : "Open insights"}
              data-state={insightsOpen ? "active" : "inactive"}
              data-active={insightsOpen ? "true" : undefined}
              aria-expanded={insightsOpen}
              onClick={toggleInsights}
            >
              <SidePanelGlyph expanded={insightsOpen} />
            </IconButton>
          </>
        }
      />

      <Suspense fallback={null}>
        <ProjectFilterBar viewKey={VIEW_KEY} />
      </Suspense>

      <div className={styles.body}>
        <div className={styles.viewport} tabIndex={0} data-scroll-container="true">
          <Suspense fallback={null}>
            <ProjectsTable
              viewKey={VIEW_KEY}
              onCreateProject={() => setNewProjectOpen(true)}
            />
          </Suspense>
        </div>
      </div>
      {/* §11.3: the insights panel FLOATS over the table (absolute against
          the content card) — the table keeps its full width underneath. */}
      <Suspense fallback={null}>
        <FacetPanel
          viewKey={VIEW_KEY}
          scope={{ kind: "projects" }}
          open={insightsOpen}
        />
      </Suspense>

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        workspace={workspace}
      />
      <Suspense fallback={null}>
        <SaveProjectViewDialog
          open={saveViewOpen}
          onOpenChange={setSaveViewOpen}
          viewKey={VIEW_KEY}
          defaultName="All projects"
        />
      </Suspense>
    </>
  );
}
