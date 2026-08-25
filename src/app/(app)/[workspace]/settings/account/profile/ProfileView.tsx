"use client";

import { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react-lite";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  SettingsCard,
  SettingsCustomRow,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { fileToAvatarDataUrl, initialsFor } from "@/lib/auth/profile";
import styles from "@/components/settings/settings.module.css";

/**
 * Settings → Account → Profile. The name/username/avatar fields are bound to
 * the `User` row and commit on blur through the optimistic transaction queue.
 * Email is identity-level: changing it needs confirmation from both addresses
 * (docs/analysis/research-nav-auth.md §1), which has no backend here.
 */
export const ProfileView = observer(function ProfileView() {
  const store = useStore();
  const client = useSyncClient();
  const user = store.get("User", CURRENT_USER_ID);

  const [name, setName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [title, setTitle] = useState("");
  const [seeded, setSeeded] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (seeded || user === undefined) return;
    setSeeded(true);
    setName(user.name);
    setDisplayName(user.displayName);
    setTitle(user.title ?? "");
  }, [seeded, user]);

  const update = (fields: Record<string, unknown>) => {
    if (Object.keys(fields).length === 0) return;
    client.queue.enqueue("update", "User", CURRENT_USER_ID, fields);
  };

  const commitName = () => {
    const value = name.trim();
    if (value === "" || user === undefined || value === user.name) return;
    update({ name: value, initials: initialsFor(value) });
  };

  const commitDisplayName = () => {
    const value = displayName.trim();
    if (value === "" || user === undefined || value === user.displayName) return;
    update({ displayName: value });
  };

  const onAvatarFile = async (file: File | undefined) => {
    if (file === undefined || !file.type.startsWith("image/")) return;
    update({ avatarUrl: await fileToAvatarDataUrl(file) });
  };

  return (
    <>
      <SettingsPageHeader
        title="Profile"
        description="How you appear across every team in this workspace."
      />

      <SettingsSections>
        <SettingsSection id="profile" title="Profile">
          <SettingsCard>
            <SettingsCustomRow>
              <span className={styles.rowText}>
                <span className={styles.rowLabel}>Profile picture</span>
                <span className={styles.rowDescription}>
                  Square images work best — uploads are cropped to 128×128.
                </span>
              </span>
              <span className={styles.rowControl}>
                <Avatar
                  size={44}
                  initials={user?.initials ?? "?"}
                  color={user?.avatarColor}
                  src={user?.avatarUrl}
                />
                <Button
                  variant="secondary"
                  size={32}
                  onClick={() => fileRef.current?.click()}
                >
                  Upload
                </Button>
                <Button
                  variant="ghost"
                  size={32}
                  disabled={user?.avatarUrl === undefined}
                  onClick={() => update({ avatarUrl: null })}
                >
                  Remove
                </Button>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
                  aria-label="Profile picture"
                  onChange={(e) => {
                    void onAvatarFile(e.currentTarget.files?.[0]);
                    e.currentTarget.value = "";
                  }}
                />
              </span>
            </SettingsCustomRow>

            <SettingsRow
              label="Full name"
              description="Shown wherever display names are set to full names"
              labelFor="profile-name"
              control={
                <Input
                  id="profile-name"
                  inputSize="sm"
                  className={styles.rowInput}
                  maxLength={48}
                  value={name}
                  onChange={(e) => setName(e.currentTarget.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              }
            />

            <SettingsRow
              label="Username"
              description="Used for @-mentions and your profile URL"
              labelFor="profile-username"
              control={
                <Input
                  id="profile-username"
                  inputSize="sm"
                  className={styles.rowInput}
                  maxLength={48}
                  value={displayName}
                  onChange={(e) => setDisplayName(e.currentTarget.value)}
                  onBlur={commitDisplayName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") e.currentTarget.blur();
                  }}
                />
              }
            />

            <SettingsRow
              label="Title"
              description="Your role, shown on your profile"
              labelFor="profile-title"
              control={
                <Input
                  id="profile-title"
                  inputSize="sm"
                  className={styles.rowInput}
                  maxLength={128}
                  placeholder="Software engineer"
                  value={title}
                  onChange={(e) => setTitle(e.currentTarget.value)}
                  onBlur={() => {
                    const value = title.trim();
                    if (value === (user?.title ?? "")) return;
                    // Wire `null` clears the field (JSON cannot carry undefined).
                    update({ title: value === "" ? null : value });
                  }}
                />
              }
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection
          id="account"
          title="Account"
          description="Your email is the identity shared by every workspace you belong to."
        >
          <SettingsCard>
            <SettingsRow
              label="Email"
              description="Changing it requires confirmation from both the old and new address"
              control={
                <>
                  <Input
                    inputSize="sm"
                    className={styles.rowInput}
                    value={user?.email ?? ""}
                    readOnly
                    aria-label="Email address"
                  />
                  <Button variant="secondary" size={32} disabled>
                    Change
                  </Button>
                </>
              }
            />
            <SettingsRow
              label="Leave workspace"
              description="Removes you from every team in this workspace"
              control={
                <Button variant="secondary" size={32} disabled>
                  Leave
                </Button>
              }
            />
          </SettingsCard>
        </SettingsSection>
      </SettingsSections>
    </>
  );
});
