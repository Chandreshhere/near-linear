/**
 * Shared data contract for the local-first engine (MASTER_PROMPT.md §18–19).
 * These are the WIRE + STORAGE shapes (plain JSON). The in-memory layer wraps
 * them in MobX models. Every collaborating module imports from this file —
 * do not fork these types.
 */

// ---------- scalar helpers ----------
export type UUID = string;
export type ISODate = string; // ISO-8601

export type Priority = 0 | 1 | 2 | 3 | 4; // 0 none, 1 urgent, 2 high, 3 medium, 4 low

export type StateCategory =
  | "triage"
  | "backlog"
  | "unstarted"
  | "started"
  | "completed"
  | "canceled";

export type ProjectStatusCategory =
  | "backlog"
  | "planned"
  | "started"
  | "completed"
  | "canceled";

export type ProjectHealth = "onTrack" | "atRisk" | "offTrack" | "noUpdate";

// ---------- entities (storage/wire shape) ----------
export interface WorkspaceData {
  id: UUID;
  slug: string;
  name: string;
  createdAt: ISODate;
}

/** Workspace-level permission of a member (§17.2 invite flow, Members page). */
export type WorkspaceRole = "admin" | "member" | "guest";

export interface UserData {
  id: UUID;
  email: string;
  name: string;
  displayName: string;
  initials: string;
  avatarColor: string;
  avatarUrl?: string;
  /** Workspace role shown in the Members directory. Absent = "member". */
  role?: WorkspaceRole;
  /** When the member joined the workspace (Members directory column). */
  joinedAt?: ISODate;
  /** Job title — onboarding step 1 and Settings → Profile. Absent = unset. */
  title?: string;
}

/**
 * A workspace invite that has been sent but not accepted (§17.2 "email
 * invite (role + teams)"). Delivering the mail is the only server-side part;
 * the pending row itself is real local state.
 */
export interface InviteData {
  id: UUID;
  email: string;
  role: WorkspaceRole;
  invitedById: UUID;
  status: "pending" | "revoked";
  createdAt: ISODate;
}

/**
 * One row of a "Resources" section — a pinned document or link. Projects and
 * teams both keep a list of these; the shape is shared so one dialog, one
 * renderer and one normalizer serve both surfaces.
 */
export interface ResourceLink {
  id: UUID;
  title: string;
  url: string;
}

export interface TeamData {
  id: UUID;
  key: string; // e.g. "TRENDZO"
  name: string;
  icon: string; // sprite symbol name
  color: string;
  sortOrder: number;
  cyclesEnabled: boolean;
  triageEnabled: boolean;
  issueCounter: number; // next issue number allocator (server-owned)
  /**
   * Workspace members of this team. Drives the sidebar's "Your teams" list,
   * the join menu (teams you are NOT in) and the member count in the teams
   * directory. Absent (pre-v4 rows) = everyone is a member.
   */
  memberIds?: UUID[];
  /** Team Home's editable hero description (§10.6). Absent = unset. */
  description?: string;
  /** Documents + links pinned to Team Home. Absent = none. */
  resources?: ResourceLink[];
  /**
   * Members subscribed to this team's notifications (Team Home ⋯ → "Team
   * notifications"). Per-user opt-IN: absent or missing = not subscribed.
   */
  notifySubscriberIds?: UUID[];
}

export interface WorkflowStateData {
  id: UUID;
  teamId: UUID;
  name: string;
  color: string;
  description?: string;
  category: StateCategory;
  position: number; // order within category
}

/**
 * One emoji reaction bucket on an issue. `userIds` is the membership set —
 * its length is the chip count and `includes(currentUserId)` decides whether
 * the chip renders active. An empty bucket is dropped rather than stored.
 */
export interface ReactionData {
  emoji: string;
  userIds: UUID[];
}

/**
 * A file attached to an issue. There is no blob storage in the local-first
 * engine, so only the metadata is authoritative; `dataUrl` carries a base64
 * preview for small images (see ATTACHMENT_INLINE_MAX_BYTES) and is absent
 * for everything else.
 */
export interface AttachmentData {
  id: UUID;
  name: string;
  size: number; // bytes
  type: string; // MIME type ("image/png"), "" when the browser cannot tell
  dataUrl?: string;
}

/** Largest file inlined as a data URL (~1MB before base64 expansion). */
export const ATTACHMENT_INLINE_MAX_BYTES = 1_000_000;

export interface IssueData {
  id: UUID;
  identifier: string; // "TRENDZO-37"
  number: number;
  teamId: UUID;
  title: string;
  description?: string; // markdown snapshot (Yjs doc comes later phase)
  stateId: UUID;
  priority: Priority;
  assigneeId?: UUID;
  creatorId: UUID;
  labelIds: UUID[];
  projectId?: UUID;
  milestoneId?: UUID;
  cycleId?: UUID;
  estimate?: number;
  dueDate?: ISODate;
  parentId?: UUID;
  subscriberIds: UUID[];
  /** Emoji reaction buckets (§10.3 reaction row). Absent = no reactions. */
  reactions?: ReactionData[];
  /** Files attached to the issue (§10.3 attachment row). Absent = none. */
  attachments?: AttachmentData[];
  sortOrder: number; // board/list manual order (fractional indexing)
  createdAt: ISODate;
  updatedAt: ISODate;
  archivedAt?: ISODate;
}

export interface LabelData {
  id: UUID;
  name: string;
  color: string;
  teamId?: UUID; // undefined = workspace label
  groupId?: UUID;
  isGroup: boolean;
}

/** One row of a project's Resources section ("Add document or link…"). */
export type ProjectResource = ResourceLink;

export interface ProjectData {
  id: UUID;
  slug: string; // "driver-app-0f150687c354"
  name: string;
  icon?: string; // emoji or sprite name
  color: string;
  summary?: string;
  description?: string;
  statusCategory: ProjectStatusCategory;
  health: ProjectHealth;
  priority: Priority;
  leadId?: UUID;
  memberIds: UUID[];
  teamIds: UUID[];
  startDate?: ISODate;
  targetDate?: ISODate;
  /** Workspace/team labels applied to the project. Absent = none. */
  labelIds?: UUID[];
  /** Documents + links pinned to the overview. Absent = none. */
  resources?: ProjectResource[];
  /** Other projects this one depends on (rail "Add dependency"). */
  dependsOnIds?: UUID[];
  sortOrder: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * One posted project update (§10.2 update strip / Activity tab): the health
 * the author declared plus a markdown-ish body snapshot — the same storage
 * convention as `IssueData.description`.
 */
export interface ProjectUpdateData {
  id: UUID;
  projectId: UUID;
  authorId: UUID;
  health: ProjectHealth;
  body: string;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface MilestoneData {
  id: UUID;
  projectId: UUID;
  name: string;
  description?: string;
  targetDate?: ISODate;
  sortOrder: number;
}

export interface CommentData {
  id: UUID;
  issueId: UUID;
  authorId: UUID;
  body: string;
  parentId?: UUID;
  createdAt: ISODate;
  updatedAt: ISODate;
}

export interface ActivityData {
  id: UUID;
  issueId?: UUID;
  projectId?: UUID;
  actorId: UUID;
  type:
    | "created"
    | "stateChanged"
    | "priorityChanged"
    | "assigneeChanged"
    | "labelAdded"
    | "labelRemoved"
    | "projectChanged"
    | "milestoneCompleted"
    | "commented";
  from?: string;
  to?: string;
  createdAt: ISODate;
}

export interface NotificationData {
  id: UUID;
  userId: UUID;
  type: string;
  actorId?: UUID;
  issueId?: UUID;
  title: string;
  snippet?: string;
  readAt?: ISODate;
  snoozedUntil?: ISODate;
  createdAt: ISODate;
}

export interface FavoriteData {
  id: UUID;
  userId: UUID;
  entityType: "issue" | "project" | "view" | "team";
  entityId: UUID;
  sortOrder: number;
}

export interface ViewPreferenceData {
  id: UUID; // `${userId}:${viewKey}`
  userId: UUID;
  viewKey: string; // e.g. "team/TRENDZO/all"
  layout: "list" | "board";
  grouping: string;
  subGrouping: string;
  ordering: string;
  showSubIssues: boolean;
  showEmptyGroups: boolean;
  completedFilter: string;
  displayProperties: string[];
  /**
   * Board columns hidden by hand through a column's ⋯ menu (§15). Separate
   * from the empty-column collapse that `showEmptyGroups` drives: a hidden
   * column stays hidden even when it holds issues.
   */
  hiddenColumnIds?: string[];
  /** List option "Nested sub-issues" — indent children under their parent (§11.1). */
  nestedSubIssues?: boolean;
  /** Inbox display option: keep snoozed notifications in the list (§10.4). */
  showSnoozed?: boolean;
  /** Inbox display option: keep already-read notifications in the list (§10.4). */
  showRead?: boolean;
}

export interface UserSettingsData {
  id: UUID; // == userId
  homeView: string;
  theme: "system" | "light" | "dark";
  firstDayOfWeek: "Monday" | "Sunday";
  displayFullNames: boolean;
  convertEmoticons: boolean;
  commentSubmitKey: "Enter" | "ModEnter";
  fontSize: "small" | "default" | "large";
  pointerCursor: boolean;
  underlineLinks: boolean;
  disableAnimations: boolean;
  openInDesktop: boolean;
  autoAssignSelf: boolean;
  assignOnStart: boolean;
  /**
   * Product-newsletter opt-in (onboarding step 2, Settings → Notifications).
   * Absent (pre-v7 rows) = not opted in. Delivering the mail is server work;
   * the stored preference is not.
   */
  newsletterOptIn?: boolean;
}

/**
 * An initiative: the workspace-level container a set of projects rolls up to
 * (sidebar "Try" section → `/initiatives`). Status vocabulary mirrors the
 * project-status categories the rest of the app already speaks.
 */
export type InitiativeStatus = "planned" | "active" | "completed" | "canceled";

export interface InitiativeData {
  id: UUID;
  slug: string; // "q4-platform-2f9c" — route + copy-link identity
  name: string;
  description?: string;
  status: InitiativeStatus;
  ownerId?: UUID;
  /** Projects rolled up under this initiative. */
  projectIds: UUID[];
  targetDate?: ISODate;
  sortOrder: number;
  createdAt: ISODate;
  updatedAt: ISODate;
}

/**
 * One team cycle (§22 — DOCUMENTED): a fixed time box issues are planned
 * into. Numbered sequentially per team (may be renamed); `cooldownEndsAt`
 * marks the optional cooldown window after `endsAt` during which issues
 * cannot be assigned to the cycle. All boundaries are ISO instants — a cycle
 * is "active" while startsAt ≤ now < endsAt.
 */
export interface CycleData {
  id: UUID;
  teamId: UUID;
  /** Sequential per-team number ("Cycle 2"). */
  number: number;
  /** Optional custom name; falls back to "Cycle {number}". */
  name?: string;
  startsAt: ISODate;
  endsAt: ISODate;
  /** End of the optional cooldown window after `endsAt`. Absent = none. */
  cooldownEndsAt?: ISODate;
}

// ---------- model registry ----------
export interface ModelDataMap {
  Workspace: WorkspaceData;
  User: UserData;
  Team: TeamData;
  WorkflowState: WorkflowStateData;
  Issue: IssueData;
  Label: LabelData;
  Project: ProjectData;
  ProjectUpdate: ProjectUpdateData;
  Milestone: MilestoneData;
  Comment: CommentData;
  Activity: ActivityData;
  Notification: NotificationData;
  Favorite: FavoriteData;
  ViewPreference: ViewPreferenceData;
  UserSettings: UserSettingsData;
  Invite: InviteData;
  Initiative: InitiativeData;
  Cycle: CycleData;
}

export type ModelName = keyof ModelDataMap;
export type AnyModelData = ModelDataMap[ModelName];

export const MODEL_NAMES: ModelName[] = [
  "Workspace",
  "User",
  "Team",
  "WorkflowState",
  "Issue",
  "Label",
  "Project",
  "ProjectUpdate",
  "Milestone",
  "Comment",
  "Activity",
  "Notification",
  "Favorite",
  "ViewPreference",
  "UserSettings",
  "Invite",
  "Initiative",
  "Cycle",
];

/**
 * Bump when entity shapes change — mismatch forces re-bootstrap.
 * 2: IssueData gains `reactions`/`attachments`; ViewPreferenceData gains
 *    `hiddenColumnIds`/`nestedSubIssues`/`showSnoozed`/`showRead`.
 * 3: new ProjectUpdate model; ProjectData gains `labelIds`/`resources`/
 *    `dependsOnIds`.
 * 4: new Invite + Initiative models (new object stores — the bump is what
 *    creates them); UserData gains `role`/`joinedAt`; TeamData gains
 *    `memberIds`.
 * 5: new Cycle model (§22); fixtures enable cycles + triage on TRENDZO and
 *    seed its Triage state, two cycles and two triage issues.
 * 6: data-only fixture bump (no shape change): TRENDZO-37 gains labels /
 *    project / milestone / priority / dueDate so the default view shows the
 *    card–row property-chip parity out of the box; warm IndexedDB mirrors
 *    must re-bootstrap to pick the enriched row up.
 * 7: TeamData gains `description`/`resources`/`notifySubscriberIds` (Team
 *    Home's editable hero, its Resources section and the per-team notify
 *    toggle); UserData gains `title`; UserSettingsData gains
 *    `newsletterOptIn` — the last two retire the localStorage profile
 *    workaround onboarding used to write to. `ProjectResource` is now an
 *    alias of the shared `ResourceLink` (structurally identical).
 */
export const SCHEMA_VERSION = 7;

// ---------- sync protocol ----------
export type SyncActionType = "I" | "U" | "A" | "D" | "V"; // insert/update/archive/delete/unarchive

export interface SyncAction {
  id: number; // monotonic syncId
  modelName: ModelName;
  modelId: UUID;
  action: SyncActionType;
  /** Full row for I; changed fields for U; undefined for D. */
  data?: Partial<AnyModelData> & { id: UUID };
}

export interface BootstrapTrailer {
  _trailer: true;
  lastSyncId: number;
  schemaVersion: number;
}

/** NDJSON bootstrap line: either a model row or the trailer. */
export type BootstrapLine =
  | { model: ModelName; data: AnyModelData }
  | BootstrapTrailer;

// ---------- transactions (client write path) ----------
export type TransactionKind = "create" | "update" | "delete" | "archive" | "unarchive";

export interface TransactionData {
  id: UUID; // client-generated
  kind: TransactionKind;
  modelName: ModelName;
  modelId: UUID;
  /** update: changed fields; create: full row. */
  payload?: Record<string, unknown>;
  /** update: previous values of changed fields (undo + rollback). */
  changeSnapshot?: Record<string, unknown>;
  batchIndex: number;
  createdAt: ISODate;
  status: "queued" | "executing" | "acked";
}

export interface MutationRequest {
  clientId: string;
  transactions: TransactionData[];
}

export interface MutationResponse {
  ok: boolean;
  lastSyncId: number;
  /** transaction id -> error message for rejected ones */
  rejected?: Record<string, string>;
}

export interface SyncHandshake {
  lastSyncId: number;
  schemaVersion: number;
}
