"use client";

/**
 * Team Triage inbox (`/team/:KEY/triage`) — MASTER_PROMPT.md §22 + §12,
 * research-views-projects.md §5. Split view like the Inbox (§10.4): the
 * team's triage-state issues on the left (400px), the selected issue's
 * summary on the right (title, description, creator, created-at, suggested
 * team) with the DOCUMENTED actions as buttons AND keys under the "triage"
 * scope: Accept `1` → team default backlog state · Mark duplicate `2` →
 * picker of the team's issues, Duplicate state + "related" description
 * footer · Decline `3` → canceled state · Snooze `H` → hidden until
 * tomorrow via the local snooze map. `J`/`K` walk the list.
 */

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import type { IssueData, TeamData, WorkflowStateData } from "@/lib/data/types";
import { useScope, useShortcut } from "@/lib/keyboard";
import { showToast } from "@/lib/toast";
import {
  isTriageSnoozed,
  snoozeTriageIssue,
} from "@/lib/triage/snooze";
import { Header } from "@/components/shell/Header";
import { Icon } from "@/components/icons/Icon";
import { StatusIcon } from "@/components/icons/StatusIcon";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { Tooltip, TooltipProvider } from "@/components/ui/Tooltip";
import { PickerMenu } from "@/components/issues/pickers/PickerMenu";
import styles from "./triage.module.css";

/* ================================================================
 * Pure helpers
 * ================================================================ */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/** Row timestamp: "now" · "9m" · "2h" · "3d" (inbox idiom). */
function relativeTime(iso: string, now: number): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  const elapsed = Math.max(0, now - time);
  if (elapsed < MINUTE) return "now";
  if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)}m`;
  if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)}h`;
  if (elapsed < WEEK) return `${Math.floor(elapsed / DAY)}d`;
  return `${Math.floor(elapsed / WEEK)}w`;
}

const ABSOLUTE_FORMAT = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

function absoluteTime(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? "" : ABSOLUTE_FORMAT.format(time);
}

/** 09:00 local tomorrow — the `H` snooze wake time (inbox convention). */
function tomorrowMorning(from: number): Date {
  const date = new Date(from);
  date.setDate(date.getDate() + 1);
  date.setHours(9, 0, 0, 0);
  return date;
}

function slugifyTitle(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug === "" ? "issue" : slug;
}

function issueUrl(workspace: string, issue: IssueData): string {
  return `/${workspace}/issue/${issue.identifier}/${slugifyTitle(issue.title)}`;
}

/* ================================================================
 * The view
 * ================================================================ */

export const TriageView = observer(function TriageView({
  workspace,
  teamKey,
}: {
  workspace: string;
  teamKey: string;
}) {
  const store = useStore();
  const client = useSyncClient();
  const router = useRouter();
  const scrollerRef = useRef<HTMLDivElement>(null);

  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [duplicateOpen, setDuplicateOpen] = useState(false);

  const team: TeamData | undefined = store.teamByKey(teamKey);
  const ready = client.status === "ready";
  const now = Date.now();

  /* ---------- derived rows ---------- */

  const states = team !== undefined ? store.statesForTeam(team.id) : [];
  const stateById = new Map<string, WorkflowStateData>(
    states.map((state) => [state.id, state]),
  );
  const triageStateIds = new Set(
    states.filter((state) => state.category === "triage").map((s) => s.id),
  );

  const triageIssues =
    team !== undefined
      ? store
          .issuesForTeam(team.id)
          .filter((issue) => triageStateIds.has(issue.stateId))
          .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      : [];
  const visible = triageIssues.filter(
    (issue) => !isTriageSnoozed(issue.id, now),
  );

  const selected =
    visible.find((issue) => issue.id === selectedId) ?? visible[0];

  /* Keep the cursor pinned to a surviving row. */
  const visibleKey = visible.map((issue) => issue.id).join("\n");
  useEffect(() => {
    if (selectedId === undefined) return;
    if (visibleKey === "" || visibleKey.split("\n").includes(selectedId)) return;
    setSelectedId(undefined); // falls back to the first visible row
  }, [selectedId, visibleKey]);

  /* Scroll the cursor row into view when it moves off-screen. */
  useEffect(() => {
    if (selected === undefined) return;
    const row = scrollerRef.current?.querySelector(
      `[data-list-key="${CSS.escape(selected.id)}"]`,
    );
    row?.scrollIntoView({ block: "nearest" });
  }, [selected]);

  /* ---------- actions (§22: Accept 1 · Duplicate 2 · Decline 3 · Snooze H) ---------- */

  /** Advance the cursor before `issue` leaves the list. */
  const advanceFrom = (issue: IssueData): void => {
    const index = visible.findIndex((i) => i.id === issue.id);
    const successor = visible[index + 1] ?? visible[index - 1];
    setSelectedId(successor?.id);
  };

  const defaultBacklogState = (): WorkflowStateData | undefined =>
    states.find((state) => state.category === "backlog") ?? states[0];

  const duplicateState = (): WorkflowStateData | undefined => {
    const canceled = states.filter((state) => state.category === "canceled");
    return (
      canceled.find((state) => state.name.toLowerCase() === "duplicate") ??
      canceled[canceled.length - 1]
    );
  };

  const declinedState = (): WorkflowStateData | undefined =>
    states.find((state) => state.category === "canceled");

  const accept = (issue: IssueData | undefined): void => {
    if (issue === undefined) return;
    const target = defaultBacklogState();
    if (target === undefined) return;
    advanceFrom(issue);
    client.mutate.updateIssue(issue.id, { stateId: target.id });
    showToast(`${issue.identifier} accepted`);
  };

  const decline = (issue: IssueData | undefined): void => {
    if (issue === undefined) return;
    const target = declinedState();
    if (target === undefined) return;
    advanceFrom(issue);
    client.mutate.updateIssue(issue.id, { stateId: target.id });
    showToast(`${issue.identifier} declined`);
  };

  const markDuplicate = (issue: IssueData, canonical: IssueData): void => {
    const target = duplicateState();
    if (target === undefined) return;
    advanceFrom(issue);
    // §22 duplicate: Duplicate state + a "related" note in the description
    // footer pointing at the canonical issue.
    const note = `Related: duplicate of ${canonical.identifier}`;
    const description =
      issue.description !== undefined && issue.description !== ""
        ? `${issue.description}\n\n${note}`
        : note;
    client.mutate.updateIssue(issue.id, { stateId: target.id, description });
    showToast(`${issue.identifier} marked as duplicate of ${canonical.identifier}`);
  };

  const snooze = (issue: IssueData | undefined): void => {
    if (issue === undefined) return;
    advanceFrom(issue);
    snoozeTriageIssue(issue.id, tomorrowMorning(now));
    showToast("Snoozed until tomorrow");
  };

  const move = (delta: number): void => {
    if (visible.length === 0) return;
    const current =
      selected === undefined
        ? -1
        : visible.findIndex((issue) => issue.id === selected.id);
    const next =
      current < 0
        ? delta > 0
          ? 0
          : visible.length - 1
        : Math.min(visible.length - 1, Math.max(0, current + delta));
    setSelectedId(visible[next].id);
  };

  /* Duplicate picker choices: the team's other issues (triage rows excluded —
     a triage arrival cannot be the canonical copy of another). */
  const duplicateChoices =
    team !== undefined && selected !== undefined
      ? store
          .issuesForTeam(team.id)
          .filter(
            (issue) =>
              issue.id !== selected.id && !triageStateIds.has(issue.stateId),
          )
      : [];

  /* ---------- keyboard (scope "triage", §12) ---------- */

  useScope("triage");
  useShortcut({
    id: "triage.accept",
    keys: "1",
    scope: "triage",
    description: "Accept issue",
    handler: () => accept(selected),
  });
  useShortcut({
    id: "triage.duplicate",
    keys: "2",
    scope: "triage",
    description: "Mark as duplicate",
    handler: () => {
      if (selected !== undefined) setDuplicateOpen(true);
    },
  });
  useShortcut({
    id: "triage.decline",
    keys: "3",
    scope: "triage",
    description: "Decline issue",
    handler: () => decline(selected),
  });
  useShortcut({
    id: "triage.snooze",
    keys: "h",
    scope: "triage",
    description: "Snooze issue",
    handler: () => snooze(selected),
  });
  useShortcut({ id: "triage.next", keys: "j", scope: "triage", description: "Next issue", handler: () => move(1) });
  useShortcut({ id: "triage.next-arrow", keys: "arrowdown", scope: "triage", description: "Next issue", handler: () => move(1) });
  useShortcut({ id: "triage.prev", keys: "k", scope: "triage", description: "Previous issue", handler: () => move(-1) });
  useShortcut({ id: "triage.prev-arrow", keys: "arrowup", scope: "triage", description: "Previous issue", handler: () => move(-1) });
  useShortcut({
    id: "triage.open",
    keys: "enter",
    scope: "triage",
    description: "Open issue",
    handler: () => {
      if (selected !== undefined) router.push(issueUrl(workspace, selected));
    },
  });

  /* ---------- render ---------- */

  const creator =
    selected !== undefined ? store.get("User", selected.creatorId) : undefined;
  const selectedState =
    selected !== undefined ? stateById.get(selected.stateId) : undefined;

  if (team !== undefined && !team.triageEnabled) {
    return (
      <>
        <Header title="Triage" />
        <div className={styles.readingEmpty}>
          <EmptyState
            illustration={<Icon name="Triage" size={40} />}
            heading="Triage is not enabled"
          >
            Triage gives {team.name} an inbox for issues arriving from
            integrations and people outside the team. Enable it in the team
            settings.
          </EmptyState>
        </div>
      </>
    );
  }

  if (team === undefined) {
    return (
      <>
        <Header title="Triage" />
        {ready ? (
          <div className={styles.readingEmpty}>
            <EmptyState heading="Team not found">
              No team with the key “{teamKey.toUpperCase()}” exists in this
              workspace.
            </EmptyState>
          </div>
        ) : null}
      </>
    );
  }

  return (
    <TooltipProvider>
      <div className={styles.split}>
        <div className={styles.listPane}>
          <Header
            left={
              <span className={styles.summaryMetaRow}>
                <span className={styles.summaryMetaName}>Triage</span>
                <span
                  className={styles.countBadge}
                  aria-label={`${visible.length} issues in triage`}
                >
                  {visible.length}
                </span>
              </span>
            }
          />
          <div
            className={styles.listScroller}
            ref={scrollerRef}
            data-scroll-container="true"
          >
            {visible.map((issue) => {
              const state = stateById.get(issue.stateId);
              const isSelected = selected !== undefined && issue.id === selected.id;
              return (
                <button
                  key={issue.id}
                  type="button"
                  className={styles.row}
                  data-list-key={issue.id}
                  data-active={isSelected ? "true" : "false"}
                  data-keyboard-active={isSelected ? "true" : "false"}
                  aria-current={isSelected ? "true" : undefined}
                  onClick={() => setSelectedId(issue.id)}
                >
                  <span className={styles.rowTile}>
                    <StatusIcon
                      category={state?.category ?? "triage"}
                      color={state?.color}
                      size={16}
                    />
                  </span>
                  <span className={styles.rowText}>
                    <span className={styles.rowTitleLine}>
                      <span className={styles.rowTitle}>{issue.title}</span>
                      <time
                        className={styles.rowTime}
                        dateTime={issue.createdAt}
                        title={absoluteTime(issue.createdAt)}
                      >
                        {relativeTime(issue.createdAt, now)}
                      </time>
                    </span>
                    <span className={styles.rowSnippet}>
                      {issue.identifier}
                      {issue.description !== undefined
                        ? ` · ${issue.description}`
                        : ""}
                    </span>
                  </span>
                </button>
              );
            })}
            {visible.length === 0 && (
              <p className={styles.listEmpty}>
                {triageIssues.length > 0
                  ? "Everything is snoozed."
                  : "No issues in triage. Incoming issues from integrations and non-members land here."}
              </p>
            )}
          </div>
        </div>

        <div className={styles.readingPane}>
          <Header
            right={
              <>
                <Tooltip content="Accept" keys={["1"]}>
                  <Button
                    variant="secondary"
                    size={28}
                    disabled={selected === undefined}
                    onClick={() => accept(selected)}
                  >
                    Accept
                  </Button>
                </Tooltip>
                <PickerMenu
                  open={duplicateOpen}
                  onOpenChange={setDuplicateOpen}
                  placeholder="Mark as duplicate of…"
                  anchor={
                    <span>
                      <Tooltip content="Mark as duplicate" keys={["2"]}>
                        {/* Clicks bubble to the cloned Radix trigger span,
                            which owns the open/close toggle — no local
                            onClick, or the two would fight over state. */}
                        <Button
                          variant="secondary"
                          size={28}
                          disabled={
                            selected === undefined || duplicateChoices.length === 0
                          }
                          aria-haspopup="menu"
                          aria-expanded={duplicateOpen}
                        >
                          Mark duplicate
                        </Button>
                      </Tooltip>
                    </span>
                  }
                  items={duplicateChoices.map((issue) => ({
                    id: issue.id,
                    label: `${issue.identifier} ${issue.title}`,
                    icon: (
                      <StatusIcon
                        category={
                          stateById.get(issue.stateId)?.category ?? "backlog"
                        }
                        color={stateById.get(issue.stateId)?.color}
                        size={14}
                      />
                    ),
                    onSelect: () => {
                      if (selected !== undefined) markDuplicate(selected, issue);
                    },
                  }))}
                />
                <Tooltip content="Decline" keys={["3"]}>
                  <Button
                    variant="secondary"
                    size={28}
                    disabled={selected === undefined}
                    onClick={() => decline(selected)}
                  >
                    Decline
                  </Button>
                </Tooltip>
                <Tooltip content="Snooze until tomorrow" keys={["H"]}>
                  <Button
                    variant="secondary"
                    size={28}
                    disabled={selected === undefined}
                    onClick={() => snooze(selected)}
                  >
                    Snooze
                  </Button>
                </Tooltip>
              </>
            }
          />
          {selected === undefined ? (
            <div className={styles.readingEmpty}>
              <span className={styles.readingEmptyGlyph}>
                <Icon name="Triage" size={48} />
              </span>
              <span className={styles.readingEmptyLabel}>
                No issues to triage
              </span>
            </div>
          ) : (
            <div
              className={styles.readingScroller}
              tabIndex={0}
              data-scroll-container="true"
            >
              <div className={styles.readingColumn}>
                <div className={styles.summary}>
                  <span className={styles.summaryIdentifier}>
                    {selected.identifier}
                  </span>
                  <Link
                    className={styles.summaryTitle}
                    href={issueUrl(workspace, selected)}
                  >
                    {selected.title}
                  </Link>
                  <div className={styles.summaryMetaRow}>
                    <StatusIcon
                      category={selectedState?.category ?? "triage"}
                      color={selectedState?.color}
                      size={14}
                    />
                    {selectedState?.name ?? "Triage"}
                  </div>
                  {selected.description !== undefined && (
                    <p className={styles.summaryDescription}>
                      {selected.description}
                    </p>
                  )}
                  <div className={styles.summaryMetaRow}>
                    {creator !== undefined && (
                      <Avatar
                        initials={creator.initials}
                        color={creator.avatarColor}
                        size={18}
                        src={creator.avatarUrl}
                      />
                    )}
                    <span>
                      <span className={styles.summaryMetaName}>
                        {creator?.displayName ?? "Someone"}
                      </span>{" "}
                      created this issue · {absoluteTime(selected.createdAt)}
                    </span>
                  </div>
                  <div className={styles.suggestedRow}>
                    Suggested team
                    <span className={styles.teamChip}>
                      <Icon name={team.icon} size={14} color={team.color} />
                      {team.name}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
});
