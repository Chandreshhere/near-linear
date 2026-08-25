"use client";

/**
 * Theme application (MASTER_PROMPT §3): the pre-paint boot script in
 * app/layout.tsx reads `localStorage.splashScreenConfig` and stamps
 * `html.dark` + the four frame colours BEFORE first paint. Everything here
 * writes that same config, so a preference change survives a reload with no
 * flash.
 *
 * "System preference" resolves through `prefers-color-scheme`, and the two
 * sub-selects captured on the Preferences page choose WHICH theme each system
 * appearance maps to.
 */

export type ThemeSetting = "system" | "light" | "dark";
export type ThemeName = "light" | "dark";

export const APPEARANCE_STORAGE_KEY = "linearThemeAppearance";

export interface AppearanceMap {
  light: ThemeName;
  dark: ThemeName;
}

export const DEFAULT_APPEARANCE: AppearanceMap = { light: "light", dark: "dark" };

/** Boot palette (MASTER_PROMPT §2.1) — mirrored into splashScreenConfig. */
const FRAME_COLORS: Record<ThemeName, {
  bgColor: string;
  bgSidebarColor: string;
  bgBaseColor: string;
  bgBorderColor: string;
  themeColor: string;
}> = {
  dark: {
    bgColor: "#09090A",
    bgSidebarColor: "#09090A",
    bgBaseColor: "#121213",
    bgBorderColor: "#212224",
    themeColor: "#09090A",
  },
  light: {
    bgColor: "#EFEFF0",
    bgSidebarColor: "#EFEFF0",
    bgBaseColor: "#F9F9FA",
    bgBorderColor: "#E2E2E2",
    themeColor: "#EFEFF0",
  },
};

export function readAppearance(): AppearanceMap {
  if (typeof window === "undefined") return DEFAULT_APPEARANCE;
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY);
    if (raw === null) return DEFAULT_APPEARANCE;
    const parsed = JSON.parse(raw) as Partial<AppearanceMap>;
    return {
      light: parsed.light === "dark" ? "dark" : "light",
      dark: parsed.dark === "light" ? "light" : "dark",
    };
  } catch {
    return DEFAULT_APPEARANCE;
  }
}

export function writeAppearance(next: AppearanceMap): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function patchSplashConfig(patch: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem("splashScreenConfig");
    const config = raw !== null ? (JSON.parse(raw) as Record<string, unknown>) : {};
    window.localStorage.setItem(
      "splashScreenConfig",
      JSON.stringify({ ...config, ...patch }),
    );
  } catch {
    /* ignore */
  }
}

export function prefersDark(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Which palette a setting resolves to right now. */
export function resolveTheme(
  setting: ThemeSetting,
  appearance: AppearanceMap = readAppearance(),
): ThemeName {
  if (setting === "light" || setting === "dark") return setting;
  return prefersDark() ? appearance.dark : appearance.light;
}

/**
 * Flip `html.dark`, mirror the frame colours into splashScreenConfig and the
 * `theme-color` meta, and suppress transitions during the swap (§3).
 */
export function applyTheme(theme: ThemeName): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const dark = theme === "dark";
  if (html.classList.contains("dark") === dark) {
    // Already correct — still refresh the persisted config below.
  } else {
    html.classList.add("app-theme-transition");
    window.setTimeout(() => html.classList.remove("app-theme-transition"), 0);
  }
  html.classList.toggle("dark", dark);

  const colors = FRAME_COLORS[theme];
  const style = html.style;
  style.setProperty("--bg-color", colors.bgColor);
  style.setProperty("--bg-sidebar-color", colors.bgSidebarColor);
  style.setProperty("--bg-base-color", colors.bgBaseColor);
  style.setProperty("--bg-border-color", colors.bgBorderColor);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta !== null) meta.setAttribute("content", colors.themeColor);

  patchSplashConfig({
    darkMode: dark,
    bgColor: colors.bgColor,
    bgSidebarColor: colors.bgSidebarColor,
    bgBaseColor: colors.bgBaseColor,
    bgBorderColor: colors.bgBorderColor,
  });
}

/** Root font-size ladder for the "Font size" preference. */
export const FONT_SIZE_PX: Record<"small" | "default" | "large", string> = {
  small: "15px",
  default: "16px",
  large: "17px",
};

/** CAPTURED "Aa" chip colours (bg / text / accent). */
export const THEME_CHIP: Record<ThemeName, { bg: string; fg: string; accent: string }> = {
  dark: { bg: "#111212", fg: "#e2e3e5", accent: "#5e69d1" },
  light: { bg: "#f8f8f9", fg: "#2f2f31", accent: "#6d78d5" },
};
