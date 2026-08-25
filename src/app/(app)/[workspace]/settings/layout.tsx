import { SettingsShell } from "@/components/settings/SettingsShell";

/**
 * Settings replaces the normal app chrome (capture-preferences.md §1).
 * `AppShell` detects the `/settings` prefix and renders nothing but its
 * children, so this layout owns the full frame below the workspace provider.
 */
export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return <SettingsShell workspace={workspace}>{children}</SettingsShell>;
}
