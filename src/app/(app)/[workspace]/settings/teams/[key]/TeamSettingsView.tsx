"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import {
  SettingsCard,
  SettingsCustomRow,
  SettingsEmptyRow,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import { useStore } from "@/lib/data/DataProvider";
import type { StateCategory } from "@/lib/data/types";
import styles from "@/components/settings/settings.module.css";

/**
 * Settings → Your teams → {team}. Team identity plus the team's real
 * `WorkflowState` rows grouped by category — the ladder every issue in this
 * team moves through, with live issue counts from the pool.
 */

const CATEGORY_LABEL: Record<StateCategory, string> = {
  triage: "Triage",
  backlog: "Backlog",
  unstarted: "Unstarted",
  started: "Started",
  completed: "Completed",
  canceled: "Canceled",
};

const CATEGORY_ORDER: StateCategory[] = [
  "triage",
  "backlog",
  "unstarted",
  "started",
  "completed",
  "canceled",
];

export const TeamSettingsView = observer(function TeamSettingsView({
  workspace,
  teamKey,
}: {
  workspace: string;
  teamKey: string;
}) {
  const store = useStore();
  const team = store.teamByKey(teamKey);

  if (team === undefined) {
    return (
      <>
        <SettingsPageHeader
          title="Team not found"
          description={`No team with the key “${teamKey}” exists in this workspace.`}
        />
        <SettingsCard>
          <SettingsEmptyRow>
            Pick a team from the sidebar, or{" "}
            <Link href={`/${workspace}/settings/teams/new`}>join or create a team</Link>.
          </SettingsEmptyRow>
        </SettingsCard>
      </>
    );
  }

  const states = store.statesForTeam(team.id);
  const issues = store.issuesForTeam(team.id);
  const projects = store
    .all("Project")
    .filter((project) => project.teamIds.includes(team.id));

  const byCategory = CATEGORY_ORDER.map((category) => ({
    category,
    items: states.filter((state) => state.category === category),
  })).filter((group) => group.items.length > 0);

  return (
    <>
      <SettingsPageHeader
        title={team.name}
        description={`Team settings for ${team.key}.`}
      />

      <SettingsSections>
        <SettingsSection id="team-general" title="General">
          <SettingsCard>
            <SettingsCustomRow>
              <span className={styles.rowText}>
                <span className={styles.rowLabel}>Icon and name</span>
                <span className={styles.rowDescription}>
                  Shown in the sidebar and on every issue in this team
                </span>
              </span>
              <span className={styles.rowControl}>
                <Icon name={team.icon} size={16} color={team.color} />
                <span className={styles.rowLabel}>{team.name}</span>
              </span>
            </SettingsCustomRow>
            <SettingsRow
              label="Identifier"
              description="Prefixes every issue in this team (e.g. TEAM-123)"
              control={<span className={styles.pillTag}>{team.key}</span>}
            />
            <SettingsRow
              label="Cycles"
              description="Fixed-length iterations for planning team work"
              control={
                <span className={styles.pillTag} data-tone={team.cyclesEnabled ? "on" : undefined}>
                  {team.cyclesEnabled ? "Enabled" : "Disabled"}
                </span>
              }
            />
            <SettingsRow
              label="Triage"
              description="Route incoming issues through a triage queue before the backlog"
              control={
                <span className={styles.pillTag} data-tone={team.triageEnabled ? "on" : undefined}>
                  {team.triageEnabled ? "Enabled" : "Disabled"}
                </span>
              }
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection
          id="team-statuses"
          title="Issue statuses"
          description={`${states.length} statuses across ${byCategory.length} categories, carrying ${issues.length} ${issues.length === 1 ? "issue" : "issues"}.`}
        >
          {byCategory.map((group) => (
            <SettingsCard key={group.category}>
              <SettingsCustomRow>
                <span className={styles.categoryTitle}>
                  {CATEGORY_LABEL[group.category]}
                </span>
              </SettingsCustomRow>
              {group.items.map((state) => {
                const count = issues.filter((issue) => issue.stateId === state.id).length;
                return (
                  <SettingsCustomRow key={state.id}>
                    <span className={styles.rowText}>
                      <span className={styles.rowLabel}>
                        <span
                          className={styles.dot}
                          style={{
                            background: state.color,
                            display: "inline-block",
                            marginRight: 8,
                            verticalAlign: -1,
                          }}
                          aria-hidden="true"
                        />
                        {state.name}
                      </span>
                      <span className={styles.rowDescription}>
                        {state.description ??
                          `${CATEGORY_LABEL[state.category]} category · position ${state.position + 1}`}
                      </span>
                    </span>
                    <span className={styles.rowControl}>
                      <span className={styles.count}>{count}</span>
                    </span>
                  </SettingsCustomRow>
                );
              })}
            </SettingsCard>
          ))}
        </SettingsSection>

        <SettingsSection
          id="team-projects"
          title="Projects"
          description="Projects this team contributes to."
        >
          <SettingsCard
            footer={
              <>
                <span className={styles.fieldHint}>
                  {projects.length} {projects.length === 1 ? "project" : "projects"}
                </span>
                <Link href={`/${workspace}/team/${team.key}/projects/all`}>
                  <Button variant="secondary" size={32}>
                    Open team projects
                  </Button>
                </Link>
              </>
            }
          >
            {projects.length === 0 ? (
              <SettingsEmptyRow>
                This team is not attached to any project yet.
              </SettingsEmptyRow>
            ) : (
              projects.map((project) => (
                <SettingsCustomRow key={project.id}>
                  <span className={styles.rowText}>
                    <span className={styles.rowLabel}>{project.name}</span>
                    <span className={styles.rowDescription}>
                      {project.summary ?? `Status: ${project.statusCategory}`}
                    </span>
                  </span>
                  <span className={styles.rowControl}>
                    <span className={styles.pillTag}>{project.statusCategory}</span>
                  </span>
                </SettingsCustomRow>
              ))
            )}
          </SettingsCard>
        </SettingsSection>
      </SettingsSections>
    </>
  );
});
