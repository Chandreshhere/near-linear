import { WORKSPACE } from "@/lib/seed";

/**
 * Landing-page copy and link targets.
 *
 * All prose here is written for THIS product. Section lengths and line-rhythm
 * are matched to the reference layout (h2 ≤ 18ch, description ≤ 38ch) so the
 * measured grid resolves identically — but no marketing sentence, product
 * name, wordmark, or customer reference is carried over from it.
 */

export const ROUTES = {
  openApp: `/${WORKSPACE.slug}/agent`,
  login: "/login",
  signup: "/login?mode=signup",
} as const;

export const PRODUCT_NAME = WORKSPACE.name;

export const NAV_LINKS = [
  { label: "Product", href: "#product", optional: false },
  { label: "Resources", href: "#resources", optional: false },
  { label: "Customers", href: "#customers", optional: false },
  { label: "Pricing", href: "#pricing", optional: false },
  { label: "Now", href: "#changelog", optional: true },
  { label: "Contact", href: "#contact", optional: true },
  { label: "Docs", href: "#docs", optional: false },
] as const;

export type Ingredient = { index: string; label: string };

export type FeatureSection = {
  id: string;
  index: string;
  actionLabel: string;
  title: string;
  description: string;
  ingredients: Ingredient[];
  mock:
    | "triage"
    | "roadmap"
    | "board"
    | "diff"
    | "progress";
  glow: "left" | "right" | "none";
};

export const FEATURES: FeatureSection[] = [
  {
    id: "intake",
    index: "1.0",
    actionLabel: "Intake",
    title: "Make product operations run themselves",
    description:
      "Turn scattered conversations and customer signals into issues that arrive routed, labeled, and ranked for the right team.",
    ingredients: [
      { index: "1.1", label: "Workspace Agent" },
      { index: "1.2", label: "Triage" },
      { index: "1.3", label: "Customer Requests" },
      { index: "1.4", label: "Asks" },
    ],
    mock: "triage",
    glow: "right",
  },
  {
    id: "plan",
    index: "2.0",
    actionLabel: "Plan",
    title: "Set the direction of the product",
    description:
      "Move from idea to launch on a shared plan. Keep everyone aligned on initiatives, roadmaps, and briefs that stay current.",
    ingredients: [
      { index: "2.1", label: "Projects" },
      { index: "2.2", label: "Documents" },
      { index: "2.3", label: "Initiatives" },
      { index: "2.4", label: "Timelines" },
    ],
    mock: "roadmap",
    glow: "left",
  },
  {
    id: "build",
    index: "3.0",
    actionLabel: "Build",
    title: "Move work across teams and agents",
    description:
      "Run agents alongside your team. Pair on the hard parts together, or hand over a whole issue and pick it up at review.",
    ingredients: [
      { index: "3.1", label: "Issues" },
      { index: "3.2", label: "Agents" },
      { index: "3.3", label: "MCP Server" },
      { index: "3.4", label: "Git Automations" },
      { index: "3.5", label: "Cycles" },
    ],
    mock: "board",
    glow: "right",
  },
  {
    id: "diffs",
    index: "4.0",
    actionLabel: "Diffs",
    title: "Read every change at a glance",
    description:
      "See what actually moved with structural diffs for human and agent work. Review, discuss, and merge without leaving the issue.",
    ingredients: [],
    mock: "diff",
    glow: "left",
  },
  {
    id: "monitor",
    index: "5.0",
    actionLabel: "Monitor",
    title: "See progress across the whole org",
    description:
      "Stop guessing. Updates, analytics, and dashboards surface the work that has slipped and the work that needs you today.",
    ingredients: [
      { index: "5.1", label: "Pulse" },
      { index: "5.2", label: "Insights" },
      { index: "5.3", label: "Dashboards" },
    ],
    mock: "progress",
    glow: "right",
  },
];

export const BENEFITS = [
  {
    figure: "01",
    title: "Built on practice",
    text: "Shaped by how strong product teams actually decide, sequence, and ship their work.",
  },
  {
    figure: "02",
    title: "Agents included",
    text: "Made for work handed back and forth between people and agents, from brief to merge.",
  },
  {
    figure: "03",
    title: "Tuned for pace",
    text: "Cuts the noise and keeps momentum so the team stays in motion and stays focused.",
  },
] as const;

export const CHANGELOG = [
  {
    title: "Agent sessions",
    text: "Agents can now set up, run, and check your project before handing work back — fewer round trips, and changes that arrive further along.",
    date: "Aug 19, 2026",
  },
  {
    title: "Team initiatives",
    text: "Initiatives carry strategy from the company level down to the teams doing the work, and roll their progress back up automatically.",
    date: "Aug 5, 2026",
  },
  {
    title: "Reviews on mobile",
    text: "Review a change from anywhere. Read diffs, comment on a specific line, and send an agent back to work without opening a laptop.",
    date: "Jul 30, 2026",
  },
  {
    title: "Agent-assisted editing",
    text: "Documents and project briefs are the context your team and its agents run on, so agents can now draft and revise them in place.",
    date: "Jul 22, 2026",
  },
] as const;

export const FOOTER_COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Intake", href: "#intake" },
      { label: "Plan", href: "#plan" },
      { label: "Build", href: "#build" },
      { label: "Diffs", href: "#diffs" },
      { label: "Monitor", href: "#monitor" },
      { label: "Pricing", href: "#pricing" },
      { label: "Security", href: "#security" },
    ],
  },
  {
    title: "Features",
    links: [
      { label: "Asks", href: "#intake" },
      { label: "Agents", href: "#build" },
      { label: "Agent Sessions", href: "#build" },
      { label: "Customer Requests", href: "#intake" },
      { label: "Insights", href: "#monitor" },
      { label: "Mobile", href: "#mobile" },
      { label: "Integrations", href: "#integrations" },
      { label: "Changelog", href: "#changelog" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#about" },
      { label: "Customers", href: "#customers" },
      { label: "Careers", href: "#careers" },
      { label: "Blog", href: "#blog" },
      { label: "Method", href: "#method" },
      { label: "Quality", href: "#quality" },
      { label: "Brand", href: "#brand" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Switch", href: "#switch" },
      { label: "Download", href: "#download" },
      { label: "Docs", href: "#docs" },
      { label: "Developers", href: "#developers" },
      { label: "Status", href: "#status" },
      { label: "Enterprise", href: "#enterprise" },
      { label: "Startups", href: "#startups" },
    ],
  },
  {
    title: "Connect",
    links: [
      { label: "Contact us", href: "#contact" },
      { label: "Community", href: "#community" },
      { label: "Support", href: "#support" },
      { label: "Partners", href: "#partners" },
      { label: "Events", href: "#events" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "#privacy" },
      { label: "Terms", href: "#terms" },
      { label: "DPA", href: "#dpa" },
      { label: "Acceptable use", href: "#aup" },
    ],
  },
] as const;

export const LEGAL_LINKS = [
  { label: "Privacy", href: "#privacy" },
  { label: "Terms", href: "#terms" },
  { label: "DPA", href: "#dpa" },
  { label: "AUP", href: "#aup" },
] as const;
