/**
 * Seed fixtures for the local-first engine (MASTER_PROMPT.md §26).
 * Content matches the reference captures so golden screenshots stay comparable:
 *   - docs/analysis/capture-projects.md          (10-project table, slugs, colors)
 *   - docs/analysis/capture-driver-app-overview.md (Driver App content + M3 milestone)
 *   - docs/analysis/capture-trendzo-37-research-work.md (TRENDZO-37 issue)
 *   - docs/analysis/capture-welcome-to-linear.md (welcome inbox notification)
 * Pure data — no side effects, no randomness, fixed ISO dates around 2026-08-24.
 * Team/user/workspace constants are imported from src/lib/seed.ts (same
 * ids/keys/colors — single source of truth, no drift).
 */

import type {
  ActivityData,
  AnyModelData,
  CycleData,
  IssueData,
  LabelData,
  MilestoneData,
  ModelDataMap,
  ModelName,
  NotificationData,
  ProjectData,
  StateCategory,
  TeamData,
  UserData,
  UserSettingsData,
  WorkflowStateData,
  WorkspaceData,
} from "@/lib/data/types";
import { TEAMS, USERS, WORKSPACE } from "@/lib/seed";

// ---------- fixture row helper (keeps per-model type checking) ----------

interface FixtureRow {
  model: ModelName;
  data: AnyModelData;
}

function row<M extends ModelName>(model: M, data: ModelDataMap[M]): FixtureRow {
  return { model, data };
}

// ---------- fixed clock (deterministic, matches capture timestamps) ----------

/** Capture session anchor: Mon 2026-08-24 evening. */
const T_ISSUE_CREATED = "2026-08-24T17:35:28.000Z"; // "1h ago" in capture
const T_ISSUE_STATE_CHANGED = "2026-08-24T17:50:00.000Z";
/** Property enrichment (labels/project/milestone/priority/dueDate) — bumped
    alongside SCHEMA_VERSION 6 so warm IndexedDB mirrors re-bootstrap. */
const T_ISSUE_ENRICHED = "2026-08-24T18:10:00.000Z";
const T_NOTIFICATION = "2026-08-24T16:20:00.000Z"; // "2h" in capture list pane
const T_PROJECT_CREATED = "2026-08-24T15:57:57.000Z"; // Driver App "created the project" tooltip
const T_PROJECT_UPDATED = "2026-08-24T17:25:02.000Z"; // second activity tooltip
const T_WORKSPACE_CREATED = "2026-07-01T09:00:00.000Z";

// ---------- ids ----------

const WORKSPACE_ID = "ws-synquic";
const USER_YK = "u-yk";
const USER_CD = "u-cd";

// ---------- workspace + users ----------

const workspace: WorkspaceData = {
  id: WORKSPACE_ID,
  slug: WORKSPACE.slug, // "synquic-labs"
  name: WORKSPACE.name, // "Synquic"
  createdAt: T_WORKSPACE_CREATED,
};

/** seed.ts stores the email in `name`; displayName = email local part ("/profiles/yatharth.kaushal"). */
const users: UserData[] = USERS.map((u, i) => ({
  id: u.id,
  email: u.name,
  name: u.name,
  displayName: u.name.split("@")[0] ?? u.name,
  initials: u.initials,
  avatarColor: u.avatarColor,
  // The account that created the workspace owns it; the rest are members.
  role: i === 0 ? "admin" : "member",
  joinedAt: T_WORKSPACE_CREATED,
}));

/** Preferences defaults per MASTER_PROMPT.md §10.9. */
const userSettings: UserSettingsData = {
  id: USER_YK,
  homeView: "agent",
  theme: "dark",
  firstDayOfWeek: "Monday",
  displayFullNames: true,
  convertEmoticons: true,
  commentSubmitKey: "Enter",
  fontSize: "default",
  pointerCursor: false,
  underlineLinks: false,
  disableAnimations: false,
  openInDesktop: false,
  autoAssignSelf: false,
  assignOnStart: false,
};

// ---------- teams (ids/keys/colors imported from src/lib/seed.ts) ----------

const teams: TeamData[] = TEAMS.map((t, i) => ({
  id: t.id,
  key: t.key,
  name: t.name,
  icon: t.icon,
  color: t.color,
  sortOrder: i,
  // §22: cycles + triage are per-team enables — only TRENDZO opts in.
  cyclesEnabled: t.key === "TRENDZO",
  triageEnabled: t.key === "TRENDZO",
  // TRENDZO has issued up to #39 (37 + two triage arrivals); allocator holds
  // the next number.
  issueCounter: t.key === "TRENDZO" ? 40 : 1,
  // Both seeded accounts belong to every team (the sidebar shows all 7).
  memberIds: [USER_YK, USER_CD],
}));

// ---------- workflow states (identical set per team) ----------

interface StateSeed {
  slug: string;
  name: string;
  color: string;
  category: StateCategory;
  position: number; // order within category
}

const STATE_SEEDS: StateSeed[] = [
  { slug: "backlog", name: "Backlog", color: "#bec2c8", category: "backlog", position: 0 },
  { slug: "todo", name: "Todo", color: "#e2e2e2", category: "unstarted", position: 0 },
  { slug: "in-progress", name: "In Progress", color: "#f2994a", category: "started", position: 0 },
  { slug: "done", name: "Done", color: "#5e6ad2", category: "completed", position: 0 },
  { slug: "canceled", name: "Canceled", color: "#8a8f98", category: "canceled", position: 0 },
  { slug: "duplicate", name: "Duplicate", color: "#8a8f98", category: "canceled", position: 1 },
];

function stateId(teamKey: string, slug: string): string {
  return `state-${teamKey.toLowerCase()}-${slug}`;
}

const workflowStates: WorkflowStateData[] = [
  ...TEAMS.flatMap((team) =>
    STATE_SEEDS.map((s) => ({
      id: stateId(team.key, s.slug),
      teamId: team.id,
      name: s.name,
      color: s.color,
      category: s.category,
      position: s.position,
    })),
  ),
  // §22 triage: only the team with triage enabled carries a Triage state —
  // its inbox lists issues sitting in this state.
  {
    id: stateId("TRENDZO", "triage"),
    teamId: "t-trendzo",
    name: "Triage",
    color: "#f2994a",
    category: "triage",
    position: 0,
  },
];

// ---------- labels (workspace scope) ----------

const labels: LabelData[] = [
  { id: "label-bug", name: "Bug", color: "#eb5757", isGroup: false },
  { id: "label-feature", name: "Feature", color: "#bb87fc", isGroup: false },
  { id: "label-improvement", name: "Improvement", color: "#4ea7fc", isGroup: false },
];

// ---------- projects (exactly per capture-projects.md table) ----------

const projects: ProjectData[] = [
  {
    id: "proj-driver-app",
    slug: "driver-app-0f150687c354",
    name: "Driver App",
    icon: "🚚",
    color: "lch(74.025% 57.688 76.196)", // amber — captured tile tint base
    summary: "Expo/React Native app for delivery agents — orders, door events, COD",
    description:
      "Delivery agent app. Receives orders, updates status, logs door events, captures photos, records COD collection — every action tied to an authenticated agent identity for the audit trail. Stack: Expo · React Native.\n\nRepo: https://github.com/Trendzo/driver-app\nLocal: c:\\AIB\\Products\\Trendzo\\driver-app",
    statusCategory: "started", // 0% ring, orange #F2994A
    health: "noUpdate",
    priority: 0,
    leadId: USER_YK,
    memberIds: [USER_YK],
    teamIds: ["t-trendzo"],
    startDate: "2026-07-27",
    targetDate: "2026-09-30",
    sortOrder: 100,
    createdAt: T_PROJECT_CREATED,
    updatedAt: T_PROJECT_UPDATED,
  },
  {
    id: "proj-consumer-app",
    slug: "consumer-app-497bbe64f8a3",
    name: "Consumer App",
    icon: "📱",
    color: "#4ea7fc",
    statusCategory: "started", // 0% ring, orange
    health: "noUpdate",
    priority: 0,
    leadId: USER_YK,
    memberIds: [USER_YK],
    teamIds: ["t-trendzo"],
    targetDate: "2026-09-30",
    sortOrder: 200,
    createdAt: T_PROJECT_CREATED,
    updatedAt: T_PROJECT_CREATED,
  },
  {
    id: "proj-retailer-app",
    slug: "retailer-app-2393a08d4f2e",
    name: "Retailer App",
    icon: "🛍️",
    color: "#bb87fc",
    statusCategory: "planned", // 0% ring, yellow lch(80% 90 85)
    health: "noUpdate",
    priority: 0,
    leadId: USER_YK,
    memberIds: [USER_YK],
    teamIds: ["t-trendzo"],
    targetDate: "2026-08-21", // overdue (red) in capture
    sortOrder: 300,
    createdAt: T_PROJECT_CREATED,
    updatedAt: T_PROJECT_CREATED,
  },
  {
    id: "proj-web-portal",
    slug: "web-portal-902a67da7af5",
    name: "Web Portal",
    icon: "🖥️",
    color: "#0f7488",
    statusCategory: "planned",
    health: "noUpdate",
    priority: 0,
    leadId: USER_YK,
    memberIds: [USER_YK],
    teamIds: ["t-trendzo"],
    targetDate: "2026-09-30",
    sortOrder: 400,
    createdAt: T_PROJECT_CREATED,
    updatedAt: T_PROJECT_CREATED,
  },
  {
    id: "proj-backend",
    slug: "backend-bec6d7f9d026",
    name: "Backend",
    icon: "⚙️",
    color: "#95a2b3",
    statusCategory: "planned",
    health: "noUpdate",
    priority: 0,
    leadId: USER_YK,
    memberIds: [USER_YK],
    teamIds: ["t-trendzo"],
    targetDate: "2026-09-30",
    sortOrder: 500,
    createdAt: T_PROJECT_CREATED,
    updatedAt: T_PROJECT_CREATED,
  },
  {
    id: "proj-acti-pro",
    slug: "acti-pro-a31e4c9efb8e",
    name: "Acti Pro",
    color: "lch(80% 90 85)", // captured #Project icon tint (yellow)
    statusCategory: "started", // 0% ring, orange + sparkline
    health: "noUpdate",
    priority: 0,
    memberIds: [],
    teamIds: ["t-pgme"],
    sortOrder: 600,
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "proj-icon-realty",
    slug: "icon-realty-52437cf88429",
    name: "Icon Realty",
    color: "#f2994a",
    statusCategory: "planned",
    health: "noUpdate",
    priority: 4, // Low Priority (captured)
    memberIds: [],
    teamIds: ["t-icon"],
    sortOrder: 700,
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "proj-shrujan",
    slug: "shrujan-8b34fb90f02f",
    name: "Shrujan",
    color: "lch(48% 59.31 288.43)",
    statusCategory: "backlog", // 0% ring, gray #D7D8DB
    health: "noUpdate",
    priority: 0,
    memberIds: [],
    teamIds: ["t-shrujan"],
    sortOrder: 800,
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "proj-trikaal",
    slug: "trikaal-bd0a60103061",
    name: "Trikaal",
    color: "#95a2b3",
    statusCategory: "backlog",
    health: "noUpdate",
    priority: 0,
    memberIds: [],
    teamIds: ["t-trikaal"],
    sortOrder: 900,
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
  {
    id: "proj-cleanse-ayurveda",
    slug: "cleanse-ayurveda-75329d72d82a",
    name: "Cleanse Ayurveda",
    color: "#26b5ce",
    statusCategory: "planned",
    health: "noUpdate",
    priority: 2, // High Priority (captured)
    memberIds: [],
    teamIds: ["t-pgme"],
    targetDate: "2026-08-11", // overdue (red) in capture
    sortOrder: 1000,
    createdAt: "2026-08-10T10:00:00.000Z",
    updatedAt: "2026-08-10T10:00:00.000Z",
  },
];

// ---------- milestones (chips per capture-projects.md; M3 detail per driver-app overview) ----------

const milestones: MilestoneData[] = [
  {
    id: "ms-driver-m3",
    projectId: "proj-driver-app",
    name: "M3 · Delivery flow (handover → deliver → proof)",
    description:
      "Driver app wired to the new agent backend: login, see assigned deliveries, pickup at store (pickup-code), deliver, capture proof, record COD. (Door try-and-buy + returns are M4.)",
    targetDate: "2026-08-28",
    sortOrder: 100,
  },
  {
    id: "ms-consumer-m3",
    projectId: "proj-consumer-app",
    name: "M3 · Place & track orders (seeded)",
    targetDate: "2026-08-24",
    sortOrder: 100,
  },
  {
    id: "ms-retailer-m1",
    projectId: "proj-retailer-app",
    name: "M1 · AI listing live + catalogue mgmt + download",
    targetDate: "2026-07-22",
    sortOrder: 100,
  },
  {
    id: "ms-web-portal-m1",
    projectId: "proj-web-portal",
    name: "M1 · Admin can view stores & catalogues (real data)",
    targetDate: "2026-07-24",
    sortOrder: 100,
  },
  {
    id: "ms-backend-m1",
    projectId: "proj-backend",
    name: "M1 · Retailer AI-listing + catalogue APIs verified",
    targetDate: "2026-07-13",
    sortOrder: 100,
  },
];

// ---------- cycles (§22 — TRENDZO only; two-week boxes on Monday starts) ----------

/**
 * Sequentially numbered around the capture anchor (Mon 2026-08-24): Cycle 1
 * ran the two prior weeks and closed on the anchor Monday; Cycle 2 started
 * that same Monday and is the active cycle.
 */
const cycles: CycleData[] = [
  {
    id: "cycle-trendzo-1",
    teamId: "t-trendzo",
    number: 1,
    startsAt: "2026-08-10T00:00:00.000Z",
    endsAt: "2026-08-24T00:00:00.000Z",
  },
  {
    id: "cycle-trendzo-2",
    teamId: "t-trendzo",
    number: 2,
    startsAt: "2026-08-24T00:00:00.000Z",
    endsAt: "2026-09-07T00:00:00.000Z",
  },
];

// ---------- issue TRENDZO-37 (capture-trendzo-37-research-work.md) ----------

const issueTre37: IssueData = {
  id: "issue-tre-37",
  identifier: "TRENDZO-37",
  number: 37,
  teamId: "t-trendzo",
  title: "Research Work",
  description:
    "- [ ] ai models/ deployment pipeline mock up gen and virtual try on cheaper way for this functionality\n" +
    "- [ ] billing software to be integrated with our register service - billing s/w with good customer support",
  stateId: stateId("TRENDZO", "in-progress"),
  // Fully-chipped default row/card (card–row parity reference): High
  // priority, two labels, Driver App + its M3 milestone, and a due date —
  // so the out-of-the-box view demonstrates every default display property.
  priority: 2,
  creatorId: USER_YK,
  labelIds: ["label-feature", "label-improvement"],
  projectId: "proj-driver-app",
  milestoneId: "ms-driver-m3",
  dueDate: "2026-09-30",
  // Started work without a cycle → auto-added to the active cycle (§22).
  cycleId: "cycle-trendzo-2",
  subscriberIds: [USER_YK],
  sortOrder: 1000,
  createdAt: T_ISSUE_CREATED,
  updatedAt: T_ISSUE_ENRICHED,
};

// ---------- triage arrivals (§22 — issues landing in TRENDZO's Triage) ----------

const T_TRIAGE_1 = "2026-08-24T18:05:00.000Z";
const T_TRIAGE_2 = "2026-08-24T18:40:00.000Z";

const triageIssues: IssueData[] = [
  {
    id: "issue-tre-38",
    identifier: "TRENDZO-38",
    number: 38,
    teamId: "t-trendzo",
    title: "Payment declined for COD orders above ₹5,000",
    description:
      "Reported through the Slack #support channel: three retailers hit a " +
      "payment-declined screen while collecting cash-on-delivery above " +
      "₹5,000. Needs a repro against the staging payment service.",
    stateId: stateId("TRENDZO", "triage"),
    priority: 0,
    creatorId: USER_CD,
    labelIds: [],
    subscriberIds: [USER_CD],
    sortOrder: 1100,
    createdAt: T_TRIAGE_1,
    updatedAt: T_TRIAGE_1,
  },
  {
    id: "issue-tre-39",
    identifier: "TRENDZO-39",
    number: 39,
    teamId: "t-trendzo",
    title: "Crash opening retailer catalogue from a push notification",
    description:
      "Sentry TRENDZO-APP-4F2: NullPointerException in " +
      "CatalogueDeepLinkHandler when the app cold-starts from a catalogue " +
      "push. 11 events · 3 users affected.",
    stateId: stateId("TRENDZO", "triage"),
    priority: 0,
    creatorId: USER_CD,
    labelIds: [],
    subscriberIds: [USER_CD],
    sortOrder: 1200,
    createdAt: T_TRIAGE_2,
    updatedAt: T_TRIAGE_2,
  },
];

const activities: ActivityData[] = [
  {
    id: "act-tre-37-created",
    issueId: "issue-tre-37",
    actorId: USER_YK,
    type: "created",
    createdAt: T_ISSUE_CREATED,
  },
  {
    id: "act-tre-37-state",
    issueId: "issue-tre-37",
    actorId: USER_CD,
    type: "stateChanged",
    from: "Backlog",
    to: "In Progress",
    createdAt: T_ISSUE_STATE_CHANGED,
  },
];

// ---------- welcome notification (capture-welcome-to-linear.md) ----------

const notifications: NotificationData[] = [
  {
    id: "notif-welcome",
    userId: USER_YK,
    type: "welcome",
    title: "Welcome to Linear-style workspace",
    snippet: "Watch an introductory video and access a list of resources below.",
    createdAt: T_NOTIFICATION, // "2h" ago at capture time — unread (no readAt)
  },
];

// ---------- public API ----------

/**
 * Deterministic seed rows in referential order (parents before dependents).
 * Safe to call repeatedly — each call returns a deep-cloned copy, so callers
 * may mutate rows without affecting later calls.
 */
export function buildFixtures(): { model: ModelName; data: AnyModelData }[] {
  return structuredClone([
    row("Workspace", workspace),
    ...users.map((u) => row("User", u)),
    row("UserSettings", userSettings),
    ...teams.map((t) => row("Team", t)),
    ...workflowStates.map((s) => row("WorkflowState", s)),
    ...labels.map((l) => row("Label", l)),
    ...projects.map((p) => row("Project", p)),
    ...milestones.map((m) => row("Milestone", m)),
    ...cycles.map((c) => row("Cycle", c)),
    row("Issue", issueTre37),
    ...triageIssues.map((i) => row("Issue", i)),
    ...activities.map((a) => row("Activity", a)),
    ...notifications.map((n) => row("Notification", n)),
  ]);
}
