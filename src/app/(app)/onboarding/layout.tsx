import { DataProvider } from "@/lib/data/DataProvider";
import { WORKSPACE } from "@/lib/seed";

/**
 * Onboarding runs outside the app shell (no sidebar, no content card) but
 * still needs the local-first pool: the Profile step writes the User row
 * through the same optimistic transaction queue the app uses.
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DataProvider workspace={WORKSPACE.slug}>{children}</DataProvider>;
}
