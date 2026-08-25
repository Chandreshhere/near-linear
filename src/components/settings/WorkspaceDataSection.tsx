"use client";

/**
 * Settings → Preferences → "Workspace data".
 *
 * Two honest, local operations on the data this browser holds:
 *
 *   Load demo data   — merges the §26 fixture data set (10 projects, issues,
 *                      cycles, triage, a second member) into the workspace you
 *                      are in, without touching its name or your preferences.
 *                      The same data `?demo=1` sets up, on demand.
 *   Reset workspace  — wipes this workspace's IndexedDB database and the
 *                      localStorage keys that point at it, then returns to
 *                      onboarding. Irreversible; there is no server copy.
 *
 * Both are behind confirm dialogs and both go through the engine (see
 * src/lib/data/demo.ts). Neither is a "backend seam" — they are complete.
 */

import { useState } from "react";
import { observer } from "mobx-react-lite";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  SettingsCard,
  SettingsRow,
  SettingsSection,
} from "@/components/settings/SettingsPage";
import { useSyncClient } from "@/lib/data/DataProvider";
import { loadDemoDataInto, resetWorkspace } from "@/lib/data/demo";
import { showToast } from "@/lib/toast";
import styles from "@/components/workspace/directory.module.css";

type Pending = "demo" | "reset" | null;

export const WorkspaceDataSection = observer(function WorkspaceDataSection() {
  const client = useSyncClient();
  const [pending, setPending] = useState<Pending>(null);
  const [busy, setBusy] = useState(false);

  const workspaceName = client.store.all("Workspace")[0]?.name ?? "this workspace";
  const issueCount = client.store.all("Issue").length;
  const projectCount = client.store.all("Project").length;

  const confirmDemo = (): void => {
    const created = loadDemoDataInto(client);
    setPending(null);
    showToast(
      created === 0
        ? "Demo data is already loaded"
        : `Loaded demo data — ${created} rows`,
    );
  };

  const confirmReset = (): void => {
    setBusy(true);
    void resetWorkspace(client)
      .then(() => {
        // Full navigation: every SyncClient, BroadcastChannel and observer for
        // the old workspace goes away with the document.
        window.location.assign("/onboarding/workspace");
      })
      .catch(() => {
        setBusy(false);
        setPending(null);
        showToast("Could not reset local data");
      });
  };

  return (
    <>
      <SettingsSection id="workspace-data" title="Workspace data">
        <SettingsCard>
          <SettingsRow
            id="workspace-data-demo"
            label="Load demo data"
            description="Fill this workspace with the sample projects, issues, cycles and triage queue used for screenshots. Your workspace name and preferences are left alone."
            control={
              <Button size={28} onClick={() => setPending("demo")}>
                Load demo data
              </Button>
            }
          />
          <SettingsRow
            id="workspace-data-reset"
            label="Reset workspace"
            description="Erase everything stored in this browser for this workspace and start over from onboarding. This cannot be undone — nothing is stored anywhere else."
            control={
              <Button size={28} onClick={() => setPending("reset")}>
                Reset workspace
              </Button>
            }
          />
        </SettingsCard>
      </SettingsSection>

      <Dialog
        open={pending === "demo"}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
        width={460}
        label="Load demo data"
      >
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Load demo data?</span>
          <span className={styles.dialogSub}>
            This adds the sample teams, projects, issues, cycles and triage
            queue to {workspaceName}. Nothing already in the workspace is
            changed or removed — rows that already exist are skipped.
          </span>
        </div>
        <div className={styles.dialogFooter}>
          <Button variant="secondary" size={32} onClick={() => setPending(null)}>
            Cancel
          </Button>
          <Button variant="primary" size={32} onClick={confirmDemo}>
            Load demo data
          </Button>
        </div>
      </Dialog>

      <Dialog
        open={pending === "reset"}
        onOpenChange={(open) => {
          if (!open && !busy) setPending(null);
        }}
        width={460}
        label="Reset workspace"
      >
        <div className={styles.dialogHeader}>
          <span className={styles.dialogTitle}>Reset {workspaceName}?</span>
          <span className={styles.dialogSub}>
            {projectCount} project{projectCount === 1 ? "" : "s"} and{" "}
            {issueCount} issue{issueCount === 1 ? "" : "s"} will be permanently
            deleted from this browser, along with your session. You will be
            returned to onboarding to create a new workspace. This cannot be
            undone.
          </span>
        </div>
        <div className={styles.dialogFooter}>
          <Button
            variant="secondary"
            size={32}
            disabled={busy}
            onClick={() => setPending(null)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size={32}
            disabled={busy}
            onClick={confirmReset}
          >
            {busy ? "Resetting…" : "Reset workspace"}
          </Button>
        </div>
      </Dialog>
    </>
  );
});
