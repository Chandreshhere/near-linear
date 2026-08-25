import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { BootChoreography } from "@/components/shell/BootChoreography";
import { Splash } from "@/components/shell/Splash";
import { Sprites } from "@/components/icons/Sprites";
import { RouteAnnouncer } from "@/components/shell/RouteAnnouncer";
import { ToastViewport } from "@/components/shell/ToastViewport";

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
  title: "Linear Recon",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#09090A",
};

/**
 * Pre-paint boot script (CAPTURED contract): restores theme + frame geometry
 * from localStorage.splashScreenConfig before first paint so the shell renders
 * with the user's exact geometry and zero theme flash.
 */
const BOOT_SCRIPT = `(function () {
  try {
    var raw =
      sessionStorage.getItem("splashScreenConfig") ||
      localStorage.getItem("splashScreenConfig");
    var c = raw ? JSON.parse(raw) : {};
    var de = document.documentElement;
    var dark = c.darkMode !== false; /* dark is the default reference theme */
    de.classList.toggle("dark", dark);
    var s = de.style;
    if (c.bgColor) s.setProperty("--bg-color", c.bgColor);
    if (c.bgSidebarColor) s.setProperty("--bg-sidebar-color", c.bgSidebarColor);
    if (c.bgBaseColor) s.setProperty("--bg-base-color", c.bgBaseColor);
    if (c.bgBorderColor) s.setProperty("--bg-border-color", c.bgBorderColor);
    s.setProperty("--sidebar-width", (c.sidebarWidth || 244) + "px");
    s.setProperty(
      "--agent-toolbar-height",
      (c.agentToolbarHeight != null ? c.agentToolbarHeight : 28) + "px"
    );
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", dark ? "#09090A" : "#EFEFF0");
    performance.mark("appStart");
  } catch (e) {}
})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`dark ${inter.variable} ${mono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <Script id="boot" strategy="beforeInteractive">
          {BOOT_SCRIPT}
        </Script>
      </head>
      <body>
        <div id="root">
          <Sprites />
          {/* notification-sound slot */}
          <audio aria-hidden="true" className="visually-hidden" />
          {/* scrollbar-width probe */}
          <ScrollbarProbe />
          <a href="#skip-nav" className="skip-nav">
            Skip to content
          </a>
          {children}
          <ToastViewport />
        </div>
        <RouteAnnouncer />
        <Splash />
        <BootChoreography />
        {/* portal mounts */}
        <div id="portalRoot" style={{ display: "contents" }} />
      </body>
    </html>
  );
}

/** Probe div; BootChoreography measures it into --scrollbar-width (0 = overlay). */
function ScrollbarProbe() {
  return (
    <div
      id="scrollbarProbe"
      tabIndex={-1}
      data-scroll-container="true"
      aria-hidden="true"
      style={{ height: 0, width: 50, overflowY: "scroll" }}
    >
      <div />
    </div>
  );
}
