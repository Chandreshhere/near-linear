"use client";

import { observer } from "mobx-react-lite";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/icons/Icon";
import { Menu, type MenuItem } from "@/components/ui/Menu";
import { PriorityIcon, StatusIcon } from "@/components/icons/StatusIcon";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type { IssueData, Priority } from "@/lib/data/types";
import { StatusPicker } from "@/components/issues/pickers/StatusPicker";
import { PriorityPicker } from "@/components/issues/pickers/PriorityPicker";
import { AssigneePicker } from "@/components/issues/pickers/AssigneePicker";
import { LabelPicker } from "@/components/issues/pickers/LabelPicker";
import styles from "./detail.module.css";

const PRIORITY_LABEL: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

/** Bespoke dashed-person glyph for the empty assignee row (capture §6). */
function DashedPersonIcon() {
  return (
    <Icon
      name="PersonDashed"
      size={16}
      color="currentColor"
      className={styles.dashedPerson}
    />
  );
}

/**
 * Right property rail (capture §6): sticky column, section label
 * "Properties" 13px/500 muted, `data-detail-button` rows (min-height 28,
 * padding 3px 6px, radius 6, icon + 6px gap + 13px label; empty values
 * muted, set values base). Rows wrap the sibling pickers around trigger
 * buttons; Project uses a local mini-menu.
 */
export const PropertyRail = observer(function PropertyRail({
  issue,
}: {
  issue: IssueData;
}) {
  const store = useStore();
  const client = useSyncClient();

  const state = store.get("WorkflowState", issue.stateId);
  const assignee =
    issue.assigneeId !== undefined ? store.get("User", issue.assigneeId) : undefined;
  const project =
    issue.projectId !== undefined ? store.get("Project", issue.projectId) : undefined;

  const labels = issue.labelIds
    .map((id) => store.get("Label", id))
    .filter((label): label is NonNullable<typeof label> => label !== undefined);

  // Local project mini-menu: the issue's team's projects (fallback: all).
  const teamProjects = store
    .all("Project")
    .filter((p) => p.teamIds.includes(issue.teamId));
  const projectChoices = (teamProjects.length > 0 ? teamProjects : store.all("Project"))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  const projectItems: MenuItem[] = projectChoices.map((p) => ({
    label: p.name,
    icon: p.icon ? (
      <span className={styles.projectEmoji}>{p.icon}</span>
    ) : (
      <Icon name="Project" size={14} color={p.color} />
    ),
    onSelect: () => client.mutate.updateIssue(issue.id, { projectId: p.id }),
  }));
  if (project !== undefined) {
    projectItems.push(
      { type: "separator" },
      {
        label: "Remove from project",
        onSelect: () => {
          // Wire null clears the optional field (JSON cannot carry undefined).
          client.queue.enqueue("update", "Issue", issue.id, { projectId: null });
        },
      },
    );
  }

  return (
    <div className={styles.rail}>
      <section className={styles.railSection} aria-label="Properties">
        <div className={styles.sectionHeader}>Properties</div>
        <div className={styles.sectionContent} data-details-pane-section-content="true">
          <StatusPicker
            teamId={issue.teamId}
            issueIds={[issue.id]}
            trigger={
              <button
                type="button"
                className={styles.detailButton}
                data-detail-button="true"
                aria-label="Change status"
              >
                <StatusIcon
                  category={state?.category ?? "backlog"}
                  color={state?.color}
                  size={14}
                />
                <span className={styles.detailLabel}>{state?.name ?? "Backlog"}</span>
              </button>
            }
          />

          <PriorityPicker
            issueIds={[issue.id]}
            trigger={
              <button
                type="button"
                className={styles.detailButton}
                data-detail-button="true"
                aria-label="Set priority"
              >
                <PriorityIcon priority={issue.priority} size={16} />
                <span
                  className={clsx(
                    styles.detailLabel,
                    issue.priority === 0 && styles.detailMuted,
                  )}
                >
                  {issue.priority === 0 ? "Set priority" : PRIORITY_LABEL[issue.priority]}
                </span>
              </button>
            }
          />

          <AssigneePicker
            issueIds={[issue.id]}
            trigger={
              <button
                type="button"
                className={styles.detailButton}
                data-detail-button="true"
                aria-label="Assign"
              >
                {assignee ? (
                  <Avatar initials={assignee.initials} color={assignee.avatarColor} size={16} />
                ) : (
                  <DashedPersonIcon />
                )}
                <span
                  className={clsx(styles.detailLabel, !assignee && styles.detailMuted)}
                >
                  {assignee ? assignee.displayName : "Assign"}
                </span>
              </button>
            }
          />
        </div>
      </section>

      <section className={styles.railSection} aria-label="Labels">
        <div className={styles.sectionHeader}>Labels</div>
        <div className={styles.sectionContent} data-details-pane-section-content="true">
          {labels.length > 0 ? (
            <div className={styles.labelChips}>
              {labels.map((label) => (
                <span key={label.id} className={styles.labelChip}>
                  <span
                    className={styles.labelDot}
                    style={{ background: label.color }}
                    aria-hidden="true"
                  />
                  {label.name}
                </span>
              ))}
              <LabelPicker
                issueIds={[issue.id]}
                trigger={
                  <button
                    type="button"
                    className={clsx(styles.labelChip, styles.addLabelChip)}
                    aria-label="Add labels"
                  >
                    <Icon name="Plus" size={12} />
                    Add label
                  </button>
                }
              />
            </div>
          ) : (
            <LabelPicker
              issueIds={[issue.id]}
              trigger={
                <button
                  type="button"
                  className={styles.detailButton}
                  data-detail-button="true"
                  aria-label="Add labels"
                >
                  <Icon name="Label" size={14} />
                  <span className={clsx(styles.detailLabel, styles.detailMuted)}>
                    Add label
                  </span>
                </button>
              }
            />
          )}
        </div>
      </section>

      <section className={styles.railSection} aria-label="Project">
        <div className={styles.sectionHeader}>Project</div>
        <div className={styles.sectionContent} data-details-pane-section-content="true">
          <Menu
            items={projectItems}
            trigger={
              <button
                type="button"
                className={styles.detailButton}
                data-detail-button="true"
                aria-label={project ? "Change project" : "Add to project"}
              >
                {project?.icon ? (
                  <span className={styles.projectEmoji}>{project.icon}</span>
                ) : (
                  <Icon name="Project" size={14} color={project?.color} />
                )}
                <span
                  className={clsx(styles.detailLabel, !project && styles.detailMuted)}
                >
                  {project ? project.name : "Add to project"}
                </span>
              </button>
            }
          />
        </div>
      </section>
    </div>
  );
});
