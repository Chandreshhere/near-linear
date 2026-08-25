/**
 * The workspaces this browser knows about, and which one is active.
 *
 * There is no auth/tenancy server in this build, so "which workspace am I in"
 * is browser-local state — exactly like `linearAuth` in src/lib/auth/session.ts,
 * and stored next to it:
 *
 *   localStorage.linearWorkspace   → the active workspace slug (a JSON string)
 *   localStorage.linearWorkspaces  → [{ slug, name }] this browser has created
 *
 * Each slug maps 1:1 onto an IndexedDB database (`linear_recon_<slug>`, see
 * persistence.ts) and onto the `/<slug>/…` route prefix, so the registry is
 * only an index — the rows themselves always live in the engine.
 *
 * ── BACKEND SEAM ─────────────────────────────────────────────────────────
 * A real deployment replaces both keys with `GET /workspaces` for the signed-in
 * account (BACKEND_API.md § bootstrap): same shape, server-owned membership.
 *
 * SSR-safe: every read guards `typeof window`, and the React hooks below use
 * useSyncExternalStore with a server snapshot so nothing hydrates twice.
 */

import { useSyncExternalStore } from "react";

export const ACTIVE_WORKSPACE_STORAGE_KEY = "linearWorkspace";
export const KNOWN_WORKSPACES_STORAGE_KEY = "linearWorkspaces";

/** Broadcast within the tab (the `storage` event only fires in OTHER tabs). */
const CHANGE_EVENT = "linear:workspaces";

/** One entry of the local workspace index. */
export interface WorkspaceRef {
  slug: string;
  name: string;
}

/**
 * Route segments that are real pages under `/`, so they can never be a
 * workspace slug (Next.js resolves the static segment first and the workspace
 * would be unreachable).
 */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "app",
  "api",
  "dev",
  "login",
  "logout",
  "onboarding",
  "settings",
  "static",
  "_next",
]);

export const SLUG_MIN = 2;
export const SLUG_MAX = 48;
const SLUG_SHAPE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

// ---------- slug derivation + validation ----------

/** "Acme Labs" → "acme-labs"; drops accents, collapses separators. */
export function slugifyWorkspace(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX)
    .replace(/-+$/g, "");
}

/** null = valid; otherwise the message to show under the URL field. */
export function validateWorkspaceSlug(
  slug: string,
  taken: readonly string[] = readKnownWorkspaces().map((w) => w.slug),
): string | null {
  const value = slug.trim();
  if (value.length < SLUG_MIN) {
    return `Workspace URLs are at least ${SLUG_MIN} characters.`;
  }
  if (value.length > SLUG_MAX) {
    return `Workspace URLs are at most ${SLUG_MAX} characters.`;
  }
  if (!SLUG_SHAPE.test(value)) {
    return "Use lowercase letters, numbers and single hyphens.";
  }
  if (RESERVED_SLUGS.has(value)) {
    return `"${value}" is reserved for the app itself.`;
  }
  if (taken.some((s) => s === value)) {
    return `${value} is already used by a workspace in this browser.`;
  }
  return null;
}

// ---------- display fallbacks (pre-boot render) ----------

/** "acme-labs" → "Acme Labs" — deterministic on server AND client. */
export function nameFromSlug(slug: string): string {
  const words = slug.split("-").filter((w) => w.length > 0);
  if (words.length === 0) return "Workspace";
  return words.map((w) => w[0].toUpperCase() + w.slice(1)).join(" ");
}

/** "Acme Labs" → "AL"; single word → its first two letters. */
export function workspaceInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return "W";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

/** Stable hue per slug so a workspace keeps its tile color everywhere. */
export function workspaceColor(slug: string): string {
  let hash = 0;
  for (let i = 0; i < slug.length; i += 1) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return `lch(70% 60 ${hash % 360})`;
}

export interface WorkspaceDisplay {
  slug: string;
  name: string;
  initials: string;
  avatarColor: string;
}

/**
 * Identity for the sidebar / switcher tiles. `name` is optional because the
 * pool has not hydrated on the very first paint — the slug (which IS in the
 * URL during SSR) then supplies a name that matches what the row will say.
 */
export function workspaceDisplay(slug: string, name?: string): WorkspaceDisplay {
  const label = name !== undefined && name.trim() !== "" ? name : nameFromSlug(slug);
  return {
    slug,
    name: label,
    initials: workspaceInitials(label),
    avatarColor: workspaceColor(slug),
  };
}

// ---------- storage ----------

function emitChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

function readRaw(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeRaw(key: string, value: string): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* private mode / quota — the choice simply does not persist */
  }
  emitChange();
}

function isWorkspaceRef(value: unknown): value is WorkspaceRef {
  if (typeof value !== "object" || value === null) return false;
  const ref = value as Partial<WorkspaceRef>;
  return typeof ref.slug === "string" && typeof ref.name === "string";
}

/** Cached parse so useSyncExternalStore sees a referentially stable snapshot. */
let knownCacheRaw: string | null = null;
let knownCache: WorkspaceRef[] = [];

export function readKnownWorkspaces(): WorkspaceRef[] {
  const raw = readRaw(KNOWN_WORKSPACES_STORAGE_KEY);
  if (raw === knownCacheRaw) return knownCache;
  knownCacheRaw = raw;
  if (raw === null) {
    knownCache = [];
    return knownCache;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    knownCache = Array.isArray(parsed) ? parsed.filter(isWorkspaceRef) : [];
  } catch {
    knownCache = [];
  }
  return knownCache;
}

export function readActiveWorkspace(): string | null {
  const raw = readRaw(ACTIVE_WORKSPACE_STORAGE_KEY);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    return typeof parsed === "string" && parsed !== "" ? parsed : null;
  } catch {
    // Tolerate a bare (non-JSON) slug written by an older build.
    return raw !== "" ? raw : null;
  }
}

export function writeActiveWorkspace(slug: string): void {
  writeRaw(ACTIVE_WORKSPACE_STORAGE_KEY, JSON.stringify(slug));
}

/** Add (or rename) a workspace in the index and make it the active one. */
export function rememberWorkspace(ref: WorkspaceRef, activate = true): void {
  const next = readKnownWorkspaces().filter((w) => w.slug !== ref.slug);
  next.push(ref);
  writeRaw(KNOWN_WORKSPACES_STORAGE_KEY, JSON.stringify(next));
  if (activate) writeActiveWorkspace(ref.slug);
}

export function forgetWorkspace(slug: string): void {
  const next = readKnownWorkspaces().filter((w) => w.slug !== slug);
  writeRaw(KNOWN_WORKSPACES_STORAGE_KEY, JSON.stringify(next));
  if (readActiveWorkspace() === slug) {
    const fallback = next[0];
    if (fallback !== undefined) writeActiveWorkspace(fallback.slug);
    else clearActiveWorkspace();
  }
}

export function clearActiveWorkspace(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  emitChange();
}

/** Reset-workspace uses this: the browser forgets every workspace it made. */
export function clearWorkspaceRegistry(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_WORKSPACE_STORAGE_KEY);
    window.localStorage.removeItem(KNOWN_WORKSPACES_STORAGE_KEY);
  } catch {
    /* ignore */
  }
  knownCacheRaw = null;
  knownCache = [];
  emitChange();
}

// ---------- React bindings ----------

function subscribe(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(CHANGE_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(CHANGE_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const EMPTY: WorkspaceRef[] = [];

/** The active slug, or null on the server / before one has been created. */
export function useActiveWorkspace(): string | null {
  return useSyncExternalStore(
    subscribe,
    readActiveWorkspace,
    () => null,
  );
}

/** Every workspace this browser has created (the switcher's real list). */
export function useKnownWorkspaces(): WorkspaceRef[] {
  return useSyncExternalStore(
    subscribe,
    readKnownWorkspaces,
    () => EMPTY,
  );
}
