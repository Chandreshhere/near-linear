# Linear.app — Workspace Projects List Page (table view) — Forensic Capture Analysis

Capture: `/private/tmp/claude-501/-Users-moon-Documents-linear/756a3e51-2170-4c62-854d-12969153cc3d/scratchpad/captures/projects/projects/index.html` (630,821 B) + `styles.css` (642,856 B). Captured 2026-08-24. Route: `/synquic-labs/projects/all`. `<title>Projects</title>`. Workspace slug: **synquic-labs**, workspace display name **Synquic** (avatar initials "SY").

`<html data-sw-cache="true" lang="en-GB" class="dark logged-out" style="--bg-color: lch(2.595% 0.4 272 / 1); --bg-sidebar-color: lch(2.595% 0.4 272 / 1); --bg-base-color: lch(5.52% 0.4 272); --bg-border-color: lch(14.16% 1.48 272 / 1); --agent-toolbar-height: 28px; --scrollbar-width: 0px;">`
`<body class="content-loaded is-bootstrapped loaded bootstrap-fade-complete loadingText">`

---

## 1. APP FRAME GEOMETRY

- **Sidebar**: two divs — a spacer `div.sx-5yr21d` `style="width: 244px"` and the fixed panel `style="width: 244px; left: 0px; top: 0px; bottom: 0px"` (position via `sx-w2c716` z-index:96). **Sidebar width = 244px** (persisted in localStorage `splashScreenConfig.sidebarWidth`; a head bootstrap script sets `--sidebar-width` before paint; if `userSettings.openLinksInDesktop` → `--sidebar-width: 8px`).
- **Sidebar resize handle**: absolute div at `right: -5px; top: 14px; bottom: 40px`, `width: 7px` (`sx-ci0xqf`), `cursor: col-resize` (`sx-icojor`), background = vertical gradient `linear-gradient(to bottom, lch(100% 0 272 / 0) 0%, …/0.5 15%, …/0.65 50%, …/0.5 85%, …/0 100%)` (visible on hover).
- **Sidebar internal padding**: nav content scroller has `padding-left: 12px`, `--x-paddingRight: 12px`, `scrollbar-gutter: stable`, `data-scroll-container="true"`, scroll-driven animation `animation-timeline: --sidebar-content-scroll; animation-range: 0px 26px` (fades top edge when scrolled).
- **Workspace switcher row**: `--x-height: 44px; --x-marginTop: 8px`. Workspace avatar 24×24 (`--x-width/--x-height: 24px`), bg `lch(70% 60 350 / 1)`, initials font 11px, white text.
- **Content header** (`<header>`): `min-height: calc(var(--header-height, 57px) + border)` — **`--sx-8q2ft0: 57px`** is the default header height token. Background `var(--header-color)`. Horizontal padding: left `--x-i1iptc: 8px`, right `max(8px, var(--scrollbar-width, 0px))`; bottom border `1px solid var(--sx-15wwovl)`. Contains title row + view-tabs row inside one 57px band. Header wrapper has `z-index: 96`.
- **Content area**: `<main>` flex column, fills remaining width. List region min-width 400px, `overflow-x: auto` with `scroll-timeline-name: --list-horizontal-scroll`.
- **List grid**: `--x-gridTemplateColumns: [indent] 8px [checkbox] 18px [title] minmax(425px, 2fr) [health] 130px [priority] 68px [lead] 48px [targetDate] 91px [issues] 49px [status] 120px [end-padding] 8px; --x-columnGap: 6px` (repeated inline as `grid-template-columns` on the virtualized grid; `column-gap: 6px; width: 100%; min-width: 0; height: 863px` on the inner grid).
- **Column header row**: `height: 32px` (`sx-10w6t97`), no bottom border.
- **Project row**: `<a>` `height: 48px` inline, inner container `--x-minHeight: 48px`, `border-radius: 8px` (`_gridRowShared_1bk15_65`).
- **List wrapper**: `--x-paddingTop: 0px; --x-paddingBottom: max(8px, env(safe-area-max-inset-bottom, 0px))`, `overflow-y: auto`.
- **Bottom agent toolbar**: sibling of main layout, `height: 28px` (`sx-15nigyc`), `margin-top: -4px`, `background-color: var(--bg-color)`, `z-index: calc(96 + 1)`, `padding-right: 8px`; `--agent-toolbar-height: 28px` on `<html>`.
- **Help button**: floating bottom-left over sidebar: container absolute `bottom:0; left:0; right:0`, `padding: 10px`, `gap: 8px`, `z-index: 10`, `-webkit-app-region: no-drag`.
- Body-level: `#mainLayoutContainer` flex, `--x-l1z0du: 100%; --x-2164qk: 100%` (100% w/h). A hidden 50px-wide `overflow-y: scroll; height: 0` div with `data-scroll-container` measures native scrollbar width.

## 2. FULL DOM OUTLINE (semantic tree)

```
body
└─ #root
   ├─ div[data-sprite-set=Base|Brands|Decorative] (3 hidden svg <symbol> sprite sheets, 305 symbols total)
   ├─ div.theme-provider-30df9d…{display:contents}       ← root theme scope
   │  ├─ audio[aria-hidden] (clipped 1×1 — notification sounds)
   │  ├─ div[data-scroll-container] (h:0,w:50px scrollbar-width probe)
   │  ├─ a[href=#skip-nav] "Skip to content"
   │  └─ #mainLayoutContainer
   │     ├─ theme-provider-b0573d…  ← SIDEBAR scope
   │     │  ├─ div.sx-5yr21d (width 244 spacer)
   │     │  └─ div (fixed, width 244)
   │     │     ├─ nav
   │     │     │  ├─ top row (_draggableRegion_, h:44, mt:8)
   │     │     │  │  ├─ button[aria-label="Synquic Workspace Menu"][aria-haspopup=menu][aria-expanded=false] (avatar "SY" + name + chevron)
   │     │     │  │  ├─ button[aria-label="Search workspace"]
   │     │     │  │  └─ div[data-contextual-menu] > button[aria-label="Create new issue"]  (icon-only, white pencil)
   │     │     │  └─ scroll area [data-scroll-container, pl:12]
   │     │     │     ├─ top nav group (dnd-kit list, role=button items)
   │     │     │     │  ├─ a[href=/synquic-labs/inbox] "Inbox"
   │     │     │     │  ├─ a[href=/synquic-labs/my-issues/assigned] "My issues"
   │     │     │     │  ├─ a[href=/synquic-labs/agent] "Agent"
   │     │     │     │  └─ hidden slot data-sidebar-link-placeholder="drafts" (data-visible-sidebar-item=false)
   │     │     │     ├─ section "Workspace" (button[data-sidebar-section-type=header][aria-expanded=true])
   │     │     │     │  └─ #sidebarWorkspace
   │     │     │     │     ├─ a[/synquic-labs/projects/all] "Projects" data-active=TRUE (icon #Project)
   │     │     │     │     ├─ a[/synquic-labs/views/issues] "Views"
   │     │     │     │     ├─ 2 hidden items (data-visible-sidebar-item=false)
   │     │     │     │     ├─ a[/synquic-labs/loops] "Loops"
   │     │     │     │     └─ role=button "Show more links" → "More"
   │     │     │     ├─ section "Your teams" (+ button[aria-label="Join a team"])
   │     │     │     │  └─ #sidebarMyTeams (height 318px) > ul#teams-boundary-container (nested dnd lists)
   │     │     │     │     ├─ li Trendzo  (icon #Team #00a0ff)  aria-expanded=true
   │     │     │     │     │  └─ #team-cb66f99d… : Home(/team/TRENDZO/overview) · Issues(/team/TRENDZO/all) · Projects(/team/TRENDZO/projects/all) · Views(/team/TRENDZO/views/issues)
   │     │     │     │     ├─ li PGME     (icon #Feather #008fff) collapsed
   │     │     │     │     ├─ li Shrujan  (icon #Team #00aa00) collapsed
   │     │     │     │     ├─ li Icon     (icon #Chip #f85911) collapsed
   │     │     │     │     ├─ li Trikaal  (icon #Europe #789c00) collapsed
   │     │     │     │     ├─ li Tiffsy   (icon #Radar #d67600) collapsed
   │     │     │     │     └─ li Homingo  (icon #Home #00b187) collapsed
   │     │     │     └─ div.suspenseFadeIn (lazy footer slot, --x-height: 34px)
   │     │     ├─ floating help: button[aria-label="Open Help menu"][aria-haspopup=menu] (icon #QuestionMark)
   │     │     └─ resize-handle div (gradient, col-resize)
   │     ├─ content column
   │     │  └─ <main>
   │     │     ├─ #skip-nav
   │     │     ├─ div[data-loading-caret=true]
   │     │     │  ├─ div{z-index:96}
   │     │     │  │  ├─ <header>  (title row + tabs row; see §6)
   │     │     │  │  └─ secondary bar (empty filter strip, min-height 57px, pb:8)
   │     │     │  └─ list viewport
   │     │     │     ├─ right-edge fade overlay (z-index 4, opacity 0, gradient to var(--sx-1ubxoo9))
   │     │     │     └─ GRID [data-list-container] .list-grid-cells-293475499
   │     │     │        ├─ column header row (h:32)  — see §6
   │     │     │        └─ rows wrapper [data-list-wrapper][data-restore-scroll-view="/synquic-labs/projects/all|0"]
   │     │     │           └─ 10 × a._gridRowShared_1bk15_65[data-list-row] (see §6)
   │     │     ├─ absolute overlay strip (top:0, z-index 200)
   │     │     └─ #portalLayoutRoot
   │     └─ agent toolbar strip (h:28) — see §6
   ├─ div.sx-ixxii4.sx-1355n6m (position:fixed; z-index 581)
   │  └─ section[aria-label="Notifications alt+T"][tabindex=-1]   ← toast viewport (sonner)
   ├─ span[role=status] "Navigated to Projects"                    ← SPA route announcer (visually hidden)
   ├─ #loading (splash: #appBorders > #loading-content > #preloader > svg.bkg + svg#logo; #loadingText "Loading…"; display:none)
   ├─ 4 inline <script>: CLIENT_ENV / SW_HASH / loading-error / __RELEASE_INFO
   └─ ~14 empty portal mount divs (theme-provider-*, display:contents) + div.sx-jp7ctv (display:contents)
```

dnd-kit accessibility scaffolding is everywhere: paired `#DndDescribedBy-N` (display:none instructions) + `#DndLiveRegion-N` (`role=status`, visually-hidden fixed 1×1) — 10+ instances (sidebar lists, team lists, tab list, project list).

## 3. VISIBLE TEXT / CHROME LABELS

Sidebar (in order): `Inbox`, `My issues`, `Agent`, section `Workspace` → `Projects` (active), `Views`, `Loops`, `More`; section `Your teams` → `Trendzo` (expanded: `Home`, `Issues`, `Projects`, `Views`), `PGME`, `Shrujan`, `Icon`, `Trikaal`, `Tiffsy`, `Homingo`. Top row: workspace name `Synquic`, avatar text `SY`.

Header: `<h2>Projects</h2>`; button text `New project`; tab pill `All projects`.

Column headers (in order): `Name`, `Health`, `Priority`, `Lead` (plain, unsortable), `Target date`, `Issues` (plain, unsortable), `Status` — sortable ones are buttons `aria-label="Order by …"` with a hover sort-arrow icon.

Rows (10 projects, single group; milestone chip + date under some titles):
| Project | icon | milestone chip | health | priority | lead | target | issues | status |
|---|---|---|---|---|---|---|---|---|
| Driver App | emoji 🚚 (tile tint lch(74.025% 57.688 76.196 / 0.175)) | `M3 · Delivery flow (handover → deliver → proof)` + `Aug 28` | No updates | No Priority | SY avatar | `Sep 30th` | 0 | 0%, orange #F2994A |
| Consumer App | 📱 | `M3 · Place & track orders (seeded)` + `Aug 24` | No updates | No Priority | SY | `Sep 30th` | 0 | 0%, orange (row data-active=true, bg lch(9.345% 0.85 272 / 1)) |
| Retailer App | 🛍️ | `M1 · AI listing live + catalogue mgmt + download` + `Jul 22` | No updates | No Priority | SY | `Aug 21st` (overdue red lch(58% 73 29)) | 0 | 0%, yellow lch(80% 90 85) |
| Web Portal | 🖥️ | `M1 · Admin can view stores & catalogues (real data)` + `Jul 24` | No updates | No Priority | SY | `Sep 30th` | 0 | 0%, yellow |
| Backend | ⚙️ | `M1 · Retailer AI-listing + catalogue APIs verified` + `Jul 13` | No updates | No Priority | SY | `Sep 30th` | 0 | 0%, yellow |
| Acti Pro | #Project icon lch(80% 90 85) | — | No updates | No Priority | (No lead) | (empty) | 0 | 0%, orange + 32×16 sparkline |
| Icon Realty | #Project #f2994a | — | No updates | **Low Priority** | (No lead) | (empty) | 1 | 0%, yellow |
| Shrujan | #Project lch(48% 59.31 288.43) | — | No updates | No Priority | (No lead) | (empty) | 0 | 0%, gray #D7D8DB |
| Trikaal | #Project #95a2b3 | — | No updates | No Priority | (No lead) | (empty) | 1 | 0%, gray |
| Cleanse Ayurveda | #Project #26b5ce | — | No updates | **High Priority** | (No lead) | `Aug 11th` (overdue red) | 2 | 0%, yellow + sparkline |

Health cell text: `No updates` (12px, color lch(61.803 1.2 272)). Status cell text: `0%` (tabular-nums).

aria-label inventory (tooltips): `Synquic Workspace Menu`, `Search workspace`, `Create new issue`, `Show more links`, `Join a team`, `Team menu`(×7), `Open Help menu`, `New project`, `Add new view`, `Add filter`, `Display options`, `Close sidebar`, `Order by Name|Health|Priority|Target date|Status`, `Select project`(×10), `Choose icon`(×10), `No updates. Click to write update.`(×10), `Change project target date`(×20), `No Priority`(×8), `Low Priority`, `High Priority`, `No lead`(×5), `Milestone <name>. Progress: 0%.`(×5), `Agent`, `Chat history`, `Notifications alt+T`. Title attrs = project/team names (native tooltips for truncation).

Other text: `Skip to content`, `Navigated to Projects` (live region), `Loading…` (splash).

## 4. ROUTE MAP (all hrefs; workspace slug `synquic-labs`)

- `/:workspace/inbox`
- `/:workspace/my-issues/assigned`
- `/:workspace/agent`
- `/:workspace/loops`
- `/:workspace/projects/all`  ← current page (sidebar link + header tab)
- `/:workspace/views/issues`
- `/:workspace/team/:TEAMKEY/overview` (TRENDZO)
- `/:workspace/team/:TEAMKEY/all`
- `/:workspace/team/:TEAMKEY/projects/all`
- `/:workspace/team/:TEAMKEY/views/issues`
- `/:workspace/project/:slug-:12hexid/overview` ×10:
  `driver-app-0f150687c354`, `consumer-app-497bbe64f8a3`, `retailer-app-2393a08d4f2e`, `web-portal-902a67da7af5`, `backend-bec6d7f9d026`, `acti-pro-a31e4c9efb8e`, `icon-realty-52437cf88429`, `shrujan-8b34fb90f02f`, `trikaal-bd0a60103061`, `cleanse-ayurveda-75329d72d82a`
- `#skip-nav` (skip link)
- Login-redirect routes referenced in inline bootstrap JS: `/add-account`, `/join`, `/login`, `/logout`, `/mobile-auth`, `/auth/*`, `/connect/*`.
- `data-restore-scroll-view="/synquic-labs/projects/all|0"` (scroll restoration key).

## 5. KEYBOARD SHORTCUTS IN DOM

- Only one literal: toast region `aria-label="Notifications alt+T"` (alt+T focuses notifications).
- No `aria-keyshortcuts`, no `<kbd>` elements in this capture (Linear renders shortcut hints inside JS tooltips/menus which are unmounted here).

## 6. PAGE-SPECIFIC COMPONENT ANATOMY

### 6.1 Header (57px band)
Row 1 (title row, left cluster pl:10px):
- `h2` "Projects" — font-size .8125rem (13px), weight 500, ellipsized; color `var(--sx-3zwjav)` (bright text).
- `New project` button: icon (pencil/compose, `--x---icon-default-color: lch(61.803% 1.2 272 / 1)`) + 12px/500 label; class stack = pill button 28px tall.
Row 1 right cluster (`_contentViewHeaderTabs` zone; `--x---content-view-header-tabs-min-width: 300px; flex: 1 1 300px`):
- Tab strip `sc2sx-HeaderTabLinks-4c7de1a9` `data-facets="true"`, tabs draggable (dnd-kit). Active tab = `<a href="/synquic-labs/projects/all" data-active="true" data-disabled="true">All projects</a>` — **pill**: height 28px, min-width 28px, border-radius 9999px, padding 0 10px, font 12px 500, max-width 200px, bg `var(--sx-1edn6di)` (active tint), color `var(--sx-ys2i3t)`.
- `+` button `aria-label="Add new view"` (icon color lch(36.975% 1.2 272 / 1) — dimmer).
Far right controls: `Add filter` (filter glyph), `Display options` (sliders glyph), `Close sidebar` (right-panel toggle, aria-expanded=false). All are 28px icon buttons (`_iconSmall_ekx18_16` inner icon 14×14).
Below header: an empty filter-bar strip (same padding vars, min-height 57px, pb:8) — renders active filter chips when filters exist.

### 6.2 Column header row (32px)
Grid subgrid row, cells map to `data-list-grid-column`: `indent`(8px), `checkbox`(18px), `title`, `health`, `priority`, `lead`, `targetDate`, `issues`, `status`, `end-padding`(8px).
Sortable headers = `<button aria-label="Order by X">` containing 12px/450 label (`.75rem`, font-weight 450, color var(--sx-1dd5bcf) = secondary text) + hidden chevron container (`opacity: 0`, shown on hover). `Lead` and `Issues` are plain `<span>` labels.

### 6.3 Project row (48px, `<a>` wrapping full row)
`a._gridRowShared_1bk15_65` — display:grid; `grid-template-columns: subgrid`; `grid-column: 1/-1`; border-radius 8px; `will-change: transform`; `contain: style`; `isolation: isolate`. Inline: `height: 48px; --row-applied-bg: transparent|lch(9.345% 0.85 272 / 1); --row-keyboard-border: lch(19.701% 19.952 286.445 / 1); opacity: 1`.
State attrs per row: `data-first-selected|last-selected|first-in-group|last-in-group|selected|active|keyboard-active|apply-background`, `data-list-key="ITEM_<uuid>"`, `data-list-row="true"`.
Inner container: `--x-minHeight: 48px; --details-property-hover-background: lch(17.718% 1.043 272 / 1); --details-property-highlight-color: lch(100% 0 272 / 1)`, `data-contextual-menu="true"`, `_container_1274r_7` (reveals `[data-element-visible-on-container-hover]` children on hover).

Cell order & content:
1. **indent** (8px, empty).
2. **checkbox** (18px, `margin-left: 8px`): div `aria-label="Select project"` (22px tall hitbox, padding 4/3, left:-6px) → hidden `<input type=checkbox aria-checked=false tabindex=-1>`; wrapper `data-selected="false"`, appears on hover (`opacity:0` default via `sx-g01cxk` + hover classes).
3. **title**: 
   - icon tile `<button aria-label="Choose icon">` 28×28, border-radius 4px, `margin-right: 6px`, hover bg `--x-1xxff20: lch(<project color> / 0.175)`; inside either emoji `div[data-type="emoji"]` (16px box, font-size 13px) or sprite `#Project` svg tinted with project color.
   - text stack (min-height 27px): project name span 13px/500 ellipsized `title="<name>"` (max-width 70% when milestone chip present, else 100%);
   - **milestone chip** `<button>` (height 27px, border-radius 48px, pr:4): 16×16 diamond-outline svg (stroke = project color, stroke-width 2, opacity .4) `aria-label="Milestone <M name>. Progress: 0%."` + 12px text `M3 · Delivery flow (handover → deliver → proof)` + date `Aug 28` (`margin-left: 8px`).
4. **health** (130px): `<button aria-label="No updates. Click to write update." data-update-trigger="project-updates-_r_XX_">` = 16×16 dashed circle svg (r 7.5, stroke-dasharray 2.36 2.36, round caps, fill/stroke lch(36.975% 1.2 272 / 1)) + label `No updates` 12px color lch(61.803 1.2 272). Hover bg `lch(36.975% 1.2 272 / 0.125)`.
5. **priority** (68px): `<button data-detail-property-button>` (min-height 28, padding 3/6) with 16×16 svg: No Priority = 3 horizontal 3×1.5 rects; Low = 3 bars, High = 3 bars heights 6/9/12 (rx 1); fill lch(61.803% 1.2 272 / 1).
6. **lead** (48px): either 16×16 round avatar (initials `SY`, bg lch(55% 60 270 / 1), font 9px, `aria-label="Synquic"`) or dashed-person svg `aria-label="No lead"` (empty state hidden until hover: `sx-g01cxk` opacity 0 + `sx-1yt6nhl…` hover reveal).
7. **targetDate** (91px): `role=button aria-label="Change project target date"` → calendar glyph + text `Sep 30th` 12px; overdue = calendar tinted `lch(58% 73 29)` (red-orange). Empty state icon-only, hover-revealed.
8. **issues** (49px, `justify-content: flex-end`): `<button data-detail-property-button>` count text 12px tabular-nums (`0`,`1`,`2`).
9. **status** (120px): `<button data-detail-property-button>` = **project-status "shield" svg** 16×16 viewBox "-1 -1 16 16": rounded-hex outline path stroke-width 1.5, `stroke-dasharray: 1.65 1.35` (dashed = not-started variants), + masked inner progress circle (r 4, cx/cy 7, stroke-width 8, `stroke-dasharray: calc(<pct>) 25.12`, `transform: rotate(-90) translate(-14,0)`; hex-shaped mask hole) + `0%` label 12px tabular-nums. Colors seen: `#F2994A` (orange/In Progress), `lch(80% 90 85)` (yellow/Planned), `#D7D8DB` (gray/Backlog).
   - Some rows append a 32×16 **sparkline** (`_svgOverflowVisible_1tjm4_1`, `--x-width: 32px; --x-height: 16px`, overflow-visible wrapper): two cubic-bezier line paths, stroke-width 1.25 — one in project color, one `lch(61.803% 1.2 272 / 1)88` (progress vs. target trend).
10. **end-padding** (8px, empty).

### 6.4 Sidebar item spec
Link `<a>`: flex row, border-radius 8px, margin 1px 0, `background transparent !important` (`sc2sx-SidebarLink-StyledLink-b4d1f6a9`); inner span **height 28px**, padding-left 8px / right 9px, font 13px/500, color `var(--sx-1dd5bcf)`; icon span 14×14 `margin-right: 6px`, icon color lch(60.621% 1.2 272 / 1); `data-active="true"` on current route (Projects). Hover/menu-open bg `var(--sx-16hn3q3)`.
Section headers: `button[data-sidebar-section-type="header"]` 12px label (`Workspace`, `Your teams`) + rotate-chevron; wrapper `data-sidebar-section-type="header-wrapper"`; sections collapse via height/opacity animation. Team rows: `li[role=button][data-draggable-id=<uuid>]` with `--x---indent-offset: 0px; --x---indent-current: 19px`; team icon 14×14 tinted (opacity .9); disclosure chevron + hover-revealed `Team menu` 3-dot button (`_iconButton_biby6_8`, svg max-width 12px). Teams container fixed `height: 318px` (7 teams, Trendzo expanded with 4 children).

### 6.5 Agent toolbar (bottom, 28px)
`div[data-agent-toolbar-bounds="true"]` with left `Agent` launcher button (icon + 12px "Agent" label, padding-left 10 / right 12), `data-agent-panel-anchor` div at `right: -8px` (panel mount), right-side `Chat history` icon button. Full-width strip over `var(--bg-color)`.

## 7. ICON INVENTORY (usage on this page)

Sprite sheets (`<symbol>`, referenced via `<use href="#Name">`): **Base** 33 symbols (Attachment, Blockquote, Calendar, Checklist, CodeBlock, Comment, CreditCard, CustomView, Favorite, Folder, Home, Inbox, Initiative, IssueStatus{Backlog,Done,Review,Started,Todo,Triage}, Label, Link, Lock, MilestoneNone, MilestoneStatus{Done,Planned,Started}, MyIssues, Project, Refresh, Search, Send, Subscribe, Team); **Brands** (Anthropic, Claude, Cursor, GitHub, GitLab, Meta, OpenAI, Ramp); **Decorative** ~264 symbols (Ai, Rocket, Radar, Chip, Europe, Feather, …).

Actually used in this DOM: `#Project` ×7 (sidebar Projects ×2, project row tiles ×5), `#Team` ×2 (Trendzo, Shrujan), `#Feather`, `#Chip`, `#Europe`, `#Radar`, `#Home` (team icons), `#QuestionMark` (help). Inline (non-sprite) svgs: workspace chevron, search magnifier, compose/new-issue pencil, section chevrons, sort chevrons, plus (Add view / Join team), filter, display-options sliders, close-sidebar panel glyph, milestone diamond, health dashed circle, priority bar glyphs, no-lead dashed avatar, calendar, status shield+progress ring, sparkline, 3-dot team menu, Agent glyph, chat-history clock.
Icon CSS contract: `fill: var(--icon-color)`; `--icon-color: var(--icon-replacement-color, var(--icon-default-color))`; per-instance inline `--x---icon-default-color`; `color-override` class for hard tints; default sizes 14×14 (chrome buttons) / 16×16 (row properties).

## 8. SCRIPTS / ASSETS / EMBEDDED STATE

- Entry: `<script src="https://static.linear.app/client/assets/html.9O-Enmr6.js">` + **1041 `<link rel="modulepreload">`** bundles from `https://static.linear.app/client/assets/`.
- Fonts: preload `InterVariable.woff2?v=4.1`; @font-face: Inter Variable (100–900, normal+italic), **Berkeley Mono** Variable v3.2 (mono), `Linear Thai` (local fallbacks). Stacks: `--font-regular: "Inter Variable", "SF Pro Display", -apple-system, …`; `--font-monospace: "Berkeley Mono", …`; `--font-emoji`.
- PWA: `pwa.webmanifest`, favicon svg `favicon-D8hcELd9.svg`, apple-touch-icon, `apple-itunes-app app-id=1645587184`; `performance.mark("appStart")`.
- Inline scripts: splashScreenConfig reader (theme/sidebar width pre-paint, sets meta theme-color `#09090A` dark / `#EFEFF0` light); electron detector; logged-out class manager (watches `localStorage.ApplicationStore`); `CLIENT_ENV = {COUNTRY_CODE:"IN", SENTRY_DSN:"https://f172c25063bf4e3492ece32b840ab90b@o415358.ingest.us.sentry.io/5337513", SENTRY_TUNNEL:"https://s.linear.app/tunnel"}`; `SW_HASH="5fd8ce2b…"` (service worker; `data-sw-cache="true"`); `__RELEASE_INFO = {BUILD_REVISION:"74834", CLIENT_VERSION_HASH:"e101b78e63f74642affe", DEPLOYED_AT:"2026-08-24T13:09:49+0000", SHORT_SHA:"fac8d475486", PR_NUMBER:"87799"}`; loading-error fallback with reload/logout links.
- Tech identified from vendor bundle names: **React + react-dom, react-router, MobX (+mobx-react-lite/utils), ProseMirror (full suite: model/state/view/tables/markdown/…), Yjs (+y-prosemirror, y-protocols, lib0), Radix UI, dnd-kit, react-virtuoso & react-window (virtual lists), react-spring, TanStack, downshift, Popper.js, Formik+Yup+Zod, GraphQL(+graphql-request), Algolia instantsearch, Sentry, sonner (toasts), d3-shape/d3-scale-chromatic + nivo (charts), date-fns, spacetime, highlight.js/lowlight, markdown-it, fflate, idb (IndexedDB), comlink (workers), lz-string, uuid, semver, simplewebauthn, focus-trap/tabbable, emotion, react-day-picker, react-dropzone, react-avatar-editor, react-medium-image-zoom, pluralize, re2js, sanity client**. Page-name bundles confirm feature surface (AgentPanel, CollaborativeEditor, DocumentContentEditorState, FastIssueCreateEditor, …).
- No JSON state blob is embedded (data hydrates from IndexedDB/GraphQL at runtime; this capture contains rendered DOM only).

## 9. STATE CLASSES / ATTRIBUTES

- Row/list state: `data-selected`, `data-active`, `data-keyboard-active`, `data-apply-background`, `data-first/last-selected`, `data-first/last-in-group`, `data-list-key`, `data-list-row`, `data-list-wrapper`, `data-list-container`, `data-list-grid-column`, `data-restore-scroll-view`.
- Menu/popup state: `data-menu-open="false"` (80×), `aria-haspopup="menu"` + `aria-expanded` (workspace menu, help menu), `data-contextual-menu="true"` (33× — right-click context-menu boundary markers), `data-detail-property-button`, `data-update-trigger="project-updates-_r_XX_"` (React useId anchors).
- Sidebar state: `data-active` on links, `data-visible-sidebar-item="true|false"`, `data-sidebar-section-type="header|header-wrapper"`, `data-sidebar-link-placeholder="drafts"`, `aria-expanded` on section/team disclosure buttons, `data-draggable-id` (dnd-kit), `aria-describedby="DndDescribedBy-N"`, `aria-disabled`.
- Global/bootstrap: html `dark`, `logged-out`, `electron` (conditional); body `content-loaded is-bootstrapped loaded bootstrap-fade-complete loadingText`; `hide-during-bootstrap` (opacity 0 → `bootstrapFadeIn .2s`), `suspenseFadeIn` (80ms), `data-loading-caret`, `data-scroll-container`, `data-facets`, `data-agent-toolbar-bounds`, `data-agent-panel-anchor`, `data-sw-cache`, `data-sprite-set`, `data-type="emoji"`.
- No Radix `data-state`/`data-radix-*` present in this static snapshot (Radix mounts portals at interaction time).
- CSS state hooks: `[data-menu-open=true]`, `[data-focused=true]`, `[data-active=true]`, `:focus-visible` (outline-offset -1px), `._container_1274r_7:hover [data-element-visible-on-container-hover]{opacity:1}`, `--row-applied-bg` / `--row-keyboard-border` custom-property driven row painting.

## 10. LINEAR-SIGNATURE / UNUSUAL DETAILS

- **StyleX-style atomic CSS**: thousands of `sx-*` utility classes, one declaration each, plus `--x-*` per-instance custom properties passed via inline style (e.g. `--x-gridTemplateColumns`, `--x-height`) — resolved by rules like `.sx-16ye13r{height:var(--x-height)}`. Component classes use `sc2sx-<Component>-<hash>` and CSS-modules `_name_hash_line`.
- **LCH color system everywhere** (`lch(61.803% 1.2 272 / 1)` etc.), hue 272 as the neutral axis; theme tokens injected at runtime (static css has `--color-*: initial` placeholders) — real values live in inline styles and the `<html>` style attr.
- **Subgrid-based table**: outer grid defines named columns once; every row is `display: grid; grid-template-columns: subgrid; grid-column: 1/-1` — genuine CSS subgrid usage.
- **Scroll-driven animations**: `scroll-timeline-name: --list-horizontal-scroll` on list scroller; sidebar `animation-timeline: --sidebar-content-scroll; animation-range: 0px 26px`.
- **Splash/bootstrap pipeline**: pre-paint theming from localStorage `splashScreenConfig`; `#loading` splash with Linear logo circle; body class choreography (`content-loaded → is-bootstrapped → loaded → bootstrap-fade-complete`); `hide-during-bootstrap` animation gating.
- **Scrollbar-width probe** div (h:0, w:50px, overflow-y:scroll) feeding `--scrollbar-width`; header paddings use `max(8px, var(--scrollbar-width, 0px))`.
- Hidden `<audio>` element (clip-rect) for notification sounds.
- **Route announcer** `role=status` span ("Navigated to Projects") and `#skip-nav` skip-link.
- **Toast viewport**: `section[aria-label="Notifications alt+T"]` in fixed z-581 layer (sonner).
- **Portal architecture**: `#portalLayoutRoot` inside main + ~14 empty `display:contents` theme-provider divs at body end as mount points for menus/dialogs/tooltips.
- **Agent toolbar** — Linear's AI agent dock: 28px bottom strip with `data-agent-toolbar-bounds`, `data-agent-panel-anchor`, `--agent-toolbar-height` propagated to `<html>` and splash centering math.
- **Electron-awareness**: `_draggableRegion_` (-webkit-app-region: drag) on sidebar top / header, disabled per-child via `_draggableRegionDisableChildren_`.
- Project **status shield glyph** built from dashed rounded-hexagon + masked conic-style progress circle (`stroke-dasharray "calc(X) 25.12"`), and per-row **32×16 progress sparkline** (d3-shape bezier paths).
- Everything interactive carries `data-contextual-menu="true"` wrappers — global right-click context menu delegation.
