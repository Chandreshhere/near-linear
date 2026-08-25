"use client";

import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { Button } from "@/components/ui/Button";
import {
  SettingsCard,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import { useStore } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { readSession, type LoginMethod } from "@/lib/auth/session";
import styles from "@/components/settings/settings.module.css";

/**
 * Settings → Account → Connected accounts. The method that produced the
 * current session (recorded by /login in `localStorage.linearAuth`) shows as
 * connected; the rest need a real identity provider, so their actions are
 * disabled rather than faked.
 */

const METHODS: { key: LoginMethod; label: string; description: string }[] = [
  {
    key: "google",
    label: "Google",
    description: "Sign in with any Gmail or Google Workspace address",
  },
  {
    key: "email",
    label: "Email",
    description: "A login link and numeric code sent to your inbox",
  },
  {
    key: "passkey",
    label: "Passkey",
    description: "Passwordless sign-in — managed under Security & access",
  },
  {
    key: "saml",
    label: "SAML SSO",
    description: "Sign in through your organization's identity provider",
  },
];

export const ConnectionsView = observer(function ConnectionsView() {
  const store = useStore();
  const user = store.get("User", CURRENT_USER_ID);
  const [active, setActive] = useState<LoginMethod | null>(null);
  const [sessionEmail, setSessionEmail] = useState<string | null>(null);

  useEffect(() => {
    const session = readSession();
    setActive(session?.method ?? null);
    setSessionEmail(session?.email ?? null);
  }, []);

  return (
    <>
      <SettingsPageHeader
        title="Connected accounts"
        description="The sign-in methods linked to this account."
      />

      <SettingsSections>
        <SettingsSection
          id="login-methods"
          title="Login methods"
          description="Your email is the unique identifier across every workspace you belong to."
        >
          <SettingsCard>
            {METHODS.map((method) => {
              const connected = active === method.key;
              return (
                <SettingsRow
                  key={method.key}
                  label={method.label}
                  description={
                    connected && method.key === "email" && sessionEmail !== null
                      ? `Connected as ${sessionEmail}`
                      : connected
                        ? `Used for the current session — ${user?.email ?? ""}`
                        : method.description
                  }
                  control={
                    connected ? (
                      <span className={styles.pillTag} data-tone="on">
                        Connected
                      </span>
                    ) : (
                      <Button variant="secondary" size={32} disabled>
                        Connect
                      </Button>
                    )
                  }
                />
              );
            })}
          </SettingsCard>
        </SettingsSection>

        <SettingsSection
          id="workspaces"
          title="Workspaces"
          description="Workspaces this account can switch between."
        >
          <SettingsCard>
            <SettingsRow
              label={store.all("Workspace")[0]?.name ?? "Workspace"}
              description={`${store.all("Team").length} teams · you are signed in here`}
              control={
                <span className={styles.pillTag} data-tone="on">
                  Current
                </span>
              }
            />
            <SettingsRow
              label="Join another workspace"
              description="Needs an invite link, an approved email domain, or an admin invite"
              control={
                <Button variant="secondary" size={32} disabled>
                  Join
                </Button>
              }
            />
          </SettingsCard>
        </SettingsSection>
      </SettingsSections>
    </>
  );
});
