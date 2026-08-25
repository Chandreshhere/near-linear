"use client";

/**
 * "New skill" dialog — MASTER_PROMPT.md §21. Name, slash command,
 * instructions, and personal/team scope (team scope picks a team, matching
 * the documented Settings → Team → AI & Agents split).
 */

import { useEffect, useState, type JSX } from "react";
import { observer } from "mobx-react-lite";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useStore } from "@/lib/data/DataProvider";
import { normalizeSlash, useAgentSkills, type SkillScope } from "@/lib/agent/skills";
import { showToast } from "@/lib/toast";
import styles from "./agent.module.css";

export const NewSkillDialog = observer(function NewSkillDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): JSX.Element {
  const skills = useAgentSkills();
  const store = useStore();

  const [name, setName] = useState("");
  const [slash, setSlash] = useState("");
  const [instructions, setInstructions] = useState("");
  const [scope, setScope] = useState<SkillScope>("personal");
  const [teamId, setTeamId] = useState<string>("");

  const teams = store.all("Team").slice().sort((a, b) => a.sortOrder - b.sortOrder);

  useEffect(() => {
    if (!open) return;
    setName("");
    setSlash("");
    setInstructions("");
    setScope("personal");
    setTeamId(teams[0]?.id ?? "");
    // Team list is stable for the life of the dialog; reset only on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const slashPreview = normalizeSlash(slash) || normalizeSlash(name);
  const valid = name.trim() !== "" && instructions.trim() !== "" && slashPreview !== "";

  const submit = (): void => {
    if (!valid) return;
    skills.create({ name, slash, instructions, scope, teamId });
    showToast(`Created skill /${slashPreview}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} width={520} label="New skill">
      <div className={styles.dialogBody}>
        <h2 className={styles.dialogTitle}>New skill</h2>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="skill-name">
            Name
          </label>
          <Input
            id="skill-name"
            inputSize="sm"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
            placeholder="Weekly update"
            autoFocus
          />
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="skill-slash">
            Slash command
          </label>
          <Input
            id="skill-slash"
            inputSize="sm"
            value={slash}
            onChange={(e) => setSlash(e.currentTarget.value)}
            placeholder="weekly-update"
          />
          <span className={styles.fieldHint}>
            {slashPreview === ""
              ? "Type / in the composer to run a skill."
              : `Runs as /${slashPreview}`}
          </span>
        </div>

        <div className={styles.field}>
          <label className={styles.fieldLabel} htmlFor="skill-instructions">
            Instructions
          </label>
          <textarea
            id="skill-instructions"
            className={styles.textarea}
            value={instructions}
            onChange={(e) => setInstructions(e.currentTarget.value)}
            placeholder="Summarize what changed this week across my teams…"
          />
        </div>

        <div className={styles.field}>
          <span className={styles.fieldLabel}>Availability</span>
          <div className={styles.scopeRow}>
            <button
              type="button"
              className={styles.scopeOption}
              data-selected={scope === "personal" ? "true" : undefined}
              aria-pressed={scope === "personal"}
              onClick={() => setScope("personal")}
            >
              Personal
              <span className={styles.fieldHint}>Only you can run it</span>
            </button>
            <button
              type="button"
              className={styles.scopeOption}
              data-selected={scope === "team" ? "true" : undefined}
              aria-pressed={scope === "team"}
              onClick={() => setScope("team")}
            >
              Team
              <span className={styles.fieldHint}>Everyone in the team</span>
            </button>
          </div>
          {scope === "team" ? (
            <Select
              label="Team"
              value={teamId}
              onValueChange={setTeamId}
              options={teams.map((team) => ({ value: team.id, label: team.name }))}
              placeholder="Select team"
            />
          ) : null}
        </div>
      </div>

      <div className={styles.dialogFooter}>
        <Button variant="ghost" size={28} onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button variant="primary" size={28} disabled={!valid} onClick={submit}>
          Create skill
        </Button>
      </div>
    </Dialog>
  );
});
