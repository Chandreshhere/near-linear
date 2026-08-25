"use client";

/**
 * Onboarding shell (CAPTURED — capture-inbox-welcome-to-linear.md §6,
 * MASTER_PROMPT §17.2/§17.3). Three steps: Workspace → Profile → Newsletter.
 *
 * The first step has no workspace to write into yet — it is what CREATES one —
 * so the shell mounts the DataProvider per step rather than around the whole
 * flow: step 1 runs provider-less, steps 2–3 run inside the provider for the
 * workspace step 1 produced. Landing on a later step without a workspace (a
 * bookmark, a reload after clearing storage) bounces back to step 1 rather
 * than rendering against an empty pool.
 */

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { DataProvider } from "@/lib/data/DataProvider";
import { isOnboarded, markOnboarded, markStepReached } from "@/lib/auth/session";
import { readActiveWorkspace, useActiveWorkspace } from "@/lib/workspace/active";
import type { ProvisionedWorkspace } from "@/lib/workspace/workspaces";
import { ProfileStep } from "./ProfileStep";
import { WorkspaceStep } from "./WorkspaceStep";
import { ONBOARDING_STEPS, STEP_LABEL, type OnboardingStep } from "./steps";
import styles from "./onboarding.module.css";

export function OnboardingView({ step }: { step: OnboardingStep }) {
  const router = useRouter();
  const activeSlug = useActiveWorkspace();
  /** localStorage is only readable after hydration — see useActiveWorkspace. */
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    markStepReached(step);
  }, [step]);

  // A later step with no workspace yet is not a state the user can act in.
  useEffect(() => {
    if (!mounted || step === "workspace" || activeSlug !== null) return;
    router.replace("/onboarding/workspace");
  }, [activeSlug, mounted, router, step]);

  const goNext = useCallback(() => {
    const next = ONBOARDING_STEPS[ONBOARDING_STEPS.indexOf(step) + 1];
    if (next !== undefined) {
      router.push(`/onboarding/${next}`);
      return;
    }
    markOnboarded();
    const slug = readActiveWorkspace();
    router.replace(slug === null ? "/onboarding/workspace" : `/${slug}/agent`);
  }, [router, step]);

  /**
   * Creating the FIRST workspace continues into the profile steps. A returning
   * user adding a second one (workspace menu → "Create a workspace") has
   * already done those, so they go straight into what they just made.
   */
  const onWorkspaceCreated = useCallback(
    (workspace: ProvisionedWorkspace) => {
      if (isOnboarded()) {
        router.replace(workspace.homeHref);
        return;
      }
      goNext();
    },
    [goNext, router],
  );

  return (
    <div className={styles.screen}>
      {/* Skip-link target — onboarding renders outside AppShell, so the
          layout's "Skip to content" link needs one here (see LoginView). */}
      <div id="skip-nav" tabIndex={-1} />
      <section className={styles.formPane}>
        <div className={styles.column}>
          {step === "workspace" ? (
            <WorkspaceStep onCreated={onWorkspaceCreated} />
          ) : activeSlug === null ? null : (
            <DataProvider workspace={activeSlug}>
              <ProfileStep step={step} onNext={goNext} onSkip={goNext} />
            </DataProvider>
          )}
        </div>
      </section>

      <section className={styles.mediaPane} aria-hidden="true">
        <div className={styles.mesh}>
          <span className={`${styles.blob} ${styles.blobA}`} />
          <span className={`${styles.blob} ${styles.blobB}`} />
          <span className={`${styles.blob} ${styles.blobC}`} />
          <span className={`${styles.blob} ${styles.blobD}`} />
        </div>
        <div className={styles.grid} />
        <div className={styles.scrim} />
      </section>

      <nav className={styles.steps} aria-label="Onboarding progress">
        <div className={styles.stepsTrack}>
          {ONBOARDING_STEPS.map((name) => (
            <button
              key={name}
              type="button"
              tabIndex={-1}
              className={styles.step}
              aria-label={STEP_LABEL[name]}
              aria-current={name === step ? "step" : undefined}
              onClick={() => {
                // Steps after the first need a workspace to write into.
                if (name !== "workspace" && readActiveWorkspace() === null) return;
                router.push(`/onboarding/${name}`);
              }}
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
