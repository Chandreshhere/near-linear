/**
 * Workspace creation — the very first write a new account makes.
 *
 * MASTER_PROMPT.md §17.2: "creating a workspace auto-creates a first team named
 * after it, with its own identifier and the six default workflow statuses."
 * That team + status set is built by `createTeam` in ./teams.ts — the SAME
 * helper the sidebar's "Create new team…" dialog calls, so a workspace's first
 * team and its fifth are indistinguishable rows.
 *
 * Everything here goes through the local-first engine's transaction queue, so
 * a new workspace is optimistically applied to the MobX pool, persisted to its
 * own IndexedDB database (`linear_recon_<slug>`) and broadcast to other tabs
 * exactly like any other mutation. Nothing is hardcoded and nothing is seeded:
 * a fresh browser starts with an EMPTY workspace the user builds themselves.
 *
 * ── BACKEND SEAM ─────────────────────────────────────────────────────────
 * `POST /workspaces { name, slug }` → the server allocates the slug (the only
 * genuinely global uniqueness check), creates the owner membership and returns
 * the workspace + default team. Until then the slug is unique per browser.
 */

import { SyncClient } from "@/lib/data/SyncClient";
import type { SyncStore } from "@/lib/data/store";
import type {
  TeamData,
  UserData,
  UserSettingsData,
  WorkspaceData,
} from "@/lib/data/types";
import { readSession } from "@/lib/auth/session";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { initialsFor } from "@/lib/auth/profile";
import {
  TEAM_COLOR_CHOICES,
  TEAM_ICON_CHOICES,
  createTeam,
  deriveWorkspaceTeamKey,
  newId,
} from "@/lib/workspace/teams";
import {
  rememberWorkspace,
  workspaceColor,
  type WorkspaceRef,
} from "@/lib/workspace/active";

export interface NewWorkspaceInput {
  name: string;
  slug: string;
}

export interface ProvisionedWorkspace extends WorkspaceRef {
  /** Identifier of the auto-created first team ("Acme Labs" → "ACM"). */
  teamKey: string;
  /** Route to land on once onboarding finishes. */
  homeHref: string;
}

/** The signed-in identity, defaulted from the login email when there is one. */
function currentUserRow(): UserData {
  const email = readSession()?.email ?? "";
  const handle = email.includes("@") ? (email.split("@")[0] ?? "") : "";
  const name = handle !== "" ? handle : "You";
  return {
    id: CURRENT_USER_ID,
    email,
    name,
    displayName: name,
    initials: initialsFor(name),
    avatarColor: workspaceColor(CURRENT_USER_ID),
    // Whoever creates the workspace owns it (§17.2).
    role: "admin",
    joinedAt: new Date().toISOString(),
  };
}

/** Preferences defaults (§10.9) — identical to the ones fixtures ship. */
function defaultUserSettings(): UserSettingsData {
  return {
    id: CURRENT_USER_ID,
    homeView: "agent",
    theme: "dark",
    firstDayOfWeek: "Monday",
    displayFullNames: true,
    convertEmoticons: true,
    commentSubmitKey: "Enter",
    fontSize: "default",
    pointerCursor: false,
    underlineLinks: false,
    disableAnimations: false,
    openInDesktop: false,
    autoAssignSelf: false,
    assignOnStart: false,
  };
}

/** True when this database already holds a workspace (re-entry / back button). */
export function hasWorkspaceRows(store: SyncStore): boolean {
  return store.all("Workspace").length > 0;
}

/**
 * Create the workspace, its owner, their preferences and the default team
 * (with its six workflow states) in ONE batch — one MutationRequest, one
 * optimistic apply, one durable write.
 *
 * Idempotent: pointing it at a slug that already has a Workspace row returns
 * that workspace untouched, so a double submit or a re-visited onboarding step
 * can never fork a second workspace into the same database.
 */
export async function provisionWorkspace(
  input: NewWorkspaceInput,
): Promise<ProvisionedWorkspace> {
  const slug = input.slug.trim();
  const name = input.name.trim();

  const client = SyncClient.get(slug);
  await client.start();

  const existing = client.store.all("Workspace")[0];
  if (existing !== undefined) {
    const team = client.store.all("Team").sort((a, b) => a.sortOrder - b.sortOrder)[0];
    const ref: WorkspaceRef = { slug, name: existing.name };
    rememberWorkspace(ref);
    return {
      ...ref,
      teamKey: team?.key ?? "",
      homeHref: `/${slug}/agent`,
    };
  }

  const workspace: WorkspaceData = {
    id: newId("ws"),
    slug,
    name,
    createdAt: new Date().toISOString(),
  };
  client.queue.enqueue(
    "create",
    "Workspace",
    workspace.id,
    workspace as unknown as Record<string, unknown>,
  );

  if (client.store.get("User", CURRENT_USER_ID) === undefined) {
    const user = currentUserRow();
    client.queue.enqueue(
      "create",
      "User",
      user.id,
      user as unknown as Record<string, unknown>,
    );
  }
  if (client.store.get("UserSettings", CURRENT_USER_ID) === undefined) {
    const settings = defaultUserSettings();
    client.queue.enqueue(
      "create",
      "UserSettings",
      settings.id,
      settings as unknown as Record<string, unknown>,
    );
  }

  // §17.2 — the workspace's own first team, built by the shared helper.
  const team: TeamData = createTeam(
    client,
    {
      name,
      key: deriveWorkspaceTeamKey(name),
      icon: TEAM_ICON_CHOICES[0],
      color: TEAM_COLOR_CHOICES[0],
    },
    CURRENT_USER_ID,
  );

  // Wait for the batch to land so the next route already sees real rows.
  await client.queue.flush();

  const ref: WorkspaceRef = { slug, name };
  rememberWorkspace(ref);
  return { ...ref, teamKey: team.key, homeHref: `/${slug}/agent` };
}
