"use client";

/**
 * Project-overview insights panel — MASTER_PROMPT.md §10.2 ("Open project
 * insights"). Docked (it resizes the content area, §6.10) and computed live
 * from the MobX pool.
 *
 * The projects LIST pages (workspace + team) used to host a docked
 * `ProjectsInsightsRail` here too; that surface is now the shared floating
 * overlay in components/panels/FacetPanel.tsx (§11.3 facet stage), which
 * owns the Health | Teams | Leads facets and the filter-chip wiring.
 */

import * as React from "react";
import Link from "next/link";
import { observer } from "mobx-react-lite";
import { useStore } from "@/lib/data/DataProvider";
import { CATEGORY_ORDER } from "@/lib/data/store";
import type { StateCategory } from "@/lib/data/types";
import { MilestoneDiamond } from "@/components/projects/glyphs";
import css from "./insights.module.css";

/* ================================================================
 * Shared row
 * ================================================================ */

interface Facet {
  key: string;
  label: string;
  count: number;
  icon?: React.ReactNode;
}

function FacetRow({
  facet,
  total,
  onSelect,
}: {
  facet: Facet;
  total: number;
  onSelect?: () => void;
}) {
  const share = total === 0 ? 0 : Math.round((facet.count / total) * 100);
  const content = (
    <>
      <span className={css.facetIcon} aria-hidden="true">
        {facet.icon}
      </span>
      <span className={css.facetLabel}>{facet.label}</span>
      <span className={css.facetDash} aria-hidden="true">
        —
      </span>
      <span className={css.facetCount}>{facet.count}</span>
      <span className={css.facetBar} aria-hidden="true">
        <span className={css.facetBarFill} style={{ width: `${share}%` }} />
      </span>
    </>
  );

  if (onSelect === undefined) {
    return <div className={css.facetRow}>{content}</div>;
  }
  return (
    <button
      type="button"
      className={css.facetRow}
      aria-label={`${facet.label} — ${facet.count}. Filter by this.`}
      onClick={onSelect}
    >
      {content}
    </button>
  );
}

/* ================================================================
 * Project overview insights panel
 * ================================================================ */

const CATEGORY_LABEL: Record<StateCategory, string> = {
  triage: "Triage",
  backlog: "Backlog",
  unstarted: "Todo",
  started: "In Progress",
  completed: "Done",
  canceled: "Canceled",
};

/** Local-calendar day difference (target − today), date-only ISO safe. */
function daysUntil(iso: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (match === null) return null;
  const target = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - today.getTime()) / 86_400_000);
}

export const ProjectInsightsPanel = observer(function ProjectInsightsPanel({
  projectId,
  open,
  issuesHref,
}: {
  projectId: string;
  open: boolean;
  /** Base link to the project's issues tab (rows deep-link into it). */
  issuesHref: string;
}) {
  const store = useStore();
  const project = store.get("Project", projectId);
  const issues = store.issuesForProject(projectId);
  const milestones = store.milestonesForProject(projectId);

  const byCategory = new Map<StateCategory, number>();
  for (const issue of issues) {
    const category = store.get("WorkflowState", issue.stateId)?.category;
    if (category === undefined) continue;
    byCategory.set(category, (byCategory.get(category) ?? 0) + 1);
  }
  const completed = byCategory.get("completed") ?? 0;
  const percent = issues.length === 0 ? 0 : Math.round((completed / issues.length) * 100);

  const remaining = project?.targetDate !== undefined ? daysUntil(project.targetDate) : null;
  const open_ = issues.length - completed - (byCategory.get("canceled") ?? 0);

  let risk: string;
  if (project?.targetDate === undefined) {
    risk = "No target date set — scope has no deadline to miss.";
  } else if (remaining === null) {
    risk = "Target date unreadable.";
  } else if (remaining < 0) {
    risk = `Overdue by ${Math.abs(remaining)} day${Math.abs(remaining) === 1 ? "" : "s"} with ${open_} issue${open_ === 1 ? "" : "s"} still open.`;
  } else if (open_ === 0) {
    risk = `${remaining} day${remaining === 1 ? "" : "s"} left and nothing open — on track.`;
  } else {
    const perDay = remaining === 0 ? open_ : open_ / remaining;
    risk =
      perDay > 1
        ? `At risk: ${open_} open issue${open_ === 1 ? "" : "s"} in ${remaining} day${remaining === 1 ? "" : "s"} (${perDay.toFixed(1)}/day).`
        : `${open_} open issue${open_ === 1 ? "" : "s"} across ${remaining} day${remaining === 1 ? "" : "s"} — comfortable.`;
  }

  return (
    <div className={css.rail} data-open={open ? "true" : "false"} aria-hidden={!open}>
      <aside className={css.railInner} aria-label="Project insights" inert={!open}>
        <div className={css.metricRow}>
          <div className={css.metric}>
            <span className={css.metricValue}>{issues.length}</span>
            <span className={css.metricLabel}>Issues</span>
          </div>
          <div className={css.metric}>
            <span className={css.metricValue}>{percent}%</span>
            <span className={css.metricLabel}>Complete</span>
          </div>
          <div className={css.metric}>
            <span className={css.metricValue}>{milestones.length}</span>
            <span className={css.metricLabel}>Milestones</span>
          </div>
        </div>

        <div className={css.sectionTitle}>Issues by status</div>
        <div className={css.facetList}>
          {CATEGORY_ORDER.filter((category) => (byCategory.get(category) ?? 0) > 0).map(
            (category) => (
              <FacetRow
                key={category}
                facet={{
                  key: category,
                  label: CATEGORY_LABEL[category],
                  count: byCategory.get(category) ?? 0,
                }}
                total={issues.length}
              />
            ),
          )}
          {issues.length === 0 ? (
            <div className={css.empty}>No issues in this project yet</div>
          ) : null}
        </div>

        <div className={css.sectionTitle}>Milestone completion</div>
        <div className={css.facetList}>
          {milestones.length === 0 ? (
            <div className={css.empty}>No milestones yet</div>
          ) : (
            milestones.map((milestone) => {
              const scoped = issues.filter((issue) => issue.milestoneId === milestone.id);
              const done = scoped.filter(
                (issue) =>
                  store.get("WorkflowState", issue.stateId)?.category === "completed",
              ).length;
              const share = scoped.length === 0 ? 0 : Math.round((done / scoped.length) * 100);
              return (
                <Link
                  key={milestone.id}
                  className={css.milestoneRow}
                  href={`${issuesHref}?projectMilestoneId=${milestone.id}`}
                >
                  <span className={css.facetIcon} aria-hidden="true">
                    <MilestoneDiamond size={14} filled={share === 100 && scoped.length > 0} />
                  </span>
                  <span className={css.facetLabel} title={milestone.name}>
                    {milestone.name}
                  </span>
                  <span className={css.facetCount}>
                    {share}% of {scoped.length}
                  </span>
                </Link>
              );
            })
          )}
        </div>

        <div className={css.sectionTitle}>Target date risk</div>
        <p className={css.riskCopy}>{risk}</p>
      </aside>
    </div>
  );
});
