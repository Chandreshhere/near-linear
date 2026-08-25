# Forensic capture analysis — Linear.app Project Overview ("Driver App")

Capture: full-page DOM of the real Linear web client, 2026-08-24.
Files: `.../captures/driver-app-overview/driver-app-overview/index.html` (569,373 B) and `styles.css` (643,402 B).
Page: `https://linear.app/synquic-labs/project/driver-app-0f150687c354/overview` — `<title>Driver App › Overview</title>`.
Build: `__RELEASE_INFO = { BUILD_REVISION: "74834", CLIENT_VERSION_HASH: "e101b78e63f74642affe", DEPLOYED_AT: "2026-08-24T13:09:49+0000", SHORT_SHA: "fac8d475486", PR_NUMBER: "87799" }`.
`CLIENT_ENV = {"COUNTRY_CODE":"IN","SENTRY_DSN":"https://f172c25063bf4e3492ece32b840ab90b@o415358.ingest.us.sentry.io/5337513","SENTRY_TUNNEL":"https://s.linear.app/tunnel"}`; `SW_HASH="5fd8ce2b7c14501c591376529c3a084f31400e59"`.

Styling system: StyleX atomic classes (`sx-*`, one declaration each), CSS-module classes (`_name_hash_line`), styled-component marker classes (`sc2sx-ComponentName-hash` — these carry the React component names). Theme values live in CSS custom properties; the semantic tokens (`--sx-ys2i3t` = primary text, `--sx-1dd5bcf` = secondary/label text, `--sx-3zwjav` = tertiary text, `--sx-15wwovl` = border, `--sx-1ubxoo9` = panel bg, `--sx-629164` = hover bg, `--sx-1ele6il` = hairline border width) are *registered empty* at `:root` in styles.css and injected at runtime by `theme-provider-<sha>` classes (CSSOM, not captured). Resolved values appear inline as `--x-*` custom props with `lch()` colors.

---

## 1. APP FRAME GEOMETRY

- `<html class="dark logged-out" data-sw-cache="true">` with inline theme vars:
  `--bg-color: lch(2.595% 0.4 272 / 1)`, `--bg-sidebar-color: lch(2.595% 0.4 272 / 1)`, `--bg-base-color: lch(5.52% 0.4 272)`, `--bg-border-color: lch(14.16% 1.48 272 / 1)`, `--agent-toolbar-height: 28px`, `--scrollbar-width: 0px`.
  `<meta name="theme-color" content="lch(2.595% 0.4 272 / 1)">`, `<meta name="color-scheme" content="dark">`.
- `<body class="content-loaded is-bootstrapped loaded bootstrap-fade-complete loadingText">`.
- `#root` → `#mainLayoutContainer` (`display:flex; width/height:100%` via `--x-l1z0du:100%; --x-2164qk:100%`; `align-items:stretch`, `overflow:clip`, `transition: height,min-height .2s ease-out`, safe-area padding left/right).

Frame = **left sidebar (244px) | main column (header + scrollable content + right panel 400px) | bottom agent toolbar (28px)**.

### Left sidebar
- In-flow placeholder `div.sx-5yr21d` `style="width: 244px"` + actual sidebar `position:fixed; left:0; top:0; bottom:0; width:244px; z-index:96; max-width:min(100vw - 40px, 330px)`, `will-change:transform`. CSS also defines `--sidebar-width: 244px`.
- Sidebar top row: `--x-height: 44px; --x-marginTop: 8px`, padding-left 5px; workspace button contains a 24×24 avatar (`--x-width/height: 24px`, initials "SY", bg `lch(70% 60 350 / 1)`, font-size 11px, white) + name + 13×9 chevron.
- Sidebar scroll container: `data-scroll-container`, `overflow-y:auto`, `padding-top:26px; padding-left:12px; --x-paddingRight:12px; scrollbar-gutter:stable`, `scroll-timeline-name: --sidebar-content-scroll` (top fade element animates over `animation-range: 0px 26px`).
- Sidebar item rows (`sc2sx-SidebarLink-StyledLink-b4d1f6a9`): border-radius 8px, margin 1px 0, label 0.8125rem (13px) / weight 500, icon 16×16 at color `lch(60.621% 1.2 272 / 1)`; active state via `data-active` + `.active > *` selectors; hover bg `var(--sx-16hn3q3)`.
- Section headers ("Workspace", "Your teams"): `<button aria-expanded data-sidebar-section-type="header">`, text 0.75rem (12px)/500 in `var(--sx-1dd5bcf)`, chevron on hover; collapsible region `#sidebarWorkspace` / `#sidebarMyTeams`.
- Teams list: `ul#teams-boundary-container`, outer container inline `height: 202px` (7 team rows ≈ 28.9px each incl. 1px margins). Team row: disclosure `<button aria-expanded="false" draggable="true">` with 14×14 colored team icon, name span (13px/500, `title` attr), chevron (hover), `aria-label="Team menu"` 3-dot (hover). Collapsed children container `height: 0px; opacity: 0`.
- Sidebar bottom overlay: absolutely-positioned row with `aria-label="Open Help menu"` icon button (`#QuestionMark` sprite, 16px); a `--x-height: 34px` spacer sits at scroll-area end inside `.suspenseFadeIn`.

### Header (inside `<main>`)
- `<header>`: `min-height: calc(var(--header-height, var(--sx-8q2ft0)) + var(--sx-1ele6il))` where `--sx-8q2ft0: 57px` (i.e. **57px + 1px border**), `background-color: var(--header-color)`, flex-column, `contain: layout style`, electron drag region (`_draggableRegionDisableChildren_b2qal_7`).
- Row A — breadcrumb bar: padding-inline 8px (`max(8px, var(--scrollbar-width))` right), **border-bottom: 1px solid var(--sx-15wwovl)**; inner row `justify-content:space-between; gap:6px`; title container `min-height: calc(var(--header-height, 57px))` → **row A is the 57px row**.
- Row B — tab bar: row, `align-items:center; gap:6px; padding-left:8px; padding-right:max(8px, var(--scrollbar-width))`; tabs strip `min-width:300px→flex-basis:300px`, `--content-view-header-tabs-min-width:24px; --content-view-header-tabs-flex:1 1 24px`. Tab links are pill buttons: **height 28px, min-width 28px, border-radius 9999px, font-size 0.75rem/500, padding-left 10px, padding-right 10px, max-width 200px**; wrapper `div.sx-1sxf85j` border-radius 5px. Row B height comes from content (28px pills + 4px vertical margins ≈ 34px).
- Content scroller: `tabindex=0 data-scroll-container data-restore-scroll-view="project-overview" data-table-overhang-boundary="both"`, `overflow-y:auto; overflow-x:auto; min-width:600px; padding-left:48px; padding-right:48px` (40px at narrow widths via doubled-specificity override), `scrollbar-gutter: stable both-edges`.
- Overview form `#form-new-project`: flex-column, `width:100%; max-width:80ch; margin-top: var(--overview-form-margin-top) = 64px; margin-bottom:24px; padding-bottom:40px`.

### Right panel (project details sidebar)
- Wrapper `div` inline `margin-left: 0px; width: 400px; transform: none` (**default width 400px**), `flex:none; z-index:90`; gradient edge layer `background-image: linear-gradient(to left, var(--sx-1ubxoo9), transparent)`; `<aside>` absolute inset-0, flex-column, `overflow-x:hidden`.
- Scroll container `aria-label="Project sidebar" data-scroll-container data-restore-scroll-view="project-sidebar" data-restore-scroll="vertical"`, `scrollbar-gutter: stable`, `background-color: inherit`.
- Each section is a card: `border: var(--sx-1ele6il) solid var(--sx-15wwovl); border-radius: 10px; background-color: var(--sx-1ubxoo9); box-shadow: var(--sx-10lzhmx); padding: 12px; margin-bottom: 8px; margin-right: 8px`.

### Bottom agent toolbar
- `div` `height: 28px` (matches `--agent-toolbar-height: 28px`), full width, `background-color: var(--bg-color); z-index: calc(96 + 1); border-top: var(--sx-1ele6il) solid var(--sx-1o1lnwn); padding-top: 4px; margin-top: -4px→0`.
- Contains left "Agent" pill button (14×14 icon, label 12px) with `data-agent-panel-anchor` popover anchor, and right `aria-label="Chat history"` icon button; wrapper `data-agent-toolbar-bounds="true"`, right inset 8px.

---

## 2. FULL DOM OUTLINE (semantic tree)

```
html.dark.logged-out[data-sw-cache]
└─ body.content-loaded.is-bootstrapped.loaded.bootstrap-fade-complete.loadingText
   ├─ script (isElectron sniff)
   ├─ #root
   │  ├─ 3 hidden SVG sprite sheets: div[data-sprite-set="Base"|"Brands"|"Decorative"] (w/h 0)
   │  ├─ div.theme-provider-30df9d…  (display:contents — app theme scope)
   │  │  ├─ audio (hidden, notification sound; no src at rest)
   │  │  ├─ div[data-scroll-container] (h:0 w:50px overflow-y:scroll — scrollbar-width measurer)
   │  │  ├─ a[href="#skip-nav"] "Skip to content"
   │  │  ├─ #mainLayoutContainer
   │  │  │  ├─ div.theme-provider-b0573d48…  (sidebar theme scope)
   │  │  │  │  └─ div > [244px placeholder, fixed sidebar]
   │  │  │  │     └─ nav (flex-col, h:100%)
   │  │  │  │        ├─ div._draggableRegion (electron drag strip)
   │  │  │  │        ├─ top row (44px): button[aria-label="Synquic Workspace Menu"][aria-haspopup=menu]
   │  │  │  │        │   + button[aria-label="Search workspace"] + div[data-contextual-menu]
   │  │  │  │        │   + button[aria-label="Create new issue"]
   │  │  │  │        └─ div[data-scroll-container] (sidebar scroll)
   │  │  │  │           ├─ top links: Inbox → /synquic-labs/inbox · My issues → /my-issues/assigned · Agent → /agent
   │  │  │  │           │   (+ hidden slot div[data-sidebar-link-placeholder="drafts"]) — each link
   │  │  │  │           │   wrapped div[role=button][data-visible-sidebar-item] + dnd-kit live regions
   │  │  │  │           ├─ section "Workspace" (button[aria-expanded=true][data-sidebar-section-type=header])
   │  │  │  │           │   └─ #sidebarWorkspace: Projects → /projects/all · Views → /views/issues
   │  │  │  │           │       · 2 hidden items · Loops → /loops · 1 hidden · "More" (role=button
   │  │  │  │           │       aria-label="Show more links")
   │  │  │  │           ├─ section "Your teams" (+ button[aria-label="Join a team"])
   │  │  │  │           │   └─ #sidebarMyTeams > ul#teams-boundary-container (h:202px)
   │  │  │  │           │       li[data-draggable-id=<uuid>] ×7: Trendzo(#Team #00a0ff) ·
   │  │  │  │           │       PGME(#Feather #008fff) · Shrujan(#Team #00aa00) · Icon(#Chip #f85911) ·
   │  │  │  │           │       Trikaal(#Europe #789c00) · Tiffsy(#Radar #d67600) · Homingo(#Home #00b187)
   │  │  │  │           │       each with collapsed #team-<uuid> sub-list (h:0)
   │  │  │  │           ├─ div[data-contextual-menu][flex-grow:1] (right-click dead zone) + 34px spacer
   │  │  │  │           └─ bottom overlay: button[aria-label="Open Help menu"][aria-haspopup=menu]
   │  │  │  ├─ main column div (flex-col, flex:1)
   │  │  │  │  └─ <main>
   │  │  │  │     ├─ #skip-nav
   │  │  │  │     └─ div[data-loading-caret] (view root)
   │  │  │  │        ├─ div[z-index:96] > <header>
   │  │  │  │        │  ├─ Row A: breadcrumbs — a[href=/synquic-labs/projects/all]"Projects" ›
   │  │  │  │        │  │   div[data-contextual-menu] > 🚚 emoji (16px in 24px box) +
   │  │  │  │        │  │   a[href=…/overview]"Driver App" + button[role=switch aria-label="Add to
   │  │  │  │        │  │   favorites" aria-checked=false] + button[aria-label="Project actions"
   │  │  │  │        │  │   aria-haspopup=menu]  ▏right: button "Copy page URL" + button "Setup
   │  │  │  │        │  │   project notifications"
   │  │  │  │        │  └─ Row B: tabs — a"Overview"[data-active=true data-disabled=true] ·
   │  │  │  │        │      a"Activity" · a"Issues" · button[aria-label="Add new view"](+)
   │  │  │  │        │      ▏right: button[aria-label="Open project insights" data-state=inactive] ·
   │  │  │  │        │      button[aria-label="Close project details" data-state=active aria-expanded=true]
   │  │  │  │        ├─ content row (flex)
   │  │  │  │        │  ├─ scroll container [data-restore-scroll-view=project-overview]
   │  │  │  │        │  │  └─ #form-new-project (80ch)
   │  │  │  │        │  │     ├─ title row: button[aria-label="Choose icon"](28×32, r5.5px, 🚚 22px)
   │  │  │  │        │  │     │   + ProseMirror[aria-label="Project name"] "Driver App" (1.5rem/600)
   │  │  │  │        │  │     ├─ ProseMirror[aria-label="Project summary"] (0.9375rem/450)
   │  │  │  │        │  │     ├─ grid[auto minmax(0,1fr); gap 12px 16px]
   │  │  │  │        │  │     │   ├─ h3"Properties" + section: pills Backlog · No priority ·
   │  │  │  │        │  │     │   │   SY"Synquic" · Jul 27th → Sep 30th · Trendzo(lead team) ·
   │  │  │  │        │  │     │   │   Trendzo(teams) · [+ label, hover]
   │  │  │  │        │  │     │   └─ h3"Resources" + section#resources: button
   │  │  │  │        │  │     │       "Add document or link…" (hover reveal)
   │  │  │  │        │  │     ├─ update strip: button (icon) + "Write first project update"
   │  │  │  │        │  │     ├─ #project-description: h3"Description" +
   │  │  │  │        │  │     │   ProseMirror[aria-label="Initiative description"]
   │  │  │  │        │  │     │   [data-editor-id="project-f8161b9b-2807-4a9b-9790-02a696992335"]
   │  │  │  │        │  │     │   + attribution/agent-change gutter overlays (data-testid)
   │  │  │  │        │  │     └─ section#milestone-list: h3"Milestones" +
   │  │  │  │        │  │         #milestone-d406f835-86cd-4133-bff8-b7ccebbd1947 card +
   │  │  │  │        │  │         "Milestone" add button
   │  │  │  │        │  ├─ floating outline rail (abs, right:12px, top:var(--overview-subheader-top-position))
   │  │  │  │        │  │   bars 8px + hover panel: Description / Milestones / M3 (padding-left 22px)
   │  │  │  │        │  └─ right panel wrapper (400px) > aside > [Project sidebar]
   │  │  │  │        │     ├─ card "Properties" (+ aria-label="Add dependency") → #projectDetailsProperties
   │  │  │  │        │     │   rows (label col 90px): Status=Backlog · Priority=No priority ·
   │  │  │  │        │     │   Lead=SY Synquic · Members="Add members" · Dates=Jul 27th→Sep 30th ·
   │  │  │  │        │     │   Lead team=Trendzo · Teams=Trendzo · Channel="Teams channel" ·
   │  │  │  │        │     │   Labels="Add label"
   │  │  │  │        │     ├─ card "Milestones" (+ aria-label="Add milestone") → #projectDetailsMilestones
   │  │  │  │        │     │   rows h:42px, columns data-column-id="user|percent|estimate":
   │  │  │  │        │     │   M3 row (icon+name · "0% of 0" · See issues · Aug 28 · actions menu) ·
   │  │  │  │        │     │   "No milestone" row ("See issues")
   │  │  │  │        │     └─ card "Activity" (+ "See all" → …/activity) → #projectDetailsActivity
   │  │  │  │        │         div[data-activity-item data-item-type="entries-project"] ×2
   │  │  │  │        ├─ #portalLayoutRoot  (in-main portal mount)
   │  │  │  ├─ bottom agent toolbar (28px, see §1)
   │  │  ├─ div (z-index 581) — overlay layer
   │  │  └─ section[aria-label="Notifications alt+T" aria-live=polite aria-relevant="additions text"] — toast viewport
   │  ├─ span[role=status] "Navigated to Driver App › Overview" — SR route announcer
   ├─ #loading > #appBorders > #loading-content (#preloader, #loadingText "Loading…") — boot splash, display:none
   ├─ scripts: CLIENT_ENV / SW_HASH / loading-error / __RELEASE_INFO
   └─ 10× div.theme-provider-b0573d48… + 2× div > theme-provider-30df9d… (empty portal mounts for
      dialogs/menus/tooltips) 
```

DnD accessibility scaffolding everywhere: `#DndDescribedBy-N` (display:none) + `#DndLiveRegion-N` (`role="status"`, visually-hidden fixed 1×1) pairs — dnd-kit; sidebar links/teams/tabs/milestones are drag sources (`draggable="true"`, `li[data-draggable-id]`).

---

## 3. VISIBLE TEXT LABELS (UI chrome, in DOM order)

Sidebar: `Skip to content` · `SY` (avatar) · `Synquic` · `Inbox` · `My issues` · `Agent` · `Workspace` · `Projects` · `Views` · `Loops` · `More` · `Your teams` · `Trendzo` · `PGME` · `Shrujan` · `Icon` · `Trikaal` · `Tiffsy` · `Homingo`.

Header: breadcrumb `Projects` `›` `🚚` `Driver App`; tabs `Overview` (active) · `Activity` · `Issues`.

Overview body: `Driver App` (title) · `Expo/React Native app for delivery agents — orders, door events, COD` (summary) · `Properties` · `Backlog` · `No priority` · `Synquic` · `Jul 27th` · `Sep 30th` · `Trendzo` (×2) · `Resources` · `Add document or link…` · `Write first project update` · `Description` · description text: `Delivery agent app. Receives orders, updates status, logs door events, captures photos, records COD collection — every action tied to an authenticated agent identity for the audit trail. Stack: Expo · React Native.` / `Repo:` `https://github.com/Trendzo/driver-app` (link) / `Local: c:\AIB\Products\Trendzo\driver-app` · `Milestones` · `M3 · Delivery flow (handover → deliver → proof)` · `Aug 28` `·` `0 issues` `·` `0%` · milestone description: `Driver app wired to the new agent backend: login, see assigned deliveries, pickup at store (pickup-code), deliver, capture proof, record COD. (Door try-and-buy + returns are M4.)` · `Milestone` (add button).

Right panel: `Properties` · `Status`/`Backlog` · `Priority`/`No priority` · `Lead`/`Synquic` · `Members`/`Add members` · `Dates`/`Jul 27th`/`Sep 30th` · `Lead team`/`Trendzo` · `Teams`/`Trendzo` · `Channel`/`Teams channel` · `Labels`/`Add label` · `Milestones` · `M3 · Delivery flow (handover → deliver → proof)` · `0%` `of` `0` · `See issues` · `Aug 28` · `No milestone` · `Activity` · `See all` · `Milestone` `M3 · Delivery flow (handover → deliver → proof)` `completed ·` `Aug 24` · `🚚` `Synquic` `created the project ·` `Aug 24`.

Bottom bar: `Agent`. Status/boot: `Navigated to Driver App › Overview` · `Loading…`.

Tooltips / aria-labels (all of them): Synquic Workspace Menu · Search workspace · Create new issue · Show more links · Join a team · Team menu · Open Help menu · All projects · Add to favorites · Project actions · Copy page URL · Setup project notifications · Add new view · Open project insights · Close project details · Choose icon · Project name · Project summary · No Priority · Synquic · Change project start date · Change project target date · Add document or link… · Initiative description · Milestone name · Collapse · Choose date · Change target date · Open issues · Open menu · Milestone description · Project sidebar · Collapse properties section · Add dependency · Add labels · Collapse milestones section · Add milestone · Milestone actions · Collapse activity section · Mon Aug 24, 17:25:02 · Mon Aug 24, 15:57:57 · Agent · Chat history · Notifications alt+T.

`title=` attrs: team names (Homingo, Icon, PGME, Shrujan, Tiffsy, Trendzo, Trikaal). Placeholder-slot: `data-sidebar-link-placeholder="drafts"`.

---

## 4. ROUTE MAP

Workspace slug: **`synquic-labs`**. All internal routes `/:workspace/...`:

| Pattern | Instances |
|---|---|
| `/:ws/inbox` | Inbox |
| `/:ws/my-issues/assigned` | My issues |
| `/:ws/agent` | Agent |
| `/:ws/projects/all` | Projects (sidebar + breadcrumb) |
| `/:ws/views/issues` | Views |
| `/:ws/loops` | Loops |
| `/:ws/project/:slug-:shortid/overview` | `driver-app-0f150687c354` — active tab, breadcrumb, TOC links (×5) |
| `/:ws/project/:slug-:shortid/activity` | Activity tab + "See all" |
| `/:ws/project/:slug-:shortid/issues` | Issues tab |
| `/:ws/project/:slug-:shortid/overview#milestone-:uuid` | milestone anchor |
| `/:ws/project/:slug-:shortid/issues?projectMilestoneId=:uuid` | "0 issues" / activity milestone links |
| `/:ws/profiles/subscriptions` | actor link "Synquic" in activity |
| External | `https://github.com/Trendzo/driver-app`; `mailto:support@linear.app` (error script) |
| In-page | `#skip-nav` |

`data-discover="true"` on react-router-generated links. Note: no `/settings/...` routes present in this capture.

---

## 5. KEYBOARD SHORTCUTS IN DOM

- No `aria-keyshortcuts` attributes and no `<kbd>` elements anywhere in this capture (tooltips with shortcut hints are rendered on demand into portals).
- Only shortcut text present: toast region `aria-label="Notifications alt+T"`.

---

## 6. PAGE-SPECIFIC COMPONENT ANATOMY — Project Overview

### 6.1 Header rows
- Breadcrumb parent link "Projects" (13px, `--sx-3zwjav`) → separator `›` (span, tertiary) → current item: emoji chip (`data-type="emoji"`, 16px glyph in 24px-high box, margin-right 8px) + "Driver App" link (13px, primary) inside `_currentItemContainer` (hit-area `:before inset:-6px`).
- Favorite: `button[role=switch][aria-checked=false]` star icon 16px; Project actions: 3-dot `aria-haspopup=menu`. Right cluster: Copy page URL; Setup project notifications (bell; two stacked icon spans for anim states). All icon buttons: 28px pill (`height:28px; min-width:28px; border-radius:9999px`), icon 16×16, `_iconSmall_ekx18_16`=14px box / `_iconNormal_ekx18_21`=16px.
- Tabs (`sc2sx-HeaderTabLinks-4c7de1a9`, gap 6px): pill `<a>` per tab; active = `data-active="true" data-disabled="true"` (bg from `--sx-*` inserted at runtime), inactive `data-disabled="false"`; each wrapped `div.sx-1sxf85j` (r5px) + `div[data-contextual-menu]`. Trailing `+` = "Add new view".
- Insights toggle (`data-state="inactive"`) and Details-panel toggle (`data-state="active" data-active="true" aria-expanded="true"` — panel open; icon contains animated `<rect width="4.5" height="6">` with `transition: x, width 250ms`).

### 6.2 Title / summary editors
- Icon picker `button[aria-label="Choose icon"]`: 28×32 (`--x-width:28px; --x-height:32px`), radius 5.5px, tinted bg `lch(66.025% 52.688 76.196 / 0.175)` (hover `lch(74.025% …)`), emoji 22px.
- Project name: `div.ProseMirror.editor[contenteditable=true][role=textbox][aria-multiline=false][aria-label="Project name"]` — font-size 1.5rem, weight 600, `letter-spacing:-0.00625rem`, `font-variation-settings:"opsz" 32`, `--editor-line-height: calc(1 + 1/3)`; content `<p class="text-node">Driver App</p>`.
- Summary: same pattern, `aria-label="Project summary"`, 0.9375rem / weight 450 / line-height 1.4375rem. Editor scope vars: `--editor-active-selection-background: lch(47.918% 59.303 288.421 / 0.4)`, `--editor-placeholder-color: lch(36.975% 1.2 272 / 1)`, `--editor-block-radius: 6px`.

### 6.3 Properties strip (main body)
- Grid `auto minmax(0,1fr)`, gap `12px 16px`; label `h3` 13px/500 secondary; collapses to 1 column ≤640px. Section: flex-wrap, gap `2px 4px`, margin-right 32px.
- Pills = `button[data-detail-property-button="true"]` (`sc2sx-StyledDetailsProperty-0dc1e67e _propertyRoot_trage_16`): min-height 28px, padding 3px 6px, transparent bg, hover bg `var(--details-property-hover-background, var(--sx-629164))`, text 12px/450; icon 16px + label; order: **Status** (colored progress-circle svg, "Backlog") · **Priority** (3-bar svg `aria-label="No Priority"`) · **Lead** (18px round avatar "SY", bg `lch(55% 60 270 / 1)`, 9px font, "Synquic") · **Start date** (`role=button aria-label="Change project start date"`, calendar icon, "Jul 27th") · arrow icon · **Target date** ("Sep 30th") · **Lead team** (#Team 14px @ #00a0ff, "Trendzo") · **Teams** ("Trendzo") · trailing hover-only "+" (Add labels; `margin-right:-100%`).

### 6.4 Resources + update strip
- `section#resources` (`container-type: inline-size`): hover-reveal `button[aria-label="Add document or link…"]` (plus icon 16px @ `lch(36.975% 1.2 272 / 1)` + 13px label, `margin-right:-100%`).
- Update strip: bordered row (`margin-top:16px; padding:16px; border:1px solid var(--sx-1o1lnwn); border-radius:10px` — actually radius from `sx-1q4ynmn`), icon button + text "Write first project update".

### 6.5 Description block
- `#project-description` — h3 "Description" + collaborative editor: `div[data-editor-id="project-f8161b9b-2807-4a9b-9790-02a696992335"]` → `div.ProseMirror.editor.show-inline-comments[aria-label="Initiative description"]` (note: labelled "Initiative description" in the real app).
- Content spans carry `class="attr" data-user-id="95e59fd2-4952-4fbe-bb2e-7c560c4a3973"` (per-author attribution marks, Yjs); `span.ProseMirror-widget` + zero-width space for trailing content; hard-break `<span contenteditable="false"><br></span>`.
- Agent-attribution overlays: `div[data-testid="attribution-labels-root"]` (`--attribution-label-max-width`, `--attribution-label-gap`), `attribution-labels-overlay`, `agent-change-gutter-overlay`, `agent-change-gutter-layer`; editor scope sets `--agent-highlight-active: lch(87.2% 70 267 / 0.18)`, `--agent-highlight-previous: lch(87.2% 70 267 / 0.08)`.

### 6.6 Milestones (main body)
- `section#milestone-list` (flex-col, gap 4px) → h3 "Milestones" → card `#milestone-<uuid>` with `data-contextual-menu-opened="false"` and hover bg token `--x---sx-vuknjc: lch(17.718% 1.043 272 / 1)`.
- Card header row: anchor (22px wide icon slot) with milestone-status svg 16px (`color-override`) linking to `#milestone-<uuid>` → name editor `ProseMirror[aria-label="Milestone name"]` 0.9375rem/600 (`M3 · Delivery flow (handover → deliver → proof)`) → collapse control `role=button aria-label="Collapse" aria-expanded="true"` (chevron 16px).
- Meta row: `role=button aria-label="Choose date" data-inline-date-input-interaction` → "Aug 28" (13px secondary) `·` `a[aria-label="Open issues"]` "0 issues" → `?projectMilestoneId=<uuid>` `·` "0%". Hover 3-dot `aria-label="Open menu" aria-haspopup=menu` (12px icon).
- Collapsible body `div[data-open="true"][data-disable-transitions="false"]` (transition `opacity,height 200ms`): milestone description editor (same collaborative stack, `aria-label="Milestone description"`).
- Add row: button plus-icon + "Milestone" label.

### 6.7 Floating outline rail (content minimap)
- Absolutely positioned `right: 12px; top: var(--overview-subheader-top-position)`, z-index 11; column of bars: width 8px (mask-gradient container h:36px), each bar `height:1px`-based `div` scaled (`scaleY(1)`/`scaleY(2)`), colors `var(--sx-1eapsa9)` (heading) / `var(--sx-3zwjav)` (milestone, width 6px).
- Hover panel (z-index 12, hidden at rest `scale(0.5) opacity 0`): rounded card `background: lch(5.52% 0.4 272 / 0.7); backdrop-filter: blur(12px)`, rows height 24px, padding-inline 12px: "Description" (icon 16px), "Milestones" (icon), "M3 · …" (padding-left 22px) — all anchor to `/overview`.

### 6.8 Right details panel (400px)
- **Properties card**: header row h:16px — collapse toggle `role=button aria-label="Collapse properties section" aria-expanded=true` + hover chevron + `button[aria-label="Add dependency"]`. Body `#projectDetailsProperties`, rows = label cell **width:90px** (12px/450 secondary) + value control:
  - Status → property button: progress-circle svg + "Backlog"
  - Priority → svg "No Priority" + "No priority"
  - Lead → 18px avatar "SY" + "Synquic"
  - Members → user-plus icon + "Add members" (placeholder color)
  - Dates → two `role=button` chips "Jul 27th" (calendar icon) / arrow / "Sep 30th"
  - Lead team → #Team @ #00a0ff + "Trendzo"
  - Teams → #Team + "Trendzo"
  - Channel → Teams icon + "Teams channel" (row h:28px)
  - Labels → hover "+ Add label" (`data-detail-button="true"`)
- **Milestones card**: header + `button[aria-label="Add milestone"]`; `#projectDetailsMilestones` list (container h:85px, margin-bottom -10px): row `role=button` h:42px, radius, hover; columns: `data-column-id="user"` (16px milestone icon + name, ellipsis) / `data-column-id="percent"` ("0%" with `data-animated-number="true"` + "of") / `data-column-id="estimate"` ("0" + hidden "See issues" button) ; right side: date chip "Aug 28" (`aria-label="Change target date"`) + hover `aria-label="Milestone actions"` menu. Second row: "No milestone" + "See issues".
- **Activity card**: header (collapse + "See all" link → /activity); `#projectDetailsActivity` items `div[data-activity-item="true"][data-item-type="entries-project"]`:
  1. milestone icon 16px + "Milestone **M3 · …** completed · " + time `div[aria-label="Mon Aug 24, 17:25:02"]` → "Aug 24"
  2. 🚚 emoji 16px + "**Synquic** created the project · " + `aria-label="Mon Aug 24, 15:57:57"` → "Aug 24"; actor links to `/profiles/subscriptions`; highlight token `--activity-history-highlight-color: lch(90.826% 1.425 272 / 1)`.

---

## 7. ICON INVENTORY

Sprite sheets (inline `<symbol>`, referenced by `<use href="#Id">`):
- **Base** (33): Attachment, Blockquote, Calendar, Checklist, CodeBlock, Comment, CreditCard, CustomView, Favorite, Folder, Home, Inbox, Initiative, IssueStatusBacklog/Done/Review/Started/Todo/Triage, Label, Link, Lock, MilestoneNone, MilestoneStatusDone/Planned/Started, MyIssues, Project, Refresh, Search, Send, Subscribe, Team.
- **Brands** (8): Anthropic, Claude, Cursor, GitHub, GitLab, Meta, OpenAI, Ramp.
- **Decorative** (~230): huge emoji-style set (Ai, AiApp, Rocket, Radar, Chip, Europe, Feather, Home, QuestionMark, LinearAi, …) used for team/project icons.

`<use>` instances on this page: `#Team` ×6 (sidebar teams + lead-team/teams properties, tinted #00a0ff/#00aa00), `#Project` (sidebar Projects), `#Feather` (#008fff), `#Chip` (#f85911), `#Europe` (#789c00), `#Radar` (#d67600), `#Home` (#00b187), `#QuestionMark` (help). Team icons drawn at 14×14 with `opacity: 0.9`, color via `--x-fill`/`--icon-color` + class `color-override`.

Inline path SVGs (85 total) by location: sidebar chevron (13×9) under workspace name; Search; Plus (create issue, join team, add view, add milestone, add label, add document); section chevrons (16×16, `color-override` currentColor); Inbox/My-issues/Agent/Views/Loops/More glyphs; star (favorite); 3-dot "…" (project actions, team menu 12px, milestone menu 12px); copy-link; bell (notifications ×2 states); insights (chart); panel-toggle (with animated rect); priority bars (3 × `rect 3×1.5`); status progress circle (`<circle>` ring); calendar; arrow-right (date range); user-plus (members); Teams-channel glyph; milestone shapes; agent spark (14×14, bottom bar); chat-history clock. Icon default color inline: `lch(60.621% 1.2 272 / 1)` (sidebar), `lch(61.803% …)` (header), `lch(63.304% 1.425 272 / 1)` (right panel), disabled/faint `lch(36.975% 1.2 272 / 1)`.

---

## 8. SCRIPTS / ASSETS / EMBEDDED STATE

- Fonts (from styles.css `@font-face` + preloads): **Inter Variable** (`InterVariable.woff2?v=4.1` + Italic, weight 100–900, display swap), **Berkeley Mono** (`Berkeley-Mono-Variable.woff2?v=3.2` — `--font-monospace`), **Linear Thai** (local() stack for U+0E00–0E7F). `--font-regular: "Inter Variable", "SF Pro Display", -apple-system, …`.
- Entry: `<script type="module">` + single `<script src="https://static.linear.app/client/assets/html.9O-Enmr6.js">`; ~370 `modulepreload` links (rolldown/Vite build — `rolldown-runtime.KFiyTY0I.js`, `preload-helper`, `__vite-browser-external`).
- Vendor bundles (library fingerprint from asset names): **react / react-dom / react-router**, **mobx + mobx-react-lite + mobx-utils**, **ProseMirror** (model/state/view/transform/commands/history/inputrules/gapcursor/dropcursor/schema-list/tables/markdown/changeset/utils), **yjs + y-prosemirror + lib0**, **radix-ui**, **dnd-kit**, **react-spring**, **popperjs**, **react-window**, **react-use**, **focus-trap/tabbable**, **downshift**, **formik**, **yup**, **zod**, **date-fns**, **spacetime** (tz), **lodash**, **uuid**, **idb**, **comlink** (workers; `WorkerPool`), **fflate**, **graphql + graphql-request**, **sentry**, **algoliasearch + instantsearch.js + react-instantsearch**, **markdown-it**, **highlight.js + lowlight**, **d3-scale-chromatic**, **emotion**, **fast-equals**, **object-hash**, **semver**, **pluralize**, **diff**, **lz-string**, **react-dropzone**, **react-medium-image-zoom**, **portabletext + sanity asset/image-url** (marketing content), **leeoniya** (uPlot), **chenglou** (react-motion), **tanstack** (query — `queryClient`), **html-entities**, **vendor-highlight**, **stylex** runtime.
- App chunks of note: `ThemeProvider`, `Popover`, `Tooltip`, `SimpleActionMenu`, `ActionMenu`, `ContextualMenuActions`, `FuzzyDatePicker` (+ react-day-picker), `Tabs`, `Scrollable`, `AgentToolbarState`, `AgentAutomationIcon`, `CodingAgentIcon`, `ModelIcon`, `AiConversationContextHelper`, `LazyFastIssueEditorLoader`, `FastIssueDraftCreateState`, `useVerticalResizer`, `DeveloperToolbar`, `IncidentCommunication`, OAuth helpers (Jira/Zendesk/Salesforce/Intercom/Discord/Front/Gong/PagerDuty/Figma/GitHub/MicrosoftTeams).
- PWA: `pwa.webmanifest?v=2bFbP16Trobnnxqe/UA/fqp5khM=`, favicon `favicon-D8hcELd9.svg`, apple-touch-icon, `apple-itunes-app app-id=1645587184`; service-worker cached page (`data-sw-cache="true"`, `SW_HASH`).
- Inline scripts: electron sniff; DOMContentLoaded boot fade; `CLIENT_ENV`; `SW_HASH`; loading-error fallback (offers reload + `mailto:support@linear.app`); `__RELEASE_INFO`. No serialized app-state JSON blob (state loads from IndexedDB/sync engine at runtime).

---

## 9. STATE CLASSES & ATTRIBUTES

- **No Radix DOM signatures in this capture** (no `data-radix-*`, no `id="radix-…"`, no `data-state="open"` popover instances — menus/tooltips render into portals on demand). `data-state` appears only as `"active" | "inactive"` on the insights/details header toggles.
- Menu/popover state: `aria-haspopup="menu"` + `aria-expanded` on triggers; `data-menu-open="false"` on every tooltip-trigger wrapper (`_tooltipTriggerContent_1et26_1`); CSS variants `[data-menu-open=true]`, `_menuOpenBg_ekx18_56`, `_menuOpenColor_ekx18_61`, `_menuOpenTextColor_ekx18_66`, `_menuOpenOverlay_ekx18_79`.
- Selection/active: `data-active="true|false"` (tabs, sidebar links, date chips), `data-disabled`, `data-focused`, `aria-checked` (favorite switch), `aria-expanded` (sections, teams, milestone collapse), `data-open="true"` + `data-disable-transitions` (milestone body), `data-contextual-menu-opened="false"` (milestone card), `aria-hidden` on collapsed regions.
- Hover-reveal pattern: controls present in DOM with `opacity:0`/`margin-right:-100%`, shown via `:hover`/`:focus-within`/`[data-menu-open=true]` compound selectors (e.g. `.sx-p9hnhx:is(:hover, :focus-within, [data-contextual-menu-opened="true"] …)`).
- Bootstrap classes: `body.is-bootstrapped .hide-during-bootstrap { animation: .2s bootstrapFadeIn }` (hidden until bootstrapped), `.suspenseFadeIn { animation: 80ms suspenseFadeIn }`.
- Editor state: `.ProseMirror.editor`, `.ProseMirror-focused`, `.show-inline-comments`, `span.attr[data-user-id]`, `p.text-node`, `.editor-placeholder[data-empty-text]`.
- Misc data-attrs: `data-visible-sidebar-item`, `data-sidebar-section-type="header|header-wrapper"`, `data-sidebar-link-placeholder`, `data-draggable-id`, `data-scroll-container`, `data-restore-scroll-view`, `data-restore-scroll`, `data-table-overhang-boundary`, `data-loading-caret`, `data-facets`, `data-inline-date-input-interaction`, `data-animated-number`, `data-detail-property-button`, `data-detail-button`, `data-column-id`, `data-activity-item`, `data-item-type`, `data-agent-toolbar-bounds`, `data-agent-panel-anchor`, `data-type="emoji"`, `data-sprite-set`, `data-editor-id`, `data-user-id`, `data-empty-text`, `data-discover` (react-router).

---

## 10. UNUSUAL / LINEAR-SIGNATURE DETAILS

1. **lch() colors everywhere** — the whole theme is authored in LCH (`lch(2.595% 0.4 272 / 1)` app bg; hue 272 grays), including gradient masks `linear-gradient(to bottom, lch(100% 0 272 / 0) …)` used as scroll-edge fades.
2. **Runtime-injected theme**: `theme-provider-<sha1>` classes with `display: contents` wrap each surface; token values (`--sx-*`) are registered empty in the stylesheet and populated via CSSOM — a capture without runtime CSS loses the palette (only inline `--x-*` values survive).
3. **StyleX atomics + `sc2sx-<Component>-<hash>` marker classes** that leak real component names: `Flex`, `Text`, `SidebarLink-StyledLink`, `HeaderTabLinks`, `StyledDetailsProperty`, `DetailsPropertyDiv`, `SidebarSectionActionButton`.
4. **Scroll-driven animation** in the sidebar: `scroll-timeline-name: --sidebar-content-scroll` + `animation-timeline` / `animation-range: 0px 26px` for the top fade (modern CSS Scroll Timelines, no JS).
5. **Scrollbar-width measurer**: a 50px-wide, 0-height `overflow-y:scroll` div right after the theme provider; result stored to `--scrollbar-width` and used in header paddings (`max(8px, var(--scrollbar-width))`).
6. **Portal architecture**: `#portalLayoutRoot` inside `<main>` (and repeated after the bottom bar), plus ~12 empty `theme-provider` divs at body end as mounts for menus/dialogs/tooltips; `div[data-contextual-menu="true"]` (×25) marks right-click context-menu scopes around nearly every region.
7. **Toast viewport**: `<section aria-label="Notifications alt+T" aria-live="polite" aria-relevant="additions text">` under a `z-index: 581` overlay layer; SR route announcer `span[role=status]` ("Navigated to Driver App › Overview"); hidden `<audio>` for notification sounds.
8. **Electron affordances shipped to web**: `-webkit-app-region: drag` regions (`_draggableRegion_b2qal_1`) gated by `html:not(.electron-disable-drag)`; body script sniffs `navigator.userAgent` for Electron.
9. **Boot splash** `#loading > #appBorders > #preloader` with pulsing Linear logo (`logoBackgroundPulse 3.2s`), `#loadingText "Loading…"`, and staged body classes `content-loaded → is-bootstrapped → loaded → bootstrap-fade-complete`; `.hide-during-bootstrap` fade-in choreography.
10. **Agent everywhere**: page-level agent toolbar (28px bottom bar, `--agent-toolbar-height`), `data-agent-panel-anchor`, agent-change gutters + per-author `span.attr[data-user-id]` attribution in every collaborative editor, `--agent-highlight-active/previous` tokens; Brands sprite ships Anthropic/Claude/Cursor/OpenAI icons.
11. **Overview minimap rail**: the floating right-edge bar/TOC popover (§6.7) is a bespoke Linear pattern (8px bars, blur-glass panel).
12. **dnd-kit a11y scaffolding** duplicated per drag context (~15 `DndDescribedBy`/`DndLiveRegion` pairs).
13. **Restorable scroll**: `data-restore-scroll-view="project-overview" / "project-sidebar"` with `data-restore-scroll="vertical"`.
14. Cursor discipline: `cursor: var(--pointer)` where `--pointer: default` — Linear famously uses default cursor (not pointer) on buttons.
15. `#form-new-project` is the id of the overview form even on an existing project (shared create/edit component); the description editor is `aria-label`ed "Initiative description" (shared component reuse).
