"use client";

/**
 * `/:ws/members` — the workspace member directory behind the sidebar's
 * More → Members row (MASTER_PROMPT.md §5 popover, §17.2 roles + invites).
 *
 * Everything on this page is store-backed and every action is a real
 * mutation through the local-first engine:
 *   · the member list is the User pool (avatar, name, email, role, joined)
 *   · "Invite people" writes a pending Invite row
 *   · "Change role" updates User.role
 *   · "Remove from workspace" deletes the User row, drops them from every
 *     team's member list and unassigns their issues (no orphan references)
 *
 * `?member=<id>` focuses one row: the command palette's Users group routes
 * here, so picking a person scrolls their row into view, rings it and moves
 * keyboard focus onto it (§13 — the directory is the member profile view).
 */

import { useEffect, useRef, useState, type JSX } from "react";
import { useSearchParams } from "next/navigation";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { Header } from "@/components/shell/Header";
import { useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";
import type { UserData, WorkspaceRole } from "@/lib/data/types";
import {
  ROLE_LABEL,
  ROLE_OPTIONS,
  openInviteDialog,
} from "./InvitePeopleDialog";
import styles from "@/components/workspace/directory.module.css";

/** "Jul 1, 2026" — the date idiom the rest of the app uses for absolute dates. */
function formatJoined(iso: string | undefined): string {
  if (iso === undefined) return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function roleOf(user: UserData): WorkspaceRole {
  return user.role ?? "member";
}

export const MembersView = observer(function MembersView(): JSX.Element {
  const client = useSyncClient();
  const store = client.store;
  const [removing, setRemoving] = useState<UserData | null>(null);

  // `?member=<id>` — the row the command palette asked us to focus.
  const searchParams = useSearchParams();
  const focusId = searchParams.get("member");
  const focusRef = useRef<HTMLDivElement>(null);
  const focusedFor = useRef<string | null>(null);

  useEffect(() => {
    if (focusId === null) {
      focusedFor.current = null;
      return;
    }
    // Once per id: the row is only scrolled to when the request changes, so
    // an unrelated re-render never yanks the page around.
    if (focusedFor.current === focusId) return;
    const el = focusRef.current;
    if (el === null) return; // pool still hydrating — the next render retries
    focusedFor.current = focusId;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  });

  const members = store
    .all("User")
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const invites = store
    .all("Invite")
    .filter((invite) => invite.status === "pending")
    .sort((a, b) => a.email.localeCompare(b.email));

  const changeRole = (user: UserData, role: WorkspaceRole): void => {
    if (roleOf(user) === role) return;
    client.queue.enqueue("update", "User", user.id, { role });
    showToast(`${user.displayName} is now ${ROLE_LABEL[role].toLowerCase()}`);
  };

  const removeMember = (user: UserData): void => {
    // Drop them from every team they belong to…
    for (const team of store.all("Team")) {
      if (team.memberIds !== undefined && team.memberIds.includes(user.id)) {
        client.queue.enqueue("update", "Team", team.id, {
          memberIds: team.memberIds.filter((id) => id !== user.id),
        });
      }
    }
    // …and unassign their issues, so no row points at a missing user.
    for (const issue of store.all("Issue")) {
      if (issue.assigneeId === user.id) {
        client.queue.enqueue("update", "Issue", issue.id, { assigneeId: null });
      }
    }
    client.queue.enqueue("delete", "User", user.id);
    setRemoving(null);
    showToast(`Removed ${user.displayName} from the workspace`);
  };

  const menuFor = (user: UserData): MenuItem[] => {
    const isSelf = user.id === CURRENT_USER_ID;
    return [
      {
        label: "Change role",
        submenu: ROLE_OPTIONS.map((option) => ({
          label: option.label,
          checked: roleOf(user) === option.value,
          onSelect: () => changeRole(user, option.value),
        })),
      },
      { type: "separator" },
      {
        label: isSelf ? "Remove from workspace (that's you)" : "Remove from workspace",
        disabled: isSelf,
        onSelect: () => setRemoving(user),
      },
    ];
  };

  const revokeInvite = (id: string, email: string): void => {
    client.queue.enqueue("delete", "Invite", id);
    showToast(`Revoked the invite for ${email}`);
  };

  return (
    <>
      <Header
        title="Members"
        right={
          <Button variant="primary" size={28} onClick={openInviteDialog}>
            Invite people
          </Button>
        }
      />

      <div className={styles.scroller} tabIndex={0} data-scroll-container="true">
        <div className={styles.page}>
          <p className={styles.lead}>
            Everyone with access to this workspace. Roles decide what a person
            can change: admins manage workspace settings, members work across
            the teams they join, guests only see the teams they are added to.
          </p>

          <div className={styles.sectionTitle}>
            Members <span className={styles.count}>{members.length}</span>
          </div>
          <div className={styles.table} role="table" aria-label="Workspace members">
            <div className={styles.headRow} role="row">
              <span className={styles.cellMain} role="columnheader">
                Name
              </span>
              <span className={styles.cellWide} role="columnheader">
                Role
              </span>
              <span className={styles.cellDate} role="columnheader">
                Joined
              </span>
              <span className={styles.menuSlot} aria-hidden="true" />
            </div>

            {members.map((user) => (
              <div
                className={styles.row}
                key={user.id}
                role="row"
                ref={user.id === focusId ? focusRef : undefined}
                tabIndex={user.id === focusId ? -1 : undefined}
                data-focused={user.id === focusId ? "true" : undefined}
              >
                <span className={styles.cellMain} role="cell">
                  <Avatar
                    initials={user.initials}
                    color={user.avatarColor}
                    size={24}
                    src={user.avatarUrl}
                  />
                  <span className={styles.stack}>
                    <span className={styles.name}>
                      {user.displayName}
                      {user.id === CURRENT_USER_ID ? (
                        <span className={styles.pill}>You</span>
                      ) : null}
                    </span>
                    <span className={styles.sub}>{user.email}</span>
                  </span>
                </span>
                <span className={styles.cellWide} role="cell">
                  <span className={styles.chip}>{ROLE_LABEL[roleOf(user)]}</span>
                </span>
                <span className={styles.cellDate} role="cell">
                  {formatJoined(user.joinedAt)}
                </span>
                <span className={styles.menuSlot}>
                  <Menu
                    align="end"
                    items={menuFor(user)}
                    trigger={
                      <button
                        type="button"
                        className={styles.iconBtn}
                        aria-label={`Member options: ${user.displayName}`}
                      >
                        <Icon name="More" size={14} />
                      </button>
                    }
                  />
                </span>
              </div>
            ))}
          </div>

          {invites.length > 0 ? (
            <>
              <div className={styles.sectionTitle}>
                Pending invites <span className={styles.count}>{invites.length}</span>
              </div>
              <div className={styles.table} role="table" aria-label="Pending invites">
                {invites.map((invite) => (
                  <div className={styles.row} key={invite.id} role="row">
                    <span className={styles.cellMain} role="cell">
                      <Avatar initials={invite.email.slice(0, 2).toUpperCase()} size={24} />
                      <span className={styles.stack}>
                        <span className={styles.name}>{invite.email}</span>
                        <span className={styles.sub}>
                          Invited by{" "}
                          {store.get("User", invite.invitedById)?.displayName ??
                            "a workspace admin"}
                        </span>
                      </span>
                    </span>
                    <span className={styles.cellWide} role="cell">
                      <span className={styles.chip}>{ROLE_LABEL[invite.role]}</span>
                    </span>
                    <span className={styles.cellDate} role="cell">
                      <span className={styles.chipPending}>Pending</span>
                    </span>
                    <span className={styles.menuSlot}>
                      <Menu
                        align="end"
                        items={[
                          {
                            label: "Revoke invite",
                            onSelect: () => revokeInvite(invite.id, invite.email),
                          },
                        ]}
                        trigger={
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label={`Invite options: ${invite.email}`}
                          >
                            <Icon name="More" size={14} />
                          </button>
                        }
                      />
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </div>

      <Dialog
        open={removing !== null}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
        width={440}
        label="Remove member"
      >
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>
            Remove {removing?.displayName ?? "member"}?
          </span>
        </div>
        <div className={styles.dialogBody}>
          <span className={styles.dialogSub}>
            {removing?.email} loses access to this workspace. They are dropped
            from every team and their assigned issues become unassigned. Issues
            and comments they created are kept.
          </span>
        </div>
        <div className={styles.dialogFooter}>
          <Button variant="secondary" size={32} onClick={() => setRemoving(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size={32}
            onClick={() => {
              if (removing !== null) removeMember(removing);
            }}
          >
            Remove
          </Button>
        </div>
      </Dialog>
    </>
  );
});
