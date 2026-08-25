"use client";

/**
 * Issue filter model — MASTER_PROMPT.md §11.2 (CAPTURED) and
 * docs/analysis/video-timeline-2.md finding 7.
 *
 * Three layers, deliberately separated:
 *
 *  1. THE SHAPE — `Filter` = property + operator + values. A view's filter
 *     set is an AND of chips; each chip's operator decides how its values
 *     combine (any / all / none). Multi-value auto-switches the operator
 *     ("is" ⇢ "is any of", §11.2).
 *  2. THE EVALUATOR — `applyFilters()` is pure: same issues + same filters
 *     ⇒ same array. It never touches React or the URL, so the list, the
 *     board and any future saved-view preview can share it.
 *  3. THE TRANSPORT — filters live in the URL (`?filter=…`) so a filtered
 *     view is shareable by copy-paste (§11.2 "Filters encode into the URL")
 *     and survives reload/back-nav for free. `useFilters()` is the only
 *     stateful piece here and it owns nothing: the query string is the
 *     single source of truth.
 *
 * URL grammar (compact, human-readable, one query param):
 *
 *     filter = chip *( ";" chip )
 *     chip   = property ":" operator ":" [ value *( "," value ) ]
 *     value  = encodeURIComponent(id)
 *
 *     ?filter=status:isAnyOf:state-todo,state-progress;assignee:is:u-yk
 *
 * The three separators (`;` `:` `,`) are the only unescaped punctuation:
 * encodeURIComponent escapes all of them inside a value, so parsing is
 * unambiguous without a length prefix or JSON blob. An empty value list is
 * legal (`status:is:`) — a chip the user opened but has not filled yet
 * stays in the URL and evaluates as a no-op.
 */

import { useCallback, useMemo, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { SyncStore } from "@/lib/data/store";
import type { IssueData, Priority } from "@/lib/data/types";

/* ================================================================
 * Shape
 * ================================================================ */

export type FilterProperty =
  | "status"
  | "assignee"
  | "priority"
  | "labels"
  | "project"
  | "creator"
  | "subscribers"
  | "team"
  | "content"
  | "dueDate"
  | "createdAt";

export type FilterOperator =
  | "is"
  | "isNot"
  | "isAnyOf"
  | "isNoneOf"
  | "includesAny"
  | "includesAll"
  | "contains"
  | "doesNotContain"
  | "before"
  | "after";

/**
 * A chip, generic in its property vocabulary. Issue views use
 * `Filter` (= FilterOf<FilterProperty>); other surfaces (lib/projects/
 * filters.ts) instantiate the same shape with their own property union, so
 * the codec, the URL transport and the chip UI stay shared.
 */
export interface FilterOf<P extends string> {
  id: string;
  property: P;
  operator: FilterOperator;
  values: string[];
}

export type Filter = FilterOf<FilterProperty>;

/** Query parameter carrying the serialized chip row. */
export const FILTER_PARAM = "filter";

/** Sentinel value for "no assignee" (issues store `assigneeId: undefined`). */
export const UNASSIGNED = "unassigned";

/** Sentinel value for "no project". */
export const NO_PROJECT = "none";

/* ================================================================
 * Vocabulary
 * ================================================================ */

export const PROPERTY_LABEL: Record<FilterProperty, string> = {
  status: "Status",
  assignee: "Assignee",
  priority: "Priority",
  labels: "Labels",
  project: "Project",
  creator: "Creator",
  subscribers: "Subscribers",
  team: "Team",
  content: "Content",
  dueDate: "Due date",
  createdAt: "Created",
};

export const OPERATOR_LABEL: Record<FilterOperator, string> = {
  is: "is",
  isNot: "is not",
  isAnyOf: "is any of",
  isNoneOf: "is none of",
  includesAny: "includes any of",
  includesAll: "includes all of",
  contains: "contains",
  doesNotContain: "does not contain",
  before: "before",
  after: "after",
};

/** Properties whose issue field is an array (set semantics). */
const SET_PROPERTIES: ReadonlySet<FilterProperty> = new Set<FilterProperty>([
  "labels",
  "subscribers",
]);

/** Properties whose value is typed free text rather than picked from a list. */
export const TEXT_PROPERTIES: ReadonlySet<FilterProperty> = new Set<FilterProperty>([
  "content",
]);

/** Properties whose values are ISO dates (ordering semantics). */
const DATE_PROPERTIES: ReadonlySet<FilterProperty> = new Set<FilterProperty>([
  "dueDate",
  "createdAt",
]);

const SET_OPERATORS: FilterOperator[] = ["includesAny", "includesAll", "isNoneOf"];
const DATE_OPERATORS: FilterOperator[] = ["before", "after"];
const TEXT_OPERATORS: FilterOperator[] = ["contains", "doesNotContain"];
const ID_OPERATORS: FilterOperator[] = ["is", "isNot", "isAnyOf", "isNoneOf"];

/** True when the property's values are typed by hand (text or a date). */
export function isTypedProperty(property: FilterProperty): boolean {
  return TEXT_PROPERTIES.has(property) || DATE_PROPERTIES.has(property);
}

/** Operators offered by the chip's operator segment for one property. */
export function operatorsFor(property: FilterProperty): FilterOperator[] {
  if (SET_PROPERTIES.has(property)) return SET_OPERATORS;
  if (DATE_PROPERTIES.has(property)) return DATE_OPERATORS;
  if (TEXT_PROPERTIES.has(property)) return TEXT_OPERATORS;
  return ID_OPERATORS;
}

/** Operator a freshly created chip starts with. */
export function defaultOperatorFor(
  property: FilterProperty,
  valueCount: number,
): FilterOperator {
  if (SET_PROPERTIES.has(property)) return "includesAny";
  if (DATE_PROPERTIES.has(property)) return "before";
  if (TEXT_PROPERTIES.has(property)) return "contains";
  return valueCount > 1 ? "isAnyOf" : "is";
}

/**
 * §11.2 "auto-switch on multi-value": adding a second value promotes
 * is ⇢ is any of / is not ⇢ is none of, and dropping back to one demotes it
 * again. Operators the user picked explicitly outside that pair are kept.
 */
export function autoSwitchOperator(
  property: FilterProperty,
  operator: FilterOperator,
  valueCount: number,
): FilterOperator {
  if (
    SET_PROPERTIES.has(property) ||
    DATE_PROPERTIES.has(property) ||
    TEXT_PROPERTIES.has(property)
  ) {
    return operator;
  }
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

export interface FilterValueOption {
  id: string;
  label: string;
}

export const PRIORITY_LABEL: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

/** Priority values are numeric-as-string ("0".."4") on the wire. */
const PRIORITY_ORDER: Priority[] = [1, 2, 3, 4, 0];

function userLabel(name: string, displayName?: string): string {
  const preferred = displayName !== undefined && displayName !== "" ? displayName : name;
  return preferred;
}

/**
 * The selectable values for one property, in menu order. Reads the pool, so
 * call it from an `observer()` component to stay reactive.
 */
export function filterValueOptions(
  property: FilterProperty,
  store: SyncStore,
): FilterValueOption[] {
  switch (property) {
    case "status": {
      // States are per-team; the same name can repeat across teams, so the
      // team key disambiguates when more than one team is loaded.
      const teams = new Map(store.all("Team").map((team) => [team.id, team.key]));
      const multiTeam = teams.size > 1;
      return store.all("WorkflowState").map((state) => ({
        id: state.id,
        label: multiTeam ? `${state.name} · ${teams.get(state.teamId) ?? "?"}` : state.name,
      }));
    }
    case "assignee":
      return [
        { id: UNASSIGNED, label: "Unassigned" },
        ...store
          .all("User")
          .map((user) => ({ id: user.id, label: userLabel(user.name, user.displayName) })),
      ];
    case "creator":
    case "subscribers":
      return store
        .all("User")
        .map((user) => ({ id: user.id, label: userLabel(user.name, user.displayName) }));
    case "priority":
      return PRIORITY_ORDER.map((priority) => ({
        id: String(priority),
        label: PRIORITY_LABEL[priority],
      }));
    case "labels":
      return store
        .all("Label")
        .filter((label) => !label.isGroup)
        .map((label) => ({ id: label.id, label: label.name }));
    case "project":
      return [
        { id: NO_PROJECT, label: "No project" },
        ...store.all("Project").map((project) => ({ id: project.id, label: project.name })),
      ];
    case "team":
      return store.all("Team").map((team) => ({ id: team.id, label: team.name }));
    case "content":
    case "dueDate":
    case "createdAt":
      // Typed, not picked from a list — the menu renders a text/date field
      // plus presets for these (see FilterBar's TypedValuePanel).
      return [];
  }
}

/** Human label for one stored value — chip summary + checklist rows. */
export function filterValueLabel(
  property: FilterProperty,
  value: string,
  store: SyncStore,
): string {
  switch (property) {
    case "status":
      return store.get("WorkflowState", value)?.name ?? value;
    case "assignee":
    case "creator":
    case "subscribers": {
      if (value === UNASSIGNED) return "Unassigned";
      const user = store.get("User", value);
      return user === undefined ? value : userLabel(user.name, user.displayName);
    }
    case "priority": {
      const priority = Number(value);
      return isPriority(priority) ? PRIORITY_LABEL[priority] : value;
    }
    case "labels":
      return store.get("Label", value)?.name ?? value;
    case "project":
      return value === NO_PROJECT ? "No project" : (store.get("Project", value)?.name ?? value);
    case "team":
      return store.get("Team", value)?.name ?? store.teamByKey(value)?.name ?? value;
    case "content":
      return value;
    case "dueDate":
    case "createdAt":
      return value;
  }
}

function isPriority(value: number): value is Priority {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4;
}

/* ================================================================
 * Evaluation (pure)
 * ================================================================ */

/** Membership test for a single-valued id property. */
function matchScalar(operator: FilterOperator, values: string[], actual: string): boolean {
  switch (operator) {
    case "isNot":
    case "isNoneOf":
      return !values.includes(actual);
    case "before":
    case "after":
      // Ordering operators are meaningless on ids — treat as inert rather
      // than silently emptying the list.
      return true;
    default:
      // is / isAnyOf, and includesAny|includesAll degenerate to membership
      // when the issue side holds exactly one value.
      return values.includes(actual);
  }
}

/** Set test for an array-valued property (labels). */
function matchSet(
  operator: FilterOperator,
  values: string[],
  actual: readonly string[],
): boolean {
  const held = new Set(actual);
  switch (operator) {
    case "includesAll":
      return values.every((value) => held.has(value));
    case "isNot":
    case "isNoneOf":
      return !values.some((value) => held.has(value));
    default:
      return values.some((value) => held.has(value));
  }
}

/**
 * Free-text test over the issue's title + description. Case-insensitive
 * substring; several typed values combine as OR for `contains` and as
 * "none of them appear" for `doesNotContain`.
 */
function matchText(
  operator: FilterOperator,
  values: string[],
  haystack: string,
): boolean {
  const text = haystack.toLowerCase();
  const hit = values.some((value) => text.includes(value.trim().toLowerCase()));
  return operator === "doesNotContain" || operator === "isNot" ? !hit : hit;
}

/**
 * Date test. Comparison is on the ISO day key (`YYYY-MM-DD`) so it is
 * timezone-free and total-order-correct on plain strings; an issue missing
 * the date never satisfies a date filter.
 */
function matchDate(
  operator: FilterOperator,
  values: string[],
  actual: string | undefined,
): boolean {
  const bound = values[0];
  if (bound === undefined) return true;
  if (actual === undefined) return false;
  const key = actual.slice(0, 10);
  switch (operator) {
    case "before":
      return key < bound;
    case "after":
      return key > bound;
    case "isNot":
    case "isNoneOf":
      return key !== bound;
    default:
      return key === bound;
  }
}

/**
 * Resolve a filter value to a team id: URLs shared by hand carry the team
 * KEY ("TRENDZO"), the menus emit the uuid — both must work.
 */
function teamIdFor(value: string, store: SyncStore): string {
  return store.get("Team", value) !== undefined ? value : (store.teamByKey(value)?.id ?? value);
}

function matchesFilter(issue: IssueData, filter: Filter, store: SyncStore): boolean {
  const { property, operator, values } = filter;
  switch (property) {
    case "status":
      return matchScalar(operator, values, issue.stateId);
    case "assignee":
      return matchScalar(operator, values, issue.assigneeId ?? UNASSIGNED);
    case "creator":
      return matchScalar(operator, values, issue.creatorId);
    case "priority":
      return matchScalar(operator, values, String(issue.priority));
    case "project":
      return matchScalar(operator, values, issue.projectId ?? NO_PROJECT);
    case "team":
      return matchScalar(
        operator,
        values.map((value) => teamIdFor(value, store)),
        issue.teamId,
      );
    case "labels":
      return matchSet(operator, values, issue.labelIds);
    case "subscribers":
      return matchSet(operator, values, issue.subscriberIds);
    case "content":
      return matchText(operator, values, `${issue.title}\n${issue.description ?? ""}`);
    case "dueDate":
      return matchDate(operator, values, issue.dueDate);
    case "createdAt":
      return matchDate(operator, values, issue.createdAt);
  }
}

/**
 * Apply the chip row to a list of issues. Chips AND together; a chip with no
 * values is inert (the user is mid-build), so a half-finished filter never
 * blanks the view. Returns the input array untouched when nothing is active.
 */
export function applyFilters(
  issues: IssueData[],
  filters: Filter[],
  store: SyncStore,
): IssueData[] {
  const active = filters.filter((filter) => filter.values.length > 0);
  if (active.length === 0) return issues;
  return issues.filter((issue) =>
    active.every((filter) => matchesFilter(issue, filter, store)),
  );
}

/* ================================================================
 * URL codec
 * ================================================================ */

const PROPERTY_SET: ReadonlySet<string> = new Set(Object.keys(PROPERTY_LABEL));
const OPERATOR_SET: ReadonlySet<string> = new Set(Object.keys(OPERATOR_LABEL));

function isFilterProperty(value: string): value is FilterProperty {
  return PROPERTY_SET.has(value);
}

function isFilterOperator(value: string): value is FilterOperator {
  return OPERATOR_SET.has(value);
}

/**
 * Chip ids are positional and deterministic so a parse ⇢ serialize ⇢ parse
 * round-trip is stable: React keys and the "which chip am I editing" lookups
 * survive every URL update without a random id generator.
 */
function chipId(property: string, index: number): string {
  return `${property}#${index}`;
}

/** `property:operator:v1,v2` chips joined by ";" (see the grammar above). */
export function serializeFilters(
  filters: readonly { property: string; operator: FilterOperator; values: string[] }[],
): string {
  return filters
    .map(
      (filter) =>
        `${filter.property}:${filter.operator}:${filter.values
          .map(encodeURIComponent)
          .join(",")}`,
    )
    .join(";");
}

/**
 * Inverse of `serializeFilters` for any property vocabulary; unknown/garbled
 * chips are dropped (`isProperty` is the vocabulary guard).
 */
export function parseFiltersWith<P extends string>(
  s: string,
  isProperty: (value: string) => value is P,
): FilterOf<P>[] {
  if (s === "") return [];
  const filters: FilterOf<P>[] = [];
  for (const chunk of s.split(";")) {
    if (chunk === "") continue;
    const parts = chunk.split(":");
    const property = parts[0] ?? "";
    const operator = parts[1] ?? "";
    if (!isProperty(property) || !isFilterOperator(operator)) continue;
    // Values were percent-encoded, so any remaining ":" belongs to nothing —
    // rejoin defensively rather than truncating a hand-edited URL.
    const rawValues = parts.slice(2).join(":");
    const values =
      rawValues === ""
        ? []
        : rawValues.split(",").map((value) => {
            try {
              return decodeURIComponent(value);
            } catch {
              return value; // malformed escape — keep the literal
            }
          });
    filters.push({ id: chipId(property, filters.length), property, operator, values });
  }
  return filters;
}

/* ================================================================
 * useFilters — the URL is the state
 * ================================================================ */

export interface FiltersApiOf<P extends string> {
  filters: FilterOf<P>[];
  add: (filter: Omit<FilterOf<P>, "id">) => void;
  update: (id: string, patch: Partial<FilterOf<P>>) => void;
  remove: (id: string) => void;
  clear: () => void;
}

export type FiltersApi = FiltersApiOf<FilterProperty>;

/**
 * Read/write the current view's filter chips for ANY property vocabulary
 * (`isProperty` is the guard the URL is parsed against — pass a module-level
 * function so the memo stays stable).
 *
 * State lives in `?filter=` and is written with `router.replace()` so the
 * back button leaves the view instead of unwinding every chip toggle.
 *
 * `viewKey` deliberately scopes nothing: the URL already IS the per-view
 * state, which is what makes a filtered view shareable as a link. Saved views
 * (§10.7) seed that URL at navigation time rather than at hook time — a
 * `CustomView` row carries its team and its serialized chip row, and
 * `viewHref()` in components/nav/ViewsPage.tsx composes the two into the
 * destination. So there is nothing left for this hook to look up; the
 * parameter stays for symmetry with `useViewPreference(viewKey)`, which does
 * key its storage on it.
 *
 * Requires a <Suspense> boundary above it (useSearchParams opts the subtree
 * out of static prerendering).
 */
export function useFiltersOf<P extends string>(
  viewKey: string,
  isProperty: (value: string) => value is P,
): FiltersApiOf<P> {
  void viewKey;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const raw = searchParams.get(FILTER_PARAM) ?? "";
  const filters = useMemo(() => parseFiltersWith(raw, isProperty), [raw, isProperty]);

  // router.replace() commits in a transition, so `raw` still holds the OLD
  // value for the rest of the tick. Two toggles in one tick (checking two
  // boxes fast) would otherwise both branch off the same base and the first
  // would be lost — so writes chain off the last value we wrote until the
  // URL catches up.
  const pendingRef = useRef<FilterOf<P>[] | null>(null);
  const lastRawRef = useRef(raw);
  if (lastRawRef.current !== raw) {
    lastRawRef.current = raw;
    pendingRef.current = null;
  }

  const write = useCallback(
    (next: FilterOf<P>[]): void => {
      pendingRef.current = next;
      const serialized = serializeFilters(next);
      // Built by hand rather than URLSearchParams.toString(): the codec's
      // ";" ":" "," separators are legal query characters and re-escaping
      // them would triple the length of every shared link.
      const parts: string[] = [];
      searchParams.forEach((value, key) => {
        if (key !== FILTER_PARAM) parts.push(`${key}=${encodeURIComponent(value)}`);
      });
      if (serialized !== "") parts.push(`${FILTER_PARAM}=${serialized}`);
      const query = parts.join("&");
      router.replace(query === "" ? pathname : `${pathname}?${query}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const current = useCallback((): FilterOf<P>[] => pendingRef.current ?? filters, [filters]);

  const add = useCallback(
    (filter: Omit<FilterOf<P>, "id">): void => {
      const list = current();
      write([...list, { ...filter, id: chipId(filter.property, list.length) }]);
    },
    [current, write],
  );

  const update = useCallback(
    (id: string, patch: Partial<FilterOf<P>>): void => {
      write(
        current().map((filter) =>
          filter.id === id ? { ...filter, ...patch, id: filter.id } : filter,
        ),
      );
    },
    [current, write],
  );

  const remove = useCallback(
    (id: string): void => {
      write(current().filter((filter) => filter.id !== id));
    },
    [current, write],
  );

  const clear = useCallback((): void => {
    write([]);
  }, [write]);

  return { filters, add, update, remove, clear };
}

/** Issue-vocabulary filters (the original, unchanged API). */
export function useFilters(viewKey: string): FiltersApi {
  return useFiltersOf(viewKey, isFilterProperty);
}

/** Inverse of `serializeFilters` for the issue vocabulary. */
export function parseFilters(s: string): Filter[] {
  return parseFiltersWith(s, isFilterProperty);
}
