import { AppShell } from "@/components/shell/AppShell";
import { CreateIssueHost } from "@/components/issues/CreateIssueModal";
import { InvitePeopleDialogHost } from "@/components/members/InvitePeopleDialog";
import { CommandPaletteHost } from "@/components/nav/CommandPalette";
import { FavoritesHost } from "@/components/nav/Favorites";
import { PeekHost } from "@/components/nav/Peek";
import { ShortcutsDialogHost } from "@/components/nav/ShortcutsDialog";
import { TeamGotoShortcuts } from "@/components/nav/TeamGotoShortcuts";
import { SettingsEffects } from "@/components/settings/SettingsEffects";
import { TooltipProvider } from "@/components/ui/Tooltip";
import { WorkspaceGuard } from "@/components/shell/WorkspaceGuard";
import { CreateTeamDialogHost } from "@/components/teams/CreateTeamDialog";
import { DataProvider } from "@/lib/data/DataProvider";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspace: string }>;
}) {
  const { workspace } = await params;
  return (
    <DataProvider workspace={workspace}>
      {/* One provider for the whole workspace: any surface may render a
          Tooltip (property chips, row affordances, panels) and Radix throws
          outside a provider. Views that mount their own nest harmlessly. */}
      <TooltipProvider>
      {/* Projects the UserSettings row onto <html> (theme, font size,
          cursor policy, link underlines) app-wide, not just in Settings. */}
      <SettingsEffects />
      {/* A slug with no workspace behind it (stale bookmark, wiped browser)
          goes to onboarding rather than rendering an empty shell. */}
      <WorkspaceGuard workspace={workspace} />
      <AppShell workspace={workspace}>{children}</AppShell>
      <CreateIssueHost />
      <CommandPaletteHost />
      <ShortcutsDialogHost />
      <PeekHost />
      <FavoritesHost />
      {/* §22 goto sequences (G V cycles / G T triage) resolved off the route. */}
      <TeamGotoShortcuts />
      {/* Workspace-level dialogs opened from several surfaces (sidebar +
          menu, More menu, workspace menu, Members / Teams pages). */}
      <CreateTeamDialogHost />
      <InvitePeopleDialogHost />
      </TooltipProvider>
    </DataProvider>
  );
}
