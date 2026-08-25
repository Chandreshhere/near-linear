/**
 * Original line-art marks for the workspace empty states (Reviews, Releases,
 * Initiatives, Import). Drawn on a 96×96 grid in the illustration idiom the
 * rest of the app uses (LoopKnot, §10.7): single colour, 1.5px stroke,
 * 0.9 opacity, no fills — so they read in both themes.
 */

import type { JSX } from "react";

function Mark({
  size,
  children,
}: {
  size: number;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <g
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.9"
      >
        {children}
      </g>
    </svg>
  );
}

/** A branch pair beside a diff panel — "review diffs in your workspace". */
export function ReviewDiffMark({ size = 96 }: { size?: number }): JSX.Element {
  return (
    <Mark size={size}>
      <circle cx="20" cy="28" r="4" />
      <circle cx="20" cy="68" r="4" />
      <path d="M20 32v32" />
      <rect x="34" y="20" width="46" height="56" rx="8" />
      <path d="M34 32h46" />
      <path d="M42 43h6M45 40v6" />
      <path d="M56 43h16" />
      <path d="M42 54h6M45 51v6" />
      <path d="M56 54h12" />
      <path d="M42 65h6" />
      <path d="M56 65h14" />
    </Mark>
  );
}

/** A stack of tagged release cards. */
export function ReleaseStackMark({ size = 96 }: { size?: number }): JSX.Element {
  return (
    <Mark size={size}>
      <path d="M34 18h28" />
      <path d="M28 25h40" />
      <rect x="22" y="32" width="52" height="42" rx="8" />
      <circle cx="36" cy="46" r="4" />
      <path d="M46 42h20" />
      <path d="M46 50h13" />
      <path d="M22 60h52" />
      <path d="M30 67h16" />
    </Mark>
  );
}

/** Three projects rolling up into one initiative ring. */
export function InitiativeRollupMark({ size = 96 }: { size?: number }): JSX.Element {
  return (
    <Mark size={size}>
      <rect x="16" y="26" width="30" height="12" rx="6" />
      <rect x="16" y="44" width="30" height="12" rx="6" />
      <rect x="16" y="62" width="30" height="12" rx="6" />
      <path d="M46 32h10a6 6 0 0 1 6 6v4" />
      <path d="M46 50h16" />
      <path d="M46 68h10a6 6 0 0 0 6-6v-4" />
      <circle cx="72" cy="50" r="10" />
    </Mark>
  );
}

/** A spreadsheet flowing into a tray — the importer. */
export function ImportSheetMark({ size = 96 }: { size?: number }): JSX.Element {
  return (
    <Mark size={size}>
      <rect x="18" y="18" width="34" height="44" rx="6" />
      <path d="M25 30h20" />
      <path d="M25 38h20" />
      <path d="M25 46h13" />
      <path d="M64 26v22" />
      <path d="M58 42l6 6 6-6" />
      <path d="M48 60v6a4 4 0 0 0 4 4h24a4 4 0 0 0 4-4v-6" />
    </Mark>
  );
}
