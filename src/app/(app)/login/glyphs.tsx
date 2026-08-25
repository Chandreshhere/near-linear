/**
 * Authored 16×16 fill-based glyphs for the login screen (MASTER_PROMPT §8:
 * fill, not stroke; single colour; `fill: currentColor` so the button's
 * colour cascade tints them).
 *
 * Deliberately generic marks — no third-party logos are reproduced here.
 */

type GlyphProps = { size?: number; className?: string };

function base(size: number) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 16 16",
    fill: "currentColor",
    "aria-hidden": true as const,
    focusable: "false" as const,
  };
}

/** Neutral product mark — orbit ring + core dot in a rounded frame (the same
    identity as the splash/welcome marks; deliberately unlike any real logo). */
export function ProductMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Workspace"
    >
      {/* frame drawn as a fill donut (outer ring in border color over an
          elevated plate) — fill-based like every other glyph */}
      <rect x="0" y="0" width="32" height="32" rx="9" fill="var(--color-border-solid)" />
      <rect x="1.5" y="1.5" width="29" height="29" rx="7.5" fill="var(--color-bg-elevated)" />
      {/* Orbit ring + core dot — the same neutral identity as the splash and
          welcome-document marks (deliberately unlike any real product logo). */}
      <path
        fillRule="evenodd"
        d="M16 6.5a9.5 9.5 0 1 0 0 19 9.5 9.5 0 0 0 0-19Zm0 2a7.5 7.5 0 1 1 0 15 7.5 7.5 0 0 1 0-15Z"
        fill="var(--color-text-muted)"
      />
      <circle cx="16" cy="16" r="3" fill="var(--color-accent)" />
      <circle cx="24.2" cy="9.4" r="2" fill="var(--color-accent)" />
    </svg>
  );
}

/** Identity-provider mark: a federation ring — four peer dots linked to a
    central ring (generic, unbranded; nothing like any sign-in logo). */
export function ProviderGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg {...base(size)} className={className}>
      <path
        fillRule="evenodd"
        d="M8 5.6a2.4 2.4 0 1 0 0 4.8 2.4 2.4 0 0 0 0-4.8ZM6.9 8a1.1 1.1 0 1 1 2.2 0 1.1 1.1 0 0 1-2.2 0Z"
      />
      <circle cx="8" cy="2.4" r="1.5" />
      <circle cx="8" cy="13.6" r="1.5" />
      <circle cx="2.4" cy="8" r="1.5" />
      <circle cx="13.6" cy="8" r="1.5" />
    </svg>
  );
}

/** Envelope. */
export function MailGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M2 5.4c0-1.05.85-1.9 1.9-1.9h8.2c1.05 0 1.9.85 1.9 1.9v.16L8 8.9 2 5.56V5.4Z" />
      <path d="M14 7.28v3.32c0 1.05-.85 1.9-1.9 1.9H3.9A1.9 1.9 0 0 1 2 10.6V7.28l5.64 3.14c.22.13.5.13.72 0L14 7.28Z" />
    </svg>
  );
}

/** Key with a toothed shaft — the passkey affordance. */
export function PasskeyGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M6.1 2a4.1 4.1 0 1 0 1.62 7.87l.62.62h1.16v1.16h1.16v1.16h1.16v1.44a.75.75 0 0 0 .75.75H14V12.6L9.2 7.8A4.1 4.1 0 0 0 6.1 2Zm-1.3 3.65a1.15 1.15 0 1 1 0 2.3 1.15 1.15 0 0 1 0-2.3Z" />
    </svg>
  );
}

/** Shield with a keyhole — federated / enterprise sign-in. */
export function ShieldGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7.7 1.56a.75.75 0 0 1 .6 0l4.5 1.95a.75.75 0 0 1 .45.69v3.2c0 2.85-1.83 5.4-4.55 6.34a.75.75 0 0 1-.5 0C5.48 12.8 3.65 10.25 3.65 7.4V4.2c0-.3.18-.57.45-.69l4.5-1.95H7.7Zm.3 4.2a1.35 1.35 0 0 0-.6 2.56v1.34a.6.6 0 0 0 1.2 0V8.32A1.35 1.35 0 0 0 8 5.76Z" />
    </svg>
  );
}

/** Left-pointing arrow (Back). */
export function ArrowLeftGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7.03 3.22a.75.75 0 0 1 0 1.06L4.06 7.25H13a.75.75 0 0 1 0 1.5H4.06l2.97 2.97a.75.75 0 1 1-1.06 1.06L1.7 8.5a.75.75 0 0 1 0-1.06l4.27-4.28a.75.75 0 0 1 1.06 0Z" />
    </svg>
  );
}

/** Person silhouette — the empty-state of the avatar dropzone. */
export function PersonGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M8 2.4a2.6 2.6 0 1 1 0 5.2 2.6 2.6 0 0 1 0-5.2Zm0 6.3c2.5 0 4.55 1.4 4.55 3.13 0 .76-.5 1.37-1.24 1.37H4.69c-.74 0-1.24-.61-1.24-1.37C3.45 10.1 5.5 8.7 8 8.7Z" />
    </svg>
  );
}

/** Upward tray — the avatar dropzone hover affordance. */
export function UploadGlyph({ size = 16, className }: GlyphProps) {
  return (
    <svg {...base(size)} className={className}>
      <path d="M7.47 2.22a.75.75 0 0 1 1.06 0l2.75 2.75a.75.75 0 1 1-1.06 1.06L8.75 4.56v5.19a.75.75 0 0 1-1.5 0V4.56L5.78 6.03a.75.75 0 0 1-1.06-1.06l2.75-2.75Z" />
      <path d="M3.25 10.5a.75.75 0 0 0-1.5 0v1.25c0 1.24 1.01 2.25 2.25 2.25h8c1.24 0 2.25-1.01 2.25-2.25V10.5a.75.75 0 0 0-1.5 0v1.25a.75.75 0 0 1-.75.75H4a.75.75 0 0 1-.75-.75V10.5Z" />
    </svg>
  );
}
