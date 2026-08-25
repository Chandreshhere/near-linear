"use client";

/**
 * "Invite people" — opened from the workspace menu, the sidebar's Try section
 * and the Members page (MASTER_PROMPT.md §17.2 "email invite (role + teams)").
 *
 * What is real here: the pending-invite row. It is written through the
 * local-first engine (Invite model), shows up immediately in the Members
 * directory and survives a reload like any other row.
 *
 * ── BACKEND SEAM ─────────────────────────────────────────────────────────
 * Delivering the mail is the only server-side half:
 *   POST /workspaces/:id/invites { email, role }  → 201 { invite }
 *   (sends the invite mail + reusable link; acceptance flips the invite into
 *   a real User row through the normal sync stream).
 * Until that exists the row simply stays "Pending".
 */

import { useCallback, useEffect, useState, type JSX } from "react";
import { observer } from "mobx-react-lite";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";
import type { InviteData, WorkspaceRole } from "@/lib/data/types";
import styles from "@/components/workspace/directory.module.css";

const OPEN_EVENT = "linear:invite-people:open";

/** Roles offered when inviting (Members page reuses the labels). */
export const ROLE_OPTIONS: { value: WorkspaceRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "member", label: "Member" },
  { value: "guest", label: "Guest" },
];

export const ROLE_LABEL: Record<WorkspaceRole, string> = {
  admin: "Admin",
  member: "Member",
  guest: "Guest",
};

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Ask the mounted <InvitePeopleDialogHost/> to open. */
export function openInviteDialog(): void {
  if (typeof window === "undefined") return; // SSR guard
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

function newId(): string {
  const c = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (c !== undefined && typeof c.randomUUID === "function") return c.randomUUID();
  return `invite-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const InvitePeopleDialogHost = observer(function InvitePeopleDialogHost(): JSX.Element {
  const client = useSyncClient();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [submitted, setSubmitted] = useState(false);

  const reset = useCallback(() => {
    setEmail("");
    setRole("member");
    setSubmitted(false);
  }, []);

  useEffect(() => {
    const onOpen = (): void => {
      reset();
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [reset]);

  const value = email.trim().toLowerCase();
  const alreadyMember = client.store
    .all("User")
    .some((u) => u.email.toLowerCase() === value);
  const alreadyInvited = client.store
    .all("Invite")
    .some((i) => i.status === "pending" && i.email.toLowerCase() === value);

  const error =
    value === ""
      ? "Enter an email address."
      : !EMAIL_SHAPE.test(value)
        ? "That does not look like an email address."
        : alreadyMember
          ? "That address is already a member of this workspace."
          : alreadyInvited
            ? "An invite is already pending for that address."
            : null;

  const submit = (): void => {
    setSubmitted(true);
    if (error !== null) return;
    const invite: InviteData = {
      id: newId(),
      email: value,
      role,
      invitedById: CURRENT_USER_ID,
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    client.queue.enqueue(
      "create",
      "Invite",
      invite.id,
      invite as unknown as Record<string, unknown>,
    );
    setOpen(false);
    showToast(`Invited ${invite.email}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} width={480} label="Invite people">
      <div className={styles.dialogHeader}>
        <span className={styles.dialogTitle}>Invite people</span>
        <span className={styles.dialogSub}>
          Invited people join this workspace with the role you pick. They appear
          in Members as pending until they accept.
        </span>
      </div>

      <form
        className={styles.dialogBody}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className={styles.fieldRow}>
          <div className={`${styles.field} ${styles.grow}`}>
            <label className={styles.label} htmlFor="invite-email">
              Email address
            </label>
            <Input
              id="invite-email"
              inputSize="sm"
              type="email"
              autoFocus
              autoComplete="off"
              spellCheck={false}
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.currentTarget.value)}
            />
          </div>
          <div className={`${styles.field} ${styles.fieldNarrow}`}>
            <span className={styles.label}>Role</span>
            <Select
              label="Invite role"
              value={role}
              onValueChange={(v) => setRole(v as WorkspaceRole)}
              options={ROLE_OPTIONS}
            />
          </div>
        </div>
        {submitted && error !== null ? (
          <span className={styles.error}>{error}</span>
        ) : (
          <span className={styles.hint}>
            Admins manage workspace settings and billing · Members work across
            every team they join · Guests only see the teams they are added to.
          </span>
        )}
      </form>

      <div className={styles.dialogFooter}>
        <span className={styles.footerNote}>
          Sending the mail needs the invites backend — the row is created either way.
        </span>
        <Button variant="secondary" size={32} onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button variant="primary" size={32} onClick={submit} disabled={error !== null}>
          Send invite
        </Button>
      </div>
    </Dialog>
  );
});
