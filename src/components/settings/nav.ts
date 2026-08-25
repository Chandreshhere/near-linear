/**
 * Settings information architecture — the exact captured groups and order
 * (docs/analysis/capture-preferences.md §3 + §4, MASTER_PROMPT §10.9).
 * Route shapes come from the captured route map:
 *   /:workspace/settings/account/:page
 *   /:workspace/settings/:page
 *   /:workspace/settings/teams/:teamKey
 */

import type { GlyphName } from "./glyphs";

export interface SettingsNavItem {
  /** Path suffix after `/{workspace}/settings/`. */
  path: string;
  label: string;
  glyph: GlyphName;
}

export interface SettingsNavGroup {
  title: string;
  items: SettingsNavItem[];
}

export const SETTINGS_NAV: SettingsNavGroup[] = [
  {
    title: "Personal",
    items: [
      { path: "account/preferences", label: "Preferences", glyph: "preferences" },
      { path: "account/profile", label: "Profile", glyph: "profile" },
      { path: "account/notifications", label: "Notifications", glyph: "notifications" },
      { path: "account/code-and-reviews", label: "Code & reviews", glyph: "code" },
      { path: "account/security", label: "Security & access", glyph: "security" },
      { path: "account/connections", label: "Connected accounts", glyph: "connections" },
      { path: "account/agents", label: "Agent personalization", glyph: "agentPersonal" },
    ],
  },
  {
    title: "Issues",
    items: [
      { path: "issue-labels", label: "Labels", glyph: "label" },
      { path: "issue-templates", label: "Templates", glyph: "template" },
      { path: "sla", label: "SLAs", glyph: "sla" },
    ],
  },
  {
    title: "Projects",
    items: [
      { path: "project-labels", label: "Labels", glyph: "label" },
      { path: "project-templates", label: "Templates", glyph: "template" },
      { path: "project-statuses", label: "Statuses", glyph: "status" },
      { path: "project-updates", label: "Updates", glyph: "updates" },
    ],
  },
  {
    title: "Features",
    items: [
      { path: "ai", label: "AI & Agents", glyph: "ai" },
      { path: "initiatives", label: "Initiatives", glyph: "initiative" },
      { path: "documents", label: "Documents", glyph: "document" },
      { path: "customer-requests", label: "Customer requests", glyph: "customer" },
      { path: "releases", label: "Releases", glyph: "release" },
      { path: "pulse", label: "Pulse", glyph: "pulse" },
      { path: "asks", label: "Asks", glyph: "ask" },
      { path: "emojis", label: "Emojis", glyph: "emoji" },
      { path: "integrations", label: "Integrations", glyph: "integration" },
    ],
  },
];

export function settingsHref(workspace: string, path: string): string {
  return `/${workspace}/settings/${path}`;
}

/** "Back to app" target (CAPTURED: /:workspace/my-issues/assigned). */
export function backToAppHref(workspace: string): string {
  return `/${workspace}/my-issues/assigned`;
}
