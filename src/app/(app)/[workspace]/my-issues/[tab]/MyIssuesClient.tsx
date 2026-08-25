"use client";

/**
 * Client boundary for `/:ws/my-issues/:tab`. The tab contract lives in the
 * view module (a "use client" module, so the server component page cannot
 * call its guard) — validating here keeps one source of truth for the tab
 * list instead of duplicating it in the route. Unknown segments fall back to
 * "assigned" rather than 404ing (§10.5).
 */

import {
  MyIssuesView,
  isMyIssuesTab,
  type MyIssuesTab,
} from "@/components/issues/MyIssuesView";

export function MyIssuesClient({
  workspace,
  tab,
}: {
  workspace: string;
  tab: string;
}) {
  const resolved: MyIssuesTab = isMyIssuesTab(tab) ? tab : "assigned";
  return <MyIssuesView workspace={workspace} tab={resolved} />;
}
