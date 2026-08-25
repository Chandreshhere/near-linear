import type { CSSProperties, ReactNode } from "react";
import { Icon } from "@/components/icons/Icon";
import type { ProjectHealth, ProjectStatusCategory } from "@/lib/data/types";

/**
 * Project-scoped bespoke glyphs, drawn parametrically from the measured
 * geometry (capture doc §6.3 / MASTER_PROMPT.md §8):
 *
 * - Status "shield": 16×16 rounded-hex outline (stroke 1.5, dashed
 *   `1.65 1.35` for not-started categories) + masked inner progress ring
 *   (r4, stroke-width 8, dasharray fraction of 25.12, rotated -90°).
 * - Health: dashed circle (r 7.5, dasharray `2.36 2.36`, round caps) for
 *   "No update"; filled colored circle with check / "!" otherwise.
 * - Milestone diamond: outline stroke 2 at .4 opacity (chip usage) or solid.
 * - Progress sparkline: 32×16 two-path bezier (project color + muted trend).
 *
 * Pure presentational — no store access.
 */

// ---------------------------------------------------------------------------
// ProjectStatusIcon — the status "shield"
// ---------------------------------------------------------------------------

/** Default shield tints per status category (capture §6.3 status cell). */
const CATEGORY_COLOR: Record<ProjectStatusCategory, string> = {
  backlog: "#D7D8DB",
  planned: "var(--color-yellow)",
  started: "var(--color-orange)",
  completed: "var(--color-accent)",
  canceled: "#8a8f98",
};

/** Symmetric hexagon with ROUNDED vertices (CAPTURED: every corner a cubic,
    span 1.75→12.25 = 10.5 wide). */
const SHIELD_OUTLINE =
  "M5.62 1.7Q7 0.9 8.38 1.7L10.87 3.15Q12.25 3.95 12.25 5.55L12.25 8.45Q12.25 10.05 10.87 10.85L8.38 12.3Q7 13.1 5.62 12.3L3.13 10.85Q1.75 10.05 1.75 8.45L1.75 5.55Q1.75 3.95 3.13 3.15Z";

/** Same rounded hexagon scaled about the center for the progress-pie clip. */
const SHIELD_CLIP =
  "M5.96 2.6Q7 2 8.04 2.6L10.27 3.9Q11.31 4.5 11.31 5.7L11.31 8.3Q11.31 9.5 10.27 10.1L8.04 11.4Q7 12 5.96 11.4L3.73 10.1Q2.7 9.5 2.7 8.3L2.7 5.7Q2.7 4.5 3.73 3.9Z";

/**
 * Deterministic id, DEFINED ONCE in the hidden sprite sheet
 * (components/icons/Sprites.tsx → <ProjectShieldClip/>), which the app layout
 * mounts a single time. Every shield then references it with `url(#…)`.
 *
 * It used to be emitted per instance — byte-identical each time, so `url(#…)`
 * still resolved — but a list of 60 projects then carried 60 elements sharing
 * one id, which is an HTML validity violation and a real duplicate-id
 * accessibility finding. One definition, many references, same paint.
 */
export const SHIELD_CLIP_ID = "project-status-shield-clip";

/** The clip path itself, mounted once by the sprite sheet. */
export function ProjectShieldClipDef() {
  return (
    <clipPath id={SHIELD_CLIP_ID}>
      <path d={SHIELD_CLIP} />
    </clipPath>
  );
}

/** Inner progress-ring circumference: 2π·4 ≈ 25.12 (measured constant). */
const SHIELD_PROGRESS_CIRC = 25.12;

/**
 * Project-status shield (capture §6.3 item 9): rounded-hex outline —
 * dashed while not started (backlog | planned), solid otherwise — plus a
 * hex-masked thick progress arc that fills the shield as progress → 1.
 */
export function ProjectStatusIcon({
  category,
  progress = 0,
  color,
  size = 16,
}: {
  category: ProjectStatusCategory;
  /** 0..1 fill of the masked inner ring. */
  progress?: number;
  color?: string;
  size?: number;
}) {
  const c = color ?? CATEGORY_COLOR[category];
  const dashed = category === "backlog" || category === "planned";
  const p = Math.min(1, Math.max(0, progress));

  return (
    <svg width={size} height={size} viewBox="-1 -1 16 16" aria-hidden="true">
      <path
        d={SHIELD_OUTLINE}
        fill="none"
        stroke={c}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeDasharray={dashed ? "1.65 1.35" : undefined}
      />
      {p > 0 && (
        <g clipPath={`url(#${SHIELD_CLIP_ID})`}>
          {/* r4 ring with stroke 8 paints the 0–8 radius disc as a pie;
              the hex clip trims it to the shield's inner silhouette. */}
          <circle
            cx={7}
            cy={7}
            r={4}
            fill="none"
            stroke={c}
            strokeWidth={8}
            strokeDasharray={`${p * SHIELD_PROGRESS_CIRC} ${SHIELD_PROGRESS_CIRC}`}
            transform="rotate(-90 7 7)"
          />
        </g>
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// HealthIcon
// ---------------------------------------------------------------------------

/** Near-black knockout for the "!" on the yellow at-risk disc
    (theme-invariant — the disc fills are fixed hex in both themes). */
const HEALTH_DARK_GLYPH = "#16181c";

const HEALTH_FILL: Record<Exclude<ProjectHealth, "noUpdate">, string> = {
  onTrack: "#4cb782",
  atRisk: "#f2c94c",
  offTrack: "#eb5757",
};

/** Exclamation glyph (bar + dot) used by atRisk / offTrack. */
function HealthBang({ color }: { color: string }) {
  return (
    <>
      <path
        d="M8 4.6v3.9"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
      <circle cx={8} cy={11.3} r={1} fill={color} />
    </>
  );
}

/**
 * Project health glyph (capture §6.3 item 4): "No update" = dashed circle;
 * otherwise a filled status disc with a white check or "!" knockout.
 */
export function HealthIcon({
  health,
  size = 16,
}: {
  health: ProjectHealth;
  size?: number;
}) {
  if (health === "noUpdate") {
    return (
      <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
        <circle
          cx={8}
          cy={8}
          r={7.5}
          fill="none"
          stroke="var(--color-text-faint)"
          strokeWidth={1}
          strokeDasharray="2.36 2.36"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <circle cx={8} cy={8} r={7} fill={HEALTH_FILL[health]} />
      {health === "onTrack" ? (
        <path
          d="M4.9 8.2 7.1 10.4 11.2 6.1"
          stroke="#fff"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      ) : (
        <HealthBang color={health === "atRisk" ? HEALTH_DARK_GLYPH : "#fff"} />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// MilestoneDiamond
// ---------------------------------------------------------------------------

/**
 * Milestone diamond (CAPTURED): a rounded-corner kite 9.58 × 11.36, stroke
 * sw 2, `fill: none`, full opacity — colour carries state. Variants: solid
 * outline / dashed `2 1.93` (not started) / filled+stroked (done).
 */
export function MilestoneDiamond({
  color,
  size = 16,
  filled = false,
  dashed = false,
}: {
  color?: string;
  size?: number;
  filled?: boolean;
  dashed?: boolean;
}) {
  const c = color ?? "currentColor";
  const d =
    "M7.29 3.16Q8 2.32 8.71 3.16L12.08 7.16Q12.79 8 12.08 8.84L8.71 12.84Q8 13.68 7.29 12.84L3.92 8.84Q3.21 8 3.92 7.16Z";

  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path
        d={d}
        fill={filled ? c : "none"}
        stroke={c}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeDasharray={dashed && !filled ? "2 1.93" : undefined}
      />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// ProjectSparkline
// ---------------------------------------------------------------------------

type Pt = { x: number; y: number };

const fmt = (v: number): number => Math.round(v * 100) / 100;

/** Catmull-Rom → cubic-bezier smoothing through every point. */
function smoothPath(pts: Pt[]): string {
  const first = pts[0];
  if (first === undefined) return "";
  let d = `M${fmt(first.x)} ${fmt(first.y)}`;
  for (let i = 1; i < pts.length; i++) {
    const p0 = pts[i - 1];
    const p1 = pts[i];
    const prev = pts[i - 2] ?? p0;
    const next = pts[i + 1] ?? p1;
    const c1x = p0.x + (p1.x - prev.x) / 6;
    const c1y = p0.y + (p1.y - prev.y) / 6;
    const c2x = p1.x - (next.x - p0.x) / 6;
    const c2y = p1.y - (next.y - p0.y) / 6;
    d += ` C${fmt(c1x)} ${fmt(c1y)} ${fmt(c2x)} ${fmt(c2y)} ${fmt(p1.x)} ${fmt(p1.y)}`;
  }
  return d;
}

/**
 * 32×16 progress sparkline (capture §6.3 item 9): smoothed data path in the
 * project color over a straight first→last trend line in muted text color
 * at 53% alpha (opacity attr — the color is a CSS var, so no hex "88"
 * suffix). Overflow stays visible like the captured wrapper.
 */
export function ProjectSparkline({
  points,
  color,
  width = 32,
  height = 16,
}: {
  points: number[];
  color: string;
  width?: number;
  height?: number;
}) {
  let dataPath = "";
  let trendPath = "";

  if (points.length >= 2) {
    let min = Infinity;
    let max = -Infinity;
    for (const v of points) {
      if (v < min) min = v;
      if (v > max) max = v;
    }
    const span = max - min;
    const step = width / (points.length - 1);
    const pts: Pt[] = points.map((v, i) => ({
      x: i * step,
      y: span === 0 ? height / 2 : height - ((v - min) / span) * height,
    }));

    dataPath = smoothPath(pts);
    const first = pts[0];
    const last = pts[pts.length - 1];
    trendPath = `M${fmt(first.x)} ${fmt(first.y)} L${fmt(last.x)} ${fmt(last.y)}`;
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ overflow: "visible" } as CSSProperties}
      aria-hidden="true"
    >
      {trendPath !== "" && (
        <path
          d={trendPath}
          fill="none"
          stroke="var(--color-text-muted)"
          strokeWidth={1.25}
          opacity={0.53}
        />
      )}
      {dataPath !== "" && (
        <path d={dataPath} fill="none" stroke={color} strokeWidth={1.25} />
      )}
    </svg>
  );
}

// ---------------------------------------------------------------------------
// projectIconFor
// ---------------------------------------------------------------------------

/**
 * Project icon tile content (capture §6.3 item 3): an emoji icon renders as
 * 13px text in a `data-type="emoji"` box; otherwise the #Project sprite
 * glyph tinted with the project color. Optional `size` shrinks both forms
 * (property chips use 12); omitted = the captured tile sizes (13px emoji /
 * 16px sprite).
 */
export function projectIconFor(
  project: {
    icon?: string;
    color: string;
  },
  size?: number,
): ReactNode {
  const { icon } = project;
  // Sprite names are plain ASCII ("Project", "Rocket", …); emoji are not.
  if (icon !== undefined && icon !== "" && icon.charCodeAt(0) > 0x7f) {
    return (
      <span data-type="emoji" style={{ fontSize: size ?? 13, lineHeight: 1 }}>
        {icon}
      </span>
    );
  }
  return <Icon name="Project" color={project.color} size={size ?? 16} />;
}

// ---------------------------------------------------------------------------
// CrossGlyph
// ---------------------------------------------------------------------------

/**
 * 12px ✕ used by hover-revealed remove affordances (resource rows, posted
 * project updates). Stroke-based so it inherits the button's icon color.
 */
export function CrossGlyph({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.71 2.71a.7.7 0 0 1 .99 0L6 5.01l2.3-2.3a.7.7 0 1 1 .99.99L6.99 6l2.3 2.3a.7.7 0 1 1-.99.99L6 6.99l-2.3 2.3a.7.7 0 0 1-.99-.99L5.01 6l-2.3-2.3a.7.7 0 0 1 0-.99Z" fill="currentColor" />
    </svg>
  );
}
