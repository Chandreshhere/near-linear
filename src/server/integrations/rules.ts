/**
 * Server-side routing rules for the chat webhook.
 *
 * The BROWSER keeps its rules in localStorage under "integrations" (the
 * settings page edits them, `src/lib/integrations/store.ts` reads them). A
 * server route cannot see any of that, so the receiver needs its own rules
 * source. Until the connection/rule tables move into a database
 * (BACKEND_API.md 7.6), that source is one environment variable.
 *
 *   INTEGRATIONS_RULES='[{"channel":"eng","team":"TRENDZO","trigger":"command"}]'
 *
 * Every field except `team` is optional:
 *
 *   provider  "slack" | "msteams" | "*"     (default "*")
 *   workspace provider workspace/tenant name, or "*"   (default "*")
 *   channel   channel id or name, or "*"    (default "*")
 *   team      team key, name or id          REQUIRED
 *   trigger   "mention" | "command" | "all" (default "command")
 *   priority  0-4, applied when the message names none   (optional)
 *   labels    label names applied to every issue from this rule (optional)
 *
 * MATCHING mirrors the client exactly: a rule naming the exact channel beats
 * a "*" catch-all, and provider/workspace must match (or be "*"). With the
 * variable unset there is ONE default rule - every channel to the workspace's
 * first team, trigger `command` - so a `/task ...` message works out of the
 * box and nothing else does.
 */

import type { TriggerMode } from "@/lib/integrations/shared";

export interface ServerRoutingRule {
  /** Provider this rule applies to, or "*" for any. */
  provider: "slack" | "msteams" | "*";
  /** Provider workspace/tenant name, or "*" for any. */
  workspace: string;
  /** Channel id or name, or "*" for any channel. */
  channel: string;
  /** Team key, name or id - resolved leniently at ingest time. */
  team: string;
  trigger: TriggerMode;
  /** Applied when the message itself names no priority. */
  priority?: number;
  /** Label names applied to every issue this rule creates. */
  labels?: string[];
}

/** Sentinel `team` of the built-in rule: "whatever team comes first". */
export const FIRST_TEAM = "__first_team__";

/** The rule set used when INTEGRATIONS_RULES is unset or unparseable. */
export function defaultRules(): ServerRoutingRule[] {
  return [
    {
      provider: "*",
      workspace: "*",
      channel: "*",
      team: FIRST_TEAM,
      trigger: "command",
    },
  ];
}

function asTrigger(value: unknown): TriggerMode {
  return value === "mention" || value === "command" || value === "all" ? value : "command";
}

function asProvider(value: unknown): ServerRoutingRule["provider"] {
  return value === "slack" || value === "msteams" ? value : "*";
}

function asString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : fallback;
}

function parseRule(value: unknown): ServerRoutingRule | undefined {
  if (typeof value !== "object" || value === null) return undefined;
  const bag = value as Record<string, unknown>;
  const team = typeof bag.team === "string" ? bag.team.trim() : "";
  if (team === "") return undefined; // a rule without a destination is not a rule
  return {
    provider: asProvider(bag.provider),
    workspace: asString(bag.workspace, "*"),
    channel: asString(bag.channel, "*"),
    team,
    trigger: asTrigger(bag.trigger),
    ...(typeof bag.priority === "number" ? { priority: bag.priority } : {}),
    ...(Array.isArray(bag.labels)
      ? { labels: bag.labels.filter((l): l is string => typeof l === "string") }
      : {}),
  };
}

/**
 * Read INTEGRATIONS_RULES. Tolerant on purpose: a malformed variable falls
 * back to the default rule rather than taking the webhook down, and the
 * reason is returned so the caller can surface it.
 */
export function loadRules(): { rules: ServerRoutingRule[]; warning?: string } {
  const raw = process.env.INTEGRATIONS_RULES;
  if (raw === undefined || raw.trim() === "") return { rules: defaultRules() };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      rules: defaultRules(),
      warning: "INTEGRATIONS_RULES is not valid JSON - using the default rule",
    };
  }
  if (!Array.isArray(parsed)) {
    return {
      rules: defaultRules(),
      warning: "INTEGRATIONS_RULES must be a JSON array - using the default rule",
    };
  }
  const rules = parsed
    .map(parseRule)
    .filter((rule): rule is ServerRoutingRule => rule !== undefined);
  if (rules.length === 0) {
    return {
      rules: defaultRules(),
      warning:
        'INTEGRATIONS_RULES held no usable rules (each needs a "team") - using the default rule',
    };
  }
  return { rules };
}

function matchesScope(
  rule: ServerRoutingRule,
  provider: string,
  workspace: string,
): boolean {
  const providerOk = rule.provider === "*" || rule.provider === provider;
  const workspaceOk =
    rule.workspace === "*" ||
    rule.workspace.toLowerCase() === workspace.trim().toLowerCase();
  return providerOk && workspaceOk;
}

/**
 * Pick the rule for one message: exact channel first, then the "*" catch-all
 * - the same precedence `pickRule` applies in the browser.
 */
export function selectRule(
  rules: readonly ServerRoutingRule[],
  message: { provider: string; workspaceName: string; channel: string },
): ServerRoutingRule | undefined {
  const inScope = rules.filter((rule) =>
    matchesScope(rule, message.provider, message.workspaceName),
  );
  const channel = message.channel.trim().toLowerCase();
  return (
    inScope.find((rule) => rule.channel.toLowerCase() === channel) ??
    inScope.find((rule) => rule.channel === "*")
  );
}
