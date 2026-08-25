"use client";

import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  SettingsCard,
  SettingsCustomRow,
  SettingsEmptyRow,
  SettingsPageHeader,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type { LabelData, TeamData } from "@/lib/data/types";
import styles from "@/components/settings/settings.module.css";

/**
 * Settings → Issues → Labels. Real CRUD against the `Label` pool through the
 * optimistic transaction queue: create, rename, recolor and delete all apply
 * instantly and sync like every other write.
 */

const PALETTE = [
  "#bec2c8",
  "#95a2b3",
  "#5e6ad2",
  "#26b5ce",
  "#0f7488",
  "#4cb782",
  "#4ea7fc",
  "#f2c94c",
  "#f2994a",
  "#eb5757",
  "#bb87fc",
  "#e493c4",
];

function newLabelId(): string {
  const c = globalThis.crypto;
  const id =
    typeof c?.randomUUID === "function"
      ? c.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `label-${id}`;
}

export const LabelsView = observer(function LabelsView() {
  const store = useStore();
  const client = useSyncClient();

  const labels = store
    .all("Label")
    .filter((label) => !label.isGroup)
    .slice()
    .sort((a, b) => a.name.localeCompare(b.name));

  const teams = store
    .all("Team")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const workspaceLabels = labels.filter((label) => label.teamId === undefined);
  const teamLabels = teams
    .map((team) => ({ team, items: labels.filter((l) => l.teamId === team.id) }))
    .filter((group) => group.items.length > 0);

  const [creating, setCreating] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftColor, setDraftColor] = useState(PALETTE[2] ?? "#5e6ad2");

  const createLabel = () => {
    const name = draftName.trim();
    if (name === "") return;
    const row: LabelData = {
      id: newLabelId(),
      name,
      color: draftColor,
      isGroup: false,
    };
    client.queue.enqueue("create", "Label", row.id, row as unknown as Record<string, unknown>);
    setDraftName("");
    setCreating(false);
  };

  return (
    <>
      <SettingsPageHeader
        title="Labels"
        description="Labels categorize issues across the workspace. Team labels are only offered on that team's issues."
      />

      <SettingsSections>
        <SettingsSection
          id="workspace-labels"
          title="Workspace labels"
          description="Available on every issue in every team."
        >
          <SettingsCard
            footer={
              creating ? (
                <span className={styles.inlineForm}>
                  <Input
                    inputSize="sm"
                    className={styles.inlineInput}
                    autoFocus
                    maxLength={64}
                    placeholder="Label name"
                    aria-label="New label name"
                    value={draftName}
                    onChange={(e) => setDraftName(e.currentTarget.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") createLabel();
                      if (e.key === "Escape") setCreating(false);
                    }}
                  />
                  <Swatches value={draftColor} onChange={setDraftColor} />
                  <Button
                    variant="primary"
                    size={32}
                    disabled={draftName.trim() === ""}
                    onClick={createLabel}
                  >
                    Create
                  </Button>
                  <Button variant="ghost" size={32} onClick={() => setCreating(false)}>
                    Cancel
                  </Button>
                </span>
              ) : (
                <>
                  <span className={styles.fieldHint}>
                    {workspaceLabels.length} workspace{" "}
                    {workspaceLabels.length === 1 ? "label" : "labels"}
                  </span>
                  <Button variant="secondary" size={32} onClick={() => setCreating(true)}>
                    New label
                  </Button>
                </>
              )
            }
          >
            {workspaceLabels.length === 0 ? (
              <SettingsEmptyRow>
                No workspace labels yet — create one to start categorizing issues.
              </SettingsEmptyRow>
            ) : (
              workspaceLabels.map((label) => <LabelRow key={label.id} label={label} />)
            )}
          </SettingsCard>
        </SettingsSection>

        {teamLabels.map(({ team, items }) => (
          <TeamLabelSection key={team.id} team={team} items={items} />
        ))}
      </SettingsSections>
    </>
  );
});

function TeamLabelSection({ team, items }: { team: TeamData; items: LabelData[] }) {
  return (
    <SettingsSection
      id={`team-labels-${team.key.toLowerCase()}`}
      title={`${team.name} labels`}
      description="Only offered on this team's issues."
    >
      <SettingsCard>
        {items.map((label) => (
          <LabelRow key={label.id} label={label} />
        ))}
      </SettingsCard>
    </SettingsSection>
  );
}

const LabelRow = observer(function LabelRow({ label }: { label: LabelData }) {
  const store = useStore();
  const client = useSyncClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(label.name);

  const usage = store
    .all("Issue")
    .filter((issue) => !issue.archivedAt && issue.labelIds.includes(label.id)).length;

  const commit = () => {
    const value = name.trim();
    setEditing(false);
    if (value === "" || value === label.name) {
      setName(label.name);
      return;
    }
    client.queue.enqueue("update", "Label", label.id, { name: value });
  };

  if (editing) {
    return (
      <SettingsCustomRow>
        <span className={styles.inlineForm}>
          <Input
            inputSize="sm"
            className={styles.inlineInput}
            autoFocus
            maxLength={64}
            aria-label={`Rename ${label.name}`}
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commit();
              if (e.key === "Escape") {
                setName(label.name);
                setEditing(false);
              }
            }}
          />
          <Swatches
            value={label.color}
            onChange={(color) =>
              client.queue.enqueue("update", "Label", label.id, { color })
            }
          />
          <Button variant="primary" size={32} onClick={commit}>
            Save
          </Button>
        </span>
      </SettingsCustomRow>
    );
  }

  return (
    <SettingsCustomRow>
      <span className={styles.rowText}>
        <span className={styles.rowLabel}>
          <span
            className={styles.dot}
            style={{ background: label.color, display: "inline-block", marginRight: 8, verticalAlign: -1 }}
            aria-hidden="true"
          />
          {label.name}
        </span>
        <span className={styles.rowDescription}>
          {usage === 0 ? "Not used yet" : `Used on ${usage} ${usage === 1 ? "issue" : "issues"}`}
        </span>
      </span>
      <span className={styles.rowControl}>
        <Button
          variant="ghost"
          size={32}
          aria-label={`Rename ${label.name}`}
          onClick={() => {
            setName(label.name);
            setEditing(true);
          }}
        >
          Rename
        </Button>
        <Button
          variant="ghost"
          size={32}
          aria-label={`Delete ${label.name}`}
          onClick={() => client.queue.enqueue("delete", "Label", label.id)}
        >
          Delete
        </Button>
      </span>
    </SettingsCustomRow>
  );
});

function Swatches({
  value,
  onChange,
}: {
  value: string;
  onChange: (color: string) => void;
}) {
  return (
    <span className={styles.swatchRow} role="group" aria-label="Label color">
      {PALETTE.map((color) => (
        <button
          key={color}
          type="button"
          className={styles.swatch}
          style={{ background: color }}
          aria-label={`Color ${color}`}
          aria-pressed={color === value}
          onClick={() => onChange(color)}
        />
      ))}
    </span>
  );
}
