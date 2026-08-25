"use client";

/**
 * Workspace switcher dropdown — anchored to the sidebar workspace button
 * (MASTER_PROMPT.md §5 top row) and documented in
 * docs/analysis/research-nav-auth.md §1:
 *
 *   click the workspace name (top-left) → identity header (workspace + the
 *   account email that identifies the user across every workspace) → Settings ·
 *   Invite people · Switch workspace ▸ (current workspace with a check, then
 *   "Create or join a workspace") → Download desktop app · Log out.
 *
 * Keyboard: `O then W` opens it (research §1 "O then W switches workspaces"),
 * registered as "workspace.switch" in the central registry (§12) so the `?`
 * help window can render it.
 *
 * The trigger keeps its highlight while the menu is open (§6.2): the cloned
 * element carries `aria-expanded` (sidebar.module.css) and `data-menu-open`.
 */

import {
  cloneElement,
  useState,
  type CSSProperties,
  type JSX,
  type ReactElement,
} from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { Kbd } from "@/components/ui/Kbd";
import { CURRENT_USER_ID } from "@/components/issues/detail/constants";
import { openInviteDialog } from "@/components/members/InvitePeopleDialog";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { clearSession } from "@/lib/auth/session";
import { formatKeys, useShortcut } from "@/lib/keyboard";
import { showToast } from "@/lib/toast";
import {
  useKnownWorkspaces,
  workspaceDisplay,
  writeActiveWorkspace,
} from "@/lib/workspace/active";
import styles from "./workspacemenu.module.css";

const SWITCH_KEYS = "o w";

/** Rounded-square workspace tile (the sidebar avatar idiom, §5). */
function WorkspaceTile({
  initials,
  color,
  small = false,
}: {
  initials: string;
  color: string;
  small?: boolean;
}): JSX.Element {
  return (
    <span
      className={small ? `${styles.tile} ${styles.tileSmall}` : styles.tile}
      style={{ "--tile-bg": color } as CSSProperties}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

/** Check glyph for the current workspace (not in the sprite sheet). */
function GlyphCheck(): JSX.Element {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="currentColor" aria-hidden="true">
      <path d="M11.18 4.13a.66.66 0 0 1 0 .93l-4.37 4.37a.66.66 0 0 1-.93 0L3.7 7.25a.66.66 0 1 1 .93-.93l1.71 1.71 3.91-3.9a.66.66 0 0 1 .93 0Z" />
    </svg>
  );
}

/**
 * Placeholder for destinations that land in a later phase (auth §17, billing,
 * desktop builds). Answering with a toast keeps the menu honest instead of
 * pretending the row is dead.
 */
function todo(label: string): void {
  showToast(`${label} — not implemented yet`);
}

export const WorkspaceMenu = observer(function WorkspaceMenu({
  trigger,
}: {
  trigger: ReactElement;
}): JSX.Element {
  const [open, setOpen] = useState(false);
  const store = useStore();
  const client = useSyncClient();
  const router = useRouter();
  const { workspace } = useParams<{ workspace: string }>();

  /**
   * Log out for real: drop the session marker /login wrote, close the sync
   * client (delta stream + transaction queue timers) so nothing keeps running
   * behind the login screen, then leave the workspace. Local data stays in
   * IndexedDB — this is a sign-out, not a wipe; signing back in warm-starts.
   *
   * BACKEND SEAM (lib/auth/session.ts): POST /auth/logout, which the docs say
   * signs out every session of the account, not just this browser.
   */
  const logOut = (): void => {
    clearSession();
    client.dispose();
    router.push("/login");
  };

  // "O then W" (research §1). Registered globally so it also shows up in the
  // `?` help window; skipped while typing (allowInInput stays false).
  useShortcut({
    id: "workspace.switch",
    keys: SWITCH_KEYS,
    scope: "global",
    description: "Switch workspace",
    handler: () => setOpen(true),
  });

  /*
   * The switcher lists the workspaces THIS BROWSER actually has (each one a
   * real IndexedDB database it created), never an invented set. The current
   * one is always in the list even if the local index was cleared.
   */
  const known = useKnownWorkspaces();
  const storedName = store.all("Workspace")[0]?.name;
  const identity = workspaceDisplay(workspace, storedName);
  const others = known.filter((w) => w.slug !== workspace);
  const accountEmail = store.get("User", CURRENT_USER_ID)?.email ?? "";
  const settingsHref = `/${workspace}/settings/account/preferences`;

  /** Switching is a route change: each workspace owns its own SyncClient. */
  const switchTo = (slug: string): void => {
    writeActiveWorkspace(slug);
    setOpen(false);
    router.push(`/${slug}/agent`);
  };

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <DropdownMenu.Trigger asChild>
        {cloneElement(trigger as ReactElement<Record<string, unknown>>, {
          "aria-expanded": open,
          "data-menu-open": open ? "true" : undefined,
        })}
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          className={`${styles.content} ${styles.wide}`}
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          loop
        >
          <div className={styles.header}>
            <WorkspaceTile
              initials={identity.initials}
              color={identity.avatarColor}
            />
            <span className={styles.headerText}>
              <span className={styles.headerName}>{identity.name}</span>
              {accountEmail !== "" ? (
                <span className={styles.headerEmail}>{accountEmail}</span>
              ) : null}
            </span>
          </div>

          <DropdownMenu.Separator className={styles.separator} />

          {/* real <a href> — the browser status line shows the destination (§5) */}
          <DropdownMenu.Item className={styles.item} asChild>
            <Link href={settingsHref}>
              <span className={styles.label}>Settings</span>
            </Link>
          </DropdownMenu.Item>

          <DropdownMenu.Item
            className={styles.item}
            // rAF: let the menu's close-auto-focus run before the dialog traps
            // focus (the same ordering the help menu uses).
            onSelect={() => window.requestAnimationFrame(() => openInviteDialog())}
          >
            <span className={styles.label}>Invite people</span>
          </DropdownMenu.Item>

          <DropdownMenu.Sub>
            <DropdownMenu.SubTrigger className={styles.item}>
              <span className={styles.label}>Switch workspace</span>
              <span className={styles.keys}>
                {formatKeys(SWITCH_KEYS).map((chip, i) =>
                  chip === "then" ? (
                    <span key={i} className={styles.then}>
                      then
                    </span>
                  ) : (
                    <Kbd key={i} keys={[chip]} />
                  )
                )}
              </span>
              <Icon name="ChevronRight" size={14} className={styles.chevron} />
            </DropdownMenu.SubTrigger>
            <DropdownMenu.Portal>
              <DropdownMenu.SubContent
                className={styles.content}
                sideOffset={0}
                alignOffset={-4}
                collisionPadding={8}
              >
                <DropdownMenu.Item
                  className={styles.item}
                  onSelect={() => setOpen(false)}
                >
                  <WorkspaceTile
                    initials={identity.initials}
                    color={identity.avatarColor}
                    small
                  />
                  <span className={styles.label}>{identity.name}</span>
                  <span className={styles.check}>
                    <GlyphCheck />
                  </span>
                </DropdownMenu.Item>
                {others.map((entry) => {
                  const tile = workspaceDisplay(entry.slug, entry.name);
                  return (
                    <DropdownMenu.Item
                      key={entry.slug}
                      className={styles.item}
                      onSelect={() => switchTo(entry.slug)}
                    >
                      <WorkspaceTile
                        initials={tile.initials}
                        color={tile.avatarColor}
                        small
                      />
                      <span className={styles.label}>{tile.name}</span>
                    </DropdownMenu.Item>
                  );
                })}
                <DropdownMenu.Separator className={styles.separator} />
                {/* Real: routes back through the workspace-creation step,
                    which writes a new workspace + its default team. */}
                <DropdownMenu.Item
                  className={styles.item}
                  onSelect={() => {
                    setOpen(false);
                    router.push("/onboarding/workspace");
                  }}
                >
                  <span className={styles.label}>Create a workspace</span>
                </DropdownMenu.Item>
              </DropdownMenu.SubContent>
            </DropdownMenu.Portal>
          </DropdownMenu.Sub>

          <DropdownMenu.Separator className={styles.separator} />

          <DropdownMenu.Item
            className={styles.item}
            onSelect={() => todo("Download desktop app")}
          >
            <span className={styles.label}>Download desktop app</span>
          </DropdownMenu.Item>
          <DropdownMenu.Item className={styles.item} onSelect={logOut}>
            <span className={styles.label}>Log out</span>
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
});
