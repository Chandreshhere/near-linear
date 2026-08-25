"use client";

/**
 * "New project" dialog — MASTER_PROMPT.md §10.1 (header primary action) and
 * §14's create-modal idiom applied to projects.
 *
 * Every field maps to a real ProjectData column; submitting writes ONE
 * optimistic create through the transaction queue (§6.8: mutate → enqueue →
 * close, no spinner), drops a matching "created" Activity row so the project
 * Activity tab is truthful from the first second, routes to the new
 * project's overview and confirms with a toast.
 *
 * The slug follows the captured route shape `name-slug-<12hex>`
 * (`driver-app-0f150687c354`) and is deterministic in the row id: the first
 * 12 hex digits of the project's uuid.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select, type SelectOption } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";
import type {
  ActivityData,
  Priority,
  ProjectData,
  ProjectStatusCategory,
} from "@/lib/data/types";
import { PRESET_COLORS, PRESET_EMOJIS } from "./pickers";
import css from "./dialogs.module.css";

const STATUS_OPTIONS: SelectOption[] = [
  { value: "backlog", label: "Backlog" },
  { value: "planned", label: "Planned" },
  { value: "started", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

const PRIORITY_OPTIONS: SelectOption[] = [
  { value: "0", label: "No priority" },
  { value: "1", label: "Urgent" },
  { value: "2", label: "High" },
  { value: "3", label: "Medium" },
  { value: "4", label: "Low" },
];

const NO_LEAD = "none";

function isStatusCategory(value: string): value is ProjectStatusCategory {
  return (
    value === "backlog" ||
    value === "planned" ||
    value === "started" ||
    value === "completed" ||
    value === "canceled"
  );
}

function isPriority(value: number): value is Priority {
  return value === 0 || value === 1 || value === 2 || value === 3 || value === 4;
}

/** "Driver App" → "driver-app" (route-safe, capture slug shape). */
export function slugifyName(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "project" : slug;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `p-${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 10)}`;
}

/** First 12 hex digits of the row id — the captured `-0f150687c354` suffix. */
function shortIdOf(id: string): string {
  const hex = id.replace(/[^0-9a-f]/gi, "").toLowerCase();
  return (hex + "0123456789ab").slice(0, 12);
}

export const NewProjectDialog = observer(function NewProjectDialog({
  open,
  onOpenChange,
  workspace,
  teamId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspace: string;
  /** Team page → the new project starts scoped to that team. */
  teamId?: string;
}) {
  const store = useStore();
  const client = useSyncClient();
  const router = useRouter();

  const [name, setName] = React.useState("");
  const [summary, setSummary] = React.useState("");
  const [icon, setIcon] = React.useState<string>(PRESET_EMOJIS[0] ?? "🚀");
  const [color, setColor] = React.useState<string>(PRESET_COLORS[0] ?? "#4ea7fc");
  const [statusCategory, setStatusCategory] = React.useState("backlog");
  const [priority, setPriority] = React.useState("0");
  const [leadId, setLeadId] = React.useState(NO_LEAD);
  const [targetDate, setTargetDate] = React.useState("");
  const [teamIds, setTeamIds] = React.useState<string[]>([]);

  const teams = store.all("Team").sort((a, b) => a.sortOrder - b.sortOrder);
  const users = store.all("User").sort((a, b) => a.displayName.localeCompare(b.displayName));

  // Fresh form on every open (resetting on close would flash mid-fade).
  React.useEffect(() => {
    if (!open) return;
    setName("");
    setSummary("");
    setIcon(PRESET_EMOJIS[0] ?? "🚀");
    setColor(PRESET_COLORS[0] ?? "#4ea7fc");
    setStatusCategory("backlog");
    setPriority("0");
    setLeadId(CURRENT_USER_ID);
    setTargetDate("");
    setTeamIds(teamId !== undefined ? [teamId] : []);
  }, [open, teamId]);

  const leadOptions: SelectOption[] = [
    { value: NO_LEAD, label: "No lead" },
    ...users.map((user) => ({ value: user.id, label: user.displayName })),
  ];

  const trimmed = name.trim();

  const submit = (event: React.FormEvent): void => {
    event.preventDefault();
    if (trimmed === "") return;

    const id = newId();
    const slug = `${slugifyName(trimmed)}-${shortIdOf(id)}`;
    const now = new Date().toISOString();
    const priorityValue = Number(priority);
    const maxSort = store
      .all("Project")
      .reduce((max, project) => Math.max(max, project.sortOrder), 0);

    const row: ProjectData = {
      id,
      slug,
      name: trimmed,
      icon,
      color,
      summary: summary.trim() === "" ? undefined : summary.trim(),
      statusCategory: isStatusCategory(statusCategory) ? statusCategory : "backlog",
      health: "noUpdate",
      priority: isPriority(priorityValue) ? priorityValue : 0,
      leadId: leadId === NO_LEAD ? undefined : leadId,
      memberIds: leadId === NO_LEAD ? [] : [leadId],
      teamIds: [...teamIds],
      targetDate: targetDate === "" ? undefined : targetDate,
      labelIds: [],
      resources: [],
      sortOrder: maxSort + 100,
      createdAt: now,
      updatedAt: now,
    };

    client.queue.enqueue("create", "Project", id, row as unknown as Record<string, unknown>);

    const activity: ActivityData = {
      id: newId(),
      projectId: id,
      actorId: CURRENT_USER_ID,
      type: "created",
      createdAt: now,
    };
    client.queue.enqueue(
      "create",
      "Activity",
      activity.id,
      activity as unknown as Record<string, unknown>,
    );

    onOpenChange(false);
    showToast(`Created “${trimmed}”`);
    router.push(`/${workspace}/project/${slug}/overview`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} width={560} label="New project">
      <form className={css.dialog} onSubmit={submit}>
        <div className={css.header}>
          <span className={css.title}>New project</span>
        </div>

        <div className={css.body}>
          <div className={css.titleRow}>
            <span className={css.iconPreview} aria-hidden="true">
              {icon}
            </span>
            <Input
              inputSize="sm"
              value={name}
              placeholder="Project name"
              aria-label="Project name"
              autoComplete="off"
              spellCheck={false}
              autoFocus
              onChange={(event) => setName(event.target.value)}
            />
          </div>

          <Input
            inputSize="sm"
            value={summary}
            placeholder="Add a short summary…"
            aria-label="Project summary"
            autoComplete="off"
            onChange={(event) => setSummary(event.target.value)}
          />

          <div className={css.field}>
            <span className={css.fieldLabel}>Icon</span>
            <div className={css.choiceRow} role="radiogroup" aria-label="Project icon">
              {PRESET_EMOJIS.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={choice === icon}
                  aria-label={`Icon ${choice}`}
                  className={css.choice}
                  data-selected={choice === icon ? "true" : undefined}
                  onClick={() => setIcon(choice)}
                >
                  {choice}
                </button>
              ))}
            </div>
          </div>

          <div className={css.field}>
            <span className={css.fieldLabel}>Color</span>
            <div className={css.choiceRow} role="radiogroup" aria-label="Project color">
              {PRESET_COLORS.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  role="radio"
                  aria-checked={choice === color}
                  aria-label={`Color ${choice}`}
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

          <div className={css.grid}>
            <span className={css.gridLabel}>Status</span>
            <Select
              label="Status"
              value={statusCategory}
              onValueChange={setStatusCategory}
              options={STATUS_OPTIONS}
            />

            <span className={css.gridLabel}>Priority</span>
            <Select
              label="Priority"
              value={priority}
              onValueChange={setPriority}
              options={PRIORITY_OPTIONS}
            />

            <span className={css.gridLabel}>Lead</span>
            <Select
              label="Lead"
              value={leadId}
              onValueChange={setLeadId}
              options={leadOptions}
            />

            <label className={css.gridLabel} htmlFor="new-project-target">
              Target date
            </label>
            <input
              id="new-project-target"
              type="date"
              className={css.dateInput}
              aria-label="Target date"
              value={targetDate}
              onChange={(event) => setTargetDate(event.target.value)}
            />
          </div>

          <div className={css.field}>
            <span className={css.fieldLabel}>Teams</span>
            <div className={css.teamGrid} role="group" aria-label="Teams">
              {teams.map((team) => (
                <span key={team.id} className={css.teamRow}>
                  <Checkbox
                    checked={teamIds.includes(team.id)}
                    label={team.name}
                    onChange={(checked) =>
                      setTeamIds((prev) =>
                        checked
                          ? [...prev, team.id]
                          : prev.filter((id) => id !== team.id),
                      )
                    }
                  />
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className={css.footer}>
          <Button variant="ghost" size={28} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" size={28} type="submit" disabled={trimmed === ""}>
            Create project
          </Button>
        </div>
      </form>
    </Dialog>
  );
});
