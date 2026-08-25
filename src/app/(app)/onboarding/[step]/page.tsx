import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OnboardingView } from "./OnboardingView";
import { isOnboardingStep } from "./steps";

export const metadata: Metadata = { title: "Get started" };

export default async function OnboardingStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  if (!isOnboardingStep(step)) redirect("/onboarding/workspace");
  return <OnboardingView step={step} />;
}
