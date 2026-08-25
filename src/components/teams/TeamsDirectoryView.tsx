"use client";

/**
 * `/:ws/teams` — the workspace teams directory behind the sidebar's
 * More → Teams row (MASTER_PROMPT.md §5 popover, §10.6 team pages).
 *
 * Store-driven and real: every row is a Team row from the pool, the counts
 * are computed from the pool, "Create team" opens the SAME dialog the
 * sidebar's + button uses, and Join/Leave writes `Team.memberIds` through the
 * engine — which is exactly what the sidebar's "Your teams" section renders,
 * so leaving a team here removes it from the sidebar instantly.
 */

import type { JSX } from "react";
import Link from "next/link";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { Header } from "@/components/shell/Header";
import { useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";
import type { TeamData } from "@/lib/data/types";
import { isTeamMember, setTeamMembership } from "@/lib/workspace/teams";
import { openCreateTeamDialog } from "./CreateTeamDialog";
import styles from "@/components/workspace/directory.module.css";

/** "1 issue" / "3 issues" — used in the row's accessible name. */
function countLabel(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? "" : "s"}`;
}

export const TeamsDirectoryView = observer(function TeamsDirectoryView({
  workspace,
}: {
  workspace: string;
}): JSX.Element {
  const client = useSyncClient();
  const store = client.store;

  const teams = store
    .all("Team")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const memberCount = (team: TeamData): number =>
    team.memberIds === undefined ? store.all("User").length : team.memberIds.length;

  const menuFor = (team: TeamData): MenuItem[] => {
    const joined = isTeamMember(team, CURRENT_USER_ID);
    return [
      {
        label: "Team settings",
        href: `/${workspace}/settings/teams/${team.key}`,
      },
      { type: "separator" },
      joined
        ? {
            label: "Leave team",
            onSelect: () => {
              setTeamMembership(client, team, CURRENT_USER_ID, false);
              showToast(`Left ${team.name}`);
            },
          }
        : {
            label: "Join team",
            onSelect: () => {
              setTeamMembership(client, team, CURRENT_USER_ID, true);
              showToast(`Joined ${team.name}`);
            },
          },
    ];
  };

  return (
    <>
      <Header
        title="Teams"
        right={
          <Button variant="primary" size={28} onClick={openCreateTeamDialog}>
            Create team
          </Button>
        }
      />

      <div className={styles.scroller} tabIndex={0} data-scroll-container="true">
        <div className={styles.page}>
          <p className={styles.lead}>
            Every team in this workspace. A team owns its own issues, workflow
            statuses, projects and views; its identifier is the prefix of every
            issue it files.
          </p>

          <div className={styles.sectionTitle}>
            Teams <span className={styles.count}>{teams.length}</span>
          </div>

          {/* List semantics rather than a table: each row's cells live inside
              the row's <a>, which would break a table's owned-element chain. */}
          <div className={styles.table} role="list" aria-label="Workspace teams">
            <div className={styles.headRow} aria-hidden="true">
              <span className={styles.cellMain}>Name</span>
              <span className={styles.cellWide}>Identifier</span>
              <span className={styles.cellNum}>Members</span>
              <span className={styles.cellNum}>Issues</span>
              <span className={styles.menuSlot} />
            </div>

            {teams.map((team) => (
              <div className={styles.row} key={team.id} role="listitem">
                <Link
                  href={`/${workspace}/team/${team.key}/all`}
                  className={styles.rowLink}
                  aria-label={`${team.name} (${team.key}) — ${countLabel(memberCount(team), "member")}, ${countLabel(store.issuesForTeam(team.id).length, "issue")}`}
                >
                  <span className={styles.cellMain}>
                    <span className={styles.teamIcon}>
                      <Icon name={team.icon} size={16} color={team.color} />
                    </span>
                    <span className={styles.stack}>
                      <span className={styles.name}>{team.name}</span>
                      <span className={styles.sub}>
                        {isTeamMember(team, CURRENT_USER_ID)
                          ? "You are a member"
                          : "Not a member"}
                      </span>
                    </span>
                  </span>
                  <span className={styles.cellWide}>
                    <span className={styles.chip}>{team.key}</span>
                  </span>
                  <span className={styles.cellNum}>{memberCount(team)}</span>
                  <span className={styles.cellNum}>
                    {store.issuesForTeam(team.id).length}
                  </span>
                </Link>
                <span className={styles.menuSlot}>
                  <Menu
                    align="end"
                    items={menuFor(team)}
                    trigger={
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={`Team options: ${team.name}`}
                      >
                        <Icon name="More" size={14} />
                      </button>
                    }
                  />
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
});
