import { CSSProperties } from "react";
import styles from "./avatar.module.css";

type AvatarSize = 16 | 18 | 22 | 24 | 28 | 32 | 44;

/* Initials size ≈ size*0.4 rounded; captured anchors: 9px @16–18, 11px @24. */
const INITIALS_FONT_SIZE: Record<AvatarSize, number> = {
  16: 9,
  18: 9,
  22: 9,
  24: 11,
  28: 11,
  32: 13,
  44: 18,
};

/*
 * Deterministic fallback tint in the captured user-avatar range:
 * lch(55–70% 60 210–350) — §2.2.
 */
function tintFor(initials: string): string {
  let hash = 0;
  for (let i = 0; i < initials.length; i++) {
    hash = (hash * 31 + initials.charCodeAt(i)) | 0;
  }
  const hue = 210 + (Math.abs(hash) % 141); /* 210–350 */
  return `lch(62% 60 ${hue})`;
}

/**
 * Avatar — MASTER_PROMPT.md §7.7 (CAPTURED).
 * Round; white initials on an LCH-tinted bg, or an object-fit:cover image.
 */
export function Avatar({
  initials,
  color,
  size = 24,
  src,
}: {
  initials: string;
  color?: string;
  size?: AvatarSize;
  src?: string;
}) {
  const style = {
    "--avatar-size": `${size}px`,
    "--avatar-font-size": `${INITIALS_FONT_SIZE[size]}px`,
    "--avatar-bg": color ?? tintFor(initials),
  } as CSSProperties;

  return (
    <span className={styles.avatar} style={style} role="img" aria-label={initials}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className={styles.image} src={src} alt="" draggable={false} />
      ) : (
        <span className={styles.initials} aria-hidden="true">
          {initials}
        </span>
      )}
    </span>
  );
}
