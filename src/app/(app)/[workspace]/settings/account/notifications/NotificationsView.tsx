"use client";

import { observer } from "mobx-react-lite";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import {
  SettingsCard,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import { useLocalPrefs } from "@/components/settings/localPrefs";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import styles from "@/components/settings/settings.module.css";

/**
 * Settings → Account → Notifications (research-nav-auth.md §3).
 * Channels: Inbox (always on), desktop/browser push, mobile push, Slack,
 * email (immediate or digest). Notification types toggle in groups — the docs
 * are explicit that there is no per-type granularity inside a group.
 *
 * Two storage homes, on purpose:
 *   · the newsletter opt-in is account state → `UserSettings.newsletterOptIn`
 *     through the transaction queue, so it follows the account
 *   · the channel + event toggles are DEVICE state (a browser's push
 *     permission is per-browser by definition) → useLocalPrefs
 * The section copy says plainly which channels this build can actually
 * deliver on; see localPrefs.ts for the delivery seam.
 */

const PREFS_KEY = "linearNotificationPrefs";

interface NotificationPrefs {
  desktop: boolean;
  mobile: boolean;
  slack: boolean;
  email: boolean;
  emailCadence: "immediate" | "daily" | "weekly";
  assigned: boolean;
  mentions: boolean;
  comments: boolean;
  statusChanges: boolean;
  reactions: boolean;
}

const DEFAULTS: NotificationPrefs = {
  desktop: true,
  mobile: false,
  slack: false,
  email: true,
  emailCadence: "immediate",
  assigned: true,
  mentions: true,
  comments: true,
  statusChanges: true,
  reactions: false,
};

export const NotificationsView = observer(function NotificationsView() {
  const store = useStore();
  const client = useSyncClient();
  const [prefs, patch] = useLocalPrefs<NotificationPrefs>(PREFS_KEY, DEFAULTS);

  const settings = store.get("UserSettings", CURRENT_USER_ID);
  const newsletter = settings?.newsletterOptIn ?? false;

  return (
    <>
      <SettingsPageHeader
        title="Notifications"
        description="Choose where notifications are delivered and which events generate them."
      />

      <SettingsSections>
        <SettingsSection
          id="channels"
          title="Channels"
          description="The Inbox always receives everything; the other channels mirror it. Inbox delivery is live in this build — the push, Slack and email channels record your choice here, but actually sending to them needs a server (a push service, a Slack app, an SMTP relay), which this build has none of."
        >
          <SettingsCard>
            <SettingsRow
              label="Inbox"
              description="Always on — every notification lands here first"
              control={
                <span className={styles.pillTag} data-tone="on">
                  Always on
                </span>
              }
            />
            <SettingsRow
              label="Desktop and browser"
              description="Native notifications while the app is open"
              control={
                <Toggle
                  checked={prefs.desktop}
                  onChange={(v) => patch({ desktop: v })}
                  aria-label="Desktop and browser notifications"
                />
              }
            />
            <SettingsRow
              label="Mobile push"
              description="Push notifications on the iOS and Android apps"
              control={
                <Toggle
                  checked={prefs.mobile}
                  onChange={(v) => patch({ mobile: v })}
                  aria-label="Mobile push notifications"
                />
              }
            />
            <SettingsRow
              label="Slack"
              description="Real-time direct messages for your notifications"
              control={
                <Toggle
                  checked={prefs.slack}
                  onChange={(v) => patch({ slack: v })}
                  aria-label="Slack notifications"
                />
              }
            />
            <SettingsRow
              label="Email"
              description="Immediate emails, or a digest batched by urgency"
              control={
                <>
                  <Select
                    className={styles.select}
                    label="Email delivery"
                    disabled={!prefs.email}
                    value={prefs.emailCadence}
                    onValueChange={(value) =>
                      patch({
                        emailCadence:
                          value === "daily"
                            ? "daily"
                            : value === "weekly"
                              ? "weekly"
                              : "immediate",
                      })
                    }
                    options={[
                      { value: "immediate", label: "Immediate" },
                      { value: "daily", label: "Daily digest" },
                      { value: "weekly", label: "Weekly digest" },
                    ]}
                  />
                  <Toggle
                    checked={prefs.email}
                    onChange={(v) => patch({ email: v })}
                    aria-label="Email notifications"
                  />
                </>
              }
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection
          id="events"
          title="Events"
          description="You are auto-subscribed to issues you create, are assigned, or are mentioned in."
        >
          <SettingsCard>
            <SettingsRow
              label="Assigned to you"
              description="Someone assigns an issue to you"
              control={
                <Toggle
                  checked={prefs.assigned}
                  onChange={(v) => patch({ assigned: v })}
                  aria-label="Notify when assigned to you"
                />
              }
            />
            <SettingsRow
              label="Mentions"
              description="You are @-mentioned in a description or comment"
              control={
                <Toggle
                  checked={prefs.mentions}
                  onChange={(v) => patch({ mentions: v })}
                  aria-label="Notify on mentions"
                />
              }
            />
            <SettingsRow
              label="Comments and replies"
              description="New comments and thread replies on issues you follow"
              control={
                <Toggle
                  checked={prefs.comments}
                  onChange={(v) => patch({ comments: v })}
                  aria-label="Notify on comments and replies"
                />
              }
            />
            <SettingsRow
              label="Status changes"
              description="A subscribed issue is completed, canceled, or set to urgent"
              control={
                <Toggle
                  checked={prefs.statusChanges}
                  onChange={(v) => patch({ statusChanges: v })}
                  aria-label="Notify on status changes"
                />
              }
            />
            <SettingsRow
              label="Reactions"
              description="Someone reacts to your comment"
              control={
                <Toggle
                  checked={prefs.reactions}
                  onChange={(v) => patch({ reactions: v })}
                  aria-label="Notify on reactions"
                />
              }
            />
          </SettingsCard>
        </SettingsSection>

        <SettingsSection id="newsletter" title="Product newsletter">
          <SettingsCard>
            <SettingsRow
              label="Send me the product newsletter"
              description="Changelog highlights and product updates, about once a month"
              control={
                <Toggle
                  checked={newsletter}
                  disabled={settings === undefined}
                  onChange={(v) => {
                    if (settings === undefined) return;
                    client.queue.enqueue("update", "UserSettings", CURRENT_USER_ID, {
                      newsletterOptIn: v,
                    });
                  }}
                  aria-label="Send me the product newsletter"
                />
              }
            />
          </SettingsCard>
        </SettingsSection>
      </SettingsSections>
    </>
  );
});
