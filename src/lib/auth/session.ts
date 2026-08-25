/**
 * Client-side session + onboarding state (Phase 8 — FRONTEND ONLY).
 *
 * There is no auth server in this build. Everything below is a thin,
 * typed wrapper over `localStorage` so the login/onboarding surfaces have a
 * single, documented seam where a real backend plugs in.
 *
 * ── BACKEND SEAMS ────────────────────────────────────────────────────────
 * 1. `startEmailLogin(email)`   → POST /auth/email  { email }        (send code + magic link)
 * 2. `verifyEmailCode(email,c)` → POST /auth/email/verify { email, code }
 *                                 → { token, user } → set an httpOnly cookie
 * 3. `startOAuth("google")`     → redirect to /auth/google (OAuth 2.0 + PKCE)
 * 4. `startPasskeyLogin()`      → GET /auth/passkey/challenge → navigator.credentials.get()
 *                                 → POST /auth/passkey/verify
 * 5. `startSamlLogin(domain)`   → GET /auth/saml?domain= → IdP redirect
 * 6. `signOut()`                → POST /auth/logout (docs: logs out ALL sessions workspace-wide)
 *
 * Until then every method resolves locally and writes the session below.
 */

import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";

export const AUTH_STORAGE_KEY = "linearAuth";
export const ONBOARDING_STORAGE_KEY = "linearOnboarding";

export type LoginMethod = "google" | "email" | "passkey" | "saml";

export interface AuthSession {
  /** Fixture identity — a real backend returns this from the token exchange. */
  userId: string;
  /** ISO-8601 */
  loggedInAt: string;
  method?: LoginMethod;
  email?: string;
}

export interface OnboardingState {
  /** ISO-8601 — set once the last step is finished or skipped. */
  completedAt?: string;
  /** Highest step index the user has reached (resume support). */
  lastStep?: string;
}

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* private mode / quota — the session simply does not persist */
  }
}

export function readSession(): AuthSession | null {
  const session = readJSON<AuthSession>(AUTH_STORAGE_KEY);
  if (session === null || typeof session.userId !== "string") return null;
  return session;
}

/** Called by every successful login path. */
export function writeSession(method: LoginMethod, email?: string): AuthSession {
  const session: AuthSession = {
    // BACKEND SEAM (§2/§3 above): a real token exchange returns the account's
    // id and this line reads it off the response. With no exchange there is
    // exactly one identity to be — the seeded workspace user.
    userId: CURRENT_USER_ID,
    loggedInAt: new Date().toISOString(),
    method,
    ...(email !== undefined ? { email } : null),
  };
  writeJSON(AUTH_STORAGE_KEY, session);
  return session;
}

export function clearSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

export function readOnboarding(): OnboardingState {
  return readJSON<OnboardingState>(ONBOARDING_STORAGE_KEY) ?? {};
}

export function isOnboarded(): boolean {
  return typeof readOnboarding().completedAt === "string";
}

export function markStepReached(step: string): void {
  writeJSON(ONBOARDING_STORAGE_KEY, { ...readOnboarding(), lastStep: step });
}

export function markOnboarded(): void {
  writeJSON(ONBOARDING_STORAGE_KEY, {
    ...readOnboarding(),
    completedAt: new Date().toISOString(),
  });
}

/** Human label for a login method (Connected accounts, Security pages). */
export const LOGIN_METHOD_LABEL: Record<LoginMethod, string> = {
  google: "Google",
  email: "Email",
  passkey: "Passkey",
  saml: "SAML SSO",
};
