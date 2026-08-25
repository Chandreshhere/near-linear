# Linear.app — Agent Chat "New chat" page — Forensic Capture Analysis

Capture: `/private/tmp/claude-501/-Users-moon-Documents-linear/756a3e51-2170-4c62-854d-12969153cc3d/scratchpad/captures/new-chat/new-chat/index.html` (484,193 bytes) + `styles.css` (642,856 bytes).
Captured 2026-08-24. `<title>New chat</title>`. Build: `BUILD_REVISION: "74835"`, `CLIENT_VERSION_HASH: "e101b78e63f74642affe"`, `DEPLOYED_AT: "2026-08-24T13:24:20+0000"`, `SHORT_SHA: "ec94d05c5c6"`, `SW_HASH="5fd8ce2b7c14501c591376529c3a084f31400e59"`.
Workspace: **Synquic** (slug `synquic-labs`), dark theme.

CSS system is Meta StyleX: atomic classes `sx-XXXXX` each map to exactly one declaration in styles.css (values quoted below are resolved from styles.css). Theme color tokens (`--sx-3zwjav`, `--sx-ys2i3t`, `--sx-15wwovl`, `--sx-10lzhmx`, `--sx-1ele6il`, …) are declared empty in `:root` and populated at runtime via constructed stylesheets (NOT in the capture); however, every color that matters on this page is also present as a **resolved inline `lch()` value** (listed below), so the page can be rebuilt exactly.

---

## 1. APP FRAME GEOMETRY

```
<html class="dark" lang="en-GB" data-sw-cache="true"
      style="--bg-color: lch(2.595% 0.4 272 / 1); --bg-sidebar-color: lch(2.595% 0.4 272 / 1);
             --bg-base-color: lch(5.52% 0.4 272); --bg-border-color: lch(14.16% 1.48 272 / 1);
             --agent-toolbar-height: 28px; --scrollbar-width: 0px;">
<body class="content-loaded is-bootstrapped loaded bootstrap-fade-complete">
```

Overall structure (row of sidebar + app column; app column = [content column + bottom agent toolbar]):

```
#root
└─ #mainLayoutContainer  (display:flex; width/height 100%; overflow:clip; padding env(safe-area insets);
                          transition height/min-height .2s ease-out; style --x-l1z0du:100%; --x-2164qk:100%)
   ├─ SIDEBAR
   │   ├─ ghost spacer div            style="width: 244px"  (in-flow placeholder, height:100%)
   │   └─ fixed sidebar               style="width: 244px; left: 0px; top: 0px; bottom: 0px"
   │        position:fixed; z-index:96; max-width: min(100vw - 40px, 330px); will-change:transform
   └─ APP COLUMN  (flex column; flex:1; min-height:0)
       ├─ CONTENT COLUMN (flex column, flex:1)
       │   └─ <main>  … header (57px) + chat area …
       └─ BOTTOM AGENT TOOLBAR wrapper  style="height: 28px"  (flex-shrink:0)
```

Exact numbers:
- **Sidebar width: 244px** (inline; persisted via `splashScreenConfig` in localStorage/sessionStorage — the boot script re-applies `--sidebar-width` before React loads). Max 330px (`max-width: min(100vw - 40px, 330px)`). `--sidebar-width` fallback in css: 244px.
- **Sidebar resize handle**: absolutely positioned strip, `width: 7px; cursor: col-resize; z-index: 200; top:0; bottom:0; right:0` plus a hover highlight bar `right: -5px; top: 14px; bottom: 40px` painted with `--x-xha92p: linear-gradient(to bottom, lch(100% 0 272 / 0) 0%, lch(100% 0 272 / 0.5) 15%, lch(100% 0 272 / 0.65) 50%, lch(100% 0 272 / 0.5) 85%, lch(100% 0 272 / 0) 100%)` (1px wide gradient line, height:1px token `sx-jm9jq1`... actual visible bar is the gradient div).
- **Header height: 57px** — `min-height: calc(var(--header-height, var(--sx-8q2ft0)) + var(--sx-1ele6il))` where `--sx-8q2ft0: 57px` and `--sx-1ele6il` is the hairline border width token (runtime; 1px @1x). Header horizontal padding: `max(8px, var(--scrollbar-width))` right, `8px` left (`--x-i1iptc: 8px; --x-1opngqg: 8px`). Header bottom border: `border-bottom: var(--sx-1ele6il) solid var(--sx-15wwovl)` — but on this page `border-bottom-style: none` wins (sx-1sy0etr), i.e. **no header divider on the agent page**.
- **Agent toolbar (bottom strip): 28px** total (`--agent-toolbar-height: 28px`): wrapper `height:28px`, inner bar `height:28px; padding-top:4px; margin-top:-4px→0; border-top: var(--sx-1ele6il) solid var(--sx-1o1lnwn); background: var(--bg-color); z-index: 97 (calc(96+1))`; an absolute inner row `height:32px; padding-top:2px; padding-right:8px` overlays it.
- **Content padding**: chat area outer `padding-inline: 24px`; centered chat column `max-width: 712px; width:100%; gap:16px; margin-bottom: 8vh`.
- **Sidebar scroll area**: `padding-left/right: 12px` (`--x-paddingRight: 12px`), `padding-top: 26px`, `scrollbar-gutter: stable`, `overflow-y: auto`, with a sticky top fade: `position: sticky; top:-26px; height:26px; margin-top:-39px; background-image: linear-gradient(to bottom, var(--sx-1ubxoo9), transparent)` driven by scroll-timeline: `animation-timeline: --sidebar-content-scroll; animation-range: 0px 26px`.
- **Sidebar top bar**: `--x-height: 44px; --x-marginTop: 8px` (44px tall row, 8px top margin, padding-inline 12px). It is the Electron drag region (`_draggableRegion_b2qal_1` → `-webkit-app-region: drag`).
- z-index scale seen: sidebar/main chrome 96, agent toolbar 97, resize handle 200, agent panel anchor 250, toast section 581 (`calc(580+1)`).

## 2. FULL DOM OUTLINE (semantic tree)

```
body.content-loaded.is-bootstrapped.loaded.bootstrap-fade-complete
├─ <script> (Electron UA detection)
├─ #root
│  ├─ 3 hidden SVG sprite containers (aria-hidden, 0×0) — data-sprite-set="Base" | "Brands" | "Decorative"
│  ├─ div.theme-provider-30df9d…  (display:contents — app ThemeProvider)
│  │  ├─ <audio aria-hidden class="visually-hidden"> (notification sound host, no src yet)
│  │  ├─ div[tabindex=-1][data-scroll-container=true] (height:0/overflow scroll — scrollbar-width measurement el)
│  │  ├─ <a href="#skip-nav">Skip to content</a> (visually hidden skip link)
│  │  ├─ #mainLayoutContainer
│  │  │  ├─ theme-provider-b0573d… (sidebar theme scope)
│  │  │  │  └─ SIDEBAR
│  │  │  │     ├─ spacer (width:244px)
│  │  │  │     └─ fixed panel (width:244px; left/top/bottom:0)
│  │  │  │        └─ <nav> (flex column, height:100%)
│  │  │  │           ├─ top bar (44px, drag region, padding-inline 12px)
│  │  │  │           │  ├─ button[aria-haspopup=menu][aria-label="Synquic Workspace Menu"]
│  │  │  │           │  │  ├─ avatar 24×24 slot → colored square "SY" (bg lch(70% 60 350/1), font 11px, #fff, radius 8px)
│  │  │  │           │  │  ├─ span "Synquic"  └─ chevron-down svg 13×9
│  │  │  │           │  ├─ (flex spacer)
│  │  │  │           │  ├─ button[aria-label="Search workspace"] (28×28 round icon button)
│  │  │  │           │  └─ div[data-contextual-menu] → button[aria-label="Create new issue"] (28×28; icon white lch(100% 0 272/1))
│  │  │  │           ├─ scroll area [tabindex=-1][data-scroll-container=true] (padding 26px top / 12px sides)
│  │  │  │           │  ├─ sticky scroll fade (26px)
│  │  │  │           │  ├─ TOP NAV LIST (dnd-kit sortable; each item div[role=button][aria-roledescription=sortable])
│  │  │  │           │  │  ├─ a[href=/synquic-labs/inbox][data-active=false][draggable=true]      Inbox
│  │  │  │           │  │  ├─ a[href=/synquic-labs/my-issues/assigned][data-active=false]         My issues
│  │  │  │           │  │  ├─ a[href=/synquic-labs/agent][data-active=true]                       Agent   ← ACTIVE
│  │  │  │           │  │  └─ hidden slot [data-sidebar-link-placeholder="drafts"] + item[data-visible-sidebar-item=false]
│  │  │  │           │  ├─ SECTION "Workspace" (button[data-sidebar-section-type=header][aria-expanded=true][aria-controls=sidebarWorkspace] + chevron)
│  │  │  │           │  │  ├─ a /synquic-labs/projects/all   Projects (sprite #Project)
│  │  │  │           │  │  ├─ a /synquic-labs/views/issues   Views
│  │  │  │           │  │  ├─ 2 hidden items (data-visible-sidebar-item=false — Members/Labels-type links not shown)
│  │  │  │           │  │  ├─ a /synquic-labs/loops          Loops
│  │  │  │           │  │  ├─ 1 hidden item
│  │  │  │           │  │  └─ div[role=button][aria-label="Show more links"]  "More" (ellipsis icon)
│  │  │  │           │  ├─ SECTION "Your teams" (aria-controls=sidebarMyTeams, expanded; + button[aria-label="Join a team"])
│  │  │  │           │  │  └─ ul#teams-boundary-container (container height 550px; overflow-y:clip; dnd-kit sortable list)
│  │  │  │           │  │     ├─ li Trendzo (#00a0ff Team icon)  aria-expanded=true → team-{uuid} subtree:
│  │  │  │           │  │     │   Home /team/TRENDZO/overview · Issues /team/TRENDZO/all · Projects /team/TRENDZO/projects/all · Views /team/TRENDZO/views/issues
│  │  │  │           │  │     ├─ li PGME (#008fff Feather icon) expanded → overview/all/projects/views under /team/PGME/
│  │  │  │           │  │     ├─ li Shrujan (#00aa00 Team icon) collapsed (height:0; opacity:0; aria-hidden subtree)
│  │  │  │           │  │     ├─ li Icon (#f85911 Chip icon) collapsed
│  │  │  │           │  │     ├─ li Trikaal (#789c00 Europe icon) collapsed
│  │  │  │           │  │     ├─ li Tiffsy (#d67600 Radar icon) expanded → /team/TIF/{overview,all,projects/all,views/issues}
│  │  │  │           │  │     └─ li Homingo (#00b187 Home icon) collapsed
│  │  │  │           │  │     (each li: role=button, tabindex=-1, aria-roledescription="sortable", data-draggable-id={team uuid},
│  │  │  │           │  │      style --x---indent-offset:0px; --x---indent-current:19px; row = disclosure button + hover
│  │  │  │           │  │      "Team menu" ellipsis icon button [data-menu-open=false])
│  │  │  │           │  └─ div.suspenseFadeIn (flex-grow:1; "Try"-section lazy area, contains 34px placeholder)
│  │  │  │           ├─ theme-provider → floating bottom-left pill (absolute bottom:0 left:0 right:0; padding:10px; z-index:10)
│  │  │  │           │  └─ rounded card (bg var(--sx-1ubxoo9); ring box-shadow 0 0 0 1px) → button[aria-label="Open Help menu"][aria-haspopup=menu] (#QuestionMark icon)
│  │  │  │           └─ resize-hover gradient bar (right:-5px; top:14px; bottom:40px)
│  │  │  ├─ APP COLUMN (flex column)
│  │  │  │  ├─ CONTENT COLUMN
│  │  │  │  │  └─ <main> (flex column; isolation:isolate)
│  │  │  │  │     ├─ #skip-nav (target)
│  │  │  │  │     ├─ content panel [data-loading-caret=true][tabindex=-1] (bg gradient layer beneath:
│  │  │  │  │     │    absolute inset-0 z-2 background-image linear-gradient(180deg, var(--sx-1ubxoo9) 0%, var(--sx-1m4y240) 100%))
│  │  │  │  │     │  └─ page column (flex column; width/height 100%)
│  │  │  │  │     │     ├─ header wrapper (z-index: 96)
│  │  │  │  │     │     │  └─ <header> (min-height 57px+hairline; bg var(--header-color); NO bottom border here)
│  │  │  │  │     │     │     └─ title row (_title_4txf6_20, drag region disabled children)
│  │  │  │  │     │     │        └─ button[aria-label="Switch agent chat"]
│  │  │  │  │     │     │           ├─ <h2>New chat</h2> (13px / 500)
│  │  │  │  │     │     │           └─ chevron-down 13×9 (lch(61.803% 1.2 272/1))
│  │  │  │  │     │     └─ CHAT AREA (flex; centered; flex-grow:1; padding-inline:24px)
│  │  │  │  │     │        └─ column (max-width:712px; gap:16px; margin-bottom:8vh; align-items:center)
│  │  │  │  │     │           ├─ spacer/header slot (height:34px; z-index:1; gap:8px; padding-bottom:8px) [empty on new chat]
│  │  │  │  │     │           └─ input region (relative; flex column; width:100%)
│  │  │  │  │     │              ├─ LOGO WATERMARK (aria-hidden; absolute; top:-168px; left:50%;
│  │  │  │  │     │              │   translate(-50%,-40px); width min(336px,100%); aspect-ratio 1; z-index:0;
│  │  │  │  │     │              │   pointer-events:none; mask-image linear-gradient(#000 0%, transparent 60%))
│  │  │  │  │     │              │   └─ svg 336×336 — Linear logo drawn as 8 outline paths,
│  │  │  │  │     │              │        stroke lch(9.84% 1.48 272 / 1), stroke-width 0.5, fill transparent,
│  │  │  │  │     │              │        vector-effect="non-scaling-stroke"
│  │  │  │  │     │              └─ theme-provider-33cddd… → CHAT INPUT BOX (see §6)
│  │  │  │  │     ├─ right-edge hidden panel resize strip (absolute; width:7px; col-resize; z-index:200)
│  │  │  │  │     └─ #portalLayoutRoot (right-side peek/split portal mount)
│  │  │  │  └─ BOTTOM AGENT TOOLBAR (height:28px)  (see §6)
│  │  │  ├─ div (fixed; z-index 581) — toast/portal anchor
│  │  │  └─ <section aria-label="Notifications alt+T" tabindex=-1 aria-live=polite aria-relevant="additions text"> — toast viewport (sonner)
│  │  └─ <span role=status aria-live=polite aria-atomic=true> (visually hidden announcer)
├─ #loading (display:none — splash: #appBorders > #loading-content > #preloader (#preloaderContent > svg.bkg 64×64 + svg#logo 32×32) + #loadingText "Loading…")
├─ 4 inline <script>: CLIENT_ENV / SW_HASH / loading-error watchdog / __RELEASE_INFO
├─ 10 empty div.theme-provider-b0573d48… (display:contents) — portal mount points (menus, dialogs, popovers)
└─ 2 trailing portal roots: div > theme-provider-30df9d… > div.sx-jp7ctv(display:contents) ; div > theme-provider-30df9d… > theme-provider-33cdddc3…
```

## 3. VISIBLE TEXT / UI CHROME LABELS

Visible text nodes, in order:
- "Skip to content" (visually hidden until focus)
- Sidebar: `SY` (avatar monogram), `Synquic`, `Inbox`, `My issues`, `Agent`, `Workspace` (section header), `Projects`, `Views`, `Loops`, `More`, `Your teams` (section header), `Trendzo`, `PGME`, `Shrujan`, `Icon`, `Trikaal`, `Tiffsy`, `Homingo`; expanded team sublinks: `Home`, `Issues`, `Projects`, `Views` (×3 teams)
- Header: `New chat`
- Input toolbar: `Skills`
- Bottom toolbar: `Agent`
- Splash: `Loading…`

aria-labels (all of them, exact):
`Synquic Workspace Menu`, `Search workspace`, `Create new issue`, `Show more links`, `Join a team`, `Team menu` (×7), `Open Help menu`, `Switch agent chat`, `Send a message to Linear AI` (the editor textbox), `Skills`, `Attach images, files, or videos`, `Submit comment`, `Agent`, `Chat history`, `Notifications alt+T` (toast section). One empty aria-label on the create-issue tooltip wrapper.

title attributes: team names only (`Trendzo`, `PGME`, `Shrujan`, `Icon`, `Trikaal`, `Tiffsy`, `Homingo`).

Placeholder: ProseMirror empty-doc paragraph `p.text-node.editor-placeholder[data-empty-text="Ask Linear…"]` — rendered via CSS `content: attr(data-empty-text)`, color `--editor-placeholder-color: lch(39.452% 1.425 272 / 1)`.

Empty states: none other (new chat = watermark + input only; no suggestion chips, no greeting text in DOM).

## 4. ROUTE MAP

Workspace slug: **`synquic-labs`**. All `<a href>` values:

| Route pattern | Instances |
|---|---|
| `/:ws/inbox` | `/synquic-labs/inbox` |
| `/:ws/my-issues/assigned` | `/synquic-labs/my-issues/assigned` |
| `/:ws/agent` | `/synquic-labs/agent` (data-active=true — current page) |
| `/:ws/projects/all` | `/synquic-labs/projects/all` |
| `/:ws/views/issues` | `/synquic-labs/views/issues` |
| `/:ws/loops` | `/synquic-labs/loops` |
| `/:ws/team/:KEY/overview` | TRENDZO, PGME, TIF |
| `/:ws/team/:KEY/all` | TRENDZO, PGME, TIF |
| `/:ws/team/:KEY/projects/all` | TRENDZO, PGME, TIF |
| `/:ws/team/:KEY/views/issues` | TRENDZO, PGME, TIF |
| other | `#skip-nav`; `mailto:support@linear.app` (in loading-error script); `'+location.href+'` (script template) |

Team keys visible: `TRENDZO`, `PGME`, `TIF` (collapsed teams' keys not in DOM). No settings/issue routes on this page.

## 5. KEYBOARD SHORTCUTS IN DOM

- `aria-keyshortcuts`: none on this page. `<kbd>`: none.
- Only shortcut text: toast region `aria-label="Notifications alt+T"` (⌥T focuses notifications — sonner default hotkey).
- Tooltips (which normally carry shortcut hints) render into portals on hover, so none captured statically.

## 6. PAGE-SPECIFIC COMPONENT ANATOMY (Agent chat, new-chat state)

### 6a. Header
- `<header>`: flex column; min-height `calc(57px + hairline)`; `gap:12px`; `background-color: var(--header-color)`; padding-left/right 8px (via `--x-i1iptc`/`--x-d23hjn: max(8px, scrollbar-width)`); bottom border suppressed. Inner title row min-height 57px, `gap: var(--x-egurc0)=4px / --x-cpl9g6:2px`.
- Single control: `button[aria-label="Switch agent chat"]` — transparent, radius 9999px pill, height 28px, font-size .75rem token but its `<h2>` is `.8125rem/500`, `color: var(--sx-3zwjav)` (primary text), padding-left 8px; content = `<h2>New chat</h2>` + chevron-down svg 13×9 fill `lch(61.803% 1.2 272 / 1)`. Has `_menuOpenBg_ekx18_56 _menuOpenColor…` classes (bg swap when its dropdown opens).

### 6b. Chat input box (the centerpiece)
Container (theme-provider-33cdddc3 scope):
- `display:flex; flex-direction:row→column stack inside; width:100%; border-radius: 10px !important; padding: 12px; cursor: text; position:relative; border-width:0;`
- `background-color: var(--x-backgroundColor)` = **`lch(7.32% 0.85 272 / 1)`** (inline)
- `box-shadow: var(--sx-10lzhmx)` (runtime token; elevated-card shadow) and `border-color: var(--sx-15wwovl)`
- inline gradient tokens (used for animated border/glow states): `--x-1xcrk1r: linear-gradient(to bottom, lch(17.873% 1.93 272 / 1), lch(9.84% 1.48 272 / 1)); --x-1ce6411: linear-gradient(to bottom, lch(13.553% 1.93 272 / 1), lch(9.84% 1.48 272 / 1))`

Inside, a column with two children:

1) **Editor scroll area**: `overflow-y:auto; overflow-x:hidden; overscroll-behavior:contain; padding-block:2px; padding-inline:6px; flex-basis:max-content;`
   `min-height: calc(var(--editor-font-size) * var(--editor-line-height) * 2)` → 15px × 1.6 × 2 = **48px**
   `max-height: min(calc(--editor-font-size * --editor-line-height * 12), 60vh)` → **min(288px, 60vh)**
   Sets `--editor-block-spacing: .8rem; --editor-font-size: .9375rem` (15px; root `--editor-line-height: 1.6`).
   - Editor wrap (`_sharedEditorRoot_r72r4_1 _sharedEditor_cbzar_1`): `user-select:text; font-weight:450; font-family: var(--sx-1ipkkxf)` (Inter Variable stack); `font-size: var(--editor-font-size); line-height: var(--editor-line-height); font-feature-settings:"calt"; color: var(--editor-text-color)`.
     Inline editor tokens: `--editor-active-selection-background / --editor-selection-bg-active: lch(47.918% 59.303 288.421 / 0.4)`; `--editor-selection-bg-inactive: lch(63.304% 1.425 272 / 0.2)`; `--editor-placeholder-color: lch(39.452% 1.425 272 / 1)`; `--editor-autocomplete-input-background/border: rgba(255,255,255,0.035)`; `--editor-inline-code-background: rgba(255,255,255,0.075)`; `--editor-comment-overlay: lch(23.039% 20.316 83.231 / 1)`, active `lch(33.366% 34.748 84.096 / 1)`; diff greens `lch(67.2% 64.37 141.95 / .4/.3)`, reds `lch(65.2% 73 29 / .4)`; **agent highlight tokens**: `--x---agent-highlight-active: lch(87.2% 70 267 / 0.18)`, `--x---agent-highlight-previous: lch(87.2% 70 267 / 0.08)`.
   - `div.ProseMirror.editor[contenteditable=true][spellcheck=true][role=textbox][aria-multiline=true][aria-readonly=false][aria-label="Send a message to Linear AI"][translate=no]` — `white-space: pre-wrap; cursor:text`.
     Content when empty: `<p class="text-node editor-placeholder" data-empty-text="Ask Linear…" aria-hidden="true"><br class="ProseMirror-trailingBreak"></p>`; placeholder painted by `p.editor-placeholder:before { content: attr(data-empty-text); color: var(--editor-placeholder-color); float:left; height:0; pointer-events:none }`.
   - Agent change-gutter overlays: `div[data-testid="agent-change-gutter-overlay"]` (absolute inset-0, hidden, aria-hidden) containing `div[data-testid="agent-change-gutter-layer"]` positioned `left: calc((28px − 20px/2) × −1)` (uses `--editor-block-menu-offset: 28px`, `--editor-block-menu-size: 20px`).

2) **Toolbar row**: `display:flex; flex-direction:row; align-items:flex-end; justify-content:space-between; gap:8px; width:100%; padding:0`.
   - Left: **Skills button** — `button[type=button][aria-label="Skills"][aria-haspopup="menu"]`: pill radius 9999px, height 24px, min-width 24px, padding-left 4px / right 6px, font-size .75rem (11-12px), transparent bg, `--icon-replacement-color: currentColor`. Content: sparkle/skills icon 14×14 (color `lch(63.304% 1.425 272 / 1)`) + text `Skills` + chevron-down 13×9. Wrapped in `_tooltipTriggerContent_1et26_1` div with `data-menu-open="false"` and `hide-during-bootstrap`.
   - Right group (`gap:8px`, align center):
     - **Attach button** — `button[aria-label="Attach images, files, or videos"]`, 24×24 pill, paperclip icon 16×16 (`lch(63.304% 1.425 272 / 1)`).
     - Hidden `<input type="file" multiple class="sx-1s85apg (display:none)">` with exact accept list: `image/*,video/*,text/*,application/json,application/xml,application/javascript,application/x-yaml,application/yaml,application/pdf,application/rtf,application/vnd.oasis.opendocument.text,application/msword,application/vnd.apple.keynote,application/vnd.apple.pages,application/vnd.ms-powerpoint,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,.md,.markdown,.mdx,.csv`
     - **Send button** — `button[type=submit][aria-label="Submit comment"]`: 24×24, radius 9999px, `background-color: var(--sx-hfmm6c)` (disabled/idle bg token), `background-clip: padding-box`, ring shadows `--btn-overlay-shadow: 0 0 0 hairline var(--sx-1jmjcvw), var(--sx-10lzhmx)`, inline hit-slop `--x-d62und/-jnb6vr/-1glzw6q/-s3vhh9: -6px` (expanded click target), up-arrow/send icon 16×16 `lch(63.304% 1.425 272 / 1)`.

### 6c. Logo watermark behind input
`aria-hidden` div: `position:absolute; top:-168px; left:50%; transform: translate(-50%, -40px); width: min(336px, 100%); aspect-ratio: 1; z-index:0; pointer-events:none; mask-image: linear-gradient(#000 0%, transparent 60%)`. SVG `336×336 viewBox="0 0 336 336"`, `overflow:visible`: the Linear mark drawn as 8 concentric arc/stripe **outline** paths, `stroke="lch(9.84% 1.48 272 / 1)" stroke-width="0.5" fill="transparent" vector-effect="non-scaling-stroke"` — a very faint line-art rendition fading downward (only top ~60% visible above/behind the input box).

### 6d. Bottom agent toolbar (Linear-specific chrome)
- Wrapper `height:28px` at bottom of the app column; bar: `background: var(--bg-color); border-top: hairline solid var(--sx-1o1lnwn); padding-top:4px; z-index:97`.
- Inner absolute row `height:32px; padding-top:2px; padding-right:8px` → `div[data-contextual-menu]` → row `justify-content:flex-end; gap:6px; padding-left: var(--x-paddingLeft)=0px` with `div[data-agent-toolbar-bounds="true"]`.
- Contents (left→right): flex spacer; **anchor** `div[data-agent-panel-anchor="true"]` (`position:absolute; bottom:100%; width:400px; margin-bottom:2px; z-index:250; right:-8px; --agent-item-min-width:100%`) — mount point for the agent panel that pops up above the toolbar; **Agent button** (`aria-label="Agent"`, pill, height 28px→content 24px, padding-left 10px/right 12px, agent glyph 14×14 + text `Agent` 11px `.75rem`, icon `lch(60.621% 1.2 272 / 1)`); **Chat history button** (`aria-label="Chat history"`, 28×28 icon pill, clock-history icon 16×16).

### 6e. Sidebar rows (for completeness of this page's chrome)
- Nav link `<a>`: height **28px**, border-radius 8px, margin-block 1px, padding-left 8px / right 9px, font `.8125rem`/500, color `var(--sx-ys2i3t)` (secondary text; label span sets `--x-4xs81a: var(--sx-ys2i3t)`), icon 16×16 at `lch(60.621% 1.2 272 / 1)` with 6px gap (icon span 14×14 box + margin-right 6px).
- Active state (Agent): adds `background-color: var(--sx-1yxodyc)` (via `--sx-1edn6di` token = selected bg), `color/--icon-replacement-color: var(--sx-ys2i3t)`, `data-active="true"`.
- Section headers ("Workspace", "Your teams"): 11px `.75rem`/500 text color `var(--sx-1dd5bcf)` (tertiary), chevron appears on hover; wrapper `data-sidebar-section-type="header-wrapper"`; hover reveals action button (opacity transition, `.sc2sx-SidebarSectionActionButton-a3f9c2d4`).
- Team row: `<li role=button aria-roledescription=sortable data-draggable-id={uuid}>`, `--x---indent-current: 19px`, disclosure `button[aria-expanded][aria-controls=team-{uuid}]` with 14×14 colored team icon (opacity 0.9), name 13px ellipsized, chevron on hover, right-side "Team menu" ellipsis (24×24, `_iconButton_biby6_8`, svg max-width 12px). Team sublinks 28px rows with 14×14 icons.
- Collapse animation containers: `style="height: auto|0px; overflow: visible|hidden; opacity: 1|0"` + inner `aria-hidden`.

## 7. ICON INVENTORY

Three SVG sprite sheets inlined at top of #root (`<symbol>` defs, referenced by `<use href="#Name">`):
- `data-sprite-set="Base"` (39 symbols): Attachment, Blockquote, Calendar, Checklist, CodeBlock, Comment, CreditCard, CustomView, Favorite, Folder, Home, Inbox, Initiative, IssueStatus{Backlog,Done,Review,Started,Todo,Triage}, Label, Link, Lock, MilestoneNone, MilestoneStatus{Done,Planned,Started}, MyIssues, Project, Refresh, Search, Send, Subscribe, Team.
- `data-sprite-set="Brands"` (8): Anthropic, Claude, Cursor, GitHub, GitLab, Meta, OpenAI, Ramp.
- `data-sprite-set="Decorative"` (~250 emoji-style icons: Ai, AiApp, Rocket, Robot, Radar, Chip, Europe, Feather, Home, QuestionMark, …) used for team/project icon pickers.

Sprite `<use>` references actually on the page: `#Project` ×4 (Projects links), `#Team` ×2 (Trendzo #00a0ff, Shrujan #00aa00), `#Feather` (PGME #008fff), `#Chip` (Icon #f85911), `#Europe` (Trikaal #789c00), `#Radar` (Tiffsy #d67600), `#Home` (Homingo #00b187), `#QuestionMark` (Help pill).

Inline-path (non-sprite) icons: workspace chevron-down 13×9; magnifier (Search workspace) 16×16; pencil/compose (Create new issue) 16×16 white; Inbox 16×16; My issues 16×16; Agent sparkle 16×16 (sidebar, active); section chevrons 16×16 (`color-override`, currentColor); Views 16/14; Loops 16; More-ellipsis 16; team "Home/Issues/Views" 14×14; header title chevron 13×9; Skills sparkle 14×14 + chevron 13×9; paperclip 16×16; send/submit 16×16; Agent toolbar glyph 14×14; Chat history 16×16; Team-menu ellipsis 16×16 (max-width 12px). Standard icon svg classes: `sx-1fwcy2r sx-13jp3wb …` with `style="--x---icon-default-color: lch(60.621% 1.2 272 / 1)"` (sidebar) / `lch(63.304% 1.425 272 / 1)` (input toolbar).

## 8. SCRIPTS / ASSETS / EMBEDDED STATE

- Fonts (`@font-face` in styles.css): **Inter Variable** (weights 100-900, normal+italic, `https://static.linear.app/fonts/InterVariable.woff2?v=4.1`, preloaded in head), **Berkeley Mono** (variable, `Berkeley-Mono-Variable.woff2?v=3.2`), **Linear Thai** (local() stack, unicode-range U+E00-E7F). Body stack: `"Inter Variable","SF Pro Display",-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Oxygen,Ubuntu,Cantarell,"Open Sans","Helvetica Neue","Linear Thai",sans-serif`.
- Entry: single `<script type="module" src="https://static.linear.app/client/assets/html.9O-Enmr6.js">`; **1039 `modulepreload` links** + 964 `preload as="script"` — Rolldown/Vite build (`rolldown-runtime.KFiyTY0I.js`).
- PWA: `pwa.webmanifest`, favicon `favicon-D8hcELd9.svg`, apple-touch-icon, service worker (`data-sw-cache="true"`, `SW_HASH`).
- Vendor chunk names (library fingerprint): react, react-dom, react-router, **mobx / mobx-react-lite / mobx-utils**, **radix-ui**, **prosemirror-*** (12 chunks: model/state/view/transform/commands/history/inputrules/markdown/tables/schema-list/changeset/dropcursor/gapcursor/utils), **yjs / y-prosemirror / y-protocols / lib0**, graphql + graphql-request, **dnd-kit**, react-virtuoso, react-window, react-spring, popperjs, downshift, formik+yup+zod, date-fns, spacetime, lodash, uuid, **sonner** (toasts), **sentry**, highlight/lowlight, markdown-it(+footnote), portabletext+sanity-client (marketing/docs content), algoliasearch+instantsearch+react-instantsearch, emotion, tanstack, idb, fflate, lz-string, simplewebauthn, focus-trap, tabbable, comlink (workers), compromise(+dates) (NLP date parsing), d3-scale-chromatic/d3-shape/**nivo** (charts), leeoniya (uPlot), react-day-picker, react-dropzone, react-avatar-editor, react-medium-image-zoom, re2js, smol-toml, semver, pluralize, html-entities, fast-equals, object-hash, alcalzone, chenglou.
- App chunk names visible: ThemeProvider, stylex, mixins.stylex, Icon.stylex, Text, Popover, ContextualMenuActions, KeyboardHelper, EmojiHelper, WorkerPool, ClientStorage, Tracing, SearchScoreHelper, InitiativesTab, PullRequestsFeatureHelper, PartnerOfferSignup, matchPath, …
- Inline scripts (9): performance.mark("appStart"); splash-screen config bootstrapper (reads `splashScreenConfig` from localStorage/sessionStorage; applies `--bg-color/--bg-sidebar-color/--bg-base-color/--bg-border-color/--sidebar-width/--agent-toolbar-height`, toggles `.dark`); Electron UA detector; DOMContentLoaded splash fade; `CLIENT_ENV = {"COUNTRY_CODE":"IN","SENTRY_DSN":"https://f172c25063bf4e3492ece32b840ab90b@o415358.ingest.us.sentry.io/5337513","SENTRY_TUNNEL":"https://s.linear.app/tunnel"}`; SW_HASH; loading-error watchdog (links `mailto:support@linear.app`); `__RELEASE_INFO`.
- No JSON state blob / no SSR data — the capture is the app shell + first client render; data comes from the local sync store (IndexedDB) + GraphQL.

## 9. STATE CLASSES & ATTRIBUTES

- `data-active="true|false"` — sidebar link selection (Agent = true; active adds bg `var(--sx-1yxodyc)`).
- `data-menu-open="false"` (16×) — on `_tooltipTriggerContent_1et26_1` wrappers; `_menuOpenBg_ekx18_56[data-menu-open=true]` → `background-color: var(--btn-highlight-bg)`.
- `aria-expanded` + `aria-controls` — workspace/team section collapse (`sidebarWorkspace`, `sidebarMyTeams`, `team-{uuid}`); collapsed subtree gets `height:0; overflow:hidden; opacity:0` + `aria-hidden="true"`.
- `aria-haspopup="menu"` (3): workspace menu, help menu, skills menu. No `data-radix-*`/`data-state` present statically (Radix portals unmounted; vendor-radix-ui is in the bundle).
- dnd-kit: `role="button" aria-roledescription="sortable" aria-describedby="DndDescribedBy-N"` on every sortable sidebar item; hidden `#DndDescribedBy-N` + `#DndLiveRegion-N[role=status][aria-live=assertive]` pairs (10 live regions).
- `data-visible-sidebar-item="true|false"` — items hidden by user prefs remain in DOM (false = not rendered visibly); `data-sidebar-link-placeholder="drafts"` reserved slot.
- `data-contextual-menu="true"` (30×) — right-click context-menu binding wrapper.
- Bootstrap phases on `<body>`: `content-loaded is-bootstrapped loaded bootstrap-fade-complete`; `.hide-during-bootstrap` (opacity 0 until `is-bootstrapped`, then 0.2s `bootstrapFadeIn`); `.suspenseFadeIn` (80ms animation).
- `data-scroll-container="true"` (scrollbar-width probe + sidebar scroller), `data-loading-caret="true"` (content panel), `data-agent-toolbar-bounds`, `data-agent-panel-anchor`, `data-testid="agent-change-gutter-overlay|layer"`, `data-sidebar-section-type="header|header-wrapper"`, `data-draggable-id={uuid}`.
- Electron affordances: `_draggableRegion_b2qal_1` / `_draggableRegionDisableChildren_b2qal_7` → `-webkit-app-region: drag/no-drag` (gated on `html:not(.electron-disable-drag)`).

## 10. UNUSUAL / LINEAR-SIGNATURE DETAILS

1. **StyleX atomic CSS** with runtime-injected theme tokens: `:root` declares hundreds of `--sx-*` custom properties EMPTY; actual palettes are adopted at runtime, while page-critical colors are inlined as `lch()` (Linear works natively in LCH color space — every color on the page is `lch(...)`).
2. **Splash-screen config bootstrapping**: pre-React inline script restores sidebar width, agent toolbar height, and bg colors from localStorage so the shell paints with correct geometry before hydration (keys: `splashScreenConfig` in both localStorage and sessionStorage).
3. **Agent toolbar** as a first-class app-frame region: `--agent-toolbar-height: 28px` on `<html>`, a dedicated bottom strip with `data-agent-toolbar-bounds` and a 400px-wide `data-agent-panel-anchor` opening upward (bottom:100%; z-index 250).
4. **Faint Linear-logo line-art watermark** (336×336, stroke 0.5, masked fade) floating behind the chat input — unique to the agent new-chat empty state.
5. **ProseMirror everywhere**: the chat input is the same shared editor (`_sharedEditorRoot_r72r4_1`), with agent-specific extensions: change-gutter overlay layers (`agent-change-gutter-*`) and `--agent-highlight-active/previous` lch tokens for streaming-change highlights. Yjs (y-prosemirror) is bundled for collaborative editing.
6. **Portal architecture**: 10 pre-created empty `theme-provider` divs after `#root` act as portal mounts; `#portalLayoutRoot` inside main for split/peek panes; separate fixed toast anchor + sonner `<section aria-label="Notifications alt+T">`; `<span role=status>` announcer; hidden `<audio>` for notification sounds.
7. **Scroll-timeline CSS**: sidebar top fade animates via `animation-timeline: --sidebar-content-scroll; animation-range: 0px 26px` (modern CSS scroll-driven animation).
8. **Hairline borders** via a runtime token (`--sx-1ele6il`) used for every border-width — enabling 0.5px hairlines on retina.
9. **dnd-kit sortable sidebar** with full a11y scaffolding (describedby + assertive live regions) even for static rendering; sortable teams list constrained by `ul#teams-boundary-container` (inline `height: 550px`).
10. **hide-during-bootstrap / suspenseFadeIn** utility classes orchestrating first-paint (buttons invisible until `body.is-bootstrapped`).
11. Skip-nav accessibility link targeting `#skip-nav` inside `<main>`.
12. Everything interactive is wrapped in `_tooltipTriggerContent_1et26_1` (custom tooltip system, portal-rendered, hence no tooltip text in static DOM).

### Key color table (resolved, dark theme)
| Token/Use | Value |
|---|---|
| App/sidebar bg | `lch(2.595% 0.4 272 / 1)` |
| Base bg (`--bg-base-color`) | `lch(5.52% 0.4 272)` |
| Border (`--bg-border-color`) | `lch(14.16% 1.48 272 / 1)` |
| Chat input bg | `lch(7.32% 0.85 272 / 1)` |
| Watermark stroke / border gradient end | `lch(9.84% 1.48 272 / 1)` |
| Input border gradient tops | `lch(17.873% 1.93 272 / 1)` hover→ `lch(13.553% 1.93 272 / 1)` |
| Sidebar icon color | `lch(60.621% 1.2 272 / 1)` |
| Input-toolbar icon color | `lch(63.304% 1.425 272 / 1)` |
| Header chevron | `lch(61.803% 1.2 272 / 1)` |
| Editor placeholder | `lch(39.452% 1.425 272 / 1)` |
| Selection bg (active) | `lch(47.918% 59.303 288.421 / 0.4)` |
| Agent highlight (active/prev) | `lch(87.2% 70 267 / 0.18)` / `/ 0.08` |
| Workspace avatar bg | `lch(70% 60 350 / 1)` (text `SY`, #fff, 11px) |
| Create-issue icon | `lch(100% 0 272 / 1)` |
| Team icon colors | Trendzo `#00a0ff`, PGME `#008fff`, Shrujan `#00aa00`, Icon `#f85911`, Trikaal `#789c00`, Tiffsy `#d67600`, Homingo `#00b187` (all at opacity .9) |
