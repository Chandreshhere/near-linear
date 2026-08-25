"use client";

/**
 * Agent personalization — the contract between Settings → Account → Agent
 * personalization and the agent adapter (§21).
 *
 * The settings page writes these three values; `LocalAgentAdapter` reads them
 * through `readAgentPersonalization()` on every run and shapes its reply
 * accordingly, so changing "Response style" visibly changes the next answer.
 *
 * DEVICE-scoped on purpose (see components/settings/localPrefs.ts): the same
 * key that hook uses, read here without React so non-component code can reach
 * it. An `HttpAgentAdapter` would send this object as the system-prompt
 * preamble instead of applying it locally — same three fields either way.
 */

export const AGENT_PREFS_KEY = "linearAgentPersonalization";

export type AgentReplyStyle = "concise" | "balanced" | "detailed";

export interface AgentPersonalization {
  /** Standing instructions included with every request. */
  instructions: string;
  /** How much detail replies carry by default. */
  style: AgentReplyStyle;
  /** Let the agent use your name and team memberships for context. */
  useProfile: boolean;
}

export const AGENT_PREFS_DEFAULTS: AgentPersonalization = {
  instructions: "",
  style: "balanced",
  useProfile: true,
};

function isStyle(value: unknown): value is AgentReplyStyle {
  return value === "concise" || value === "balanced" || value === "detailed";
}

/** Current personalization. SSR-safe, and tolerant of hand-edited storage. */
export function readAgentPersonalization(): AgentPersonalization {
  if (typeof window === "undefined") return AGENT_PREFS_DEFAULTS;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(AGENT_PREFS_KEY);
  } catch {
    return AGENT_PREFS_DEFAULTS;
  }
  if (raw === null || raw === "") return AGENT_PREFS_DEFAULTS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return AGENT_PREFS_DEFAULTS;
    const row = parsed as Record<string, unknown>;
    return {
      instructions:
        typeof row.instructions === "string"
          ? row.instructions
          : AGENT_PREFS_DEFAULTS.instructions,
      style: isStyle(row.style) ? row.style : AGENT_PREFS_DEFAULTS.style,
      useProfile:
        typeof row.useProfile === "boolean"
          ? row.useProfile
          : AGENT_PREFS_DEFAULTS.useProfile,
    };
  } catch {
    return AGENT_PREFS_DEFAULTS;
  }
}

/** Markdown blocks — paragraphs, lists and headings separated by blank lines. */
function blocks(text: string): string[] {
  return text.split(/\n{2,}/).filter((block) => block.trim() !== "");
}

/**
 * Shape a finished reply to the reader's chosen style.
 *
 * concise  — the lead block, plus the list it introduces when the lead ends
 *            in a colon (dropping it would throw away the answer itself)
 * balanced — verbatim
 * detailed — verbatim plus a context footer naming what the run had to work
 *            with, including the standing instructions in effect
 */
export function applyReplyStyle(
  text: string,
  prefs: AgentPersonalization,
  context?: { workspace?: string; userName?: string },
): string {
  if (prefs.style === "concise") {
    const parts = blocks(text);
    const lead = parts[0];
    if (lead === undefined) return text;
    const next = parts[1];
    const leadIntroducesList =
      lead.trimEnd().endsWith(":") && next !== undefined && /^\s*[-*\d]/.test(next);
    return leadIntroducesList ? `${lead}\n\n${next}` : lead;
  }

  if (prefs.style === "detailed") {
    const lines: string[] = [];
    if (context?.workspace !== undefined) {
      lines.push(`- Workspace: \`${context.workspace}\``);
    }
    if (prefs.useProfile && context?.userName !== undefined) {
      lines.push(`- Acting for: ${context.userName}`);
    }
    const standing = prefs.instructions.trim();
    if (standing !== "") {
      lines.push(`- Standing instructions: ${standing.replace(/\s+/g, " ")}`);
    }
    lines.push(
      "- Every change above went through the same optimistic transaction queue the UI writes with.",
    );
    return `${text}\n\n**Context**\n${lines.join("\n")}`;
  }

  return text;
}
