"use client";

import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Toggle } from "@/components/ui/Toggle";
import {
  SettingsCard,
  SettingsPageHeader,
  SettingsRow,
  SettingsSection,
  SettingsSections,
} from "@/components/settings/SettingsPage";
import { SidebarCustomizeDialog } from "@/components/settings/SidebarCustomizeDialog";
import { useUserSettings } from "@/components/settings/useUserSettings";
import {
  DEFAULT_APPEARANCE,
  THEME_CHIP,
  applyTheme,
  readAppearance,
  resolveTheme,
  writeAppearance,
  type AppearanceMap,
  type ThemeName,
  type ThemeSetting,
} from "@/components/settings/theme";
import styles from "@/components/settings/settings.module.css";

/**
 * Preferences (CAPTURED, exact — capture-preferences.md §6, MASTER_PROMPT
 * §10.9): four sections, the captured row ids, labels, descriptions and
 * control types. Every control is bound to the `UserSettings` row through the
 * optimistic transaction queue, and the interface prefs additionally project
 * onto the document (see SettingsEffects).
 */

function ThemeChip({ theme }: { theme: ThemeName }) {
  const chip = THEME_CHIP[theme];
  return (
    <span
      className={styles.themeChip}
      style={{
        background: chip.bg,
        color: chip.fg,
        ["--chip-accent" as string]: chip.accent,
      }}
      aria-hidden="true"
    >
      Aa
    </span>
  );
}

function ThemeOption({ theme, label }: { theme: ThemeName; label: string }) {
  return (
    <span className={styles.selectValue}>
      <ThemeChip theme={theme} />
      {label}
    </span>
  );
}

export const PreferencesView = observer(function PreferencesView() {
  const { settings, patch } = useUserSettings();
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [appearance, setAppearance] = useState<AppearanceMap>(DEFAULT_APPEARANCE);

  useEffect(() => {
    setAppearance(readAppearance());
  }, []);

  const setAppearanceFor = (key: keyof AppearanceMap, value: ThemeName) => {
    const next: AppearanceMap = { ...appearance, [key]: value };
    setAppearance(next);
    writeAppearance(next);
    window.dispatchEvent(new Event("linear:appearance"));
    applyTheme(resolveTheme(settings.theme, next));
  };

  const setTheme = (value: ThemeSetting) => {
    patch({ theme: value });
    applyTheme(resolveTheme(value, appearance));
  };

  const effectiveTheme = resolveTheme(settings.theme, appearance);

  return (
    <>
      <SettingsPageHeader title="Preferences" />

      <SettingsSections>
        {/* ---------------- General ---------------- */}
        <SettingsSection id="general" title="General">
          <SettingsCard>
            <SettingsRow
              id="display-home"
              label="Default home view"
              description="Select which view to display when launching Linear"
              control={
                <Select
                  className={styles.select}
                  label="Default home view"
                  value={settings.homeView}
                  onValueChange={(value) => patch({ homeView: value })}
                  options={[
                    {
                      value: "agent",
                      label: (
                        <span className={styles.selectValue}>
                          Linear Agent&nbsp;
                          <span className={styles.mutedSuffix}>(default)</span>
                        </span>
                      ),
                    },
                    { value: "inbox", label: "Inbox" },
                    { value: "my-issues", label: "My Issues" },
                    { value: "projects", label: "Projects" },
                    { value: "views", label: "Views" },
                  ]}
                />
              }
            />
            <SettingsRow
              id="display-names"
              label="Display names"
              description="Select how names are displayed in the Linear interface"
              control={
                <Select
                  className={styles.select}
                  label="Display names"
                  value={settings.displayFullNames ? "full" : "username"}
                  onValueChange={(value) =>
                    patch({ displayFullNames: value === "full" })
                  }
                  options={[
                    { value: "full", label: "Full name" },
                    { value: "username", label: "Username" },
                  ]}
                />
              }
            />
            <SettingsRow
              id="display-first-weekday"
              label="First day of the week"
              description="Used for date pickers"
              control={
                <Select
                  className={styles.select}
                  label="First day of the week"
                  value={settings.firstDayOfWeek}
                  onValueChange={(value) =>
                    patch({ firstDayOfWeek: value === "Sunday" ? "Sunday" : "Monday" })
                  }
                  options={[
                    { value: "Monday", label: "Monday" },
                    { value: "Sunday", label: "Sunday" },
                  ]}
                />
              }
            />
            <SettingsRow
              id="behaviors-convert-emojis"
              label="Convert text emoticons into emojis"
              description={
                <>
                  Strings like :) will be converted to{" "}
                  <span data-type="emoji">🙂</span>
                </>
              }
              control={
                <Toggle
                  checked={settings.convertEmoticons}
                  onChange={(v) => patch({ convertEmoticons: v })}
                  aria-label="Convert text emoticons into emojis"
                />
              }
            />
            <SettingsRow
              id="behaviors-send-comment-on"
              label="Send comments on…"
              description="Choose which key press is used to submit comments"
              control={
                <Select
                  className={styles.select}
                  label="Send comments on"
                  value={settings.commentSubmitKey}
                  onValueChange={(value) =>
                    patch({
                      commentSubmitKey: value === "ModEnter" ? "ModEnter" : "Enter",
                    })
                  }
                  options={[
                    { value: "Enter", label: "Enter" },
                    { value: "ModEnter", label: "⌘ + Enter" },
                  ]}
                />
              }
            />
          </SettingsCard>
        </SettingsSection>

        {/* ---------------- Interface and theme ---------------- */}
        <SettingsSection id="interface-and-theme" title="Interface and theme">
          <SettingsCard>
            <SettingsRow
              id="app-sidebar"
              label="App sidebar"
              description="Customize sidebar item visibility, ordering, and badge style"
              control={
                <Button
                  variant="ghost"
                  size={32}
                  aria-label="Customize sidebar"
                  data-menu-open={customizeOpen ? "true" : undefined}
                  onClick={() => setCustomizeOpen(true)}
                >
                  Customize
                </Button>
              }
            />
            <SettingsRow
              id="display-font"
              label="Font size"
              description="Adjust the size of text across the app"
              control={
                <Select
                  className={styles.select}
                  label="Font size"
                  value={settings.fontSize}
                  onValueChange={(value) =>
                    patch({
                      fontSize:
                        value === "small" ? "small" : value === "large" ? "large" : "default",
                    })
                  }
                  options={[
                    { value: "small", label: "Small" },
                    { value: "default", label: "Default" },
                    { value: "large", label: "Large" },
                  ]}
                />
              }
            />
            <SettingsRow
              id="display-pointer-cursor"
              label="Use pointer cursors"
              description="Change the cursor to a pointer when hovering over any interactive elements"
              control={
                <Toggle
                  checked={settings.pointerCursor}
                  onChange={(v) => patch({ pointerCursor: v })}
                  aria-label="Use pointer cursors"
                />
              }
            />
            <SettingsRow
              id="display-underline-links"
              label="Underline links"
              description="Always underline links in text content"
              control={
                <Toggle
                  checked={settings.underlineLinks}
                  onChange={(v) => patch({ underlineLinks: v })}
                  aria-label="Underline links"
                />
              }
            />
            <SettingsRow
              id="display-autoplay-animated-images"
              label="Disable animated images & emoji"
              description="When enabled, GIFs and animated emojis will be static by default and animate only on hover."
              control={
                <Toggle
                  checked={settings.disableAnimations}
                  onChange={(v) => patch({ disableAnimations: v })}
                  aria-label="Disable animated images and emoji"
                />
              }
            />
          </SettingsCard>

          {/* second card: theme + the system-appearance drawer */}
          <SettingsCard>
            <SettingsRow
              id="interface-theme"
              label="Interface theme"
              description="Select or customize your interface color scheme"
              control={
                <Select
                  className={styles.select}
                  label="Interface theme"
                  value={settings.theme}
                  onValueChange={(value) =>
                    setTheme(
                      value === "light" ? "light" : value === "dark" ? "dark" : "system",
                    )
                  }
                  options={[
                    {
                      value: "system",
                      label: (
                        <ThemeOption theme={effectiveTheme} label="System preference" />
                      ),
                    },
                    { value: "light", label: <ThemeOption theme="light" label="Light" /> },
                    { value: "dark", label: <ThemeOption theme="dark" label="Dark" /> },
                  ]}
                />
              }
            />
            <li>
              <div className={styles.drawer} data-open={settings.theme === "system"}>
                <div className={styles.drawerInner}>
                  <ul className={styles.list} aria-hidden={settings.theme !== "system"}>
                    <SettingsRow
                      id="theme-system-light-appearance"
                      label="Light"
                      description="Theme to use for light system appearance"
                      control={
                        <Select
                          className={styles.select}
                          label="Theme for light system appearance"
                          value={appearance.light}
                          onValueChange={(value) =>
                            setAppearanceFor("light", value === "dark" ? "dark" : "light")
                          }
                          options={[
                            { value: "light", label: <ThemeOption theme="light" label="Light" /> },
                            { value: "dark", label: <ThemeOption theme="dark" label="Dark" /> },
                          ]}
                        />
                      }
                    />
                    <SettingsRow
                      id="theme-system-dark-appearance"
                      label="Dark"
                      description="Theme to use for dark system appearance"
                      control={
                        <Select
                          className={styles.select}
                          label="Theme for dark system appearance"
                          value={appearance.dark}
                          onValueChange={(value) =>
                            setAppearanceFor("dark", value === "light" ? "light" : "dark")
                          }
                          options={[
                            { value: "light", label: <ThemeOption theme="light" label="Light" /> },
                            { value: "dark", label: <ThemeOption theme="dark" label="Dark" /> },
                          ]}
                        />
                      }
                    />
                  </ul>
                </div>
              </div>
            </li>
          </SettingsCard>
        </SettingsSection>

        {/* ---------------- Desktop application ---------------- */}
        <SettingsSection id="desktop-application" title="Desktop application">
          <SettingsCard>
            <SettingsRow
              id="behaviors-open-desktop"
              label="Open in desktop app"
              description="Automatically open links in desktop app when possible"
              control={
                <Toggle
                  checked={settings.openInDesktop}
                  onChange={(v) => patch({ openInDesktop: v })}
                  aria-label="Open in desktop app"
                />
              }
            />
          </SettingsCard>
        </SettingsSection>

        {/* ---------------- Automations and workflows ---------------- */}
        <SettingsSection id="automations-and-workflows" title="Automations and workflows">
          <SettingsCard>
            <SettingsRow
              id="behaviors-assign-issues-self"
              label="Auto-assign to self"
              description="When creating new issues, always assign them to yourself by default"
              control={
                <Toggle
                  checked={settings.autoAssignSelf}
                  onChange={(v) => patch({ autoAssignSelf: v })}
                  aria-label="Auto-assign to self"
                />
              }
            />
            <SettingsRow
              id="behaviors-git-auto-assign"
              label="On move to started status, assign to yourself"
              description="When you move an unassigned issue to started, it will be automatically assigned to you"
              control={
                <Toggle
                  checked={settings.assignOnStart}
                  onChange={(v) => patch({ assignOnStart: v })}
                  aria-label="On move to started status, assign to yourself"
                />
              }
            />
          </SettingsCard>
        </SettingsSection>
      </SettingsSections>

      <SidebarCustomizeDialog open={customizeOpen} onOpenChange={setCustomizeOpen} />
    </>
  );
});
