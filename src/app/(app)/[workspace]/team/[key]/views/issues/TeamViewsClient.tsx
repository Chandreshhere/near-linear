"use client";

/**
 * Client boundary for `/:ws/team/:KEY/views/issues` — mirrors ViewsClient for
 * the workspace page. The Suspense boundary covers the `⌥ V` shortcut's
 * useSearchParams() read inside ViewsPage.
 */

import { Suspense } from "react";
import { ViewsPage } from "@/components/nav/ViewsPage";

export function TeamViewsClient({
  workspace,
  teamKey,
}: {
  workspace: string;
  teamKey: string;
}) {
  return (
    <Suspense fallback={null}>
      <ViewsPage workspace={workspace} tab="issues" teamKey={teamKey} />
    </Suspense>
  );
}
