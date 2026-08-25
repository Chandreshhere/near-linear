"use client";

/**
 * Issue creation modal + drafts — MASTER_PROMPT.md §14 (CAPTURED + DOCUMENTED),
 * docs/analysis/video-timeline-2.md findings 13–14.
 *
 * - <CreateIssueHost/> is a mount-once host (workspace layout): owns the open
 *   state, listens for `openCreateIssue()` events and registers the global "C"
 *   shortcut (never inside inputs).
 * - "Save as draft" is content-reactive: it exists only while title or
 *   description is non-empty (finding 14 — appears on first char, vanishes
 *   when cleared; closing an emptied modal is a silent close).
 * - Esc/✕/outside-click with content → inline "Save to drafts?" confirm row
 *   replacing the footer; Save draft persists to localStorage "issueDraft"
 *   and the next open restores it.
 * - Property chips open tiny LOCAL menus (absolutely-positioned elevated
 *   panels, 28px rows). The shared pickers (src/components/issues/pickers/*)
 *   are intentionally NOT used here: they mutate existing issues by id, while
 *   the modal picks values for an issue that does not exist yet.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type JSX,
  type ReactNode,
} from "react";
import { observer } from "mobx-react-lite";
import clsx from "clsx";
import { Dialog } from "@/components/ui/Dialog";
import { Button, IconButton } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Avatar } from "@/components/ui/Avatar";
import { Icon } from "@/components/icons/Icon";
import { PriorityIcon, StatusIcon } from "@/components/icons/StatusIcon";
import { useSyncClient } from "@/lib/data/DataProvider";
import { KeyboardProvider, useScope, useShortcut } from "@/lib/keyboard";
import { showToast } from "@/lib/toast";
import { openCreateTeamDialog } from "@/components/teams/CreateTeamDialog";
import { AttachmentList, useAttachmentInput } from "./attachments";
import type { SyncStore } from "@/lib/data/store";
import type {
  AttachmentData,
  IssueData,
  LabelData,
  Priority,
  UUID,
  WorkflowStateData,
} from "@/lib/data/types";
import styles from "./createissue.module.css";

/* ================================================================
 * Module-level open event (any caller: sidebar pencil, board column +…)
 * ================================================================ */

export interface CreateIssuePrefill {
  teamId?: UUID;
  stateId?: UUID;
  /** Set by "Add sub-issues" — the created issue becomes this issue's child. */
  parentId?: UUID;
  /** Open straight into the fullscreen composer (the `V` entry point, §14). */
  fullscreen?: boolean;
}

const OPEN_EVENT = "linear:create-issue:open";

/** Ask the mounted <CreateIssueHost/> to open, optionally pre-filled. */
export function openCreateIssue(prefill?: CreateIssuePrefill): void {
  if (typeof window === "undefined") return; // SSR guard
  window.dispatchEvent(
    new CustomEvent<CreateIssuePrefill>(OPEN_EVENT, { detail: prefill ?? {} })
  );
}

/* ================================================================
 * Draft persistence (§14 — explicit saved draft, localStorage layer)
 * ================================================================ */

const DRAFT_KEY = "issueDraft";

interface DraftProperties {
  teamId: UUID;
  stateId: UUID;
  priority: Priority;
  assigneeId?: UUID;
  projectId?: UUID;
  labelIds: UUID[];
}

interface IssueDraft {
  prefill?: CreateIssuePrefill;
  title: string;
  description: string;
  properties: DraftProperties;
}

function clampPriority(p: Priority): Priority {
  return p === 1 || p === 2 || p === 3 || p === 4 ? p : 0;
}

function readDraft(): IssueDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (raw === null) return null;
    // Written by writeDraft below; validate the load-bearing fields anyway.
    const d = JSON.parse(raw) as IssueDraft;
    if (typeof d?.title !== "string" || typeof d?.description !== "string") {
      return null;
    }
    const p = d.properties;
    if (typeof p?.teamId !== "string" || typeof p?.stateId !== "string") {
      return null;
    }
    return {
      ...d,
      properties: {
        ...p,
        priority: clampPriority(p.priority),
        labelIds: Array.isArray(p.labelIds) ? p.labelIds : [],
      },
    };
  } catch {
    return null;
  }
}

function writeDraft(draft: IssueDraft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* storage unavailable — draft is best-effort */
  }
}

function clearStoredDraft(): void {
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
}

/* ================================================================
 * Shared bits
 * ================================================================ */

/** Auth arrives in a later phase (§17); the seed session user creates issues. */
const CURRENT_USER_ID: UUID = "u-yk";

const PRIORITY_LABELS: Record<Priority, string> = {
  0: "No priority",
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
};

const PRIORITY_VALUES: Priority[] = [0, 1, 2, 3, 4];

/** Team default state = first Backlog status (§14 required fields). */
function defaultStateFor(
  store: SyncStore,
  teamId: UUID
): WorkflowStateData | undefined {
  const states = store.statesForTeam(teamId);
  return states.find((s) => s.category === "backlog") ?? states[0];
}

type MenuId = "status" | "priority" | "assignee" | "project" | "labels";

const MENU_ROW_HEIGHT = 28;
const MENU_MAX_HEIGHT = 224; // caps tall lists; panel scrolls internally

/** Panel height for n rows (28px rows + 4px padding top/bottom, capped). */
function panelHeight(rows: number): number {
  return Math.min(rows * MENU_ROW_HEIGHT + 8, MENU_MAX_HEIGHT);
}

/* ================================================================
 * Inline glyphs not in the sprite sheet (stroke-based, inherit color)
 * ================================================================ */

function GlyphExpand(): JSX.Element {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M9.75 2.05h3.5c.39 0 .7.31.7.7v3.5a.7.7 0 0 1-1.4 0V4.44L9.74 7.25a.7.7 0 0 1-.99-.99l2.81-2.81H9.75a.7.7 0 0 1 0-1.4ZM6.25 13.95h-3.5a.7.7 0 0 1-.7-.7v-3.5a.7.7 0 0 1 1.4 0v1.81l2.81-2.81a.7.7 0 0 1 .99.99l-2.81 2.81h1.81a.7.7 0 0 1 0 1.4Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GlyphClose(): JSX.Element {
  return (
    <svg width={16} height={16} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.99 4a.7.7 0 0 0-.99.99L7.01 8l-3.01 3.01a.7.7 0 1 0 .99.99L8 8.99l3.01 3.01a.7.7 0 0 0 .99-.99L8.99 8 12 4.99A.7.7 0 0 0 11.01 4L8 7.01 4.99 4Z" fill="currentColor" />
    </svg>
  );
}

function GlyphCheck(): JSX.Element {
  return (
    <svg width={14} height={14} viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M11.18 4.13a.66.66 0 0 1 0 .93l-4.37 4.37a.66.66 0 0 1-.93 0L3.7 7.25a.66.66 0 1 1 .93-.93l1.71 1.71 3.91-3.9a.66.66 0 0 1 .93 0Z" fill="currentColor" />
    </svg>
  );
}

/** Dashed "unassigned person" (assignee placeholder — §10.4 rail idiom). */
function GlyphPersonDashed(): JSX.Element {
  return <Icon name="PersonDashed" size={14} color="currentColor" />;
}

/* ================================================================
 * Local chip + menu (tiny, self-contained — NOT the shared pickers)
 * ================================================================ */

interface ChipMenuRow {
  key: string;
  icon: ReactNode;
  label: string;
  selected: boolean;
  onSelect: () => void;
}

function ChipMenu({
  open,
  onToggle,
  ariaLabel,
  icon,
  label,
  rows,
  multi = false,
}: {
  open: boolean;
  onToggle: () => void;
  ariaLabel: string;
  icon: ReactNode;
  label: string;
  rows: ChipMenuRow[];
  /** multi-select menus (labels) render check-item semantics */
  multi?: boolean;
}): JSX.Element {
  return (
    <div className={styles.chipWrap}>
      <button
        type="button"
        className={styles.chip}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        data-menu-open={open ? "true" : undefined}
        onClick={onToggle}
      >
        <span className={styles.chipIcon} aria-hidden="true">
          {icon}
        </span>
        <span className={styles.chipLabel}>{label}</span>
      </button>
      {open ? (
        <div className={styles.menuPanel} role="menu" aria-label={ariaLabel}>
          {rows.map((row) => (
            <button
              key={row.key}
              type="button"
              role={multi ? "menuitemcheckbox" : "menuitemradio"}
              aria-checked={row.selected}
              className={styles.menuRow}
              onClick={row.onSelect}
            >
              <span className={styles.menuRowIcon} aria-hidden="true">
                {row.icon}
              </span>
              <span className={styles.menuRowLabel}>{row.label}</span>
              {row.selected ? (
                <span className={styles.menuCheck} aria-hidden="true">
                  <GlyphCheck />
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

/* ================================================================
 * Host
 * ================================================================ */

export const CreateIssueHost = observer(function CreateIssueHost(): JSX.Element {
  const client = useSyncClient();

  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [menu, setMenu] = useState<MenuId | null>(null);
  const [createMore, setCreateMore] = useState(false);
  /** §14 "expand ⤢" / the global `V` entry point. */
  const [fullscreen, setFullscreen] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [teamId, setTeamId] = useState<UUID | null>(null);
  const [stateId, setStateId] = useState<UUID | null>(null);
  const [priority, setPriority] = useState<Priority>(0);
  const [assigneeId, setAssigneeId] = useState<UUID | undefined>(undefined);
  const [projectId, setProjectId] = useState<UUID | undefined>(undefined);
  const [labelIds, setLabelIds] = useState<UUID[]>([]);
  const [parentId, setParentId] = useState<UUID | undefined>(undefined);
  const [attachments, setAttachments] = useState<AttachmentData[]>([]);

  const attachment = useAttachmentInput((added) =>
    setAttachments((current) => [...current, ...added]),
  );

  const titleRef = useRef<HTMLInputElement>(null);
  const descRef = useRef<HTMLTextAreaElement>(null);
  const chipRowRef = useRef<HTMLDivElement>(null);
  const lastPrefillRef = useRef<CreateIssuePrefill | undefined>(undefined);
  const lastBodyRef = useRef<JSX.Element | null>(null);
  const openRef = useRef(false);
  openRef.current = open;

  /** Content-reactive dirtiness — drives Save as draft + Esc behavior (§14). */
  const dirty = title.trim() !== "" || description.trim() !== "";

  const autosizeDescription = useCallback(() => {
    const el = descRef.current;
    if (el === null) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  /* ---------------- open / close ---------------- */

  const openModal = useCallback(
    (prefill?: CreateIssuePrefill) => {
      if (openRef.current) return; // already open — never clobber typed content
      const store = client.store;
      const draft = readDraft();
      const teams = store
        .all("Team")
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const nextTeamId =
        prefill?.teamId ?? draft?.properties.teamId ?? teams[0]?.id;
      if (nextTeamId === undefined) {
        // Nothing to file an issue against. Silence here made every empty
        // state's primary button look broken — send the user to the thing
        // that has to exist first instead.
        if (client.status === "ready") {
          showToast("Create a team first — issues belong to one");
          openCreateTeamDialog();
        }
        return;
      }
      const draftMatchesTeam =
        draft !== null && draft.properties.teamId === nextTeamId;
      const nextStateId =
        prefill?.stateId ??
        (draftMatchesTeam
          ? draft.properties.stateId
          : defaultStateFor(store, nextTeamId)?.id);
      if (nextStateId === undefined) {
        showToast("This team has no workflow statuses yet");
        return;
      }

      lastPrefillRef.current = prefill;
      setTeamId(nextTeamId);
      setStateId(nextStateId);
      // Restore the persisted draft (its content makes Save as draft visible).
      setTitle(draft?.title ?? "");
      setDescription(draft?.description ?? "");
      setPriority(draft?.properties.priority ?? 0);
      setAssigneeId(draft?.properties.assigneeId);
      setProjectId(draftMatchesTeam ? draft.properties.projectId : undefined);
      setLabelIds(draft?.properties.labelIds ?? []);
      setParentId(prefill?.parentId);
      setAttachments([]);
      setFullscreen(prefill?.fullscreen === true);
      setConfirming(false);
      setMenu(null);
      setOpen(true);
    },
    [client]
  );

  const reallyClose = useCallback(() => {
    setOpen(false);
    setMenu(null);
    setConfirming(false);
  }, []);

  /**
   * Single dismiss path (Esc via Radix, overlay click, ✕) — §6.9 Esc order:
   * open chip menu → confirm row → draft prompt when dirty → silent close.
   */
  const requestClose = useCallback(() => {
    if (menu !== null) {
      setMenu(null);
      return;
    }
    if (confirming) {
      setConfirming(false); // back to editing
      return;
    }
    if (dirty) {
      setConfirming(true); // "Save to drafts?" (§14 CAPTURED)
      return;
    }
    // Emptied modal closes silently; deliberate clearing drops the stored draft.
    clearStoredDraft();
    reallyClose();
  }, [menu, confirming, dirty, reallyClose]);

  const saveDraftAndClose = useCallback(() => {
    if (teamId === null || stateId === null) return;
    writeDraft({
      prefill: lastPrefillRef.current,
      title,
      description,
      properties: { teamId, stateId, priority, assigneeId, projectId, labelIds },
    });
    reallyClose();
  }, [
    teamId,
    stateId,
    title,
    description,
    priority,
    assigneeId,
    projectId,
    labelIds,
    reallyClose,
  ]);

  const discardAndClose = useCallback(() => {
    clearStoredDraft();
    reallyClose();
  }, [reallyClose]);

  /* ---------------- create ---------------- */

  const submit = useCallback(() => {
    if (teamId === null || stateId === null) return;
    const trimmedTitle = title.trim();
    if (trimmedTitle === "") return;
    const store = client.store;
    const team = store.get("Team", teamId);
    if (team === undefined) return;

    // The server owns numbering; locally allocate max existing number + 1.
    const number =
      store.issuesForTeam(teamId).reduce((max, i) => Math.max(max, i.number), 0) +
      1;
    // Insert at the top of the target state (issuesForState is sorted asc).
    const inState = store.issuesForState(stateId);
    const sortOrder = inState.length > 0 ? inState[0].sortOrder - 1 : 1000;
    const now = new Date().toISOString();

    const row: IssueData = {
      id: crypto.randomUUID(),
      identifier: `${team.key}-${number}`,
      number,
      teamId,
      title: trimmedTitle,
      description: description.trim() === "" ? undefined : description,
      stateId,
      priority,
      assigneeId,
      creatorId: CURRENT_USER_ID,
      labelIds: [...labelIds],
      projectId,
      parentId,
      subscriberIds: [CURRENT_USER_ID],
      attachments: attachments.length > 0 ? attachments.map((a) => ({ ...a })) : undefined,
      sortOrder,
      createdAt: now,
      updatedAt: now,
    };
    client.mutate.createIssue(row); // optimistic — appears in list/board instantly
    showToast(
      parentId !== undefined
        ? `Created ${row.identifier} as a sub-issue`
        : `Created ${row.identifier}`,
    );
    clearStoredDraft(); // composed content was consumed

    if (createMore) {
      // Keep the modal open with properties intact; reset content only (§14).
      setTitle("");
      setDescription("");
      setAttachments([]);
      setConfirming(false);
      setMenu(null);
      if (descRef.current !== null) descRef.current.style.height = "";
      titleRef.current?.focus();
    } else {
      reallyClose();
    }
  }, [
    client,
    teamId,
    stateId,
    title,
    description,
    priority,
    assigneeId,
    projectId,
    labelIds,
    parentId,
    attachments,
    createMore,
    reallyClose,
  ]);

  /* ---------------- wiring ---------------- */

  // Global "C" (skipped while typing in inputs — allowInInput stays false).
  useShortcut({
    id: "create-issue",
    keys: "c",
    scope: "global",
    description: "Create new issue",
    handler: () => openModal(),
  });

  // §12 global "V": create fullscreen. While the modal is already open the
  // same key toggles the expand ⤢ state, so V is one idea, not two.
  useShortcut({
    id: "create-issue-fullscreen",
    keys: "v",
    scope: "global",
    description: "Create new issue fullscreen",
    handler: () => {
      if (openRef.current) setFullscreen((value) => !value);
      else openModal({ fullscreen: true });
    },
  });

  // Modal scope: lets the dialog own keys while it is up (§12 scoping).
  useScope("modal", open);

  // openCreateIssue() event bridge.
  useEffect(() => {
    const onOpen = (e: Event): void => {
      const detail = (e as CustomEvent<CreateIssuePrefill>).detail;
      openModal(detail ?? undefined);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [openModal]);

  // Click-away closes an open chip menu (clicks on the chips row are theirs).
  useEffect(() => {
    if (menu === null) return;
    const onPointerDown = (e: PointerEvent): void => {
      const row = chipRowRef.current;
      if (row !== null && e.target instanceof Node && !row.contains(e.target)) {
        setMenu(null);
      }
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => window.removeEventListener("pointerdown", onPointerDown, true);
  }, [menu]);

  // On open: grow the description to any restored draft; ensure title focus
  // (this ancestor effect runs after Radix FocusScope's own mount focus).
  useEffect(() => {
    if (!open) return;
    autosizeDescription();
    const el = titleRef.current;
    if (el !== null && document.activeElement !== el) el.focus();
  }, [open, autosizeDescription]);

  /* ---------------- render ---------------- */

  const store = client.store;
  let body: JSX.Element | null = null;

  if (open && teamId !== null && stateId !== null) {
    const team = store.get("Team", teamId);
    const state = store.get("WorkflowState", stateId);
    if (team !== undefined && state !== undefined) {
      const states = store.statesForTeam(teamId);
      const users = store
        .all("User")
        .slice()
        .sort((a, b) => a.displayName.localeCompare(b.displayName));
      const projects = store
        .all("Project")
        .filter((p) => p.teamIds.includes(teamId))
        .sort((a, b) => a.sortOrder - b.sortOrder);
      const labels = store
        .all("Label")
        .filter((l) => !l.isGroup && (l.teamId === undefined || l.teamId === teamId))
        .sort((a, b) => a.name.localeCompare(b.name));
      const assignee =
        assigneeId !== undefined ? store.get("User", assigneeId) : undefined;
      const project =
        projectId !== undefined ? store.get("Project", projectId) : undefined;
      const selectedLabels = labelIds
        .map((id) => store.get("Label", id))
        .filter((l): l is LabelData => l !== undefined);

      const menuRows: Record<MenuId, number> = {
        status: states.length,
        priority: PRIORITY_VALUES.length,
        assignee: users.length + 1,
        project: projects.length + 1,
        labels: labels.length,
      };
      const toggleMenu = (id: MenuId): void =>
        setMenu((current) => (current === id ? null : id));

      const toggleLabel = (id: UUID): void =>
        setLabelIds((current) =>
          current.includes(id)
            ? current.filter((x) => x !== id)
            : [...current, id]
        );

      const parentIssue =
        parentId !== undefined ? store.get("Issue", parentId) : undefined;

      body = (
        <div
          className={clsx(styles.modal, fullscreen && styles.modalFullscreen)}
          onKeyDown={(e) => {
            // mod+enter creates when valid (local to the dialog content).
            if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
              e.preventDefault();
              submit();
            }
          }}
        >
          {/* header: team chip › "New issue" · [Save as draft] ⤢ ✕ */}
          <div className={styles.header}>
            <div className={styles.teamChip} title={team.name}>
              <Icon name={team.icon} size={14} color={team.color} />
              <span className={styles.teamKey}>{team.key}</span>
            </div>
            <span className={styles.crumbChevron} aria-hidden="true">
              <Icon name="ChevronRight" size={12} />
            </span>
            {parentIssue !== undefined ? (
              <>
                <span className={styles.crumbLabel} title={parentIssue.title}>
                  {parentIssue.identifier}
                </span>
                <span className={styles.crumbChevron} aria-hidden="true">
                  <Icon name="ChevronRight" size={12} />
                </span>
                <span className={styles.crumbLabel}>New sub-issue</span>
              </>
            ) : (
              <span className={styles.crumbLabel}>New issue</span>
            )}
            <span className={styles.headerSpacer} />
            <div className={styles.headerActions}>
              {dirty ? (
                <Button variant="ghost" size={24} onClick={saveDraftAndClose}>
                  Save as draft
                </Button>
              ) : null}
              <IconButton
                label={fullscreen ? "Exit full screen" : "Expand to full screen"}
                aria-pressed={fullscreen}
                size={28}
                onClick={() => setFullscreen((value) => !value)}
              >
                <GlyphExpand />
              </IconButton>
              <IconButton label="Close" size={28} onClick={requestClose}>
                <GlyphClose />
              </IconButton>
            </div>
          </div>

          {/* body: borderless title + growing description */}
          <div className={styles.body}>
            <input
              ref={titleRef}
              className={styles.titleInput}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Issue title"
              aria-label="Issue title"
              spellCheck={false}
              autoFocus
            />
            <textarea
              ref={descRef}
              className={styles.descInput}
              value={description}
              onChange={(e) => {
                setDescription(e.target.value);
                autosizeDescription();
              }}
              placeholder="Add description…"
              aria-label="Issue description"
              rows={1}
            />
            <AttachmentList
              items={attachments}
              onRemove={(id) =>
                setAttachments((current) => current.filter((a) => a.id !== id))
              }
            />
          </div>

          {/* property chip row */}
          <div className={styles.chipRow} ref={chipRowRef}>
            <ChipMenu
              open={menu === "status"}
              onToggle={() => toggleMenu("status")}
              ariaLabel={`Change status: ${state.name}`}
              icon={
                <StatusIcon
                  category={state.category}
                  color={state.color}
                  size={14}
                />
              }
              label={state.name}
              rows={states.map((s) => ({
                key: s.id,
                icon: <StatusIcon category={s.category} color={s.color} size={14} />,
                label: s.name,
                selected: s.id === stateId,
                onSelect: () => {
                  setStateId(s.id);
                  setMenu(null);
                },
              }))}
            />
            <ChipMenu
              open={menu === "priority"}
              onToggle={() => toggleMenu("priority")}
              ariaLabel={`Change priority: ${PRIORITY_LABELS[priority]}`}
              icon={<PriorityIcon priority={priority} size={14} />}
              label={priority === 0 ? "Priority" : PRIORITY_LABELS[priority]}
              rows={PRIORITY_VALUES.map((p) => ({
                key: String(p),
                icon: <PriorityIcon priority={p} size={16} />,
                label: PRIORITY_LABELS[p],
                selected: p === priority,
                onSelect: () => {
                  setPriority(p);
                  setMenu(null);
                },
              }))}
            />
            <ChipMenu
              open={menu === "assignee"}
              onToggle={() => toggleMenu("assignee")}
              ariaLabel={
                assignee !== undefined
                  ? `Change assignee: ${assignee.displayName}`
                  : "Assign issue"
              }
              icon={
                assignee !== undefined ? (
                  <Avatar
                    size={16}
                    initials={assignee.initials}
                    color={assignee.avatarColor}
                  />
                ) : (
                  <GlyphPersonDashed />
                )
              }
              label={assignee !== undefined ? assignee.displayName : "Assignee"}
              rows={[
                {
                  key: "none",
                  icon: <GlyphPersonDashed />,
                  label: "No assignee",
                  selected: assigneeId === undefined,
                  onSelect: () => {
                    setAssigneeId(undefined);
                    setMenu(null);
                  },
                },
                ...users.map((u) => ({
                  key: u.id,
                  icon: (
                    <Avatar size={16} initials={u.initials} color={u.avatarColor} />
                  ),
                  label: u.displayName,
                  selected: u.id === assigneeId,
                  onSelect: () => {
                    setAssigneeId(u.id);
                    setMenu(null);
                  },
                })),
              ]}
            />
            <ChipMenu
              open={menu === "project"}
              onToggle={() => toggleMenu("project")}
              ariaLabel={
                project !== undefined
                  ? `Change project: ${project.name}`
                  : "Add to project"
              }
              icon={
                project?.icon !== undefined && project.icon !== "" ? (
                  <span className={styles.emojiIcon}>{project.icon}</span>
                ) : (
                  <Icon name="Project" size={14} color={project?.color} />
                )
              }
              label={project !== undefined ? project.name : "Project"}
              rows={[
                {
                  key: "none",
                  icon: <Icon name="Project" size={14} />,
                  label: "No project",
                  selected: projectId === undefined,
                  onSelect: () => {
                    setProjectId(undefined);
                    setMenu(null);
                  },
                },
                ...projects.map((p) => ({
                  key: p.id,
                  icon:
                    p.icon !== undefined && p.icon !== "" ? (
                      <span className={styles.emojiIcon}>{p.icon}</span>
                    ) : (
                      <Icon name="Project" size={14} color={p.color} />
                    ),
                  label: p.name,
                  selected: p.id === projectId,
                  onSelect: () => {
                    setProjectId(p.id);
                    setMenu(null);
                  },
                })),
              ]}
            />
            <ChipMenu
              open={menu === "labels"}
              onToggle={() => toggleMenu("labels")}
              ariaLabel="Add label"
              multi
              icon={
                selectedLabels.length > 0 ? (
                  <span className={styles.labelDots}>
                    {selectedLabels.map((l) => (
                      <span
                        key={l.id}
                        className={styles.labelDot}
                        style={{ background: l.color }}
                      />
                    ))}
                  </span>
                ) : (
                  <Icon name="Plus" size={12} />
                )
              }
              label={
                selectedLabels.length > 0
                  ? selectedLabels.map((l) => l.name).join(", ")
                  : "Label"
              }
              rows={labels.map((l) => ({
                key: l.id,
                icon: (
                  <span className={styles.labelDot} style={{ background: l.color }} />
                ),
                label: l.name,
                selected: labelIds.includes(l.id),
                onSelect: () => toggleLabel(l.id), // multi-select stays open
              }))}
            />
          </div>

          {/* reserves in-flow room so the absolute panel is never clipped by
              the dialog's scroll container */}
          {menu !== null ? (
            <div
              className={styles.menuSpacer}
              style={{ height: panelHeight(menuRows[menu]) + 8 }}
              aria-hidden="true"
            />
          ) : null}

          {/* footer — or the Esc-with-content confirm row (§14 CAPTURED) */}
          {confirming ? (
            <div className={styles.footer}>
              <span className={styles.confirmLabel}>Save to drafts?</span>
              <span className={styles.footerSpacer} />
              <Button variant="ghost" size={28} onClick={discardAndClose}>
                Discard
              </Button>
              <Button variant="primary" size={28} onClick={saveDraftAndClose}>
                Save draft
              </Button>
            </div>
          ) : (
            <div className={styles.footer}>
              <IconButton
                label="Attach images, files, or videos"
                size={28}
                onClick={attachment.open}
              >
                <Icon name="Attachment" size={14} />
              </IconButton>
              {attachment.input}
              <span className={styles.footerSpacer} />
              <label className={styles.createMore}>
                Create more
                <Toggle
                  checked={createMore}
                  onChange={setCreateMore}
                  aria-label="Create more"
                />
              </label>
              <Button
                variant="primary"
                size={28}
                disabled={title.trim() === ""}
                onClick={submit}
              >
                Create issue
              </Button>
            </div>
          )}
        </div>
      );
    }
  }

  // If the backing rows vanished mid-session, drop the stale open state.
  const bodyMissing = open && body === null;
  useEffect(() => {
    if (bodyMissing) reallyClose();
  }, [bodyMissing, reallyClose]);

  // Keep the last body rendered through the 100ms exit animation so the
  // panel fades out with its content instead of collapsing empty.
  if (open && body !== null) lastBodyRef.current = body;
  const renderedBody = open ? body : lastBodyRef.current;

  return (
    // KeyboardProvider mounts the single window keydown listener the shortcut
    // registry needs. Mounting it here is safe even if the shell later adds
    // its own: handleKeydown bails on e.defaultPrevented, so duplicate
    // listeners never double-fire a shortcut.
    <KeyboardProvider>
      <Dialog
        open={open && body !== null}
        onOpenChange={(o) => {
          if (!o) requestClose(); // Esc + overlay click route through §6.9 order
        }}
        // The dialog clamps to calc(100vw - 32px), so an oversized request is
        // exactly "as wide as the window allows" (§14 fullscreen create).
        width={fullscreen ? 4096 : 640}
        label={fullscreen ? "New issue (full screen)" : "New issue"}
      >
        {renderedBody}
      </Dialog>
    </KeyboardProvider>
  );
});
