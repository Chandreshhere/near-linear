# Forensic Analysis — Capture "inbox-welcome-to-linear" (Linear.app, 2026-08-24)

Source files:
- `/private/tmp/claude-501/-Users-moon-Documents-linear/756a3e51-2170-4c62-854d-12969153cc3d/scratchpad/captures/inbox-welcome-to-linear/inbox-welcome-to-linear/index.html` (363,651 B)
- `/private/tmp/claude-501/-Users-moon-Documents-linear/756a3e51-2170-4c62-854d-12969153cc3d/scratchpad/captures/inbox-welcome-to-linear/inbox-welcome-to-linear/styles.css` (642,856 B, 7,343 rules; concatenation of per-chunk CSS files, each prefixed `/* Source: https://static.linear.app/client/assets/<Chunk>-<hash>.css */`)

## CRITICAL CAVEAT — what this capture actually contains

Although the document `<title>` is **`Inbox › Welcome to Linear`** (and an aria-live region announces `Navigated to Inbox › Welcome to Linear`), the rendered DOM is **NOT the Inbox split view**. At capture time the client was on the Inbox route but displaying the **post-signup onboarding overlay, step "Set up your profile"** (component chunk: `Onboarding` / `OnboardingStepLayout` / `StyledOnboardingComponents`; the Inbox notification behind it would have been the `WelcomeMessageInboxView` chunk). Hard evidence:

- Zero `href="/..."` in-app links anywhere in the document (0 hits for `href="/`).
- Zero occurrences of: `notification` (as DOM text/attr), `My Issues`, `data-radix`, `data-state`, `contenteditable`, `ProseMirror` in the DOM.
- The live app region between the ThemeProvider div and `#loading` is only ~10.3 KB and contains exactly the onboarding profile form described in §6.
- No sidebar, no header, no list rows exist in this DOM.

Everything below reports exact values for what IS in the file, plus app-frame constants recoverable from `styles.css` and the splash-screen system (which encode the real app frame geometry).

---

## 1. APP FRAME GEOMETRY

### 1a. Root/html state (inline `style` on `<html>`) — exact values
```
<html data-sw-cache="true" lang="en-GB" class="dark" style="
  --bg-color: lch(2.595% 0.4 272 / 1);
  --bg-sidebar-color: lch(2.595% 0.4 272 / 1);
  --bg-base-color: lch(5.52% 0.4 272);
  --bg-border-color: lch(14.16% 1.48 272 / 1);
  --agent-toolbar-height: 28px;
  --scrollbar-width: 0px;">
```
These are restored from `localStorage.splashScreenConfig` + `sessionStorage.splashScreenConfig` by an inline head script before paint (script also toggles `.dark`, injects `<meta name="theme-color">` = `#09090A` dark / `#EFEFF0` light fallback).

### 1b. App-frame constants from `styles.css` (`:root` splash block)
```
--sidebar-width: 244px;            /* DEFAULT sidebar width */
--agent-toolbar-height: 0px;       /* default; 28px live per html inline style */
--scrollbar-width: 12px;           /* default; 0px live (overlay scrollbars) */
--bg-sidebar-light:#efeff0; --bg-base-color-light:#f9f9fa; --bg-border-color-light:#e2e2e2;
--content-color-light:#b0b5c0;    --content-highlight-color-light:#23252a;
--bg-sidebar-dark:#09090a;  --bg-base-color-dark:#121213;  --bg-border-color-dark:#212224;
--content-color-dark:#6b6f76;     --content-highlight-color-dark:#ffffff;
--loading-error-secondary-bg-dark:#1c1c1d; --loading-error-secondary-border-dark:#ffffff22;
--loading-error-secondary-hover-bg-dark:#252627; --loading-error-secondary-label-dark:#e2e3e5;
--control-border-radius: 4px; --radius-rounded: 9999px;
```
Signature Linear frame — the splash `#appBorders` mirrors the real app shell ("content card floats inside sidebar-colored window"):
```
#appBorders {
  border: 1px solid var(--bg-border-color);
  background-color: var(--bg-base-color);
  margin: 8px;
  margin-left: var(--sidebar-width);          /* 244px default */
  margin-bottom: calc(8px + var(--agent-toolbar-height));
  border-radius: 12px; flex-grow: 1; display: flex;
  transition-property: margin;
}
@media (min-resolution:192dpi) { #appBorders { border-width: .5px } }  /* + --loading-error-thin-pixel: 0.5px */
html.dark.logged-out #appBorders { background: var(--bg-sidebar-color); --sidebar-width: -1px }
```
So: sidebar region = window background (`#09090a` dark), content card = `#121213` with `1px #212224` border, `12px` radius, `8px` outer gap; content is pushed down an extra `28px` at bottom by the agent toolbar when active. If `userSettings.openLinksInDesktop` is true in web, an inline script sets `--sidebar-width: 8px` (web treated as link-opener only).

### 1c. Other frame-relevant tokens found in `styles.css`
```
--header-height: initial;  --sx-8q2ft0: 57px   (paired with header-height in same block)
--focus-ring-width: 1px; --focus-ring-outline: 1px solid var(--focus-ring-color);
--content-view-header-tabs-min-width: 300px; --content-view-header-tabs-flex: 1 1 300px;
--action-trigger-min-width: 32px;
--overview-form-margin-top: 64px; --overview-subheader-top-position: 12px;
--settings-list-view-item-radius:10px; --settings-list-view-item-min-height:60px;
--settings-list-view-item-padding-x:16px; --settings-list-view-item-padding-y:12px;
--settings-list-view-box-spacing:12px; --settings-list-view-item-gap:12px;
--settings-list-view-item-border-padding:16px;
--editor-block-spacing:1rem; --editor-block-radius:6px; --editor-line-height:1.6;
--editor-letter-spacing:-.00666667em; --editor-list-inset:1.5rem;
--editor-todolist-checkbox-width:14px; --editor-block-menu-size:20px; --editor-block-menu-offset:28px;
--line-number-width: 50px; --pr-file-list-sidebar-width: 0px;
--logic-list-item-label-width: 6ch; --column-width: 24px;
--comment-actions-padding-left: 50px;
--dp-font-size-small:.8125rem; --dp-font-weight-medium:500; --dp-thin-pixel:1px;
--fuzzy-date-picker-month-horizontal-spacing:.96rem;
--pointer: default; --external: pointer;    /* Linear uses default cursor on buttons, pointer only for external links */
```

### 1d. Onboarding overlay layout (this page's visible frame)
- Fullscreen column: `display:flex; flex-direction:column; height:100%; background-color:var(--sx-1m4y240); overflow:auto; overscroll-behavior:contain;` entrance animation `sx-ekv6nw-B` (fade 0→1) `.2s ease-out both`.
- Split panes: left form pane `flex: 50%; padding-inline: 80px; padding-top: 48px; padding-bottom: 128px; overflow-y:auto;` (at `max-width:768px`: `padding-inline:24px; padding-top:24px`). Right video pane `flex: 50%; position:relative; overflow:hidden; pointer-events:none;` with `:after` inset border line (`width: var(--sx-1ele6il)` = thin pixel, left:0, top:0, bottom:0).
- Form column content: `max-width: 400px; width:100%; margin-block:auto; -webkit-app-region:no-drag`.

---

## 2. FULL DOM OUTLINE

```
<body class="content-loaded is-bootstrapped loaded bootstrap-fade-complete loadingText">
├─ <script> (isElectron detector, adds .logged-out on auth routes; --sidebar-width:8px if openLinksInDesktop)
├─ <div id="root">
│  ├─ <div aria-hidden="true" data-sprite-set="Base"       style="position:absolute;width:0;height:0;overflow:hidden">  → <svg><symbol×33/></svg>
│  ├─ <div aria-hidden="true" data-sprite-set="Brands"     …>  → <svg><symbol×8/></svg>
│  ├─ <div aria-hidden="true" data-sprite-set="Decorative" …>  → <svg><symbol×264/></svg>
│  ├─ <div class="theme-provider-30df9d5b4e5bf09fbc0b518b7744c76022d13532" style="display:contents">
│  │  ├─ <audio aria-hidden="true" class="…clip-rect 1px, absolute, opacity:0, pointer-events:none"> (no source; notification-sound slot)
│  │  ├─ <div tabindex="-1" data-scroll-container="true" class="sx-qtp20y sx-1pju0fl sx-1rife3k">  /* height:0; width:50px; overflow-y:scroll — scrollbar-width measurer */
│  │  │  └─ <div></div>
│  │  ├─ <div class="onboarding fullscreen column (see §1d)">
│  │  │  ├─ <video preload="auto" playsinline aria-hidden tabindex="-1" class="fixed -9999px 1×1 opacity:0">   /* preloading next step bg */
│  │  │  │  └─ <source src="https://static.linear.app/video/onboarding/generic.av1.webm" type='video/webm; codecs="av01.0.12M.08"'>
│  │  │  ├─ <div class="flex column flex:1 min-height:0">           /* main row wrapper */
│  │  │  │  └─ <div class="flex flex:1 min-height:0 min-width:0">   /* horizontal split */
│  │  │  │     ├─ LEFT PANE (flex:50%, see §6 for full anatomy: heading, avatar upload, name input, title input, Skip/Continue)
│  │  │  │     └─ RIGHT PANE (flex:50%)
│  │  │  │        ├─ <video width="1680" height="2160" autoplay loop playsinline preload="auto" aria-hidden object-fit:cover>
│  │  │  │        │  ├─ <source …/video/onboarding/profile.av1.webm  type='video/webm; codecs="av01.0.12M.08"'>
│  │  │  │        │  ├─ <source …/video/onboarding/profile.h265.mp4  type='video/mp4; codecs="hvc1.1.6.L150.90"'>
│  │  │  │        │  └─ <source …/video/onboarding/profile.h264.mp4>
│  │  │  │        └─ <div class="absolute inset:0 pointer-events:none" style-class sx-zfsr82>  /* double gradient vignette, see §10 */
│  │  │  └─ (stepper, fixed bottom — see §6)
│  │  ├─ <div class="sx-ixxii4 sx-1355n6m">   /* position:fixed; z-index:calc(580 + 1) — overlay/portal mount root, empty */
│  │  └─ <section aria-label="Notifications alt+T" tabindex="-1" aria-live="polite" aria-relevant="additions text" aria-atomic="false"></section>  /* Sonner toast viewport */
│  └─ <span role="status" aria-live="polite" aria-atomic="true" class="visually-hidden (1×1 clip-path inset(50%))">Navigated to Inbox › Welcome to Linear</span>  /* RouteAnnouncer */
├─ <div id="loading" style="transition-duration:0ms; display:none">   /* splash, hidden */
│  └─ <div id="appBorders">
│     └─ <div id="loading-content">
│        ├─ <div id="preloader"><div id="preloaderContent"><svg class="bkg"/><svg id="logo"/></div></div>
│        └─ <div id="loadingText">Loading…</div>
├─ <script> CLIENT_ENV  ├─ <script> SW_HASH  ├─ <script> loading-error handler  ├─ <script> __RELEASE_INFO
└─ <div></div>          /* trailing empty portal div */
```

Notable structural attributes: `data-sprite-set` (Base/Brands/Decorative), `data-scroll-container="true"`, `data-1p-ignore="true"` on inputs, `_hideLastPass_801jb_3` class (+ CSS `._hideLastPass_801jb_3+[data-lastpass-icon-root]{display:none}`), `_tooltipTriggerContent_1et26_1` tooltip-trigger wrapper class, `sc2sx-Flex-d11c8f6e` / `sc2sx-Text-c50a30fa` (styled-components→StyleX bridge marker classes on every Flex/Text primitive), `sx--default-marker` (StyleX parent-marker for descendant hover selectors).

---

## 3. VISIBLE TEXT LABELS (complete inventory)

UI copy in DOM (in order):
1. `Set up your profile` (h-level heading, span 20px/500)
2. `Choose how you'll appear in Linear` (subtitle, 15px/450)
3. `Name & picture` (field label, 13px/500)
4. `Title` (field label)
5. `Skip` (secondary button)
6. `Continue` (primary button)
7. `Loading…` (#loadingText, hidden splash)
8. `Navigated to Inbox › Welcome to Linear` (SR-only route announcer)

Placeholders:
- `Enter your name…` (input#onboarding-name, maxlength=48)
- `Software engineer` (input#onboarding-title, maxlength=128)

aria-labels (all in file):
- `Upload profile photo` (avatar dropzone, role=button)
- `Profile photo` (hidden file input)
- `Upload an avatar` (hover-overlay icon, tooltip content)
- `Notifications alt+T` (Sonner toast region)
- `Go to Profile` (stepper dot 1, `aria-current="step"`, `aria-disabled="true"`)
- `Go to Newsletter` (stepper dot 2, `aria-disabled="true"`)

Loading-error fallback copy (injected by inline script on asset failure):
- Title: `Network error while loading`
- Description: `Something might be wrong with your connection. Reload the app to try again.`
- Buttons: `Reload` (href=location.href), `Contact support` (mailto:support@linear.app)

Page title: `Inbox › Welcome to Linear`.
No sidebar items, header buttons, tabs, column headers, or menu items exist in this DOM (see caveat).

---

## 4. ROUTE MAP

No in-app anchor hrefs exist (onboarding renders buttons, not links). Route intelligence recovered from inline scripts:
- Auth-route allowlist (adds `html.logged-out`): `/add-account`, `/join`, `/login`, `/logout`, `/mobile-auth`, and prefixes `/auth/`, `/connect/`.
- Error reporting beacon path: `location.origin + "/asset-load-failure"`.
- External: `mailto:support@linear.app`; asset origin `https://static.linear.app` (fonts `/fonts/…`, client bundles `/client/assets/…`, videos `/video/onboarding/…`, PWA manifest `/client/pwa.webmanifest`).
- Workspace slug: **not present anywhere in this capture** (user hadn't finished onboarding).
- Route surface implied by preloaded chunk names (see §8 list): Inbox, MyIssuesPage, ActiveIssuesPage/BacklogIssuesPage/AllIssuesPage, TriagePage, CyclesPage/CyclePage, ProjectsPage/ProjectPage/ProjectOverviewPage, InitiativesPage/InitiativeOverviewPage, DocumentPage, CustomViewsPage/CustomViewPage, TeamsPage/TeamHomePage, SearchPage, ArchivePage, DraftsPage, PullRequestPage/ReviewsPage, ReleasePipelinesPage/ReleasePage, AutomationsPage, AgentPage/AgentSessionPage, TimelinePage, UsagePage, plus ~60 settings pages (Account*, Workspace*, Team* — full list §8).

---

## 5. KEYBOARD SHORTCUTS IN DOM

Only one: **`alt+T`** — embedded in the Sonner toast region label `aria-label="Notifications alt+T"` (Sonner's default hotkey to focus toasts). No `aria-keyshortcuts` attributes, no `<kbd>` elements, no tooltip shortcut hints exist in this capture (app chrome absent). `KeyboardHelper`, `useIsKeyPressedRef`, `keyboardUpDownNavigation`, `AccountShortcutsSettingsPage` chunks confirm the shortcut system but carry no bindings in HTML.

---

## 6. PAGE-SPECIFIC COMPONENT ANATOMY — Onboarding "Set up your profile"

### 6a. Header block
- Outer stack gap `32px`; inner heading stack gap `6px`. Each text is wrapped in `<div style="opacity:1; transform:none">` (react-spring entrance).
- Title `<span>`: `font-size:1.25rem; font-weight:500; letter-spacing:-.01rem; line-height:normal; color: var(--x-4xs81a)` where inline `--x-4xs81a: var(--sx-ys2i3t)` (= theme "title" text token; theme token VALUES are injected at runtime and empty in captured CSS).
- Subtitle `<span>`: `font-size:.9375rem; font-weight:450; line-height:1.4375rem; color: var(--sx-1dd5bcf)` (muted token).

### 6b. Form (gap 24px; each field column gap 12px)
Field 1 — label `Name & picture` (13px/500, color `var(--sx-1eapsa9)` label token), then row `gap:10px`:
- **Avatar dropzone** `<div role="button" tabindex="0" aria-label="Upload profile photo">`: `width:44px; height:44px (sx-n3w4p2); border-radius:50%; position:relative; overflow:hidden; cursor:var(--pointer); border: var(--sx-1ele6il) solid var(--sx-1o1lnwn); background-color: var(--sx-1ubxoo9); color: var(--sx-1dd5bcf); focus: box-shadow var(--sx-c3gk8m), outline:none`.
  - Hidden `<input type="file" aria-label="Profile photo" tabindex="-1">` visually hidden via clip-rect pattern.
  - Default state icon: inline 16×16 person SVG, `fill="lch(61.803% 1.2 272 / 1)"`, fades `opacity 1→0` on hover/active (`.25s ease-out`).
  - Hover overlay: absolute inset 0, `background-color:#00000073`, `opacity:0→` on hover (`transition .15s`), contains `_tooltipTriggerContent_1et26_1` wrapper with 16×16 upload icon `fill="lch(100% 5 288.421 / 1)"` + `aria-label="Upload an avatar"`.
- **Name input** `#onboarding-name`: `height:44px; padding:12px (block+inline); border-radius:10px→12px (later class wins: 12px); border: var(--sx-1ele6il) solid var(--sx-w1p5jj); background: var(--sx-1mc3c6y); font-size: var(--sx-11lpf43) (=.8125rem token; on this large input the sx-1wsllsr token applies); color: var(--sx-ys2i3t); ::placeholder color var(--sx-1eapsa9); hover/active border-color: var(--sx-b9djef)` with inline `--x---sx-b9djef: lch(24.32% 6.48 272 / 1)` (exact hover-border color). `autocomplete=off maxlength=48 data-1p-ignore _hideLastPass`. `flex-grow:1; min-width:0`.

Field 2 — label `Title` + input `#onboarding-title` (identical styling, `maxlength=128`, placeholder `Software engineer`).

### 6c. Action row
`display:flex; justify-content:flex-end; gap:12px; margin-top:40px` (react-spring wrapper `opacity:1; transform:none`).
- Shared button base: `display:inline-flex; align-items:center; justify-content:center; height:44px (sx-n3w4p2); min-width:32px; padding-inline:18px; border-radius:9999px; font-size:.8125rem; font-weight:500; border: var(--sx-1ele6il) solid; transition: border,background-color,color,opacity .15s (0s while hover/active); disabled opacity:.6; user-select:none`.
- **Skip** (ghost): `background:transparent; border-color:transparent; color:var(--sx-1dd5bcf); hover/active → background var(--sx-629164), color var(--sx-3zwjav)`; `--btn-highlight-bg: var(--sx-629164); --btn-highlight-color: var(--sx-3zwjav)`; CSS-module hooks `_menuOpenBg_ekx18_56 _menuOpenColor_ekx18_61 _menuOpenTextColor_ekx18_66`.
- **Continue** (primary): `background-color: var(--sx-hfmm6c); color: var(--sx-3zwjav); background-clip:padding-box; hover/active bg var(--sx-13kjjc4)`; overlay ring via `:after` (`border-radius:inherit; box-shadow: var(--btn-overlay-shadow)` where `--btn-overlay-shadow: 0 0 0 var(--sx-1ele6il) var(--sx-1jmjcvw), var(--sx-10lzhmx)`; hover swaps to `--sx-1ikf7kw`); module hooks `_menuOpenBg_ekx18_56 _menuOpenOverlay_ekx18_79`.

### 6d. Step indicator (fixed, bottom of LEFT half)
- Container: `position:fixed; bottom:24px; left:0; right:50%; display:flex; justify-content:center; z-index:1`; inner: `display:flex; align-items:center; gap:12px; width:var(--x-width)` inline `--x-width: 44px`.
- 2 steps, each a `<button tabindex="-1" cursor:default min-width:8px>` inside `_tooltipTriggerContent_1et26_1`:
  - Step "Profile" (`aria-current="step"`): track dot `8×8, border-radius:999px, background:var(--sx-1dd5bcf), opacity var(--x---sx-toat0o)=0` at inline `--x-left:0px` + **active pill** `24×8, border-radius:999px, background-image:linear-gradient(90deg,var(--sx-3zwjav) 0%,var(--sx-1dd5bcf) 100%)`, `width:24px; opacity:1`; hidden hit-area span `24×32 at top:-12px; left:-8px; z-index:2`.
  - Step "Newsletter": dot at `--x---sx-toat0o: 0.85; --x-left:16px`, hit-area `left:8px`.
- Transition `opacity .2s ease-out`; `:active` dot opacity .9 via `sx--default-marker` parent selector.

### 6e. Background media
- Right pane hero video 1680×2160 (portrait), `object-fit:cover; width/height:100%`, opacity transition `.35s ease` (0s under `prefers-reduced-motion`); AV1 webm → HEVC mp4 → H264 mp4 source ladder.
- Gradient scrim over video: `background-image: linear-gradient(#08090a 11.83%, #08090a84 42.48%, #08090a80 50%, #08090a83 66.74%, #08090a 100%), linear-gradient(270deg, #08090a99 0%, #08090a4d 50%, #08090a99 100%)`.
- Hidden 1×1 preload video for the generic onboarding background (`generic.av1.webm`).

---

## 7. ICON INVENTORY

Three SVG sprite sheets mounted as hidden divs under `#root` (`data-sprite-set`), all symbols `viewBox="0 0 16 16"` (one Decorative exception `0 0 35 30`), **305 symbols total**. NOTE: zero `<use>` references exist in this DOM — sprites are preloaded for the app; the two icons actually rendered (avatar person, upload arrow) are standalone inline `<svg width=16 height=16 role="img">`.

- **Base (33):** Attachment, Blockquote, Calendar, Checklist, CodeBlock, Comment, CreditCard, CustomView, Favorite, Folder, Home, Inbox, Initiative, IssueStatusBacklog, IssueStatusDone, IssueStatusReview, IssueStatusStarted, IssueStatusTodo, IssueStatusTriage, Label, Link, Lock, MilestoneNone, MilestoneStatusDone, MilestoneStatusPlanned, MilestoneStatusStarted, MyIssues, Project, Refresh, Search, Send, Subscribe, Team.
- **Brands (8):** Anthropic, Claude, Cursor, GitHub, GitLab, Meta, OpenAI, Ramp.
- **Decorative (264):** the emoji-ish icon-picker set — Accessibility, Africa, Ai/AiApp/AiDocument/AiWriting, AlarmClock, Alert, Android, Apple, Asterisk, Auth0, Automation, Bank, BarChart, Basketball, Bolt, Book, Brain, Briefcase, Bug, Calculator, Camera(Ai), Chart, Chat, Chip, Chrome, Circle, Clock, Cloud, Coffee, Compass, Cone, Crown, CrystalBall, Cube, Dashboard, Database, DesignTools, Diagram, Dice, Dino, Discord, Dna, Dollar, Edge, Education, Email, Eraser, Ethereum, Euro, FaceId + 10 Face* variants, Factory, Feather, Figma, Fire, Firefox, Flag, Flower, Gears, GooglePlay, Hack, Health, Heart, Home, Hourglass, Image, Intercom, Joystick, Judge, Leaf, LightBulb, **LinearAi** (gradient stops #585a5c→white + blur filters), **Linear**, MacOS, MagicWand, Megaphone, Mic, MicrosoftTeams, MobilePhone, Moon, Mountain, Network, Notion, OnePassword, Page, Paint, Phone, PieChart, Pin, Pizza, Pointer, Present, Project, QuestionMark, Radar, Recycle, Report, Robot, Rocket, Runner, ScatterPlot, Search, Sentry, Server, Shield, Ship, Skull, Slack, SoccerBall, Solana, Speaker, Speedometer, Spreadsheet, Stadium, Starred, Stopwatch, Storm, Sun, Tablet, Terminal, ThumbsUp/Down, Train, Trash, Tree, Umbrella, Users, Video, VisionPro, Watch, WindTurbine, World, Wrench, Write, WritingAI, Zapier, Zendesk, … (full list enumerable from `<symbol id>` grep).
- Inline (rendered): person/avatar glyph `fill=lch(61.803% 1.2 272 / 1)`; upload glyph `fill=lch(100% 5 288.421 / 1)`. Icon CSS contract: `fill: var(--icon-color)`; `--icon-color: var(--icon-replacement-color, var(--icon-default-color))`; `--icon-default-color: var(--x---icon-default-color)` (inline per-instance); buttons set `--icon-replacement-color: currentColor`.
- Splash: `<svg class="bkg">` (pulsing rounded-square, `logoBackgroundPulse` keyframes 0%→scale(.8)/opacity 0, 70% opacity 1, 100% scale(1)/opacity 0) + `<svg id="logo">` (Linear logo, `fill: var(--content-color)`).

---

## 8. SCRIPTS / ASSETS / TECHNOLOGY

- Entry: `<script type="module" src="https://static.linear.app/client/assets/html.9O-Enmr6.js">` + `rolldown-runtime.KFiyTY0I.js` (**Rolldown/Vite** build), `preload-helper`, ~**1,015 unique** preloaded chunks (964 modulepreload links).
- Fonts (`@font-face` in styles.css): **Inter Variable** wght 100–900 normal+italic (`/fonts/InterVariable.woff2?v=4.1`), **Berkeley Mono** variable (`/fonts/Berkeley-Mono-Variable.woff2?v=3.2`), synthetic "Linear Thai" (local() stack, U+E00–E7F). Font stacks: `--font-regular:"Inter Variable","SF Pro Display",-apple-system,…`; `--font-monospace:"Berkeley Mono","SFMono Regular",Consolas,…`; `--font-emoji:"Apple Color Emoji",…`.
- PWA: `pwa.webmanifest`, favicon SVG `favicon-D8hcELd9.svg`, apple-touch-icon 180×180, service-worker hash var `SW_HASH="5fd8ce2b7c1450…"`, `data-sw-cache="true"` on html; apple-itunes-app id **1645587184**.
- Inline globals: `CLIENT_ENV = {"COUNTRY_CODE":"IN","SENTRY_DSN":"https://f172c25063bf4e3492ece32b840ab90b@o415358.ingest.us.sentry.io/5337513","SENTRY_TUNNEL":"https://s.linear.app/tunnel"}`; `__RELEASE_INFO = { BUILD_REVISION:"74834", CLIENT_VERSION_HASH:"e101b78e63f74642affe", DEPLOYED_AT:"2026-08-24T13:09:49+0000", SHORT_SHA:"fac8d475486", PR_NUMBER:"87799" }`; `var global={window:window},process={env:{}}` shim; `performance.mark("appStart")`.
- **84 vendor bundles** (definitive dependency list): react, react-dom, react-router, **mobx + mobx-react-lite + mobx-utils** (state), **yjs + y-prosemirror + y-protocols + lib0** (collab), **prosemirror-*** ×14 (editor), **radix-ui** (primitives), emotion, **stylex** (app chunk), react-spring, react-virtuoso, react-window, tanstack, dnd-kit, downshift, formik + yup + zod, graphql + graphql-request, algoliasearch + instantsearch + react-instantsearch, sentry, **sonner** (toasts), popperjs, focus-trap + tabbable, date-fns + spacetime (tz), d3-scale-chromatic + d3-shape + **nivo** (charts), highlight/lowlight, markdown-it (+footnote), prosemirror-markdown, diff, idb, comlink (workers), fflate, lz-string, uuid, semver, simplewebauthn, react-dropzone, react-avatar-editor, react-day-picker, react-medium-image-zoom, compromise (+dates NLP), re2js, sanity-client (+image/asset utils, portabletext — changelog CMS), smol-toml, pluralize, html-entities, fast-equals, object-hash, leeoniya (uPlot?), chenglou, alcalzone.
- 933 app chunk names map the whole product surface — notable: `MainAppLayout`, `LinearLayout`, `SplitView/SplitViewList/SplitViewPanel/SplitIssueView`, `Inbox`, `InboxActionControls`, `InboxInfoBox`, `WelcomeMessageInboxView`, `PullRequestInboxView`, `DocumentInboxView`, `ProjectOverviewInboxView`, `CustomerNeedInboxModal`, `MarkNotificationAsRead`, `NotificationChannelPage`, `NotificationSettingsPage`, `priorityInboxSettingsMetadata`; Agent surface: `AgentPanel`, `AgentSessionPage`, `AgentToolbarState`, `LinearAgentMcpSettings`, `workspaceMcpServerConnectionsQuery`, `skillSlashAction`, `useAgentElicitation`; full settings tree (`Account{Profile,Preferences,Security,Shortcuts,Connections,CodeAndReviews,Agents}SettingsPage`, `Workspace*SettingsPage` ×~30, `Team*SettingsPage` ×~20); editor: `CollaborativeEditor`, `CollabEditing`, `RealtimeUserPresence`, `DocumentMinimap`; misc: `CommandIcon`, `ContextualMenuActions`, `HelpCenter`, `FeatureFlagDrawer`, `DeveloperToolbar`, `three` (three.js!), `material-icons-sprite`.

---

## 9. STATE CLASSES & SELECTOR CONVENTIONS

Present in this DOM:
- `<html>`: `class="dark"`, `data-sw-cache="true"`; `.logged-out` added on auth routes.
- `<body>`: `content-loaded is-bootstrapped loaded bootstrap-fade-complete loadingText` (splash lifecycle; `body.loaded #loading{opacity:0}`, `.loadingText #loadingText{opacity:1}`, `bootstrapFadeIn`/`suspenseFadeIn` keyframes).
- ARIA state: `aria-current="step"`, `aria-disabled="true"`, `aria-hidden="true"`, `aria-live="polite"`, `role="status"`, `role="button"`, `role="img"`.
- Inline react-spring style state: `style="opacity: 1; transform: none;"` on animated blocks.
- StyleX conventions: atomic classes `sx-*`; conditional variants via CSS `:where()` parent markers (`.sx--default-marker:hover *`, `.sx-1lkofqy:active *`); per-instance dynamic values via inline custom props `--x-*` consumed by `var(--x-…)` classes (e.g. `--x-width`, `--x-left`, `--x---sx-toat0o`, `--x---sx-b9djef`, `--x---icon-default-color`, `--x-4xs81a`).
- Data-attribute state contract (from CSS, ready for the full app): `[data-menu-open=true]`, `[data-active=true]`, `[data-disabled=true]`, `[data-highlighted]`, `[data-lastpass-icon-root]`, `--radix-select-trigger-width`/`--radix-select-content-available-height` custom props (Radix Select), Sonner keyframes `sonner-fade-in/out`, `sonner-spin`, `swipe-out-{left,right,up,down}`; `_ProseMirror-cursor-blink_r72r4_1` and `editor-collab-cursor-fade-out` keyframes (editor); `columnResizeHandleFadeIn`, `tableDropIndicatorFadeIn`.
- CSS Modules classes co-exist with StyleX: `_tooltipTriggerContent_1et26_1`, `_hideLastPass_801jb_3`, `_menuOpen*_ekx18_*`, `_draggableRegion_b2qal_1` (electron `-webkit-app-region:drag`).

---

## 10. LINEAR-SIGNATURE / UNUSUAL FINDINGS

1. **Splash-screen config replay**: `localStorage.splashScreenConfig` (+session override) restores sidebar width, agent toolbar height, and 4 bg colors as CSS vars on `<html>` *before* first paint, so the app frame skeleton (`#appBorders`) renders with the user's exact geometry while loading. Rebuild must replicate `--sidebar-width` (244px default), `--agent-toolbar-height` (28px here), and the 8px-margin/12px-radius content card.
2. **lch() color space everywhere** — all live theme colors are `lch(…)` strings (e.g. window bg `lch(2.595% 0.4 272 / 1)`, content bg `lch(5.52% 0.4 272)`, border `lch(14.16% 1.48 272 / 1)`, icon gray `lch(61.803% 1.2 272 / 1)`, hover border `lch(24.32% 6.48 272 / 1)`). Theme token *values* (`--sx-*` palette) are injected at runtime by ThemeProvider — the captured stylesheet declares them empty (`--sx-ys2i3t: ;`), a key gotcha for faithful rebuilds.
3. **Scrollbar measurer**: dedicated `height:0; width:50px; overflow-y:scroll` div under ThemeProvider feeds `--scrollbar-width` (0px here → overlay scrollbars).
4. **Portal/overlay root**: empty `position:fixed; z-index:calc(580 + 1)` div sits between app and toast viewport (contextual menus/modals mount here); plus a bare trailing `<div></div>` as last body child.
5. **Sonner toast viewport** rendered as `<section aria-label="Notifications alt+T">` even during onboarding.
6. **RouteAnnouncer**: visually-hidden `role=status` span announcing `Navigated to <title>`; visually-hidden helper pattern uses `clip-path: inset(50%)` + 1×1 px.
7. **Hidden `<audio>` element** slot mounted at app root (notification sounds).
8. **Cursor philosophy**: `--pointer: default` — Linear buttons use the default arrow cursor; `pointer` is reserved for external links (`--external: pointer`).
9. **Onboarding media system**: portrait 1680×2160 AV1→H265→H264 hero videos from `/video/onboarding/*`, plus a hidden 1×1 preload video for the next step; double-gradient `#08090a` scrim.
10. **Electron-aware web build**: `-webkit-app-region` classes, `isElectron` sniffing, `.electron #appBorders{margin:-1px}`, desktop-link mode collapsing `--sidebar-width` to 8px.
11. **Asset-failure UX baked into inline JS**: 30s `__entryLoadTimeout`, script-error listener, localStorage-throttled beacon to `/asset-load-failure`, and a full DOM-string error card (copy in §3).
12. **Three sprite sets** (Base/Brands/Decorative, 305 symbols, 16×16) inlined into every page — including brand icons for Anthropic, Claude, Cursor, OpenAI, Meta — with `<use>` on demand.
13. **Typography**: Inter Variable (100–900) with `font-feature-settings:"calt" 0` on inputs; Berkeley Mono for code; base UI font size token `.8125rem` (13px), weights 450 (normal) / 500 (medium); `interpolate-size: allow-keywords` set at root (modern CSS).
14. **Build provenance embedded**: `__RELEASE_INFO` with build revision 74834, PR number 87799, deploy timestamp 2026-08-24T13:09:49Z; `CLIENT_ENV.COUNTRY_CODE: "IN"`.
