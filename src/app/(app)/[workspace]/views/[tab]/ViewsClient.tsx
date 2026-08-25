"use client";

/**
 * Client boundary for `/:ws/views/:tab`. The tab contract lives in the view
 * module (a "use client" module, so the server page cannot call its guard) —
 * validating here keeps one source of truth for the tab list instead of
 * duplicating it in the route. Unknown segments fall back to "issues" rather
 * than 404ing, matching `/my-issues/:tab` (§10.5/§10.7).
 *
 * The <Suspense> boundary covers the `⌥ V` shortcut's useSearchParams() read
 * inside ViewsPage; it is declared here as well so the route stays safe if
 * the page later reads the query string at its top level.
 */

import { Suspense } from "react";
import { ViewsPage, isViewsTab, type ViewsTab } from "@/components/nav/ViewsPage";

export function ViewsClient({
  workspace,
  tab,
}: {
  workspace: string;
  tab: string;
}) {
  const resolved: ViewsTab = isViewsTab(tab) ? tab : "issues";
  return (
    <Suspense fallback={null}>
      <ViewsPage workspace={workspace} tab={resolved} />
    </Suspense>
  );
}
