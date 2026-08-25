"use client";

/**
 * Client boundary for `/:ws/team/:KEY/overview`. Mirrors the page.tsx +
 * *View.tsx pairing used by the other team routes.
 */

import { TeamHomeView } from "@/components/teams/TeamHomeView";

export function TeamHomeClient({
  workspace,
  teamKey,
}: {
  workspace: string;
  teamKey: string;
}) {
  return <TeamHomeView workspace={workspace} teamKey={teamKey} />;
}
