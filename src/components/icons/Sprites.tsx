/**
 * Hidden SVG sprite sheets mounted at #root top, referenced via <use href="#Name">.
 * All symbols are original 16x16 filled glyphs following the documented style
 * (fill-based, single color; "outline" looks are even-odd filled donuts, never
 * strokes — the lone exceptions mirror the capture's five stroked families,
 * e.g. the sidebar HomeOutline). Sets: Base (chrome) + Decorative.
 *
 * Silhouettes follow the drift report's measured specs (§C): spans, wall
 * thickness and proportions match the captured symbols; every path is
 * authored here, none copied.
 */

import type { CSSProperties } from "react";
import { ProjectShieldClipDef } from "@/components/projects/glyphs";
import styles from "./icon.module.css";

function Sheet({
  set,
  children,
}: {
  set: string;
  children: React.ReactNode;
}) {
  return (
    <div
      aria-hidden="true"
      data-sprite-set={set}
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
    >
      <svg xmlns="http://www.w3.org/2000/svg">
        <defs>{children}</defs>
      </svg>
    </div>
  );
}

const S = ({ id, children }: { id: string; children: React.ReactNode }) => (
  <symbol id={id} viewBox="0 0 16 16">
    {children}
  </symbol>
);

/** The one filled 16×16 checkmark every check site shares. */
export const CHECK_PATH =
  "M12.78 4.72a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.97 1.97 4.47-4.47a.75.75 0 0 1 1.06 0Z";

/** Shared no-assignee / no-lead dashed avatar (filled bust + 4 arc ticks). */
export const PERSON_DASHED_PATH =
  "M4.84 1.53A7.2 7.2 0 0 1 11.16 1.53L10.59 2.7A5.9 5.9 0 0 0 5.41 2.7Z" +
  "M14.47 4.84A7.2 7.2 0 0 1 14.47 11.16L13.3 10.59A5.9 5.9 0 0 0 13.3 5.41Z" +
  "M11.16 14.47A7.2 7.2 0 0 1 4.84 14.47L5.41 13.3A5.9 5.9 0 0 0 10.59 13.3Z" +
  "M1.53 11.24A7.2 7.2 0 0 1 1.53 4.84L2.7 5.41A5.9 5.9 0 0 0 2.7 10.59Z" +
  "M8 4.5a2.25 2.25 0 1 1 0 4.5 2.25 2.25 0 0 1 0-4.5Z" +
  "M8 9.9c1.98 0 3.65 1.13 4.2 2.68.09.26-.02.55-.26.69A7.93 7.93 0 0 1 8 14.35c-1.44 0-2.79-.4-3.94-1.08a.56.56 0 0 1-.26-.69C4.35 11.03 6.02 9.9 8 9.9Z";

const SIDE_PANEL_FRAME =
  "M4.25 2H11.75A3.25 3.25 0 0 1 15 5.25V10.75A3.25 3.25 0 0 1 11.75 14H4.25A3.25 3.25 0 0 1 1 10.75V5.25A3.25 3.25 0 0 1 4.25 2Z" +
  "M4.5 3.5H11.5A2 2 0 0 1 13.5 5.5V10.5A2 2 0 0 1 11.5 12.5H4.5A2 2 0 0 1 2.5 10.5V5.5A2 2 0 0 1 4.5 3.5Z";

/**
 * Sidebar-toggle glyph with the captured state animation: frame donut plus a
 * floating pill that widens (x 10→7, w 1.5→4.5) when expanded.
 */
export function SidePanelGlyph({
  expanded = false,
  size = 14,
}: {
  expanded?: boolean;
  size?: number;
}) {
  return (
    <svg
      role="img"
      focusable="false"
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={styles.icon}
    >
      <path fillRule="evenodd" d={SIDE_PANEL_FRAME} />
      <rect
        y="5"
        height="6"
        rx="0.75"
        style={
          {
            x: expanded ? "7px" : "10px",
            width: expanded ? "4.5px" : "1.5px",
            transition:
              "x var(--speed-highlightFadeOut) var(--ease-out-quad), width var(--speed-highlightFadeOut) var(--ease-out-quad)",
          } as CSSProperties
        }
      />
    </svg>
  );
}

const iconStroke =
  "var(--icon-color, var(--icon-replacement-color, var(--icon-default-color)))";

export function Sprites() {
  return (
    <>
      <Sheet set="Base">
        {/* Inbox: symmetric tray 1→15, rounded 2.5r shell, notched lip */}
        <S id="Inbox">
          <path
            fillRule="evenodd"
            d="M4.55 1.5h6.9c.95 0 1.82.54 2.23 1.4l1.1 2.24c.14.3.22.63.22.96V12a2.5 2.5 0 0 1-2.5 2.5h-9A2.5 2.5 0 0 1 1 12V6.1c0-.33.08-.66.22-.96l1.1-2.24c.41-.86 1.28-1.4 2.23-1.4ZM4.9 3 3.35 6.9h2.28c.4 0 .77.2.98.54l.53.86c.2.34.58.54.98.54h1.76c.4 0 .77-.2.98-.54l.53-.86c.2-.34.58-.54.98-.54h2.28L12.1 3H4.9Z"
          />
        </S>
        {/* MyIssues: 4 corner brackets (viewfinder) */}
        <S id="MyIssues">
          <path d="M6.35 2.1a.75.75 0 0 1-.75.75H4.35a1.5 1.5 0 0 0-1.5 1.5v1.26a.75.75 0 0 1-1.5 0V4.35a3 3 0 0 1 3-3h1.25a.75.75 0 0 1 .75.75ZM9.65 2.1a.75.75 0 0 1 .75-.75h1.25a3 3 0 0 1 3 3v1.26a.75.75 0 0 1-1.5 0V4.35a1.5 1.5 0 0 0-1.5-1.5h-1.25a.75.75 0 0 1-.75-.75ZM13.9 9.64a.75.75 0 0 1 .75.75v1.26a3 3 0 0 1-3 3h-1.25a.75.75 0 0 1 0-1.5h1.25a1.5 1.5 0 0 0 1.5-1.5v-1.26a.75.75 0 0 1 .75-.75ZM2.1 9.64a.75.75 0 0 1 .75.75v1.26a1.5 1.5 0 0 0 1.5 1.5H5.6a.75.75 0 0 1 0 1.5H4.35a3 3 0 0 1-3-3v-1.26a.75.75 0 0 1 .75-.75Z" />
        </S>
        {/* Agent: quill/ribbon with a slit */}
        <S id="Agent">
          <path
            fillRule="evenodd"
            d="M13.4 2.6c.92.92 1.06 3.9-1.52 6.48-1.37 1.37-3.14 2.08-4.7 2.23l-.9.09-1.87 1.88a.75.75 0 0 1-1.06-1.06l1.87-1.88.09-.9c.15-1.56.86-3.33 2.23-4.7C10.12 2.16 12.48 1.68 13.4 2.6ZM12.5 3.62 6.83 9.29l.42.42 5.67-5.67-.42-.42Z"
          />
        </S>
        {/* Project: flat rounded-hexagon donut (status-shield family) */}
        <S id="Project">
          <path
            fillRule="evenodd"
            d="M6.18 2.15Q8 1.1 9.82 2.15L12.18 3.5Q14 4.55 14 6.65L14 9.35Q14 11.45 12.18 12.5L9.82 13.85Q8 14.9 6.18 13.85L3.82 12.5Q2 11.45 2 9.35L2 6.65Q2 4.55 3.82 3.5ZM6.79 3.73Q8 3.03 9.21 3.73L11.11 4.82Q12.32 5.52 12.32 6.92L12.32 9.08Q12.32 10.48 11.11 11.18L9.21 12.27Q8 12.97 6.79 12.27L4.89 11.18Q3.68 10.48 3.68 9.08L3.68 6.92Q3.68 5.52 4.89 4.82Z"
          />
        </S>
        {/* Issues: stacked cards — back corner band + front rounded donut */}
        <S id="Issues">
          <path d="M1 9.6V3.5A2.5 2.5 0 0 1 3.5 1h6.1v1.5H3.9c-.77 0-1.4.63-1.4 1.4v5.7H1Z" />
          <path
            fillRule="evenodd"
            d="M7.5 5.25h5A2.5 2.5 0 0 1 15 7.75v4.75A2.5 2.5 0 0 1 12.5 15h-5A2.5 2.5 0 0 1 5 12.5V7.75a2.5 2.5 0 0 1 2.5-2.5Zm.4 1.5c-.77 0-1.4.63-1.4 1.4v3.95c0 .77.63 1.4 1.4 1.4h4.2c.77 0 1.4-.63 1.4-1.4V8.15c0-.77-.63-1.4-1.4-1.4H7.9Z"
          />
        </S>
        {/* CustomView: stacked layers */}
        <S id="CustomView">
          <path d="M8 1.8c.2 0 .4 0 .5.1l5.8 3.1c.6.3.6 1.1 0 1.4L8.5 9.5a1 1 0 0 1-1 0L1.7 6.4a.8.8 0 0 1 0-1.4l5.8-3.1c.1-.1.3-.1.5-.1ZM2.6 8.7l4.9 2.6a1 1 0 0 0 1 0l4.9-2.6.9.5c.6.3.6 1.1 0 1.4l-5.8 3.1a1 1 0 0 1-1 0l-5.8-3.1a.8.8 0 0 1 0-1.4l.9-.5Z" />
        </S>
        {/* Loop: circular arrows */}
        <S id="Loop">
          <path d="M8 2.2A5.8 5.8 0 0 1 13.8 8h1.4a.4.4 0 0 1 .3.66l-2.1 2.5a.4.4 0 0 1-.6 0l-2.1-2.5A.4.4 0 0 1 11 8h1.3A4.3 4.3 0 0 0 8 3.7a4.3 4.3 0 0 0-3.4 1.66.75.75 0 0 1-1.18-.92A5.8 5.8 0 0 1 8 2.2Zm-6.5 4.6a.4.4 0 0 1 .6 0l2.1 2.5A.4.4 0 0 1 3.9 10H2.7A4.3 4.3 0 0 0 8 12.3c1.37 0 2.6-.64 3.4-1.66a.75.75 0 1 1 1.18.92A5.8 5.8 0 0 1 2.2 10H.8a.4.4 0 0 1-.3-.66l2.1-2.5-.1-.04Z" />
        </S>
        {/* Loops: two linked ring donuts */}
        <S id="Loops">
          <path d="M5.3 4.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Zm0 1.5a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z" />
          <path d="M10.7 4.1a3.9 3.9 0 1 0 0 7.8 3.9 3.9 0 0 0 0-7.8Zm0 1.5a2.4 2.4 0 1 1 0 4.8 2.4 2.4 0 0 1 0-4.8Z" />
        </S>
        {/* Cycle: two semicircular chasing arrows (§22 team cycles) */}
        <S id="Cycle">
          <path
            d="M3.67 7.24 A4.4 4.4 0 0 1 11.37 5.17"
            style={{
              fill: "none",
              stroke: iconStroke,
              strokeWidth: 1.5,
              strokeLinecap: "round",
            }}
          />
          <path d="M12.91 7.01 12.56 4.17 10.18 6.17Z" />
          <path
            d="M12.33 8.76 A4.4 4.4 0 0 1 4.63 10.83"
            style={{
              fill: "none",
              stroke: iconStroke,
              strokeWidth: 1.5,
              strokeLinecap: "round",
            }}
          />
          <path d="M3.09 8.99 3.44 11.83 5.82 9.83Z" />
        </S>
        {/* Triage: intake tray + incoming plus (§22 per-team triage inbox) */}
        <S id="Triage">
          <path d="M2.5 7.25c0-.41.34-.75.75-.75h2.1c.4 0 .77.2.98.54l.53.86c.2.34.58.54.98.54h1.76c.4 0 .77-.2.98-.54l.53-.86c.21-.34.58-.54.98-.54h2.1c.41 0 .75.34.75.75V12a2.5 2.5 0 0 1-2.5 2.5H5A2.5 2.5 0 0 1 2.5 12V7.25Z" />
          <rect x="7.25" y="1.2" width="1.5" height="4.4" rx="0.75" />
          <rect x="5.8" y="2.65" width="4.4" height="1.5" rx="0.75" />
        </S>
        {/* More: horizontal ellipsis (r 1.5 CAPTURED) */}
        <S id="More">
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
        </S>
        {/* Team: rounded-square frame donut + one bust */}
        <S id="Team">
          <path
            fillRule="evenodd"
            d="M3.5 1H12.5A2.5 2.5 0 0 1 15 3.5V12.5A2.5 2.5 0 0 1 12.5 15H3.5A2.5 2.5 0 0 1 1 12.5V3.5A2.5 2.5 0 0 1 3.5 1ZM4 2.5A1.5 1.5 0 0 0 2.5 4V12A1.5 1.5 0 0 0 4 13.5H12A1.5 1.5 0 0 0 13.5 12V4A1.5 1.5 0 0 0 12 2.5H4Z"
          />
          <path d="M8 4.1a2 2 0 1 1 0 4 2 2 0 0 1 0-4ZM8 9.3c2.36 0 4.3 1.62 4.72 3.79.05.22-.13.41-.35.41H3.63c-.22 0-.4-.19-.35-.41C3.7 10.92 5.64 9.3 8 9.3Z" />
        </S>
        {/* Search: r5/r3.5 ring donut + handle to (13.78,13.78) */}
        <S id="Search">
          <path
            fillRule="evenodd"
            d="M7 2a5 5 0 1 0 0 10A5 5 0 0 0 7 2ZM3.5 7a3.5 3.5 0 1 1 7 0 3.5 3.5 0 0 1-7 0Z"
          />
          <path d="M10.03 11.09a5.06 5.06 0 0 0 1.06-1.06l2.69 2.69a.75.75 0 1 1-1.06 1.06l-2.69-2.69Z" />
        </S>
        {/* Compose: open frame (top-right corner omitted) + separate nib */}
        <S id="Compose">
          <path d="M7 2.5a.75.75 0 0 1 0 1.5H4A1.5 1.5 0 0 0 2.5 5.5v6.5A1.5 1.5 0 0 0 4 13.5h6.5A1.5 1.5 0 0 0 12 12V9a.75.75 0 0 1 1.5 0v3a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V5.5a3 3 0 0 1 3-3h3Z" />
          <path d="M12.55 2.25a1.56 1.56 0 0 1 2.2 2.2l-6.04 6.04c-.17.17-.38.3-.61.37l-2.35.72a.5.5 0 0 1-.62-.62l.72-2.35c.07-.23.2-.44.37-.61l6.33-5.75Z" />
        </S>
        {/* generic chevrons (non-disclosure roles) */}
        <S id="ChevronDown">
          <path d="M3.2 5.7a.9.9 0 0 1 1.27-.05L8 8.94l3.53-3.3a.9.9 0 0 1 1.23 1.32l-4.14 3.87a.9.9 0 0 1-1.24 0L3.25 6.96a.9.9 0 0 1-.05-1.27Z" />
        </S>
        <S id="ChevronRight">
          <path d="M5.7 3.2a.9.9 0 0 1 1.27.05l3.87 4.14a.9.9 0 0 1 0 1.23L6.96 12.75a.9.9 0 1 1-1.32-1.23L8.94 8 5.65 4.47a.9.9 0 0 1 .05-1.27Z" />
        </S>
        {/* Sidebar disclosure marker: solid filled triangle, apex right,
            ~4.75 × 5.25 (base x6.25, apex x11) — rotated 90° when expanded */}
        <S id="Disclosure">
          <path d="M6.25 5.98c0-.47.51-.77.92-.53l3.46 2.02c.4.24.4.83 0 1.06l-3.46 2.02a.61.61 0 0 1-.92-.53V5.98Z" />
        </S>
        {/* Workspace chevron: dedicated 13×9 box (rendered 8×8) */}
        <symbol id="WorkspaceChevron" viewBox="0 0 13 9">
          <path d="M1.19 1.42a1.06 1.06 0 0 1 1.49-.14L6.5 4.47l3.82-3.19a1.06 1.06 0 0 1 1.36 1.63L7.18 6.65a1.06 1.06 0 0 1-1.36 0L1.32 2.91a1.06 1.06 0 0 1-.13-1.49Z" />
        </symbol>
        {/* Plus: arms 1.5 thick, span 3.25→12.75 */}
        <S id="Plus">
          <path d="M8 3.25c.41 0 .75.34.75.75v3.25H12a.75.75 0 0 1 0 1.5H8.75V12a.75.75 0 0 1-1.5 0V8.75H4a.75.75 0 0 1 0-1.5h3.25V4c0-.41.34-.75.75-.75Z" />
        </S>
        {/* Filter: 3 stacked bars, decreasing width */}
        <S id="Filter">
          <rect x="1.75" y="3" width="12.5" height="1.5" rx="0.75" />
          <rect x="4" y="7.25" width="7.25" height="1.5" rx="0.75" />
          <rect x="6.75" y="11.5" width="2.5" height="1.5" rx="0.75" />
        </S>
        {/* DisplayOptions: rails at y5/y11 (2.25→14.75), lozenge knobs cx7/cx10 */}
        <S id="DisplayOptions">
          <rect x="2.25" y="4.25" width="12.5" height="1.5" rx="0.75" />
          <rect x="4.75" y="3.5" width="4.5" height="3" rx="1.5" />
          <rect x="2.25" y="10.25" width="12.5" height="1.5" rx="0.75" />
          <rect x="7.75" y="9.5" width="4.5" height="3" rx="1.5" />
        </S>
        {/* SidePanel: frame donut (rx 3.25/2) + centred pill (collapsed) */}
        <S id="SidePanel">
          <path fillRule="evenodd" d={SIDE_PANEL_FRAME} />
          <rect x="10" y="5" width="1.5" height="6" rx="0.75" />
        </S>
        {/* Insights: bar chart */}
        <S id="Insights">
          <path d="M3 9.2c.5 0 .9.4.9.9v2.5a.9.9 0 1 1-1.8 0v-2.5c0-.5.4-.9.9-.9Zm5-5.7c.5 0 .9.4.9.9v8.2a.9.9 0 1 1-1.8 0V4.4c0-.5.4-.9.9-.9Zm5 3c.5 0 .9.4.9.9v5.2a.9.9 0 1 1-1.8 0V7.4c0-.5.4-.9.9-.9Z" />
        </S>
        {/* Favorite: star donut (unfavourited rest state) */}
        <S id="Favorite">
          <path
            fillRule="evenodd"
            d="M7.7 2.04Q8 1.3 8.3 2.04L9.49 4.99Q9.79 5.73 10.59 5.79L13.76 6.01Q14.56 6.07 13.95 6.58L11.51 8.63Q10.9 9.14 11.09 9.92L11.86 13.01Q12.06 13.78 11.38 13.36L8.68 11.67Q8 11.25 7.32 11.67L4.62 13.36Q3.94 13.78 4.14 13.01L4.91 9.92Q5.1 9.14 4.49 8.63L2.05 6.58Q1.44 6.07 2.24 6.01L5.41 5.79Q6.21 5.73 6.51 4.99ZM7.85 4.78Q8 4.4 8.15 4.78L8.84 6.47Q8.99 6.84 9.39 6.87L11.21 7Q11.61 7.03 11.3 7.28L9.9 8.46Q9.6 8.72 9.69 9.11L10.13 10.88Q10.23 11.27 9.89 11.06L8.34 10.09Q8 9.88 7.66 10.09L6.11 11.06Q5.77 11.27 5.87 10.88L6.31 9.11Q6.4 8.72 6.1 8.46L4.7 7.28Q4.39 7.03 4.79 7L6.61 6.87Q7.01 6.84 7.16 6.47Z"
          />
        </S>
        {/* Favorite (active): solid star */}
        <S id="FavoriteFilled">
          <path d="M7.7 2.04Q8 1.3 8.3 2.04L9.49 4.99Q9.79 5.73 10.59 5.79L13.76 6.01Q14.56 6.07 13.95 6.58L11.51 8.63Q10.9 9.14 11.09 9.92L11.86 13.01Q12.06 13.78 11.38 13.36L8.68 11.67Q8 11.25 7.32 11.67L4.62 13.36Q3.94 13.78 4.14 13.01L4.91 9.92Q5.1 9.14 4.49 8.63L2.05 6.58Q1.44 6.07 2.24 6.01L5.41 5.79Q6.21 5.73 6.51 4.99Z" />
        </S>
        {/* Bell: Subscribe */}
        <S id="Subscribe">
          <path d="M8 1.5c.5 0 .9.4.9.9v.36c2 .4 3.5 2.16 3.5 4.24v2.6l1 1.9c.22.42-.08.95-.55.95H3.15c-.47 0-.77-.53-.55-.95l1-1.9V7c0-2.08 1.5-3.84 3.5-4.24V2.4c0-.5.4-.9.9-.9Zm-1.8 12h3.6a1.8 1.8 0 0 1-3.6 0Z" />
        </S>
        {/* Comment: bubble */}
        <S id="Comment">
          <path d="M8 1.8c3.7 0 6.7 2.5 6.7 5.7s-3 5.7-6.7 5.7c-.6 0-1.2-.06-1.75-.18l-2.9 1.5c-.44.22-.93-.18-.83-.66l.44-2.13C1.85 10.68 1.3 9.4 1.3 7.5c0-3.2 3-5.7 6.7-5.7Z" />
        </S>
        {/* Attachment: paperclip spanning 4.4→12.6 (CAPTURED span) */}
        <S id="Attachment">
          <path d="M9.59 4.62a2.11 2.11 0 0 1 2.99 2.99l-3.73 3.73a2.99 2.99 0 0 1-4.23-4.23l3.11-3.11a.44.44 0 0 1 .62.62l-3.11 3.11a2.11 2.11 0 0 0 2.98 2.98l3.73-3.73a1.23 1.23 0 0 0-1.74-1.74L7.07 8.37a.35.35 0 0 0 .5.5l2.7-2.7a.44.44 0 0 1 .61.63l-2.7 2.7a1.23 1.23 0 0 1-1.74-1.74l3.15-3.14Z" />
        </S>
        {/* Link: chain */}
        <S id="Link">
          <path d="M6.4 4.06a.75.75 0 0 1 0 1.06l-.9.9a2.75 2.75 0 0 0 3.9 3.88l.88-.88a.75.75 0 0 1 1.06 1.06l-.88.88a4.25 4.25 0 0 1-6.02-6l.9-.9a.75.75 0 0 1 1.06 0Zm3.2 7.88a.75.75 0 0 1 0-1.06l.9-.9a2.75 2.75 0 0 0-3.9-3.88l-.88.88A.75.75 0 0 1 4.66 5.9l.88-.88a4.25 4.25 0 0 1 6.02 6l-.9.9a.75.75 0 0 1-1.06 0Z" />
        </S>
        {/* Calendar: rounded square rx4, solid 5u header band, no ears */}
        <S id="Calendar">
          <path
            fillRule="evenodd"
            d="M5 1H11A4 4 0 0 1 15 5V11A4 4 0 0 1 11 15H5A4 4 0 0 1 1 11V5A4 4 0 0 1 5 1ZM4.5 6A2 2 0 0 0 2.5 8V11.5A2 2 0 0 0 4.5 13.5H11.5A2 2 0 0 0 13.5 11.5V8A2 2 0 0 0 11.5 6H4.5Z"
          />
        </S>
        {/* Label: pentagon tag donut + r1 dot */}
        <S id="Label">
          <path
            fillRule="evenodd"
            d="M2 3.4C2 2.63 2.63 2 3.4 2h4.05c.37 0 .73.15 1 .41l5.14 5.15a1.4 1.4 0 0 1 0 1.98l-4.05 4.05a1.4 1.4 0 0 1-1.98 0L2.4 8.45a1.4 1.4 0 0 1-.41-1V3.4ZM3.5 3.5v3.68l5.05 5.05 3.18-3.18-5.05-5.05H3.5v-.5ZM5.6 4.6a1 1 0 1 0 0 2 1 1 0 0 0 0-2Z"
          />
        </S>
        {/* Send: up arrow, shaft 1.5 wide y 3.1→12.25, head 6 wide */}
        <S id="Send">
          <path d="M8 3.1c.2 0 .39.08.53.22l2.44 2.44a.75.75 0 1 1-1.06 1.06L8.75 5.66v5.84a.75.75 0 0 1-1.5 0V5.66L6.09 6.82a.75.75 0 0 1-1.06-1.06l2.44-2.44A.75.75 0 0 1 8 3.1Z" />
        </S>
        {/* Check: the shared filled checkmark */}
        <S id="Check">
          <path d={CHECK_PATH} />
        </S>
        {/* PersonDashed: shared no-assignee / no-lead avatar */}
        <S id="PersonDashed">
          <path d={PERSON_DASHED_PATH} />
        </S>
        {/* Copy */}
        <S id="Copy">
          <path d="M6.2 1.8h6a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-6a2 2 0 0 1-2-2v-6a2 2 0 0 1 2-2Zm-2.7 3.4v5.6a3 3 0 0 0 3 3h5.1a2 2 0 0 1-1.9 1.4H5.5a3.7 3.7 0 0 1-3.7-3.7V7.1c0-.88.57-1.63 1.37-1.9h.33Z" />
        </S>
        {/* Hash: ID */}
        <S id="Hash">
          <path d="M6.7 2.1a.75.75 0 0 1 .6.87L6.9 5h3l.43-2.2a.75.75 0 0 1 1.47.3L11.43 5h1.82a.75.75 0 0 1 0 1.5h-2.1l-.58 3h1.93a.75.75 0 0 1 0 1.5h-2.22l-.44 2.28a.75.75 0 0 1-1.47-.28l.39-2H5.75l-.44 2.28a.75.75 0 0 1-1.47-.28l.39-2H2.75a.75.75 0 0 1 0-1.5h1.77l.58-3H3.25a.75.75 0 0 1 0-1.5h2.14l.44-2.26a.75.75 0 0 1 .87-.6ZM6.6 6.5l-.58 3h3.05l.58-3H6.6Z" />
        </S>
        {/* GitBranch */}
        <S id="GitBranch">
          <path d="M4.5 1.8a2.2 2.2 0 0 1 .75 4.27v3.86a2.21 2.21 0 0 1 0 4.27 2.2 2.2 0 0 1-1.5-4.27V6.07A2.2 2.2 0 0 1 4.5 1.8Zm7 0a2.2 2.2 0 0 1 .75 4.27c-.1 2.35-2 3.4-3.83 3.72-.72.13-1.17.5-1.17 1v.21a.75.75 0 0 1-1.5 0v-.21c0-1.44 1.2-2.28 2.4-2.49 1.5-.26 2.5-.9 2.6-2.23A2.2 2.2 0 0 1 11.5 1.8Z" />
        </S>
        {/* Play: work on issue */}
        <S id="Play">
          <path d="M5.2 2.6c0-.63.68-1.02 1.22-.7l7 4.7a.82.82 0 0 1 0 1.4l-7 4.7a.82.82 0 0 1-1.22-.7V2.6Z" />
        </S>
        {/* Reaction: smiley-plus */}
        <S id="Reaction">
          <path d="M7.3 1.5a6.5 6.5 0 1 0 6.5 7.3.75.75 0 0 0-1.49-.18A5 5 0 1 1 7.5 3a.75.75 0 0 0 0-1.5h-.2Zm5.2 0c.41 0 .75.34.75.75V3.5h1.25a.75.75 0 0 1 0 1.5H13.25v1.25a.75.75 0 0 1-1.5 0V5H10.5a.75.75 0 0 1 0-1.5h1.25V2.25c0-.41.34-.75.75-.75ZM5.5 6.3a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm4 0a.9.9 0 1 1 0 1.8.9.9 0 0 1 0-1.8Zm-4.4 3.6c.3-.2.7-.13.92.15.46.6 1.2 1 2 1s1.52-.4 1.98-1a.66.66 0 0 1 1.06.8A3.94 3.94 0 0 1 8 12.35c-1.27 0-2.4-.6-3.06-1.5a.66.66 0 0 1 .16-.95Z" />
        </S>
        {/* Milestone: diamond */}
        <S id="MilestoneNone">
          <path d="M7.15 1.85a1.2 1.2 0 0 1 1.7 0l5.3 5.3a1.2 1.2 0 0 1 0 1.7l-5.3 5.3a1.2 1.2 0 0 1-1.7 0l-5.3-5.3a1.2 1.2 0 0 1 0-1.7l5.3-5.3ZM8 3.4 3.4 8 8 12.6 12.6 8 8 3.4Z" />
        </S>
        {/* Folder */}
        <S id="Folder">
          <path d="M1.5 4A2 2 0 0 1 3.5 2h2.6c.5 0 1 .2 1.4.6l.9.9h4.1a2 2 0 0 1 2 2V12a2 2 0 0 1-2 2h-9a2 2 0 0 1-2-2V4Z" />
        </S>
        {/* Lock */}
        <S id="Lock">
          <path d="M8 1.5A3.5 3.5 0 0 1 11.5 5v1.5h.3A1.7 1.7 0 0 1 13.5 8.2v4.6a1.7 1.7 0 0 1-1.7 1.7H4.2a1.7 1.7 0 0 1-1.7-1.7V8.2a1.7 1.7 0 0 1 1.7-1.7h.3V5A3.5 3.5 0 0 1 8 1.5ZM8 3a2 2 0 0 0-2 2v1.5h4V5a2 2 0 0 0-2-2Z" />
        </S>
        {/* Review: pull-request branch pair (source → target) with an arrow head */}
        <S id="Review">
          <circle cx="4" cy="3.4" r="2.1" />
          <circle cx="4" cy="12.6" r="2.1" />
          <rect x="3.15" y="5.2" width="1.7" height="5.6" rx="0.85" />
          <circle cx="12" cy="12.6" r="2.1" />
          <rect x="11.15" y="5.8" width="1.7" height="4.8" rx="0.85" />
          <path d="M12 1.9a.8.8 0 0 1 .62.3l2.1 2.6a.6.6 0 0 1-.47.98H9.75a.6.6 0 0 1-.47-.98l2.1-2.6a.8.8 0 0 1 .62-.3Z" />
        </S>
        {/* Import: arrow dropping into a tray */}
        <S id="Import">
          <path d="M8 1.4c.5 0 .9.4.9.9v5.03l1.47-1.47a.9.9 0 1 1 1.27 1.27l-3 3a.9.9 0 0 1-1.28 0l-3-3A.9.9 0 0 1 5.63 5.86L7.1 7.33V2.3c0-.5.4-.9.9-.9Z" />
          <path d="M2.6 9.4a.9.9 0 0 1 .9.9v1.5c0 .28.22.5.5.5h8c.28 0 .5-.22.5-.5v-1.5a.9.9 0 1 1 1.8 0v1.5c0 1.27-1.03 2.3-2.3 2.3H4c-1.27 0-2.3-1.03-2.3-2.3v-1.5c0-.5.4-.9.9-.9Z" />
        </S>
        {/* Initiative: banner flag on a pole */}
        <S id="Initiative">
          <rect x="2.4" y="1.5" width="1.7" height="13" rx="0.85" />
          <path d="M5.4 2.4h7.3c.63 0 .96.74.54 1.2L11.6 5.6l1.64 2c.42.46.09 1.2-.54 1.2H5.4V2.4Z" />
        </S>
        {/* Invite: member silhouette with a plus */}
        <S id="Invite">
          <circle cx="6" cy="5" r="2.6" />
          <path d="M6 8.9c2.2 0 4.05 1.25 4.6 2.95.17.5-.2 1.05-.72 1.05H2.12c-.53 0-.9-.55-.72-1.05C1.95 10.15 3.8 8.9 6 8.9Z" />
          <path d="M13.3 6.6c.44 0 .8.36.8.8v1h1a.8.8 0 0 1 0 1.6h-1v1a.8.8 0 0 1-1.6 0v-1h-1a.8.8 0 0 1 0-1.6h1v-1c0-.44.36-.8.8-.8Z" />
        </S>
        {/* Home (filled Base sprite role) */}
        <S id="Home">
          <path d="M7.45 1.9a.9.9 0 0 1 1.1 0l5.6 4.35c.22.17.35.43.35.71v6.14a1.4 1.4 0 0 1-1.4 1.4h-2.6a.9.9 0 0 1-.9-.9v-3.1a1.6 1.6 0 1 0-3.2 0v3.1a.9.9 0 0 1-.9.9H2.9a1.4 1.4 0 0 1-1.4-1.4V6.96c0-.28.13-.54.35-.71L7.45 1.9Z" />
        </S>
        {/* Home (sidebar variant): stroke 1.5 outline house, 3.5-wide door —
            one of the capture's five stroked families */}
        <S id="HomeOutline">
          <path
            d="M8 2.4 2.9 6.35a.9.9 0 0 0-.35.71v5.79c0 .69.56 1.25 1.25 1.25h2.45v-3.3a1.75 1.75 0 0 1 3.5 0v3.3h2.45c.69 0 1.25-.56 1.25-1.25V7.06a.9.9 0 0 0-.35-.7L8 2.4Z"
            style={{
              fill: "none",
              stroke: iconStroke,
              strokeWidth: 1.5,
              strokeLinejoin: "round",
            }}
          />
        </S>
        {/* Refresh: circular arrow */}
        <S id="Refresh">
          <path d="M8 2.9a5.1 5.1 0 1 0 5.1 5.1.75.75 0 0 1 1.5 0A6.6 6.6 0 1 1 8 1.4c1.77 0 3.38.7 4.57 1.83l.03-1.02a.75.75 0 0 1 1.5.05l-.09 2.85a.75.75 0 0 1-.77.73l-2.85-.09a.75.75 0 0 1 .05-1.5l.99.03A5.08 5.08 0 0 0 8 2.9Z" />
        </S>
        {/* Blockquote */}
        <S id="Blockquote">
          <rect x="2.4" y="2.5" width="1.6" height="11" rx="0.8" />
          <rect x="6.4" y="3.5" width="7.2" height="1.5" rx="0.75" />
          <rect x="6.4" y="7.25" width="7.2" height="1.5" rx="0.75" />
          <rect x="6.4" y="11" width="4.6" height="1.5" rx="0.75" />
        </S>
        {/* Checklist */}
        <S id="Checklist">
          <path
            fillRule="evenodd"
            d="M2.6 2.4h3.3c.61 0 1.1.49 1.1 1.1v3.3c0 .61-.49 1.1-1.1 1.1H2.6c-.61 0-1.1-.49-1.1-1.1V3.5c0-.61.49-1.1 1.1-1.1Zm.3 1.4a.3.3 0 0 0-.3.3v2.5c0 .17.13.3.3.3h2.7a.3.3 0 0 0 .3-.3V4.1a.3.3 0 0 0-.3-.3H2.9Z"
          />
          <path d="M2.6 9.6h3.3c.61 0 1.1.49 1.1 1.1V14c0 .61-.49 1.1-1.1 1.1H2.6c-.61 0-1.1-.49-1.1-1.1v-3.3c0-.61.49-1.1 1.1-1.1Z" />
          <rect x="8.6" y="4.35" width="5.9" height="1.5" rx="0.75" />
          <rect x="8.6" y="11.55" width="5.9" height="1.5" rx="0.75" />
        </S>
        {/* CodeBlock */}
        <S id="CodeBlock">
          <path
            fillRule="evenodd"
            d="M4 1.9h8A2.6 2.6 0 0 1 14.6 4.5v7A2.6 2.6 0 0 1 12 14.1H4a2.6 2.6 0 0 1-2.6-2.6v-7A2.6 2.6 0 0 1 4 1.9Zm0 1.5a1.1 1.1 0 0 0-1.1 1.1v7A1.1 1.1 0 0 0 4 12.6h8a1.1 1.1 0 0 0 1.1-1.1v-7A1.1 1.1 0 0 0 12 3.4H4Z"
          />
          <path d="M7.06 5.72a.65.65 0 0 1 0 .92L5.72 8l1.34 1.36a.65.65 0 1 1-.92.92L4.34 8.46a.65.65 0 0 1 0-.92l1.8-1.82a.65.65 0 0 1 .92 0Zm1.88 0a.65.65 0 0 1 .92 0l1.8 1.82a.65.65 0 0 1 0 .92l-1.8 1.82a.65.65 0 1 1-.92-.92L10.28 8 8.94 6.64a.65.65 0 0 1 0-.92Z" />
        </S>
        {/* CreditCard */}
        <S id="CreditCard">
          <path
            fillRule="evenodd"
            d="M3.4 3h9.2A2.4 2.4 0 0 1 15 5.4v5.2A2.4 2.4 0 0 1 12.6 13H3.4A2.4 2.4 0 0 1 1 10.6V5.4A2.4 2.4 0 0 1 3.4 3Zm-.9 5.5v2.1c0 .5.4.9.9.9h9.2c.5 0 .9-.4.9-.9V8.5h-11Zm11-2.6V5.4c0-.5-.4-.9-.9-.9H3.4c-.5 0-.9.4-.9.9v.5h11Z"
          />
        </S>
        {/* Todo drag handle: 6 dots in a 6×10 box */}
        <symbol id="DragHandle" viewBox="0 0 6 10">
          <circle cx="1.4" cy="1.4" r="0.95" />
          <circle cx="4.6" cy="1.4" r="0.95" />
          <circle cx="1.4" cy="5" r="0.95" />
          <circle cx="4.6" cy="5" r="0.95" />
          <circle cx="1.4" cy="8.6" r="0.95" />
          <circle cx="4.6" cy="8.6" r="0.95" />
        </symbol>
      </Sheet>

      <Sheet set="Decorative">
        {/* ClockOutline → history glyph: CCW revert-arrow ring + hands */}
        <S id="ClockOutline">
          <path d="M1.69 6.07A6.6 6.6 0 1 1 1.69 9.93L3.12 9.49A5.1 5.1 0 1 0 3.12 6.51Z" />
          <path d="M1.62 8.87 0.7 5.83 4.11 6.85Z" />
          <rect x="7.3" y="4.5" width="1.4" height="4.2" rx="0.7" />
          <rect x="7.55" y="7.3" width="3.5" height="1.4" rx="0.7" transform="rotate(38 8 8)" />
        </S>
        {/* QuestionMark */}
        <S id="QuestionMark">
          <path d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm0 9.4a.9.9 0 1 0 0 1.8.9.9 0 0 0 0-1.8Zm0-6.9C6.6 4 5.5 5 5.4 6.35c0 .4.32.65.72.65.38 0 .65-.28.75-.64.14-.52.56-.86 1.13-.86.64 0 1.1.44 1.1 1.03 0 .5-.22.77-.86 1.24-.7.5-1.04 1-.99 1.79.02.36.31.64.68.64.38 0 .65-.28.72-.66.05-.33.24-.55.8-.95.75-.55 1.21-1.16 1.21-2.1C10.66 5 9.55 4 8 4Z" />
        </S>
        {/* Skills: hexagonal knot */}
        <S id="Skills">
          <path
            fillRule="evenodd"
            d="M6.18 2.15Q8 1.1 9.82 2.15L12.18 3.5Q14 4.55 14 6.65L14 9.35Q14 11.45 12.18 12.5L9.82 13.85Q8 14.9 6.18 13.85L3.82 12.5Q2 11.45 2 9.35L2 6.65Q2 4.55 3.82 3.5ZM7.09 3.9Q8 3.38 8.91 3.9L11.34 5.3Q12.25 5.83 12.25 6.88L12.25 9.12Q12.25 10.17 11.34 10.7L8.91 12.1Q8 12.62 7.09 12.1L4.66 10.7Q3.75 10.17 3.75 9.12L3.75 6.88Q3.75 5.83 4.66 5.3Z"
          />
          <path d="M8 5.9 9.92 9.1H6.08L8 5.9Z" />
        </S>
        {/* Connected: three linked nodes */}
        <S id="Connected">
          <circle cx="8" cy="3.4" r="1.95" />
          <circle cx="3.3" cy="12.2" r="1.95" />
          <circle cx="12.7" cy="12.2" r="1.95" />
          <rect x="4.8" y="4.7" width="1.5" height="6" rx="0.75" transform="rotate(28 5.55 7.7)" />
          <rect x="9.7" y="4.7" width="1.5" height="6" rx="0.75" transform="rotate(-28 10.45 7.7)" />
          <rect x="4.9" y="11.45" width="6.2" height="1.5" rx="0.75" />
        </S>
        {/* Face: smiley ring */}
        <S id="Face">
          <path
            fillRule="evenodd"
            d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM3 8a5 5 0 1 1 10 0A5 5 0 0 1 3 8Z"
          />
          <circle cx="5.9" cy="6.6" r="0.95" />
          <circle cx="10.1" cy="6.6" r="0.95" />
          <path d="M5.13 9.43a.7.7 0 0 1 .96.24c.4.66 1.11 1.08 1.91 1.08s1.51-.42 1.91-1.08a.7.7 0 1 1 1.2.72A3.63 3.63 0 0 1 8 12.15a3.63 3.63 0 0 1-3.11-1.76.7.7 0 0 1 .24-.96Z" />
        </S>
        {/* Page: document outline with folded corner */}
        <S id="Page">
          <path
            fillRule="evenodd"
            d="M4.4 1.5h5.1c.37 0 .73.15 1 .41l2.09 2.09c.26.27.41.63.41 1v8.1c0 .77-.63 1.4-1.4 1.4H4.4c-.77 0-1.4-.63-1.4-1.4V2.9c0-.77.63-1.4 1.4-1.4ZM4.9 3a.4.4 0 0 0-.4.4v9.2c0 .22.18.4.4.4h6.2a.4.4 0 0 0 .4-.4V6.4H9.35c-.86 0-1.55-.7-1.55-1.55V3H4.9Zm4.4.62v1.23c0 .03.02.05.05.05h1.23L9.3 3.62Z"
          />
        </S>
        {/* Feather */}
        <S id="Feather">
          <path d="M13.9 2.1c.9.9 1.4 4.5-1.6 7.5-1.5 1.5-3.6 2.2-5.4 2.3l-2.4 2.4a.75.75 0 0 1-1.06-1.06l2.4-2.4c.1-1.8.8-3.9 2.3-5.4 3-3 6.6-2.5 7.5-1.6-.6.3-2.3 1-3.4 2.1-.9.9-1.5 2-1.7 2.6.7-.2 1.7-.8 2.6-1.7 1.1-1.1 1.8-2.8 2.1-3.4h-1.4l.06.66Z" />
        </S>
        {/* Chip */}
        <S id="Chip">
          <path d="M5.5 1.2c.41 0 .75.34.75.75v1h1v-1a.75.75 0 0 1 1.5 0v1h1v-1a.75.75 0 0 1 1.5 0v1.08c1.03.2 1.82 1 2.02 2.02h1.08a.75.75 0 0 1 0 1.5h-1v1h1a.75.75 0 0 1 0 1.5h-1v1h1a.75.75 0 0 1 0 1.5h-1.08a2.55 2.55 0 0 1-2.02 2.02v1.08a.75.75 0 0 1-1.5 0v-1h-1v1a.75.75 0 0 1-1.5 0v-1h-1v1a.75.75 0 0 1-1.5 0v-1.08a2.55 2.55 0 0 1-2.02-2.02H1.65a.75.75 0 0 1 0-1.5h1v-1h-1a.75.75 0 0 1 0-1.5h1v-1h-1a.75.75 0 0 1 0-1.5h1.08c.2-1.03 1-1.82 2.02-2.02V1.95c0-.41.34-.75.75-.75ZM5.6 5.1a.5.5 0 0 0-.5.5v4.8c0 .28.22.5.5.5h4.8a.5.5 0 0 0 .5-.5V5.6a.5.5 0 0 0-.5-.5H5.6Z" />
        </S>
        {/* Europe: globe */}
        <S id="Europe">
          <path d="M8 1.5a6.5 6.5 0 1 1 0 13 6.5 6.5 0 0 1 0-13Zm2.9 2.3c-.4.4-.9.7-1.4.8-.7.2-1.2.8-1.2 1.5 0 .5.4.9.9.9h.5c.8 0 1.5.7 1.5 1.5 0 .5.2.9.6 1.2l.4.3a5 5 0 0 0-1.8-6.2ZM3.4 6.4A5 5 0 0 0 8 13c.3 0 .5 0 .8-.06v-1.1c0-.5-.2-.9-.5-1.2l-.7-.7c-.3-.3-.7-.44-1.1-.44h-1c-.9 0-1.6-.7-1.6-1.6 0-.55.1-1 .5-1.5Z" />
        </S>
        {/* Radar */}
        <S id="Radar">
          <path d="M8 1.5a6.5 6.5 0 1 1-4.6 1.9.7.7 0 0 1 1 1A5.1 5.1 0 1 0 8 2.9V5a3 3 0 1 1-2.12.88.7.7 0 0 1 1 .99A1.6 1.6 0 1 0 8 6.4V1.5Z" />
        </S>
        {/* Rocket */}
        <S id="Rocket">
          <path d="M13.6 2.4c.5 3-1 6-3.5 7.7l.2 2c0 .3-.1.6-.3.8l-1.6 1.6c-.4.4-1 .2-1.1-.3l-.5-2.4-2.6-2.6-2.4-.5c-.5-.1-.7-.7-.3-1.1l1.6-1.6c.2-.2.5-.3.8-.3l2 .2C7.6 3.4 10.6 1.9 13.6 2.4Zm-3.3 2.5a1.2 1.2 0 1 0 1.7 1.7 1.2 1.2 0 0 0-1.7-1.7ZM4.5 11.5c.3.3.3.8 0 1.1l-1.5 1.5a.75.75 0 1 1-1.1-1.1l1.5-1.5c.3-.3.8-.3 1.1 0Z" />
        </S>
      </Sheet>

      {/*
        Shared SVG defs that are NOT symbols. The project-status shield's clip
        path lives here so a list of 60 project rows references one definition
        instead of emitting 60 elements that share an id (duplicate ids are an
        HTML validity error and an accessibility finding).
      */}
      <Sheet set="Defs">
        <ProjectShieldClipDef />
      </Sheet>
    </>
  );
}
