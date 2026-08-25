"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import clsx from "clsx";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import { Icon } from "@/components/icons/Icon";
import { Menu } from "@/components/ui/Menu";
import { PriorityIcon } from "@/components/icons/StatusIcon";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type {
  MilestoneData,
  Priority,
  ProjectStatusCategory,
} from "@/lib/data/types";
import {
  MilestoneDiamond,
  ProjectStatusIcon,
  projectIconFor,
} from "@/components/projects/glyphs";
import {
  MilestoneDatePicker,
  ProjectDatePicker,
  ProjectDependencyPicker,
  ProjectLabelPicker,
  ProjectLeadPicker,
  ProjectLeadTeamPicker,
  ProjectMembersPicker,
  ProjectPriorityPicker,
  ProjectStatusPicker,
  ProjectTeamsPicker,
} from "@/components/projects/pickers";
import styles from "./detailsrail.module.css";

/* ---------------------------------------------------------------- labels */

const STATUS_LABEL: Record<ProjectStatusCategory, string> = {
  backlog: "Backlog",
  planned: "Planned",
  started: "In Progress",
  completed: "Completed",
  canceled: "Canceled",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

/* ------------------------------------------------------------- date utils */

/** Parse ISO — date-only strings become LOCAL dates (no UTC-midnight shift). */
function parseDate(iso: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return new Date(iso);
}

/** "Aug 28" */
function formatShort(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function ordinalSuffix(day: number): string {
  if (day % 100 >= 11 && day % 100 <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** "Jul 27th" */
function formatOrdinal(iso: string): string {
  const date = parseDate(iso);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  const day = date.getDate();
  return `${month} ${day}${ordinalSuffix(day)}`;
}

/** Absolute form for title attrs: "Mon Aug 24, 15:57:57" ("Mon Aug 28" for date-only). */
function formatAbsolute(iso: string): string {
  const date = parseDate(iso);
  const weekday = date.toLocaleDateString("en-US", { weekday: "short" });
  const base = `${weekday} ${formatShort(date)}`;
  if (!iso.includes("T")) return base;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${base}, ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

/* --------------------------------------------------------- bespoke glyphs */

/** Two linked blocks — "Add dependency" (no sprite; drawn from capture geometry). */
function DependencyGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        fillRule="evenodd"
        d="M3 .85h2.5A2.15 2.15 0 0 1 7.65 3v2.5A2.15 2.15 0 0 1 5.5 7.65H3A2.15 2.15 0 0 1 .85 5.5V3A2.15 2.15 0 0 1 3 .85Zm0 1.3a.85.85 0 0 0-.85.85v2.5c0 .47.38.85.85.85h2.5a.85.85 0 0 0 .85-.85V3a.85.85 0 0 0-.85-.85H3Z"
        fill="currentColor"
      />
      <path
        fillRule="evenodd"
        d="M10.5 8.35H13A2.15 2.15 0 0 1 15.15 10.5V13A2.15 2.15 0 0 1 13 15.15h-2.5A2.15 2.15 0 0 1 8.35 13v-2.5a2.15 2.15 0 0 1 2.15-2.15Zm0 1.3a.85.85 0 0 0-.85.85V13c0 .47.38.85.85.85H13a.85.85 0 0 0 .85-.85v-2.5a.85.85 0 0 0-.85-.85h-2.5Z"
        fill="currentColor"
      />
      <path
        d="M6.54 6.54c.25-.25.66-.25.92 0l2 2a.65.65 0 1 1-.92.92l-2-2a.65.65 0 0 1 0-.92Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Person + plus — "Add members" (capture: user-plus icon). */
function UserPlusGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true" focusable="false">
      <path
        d="M6.5 1.9a2.85 2.85 0 1 1 0 5.7 2.85 2.85 0 0 1 0-5.7Z"
        fill="currentColor"
      />
      <path
        d="M6.5 8.9c2.36 0 4.33 1.4 4.9 3.3.15.51-.23 1.02-.76 1.02H2.36c-.53 0-.91-.51-.76-1.02.57-1.9 2.54-3.3 4.9-3.3Z"
        fill="currentColor"
      />
      <path
        d="M13 5.6c.36 0 .65.29.65.65v1.35H15a.65.65 0 0 1 0 1.3h-1.35v1.35a.65.65 0 0 1-1.3 0V8.9H11a.65.65 0 0 1 0-1.3h1.35V6.25c0-.36.29-.65.65-.65Z"
        fill="currentColor"
      />
    </svg>
  );
}

/** Small → between the two date chips. */
function ArrowRightGlyph() {
  return (
    <svg width={12} height={12} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path
        d="M6.06 2.74a.65.65 0 0 1 .92 0l2.8 2.8a.65.65 0 0 1 0 .92l-2.8 2.8a.65.65 0 1 1-.92-.92l1.69-1.69H2a.65.65 0 0 1 0-1.3h5.75L6.06 3.66a.65.65 0 0 1 0-.92Z"
        fill="currentColor"
      />
    </svg>
  );
}

/* ------------------------------------------------------------ sub-widgets */

/** Hover-revealed collapse chevron (role=button, aria-expanded — §6.8). */
function CollapseToggle({
  open,
  onToggle,
  label,
  controls,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  controls: string;
}) {
  return (
    <span
      role="button"
      tabIndex={0}
      aria-expanded={open}
      aria-label={label}
      aria-controls={controls}
      className={styles.collapse}
      onClick={onToggle}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onToggle();
        }
      }}
    >
      <Icon name="ChevronDown" size={14} className={styles.collapseChevron} />
    </span>
  );
}

/** Collapsible card body (height/opacity like the sidebar sections). */
function CardBody({
  id,
  open,
  className,
  children,
}: {
  id: string;
  open: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      id={id}
      className={clsx(styles.cardBody, className)}
      style={open ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
      aria-hidden={!open}
    >
      {children}
    </div>
  );
}

/* -------------------------------------------------------- milestone rows */

const MilestoneRow = observer(function MilestoneRow({
  milestone,
  percent,
  total,
  issuesHref,
  onDelete,
}: {
  milestone: MilestoneData;
  percent: number;
  total: number;
  /** `…/issues?projectMilestoneId=<id>` — the row opens its scoped issues. */
  issuesHref: string | undefined;
  onDelete: () => void;
}) {
  const router = useRouter();
  const open = (): void => {
    if (issuesHref !== undefined) router.push(issuesHref);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${milestone.name}. ${percent}% of ${total}. Open issues.`}
      className={styles.milestoneRow}
      onClick={open}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          open();
        }
      }}
    >
      <div className={styles.msName} data-column-id="user">
        <span className={styles.msIcon} aria-hidden="true">
          <MilestoneDiamond size={16} filled={total > 0 && percent === 100} />
        </span>
        <span className={styles.msNameText} title={milestone.name}>
          {milestone.name}
        </span>
      </div>
      <div className={styles.msPercent} data-column-id="percent">
        <span className={styles.msPct} data-animated-number="true">
          {percent}%
        </span>
        <span className={styles.msOf}>of</span>
        <span className={styles.msCount} data-column-id="estimate">
          {total}
        </span>
      </div>
      {/* Nested controls must not trigger the row's own navigation. */}
      <span onClick={(event) => event.stopPropagation()}>
        <MilestoneDatePicker
          milestoneId={milestone.id}
          trigger={
            <button
              type="button"
              className={styles.msDate}
              aria-label="Change target date"
              title={
                milestone.targetDate !== undefined
                  ? formatAbsolute(milestone.targetDate)
                  : "No target date"
              }
            >
              {milestone.targetDate !== undefined
                ? formatShort(parseDate(milestone.targetDate))
                : "Add date"}
            </button>
          }
        />
      </span>
      <span onClick={(event) => event.stopPropagation()}>
        <Menu
          align="end"
          items={[{ label: "Delete milestone", onSelect: onDelete }]}
          trigger={
            <IconButton
              label="Milestone actions"
              size={24}
              className={styles.msActions}
            >
              <Icon name="More" size={12} />
            </IconButton>
          }
        />
      </span>
    </div>
  );
});

/* -------------------------------------------------------------- the rail */

/**
 * Right details rail of the project overview (400px — capture §1/§6.8,
 * MASTER_PROMPT.md §10.2). Three cards (§7.8): Properties (label col 90px),
 * Milestones (h42 rows, "N% of N", date chip, hover actions) and Activity
 * (synthesized entries-project feed). Slides closed to width 0 with the
 * left gradient edge; the overview page owns the `open` state (Cmd/Ctrl+I).
 */
export const ProjectDetailsRail = observer(function ProjectDetailsRail({
  projectId,
  open,
}: {
  projectId: string;
  open: boolean;
}) {
  const store = useStore();
  const client = useSyncClient();

  const [propsOpen, setPropsOpen] = React.useState(true);
  const [milestonesOpen, setMilestonesOpen] = React.useState(true);
  const [activityOpen, setActivityOpen] = React.useState(true);

  const project = store.get("Project", projectId);

  const lead =
    project?.leadId !== undefined ? store.get("User", project.leadId) : undefined;
  const teams = (project?.teamIds ?? [])
    .map((id) => store.get("Team", id))
    .filter((team): team is NonNullable<typeof team> => team !== undefined);
  const leadTeam = teams[0];
  const members = (project?.memberIds ?? [])
    .map((id) => store.get("User", id))
    .filter((user): user is NonNullable<typeof user> => user !== undefined);
  const labels = (project?.labelIds ?? [])
    .map((id) => store.get("Label", id))
    .filter((label): label is NonNullable<typeof label> => label !== undefined);
  const dependencies = (project?.dependsOnIds ?? [])
    .map((id) => store.get("Project", id))
    .filter((entry): entry is NonNullable<typeof entry> => entry !== undefined);

  const issues = store.issuesForProject(projectId);
  const milestones = store.milestonesForProject(projectId);

  const completedOf = (list: typeof issues): number =>
    list.filter(
      (issue) => store.get("WorkflowState", issue.stateId)?.category === "completed",
    ).length;

  const projectProgress =
    issues.length === 0 ? 0 : completedOf(issues) / issues.length;

  const base =
    project !== undefined
      ? `/${client.workspaceSlug}/project/${project.slug}`
      : undefined;

  const addMilestone = () => {
    const max = milestones.reduce((acc, m) => Math.max(acc, m.sortOrder), 0);
    const id = crypto.randomUUID();
    client.queue.enqueue("create", "Milestone", id, {
      id,
      projectId,
      name: "New milestone",
      sortOrder: max + 1,
    });
  };

  /* -- synthesized activity feed (newest first) -- */
  const workspaceName = store.all("Workspace")[0]?.name ?? "Synquic";
  const now = Date.now();
  type Entry = {
    key: string;
    icon: React.ReactNode;
    text: React.ReactNode;
    iso: string;
    time: number;
  };
  const entries: Entry[] = [];
  if (project !== undefined) {
    for (const m of milestones) {
      if (m.targetDate === undefined) continue;
      const time = parseDate(m.targetDate).getTime();
      if (time > now) continue;
      entries.push({
        key: `ms-${m.id}`,
        icon: <MilestoneDiamond size={16} filled />,
        text: (
          <>
            Milestone <b className={styles.activityName}>{m.name}</b> completed
          </>
        ),
        iso: m.targetDate,
        time,
      });
    }
    entries.push({
      key: "created",
      icon: projectIconFor(project),
      text: (
        <>
          <b className={styles.activityName}>{workspaceName}</b> created the
          project
        </>
      ),
      iso: project.createdAt,
      time: parseDate(project.createdAt).getTime(),
    });
    entries.sort((a, b) => b.time - a.time);
  }

  return (
    <div className={styles.wrapper} data-open={open ? "true" : "false"}>
      <div className={styles.edge} aria-hidden="true" />
      <aside
        aria-label="Project sidebar"
        className={styles.aside}
        data-scroll-container="true"
        data-restore-scroll-view="project-sidebar"
        inert={!open}
      >
        {project !== undefined ? (
          <>
            {/* ------------------------------------------ Properties card */}
            <section className={styles.card}>
              <header className={styles.cardHeader}>
                <CollapseToggle
                  open={propsOpen}
                  onToggle={() => setPropsOpen((v) => !v)}
                  label="Collapse properties section"
                  controls="projectDetailsProperties"
                />
                <span className={styles.cardTitle}>Properties</span>
                <span className={styles.spacer} />
                <ProjectDependencyPicker
                  projectId={projectId}
                  trigger={
                    <IconButton
                      label="Add dependency"
                      size={24}
                      className={styles.headerAction}
                    >
                      <DependencyGlyph />
                    </IconButton>
                  }
                />
              </header>
              <CardBody id="projectDetailsProperties" open={propsOpen}>
                <PropertyRow label="Status">
                  <ProjectStatusPicker
                    projectId={projectId}
                    trigger={
                      <button
                        type="button"
                        className={styles.propButton}
                        aria-label="Change project status"
                      >
                        <span className={styles.propIcon} aria-hidden="true">
                          <ProjectStatusIcon
                            category={project.statusCategory}
                            progress={projectProgress}
                          />
                        </span>
                        <span className={styles.propText}>
                          {STATUS_LABEL[project.statusCategory]}
                        </span>
                      </button>
                    }
                  />
                </PropertyRow>

                <PropertyRow label="Priority">
                  <ProjectPriorityPicker
                    projectId={projectId}
                    trigger={
                      <button
                        type="button"
                        className={styles.propButton}
                        aria-label="Change project priority"
                      >
                        <span className={styles.propIcon} aria-hidden="true">
                          <PriorityIcon priority={project.priority} size={16} />
                        </span>
                        <span className={styles.propText}>
                          {PRIORITY_LABEL[project.priority]}
                        </span>
                      </button>
                    }
                  />
                </PropertyRow>

                <PropertyRow label="Lead">
                  <ProjectLeadPicker
                    projectId={projectId}
                    trigger={
                      <button
                        type="button"
                        className={styles.propButton}
                        aria-label="Change project lead"
                      >
                        {lead !== undefined ? (
                          <>
                            <Avatar
                              initials={lead.initials}
                              color={lead.avatarColor}
                              size={18}
                            />
                            <span className={styles.propText}>
                              {lead.displayName}
                            </span>
                          </>
                        ) : (
                          <span className={clsx(styles.propText, styles.propMuted)}>
                            Add lead
                          </span>
                        )}
                      </button>
                    }
                  />
                </PropertyRow>

                <PropertyRow label="Members">
                  <ProjectMembersPicker
                    projectId={projectId}
                    trigger={
                      <button
                        type="button"
                        className={styles.propButton}
                        aria-label={
                          members.length > 0 ? "Change members" : "Add members"
                        }
                      >
                        {members.length > 0 ? (
                          <>
                            {members.slice(0, 3).map((member) => (
                              <span
                                key={member.id}
                                className={styles.propIcon}
                                aria-hidden="true"
                              >
                                <Avatar
                                  initials={member.initials}
                                  color={member.avatarColor}
                                  src={member.avatarUrl}
                                  size={18}
                                />
                              </span>
                            ))}
                            <span className={styles.propText}>
                              {members.length === 1
                                ? members[0].displayName
                                : `${members.length} members`}
                            </span>
                          </>
                        ) : (
                          <>
                            <span
                              className={clsx(styles.propIcon, styles.propMuted)}
                              aria-hidden="true"
                            >
                              <UserPlusGlyph />
                            </span>
                            <span className={clsx(styles.propText, styles.propMuted)}>
                              Add members
                            </span>
                          </>
                        )}
                      </button>
                    }
                  />
                </PropertyRow>

                <PropertyRow label="Dates">
                  <div className={styles.dates}>
                    <ProjectDatePicker
                      projectId={projectId}
                      field="startDate"
                      trigger={
                        <button
                          type="button"
                          className={clsx(styles.propButton, styles.dateChip)}
                          aria-label="Change start date"
                        >
                          <span className={styles.propIcon} aria-hidden="true">
                            <Icon name="Calendar" size={14} />
                          </span>
                          <span
                            className={clsx(
                              styles.propText,
                              project.startDate === undefined && styles.propMuted,
                            )}
                          >
                            {project.startDate !== undefined
                              ? formatOrdinal(project.startDate)
                              : "Start"}
                          </span>
                        </button>
                      }
                    />
                    <span className={styles.dateArrow} aria-hidden="true">
                      <ArrowRightGlyph />
                    </span>
                    <ProjectDatePicker
                      projectId={projectId}
                      field="targetDate"
                      trigger={
                        <button
                          type="button"
                          className={clsx(styles.propButton, styles.dateChip)}
                          aria-label="Change target date"
                        >
                          <span
                            className={clsx(
                              styles.propText,
                              project.targetDate === undefined && styles.propMuted,
                            )}
                          >
                            {project.targetDate !== undefined
                              ? formatOrdinal(project.targetDate)
                              : "Target"}
                          </span>
                        </button>
                      }
                    />
                  </div>
                </PropertyRow>

                <PropertyRow label="Lead team">
                  <ProjectLeadTeamPicker
                    projectId={projectId}
                    trigger={
                      <button
                        type="button"
                        className={styles.propButton}
                        aria-label="Change lead team"
                      >
                        {leadTeam !== undefined ? (
                          <>
                            <span className={styles.propIcon} aria-hidden="true">
                              <Icon
                                name={leadTeam.icon}
                                size={14}
                                color={leadTeam.color}
                              />
                            </span>
                            <span className={styles.propText}>{leadTeam.name}</span>
                          </>
                        ) : (
                          <span className={clsx(styles.propText, styles.propMuted)}>
                            Add team
                          </span>
                        )}
                      </button>
                    }
                  />
                </PropertyRow>

                <PropertyRow label="Teams">
                  <ProjectTeamsPicker
                    projectId={projectId}
                    trigger={
                      <button
                        type="button"
                        className={styles.propButton}
                        aria-label="Change teams"
                      >
                        {teams.length > 0 ? (
                          teams.map((team) => (
                            <React.Fragment key={team.id}>
                              <span className={styles.propIcon} aria-hidden="true">
                                <Icon name={team.icon} size={14} color={team.color} />
                              </span>
                              <span className={styles.propText}>{team.name}</span>
                            </React.Fragment>
                          ))
                        ) : (
                          <span className={clsx(styles.propText, styles.propMuted)}>
                            Add team
                          </span>
                        )}
                      </button>
                    }
                  />
                </PropertyRow>

                {dependencies.length > 0 ? (
                  <PropertyRow label="Depends on">
                    <div className={styles.dependencyList}>
                      {dependencies.map((dependency) => (
                        <Link
                          key={dependency.id}
                          className={styles.dependencyChip}
                          href={`/${client.workspaceSlug}/project/${dependency.slug}/overview`}
                        >
                          <span className={styles.propIcon} aria-hidden="true">
                            {projectIconFor(dependency)}
                          </span>
                          <span className={styles.propText}>{dependency.name}</span>
                        </Link>
                      ))}
                    </div>
                  </PropertyRow>
                ) : null}

                <PropertyRow label="Labels">
                  <div className={styles.labelRow}>
                    {labels.map((label) => (
                      <ProjectLabelPicker
                        key={label.id}
                        projectId={projectId}
                        trigger={
                          <button
                            type="button"
                            className={styles.labelChip}
                            aria-label={`Label ${label.name}`}
                          >
                            <span
                              className={styles.labelSwatch}
                              style={
                                { "--swatch-color": label.color } as React.CSSProperties
                              }
                              aria-hidden="true"
                            />
                            {label.name}
                          </button>
                        }
                      />
                    ))}
                    <ProjectLabelPicker
                      projectId={projectId}
                      trigger={
                        <button
                          type="button"
                          className={clsx(
                            styles.propButton,
                            labels.length === 0 && styles.hoverOnly,
                          )}
                          aria-label="Add label"
                          data-detail-button="true"
                        >
                          <span
                            className={clsx(styles.propIcon, styles.propMuted)}
                            aria-hidden="true"
                          >
                            <Icon name="Plus" size={12} />
                          </span>
                          <span className={clsx(styles.propText, styles.propMuted)}>
                            Add label
                          </span>
                        </button>
                      }
                    />
                  </div>
                </PropertyRow>
              </CardBody>
            </section>

            {/* ------------------------------------------ Milestones card */}
            <section className={styles.card}>
              <header className={styles.cardHeader}>
                <CollapseToggle
                  open={milestonesOpen}
                  onToggle={() => setMilestonesOpen((v) => !v)}
                  label="Collapse milestones section"
                  controls="projectDetailsMilestones"
                />
                <span className={styles.cardTitle}>Milestones</span>
                <span className={styles.spacer} />
                <IconButton
                  label="Add milestone"
                  size={24}
                  className={styles.headerAction}
                  onClick={addMilestone}
                >
                  <Icon name="Plus" size={14} />
                </IconButton>
              </header>
              <CardBody id="projectDetailsMilestones" open={milestonesOpen}>
                {milestones.map((milestone) => {
                  const scoped = issues.filter(
                    (issue) => issue.milestoneId === milestone.id,
                  );
                  const total = scoped.length;
                  const percent =
                    total === 0
                      ? 0
                      : Math.round((completedOf(scoped) / total) * 100);
                  return (
                    <MilestoneRow
                      key={milestone.id}
                      milestone={milestone}
                      percent={percent}
                      total={total}
                      issuesHref={
                        base === undefined
                          ? undefined
                          : `${base}/issues?projectMilestoneId=${milestone.id}`
                      }
                      onDelete={() =>
                        client.queue.enqueue("delete", "Milestone", milestone.id)
                      }
                    />
                  );
                })}
                <div className={styles.noMilestoneRow}>
                  <span className={styles.msIcon} aria-hidden="true">
                    <Icon name="MilestoneNone" size={16} />
                  </span>
                  <span className={styles.noMilestoneText}>No milestone</span>
                  <span className={styles.spacer} />
                  {base !== undefined ? (
                    <Link
                      href={`${base}/issues?projectMilestoneId=none`}
                      className={styles.ghostLink}
                    >
                      See issues
                    </Link>
                  ) : null}
                </div>
              </CardBody>
            </section>

            {/* -------------------------------------------- Activity card */}
            <section className={styles.card}>
              <header className={styles.cardHeader}>
                <CollapseToggle
                  open={activityOpen}
                  onToggle={() => setActivityOpen((v) => !v)}
                  label="Collapse activity section"
                  controls="projectDetailsActivity"
                />
                <span className={styles.cardTitle}>Activity</span>
                <span className={styles.spacer} />
                {base !== undefined ? (
                  <Link href={`${base}/activity`} className={styles.seeAll}>
                    See all
                  </Link>
                ) : null}
              </header>
              <CardBody id="projectDetailsActivity" open={activityOpen}>
                {entries.map((entry) => (
                  <div
                    key={entry.key}
                    className={styles.activityEntry}
                    data-activity-item="true"
                    data-item-type="entries-project"
                  >
                    <span className={styles.activityIcon} aria-hidden="true">
                      {entry.icon}
                    </span>
                    <span className={styles.activityText}>
                      {entry.text}
                      {" · "}
                      <span
                        className={styles.activityDate}
                        title={formatAbsolute(entry.iso)}
                        aria-label={formatAbsolute(entry.iso)}
                      >
                        {formatShort(parseDate(entry.iso))}
                      </span>
                    </span>
                  </div>
                ))}
              </CardBody>
            </section>
          </>
        ) : null}
      </aside>
    </div>
  );
});

/** One properties row: 90px label cell (12px/450 muted) + value control. */
function PropertyRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.propRow}>
      <div className={styles.propLabel}>{label}</div>
      <div className={styles.propValue}>{children}</div>
    </div>
  );
}
