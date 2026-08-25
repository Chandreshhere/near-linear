"use client";

/**
 * Team-scoped goto sequences — MASTER_PROMPT.md §22 (`G V` cycles, `G T`
 * triage) registered against the §12 registry.
 *
 * Both jumps are relative to "the team you are looking at", so the host reads
 * the team out of the pathname rather than holding state: `/ws/team/KEY/…`
 * directly, and `/ws/issue/KEY-123/…` through the issue identifier (an issue
 * page is a team context too). Outside any team the sequence is not silently
 * swallowed — it says so with a toast.
 */

import { usePathname, useRouter } from "next/navigation";
import { useStore } from "@/lib/data/DataProvider";
import { useShortcut } from "@/lib/keyboard";
import { showToast } from "@/lib/toast";

/** `{workspace, teamKey}` for the route, or undefined outside a team. */
export function parseTeamContext(
  pathname: string,
): { workspace: string; teamKey: string } | undefined {
  const segments = pathname.split("/").filter((segment) => segment !== "");
  const workspace = segments[0];
  if (workspace === undefined) return undefined;

  // /:workspace/team/:key/…
  if (segments[1] === "team" && segments[2] !== undefined) {
    return { workspace, teamKey: segments[2] };
  }
  // /:workspace/issue/:identifier/… — "TRENDZO-37" carries the team key.
  if (segments[1] === "issue" && segments[2] !== undefined) {
    const identifier = decodeURIComponent(segments[2]);
    const dash = identifier.lastIndexOf("-");
    if (dash > 0) return { workspace, teamKey: identifier.slice(0, dash) };
  }
  return undefined;
}

export function TeamGotoShortcuts(): null {
  const pathname = usePathname();
  const router = useRouter();
  const store = useStore();

  /** Navigate to `suffix` under the current team, or explain why we can't. */
  const goTeam = (suffix: string, label: string): void => {
    const context = parseTeamContext(pathname);
    if (context === undefined) {
      showToast(`Open a team to go to ${label}`);
      return;
    }
    // Guard a key that looks like a team but isn't one (stale/typo'd URL).
    if (
      store.all("Team").length > 0 &&
      store.teamByKey(context.teamKey) === undefined
    ) {
      showToast(`Open a team to go to ${label}`);
      return;
    }
    router.push(`/${context.workspace}/team/${context.teamKey}/${suffix}`);
  };

  // No deps: the registry always reads the freshest handler off the ref, so
  // the closure over `pathname` stays current without re-registering.
  useShortcut({
    id: "goto.team-cycles",
    keys: "g v",
    scope: "global",
    description: "Go to Cycles",
    handler: () => goTeam("cycles", "Cycles"),
  });

  useShortcut({
    id: "goto.team-triage",
    keys: "g t",
    scope: "global",
    description: "Go to Triage",
    handler: () => goTeam("triage", "Triage"),
  });

  // Team issue tabs (§12): `G A` active, `G B` backlog. The tab is a query
  // param on the team issues route, so these reuse the same team resolution.
  useShortcut({
    id: "goto.team-active",
    keys: "g a",
    scope: "global",
    description: "Go to Active issues",
    handler: () => goTeam("all?tab=active", "Active issues"),
  });

  useShortcut({
    id: "goto.team-backlog",
    keys: "g b",
    scope: "global",
    description: "Go to Backlog",
    handler: () => goTeam("all?tab=backlog", "Backlog"),
  });

  /** Workspace-scoped jumps — always available, no team context needed. */
  const goWorkspace = (suffix: string): void => {
    const workspace = pathname.split("/").filter((s) => s !== "")[0];
    if (workspace === undefined) return;
    router.push(`/${workspace}/${suffix}`);
  };

  useShortcut({
    id: "goto.inbox",
    keys: "g i",
    scope: "global",
    description: "Go to Inbox",
    handler: () => goWorkspace("inbox"),
  });

  useShortcut({
    id: "goto.my-issues",
    keys: "g m",
    scope: "global",
    description: "Go to My Issues",
    handler: () => goWorkspace("my-issues/assigned"),
  });

  useShortcut({
    id: "goto.projects",
    keys: "g p",
    scope: "global",
    description: "Go to Projects",
    handler: () => goWorkspace("projects/all"),
  });

  useShortcut({
    id: "goto.views",
    keys: "g w",
    scope: "global",
    description: "Go to Views",
    handler: () => goWorkspace("views/issues"),
  });

  return null;
}
