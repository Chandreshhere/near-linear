"use client";

/**
 * Team Projects page body (`/team/:KEY/projects/all`) — the workspace
 * projects view (MASTER_PROMPT.md §10.1) scoped to one team: breadcrumb
 * "Team › Projects", same tab strip + right controls (New project, Add new
 * view, filter, display options, insights), and the subgrid table filtered
 * to projects whose teamIds include this team.
 *
 * Every persisted key is team-scoped ("team/TRENDZO/projects/all"), so the
 * team page keeps its own grouping, columns, filters and insights state.
 */

import { Suspense, useState } from "react";
import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { Header } from "@/components/shell/Header";
import { Button, IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
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
import { FavoriteStar } from "@/components/nav/Favorites";
import { insightsKey, usePersistedFlag } from "@/lib/projects/localPrefs";
import shellStyles from "@/components/shell/shell.module.css";
import styles from "@/components/projects/projectstable.module.css";

export const TeamProjectsView = observer(function TeamProjectsView({
  workspace,
  teamKey,
}: {
  workspace: string;
  teamKey: string;
}) {
  const store = useStore();
  const client = useSyncClient();

  const viewKey = `team/${teamKey.toUpperCase()}/projects/all`;
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [insightsOpen, , toggleInsights] = usePersistedFlag(insightsKey(viewKey));

  // Undefined-safe while the pool boots — the crumb renders a skeleton.
  const team = store.teamByKey(teamKey);
  const notFound = team === undefined && client.status === "ready";

  const breadcrumb = (
    <div className={styles.crumbs}>
      {team !== undefined ? (
        <span className={styles.crumbTeam}>{team.name}</span>
      ) : (
        <span className={styles.crumbSkeleton} aria-hidden="true" />
      )}
      <span className={styles.crumbSep}>›</span>
      <span className={styles.crumbCurrent}>Projects</span>
      {team !== undefined ? (
        <FavoriteStar entityType="team" entityId={team.id} size={14} />
      ) : null}
    </div>
  );

  return (
    <>
      <Header
        // CAPTURED: breadcrumb left, "New project" in the RIGHT cluster.
        left={breadcrumb}
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
                href={`/${workspace}/team/${teamKey}/projects/all`}
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
              <AddProjectFilterButton viewKey={viewKey} />
            </Suspense>
            <ProjectDisplayOptionsButton viewKey={viewKey} />
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
        <ProjectFilterBar viewKey={viewKey} />
      </Suspense>

      <div className={styles.body}>
        <div className={styles.viewport} tabIndex={0} data-scroll-container="true">
          {team === undefined ? (
            notFound ? (
              <EmptyState heading="Team not found">
                No team with the key “{teamKey.toUpperCase()}” exists in this
                workspace.
              </EmptyState>
            ) : null
          ) : (
            <Suspense fallback={null}>
              <ProjectsTable
                viewKey={viewKey}
                teamId={team.id}
                onCreateProject={() => setNewProjectOpen(true)}
              />
            </Suspense>
          )}
        </div>
      </div>
      {/* §11.3: the insights panel FLOATS over the table (absolute against
          the content card) — the table keeps its full width underneath. */}
      {team !== undefined ? (
        <Suspense fallback={null}>
          <FacetPanel
            viewKey={viewKey}
            scope={{ kind: "projects", teamId: team.id }}
            open={insightsOpen}
          />
        </Suspense>
      ) : null}

      <NewProjectDialog
        open={newProjectOpen}
        onOpenChange={setNewProjectOpen}
        workspace={workspace}
        teamId={team?.id}
      />
      <Suspense fallback={null}>
        <SaveProjectViewDialog
          open={saveViewOpen}
          onOpenChange={setSaveViewOpen}
          viewKey={viewKey}
          defaultName={team !== undefined ? `${team.name} projects` : "Team projects"}
          teamKey={team?.key}
        />
      </Suspense>
    </>
  );
});
