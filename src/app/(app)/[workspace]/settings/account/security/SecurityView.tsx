"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import {
  SettingsCard,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import {
  LOGIN_METHOD_LABEL,
  clearSession,
  readSession,
  type AuthSession,
} from "@/lib/auth/session";
import styles from "@/components/settings/settings.module.css";

/**
 * Settings → Account → Security & access (research-nav-auth.md §1):
 * active sessions with revoke, passkeys, personal API keys, authorized apps.
 *
 * This build has one local session — the record login wrote to
 * `localStorage.linearAuth`. Signing out is genuinely live: it clears that
 * record and returns to /login (the docs note a real logout ends every
 * session workspace-wide).
 */

function browserLabel(): string {
  if (typeof navigator === "undefined") return "This device";
  const ua = navigator.userAgent;
  const browser = ua.includes("Firefox/")
    ? "Firefox"
    : ua.includes("Edg/")
      ? "Edge"
      : ua.includes("Chrome/")
        ? "Chrome"
        : ua.includes("Safari/")
          ? "Safari"
          : "Browser";
  const os = ua.includes("Mac OS X")
    ? "macOS"
    : ua.includes("Windows")
      ? "Windows"
      : ua.includes("Linux")
        ? "Linux"
        : "Unknown OS";
  return `${browser} on ${os}`;
}

function relative(iso: string): string {
  const delta = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

export function SecurityView() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [device, setDevice] = useState("This device");

  useEffect(() => {
    setSession(readSession());
    setDevice(browserLabel());
  }, []);

  return (
    <>
      <SettingsPageHeader
        title="Security & access"
        description="Sessions, passkeys and API access for your account."
      />

      <SettingsSections>
        <SettingsSection
          id="sessions"
          title="Sessions"
          description="Inactive sessions expire automatically after 30 days."
        >
          <SettingsCard>
            <SettingsRow
              label={`${device} — current session`}
              description={
                session === null
                  ? "No local session record. Signing in from /login creates one."
                  : `Signed in ${relative(session.loggedInAt)} with ${
                      LOGIN_METHOD_LABEL[session.method ?? "email"]
                    }`
              }
              control={
                <span className={styles.pillTag} data-tone="on">
                  Active
                </span>
              }
            />
            <SettingsRow
              label="Other sessions"
              description="Sessions on other devices are tracked by the auth server. This build has none, so there is nothing to revoke — the only session is the one above."
              control={
                <Button variant="secondary" size={32} disabled>
                  Revoke all
                </Button>
              }
            />
            <SettingsRow
              label="Sign out"
              description="Ends this session and returns you to the login screen"
              control={
                <Button
                  variant="secondary"
                  size={32}
                  onClick={() => {
                    // BACKEND SEAM (lib/auth/session.ts §6): POST /auth/logout
                    // is what ends the OTHER sessions — the ones held server
                    // side. The only session that exists here is this
                    // browser's, and clearing it is a genuine sign-out.
                    clearSession();
                    router.push("/login");
                  }}
                >
                  Sign out
                </Button>
              }
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection
          id="passkeys"
          title="Passkeys"
          description="Passwordless sign-in; several devices can be registered. Not available in the desktop app."
        >
          <SettingsCard>
            <SettingsRow
              label="Registered passkeys"
              description="Registering a passkey needs a single-use WebAuthn challenge that only a server can issue and then verify. Nothing on this device can stand in for that."
              control={
                <Button variant="secondary" size={32} disabled>
                  Add passkey
                </Button>
              }
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection id="api" title="API and applications">
          <SettingsCard>
            <SettingsRow
              label="Personal API keys"
              description="An API key is only meaningful to a server that can authenticate it. There is no API to issue keys against in this build."
              control={
                <Button variant="secondary" size={32} disabled>
                  New API key
                </Button>
              }
            />
            <SettingsRow
              label="Authorized applications"
              description="OAuth authorizations are held by the auth server. With no server there is no grant to list or revoke."
              control={
                <Button variant="secondary" size={32} disabled>
                  Manage
                </Button>
              }
            />
          </SettingsCard>
        </SettingsSection>
      </SettingsSections>
    </>
  );
}
