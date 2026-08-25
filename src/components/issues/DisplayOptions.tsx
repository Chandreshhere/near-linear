"use client";

/**
 * Display Options — MASTER_PROMPT.md §11.1 + §16.13 and
 * docs/analysis/video-timeline-2.md finding 8 (CAPTURED).
 *
 * One right-anchored popover behind the 28px sliders IconButton (or
 * `Shift+V`). A List|Board segmented control re-labels the rows in place
 * (Grouping/Sub-grouping ⇄ Columns/Rows) — instant switch, no animation.
 * Toggles and selects never close the popover; deviation from the shared
 * defaults adds the 6px accent badge dot on the trigger and the
 * Reset / "Set default for everyone" footer.
 *
 * Radix Popover is used in CONTROLLED mode (the existing ui/Popover
 * primitive owns its state and cannot be opened from the shortcut
 * registry); the surface contract matches ui/popover.module.css at
 * 320px / 8px padding.
 */

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { observer } from "mobx-react-lite";
import { Button, IconButton } from "@/components/ui/Button";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Icon } from "@/components/icons/Icon";
import { useShortcut } from "@/lib/keyboard";
import { showToast } from "@/lib/toast";
import { useViewPreference } from "@/lib/issues/viewPrefs";
import css from "./displayoptions.module.css";

/* ================================================================
 * Option vocabularies (§11.1)
 * ================================================================ */

const GROUPING_OPTIONS: SelectOption[] = [
  { value: "status", label: "Status" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
  { value: "project", label: "Project" },
];

const SUB_GROUPING_OPTIONS: SelectOption[] = [
  { value: "none", label: "No grouping" },
  { value: "assignee", label: "Assignee" },
  { value: "priority", label: "Priority" },
];

const ORDERING_OPTIONS: SelectOption[] = [
  { value: "priority", label: "Priority" },
  { value: "status", label: "Status" },
  { value: "created", label: "Created" },
  { value: "updated", label: "Updated" },
  { value: "title", label: "Title" },
];

const COMPLETED_OPTIONS: SelectOption[] = [
  { value: "all", label: "All" },
  { value: "pastWeek", label: "Past week" },
  { value: "pastMonth", label: "Past month" },
  { value: "none", label: "None" },
];

/** Chip grid — camelCase keys stored in pref.displayProperties. */
const DISPLAY_PROPERTIES: { key: string; label: string }[] = [
  { key: "id", label: "ID" },
  { key: "status", label: "Status" },
  { key: "assignee", label: "Assignee" },
  { key: "priority", label: "Priority" },
  { key: "project", label: "Project" },
  { key: "dueDate", label: "Due date" },
  { key: "milestone", label: "Milestone" },
  { key: "release", label: "Release" },
  { key: "labels", label: "Labels" },
  { key: "links", label: "Links" },
  { key: "timeInStatus", label: "Time in status" },
  { key: "created", label: "Created" },
  { key: "updated", label: "Updated" },
];

/** Spread onto the trigger while open — §6.2 menu-open persistence.
 *  (Spread keeps TS excess-property checks off the data-* attribute.) */
const MENU_OPEN_ATTR: Record<string, string> = { "data-menu-open": "true" };

/* ================================================================
 * Layout helpers
 * ================================================================ */

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={css.row}>
      <span className={css.rowLabel}>{label}</span>
      <span className={css.rowControl}>{children}</span>
    </div>
  );
}

/* ================================================================
 * Popover body (mode-aware vocabulary)
 * ================================================================ */

const DisplayOptionsPanel = observer(function DisplayOptionsPanel({
  viewKey,
}: {
  viewKey: string;
}) {
  const { pref, update, isDefault, reset, setAsWorkspaceDefault } =
    useViewPreference(viewKey);
  const board = pref.layout === "board";

  // "Nested sub-issues" has its own ViewPreference field — deliberately NOT
  // overloading showSubIssues, which backs the "Show sub-issues" row above.
  const nestedSubIssues = pref.nestedSubIssues ?? true;
  const hiddenColumnCount = (pref.hiddenColumnIds ?? []).length;

  // completedFilter is shared between the recency toggle ("recency") and
  // the Completed-issues select (all/pastWeek/pastMonth/none): while the
  // toggle holds "recency" the select falls back to displaying "All", and
  // picking a period in the select turns the toggle off again.
  const completedSelectValue = COMPLETED_OPTIONS.some(
    (option) => option.value === pref.completedFilter,
  )
    ? pref.completedFilter
    : "all";

  const toggleProperty = (key: string): void => {
    const active = pref.displayProperties.includes(key);
    update({
      displayProperties: active
        ? pref.displayProperties.filter((k) => k !== key)
        : [...pref.displayProperties, key],
    });
  };

  return (
    <>
      {/* List | Board — instant re-layout, active cell tinted */}
      <div className={css.segmented} role="group" aria-label="Layout">
        <button
          type="button"
          className={css.segment}
          data-active={!board ? "true" : undefined}
          aria-pressed={!board}
          onClick={() => update({ layout: "list" })}
        >
          List
        </button>
        <button
          type="button"
          className={css.segment}
          data-active={board ? "true" : undefined}
          aria-pressed={board}
          onClick={() => update({ layout: "board" })}
        >
          Board
        </button>
      </div>

      <Row label={board ? "Columns" : "Grouping"}>
        <Select
          label={board ? "Columns" : "Grouping"}
          value={pref.grouping}
          onValueChange={(value) => update({ grouping: value })}
          options={GROUPING_OPTIONS}
        />
      </Row>

      <Row label={board ? "Rows" : "Sub-grouping"}>
        <Select
          label={board ? "Rows" : "Sub-grouping"}
          value={pref.subGrouping}
          onValueChange={(value) => update({ subGrouping: value })}
          options={SUB_GROUPING_OPTIONS}
        />
      </Row>

      <Row label="Ordering">
        <Select
          label="Ordering"
          value={pref.ordering}
          onValueChange={(value) => update({ ordering: value })}
          options={ORDERING_OPTIONS}
        />
      </Row>

      {/* shared rows (video-timeline-2.md finding 8) */}
      <Row label="Order completed by recency">
        <Toggle
          checked={pref.completedFilter === "recency"}
          onChange={(checked) =>
            update({ completedFilter: checked ? "recency" : "all" })
          }
          aria-label="Order completed by recency"
        />
      </Row>

      <Row label="Completed issues">
        <Select
          label="Completed issues"
          value={completedSelectValue}
          onValueChange={(value) => update({ completedFilter: value })}
          options={COMPLETED_OPTIONS}
        />
      </Row>

      <Row label="Show sub-issues">
        <Toggle
          checked={pref.showSubIssues}
          onChange={(checked) => update({ showSubIssues: checked })}
          aria-label="Show sub-issues"
        />
      </Row>

      {board ? (
        <>
          <div className={css.sectionHeader}>Board options</div>
          <Row label="Show empty columns">
            <Toggle
              checked={pref.showEmptyGroups}
              onChange={(checked) => update({ showEmptyGroups: checked })}
              aria-label="Show empty columns"
            />
          </Row>
          {hiddenColumnCount > 0 ? (
            <Row label={`Hidden columns (${hiddenColumnCount})`}>
              <Button
                size={24}
                pill={false}
                onClick={() => update({ hiddenColumnIds: [] })}
              >
                Show all
              </Button>
            </Row>
          ) : null}
        </>
      ) : (
        <>
          <div className={css.sectionHeader}>List options</div>
          <Row label="Nested sub-issues">
            <Toggle
              checked={nestedSubIssues}
              onChange={(checked) => update({ nestedSubIssues: checked })}
              aria-label="Nested sub-issues"
            />
          </Row>
          <Row label="Show empty groups">
            <Toggle
              checked={pref.showEmptyGroups}
              onChange={(checked) => update({ showEmptyGroups: checked })}
              aria-label="Show empty groups"
            />
          </Row>
        </>
      )}

      <div className={css.separator} />

      <div className={css.sectionHeader}>Display properties</div>
      <div className={css.chipGrid}>
        {DISPLAY_PROPERTIES.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={css.chip}
            aria-pressed={pref.displayProperties.includes(key)}
            onClick={() => toggleProperty(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {!isDefault ? (
        <div className={css.footer}>
          <Button variant="ghost" size={24} pill={false} onClick={reset}>
            Reset
          </Button>
          <Button
            variant="ghost"
            size={24}
            pill={false}
            className={css.accentButton}
            onClick={() => {
              // §11.1: publish this view's configuration as the shape every
              // view without its own row inherits from now on.
              setAsWorkspaceDefault();
              showToast("Set as the default for everyone");
            }}
          >
            Set default for everyone
          </Button>
        </div>
      ) : null}
    </>
  );
});

/* ================================================================
 * Trigger + controlled popover
 * ================================================================ */

export const DisplayOptionsButton = observer(function DisplayOptionsButton({
  viewKey,
}: {
  viewKey: string;
}) {
  const { isDefault } = useViewPreference(viewKey);
  const [open, setOpen] = React.useState(false);

  // §12: Shift+V toggles display options (controlled Radix popover).
  useShortcut(
    {
      id: `display-options:${viewKey}`,
      keys: "shift+v",
      description: "Show display options",
      handler: () => setOpen((value) => !value),
    },
    [viewKey],
  );

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <IconButton label="Display options" {...(open ? MENU_OPEN_ATTR : {})}>
          <Icon name="DisplayOptions" size={14} />
          {/* CAPTURED: small accent dot while deviated from defaults */}
          {!isDefault ? <span className={css.badgeDot} aria-hidden="true" /> : null}
        </IconButton>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={css.popover}
          side="bottom"
          align="end"
          sideOffset={4}
          collisionPadding={8}
          onInteractOutside={(event) => {
            // Radix Select menus portal outside the popover DOM — picking
            // an option must not dismiss the popover (§11.1 CAPTURED).
            const target = event.target;
            if (
              target instanceof Element &&
              target.closest("[data-radix-popper-content-wrapper]") !== null
            ) {
              event.preventDefault();
            }
          }}
        >
          <DisplayOptionsPanel viewKey={viewKey} />
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});
