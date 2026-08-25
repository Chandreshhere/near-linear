import styles from "./landing.module.css";

/* ================================================================
 * Authored status glyphs — fill-based, single colour, `currentColor`,
 * decorative (aria-hidden). Nothing here reproduces a third-party icon set.
 * ================================================================ */

type GlyphProps = { size?: number; className?: string; color?: string };

function ring(size: number, color?: string) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 14 14",
    fill: color ?? "currentColor",
    "aria-hidden": true as const,
    focusable: "false" as const,
    className: styles.statusIcon,
  };
}

export function StatusBacklog({ size = 14, color }: GlyphProps) {
  return (
    <svg {...ring(size, color)}>
      <path
        fillRule="evenodd"
        d="M7 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1Zm0 1.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Z"
        opacity="0.55"
        strokeDasharray="2 2"
      />
    </svg>
  );
}

export function StatusTodo({ size = 14, color }: GlyphProps) {
  return (
    <svg {...ring(size, color)}>
      <path
        fillRule="evenodd"
        d="M7 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1Zm0 1.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Z"
      />
    </svg>
  );
}

export function StatusStarted({ size = 14, color }: GlyphProps) {
  return (
    <svg {...ring(size, color)}>
      <path
        fillRule="evenodd"
        d="M7 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1Zm0 1.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Z"
      />
      <path d="M7 3.9a3.1 3.1 0 0 1 0 6.2V3.9Z" />
    </svg>
  );
}

export function StatusReview({ size = 14, color }: GlyphProps) {
  return (
    <svg {...ring(size, color)}>
      <path
        fillRule="evenodd"
        d="M7 1a6 6 0 1 0 0 12A6 6 0 0 0 7 1Zm0 1.2a4.8 4.8 0 1 1 0 9.6 4.8 4.8 0 0 1 0-9.6Z"
      />
      <path d="M7 3.9a3.1 3.1 0 0 1 2.19 5.29L7 7V3.9Z" />
    </svg>
  );
}

export function StatusDone({ size = 14, color }: GlyphProps) {
  return (
    <svg {...ring(size, color)}>
      <path d="M7 1a6 6 0 1 1 0 12A6 6 0 0 1 7 1Zm2.7 3.86a.6.6 0 0 0-.85 0L6.4 7.32 5.15 6.07a.6.6 0 1 0-.85.85l1.68 1.68a.6.6 0 0 0 .85 0l2.87-2.88a.6.6 0 0 0 0-.86Z" />
    </svg>
  );
}

export function ArrowRight({ size = 12 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M6.4 1.7a.6.6 0 0 0-.85.85L8.1 5.1H1.6a.6.6 0 1 0 0 1.2h6.5L5.55 8.85a.6.6 0 0 0 .85.85l3.4-3.4a.6.6 0 0 0 0-.85l-3.4-3.4Z" />
    </svg>
  );
}

/* ================================================================
 * HERO — our own app UI, drawn as static markup inside the capture's
 * frame geometry (1320×720, 8px padding, 232px sidebar, 12px radius).
 * ================================================================ */

const SIDEBAR_NAV = [
  { label: "Inbox", active: false },
  { label: "My issues", active: false },
  { label: "Agent", active: true },
];
const SIDEBAR_TEAMS = ["Core", "Platform", "Mobile", "Growth"];
const SIDEBAR_WORKSPACE = ["Projects", "Views", "Initiatives", "Cycles"];

const HERO_GROUPS: {
  label: string;
  count: number;
  Icon: typeof StatusStarted;
  rows: { key: string; title: string; tag?: string; highlight?: boolean }[];
}[] = [
  {
    label: "In Progress",
    count: 4,
    Icon: StatusStarted,
    rows: [
      {
        key: "CORE-482",
        title: "Stream partial agent output into the issue timeline",
        tag: "Agent",
        highlight: true,
      },
      {
        key: "CORE-479",
        title: "Collapse duplicate customer requests on intake",
        tag: "Triage",
      },
      {
        key: "PLAT-118",
        title: "Move sync queue off the main thread",
        tag: "Perf",
      },
      {
        key: "CORE-471",
        title: "Structural diff view for renamed files",
        tag: "Diffs",
      },
    ],
  },
  {
    label: "Todo",
    count: 5,
    Icon: StatusTodo,
    rows: [
      {
        key: "MOB-63",
        title: "Inline review comments on a single line",
        tag: "Mobile",
      },
      {
        key: "CORE-466",
        title: "Let an agent open its own follow-up issues",
        tag: "Agent",
      },
      { key: "PLAT-112", title: "Retry policy for webhook delivery" },
      { key: "GRW-27", title: "Roll usage insights into the weekly pulse" },
      { key: "CORE-459", title: "Keyboard path from triage to project" },
    ],
  },
  {
    label: "Backlog",
    count: 6,
    Icon: StatusBacklog,
    rows: [
      { key: "PLAT-104", title: "Split the sync log by workspace", tag: "Perf" },
      {
        key: "CORE-448",
        title: "Summarise long threads back into the issue",
        tag: "Agent",
      },
      { key: "MOB-58", title: "Offline queue for draft comments" },
      { key: "GRW-24", title: "Weekly digest of stalled projects" },
      {
        key: "CORE-441",
        title: "Rank customer requests by revenue at risk",
        tag: "Triage",
      },
      { key: "PLAT-97", title: "Trace ids on every mutation" },
    ],
  },
  {
    label: "Done",
    count: 3,
    Icon: StatusDone,
    rows: [
      { key: "CORE-437", title: "Structural diffs for moved blocks" },
      { key: "MOB-51", title: "Push notification for review requests" },
      { key: "PLAT-91", title: "Backpressure on the event stream" },
    ],
  },
];

export function AppFrameMock() {
  return (
    <div className={styles.frameStage}>
      <div className={styles.frameBackdrop} aria-hidden="true" />
      <div className={styles.frameWrapper}>
        <div
          className={styles.frame}
          role="img"
          aria-label={`A view of the ${"Synquic"} app: the workspace sidebar beside a grouped issue list`}
        >
          <div className={styles.frameBackground} aria-hidden="true" />
          <div className={styles.frameGlow} aria-hidden="true" />

          <div className={styles.mockSidebar} aria-hidden="true">
            <div className={styles.mockWorkspace}>
              <span className={styles.mockAvatar}>SY</span>
              <span>Synquic</span>
            </div>
            <div style={{ height: 10 }} />
            {SIDEBAR_NAV.map((item) => (
              <div
                key={item.label}
                className={styles.mockNavRow}
                data-active={item.active ? "true" : "false"}
              >
                <span className={styles.mockNavDot} />
                <span>{item.label}</span>
              </div>
            ))}
            <div className={styles.mockSectionLabel}>Teams</div>
            {SIDEBAR_TEAMS.map((team) => (
              <div key={team} className={styles.mockNavRow}>
                <span className={styles.mockNavDot} />
                <span>{team}</span>
              </div>
            ))}
            <div className={styles.mockSectionLabel}>Workspace</div>
            {SIDEBAR_WORKSPACE.map((item) => (
              <div key={item} className={styles.mockNavRow}>
                <span className={styles.mockNavDot} />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className={styles.frameView} aria-hidden="true">
            <div className={styles.mockToolbar}>
              <span>All issues</span>
              <div className={styles.mockChipRow}>
                <span className={styles.mockChip}>Status</span>
                <span className={styles.mockChip}>Assignee</span>
                <span className={styles.mockChip}>Cycle 14</span>
              </div>
            </div>
            {HERO_GROUPS.map((group) => (
              <div key={group.label}>
                <div className={styles.mockGroupHeader}>
                  <group.Icon size={12} />
                  <span>{group.label}</span>
                  <span className={styles.mockCount}>{group.count}</span>
                </div>
                {group.rows.map((row) => (
                  <div
                    key={row.key}
                    className={styles.mockRow}
                    data-highlight={row.highlight ? "true" : "false"}
                  >
                    <group.Icon size={13} />
                    <span className={styles.mockKey}>{row.key}</span>
                    <span className={styles.mockTitle}>{row.title}</span>
                    <span className={styles.mockMeta}>
                      {row.tag ? (
                        <span className={styles.mockPill}>{row.tag}</span>
                      ) : null}
                      <span className={styles.mockFace} />
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
 * SECTION MINI-MOCKS
 * ================================================================ */

/** 1.0 Intake — inbound requests landing already routed and labeled. */
export function TriageMock() {
  const rows = [
    {
      key: "TRI-204",
      title: "Search results drop after the second page",
      tag: "Bug",
      colour: "var(--color-red)",
    },
    {
      key: "TRI-203",
      title: "Ask: export a cycle report as CSV",
      tag: "Request",
      colour: "var(--color-blue)",
    },
    {
      key: "TRI-201",
      title: "Slack thread — onboarding stalls on invite step",
      tag: "Feedback",
      colour: "var(--color-orange)",
    },
    {
      key: "TRI-198",
      title: "Duplicate of CORE-441, merged automatically",
      tag: "Merged",
      colour: "var(--color-green)",
    },
    {
      key: "TRI-196",
      title: "Support email — SSO loop on the second workspace",
      tag: "Bug",
      colour: "var(--color-red)",
    },
    {
      key: "TRI-194",
      title: "Ask: route billing questions to Finance",
      tag: "Ask",
      colour: "var(--color-teal)",
    },
    {
      key: "TRI-191",
      title: "Interview note — teams want cycle-level rollups",
      tag: "Feedback",
      colour: "var(--color-orange)",
    },
    {
      key: "TRI-188",
      title: "Escalated by the workspace agent, needs an owner",
      tag: "Urgent",
      colour: "var(--color-red)",
    },
    {
      key: "TRI-185",
      title: "Ask: publish a public roadmap page",
      tag: "Request",
      colour: "var(--color-blue)",
    },
    {
      key: "TRI-182",
      title: "Two customers hit the same import limit",
      tag: "Request",
      colour: "var(--color-blue)",
    },
    {
      key: "TRI-180",
      title: "Auto-labelled from the #feedback channel",
      tag: "Feedback",
      colour: "var(--color-orange)",
    },
  ];
  return (
    <>
      <div className={styles.miniGroupHeader}>
        <StatusBacklog size={12} />
        <span>Triage</span>
        <span style={{ opacity: 0.6 }}>{rows.length}</span>
      </div>
      {rows.map((row) => (
        <div key={row.key} className={styles.miniRow}>
          <StatusTodo size={13} />
          <span className={styles.miniKey}>{row.key}</span>
          <span className={styles.miniTitle}>{row.title}</span>
          <span className={styles.miniTag}>
            <span
              className={styles.miniTagDot}
              style={{ background: row.colour }}
            />
            {row.tag}
          </span>
        </div>
      ))}
    </>
  );
}

/** 2.0 Plan — initiatives on a timeline. */
export function RoadmapMock() {
  const bars = [
    { label: "Agent sessions", start: 4, width: 46, colour: "var(--color-indigo)" },
    { label: "Structural diffs", start: 22, width: 38, colour: "var(--color-blue)" },
    { label: "Insights v2", start: 34, width: 44, colour: "var(--color-teal)" },
    { label: "Mobile review", start: 52, width: 34, colour: "var(--color-orange)" },
    { label: "Intake routing", start: 12, width: 30, colour: "var(--color-green)" },
    { label: "Workspace asks", start: 40, width: 26, colour: "var(--color-indigo)" },
    { label: "Rollup reporting", start: 58, width: 32, colour: "var(--color-blue)" },
    { label: "Import v3", start: 8, width: 22, colour: "var(--color-teal)" },
    { label: "Audit trail", start: 62, width: 30, colour: "var(--color-orange)" },
    { label: "Public roadmap", start: 70, width: 24, colour: "var(--color-green)" },
  ];
  return (
    <div className={styles.chartWrap}>
      <div className={styles.miniGroupHeader} style={{ margin: "-24px -24px 0" }}>
        <StatusStarted size={12} />
        <span>Initiatives — FY26</span>
      </div>
      <div className={styles.chartLegend} style={{ marginTop: 20 }}>
        {["Q1", "Q2", "Q3", "Q4"].map((q) => (
          <span key={q} style={{ flex: 1 }}>
            {q}
          </span>
        ))}
      </div>
      <div className={styles.progressList} style={{ padding: 0, gap: 16 }}>
        {bars.map((bar) => (
          <div
            key={bar.label}
            className={`${styles.progressRow} ${styles.progressRowWide}`}
          >
            <span className={styles.miniTitle}>{bar.label}</span>
            <span className={styles.progressTrack} style={{ height: 22 }}>
              <span
                className={styles.progressFill}
                style={{
                  left: `${bar.start}%`,
                  right: `${100 - bar.start - bar.width}%`,
                  width: "auto",
                  background: bar.colour,
                  opacity: 0.85,
                  borderRadius: 6,
                }}
              />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** 3.0 Build — a board column, with an agent working one of the cards. */
export function BoardMock() {
  const columns = [
    {
      title: "Todo",
      Icon: StatusTodo,
      cards: [
        { title: "Retry policy for webhook delivery", meta: "PLAT-112" },
        { title: "Keyboard path from triage to project", meta: "CORE-459" },
        { title: "Offline queue for draft comments", meta: "MOB-58" },
        { title: "Trace ids on every mutation", meta: "PLAT-97" },
      ],
    },
    {
      title: "In Progress",
      Icon: StatusStarted,
      cards: [
        {
          title: "Stream partial agent output into the timeline",
          meta: "CORE-482 · Agent",
        },
        { title: "Move sync queue off the main thread", meta: "PLAT-118" },
        { title: "Collapse duplicate requests on intake", meta: "CORE-479" },
        { title: "Summarise long threads into the issue", meta: "CORE-448 · Agent" },
      ],
    },
    {
      title: "In Review",
      Icon: StatusReview,
      cards: [
        { title: "Structural diff view for renames", meta: "CORE-471 · PR #218" },
        { title: "Inline comments on one line", meta: "MOB-63" },
        { title: "Rank requests by revenue at risk", meta: "CORE-441" },
      ],
    },
  ];
  return (
    <div className={styles.boardColumns}>
      {columns.map((column) => (
        <div key={column.title} className={styles.boardColumn}>
          <div className={styles.boardColumnHead}>
            <span
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <column.Icon size={12} />
              {column.title}
            </span>
            <span>{column.cards.length}</span>
          </div>
          {column.cards.map((card) => (
            <div key={card.title} className={styles.boardCard}>
              <span className={styles.boardCardTitle}>{card.title}</span>
              <span className={styles.boardCardMeta}>
                <span className={styles.mockFace} />
                {card.meta}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** 4.0 Diffs — a review strip with a structural diff. */
export function DiffMock() {
  const lines: { kind: "ctx" | "add" | "del"; n: string; text: string }[] = [
    { kind: "ctx", n: "41", text: "  export function planRun(input: RunInput) {" },
    { kind: "del", n: "42", text: "-   const steps = input.steps ?? []" },
    { kind: "add", n: "42", text: "+   const steps = normalize(input.steps)" },
    { kind: "add", n: "43", text: "+   if (!steps.length) return emptyPlan(input)" },
    { kind: "ctx", n: "44", text: "    return {" },
    { kind: "del", n: "45", text: "-     id: input.id," },
    { kind: "add", n: "45", text: "+     id: input.id ?? createRunId()," },
    { kind: "ctx", n: "46", text: "      steps," },
    { kind: "ctx", n: "47", text: "    }" },
    { kind: "ctx", n: "48", text: "  }" },
    { kind: "ctx", n: "49", text: "" },
    { kind: "ctx", n: "50", text: "  function normalize(steps?: Step[]) {" },
    { kind: "del", n: "51", text: "-   return steps.filter(Boolean)" },
    { kind: "add", n: "51", text: "+   if (!steps) return []" },
    { kind: "add", n: "52", text: "+   return steps.filter(isRunnable).map(withDefaults)" },
    { kind: "ctx", n: "53", text: "  }" },
    { kind: "ctx", n: "54", text: "" },
    { kind: "ctx", n: "55", text: "  function emptyPlan(input: RunInput) {" },
    { kind: "add", n: "56", text: "+   log.debug('plan.empty', { id: input.id })" },
    { kind: "ctx", n: "57", text: "    return { id: input.id, steps: [] }" },
    { kind: "ctx", n: "58", text: "  }" },
  ];
  return (
    <>
      <div className={styles.miniGroupHeader}>
        <StatusReview size={12} />
        <span>PR #218 — Normalize run steps before planning</span>
      </div>
      <div className={styles.diffFile}>
        <span>src/agent/plan-run.ts</span>
        <span>
          <span style={{ color: "var(--color-green)" }}>+3</span>
          {"  "}
          <span style={{ color: "var(--color-red)" }}>&minus;2</span>
        </span>
      </div>
      <div style={{ paddingBottom: 12 }}>
        {lines.map((line, index) => (
          <div key={index} className={styles.diffLine} data-kind={line.kind}>
            <span className={styles.diffGutter}>{line.n}</span>
            <span>{line.text}</span>
          </div>
        ))}
      </div>
    </>
  );
}

/** 5.0 Monitor — scope-over-time chart plus per-team completion. */
export function ProgressMock() {
  const scope = [8, 18, 26, 31, 44, 52, 61, 70, 78, 88, 94, 100];
  const done = [2, 6, 11, 19, 24, 33, 41, 52, 60, 71, 82, 91];
  const W = 640;
  const H = 150;
  const toPoints = (series: number[]) =>
    series
      .map((value, index) => {
        const x = (index / (series.length - 1)) * W;
        const y = H - (value / 100) * H;
        return `${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ");

  const teams = [
    { label: "Core", pct: 82, colour: "var(--color-indigo)" },
    { label: "Platform", pct: 64, colour: "var(--color-blue)" },
    { label: "Mobile", pct: 48, colour: "var(--color-teal)" },
    { label: "Growth", pct: 31, colour: "var(--color-orange)" },
  ];

  return (
    <>
      <div className={styles.chartWrap}>
        <div className={styles.chartLegend}>
          <span>
            <span
              className={styles.legendSwatch}
              style={{ background: "var(--color-text-quaternary)" }}
            />
            Scope
          </span>
          <span>
            <span
              className={styles.legendSwatch}
              style={{ background: "var(--color-indigo)" }}
            />
            Completed
          </span>
          <span style={{ marginLeft: "auto" }}>Cycle 14 · 12 weeks</span>
        </div>
        <svg
          viewBox={`0 0 ${W} ${H}`}
          width="100%"
          height="150"
          preserveAspectRatio="none"
          aria-hidden="true"
          focusable="false"
        >
          <defs>
            <linearGradient id="progressFade" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-indigo)"
                stopOpacity="0.35"
              />
              <stop
                offset="100%"
                stopColor="var(--color-indigo)"
                stopOpacity="0"
              />
            </linearGradient>
          </defs>
          {[0.25, 0.5, 0.75].map((t) => (
            <line
              key={t}
              x1="0"
              x2={W}
              y1={H * t}
              y2={H * t}
              stroke="var(--color-border-translucent)"
              strokeWidth="1"
            />
          ))}
          <polygon
            points={`0,${H} ${toPoints(done)} ${W},${H}`}
            fill="url(#progressFade)"
          />
          <polyline
            points={toPoints(scope)}
            fill="none"
            stroke="var(--color-text-quaternary)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <polyline
            points={toPoints(done)}
            fill="none"
            stroke="var(--color-indigo)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <div className={styles.progressList}>
        {teams.map((team) => (
          <div key={team.label} className={styles.progressRow}>
            <span className={styles.miniTitle}>{team.label}</span>
            <span className={styles.progressTrack}>
              <span
                className={styles.progressFill}
                style={
                  {
                    "--pct": `${team.pct}%`,
                    color: team.colour,
                  } as unknown as React.CSSProperties
                }
              />
            </span>
            <span className={styles.progressValue}>{team.pct}%</span>
          </div>
        ))}
      </div>
    </>
  );
}

export const MOCKS = {
  triage: TriageMock,
  roadmap: RoadmapMock,
  board: BoardMock,
  diff: DiffMock,
  progress: ProgressMock,
} as const;
