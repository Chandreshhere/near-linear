# Linear.app Capture Forensics — Issue Detail Page: TRENDZO-37 "Research Work"

Source: `/private/tmp/claude-501/-Users-moon-Documents-linear/756a3e51-2170-4c62-854d-12969153cc3d/scratchpad/captures/trendzo-37-research-work/trendzo-37-research-work/`
(`index.html` 518,620 bytes; `styles.css` 643,402 bytes). Captured 2026-08-24. `<title>TRENDZO-37 Research Work</title>`. `<html data-sw-cache="true" lang="en-GB" class="dark logged-out">` — dark theme snapshot, Linear build `BUILD_REVISION: "74834"`, `CLIENT_VERSION_HASH: "e101b78e63f74642affe"`, `DEPLOYED_AT: "2026-08-24T13:09:49+0000"`, `SHORT_SHA: "fac8d475486"`, `SW_HASH "5fd8ce2b7c14501c591376529c3a084f31400e59"`.

Workspace: **Synquic** (slug `synquic-labs`), user `yatharth.kaushal@synquic.in` (initials avatar "YK", background `lch(70% 60 210 / 1)`).

---

## 1. APP FRAME GEOMETRY

Root inline vars on `<html>` (splash bootstrap): `--bg-color: lch(2.595% 0.4 272 / 1); --bg-sidebar-color: lch(2.595% 0.4 272 / 1); --bg-base-color: lch(5.52% 0.4 272); --bg-border-color: lch(14.16% 1.48 272 / 1); --agent-toolbar-height: 28px; --scrollbar-width: 0px`.

Frame skeleton (all inside `#root`):

```
#root
└─ #mainLayoutContainer (display:flex; width:100%; transition height/min-height .2s ease-out)
   ├─ [sidebar spacer]  div.sx-5yr21d  style="width: 244px"        ← in-flow ghost that reserves space
   ├─ [sidebar panel]   div position:fixed; z-index:96; style="width:244px; left:0; top:0; bottom:0";
   │                    max-width: min(100vw - 40px, 330px); will-change:transform; flex column
   │  └─ nav (h:100%) → top bar (draggable) + scrollable content
   ├─ [main column] → <main> (flex:auto; overflow:hidden; flex column)
   └─ [agent toolbar row]  div.sx-h8yej3 style="height: 28px"  (bottom bar, z-index:97, bg var(--bg-color))
```

Exact values:
- **Sidebar width: 244px** (default; runtime var `--sidebar-width:244px` in styles.css, user-resizable, persisted in `localStorage.splashScreenConfig.sidebarWidth`; hard cap `max-width: min(100vw - 40px, 330px)`).
- **Sidebar top bar row**: `--x-height: 44px; --x-marginTop: 8px`, horizontal padding 12px (`padding-left:12px; padding-right:12px`), `-webkit-app-region: drag` (`._draggableRegion_b2qal_1`). Workspace avatar tile 24×24, border-radius on button 10px, gap 6px.
- **Sidebar scroll area**: `overflow-y:auto`, `padding-top:26px`, `padding-left:12px`, `--x-paddingRight:12px`, `scrollbar-gutter:stable`, own scroll-timeline `--sidebar-content-scroll` (a top shadow element animates over `animation-range: 0px 26px`).
- **Content header height: 57px** — `min-height: calc(var(--header-height, var(--sx-8q2ft0)) + var(--sx-1ele6il))`, with `--sx-8q2ft0: 57px` and `--header-height: initial`. Header is `display:flex; align-items:center; flex-shrink:0`, `padding-right:12px`, breadcrumb side `padding-left:10px; padding-right:4px`, gaps `--x-d23hjn/--x-1rbh7yt: max(12px, 8px)`; class `_draggableRegionDisableChildren_b2qal_7` (drag region except children). Right side reserved row `min-height: 28px`, gap 12px.
- **Issue-view scroll grid** (`div[data-restore-scroll-view="issue-view"]`, `.sx-8w46s4`):
  `display:grid; grid-template-columns: 1fr minmax(0, 80ch) minmax(0, clamp(280px, 26.087cqw + 66.087px, 400px)) 1fr;`
  `column-gap: clamp(16px, 8.696cqw - 55.304px, 56px); overflow-y:auto; align-content:start; align-items:start; scrollbar-gutter:stable; scroll-timeline-name: --issue-details-pane-scroll`.
  - Content column = grid-column 2 (`.sx-1npkx4u`), flex-basis 80ch, `container-name: issue-view-container; container-type: inline-size` on the `data-view-id="issue-view"` wrapper.
  - **Right property rail = grid-column 3** (`.sx-1k3v4rp`): width `clamp(280px, …, 400px)`; inner sticky wrapper `position:sticky; top:0px; align-self:start`; rail column `padding-top: 51px; padding-bottom: 54px`.
- Content column title block: `margin-top: 18px` (mobile variant 32px), title row `padding: 6px 0; margin-bottom: 8px`; left inset `padding-left: 14px`.
- **Agent toolbar (bottom bar)**: outer row `height:28px`, inner `height:28px; z-index: calc(96+1); background-color: var(--bg-color); margin-top:-4px; padding-top:4px; border-top: var(--sx-1ele6il) solid var(--sx-1o1lnwn)`; right cluster `padding-right:8px`; "Agent" pill `padding-left:10px; padding-right:12px`, icon 14×14 + label 12px.
- Floating Help button: absolute `bottom:0`, `padding:10px` container, standard 16×16 icon button ("Open Help menu").
- Default page transitions: `--speed-quickTransition: .1s; --speed-regularTransition: .25s; --speed-slowTransition: .35s`; focus ring `--focus-ring-width: 1px`, `--focus-ring-outline: 1px solid var(--focus-ring-color)`.
- Scrollbar: `--scrollbar-width: 12px` (CSS), overridden to 0px on html for this capture (overlay scrollbars).

## 2. FULL DOM OUTLINE

```
body.content-loaded.is-bootstrapped.loaded.bootstrap-fade-complete
└─ #root
   ├─ div[data-sprite-set="Base"]   <svg><defs><symbol…×33/></defs></svg>   (hidden sprite sheets)
   ├─ div[data-sprite-set="Brands"] (Anthropic, Claude, Cursor, GitHub, GitLab, Meta, OpenAI, Ramp)
   ├─ div[data-sprite-set="Decorative"] (~264 symbols: Rocket, Bug, Chip, Europe, …)
   ├─ theme-provider div (display:contents)
   │  ├─ <audio aria-hidden> (notification sound)
   │  ├─ div[tabindex=-1][data-scroll-container]  (focus catcher)
   │  ├─ a[href="#skip-nav"] "Skip to content" (visually hidden, 1px)
   │  ├─ #mainLayoutContainer
   │  │  ├─ sidebar spacer (width:244px) + fixed sidebar panel (width:244px)
   │  │  │  └─ nav
   │  │  │     ├─ top bar (_draggableRegion): button[aria-label="Synquic Workspace Menu"][aria-haspopup=menu]
   │  │  │     │   ("SY" 24×24 tile + "Synquic"), spacer, button[aria-label="Search workspace"],
   │  │  │     │   div[data-contextual-menu] > button[aria-label="Create new issue"]
   │  │  │     ├─ scroll container [data-scroll-container]
   │  │  │     │  ├─ top primary group (dnd-kit sortable, aria-roledescription="sortable"):
   │  │  │     │  │   a[href=/synquic-labs/inbox] "Inbox" · a[/my-issues/assigned] "My issues" ·
   │  │  │     │  │   a[/agent] "Agent" · hidden [data-sidebar-link-placeholder="drafts"]
   │  │  │     │  │   + #DndDescribedBy-0 / #DndLiveRegion-0 (sr-only)
   │  │  │     │  ├─ section "Workspace" (button[data-sidebar-section-type=header][aria-expanded=true])
   │  │  │     │  │   └─ #sidebarWorkspace: a "Projects"(/projects/all, #Project icon) · a "Views"(/views/issues)
   │  │  │     │  │      · 2 hidden rows · a "Loops"(/loops) · hidden row ·
   │  │  │     │  │      div[role=button][aria-label="Show more links"] "More"
   │  │  │     │  ├─ section "Your teams" (+ button[aria-label="Join a team"])
   │  │  │     │  │   └─ #sidebarMyTeams > ul#teams-boundary-container (height 318px, sortable li's)
   │  │  │     │  │      ├─ li Trendzo (expanded: button[aria-expanded=true][aria-controls=team-…],
   │  │  │     │  │      │   #Team icon #00a0ff, chevron, div[aria-label="Team menu"])
   │  │  │     │  │      │   └─ sub-links: "Home"→ /team/TRENDZO/overview · "Issues"→ /team/TRENDZO/all ·
   │  │  │     │  │      │      "Projects"→ /team/TRENDZO/projects/all · "Views"→ /team/TRENDZO/views/issues
   │  │  │     │  │      └─ li ×6 collapsed: PGME, Shrujan, Icon, Trikaal, Tiffsy, Homingo (each with Team menu)
   │  │  │     │  └─ "Try" section area (suspense placeholder .suspenseFadeIn)
   │  │  ├─ main column div
   │  │  │  └─ <main>
   │  │  │     ├─ #skip-nav
   │  │  │     └─ content region [data-loading-caret="true"]
   │  │  │        ├─ <header> (57px)
   │  │  │        │  ├─ breadcrumbs (_breadcrumbItemsContainer):
   │  │  │        │  │   a[Trendzo → /team/TRENDZO/overview, aria-label="Team overview", #Team icon] › 
   │  │  │        │  │   a[Issues → /team/TRENDZO/all, aria-label="All issues"] ›
   │  │  │        │  │   a[TRENDZO-37 Research Work → /issue/TRENDZO-37/research-work] (_currentItemContainer)
   │  │  │        │  ├─ button[role=switch aria-label="Add to favorites" aria-checked=false]
   │  │  │        │  ├─ button[aria-label="Issue options" aria-haspopup=menu]
   │  │  │        │  └─ right slot (min-height:28px, empty)
   │  │  │        ├─ floating action strip (absolute under header, right-aligned):
   │  │  │        │   buttons "Copy issue URL", "Copy issue ID", "Copy branch name", "Work on issue"
   │  │  │        └─ issue-view scroll grid [data-restore-scroll-view="issue-view"]
   │  │  │           ├─ col-2 content [data-view-id="issue-view"][data-table-overhang-boundary="both"]
   │  │  │           │  ├─ TITLE editor: ProseMirror div[contenteditable=true][role=textbox]
   │  │  │           │  │   [aria-label="Issue title"][aria-multiline=false] > p.text-node "Research Work"
   │  │  │           │  ├─ DESCRIPTION editor [data-editor-id="issue-94c11c2d-1fb4-4d4b-a668-def1cf8dccec"]
   │  │  │           │  │   ProseMirror.editor [aria-label="Issue description"][aria-multiline=true]
   │  │  │           │  │   .editor-extension-collaboration .show-inline-comments
   │  │  │           │  │   └─ ul[data-type=todo_list].list-node
   │  │  │           │  │      ├─ li[data-type=todo_item][data-done=false] (drag-handle svg + role=checkbox +
   │  │  │           │  │      │   .todo-content > p > span.attr[data-user-id]) "ai models/ deployment pipeline…"
   │  │  │           │  │      └─ li[data-done=false] "billing software to be integrated…"
   │  │  │           │  │   + agent-change gutter overlays [data-testid=agent-change-gutter-overlay/-layer]
   │  │  │           │  ├─ reaction row: button "Add reaction", button "Attach images, files, or videos",
   │  │  │           │  │   input[type=file][multiple] (visually hidden)
   │  │  │           │  ├─ SUB-ISSUES bar [view-timeline: --sub-issues-section]:
   │  │  │           │  │   button[aria-label="Create new sub-issue"] "+ Add sub-issues"
   │  │  │           │  ├─ .list-columns-5381 (runtime-generated list column stylesheet hook, empty)
   │  │  │           │  ├─ divider (margin-top:16px, 1px border)
   │  │  │           │  ├─ ACTIVITY header row (padding-right:8px):
   │  │  │           │  │   span "Activity" (15px/600) · button "Subscribe" · button[aria-label="Change
   │  │  │           │  │   subscribers"] (avatar pile, 18×18 "YK")
   │  │  │           │  ├─ activity feed (padding-bottom:60px):
   │  │  │           │  │   entry [data-history-entry-id]: 14×14 avatar link → profile,
   │  │  │           │  │   text "<b>yatharth.kaushal@synquic.in</b> created the issue · <a>1h ago</a>"
   │  │  │           │  │   (a[aria-label="Mon Aug 24, 2026, 17:35:28"] href=…#update-…-issue-created)
   │  │  │           │  └─ COMMENT COMPOSER <form>:
   │  │  │           │     div[data-comment-input-editor-container] (bordered rounded card, elevated theme)
   │  │  │           │     ├─ ProseMirror .editor with p.editor-placeholder[data-empty-text="Leave a comment…"]
   │  │  │           │     └─ footer row: button[submit][aria-label="Submit comment"] (_iconOnlySubmitButton)
   │  │  │           ├─ col-3 PROPERTY RAIL (sticky, padding-top 51px):
   │  │  │           │  ├─ section "Properties" [data-details-pane-section-content]
   │  │  │           │  │  ├─ button[data-detail-button] status: dashed-circle svg + "Backlog"
   │  │  │           │  │  ├─ button[data-detail-button] priority: "No Priority" svg + "Set priority"
   │  │  │           │  │  └─ button[data-detail-button] assignee: dashed-person svg + "Assign"
   │  │  │           │  ├─ section "Labels": button[aria-label="Add labels"] + "Add label"
   │  │  │           │  └─ section "Project": button #Project icon + "Add to project"
   │  │  │           └─ #portalLayoutRoot (empty portal mount)
   │  ├─ agent toolbar row (28px): [data-agent-toolbar-bounds] · [data-agent-panel-anchor] ·
   │  │   button[aria-label="Agent"] (icon+label) · button[aria-label="Chat history"]
   │  ├─ div.sx-ixxii4 (fixed, z-index 581) — overlay layer
   │  └─ <section aria-label="Notifications alt+T" tabindex="-1" aria-live="polite"> (sonner toast viewport)
   ├─ span[role=status][aria-live=polite] "Navigated to TRENDZO-37 Research Work" (route announcer)
   ├─ #loading > #appBorders > #loading-content > #preloader (#preloaderContent svg logo) + #loadingText "Loading…"
   └─ ~15 trailing portal divs (theme-provider-* display:contents wrappers, .sx-jp7ctv display:contents)
```

## 3. VISIBLE TEXT LABELS (complete inventory)

Sidebar (in order): `Skip to content` · `SY` (workspace tile) · `Synquic` · `Inbox` · `My issues` · `Agent` · section `Workspace` · `Projects` · `Views` · `Loops` · `More` · section `Your teams` · `Trendzo` (+ sub: `Home`(icon Home sprite), `Issues`, `Projects`, `Views`) · `PGME` · `Shrujan` · `Icon` · `Trikaal` · `Tiffsy` · `Homingo`.

Header: breadcrumb `Trendzo › Issues › TRENDZO-37 Research Work` (separator glyph `›`).

Content: title `Research Work`; description checklist items `ai models/ deployment pipeline mock up gen and virtual try on cheaper way for this functionality` and `billing software to be integrated with our register service - billing s/w with good customer support`; `Add sub-issues`; `Activity`; `Subscribe`; `yatharth.kaushal@synquic.in created the issue · 1h ago`; composer placeholder `Leave a comment…` (data-empty-text).

Property rail: `Properties` · `Backlog` · `Set priority` · `Assign` · `Labels` · `Add label` · `Project` · `Add to project`.

Bottom bar: `Agent`. Screen-reader/live: `Navigated to TRENDZO-37 Research Work`. Splash: `Loading…` (plus error template strings `Network error while loading`, `Something might be wrong with your connection. Reload the app to try again.`, `Reload`, `Contact support`).

Aria-label-only (tooltips): `Synquic Workspace Menu`, `Search workspace`, `Create new issue`, `Join a team`, `Show more links`, `Team menu` (×7), `Team overview`, `All issues`, `Add to favorites`, `Issue options`, `Copy issue URL`, `Copy issue ID`, `Copy branch name`, `Work on issue`, `Issue title`, `Issue description`, `Add reaction`, `Attach images, files, or videos` (×2), `Create new sub-issue`, `Subscribe to issue`, `Change subscribers`, `Submit comment`, `No Priority`, `Add labels` (×2), `Agent`, `Chat history`, `Open Help menu`, `Notifications alt+T`, `Mon Aug 24, 2026, 17:35:28` (timestamp tooltip). `title=` attrs: the 7 team names + none else.

## 4. ROUTE MAP (workspace slug: `synquic-labs`)

Top-level: `/synquic-labs/inbox` · `/synquic-labs/my-issues/assigned` · `/synquic-labs/agent` · `/synquic-labs/loops` · `/synquic-labs/projects/all` · `/synquic-labs/views/issues`.
Team: `/synquic-labs/team/TRENDZO/overview` · `/synquic-labs/team/TRENDZO/all` · `/synquic-labs/team/TRENDZO/projects/all` · `/synquic-labs/team/TRENDZO/views/issues`.
Issue: `/synquic-labs/issue/TRENDZO-37/research-work` (pattern `/:workspace/issue/:ISSUE-ID/:slug`); activity permalink `https://linear.app/synquic-labs/issue/TRENDZO-37/research-work#update-{issueUUID}-issue-created`.
Profiles: `/synquic-labs/profiles/yatharth.kaushal` (pattern `/:workspace/profiles/:username`).
Anchors: `#skip-nav`. Sprite refs: `#Team ×3, #Project ×3, #Home, #Chip, #Europe, #Feather, #Radar, #QuestionMark`.
External: `https://static.linear.app` (assets), `mailto:support@linear.app`.
Settings-page JS chunks preloaded reveal the settings route surface (AccountPreferences/Profile/Security/Shortcuts/Connections/Agents/CodeAndReviews settings pages, team settings, billing, etc.) though no settings hrefs are rendered on this page.

## 5. KEYBOARD SHORTCUTS IN DOM

Sparse on this page: **no `<kbd>` elements, no `aria-keyshortcuts`** in the static capture (Linear renders shortcut hints inside runtime tooltips/menus only). Present: toast region `aria-label="Notifications alt+T"` (sonner's viewport hotkey label = Alt+T). The splash script reads `sessionStorage.splashScreenConfig`. Everything else (Cmd+K etc.) lives in JS, not the DOM snapshot.

## 6. ISSUE-DETAIL COMPONENT ANATOMY (exact values)

**Title editor** — ProseMirror, single-line: `contenteditable=true, role=textbox, aria-multiline=false, aria-label="Issue title", translate=no, spellcheck=true`. Classes resolve to: `font-size: 1.5rem (24px)`; `--editor-font-size: 1.5rem`; `font-weight: 600`; `line-height: calc(1 + 1/3)`; `letter-spacing: -.00625rem`; `text-wrap: pretty`; `font-variation-settings: "opsz" 32`; `font-feature-settings: "calt"`; `cursor: text`; color `var(--editor-text-color)`. Container: padding 6px 0, margin-bottom 8px, margin-top 18px.

**Description editor** — ProseMirror multiline, `.editor .editor-extension-collaboration .show-inline-comments`, `data-editor-id="issue-94c11c2d-1fb4-4d4b-a668-def1cf8dccec"` (issue UUID). Editor tokens (`:root` + inline): `--editor-font-size: .9375rem (15px)`, `--editor-line-height: 1.6`, `--editor-letter-spacing: -.00666667em`, `--editor-block-spacing: 1rem` (small=.375×, large=1.375×), `--editor-block-radius: 6px`, `--editor-list-inset: 1.5rem`, `--editor-todolist-checkbox-width: 14px`, `--editor-safe-area: 16px`, weight 450 (`--font-weight-normal: 450`).
Content = `ul[data-type=todo_list].list-node` with `li[data-type=todo_item][data-done="false"]`, each: `.todo-checkbox-container` (6×10 `.todo-drag-handle` svg + `.todo-checkbox.todo-checkbox-unchecked[role=checkbox][aria-checked=false][tabindex=0]`), `.todo-content > p.text-node > span.attr[data-user-id="05052dfd-…"]` (authorship attribution mark). Checked style: `--editor-todo-checked-opacity: 0.65`, checkmark via inline SVG data-URI (`--editor-todo-checkmark-image`). Trailing `p.text-node > br.ProseMirror-trailingBreak`.
Agent-change gutter overlay divs flank the editor (`data-testid="agent-change-gutter-overlay"/"agent-change-gutter-layer"`).

**Full dark editor palette** (inline style, description editor): `--editor-label-title: lch(100% 0 272)`, `--editor-label-muted: lch(61.803% 1.2 272)`, `--editor-label-faint / placeholder: lch(36.975% 1.2 272)`, `--editor-label-link: lch(57.028% 70 288.421)`, `--editor-control-primary: lch(47.918% 59.303 288.421)` (Linear indigo), selection `lch(47.918% 59.303 288.421 / 0.4)`, inactive selection `lch(61.803% 1.2 272 / 0.2)`, `--editor-bg-base: lch(5.52% 0.4 272)`, `--editor-bg-sub: lch(2.595% 0.4 272)`, `--editor-bg-shade: lch(7.32% 0.85 272)`, `--editor-bg-focus: lch(13.62% 0.85 272)`, borders `lch(14.16–16.32% 1.48 272)` (hover `lch(20.64%…)`), inline-code bg `rgba(255,255,255,0.075)`, autocomplete input `rgba(255,255,255,0.035)`, comment overlay (amber) `lch(21.633% 23.767 83.803)` / active `lch(32.568% 37.936 84.425)`, red text `lch(80% 80 29)`, focus shadow `0 0 0 1px lch(47.918% 59.303 288.421)`, hljs: red `#EC3B40`, orange `#EB6E3D`, green `#25F8CA`, yellow `#FCE27D`, pink `#E394DC`, blue `#2482D8`, blue-light `#00C5F0`. Agent highlight: `lch(87.2% 70 267 / 0.18)` active / `/ 0.08` previous.

**Action row under description**: icon buttons 16×16 svg in `_iconSmall_ekx18_16` (14×14 box), fill `lch(61.803% 1.2 272 / 1)`; hidden `input[type=file][multiple]`.

**Sub-issues bar**: sticky-ish flex row (view-timeline `--sub-issues-section`), button "Add sub-issues" = plus icon + 12px/500 label, hover bg via `_menuOpenBg` (`--btn-highlight-bg`); collapsed sub-list wrapper `height:0; overflow:hidden`.

**Activity section**: divider `margin-top:16px` + 1px line; header "Activity" `font-size:.9375rem; font-weight:600; line-height:1.4375rem`; "Subscribe" text button; subscriber avatar pile (`--x-width/height: 18px`, font 9px, mask overlap -9px). Feed gap 18px, `padding-right:10px`, bottom padding 60px. Entry: `[data-history-entry-id]`, 14×14 round avatar (font 8px), one-line text `_activityHistoryText_cekl9_2` (`word-break:break-word; line-height:1.4`, clamp `--x-WebkitLineClamp: 6`, highlight color `lch(90.451% 1.2 272)`), color `var(--sx-1dd5bcf)` (label-muted), bold author link, `·` separator, relative time link with absolute-date aria-label.

**Comment composer**: `<form>` with negative margins -8px; card `div[data-comment-input-editor-container][data-table-overhang-boundary=both]` — rounded (border-radius 8px family), border color var, `box-shadow var(--sx-10lzhmx)`, padding 12px top/bottom, `min-width: min(300px, 100%)`, gap 16px; **elevated theme override** (comment card sits on raised surface): `--editor-bg-base: lch(9.232% 0.85 272)`, `--editor-bg-sub: lch(6.307% 0.85 272)`, `--editor-bg-shade: lch(11.033% 1.3 272)`, borders `lch(17.873–20.032% 1.93 272)`, label-muted `lch(63.304% 1.425 272)`, faint `lch(39.452% 1.425 272)`, link `lch(58.717% 70 288.421)`. Placeholder paragraph `p._placeholderParagraph_p09cr_2.text-node.editor-placeholder[data-empty-text="Leave a comment…"]`. Footer: icon-only submit `button[type=submit][tabindex=-1][aria-label="Submit comment"]` (`_iconOnlySubmitButton_k6z3b_5`).

**Property rail** (col 3, sticky, top:0, padding-top 51px / bottom 54px): section = `.sx-zboxd6` block, header row height 20px with label (`sc2sx-Text` 13px/500, color label-muted `var(--sx-1dd5bcf)`, `padding: 0 8px`), then `[data-details-pane-section-content]._sectionContent_17i83_5` `style="gap:4px; padding-top:8px"`.
Property row control = `button[data-detail-button="true"]._detailButton_yk5d8_1` with hit-slop vars `--x-d62und/-jnb6vr/-1glzw6q: -4px; --x-s3vhh9: -8px`; `svg { flex-shrink:0; margin-right:6px }`; hover bg `var(--detail-button-control-tertiary-hover)`, active/focus `…-selected`.
Rows on this capture:
1. Status **Backlog** — inline 14×14 svg: outer dashed circle `r=6 stroke=#bec2c8 stroke-width=1.5 stroke-dasharray="1.4 1.74" stroke-dashoffset=0.65` + inner progress arc `r=2 stroke-width=4 dasharray 11.3097/22.6195 dashoffset 11.3097 rotate(-90)` (0% filled); label color `var(--sx-3zwjav)` (label-base).
2. Priority — 16×16 "No Priority" svg (three 3×1.5 rounded rects, opacity .9), label "Set priority" in label-muted.
3. Assignee — dashed-person icon, label "Assign".
Labels section: "Add label" w/ label icon. Project section: `<use href="#Project">`, "Add to project". Empty-value labels use muted color; set values use base color.

## 7. ICON INVENTORY

Three hidden SVG sprite sheets at top of `#root` (`div[data-sprite-set]` + `<symbol>` defs, 305 symbols total, all `viewBox="0 0 16 16"`):
- **Base** (33): Attachment, Blockquote, Calendar, Checklist, CodeBlock, Comment, CreditCard, CustomView, Favorite, Folder, Home, Inbox, Initiative, IssueStatusBacklog, IssueStatusDone, IssueStatusReview, IssueStatusStarted, IssueStatusTodo, IssueStatusTriage, Label, Link, Lock, MilestoneNone, MilestoneStatusDone/Planned/Started, MyIssues, Project, Refresh, Search, Send, Subscribe, Team.
- **Brands** (8): Anthropic, Claude, Cursor, GitHub, GitLab, Meta, OpenAI, Ramp.
- **Decorative** (~264): team/project icon library (Rocket, Bug, Chip, Europe, Feather, Radar, QuestionMark, Home, …).

`<use>` references on this page: `#Team` ×3 (Trendzo breadcrumb+sidebar, Shrujan), `#Project` ×3 (sidebar Projects, team Projects, rail Add to project), `#Home` (Homingo), `#Chip` (Icon team), `#Europe` (Trikaal), `#Feather` (PGME), `#Radar` (Tiffsy), `#QuestionMark`. Team icon fills: Trendzo `#00a0ff`, PGME `#008fff`, Shrujan `#00aa00`, Icon `#f85911`, Trikaal `#789c00`, Tiffsy `#d67600`, Homingo `#00b187` (all at `opacity: 0.9`).

All chrome icons otherwise are **inline 16×16 svgs** (`role="img" focusable="false"`, default `fill="lch(61.803% 1.2 272 / 1)"`, sidebar variant `lch(60.621% 1.2 272 / 1)`, sized to 14×14 via `_iconSmall_ekx18_16` / spans `width:14px;height:14px;margin-right:6px`): inbox, my-issues, agent-face, search magnifier, new-issue pencil, chevron-down (team expand), three-dots (Team menu / Issue options), star (favorite), link/copy, hash (issue id), git-branch, play/"Work on issue", smiley-plus (reaction), paperclip (attach), plus (sub-issue), bell (subscribe), arrow-up submit, question-mark (help), clock (chat history), status circles. Status "Backlog" and "Assign" render as bespoke inline dashed svgs (see §6).

## 8. SCRIPTS / ASSETS / EMBEDDED STATE

- Entry: single `<script type=module src="https://static.linear.app/client/assets/html.9O-Enmr6.js">` + **1,046 `modulepreload` links** (rolldown/Vite build, `rolldown-runtime.KFiyTY0I.js`, `preload-helper`).
- **Vendor chunks (84)** name the stack: react, react-dom, react-router, **mobx / mobx-react-lite / mobx-utils**, **prosemirror-*** (13 chunks), **yjs / y-prosemirror / y-protocols / lib0** (collaborative editing), **radix-ui**, emotion, react-virtuoso + react-window (virtual lists), **dnd-kit**, downshift, popperjs, **sonner** (toasts), react-spring, framer-ish `vendor-chenglou`, formik+yup+zod, graphql + graphql-request, **sentry**, algoliasearch + instantsearch + react-instantsearch, highlight.js/lowlight, markdown-it, date-fns, spacetime, fflate, idb (IndexedDB), comlink (workers), lz-string, uuid, semver, simplewebauthn, tanstack, nivo + d3 (charts), react-day-picker, react-dropzone, react-avatar-editor, react-medium-image-zoom, focus-trap, tabbable, sanity-client/portabletext (CMS), re2js, smol-toml, compromise (NLP dates), pluralize, diff, leeoniya (uPlot), alcalzone.
- ~950 route/component chunks preloaded (AgentSessionPage, Board, CyclePage, TriagePage, settings pages, etc.) — a full route-map fingerprint.
- Fonts: `InterVariable.woff2?v=4.1` (preload; weight 100–900, font-display swap) + `InterVariable-Italic`, `Berkeley-Mono-Variable.woff2?v=3.2` (mono), local "Linear Thai" fallback stack. `--font-regular: "Inter Variable", "SF Pro Display", -apple-system, …`.
- PWA: `pwa.webmanifest`, favicon `favicon-D8hcELd9.svg`, `apple-touch-icon-Ca-Mp0P3.png` (180×180), `apple-itunes-app app-id=1645587184`.
- Meta: `theme-color: lch(2.595% 0.4 272 / 1)`, `color-scheme: dark`, `mobile-web-app-capable`, viewport `maximum-scale=1, user-scalable=no, viewport-fit=cover`.
- Inline scripts (9): `performance.mark("appStart")`; splash-screen config reader (localStorage/sessionStorage `splashScreenConfig` → sets `--bg-*`, `--sidebar-width`, `--agent-toolbar-height`, dark class); `var global={window},process={env:{}}` shim; Electron detector; DOMContentLoaded loader-class toggler; `CLIENT_ENV = {COUNTRY_CODE:"IN", SENTRY_DSN:"https://f172c25063bf4e3492ece32b840ab90b@o415358.ingest.us.sentry.io/5337513", SENTRY_TUNNEL:"https://s.linear.app/tunnel"}`; `SW_HASH`; asset-load-failure beacon + 30s entry timeout error UI; `__RELEASE_INFO`.
- No JSON preloaded-state blob: all data arrives via GraphQL/sync engine at runtime (IndexedDB via idb; `data-sw-cache="true"` = service-worker-cached shell).

## 9. STATE CLASSES & ATTRIBUTE SIGNATURES

- `data-menu-open="false|true"` (×29) on tooltip/menu trigger wrappers; open styling via `._menuOpenBg_ekx18_56[data-menu-open=true] { background-color: var(--btn-highlight-bg) }`, `_menuOpenColor_ekx18_61`, `_menuOpenTextColor_ekx18_66`, `_menuOpenOverlay_ekx18_79`.
- `data-active="false"` (×10) on sidebar `<a>` links (active-route flag); `data-visible-sidebar-item="true|false"` (×15) collapse animation state; `data-sidebar-section-type="header|header-wrapper"`; `data-sidebar-link-placeholder="drafts"`.
- `data-contextual-menu="true"` (×26) — right-click context-menu mount wrapper around nearly every interactive region (Linear signature).
- dnd-kit: `aria-roledescription="sortable"`, `aria-describedby="DndDescribedBy-N"`, live regions `#DndLiveRegion-N[role=status]`, `data-draggable-id="{uuid}"`, `draggable="true"`.
- Radix is bundled (`vendor-radix-ui`) but **no `data-radix-*` / `data-state` appears in static DOM** — popovers/menus are portal-rendered on demand. Menu triggers use `aria-haspopup="menu"` + `aria-expanded` (workspace menu, issue options, help); disclosure buttons use bare `aria-expanded` (sections, teams); favorite = `role="switch"` + `aria-checked`.
- Bootstrap/lifecycle classes on `<body>`: `content-loaded is-bootstrapped loaded bootstrap-fade-complete loadingText`; `.hide-during-bootstrap` (opacity 0 until `body.is-bootstrapped`, then `bootstrapFadeIn .2s`); `.suspenseFadeIn` (80ms fade for lazy chunks).
- Editor state: `.ProseMirror-focused`, `.show-inline-comments`, `.editor-placeholder[data-empty-text]`, `todo-checkbox-unchecked`, `[data-done]`, `span.attr[data-user-id]`.
- Misc state hooks: `data-loading-caret`, `data-restore-scroll-view="issue-view"`, `data-view-id="issue-view"`, `data-table-overhang-boundary="both"`, `data-scroll-container`, `data-details-pane-section-content`, `data-detail-button`, `data-comment-input-editor-container`, `data-history-entry-id`, `data-agent-toolbar-bounds`, `data-agent-panel-anchor`, `data-editor-id`.
- Styling system: atomic classes `sx-*` (StyleX-like, one declaration each, ~4,537 in css) + hashed CSS-module classes `_name_hash_n` + styled-component-ish `sc2sx-ComponentName-hash` (`sc2sx-Flex-d11c8f6e`, `sc2sx-Text-c50a30fa`, `sc2sx-SidebarLink-StyledLink-b4d1f6a9`); dynamic values via inline `--x-*` custom props (e.g. `--x-height: 44px`, `--x-4xs81a: var(--sx-1dd5bcf)` for Text color). Cascade layers: `@layer reset, base, app.base`.
- Key runtime color tokens (empty in css, injected by JS theme): `--sx-ys2i3t` = label-title, `--sx-3zwjav` = label-base (= `--editor-text-color`), `--sx-1dd5bcf` = label-muted, `--sx-1eapsa9` = label-faint-placeholder, `--sx-1ubxoo9` = surface bg (= `--editor-surface-background`), `--sx-1o1lnwn` = border, `--sx-ch85qk` = focus ring.

## 10. LINEAR-SIGNATURE ODDITIES

- **SVG symbol sprite-sheet trio** (`data-sprite-set="Base|Brands|Decorative"`, 305 symbols) parked as first children of `#root`; icons referenced by `<use href="#Name">` — build spec can ship the same 3-sheet approach.
- **Splash-screen theming contract**: inline script applies `localStorage.splashScreenConfig` (bg colors, sidebarWidth, agentToolbarHeight, darkMode) to `<html>` style before React loads → zero-flash startup; `#loading/#appBorders/#preloader` splash with pulsing logo; 8s timer adds `.loadingText`; network-failure beacon to `s.linear.app/tunnel` + error card with Reload / Contact support.
- **LCH everywhere**: whole palette expressed as `lch(L% C H / a)` with hue 272 (neutrals) and 288.421 (brand indigo `lch(47.918% 59.303 288.421)`).
- **Scroll-driven animations**: `scroll-timeline-name: --issue-details-pane-scroll` (content scroller, scoped via `timeline-scope` on main column), `--sidebar-content-scroll` (sidebar top shadow, `animation-range: 0px 26px`), `view-timeline: --sub-issues-section`; CSS `container-type/name: issue-view-container` with `cqw`-based clamp for rail width; `interpolate-size: allow-keywords`.
- **Contextual-menu wrappers** (`data-contextual-menu="true"`) around every region instead of document-level listeners.
- **Route announcer** span (`role=status`, "Navigated to …") + **sonner** toast `<section aria-label="Notifications alt+T">` + `<audio>` element for notification sounds.
- **Agent chrome baked into the shell**: 28px bottom agent toolbar (`--agent-toolbar-height`), `data-agent-panel-anchor`, agent-change gutter overlays inside the description editor, "Work on issue" header action, `--agent-highlight-*` editor vars — the AI-agent surface is a first-class layout band.
- **Collaborative editing on by default**: `editor-extension-collaboration` class + yjs/y-prosemirror chunks; description text wrapped in `span.attr[data-user-id]` authorship marks.
- **Electron accommodations**: `-webkit-app-region: drag` top bars (`_draggableRegion_b2qal_1`, header `_draggableRegionDisableChildren`), `html.electron` rules, Electron UA detector script.
- **`.list-columns-5381`**: runtime-generated stylesheet hook for list column layout (class exists in DOM, no rule in static css).
- **Portal strategy**: `#portalLayoutRoot` inside main + ~15 trailing `display:contents` `theme-provider-{hash}` divs at body end (tooltip/modal/menu mounts); overlay layers with explicit z-indexes: sidebar 96, agent bar 97, overlay `calc(580+1)`.
- Accessibility flourishes: `a[href="#skip-nav"]` skip link, visually-hidden 1px pattern, `aria-roledescription="sortable"` + DnD live regions, switch/checkbox roles on toggles, `title` used only for truncatable team names.
