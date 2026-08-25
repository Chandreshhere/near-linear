import { CSSProperties } from "react";
import clsx from "clsx";
import styles from "./icon.module.css";

/**
 * Sprite icon with the captured color cascade:
 *   fill: var(--icon-color)
 *   --icon-color: var(--icon-replacement-color, var(--icon-default-color))
 * State layers re-point --icon-replacement-color; `color` hard-tints (team icons).
 */
export function Icon({
  name,
  size = 14,
  color,
  className,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      role="img"
      focusable="false"
      aria-hidden="true"
      width={size}
      height={size}
      className={clsx(styles.icon, color && "color-override", className)}
      style={
        {
          ...style,
          ...(color ? { "--icon-color": color } : null),
        } as CSSProperties
      }
    >
      <use href={`#${name}`} />
    </svg>
  );
}
