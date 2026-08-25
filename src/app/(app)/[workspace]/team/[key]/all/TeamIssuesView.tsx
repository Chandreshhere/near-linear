"use client";

/**
 * Team Issues page body (`/team/:KEY/all`) — MASTER_PROMPT.md §10.6:
 * breadcrumb "Team › Issues" + star, pill tabs Active | Backlog | All issues,
 * toolbar (filter · display options · insights · layout toggle), grouped
 * list or board. Layout toggles list↔board on mod+b (§12) and persists via
 * the view preference. The tab lives in the URL (?tab=), so it is
 * deep-linkable and reachable from the `G A` / `G B` goto sequences (§12);
 * default "all" (f0033).
 *
 * Insights (§11.3) is the FLOATING FacetPanel overlay: it never resizes the
 * list — the toggle's open state persists per viewKey in localStorage.
 */

import { Suspense } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { useViewPreference } from "@/lib/issues/viewPrefs";
import { useShortcut } from "@/lib/keyboard";
import { Header } from "@/components/shell/Header";
import { IconButton } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Icon } from "@/components/icons/Icon";
import { IssueList, type IssuesTab } from "@/components/issues/IssueList";
import { AddFilterButton, FilterBar } from "@/components/issues/FilterBar";
import { DisplayOptionsButton } from "@/components/issues/DisplayOptions";
import { Board } from "@/components/issues/board/Board";
import { FacetPanel } from "@/components/panels/FacetPanel";
import { insightsKey, usePersistedFlag } from "@/lib/projects/localPrefs";
import shellStyles from "@/components/shell/shell.module.css";
import styles from "@/components/issues/issuelist.module.css";

const TABS: { id: IssuesTab; label: string }[] = [
  { id: "active", label: "Active" },
  { id: "backlog", label: "Backlog" },
  { id: "all", label: "All issues" },
];

export const TeamIssuesView = observer(function TeamIssuesView({
  workspace,
  teamKey,
}: {
  workspace: string;
  teamKey: string;
}) {
  void workspace; // row links resolve the workspace from route params
  const store = useStore();
  const client = useSyncClient();

  // Tab in the URL: shareable, restored on back/forward, and the target of
  // the `G A` / `G B` sequences. Unknown values fall back to "all".
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const tab: IssuesTab =
    requested === "active" || requested === "backlog" ? requested : "all";
  const setTab = (next: IssuesTab): void => {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") params.delete("tab");
    else params.set("tab", next);
    const query = params.toString();
    router.replace(query === "" ? pathname : `${pathname}?${query}`, {
      scroll: false,
    });
  };

  // Canonical view key (ViewPreferenceData doc example: "team/TRENDZO/all").
  const viewKey = `team/${teamKey.toUpperCase()}/all`;
  const { pref, update } = useViewPreference(viewKey);
  const [insightsOpen, , toggleInsights] = usePersistedFlag(insightsKey(viewKey));

  // Undefined-safe while the pool boots — header renders a skeleton crumb.
  const team = store.teamByKey(teamKey);
  const notFound = team === undefined && client.status === "ready";

  const toggleLayout = (): void => {
    update({ layout: pref.layout === "board" ? "list" : "board" });
  };

  useShortcut({
    id: `team-issues:${viewKey}:layout-toggle`,
    keys: "mod+b",
    description: "Toggle list or board layout",
    handler: toggleLayout,
  });

  const breadcrumb = (
    <div className={styles.crumbs}>
      {team !== undefined ? (
        <span className={styles.crumbTeam}>{team.name}</span>
      ) : (
        <span className={styles.crumbSkeleton} aria-hidden="true" />
      )}
      <span className={styles.crumbSep}>›</span>
      <span className={styles.crumbCurrent}>Issues</span>
      <IconButton label="Add to favorites" size={28}>
        <Icon name="Favorite" size={14} />
      </IconButton>
    </div>
  );

  const tabsRow = (
    <>
      <div className={shellStyles.tabStrip}>
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={shellStyles.tab}
            data-active={tab === id ? "true" : undefined}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
      </div>
      <span className={shellStyles.headerSpacer} />
      {/* Filters live in `?filter=` (useSearchParams), so the funnel and the
          chip row each sit under their own Suspense boundary — the fallback
          holds the toolbar's geometry rather than collapsing it. */}
      <Suspense
        fallback={
          <IconButton label="Filter" disabled>
            <Icon name="Filter" size={14} />
          </IconButton>
        }
      >
        <AddFilterButton viewKey={viewKey} />
      </Suspense>
      <DisplayOptionsButton viewKey={viewKey} />
      <IconButton
        label={insightsOpen ? "Close insights" : "Open insights"}
        data-state={insightsOpen ? "active" : "inactive"}
        data-active={insightsOpen ? "true" : undefined}
        aria-pressed={insightsOpen}
        onClick={toggleInsights}
      >
        <Icon name="Insights" size={14} />
      </IconButton>
      <IconButton
        label={
          pref.layout === "board"
            ? "Switch to list layout"
            : "Switch to board layout"
        }
        onClick={toggleLayout}
      >
        <Icon name="SidePanel" size={14} />
      </IconButton>
    </>
  );

  return (
    <>
      <Header
        left={breadcrumb}
        right={
          <IconButton label="Subscribe">
            <Icon name="Subscribe" size={14} />
          </IconButton>
        }
        tabs={tabsRow}
      />
      {/* Chip row sits between the header and the list; it renders nothing
          until a filter exists, so the unfiltered view is unchanged. */}
      <Suspense fallback={null}>
        <FilterBar viewKey={viewKey} />
      </Suspense>
      <div className={styles.listArea}>
        {team === undefined ? (
          notFound ? (
            <EmptyState heading="Team not found">
              No team with the key “{teamKey.toUpperCase()}” exists in this
              workspace.
            </EmptyState>
          ) : null
        ) : pref.layout === "board" ? (
          <div className={styles.boardArea}>
            <Board teamId={team.id} viewKey={viewKey} />
          </div>
        ) : (
          <div
            className={shellStyles.contentScroller}
            tabIndex={0}
            data-scroll-container="true"
          >
            {/* IssueList reads the same `?filter=` state to narrow the set. */}
            <Suspense fallback={null}>
              <IssueList teamId={team.id} viewKey={viewKey} tab={tab} />
            </Suspense>
          </div>
        )}
      </div>
      {/* §11.3: the insights panel FLOATS over the list (absolute against
          the content card) — the list keeps its full width underneath. */}
      {team !== undefined ? (
        <Suspense fallback={null}>
          <FacetPanel
            viewKey={viewKey}
            scope={{ kind: "team", teamId: team.id }}
            open={insightsOpen}
          />
        </Suspense>
      ) : null}
    </>
  );
});
