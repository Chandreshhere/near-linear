/**
 * Triage visibility rule — MASTER_PROMPT.md §22.
 *
 * A team's Triage state is an INBOX, not a workflow column: issues arriving
 * from integrations and non-members sit there until somebody accepts (`1`),
 * duplicates (`2`) or declines (`3`) them. Until that happens they must not
 * appear anywhere a normal issue surface counts or lists work — Active /
 * Backlog / All issues, board columns, My Issues, project issue lists or the
 * facet-panel tallies.
 *
 * Every one of those surfaces filters through the helpers here, so the rule
 * lives in one place instead of being re-derived per file. The Triage state
 * itself stays visible where choosing it is the point: the triage inbox, and
 * the status picker (moving an issue back to triage is a deliberate act).
 */

import type { SyncStore } from "@/lib/data/store";
import type { IssueData, WorkflowStateData } from "@/lib/data/types";

/** Whether a workflow state is the team's triage inbox state. */
export function isTriageState(state: WorkflowStateData | undefined): boolean {
  return state?.category === "triage";
}

/** Workflow states a normal issue surface may show as a group or column. */
export function withoutTriageStates(
  states: readonly WorkflowStateData[],
): WorkflowStateData[] {
  return states.filter((state) => !isTriageState(state));
}

/** Issues a normal issue surface may list — triage arrivals stay in the inbox. */
export function withoutTriageIssues(
  issues: readonly IssueData[],
  store: SyncStore,
): IssueData[] {
  return issues.filter(
    (issue) => !isTriageState(store.get("WorkflowState", issue.stateId)),
  );
}
