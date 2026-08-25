"use client";

import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import {
  SettingsCard,
  SettingsCustomRow,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import { useLocalPrefs } from "@/components/settings/localPrefs";
import {
  AGENT_PREFS_DEFAULTS,
  AGENT_PREFS_KEY,
  type AgentPersonalization,
} from "@/lib/agent/personalization";
import styles from "@/components/settings/settings.module.css";

/**
 * Settings → Account → Agent personalization. Personal instructions and reply
 * style, applied to every agent run.
 *
 * These are not decorative: `LocalAgentAdapter` (lib/agent/engine.ts) reads
 * this exact record through `readAgentPersonalization()` on every send and
 * shapes its answer with it — switching Response style visibly changes the
 * next reply, and standing instructions are echoed in the capability card so
 * you can confirm they are in effect. The shape lives in
 * lib/agent/personalization.ts so the settings page and the adapter cannot
 * drift; a hosted model adapter would send the same object as its
 * system-prompt preamble.
 */

export function AgentPersonalizationView() {
  const [prefs, patch] = useLocalPrefs<AgentPersonalization>(
    AGENT_PREFS_KEY,
    AGENT_PREFS_DEFAULTS,
  );

  return (
    <>
      <SettingsPageHeader
        title="Agent personalization"
        description="How the agent should work with you — applied to every new chat."
      />

      <SettingsSections>
        <SettingsSection
          id="instructions"
          title="Personal instructions"
          description="Included with every request you make to the agent. Saved as you type."
        >
          <SettingsCard>
            <SettingsCustomRow>
              <span className={styles.fieldStack}>
                <label className={styles.fieldLabel} htmlFor="agent-instructions">
                  Instructions
                </label>
                <textarea
                  id="agent-instructions"
                  className={styles.textarea}
                  maxLength={2000}
                  placeholder="e.g. Prefer short answers. Always link the issue identifier. Write updates in British English."
                  value={prefs.instructions}
                  onChange={(e) => patch({ instructions: e.currentTarget.value })}
                />
                <span className={styles.fieldHint}>
                  {prefs.instructions.length} / 2000 characters
                </span>
              </span>
            </SettingsCustomRow>
          </SettingsCard>
        </SettingsSection>

        <SettingsSection id="behavior" title="Behavior">
          <SettingsCard>
            <SettingsRow
              label="Response style"
              description="How much detail the agent includes by default"
              control={
                <Select
                  className={styles.select}
                  label="Response style"
                  value={prefs.style}
                  onValueChange={(value) =>
                    patch({
                      style:
                        value === "concise"
                          ? "concise"
                          : value === "detailed"
                            ? "detailed"
                            : "balanced",
                    })
                  }
                  options={[
                    { value: "concise", label: "Concise" },
                    { value: "balanced", label: "Balanced" },
                    { value: "detailed", label: "Detailed" },
                  ]}
                />
              }
            />
            <SettingsRow
              label="Use my profile"
              description="Let the agent use your name, title and team memberships for context"
              control={
                <Toggle
                  checked={prefs.useProfile}
                  onChange={(v) => patch({ useProfile: v })}
                  aria-label="Use my profile"
                />
              }
            />
          </SettingsCard>
        </SettingsSection>
      </SettingsSections>
    </>
  );
}
