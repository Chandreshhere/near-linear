/**
 * Onboarding step list — kept out of the client module so the server route
 * can validate the `[step]` segment (a "use client" export cannot be called
 * from the server, only rendered).
 */

export const ONBOARDING_STEPS = ["profile", "newsletter"] as const;

export type OnboardingStep = (typeof ONBOARDING_STEPS)[number];

export function isOnboardingStep(value: string): value is OnboardingStep {
  return (ONBOARDING_STEPS as readonly string[]).includes(value);
}
