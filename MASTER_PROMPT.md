# LINEAR CLONE — MASTER BUILD PROMPT (Forensic Edition, 2026-08-24)
# Target: Next.js + React + TypeScript · pixel- and behavior-faithful reconstruction

You are building a production-grade, working reconstruction of the observable Linear web-app experience, exactly as captured on 2026-08-24 from workspace `synquic-labs`. This is NOT a static mockup and NOT a "Linear-inspired dashboard". It is a complete product: authentication → onboarding → workspace/teams → Inbox → My Issues → issue lists & boards → issue create/detail → Projects/Milestones/Updates → Views/Filters/Search/Command system → Insights → Cycles → Triage → Preferences → Agent chat → Skills → Loops — running on a local-first sync engine with optimistic mutations, offline retry, and realtime collaboration.

**Legal boundary:** this is an independently engineered reimplementation of observable behavior. Do NOT ship Linear's logo, wordmark, brand assets, marketing copy, or present the product as Linear. Do not copy their minified source. All geometry/tokens below were measured from rendered DOM/CSS the way any inspector can; reimplement them in your own code.

## Evidence tiers — tag every decision

- **CAPTURED** — recovered directly from the 7 DOM captures + 127 video frames (exact px, lch() colors, ms timings, ARIA, routes, labels). Reproduce with highest fidelity. Never replace a CAPTURED value with a guess or a "nicer" value.
- **DOCUMENTED** — confirmed against official Linear docs as of 2026-08-24 (cited inline). Match the user-visible behavior.
- **REIMPLEMENTED** — private backend/sync/scheduling internals that cannot be observed. Engineer independently using the architecture in §20; never claim it is Linear's code.

Priority order: 1) interaction fidelity → 2) layout/typography fidelity → 3) state-transition fidelity → 4) keyboard-first behavior → 5) local-first speed & optimistic updates → 6) visual polish → 7) backend completeness.

## Companion evidence files (read them before building each surface)

The `docs/analysis/` folder contains the full forensic reports this prompt distills. Before implementing a page, read its report; before an interaction, read the video timelines:

- `design-system.md` — every CSS token, all 87 keyframes, transition census, component style signatures
- `capture-projects.md` — Projects list page (subgrid table)
- `capture-driver-app-overview.md` — Project Overview page
- `capture-trendzo-37-research-work.md` — Issue detail page
- `capture-welcome-to-linear.md` — Inbox split-view + welcome document + media player
- `capture-inbox-welcome-to-linear.md` — app-shell boot contract + onboarding "Set up your profile"
- `capture-new-chat.md` — Agent chat page
- `capture-preferences.md` — Settings/Preferences page
- `video-timeline-1.md`, `video-timeline-2.md` — frame-by-frame interaction timeline (0–63.3s @ 1914×992)
- `research-nav-auth.md`, `research-views-projects.md`, `research-agent-sync.md` — documented behavior with doc-page citations
- The 7 original Woblo zips + `Screen Recording …6.59.17 PM.mov` remain the ground truth; extracted frames are referenced by number (frame N ≈ N/2 seconds).

---

# 1. TECHNOLOGY STACK (Next.js edition)

Linear's real bundle (CAPTURED from 1,041 modulepreload chunks) is: React, React Router, MobX (+mobx-react-lite/utils), ProseMirror (13 pkgs), Yjs + y-prosemirror, Radix UI, dnd-kit, react-virtuoso + react-window, react-spring, Popper, downshift, sonner, GraphQL + graphql-request, idb (IndexedDB), comlink workers, TanStack, Algolia InstantSearch, Sentry, d3/nivo, formik+yup+zod, date-fns, simplewebauthn, fflate, StyleX-like atomic CSS compiler, Emotion, Vite/Rolldown build. Use the modern equivalents:

**Frontend**
- **Next.js 15+ (App Router)** with TypeScript 5 strict. The app is a client-heavy SPA: workspace routes live under `app/[workspace]/…` as client components; use route groups + parallel routes for panels; `next/font` for Inter Variable (self-host a Berkeley-Mono-compatible mono fallback: JetBrains Mono / Fira Code — do NOT bundle Berkeley Mono unless licensed).
- **MobX 6 + mobx-react-lite** for the domain object graph (this is load-bearing for granular re-renders per §20 — do not substitute Redux/Zustand for entity state; Zustand may hold transient UI state only).
- **Radix UI primitives** (DropdownMenu, Select, Popover, Dialog, Tooltip, ContextMenu) restyled to the exact captured geometry; Linear itself ships Radix (CAPTURED: `role=combobox` + `data-state` on Preferences selects, `--radix-select-trigger-width` vars in CSS).
- **dnd-kit** for board/card/sidebar drag (CAPTURED: dnd-kit a11y scaffolding `#DndDescribedBy-N`/`#DndLiveRegion-N`, `aria-roledescription="sortable"` everywhere).
- **Tiptap 2 (ProseMirror) + Yjs + y-prosemirror** for every editor (issue title/description, comments, project description, agent composer — Linear uses one shared editor).
- **react-virtuoso** for issue/project lists (Linear ships both virtuoso and react-window).
- **sonner** for toasts (Linear ships sonner verbatim — §7.8 has its exact values).
- **cmdk** (or downshift) for the command palette; **@floating-ui/react** where Radix positioning isn't enough (Linear ships Popper).
- **idb** (or Dexie) for IndexedDB; **comlink** if you move sync work to a worker.
- **motion/react-spring** for the few physical animations (menu enter, panel dock); most motion is plain CSS per §6.
- **nivo or visx + d3-shape** for Insights charts and project sparklines/graphs.
- **zod** for all IO validation; **date-fns** for dates.
- Styling: **CSS custom properties (design tokens) + CSS Modules** (optionally Meta StyleX to mirror Linear's atomic system). NO Tailwind dashboard kits, NO Material/Ant/Bootstrap, NO default browser controls.

**Backend (REIMPLEMENTED)**
- Next.js Route Handlers (or a small Node service) exposing: GraphQL (Yoga/Apollo) for mutations, an NDJSON bootstrap endpoint, a WebSocket for delta sync (`ws` or graphql-ws), REST for auth/webhooks.
- **PostgreSQL + Drizzle (or Prisma)**; **Redis** for the delta-sync event bus if multi-node.
- **Auth.js (NextAuth v5)**: Google OAuth + email magic-link/code + passkeys via `@simplewebauthn/*`.
- Agent/Loops: Anthropic API (`claude-sonnet-5` default, model selectable) behind a server-side action layer; a job scheduler (BullMQ/pg-boss) for Loop schedule triggers.

**Testing**: Playwright (goldens at **1914×992** — the capture/recording viewport), Vitest for the sync engine, axe for a11y.

---

# 2. DESIGN TOKEN SYSTEM (CAPTURED — exact values, do not invent)

Define all tokens as CSS custom properties on `:root`. Linear authors color in **LCH**; keep `lch()` strings verbatim.

## 2.1 Boot palette (both themes — statically defined)

| Token | Dark | Light |
|---|---|---|
| `--bg-sidebar` (window/sidebar bg) | `#09090a` (runtime `lch(2.595% 0.4 272 / 1)`) | `#efeff0` |
| `--bg-base` (content card bg) | `#121213` (runtime `lch(5.52% 0.4 272)`) | `#f9f9fa` |
| `--bg-border` (app frame border) | `#212224` (runtime `lch(14.16% 1.48 272 / 1)`) | `#e2e2e2` |
| loading text muted | `#6b6f76` | `#b0b5c0` |
| loading text highlight | `#ffffff` | `#23252a` |
| meta theme-color | `#09090A` | `#EFEFF0` |

## 2.2 Runtime dark-theme semantic palette (CAPTURED from inline styles — the working palette)

Neutral hue is **272** (blue-grey, chroma 0.4–1.93); accent hue is **288.421** (Linear indigo).

| Role | Value (dark) |
|---|---|
| Accent / control-primary (indigo ≈ #5e6ad2) | `lch(47.918% 59.303 288.421)` |
| Link text | `lch(57.028% 70 288.421 / 1)` (elevated surface: `lch(58.717% …)`) |
| Text title / highlight | `lch(100% 0 272 / 1)` |
| Text base (labels) | `--sx label-base` ≈ white-high; body text = `--editor-text-color` |
| Text muted / default icons | `lch(61.803% 1.2 272 / 1)` (sidebar icons `lch(60.621% 1.2 272 / 1)`, elevated `lch(63.304% 1.425 272 / 1)`) |
| Text faint / placeholders | `lch(36.975% 1.2 272 / 1)` (elevated `lch(39.452% 1.425 272 / 1)`) |
| Surface base | `lch(5.52% 0.4 272)` · elevated card `lch(9.232% 0.85 272 / 1)` |
| Surface sub (recessed) | `lch(2.595% 0.4 272 / 1)` · elevated `lch(6.307% 0.85 272 / 1)` |
| Surface shade | `lch(7.32% 0.85 272 / 1)` · elevated `lch(11.033% 1.3 272 / 1)` |
| Surface focus (focused row) | `lch(13.62% 0.85 272 / 1)` |
| Border hairline | `lch(14.16% 1.48 272 / 1)` · solid `lch(16.32% 1.48 272 / 1)` · hover `lch(20.64% 1.48 272 / 1)` |
| Input hover border | `lch(24.32% 6.48 272 / 1)` |
| Control tertiary hover bg | `lch(14.006% 0.593 272 / 1)` · row/property hover `lch(17.718% 1.043 272 / 1)` |
| Control tertiary selected bg | `lch(16.706% 0.979 272 / 1)` |
| Selected row bg (`--row-applied-bg`) | `lch(9.345% 0.85 272 / 1)` |
| Keyboard-cursor row ring (`--row-keyboard-border`) | `lch(19.701% 19.952 286.445 / 1)` |
| Text selection | accent at 40%: `lch(47.918% 59.303 288.421 / 0.4)`; inactive `lch(61.803% 1.2 272 / 0.2)` |
| Focus ring | `1px solid` accent-family token; editor focus shadow `0 0 0 1px lch(47.918% 59.303 288.421)` |
| Error/destructive text | `lch(80% 80 29 / 1)`; overdue date red `lch(58% 73 29)` |
| Comment highlight (amber) | `lch(21.633% 23.767 83.803 / 1)` · active `lch(32.568% 37.936 84.425 / 1)` |
| Agent highlight | active `lch(87.2% 70 267 / 0.18)` · previous `/ 0.08` |
| Activity text highlight | `lch(90.451% 1.2 272 / 1)` |
| Inline code bg | `rgba(255,255,255,0.075)`; autocomplete input bg/border `rgba(255,255,255,0.035)` |
| Diff added | `lch(67.2% 64.37 141.95 / 0.3–0.4)`; removed `lch(65.2% 73 29 / 0.3–0.4)` |
| Code syntax (hljs) | blue `#2482D8`, blue-light `#00C5F0`, green `#25F8CA`, orange `#EB6E3D`, pink `#E394DC`, red `#EC3B40`, yellow `#FCE27D` |
| Workspace avatar bg (example) | `lch(70% 60 350 / 1)`; user avatar bgs `lch(55–70% 60 210–350)` |
| Team icon colors (seed data) | Trendzo `#00a0ff`, PGME `#008fff`, Shrujan `#00aa00`, Icon `#f85911`, Trikaal `#789c00`, Tiffsy `#d67600`, Homingo `#00b187` (drawn at opacity .9) |
| Status colors | Backlog dashed `#bec2c8`-family, In Progress orange `#F2994A`, project Planned yellow `lch(80% 90 85)`, project Backlog gray `#D7D8DB`, Done blue-check, Canceled ✕ |
| Callout default accent | `#26b5ce` |

Dark surface ladder (memorize): L = 2.595 → 5.52 → 6.307 → 7.32 → 9.232 → 9.345 → 11.033 → 13.62 → 14.16 → 16.32 → 17.718 → 20.64, hue fixed at 272.

Hover derivation recipe (CAPTURED): hover bg = `color-mix(in lch, <panel-bg>, <label-color> 10%)` (subtle variant 5%).

## 2.3 Typography

- `--font-regular: "Inter Variable","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Open Sans","Helvetica Neue",sans-serif` (Inter Variable v4.1 woff2, weights 100–900 + italic, `font-display: swap`).
- `--font-monospace: <licensed mono>,"SFMono Regular",Consolas,"Liberation Mono",Menlo,Courier,monospace`.
- Sizes: micro `.6875rem`(11) · mini `.75rem`(12) · small `.8125rem`(13) · regular `.9375rem`(15) · large `1.125rem`(18) · title3 `1.25rem`(20) · title2 `1.5rem`(24) · title1 `2.25rem`(36).
- Weights: light 300 · **normal 450** (body — not 400) · medium 500 · semibold 600 · bold 700. `strong,b { font-weight: 600 }`.
- Body: 15px base, line-height 1.5; paragraphs lh 1.7. UI chrome is 12–13px/500. Editor: 15px/450, lh 1.6, letter-spacing `-.00666667em`.
- Editor heading scale: h1 `1.375rem`/`1.85rem` (ls `-.004375rem`) · h2 `1.1875rem`/`1.75rem` (+.003125rem) · h3 `1.0625rem`/`1.5rem` (+.00625rem) · h4 `.9375rem`/1.5rem · h5/h6 `.875rem`/1.5rem.
- Issue/project title editor: `1.5rem`/600, line-height `calc(1 + 1/3)`, letter-spacing `-.00625rem`, `font-variation-settings:"opsz" 32`.
- Numbers in counts/dates: `font-variant-numeric: tabular-nums`.

## 2.4 Motion tokens (CAPTURED — exact)

- `--speed-highlightFadeIn: 0s` · `--speed-highlightFadeOut: .15s` · `--speed-quickTransition: .1s` · `--speed-regularTransition: .25s` · `--speed-slowTransition: .35s`.
- Full easing set: `--ease-out-quad: cubic-bezier(.25,.46,.45,.94)` (workhorse) · `--ease-out-cubic: cubic-bezier(.215,.61,.355,1)` · `--ease-out-quart: cubic-bezier(.165,.84,.44,1)` · `--ease-out-quint: cubic-bezier(.23,1,.32,1)` · `--ease-out-expo: cubic-bezier(.19,1,.22,1)` · `--ease-in-out-cubic: cubic-bezier(.645,.045,.355,1)` · `--ease-in-out-quart: cubic-bezier(.77,0,.175,1)` (plus the full in/in-out families — see design-system.md §2.3).
- Special beziers: sidebar width resize `.22s cubic-bezier(.43,.07,.59,.94)`; app-frame margins `.45s cubic-bezier(.45,0,.55,1)`; min-height `.18s cubic-bezier(.16,1,.3,1)`; image zoom `.25s cubic-bezier(.38,.01,.33,1)`.
- Standard durations in use: 50ms, 80ms, 100, 120, 125, 140, **150 (workhorse)**, 180, 200, 220, 250, 300, 350, 400, 450, 500ms. NEVER default to 300ms for ordinary controls.
- **THE HOVER IDIOM** (used app-wide, non-negotiable): at rest `transition-duration: var(--speed-highlightFadeOut)` (.15s); on `:hover/:active` set `transition-duration: var(--speed-highlightFadeIn)` (0s) → highlight snaps in instantly, fades out over 150ms.
- Reduced motion: `@media (prefers-reduced-motion: reduce)` disables transitions per component.

## 2.5 Radii · borders · z-index · misc

- Radii: 2, 3, **4 (`--control-border-radius`)**, 5, 6 (editor blocks), 7, **8 (rows, comments, toasts)**, **10 (settings cards, project-rail cards)**, **12 (app frame, modals/large cards)**, 50%, `9999px` pill (`--radius-rounded`). Hairline borders `1px`, **`0.5px` at ≥192dpi** via a `--thin-pixel` token.
- Z-index: local stacking 1–99 with `isolation: isolate` on rows; sidebar **96**; agent toolbar **97**; resize handles **200**; agent panel anchor **250**; overlay layers **500/550/581**; image zoom 1300; splash 99999; toasts 999999999.
- Cursor policy (CAPTURED): `--pointer: default` — buttons/links use the **default arrow**, NOT pointer. `cursor: pointer` only for external links. Preferences has a "Use pointer cursors" toggle that flips this.
- Scrollbars (gated on obtrusive-scrollbar detection): width `12px`, thumb `border-radius: 12px`, `background-clip: content-box`, `border: 3px solid transparent` (inset gutter), min thumb 32px, transparent track; hover/active darken via tokens; Firefox `scrollbar-width: thin`. Detect overlay scrollbars with a probe div (`height:0; width:50px; overflow-y:scroll`) and set `--scrollbar-width: 0px`.
- Focus: global `:focus-visible { outline: 1px solid var(--focus-ring-color) }`; inset variants use negative `outline-offset`; attention pulse keyframe rings accent at 80% then fades.

---

# 3. THEMING ARCHITECTURE (CAPTURED)

Linear's theming is a 3-stage runtime system — reproduce the architecture, not just a dark stylesheet:

1. **Boot stage (pre-hydration):** an inline `<head>` script reads `localStorage.splashScreenConfig` (`{ darkMode, sidebarWidth, agentToolbarHeight, bg colors }`) and sets `--bg-color/--bg-sidebar-color/--bg-base-color/--bg-border-color/--sidebar-width/--agent-toolbar-height` plus class `dark` on `<html>` BEFORE first paint → zero-flash startup with the user's exact geometry. Also sets `<meta name="theme-color">`.
2. **Registration stage:** the stylesheet registers semantic slots empty (`--color-bg-primary: initial` etc.) and `@property`-registers per-instance dynamic props (`--x-*`, `syntax:"*"; inherits:false`).
3. **Runtime stage:** a ThemeProvider computes the full LCH palette from theme settings (base color + contrast → generated ladder, which is why everything is lch()) and injects values via CSSOM; scopes are `theme-provider-<hash>` wrappers with `display: contents` (nested scopes re-tint whole subtrees — sidebar vs content card vs comment card use different elevations of the same ladder).
- Theme switch adds `.app-theme-transition` which sets `transition: none !important` on everything during the swap (no cross-fade artifacts).
- Preferences exposes: Interface theme = System preference / Light / Dark (+ per-appearance theme pickers, "Aa" chips showing bg/text/accent, e.g. dark chip `#111212/#e2e3e5/#5e69d1`, light `#f8f8f9/#2f2f31/#6d78d5`).
- Derived colors use `color-mix(in lch|srgb|oklch, …)` at runtime.

Implementation note for Next.js: put the boot script in `app/layout.tsx` via `<Script strategy="beforeInteractive">` (inline), and store theme as CSS variables on `<html>` — never a FOUC, never a hydration mismatch.

---

# 4. APP SHELL (CAPTURED — exact geometry)

The frame is: **left sidebar (window-colored) | floating content card | bottom agent toolbar**.

- `html, body { position: fixed }`; `html, body, #root { overflow: hidden }`. Body is `user-select: none; cursor: default`; `body::selection { background: var(--selection-bg) }`.
- **Sidebar**: `--sidebar-width: 244px` default. Implemented as an in-flow spacer div (`width: 244px`) + a `position: fixed; left:0; top:0; bottom:0; z-index:96` panel, `max-width: min(100vw - 40px, 330px)`, `will-change: transform`. User-resizable via a 7px `cursor: col-resize` strip at `right:-5px; top:14px; bottom:40px` whose visible affordance is a 1px vertical gradient line (`lch(100% 0 272 / 0) → 0.5 @15% → 0.65 @50% → 0.5 @85% → 0`), shown on hover. Width persists to `localStorage.splashScreenConfig.sidebarWidth`. Width changes animate `.22s cubic-bezier(.43,.07,.59,.94)`.
- **Content card** (`#appBorders` concept): `background: var(--bg-base); border: 1px solid var(--bg-border)` (0.5px @2x), `border-radius: 12px`, `margin: 8px; margin-left: var(--sidebar-width); margin-bottom: calc(8px + var(--agent-toolbar-height))`. Frame margins animate `.45s cubic-bezier(.45,0,.55,1)` (sidebar collapse, logged-out, etc.). Logged-out/error state collapses to `margin:-1px; --sidebar-width:-1px`. Electron builds add 40px top margin (traffic lights) — keep the affordance behind a flag.
- **Header** inside content: `min-height: calc(var(--header-height, 57px) + 1px-border)` — **57px** default (`--header-height` token, fallback constant). Bottom border 1px (suppressed on Agent page). Left padding 8–10px, right `max(8px, var(--scrollbar-width))`. Contains: breadcrumb/title row (57px) and, on views with tabs, a second 28px-pill tab row (~34px with margins). Tabs strip: `flex: 1 1 300px; min-width: 300px` (0 under 640px).
- **Bottom agent toolbar**: `--agent-toolbar-height: 28px` (0 on ≤1023px). Full-width strip under the card: bg `var(--bg-sidebar)`, `border-top: 1px solid <border>`, `z-index: 97`, right-aligned content `gap:6px; padding-right:8px`: left "Agent" pill (14×14 spark icon + 12px label, padding-left 10 / right 12) and right "Chat history" 28px icon button. An invisible `data-agent-panel-anchor` div sits `bottom:100%; width:400px; right:-8px; z-index:250` — the Agent panel pops UP from here.
- **Help button**: floating bottom-left over the sidebar (container `padding: 10px`, `z-index: 10`), a rounded card with `?` icon button `aria-label="Open Help menu"` — opens help menu incl. keyboard-shortcuts window (`?`).
- **Boot/splash sequence** (CAPTURED): `#loading` splash (z 99999) renders the frame skeleton (#appBorders clone) + centered 440×64 content: pulsing logo (`logoBackgroundPulse` 3.2s ease-out 1.2s infinite: scale .8→1, opacity 0→1→0) + "Loading…" text that appears only after 8s (`.loadingText`). Body class choreography: `content-loaded → is-bootstrapped → loaded → bootstrap-fade-complete`; `.hide-during-bootstrap` children are opacity:0 until bootstrapped, then `bootstrapFadeIn .2s ease-out`; lazy chunks mount with `suspenseFadeIn 80ms`. Splash selection color `#7180ff`. On asset failure: error card "Network error while loading" / "Something might be wrong with your connection. Reload the app to try again." + Reload + Contact support buttons.
- **Singletons at app root** (all CAPTURED, all required): 3 hidden SVG sprite sheets (§8) · hidden `<audio>` (notification sounds) · scrollbar-width probe div · `<a href="#skip-nav">Skip to content</a>` skip link · sonner toast viewport `<section aria-label="Notifications alt+T" aria-live="polite">` · SPA route announcer `<span role="status">Navigated to {title}</span>` · `#portalLayoutRoot` inside `<main>` + ~12 empty `display:contents` portal mounts at body end · fixed overlay layer z-581.
- **Scroll restoration**: every scroller carries `data-restore-scroll-view="<route-or-view-key>"`; restore per key on back-nav. Scroll-driven CSS animations for edge fades: sidebar top fade (`animation-range: 0px 26px`), settings sidebar (`0 13px`), list horizontal fade.

# 5. SIDEBAR SPEC (CAPTURED)

Structure and exact order:
1. **Top row** (44px, margin-top 8px, padding-inline 12px): workspace switcher button (24×24 rounded avatar tile w/ 11px initials + name + 13×9 chevron, `aria-haspopup=menu`) · flex spacer · "Search workspace" 28px icon button · "Create new issue" 28px icon button (white pencil icon).
2. **Primary nav** (dnd-kit sortable): `Inbox` · `My issues` · `Agent` (+ hidden "drafts" placeholder slot that appears when drafts exist).
3. **Section "Workspace"** (collapsible header button, 12px/500 muted label, hover chevron): `Projects` · `Views` · `Loops` · `More` (role=button → popover: **Members, Releases, Teams, ─ divider ─, Customize sidebar**).
4. **Section "Your teams"** (+ hover "Join a team" button): team rows — disclosure button (14×14 tinted team icon at opacity .9, 13px/500 name, hover chevron + hover 3-dot "Team menu"), expanding to `Home / Issues / Projects / Views` sub-links (19px indent step). Teams are dnd-sortable.
5. Bottom: floating Help `?` button.

Row spec: `<a>` height **28px**, border-radius 8px, margin-block 1px, padding 8px/9px, **13px/500**, icon 16×16 rendered in a 14×14 box with 6px margin-right, icon color `lch(60.621% 1.2 272)`. Hover bg = subtle token (hover idiom §2.4). Active route: `data-active=true` → selected-tint bg + title-color text/icon (stronger than hover, persists). Collapse animation: container `height: auto|0; opacity: 1|0` + `aria-hidden`.

While hovering any sidebar link, the browser status line shows the destination URL (they are real `<a href>` links — keep them real).

# 6. MICRO-INTERACTION DOCTRINE

State is expressed via **data-attributes** styled in CSS (CAPTURED contract — use it everywhere): `data-active`, `data-selected`, `data-keyboard-active`, `data-apply-background`, `data-menu-open`, `data-state=open|closed|active|inactive`, `data-focused`, `data-disabled`, `data-open`, `data-first/last-selected`, `data-first/last-in-group`, `data-visible-sidebar-item`, `data-contextual-menu`, `aria-expanded/aria-haspopup/aria-checked`.

## 6.1 Hover
- Rows/buttons highlight **instantly** (0ms in), fade out 150ms (§2.4 idiom). Hover styles are gated behind `@media (any-hover: hover) and (any-pointer: fine)`.
- Hover reveals contextual controls without layout shift: list-row checkbox (left edge), row `…` overflow, group-header `+`, sort chevrons, "Add label" `+` pills (pattern: present in DOM with `opacity:0` or `margin-right:-100%`, revealed via `:hover/:focus-within/[data-menu-open=true]`).
- Icon fills transition with the same idiom (`fill .15s`, instant in).

## 6.2 Menu-open persistence
While a menu/popover is open, its trigger keeps the highlighted state via `[data-menu-open=true]` → `background: var(--btn-highlight-bg); color: var(--btn-highlight-color)`. Close on outside click + Escape; focus returns to trigger; close fade ≈100–150ms.

## 6.3 Contextual menus
- Every interactive region is wrapped in a `data-contextual-menu` boundary — right-click opens the context menu for that entity (issue row, project row, sidebar team, board card…), acting on the current selection if the target is selected.
- Property edits open **anchored** pickers near the control (bottom-start preference, flip on collision, 8px viewport margin, stable width while filtering) — never a centered modal. Menus support type-to-filter, ↑/↓ + Enter, Esc.
- Menu surfaces: elevated dark panel, 1px hairline border, radius ~8px, shadow tokens (`shadow-low`/`shadow-medium`), optional `backdrop-filter: blur(…) saturate(180%)` glass for heavy surfaces; scroll affordances via scroll-driven animations at top/bottom 24px.
- Enter animations from the captured vocabulary (§6.6): fade + 4–10px translate toward anchor, 80–150ms ease-out-quad. Exit: fade ~100ms.

## 6.4 Tooltips
Delay ~400–600ms, instant-ish hide, `pointer-events: none`, dark elevated chip, 13px; include **shortcut keycaps** where relevant (CAPTURED examples: "Go to my issues" + `G` `M`; "Copy as prompt" + `⌘` `⌥` `P`). Keycap chip spec: mono font, bg-sub fill, 1px hairline border with **2px bottom border**, radius 4px, padding 1px 5px, `.75em`.

## 6.5 Toasts (sonner — exact)
- Viewport bottom-right; `[data-sonner-toast]`: `padding:16px; border-radius:8px; border:1px solid; font-size:13px; gap:6px; box-shadow: 0 4px 12px rgba(0,0,0,.1)`; dark theme `--normal-bg:#000; border hsl(0 0% 20%); text hsl(0 0% 99%)`.
- Animations: enter `sonner-fade-in` (scale .8→1 + fade, .3s ease); exit .2s; stack shifts `transform .4s ease`; swipe-to-dismiss keyframes.
- Behavior (CAPTURED from video): newest stacks adjacent (not covering); each has its own ✕; toasts **survive route changes**; lifetime ~6–7s with **independent, staggered dismissal** (older fades first); copy actions produce: clipboard icon + "Prompt copied to clipboard" / "Copied issue link to clipboard". Errors persist with retry. No giant colorful cards.

## 6.6 Animation vocabulary (CAPTURED keyframes — reuse, don't invent)
- Enter: fade; fade+rise 4px / 6px; fade+drop 2px / 10px (ease-out-quad baked); pop scale 0→1 / .5→1; zoom-settle 1.3→1.
- Exit: fade; fly-up (+5→-10px); shrink-out scale→0.
- Feedback: attention ring pulse (outline accent 80% at 5% of timeline → transparent); row flash (400px inset box-shadow fading); skeleton shimmer (background-position 150%→-50%); accordion `grid-template-rows 0fr→1fr`; AI glow pulse (drop-shadow 14px white, scale 1.28→1); collab cursor fade-out (.4s after 6s idle).
- Suspense/bootstrap: `suspenseFadeIn 80ms`, `bootstrapFadeIn .2s`.

## 6.7 Highlight vs Selection (fundamental — never merge these)
- **Highlight** = keyboard cursor / hover position. One row at a time. Keyboard-active row shows inset ring `box-shadow: 0 0 0 1px var(--row-keyboard-border) inset`.
- **Selection** = explicit: `X`, Shift+Click, hover-checkbox, `Cmd/Ctrl+A`. Selected rows paint `--row-applied-bg`; adjoining selected rows merge corner radii (zero the shared corners unless first/last in group). Esc clears selection first, then closes overlays (§6.9).
- Multi-select summons the **bottom bulk-actions toolbar**; context menu and Cmd/Ctrl+K act on the whole selection; bulk ops apply optimistically as one transaction batch.

## 6.8 Optimistic mutation pipeline (every property edit)
1) mutate MobX model instantly → 2) enqueue transaction to IndexedDB → 3) close picker immediately → 4) UI (chips, board position, activity) reflects instantly → 5) async GraphQL mutation → 6) reconcile on ACK/delta → 7) per-field conflict merge → 8) on hard failure: revert only affected fields + compact error toast with retry. NO spinners for local mutations, ever.

## 6.9 Escape hierarchy (ordered)
nested submenu → clear menu search text → close popover/dialog → clear selection → navigate back.

## 6.10 Structural panels (Insights, project details, agent panel)
Docked panels resize the content area (width animates, content never scales, list scroll preserved); popovers float above. Insights docks right (~320–400px); project details rail is 400px; both survive list↔board switches.

---

# 7. COMPONENT SPECS (CAPTURED values)

## 7.1 Buttons
- Heights: **24 / 28 / 32px** (28 is standard chrome), min-width = height, `border-radius: 9999px` for icon/pill buttons, 4px for rect controls. Icon sizes: small 14×14, normal 16×16.
- State via variables: `--btn-highlight-bg` (rest transparent) + `--btn-highlight-color` flip on hover/`:active`/`[data-active]`/`[data-menu-open=true]`.
- Border is a **ring shadow on `::after`**, not border: `--btn-overlay-shadow: 0 0 0 1px <ring-color>, <shadow-low>`; hover swaps ring color.
- Primary button: accent bg (indigo), hover slightly lighter; secondary: elevated bg + ring; ghost: transparent, hover tertiary-hover bg. Disabled `opacity: .6`. Transition `.15s` (0s in on hover).
- Onboarding-size pills: height 44px, padding-inline 18px, 13px/500.
- Empty-state primaries may embed a keycap chip (e.g. "Create new issue `C`").

## 7.2 Inputs
Text inputs: height 44px (large/forms) or 30–32px (settings), padding 12px, radius 12px (large) / 8px (small), bg elevated, 1px border, hover border `lch(24.32% 6.48 272)`, focus ring 1px accent + `outline-offset` inset variants. Placeholder = faint token. Suppress LastPass/1Password (`data-1p-ignore`).

## 7.3 Toggle (signature squish — exact)
Styled native checkbox: track 30×20, radius 72px; unchecked bg = control token, checked bg `lch(47.551% 0.913 271.998)` (hover `lch(56.238% 1.008 271.999)`). Thumb = `::before`, height 14, radius 7, white, positioned by left/right insets: unchecked L3/R13 → checked L13/R3, transitions `left,right .1s ease-out` with **50ms staggered delays swapped per direction** → the thumb stretches while moving. Hit area inflated −6px on all sides via pseudo. Focus `outline-offset: 2px`.

## 7.4 Select (Radix — exact)
Trigger `role=combobox`: height **30px**, padding-left 10 / right 28, radius 8, bg elevated control token, ring `0 0 0 1px` hairline, hover bg + ring brighten; width 277px in settings (200 ≤768px, 125 ≤640px); 13px text ellipsized; absolute 10px-wide chevron right, muted color. Value can render prefix chips (theme "Aa" swatch). Content: `data-state=open`, min-width = trigger width, max-height via available-height var.

## 7.5 List rows (ListCell — exact)
- Row container: `border-radius: 8px; isolation: isolate; will-change: transform; contain: layout style`. Background painted on `::before` with `inset: 0 8px` (8px horizontal bleed inset). Height: issue rows ~40–48px w/ `--x-minHeight`, project rows 48px, inbox rows 55px, settings rows min 60px, compact 24px.
- `[data-apply-background=true]::before { background: var(--row-applied-bg) }`; `[data-keyboard-active=true]::before { box-shadow: 0 0 0 1px var(--row-keyboard-border) inset }`.
- Transition: `transition-property: box-shadow, background-color; transition-duration: .15s, 0s`.
- Grid lists use **CSS subgrid**: outer grid defines named columns once; each row `display:grid; grid-template-columns: subgrid; grid-column: 1/-1`.
- Rows are real `<a>` links (URL preview on hover, middle-click works).

## 7.6 Modals/dialogs
Centered over dimmed backdrop (backdrop is a container query root `modal-backdrop`, adapts <1024px). Radius 12-family, elevated bg, shadow-medium; content rhythm `p { margin: 12px 0 }`. Image lightbox via medium-zoom-style modal (z 1300, `.25s cubic-bezier(.38,.01,.33,1)`).

## 7.7 Avatars
Square containers with round content; sizes seen: 16, 18, 22, 24, 28, 32, 44. Initials: 8–11px white on LCH-tinted bg. Avatar piles overlap -9px (18px stack in Activity header).

## 7.8 Cards (project rail / settings)
`border: 1px hairline; border-radius: 10px; background: elevated surface; box-shadow: shadow-low; padding: 12–16px; margin-bottom: 8–12px`. Settings rows: min-height 60px, padding 16px, row separators inset 16px left/right, first/last rows inherit card radius, hover bg subtle.

# 8. ICON SYSTEM (CAPTURED)

- **Three inline SVG sprite sheets** mounted hidden at `#root` top, referenced with `<use href="#Name">`, all `viewBox="0 0 16 16"`:
  - **Base (33)**: Attachment, Blockquote, Calendar, Checklist, CodeBlock, Comment, CreditCard, CustomView, Favorite, Folder, Home, Inbox, Initiative, IssueStatusBacklog/Todo/Started/Review/Done/Triage, Label, Link, Lock, MilestoneNone, MilestoneStatusPlanned/Started/Done, MyIssues, Project, Refresh, Search, Send, Subscribe, Team.
  - **Brands (8)**: agent-integration logos (use your own equivalents; do not ship third-party logos you lack rights to).
  - **Decorative (~264)**: the team/project icon-picker library (Rocket, Bug, Chip, Radar, Feather, Europe, Home, QuestionMark, …). Draw your own set matching the style: 16×16, filled, single-color.
- Icons are **fill-based, not stroke** (`fill: currentColor` or the cascade below); only spinners animate stroke-dashoffset.
- Color cascade: `svg { fill: var(--icon-color) }`; `--icon-color: var(--icon-replacement-color, var(--icon-default-color))`; state styles re-point `--icon-replacement-color` (hover → label-base, active → label-title); `.color-override` opts out (team tints). Default `lch(60.6–61.8% 1.2 272)`, faint `lch(36.975% 1.2 272)`.
- Sizes: 14×14 in chrome buttons, 16×16 in row properties, 18 table controls, 20 editor block menu. Emoji icons render as text at 13–16px in a fixed box (`data-type="emoji"`).
- Bespoke glyphs to draw precisely:
  - **Issue status**: Backlog = dashed circle (r6, stroke 1.5, dasharray `1.4 1.74`); Todo = hollow circle; In Progress = circle with orange partial fill (progress-pie via thick arc: inner r2, stroke-width 4, dasharray fraction of 11.31); Review = purple-ish variant; Done = filled circle with check (blue); Canceled = gray ✕-in-circle; Triage variant; Duplicate = canceled-family.
  - **Priority**: No priority = 3 horizontal 3×1.5 rects; Low/Medium/High = 3 rising bars (heights 6/9/12, rx 1) partially filled by level; Urgent = orange rounded square with "!".
  - **Project status shield**: 16×16 rounded-hex outline (stroke 1.5, dashed `1.65 1.35` for not-started) + masked inner progress ring (r4 at center, stroke-width 8, `stroke-dasharray: calc(pct·25.12/100) 25.12`, rotated -90°).
  - **Health dashed circle**: r 7.5, dasharray `2.36 2.36`, round caps ("No updates").
  - **Milestone diamond**: outline diamond, stroke 2, opacity .4 in chips; MilestoneStatus fills by state (current-target = yellow).
  - **Progress sparkline**: 32×16 two-path bezier (project color + muted trend).

---

# 9. ROUTE MAP (CAPTURED — implement all of these)

Workspace-scoped (`/:workspace/...`, slug e.g. `synquic-labs`):

```
/:ws/inbox                         Inbox (split view)
/:ws/welcome-message               Welcome document (inbox-layout)
/:ws/my-issues/assigned            My Issues (tabs: assigned|created|subscribed|activity)
/:ws/agent                         Agent chat
/:ws/loops                         Loops
/:ws/projects/all                  Workspace projects list
/:ws/views  /:ws/views/issues      Custom views (tabs issues|projects)
/:ws/team/:KEY/overview            Team home
/:ws/team/:KEY/all                 Team issues (tabs active|backlog|all)
/:ws/team/:KEY/projects/all        Team projects
/:ws/team/:KEY/views/issues        Team views
/:ws/issue/:ISSUE-ID/:slug         Issue detail (e.g. /issue/TRENDZO-37/research-work)
   #update-{uuid}-issue-created    Activity permalinks
/:ws/project/:slug-:12hex/overview | /activity | /issues[?projectMilestoneId=uuid]
   #milestone-:uuid                Milestone anchors
/:ws/profiles/:username            Member profile
/:ws/settings/account/{preferences|profile|notifications|code-and-reviews|security|connections|agents}
/:ws/settings/{issue-labels|issue-templates|sla|project-labels|project-templates|project-statuses|project-updates|ai|initiatives|documents|customer-requests|releases|pulse|asks|emojis|integrations}
/:ws/settings/teams/:KEY
```

Auth/global: `/login`, `/join`, `/logout`, `/add-account`, `/mobile-auth`, `/auth/*`, `/connect/*`. React-router-style client navigation with the route announcer ("Navigated to {title}") and per-route `<title>` (e.g. `TRENDZO-37 Research Work`, `Driver App › Overview`, `Inbox › Welcome to Linear`).

# 10. PAGE SPECS

## 10.1 Projects list (`/projects/all`) — CAPTURED
- Header: h2 "Projects" 13px/500 · "New project" pill button (pencil icon + 12px/500 label, 28px) · tab pill "All projects" (28px pill, radius 9999, padding 0 10px, 12px/500, active tint, max-width 200px, dnd-sortable tabs) · `+` "Add new view" · right: Add filter / Display options / Close-sidebar 28px icon buttons. Below: empty filter-bar strip that renders filter chips.
- **Subgrid table**: columns `[indent] 8px [checkbox] 18px [title] minmax(425px, 2fr) [health] 130px [priority] 68px [lead] 48px [targetDate] 91px [issues] 49px [status] 120px [end-padding] 8px`, `column-gap: 6px`. Header row 32px: sortable headers are buttons `aria-label="Order by X"` (12px/450 muted, hover chevron); Lead/Issues unsortable.
- Row (48px `<a>`): hover checkbox → 28×28 icon tile (emoji at 16px, or Project glyph tinted; tile hover bg = project color at 0.175 alpha) → name 13px/500 (70% max-width when milestone chip present) → **milestone chip** button (h27, radius 48px: 16×16 diamond outline in project color stroke-2 opacity-.4 + 12px "M3 · Delivery flow (handover → deliver → proof)" + date "Aug 28") → health button (dashed circle + "No updates" 12px muted; `aria-label="No updates. Click to write update."`) → priority glyph → lead 16px avatar or hover-revealed dashed-person "No lead" → target date (calendar + "Sep 30th" 12px; **overdue = red `lch(58% 73 29)` incl. the calendar glyph**) → issue count (12px tabular-nums, right-aligned) → status shield + "0%" + optional 32×16 sparkline.
- Right insights rail (from video): segmented **Health | Teams | Leads**; Health rows like "No update expected — 5", "Update missing — 5" (team scope reorders nonzero first).

## 10.2 Project Overview (`/project/:slug/overview`) — CAPTURED
- Header row A (57px): breadcrumb `Projects › {emoji} Driver App` + favorite star (role=switch) + "Project actions" ⋯ ; right: "Copy page URL", "Setup project notifications" (bell). Row B: pill tabs **Overview | Activity | Issues** + `+` Add new view; right: "Open project insights" (`data-state=inactive`) + "Close project details" (`data-state=active`, panel toggle icon with animated rect `transition: x, width 250ms`).
- Content scroller: padding-inline 48px, min-width 600px; form column `max-width: 80ch; margin-top: 64px`.
- Title row: icon-picker button 28×32 r5.5 (tinted bg, 22px emoji) + project name editor (1.5rem/600). Summary editor below (15px/450).
- Properties strip (grid `auto minmax(0,1fr)`, gap 12/16): pills — Status (shield, "Backlog") · Priority · Lead avatar+name · Start date "Jul 27th" → arrow → Target "Sep 30th" · Lead team · Teams · hover-revealed "+ Add label". Pill = `data-detail-property-button`, min-height 28, padding 3/6, hover bg property-hover token, 12px/450.
- **Resources** section: hover-revealed "Add document or link…". **Update strip**: bordered row (padding 16, radius 10) "Write first project update".
- **Description**: collaborative editor (Tiptap+Yjs) with per-author attribution spans and agent-change gutter overlays.
- **Milestones**: cards with milestone-status icon + name editor (15px/600) + collapse chevron; meta row "Aug 28 · 0 issues · 0%" + hover ⋯ menu; collapsible description (transition opacity,height 200ms); "+ Milestone" add row.
- **Floating outline minimap** (right:12px): stack of 8px bars (1px scaled), hover expands to blur-glass panel (`lch(5.52% .4 272 / 0.7)` + `backdrop-filter: blur(12px)`, rows h24) listing Description / Milestones / M3….
- **Right details rail (400px)**: cards (§7.8) — Properties (label col 90px: Status, Priority, Lead, Members, Dates, Lead team, Teams, Channel, Labels) · Milestones (rows h42: icon+name / "0% of 0" animated-number / date chip / hover actions; "No milestone" row + "See issues") · Activity (`data-item-type="entries-project"` rows + "See all" → /activity). Rail slides with gradient edge; `Cmd/Ctrl+I` toggles.

## 10.3 Issue detail (`/issue/:id/:slug`) — CAPTURED
- Header: breadcrumb `Trendzo › Issues › TRENDZO-37 Research Work` + favorite star + "Issue options" ⋯. Floating action strip under header, right-aligned: **Copy issue URL · Copy issue ID · Copy branch name · Work on issue · ⌄** (the ⌄ opens: "Copy as prompt `⌘⌥P`" + "Configure coding tools…").
- Layout grid: `grid-template-columns: 1fr minmax(0, 80ch) minmax(0, clamp(280px, 26.087cqw + 66.087px, 400px)) 1fr; column-gap: clamp(16px, 8.696cqw - 55.304px, 56px)`; content col 2; **sticky property rail** col 3 (padding-top 51px, bottom 54px); container queries on `issue-view-container`.
- Title: single-line ProseMirror `aria-label="Issue title"` (1.5rem/600, §2.3). Description: multiline collaborative editor; todo-list items with drag-handle (hover-revealed ⋮⋮), `role=checkbox` boxes (14px), authorship spans. Below: Add-reaction + attach buttons; "+ Add sub-issues" bar.
- Divider → **Activity**: header 15px/600 + "Subscribe" text button + subscriber avatar pile (18px). Entries: 14px avatar + one-line text ("**user** created the issue · 1h ago"; "**user** moved from Backlog to In Progress · just now") with absolute-date tooltip and permalink. Property changes in the first 3 minutes of life are not logged (DOCUMENTED).
- **Comment composer**: elevated card (radius 8, shadow-low, padding-block 12, elevated editor palette), placeholder "Leave a comment…", footer icon-only submit (↑).
- **Property rail**: section "Properties" (header 13px/500 muted, content gap 4, padding-top 8): Status ("Backlog" + status glyph) · Priority ("Set priority") · Assignee ("Assign", dashed person). Section "Labels": "+ Add label". Section "Project": "Add to project". Row = `data-detail-button`, hover detail-hover bg, icon 14–16 + 6px gap; empty values muted, set values base color. Add when relevant: Milestone (`Shift+M`), Cycle, Estimate (`Shift+E`), Due date (`Shift+D`), Relations (blocked/blocking flags orange/red), Subscribe footer.
- Copy actions → Clipboard API + toast; multiple copy toasts stack (§6.5).

## 10.4 Inbox (`/inbox`, welcome doc) — CAPTURED
- **Split view**: list pane 400px default (`--x-width/maxWidth: 400px`, resizable via 7px handle, right hairline border) + reading pane.
- List pane header 57px: h2 "Inbox" + right: Add filter · Display options (inbox display opts = ordering + show-snoozed/show-read toggles).
- Notification row (55px, radius 8, margin-block 1px, padding-inline 8): 32×32 icon tile (issue-status/actor/logo) + title 13px/500 ellipsized + snippet 12px/450 muted + right relative timestamp ("2h", absolute on hover). States: `data-active` (open in reading pane), unread dot, `data-selected`. Empty reading pane: outlined inbox glyph + "No notification selected".
- Reading pane top bar 57px: left spacer (min-width 38%), actions: "Snooze notification" (clock) · "Delete notification". Content column `width: calc(100% - 80px); max-width: 860px` centered.
- Welcome document (seed content): 44×44 logo tile, 36px/2.875rem title, read-only rich doc: intro paragraph, embedded **video player** (custom controls: play k · mute m · elapsed/duration timers · buffered+played seek slider · rate select 0.25×–2× · download · PiP p · full-window f; `aria-keyshortcuts` on controls), h3 "Resources" + link list, h3 "Key features", inline-code, `<hr>`, and an image node (hover toolbar: View image / Download / Copy image / Copy link / Open menu; max-height 600, aspect-ratio preserved).
- Inbox behavior (DOCUMENTED): auto-subscribe on create/assign/mention; notify on status-complete/cancel, urgent, blocking changes, mentions, assignments, comments. `U` read/unread · `Alt+U` all read · `H` snooze (reappears at chosen time) · `Backspace` delete · `Shift+Backspace` delete read · `Cmd/Ctrl+F` inbox filter · `Shift+S` unsubscribe · cap 2,000 notifications.

## 10.5 My Issues — tabs **Assigned | Created | Subscribed | Activity** (segmented pills). Assigned groups by focus; Created ordered by creation; Activity is a recency feed. Empty state: isometric illustration + "No issues assigned to you" + primary "Create new issue".

## 10.6 Team pages
- **Home** (`/team/:KEY/overview`): breadcrumb chip + star + ⋯; tabs **Overview | Documents | Loops | Members**; hero: team icon + H1 name; "Add a description…" placeholder; "Team resources" section with add/doc buttons; right rail: Members (avatar pile), "Go to" list (Connect channel, Team settings, Issues, Initiatives, Projects, Views); copy-link icon.
- **Issues** (`/team/:KEY/all`): tabs **Active | Backlog | All issues** + save-view icon; toolbar: filter, display options, insights, layout toggle; subscribe bell. Grouped list: group header = collapse arrow + status icon + "**In Progress 1**" + hover `+` (create in group). Issue row: hover checkbox · ⋯ · ID (muted mono-ish) · status glyph · title 13px/500 · spacer · assignee avatar/dashed placeholder · date "Aug 24".
- Team empty state (All issues): 2×2 status-icon cluster, heading, explainer copy, "Create new issue `C`" + "Documentation".

## 10.7 Views page: header "Views" + "New view"; tabs Issues | Projects; table Name ↓ / Owner; row: layers icon + view name + owner avatar + username. Empty state explains custom views + `⌥V` save hint. **Loops page**: header + "New loop"; empty state: knot illustration, agent-automation copy, "Create new loop" + "Docs and Examples".

## 10.8 Agent chat (`/agent`) — CAPTURED
- Header 57px, **no bottom border**; single control: "Switch agent chat" pill (h2 "New chat" 13px/500 + chevron) → dropdown of open chats/history.
- Content: bg vertical gradient (surface→sub); centered column max-width 712px, padding-inline 24, margin-bottom 8vh.
- **Watermark**: faint 336×336 logo line-art behind the composer (stroke .5, `lch(9.84% 1.48 272)`, masked fade to 60%) — replace with your own mark.
- **Composer card**: radius 10, padding 12, bg `lch(7.32% .85 272)`, shadow-low, gradient border tokens for glow states; editor area min-height 48px (2 lines), max-height `min(288px, 60vh)`; placeholder "Ask Linear…" (rendered via `content: attr(data-empty-text)`); toolbar row: left **Skills** pill (sparkle 14px + label + chevron, h24, `aria-haspopup=menu`) · right: attach (24px, full accept-list incl. images/video/pdf/office/md/csv) + submit (24px round, idle bg dim; ↑ icon).
- First-run: dismissible "Get started with some examples" 3-card row (Create a new project / Research a topic / Create automated loop); composer shifts up when present.
- Behavior (DOCUMENTED): `Cmd/Ctrl+J` opens agent anywhere; multiple chats as toolbar tabs w/ unread/working badges; history retained; skills via `/` slash commands; @Linear mentions in comments; capabilities: create/update issues-projects-milestones-initiatives, summarize, answer workspace questions, respect permissions, MCP connectors; optimistic user-message append, streaming reply, stop/cancel, retry.

## 10.9 Preferences (`/settings/account/preferences`) — CAPTURED
- Settings mode swaps chrome: settings sidebar (244px): header "‹ Back to app" (→ /my-issues/assigned), search input ("Search…"), nav groups **Personal** (Preferences, Profile, Notifications, Code & reviews, Security & access, Connected accounts, Agent personalization) / **Issues** (Labels, Templates, SLAs) / **Projects** (Labels, Templates, Statuses, Updates) / **Features** (AI & Agents, Initiatives, Documents, Customer requests, Releases, Pulse, Asks, Emojis, Integrations) / **Your teams** (each team + "Join or create a team"). Content card: radius 12, margins 8, own 64px top drag strip, column max-width 640px, H1 "Preferences" 24px/500 (ls -.01rem), sections gap 48.
- Sections/rows (exact): **General** — Default home view (select, "Linear Agent (default)") · Display names (Full name) · First day of the week (Monday) · Convert text emoticons into emojis (toggle ON) · Send comments on… (Enter). **Interface and theme** — App sidebar → "Customize" button · Font size (Default) · Use pointer cursors (off) · Underline links (off) · Disable animated images & emoji (off) · Interface theme (System preference, w/ Light+Dark sub-selects and "Aa" chips). **Desktop application** — Open in desktop app (off). **Automations and workflows** — Auto-assign to self (off) · On move to started status, assign to yourself (off).
- Row anatomy: §7.8. Every row: 13px/500 label + 12px/450 description; control right-aligned.

# 11. DISPLAY OPTIONS · FILTERS · INSIGHTS (CAPTURED from video + DOCUMENTED)

## 11.1 Display Options popover (`Shift+V` or sliders icon)
- Right-anchored popover. Top: **List | Board** segmented control (instant re-layout on switch, no animation).
- List mode rows: Grouping (Status) · Sub-grouping (No grouping) · Ordering (Priority) · "Order completed by recency" toggle · Completed issues (All) · "Show sub-issues" toggle; section **List options**: Nested sub-issues, Show empty groups.
- Board mode re-labels: **Columns** = Status · **Rows** = No grouping · Ordering; section **Board options**: Show empty columns.
- **Display properties** chip grid (wraps, menu width stable): active solid — ID, Status, Assignee, Priority, Project, Due date, Labels, Created; inactive dim — Milestone, Release, Links, Time in status, Updated.
- Toggles do NOT close the popover; selects open anchored submenus. When deviated from default: footer gains **Reset** + **Set default for everyone**, and the toolbar sliders icon gets a **small blue dot badge**. Personal per-view persistence; "Set as default" pushes workspace-wide (DOCUMENTED). Grouping options (DOCUMENTED): status, assignee, project, priority, cycle, label, parent, team, customer, release, SLA; ordering: manual, status, priority, created, updated, due date, link count.

## 11.2 Filters
- `F` or funnel icon → "Add Filter…" menu (search header + `F` kbd hint) with submenu chevrons: AI filter, Advanced filter, Status, Assignee, Agent, Agent Session, Creator, Priority, Labels, Relations, Suggested label, Dates, Project, Project properties, Subscribers, Auto-closed, Content, Links, Template.
- Applied filters render as **chips** in the filter bar: property + operator + value, each segment independently clickable. Operators: is / is not / is either of / includes any-all-neither-none / before-after; auto-switch on multi-value. Advanced filters: AND/OR groups. Filters encode into the URL. Save as view with `Option/Alt+V`.
- `Cmd/Ctrl+F`: temporary quick-filter within current view (list/board/inbox), Esc clears.

## 11.3 Insights panel
- First click on chart icon: docked slim right panel — pill tabs **Assignees / Labels / Priority / Projects** + facet counts ("No assignee — 1"). Second stage (report mode): dismissible intro banner (Examples / Documentation links + ✕; dismissal reflows panel), config selects **Measure** (Issue count) / **Slice** (Status) / **Segment** (Priority), async "Loading…" → bar chart (dashed gridlines, axis labels) + breakdown table; chart actions expand/settings/⋯; footer "Set default for everyone" (permission-gated). Panel keeps filters, survives list↔board toggle, shrinks content width; chart rerenders restrained (150–250ms).

---

# 12. KEYBOARD SYSTEM (DOCUMENTED + CAPTURED — central registry, not scattered listeners)

Build one shortcut registry with: context scoping (global / list / board / issue / inbox / editor-safe), multi-key sequences with pending-hint UI (e.g. "G then I"), sequence timeout + Esc cancel, Cmd vs Ctrl labeling by OS, disabled-while-typing except editor-safe keys. Tooltips and menus render shortcut keycaps from the registry.

**Global**: `/` workspace search · `Cmd/Ctrl+K` command palette · `C` create issue · `V` create fullscreen · `Option/Alt+C` create from template · `?` shortcuts help window · `Cmd/Ctrl+J` Agent chat · `Cmd/Ctrl+Z` undo · `Alt+T` focus toasts.
**Go-to (G then …)**: `G I` Inbox · `G T` Triage · `G A` team Active · `G B` team Backlog · `G X` Archives · `G V` current cycle.
**Open (O then …)**: `O W` switch workspace · `O F` favorites menu · `O T` another team's Triage · `O U` user views. `Alt/Option+F` toggle favorite.
**Lists/boards**: `↑/↓` or `J/K` move highlight · `Enter` open · `X` select · `Shift+↑/↓`/Shift+Click extend · `Cmd/Ctrl+A` select all · `Esc` clear · `Option/Alt+↑/↓` manual reorder · `Option/Alt+Shift+↑/↓` to extremes · `T` toggle swimlanes · `Space` peek (tap toggles, hold = momentary; ↑/↓ moves while peeking) · `Cmd/Ctrl+B` list↔board · `Shift+V` display options · `F` filter · `Cmd/Ctrl+F` view quick-filter.
**Issue actions**: `S` status (keyboard set → top of target column) · `A` assignee · `I` assign self · `P` priority · `L` label · `Shift+E` estimate · `Shift+D` due date · `Shift+M` milestone · `Shift+S` subscribe · `Cmd/Ctrl+Shift+S` manage subscribers · `Cmd/Ctrl+Shift+M` move to team · `Cmd/Ctrl+Shift+O` create sub-issue · `M R / M B / M X / M M` relations (related/blocked-by/blocking/merge-duplicate) · `Cmd/Ctrl+Delete` delete · `Cmd/Ctrl+Alt+P` copy as prompt (CAPTURED) · `W O` work-on-issue menu · `Cmd+Option+.` open in last coding tool.
**Inbox**: `U` read/unread · `Alt+U` all read · `H` snooze · `Backspace` delete · `Shift+Backspace` delete read.
**Triage**: `1` accept · `2` duplicate · `3` decline · `H` snooze.
**Project**: `Cmd/Ctrl+I` details sidebar. **Create modal**: `Cmd/Ctrl+Enter` create · Esc-empty closes, Esc-with-content offers draft.

# 13. SEARCH & COMMAND PALETTE (DOCUMENTED)

- `/` opens workspace search: recent searches + recent issues first; full-text over titles/descriptions/comments; exact IDs (`TRE-37`, `tre37`); relevance prioritizes unstarted/started; max 500 results; quoted phrases for stop-words; refine with filters.
- `Cmd/Ctrl+K` command palette: fuzzy commands grouped by functionality, **groups prioritized by current context** (viewing cycles → cycle commands first); acts on current selection for bulk ops; **contextual invocation** — clicking a property control opens the palette anchored to that control like a dropdown, still searchable.
- Typed prefixes in palette: `i ` issues · `p ` projects · `u ` users · `t ` teams · `l ` labels · `f ` favorites · `d ` documents.
- Palette paints in <100ms from the local store; never a network round-trip for first results.

# 14. ISSUE CREATION MODAL & DRAFTS (CAPTURED + DOCUMENTED)

- Entry: `C` (modal) · `V` (fullscreen) · `Alt+C` (template) · sidebar pencil · board column `+` (pre-fills that column's status) · group header `+` · `linear.new`-style route. Highlighted text pre-fills title.
- Modal anatomy (CAPTURED): centered dialog over dimmed board; header: team chip (icon + "TRENDZO") › "New issue" + right: expand ⤢ + ✕; body: "Issue title" + "Add description…" (rich editor); property chip row: Status (pre-filled, e.g. "In Progress") · Priority · Assignee · Project · Labels · ⋯ (due date, cycle, estimate, recurring, SLA…); footer: paperclip · "Create more" toggle · primary "Create issue".
- **"Save as draft" is content-reactive** (CAPTURED): appears in header on first typed character, disappears when content is cleared; closing an emptied modal = silent close; Esc with content → draft dialog. Two draft layers: ephemeral local composer state (IndexedDB, survives navigation) + explicit saved drafts (server-synced, sidebar Drafts section, 6-month retention).
- Required: team + title + status (default = first Backlog status). "Create more" keeps the modal open, resetting title only. Created issue appears optimistically in list/board instantly.

# 15. BOARD / KANBAN (CAPTURED + DOCUMENTED)

- `Cmd/Ctrl+B` toggles instantly, preserving filters/selection/display config; state persists across reloads.
- Columns = grouped property (default status, first→last status order). Column header: status icon + name + count + hover ⋯ (hide column, etc.) + hover `+` (create with that status).
- **Hidden columns** (CAPTURED): with "Show empty columns" off, empty statuses collapse into a right-hand "Hidden columns" section — one row per status (icon + name + count). Restore via display options or the column ⋯; issues can be dragged onto hidden rows.
- Card anatomy (CAPTURED): muted ID · status glyph + title (13px/500) · ⋯ stub · assignee placeholder top-right · footer shows enabled display props ("Created Aug 24"). No descriptions on cards. Hovering column/card reveals a full-width `+` quick-add pill at column bottom.
- **DnD (dnd-kit)**: pointer-down + movement threshold (plain click still opens the card — cards are real links); lifted card floats under cursor with slight elevation, grab cursor; origin renders a placeholder keeping column height; valid target column highlights subtly; **drop on invalid target snap-returns with no status change, no toast** (CAPTURED); drop in a column = optimistic status change + exact position honored (`S`-shortcut set → top of column); manual order persists workspace-wide in manual/priority ordering; horizontal edge + in-column auto-scroll; post-drop settle ≈150–200ms.
- Swimlanes via sub-grouping (sticky headers, `T` collapses). `Space` peeks a card.

# 16. VIDEO-DERIVED BEHAVIOR CONTRACT (all CAPTURED — reproduce exactly)

From the 63s recording (frame N ≈ N/2s; timelines in video-timeline-1/2.md):

1. Sidebar hover = instant pill highlight; active item = stronger persistent tint; real links show URL preview.
2. Sustained hover on "My issues" → tooltip "Go to my issues" + `G` `M` keycaps.
3. "More" opens anchored popover (Members/Releases/Teams/─/Customize sidebar); click-away dismisses.
4. Route transitions: selection pill moves immediately; old content may persist ≤250ms; never a white flash.
5. Empty states are view-specific (§10.5–10.7) pairing one indigo primary + one neutral secondary.
6. Agent page first-run examples row with dismiss ✕; composer reflows.
7. Issue detail: hover shows editor block drag-handles; clicking empty space under content creates a block with placeholder "Type `/` for commands…" (`/` as keycap chip) that vanishes on blur if empty.
8. Copy-cluster: hover ring on each icon; ⌄ menu ("Copy as prompt ⌘⌥P" / "Configure coding tools…"); clicking copy actions fires toast per §6.5; **two toasts stack and dismiss independently, surviving navigation**.
9. **Realtime**: another user moving the issue Backlog→In Progress flips the rail chip and appends an Activity entry "moved from Backlog to In Progress · just now" live, no reload (delta over WebSocket).
10. Back-gesture navigation works (browser history intact).
11. Insights: two-stage dock (facet tabs → full report); banner dismiss reflows; chart loads async with "Loading…".
12. Filter menu contents exactly as §11.2; click-away applies nothing.
13. Display options: List→Board relabels rows; blue-dot badge on deviation; Reset/Set-default footer.
14. Board: hidden-columns list Backlog/Todo/Done/Canceled/Duplicate with counts; card drag snap-back on invalid drop (twice in the recording); `+` under card opens the create modal pre-seeded "In Progress".
15. "Save as draft" appears/disappears with content (§14).
16. All view state (board mode, insights, display badge) persists across modal open/close and until end of session.

# 17. AUTH & ONBOARDING (DOCUMENTED + CAPTURED)

## 17.1 Login (`/login`)
Methods: **Continue with Google** (OAuth) · **Continue with Email** (sends magic link + numeric code; login page then shows "Enter code" field) · **Passkeys** (WebAuthn via simplewebauthn; registered in Security & Access; NOT available in desktop app) · **Continue with SAML SSO** (enterprise, IdP-initiated too). Admin-configurable allowed methods; logout signs out all sessions; sessions list with location/last-seen + revoke in Security & Access; 30-day inactive expiry.

## 17.2 Signup → workspace
Create account → create workspace (name + URL slug, e.g. `synquic-labs`) → **default team auto-created with workspace name**. Join flows: email invite (role + teams), reusable invite link, approved email domains, SAML JIT. Multiple workspaces per account; switcher in workspace menu (`O W`); multiple accounts toggleable without re-auth.

## 17.3 Profile onboarding (CAPTURED — exact)
Fullscreen 50/50 split (fade-in .2s ease-out): left form pane (padding-inline 80, top 48, bottom 128; content column max-width 400, vertically centered): heading "Set up your profile" (1.25rem/500, ls -.01rem) + "Choose how you'll appear in Linear" (15px/450); field "Name & picture": 44px circular avatar dropzone (1px border, hover overlay `#00000073` + upload icon, hidden file input) + name input (§7.2 spec: h44, r12, maxlength 48, placeholder "Enter your name…"); field "Title" (placeholder "Software engineer", maxlength 128); actions right-aligned mt-40: **Skip** (ghost pill 44px) + **Continue** (primary pill 44px w/ ring ::after). Right pane: portrait hero video (object-fit cover, AV1→H265→H264 ladder) under a double-gradient dark scrim; next step's video preloaded hidden. Step dots fixed bottom-24 centered on left half: active = 24×8 gradient pill, inactive = 8px dot at 0.85 opacity (steps: Profile → Newsletter). React-spring entrance (`opacity/transform`) per block.

# 18. DATA MODEL (REIMPLEMENTED — minimum entity set)

Workspace(id, name, slug, logo) · User/Account (global identity, email) · WorkspaceMember(role: owner|admin|member|guest) · Team(id, key, name, icon, color, settings: estimates/cycles/triage) · TeamMembership · WorkflowState(team, name, color, description, category: triage|backlog|unstarted|started|completed|canceled + system Duplicate; ordered; default = first backlog) · Issue(id, identifier `KEY-n`, title, descriptionYDoc, team, state, priority 0–4, assignee, creator, labels[], project, milestone, cycle, estimate, dueDate, slaState, parent, sortOrders per context, createdAt/updatedAt, subscribers[]) · IssueRelation(type: related|blocks|duplicate) · Label(workspace|team scope, group, color; one-per-group constraint) · Project(name, slug+shortid, icon+color, summary, descriptionYDoc, status category: backlog|planned|started|completed|canceled + custom, priority, lead, members[], teams[], startDate, targetDate w/ granularity, initiative) · ProjectMilestone(name, date, descriptionYDoc, sortOrder, completion%) · ProjectUpdate(health: onTrack|atRisk|offTrack, bodyYDoc, author, editedAt) · Initiative(status: proposed|planned|active|completed|canceled, owner, subInitiatives) · Document/Resource(link|doc, label) · Cycle(number, name?, startsAt/endsAt, cooldown) · Comment(issue, bodyYDoc, parent thread, reactions) · Reaction · Attachment · Notification(type, actor, issue/entity, readAt, snoozedUntil) · Favorite · CustomView(type issue|project|initiative, filters JSON, display JSON, icon+color, owner, shared scope) · Draft(issue payload, composer state) · Template(standard|form; workspace|team) · AgentChat(tabs, messages, status) · AgentSkill(personal|team, name, instructions, slashName) · Loop(name, trigger: schedule|issueCreated|issueUpdated + conditions, instructions, connectors[], permissions{teamRW, webAccess, codeIntelligence, codingSessions, externalWrites, externalSources, outOfScopeActions}, status draft|published|disabled, versions[], runs[]) · LoopRun(startedAt, log, actions, outcome) · UserSettings(theme, homeView, displayNames, firstDayOfWeek, emoticons, commentSubmitKey, fontSize, pointerCursor, underlineLinks, disableAnimations, autoAssignSelf, assignOnStart, sidebarConfig) · ViewPreference(per user per view: layout, grouping, ordering, displayProps…) · PendingTransaction (client-only). IDs are UUIDs; issue numbers sequential per team.

Permissions: owner > admin > member > guest; server-side enforcement on every mutation; sync groups scope delta delivery (§19).

# 19. LOCAL-FIRST SYNC ENGINE (REIMPLEMENTED — architecture per public LSE material)

**Read path**: UI reads ONLY from the in-memory MobX object pool hydrated from IndexedDB. Per-workspace DB `app_<hash>`: one store per model + `_meta` (lastSyncId, firstSyncId, subscribedSyncGroups, schemaHash) + `_transaction` (durable queue). Registry of DBs in a root database; schema-hash change → migrate or re-bootstrap.

**Bootstrap**: full = streamed NDJSON of models + trailer `{lastSyncId, subscribedSyncGroups, databaseVersion}`; partial = per sync-group/model for lazy data (issues/comments lazy-load; boot cost independent of workspace size); local = warm start from IndexedDB then delta catch-up. Lazy collections via partial indexes (`issueId → comments`) + a batching model loader.

**Write path**: setter records modified properties → transaction (Create/Update/Delete/Archive/Unarchive) with undo `changeSnapshot` → batched per tick → persisted to `_transaction` → merged GraphQL mutation → ACK carries lastSyncId → completed when the matching delta arrives. Pending transactions **survive restart** (reload → replay → resubmit).

**Delta sync**: WebSocket handshake exchanges `{lastSyncId}`; behind → request missing range. Server broadcasts sync actions `{id, modelName, modelId, action: I|U|A|D|C|V|G|S, data}` to subscribed sync groups (originator included). Apply: sync-group changes → dependent loads → write IndexedDB (only deltas persist) → update models (MobX granular re-render) → **rebase queued transactions** (client-wins per changed property). Total order by syncId; LWW per property; no CRDT for the object graph (Yjs only inside rich-text docs).

**Offline UX** (DOCUMENTED): "Syncing" indicator next to workspace name with pending-change count when queue is large/slow; edits queue and retry after reconnect or restart; second client sees changes in realtime (must demo the §16.9 scenario with two browsers).

# 20. RICH TEXT (one shared editor everywhere)

Tiptap/ProseMirror + Yjs (y-prosemirror) with: markdown input rules (bold/italic/strike/code, H1–H4, lists incl. todo-lists with 14px checkboxes + drag handles, blockquote, hr, code blocks w/ lowlight, tables, collapsible sections, Mermaid); `/` slash menu; selection bubble toolbar; `@` mentions (users/issues/projects/dates/docs — `@TRE-123` creates a relation); `:emoji:`; file/image/video nodes (upload states, hover toolbars, lightbox); placeholders via `data-empty-text` + `:before content:attr()`; per-author attribution spans (`span.attr[data-user-id]`); agent-change gutter overlays + agent highlight tokens; collab cursors that fade after 6s; editor tokens from §2 (block-spacing 1rem, block-radius 6px, list-inset 1.5rem, safe-area 16px). Title editors are single-line ProseMirror instances (`aria-multiline=false`). Comment composer uses the **elevated** palette scope. Description autosaves via Yjs persistence + debounced server snapshots.

# 21. AGENT · SKILLS · LOOPS (DOCUMENTED behavior, REIMPLEMENTED internals)

- **Agent**: `Cmd/Ctrl+J`; UI per §10.8. Multiple chat tabs in the bottom toolbar (label + unread/working badges); history list; context handoff (open issue/project/selected text); actions execute through the same optimistic-mutation action layer as the UI (create/update issues, projects, milestones, initiatives; summarize; answer questions over local store + server search); permission-scoped; streaming responses rendered with the markdown-stream fade-in (`.5s ease-in per chunk`); stop/cancel + retry.
- **Skills**: personal (Settings → Account → Agent personalization) and team (team settings → AI & Agents), invoked via `/slash` in the composer or auto-applied by relevance; creatable by asking the agent to save the current workflow.
- **Loops**: entity + builder per §18. Triggers: schedule (cron-like phrasing) or issue created/updated matching conditions; each run gives the agent the loop instructions + context (workspace, connectors/MCP, previous runs); draft → publish versioning with restore; run history tab (timing + actions per run); right-click Enable/Disable, clickable Disabled badge; permanent delete; per-loop permission toggles (§18 list); connectors via MCP with admin allowlist. Business-tier gating optional.

# 22. CYCLES & TRIAGE (DOCUMENTED)

- Cycles: per-team enable; duration 1–8 weeks, start day, optional cooldown, up to 15 upcoming; auto-add on started/completed statuses; unfinished issues roll over; capacity from trailing-3-cycle velocity; cycle page with scope/effort graph + % complete; sequential numbering; `G V` current cycle.
- Triage: per-team inbox for issues from integrations/non-members; `G T`; Accept `1` / Duplicate `2` / Decline `3` / Snooze `H`; responsibility + rotations; optional condition→action Triage Rules; AI suggestions optional.

---

# 23. ACCESSIBILITY (CAPTURED patterns — required)

- Skip link `#skip-nav`; SPA route announcer (`role=status` "Navigated to {title}"); sonner toast landmark with `aria-live=polite`.
- Menus: `aria-haspopup="menu"` + `aria-expanded` on triggers; disclosure buttons use bare `aria-expanded` + `aria-controls`; favorite = `role="switch"` + `aria-checked`; selects = `role="combobox"`; todo checkboxes = `role="checkbox"`; date/property chips = `role="button"` with descriptive `aria-label` (e.g. "Change project target date", "No updates. Click to write update.", "Milestone M3 …. Progress: 0%.").
- dnd-kit a11y scaffolding: `aria-roledescription="sortable"`, hidden instruction nodes + assertive live regions per drag context.
- Every icon-only button has an `aria-label` (these double as tooltip copy — the full captured label inventory is in the capture reports).
- Media player exposes `aria-keyshortcuts` (k, m, p, f, `Shift+. Shift+,`) + `role=timer`/`role=slider` controls.
- Full keyboard operability (§12); `:focus-visible` rings everywhere; focus trap in dialogs; focus returns to trigger on close.
- `title` attributes only for truncation-prone names (teams).

# 24. RESPONSIVE (CAPTURED breakpoints: 420, 640, 768, 1023/1024)

- ≥1280: full frame. 1024–1279: header tab strip flex-shrinks (min-width 300→0 under 640), paddings tighten (48→40px content inset).
- ≤1023: sidebar becomes overlay drawer; `--agent-toolbar-height: 0`; content card margins collapse; settings margins 40→22px; select widths 277→200→125; property grids collapse to 1 column ≤640.
- Use the captured **container queries** where Linear does: `modal-backdrop` (<1024), `issue-view-container` (rail clamp §10.3), `agent-session-container`, `embedded-list-row`, project/initiative title containers.
- Wide content scrolls inside its own container; the page never scrolls horizontally.

# 25. PERFORMANCE BUDGETS (REIMPLEMENTED targets)

Hover feedback <16ms (pure CSS); cached issue-detail open <100ms; property mutation applied same frame; palette/search first paint <100ms from local store; list/board virtualization smooth at 1,000+ rows/cards (react-virtuoso; rows use `contain: layout style`, `content-visibility` where apt); route chunks code-split per page (Linear ships ~950 route chunks); no full-page spinner after bootstrap; images/videos lazy; `performance.mark("appStart")` + boot metrics.

# 26. SEED DATA (match the captures so goldens are comparable)

Workspace **Synquic** (`synquic-labs`, avatar "SY", `lch(70% 60 350)`); user `yatharth.kaushal@synquic.in` (YK, cyan avatar) + `chandresh.delwar@synquic.in`; teams: Trendzo `#00a0ff` (key TRENDZO), PGME `#008fff` (Feather), Shrujan `#00aa00`, Icon `#f85911` (Chip), Trikaal `#789c00` (Europe), Tiffsy `#d67600` (Radar, key TIF), Homingo `#00b187` (Home); 10 projects (Driver App 🚚, Consumer App 📱, Retailer App 🛍️, Web Portal 🖥️, Backend ⚙️, Acti Pro, Icon Realty, Shrujan, Trikaal, Cleanse Ayurveda) with the milestone chips, dates, priorities, health and status ring values in `capture-projects.md`; issue **TRENDZO-37 "Research Work"** with its two todo items; Driver App overview content incl. milestone "M3 · Delivery flow (handover → deliver → proof)" (target Aug 28) per `capture-driver-app-overview.md`; the Welcome inbox notification + welcome document per `capture-welcome-to-linear.md`. Keep seed data in fixtures — never hardcode into components.

# 27. TESTING PROTOCOL

## 27.1 Golden screenshots — Playwright at **1914×992**, dark theme
1. Agent new chat · 2. Profile onboarding · 3. Inbox + welcome doc · 4. Projects list · 5. Driver App overview (details rail open) · 6. TRENDZO-37 issue detail · 7. Preferences · 8. Trendzo All-issues list · 9. Display Options open (list) · 10. Insights docked (report mode) · 11. Board with hidden columns · 12. Create modal empty · 13. Create modal with text ("Save as draft" visible) · 14. Display Options open (board) · 15. Filter menu open · 16. "More" popover open · 17. Login page · 18. Command palette open.
Compare against the capture screenshots/frames; fix in order: geometry → typography/spacing → state styling → interaction timing. Diffs must be small and intentional before moving on.

## 27.2 Playwright interaction suites
- create-issue: C → modal → type (draft button appears) → clear (disappears) → Esc-with-content draft dialog → create → optimistic row.
- board: Cmd+B toggle preserves state · column + pre-fills status · drag cross-column optimistic + API-failure rollback + toast · invalid-drop snap-back · hidden columns restore · reload persistence.
- display-options: Shift+V · toggles don't close · board relabel · badge dot · Reset · persistence.
- selection: hover checkbox · X · J/K highlight ring · Shift range · Cmd+A · bulk bar · Esc order.
- inbox: G I · U · H snooze reappears · Backspace · Cmd+F quick-filter.
- palette/search: Cmd+K contextual grouping · prefixes · anchored invocation from a property chip.
- shortcuts: G-sequence hint UI · S/A/P/L on highlight and on selection.
- offline: disconnect → edits queue ("Syncing" + count) → restart → reconnect → single delivery, no dupes → second client converges.
- realtime: two contexts; client B changes status; client A rail + activity update live (§16.9).
- toasts: two copies stack, survive navigation, independent dismissal.
- **video-replay suite**: script the §16 contract end-to-end as one regression test.

## 27.3 Unit: sync engine (transaction lifecycle, rebase, gap detection, replay idempotency), shortcut registry, filter serialization, workflow-state invariants.

# 28. IMPLEMENTATION SEQUENCE (each phase ends with goldens re-run; do not advance with visible mismatches)

1. **Foundation**: Next.js + TS scaffold, token system (§2), theming boot (§3), fonts, icon sprites, app shell (§4) with splash choreography.
2. **Primitives**: buttons/inputs/toggle/select/tooltip/menu/popover/dialog/toast/kbd/avatar/ListCell rows + hover idiom + shortcut registry + portals/announcer.
3. **Local data engine**: models + MobX pool + IndexedDB stores + transaction queue + mock server (bootstrap NDJSON + delta WS) + seed data (§26).
4. **Issues**: team list (grouped, subgrid) → highlight/selection → property pickers → create modal + drafts → issue detail (editor, rail, activity, comments) → display options → board + DnD + hidden columns.
5. **Projects**: projects list table → project overview (all §10.2 blocks) → details rail → milestones → updates/health → activity tab.
6. **Navigation & productivity**: sidebar (dnd, More menu, teams) → command palette → search → filters → custom views → favorites → Inbox (split view, triage keys, welcome doc + media player) → My Issues → Peek.
7. **Realtime backend**: GraphQL + Postgres + delta broadcast + sync groups + offline retry + Yjs collab server + presence.
8. **Auth & settings**: login methods → onboarding (§17.3) → workspace/team creation → full settings IA + Preferences page → permissions.
9. **AI surface**: Agent chat (tabs/history/streaming/actions) → Skills → Loops (builder, versions, run history, scheduler) → agent toolbar/panel.
10. **Hardening**: Insights, Cycles, Triage, a11y pass, perf pass, responsive pass, full golden + suite green.

# 29. NON-NEGOTIABLES (reject any PR violating these)

1. No generic dashboard aesthetics: no giant cards, no 16px-radius white modals, no bright borders, no Tailwind-kit look.
2. No 300–500ms animations on ordinary controls; use §2.4 values; hover-in is 0ms.
3. No network-blocking property edits; no spinners after bootstrap; optimistic always, with reconciliation + rollback.
4. No pointer cursor on buttons (default arrow; §2.5) unless the user preference is on.
5. Highlight ≠ selection (§6.7). Esc order per §6.9.
6. Popovers anchor to their trigger; `[data-menu-open]` trigger state persists while open.
7. List↔board toggle never loses filters/selection/view state; board column order = workflow order.
8. Every icon button has aria-label + tooltip with shortcut where one exists.
9. Rows are real links; keyboard can do everything the mouse can.
10. Typed content is never lost: composer drafts survive navigation and reload.
11. Z-index only from the §2.5 scale; stacking via isolation, not z-index wars.
12. All colors go through tokens; magic numbers live only in the token file with a CAPTURED comment.
13. Dark theme is the reference (goldens); light theme derives from the same token contract (§2.1 boot palette + generated ladder).
14. Destructive actions confirm; deletes archive for 30 days where documented.
15. No hardcoded workspace/team/example strings outside fixtures.

# 30. ACCEPTANCE CRITERIA

**Visual**: at 1914×992 the shell (244px sidebar, 8px/12px floating card, 57px header, 28px agent toolbar), list/board density, type scale/weights (450 body!), icon set, and all 18 goldens match the reference within small intentional diffs.
**Interaction**: every behavior in §6, §11–16 works as specified, keyboard-first, with the captured timings.
**Product**: full flow auth → onboarding → teams → issues → projects → views/search → inbox → settings → agent/skills/loops, with server-enforced permissions.
**Data/realtime**: IndexedDB hydration, pending-mutation persistence across restart, two-client realtime convergence, offline queue + Syncing indicator, ordered delta application with rebase.
**Engineering**: strict TS, no console errors in core flows, green test suites, stored goldens, per-route code-splitting, sync engine unit-tested.

Do not stop after scaffolding or after a single phase. Work phase-by-phase through §28 until every criterion above is satisfied, re-reading the relevant `docs/analysis/*.md` file before each surface and comparing against the captures/frames after each phase.
