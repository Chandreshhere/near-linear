# Linear.app Capture Analysis — Settings / Preferences page
Source: `/private/tmp/claude-501/-Users-moon-Documents-linear/756a3e51-2170-4c62-854d-12969153cc3d/scratchpad/captures/preferences/preferences/index.html` (482 KB) + `styles.css` (643 KB). Captured 2026-08-24. `<title>Preferences</title>`, `lang="en-GB"`, `<html data-sw-cache="true" class="dark logged-out">`.

IMPORTANT global note: Linear styles are StyleX atomic classes (`sx-*`) layered in `@layer priority1..10`, plus hashed component marker classes (`sc2sx-ComponentName-<hash>`) and CSS-module classes (`_name_hash_line`). Theme color tokens (`--sx-*`) are declared EMPTY at `:root` in styles.css and injected at runtime via constructed stylesheets keyed off `theme-provider-<sha>` wrapper divs (`display: contents`). The capture therefore carries exact colors only where inlined as `style="--x-…: lch(...)"` — all quoted below.

---

## 1. APP FRAME GEOMETRY

Settings mode replaces the normal app chrome with: **settings sidebar (left, fixed 244px) + main content card + bottom agent toolbar (28px)**. No top app header exists on this page (the content card has its own 64px drag/header strip).

- Root inline tokens on `<html>`: `--bg-color: lch(2.595% 0.4 272 / 1)` (page+sidebar bg), `--bg-sidebar-color: lch(2.595% 0.4 272 / 1)`, `--bg-base-color: lch(5.52% 0.4 272)` (content card bg), `--bg-border-color: lch(14.16% 1.48 272 / 1)`, `--agent-toolbar-height: 28px`, `--scrollbar-width: 0px`.
- `<meta name="theme-color" content="lch(2.595% 0.4 272 / 1)">`, `<meta name="color-scheme" content="dark">`.
- `#mainLayoutContainer`: `display:flex; width:100%` (`--x-l1z0du: 100%; --x-2164qk: 100%`), row layout; children: sidebar, main column, bottom toolbar.
- **Sidebar**: placeholder div `style="width: 244px"` (in-flow spacer, height 100%) + the real fixed panel `style="width: 244px; left: 0px; top: 0px; bottom: 0px"` with `position:fixed; z-index:96; will-change:transform; max-width:min(100vw - 40px, 330px)`; opacity transition 50ms ease-in-out. Sidebar width is persisted client-side (`splashScreenConfig.sidebarWidth` read from localStorage in an inline boot script).
- **Sidebar resize handle**: absolute strip `top:0; bottom:0; width:7px; cursor:col-resize` on the sidebar edge, with a 1px-wide vertical highlight gradient `linear-gradient(to bottom, lch(100% 0 272 / 0) 0%, lch(100% 0 272 / 0.5) 15%, lch(100% 0 272 / 0.65) 50%, lch(100% 0 272 / 0.5) 85%, lch(100% 0 272 / 0) 100%)` (both left sidebar and content edges have one).
- **Main column**: `flex:1; min-width:0; flex-direction:column`. Inside it `<main class="… section-to-print">` is the floating content card: `border-radius: 12px; margin-right: 8px; margin-bottom: 8px; box-shadow: var(--sx-10lzhmx); border-color: var(--sx-15wwovl); isolation: isolate; background: var(--bg-base-color)`. (Print media resets radius/margins/shadow to 0/none.)
- **Content card header strip**: first child row `height: 64px` containing a `_draggableRegion_b2qal_1` (electron `-webkit-app-region: drag`; html:not(.electron) leaves it inert).
- **Content body**: scroll container with `data-restore-scroll-view="/synquic-labs/settings/account/preferences|0-settings"`; inner wrapper `flex:auto; margin-inline: 40px` (22px at ≤640px), `margin-bottom: 64px`; the column `_content_1kbbg_5` has `max-width: 640px` (`--x-maxWidth: 640px`) with `width:100%`.
- Page title spacer below the H1: `height: 32px` (24px at ≤640px). Section stack gap: `48px` (24px at ≤640px).
- **Settings sidebar header row** ("Back to app"): height `calc(var(--header-height) + 1px)`; global default `--sx-8q2ft0: 57px` is the header-height fallback token; padding-left 4px; contains search row below (`padding: 4px 12px 0 12px` region).
- **Bottom agent toolbar**: in-flow `height: 28px` full-width bar (`--agent-toolbar-height: 28px`), bg `var(--bg-color)`, `z-index: calc(96+1)`, `margin-top: -4px`, right padding 8px; at ≤1024px it gains `border-top: var(--sx-1ele6il) solid var(--sx-1o1lnwn)` and `padding-top:4px`. Contains left-aligned… actually right-aligned (justify-content flex-end, gap 6px) "Agent" pill button + "Chat history" icon button. An invisible `data-agent-panel-anchor` div sits `bottom:100%; width:400px; z-index:250` (agent panel mount anchor, `right:-8px`).
- **Settings sidebar scroll area**: `overflow-y: auto; scrollbar-gutter: stable; padding: 4px 12px 0 12px; outline:none (focus-visible)`, bg `var(--sx-74qs5)`. Sticky top scroll shade: `position:sticky; height:40px; margin-top:-53px; display:none`, enabled under `@supports (animation-timeline: auto)` with inline `animation-timeline: --settings-sidebar-content-scroll; animation-range: 0px 13px` (scroll-driven fade — a Linear signature detail).
- Skip link: `<a href="#skip-nav">Skip to content</a>` (visually hidden until focus; `clip: rect(0 0 0 0); width/height:1px; margin:-1px` pattern, revealed with `padding:1rem` etc.). `<div id="skip-nav">` is the first child of `<main>`.

## 2. FULL DOM OUTLINE (body → ~8 levels)

```
body.content-loaded.is-bootstrapped.loaded.bootstrap-fade-complete.loadingText
├─ script (electron detect / localStorage shim)
├─ #root
│  ├─ div[aria-hidden][data-sprite-set="Base"]    (svg <symbol> sprite, 36 icons)
│  ├─ div[aria-hidden][data-sprite-set="Brands"]  (8 brand symbols)
│  ├─ div[aria-hidden][data-sprite-set="Decorative"] (~300 symbols)
│  ├─ div.theme-provider-30df9d5b…  (display:contents — root theme scope)
│  │  ├─ audio[aria-hidden]  (sound-effects element, absolutely hidden)
│  │  ├─ div[tabindex=-1][data-scroll-container]  (height:0; width:50px; overflow-y:scroll — scrollbar-width measurer)
│  │  ├─ a[href="#skip-nav"] "Skip to content"
│  │  ├─ #mainLayoutContainer (flex row, 100%×100%)
│  │  │  ├─ div.theme-provider-b0573d48…  (sidebar theme scope)
│  │  │  │  └─ div
│  │  │  │     ├─ div[style="width:244px"] (spacer)
│  │  │  │     └─ div[style="width:244px; left:0; top:0; bottom:0"] (fixed sidebar, z-96)
│  │  │  │        ├─ div (rel, flex:1, min-height:0)
│  │  │  │        │  ├─ nav (flex column, h-100%)
│  │  │  │        │  │  ├─ div._draggableRegion  (header row, h = header-height+1px)
│  │  │  │        │  │  │  └─ a[aria-label="Back to app"][href="/synquic-labs/my-issues/assigned"]  ← BackIcon + "Back to app"
│  │  │  │        │  │  ├─ div (search row, padding 4px 12px 0)
│  │  │  │        │  │  │  └─ div[aria-label="Search settings"] > form#_r_29a_ > input[role=search][placeholder="Search…"] + left Search icon (16px, absolute left:2px of wrapper at left:8px)
│  │  │  │        │  │  ├─ div[tabindex=-1][data-scroll-container] (settings nav scroller)
│  │  │  │        │  │  │  ├─ sticky scroll-shade div (scroll-driven animation)
│  │  │  │        │  │  │  └─ div (pt-16) → 5 section groups (margin-bottom:16px each):
│  │  │  │        │  │  │     h2 ("Personal"/"Issues"/"Projects"/"Features"/"Your teams", 13px/500, secondary color, mb-6, pl-10)
│  │  │  │        │  │  │     └─ per item: div[data-visible-sidebar-item] > div[anim] > div[data-contextual-menu] >
│  │  │  │        │  │  │        a[data-active][draggable=false].sc2sx-SidebarLink-StyledLink (h-28 row)
│  │  │  │        │  │  │           ├─ svg 16×16 (inline paths or <use href="#Symbol">)
│  │  │  │        │  │  │           └─ span.sc2sx-SidebarLink-SidebarStyledText (13px/500, h-28, pl-6, pr-9)
│  │  │  │        │  │  │     + trailing row div[tabindex=0][data-menu-open] "Join or create a team" (Plus icon)
│  │  │  │        │  │  └─ div.suspenseFadeIn > div[--x-height:34px]  (lazy footer placeholder)
│  │  │  │        │  └─ div.theme-provider-b0573d48… → bottom-left corner: button[aria-label="Open Help menu"][aria-haspopup=menu] (?-icon, <use href="#QuestionMark">)
│  │  │  │        └─ resize-handle div (fixed strip, cursor:col-resize, w-7, gradient highlight)
│  │  │  ├─ div (main column: flex column, flex:1, min-w-0)
│  │  │  │  ├─ div (flex:1 wrapper)
│  │  │  │  │  ├─ main.section-to-print (content card, radius-12, mr-8 mb-8, shadow)
│  │  │  │  │  │  ├─ #skip-nav
│  │  │  │  │  │  ├─ div[data-loading-caret][data-restore-scroll-view="…|0-settings"][tabindex=-1] (scroller)
│  │  │  │  │  │  │  ├─ div (h-64 header strip) > div._draggableRegion (flex:1)
│  │  │  │  │  │  │  └─ div (content margins) > div._content_1kbbg_5 (max-w-640)
│  │  │  │  │  │  │     ├─ div (opacity-0 fade slot, --x-transition: opacity 150ms)
│  │  │  │  │  │  │     ├─ header row → span "Preferences" (24px/500, lh-32, ls-−0.01rem)
│  │  │  │  │  │  │     ├─ spacer (h-32)
│  │  │  │  │  │  │     └─ div (flex column, gap-48) → 4 section blocks (see §6)
│  │  │  │  │  │  ├─ div (absolute top-0 l/r-0 z-200 pointer-events-none — top edge overlay)
│  │  │  │  │  │  └─ #portalLayoutRoot
│  │  │  │  ├─ div[style="height:28px"] → agent toolbar (see §1)
│  │  │  │  │  └─ … div[data-agent-toolbar-bounds] → [data-agent-panel-anchor] + button[aria-label="Agent"] + button[aria-label="Chat history"]
│  │  ├─ div (fixed, z-581 — overlay/dialog layer)
│  │  └─ section[aria-label="Notifications alt+T"][aria-live=polite][aria-relevant="additions text"] (empty toast viewport)
│  └─ span[role=status][aria-live=polite] "Navigated to Preferences"  (route announcer, visually hidden)
├─ #loading (display:none) > #appBorders > #loading-content > #preloader (+ #loadingText "Loading…")
├─ scripts: CLIENT_ENV / SW_HASH / loading-error / __RELEASE_INFO
└─ 4 trailing portal divs (2 empty; one → div.sx-jp7ctv display:contents; one → nested theme-provider scopes, empty)
```

## 3. VISIBLE TEXT / UI CHROME LABELS

Settings sidebar (exact order):
- Header: **Back to app** (also aria-label)
- Search: placeholder **Search…** (aria-label "Search settings" on wrapper, "Search…" on input)
- **Personal**: Preferences (active), Profile, Notifications, Code & reviews, Security & access, Connected accounts, Agent personalization
- **Issues**: Labels, Templates, SLAs
- **Projects**: Labels, Templates, Statuses, Updates
- **Features**: AI & Agents, Initiatives, Documents, Customer requests, Releases, Pulse, Asks, Emojis, Integrations
- **Your teams**: Trendzo, PGME, Shrujan, Icon, Trikaal, Tiffsy, Homingo; then **Join or create a team** (aria-label too)
- Bottom-left: button aria-label **Open Help menu**
Bottom toolbar: **Agent** (button, aria-label "Agent"), aria-label **Chat history** (icon-only button)
Content: H1 **Preferences**; section H3s: **General**, **Interface and theme**, **Desktop application**, **Automations and workflows** (all row labels/descriptions in §6)
Buttons in rows: **Customize** (aria-label "Customize sidebar")
Other: "Skip to content", route announcer "Navigated to Preferences", toast section label "Notifications alt+T", preloader "Loading…". No `title=` attributes, no `<kbd>` elements, no `aria-keyshortcuts` on this page.

## 4. ROUTE MAP (workspace slug: `synquic-labs`)

- Back to app: `/synquic-labs/my-issues/assigned`
- Account settings: `/synquic-labs/settings/account/{preferences | profile | notifications | code-and-reviews | security | connections | agents}`
- Workspace settings: `/synquic-labs/settings/{issue-labels | issue-templates | sla | project-labels | project-templates | project-statuses | project-updates | ai | initiatives | documents | customer-requests | releases | pulse | asks | emojis | integrations}`
- Team settings: `/synquic-labs/settings/teams/{TRENDZO | PGME | SHR | ICO | TRI | TIF | HOM}`
- Misc: `#skip-nav`, `mailto:support@linear.app` (in error script). Route patterns: `/:workspace/settings/account/:page`, `/:workspace/settings/:page`, `/:workspace/settings/teams/:teamKey`, `/:workspace/my-issues/assigned`.

## 5. KEYBOARD SHORTCUTS IN DOM

Only one: toast region `aria-label="Notifications alt+T"` (sonner's default alt+T focus hotkey). No aria-keyshortcuts, no kbd, no tooltip shortcut text captured (tooltips render into portals at runtime).

## 6. PAGE-SPECIFIC COMPONENT ANATOMY — Preferences settings list

**Section block** (`div#general`, `#interface-and-theme`, `#desktop-application`, `#automations-and-workflows`): flex column, `gap:16px`, `scroll-margin-top:32px`, `padding-top:12px`. Header sub-row: `<h3>` 15px (.9375rem), line-height 23px (1.4375rem), weight 500, primary color. Cards below in column with `gap:12px`.

**Card** (`_cardWrapper_1ykxw_1` > theme-provider > `<section>`): defines tokens `--settings-list-view-item-radius:10px; --…-padding-y:16px; --…-padding-x:16px; --…-min-height:60px; --…-item-gap:12px; --…-border-padding:16px`; card corner radius 10px; ring `box-shadow: 0 0 0 var(--sx-1ele6il) var(--settings-list-view-border-color)`; bg `var(--sx-1ubxoo9)` (elevated surface token); `_cardWrapper + _cardWrapper { margin-top: var(--settings-list-view-box-spacing, 12px) }` (here 0px via `--settings-list-view-box-spacing: 0px` + explicit gap 12).

**Row** (`<li id="…">.sc2sx-SettingsListViewListItemReadOnly` inside `<ul class="_list_1ykxw_6 _border_1ykxw_37">`, list-style none, m/p 0):
- `min-height: 60px; padding: 16px` (x-padding /1.5 at ≤640px); `display:flex; justify-content:space-between; align-items:center; gap:12px` (÷1.5 at ≤640px); hover bg `var(--sx-1gxylln)`.
- Row separator: `_border` variant draws `::after { border-bottom: var(--settings-list-view-thin-pixel,1px) solid var(--settings-list-view-border-color); left/right: 16px; bottom:0 }` on every child except last. First/last row get the card radius via `--settings-list-view-item-top/bottom-radius`.
- Left cell: flex column, `gap:3px`, min-width 0, flex-wrap wrap → `<label>` 13px (.8125rem)/500 primary + `<span>` description 12px (.75rem)/450 secondary (`--sx-1dd5bcf`).
- Right cell: `justify-content:flex-end`, wrapped in `_tooltipTriggerContent_1et26_1`.

**Every row on this page, with control + captured state:**

§ General (`#general`, card of 5 rows)
1. `display-home` — "Default home view" / "Select which view to display when launching Linear" → **Radix Select** button, value: `Linear Agent (default)` — "(default)" rendered as muted suffix span.
2. `display-names` — "Display names" / "Select how names are displayed in the Linear interface" → Select, value **Full name**.
3. `display-first-weekday` — "First day of the week" / "Used for date pickers" → Select, value **Monday**.
4. `behaviors-convert-emojis` — "Convert text emoticons into emojis" / "Strings like :) will be converted to 🙂" (🙂 is a `data-type="emoji"` span, 14px box, font-size 11px/13px ladder) → **Toggle, ON (checked)**.
5. `behaviors-send-comment-on` — "Send comments on…" / "Choose which key press is used to submit comments" → Select, value **Enter**.

§ Interface and theme (`#interface-and-theme`, TWO cards)
Card 1 (5 rows):
1. `app-sidebar` — "App sidebar" / "Customize sidebar item visibility, ordering, and badge style" → **push Button "Customize"** (aria-label "Customize sidebar"; small pill button: inline-flex, height 32 min-width 32, border-radius 9999px is NOT right — actual: radius from button variant, bg transparent, hover bg `var(--sx-629164)`, 12px/500 text).
2. `display-font` — "Font size" / "Adjust the size of text across the app" → Select, value **Default**.
3. `display-pointer-cursor` — "Use pointer cursors" / "Change the cursor to a pointer when hovering over any interactive elements" → Toggle, OFF.
4. `display-underline-links` — "Underline links" / "Always underline links in text content" → Toggle, OFF.
5. `display-autoplay-animated-images` — "Disable animated images & emoji" / "When enabled, GIFs and animated emojis will be static by default and animate only on hover." → Toggle, OFF.
Card 2 (theme card with expandable drawer):
1. `interface-theme` — "Interface theme" / "Select or customize your interface color scheme" → Select whose value renders an **"Aa" theme chip** (span 20px-ish rounded swatch: `--x-backgroundColor:#111212; --x-color:#e2e3e5; --x-1g451k2:#5e69d1` = accent) + text **System preference**. Row sits in a `_drawer…` container (`position:relative`, overflow drawer).
2. (revealed sub-list, `<ul>` w/ open animation `opacity:1; height:auto; transform:none`) `theme-system-light-appearance` — "Light" / "Theme to use for light system appearance" → Select w/ chip `#f8f8f9/#2f2f31/#6d78d5` + text **Light**.
3. `theme-system-dark-appearance` — "Dark" / "Theme to use for dark system appearance" → Select w/ chip `#111212/#e2e3e5/#5e69d1` + text **Dark**.

§ Desktop application (`#desktop-application`, 1 row)
1. `behaviors-open-desktop` — "Open in desktop app" / "Automatically open links in desktop app when possible" → Toggle, OFF.

§ Automations and workflows (`#automations-and-workflows`, 2 rows)
1. `behaviors-assign-issues-self` — "Auto-assign to self" / "When creating new issues, always assign them to yourself by default" → Toggle, OFF.
2. `behaviors-git-auto-assign` — "On move to started status, assign to yourself" / "When you move an unassigned issue to started, it will be automatically assigned to you" → Toggle, OFF.

**Select control anatomy** (Radix): `<button type="button" role="combobox" aria-controls="radix-_r_XXX_" aria-expanded="false" aria-autocomplete="none" dir="ltr" data-state="closed" data-select-variant="default" id="<row>-control">`. Exact style: `height:30px; padding-left:10px; padding-right:28px; border-radius:8px; border:var(--sx-1ele6il) solid transparent; font-size:.8125rem; width:var(--settings-list-view-input-width)` → **277px** (max-width 200px ≤768px, 125px ≤640px); bg `var(--sx-hfmm6c)`, hover bg `var(--sx-13kjjc4)`; ring `box-shadow: 0 0 0 var(--sx-1ele6il) var(--sx-1jmjcvw)` (hover `--sx-1ikf7kw`); text ellipsis nowrap; chevron-down svg **10px wide**, absolute right, color `lch(63.304% 1.425 272 / 1)`.

**Toggle (checkbox) anatomy** — a styled native `<input type="checkbox">`:
- Track: `appearance:none; width:30px; height:20px; border-radius:72px; border:0`; unchecked bg `var(--sx-ickszr)`; checked bg inline `lch(47.551% 0.913 271.998 / 1)`; checked+hover `lch(56.238% 1.008 271.999 / 1)`; transition background-color/opacity ease-out.
- Thumb: `::before` pseudo `content:""; position:absolute; top:50%; translateY(-50%); height:14px; border-radius:7px; background:#fff` with `left`/`right` insets animated: unchecked left 3px/right 13px → checked left 13px/right 3px (hover intermediate 11px — the thumb stretches while moving); `transition: left,right .1s ease-out` with 50ms staggered delays (`--sx-imi5ey`/`--sx-hsrmg4` 0s/50ms swap) — the signature Linear toggle squish.
- Hit area: second pseudo expands −6px on all sides (`--x-d62und…: -6px`). Focus: `outline-offset: 2px` on :focus-visible.

**"Customize" button**: rounded pill (`border-radius:9999px` marker + height 32/min-width 32), transparent bg, hover bg `var(--sx-629164)` + text `var(--sx-ys2i3t)`, label 12px/500, transition 0.15s (0s on pointer-fine hover).

## 7. ICON INVENTORY

Three SVG sprite sets mounted hidden in #root: `data-sprite-set="Base"` (36 symbols: Attachment, Blockquote, Calendar, Checklist, CodeBlock, Comment, CreditCard, CustomView, Favorite, Folder, Home, Inbox, Initiative, IssueStatus{Backlog,Done,Review,Started,Todo,Triage}, Label, Link, Lock, MilestoneNone, MilestoneStatus{Done,Planned,Started}, MyIssues, Project, Refresh, Search, Send, Subscribe, Team), `Brands` (Anthropic, Claude, Cursor, GitHub, GitLab, Meta, OpenAI, Ramp), `Decorative` (~300: Ai, Rocket, Radar, Chip, Europe, Feather, Face, Page, QuestionMark, Team, Home, LinearAi w/ gradients+blur filters, Linear, Slack, Notion, Figma, Discord, Sentry, Zendesk, Zapier, …).

Used on THIS page (`<use href="#…">`): Connected→"Connected accounts" nav; Page→"Documents"; Face→"Emojis"; team icons (14×14 box, `color-override` fill, opacity .9): Trendzo=#Team `#00a0ff`, PGME=#Feather `#008fff`, Shrujan=#Team `#00aa00`, Icon=#Chip `#f85911`, Trikaal=#Europe `#789c00`, Tiffsy=#Radar `#d67600`, Homingo=#Home `#00b187`; QuestionMark→Help button.
Inline-path icons (16×16, `role="img"`, `fill` via `--icon-color` cascade, default `lch(60.621% 1.2 272 / 1)`): Back arrow (Back to app), Search (input prefix), Preferences (sliders), Profile (person), Notifications (bell), Code & reviews, Security & access, Agent personalization, issue/project section icons, AI & Agents, Initiatives, Customer requests, Releases, Pulse, Asks, Integrations, Plus (Join/create team), Chat history, chevron-down (selects, 10px), chevron for theme drawer. The bottom "Agent" button icon is a 16px hexagon-badge path with `mask#_r_2av_-hole-50` cutting a stroke-dasharray arc circle (r=4, cx=7.5, cy=8, dasharray `calc(12.56) 25.12`, rotate(-90)) — an agent progress-ring cutout.
Icon color plumbing: `svg { fill: var(--icon-color) }`, `--icon-color: var(--icon-replacement-color, var(--icon-default-color))`; rows/hover set `--icon-replacement-color` (e.g. active sidebar link → `var(--sx-ys2i3t)`), `.color-override` opts out.

## 8. SCRIPTS / ASSETS / EMBEDDED STATE

- One executable module: `https://static.linear.app/client/assets/html.9O-Enmr6.js` + **1046 `<link rel="modulepreload">`** chunks from `https://static.linear.app/client/assets/…`.
- Font: `InterVariable.woff2?v=4.1` preloaded from `static.linear.app/fonts/` (preconnect to static.linear.app). Favicon `favicon-D8hcELd9.svg`; PWA `pwa.webmanifest`; apple-touch-icon; `<meta name="apple-itunes-app" content="app-id=1645587184">`.
- Tech identified from vendor chunk names: **React + React DOM, React Router, MobX + mobx-react-lite + mobx-utils, ProseMirror (full suite: model/state/view/transform/commands/markdown/tables/changeset/dropcursor/gapcursor/history/inputrules/schema-list/utils), Yjs + y-prosemirror + lib0, Radix UI (`vendor-radix-ui`), StyleX (`stylex.8_DjV60Q.js`), Emotion, GraphQL + graphql-request, TanStack (query), Sentry, date-fns, lodash, uuid, idb (IndexedDB), comlink (workers), fflate, markdown-it, highlight.js + lowlight, popperjs, react-spring, react-window, react-dropzone, react-instantsearch (Algolia), react-medium-image-zoom, react-day-picker, sonner (toasts), focus-trap + tabbable, spacetime (timezones), yup + zod, semver, pluralize, lz-string, object-hash, fast-equals, chenglou (reanimated easing)**. App-level chunk names expose feature components: LinearLayout, MainAppLayout, AgentPanel/AgentPage/AgentToolbar*, FastIssueCreateEditor, Tooltip, Select, Toggle, Popover, ContextualMenuActions, DeveloperToolbar, HelpCenter, ToastPresenter, RouteAnnouncer, ScrollRestoration, SettingsIcon etc.
- Inline scripts: `performance.mark("appStart")`; splash-screen bootstrap reading `localStorage.splashScreenConfig` (incl. `sidebarWidth`) + `prefers-color-scheme`; `var global={window},process={env:{}}` shim; Electron UA sniff adding `.electron` class + localStorage setItem guard; `CLIENT_ENV = {"COUNTRY_CODE":"IN","SENTRY_DSN":"https://f172c25063bf4e3492ece32b840ab90b@o415358.ingest.us.sentry.io/5337513","SENTRY_TUNNEL":"https://s.linear.app/tunnel"}`; `SW_HASH="5fd8ce2b7c1…"`; loading-error fallback (links to linearstatus.com / mailto:support@linear.app); `__RELEASE_INFO = { BUILD_REVISION:"74834", CLIENT_VERSION_HASH:"e101b78e63f74642affe", DEPLOYED_AT:"2026-08-24T13:09:49+0000", SHORT_SHA:"fac8d475486", PR_NUMBER:"87799" }`. No preloaded JSON app-state blob (data loads via GraphQL/IndexedDB at runtime).

## 9. STATE CLASSES & ATTRIBUTES

- `data-active="true|false"` on every settings-nav `<a>` (30×) — active link gets bg `var(--sx-1yxodyc)→var(--sx-1edn6di)` and primary text/icon color; inactive hover bg `var(--sx-16hn3q3)`.
- `data-menu-open="false"` on tooltip/menu trigger wrappers (6×); CSS keys off `[data-menu-open="true"]` for persistent hover states (`_menuOpenBg_ekx18_56`, `_menuOpenColor_ekx18_61` on the Customize/Help buttons).
- Radix Select: `role="combobox"`, `aria-expanded="false"`, `data-state="closed"` (8×), `aria-controls="radix-_r_2dc_|_r_2df_|_r_2di_|_r_2dm_|_r_2ds_|_r_2e3_|_r_2e8_|_r_2eb_"`, `data-select-variant="default"`, `aria-autocomplete="none"`, `dir="ltr"`.
- `aria-haspopup="menu"` + `aria-expanded="false"` on Help button. `checked=""` on toggle inputs.
- `data-visible-sidebar-item="true"` (30×), `data-contextual-menu="true"` (31×, right-click menu hosts), `data-scroll-container="true"`, `data-restore-scroll-view="<route>|0-settings"`, `data-loading-caret="true"`, `data-search-input="true"`, `data-1p-ignore="true"` (1Password), `data-sw-cache="true"` (html), `data-sprite-set`, `data-agent-toolbar-bounds`, `data-agent-panel-anchor`, `data-type="emoji"`.
- Body boot classes: `content-loaded is-bootstrapped loaded bootstrap-fade-complete loadingText`; html: `dark logged-out` (capture served from SW cache pre-auth-hydration).
- CSS pseudo-state system: `@media (any-hover: hover) and (any-pointer: fine)` gates ALL hover styles; focus ring tokens `--focus-ring-width:1px`, `--focus-ring-outline: var(--focus-ring-width) solid var(--focus-ring-color)`; `:focus-visible` outlines with negative offset on nav links; `.sx--default-marker` group-hover marker class on buttons.

## 10. UNUSUAL / LINEAR-SIGNATURE DETAILS

1. **Runtime theme injection**: all color tokens (`--sx-ys2i3t` primary text, `--sx-1dd5bcf` secondary, `--sx-1ubxoo9` elevated bg, `--sx-1urpf9d` card border, etc.) are declared empty in styles.css `:root` and filled by constructed stylesheets scoped to hashed `theme-provider-*` divs (`display:contents`) — 3 distinct theme scopes nest on this one page (app, sidebar, card).
2. **lch() everywhere** — all captured concrete colors are LCH with hue 272 (e.g. bg `lch(2.595% 0.4 272)`, icons `lch(60.621% 1.2 272)`).
3. **StyleX atomics in numbered @layers** (`@layer priority1…priority10`) + semantic marker classes `sc2sx-ComponentName-hash` (SidebarLink-StyledLink, SidebarLink-SidebarStyledText, Text, Flex, SettingsListViewListItemReadOnly, SidebarSectionActionButton) that carry no styles of their own but anchor descendant rules.
4. **Scroll-driven-animation scroll shade** in settings sidebar: `animation-timeline: --settings-sidebar-content-scroll; animation-range: 0px 13px` under `@supports (animation-timeline: auto)`.
5. **Toggle thumb squish** via dual left/right inset animation with 50ms staggered transition-delay swap; −6px invisible hit-area inflation pseudo.
6. **Scrollbar-width measurer** div (`height:0; width:50px; overflow-y:scroll`) feeding `--scrollbar-width: 0px` on `<html>`.
7. **Route announcer** `span[role=status]` ("Navigated to Preferences") + sonner toast `section[aria-label="Notifications alt+T"]`; `#portalLayoutRoot` inside `<main>` for layout-scoped portals plus 4 portal divs after `#root`; overlay layer `z-index: calc(580+1)`; sidebar z-96, agent toolbar z-97, agent panel anchor z-250.
8. **Hidden `<audio>` element** at app root (UI sound effects).
9. **Agent-first bottom toolbar** (28px, `--agent-toolbar-height`) with masked progress-ring agent icon and 400px-wide panel anchor — Preferences "Default home view" is set to **"Linear Agent (default)"**.
10. **Electron-ready web build**: `_draggableRegion` divs (app-region: drag), `isElectron` sniffing, `-webkit-app-region:no-drag` atoms on interactive chrome; served from service-worker cache (`data-sw-cache`, `SW_HASH`), body classes staged for splash fade; `#loading` preloader with Linear logo SVG retained in DOM.
11. Sprite architecture: 3 mounted symbol sets (Base/Brands/Decorative) — brand symbols include **Anthropic, Claude, OpenAI, Cursor** (agent integrations).
12. Content card is a **floating rounded panel** (radius 12, 8px gaps) over the sidebar-colored page bg — no top header bar at all in settings; "Back to app" replaces workspace switcher.
