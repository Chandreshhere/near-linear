import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./marketing.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const mono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Synquic — the system product teams and agents build in",
  description:
    "Plan, build, review and ship in one place. Synquic is the product development system for teams that work alongside agents.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#08090a",
};

/**
 * Pre-paint theme script. Same contract as the app shell (§ boot): dark is the
 * default; `splashScreenConfig.darkMode === false` opts into light. Kept to the
 * theme only — the marketing root deliberately shares none of the app's frame
 * geometry or splash choreography.
 */
const THEME_SCRIPT = `(function () {
  try {
    var raw =
      sessionStorage.getItem("splashScreenConfig") ||
      localStorage.getItem("splashScreenConfig");
    var c = raw ? JSON.parse(raw) : {};
    var dark = c.darkMode !== false;
    var de = document.documentElement;
    de.classList.toggle("dark", dark);
    /* html.js gates every entrance animation, so nothing is hidden for
       users without scripting (the same guard the capture uses). */
    de.classList.add("js");
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#08090a" : "#ffffff");
  } catch (e) {}
})();`;

/**
 * Marketing root layout.
 *
 * `(marketing)` and `(app)` are sibling ROOT layouts — there is no
 * `src/app/layout.tsx` — so nothing from the product shell (globals.css'
 * fixed body, the boot splash, the icon sprite sheets, the toast viewport)
 * reaches this document.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script id="marketing-theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
