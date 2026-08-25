"use client";

/**
 * The sidebar's "Your teams" + button (MASTER_PROMPT.md §5 — "+ hover 'Join a
 * team' button"). Anchored under the + like every other menu:
 *
 *   Create new team…
 *   ───────────────
 *   <workspace tile> Marketing        ← teams in this workspace you are NOT in
 *   <workspace tile> Support
 *
 * Both rows are real: "Create new team…" opens the create dialog (which writes
 * the team + its six workflow states through the engine) and picking a team
 * joins it by adding you to `Team.memberIds` — the same field the sidebar's
 * team list reads, so the row appears there immediately.
 */

import type { JSX, ReactElement } from "react";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { openCreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";
import { workspaceDisplay } from "@/lib/workspace/active";
import { isTeamMember, setTeamMembership } from "@/lib/workspace/teams";
import styles from "./jointeam.module.css";

/** 16px rounded workspace tile — the avatar idiom of the sidebar top row. */
function WorkspaceTile({ slug, name }: { slug: string; name?: string }): JSX.Element {
  const identity = workspaceDisplay(slug, name);
  return (
    <span
      className={styles.tile}
      style={{ background: identity.avatarColor }}
      aria-hidden="true"
    >
      {identity.initials}
    </span>
  );
}

export const JoinTeamMenu = observer(function JoinTeamMenu({
  trigger,
  workspace,
}: {
  trigger: ReactElement;
  workspace: string;
}): JSX.Element {
  const client = useSyncClient();
  const router = useRouter();
  const workspaceName = client.store.all("Workspace")[0]?.name;

  const joinable = client.store
    .all("Team")
    .filter((team) => !isTeamMember(team, CURRENT_USER_ID))
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const items: MenuItem[] = [
    {
      label: "Create new team…",
      onSelect: () => openCreateTeamDialog(),
    },
  ];

  if (joinable.length > 0) {
    items.push({ type: "separator" });
    for (const team of joinable) {
      items.push({
        label: team.name,
        icon: <WorkspaceTile slug={workspace} name={workspaceName} />,
        onSelect: () => {
          setTeamMembership(client, team, CURRENT_USER_ID, true);
          showToast(`Joined ${team.name}`);
          router.push(`/${workspace}/team/${team.key}/all`);
        },
      });
    }
  }

  return <Menu trigger={trigger} items={items} align="start" side="bottom" />;
});
