"use client";

/**
 * Filter chrome — MASTER_PROMPT.md §11.2, §16.12 and
 * docs/analysis/video-timeline-2.md finding 7 (CAPTURED).
 *
 * Two exports, both driven by `useFilters()` (the URL is the state):
 *
 *  · <AddFilterButton> — the 28px funnel in the view toolbar, also bound to
 *    `F`. Opens the "Add Filter…" menu: a 13px search header carrying the
 *    `F` keycap hint, then the captured 19-row property list, every row with
 *    a chevron. Nine rows drill into a real value panel — Status, Assignee,
 *    Creator, Priority, Labels, Project and Subscribers into a multi-select
 *    checklist of store values, Dates into a date field with presets (and a
 *    Due date | Created switch), Content into a free-text matcher. The rest
 *    are disabled: the captured menu has exactly these 19 entries, but each
 *    remaining one needs a data model this build does not have.
 *    Click-away applies nothing (§16.12) — every pick applies immediately,
 *    so there is nothing pending to discard.
 *
 *  · <FilterBar> — the chip row under the header, hidden until a filter
 *    exists. Each chip is a segmented pill whose three segments are
 *    independently clickable (§11.2): property (static) · operator (menu of
 *    the operators valid for that property) · values (the same checklist),
 *    plus ✕ to drop the chip. "Clear all" sits at the far right.
 *
 * The Radix Popover primitive is used directly rather than ui/Popover: the
 * surface needs a search header, an in-place drill-down and controlled open
 * state (the `F` shortcut), none of which the uncontrolled primitive exposes.
 */

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { observer } from "mobx-react-lite";
import { useStore } from "@/lib/data/DataProvider";
import { useShortcut } from "@/lib/keyboard";
import {
  OPERATOR_LABEL,
  PROPERTY_LABEL,
  autoSwitchOperator,
  defaultOperatorFor,
  filterValueLabel,
  filterValueOptions,
  isTypedProperty,
  operatorsFor,
  useFilters,
  type Filter,
  type FilterProperty,
  type FiltersApi,
} from "@/lib/issues/filters";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { IconButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Kbd } from "@/components/ui/Kbd";
import { Icon } from "@/components/icons/Icon";
import { SettingsGlyph } from "@/components/settings/glyphs";
import { PriorityIcon, StatusIcon } from "@/components/icons/StatusIcon";
import { projectIconFor } from "@/components/projects/glyphs";
import type { SyncStore } from "@/lib/data/store";
import css from "./filterbar.module.css";

/* ================================================================
 * The captured "Add Filter…" list (video-timeline-2.md finding 7)
 * ================================================================ */

interface AddFilterEntry {
  label: string;
  /** Present ⇒ the row drills into a real value checklist. */
  property?: FilterProperty;
  /** Sprite name for the leading 16px slot. */
  icon: string;
}

/**
 * All 19 rows, in captured order.
 *
 * A row with a `property` drills into a real value panel and writes a real
 * chip. The remaining rows are rendered because the captured menu has exactly
 * these 19 entries, but each one needs a data model this build does not have
 * (an AI filter service, AND/OR filter groups, agent sessions, issue
 * relations, label suggestions, project properties, auto-close bookkeeping,
 * external links, templates). They are `disabled`, so they read as
 * unavailable rather than as controls that quietly do nothing.
 */
const ADD_FILTER_ITEMS: AddFilterEntry[] = [
  { label: "AI filter", icon: "Agent" },
  { label: "Advanced filter", icon: "Filter" },
  { label: "Status", icon: "Hash", property: "status" },
  { label: "Assignee", icon: "MyIssues", property: "assignee" },
  { label: "Agent", icon: "Agent" },
  { label: "Agent Session", icon: "Play" },
  { label: "Creator", icon: "MyIssues", property: "creator" },
  { label: "Priority", icon: "DisplayOptions", property: "priority" },
  { label: "Labels", icon: "Label", property: "labels" },
  { label: "Relations", icon: "Link" },
  { label: "Suggested label", icon: "Label" },
  { label: "Dates", icon: "Calendar", property: "dueDate" },
  { label: "Project", icon: "Project", property: "project" },
  { label: "Project properties", icon: "Folder" },
  { label: "Subscribers", icon: "Subscribe", property: "subscribers" },
  { label: "Auto-closed", icon: "ClockOutline" },
  { label: "Content", icon: "Comment", property: "content" },
  { label: "Links", icon: "Link" },
  { label: "Template", icon: "Copy" },
];

/* ================================================================
 * Glyphs
 * ================================================================ */

function CheckGlyph() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M9.98 3.05a.8.8 0 0 1 .03 1.13L5.42 9.07a.8.8 0 0 1-1.15.03L2.03 6.87a.8.8 0 1 1 1.14-1.13l1.66 1.68 4.02-4.34a.8.8 0 0 1 1.13-.03Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseGlyph() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true">
      <path
        d="M2.71 2.71a.7.7 0 0 1 .99 0L6 5.01l2.3-2.3a.7.7 0 1 1 .99.99L6.99 6l2.3 2.3a.7.7 0 1 1-.99.99L6 6.99l-2.3 2.3a.7.7 0 0 1-.99-.99L5.01 6l-2.3-2.3a.7.7 0 0 1 0-.99Z"
        fill="currentColor"
      />
    </svg>
  );
}

function BackGlyph() {
  /* the one shared bare-chevron back definition (settings glyphs) */
  return <SettingsGlyph name="back" size={14} />;
}

/** Leading glyph for a property — chip head and menu row share it. */
function propertyGlyph(property: FilterProperty): React.ReactNode {
  switch (property) {
    case "status":
      return <StatusIcon category="unstarted" size={14} />;
    case "priority":
      return <PriorityIcon priority={2} size={14} />;
    case "assignee":
    case "creator":
      return <Icon name="MyIssues" size={14} />;
    case "subscribers":
      return <Icon name="Subscribe" size={14} />;
    case "content":
      return <Icon name="Comment" size={14} />;
    case "labels":
      return <Icon name="Label" size={14} />;
    case "project":
      return <Icon name="Project" size={14} />;
    case "team":
      return <Icon name="Team" size={14} />;
    case "dueDate":
    case "createdAt":
      return <Icon name="Calendar" size={14} />;
  }
}

/** Leading glyph for one selectable value inside the checklist. */
function valueGlyph(
  property: FilterProperty,
  value: string,
  store: SyncStore,
): React.ReactNode {
  switch (property) {
    case "status": {
      const state = store.get("WorkflowState", value);
      return state === undefined ? null : (
        <StatusIcon category={state.category} color={state.color} size={14} />
      );
    }
    case "priority": {
      const priority = Number(value);
      return priority >= 0 && priority <= 4 ? (
        <PriorityIcon priority={priority as 0 | 1 | 2 | 3 | 4} size={14} />
      ) : null;
    }
    case "assignee":
    case "creator":
    case "subscribers": {
      const user = store.get("User", value);
      return user === undefined ? (
        <Icon name="MyIssues" size={14} />
      ) : (
        <Avatar initials={user.initials} color={user.avatarColor} size={16} />
      );
    }
    case "content":
      return <Icon name="Comment" size={14} />;
    case "labels": {
      const label = store.get("Label", value);
      return (
        <span
          className={css.swatch}
          style={{ background: label?.color ?? "var(--color-text-faint)" }}
          aria-hidden="true"
        />
      );
    }
    case "project": {
      const project = store.get("Project", value);
      return project === undefined ? <Icon name="Project" size={14} /> : projectIconFor(project);
    }
    case "team": {
      const team = store.get("Team", value);
      return team === undefined ? (
        <Icon name="Team" size={14} />
      ) : (
        <Icon name={team.icon} size={14} color={team.color} />
      );
    }
    case "dueDate":
    case "createdAt":
      return <Icon name="Calendar" size={14} />;
  }
}

/* ================================================================
 * Value checklist (shared by the menu drill-down and the chip)
 * ================================================================ */

/**
 * Toggle one value on the chip that owns `property`, creating the chip on
 * the first pick. The operator auto-switches with the value count (§11.2).
 */
function toggleValue(
  api: FiltersApi,
  property: FilterProperty,
  value: string,
  filterId?: string,
): void {
  const target =
    filterId !== undefined
      ? api.filters.find((filter) => filter.id === filterId)
      : api.filters.find((filter) => filter.property === property);

  if (target === undefined) {
    api.add({
      property,
      operator: defaultOperatorFor(property, 1),
      values: [value],
    });
    return;
  }

  const values = target.values.includes(value)
    ? target.values.filter((held) => held !== value)
    : [...target.values, value];
  api.update(target.id, {
    values,
    operator: autoSwitchOperator(property, target.operator, values.length),
  });
}

const ValueRows = observer(function ValueRows({
  property,
  selected,
  query,
  onToggle,
}: {
  property: FilterProperty;
  selected: readonly string[];
  query: string;
  onToggle: (value: string) => void;
}) {
  const store = useStore();
  const options = filterValueOptions(property, store);
  const needle = query.trim().toLowerCase();
  const visible =
    needle === ""
      ? options
      : options.filter((option) => option.label.toLowerCase().includes(needle));

  if (visible.length === 0) {
    return <div className={css.menuEmpty}>No matches</div>;
  }

  return (
    <>
      {visible.map((option) => {
        const checked = selected.includes(option.id);
        return (
          <button
            key={option.id}
            type="button"
            role="menuitemcheckbox"
            aria-checked={checked}
            className={css.menuItem}
            // Keep focus on the search input through the click so the list
            // stays type-to-filterable while multi-selecting.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onToggle(option.id)}
          >
            <span className={css.checkbox} data-checked={checked ? "true" : undefined}>
              {checked ? <CheckGlyph /> : null}
            </span>
            <span className={css.menuItemIcon} aria-hidden="true">
              {valueGlyph(property, option.id, store)}
            </span>
            <span className={css.menuItemLabel}>{option.label}</span>
          </button>
        );
      })}
    </>
  );
});

/* ================================================================
 * Typed values (Content, Due date, Created)
 * ================================================================ */

/** `YYYY-MM-DD` for a date `dayOffset` days from today (local). */
function isoDay(dayOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + dayOffset);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

const DATE_PRESETS: { label: string; value: () => string }[] = [
  { label: "Today", value: () => isoDay(0) },
  { label: "In 1 week", value: () => isoDay(7) },
  { label: "1 week ago", value: () => isoDay(-7) },
  { label: "1 month ago", value: () => isoDay(-30) },
];

/**
 * The value surface for properties that are TYPED rather than picked:
 * Content (free text) and the two date properties. Dates additionally carry a
 * Due date | Created switch, because the captured menu has one "Dates" row
 * standing in for both.
 */
const TypedValuePanel = observer(function TypedValuePanel({
  property,
  api,
  filterId,
  onProperty,
}: {
  property: FilterProperty;
  api: FiltersApi;
  filterId?: string;
  /** Present in the add-filter menu: lets the Dates row swap which date. */
  onProperty?: (property: FilterProperty) => void;
}) {
  const store = useStore();
  const [draft, setDraft] = React.useState("");
  const isDate = property === "dueDate" || property === "createdAt";

  const target =
    filterId !== undefined
      ? api.filters.find((filter) => filter.id === filterId)
      : api.filters.find((filter) => filter.property === property);
  const values = target?.values ?? [];

  const commit = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed === "") return;
    if (target === undefined) {
      api.add({
        property,
        operator: defaultOperatorFor(property, 1),
        values: [trimmed],
      });
    } else if (!target.values.includes(trimmed)) {
      const next = isDate ? [trimmed] : [...target.values, trimmed];
      api.update(target.id, {
        values: next,
        operator: autoSwitchOperator(property, target.operator, next.length),
      });
    }
    setDraft("");
  };

  const drop = (value: string): void => {
    if (target === undefined) return;
    const next = target.values.filter((held) => held !== value);
    api.update(target.id, {
      values: next,
      operator: autoSwitchOperator(property, target.operator, next.length),
    });
  };

  return (
    <div className={css.typedPanel}>
      {isDate && onProperty !== undefined ? (
        <div className={css.typedSwitch} role="group" aria-label="Date field">
          {(["dueDate", "createdAt"] as const).map((id) => (
            <button
              key={id}
              type="button"
              className={css.typedSwitchButton}
              data-active={property === id ? "true" : undefined}
              aria-pressed={property === id}
              onClick={() => onProperty(id)}
            >
              {PROPERTY_LABEL[id]}
            </button>
          ))}
        </div>
      ) : null}

      <input
        type={isDate ? "date" : "text"}
        className={css.typedInput}
        value={draft}
        placeholder={isDate ? undefined : "Text to match…"}
        aria-label={`${PROPERTY_LABEL[property]} value`}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          setDraft(event.target.value);
          // A date input has no meaningful intermediate state — commit it.
          if (isDate && event.target.value !== "") commit(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter") return;
          event.preventDefault();
          commit(draft);
        }}
      />

      {isDate ? (
        <div className={css.typedPresets}>
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              className={css.typedPreset}
              onClick={() => commit(preset.value())}
            >
              {preset.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          className={css.typedPreset}
          disabled={draft.trim() === ""}
          onClick={() => commit(draft)}
        >
          Add &ldquo;{draft.trim() === "" ? "…" : draft.trim()}&rdquo;
        </button>
      )}

      {values.length > 0 ? (
        <div className={css.typedValues}>
          {values.map((value) => (
            <button
              key={value}
              type="button"
              className={css.typedValue}
              aria-label={`Remove ${filterValueLabel(property, value, store)}`}
              onClick={() => drop(value)}
            >
              {filterValueLabel(property, value, store)}
              <CloseGlyph />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});

/** Dispatch: typed properties get the panel above, the rest a checklist. */
const ValuePanel = observer(function ValuePanel({
  property,
  api,
  filterId,
  query,
  onProperty,
}: {
  property: FilterProperty;
  api: FiltersApi;
  filterId?: string;
  query: string;
  onProperty?: (property: FilterProperty) => void;
}) {
  const target =
    filterId !== undefined
      ? api.filters.find((filter) => filter.id === filterId)
      : api.filters.find((filter) => filter.property === property);

  if (isTypedProperty(property)) {
    return (
      <TypedValuePanel
        property={property}
        api={api}
        filterId={filterId}
        onProperty={onProperty}
      />
    );
  }

  return (
    <ValueRows
      property={property}
      selected={target?.values ?? []}
      query={query}
      onToggle={(value) => toggleValue(api, property, value, filterId)}
    />
  );
});

/** Search header shared by both menu panels (13px, borderless, hairline). */
function MenuSearch({
  inputRef,
  value,
  placeholder,
  onChange,
  onKeyDown,
  trailing,
  onBack,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  trailing?: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <div className={css.menuHeader}>
      {onBack !== undefined ? (
        <button type="button" className={css.menuBack} aria-label="Back" onClick={onBack}>
          <BackGlyph />
        </button>
      ) : null}
      <input
        ref={inputRef}
        type="text"
        className={css.menuSearch}
        value={value}
        placeholder={placeholder}
        aria-label={placeholder}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
      />
      {trailing}
    </div>
  );
}

/* ================================================================
 * AddFilterButton — funnel + "Add Filter…" menu
 * ================================================================ */

/** Spread onto a trigger while its surface is open (§6.2 highlight hold). */
const MENU_OPEN_ATTR: Record<string, string> = { "data-menu-open": "true" };

export const AddFilterButton = observer(function AddFilterButton({
  viewKey,
}: {
  viewKey: string;
}) {
  const api = useFilters(viewKey);
  const [open, setOpen] = React.useState(false);
  const [panel, setPanel] = React.useState<FilterProperty | null>(null);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // §12: `F` opens the filter menu. Scopeless on purpose — the button is
  // only mounted by views that can be filtered, so mounting IS the scope.
  useShortcut(
    {
      id: "filters.open",
      keys: "f",
      description: "Filter",
      handler: () => setOpen(true),
    },
    [],
  );

  // Fresh surface on every open (resetting on close would flash mid-fade).
  React.useEffect(() => {
    if (open) {
      setPanel(null);
      setQuery("");
    }
  }, [open]);

  const openPanel = (property: FilterProperty): void => {
    setPanel(property);
    setQuery("");
    inputRef.current?.focus();
  };

  const backToRoot = (): void => {
    setPanel(null);
    setQuery("");
    inputRef.current?.focus();
  };

  // §6.9 escape hierarchy: clear the search text, then leave the submenu,
  // then close the menu.
  const escape = (): void => {
    if (query !== "") setQuery("");
    else if (panel !== null) backToRoot();
    else setOpen(false);
  };

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === "Escape") {
      event.preventDefault();
      escape();
    }
  };

  const needle = query.trim().toLowerCase();
  const rootItems =
    needle === ""
      ? ADD_FILTER_ITEMS
      : ADD_FILTER_ITEMS.filter((item) => item.label.toLowerCase().includes(needle));

  const activeFilter =
    panel === null ? undefined : api.filters.find((filter) => filter.property === panel);

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <IconButton label="Filter" {...(open ? MENU_OPEN_ATTR : {})}>
          <Icon name="Filter" size={14} />
        </IconButton>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={css.menu}
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            // Escape landing outside the input still follows §6.9.
            if (query !== "" || panel !== null) {
              event.preventDefault();
              escape();
            }
          }}
        >
          {panel === null ? (
            <>
              <MenuSearch
                inputRef={inputRef}
                value={query}
                placeholder="Filter…"
                onChange={setQuery}
                onKeyDown={onSearchKeyDown}
                trailing={<Kbd keys={["F"]} />}
              />
              <div className={css.menuList} role="menu" aria-label="Add filter">
                {rootItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    role="menuitem"
                    className={css.menuItem}
                    // Chrome-only rows stay in the DOM for fidelity but are
                    // inert (dimmed, non-focusable, no-op).
                    data-inert={item.property === undefined ? "true" : undefined}
                    disabled={item.property === undefined}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => {
                      if (item.property !== undefined) openPanel(item.property);
                    }}
                  >
                    <span className={css.menuItemIcon} aria-hidden="true">
                      <Icon name={item.icon} size={14} />
                    </span>
                    <span className={css.menuItemLabel}>{item.label}</span>
                    <Icon name="ChevronRight" size={14} className={css.menuChevron} />
                  </button>
                ))}
                {rootItems.length === 0 ? (
                  <div className={css.menuEmpty}>No matches</div>
                ) : null}
              </div>
            </>
          ) : (
            <>
              <MenuSearch
                inputRef={inputRef}
                value={query}
                placeholder={`${PROPERTY_LABEL[panel]}…`}
                onChange={setQuery}
                onKeyDown={onSearchKeyDown}
                onBack={backToRoot}
              />
              <div
                className={css.menuList}
                role="menu"
                aria-label={`Filter by ${PROPERTY_LABEL[panel]}`}
              >
                <ValuePanel
                  property={panel}
                  api={api}
                  query={query}
                  onProperty={setPanel}
                />
              </div>
            </>
          )}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});

/* ================================================================
 * Chip segments
 * ================================================================ */

/** The values segment: summary button + its own checklist popover. */
const ChipValues = observer(function ChipValues({
  filter,
  api,
}: {
  filter: Filter;
  api: FiltersApi;
}) {
  const store = useStore();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  // Up to two labels, then "+N" (§11.2 chip anatomy).
  const shown = filter.values.slice(0, 2).map((value) =>
    filterValueLabel(filter.property, value, store),
  );
  const overflow = filter.values.length - shown.length;
  const summary =
    shown.length === 0
      ? "Select…"
      : `${shown.join(", ")}${overflow > 0 ? ` +${overflow}` : ""}`;

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          type="button"
          className={css.chipSegment}
          data-menu-open={open ? "true" : undefined}
          data-values="true"
          aria-label={`${PROPERTY_LABEL[filter.property]} values`}
        >
          {summary}
        </button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={css.menu}
          side="bottom"
          align="start"
          sideOffset={4}
          collisionPadding={8}
          onOpenAutoFocus={(event) => {
            event.preventDefault();
            inputRef.current?.focus();
          }}
          onEscapeKeyDown={(event) => {
            if (query !== "") {
              event.preventDefault();
              setQuery("");
            }
          }}
        >
          <MenuSearch
            inputRef={inputRef}
            value={query}
            placeholder={`${PROPERTY_LABEL[filter.property]}…`}
            onChange={setQuery}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query !== "") {
                event.preventDefault();
                setQuery("");
              }
            }}
          />
          <div className={css.menuList} role="menu">
            <ValuePanel
              property={filter.property}
              api={api}
              filterId={filter.id}
              query={query}
            />
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
});

const FilterChip = observer(function FilterChip({
  filter,
  api,
}: {
  filter: Filter;
  api: FiltersApi;
}) {
  const operatorItems: MenuItem[] = operatorsFor(filter.property).map((operator) => ({
    label: OPERATOR_LABEL[operator],
    // Empty slot on the inactive rows keeps the labels on one baseline.
    icon:
      operator === filter.operator ? (
        <CheckGlyph />
      ) : (
        <span className={css.menuCheckSlot} />
      ),
    onSelect: () => api.update(filter.id, { operator }),
  }));

  return (
    <div className={css.chip}>
      <span className={css.chipSegment} data-static="true">
        <span className={css.chipIcon} aria-hidden="true">
          {propertyGlyph(filter.property)}
        </span>
        {PROPERTY_LABEL[filter.property]}
      </span>

      <Menu
        trigger={
          <button
            type="button"
            className={css.chipSegment}
            data-operator="true"
            aria-label={`${PROPERTY_LABEL[filter.property]} operator`}
          >
            {OPERATOR_LABEL[filter.operator]}
          </button>
        }
        items={operatorItems}
      />

      <ChipValues filter={filter} api={api} />

      <button
        type="button"
        className={css.chipRemove}
        aria-label={`Remove ${PROPERTY_LABEL[filter.property]} filter`}
        onClick={() => api.remove(filter.id)}
      >
        <CloseGlyph />
      </button>
    </div>
  );
});

/* ================================================================
 * FilterBar
 * ================================================================ */

export const FilterBar = observer(function FilterBar({ viewKey }: { viewKey: string }) {
  const api = useFilters(viewKey);
  if (api.filters.length === 0) return null;

  return (
    <div className={css.bar} role="toolbar" aria-label="Filters">
      {api.filters.map((filter) => (
        <FilterChip key={filter.id} filter={filter} api={api} />
      ))}
      <button type="button" className={css.clearAll} onClick={api.clear}>
        Clear all
      </button>
    </div>
  );
});
