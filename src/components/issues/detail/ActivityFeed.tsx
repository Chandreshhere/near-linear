"use client";

import { useEffect, useState, type ReactNode } from "react";
import { observer } from "mobx-react-lite";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { PickerMenu, type PickerItem } from "@/components/issues/pickers/PickerMenu";
import { useStore, useSyncClient } from "@/lib/data/DataProvider";
import { useShortcut } from "@/lib/keyboard";
import type { ActivityData, IssueData } from "@/lib/data/types";
import { CURRENT_USER_ID } from "./constants";
import styles from "./detail.module.css";

/** "just now" → "5m" → "2h" → "Aug 24" (per §10.3 relative-time contract). */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return "";
  const minutes = Math.floor(Math.max(0, now - t) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Absolute form for the tooltip/aria-label: "Mon, Aug 24, 2026, 17:35:28". */
function absoluteTime(iso: string): string {
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return iso;
  return new Date(t).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

/** Re-render tick so relative times age without a reload. */
function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs]);
  return now;
}

function entryText(activity: ActivityData): ReactNode {
  switch (activity.type) {
    case "created":
      return <> created the issue</>;
    case "stateChanged":
      return (
        <>
          {" "}
          moved from {activity.from} to {activity.to}
        </>
      );
    case "priorityChanged":
      return activity.to ? <> set priority to {activity.to}</> : <> removed priority</>;
    case "assigneeChanged":
      return activity.to ? <> assigned {activity.to}</> : <> unassigned the issue</>;
    case "labelAdded":
      return <> added label {activity.to}</>;
    case "labelRemoved":
      return <> removed label {activity.from}</>;
    case "projectChanged":
      return activity.to ? <> added to project {activity.to}</> : <> removed from project</>;
    case "milestoneCompleted":
      return <> completed milestone {activity.to}</>;
    case "commented":
      return <> commented</>;
    default:
      return <> updated the issue</>;
  }
}

/**
 * Activity section (capture §6): "Activity" 15px/600 + Subscribe toggle +
 * 18px subscriber pile (-6px overlap); entries as 14px avatar + one-line
 * 12.5px muted text with highlighted actor name and relative-time link.
 */
export const ActivityFeed = observer(function ActivityFeed({
  issue,
}: {
  issue: IssueData;
}) {
  const store = useStore();
  const client = useSyncClient();
  const now = useNow(30_000);
  const [subscribersOpen, setSubscribersOpen] = useState(false);

  const activities = store.activitiesForIssue(issue.id);
  const subscriberIds = issue.subscriberIds ?? [];
  const subscribed = subscriberIds.includes(CURRENT_USER_ID);
  const subscribers = subscriberIds
    .map((id) => store.get("User", id))
    .filter((user): user is NonNullable<typeof user> => user !== undefined);

  const setSubscribers = (next: string[]): void => {
    client.mutate.updateIssue(issue.id, { subscriberIds: next });
  };

  const toggleSubscribe = () => {
    setSubscribers(
      subscribed
        ? subscriberIds.filter((id) => id !== CURRENT_USER_ID)
        : [...subscriberIds, CURRENT_USER_ID],
    );
  };

  /**
   * Manage subscribers (§12 `Cmd/Ctrl+Shift+S`). Multi-select rows over every
   * workspace user; `keepOpen` lets several people be added in one pass, the
   * same exception the LabelPicker documents.
   */
  const subscriberItems: PickerItem[] = store
    .all("User")
    .slice()
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((user) => {
      const isSubscriber = subscriberIds.includes(user.id);
      return {
        id: user.id,
        label: user.displayName,
        icon: (
          <Avatar
            initials={user.initials}
            color={user.avatarColor}
            src={user.avatarUrl}
            size={16}
          />
        ),
        hint: user.name !== user.displayName ? user.name : undefined,
        selected: isSubscriber,
        keepOpen: true,
        onSelect: () => {
          setSubscribers(
            isSubscriber
              ? subscriberIds.filter((id) => id !== user.id)
              : [...subscriberIds, user.id],
          );
        },
      };
    });

  useShortcut({
    id: "issue.manage-subscribers",
    keys: "mod+shift+s",
    scope: "issue",
    description: "Manage subscribers",
    handler: (event) => {
      event.preventDefault();
      setSubscribersOpen((value) => !value);
    },
  });

  return (
    <section aria-label="Activity">
      <div className={styles.activityHeader}>
        <span className={styles.activityTitle}>Activity</span>
        <span className={styles.activitySpacer} />
        <Button
          size={24}
          onClick={toggleSubscribe}
          aria-label={subscribed ? "Unsubscribe from issue" : "Subscribe to issue"}
        >
          {subscribed ? "Unsubscribe" : "Subscribe"}
        </Button>
        <PickerMenu
          open={subscribersOpen}
          onOpenChange={setSubscribersOpen}
          items={subscriberItems}
          placeholder="Add subscriber…"
          anchor={
            <button
              type="button"
              className={styles.subscriberPile}
              aria-label="Change subscribers"
              aria-haspopup="listbox"
            >
              {subscribers.length > 0 ? (
                subscribers.map((user) => (
                  <span key={user.id} className={styles.pileAvatar}>
                    <Avatar
                      initials={user.initials}
                      color={user.avatarColor}
                      size={18}
                    />
                  </span>
                ))
              ) : (
                <span className={styles.pileEmpty}>No subscribers</span>
              )}
            </button>
          }
        />
      </div>

      <div className={styles.activityFeed}>
        {activities.map((activity) => {
          const actor = store.get("User", activity.actorId);
          return (
            <div
              key={activity.id}
              className={styles.activityEntry}
              data-history-entry-id={activity.id}
            >
              <span
                className={styles.miniAvatar}
                style={{ background: actor?.avatarColor }}
                aria-hidden="true"
              >
                {actor?.initials}
              </span>
              <span className={styles.activityText}>
                <b className={styles.activityActor}>{actor?.name ?? "Someone"}</b>
                {entryText(activity)}
                {" · "}
                <a
                  className={styles.activityTime}
                  href={`#update-${activity.id}`}
                  aria-label={absoluteTime(activity.createdAt)}
                  title={absoluteTime(activity.createdAt)}
                >
                  {formatRelativeTime(activity.createdAt, now)}
                </a>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
});
