"use client";

/**
 * Project Activity (`/project/:slug/activity`) — breadcrumb header
 * "Projects › {name} › Activity" + the project's activity entries
 * (capture §6.8 entry anatomy: 16px icon · 12.5px muted text with bold
 * actor/subject · "Aug 24" date with absolute-time tooltip).
 *
 * When the store holds no project activities yet, a "created the project"
 * entry is synthesized from `project.createdAt` (matches the capture, where
 * creation is always the first entry).
 */

import Link from "next/link";
import { observer } from "mobx-react-lite";
import { Header } from "@/components/shell/Header";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/Button";
import {
  CrossGlyph,
  HealthIcon,
  MilestoneDiamond,
  projectIconFor,
} from "@/components/projects/glyphs";
import {
  HEALTH_LABEL,
  updatesForProject,
} from "@/components/projects/UpdateComposer";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { showToast } from "@/lib/toast";
import type { ActivityData, ProjectData } from "@/lib/data/types";
import shellStyles from "@/components/shell/shell.module.css";
import styles from "@/components/projects/overview.module.css";

const DATE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});

/** Absolute tooltip form (capture: "Mon Aug 24, 15:57:57"). */
const ABSOLUTE_FORMAT = new Intl.DateTimeFormat("en-US", {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** Emoji icons start with a non-ASCII unit (same heuristic as glyphs). */
function isEmojiIcon(icon: string | undefined): icon is string {
  return icon !== undefined && icon !== "" && icon.charCodeAt(0) > 0x7f;
}

function EntryTime({ iso }: { iso: string }) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return null;
  return (
    <span className={styles.activityTime} title={ABSOLUTE_FORMAT.format(time)}>
      {DATE_FORMAT.format(time)}
    </span>
  );
}

const ActivityEntry = observer(function ActivityEntry({
  activity,
  project,
}: {
  activity: ActivityData;
  project: ProjectData;
}) {
  const store = useStore();
  const actor = store.get("User", activity.actorId);
  const actorName = actor?.displayName ?? "Someone";

  if (activity.type === "milestoneCompleted") {
    return (
      <div className={styles.activityEntry} data-activity-item="true">
        <span className={styles.activityIcon} aria-hidden="true">
          <MilestoneDiamond size={16} filled color="var(--color-accent)" />
        </span>
        <span className={styles.activityText}>
          Milestone{" "}
          <span className={styles.activityStrong}>{activity.to ?? "Milestone"}</span>{" "}
          completed · <EntryTime iso={activity.createdAt} />
        </span>
      </div>
    );
  }

  const verb =
    activity.type === "created"
      ? "created the project"
      : activity.type === "stateChanged"
        ? `changed status${activity.to !== undefined ? ` to ${activity.to}` : ""}`
        : `updated the project`;

  return (
    <div className={styles.activityEntry} data-activity-item="true">
      <span className={styles.activityIcon} aria-hidden="true">
        {isEmojiIcon(project.icon) ? project.icon : projectIconFor(project)}
      </span>
      <span className={styles.activityText}>
        <span className={styles.activityStrong}>{actorName}</span> {verb} ·{" "}
        <EntryTime iso={activity.createdAt} />
      </span>
    </div>
  );
});

export const ProjectActivityView = observer(function ProjectActivityView({
  workspace,
  slug,
}: {
  workspace: string;
  slug: string;
}) {
  const client = useSyncClient();
  const store = useStore();

  const project = store.projectBySlug(slug);
  const base = `/${workspace}/project/${slug}`;
  const booting = project === undefined && client.status === "booting";

  const breadcrumb = (
    <nav className={styles.crumbs} aria-label="Breadcrumb">
      <Link className={styles.crumb} href={`/${workspace}/projects/all`}>
        Projects
      </Link>
      <span className={styles.crumbSep} aria-hidden="true">
        ›
      </span>
      {project !== undefined ? (
        <Link className={styles.crumb} href={`${base}/overview`} title={project.name}>
          <span className={styles.crumbProjectIcon} data-type="emoji" aria-hidden="true">
            {isEmojiIcon(project.icon) ? project.icon : projectIconFor(project)}
          </span>
          {project.name}
        </Link>
      ) : (
        <span
          className={`${styles.skeleton} ${styles.crumbSkeleton}`}
          aria-hidden="true"
        />
      )}
      <span className={styles.crumbSep} aria-hidden="true">
        ›
      </span>
      <span className={styles.crumbCurrent}>Activity</span>
    </nav>
  );

  const tabsRow =
    project !== undefined ? (
      <div className={shellStyles.tabStrip}>
        <Link className={shellStyles.tab} href={`${base}/overview`}>
          Overview
        </Link>
        <Link className={shellStyles.tab} href={`${base}/activity`} data-active="true">
          Activity
        </Link>
        <Link className={shellStyles.tab} href={`${base}/issues`}>
          Issues
        </Link>
      </div>
    ) : undefined;

  if (project === undefined) {
    return (
      <>
        <Header left={breadcrumb} />
        {booting ? null : (
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

  // Newest first (capture rail order). Synthesize creation when empty.
  const activities = store
    .all("Activity")
    .filter((activity) => activity.projectId === project.id)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));

  const entries: ActivityData[] =
    activities.length > 0
      ? activities
      : [
          {
            id: `${project.id}-created-synth`,
            projectId: project.id,
            actorId: project.leadId ?? project.memberIds[0] ?? "",
            type: "created",
            createdAt: project.createdAt,
          },
        ];

  // Posted project updates, newest first (§10.2 — the composer writes these).
  const updates = updatesForProject(store.all("ProjectUpdate"), project.id);

  return (
    <>
      <Header left={breadcrumb} tabs={tabsRow} />
      <div className={styles.scroller} tabIndex={0} data-scroll-container="true">
        <div className={styles.activityColumn}>
          {updates.length > 0 ? (
            <div className={styles.updatesList} aria-label="Project updates">
              {updates.map((update) => {
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
                        title={ABSOLUTE_FORMAT.format(Date.parse(update.createdAt))}
                      >
                        {DATE_FORMAT.format(Date.parse(update.createdAt))}
                      </span>
                      <IconButton
                        label="Delete update"
                        size={24}
                        className={styles.updateDelete}
                        onClick={() => {
                          client.queue.enqueue("delete", "ProjectUpdate", update.id);
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
            </div>
          ) : null}

          {entries.map((activity) => (
            <ActivityEntry key={activity.id} activity={activity} project={project} />
          ))}
        </div>
      </div>
    </>
  );
});
