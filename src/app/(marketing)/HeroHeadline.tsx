"use client";

import { useEffect, useState } from "react";
import styles from "./landing.module.css";

/**
 * The three headline phrasings. Each entry is the set of lines the phrase
 * breaks into on wide viewports; they are deliberately the same length and
 * line-rhythm so the hero block never changes height as it cycles.
 */
const PHRASES: readonly (readonly string[])[] = [
  ["One system for the work", "product teams do together"],
  ["Plan, build, and ship it", "with your team and agents"],
  ["The shared workspace for", "people and agents at work"],
];

/** Full sentences, announced once to assistive tech (the visual stack is
    aria-hidden, exactly as the capture does it). */
const SPOKEN = PHRASES.map((lines) => lines.join(" "));

const HOLD_MS = 4200;
const OUT_MS = 620;

export function HeroHeadline() {
  const [active, setActive] = useState(0);
  const [leaving, setLeaving] = useState<number | null>(null);

  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let outTimer = 0;
    const holdTimer = window.setInterval(() => {
      setActive((current) => {
        setLeaving(current);
        window.clearTimeout(outTimer);
        outTimer = window.setTimeout(() => setLeaving(null), OUT_MS);
        return (current + 1) % PHRASES.length;
      });
    }, HOLD_MS);

    return () => {
      window.clearInterval(holdTimer);
      window.clearTimeout(outTimer);
    };
  }, []);

  return (
    <>
      <span aria-hidden="true" className={styles.heroPhrases}>
        {PHRASES.map((lines, phraseIndex) => {
          const isActive = phraseIndex === active;
          const isLeaving = phraseIndex === leaving;
          let word = 0;
          return (
            <span
              key={phraseIndex}
              className={styles.heroPhrase}
              data-active={isActive}
              data-leaving={isLeaving ? "true" : undefined}
            >
              {lines.map((line, lineIndex) => (
                <span key={lineIndex} style={{ display: "block" }}>
                  {line.split(" ").map((token, tokenIndex) => {
                    const i = word++;
                    return (
                      <span key={`${lineIndex}-${tokenIndex}`}>
                        <span
                          className={styles.heroWord}
                          style={
                            { "--i": i } as unknown as React.CSSProperties
                          }
                        >
                          {token}
                        </span>
                        {tokenIndex < line.split(" ").length - 1 ? " " : null}
                      </span>
                    );
                  })}
                </span>
              ))}
            </span>
          );
        })}
      </span>
      <span className={styles.visuallyHidden}>{SPOKEN[0]}</span>
    </>
  );
}
