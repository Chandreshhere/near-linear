# Forensic Capture Analysis — Linear.app "Welcome to Linear" (welcome-message route)

Capture: `/scratchpad/captures/welcome-to-linear/welcome-to-linear/index.html` (7,595,359 bytes) + `styles.css` (642,856 bytes), captured 2026-08-24.
Route rendered: `/synquic-labs/welcome-message` — the onboarding "Welcome" inbox-style page. It is an **Inbox-layout split view**: a 400px notification list pane (header "Inbox", one row: "Welcome to Linear") + a reading pane rendering the welcome message in a read-only ProseMirror editor. 7.07MB of the file is a single base64 `data:image/gif` inside the message body; the actual DOM is ~386KB.

Document shell: `<html data-sw-cache="true" lang="en-GB" class="dark" style="--bg-color: lch(2.595% 0.4 272 / 1); --bg-sidebar-color: lch(2.595% 0.4 272 / 1); --bg-base-color: lch(5.52% 0.4 272); --bg-border-color: lch(14.16% 1.48 272 / 1); --agent-toolbar-height: 28px; --scrollbar-width: 0px;">`
`<title>Welcome to Linear</title>`. `<body class="content-loaded is-bootstrapped loaded bootstrap-fade-complete loadingText">`.

---

## 1. APP FRAME GEOMETRY

Overall skeleton (left→right, top→bottom):

```
#root
├─ 3 hidden SVG sprite sheets (icon <symbol> defs; data-sprite-set="Base"/"Brands"/"Decorative")
├─ theme-provider div (display:contents)
│  ├─ <audio aria-hidden> (UI sound player, clip-rect hidden)
│  ├─ scrollbar-measurer div (height:0; width:50px; overflow-y:scroll; tabindex=-1)
│  ├─ <a href="#skip-nav">Skip to content</a> (visually hidden)
│  └─ #mainLayoutContainer (display:flex; row; width/height 100% via --x-l1z0du/--x-2164qk)
│     ├─ SIDEBAR spacer div  style="width: 244px;" (height:100%)
│     ├─ SIDEBAR panel (position:fixed; width:244px; left:0; top:0; bottom:0; z-index:96;
│     │                 max-width:min(100vw - 40px, 330px))
│     ├─ [content column]
│     │  ├─ <main> … split view
│     │  │  ├─ LIST PANE  --x-width:400px; --x-maxWidth:400px  (container-type:inline-size;
│     │  │  │             border-right: var(--sx-1ele6il) solid …)
│     │  │  │  ├─ <header> min-height: calc(var(--header-height, 57px) + border) ("Inbox" title bar)
│     │  │  │  └─ list scroller (padding-top:8px; padding-bottom:max(8px, env(safe-area-max-inset-bottom)))
│     │  │  ├─ col-resize handle: width:7px; cursor:col-resize; position:absolute;
│     │  │  │   right:-5px; top:14px; bottom:40px; gradient hairline
│     │  │  │   (linear-gradient to bottom, lch(100% 0 272 / 0) 0% → /0.5 15% → /0.65 50% → /0.5 85% → /0 100%)
│     │  │  └─ READING PANE (flex:1) — top bar height: var(--header-height, 57px); content scroller
│     │  └─ #portalLayoutRoot (empty portal mount)
│     └─ AGENT TOOLBAR strip: outer div height:28px; inner bar background-color:var(--bg-color);
│        z-index:97; height:28px; padding-top:4px; buttons right-aligned (padding-right:8px)
├─ fixed overlay div z-index:581 (sx-ixxii4 sx-1355n6m)
├─ <section aria-label="Notifications alt+T" aria-live="polite"> (toast/notification live region, empty)
├─ <span role="status" aria-live="polite">Navigated to Welcome to Linear</span> (SR announcer)
├─ #loading splash (display:none; z-index:99999; bg var(--bg-sidebar-color)) with #preloader logo
└─ ~12 empty portal divs (theme-provider …, display:contents) — menu/dialog/tooltip mounts
```

Exact numbers:
- **Sidebar width: 244px** (inline style, restored from `localStorage.splashScreenConfig.sidebarWidth`; also `--sidebar-width` set on `<html>` by boot script). Fixed positioned; a same-width spacer holds layout.
- **Header height: 57px** (`--sx-8q2ft0: 57px`; rule `height: var(--header-height, var(--sx-8q2ft0))`, `min-height: calc(var(--header-height, var(--sx-8q2ft0)) + var(--sx-1ele6il))`). `--header-height: initial` ⇒ default 57px applies to both the list-pane header and the reading-pane top bar.
- **List pane (inbox list): 400px** default (`--x-width: 400px; --x-maxWidth: 400px`), right border, resizable via the 7px col-resize handle.
- **Agent toolbar: 28px** (`--agent-toolbar-height: 28px` on `<html>`; strip height 28px, margin-top -4px→0, padding-top 4px).
- **Sidebar top row (workspace switcher): 44px** (`--x-height: 44px; --x-marginTop: 8px`), is an Electron drag region (`_draggableRegion_b2qal_1` → `-webkit-app-region: drag`).
- **Sidebar bottom help row: 34px** (`--x-height: 34px`).
- Sidebar scroll area: `--x-paddingRight: 12px; scrollbar-gutter: stable`, scroll-driven fade `animation-timeline: --sidebar-content-scroll; animation-range: 0px 26px`.
- Reading-pane content column: `width: calc(100% - 80px); max-width: 860px` (here overridden `max-width: unset`), `margin-inline: auto`; content block `gap: 24px; padding: 24px; margin-top: 32px; border-radius: 8px`.
- List row height: **55px** (inline). Row border-radius 8px, `margin-block: 1px`, `padding-inline: 8px`.
- Top-bar detail header padding: `--x-paddingLeft: 8px; --x-paddingRight: max(8px, var(--scrollbar-width))`; left slot `min-width: 38%`.

## 2. FULL DOM OUTLINE (semantic tree)

```
body.content-loaded.is-bootstrapped.loaded.bootstrap-fade-complete.loadingText
└─ #root
   ├─ div[aria-hidden] > svg > defs > symbol#… ×33   (sprite "Base")
   ├─ div[aria-hidden] > svg > defs > symbol#… ×8    (sprite "Brands")
   ├─ div[aria-hidden] > svg > defs > symbol#… ×264  (sprite "Decorative", 2 svgs)
   └─ div.theme-provider-… (display:contents)
      ├─ audio[aria-hidden]
      ├─ div[tabindex=-1][data-scroll-container] (scrollbar width probe)
      ├─ a[href="#skip-nav"] "Skip to content"
      └─ #mainLayoutContainer
         ├─ (sidebar) div > div.sx-5yr21d[style width:244px]  ← spacer
         ├─ (sidebar) div[position:fixed width:244px]
         │  └─ nav
         │     ├─ div._draggableRegion (top row, 44px)
         │     │  ├─ button[aria-label="Synquic Workspace Menu"][aria-haspopup=menu][aria-expanded=false]
         │     │  │  ├─ div 24×24 avatar (bg lch(70% 60 350 / 1), font-size 11px) "SY"
         │     │  │  ├─ span "Synquic"  └─ svg chevron
         │     │  ├─ button[aria-label="Search workspace"]  (icon 14×14)
         │     │  └─ button[aria-label="Create new issue"] (icon white lch(100% 0 272 / 1))
         │     ├─ scroll area (tabindex=-1)
         │     │  ├─ TOP LINKS (dnd-kit list; each row role="button" aria-describedby="DndDescribedBy-42")
         │     │  │  ├─ a[href=/synquic-labs/inbox] "Inbox"        (icon #Inbox path)
         │     │  │  ├─ a[href=/synquic-labs/my-issues/assigned] "My issues"
         │     │  │  └─ a[href=/synquic-labs/agent] "Agent"
         │     │  ├─ SECTION "Workspace" (button aria-expanded=true; #sidebarWorkspace)
         │     │  │  ├─ a[/synquic-labs/projects/all] "Projects" (use #Project)
         │     │  │  ├─ a[/synquic-labs/views] "Views" (CustomView icon)
         │     │  │  ├─ 2 hidden dnd placeholder rows
         │     │  │  ├─ a[/synquic-labs/loops] "Loops"
         │     │  │  └─ div[role=button aria-label="Show more links"] "More"
         │     │  └─ SECTION "Your teams" (button aria-expanded=true; + button[aria-label="Join a team"]; #sidebarMyTeams; height:710px)
         │     │     └─ ul#teams-boundary-container  (7 <li role="button"> team rows, dnd sortable,
         │     │        --x---indent-offset:0px; --x---indent-current:19px)
         │     │        ├─ li "Trendzo" (svg use #Team fill #00a0ff; aria-expanded=true; button[aria-label="Team menu"])
         │     │        │  └─ #team-cb66f99d-… expanded links:
         │     │        │     Home → /synquic-labs/team/TRENDZO/overview
         │     │        │     Issues → …/team/TRENDZO/all
         │     │        │     Projects → …/team/TRENDZO/projects/all  (use #Project)
         │     │        │     Views → …/team/TRENDZO/views/issues
         │     │        ├─ li "PGME" (#Feather #008fff; expanded, same 4 links, key PGME)
         │     │        ├─ li "Shrujan" (#Team #00aa00; collapsed height:0 opacity:0)
         │     │        ├─ li "Icon" (#Chip #f85911; collapsed)
         │     │        ├─ li "Trikaal" (#Europe #789c00; collapsed)
         │     │        ├─ li "Tiffsy" (#Radar #d67600; expanded, 4 links, key TIF)
         │     │        └─ li "Homingo" (#Home #00b187; collapsed)
         │     ├─ flex-grow spacer + div.suspenseFadeIn (34px bottom row)
         │     ├─ bottom overlay: button[aria-label="Open Help menu"][aria-haspopup=menu] (use #QuestionMark)
         │     └─ col-resize gradient handle (sidebar right edge)
         ├─ main
         │  ├─ #skip-nav
         │  └─ split container
         │     ├─ LIST PANE (400px)
         │     │  ├─ header (57px, draggable region)
         │     │  │  ├─ h2 "Inbox" (13px/500; padding-left:10px)
         │     │  │  └─ right controls: button[aria-label="Add filter"], button[aria-label="Display options"]
         │     │  └─ list scroller > theme-provider
         │     │     ├─ a._rowShared_1bk15_8[href=/synquic-labs/welcome-message]  ← THE row (55px)
         │     │     └─ (empty div — end of list)
         │     ├─ col-resize handle (7px)
         │     └─ READING PANE
         │        ├─ top bar (57px): [left slot min-width:38% empty] [breadcrumb empty]
         │        │  └─ actions gap 6px: button[aria-label="Snooze notification"] (use #ClockOutline),
         │        │                      button[aria-label="Delete notification"]
         │        └─ content scroller (tabindex=0, data-scroll-container, scrollbar-gutter:stable both-edges)
         │           └─ column (max-width 860px→unset; padding 24px; gap 24px; margin-top 32px)
         │              ├─ 44×44 animated Linear-logo SVG tile
         │              ├─ span "Welcome to Linear" (font-size 2.25rem; line-height 2.875rem)
         │              └─ editor root div (all --editor-* tokens inline)
         │                 └─ div.ProseMirror.editor.readonly.display-focus[role=document
         │                    aria-label="Welcome message content" contenteditable=false]
         │                    ├─ p.text-node "Watch an introductory video and access a list of resources below."
         │                    ├─ div.nodeview-video.block-node (video player; see §6)
         │                    ├─ h3.heading-node "Resources"  + ul.list-node (4 li)
         │                    ├─ h3.heading-node "Key features" + ul.list-node (2 li)
         │                    ├─ p.text-node (Linear API / MCP server / Learn more ↗)
         │                    ├─ div.horizontal-rule-node > div.node-container > hr
         │                    ├─ p.text-node (…hit the <code class="inline">?</code>…)
         │                    └─ div.nodeview-image.block-node.ph-no-capture (1920×1080 gif, 7MB data URI)
         ├─ overlay z-200 div + #portalLayoutRoot
         └─ AGENT TOOLBAR (28px): right-aligned
            ├─ button[aria-label="Agent"] (icon + text "Agent"; padding-left:10px right:12px)
            └─ button[aria-label="Chat history"]
```

## 3. VISIBLE TEXT / UI CHROME LABELS

Sidebar (in order): `Skip to content` · workspace "SY" avatar + `Synquic` · `Inbox` · `My issues` · `Agent` · section `Workspace` → `Projects`, `Views`, `Loops`, `More` · section `Your teams` → `Trendzo` (Home, Issues, Projects, Views), `PGME` (Home, Issues, Projects, Views), `Shrujan`, `Icon`, `Trikaal`, `Tiffsy` (Home, Issues, Projects, Views), `Homingo`.

Aria-labels (tooltips): `Synquic Workspace Menu`, `Search workspace`, `Create new issue`, `Show more links`, `Join a team`, `Team menu` (×7), `Open Help menu`, `Add filter`, `Display options`, `Snooze notification`, `Delete notification`, `Welcome message content`, `Media player`, `Play (keyboard shortcut k)`, `Mute (keyboard shortcut m)`, `Seek slider`, `Change playback rate (keyboard shortcut > or <)`, `Download` (×2), `Picture-in-Picture (keyboard shortcut p)`, `Full window (keyboard shortcut f)`, `Volume`, `View image`, `Copy image`, `Copy link`, `Open menu`, `Agent`, `Chat history`, `Notifications alt+T`.

List pane: heading `Inbox`; row title `Welcome to Linear`; snippet `Watch an introductory video and access a list of resources below.`; timestamp `2h` (title="Aug 24, 16:20").

Reading pane: big title `Welcome to Linear`; body text (exact): intro sentence above; `Resources` → `Join a live onboarding session` / "Learn the essentials and see demos of core workflows"; `Join our Slack community` / "Connect with other Linear users and get tips"; `Onboarding videos` / "Everything you need to know to get started with Linear"; `AI workflows` / "Leverage agents for project scoping, bug reports, and day-to-day product work". `Key features` → `AI & Agents` / "Automate your product development processes and operations"; `Integration directory` / "Discover 150+ connections from support tools (Intercom, Zendesk), to design (Figma)". Then: "If what you're looking for doesn't exist yet, be sure to check out the **Linear API** and **MCP server**. **Learn more ↗**". After hr: "If you have any questions hit the `?` in the bottom left and select Contact us."

Video player text: `Elapsed 00:00` / `Duration 03:59`; rate options `0.25× 0.5× 0.75× 1× 1.25× 1.5× 1.75× 2×`.
Screen-reader status: `Navigated to Welcome to Linear`. Splash: `Loading…`. Placeholder attr found: `drafts` (hidden search field). One empty `aria-label=""` on the Create-new-issue tooltip wrapper.

## 4. ROUTE MAP (workspace slug: `synquic-labs`)

In-app hrefs (all 19):
- `/:workspace/inbox` — sidebar Inbox
- `/:workspace/my-issues/assigned` — My issues
- `/:workspace/agent` — Agent
- `/:workspace/projects/all` — workspace Projects
- `/:workspace/views` — workspace Views
- `/:workspace/loops` — Loops
- `/:workspace/welcome-message` — THIS page (list row link)
- `/:workspace/team/:key/overview` (keys: TRENDZO, PGME, TIF)
- `/:workspace/team/:key/all`
- `/:workspace/team/:key/projects/all`
- `/:workspace/team/:key/views/issues`

External hrefs in message body: `https://luma.com/linear?utm_source=welcome-message`, `https://linear.app/join-slack`, `https://www.youtube.com/watch?v=9Q5BoiIFBiY&list=PLP9v0Y4zla9vG7k8e279bSz5hUl0oXlMH`, `https://www.youtube.com/playlist?list=PLP9v0Y4zla9tou7HFmU5pBLP1qUXLB3u4`, `https://linear.app/settings/ai`, `https://linear.app/integrations`, `https://linear.app/developers`, `https://linear.app/docs/mcp`, `https://linear.app/docs`, `mailto:support@linear.app`. Media: `https://uploads.linear.app/{workspaceId}/{a}/{b}` (video source, `crossorigin="use-credentials"`). Sprite refs `#Project`, `#Team` etc.
Route hints from bundle names (945 app chunks): settings pages (AccountProfile/Preferences/Security/Shortcuts/Agents/CodeAndReviews…SettingsPage), Board, ActivityPage, ArchivePage, AgentSessionPage, ApiKeyPage, AsksSettings, AuditLog, Billing…

## 5. KEYBOARD SHORTCUTS IN DOM

- `aria-keyshortcuts="k"` Play/pause video · `"m"` Mute · `"Shift+. Shift+,"` playback rate · `"p"` Picture-in-Picture · `"f"` Full window.
- Section label: `Notifications alt+T` (toggle notifications).
- No `<kbd>` elements; no shortcut hints in sidebar (tooltips are portal-rendered at runtime).

## 6. PAGE-SPECIFIC COMPONENT ANATOMY

### Inbox/notification row (left pane)
`<a tabindex="0" data-first-selected="false" data-last-selected="false" data-first-in-group="true" data-last-in-group="true" data-selected="false" data-active="true" data-list-key="welcome-message#d46322c2-4d0d-4d5b-929d-f282ab62fd53" data-list-row="true" data-keyboard-active="false" data-apply-background="false" class="_rowShared_1bk15_8" href="/synquic-labs/welcome-message" style="height: 55px; --row-applied-bg: transparent; --row-keyboard-border: lch(19.701% 19.952 286.445 / 1); opacity: 1;">`
- `._rowShared_1bk15_8 { isolation:isolate; will-change:transform; contain:layout style; z-index:0; border-radius:8px; display:block; position:relative; overflow:visible }`; `:before { content:""; z-index:-1; border-radius:inherit; background:#0000; position:absolute; inset:0 8px }` (hover/select background inset by 8px); `:focus-visible{outline:none}`.
- Inner: `data-contextual-menu="true"` wrapper → row flex: [32×32 icon tile] [text column] — icon is an inline animated Linear-logo SVG (gradients+filters, ids `*_14744_4732`).
- Text column: title row (13px/.8125rem, weight 500, `--x-4xs81a: currentColor`, ellipsis) + snippet row (12px/.75rem, weight 450, color var(--sx-1dd5bcf) muted) + right-aligned relative timestamp span (min-width:16px, title = absolute date).
- List scroller: `data-restore-scroll-view="inbox-list-0"`, padding-top 8px.

### Reading pane (welcome message document)
- Top bar 57px: left spacer (min-width 38%), empty breadcrumb slot, actions `Snooze notification` (icon #ClockOutline) and `Delete notification`, gap 6px; whole bar is Electron drag region; bottom border `var(--sx-1ele6il) solid var(--sx-15wwovl)`.
- Content column: 44×44 logo tile → title span `font-size: 2.25rem; line-height: 2.875rem` ("Welcome to Linear") → editor.
- Editor root inline style defines the full editor token set (see §10 for values). Editor body: `.ProseMirror.editor.readonly.display-focus` `role="document" contenteditable="false" spellcheck="true" translate="no"`, `padding-left:15px; padding-right:12px`, font `var(--font-regular)` ("Inter Variable" stack), `--editor-font-size` regular = `.9375rem` (15px), h3 = `1.0625rem/1.5rem` weight 600 color `--editor-label-title` (lch(100% 0 272 / 1)).
- Node types present: `p.text-node`, `h3.heading-node`, `ul.list-node > li > p.text-node` (link + `<span contenteditable="false"><br></span>` + description pattern), `div.horizontal-rule-node > div.node-container > hr`, `code.inline`, `div.nodeview-video.block-node.n-{hash}[data-upload-state="finished"][draggable=true]`, `div.nodeview-image.block-node.n-{hash}` (image wrapper has `ph-no-capture`).

### Video player ("Orbiter" media player)
Container: `role="region" aria-label="Media player" tabindex="0"`, `data-orbiter-media-player`, `data-status="paused"`, `data-sound="true"`, `--x---sx-hlrqpp: min(100vw, 3840px)`, aspect-ratio 3840/2160. `<video preload="metadata" width="3840" height="2160" crossorigin="use-credentials">` + 2 identical `<source>` from uploads.linear.app.
Controls bar (bottom overlay): Play btn (k) · Mute (m) · `time[role=timer]` Elapsed 00:00 · seek `div[role=slider aria-label="Seek slider"]` with `data-type="buffered"`/`"played"` range bars driven by `--media-player-range-start/end` and thumb `--media-player-thumb-start` · Duration 03:59 · native `<select>` playback rate (8 options) · Download · PiP (p) · Full window (f). Volume popover: `div[role=slider aria-label="Volume"]` with `data-type="track"/"volume"` bars.

### Image node
Sizer: `max-width: min(1066.67px, 100%); width: 1920px; max-height: 600px; aspect-ratio: 1920 / 1080`. `<img draggable="false" width="1920" height="1080" style="max-width: min(100%, 1066.67px); min-width: calc(120px);" src="data:image/gif;base64,…">` (7,069,854 chars). Hover toolbar (top-right, two groups): `View image`, `Download`, `Copy image`, `Copy link` + separate `Open menu`. Comment outline tokens inline: `--image-comment-outline-color: lch(29.956% 34.674 84.32 / 1); --image-active-comment-outline-color: lch(38.098% 44.632 84.593 / 1)` (approx).

### Agent toolbar (bottom, full width)
28px strip pinned under content: right side `button[aria-label="Agent"]` (sparkle icon 14px + label "Agent", 12px text) and `button[aria-label="Chat history"]`. Attributes `data-agent-toolbar-bounds="true"`, `data-agent-panel-anchor="true"` nearby. `--agent-toolbar-height` participates in splash-screen centering math.

## 7. ICON INVENTORY

Three SVG sprite sheets of `<symbol>`s (total 305), referenced via `<use href="#Name">`; many icons are also inlined as raw `<path>` (same art) rather than `use`.
- **Base set (33)**: Attachment, Blockquote, Calendar, Checklist, CodeBlock, Comment, CreditCard, CustomView, Favorite, Folder, Home, Inbox, Initiative, IssueStatusBacklog/Done/Review/Started/Todo/Triage, Label, Link, Lock, MilestoneNone, MilestoneStatusDone/Planned/Started, MyIssues, Project, Refresh, Search, Send, Subscribe, Team.
- **Brands (8)**: Anthropic, Claude, Cursor, GitHub, GitLab, Meta, OpenAI, Ramp.
- **Decorative (264)**: emoji-style team/project icons (Ai, Airplane, Alarm…, Chip, Europe, Feather, Radar, Rocket, Slack, Notion, Figma, Sentry, Zendesk, Zapier…, incl. `LinearAi` with gradients/masks and `Linear`).
Usage on page: sidebar links (#Inbox/#MyIssues inline paths, use #Project ×4, #Team ×2, #Feather, #Chip, #Europe, #Radar, #Home per team color via `--x-fill`/`--icon-color` overrides + `opacity: .9`, 14×14 box), #QuestionMark (help), #ClockOutline (snooze), chevrons/plus/filter/display icons inlined. Default icon color `lch(60.621% 1.2 272 / 1)` (sidebar) / `lch(61.803% 1.2 272 / 1)` (content pane); active-item icon white `lch(100% 0 272 / 1)`. Icon CSS: `fill: var(--icon-color)`; `--icon-color: var(--icon-replacement-color, var(--icon-default-color))`; sizes `_iconSmall_ekx18_16` 14×14 / `_iconNormal_ekx18_21` 16×16.

## 8. SCRIPTS / ASSETS / EMBEDDED STATE

- Entry: `<script type="module" src="https://static.linear.app/client/assets/html.9O-Enmr6.js">` + ~100 `modulepreload` links (rolldown-runtime, preload-helper, …). Font preload: `https://static.linear.app/fonts/InterVariable.woff2?v=4.1`. PWA manifest `pwa.webmanifest`; SVG favicon; apple-touch-icon.
- **@font-face**: Inter Variable (100–900, normal+italic, InterVariable[-Italic].woff2 v4.1), Berkeley Mono (Berkeley-Mono-Variable.woff2 v3.2), "Linear Thai" (local fallbacks). Stacks: `--font-regular: "Inter Variable","SF Pro Display",-apple-system,…,"Linear Thai",sans-serif`; `--font-monospace: "Berkeley Mono","SFMono Regular",Consolas,…`.
- **84 vendor bundles** (tech fingerprint): react, react-dom, react-router, mobx + mobx-react-lite + mobx-utils, **prosemirror-*** (15 pkgs), **yjs / y-prosemirror / y-protocols / lib0**, radix-ui, dnd-kit, emotion, popperjs, sonner, tanstack, react-virtuoso, react-window, downshift, focus-trap/tabbable, formik+yup+zod, graphql + graphql-request, algoliasearch + instantsearch + react-instantsearch, highlight.js/lowlight, markdown-it(+footnote), date-fns, spacetime, sentry, idb, lz-string, fflate, uuid, semver, pluralize, re2js, simplewebauthn, comlink, compromise(-dates), nivo, d3-scale-chromatic/d3-shape, leeoniya (uPlot), react-day-picker, react-dropzone, react-medium-image-zoom, react-avatar-editor, react-spring, react-use, sanity-client/portabletext, smol-toml, sonner, object-hash, html-entities, hast-util-to-jsx-runtime, chenglou, alcalzone, diff.
- Inline scripts: `performance.mark("appStart")`; splash-screen boot (reads `localStorage.splashScreenConfig` + `sessionStorage` → sets `--bg-color`, `--bg-sidebar-color`, `--bg-base-color`, `--bg-border-color`, `--sidebar-width`, `--agent-toolbar-height`, toggles `html.dark`); Electron detector (adds `html.electron`; `logged-out` class keyed on `localStorage.ApplicationStore`); loaded-class watcher (adds `body.loadingText` after 8s); asset-load-error reporter (Sentry tunnel);
  `CLIENT_ENV = {"COUNTRY_CODE":"IN","SENTRY_DSN":"https://f172c25063bf4e3492ece32b840ab90b@o415358.ingest.us.sentry.io/5337513","SENTRY_TUNNEL":"https://s.linear.app/tunnel"}`; `SW_HASH="5fd8ce2b7c14501c591376529c3a084f31400e59"`; `__RELEASE_INFO = { BUILD_REVISION:"74834", CLIENT_VERSION_HASH:"e101b78e63f74642affe", DEPLOYED_AT:"2026-08-24T13:09:49+0000", SHORT_SHA:"fac8d475486", PR_NUMBER:"87799" }`.
- No JSON state blob is embedded — data hydrates from IndexedDB/GraphQL at runtime.
- CSS architecture: `@layer reset, base, app.base`. Atomic classes `sx-*`/`sc2sx-*` (StyleX-style compiled atoms; ~8010 rules in styles.css) + CSS-module classes `_name_hash_n` + semantic ids. Theme color tokens (`--sx-*` colors) are declared **empty** in CSS and injected at runtime; concrete colors appear in element inline styles.

## 9. STATE CLASSES & ATTRIBUTES

- Row/list state: `data-selected`, `data-active` (this row: selected=false, active=true), `data-keyboard-active`, `data-first/last-selected`, `data-first/last-in-group`, `data-list-key`, `data-list-row`, `data-apply-background`, `data-raise-row`, `--row-applied-bg`, `--row-keyboard-border`.
- Menus: `data-menu-open="false"` on every tooltip/menu trigger wrapper (19×); CSS `[data-menu-open=true]` → `var(--btn-highlight-bg)` / `--btn-highlight-color`. `aria-haspopup="menu"` + `aria-expanded` on workspace menu & help.
- Disclosure: `aria-expanded` on section headers (Workspace=true, Your teams=true) and team rows (expanded teams true); collapsed team panels `style="height: 0px; overflow: hidden; opacity: 0"` + `aria-hidden="true"`.
- dnd-kit signatures: `role="button" aria-describedby="DndDescribedBy-NN"` on draggable rows, hidden `#DndDescribedBy-NN` and `#DndLiveRegion-NN[role=status]` pairs per sortable context, `data-draggable-id={teamUUID}`.
- Sidebar: `data-visible-sidebar-item="true|false"`, `data-sidebar-section-type="header|header-wrapper"`, `data-sidebar-link-placeholder`.
- Media player: `data-status="paused"`, `data-sound`, `data-type="buffered|played|track|volume"`, `--media-player-range-start/end`, `--media-player-thumb-start`.
- Misc: `data-contextual-menu="true"` (31× right-clickable regions), `data-scroll-container`, `data-restore-scroll-view="inbox-list-0"`, `data-upload-state="finished"`, `data-chrome="true"`, `data-focus-trap-active`, `data-lightbox-item-id`, `data-loading-caret`, `data-context-menu-open`, `hide-during-bootstrap` class (8×), `suspenseFadeIn` (80ms fade animation).
- **No** `data-radix-*` / `data-state=` in the static capture — Radix is bundled but portals are empty at rest.
- Boot classes: html `dark|electron|logged-out|electron-disable-drag`; body `loaded / content-loaded / is-bootstrapped / bootstrap-fade-complete / loadingText`.

## 10. LINEAR-SIGNATURE DETAILS & EXACT COLOR TOKENS

- **theme-provider divs**: `class="theme-provider-{40-char sha}" style="display: contents"` wrap every theme scope (3 distinct hashes on page); ~12 empty ones trail `<body>` as portal mounts, plus `#portalLayoutRoot` inside main.
- **Splash system**: `#loading` (absolute, z-index 99999, bg var(--bg-sidebar-color), Inter, font-size .75rem) > `#appBorders` > `#loading-content` (440×64, `left: calc(50% - 220px)`, `margin-left: calc(var(--sidebar-width)/2)`, `margin-top: calc(-32px - var(--agent-toolbar-height)/2)`, fadeIn .4s ease-out 1s both) > `#preloaderContent` 64×64 grid + logo `<svg>` + `#loadingText` "Loading…"; `#loading ::selection { background-color: #7180ff }`.
- **A11y singletons**: `<section aria-label="Notifications alt+T" aria-live="polite" aria-relevant="additions text">` (toast landmark) and `<span role="status" aria-live="polite">Navigated to …</span>`.
- Scrollbar probe div (height:0/width:50px/overflow-y:scroll) feeding `--scrollbar-width`.
- Electron affordances: `_draggableRegion_b2qal_1` / `_draggableRegionDisableChildren_b2qal_7` (`-webkit-app-region: drag`), headers `-webkit-app-region: no-drag` children.
- Resize handles are gradient "hairlines", not solid: 7px hit area, `cursor: col-resize`, gradient stroke; resizer helper classes `_colResizeCursor_lqj5v_1{cursor:col-resize!important}`.
- Editor token map (exact, dark theme, from inline style on editor root):
  `--editor-active-selection-background: lch(47.918% 59.303 288.421 / 0.4)`; `--editor-placeholder-color: lch(36.975% 1.2 272 / 1)`; `--editor-inline-code-background: rgba(255,255,255,0.075)`; `--editor-selection-bg-inactive: lch(61.803% 1.2 272 / 0.2)`; `--editor-comment-overlay: lch(21.633% 23.767 83.803 / 1)`; `--editor-comment-overlay-active: lch(32.568% 37.936 84.425 / 1)`; `--editor-label-title: lch(100% 0 272 / 1)`; `--editor-label-muted: lch(61.803% 1.2 272 / 1)`; `--editor-label-faint: lch(36.975% 1.2 272 / 1)`; `--editor-label-link: lch(57.028% 70 288.421 / 1)`; `--editor-control-primary: lch(47.918% 59.303 288.421)`; `--editor-bg-base: lch(5.52% 0.4 272)`; `--editor-bg-sub: lch(2.595% 0.4 272 / 1)`; `--editor-bg-shade: lch(7.32% 0.85 272 / 1)`; `--editor-bg-focus: lch(13.62% 0.85 272 / 1)`; `--editor-border-solid: lch(16.32% 1.48 272 / 1)`; `--editor-border-solid-hover: lch(20.64% 1.48 272 / 1)`; `--editor-bg-border-thin: lch(14.16% 1.48 272 / 1)`; `--editor-red-text: lch(80% 80 29 / 1)`; `--editor-focus-shadow: 0 0 0 1px lch(47.918% 59.303 288.421)`; diff tokens (`--editor-diff-code-addition-40: lch(67.2% 64.37 141.95 / 0.4)` …); hljs palette `#EC3B40 #EB6E3D #25F8CA #FCE27D #E394DC #2482D8 #00C5F0`; `--editor-hairline: 1px`; agent-highlight `lch(87.2% 70 267 / 0.18)` / `0.08`; todo checkmark as inline SVG data URI.
- App-frame palette (dark): bg/sidebar `lch(2.595% 0.4 272 / 1)`; base `lch(5.52% 0.4 272)`; border `lch(14.16% 1.48 272 / 1)`; icon muted `lch(60.621% 1.2 272 / 1)` / `lch(61.803% 1.2 272 / 1)`; keyboard focus border `lch(19.701% 19.952 286.445 / 1)`; workspace avatar `lch(70% 60 350 / 1)`; accent/primary `lch(47.918% 59.303 288.421)`.
- Typography scale on page: nav/list-title 13px (.8125rem/500); secondary 12px (.75rem/450); editor body 15px (.9375rem, `--editor-line-height` variants 1.4–1.625); h3 17px (1.0625rem/1.5rem/600); page title 36px (2.25rem, lh 2.875rem); header h2 13px/500. Radii: rows/cards 8px, editor blocks 6px, buttons 9999px (pill). Transitions: .15s standard, 50ms header opacity, 80ms suspense fade, 150ms row transform.
- Team icon color overrides via triple custom property set: `--x-fill`, `--x---icon-color`, `--x---icon-default-color` + `color-override` class.
- Image/video nodeviews carry content-hash classes `n-{md5}`; images marked `ph-no-capture` (PostHog session-replay exclusion).
