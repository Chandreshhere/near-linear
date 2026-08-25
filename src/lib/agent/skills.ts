"use client";

/**
 * Skills — MASTER_PROMPT.md §21 (DOCUMENTED): reusable workflows saved as
 * skills, invoked from the composer's Skills pill or by typing a `/` slash
 * command. Personal skills belong to the signed-in user; team skills are
 * scoped to a team (Settings → Team → AI & Agents in the real product).
 *
 * MobX store mirrored to localStorage under "agentSkills". Seeded with three
 * starter skills the first time it hydrates, so the menu is never empty.
 *
 * A skill is *instructions text*: selecting one inserts its instructions into
 * the composer, where the user can edit before sending. That keeps skills
 * adapter-agnostic — a real model gets the same prompt text the local rule
 * engine sees.
 */

import { computed, makeObservable, observable, runInAction } from "mobx";
import { useEffect, useState } from "react";

export type SkillScope = "personal" | "team";

export interface AgentSkill {
  id: string;
  name: string;
  /** Slash command WITHOUT the leading "/" (stored normalized). */
  slash: string;
  instructions: string;
  scope: SkillScope;
  teamId?: string;
}

const STORAGE_KEY = "agentSkills";

/** Starter set (§21 "repeatable workflows"), personal by default. */
const SEED_SKILLS: AgentSkill[] = [
  {
    id: "skill-triage",
    name: "Triage backlog",
    slash: "triage",
    instructions:
      "Summarize the backlog: group by team, call out anything at High priority or above, and list the five issues that most need an owner.",
    scope: "personal",
  },
  {
    id: "skill-standup",
    name: "Daily standup",
    slash: "standup",
    instructions:
      "What's in progress? List each started issue with its team and assignee, then tell me what's assigned to me.",
    scope: "personal",
  },
  {
    id: "skill-scope",
    name: "Scope a project",
    slash: "scope",
    instructions:
      'Create a project called "" — then propose the milestones it needs. Replace the empty quotes with the project name before sending.',
    scope: "personal",
  },
];

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `s-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** "/Weekly Update" → "weekly-update" (what the composer matches on). */
export function normalizeSlash(raw: string): string {
  const slug = raw
    .trim()
    .replace(/^\/+/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug;
}

function isSkill(value: unknown): value is AgentSkill {
  if (typeof value !== "object" || value === null) return false;
  const row = value as Record<string, unknown>;
  return (
    typeof row.id === "string" &&
    typeof row.name === "string" &&
    typeof row.slash === "string" &&
    typeof row.instructions === "string" &&
    (row.scope === "personal" || row.scope === "team")
  );
}

function parseSkills(raw: string | null): AgentSkill[] | null {
  if (raw === null || raw === "") return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isSkill);
  } catch {
    return null;
  }
}

export class AgentSkillStore {
  skills: AgentSkill[] = [];
  hydrated = false;

  constructor() {
    makeObservable(this, {
      skills: observable,
      hydrated: observable,
      sorted: computed,
    });
  }

  hydrate(): void {
    if (this.hydrated || typeof window === "undefined") return;
    const stored = parseSkills(window.localStorage.getItem(STORAGE_KEY));
    runInAction(() => {
      this.skills = stored ?? SEED_SKILLS.map((skill) => ({ ...skill }));
      this.hydrated = true;
    });
    if (stored === null) this.persist();
  }

  private persist(): void {
    if (!this.hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(this.skills));
    } catch {
      /* best-effort */
    }
  }

  /** Personal skills first, then team skills; alphabetical inside each group. */
  get sorted(): AgentSkill[] {
    return this.skills.slice().sort((a, b) => {
      if (a.scope !== b.scope) return a.scope === "personal" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }

  /** Substring match over name and slash — what the `/` menu filters on. */
  filter(query: string): AgentSkill[] {
    const needle = query.trim().toLowerCase().replace(/^\//, "");
    if (needle === "") return this.sorted;
    return this.sorted.filter(
      (skill) =>
        skill.slash.includes(needle) || skill.name.toLowerCase().includes(needle),
    );
  }

  create(input: {
    name: string;
    slash: string;
    instructions: string;
    scope: SkillScope;
    teamId?: string;
  }): AgentSkill {
    const skill: AgentSkill = {
      id: newId(),
      name: input.name.trim(),
      slash: normalizeSlash(input.slash) || normalizeSlash(input.name),
      instructions: input.instructions.trim(),
      scope: input.scope,
      teamId: input.scope === "team" ? input.teamId : undefined,
    };
    runInAction(() => {
      this.skills.push(skill);
    });
    this.persist();
    return skill;
  }

  remove(id: string): void {
    runInAction(() => {
      this.skills = this.skills.filter((skill) => skill.id !== id);
    });
    this.persist();
  }
}

let instance: AgentSkillStore | null = null;

export function getAgentSkills(): AgentSkillStore {
  if (instance === null) instance = new AgentSkillStore();
  return instance;
}

export function useAgentSkills(): AgentSkillStore {
  const [store] = useState(getAgentSkills);
  useEffect(() => {
    store.hydrate();
  }, [store]);
  return store;
}
