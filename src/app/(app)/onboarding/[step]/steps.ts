/**
 * Onboarding step list — kept out of the client module so the server route
 * can validate the `[step]` segment (a "use client" export cannot be called
 * from the server, only rendered).
 *
 * `workspace` comes FIRST: until it has run there is no workspace to write a
 * profile into (MASTER_PROMPT.md §17.2 — the workspace and its default team
 * are the first rows an account ever creates).
 */

export const ONBOARDING_STEPS = ["workspace", "profile", "newsletter"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function isOnboardingStep(value: string): value is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}

/** Accessible label for the progress dots. */
export const STEP_LABEL: Record<OnboardingStep, string> = {
  workspace: "Workspace",
  profile: "Profile",
  newsletter: "Newsletter",
};
