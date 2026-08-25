"use client";

/**
 * Display options for the projects table — MASTER_PROMPT.md §11.1 with the
 * project vocabulary (§10.1): Grouping (Status/Health/Priority/Lead/Team),
 * Ordering, "Show empty groups", and the display-property chip grid whose
 * keys are the table's own columns.
 *
 * Same surface contract as the issue popover (components/issues/
 * DisplayOptions.tsx): controlled Radix Popover anchored end-bottom, toggles
 * and selects never close it, deviation from the project defaults lights the
 * 6px accent dot on the trigger and adds the Reset footer. The stylesheet is
 * imported from the issue popover on purpose — one surface, one set of
 * measurements.
 */

import * as React from "react";
import * as PopoverPrimitive from "@radix-ui/react-popover";
import { observer } from "mobx-react-lite";
import { Button, IconButton } from "@/components/ui/Button";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import { Icon } from "@/components/icons/Icon";
import { useShortcut } from "@/lib/keyboard";
import {
  PROJECT_DISPLAY_PROPERTIES,
  PROJECT_GROUPING_OPTIONS,
  PROJECT_ORDERING_OPTIONS,
  useProjectViewPreference,
} from "@/lib/projects/viewPrefs";
import css from "@/components/issues/displayoptions.module.css";

const GROUPING_OPTIONS: SelectOption[] = PROJECT_GROUPING_OPTIONS.map(
  ({ value, label }) => ({ value, label }),
);

const ORDERING_OPTIONS: SelectOption[] = PROJECT_ORDERING_OPTIONS.map(
  ({ value, label }) => ({ value, label }),
);

/** Spread onto the trigger while open — §6.2 menu-open persistence. */
const MENU_OPEN_ATTR: Record<string, string> = { "data-menu-open": "true" };

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className={css.row}>
      <span className={css.rowLabel}>{label}</span>
      <span className={css.rowControl}>{children}</span>
    </div>
  );
}

const Panel = observer(function Panel({ viewKey }: { viewKey: string }) {
  const { pref, update, isDefault, reset } = useProjectViewPreference(viewKey);
  const grouped = pref.grouping !== "none";

  const toggleProperty = (key: string): void => {
    const active = pref.displayProperties.includes(key);
    update({
      displayProperties: active
        ? pref.displayProperties.filter((held) => held !== key)
        : [...pref.displayProperties, key],
    });
  };

  return (
    <>
      <Row label="Grouping">
        <Select
          label="Grouping"
          value={pref.grouping}
          onValueChange={(value) => update({ grouping: value })}
          options={GROUPING_OPTIONS}
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

      <div className={css.sectionHeader}>List options</div>
      <Row label="Show empty groups">
        <Toggle
          checked={pref.showEmptyGroups}
          disabled={!grouped}
          onChange={(checked) => update({ showEmptyGroups: checked })}
          aria-label="Show empty groups"
        />
      </Row>

      <div className={css.separator} />

      <div className={css.sectionHeader}>Display properties</div>
      <div className={css.chipGrid}>
        {PROJECT_DISPLAY_PROPERTIES.map(({ key, label }) => (
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
        </div>
      ) : null}
    </>
  );
});

export const ProjectDisplayOptionsButton = observer(
  function ProjectDisplayOptionsButton({ viewKey }: { viewKey: string }) {
    const { isDefault } = useProjectViewPreference(viewKey);
    const [open, setOpen] = React.useState(false);

    // §12: Shift+V toggles display options (controlled Radix popover).
    useShortcut(
      {
        id: `project-display-options:${viewKey}`,
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
              // Radix Select menus portal outside this popover's DOM — picking
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
            <Panel viewKey={viewKey} />
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    );
  },
);
