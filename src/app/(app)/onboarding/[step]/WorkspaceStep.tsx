"use client";

/**
 * Onboarding step 1 — create the workspace (MASTER_PROMPT.md §17.2).
 *
 * This is the step that makes the app genuinely multi-tenant-per-browser: the
 * name typed here becomes a real `Workspace` row, the URL becomes both the
 * route prefix and the IndexedDB database, and — per the documented behaviour —
 * a first team named after the workspace is auto-created with its identifier
 * and the six default workflow statuses. Nothing is invented for the user.
 *
 * It deliberately runs WITHOUT a DataProvider: the workspace it is about to
 * create is the thing that decides which database a provider would open.
 * `provisionWorkspace` boots that workspace's own SyncClient and writes
 * through the ordinary transaction queue.
 */

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { showToast } from "@/lib/toast";
import {
  SLUG_MAX,
  readKnownWorkspaces,
  slugifyWorkspace,
  validateWorkspaceSlug,
} from "@/lib/workspace/active";
import { deriveWorkspaceTeamKey } from "@/lib/workspace/teams";
import {
  provisionWorkspace,
  type ProvisionedWorkspace,
} from "@/lib/workspace/workspaces";
import styles from "./onboarding.module.css";

export function WorkspaceStep({
  onCreated,
}: {
  onCreated: (workspace: ProvisionedWorkspace) => void;
}) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  /** Once the URL is typed by hand it stops following the name. */
  const [slugTouched, setSlugTouched] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [taken, setTaken] = useState<string[]>([]);
  /** window.location.host is browser-only — read it after mount. */
  const [host, setHost] = useState("");

  useEffect(() => {
    setHost(window.location.host);
    setTaken(readKnownWorkspaces().map((w) => w.slug));
  }, []);

  const effectiveSlug = slugTouched ? slug : slugifyWorkspace(name);
  const nameError = name.trim() === "" ? "Give your workspace a name." : null;
  const slugError = validateWorkspaceSlug(effectiveSlug, taken);
  const valid = nameError === null && slugError === null;
  const showSlugError = slugError !== null && (submitted || slugTouched);
  const teamKey = deriveWorkspaceTeamKey(name);

  const submit = useCallback(() => {
    setSubmitted(true);
    if (!valid || busy) return;
    setBusy(true);
    void provisionWorkspace({ name: name.trim(), slug: effectiveSlug })
      .then((workspace) => {
        showToast(`Created ${workspace.name} · team ${workspace.teamKey}`);
        onCreated(workspace);
      })
      .catch(() => {
        setBusy(false);
        showToast("That workspace could not be created — check browser storage");
      });
  }, [busy, effectiveSlug, name, onCreated, valid]);

  return (
    <>
      <header className={styles.heading}>
        <h1 className={styles.title}>Create your workspace</h1>
        <span className={styles.subtitle}>
          Where your team&rsquo;s issues, projects and cycles live
        </span>
      </header>

      <form
        className={styles.form}
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="onboarding-workspace-name">
            Workspace name
          </label>
          <Input
            id="onboarding-workspace-name"
            autoComplete="off"
            autoFocus
            maxLength={48}
            placeholder="Acme Labs"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          {submitted && nameError !== null ? (
            <span className={styles.error} role="alert">
              {nameError}
            </span>
          ) : null}
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="onboarding-workspace-url">
            Workspace URL
          </label>
          <div className={styles.urlRow}>
            <span className={styles.urlPrefix} aria-hidden="true">
              {host === "" ? "/" : `${host}/`}
            </span>
            <Input
              id="onboarding-workspace-url"
              className={styles.urlInput}
              autoComplete="off"
              spellCheck={false}
              maxLength={SLUG_MAX}
              placeholder="acme-labs"
              aria-describedby="onboarding-workspace-url-hint"
              value={effectiveSlug}
              onChange={(e) => {
                setSlugTouched(true);
                setSlug(
                  e.currentTarget.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                );
              }}
            />
          </div>
          <span
            id="onboarding-workspace-url-hint"
            className={showSlugError ? styles.error : styles.hint}
            role={showSlugError ? "alert" : undefined}
          >
            {showSlugError ? (
              slugError
            ) : (
              <>
                Your workspace will live at{" "}
                <code>
                  {host === "" ? "" : `${host}/`}
                  {effectiveSlug === "" ? "your-workspace" : effectiveSlug}
                </code>
              </>
            )}
          </span>
        </div>

        <div className={styles.summary}>
          <span className={styles.summaryRow}>
            Creating a workspace also creates your first team:
          </span>
          <span className={styles.summaryRow}>
            <span className={styles.chip}>{teamKey === "" ? "KEY" : teamKey}</span>
            {name.trim() === "" ? "Your team" : name.trim()} — issues numbered{" "}
            {teamKey === "" ? "KEY" : teamKey}-1, {teamKey === "" ? "KEY" : teamKey}-2, …
          </span>
          <span className={styles.summaryRow}>
            with Backlog · Todo · In Progress · Done · Canceled · Duplicate.
          </span>
        </div>
      </form>

      <div className={styles.actions}>
        <Button
          variant="primary"
          size={44}
          onClick={submit}
          disabled={!valid || busy}
        >
          {busy ? "Creating…" : "Create workspace"}
        </Button>
      </div>
    </>
  );
}
