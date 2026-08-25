"use client";

/**
 * Project filter chrome — MASTER_PROMPT.md §11.2 applied to §10.1.
 *
 *  · <AddProjectFilterButton> — the 28px funnel (also bound to `F`): search
 *    header with the `F` keycap, then the five project properties, each
 *    drilling into a real multi-select checklist of store values.
 *  · <ProjectFilterBar> — the chip row under the header: property (static) ·
 *    operator (menu) · values (checklist) · ✕, plus "Clear all".
 *
 * Structure, markup and stylesheet are the issue filter bar's
 * (components/issues/FilterBar.tsx + filterbar.module.css) — one surface,
 * one set of measurements; only the vocabulary comes from
 * lib/projects/filters.ts.
 */

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { observer } from "mobx-react-lite";
import { useStore } from "@/lib/data/DataProvider";
import { useShortcut } from "@/lib/keyboard";
import {
  OPERATOR_LABEL,
  PROJECT_PROPERTY_LABEL,
  NO_VALUE,
  autoSwitchProjectOperator,
  defaultProjectOperator,
  projectFilterValueLabel,
  projectFilterValueOptions,
  projectOperatorsFor,
  useProjectFilters,
  type ProjectFilter,
  type ProjectFilterProperty,
  type ProjectFiltersApi,
} from "@/lib/projects/filters";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { IconButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Kbd } from "@/components/ui/Kbd";
import { Icon } from "@/components/icons/Icon";
import { SettingsGlyph } from "@/components/settings/glyphs";
import { PriorityIcon } from "@/components/icons/StatusIcon";
import { HealthIcon, ProjectStatusIcon } from "@/components/projects/glyphs";
import type { SyncStore } from "@/lib/data/store";
import type { ProjectHealth, ProjectStatusCategory } from "@/lib/data/types";
import css from "@/components/issues/filterbar.module.css";

/* ================================================================
 * Menu vocabulary
 * ================================================================ */

const FILTER_ITEMS: { property: ProjectFilterProperty; icon: string }[] = [
  { property: "status", icon: "Project" },
  { property: "health", icon: "Insights" },
  { property: "priority", icon: "DisplayOptions" },
  { property: "lead", icon: "MyIssues" },
  { property: "team", icon: "Team" },
];

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

function isHealth(value: string): value is ProjectHealth {
  return (
    value === "onTrack" ||
    value === "atRisk" ||
    value === "offTrack" ||
    value === "noUpdate"
  );
}

function isStatusCategory(value: string): value is ProjectStatusCategory {
  return (
    value === "backlog" ||
    value === "planned" ||
    value === "started" ||
    value === "completed" ||
    value === "canceled"
  );
}

/** Leading glyph for a property — chip head and menu row share it. */
function propertyGlyph(property: ProjectFilterProperty): React.ReactNode {
  switch (property) {
    case "status":
      return <ProjectStatusIcon category="started" size={14} />;
    case "health":
      return <HealthIcon health="onTrack" size={14} />;
    case "priority":
      return <PriorityIcon priority={2} size={14} />;
    case "lead":
      return <Icon name="MyIssues" size={14} />;
    case "team":
      return <Icon name="Team" size={14} />;
  }
}

/** Leading glyph for one selectable value inside the checklist. */
function valueGlyph(
  property: ProjectFilterProperty,
  value: string,
  store: SyncStore,
): React.ReactNode {
  switch (property) {
    case "status":
      return isStatusCategory(value) ? (
        <ProjectStatusIcon category={value} size={14} />
      ) : null;
    case "health":
      return isHealth(value) ? <HealthIcon health={value} size={14} /> : null;
    case "priority": {
      const priority = Number(value);
      return priority >= 0 && priority <= 4 ? (
        <PriorityIcon priority={priority as 0 | 1 | 2 | 3 | 4} size={14} />
      ) : null;
    }
    case "lead": {
      if (value === NO_VALUE) return <Icon name="MyIssues" size={14} />;
      const user = store.get("User", value);
      return user === undefined ? (
        <Icon name="MyIssues" size={14} />
      ) : (
        <Avatar initials={user.initials} color={user.avatarColor} size={16} />
      );
    }
    case "team": {
      if (value === NO_VALUE) return <Icon name="Team" size={14} />;
      const team = store.get("Team", value);
      return team === undefined ? (
        <Icon name="Team" size={14} />
      ) : (
        <Icon name={team.icon} size={14} color={team.color} />
      );
    }
  }
}

/* ================================================================
 * Value checklist
 * ================================================================ */

/** Toggle one value on the chip that owns `property`, creating it on first pick. */
function toggleValue(
  api: ProjectFiltersApi,
  property: ProjectFilterProperty,
  value: string,
  filterId?: string,
): void {
  const target =
    filterId !== undefined
      ? api.filters.find((filter) => filter.id === filterId)
      : api.filters.find((filter) => filter.property === property);

  if (target === undefined) {
    api.add({ property, operator: defaultProjectOperator(1), values: [value] });
    return;
  }

  const values = target.values.includes(value)
    ? target.values.filter((held) => held !== value)
    : [...target.values, value];
  api.update(target.id, {
    values,
    operator: autoSwitchProjectOperator(target.operator, values.length),
  });
}

const ValueRows = observer(function ValueRows({
  property,
  selected,
  query,
  onToggle,
}: {
  property: ProjectFilterProperty;
  selected: readonly string[];
  query: string;
  onToggle: (value: string) => void;
}) {
  const store = useStore();
  const options = projectFilterValueOptions(property, store);
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
 * AddProjectFilterButton
 * ================================================================ */

const MENU_OPEN_ATTR: Record<string, string> = { "data-menu-open": "true" };

export const AddProjectFilterButton = observer(function AddProjectFilterButton({
  viewKey,
}: {
  viewKey: string;
}) {
  const api = useProjectFilters(viewKey);
  const [open, setOpen] = React.useState(false);
  const [panel, setPanel] = React.useState<ProjectFilterProperty | null>(null);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  // §12: `F` opens the filter menu. Mounting IS the scope — only filterable
  // views render this button.
  useShortcut(
    {
      id: "project-filters.open",
      keys: "f",
      description: "Filter",
      handler: () => setOpen(true),
    },
    [],
  );

  React.useEffect(() => {
    if (open) {
      setPanel(null);
      setQuery("");
    }
  }, [open]);

  const openPanel = (property: ProjectFilterProperty): void => {
    setPanel(property);
    setQuery("");
    inputRef.current?.focus();
  };

  const backToRoot = (): void => {
    setPanel(null);
    setQuery("");
    inputRef.current?.focus();
  };

  // §6.9: clear the search text, then leave the submenu, then close.
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
      ? FILTER_ITEMS
      : FILTER_ITEMS.filter((item) =>
          PROJECT_PROPERTY_LABEL[item.property].toLowerCase().includes(needle),
        );

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
                    key={item.property}
                    type="button"
                    role="menuitem"
                    className={css.menuItem}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openPanel(item.property)}
                  >
                    <span className={css.menuItemIcon} aria-hidden="true">
                      <Icon name={item.icon} size={14} />
                    </span>
                    <span className={css.menuItemLabel}>
                      {PROJECT_PROPERTY_LABEL[item.property]}
                    </span>
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
                placeholder={`${PROJECT_PROPERTY_LABEL[panel]}…`}
                onChange={setQuery}
                onKeyDown={onSearchKeyDown}
                onBack={backToRoot}
              />
              <div
                className={css.menuList}
                role="menu"
                aria-label={`Filter by ${PROJECT_PROPERTY_LABEL[panel]}`}
              >
                <ValueRows
                  property={panel}
                  selected={activeFilter?.values ?? []}
                  query={query}
                  onToggle={(value) => toggleValue(api, panel, value)}
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
 * Chips
 * ================================================================ */

const ChipValues = observer(function ChipValues({
  filter,
  api,
}: {
  filter: ProjectFilter;
  api: ProjectFiltersApi;
}) {
  const store = useStore();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  // Up to two labels, then "+N" (§11.2 chip anatomy).
  const shown = filter.values
    .slice(0, 2)
    .map((value) => projectFilterValueLabel(filter.property, value, store));
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
          aria-label={`${PROJECT_PROPERTY_LABEL[filter.property]} values`}
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
            placeholder={`${PROJECT_PROPERTY_LABEL[filter.property]}…`}
            onChange={setQuery}
            onKeyDown={(event) => {
              if (event.key === "Escape" && query !== "") {
                event.preventDefault();
                setQuery("");
              }
            }}
          />
          <div className={css.menuList} role="menu">
            <ValueRows
              property={filter.property}
              selected={filter.values}
              query={query}
              onToggle={(value) => toggleValue(api, filter.property, value, filter.id)}
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
  filter: ProjectFilter;
  api: ProjectFiltersApi;
}) {
  const operatorItems: MenuItem[] = projectOperatorsFor(filter.property).map(
    (operator) => ({
      label: OPERATOR_LABEL[operator],
      icon:
        operator === filter.operator ? (
          <CheckGlyph />
        ) : (
          <span className={css.menuCheckSlot} />
        ),
      onSelect: () => api.update(filter.id, { operator }),
    }),
  );

  return (
    <div className={css.chip}>
      <span className={css.chipSegment} data-static="true">
        <span className={css.chipIcon} aria-hidden="true">
          {propertyGlyph(filter.property)}
        </span>
        {PROJECT_PROPERTY_LABEL[filter.property]}
      </span>

      <Menu
        trigger={
          <button
            type="button"
            className={css.chipSegment}
            data-operator="true"
            aria-label={`${PROJECT_PROPERTY_LABEL[filter.property]} operator`}
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
        aria-label={`Remove ${PROJECT_PROPERTY_LABEL[filter.property]} filter`}
        onClick={() => api.remove(filter.id)}
      >
        <CloseGlyph />
      </button>
    </div>
  );
});

export const ProjectFilterBar = observer(function ProjectFilterBar({
  viewKey,
}: {
  viewKey: string;
}) {
  const api = useProjectFilters(viewKey);
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
