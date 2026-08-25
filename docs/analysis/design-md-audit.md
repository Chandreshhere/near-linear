# DESIGN.md Audit — /Users/moon/Documents/linear/docs/DESIGN.md (2436 lines, dated 2026-08-24)

Tier legend: [C]=CAPTURED (HTML/CSS/video evidence), [D]=DOCUMENTED (public Linear docs, verified 2026-08-24), [R]=REIMPLEMENTED (independent design), [C?]/[D?]=tier implied by section context, not explicitly tagged in the doc.

---

## 1. INVENTORY — every exact asserted value

### 1.1 Typography
- [C] `--font-sans: "Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif`
- [C] `--font-mono: "Berkeley Mono", "SFMono Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace`
- [C] `--font-micro: 0.6875rem` (11px)
- [C] `--font-mini: 0.75rem` (12px)
- [C] `--font-small: 0.8125rem` (13px)
- [C] `--font-regular: 0.9375rem` (15px)
- [C] `--font-large: 1.125rem` (18px)
- [C] `--font-title-3: 1.25rem` (20px)
- [C] `--font-title-2: 1.5rem` (24px)
- [C] `--font-title-1: 2.25rem` (36px)
- [C] weights: light 300, normal 450, medium 500, semibold 600, bold 700
- [C] nav labels / compact action text: 12–13px, typically weight 500

### 1.2 Colors
Dark shell ("refresh theme"):
- [C] `--sidebar-bg-dark: #09090a`
- [C] `--surface-base-dark: #121213`
- [C] `--border-dark: #212224`
- [C] `--content-muted-dark: #6b6f76`
- [C] `--content-highlight-dark: #ffffff`
- [C] `--loading-surface-dark: #1c1c1d`
- [C] `--loading-border-dark: #ffffff22`
- [C] `--loading-hover-dark: #252627`
- [C] `--loading-label-dark: #e2e3e5`
- [C] note: live captured root also contained LCH-based runtime variables (values NOT enumerated); hex above = "stable reference baseline"

Light shell:
- [C] `--sidebar-bg-light: #efeff0`
- [C] `--surface-base-light: #f9f9fa`
- [C] `--border-light: #e2e2e2`

### 1.3 Radii
- [C?] `--radius-xs: 2px`, `--radius-sm: 4px`, `--radius-md: 6px`, `--radius-lg: 8px`, `--radius-panel: 12px`, `--radius-pill: 9999px`
- [C] observed usage: sidebar rows ~8px; list/project rows ~8px; app frame 12px; compact chips/buttons full pill; circular icon actions 50%/full pill
- [C] compact settings select radius ~8px

### 1.4 Motion / timing
- [C] `--speed-highlight-in: 0ms`
- [C] `--speed-highlight-out: 150ms`
- [C] `--speed-quick: 100ms`
- [C] `--speed-regular: 250ms`
- [C] `--speed-slow: 350ms`
- [C] `--ease-out-cubic: cubic-bezier(.215,.61,.355,1)`
- [C] `--ease-out-quart: cubic-bezier(.165,.84,.44,1)`
- [C] `--ease-out-expo: cubic-bezier(.19,1,.22,1)`
- [C] `--ease-in-out-cubic: cubic-bezier(.645,.045,.355,1)`
- [C] `--ease-shell: cubic-bezier(.45,0,.55,1)`
- [C] app-frame structural movement: `transition-property: margin; transition-duration: 450ms; timing-function: cubic-bezier(.45,0,.55,1)`
- [C] image/lightbox zoom: `transition: 250ms cubic-bezier(.38,.01,.33,1)`
- [C] header/tab: `transition: opacity 150ms`
- [C] hover highlight in ~0ms (immediate); fade-out ~150ms; ordinary buttons transition background-color/border-color/color/opacity over 150ms ease; some property controls: background 0ms, shadow/depth 150ms; slow structural shell ~450ms
- [R?] hover action-icon reveal: opacity within 80–150ms; hover bg apply 0–50ms
- [R?] menu close fade ~100–150ms; tooltip delay 400–600ms
- [R?] toast enter: opacity + translateY 4–8px over ~150ms; exit opacity ~150ms; copy-confirmation auto-dismiss ~2–3s
- [R?] board post-drop layout settlement ~150–200ms (explicitly NOT 300ms)
- [R?] Peek entrance 100–150ms max; Insights chart rerender transition 150–250ms
- [C] profile onboarding buttons: normal ~150ms button transition

### 1.5 Geometry (at 1914×992 capture viewport; recording is 1914×992 @ 60fps)
- [C] sidebar width: `--sidebar-width: 244px`
- [C] sidebar nav row: x≈12px, width≈205px, height≈28px, vertical rhythm ~29px, radius 8px, text 13px/500
- [C] app frame: left margin tracks 244px sidebar; outer margin ~8px; 1px border; radius 12px
- [C] main frame begins x≈247px (elsewhere "247–255px"); header content left x≈255px
- [C] main header height ~60px; title/actions align at y≈17–18px; action buttons 28px high
- [C] toolbar icon buttons 28×28px
- [C] project list row ~48px high, radius ~8px
- [C] `New Project` button ≈108×28px, 12px/500, pill radius
- [C] profile onboarding buttons 44px high, 13px/500, pill radius
- [C] issue right-rail property controls ~28px tall, ~32px vertical rhythm, text ~13px/500
- [C] `Subscribe` issue button ~32px high
- [C] Settings `Customize` button ~32px high; compact settings select ~30px high
- [C] Agent composer icon actions 24×24px; Agent `Skills` chip ~24px high
- [C] project/issue top tabs ~28px high
- [C] settings sidebar rows ~205×28px, 13px text
- [C?] icon glyphs 14–16px inside 24–32px clickable controls
- [R?] issue list row 28–40px dense depending on view mode
- [R?] popover collision handling: 8px viewport margin
- [R?] breakpoints: >=1280px full; 1024–1279px reduced; <=1023px sidebar collapses to drawer, frame reaches edges

### 1.6 Routes (workspace slug `synquic-labs` observed) — [C] "observed route families"
- `/:workspace/inbox`
- `/:workspace/my-issues/assigned`
- `/:workspace/agent`
- `/:workspace/projects/all`
- `/:workspace/views/issues`
- `/:workspace/loops`
- `/:workspace/team/:teamKey/home` | `/issues` | `/projects` | `/views`
- `/:workspace/issue/:issueIdentifier/:slug?`
- `/:workspace/project/:projectSlug/overview` | `/activity` | `/issues`
- `/:workspace/settings/...`

### 1.7 Keyboard shortcuts (section 22 baseline is untiered in doc; mostly [D?])
Global: `/` workspace search; `Cmd/Ctrl+K` command menu; `C` create issue; `V` full-screen create; `Alt/Option+C` create from template; `Shift+V` display options; `Cmd/Ctrl+B` list/board toggle; `G then I` Inbox; `G then M` My Issues [D]; `O then I` issue search/recent; `O then V` custom views; `O then L` label view selector; `O then F` favorites; `Cmd/Ctrl+J` Agent chat.
List/board: Up/Down or J/K move highlight; `X` select; Shift+Click multi-select; `Cmd/Ctrl+A` select all visible; `Esc` clear selection; `Option/Alt+Up/Down` manual reorder; `Option/Alt+Shift+Up/Down` move to extremes; `T` toggle swimlane collapse; Enter opens issue; `Cmd/Ctrl+K` acts on selection.
Inbox: `U` read/unread; `Alt/Option+U` mark all read; `H` snooze; `Backspace` delete selected; `Shift+Backspace` delete read; `Cmd/Ctrl+F` quick search within Inbox/board/list (temporary filter, Esc clears); Right-click contextual actions.
Issue properties: `A` assignee picker; `I` assign self; `Shift+M` milestone picker; `Cmd/Ctrl+Shift+P` parent issue picker; `Shift+S` subscribe/unsubscribe (label reflects state); `Cmd/Ctrl+Shift+S` manage subscribers (context-aware).
Project: `Cmd/Ctrl+I` toggle project details sidebar.
Insights: `Cmd/Ctrl+Shift+I` toggle Insights panel (plan/permission-gated).
Peek [D]: `Space` toggles Peek on highlighted item; holding Space = momentary preview where reliable; ↑/↓ or J/K keeps moving; Esc closes.
Search prefixes [D?]: `i ` issue, `p ` project, `u ` user, `t ` team, `l ` label, `f ` favorite, `d ` document.
Create modal: Escape empty→close; Escape with draft→draft confirm/save; Cmd/Ctrl+Enter create (if non-conflicting).

### 1.8 Exact captured strings/labels
- [C] Profile onboarding: `Set up your profile`, `Choose how you'll appear in Linear`, `Name & picture`, `Title`, placeholders `Enter your name…` and `Software engineer`, avatar upload, Skip, Continue
- [C] Inbox toolbar: Add filter, Display options, Snooze notification, Delete notification; welcome detail `Welcome to Linear` + onboarding video/resources/help links
- [C] Trendzo issues: tabs `Active`/`Backlog`/`All issues`; group row `In Progress 1`; row `TRENDZO-37 — Research Work`; date far right; top-right view/filter/insights/display controls
- [C] Display Options: Layout segmented `List`/`Board`; Grouping→`Status`; Sub-grouping→`No grouping`; Ordering→`Priority`; `Order completed by recency` toggle; Completed issues→`All`; `Show sub-issues` toggle; List options: `Nested sub-issues`, `Show empty groups`; property chips: ID, Status, Assignee, Priority, Project, Due date, Milestone, Release, Labels, Links, Time in status, Created, Updated
- [C] Board: one `In Progress` column with `TRENDZO-37 Research Work`; `+` create affordance; `Hidden columns` area at right listing Backlog, Todo, Done, Canceled, Duplicate with counts; card shows ID, status/title, overflow affordance, Created date
- [C] Create modal: team chip `TRENDZO`, chevron, `New issue`, expand icon, close X; placeholders `Issue title`, `Add description…`; property chips: status (`In Progress`), Priority, Assignee, Project, Labels, `…`; bottom: attachment button, `Create more` toggle, `Create issue` button; `Save as draft` surfaces once text exists
- [C] Issue detail (TRENDZO-37 Research Work): top-right actions Add to favorites, Issue options, Copy issue URL, Copy issue ID, Copy branch name, Work on issue; property rail: Backlog/status, Set priority, Assign, Labels/Add label, Project/Add to project; footer Subscribe; sections: identifier, title, rich description, sub-issue affordance, Activity, comment composer
- [C] Projects page: title `Projects`, `New project` pill; tab `All projects`; columns Name, Health, Priority, Lead, Target date, Issues, Status; example projects: Driver App, Consumer App, Retailer App, Web Portal, Backend, Acti Pro, Icon Realty, Shrujan, Trikaal, Cleanse Ayurveda
- [C] Driver App overview: tabs Overview/Activity/Issues; sections Properties, Resources, Description, Milestones; actions: Add to favorites, Project actions, Copy page URL, Setup project notifications, Add new view, Open project insights, Close project details, Backlog, No priority, Add document or link…, Write first project update, Milestone, Add dependency, Add members, Teams channel, Add label, Add milestone, See issues, Milestone actions; milestone `M3 · Delivery flow (handover → deliver → proof)`; content describes an Expo/React Native delivery-agent app
- [C] Insights panel: intro with Examples/Documentation links; issue count summary; controls Measure=Issue count, Slice=Status, Segment=Priority; chart; tabular breakdown; expand/settings/more; `Set default for everyone` (permissioned)
- [C] Agent New Chat: `New chat`, `Skills`, attachment button, send button, `Agent`, `Chat history`, compact central composer, ARIA semantics for agent/chat-history switching + message send
- [C] Preferences fields: Default home view→`Linear Agent`; Display names→`Full name`; First day of week→`Monday`; Convert text emoticons into emojis; Send comments on…→`Enter`; App sidebar→`Customize`; Font size→`Default`; theme cards System preference/Light/Dark; Desktop application section
- [C] Settings nav groups — Personal: Preferences, Profile, Notifications, Code & reviews, Security & access, Connected accounts, Agent personalization; Issues: Labels, Templates, SLAs; Projects: Labels, Templates, Statuses, Updates; Features: AI & Agents, Initiatives, Documents, Customer requests, Releases, Pulse, Asks, Emojis, Integrations; Your teams
- [C] Board statuses in recording: Backlog, Todo, In Progress, Done, Canceled, Duplicate
- [C] Sidebar composition: workspace switcher (circular avatar+name), search icon, new-issue icon; primary nav Inbox/My issues/Agent; `Workspace` group Projects/Views/Loops/More; `Your teams` group; team expand Home/Issues/Projects/Views; bottom-left help button; bottom-right agent/status affordance
- [D] My Issues tabs: Assigned, Created, Subscribed, Activity (Assigned focus-grouped, Created creation-ordered, Activity recency feed)
- [D] Login: Continue with Google, Continue with Email, Passkey (WebAuthn; not supported in Linear desktop app), Continue with SAML SSO (config-dependent); email flow = link + one-time code + `Enter code` state
- [C] Evidence package: 7 Woblo zips (new-chat, welcome-to-linear, inbox-welcome-to-linear, trendzo-37-research-work, projects, driver-app-overview, preferences — each index.html + styles.css only) + `Screen Recording 2026-08-24 at 6.59.17 PM.mov` (1914×992 @ 60fps)

### 1.9 Tech signals from captured bundles — [C] (as dependency references)
React, React DOM, React Router, MobX, mobx-react-lite, mobx-utils, GraphQL, graphql-request, IndexedDB (idb), ProseMirror (model/state/view/commands/markdown/tables/history/input rules), Yjs, y-prosemirror, dnd-kit, React Spring, Popper, Radix UI, StyleX, Emotion, React Window/Virtuoso, Sentry, Zod/Yup, date-fns, Sonner-style toasts, WebAuthn helpers. Also [C]: `[data-menu-open=true]` style concept in captured CSS.

### 1.10 Performance targets — [R]
Hover response <50ms perceived; cached issue-detail open <100ms; local property change same animation frame; command/search paint <100ms; 1000+ card boards smooth via virtualization.

### 1.11 Explicitly REIMPLEMENTED models — [R]
`Command` type, `AgentSkill` type, `Loop`/`LoopIssueTrigger`/`LoopScheduleTrigger` types, `SyncAction` table shape, `OverlayState` union, mutation flow pipeline, entity list (~45 entities incl. PendingMutation client-only), roles owner/admin/member/guest, cycles (1–8 weeks, cooldown, rollover, velocity capacity), draft→publish loop editing, run-history record fields, loop permission capability classes (Team access, Web access, Code Intelligence, Coding sessions, externally-synced writes, approved external sources, out-of-trigger-scope changes, MCP connectors) [D for capability classes], toast/draft/peek implementation rules.

---

## 2. STRUCTURE MAP (full section outline)

- Mission (priority order: interaction > layout/type > state-transition > keyboard > local-first speed > polish > backend completeness)
- 1. Evidence package (7 zips + recording; audit-before-code; 4 internal working docs; CAPTURED/DOCUMENTED/REIMPLEMENTED tagging rule)
- 2. Observed frontend technology signals + Required implementation stack (Frontend / Backend / Testing)
- 3. Core design tokens (Typography; Dark shell colors; Light shell colors; Radius; Motion tokens; Other exact motion refs)
- 4. Desktop shell geometry (Sidebar; Main app frame; Main header)
- 5. Microinteraction doctrine (A Hover/highlight; B Pressed/menu-open; C Contextual menus; D Tooltips; E Toasts; F Structural side panels; G Rich editor; H Optimistic property updates)
- 6. Authentication and onboarding (Login page; Multi-account/workspace; First workspace flow; Captured profile onboarding)
- 7. Routing and navigation model
- 8. Inbox (List state; Toolbar; Keyboard; Snooze)
- 9. My Issues
- 10. Team pages
- 11. Issue list — exact interaction model (Highlight vs Select; Keyboard nav; Row visual layout)
- 12. Display Options popover
- 13. Board / Kanban (Board layout; Cards; Drag and drop; Column behavior)
- 14. Issue creation modal (Geometry/composition; Keyboard; Creation semantics; Draft model)
- 15. Issue detail page (Property rail geometry; Copy actions; Inline editing; Activity feed)
- 16. Projects list
- 17. Project creation
- 18. Project overview (Layout; Project update)
- 19. Views
- 20. Filters
- 21. Search and command system (Workspace search; Command menu)
- 21A. Peek / quick preview
- 22. Keyboard shortcut baseline (Global; Selection/list/board; Inbox; Issue properties; Project)
- 23. Insights side panel
- 24. Agent experience (Navigation; Action layer; Skills)
- 25. Loops (Entity model; Entry points; Manual creation; Scope; Permission surface; Draft→publish; Published versions/restore; Run history; Run now/retry; Enable/disable/delete; Execution architecture [R])
- 26. Preferences / Settings (nav groups; captured fields; interface/theme; desktop; row geometry)
- 27. Cycles
- 28. Issue workflows and relations (Status model; Relations)
- 29. Data model (entity list + invariants)
- 30. Local-first sync architecture (evidence boundary; client model; mutation flow; SyncAction table; realtime)
- 31. Rich text and collaborative editing
- 32. Performance requirements
- 33. Accessibility and focus
- 34. Responsive behavior (>=1280 / 1024–1279 / <=1023)
- 35. Component architecture (semantic component tree)
- 36. State machines for transient UI (OverlayState; Escape hierarchy)
- 37. Permission system
- 38. Testing protocol (Visual golden tests: 13 routes/states; Playwright interaction tests: 7 suites)
- 39. Implementation sequence (Phases 1–10)
- 40. Strict visual/behavioral constraints (18 non-negotiables)
- 41. Reference-specific measurements for golden tests (1914×992 list)
- 42. Behavior timeline recovered from recording
- 43. Completion criteria (Visual / Interaction / Product / Data-realtime / Engineering)
- 44. Final instruction to coding agent
- 45. Verification source manifest (18 official doc pages cross-checked 2026-08-24)

---

## 3. INTERACTION MATRIX + VIDEO TIMELINE (condensed, fact-complete)

### 3.1 Interaction matrix (doctrine + per-surface rules)
- **Hover**: bg immediately (0–50ms); contextual action icons fade in 80–150ms; zero layout shift; on leave fade ~150ms. Checkbox: hidden at rest, revealed on left-edge approach without pushing ID/title; selection persists after leave.
- **Highlight vs select are distinct**: hover/keyboard = highlight only; `X`, Shift+Click, checkbox, Cmd/Ctrl+A = select; Esc clears; multi-select shows bottom bulk toolbar operating transactionally/optimistically; context menu acts on whole selection.
- **Menu-open**: trigger stays highlighted while open (`[data-menu-open=true]` in captured CSS); close on outside click + Escape; focus returns to trigger; close fade 100–150ms.
- **Contextual menus**: two modes — central command menu vs pointer-invoked anchored property menu near the edited control (never always center-screen). Popper/Floating UI: 8px viewport margin, bottom-start/right-start preference, flip on collision, stable width during search. Keyboard: arrows, J/K where fitting, Enter applies, Esc closes, type-to-filter, immediate focus highlight.
- **Tooltips**: only for non-obvious icons; 400–600ms delay; fast disappearance; pointer-events none; show shortcut hints.
- **Toasts**: bottom-right stack; new toast inserted adjacent (not covering); compact dark panel, 1px border, ~8px radius, 13px text; enter opacity+translateY 4–8px ~150ms; exit opacity ~150ms; copy confirms auto-dismiss 2–3s; errors persist + retry. No giant colorful cards.
- **Structural panels** (project details, Insights): parent recomputes width; width animates smoothly; content never scales; main list scroll preserved; persistent panels shrink content, popovers float over it.
- **Rich editor**: plain until focused; no browser blue outline; contextual formatting controls; markdown shortcuts; @ mentions; paste rich text; attachments; code blocks; links; checklists; optional slash commands; Yjs collaborative architecture.
- **Optimistic property updates** (status/priority/assignee/project/labels/due date/milestone): 1 update MobX immediately → 2 write to IndexedDB op queue → 3 close menu immediately → 4 reflect chip instantly → 5 async mutation → 6 reconcile on success → 7 field/version conflict merge → 8 restore-only-if-needed on failure + compact retry toast. No full-list spinner.
- **Board DnD**: pointer-down activation constraint (clicks still open cards); slight elevation, no big scale; placeholder in original slot; subtle target-column highlight; drop commits locally first; server after; failure rollback + toast; horizontal edge auto-scroll + vertical in-column auto-scroll; manual ordering preserved; post-drop settle 150–200ms.
- **Board columns**: header = status icon + name + count; `+` creates prefilled issue; `…` menu hides column; hidden groups collect in `Hidden columns` (restorable at right); `T` collapses swimlanes.
- **Create modal**: C/V/Alt+C entry; Escape-empty closes, Escape-with-draft prompts; required team+status+title; prefill from board column/project/team context; two draft layers (ephemeral local composer draft in IndexedDB + explicit server-side saved draft); never lose typed content on navigation.
- **Issue detail**: copy actions → Clipboard API, close menu, lower-right toast, multiple confirmations stack (seen in recording). Title click-to-edit, Enter commits, Escape reverts, optimistic. Description autosave with debounce + version checkpoints + collab. Activity records creation/property changes/comments/attachments/relations/agent actions, no transient composer noise, actor/time grouping.
- **Display Options**: right-anchored popover; toggles don't close menu; dropdowns open anchored submenus; list/board switch instant; persists per-user (optionally workspace/team default with permission); selected chips visibly stronger; chips wrap without widening menu.
- **Insights**: opening keeps filters, shrinks main width, survives list/board toggling; chart rerenders 150–250ms restrained.
- **Peek**: Space toggle / hold-momentary; J/K continues; Esc closes; opening full item keeps list position; no route replacement, no scroll reset, near-instant (≤100–150ms), local-store preload.
- **Escape hierarchy** (ordered): nested submenu → menu search text → popover/dialog → issue selection → navigate back.
- **Shell**: sidebar team expand/collapse animates height/opacity lightly (no bounce, no reload); active row stronger than hover, persists across routes; route transitions never flash white or clear content early.
- **Agent composer**: Enter behavior per user preference; send disabled when empty; optimistic user-message append; in-place progress; scroll pinned only when near bottom; multiple chat tabs with unread/working badges; stop/cancel; retry; context handoff from open issue/project/document; selected-text-to-chat.
- **Command system**: central shortcut registry (no scattered keydown); global shortcuts disabled while typing unless editor-safe; pending-sequence hint for multi-key (G then I); sequence cancel on timeout/Escape; Cmd vs Ctrl labeling per OS; contextual command grouping (issue > selection > project ordering by context).
- **Inbox**: snooze hides until scheduled time (server-persisted, reinserted on wake with unread rules).

### 3.2 Video timeline (Screen Recording 2026-08-24 6.59.17 PM, 1914×992@60fps)
- 0–2s: Agent / New Chat state.
- Early seconds: navigation through empty/history/workspace pages.
- ~7–10s: Projects list; project preview/details behavior.
- ~11–14s: Views and Loops empty states.
- ~15s+: Trendzo team pages.
- ~21s: issue list shows `TRENDZO-37 Research Work`.
- ~22–34s: issue detail; top actions; copy actions; lower-right confirmation toasts stack.
- ~35s: back to `Trendzo > Issues`.
- ~39s: right Insights panel loads while list stays interactive.
- ~42s: Display Options popover opens over right area (List/Board, grouping, ordering, display properties).
- ~44–56s: board layout; `In Progress` column holds Research Work; hidden columns Backlog/Todo/Done/Canceled/Duplicate; Insights stays docked.
- ~57s: Create Issue modal opens from board.
- ~58s: title typing surfaces draft state / `Save as draft`.
- ~59s: composer returns to empty during subsequent interaction.
- ~60–62s: returns to board state.
- Requirement: automated Playwright script reproducing this sequence as behavioral regression.

---

## 4. GAPS / WEAKNESSES

1. **No LCH values.** Doc admits captured root had "LCH-based runtime variables" but enumerates none; only ~12 hex colors total. No accent/brand color, no status colors (Backlog/Todo/In Progress/Done/Canceled icon colors), no priority icon colors, no health colors, no selection-highlight color, no hover-bg exact color, no focus-ring color, no text-primary/secondary dark values beyond muted `#6b6f76`.
2. **No shadow/elevation values** for modals, popovers, toasts, lifted cards ("subtle border/shadow", "slight elevation" only).
3. **Heavy use of approximations**: "~29px rhythm", "~60px header", "28–40px row", "~48px", "x≈247–255px", "roughly 108×28", "0–50ms", "80–150ms", "2–3 seconds", "400–600ms", "100–150ms" — many golden-test numbers are ranged, not exact, and section 41 itself says "initial exact targets, then compare".
4. **Untiered assertions**: section 22 shortcut baseline, radius token scale, breakpoints, tooltip/toast timing, and most microinteraction ranges carry no explicit C/D/R tag despite the doc mandating tagging of every decision.
5. **Video timestamps are approximate** ("roughly 42 seconds", "around 57s", "latter third") with a coarse ~1s granularity and no frame references; early-seconds content is vague ("navigation through empty/history/workspace pages").
6. **Missing exact icons**: no icon inventory, no SVG shapes, no status-icon geometry (circle/progress ring), no priority glyph description.
7. **Missing flows**: no cycles UI capture (admitted); project creation modal fields listed but no captured layout; no captured login screen (all DOCUMENTED); workspace/team setup ordering explicitly REIMPLEMENTED guesswork; no notification-row exact layout/dimensions; no error/empty states except Views/Loops "empty states" named without content; no mobile capture; no light-theme captures beyond 3 color variables; no scrollbar/scroll behavior styling; no context-menu item lists; no command-menu item inventory; no filter-menu item layout; no `More` sidebar item behavior; no bottom-right "agent/status affordance" detail; no team Home layout capture; no Inbox notification-row measurements.
8. **Internal working docs referenced but not included**: `/docs/linear-reference-audit.md`, `linear-token-map.md`, `linear-interaction-matrix.md`, `linear-route-map.md` are prescribed outputs, not present — the spec depends on a still-to-run audit for final exactness.
9. **Spacing scale absent**: no padding/gap token scale (4/8/12/16...), only scattered instances (8px outer margin, 12px sidebar x, 8px popover margin).
10. **Ambiguities**: "Radix primitives only where they do not fight the reference geometry" (judgment call); "CSS Modules, vanilla CSS, or StyleX-like" (stack undecided); "Prisma or Drizzle"; "ProseMirror or Tiptap"; "Redis only if needed"; hold-Space peek "where the platform/event model allows it reliably".
11. **No z-index layer table** despite constraint #8 banning z-index guessing.
12. **No content for `Welcome to Linear` inbox detail** beyond "onboarding video/resources and help links".
13. **Route list marked "include"** — explicitly non-exhaustive (`/settings/...` wildcard, no auth/join/invite routes given).

---

## 5. ACCEPTANCE CRITERIA + IMPLEMENTATION SEQUENCE (condensed)

### Completion criteria (§43)
- **Visual**: shell proportions match reference at 1914×992; dark surface hierarchy matches; dense restrained typography; button/chip/menu geometry matches; rows feel like reference (not generic table); board density matches; create modal structure matches; Display Options + docked Insights match recording.
- **Interaction**: instant hover highlights with clean fade; popovers anchor to triggers; menu-open trigger state retained; keyboard nav everywhere described; list/board toggle keeps filters/selection/display settings; creation drafts survive navigation; optimistic property changes; toast stack works; DnD smooth and reversible on failure.
- **Product**: auth/onboarding; workspace/team structure; issues/projects/milestones/cycles/views; Inbox; persistent settings; rich text; search/command; server-side permission enforcement; Agent/Skills/Loops with real state and action paths (not decorative).
- **Data/realtime**: IndexedDB hydration; pending mutations survive reload; realtime reaches second client; ordered delta reconciliation; offline edit/reconnect without duplicates.
- **Engineering**: no monolithic page components; magic numbers confined to tokens/reference constants; strong TS types; green test suite; stored regression screenshots; no console errors/warnings in core flows.

### Testing protocol (§38)
- Visual golden tests at 1914×992 across 13 states: Agent new chat; profile onboarding; Inbox welcome detail; Projects list; Driver App overview; Research Work issue detail; Preferences; Trendzo Issues list; Display Options open; Insights open; Board with hidden columns; Create modal empty; Create modal with text/draft. Compare sidebar width, header height, row heights, panel boundaries, type size/weight, menu positioning, radii, contrast, spacing; iterate until pixel diffs are small and intentional.
- Playwright suites: issue creation (C→modal→draft restore→optimistic row); board (Cmd/Ctrl+B, DnD, refresh persistence, API-failure rollback+toast); display options (Shift+V, persistence); selection (hover/X/J/K/bulk/Esc); Inbox (G,I / U / H / Backspace); command menu (Cmd/Ctrl+K, contextual actions); offline (disconnect→edit→refresh→reconnect→single sync→checkpoint advance).
- Plus a Playwright script reproducing the §42 video timeline.

### Implementation sequence (§39) — 10 phases, no phase advance with visible mismatches
1. Forensic reconstruction (tokens, route map, interaction map, shell measurements, reference screenshots)
2. Design system + shell (tokens, buttons, chips, menu/popover/dialog, tooltip/toast, sidebar, header, frame, theme)
3. Local data engine (entities, MobX, IndexedDB, domain commands, pending queue, mock sync log)
4. Issues (list, highlight/select, pickers, create modal/fullscreen, detail, comments/activity, display options, board DnD)
5. Projects (list, creation, overview/activity/issues, milestones/resources/updates, details sidebar)
6. Navigation/productivity (command registry, search, filters, saved views, Inbox, My Issues, favorites)
7. Collaboration/realtime (GraphQL, Postgres, sync actions/checkpoints, WebSocket, offline retry, Yjs)
8. Auth/settings (login methods, onboarding, membership, Preferences, permissions)
9. Agent/Skills/Loops (chat, action abstraction, skills, scheduled/event loops, run history)
10. Refinement (screenshot diff loop, timings, keyboard edge cases, a11y, perf, responsive)

### 18 non-negotiable constraints (§40, condensed)
No giant cards/whitespace; no generic Tailwind-dashboard look; no 300–500ms animations on ordinary controls; no full-page spinner post-bootstrap; no network-blocking property changes; no page reload for detail views; no per-view issue duplication; no z-index guessing; no hover layout shifts; no 16px "SaaS" modal radius if reference is tighter; no bright borders everywhere; no browser-default selects; no inaccessible icon buttons; no mouse-only implementation; no board state loss on list toggle; no unconfirmed destructive actions; no optimistic update without failure reconciliation; no hardcoded workspace/team examples in production logic.

### Verification manifest (§45)
Cross-checked 2026-08-24 against official Linear docs pages: Login methods; Security & Access; Inbox; My issues; Search; Display options; Board layout; Select issues; Custom Views; Projects; Project overview; Project milestones; Project status; Linear Agent; Loops; Download Linear/realtime sync & offline; Preferences; Assign and delegate issues. Rule: capture wins for geometry/visual state; document behavioral discrepancies; never invent Linear internals.
