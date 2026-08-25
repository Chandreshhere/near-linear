"use client";

/**
 * `/:workspace/welcome-message` (CAPTURED route) renders the same inbox
 * split view with the seeded welcome notification open. The id is resolved
 * from the pool rather than hardcoded — the welcome row is whichever
 * notification carries `type: "welcome"`.
 */

import { observer } from "mobx-react-lite";
import { InboxView } from "@/components/inbox/InboxView";
import { useStore } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";

export const WelcomeMessageClient = observer(function WelcomeMessageClient({
  workspace,
}: {
  workspace: string;
}) {
  const store = useStore();
  const welcome = store
    .notificationsForUser(CURRENT_USER_ID)
    .find((notification) => notification.type === "welcome");

  return <InboxView workspace={workspace} selectedId={welcome?.id} />;
});
