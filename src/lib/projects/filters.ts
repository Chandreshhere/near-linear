"use client";

/**
 * Project filter model — MASTER_PROMPT.md §11.2 applied to the projects
 * surface (§10.1 "Add filter").
 *
 * Everything structural is REUSED from lib/issues/filters.ts: the chip shape
 * (`FilterOf<P>`), the operator vocabulary, the `property:operator:v1,v2`
 * URL codec (`serializeFilters` / `parseFiltersWith`) and the URL-is-the-
 * state hook (`useFiltersOf`). Only the property vocabulary and the
 * evaluator are project-specific — the issue union stays untouched, so
 * issue filtering cannot regress.
 *
 *     ?filter=status:isAnyOf:started,planned;health:is:noUpdate
 */

import {
  OPERATOR_LABEL,
  serializeFilters,
  useFiltersOf,
  type FilterOf,
  type FilterOperator,
  type FiltersApiOf,
  type FilterValueOption,
} from "@/lib/issues/filters";
import type { SyncStore } from "@/lib/data/store";
import type { ProjectData } from "@/lib/data/types";
import { PROJECT_HEALTH_LABEL, PROJECT_PRIORITY_LABEL, PROJECT_STATUS_LABEL } from "./viewPrefs";

/* ================================================================
 * Shape
 * ================================================================ */

export type ProjectFilterProperty = "status" | "health" | "priority" | "lead" | "team";

export type ProjectFilter = FilterOf<ProjectFilterProperty>;
export type ProjectFiltersApi = FiltersApiOf<ProjectFilterProperty>;

export const PROJECT_PROPERTY_LABEL: Record<ProjectFilterProperty, string> = {
  status: "Status",
  health: "Health",
  priority: "Priority",
  lead: "Lead",
  team: "Team",
};

/** Sentinel for "no lead" / "no team" (projects store the field as absent). */
export const NO_VALUE = "none";

const PROJECT_PROPERTY_SET: ReadonlySet<string> = new Set(
  Object.keys(PROJECT_PROPERTY_LABEL),
);

/** Module-level guard: a stable identity keeps `useFiltersOf`'s memo stable. */
export function isProjectFilterProperty(value: string): value is ProjectFilterProperty {
  return PROJECT_PROPERTY_SET.has(value);
}

/** Every project property is id-valued, so the id operator set applies. */
const PROJECT_OPERATORS: FilterOperator[] = ["is", "isNot", "isAnyOf", "isNoneOf"];

export function projectOperatorsFor(_property: ProjectFilterProperty): FilterOperator[] {
  void _property;
  return PROJECT_OPERATORS;
}

export { OPERATOR_LABEL };

export function defaultProjectOperator(valueCount: number): FilterOperator {
  return valueCount > 1 ? "isAnyOf" : "is";
}

/** §11.2 auto-switch on multi-value (is ⇄ is any of, is not ⇄ is none of). */
export function autoSwitchProjectOperator(
  operator: FilterOperator,
  valueCount: number,
): FilterOperator {
  const multi = valueCount > 1;
  if (operator === "is" && multi) return "isAnyOf";
  if (operator === "isNot" && multi) return "isNoneOf";
  if (operator === "isAnyOf" && !multi) return "is";
  if (operator === "isNoneOf" && !multi) return "isNot";
  return operator;
}

/* ================================================================
 * Value vocabularies (store-backed, still pure)
 * ================================================================ */

const STATUS_ORDER = ["backlog", "planned", "started", "completed", "canceled"];
const HEALTH_ORDER = ["onTrack", "atRisk", "offTrack", "noUpdate"];
const PRIORITY_ORDER = [1, 2, 3, 4, 0];

/** The selectable values of one property, in menu order (reads the pool). */
export function projectFilterValueOptions(
  property: ProjectFilterProperty,
  store: SyncStore,
): FilterValueOption[] {
  switch (property) {
    case "status":
      return STATUS_ORDER.map((id) => ({ id, label: PROJECT_STATUS_LABEL[id] ?? id }));
    case "health":
      return HEALTH_ORDER.map((id) => ({ id, label: PROJECT_HEALTH_LABEL[id] ?? id }));
    case "priority":
      return PRIORITY_ORDER.map((value) => ({
        id: String(value),
        label: PROJECT_PRIORITY_LABEL[value] ?? String(value),
      }));
    case "lead":
      return [
        { id: NO_VALUE, label: "No lead" },
        ...store
          .all("User")
          .sort((a, b) => a.displayName.localeCompare(b.displayName))
          .map((user) => ({ id: user.id, label: user.displayName })),
      ];
    case "team":
      return [
        { id: NO_VALUE, label: "No team" },
        ...store
          .all("Team")
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((team) => ({ id: team.id, label: team.name })),
      ];
  }
}

/** Human label for one stored value — chip summary + checklist rows. */
export function projectFilterValueLabel(
  property: ProjectFilterProperty,
  value: string,
  store: SyncStore,
): string {
  switch (property) {
    case "status":
      return PROJECT_STATUS_LABEL[value] ?? value;
    case "health":
      return PROJECT_HEALTH_LABEL[value] ?? value;
    case "priority":
      return PROJECT_PRIORITY_LABEL[Number(value)] ?? value;
    case "lead":
      return value === NO_VALUE
        ? "No lead"
        : (store.get("User", value)?.displayName ?? value);
    case "team":
      return value === NO_VALUE
        ? "No team"
        : (store.get("Team", value)?.name ?? store.teamByKey(value)?.name ?? value);
  }
}

/* ================================================================
 * Evaluation (pure)
 * ================================================================ */

function matchScalar(operator: FilterOperator, values: string[], actual: string): boolean {
  switch (operator) {
    case "isNot":
    case "isNoneOf":
      return !values.includes(actual);
    case "before":
    case "after":
      // Ordering operators are meaningless on ids — inert rather than empty.
      return true;
    default:
      return values.includes(actual);
  }
}

/** Teams are many-valued on a project: "is" means "is one of the project's". */
function matchTeams(
  operator: FilterOperator,
  values: string[],
  teamIds: readonly string[],
): boolean {
  const held = teamIds.length > 0 ? new Set(teamIds) : new Set([NO_VALUE]);
  switch (operator) {
    case "isNot":
    case "isNoneOf":
      return !values.some((value) => held.has(value));
    default:
      return values.some((value) => held.has(value));
  }
}

/** URLs shared by hand may carry a team KEY ("TRENDZO"); menus emit the uuid. */
function teamIdFor(value: string, store: SyncStore): string {
  if (value === NO_VALUE) return value;
  return store.get("Team", value) !== undefined
    ? value
    : (store.teamByKey(value)?.id ?? value);
}

function matches(project: ProjectData, filter: ProjectFilter, store: SyncStore): boolean {
  const { property, operator, values } = filter;
  switch (property) {
    case "status":
      return matchScalar(operator, values, project.statusCategory);
    case "health":
      return matchScalar(operator, values, project.health);
    case "priority":
      return matchScalar(operator, values, String(project.priority));
    case "lead":
      return matchScalar(operator, values, project.leadId ?? NO_VALUE);
    case "team":
      return matchTeams(
        operator,
        values.map((value) => teamIdFor(value, store)),
        project.teamIds,
      );
  }
}

/**
 * Apply the chip row to a project list. Chips AND together; a chip with no
 * values is inert (the user is mid-build). Returns the input untouched when
 * nothing is active.
 */
export function applyProjectFilters(
  projects: ProjectData[],
  filters: ProjectFilter[],
  store: SyncStore,
): ProjectData[] {
  const active = filters.filter((filter) => filter.values.length > 0);
  if (active.length === 0) return projects;
  return projects.filter((project) =>
    active.every((filter) => matches(project, filter, store)),
  );
}

/* ================================================================
 * Hooks
 * ================================================================ */

/**
 * Read/write the project chip row in `?filter=`.
 * Requires a <Suspense> boundary above it (useSearchParams).
 */
export function useProjectFilters(viewKey: string): ProjectFiltersApi {
  return useFiltersOf(viewKey, isProjectFilterProperty);
}

/** The serialized chip row, ready to store on a saved view. */
export function serializeProjectFilters(filters: ProjectFilter[]): string {
  return serializeFilters(filters);
}

/**
 * The projects a view shows: scope (workspace or one team) → chips → the
 * caller's ordering. Shared by the table and the insights rail so both count
 * exactly the same rows.
 */
export function useVisibleProjects(
  viewKey: string,
  store: SyncStore,
  teamId?: string,
): { projects: ProjectData[]; filters: ProjectFilter[] } {
  const { filters } = useProjectFilters(viewKey);
  // Plain derivation on purpose: store.all() returns a fresh array whose
  // observable reads make the calling observer() track the pool. Memoizing
  // would only hide pool changes from the render that must react to them.
  const scoped = store
    .all("Project")
    .filter((project) => teamId === undefined || project.teamIds.includes(teamId));
  return { projects: applyProjectFilters(scoped, filters, store), filters };
}
