"use client";

/**
 * "Create new team…" — the dialog behind the sidebar's "Your teams" + button
 * and the "Create team" button on `/:ws/teams` (MASTER_PROMPT.md §5, §10.6,
 * §17.2 "a new team takes a name, a free identifier used as its issue prefix,
 * and a starting set of workflow statuses").
 *
 * It is REAL: the team row and its six default workflow states are written
 * through the local-first engine (transaction queue → optimistic pool →
 * IndexedDB → other tabs), so the new team shows up in the sidebar, the teams
 * directory, the create-issue team picker and every other team list at once.
 *
 * Mounted once as <CreateTeamDialogHost/> (app layout); anything can open it
 * with openCreateTeamDialog().
 */

import { useCallback, useEffect, useState, type JSX } from "react";
import { useParams, useRouter } from "next/navigation";
import { observer } from "mobx-react-lite";
import { Icon } from "@/components/icons/Icon";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { useSyncClient } from "@/lib/data/DataProvider";
import { CURRENT_USER_ID } from "@/lib/issues/viewPrefs";
import { showToast } from "@/lib/toast";
import {
  TEAM_COLOR_CHOICES,
  TEAM_ICON_CHOICES,
  TEAM_KEY_MAX,
  createTeam,
  deriveTeamKey,
  validateTeamKey,
} from "@/lib/workspace/teams";
import styles from "@/components/workspace/directory.module.css";

const OPEN_EVENT = "linear:create-team:open";

/** Ask the mounted <CreateTeamDialogHost/> to open. */
export function openCreateTeamDialog(): void {
  if (typeof window === "undefined") return; // SSR guard
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export const CreateTeamDialogHost = observer(function CreateTeamDialogHost(): JSX.Element {
  const client = useSyncClient();
  const router = useRouter();
  const { workspace } = useParams<{ workspace: string }>();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  /** Once the identifier is typed by hand it stops following the name. */
  const [keyTouched, setKeyTouched] = useState(false);
  const [icon, setIcon] = useState(TEAM_ICON_CHOICES[0]);
  const [color, setColor] = useState(TEAM_COLOR_CHOICES[0]);
  const [submitted, setSubmitted] = useState(false);

  const reset = useCallback(() => {
    setName("");
    setKey("");
    setKeyTouched(false);
    setIcon(TEAM_ICON_CHOICES[0]);
    setColor(TEAM_COLOR_CHOICES[0]);
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

  const effectiveKey = keyTouched ? key : deriveTeamKey(name);
  const nameError = name.trim() === "" ? "Give the team a name." : null;
  // Computed during render (not memoized) so observer() re-validates the
  // moment another tab adds a team with the same identifier.
  const keyError = validateTeamKey(client.store, effectiveKey);
  const valid = nameError === null && keyError === null;

  const submit = (): void => {
    setSubmitted(true);
    if (!valid) return;
    const team = createTeam(
      client,
      { name, key: effectiveKey, icon, color },
      CURRENT_USER_ID,
    );
    setOpen(false);
    showToast(`Created ${team.name} (${team.key})`);
    router.push(`/${workspace}/team/${team.key}/all`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen} width={520} label="Create a team">
      <div className={styles.dialogHeader}>
        <span className={styles.dialogTitle}>Create a team</span>
        <span className={styles.dialogSub}>
          Teams own their own issues, statuses, projects and views. The
          identifier becomes the prefix of every issue the team files.
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
            <label className={styles.label} htmlFor="new-team-name">
              Team name
            </label>
            <Input
              id="new-team-name"
              inputSize="sm"
              value={name}
              autoFocus
              maxLength={48}
              placeholder="e.g. Design"
              onChange={(e) => setName(e.currentTarget.value)}
            />
            {submitted && nameError !== null ? (
              <span className={styles.error}>{nameError}</span>
            ) : null}
          </div>
          <div className={`${styles.field} ${styles.fieldNarrow}`}>
            <label className={styles.label} htmlFor="new-team-key">
              Identifier
            </label>
            <Input
              id="new-team-key"
              inputSize="sm"
              className={styles.mono}
              value={effectiveKey}
              maxLength={TEAM_KEY_MAX}
              spellCheck={false}
              autoComplete="off"
              aria-describedby="new-team-key-hint"
              onChange={(e) => {
                setKeyTouched(true);
                setKey(e.currentTarget.value.toUpperCase().replace(/[^A-Z0-9]/g, ""));
              }}
            />
          </div>
        </div>
        <span
          id="new-team-key-hint"
          className={keyError !== null && (submitted || keyTouched) ? styles.error : styles.hint}
        >
          {keyError !== null && (submitted || keyTouched)
            ? keyError
            : `Issues will be numbered ${effectiveKey === "" ? "KEY" : effectiveKey}-1, ${effectiveKey === "" ? "KEY" : effectiveKey}-2, …`}
        </span>

        <div className={styles.field}>
          <span className={styles.label}>Icon</span>
          <div className={styles.choiceGrid} role="group" aria-label="Team icon">
            {TEAM_ICON_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                className={styles.choice}
                aria-label={choice}
                aria-pressed={icon === choice}
                onClick={() => setIcon(choice)}
              >
                <Icon name={choice} size={16} color={icon === choice ? color : undefined} />
              </button>
            ))}
          </div>
        </div>

        <div className={styles.field}>
          <span className={styles.label}>Color</span>
          <div className={styles.choiceGrid} role="group" aria-label="Team color">
            {TEAM_COLOR_CHOICES.map((choice) => (
              <button
                key={choice}
                type="button"
                className={styles.swatch}
                style={{ background: choice }}
                aria-label={`Color ${choice}`}
                aria-pressed={color === choice}
                onClick={() => setColor(choice)}
              />
            ))}
          </div>
        </div>

        <div className={styles.previewRow}>
          <Icon name={icon} size={16} color={color} />
          {name.trim() === "" ? "New team" : name.trim()}
          <span className={styles.chip}>{effectiveKey === "" ? "KEY" : effectiveKey}</span>
        </div>
      </form>

      <div className={styles.dialogFooter}>
        <span className={styles.footerNote}>
          Starts with Backlog · Todo · In Progress · Done · Canceled · Duplicate
        </span>
        <Button variant="secondary" size={32} onClick={() => setOpen(false)}>
          Cancel
        </Button>
        <Button variant="primary" size={32} onClick={submit} disabled={!valid}>
          Create
        </Button>
      </div>
    </Dialog>
  );
});
