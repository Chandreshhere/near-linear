"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { observer } from "mobx-react-lite";
import { Header } from "@/components/shell/Header";
import { IconButton } from "@/components/ui/Button";
import { Menu } from "@/components/ui/Menu";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { FavoriteStar } from "@/components/nav/Favorites";
import { Icon } from "@/components/icons/Icon";
import { copyToClipboard } from "@/lib/toast";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { useScope, useShortcut } from "@/lib/keyboard";
import {
  AttachmentList,
  useAttachmentInput,
} from "@/components/issues/attachments";
import { TitleEditor } from "@/components/issues/detail/TitleEditor";
import { DescriptionEditor } from "@/components/issues/detail/DescriptionEditor";
import { PropertyRail } from "@/components/issues/detail/PropertyRail";
import { ActivityFeed } from "@/components/issues/detail/ActivityFeed";
import { ActionStrip } from "@/components/issues/detail/ActionStrip";
import { Reactions } from "@/components/issues/detail/Reactions";
import { SubIssues } from "@/components/issues/detail/SubIssues";
import { CommentComposer } from "@/components/issues/detail/CommentComposer";
import type { AttachmentData } from "@/lib/data/types";
import styles from "@/components/issues/detail/detail.module.css";

/** Boot skeleton — grid shape held while the local store hydrates. */
function DetailSkeleton() {
  return (
    <div className={styles.viewContainer} data-view-id="issue-view">
      <div className={styles.grid}>
        <div className={styles.contentCol}>
          <span className={clsx(styles.skeleton, styles.skeletonTitle)} />
          <span
            className={clsx(styles.skeleton, styles.skeletonLine)}
            style={{ width: "72%" }}
          />
          <span
            className={clsx(styles.skeleton, styles.skeletonLine)}
            style={{ width: "58%" }}
          />
        </div>
        <div className={styles.railCol}>
          <div className={styles.railSticky}>
            {[0, 1, 2].map((i) => (
              <span key={i} className={clsx(styles.skeleton, styles.skeletonRow)} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Issue detail (MASTER_PROMPT.md §10.3 + §16.7–8 — CAPTURED layout):
 * breadcrumb header, floating copy-action strip, 4-track content grid
 * (80ch editor column + sticky property rail), activity feed, composer.
 */
export const IssueDetailView = observer(function IssueDetailView({
  workspace,
  identifier,
}: {
  workspace: string;
  identifier: string;
}) {
  const client = useSyncClient();
  const store = useStore();
  const router = useRouter();

  const issue = store.issueByIdentifier(identifier);
  const team = issue !== undefined ? store.get("Team", issue.teamId) : undefined;

  useScope("issue", issue !== undefined);

  // ---------- copy cluster (§16.8: toasts stack + survive navigation) ----------
  // The strip's own buttons live in <ActionStrip>; this keeps the ⌘⌥P binding
  // (§12) working from anywhere on the page.

  const copyPrompt = () => {
    if (issue === undefined) return;
    const markdown =
      `# ${issue.identifier} ${issue.title}\n\n${issue.description ?? ""}`.trimEnd() +
      "\n";
    void copyToClipboard(markdown, "Prompt copied to clipboard");
  };

  useShortcut({
    id: "issue.copy-as-prompt",
    keys: "mod+alt+p",
    scope: "issue",
    description: "Copy as prompt",
    handler: (event) => {
      event.preventDefault();
      copyPrompt();
    },
  });

  // ---------- attachments (§10.3) ----------

  const attachments: AttachmentData[] = issue?.attachments ?? [];

  const attachment = useAttachmentInput((added) => {
    if (issue === undefined) return;
    client.mutate.updateIssue(issue.id, {
      attachments: [...(issue.attachments ?? []), ...added],
    });
  });

  const removeAttachment = (id: string): void => {
    if (issue === undefined) return;
    client.mutate.updateIssue(issue.id, {
      attachments: (issue.attachments ?? []).filter((a) => a.id !== id),
    });
  };

  // ---------- mutations ----------

  const saveTitle = (title: string) => {
    if (issue === undefined) return;
    const next = title.trim() === "" ? issue.title : title;
    if (next !== issue.title) client.mutate.updateIssue(issue.id, { title: next });
  };
  const saveDescription = (description: string) => {
    if (issue === undefined) return;
    if (description !== (issue.description ?? "")) {
      client.mutate.updateIssue(issue.id, { description });
    }
  };
  const deleteIssue = () => {
    if (issue === undefined) return;
    const backHref = team ? `/${workspace}/team/${team.key}/all` : `/${workspace}`;
    client.mutate.deleteIssue(issue.id);
    if (window.history.length > 1) router.back();
    else router.push(backHref);
  };

  // ---------- loading / missing ----------

  if (issue === undefined || team === undefined) {
    const booting = client.status === "booting";
    return (
      <>
        <Header
          left={
            booting ? (
              <span className={clsx(styles.skeleton, styles.skeletonCrumb)} />
            ) : (
              <span className={styles.crumbCurrent}>{identifier}</span>
            )
          }
        />
        {booting ? (
          <DetailSkeleton />
        ) : (
          <div className={styles.notFound}>
            <div className={styles.notFoundTitle}>Issue not found</div>
            <div className={styles.notFoundBody}>
              {identifier} doesn&rsquo;t exist or was deleted.
            </div>
          </div>
        )}
      </>
    );
  }

  const teamBase = `/${workspace}/team/${team.key}`;

  return (
    <TooltipProvider>
      <Header
        wide
        left={
          <>
            <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
              <Link
                className={styles.crumb}
                href={`${teamBase}/overview`}
                aria-label="Team overview"
              >
                <span className={styles.crumbTeamIcon}>
                  <Icon name={team.icon} size={14} color={team.color} />
                </span>
                {team.name}
              </Link>
              <span className={styles.crumbSep} aria-hidden="true">
                ›
              </span>
              <Link className={styles.crumb} href={`${teamBase}/all`} aria-label="All issues">
                Issues
              </Link>
              <span className={styles.crumbSep} aria-hidden="true">
                ›
              </span>
              <span
                className={styles.crumbCurrent}
                title={`${issue.identifier} ${issue.title}`}
              >
                {issue.identifier} {issue.title}
              </span>
            </nav>
            <FavoriteStar entityType="issue" entityId={issue.id} size={14} />
            <Menu
              trigger={
                <IconButton label="Issue options" size={28}>
                  <Icon name="More" size={14} />
                </IconButton>
              }
              items={[{ label: "Delete issue", onSelect: deleteIssue }]}
            />
          </>
        }
      />

      <div className={styles.viewContainer} data-view-id="issue-view">
        {/* Floating copy-action strip (CAPTURED: under header, right) */}
        <ActionStrip issue={issue} />

        <div
          className={styles.grid}
          data-restore-scroll-view="issue-view"
          data-scroll-container="true"
          tabIndex={0}
        >
          {/* -------- col 2: editor column -------- */}
          <div
            className={styles.contentCol}
            data-table-overhang-boundary="both"
          >
            <TitleEditor key={issue.id} title={issue.title} onSave={saveTitle} />
            <DescriptionEditor
              key={`${issue.id}-description`}
              description={issue.description ?? ""}
              onSave={saveDescription}
            />

            <div className={styles.editorActionRow}>
              <Reactions issue={issue} />
              <IconButton
                label="Attach images, files, or videos"
                size={24}
                onClick={attachment.open}
              >
                <Icon name="Attachment" size={14} />
              </IconButton>
              {attachment.input}
            </div>

            <AttachmentList items={attachments} onRemove={removeAttachment} />

            <SubIssues issue={issue} workspace={workspace} />

            <div className={styles.divider} role="separator" />

            <ActivityFeed issue={issue} />
            <CommentComposer issue={issue} />
          </div>

          {/* -------- col 3: sticky property rail -------- */}
          <div className={styles.railCol}>
            <div className={styles.railSticky}>
              <PropertyRail issue={issue} />
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
});
