/**
 * Onboarding runs outside the app shell (no sidebar, no content card).
 *
 * It deliberately mounts NO DataProvider: the first step's whole job is to
 * decide which workspace — and therefore which IndexedDB database — the rest
 * of onboarding writes into. Each step wraps itself in the provider for the
 * workspace it belongs to (see [step]/OnboardingView.tsx).
 */
export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
