"use client";

import * as React from "react";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { Avatar } from "@/components/ui/Avatar";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { Popover } from "@/components/ui/Popover";
import { PickerMenu, type PickerItem } from "@/components/issues/pickers/PickerMenu";
import { Icon } from "@/components/icons/Icon";
import { PriorityIcon } from "@/components/icons/StatusIcon";
import { HealthIcon, ProjectStatusIcon, projectIconFor } from "./glyphs";
import type {
  Priority,
  ProjectData,
  ProjectHealth,
  ProjectStatusCategory,
} from "@/lib/data/types";
import styles from "./overview.module.css";

/**
 * Anchored option menus for project properties (projects list / overview
 * property pills / details rail). Single-value pickers are built on the Menu
 * primitive (plain option lists); multi-value ones reuse the shared
 * PickerMenu surface (search header + `keepOpen` checklist rows). Every
 * selection issues one optimistic `client.mutate.updateProject` write (§6.8).
 */

// ---------------------------------------------------------------------------
// Status
// ---------------------------------------------------------------------------

const STATUS_OPTIONS: { category: ProjectStatusCategory; label: string }[] = [
  { category: "backlog", label: "Backlog" },
  { category: "planned", label: "Planned" },
  { category: "started", label: "In Progress" },
  { category: "completed", label: "Completed" },
  { category: "canceled", label: "Canceled" },
];

export const ProjectStatusPicker = observer(function ProjectStatusPicker({
  projectId,
  trigger,
}: {
  projectId: string;
  trigger: React.ReactElement;
}) {
  const client = useSyncClient();

  const items: MenuItem[] = STATUS_OPTIONS.map(({ category, label }) => ({
    label,
    icon: (
      <ProjectStatusIcon
        category={category}
        progress={category === "completed" ? 1 : 0}
      />
    ),
    onSelect: () => {
      client.mutate.updateProject(projectId, { statusCategory: category });
    },
  }));

  return <Menu trigger={trigger} items={items} />;
});

// ---------------------------------------------------------------------------
// Priority
// ---------------------------------------------------------------------------

const PRIORITY_OPTIONS: { value: Priority; label: string }[] = [
  { value: 0, label: "No priority" },
  { value: 1, label: "Urgent" },
  { value: 2, label: "High" },
  { value: 3, label: "Medium" },
  { value: 4, label: "Low" },
];

export const ProjectPriorityPicker = observer(function ProjectPriorityPicker({
  projectId,
  trigger,
}: {
  projectId: string;
  trigger: React.ReactElement;
}) {
  const client = useSyncClient();

  const items: MenuItem[] = PRIORITY_OPTIONS.map(({ value, label }) => ({
    label,
    icon: <PriorityIcon priority={value} />,
    onSelect: () => {
      client.mutate.updateProject(projectId, { priority: value });
    },
  }));

  return <Menu trigger={trigger} items={items} />;
});

// ---------------------------------------------------------------------------
// Lead
// ---------------------------------------------------------------------------

/** 16px dashed circle — the "no lead" glyph (dashed-person idiom). */
function NoLeadIcon() {
  return <Icon name="PersonDashed" size={16} color="currentColor" />;
}

export const ProjectLeadPicker = observer(function ProjectLeadPicker({
  projectId,
  trigger,
}: {
  projectId: string;
  trigger: React.ReactElement;
}) {
  const store = useStore();
  const client = useSyncClient();

  const users = store
    .all("User")
    .sort((a, b) => a.displayName.localeCompare(b.displayName));

  const items: MenuItem[] = [
    {
      label: "No lead",
      icon: <NoLeadIcon />,
      onSelect: () => {
        // Wire `null` clears the field (JSON cannot carry undefined);
        // the store's mergeInto normalizes null → undefined locally — the
        // same documented contract as AssigneePicker's assigneeId clear.
        client.mutate.updateProject(projectId, {
          leadId: null as unknown as string,
        });
      },
    },
    ...users.map(
      (user): MenuItem => ({
        label: user.displayName,
        icon: (
          <Avatar
            initials={user.initials}
            color={user.avatarColor}
            src={user.avatarUrl}
            size={16}
          />
        ),
        onSelect: () => {
          client.mutate.updateProject(projectId, { leadId: user.id });
        },
      })
    ),
  ];

  return <Menu trigger={trigger} items={items} />;
});

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

const HEALTH_OPTIONS: { health: ProjectHealth; label: string }[] = [
  { health: "noUpdate", label: "No update" },
  { health: "onTrack", label: "On track" },
  { health: "atRisk", label: "At risk" },
  { health: "offTrack", label: "Off track" },
];

export const ProjectHealthPicker = observer(function ProjectHealthPicker({
  projectId,
  trigger,
  onWriteUpdate,
}: {
  projectId: string;
  trigger: React.ReactElement;
  /** Optional extra row: "Write update…" (capture aria-label on the cell). */
  onWriteUpdate?: () => void;
}) {
  const client = useSyncClient();

  const items: MenuItem[] = HEALTH_OPTIONS.map(({ health, label }) => ({
    label,
    icon: <HealthIcon health={health} />,
    onSelect: () => {
      client.mutate.updateProject(projectId, { health });
    },
  }));

  if (onWriteUpdate !== undefined) {
    items.push(
      { type: "separator" },
      {
        label: "Write update…",
        icon: <Icon name="Compose" size={14} />,
        onSelect: onWriteUpdate,
      },
    );
  }

  return <Menu trigger={trigger} items={items} />;
});

// ---------------------------------------------------------------------------
// Icon + color (8 preset emoji, 8 preset tints — capture-projects.md palette)
// ---------------------------------------------------------------------------

export const PRESET_EMOJIS: readonly string[] = [
  "🚚",
  "📱",
  "🛍️",
  "🖥️",
  "⚙️",
  "🚀",
  "📦",
  "🧭",
];

export const PRESET_COLORS: readonly string[] = [
  "lch(74.025% 57.688 76.196)",
  "#4ea7fc",
  "#bb87fc",
  "#0f7488",
  "#95a2b3",
  "lch(80% 90 85)",
  "#f2994a",
  "#26b5ce",
];

/**
 * "Choose icon" popover — 8 emoji + 8 tints, each writing one optimistic
 * field. Shared by the overview title row and the table's 28px icon tile.
 */
export const ProjectIconPicker = observer(function ProjectIconPicker({
  project,
  trigger,
}: {
  project: ProjectData;
  trigger: React.ReactElement;
}) {
  const client = useSyncClient();
  return (
    <Popover trigger={trigger}>
      <div className={styles.iconMenu}>
        <div className={styles.iconMenuGrid} role="listbox" aria-label="Icon">
          {PRESET_EMOJIS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              className={styles.iconMenuEmoji}
              role="option"
              aria-selected={project.icon === emoji}
              aria-label={`Icon ${emoji}`}
              onClick={() => client.mutate.updateProject(project.id, { icon: emoji })}
            >
              {emoji}
            </button>
          ))}
        </div>
        <div className={styles.iconMenuGrid} role="listbox" aria-label="Color">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              className={styles.iconMenuSwatch}
              aria-pressed={project.color === color}
              aria-label={`Color ${color}`}
              onClick={() => client.mutate.updateProject(project.id, { color })}
            >
              <span
                className={styles.swatchDot}
                style={{ "--swatch-color": color } as React.CSSProperties}
                aria-hidden="true"
              />
            </button>
          ))}
        </div>
      </div>
    </Popover>
  );
});

// ---------------------------------------------------------------------------
// Dates (native date input in a small popover — dark color-scheme)
// ---------------------------------------------------------------------------

/**
 * Date popover shared by the table's target-date cell, the overview property
 * pills, the details rail and the milestone rows: one labelled `input[type=
 * date]` whose change writes through `onSave` and clears through "Remove".
 */
export function DatePopover({
  trigger,
  label,
  value,
  onSave,
  onClear,
}: {
  trigger: React.ReactElement;
  label: string;
  value?: string;
  onSave: (iso: string) => void;
  onClear?: () => void;
}) {
  return (
    <Popover trigger={trigger}>
      <div className={styles.datePopover}>
        <span className={styles.dateLabel}>{label}</span>
        <input
          type="date"
          className={styles.dateInput}
          aria-label={label}
          defaultValue={value !== undefined ? value.slice(0, 10) : ""}
          onChange={(event) => {
            if (event.target.value !== "") onSave(event.target.value);
          }}
        />
        {onClear !== undefined && value !== undefined && value !== "" ? (
          <button type="button" className={styles.dateClear} onClick={onClear}>
            Remove date
          </button>
        ) : null}
      </div>
    </Popover>
  );
}

/** Project start/target date chip. */
export const ProjectDatePicker = observer(function ProjectDatePicker({
  projectId,
  field,
  trigger,
}: {
  projectId: string;
  field: "startDate" | "targetDate";
  trigger: React.ReactElement;
}) {
  const store = useStore();
  const client = useSyncClient();
  const project = store.get("Project", projectId);
  const label = field === "startDate" ? "Start date" : "Target date";

  return (
    <DatePopover
      trigger={trigger}
      label={label}
      value={project?.[field]}
      onSave={(iso) => client.mutate.updateProject(projectId, { [field]: iso })}
      onClear={() =>
        // Wire `null` clears the field (JSON cannot carry undefined); the
        // store's mergeInto normalizes null → undefined locally.
        client.mutate.updateProject(projectId, {
          [field]: null as unknown as string,
        })
      }
    />
  );
});

// ---------------------------------------------------------------------------
// Multi-value pickers (PickerMenu checklist — rows keep the menu open)
// ---------------------------------------------------------------------------

/** Small controlled wrapper: PickerMenu owns search/keyboard, we own `open`. */
function MultiPicker({
  anchor,
  items,
  placeholder,
}: {
  anchor: React.ReactElement;
  items: PickerItem[];
  placeholder: string;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <PickerMenu
      open={open}
      onOpenChange={setOpen}
      anchor={anchor}
      items={items}
      placeholder={placeholder}
    />
  );
}

function toggled(list: readonly string[], id: string): string[] {
  return list.includes(id) ? list.filter((held) => held !== id) : [...list, id];
}

/** Project labels (ProjectData.labelIds). */
export const ProjectLabelPicker = observer(function ProjectLabelPicker({
  projectId,
  trigger,
}: {
  projectId: string;
  trigger: React.ReactElement;
}) {
  const store = useStore();
  const client = useSyncClient();
  const project = store.get("Project", projectId);
  const selected = project?.labelIds ?? [];

  const items: PickerItem[] = store
    .all("Label")
    .filter((label) => !label.isGroup)
    .map((label) => ({
      id: label.id,
      label: label.name,
      selected: selected.includes(label.id),
      keepOpen: true,
      icon: (
        <span
          className={styles.labelSwatch}
          style={{ "--swatch-color": label.color } as React.CSSProperties}
          aria-hidden="true"
        />
      ),
      onSelect: () =>
        client.mutate.updateProject(projectId, {
          labelIds: toggled(selected, label.id),
        }),
    }));

  return <MultiPicker anchor={trigger} items={items} placeholder="Add label…" />;
});

/** Project members (ProjectData.memberIds). */
export const ProjectMembersPicker = observer(function ProjectMembersPicker({
  projectId,
  trigger,
}: {
  projectId: string;
  trigger: React.ReactElement;
}) {
  const store = useStore();
  const client = useSyncClient();
  const project = store.get("Project", projectId);
  const selected = project?.memberIds ?? [];

  const items: PickerItem[] = store
    .all("User")
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((user) => ({
      id: user.id,
      label: user.displayName,
      selected: selected.includes(user.id),
      keepOpen: true,
      icon: (
        <Avatar
          initials={user.initials}
          color={user.avatarColor}
          src={user.avatarUrl}
          size={16}
        />
      ),
      onSelect: () =>
        client.mutate.updateProject(projectId, {
          memberIds: toggled(selected, user.id),
        }),
    }));

  return <MultiPicker anchor={trigger} items={items} placeholder="Add member…" />;
});

/** Project teams (ProjectData.teamIds — first entry is the lead team). */
export const ProjectTeamsPicker = observer(function ProjectTeamsPicker({
  projectId,
  trigger,
}: {
  projectId: string;
  trigger: React.ReactElement;
}) {
  const store = useStore();
  const client = useSyncClient();
  const project = store.get("Project", projectId);
  const selected = project?.teamIds ?? [];

  const items: PickerItem[] = store
    .all("Team")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((team) => ({
      id: team.id,
      label: team.name,
      selected: selected.includes(team.id),
      keepOpen: true,
      icon: <Icon name={team.icon} size={14} color={team.color} />,
      onSelect: () =>
        client.mutate.updateProject(projectId, { teamIds: toggled(selected, team.id) }),
    }));

  return <MultiPicker anchor={trigger} items={items} placeholder="Add team…" />;
});

/**
 * Lead team = `teamIds[0]` (the capture shows Lead team and Teams as separate
 * rows over one team set), so picking one moves it to the front.
 */
export const ProjectLeadTeamPicker = observer(function ProjectLeadTeamPicker({
  projectId,
  trigger,
}: {
  projectId: string;
  trigger: React.ReactElement;
}) {
  const store = useStore();
  const client = useSyncClient();
  const project = store.get("Project", projectId);
  const teamIds = project?.teamIds ?? [];

  const items: MenuItem[] = store
    .all("Team")
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((team) => ({
      label: team.name,
      icon: <Icon name={team.icon} size={14} color={team.color} />,
      onSelect: () =>
        client.mutate.updateProject(projectId, {
          teamIds: [team.id, ...teamIds.filter((id) => id !== team.id)],
        }),
    }));

  return <Menu trigger={trigger} items={items} />;
});

/** Project dependencies (ProjectData.dependsOnIds). */
export const ProjectDependencyPicker = observer(function ProjectDependencyPicker({
  projectId,
  trigger,
}: {
  projectId: string;
  trigger: React.ReactElement;
}) {
  const store = useStore();
  const client = useSyncClient();
  const project = store.get("Project", projectId);
  const selected = project?.dependsOnIds ?? [];

  const items: PickerItem[] = store
    .all("Project")
    .filter((candidate) => candidate.id !== projectId)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((candidate) => ({
      id: candidate.id,
      label: candidate.name,
      selected: selected.includes(candidate.id),
      keepOpen: true,
      icon: projectIconFor(candidate),
      onSelect: () =>
        client.mutate.updateProject(projectId, {
          dependsOnIds: toggled(selected, candidate.id),
        }),
    }));

  return <MultiPicker anchor={trigger} items={items} placeholder="Depends on…" />;
});

/** Milestone target date (Milestone rows in the rail + overview cards). */
export const MilestoneDatePicker = observer(function MilestoneDatePicker({
  milestoneId,
  trigger,
}: {
  milestoneId: string;
  trigger: React.ReactElement;
}) {
  const store = useStore();
  const client = useSyncClient();
  const milestone = store.get("Milestone", milestoneId);

  return (
    <DatePopover
      trigger={trigger}
      label="Target date"
      value={milestone?.targetDate}
      onSave={(iso) =>
        client.queue.enqueue("update", "Milestone", milestoneId, { targetDate: iso })
      }
      onClear={() =>
        client.queue.enqueue("update", "Milestone", milestoneId, { targetDate: null })
      }
    />
  );
});
