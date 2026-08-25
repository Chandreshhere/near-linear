"use client";

/**
 * Project Overview (`/project/:slug/overview`) — MASTER_PROMPT.md §10.2 +
 * docs/analysis/capture-driver-app-overview.md (CAPTURED geometry):
 * two-row header, 80ch overview form (icon picker · name · summary ·
 * properties strip · resources · update strip · description · milestones),
 * floating outline minimap, 400px details rail (mod+i toggles).
 *
 * Editor-reuse decisions:
 *   - DescriptionEditor is REUSED as-is (generic `description`/`onSave` API);
 *     it saves through updateProject here. Its aria-label stays "Issue
 *     description" — mirroring the real app, whose project description editor
 *     is labelled "Initiative description" (shared-component quirk, §6.5).
 *   - TitleEditor hardcodes aria-label/placeholder "Issue title", so the name
 *     and summary use LineEditor below: the same Tiptap config (StarterKit
 *     minus blocks, Enter swallowed, useDebouncedSave) with proper labels.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { EditorContent, useEditor, type JSONContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { Header } from "@/components/shell/Header";
import { Button, IconButton } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Menu } from "@/components/ui/Menu";
import { Popover } from "@/components/ui/Popover";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import { FavoriteStar } from "@/components/nav/Favorites";
import { Icon } from "@/components/icons/Icon";
import { SidePanelGlyph } from "@/components/icons/Sprites";
import { PriorityIcon } from "@/components/icons/StatusIcon";
import { Avatar } from "@/components/ui/Avatar";
import { DescriptionEditor } from "@/components/issues/detail/DescriptionEditor";
import { useDebouncedSave } from "@/components/issues/detail/useDebouncedSave";
import {
  CrossGlyph,
  HealthIcon,
  MilestoneDiamond,
  ProjectStatusIcon,
  projectIconFor,
} from "@/components/projects/glyphs";
import {
  MilestoneDatePicker,
  ProjectIconPicker,
  ProjectLabelPicker,
  ProjectLeadPicker,
  ProjectPriorityPicker,
  ProjectStatusPicker,
  ProjectTeamsPicker,
} from "@/components/projects/pickers";
import { ProjectDetailsRail } from "@/components/projects/DetailsRail";
import { ProjectInsightsPanel } from "@/components/projects/Insights";
import { SaveViewDialog } from "@/components/projects/SaveViewDialog";
import { ResourceDialog } from "@/components/projects/ResourceDialog";
import {
  HEALTH_LABEL,
  UpdateComposer,
  updatesForProject,
} from "@/components/projects/UpdateComposer";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import {
  insightsKey,
  projectNotifyKey,
  usePersistedFlag,
} from "@/lib/projects/localPrefs";
import { formatKeys, useShortcut } from "@/lib/keyboard";
import { copyToClipboard, showToast } from "@/lib/toast";
import type {
  MilestoneData,
  Priority,
  ProjectData,
  ProjectStatusCategory,
} from "@/lib/data/types";
import shellStyles from "@/components/shell/shell.module.css";
import styles from "@/components/projects/overview.module.css";

/* ================================================================
 * Labels + date formatting
 * ================================================================ */

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

const MONTH_SHORT = new Intl.DateTimeFormat("en-US", { month: "short" });

/**
 * Emoji project icons start with a non-ASCII unit; sprite names are ASCII
 * (same heuristic as glyphs.projectIconFor). Rendering the raw emoji lets
 * the local wrapper set its size (16px crumb / 22px picker — CAPTURED),
 * where projectIconFor fixes emoji at the 13px table-tile size.
 */
function isEmojiIcon(icon: string | undefined): icon is string {
  return icon !== undefined && icon !== "" && icon.charCodeAt(0) > 0x7f;
}

/** Date-only ISO ("2026-07-27") parsed in local time (no UTC day shift). */
function parseDateOnly(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (m === null) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
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

/** "Jul 27th" (CAPTURED property-pill format). */
function formatOrdinalDate(iso: string): string {
  const date = parseDateOnly(iso);
  if (date === null) return iso;
  const day = date.getDate();
  return `${MONTH_SHORT.format(date)} ${day}${ordinalSuffix(day)}`;
}

/** "Aug 28" (CAPTURED milestone-meta format). */
function formatShortDate(iso: string): string {
  const date = parseDateOnly(iso);
  if (date === null) return iso;
  return `${MONTH_SHORT.format(date)} ${date.getDate()}`;
}

/* ================================================================
 * LineEditor — single-line Tiptap editor (name 1.5rem/600 ·
 * summary 15px/450). Same config as issues TitleEditor; saves via
 * the shared useDebouncedSave channel (600ms + blur flush).
 * ================================================================ */

function lineDoc(text: string): JSONContent {
  return {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: text === "" ? undefined : [{ type: "text", text }],
      },
    ],
  };
}

function LineEditor({
  value,
  ariaLabel,
  placeholder,
  className,
  onSave,
}: {
  value: string;
  ariaLabel: string;
  placeholder: string;
  className: string;
  onSave: (value: string) => void;
}) {
  const saver = useDebouncedSave(onSave, 600);

  const editor = useEditor({
    immediatelyRender: false, // SSR-safe
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        listKeymap: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
        hardBreak: false,
        link: false,
        underline: false,
        trailingNode: false,
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: lineDoc(value),
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": ariaLabel,
        "aria-multiline": "false",
      },
      // Single paragraph enforced: every Enter flavor is a no-op.
      handleKeyDown: (_view, event) => event.key === "Enter",
    },
    onUpdate: ({ editor: e }) => {
      saver.schedule(e.state.doc.textContent);
    },
    onBlur: () => {
      saver.flush();
    },
  });

  // External change (realtime delta) → replace unless the user is mid-edit.
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    if (editor.isFocused || saver.hasPending()) return;
    if (editor.state.doc.textContent !== value) {
      editor.commands.setContent(lineDoc(value), { emitUpdate: false });
    }
  }, [editor, value, saver]);

  return <EditorContent className={className} editor={editor} />;
}

/* ================================================================
 * Date chip + tiny popover (native date input, dark color-scheme)
 * ================================================================ */

function DateChip({
  ariaLabel,
  popLabel,
  value,
  placeholder,
  chipClassName,
  showIcon = true,
  onSave,
  format = formatOrdinalDate,
}: {
  ariaLabel: string;
  popLabel: string;
  value?: string;
  placeholder: string;
  chipClassName: string;
  showIcon?: boolean;
  onSave: (next: string) => void;
  format?: (iso: string) => string;
}) {
  return (
    <Popover
      trigger={
        <button type="button" className={chipClassName} aria-label={ariaLabel}>
          {showIcon ? <Icon name="Calendar" size={16} /> : null}
          <span className={styles.propPillLabel}>
            {value !== undefined && value !== "" ? format(value) : placeholder}
          </span>
        </button>
      }
    >
      <div className={styles.datePopover}>
        <span className={styles.dateLabel}>{popLabel}</span>
        <input
          type="date"
          className={styles.dateInput}
          aria-label={popLabel}
          defaultValue={value !== undefined ? value.slice(0, 10) : ""}
          onChange={(e) => {
            if (e.target.value !== "") onSave(e.target.value);
          }}
        />
      </div>
    </Popover>
  );
}

/* ================================================================
 * Milestone card (§6.6): diamond + inline-editable name + collapse,
 * meta row "Aug 28 · N issues · 0%" + hover ⋯ menu, collapsible body.
 * ================================================================ */

const MilestoneCard = observer(function MilestoneCard({
  milestone,
  issuesHref,
  highlight,
}: {
  milestone: MilestoneData;
  issuesHref: string;
  /** Nearest-upcoming target date → yellow milestone-status tint. */
  highlight: boolean;
}) {
  const client = useSyncClient();
  const store = useStore();
  const [open, setOpen] = useState(true);

  const issues = store
    .issuesForProject(milestone.projectId)
    .filter((issue) => issue.milestoneId === milestone.id);
  const completed = issues.filter(
    (issue) => store.get("WorkflowState", issue.stateId)?.category === "completed",
  ).length;
  const percent =
    issues.length === 0 ? 0 : Math.round((completed / issues.length) * 100);

  const commitName = (raw: string): void => {
    const next = raw.trim();
    if (next === "" || next === milestone.name) return;
    client.queue.enqueue("update", "Milestone", milestone.id, { name: next });
  };

  return (
    <div
      id={`milestone-${milestone.id}`}
      className={styles.milestoneCard}
      data-open={open ? "true" : "false"}
    >
      <div className={styles.milestoneHeader}>
        <a
          className={styles.milestoneIconSlot}
          href={`#milestone-${milestone.id}`}
          aria-label={milestone.name}
        >
          <MilestoneDiamond
            size={16}
            filled={issues.length > 0 && percent === 100}
            dashed={completed === 0}
            color={highlight ? "var(--color-yellow)" : undefined}
          />
        </a>
        <input
          key={milestone.name}
          className={styles.milestoneName}
          aria-label="Milestone name"
          defaultValue={milestone.name}
          placeholder="Milestone name"
          onBlur={(e) => commitName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
        <button
          type="button"
          className={styles.collapseBtn}
          aria-label={open ? "Collapse" : "Expand"}
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          <span className={styles.collapseChevron}>
            <Icon name="ChevronDown" size={16} />
          </span>
        </button>
      </div>

      <div className={styles.milestoneMeta}>
        <MilestoneDatePicker
          milestoneId={milestone.id}
          trigger={
            <button type="button" className={styles.metaChip} aria-label="Choose date">
              {milestone.targetDate !== undefined
                ? formatShortDate(milestone.targetDate)
                : "Add date"}
            </button>
          }
        />
        <span className={styles.metaDot} aria-hidden="true">
          ·
        </span>
        <Link className={styles.metaChip} href={issuesHref} aria-label="Open issues">
          {issues.length} {issues.length === 1 ? "issue" : "issues"}
        </Link>
        <span className={styles.metaDot} aria-hidden="true">
          ·
        </span>
        <span>{percent}%</span>
        <span className={styles.metaSpacer} />
        <Menu
          align="end"
          items={[
            {
              label: "Delete milestone",
              onSelect: () =>
                client.queue.enqueue("delete", "Milestone", milestone.id),
            },
          ]}
          trigger={
            <IconButton label="Open menu" size={24} className={styles.milestoneMenuBtn}>
              <Icon name="More" size={12} />
            </IconButton>
          }
        />
      </div>

      {milestone.description !== undefined && milestone.description !== "" ? (
        <div className={styles.milestoneBody} data-open={open ? "true" : "false"}>
          <div className={styles.milestoneBodyInner}>
            <div className={styles.milestoneDescription} aria-label="Milestone description">
              {milestone.description}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
});

/* ================================================================
 * Floating outline minimap (§6.7): 8px bars → blur-glass panel
 * ================================================================ */

interface OutlineSection {
  id: string;
  label: string;
  sub: boolean;
  icon: React.ReactNode;
}

/** Text-lines glyph for the Description row (no doc glyph in the sprite). */
function TextLinesGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <rect x="2" y="3.25" width="12" height="1.5" rx="0.75" />
      <rect x="2" y="7.25" width="12" height="1.5" rx="0.75" />
      <rect x="2" y="11.25" width="8" height="1.5" rx="0.75" />
    </svg>
  );
}

function OutlineMinimap({ sections }: { sections: OutlineSection[] }) {
  const jumpTo = (id: string) => (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className={styles.minimap}>
      <div className={styles.minimapBars} aria-hidden="true">
        {sections.map((section) => (
          <span
            key={section.id}
            className={`${styles.minimapBar}${section.sub ? ` ${styles.minimapBarSub}` : ""}`}
          />
        ))}
      </div>
      <nav className={styles.minimapPanel} aria-label="Page outline">
        {sections.map((section) => (
          <a
            key={section.id}
            className={`${styles.minimapRow}${section.sub ? ` ${styles.minimapRowSub}` : ""}`}
            href={`#${section.id}`}
            onClick={jumpTo(section.id)}
          >
            {section.sub ? null : (
              <span className={styles.minimapRowIcon} aria-hidden="true">
                {section.icon}
              </span>
            )}
            <span className={styles.minimapRowLabel}>{section.label}</span>
          </a>
        ))}
      </nav>
    </div>
  );
}

/* ================================================================
 * Header pieces shared by the skeleton and ready states
 * ================================================================ */

function ArrowRightGlyph() {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" aria-hidden="true" fill="currentColor">
      <path d="M8.53 3.72a.75.75 0 0 0-1.06 1.06L9.94 7.25H3.5a.75.75 0 0 0 0 1.5h6.44l-2.47 2.47a.75.75 0 1 0 1.06 1.06l3.75-3.75a.75.75 0 0 0 0-1.06L8.53 3.72Z" />
    </svg>
  );
}


/* ================================================================
 * View
 * ================================================================ */

export const ProjectOverviewView = observer(function ProjectOverviewView({
  workspace,
  slug,
}: {
  workspace: string;
  slug: string;
}) {
  const client = useSyncClient();
  const store = useStore();
  const router = useRouter();
  const [railOpen, setRailOpen] = useState(true);

  const project = store.projectBySlug(slug);
  const base = `/${workspace}/project/${slug}`;

  // Panel + subscription state persists per browser (lib/projects/localPrefs).
  const [insightsOpen, , toggleInsights] = usePersistedFlag(
    insightsKey(`project/${slug}`),
  );
  const [notifying, setNotifying] = usePersistedFlag(
    projectNotifyKey(project?.id ?? slug),
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [saveViewOpen, setSaveViewOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [resourceOpen, setResourceOpen] = useState(false);

  // §12: Cmd/Ctrl+I toggles the details sidebar.
  useShortcut({
    id: "project.toggle-details",
    keys: "mod+i",
    description: "Toggle project details sidebar",
    handler: (event) => {
      event.preventDefault();
      setRailOpen((o) => !o);
    },
  });

  /* ---------- boot / not-found ---------- */

  if (project === undefined) {
    const booting = client.status === "booting";
    return (
      <>
        <Header
          left={
            booting ? (
              <span
                className={`${styles.skeleton} ${styles.crumbSkeleton}`}
                aria-hidden="true"
              />
            ) : (
              <nav className={styles.crumbs} aria-label="Breadcrumb">
                <Link className={styles.crumb} href={`/${workspace}/projects/all`}>
                  Projects
                </Link>
              </nav>
            )
          }
        />
        {booting ? (
          <div className={styles.contentRow}>
            <div className={styles.leftPane}>
              <div className={styles.scroller}>
                <div className={styles.form} aria-hidden="true">
                  <span className={`${styles.skeleton} ${styles.skeletonTitle}`} />
                  <span
                    className={`${styles.skeleton} ${styles.skeletonLine}`}
                    style={{ width: "72%" }}
                  />
                  <span
                    className={`${styles.skeleton} ${styles.skeletonLine}`}
                    style={{ width: "58%" }}
                  />
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.notFound}>
            <div className={styles.notFoundTitle}>Project not found</div>
            <div className={styles.notFoundBody}>
              This project doesn&rsquo;t exist or was deleted.
            </div>
          </div>
        )}
      </>
    );
  }

  /* ---------- derived ---------- */

  const lead = project.leadId !== undefined ? store.get("User", project.leadId) : undefined;
  const team =
    project.teamIds[0] !== undefined ? store.get("Team", project.teamIds[0]) : undefined;
  const milestones = store.milestonesForProject(project.id);

  // Nearest-upcoming target date → yellow milestone-status tint.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  let nearestUpcomingId: string | undefined;
  let nearestTime = Number.POSITIVE_INFINITY;
  for (const m of milestones) {
    if (m.targetDate === undefined) continue;
    const time = parseDateOnly(m.targetDate)?.getTime();
    if (time === undefined || time < today.getTime()) continue;
    if (time < nearestTime) {
      nearestTime = time;
      nearestUpcomingId = m.id;
    }
  }

  const updateProject = (fields: Partial<Omit<ProjectData, "id">>): void => {
    client.mutate.updateProject(project.id, fields);
  };

  const saveName = (raw: string): void => {
    const next = raw.trim() === "" ? project.name : raw;
    if (next !== project.name) updateProject({ name: next });
  };
  const saveSummary = (raw: string): void => {
    if (raw !== (project.summary ?? "")) updateProject({ summary: raw });
  };
  const saveDescription = (markdown: string): void => {
    if (markdown !== (project.description ?? "")) updateProject({ description: markdown });
  };

  const addMilestone = (): void => {
    const id = crypto.randomUUID();
    const maxSort = milestones.reduce((max, m) => Math.max(max, m.sortOrder), 0);
    client.queue.enqueue("create", "Milestone", id, {
      id,
      projectId: project.id,
      name: "New milestone",
      sortOrder: maxSort + 1,
    });
  };

  const labels = (project.labelIds ?? [])
    .map((id) => store.get("Label", id))
    .filter((label): label is NonNullable<typeof label> => label !== undefined);
  const resources = project.resources ?? [];
  const updates = updatesForProject(store.all("ProjectUpdate"), project.id);
  const latestUpdate = updates[0];

  /**
   * Delete cascades what only this project owns — its milestones, its posted
   * updates and its activity — and detaches its issues (they belong to their
   * team, not to the project), then routes back to the list (§6.8: optimistic,
   * the row disappears before the ACK).
   */
  const deleteProject = (): void => {
    const name = project.name;
    for (const milestone of store.milestonesForProject(project.id)) {
      client.queue.enqueue("delete", "Milestone", milestone.id);
    }
    for (const update of updates) {
      client.queue.enqueue("delete", "ProjectUpdate", update.id);
    }
    for (const activity of store
      .all("Activity")
      .filter((entry) => entry.projectId === project.id)) {
      client.queue.enqueue("delete", "Activity", activity.id);
    }
    for (const issue of store.issuesForProject(project.id)) {
      client.mutate.updateIssue(issue.id, {
        projectId: null as unknown as string,
        milestoneId: null as unknown as string,
      });
    }
    client.queue.enqueue("delete", "Project", project.id);
    setDeleteOpen(false);
    router.push(`/${workspace}/projects/all`);
    showToast(`Deleted “${name}”`);
  };

  const removeResource = (resourceId: string): void => {
    updateProject({
      resources: resources.filter((resource) => resource.id !== resourceId),
    });
  };

  const outlineSections: OutlineSection[] = [
    {
      id: "project-description",
      label: "Description",
      sub: false,
      icon: <TextLinesGlyph />,
    },
    {
      id: "milestone-list",
      label: "Milestones",
      sub: false,
      icon: <MilestoneDiamond size={16} filled={false} />,
    },
    ...milestones.map((m) => ({
      id: `milestone-${m.id}`,
      label: m.name,
      sub: true,
      icon: null,
    })),
  ];

  /* ---------- header rows ---------- */

  const breadcrumb = (
    <>
      <nav className={styles.crumbs} aria-label="Breadcrumb">
        <Link
          className={styles.crumb}
          href={`/${workspace}/projects/all`}
          aria-label="All projects"
        >
          Projects
        </Link>
        <span className={styles.crumbSep} aria-hidden="true">
          ›
        </span>
        <Link className={styles.crumbCurrent} href={`${base}/overview`} title={project.name}>
          <span className={styles.crumbProjectIcon} data-type="emoji" aria-hidden="true">
            {isEmojiIcon(project.icon) ? project.icon : projectIconFor(project)}
          </span>
          {project.name}
        </Link>
      </nav>
      <FavoriteStar entityType="project" entityId={project.id} size={16} />
      <Menu
        trigger={
          <IconButton label="Project actions" size={28}>
            <Icon name="More" size={14} />
          </IconButton>
        }
        items={[
          {
            label: "Copy project URL",
            icon: <Icon name="Link" size={14} />,
            onSelect: () => {
              void copyToClipboard(
                window.location.href,
                "Copied page URL to clipboard",
              );
            },
          },
          {
            label: "Write project update…",
            icon: <Icon name="Compose" size={14} />,
            onSelect: () => setUpdateOpen(true),
          },
          { type: "separator" },
          {
            label: "Delete project",
            onSelect: () => setDeleteOpen(true),
          },
        ]}
      />
    </>
  );

  const headerRight = (
    <>
      <Tooltip content="Copy page URL">
        <IconButton
          label="Copy page URL"
          size={28}
          onClick={() => {
            void copyToClipboard(window.location.href, "Copied page URL to clipboard");
          }}
        >
          <Icon name="Link" size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip
        content={
          notifying
            ? "Notifications on — click to mute"
            : "Setup project notifications"
        }
      >
        <IconButton
          label="Setup project notifications"
          size={28}
          aria-pressed={notifying}
          data-active={notifying ? "true" : undefined}
          onClick={() => {
            const next = !notifying;
            setNotifying(next);
            showToast(
              next
                ? `You'll be notified about ${project.name}`
                : `Muted notifications for ${project.name}`,
            );
          }}
        >
          <Icon name="Subscribe" size={14} />
        </IconButton>
      </Tooltip>
    </>
  );

  const tabsRow = (
    <>
      <div className={shellStyles.tabStrip}>
        <Link className={shellStyles.tab} href={`${base}/overview`} data-active="true">
          Overview
        </Link>
        <Link className={shellStyles.tab} href={`${base}/activity`}>
          Activity
        </Link>
        <Link className={shellStyles.tab} href={`${base}/issues`}>
          Issues
        </Link>
        <Tooltip content="Add new view">
          <IconButton
            label="Add new view"
            size={28}
            className={shellStyles.tabAddBtn}
            onClick={() => setSaveViewOpen(true)}
          >
            <Icon name="Plus" size={14} />
          </IconButton>
        </Tooltip>
      </div>
      <span className={shellStyles.headerSpacer} />
      <Tooltip content={insightsOpen ? "Close project insights" : "Open project insights"}>
        <IconButton
          label={insightsOpen ? "Close project insights" : "Open project insights"}
          size={28}
          data-state={insightsOpen ? "active" : "inactive"}
          data-active={insightsOpen ? "true" : undefined}
          aria-expanded={insightsOpen}
          onClick={toggleInsights}
        >
          <Icon name="Insights" size={14} />
        </IconButton>
      </Tooltip>
      <Tooltip
        content={railOpen ? "Close project details" : "Open project details"}
        keys={formatKeys("mod+i")}
      >
        <IconButton
          label={railOpen ? "Close project details" : "Open project details"}
          size={28}
          data-state={railOpen ? "active" : "inactive"}
          data-active={railOpen ? "true" : undefined}
          aria-expanded={railOpen}
          onClick={() => setRailOpen((o) => !o)}
        >
          <SidePanelGlyph expanded={railOpen} />
        </IconButton>
      </Tooltip>
    </>
  );

  /* ---------- body ---------- */

  return (
    <TooltipProvider>
      <Header left={breadcrumb} right={headerRight} tabs={tabsRow} />

      <div className={styles.contentRow}>
        <div className={styles.leftPane}>
          <div
            className={styles.scroller}
            tabIndex={0}
            data-scroll-container="true"
            data-restore-scroll-view="project-overview"
          >
            <form
              id="form-new-project"
              className={styles.form}
              onSubmit={(e) => e.preventDefault()}
            >
              {/* ---- title row ---- */}
              <div
                className={styles.titleRow}
                style={{ "--project-color": project.color } as React.CSSProperties}
              >
                <ProjectIconPicker
                  project={project}
                  trigger={
                    <button
                      type="button"
                      className={styles.iconPickerBtn}
                      aria-label="Choose icon"
                    >
                      {isEmojiIcon(project.icon)
                        ? project.icon
                        : projectIconFor(project)}
                    </button>
                  }
                />
                <div className={styles.nameEditorWrap}>
                  <LineEditor
                    key={project.id}
                    value={project.name}
                    ariaLabel="Project name"
                    placeholder="Project name"
                    className={styles.nameEditor}
                    onSave={saveName}
                  />
                </div>
              </div>

              {/* ---- summary ---- */}
              <LineEditor
                key={`${project.id}-summary`}
                value={project.summary ?? ""}
                ariaLabel="Project summary"
                placeholder="Add a short summary…"
                className={styles.summaryEditor}
                onSave={saveSummary}
              />

              {/* ---- properties + resources grid ---- */}
              <div className={styles.propsGrid}>
                <h3 className={styles.groupLabel}>Properties</h3>
                <section className={styles.propsSection} aria-label="Properties">
                  <ProjectStatusPicker
                    projectId={project.id}
                    trigger={
                      <button
                        type="button"
                        className={styles.propPill}
                        data-detail-property-button="true"
                      >
                        <ProjectStatusIcon category={project.statusCategory} size={16} />
                        <span className={styles.propPillLabel}>
                          {STATUS_LABEL[project.statusCategory]}
                        </span>
                      </button>
                    }
                  />
                  <ProjectPriorityPicker
                    projectId={project.id}
                    trigger={
                      <button
                        type="button"
                        className={styles.propPill}
                        data-detail-property-button="true"
                        aria-label={PRIORITY_LABEL[project.priority]}
                      >
                        <PriorityIcon priority={project.priority} size={16} />
                        <span className={styles.propPillLabel}>
                          {PRIORITY_LABEL[project.priority]}
                        </span>
                      </button>
                    }
                  />
                  <ProjectLeadPicker
                    projectId={project.id}
                    trigger={
                      <button
                        type="button"
                        className={styles.propPill}
                        data-detail-property-button="true"
                      >
                        <Avatar
                          initials={lead?.initials ?? "?"}
                          color={lead?.avatarColor}
                          size={18}
                        />
                        <span className={styles.propPillLabel}>
                          {lead?.displayName ?? "No lead"}
                        </span>
                      </button>
                    }
                  />
                  <DateChip
                    ariaLabel="Change project start date"
                    popLabel="Start date"
                    value={project.startDate}
                    placeholder="Start"
                    chipClassName={styles.propPill}
                    onSave={(next) => updateProject({ startDate: next })}
                  />
                  <span className={styles.dateArrow} aria-hidden="true">
                    <ArrowRightGlyph />
                  </span>
                  <DateChip
                    ariaLabel="Change project target date"
                    popLabel="Target date"
                    value={project.targetDate}
                    placeholder="Target"
                    chipClassName={styles.propPill}
                    onSave={(next) => updateProject({ targetDate: next })}
                  />
                  <ProjectTeamsPicker
                    projectId={project.id}
                    trigger={
                      <button
                        type="button"
                        className={styles.propPill}
                        data-detail-property-button="true"
                        aria-label={
                          team !== undefined ? `Teams: ${team.name}` : "Add team"
                        }
                      >
                        {team !== undefined ? (
                          <>
                            <Icon name={team.icon} size={14} color={team.color} />
                            <span className={styles.propPillLabel}>{team.name}</span>
                          </>
                        ) : (
                          <span className={styles.propPillLabel}>Add team</span>
                        )}
                      </button>
                    }
                  />
                  {labels.map((label) => (
                    <ProjectLabelPicker
                      key={label.id}
                      projectId={project.id}
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
                    projectId={project.id}
                    trigger={
                      <button
                        type="button"
                        className={`${styles.revealText} ${styles.hoverReveal}`}
                        aria-label="Add labels"
                      >
                        <Icon name="Plus" size={14} />
                        Add label
                      </button>
                    }
                  />
                </section>

                <h3 className={styles.groupLabel}>Resources</h3>
                <section id="resources" className={styles.propsSection} aria-label="Resources">
                  {resources.length > 0 ? (
                    <div className={styles.resourceList}>
                      {resources.map((resource) => (
                        <div key={resource.id} className={styles.resourceRow}>
                          <Icon name="Link" size={14} />
                          <a
                            className={styles.resourceLink}
                            href={resource.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            title={resource.url}
                          >
                            {resource.title}
                          </a>
                          <IconButton
                            label={`Remove ${resource.title}`}
                            size={24}
                            className={styles.resourceDelete}
                            onClick={() => removeResource(resource.id)}
                          >
                            <CrossGlyph />
                          </IconButton>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <button
                    type="button"
                    className={`${styles.revealText} ${styles.hoverReveal}`}
                    aria-label="Add document or link…"
                    onClick={() => setResourceOpen(true)}
                  >
                    <Icon name="Plus" size={14} />
                    Add document or link…
                  </button>
                </section>
              </div>

              {/* ---- update strip + posted updates ---- */}
              <button
                type="button"
                className={styles.updateStrip}
                onClick={() => setUpdateOpen(true)}
              >
                <span className={styles.updateStripIcon} aria-hidden="true">
                  <HealthIcon health={project.health} size={16} />
                </span>
                {latestUpdate === undefined
                  ? "Write first project update"
                  : "Write project update"}
              </button>

              {updates.length > 0 ? (
                <div className={styles.updatesList} aria-label="Project updates">
                  {updates.slice(0, 3).map((update) => {
                    const author = store.get("User", update.authorId);
                    return (
                      <article key={update.id} className={styles.updateCard}>
                        <header className={styles.updateHeader}>
                          <Avatar
                            initials={author?.initials ?? "?"}
                            color={author?.avatarColor}
                            size={18}
                          />
                          <span className={styles.updateAuthor}>
                            {author?.displayName ?? "Someone"}
                          </span>
                          <span className={styles.updateHealth}>
                            <HealthIcon health={update.health} size={14} />
                            {HEALTH_LABEL[update.health]}
                          </span>
                          <span
                            className={styles.updateDate}
                            title={new Date(update.createdAt).toLocaleString()}
                          >
                            {formatShortDate(update.createdAt)}
                          </span>
                          <IconButton
                            label="Delete update"
                            size={24}
                            className={styles.updateDelete}
                            onClick={() => {
                              client.queue.enqueue(
                                "delete",
                                "ProjectUpdate",
                                update.id,
                              );
                              showToast("Update deleted");
                            }}
                          >
                            <CrossGlyph />
                          </IconButton>
                        </header>
                        <div className={styles.updateBody}>{update.body}</div>
                      </article>
                    );
                  })}
                  {updates.length > 3 ? (
                    <Link className={styles.metaChip} href={`${base}/activity`}>
                      See all {updates.length} updates
                    </Link>
                  ) : null}
                </div>
              ) : null}

              {/* ---- description ---- */}
              <section id="project-description" className={styles.section}>
                <h3 className={styles.sectionHeading}>Description</h3>
                <DescriptionEditor
                  key={`${project.id}-description`}
                  description={project.description ?? ""}
                  onSave={saveDescription}
                />
              </section>

              {/* ---- milestones ---- */}
              <section id="milestone-list" className={styles.section}>
                <h3 className={styles.sectionHeading}>Milestones</h3>
                <div className={styles.milestoneList}>
                  {milestones.map((milestone) => (
                    <MilestoneCard
                      key={milestone.id}
                      milestone={milestone}
                      issuesHref={`${base}/issues?projectMilestoneId=${milestone.id}`}
                      highlight={milestone.id === nearestUpcomingId}
                    />
                  ))}
                  <button
                    type="button"
                    className={styles.addMilestone}
                    onClick={addMilestone}
                  >
                    <Icon name="Plus" size={14} />
                    Milestone
                  </button>
                </div>
              </section>
            </form>
          </div>

          <OutlineMinimap sections={outlineSections} />
        </div>

        <ProjectInsightsPanel
          projectId={project.id}
          open={insightsOpen}
          issuesHref={`${base}/issues`}
        />
        <ProjectDetailsRail projectId={project.id} open={railOpen} />
      </div>

      {/* ---- dialogs ---- */}
      <UpdateComposer
        open={updateOpen}
        onOpenChange={setUpdateOpen}
        projectId={project.id}
        projectName={project.name}
        currentHealth={project.health}
      />

      <ResourceDialog
        open={resourceOpen}
        onOpenChange={setResourceOpen}
        onAdd={(resource) => {
          client.mutate.updateProject(project.id, {
            resources: [...resources, resource],
          });
        }}
      />

      <SaveViewDialog
        open={saveViewOpen}
        onOpenChange={setSaveViewOpen}
        type="issues"
        // A view of THIS project's work: the issue filter grammar already
        // expresses it, so the saved row replays as ?filter=project:is:<id>.
        filter={`project:is:${encodeURIComponent(project.id)}`}
        defaultName={`${project.name} issues`}
        // Issue lists are team-scoped: reopen the view on the project's own
        // team (its first, for a project shared across several).
        teamKey={
          project.teamIds
            .map((id) => store.get("Team", id))
            .find((team) => team !== undefined)?.key
        }
      />

      <Dialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        width={420}
        label="Delete project"
      >
        <div className={styles.confirmDialog}>
          <div className={styles.confirmTitle}>Delete project?</div>
          <p className={styles.confirmBody}>
            <b>{project.name}</b> and its milestones, updates and activity will be
            deleted. Its issues stay in their teams, detached from the project.
          </p>
          <div className={styles.confirmFooter}>
            <Button variant="ghost" size={28} onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size={28} onClick={deleteProject}>
              Delete project
            </Button>
          </div>
        </div>
      </Dialog>
    </TooltipProvider>
  );
});

