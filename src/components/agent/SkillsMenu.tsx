"use client";

/**
 * Skills menu — MASTER_PROMPT.md §21. Opened by the composer's Skills pill or
 * by typing `/` in an empty composer; filters as you type; Enter inserts the
 * selected skill's instructions into the composer.
 *
 * Purely presentational: the composer owns the query, the highlight and what
 * "pick" means, so the same panel serves both entry points.
 */

import { useEffect, useRef, type JSX } from "react";
import { Icon } from "@/components/icons/Icon";
import type { AgentSkill } from "@/lib/agent/skills";
import styles from "./agent.module.css";

export function SkillsMenu({
  skills,
  highlight,
  onHighlight,
  onPick,
  onNewSkill,
  search,
}: {
  /** Already filtered + ordered. */
  skills: AgentSkill[];
  highlight: number;
  onHighlight: (index: number) => void;
  onPick: (skill: AgentSkill) => void;
  onNewSkill: () => void;
  /** Pill mode renders its own search field; slash mode filters in the editor. */
  search?: { value: string; onChange: (value: string) => void; onKeyDown: (e: React.KeyboardEvent) => void };
}): JSX.Element {
  const searchRef = useRef<HTMLInputElement>(null);
  const hasSearch = search !== undefined;

  useEffect(() => {
    if (hasSearch) searchRef.current?.focus();
  }, [hasSearch]);

  return (
    <div className={styles.skillsMenu} role="menu" aria-label="Skills">
      {search !== undefined ? (
        <input
          ref={searchRef}
          className={styles.skillsSearch}
          value={search.value}
          onChange={(e) => search.onChange(e.currentTarget.value)}
          onKeyDown={search.onKeyDown}
          placeholder="Filter skills…"
          aria-label="Filter skills"
          spellCheck={false}
        />
      ) : null}

      {skills.length === 0 ? (
        <p className={styles.skillsEmpty}>No skills match.</p>
      ) : (
        skills.map((skill, index) => (
          <button
            key={skill.id}
            type="button"
            role="menuitem"
            className={styles.skillItem}
            data-highlighted={index === highlight ? "true" : undefined}
            onMouseEnter={() => onHighlight(index)}
            onClick={() => onPick(skill)}
          >
            <Icon name="Agent" size={14} />
            <span className={styles.skillName}>{skill.name}</span>
            <span className={styles.skillSlash}>/{skill.slash}</span>
            <span className={styles.skillScope}>
              {skill.scope === "team" ? "Team" : "Personal"}
            </span>
          </button>
        ))
      )}

      <div className={styles.skillsFooter}>
        <button
          type="button"
          role="menuitem"
          className={styles.skillItem}
          onClick={onNewSkill}
        >
          <Icon name="Plus" size={14} />
          <span className={styles.skillName}>New skill</span>
        </button>
      </div>
    </div>
  );
}
