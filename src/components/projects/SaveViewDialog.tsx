"use client";

/**
 * "Add new view" for the projects surface — MASTER_PROMPT.md §10.1 (the `+`
 * next to the "All projects" tab) and §11.2 ("Save as view").
 *
 * A saved view IS a named filter, and that record already exists: the
 * localStorage-backed `customViews` store in components/nav/ViewsPage.tsx.
 * This dialog imports its helpers (`appendCustomView`, `newViewId`,
 * `VIEW_ICONS`, `VIEW_COLORS`) instead of forking a second store, so a view
 * saved here shows up on /views/projects immediately and its row links back
 * to `/:ws/projects/all?filter=…`.
 */

import * as React from "react";
import { observer } from "mobx-react-lite";
import {
  serializeProjectFilters,
  useProjectFilters,
} from "@/lib/projects/filters";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Icon } from "@/components/icons/Icon";
import {
  VIEW_COLORS,
  VIEW_ICONS,
  appendCustomView,
  newViewId,
  type ViewsTab,
} from "@/components/nav/ViewsPage";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";
import css from "./dialogs.module.css";

export function SaveViewDialog({
  open,
  onOpenChange,
  type,
  filter,
  defaultName,
  teamKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Which tab of /views the saved row lands on. */
  type: ViewsTab;
  /** Serialized chip row (`?filter=` verbatim) the view replays. */
  filter: string;
  defaultName: string;
  /**
   * Team the saved view reopens against (§10.7). Omitted on the workspace
   * projects list, which is genuinely cross-team.
   */
  teamKey?: string;
}) {
  const [name, setName] = React.useState(defaultName);
  const [icon, setIcon] = React.useState<string>(VIEW_ICONS[0] ?? "CustomView");
  const [color, setColor] = React.useState<string>(VIEW_COLORS[0] ?? "#5e6ad2");

  // Fresh form on every open (resetting on close would flash mid-fade).
  React.useEffect(() => {
    if (!open) return;
    setName(defaultName);
    setIcon(VIEW_ICONS[0] ?? "CustomView");
    setColor(VIEW_COLORS[0] ?? "#5e6ad2");
  }, [open, defaultName]);

  const trimmed = name.trim();
  const chipCount = filter === "" ? 0 : filter.split(";").filter((c) => c !== "").length;

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (trimmed === "") return;
    appendCustomView({
      id: newViewId(),
      name: trimmed,
      icon,
      color,
      type,
      ...(teamKey === undefined ? null : { teamKey }),
      filter,
      ownerId: CURRENT_USER_ID,
    });
    onOpenChange(false);
    showToast(`Saved view “${trimmed}”`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} width={400} label="Save view">
      <form className={css.dialog} onSubmit={submit}>
        <div className={css.header}>
          <span className={css.title}>Save view</span>
          <span className={css.headerMeta}>
            {chipCount === 0
              ? "No filters"
              : `${chipCount} filter${chipCount === 1 ? "" : "s"}`}
          </span>
        </div>

        <div className={css.body}>
          <Input
            inputSize="sm"
            value={name}
            placeholder="View name"
            aria-label="View name"
            autoComplete="off"
            spellCheck={false}
            autoFocus
            onChange={(event) => setName(event.target.value)}
          />

          <div className={css.field}>
            <span className={css.fieldLabel}>Icon</span>
            <div className={css.choiceRow} role="radiogroup" aria-label="View icon">
              {VIEW_ICONS.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={choice === icon}
                  aria-label={choice}
                  className={css.choice}
                  data-selected={choice === icon ? "true" : undefined}
                  onClick={() => setIcon(choice)}
                >
                  <Icon name={choice} size={16} color={color} />
                </button>
              ))}
            </div>
          </div>

          <div className={css.field}>
            <span className={css.fieldLabel}>Color</span>
            <div className={css.choiceRow} role="radiogroup" aria-label="View color">
              {VIEW_COLORS.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={choice === color}
                  aria-label={choice}
                  className={css.choice}
                  data-selected={choice === color ? "true" : undefined}
                  onClick={() => setColor(choice)}
                >
                  <span
                    className={css.swatch}
                    style={{ "--swatch-color": choice } as React.CSSProperties}
                    aria-hidden="true"
                  />
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={css.footer}>
          <Button variant="ghost" size={28} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size={28} type="submit" disabled={trimmed === ""}>
            Save view
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

/**
 * The projects-list flavour: reads the live chip row out of `?filter=` and
 * saves it verbatim. Mount under <Suspense> (useSearchParams).
 */
export const SaveProjectViewDialog = observer(function SaveProjectViewDialog({
  open,
  onOpenChange,
  viewKey,
  defaultName,
  teamKey,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  viewKey: string;
  defaultName: string;
  /** Set on a team's project list; omitted on the workspace one. */
  teamKey?: string;
}) {
  const { filters } = useProjectFilters(viewKey);
  return (
    <SaveViewDialog
      open={open}
      onOpenChange={onOpenChange}
      type="projects"
      filter={serializeProjectFilters(filters)}
      defaultName={defaultName}
      teamKey={teamKey}
    />
  );
});
