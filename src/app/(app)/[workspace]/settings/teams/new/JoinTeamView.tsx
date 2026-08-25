"use client";

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import {
  NotConfiguredPanel,
  SettingsCard,
  SettingsCustomRow,
  SettingsPageHeader,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import { useStore } from "@/lib/data/DataProvider";
import styles from "@/components/settings/settings.module.css";

/**
 * Settings → Your teams → Join or create a team. The membership list is real
 * (read from the pool); creating or joining needs an admin-side backend, so
 * that action stays disabled rather than pretending.
 */
export const JoinTeamView = observer(function JoinTeamView({
  workspace,
}: {
  workspace: string;
}) {
  const store = useStore();
  const teams = store
    .all("Team")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <>
      <SettingsPageHeader
        title="Join or create a team"
        description="Teams own their own issues, statuses, cycles and projects."
      />

      <SettingsSections>
        <SettingsSection
          id="your-teams"
          title="Teams you belong to"
          description={`You are a member of ${teams.length} ${teams.length === 1 ? "team" : "teams"} in this workspace.`}
        >
          <SettingsCard>
            {teams.map((team) => (
              <SettingsCustomRow key={team.id}>
                <span className={styles.rowText}>
                  <span className={styles.rowLabel}>
                    <Icon
                      name={team.icon}
                      size={14}
                      color={team.color}
                      style={{ display: "inline-block", marginRight: 8, verticalAlign: -2 }}
                    />
                    {team.name}
                  </span>
                  <span className={styles.rowDescription}>
                    {store.issuesForTeam(team.id).length} issues ·{" "}
                    {store.statesForTeam(team.id).length} statuses
                  </span>
                </span>
                <span className={styles.rowControl}>
                  <Link
                    href={`/${workspace}/settings/teams/${team.key}`}
                    className={styles.pillTag}
                  >
                    {team.key}
                  </Link>
                </span>
              </SettingsCustomRow>
            ))}
          </SettingsCard>
        </SettingsSection>

        <SettingsSection id="new-team" title="Add a team">
          <NotConfiguredPanel
            glyph="plus"
            title="Creating a team needs an admin backend"
            body="A new team takes a name, a free identifier used as its issue prefix, and a starting set of workflow statuses; joining an existing one needs an invite from a member or an approved email domain. Both are admin-side operations with no server in this build."
            action="Create team"
          />
        </SettingsSection>
      </SettingsSections>
    </>
  );
});
