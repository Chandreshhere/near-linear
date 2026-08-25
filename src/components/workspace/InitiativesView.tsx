"use client";

/**
 * `/:ws/initiatives` — "Initiatives" from the sidebar's Try section.
 *
 * Initiatives are the workspace-level container a set of projects rolls up
 * to. The model (`InitiativeData`, types.ts) was added for this surface, so
 * the list, the create dialog, the status changes and the deletes are all
 * real rows moving through the local-first engine.
 */

import { useState, type JSX } from "react";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dialog } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Input";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { Select } from "@/components/ui/Select";
import { Header } from "@/components/shell/Header";
import { useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";
import type { InitiativeData, InitiativeStatus } from "@/lib/data/types";
import { InitiativeRollupMark } from "./glyphs";
import styles from "./directory.module.css";

const STATUS_OPTIONS: { value: InitiativeStatus; label: string }[] = [
  { value: "planned", label: "Planned" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "canceled", label: "Canceled" },
];

const STATUS_LABEL: Record<InitiativeStatus, string> = {
  planned: "Planned",
  active: "Active",
  completed: "Completed",
  canceled: "Canceled",
};

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  const suffix = Math.random().toString(16).slice(2, 6);
  return `${base === "" ? "initiative" : base}-${suffix}`;
}

function formatDate(iso: string | undefined): string {
  if (iso === undefined || iso === "") return "—";
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "—";
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export const InitiativesView = observer(function InitiativesView(): JSX.Element {
  const client = useSyncClient();
  const store = client.store;

  const [createOpen, setCreateOpen] = useState(false);
  const [deleting, setDeleting] = useState<InitiativeData | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<InitiativeStatus>("planned");
  const [targetDate, setTargetDate] = useState("");
  const [projectIds, setProjectIds] = useState<string[]>([]);

  const initiatives = store
    .all("Initiative")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  const projects = store
    .all("Project")
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const openCreate = (): void => {
    setName("");
    setDescription("");
    setStatus("planned");
    setTargetDate("");
    setProjectIds([]);
    setCreateOpen(true);
  };

  const create = (): void => {
    const trimmed = name.trim();
    if (trimmed === "") return;
    const now = new Date().toISOString();
    const row: InitiativeData = {
      id: crypto.randomUUID(),
      slug: slugify(trimmed),
      name: trimmed,
      description: description.trim() === "" ? undefined : description.trim(),
      status,
      ownerId: CURRENT_USER_ID,
      projectIds: [...projectIds],
      targetDate: targetDate === "" ? undefined : targetDate,
      sortOrder:
        initiatives.reduce((max, i) => Math.max(max, i.sortOrder), 0) + 100,
      createdAt: now,
      updatedAt: now,
    };
    client.queue.enqueue(
      "create",
      "Initiative",
      row.id,
      row as unknown as Record<string, unknown>,
    );
    setCreateOpen(false);
    showToast(`Created ${row.name}`);
  };

  const setStatusOf = (initiative: InitiativeData, next: InitiativeStatus): void => {
    if (initiative.status === next) return;
    client.queue.enqueue("update", "Initiative", initiative.id, {
      status: next,
      updatedAt: new Date().toISOString(),
    });
  };

  const remove = (initiative: InitiativeData): void => {
    client.queue.enqueue("delete", "Initiative", initiative.id);
    setDeleting(null);
    showToast(`Deleted ${initiative.name}`);
  };

  const menuFor = (initiative: InitiativeData): MenuItem[] => [
    {
      label: "Change status",
      submenu: STATUS_OPTIONS.map((option) => ({
        label: option.label,
        checked: initiative.status === option.value,
        onSelect: () => setStatusOf(initiative, option.value),
      })),
    },
    { type: "separator" },
    { label: "Delete initiative", onSelect: () => setDeleting(initiative) },
  ];

  return (
    <>
      <Header
        title="Initiatives"
        right={
          <Button variant="primary" size={28} onClick={openCreate}>
            New initiative
          </Button>
        }
      />

      <div className={styles.scroller} tabIndex={0} data-scroll-container="true">
        {initiatives.length === 0 ? (
          <EmptyState
            illustration={
              <span className={styles.emptyIllustration}>
                <InitiativeRollupMark size={96} />
              </span>
            }
            heading="Roll projects up into initiatives"
            primary={
              <Button variant="primary" size={32} onClick={openCreate}>
                New initiative
              </Button>
            }
          >
            An initiative groups the projects that serve one goal, so you can
            track a quarter of work as a single line instead of ten.
          </EmptyState>
        ) : (
          <div className={styles.page}>
            <div className={styles.sectionTitle}>
              Initiatives <span className={styles.count}>{initiatives.length}</span>
            </div>
            <div className={styles.table} role="table" aria-label="Initiatives">
              <div className={styles.headRow} role="row">
                <span className={styles.cellMain} role="columnheader">
                  Name
                </span>
                <span className={styles.cellWide} role="columnheader">
                  Status
                </span>
                <span className={styles.cellNum} role="columnheader">
                  Projects
                </span>
                <span className={styles.cellDate} role="columnheader">
                  Target
                </span>
                <span className={styles.menuSlot} aria-hidden="true" />
              </div>
              {initiatives.map((initiative) => {
                const owner =
                  initiative.ownerId === undefined
                    ? undefined
                    : store.get("User", initiative.ownerId);
                return (
                  <div className={styles.row} key={initiative.id} role="row">
                    <span className={styles.cellMain} role="cell">
                      <span className={styles.teamIcon}>
                        <Icon name="Initiative" size={16} />
                      </span>
                      <span className={styles.stack}>
                        <span className={styles.name}>{initiative.name}</span>
                        {initiative.description !== undefined ? (
                          <span className={styles.sub}>{initiative.description}</span>
                        ) : null}
                      </span>
                      {owner !== undefined ? (
                        <Avatar
                          initials={owner.initials}
                          color={owner.avatarColor}
                          size={18}
                          src={owner.avatarUrl}
                        />
                      ) : null}
                    </span>
                    <span className={styles.cellWide} role="cell">
                      <span className={styles.chip}>{STATUS_LABEL[initiative.status]}</span>
                    </span>
                    <span className={styles.cellNum} role="cell">
                      {initiative.projectIds.length}
                    </span>
                    <span className={styles.cellDate} role="cell">
                      {formatDate(initiative.targetDate)}
                    </span>
                    <span className={styles.menuSlot}>
                      <Menu
                        align="end"
                        items={menuFor(initiative)}
                        trigger={
                          <button
                            type="button"
                            className={styles.iconBtn}
                            aria-label={`Initiative options: ${initiative.name}`}
                          >
                            <Icon name="More" size={14} />
                          </button>
                        }
                      />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Dialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        width={520}
        label="New initiative"
      >
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>New initiative</span>
          <span className={styles.dialogSub}>
            Give it a name and pick the projects that roll up to it. You can
            change all of this later.
          </span>
        </div>
        <form
          className={styles.dialogBody}
          onSubmit={(e) => {
            e.preventDefault();
            create();
          }}
        >
          <div className={styles.field}>
            <label className={styles.label} htmlFor="initiative-name">
              Name
            </label>
            <Input
              id="initiative-name"
              inputSize="sm"
              autoFocus
              maxLength={80}
              placeholder="e.g. Q4 platform reliability"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="initiative-description">
              Description
            </label>
            <Input
              id="initiative-description"
              inputSize="sm"
              maxLength={160}
              placeholder="What does finishing this look like?"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
          </div>
          <div className={styles.fieldRow}>
            <div className={`${styles.field} ${styles.fieldNarrow}`}>
              <span className={styles.label}>Status</span>
              <Select
                label="Initiative status"
                value={status}
                onValueChange={(v) => setStatus(v as InitiativeStatus)}
                options={STATUS_OPTIONS}
              />
            </div>
            <div className={`${styles.field} ${styles.grow}`}>
              <label className={styles.label} htmlFor="initiative-target">
                Target date
              </label>
              <Input
                id="initiative-target"
                inputSize="sm"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.currentTarget.value)}
              />
            </div>
          </div>
          <div className={styles.field}>
            <span className={styles.label}>Projects</span>
            <div className={styles.checkList}>
              {projects.length === 0 ? (
                <span className={styles.checkEmpty}>
                  No projects in this workspace yet.
                </span>
              ) : (
                projects.map((project) => (
                  <div className={styles.checkRow} key={project.id}>
                    <Checkbox
                      label={project.name}
                      checked={projectIds.includes(project.id)}
                      onChange={(checked) =>
                        setProjectIds((prev) =>
                          checked
                            ? [...prev, project.id]
                            : prev.filter((id) => id !== project.id),
                        )
                      }
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        </form>
        <div className={styles.dialogFooter}>
          <Button variant="secondary" size={32} onClick={() => setCreateOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size={32}
            onClick={create}
            disabled={name.trim() === ""}
          >
            Create initiative
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={deleting !== null}
        onOpenChange={(next) => {
          if (!next) setDeleting(null);
        }}
        width={420}
        label="Delete initiative"
      >
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>
            Delete {deleting?.name ?? "initiative"}?
          </span>
        </div>
        <div className={styles.dialogBody}>
          <span className={styles.dialogSub}>
            The initiative is removed. The projects inside it are untouched.
          </span>
        </div>
        <div className={styles.dialogFooter}>
          <Button variant="secondary" size={32} onClick={() => setDeleting(null)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size={32}
            onClick={() => {
              if (deleting !== null) remove(deleting);
            }}
          >
            Delete
          </Button>
        </div>
      </Dialog>
    </>
  );
});
