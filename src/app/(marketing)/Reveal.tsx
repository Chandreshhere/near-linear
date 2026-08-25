"use client";

import {
  createElement,
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import styles from "./landing.module.css";

type RevealProps = {
  children: ReactNode;
  /** Tag to render; defaults to a plain div. */
  as?: "div" | "section" | "h2" | "p" | "li" | "span";
  /** Stagger, in seconds, applied via --reveal-delay. */
  delay?: number;
  className?: string;
};

/**
 * Fade + rise + de-blur on first intersection.
 *
 * The hidden state lives entirely inside
 * `@media (prefers-reduced-motion: no-preference)` under `html.js`, so a
 * reduced-motion preference (or no scripting) leaves the content painted and
 * static rather than invisible.
 */
export function Reveal({
  children,
  as = "div",
  delay = 0,
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduced = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    if (reduced || typeof IntersectionObserver === "undefined") {
      el.dataset.revealed = "true";
      return;
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            (entry.target as HTMLElement).dataset.revealed = "true";
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -12% 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return createElement(
    as,
    {
      ref,
      className: className ? `${styles.reveal} ${className}` : styles.reveal,
      "data-revealed": "false",
      style: delay
        ? ({ "--reveal-delay": `${delay}s` } as CSSProperties)
        : undefined,
    },
    children
  );
}
