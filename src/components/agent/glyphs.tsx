/**
 * Inline glyphs for the agent surface — original marks, fill-based, single
 * colour, drawn on a 16×16 grid like the sprite sheet (§8). Only the shapes
 * the sprite sheet doesn't carry live here.
 */

import type { JSX } from "react";

export function GlyphArrowUp({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M8 3a.75.75 0 0 1 .53.22l3.75 3.75a.75.75 0 1 1-1.06 1.06L8.75 5.56V12.5a.75.75 0 0 1-1.5 0V5.56L4.78 8.03a.75.75 0 0 1-1.06-1.06l3.75-3.75A.75.75 0 0 1 8 3Z" />
    </svg>
  );
}

export function GlyphStop({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <rect x="4.5" y="4.5" width="7" height="7" rx="1.5" />
    </svg>
  );
}

export function GlyphClose({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M4.99 4a.7.7 0 0 0-.99.99L7.01 8l-3.01 3.01a.7.7 0 1 0 .99.99L8 8.99l3.01 3.01a.7.7 0 0 0 .99-.99L8.99 8 12 4.99A.7.7 0 0 0 11.01 4L8 7.01 4.99 4Z" fill="currentColor" />
    </svg>
  );
}

export function GlyphCheck({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M12.78 4.72a.75.75 0 0 1 0 1.06l-5 5a.75.75 0 0 1-1.06 0l-2.5-2.5a.75.75 0 1 1 1.06-1.06l1.97 1.97 4.47-4.47a.75.75 0 0 1 1.06 0Z" fill="currentColor" />
    </svg>
  );
}

/** Pencil-on-page — the "create/edit" action marker in the actions strip. */
export function GlyphEdit({ size = 14 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M11.1 1.9a1.6 1.6 0 0 1 2.3 0l.7.7a1.6 1.6 0 0 1 0 2.3l-7 7c-.2.2-.4.3-.6.4l-3 .8a.6.6 0 0 1-.8-.8l.8-3c.1-.2.2-.5.4-.6l7.2-7.8Zm-6.5 8.4-.4 1.5 1.5-.4 6.6-6.6-1.1-1.1-6.6 6.6Z" />
    </svg>
  );
}

/** Small filled dot used for tab unread / working badges. */
export function GlyphDot({ size = 6 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 6 6" fill="currentColor" aria-hidden="true">
      <circle cx="3" cy="3" r="3" />
    </svg>
  );
}

/** Question-mark-free "search a topic" mark for the examples row. */
export function GlyphResearch({ size = 16 }: { size?: number }): JSX.Element {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <path d="M7.2 1.6a5.6 5.6 0 1 1-3.4 10.05l-2.3 2.3a.75.75 0 0 1-1.06-1.06l2.3-2.3A5.6 5.6 0 0 1 7.2 1.6Zm0 1.5a4.1 4.1 0 1 0 0 8.2 4.1 4.1 0 0 0 0-8.2Z" />
      <rect x="9.9" y="9.9" width="5.4" height="1.5" rx=".75" transform="rotate(45 9.9 9.9)" />
    </svg>
  );
}

/**
 * ORIGINAL line-art watermark that floats behind the composer (CAPTURED
 * geometry: 336×336, stroke .5 non-scaling, faint, masked fade to 60%).
 * Eight concentric rounded squares on a 45° axis — our own mark, drawn as
 * outlines so it reads as engraving rather than a logo.
 */
export function AgentWatermark(): JSX.Element {
  const rings = [40, 80, 120, 160, 200, 240, 280, 320];
  return (
    <svg
      viewBox="0 0 336 336"
      width={336}
      height={336}
      aria-hidden="true"
      focusable="false"
      style={{ width: "100%", height: "100%", overflow: "visible" }}
    >
      <g transform="rotate(45 168 168)">
        {rings.map((size) => (
          <rect
            key={size}
            x={168 - size / 2}
            y={168 - size / 2}
            width={size}
            height={size}
            rx={size * 0.28}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={0.5}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </g>
    </svg>
  );
}

/**
 * ORIGINAL knot illustration for the Loops empty state — two tilted rounded
 * loops woven through each other. Each strand is masked at the crossing where
 * it passes UNDER the other, so the interlace reads as a real weave rather
 * than two stacked outlines.
 */
export function LoopKnot({ size = 96 }: { size?: number }): JSX.Element {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* gap where strand A dips under B (bottom crossing) */}
        <mask id="loopKnotA" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96">
          <rect width="96" height="96" fill="#fff" />
          <circle cx="48" cy="66" r="5" fill="#000" />
        </mask>
        {/* gap where strand B dips under A (top crossing) */}
        <mask id="loopKnotB" maskUnits="userSpaceOnUse" x="0" y="0" width="96" height="96">
          <rect width="96" height="96" fill="#fff" />
          <circle cx="48" cy="30" r="5" fill="#000" />
        </mask>
      </defs>
      <g stroke="currentColor" strokeWidth="1.5" opacity="0.9">
        <rect
          x="18"
          y="31"
          width="60"
          height="34"
          rx="17"
          transform="rotate(-20 48 48)"
          mask="url(#loopKnotA)"
        />
        <rect
          x="18"
          y="31"
          width="60"
          height="34"
          rx="17"
          transform="rotate(20 48 48)"
          mask="url(#loopKnotB)"
        />
      </g>
      {/* orbit dots suggesting the recurring run */}
      <g fill="currentColor" opacity="0.5">
        <circle cx="48" cy="13" r="1.8" />
        <circle cx="83" cy="48" r="1.8" />
        <circle cx="48" cy="83" r="1.8" />
        <circle cx="13" cy="48" r="1.8" />
      </g>
    </svg>
  );
}
