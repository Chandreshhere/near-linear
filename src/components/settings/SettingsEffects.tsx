"use client";

import { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { useUserSettings } from "./useUserSettings";
import {
  applyTheme,
  readAppearance,
  resolveTheme,
  FONT_SIZE_PX,
  type AppearanceMap,
} from "./theme";

/**
 * Projects the `UserSettings` row onto the document. Mounted once inside the
 * workspace layout (not the settings layout) so a preference applies
 * everywhere, not just while Settings is open:
 *
 *   theme          → html.dark + splashScreenConfig (pre-paint on reload, §3)
 *   fontSize       → root font-size (the whole rem scale follows)
 *   pointerCursor  → --pointer (cursor policy, §2.5)
 *   underlineLinks → html.underline-links
 *   disableAnimations → html.static-media
 */
export const SettingsEffects = observer(function SettingsEffects() {
  const { settings, loaded } = useUserSettings();
  const [appearance, setAppearance] = useState<AppearanceMap | null>(null);

  // localStorage is browser-only — read it after mount to keep SSR pure.
  useEffect(() => {
    setAppearance(readAppearance());
    const onStorage = () => setAppearance(readAppearance());
    window.addEventListener("storage", onStorage);
    window.addEventListener("linear:appearance", onStorage);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("linear:appearance", onStorage);
    };
  }, []);

  const theme = settings.theme;

  useEffect(() => {
    if (!loaded || appearance === null) return;
    applyTheme(resolveTheme(theme, appearance));
    if (theme !== "system") return;
    // Follow the OS while "System preference" is selected.
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme(resolveTheme("system", appearance));
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [appearance, loaded, theme]);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.style.fontSize = FONT_SIZE_PX[settings.fontSize];
  }, [loaded, settings.fontSize]);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.style.setProperty(
      "--pointer",
      settings.pointerCursor ? "pointer" : "default",
    );
  }, [loaded, settings.pointerCursor]);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle(
      "underline-links",
      settings.underlineLinks,
    );
  }, [loaded, settings.underlineLinks]);

  useEffect(() => {
    if (!loaded) return;
    document.documentElement.classList.toggle(
      "static-media",
      settings.disableAnimations,
    );
  }, [loaded, settings.disableAnimations]);

  return null;
});
