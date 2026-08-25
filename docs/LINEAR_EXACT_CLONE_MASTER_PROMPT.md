# Linear App Observable Clone — Forensic Master Build Prompt (2026-08-24)

## Mission

Build a production-grade, pixel-faithful reconstruction of the **observable Linear web-app experience as captured on 2026-08-24** using the supplied Linear page captures and screen recording as the primary visual/behavioral evidence. The result must not be a static mockup. It must behave like a real product-management system: authentication, onboarding, workspace/team navigation, issues, projects, list/board views, issue creation and editing, filters, display options, keyboard shortcuts, command menus, notifications/inbox, views, preferences, Linear-Agent-style chat, skills, loops, optimistic updates, offline retry, and realtime synchronization.

Do **not** pretend we have Linear's private source code. We do not. The supplied captures expose rendered DOM/CSS and public client bundle references, which are enough to reconstruct the frontend with high fidelity. Reimplement behavior cleanly in our own source tree instead of copying minified/hashed implementation code.

The implementation priority is:

1. interaction fidelity;
2. layout and typography fidelity;
3. state-transition fidelity;
4. keyboard-first behavior;
5. local-first speed and optimistic updates;
6. visual polish;
7. backend completeness.

The app must feel immediate. Avoid loading spinners for ordinary local mutations. Do not make routine issue updates wait for a network round trip.

---

# 1. Evidence package — inspect before coding

The reference package contains these seven Woblo captures and one screen recording:

- `new-chat.full-page.Woblo.zip`
- `welcome-to-linear.full-page.Woblo.zip`
- `inbox-welcome-to-linear.full-page.Woblo.zip`
- `trendzo-37-research-work.full-page.Woblo.zip`
- `projects.full-page.Woblo.zip`
- `driver-app-overview.full-page.Woblo.zip`
- `preferences.full-page.Woblo.zip`
- `Screen Recording 2026-08-24 at 6.59.17 PM.mov`

Each Woblo ZIP contains only a page folder with:

- `index.html`
- `styles.css`

There is **no existing `design.md` file** in these captures. Create our own design/behavior specification from the evidence.

Before changing application code:

1. Unzip all seven captures into `/reference/linear/<capture-name>/`.
2. Parse every `index.html` for visible labels, ARIA labels, links, route shapes, button labels, semantic hierarchy and asset references.
3. Parse every `styles.css` for variables, dimensions, transitions, radii, font rules and component-specific styles.
4. Extract the screen recording at 1-second intervals and at additional frames around every click/menu transition.
5. Create these internal working files:
   - `/docs/linear-reference-audit.md`
   - `/docs/linear-token-map.md`
   - `/docs/linear-interaction-matrix.md`
   - `/docs/linear-route-map.md`
6. Only after the audit is complete, start implementation.

Every design decision must be tagged internally as one of:

- **CAPTURED** — directly present in supplied HTML/CSS/video;
- **DOCUMENTED** — behavior confirmed by current public Linear documentation;
- **REIMPLEMENTED** — necessary backend/internal behavior that is not exposed and is being implemented independently.

Never label REIMPLEMENTED behavior as an exact internal Linear implementation.

---

# 2. Observed frontend technology signals

The captured HTML references current compiled assets that expose the following technology families. Use these as architecture guidance because they align well with the interaction model we need:

- React
- React DOM
- React Router
- MobX
- `mobx-react-lite`
- `mobx-utils`
- GraphQL
- `graphql-request`
- IndexedDB (`idb`)
- ProseMirror model/state/view/commands/markdown/tables/history/input rules
- Yjs
- `y-prosemirror`
- `dnd-kit`
- React Spring
- Popper
- Radix UI
- StyleX
- Emotion
- React Window / React Virtuoso
- Sentry
- Zod / Yup
- date-fns
- Sonner-style toasts
- WebAuthn client helpers

Use a coherent implementation rather than adding all libraries indiscriminately.

## Required implementation stack

Use:

### Frontend
- React + TypeScript
- Vite SPA unless an existing project already uses Next.js
- React Router
- MobX for normalized observable domain stores
- IndexedDB via Dexie or a thin `idb` wrapper
- GraphQL client with a small typed request layer
- WebSocket channel for realtime synchronization
- ProseMirror or Tiptap backed by ProseMirror for issue descriptions/comments/documents
- Yjs for collaborative rich-text state
- DnD Kit for board/card reordering
- React Spring for spring-based panel/menu transitions where appropriate
- Floating UI or Popper for anchored menus
- Radix primitives only where they do not fight the reference geometry
- CSS Modules, vanilla CSS, or StyleX-like atomic styles; avoid a generic component library theme

### Backend
- Node.js + TypeScript
- GraphQL API
- PostgreSQL
- Prisma or Drizzle
- WebSocket sync gateway
- Redis only if needed for presence, queues or distributed subscriptions
- background job queue for reminders, loops and scheduled work

### Testing
- Vitest
- React Testing Library
- Playwright
- screenshot/golden tests at 1914×992 first

Do not use a generic admin-dashboard template.

---

# 3. Core design tokens recovered from the captures

Create a single token file and make all components consume it.

## Typography

Primary sans stack:

```css
--font-sans: "Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont,
  "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
```

Monospace stack:

```css
--font-mono: "Berkeley Mono", "SFMono Regular", Consolas, "Liberation Mono",
  Menlo, Courier, monospace;
```

Size scale:

```css
--font-micro: 0.6875rem;  /* 11px */
--font-mini: 0.75rem;     /* 12px */
--font-small: 0.8125rem;  /* 13px */
--font-regular: 0.9375rem;/* 15px */
--font-large: 1.125rem;   /* 18px */
--font-title-3: 1.25rem;  /* 20px */
--font-title-2: 1.5rem;   /* 24px */
--font-title-1: 2.25rem;  /* 36px */
```

Weight scale:

```css
--weight-light: 300;
--weight-normal: 450;
--weight-medium: 500;
--weight-semibold: 600;
--weight-bold: 700;
```

Most navigation labels and compact action text are 12–13px, typically weight 500. Do not inflate typography.

## Dark shell colors recovered from the captured refresh theme

```css
--sidebar-bg-dark: #09090a;
--surface-base-dark: #121213;
--border-dark: #212224;
--content-muted-dark: #6b6f76;
--content-highlight-dark: #ffffff;
--loading-surface-dark: #1c1c1d;
--loading-border-dark: #ffffff22;
--loading-hover-dark: #252627;
--loading-label-dark: #e2e3e5;
```

The live captured root also contained LCH-based runtime variables. Preserve an LCH-capable theme layer, but the hex values above are the stable reference baseline.

## Light shell colors

```css
--sidebar-bg-light: #efeff0;
--surface-base-light: #f9f9fa;
--border-light: #e2e2e2;
```

Do not make “dark mode” pure black everywhere. The visual hierarchy comes from very close dark surfaces and subtle borders.

## Radius system

```css
--radius-xs: 2px;
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-panel: 12px;
--radius-pill: 9999px;
```

Observed usage:
- sidebar rows: ~8px;
- list/project rows: ~8px;
- app frame: 12px;
- compact chips/buttons: full pill;
- circular icon actions: 50% / full pill.

## Motion tokens — preserve these

```css
--speed-highlight-in: 0ms;
--speed-highlight-out: 150ms;
--speed-quick: 100ms;
--speed-regular: 250ms;
--speed-slow: 350ms;

--ease-out-cubic: cubic-bezier(.215,.61,.355,1);
--ease-out-quart: cubic-bezier(.165,.84,.44,1);
--ease-out-expo: cubic-bezier(.19,1,.22,1);
--ease-in-out-cubic: cubic-bezier(.645,.045,.355,1);
--ease-shell: cubic-bezier(.45,0,.55,1);
```

Important interaction principle from the CSS:

- highlighted/hovered state often appears **immediately**;
- highlight fade-out commonly lasts **150ms**;
- ordinary buttons commonly transition `background-color`, `border-color`, `color`, `opacity` over **150ms ease**;
- some property controls intentionally change background immediately (`0ms`) while shadow/depth fades over 150ms;
- slow structural shell movement uses ~450ms, not 150ms.

Do not globally use 300ms transitions. Linear feels fast because most transitions are 0–150ms.

## Other exact motion references

App frame structural movement:

```css
transition-property: margin;
transition-duration: 450ms;
transition-timing-function: cubic-bezier(.45,0,.55,1);
```

Image/lightbox zoom reference:

```css
transition: 250ms cubic-bezier(.38,.01,.33,1);
```

Header/tab opacity transitions:

```css
transition: opacity 150ms;
```

Support `prefers-reduced-motion` and remove decorative movement when requested.

---

# 4. Desktop shell geometry

The supplied recording is 1914×992 at 60fps. Treat this as the primary golden-test viewport.

## Sidebar

Default sidebar width:

```css
--sidebar-width: 244px;
```

Captured nav rows at this viewport are approximately:
- x: 12px
- width: 205px
- height: 28px
- vertical rhythm: ~29px
- border radius: 8px
- text: 13px / 500

Sidebar composition from top to bottom:

1. Workspace switcher with circular workspace avatar and workspace name.
2. Search icon.
3. New issue action icon.
4. Primary navigation:
   - Inbox
   - My issues
   - Agent
5. `Workspace` group:
   - Projects
   - Views
   - Loops
   - More
6. `Your teams` group.
7. Expandable teams with nested:
   - Home
   - Issues
   - Projects
   - Views
8. Bottom-left help button.
9. Bottom-right agent/status affordance in the app footer region.

Team rows should collapse/expand without full-page reload. Expansion should animate height/opacity lightly, not bounce.

When a row is hovered:
- background highlight appears immediately or nearly immediately;
- icon/text contrast increases;
- hidden trailing controls may fade/reveal;
- leaving should fade toward rest state over ~150ms.

Active row:
- visually stronger surface than hover;
- remains selected across route transitions;
- route transition does not flash white or clear the current content prematurely.

## Main app frame

Captured shell behavior includes an inset app frame:

- left margin tracks the 244px sidebar;
- outer margin around the content frame: ~8px;
- border: 1px using border token;
- surface: base surface token;
- radius: 12px;
- shell margin transition: 450ms with `cubic-bezier(.45,0,.55,1)`.

At narrower desktop/tablet breakpoints around <=1023px, collapse the desktop framing/sidebar model and allow the content frame to reach edges. Do not simply squeeze the 244px sidebar into a 700px viewport.

## Main header

At the 1914px capture:
- primary main header region starts around x=247–255px;
- height ~60px;
- title/actions align vertically around y=17–18px;
- common action buttons are 28px high.

Header behaviors:
- breadcrumb on left;
- favorite/star when supported;
- view-specific actions on right;
- right-side panels must shrink main content rather than obscure it when they are persistent panels;
- popovers float above content and should not resize layout.

---

# 5. Microinteraction doctrine

This is the most important part of the reconstruction.

## A. Hover and highlight

For rows/cards/buttons:

1. Pointer enters.
2. Apply hover background immediately (`0–50ms`).
3. Reveal contextual action icon(s) using opacity within 80–150ms.
4. Preserve text layout — never shift content when an action appears.
5. Pointer leaves.
6. Fade highlight and action affordances over ~150ms.

Checkbox behavior on issue rows:
- checkbox is not visually dominant at rest;
- when pointer approaches the left selection affordance, reveal it without pushing the issue ID/title;
- selection persists after pointer leaves.

## B. Pressed/menu-open state

When a toolbar button opens a menu:
- keep the trigger visibly highlighted while the menu remains open;
- captured CSS explicitly exposes a `[data-menu-open=true]` style concept;
- close on outside click and Escape;
- return focus to the trigger;
- menu close fade should be quick (~100–150ms).

## C. Contextual menus

Two modes:

1. **Keyboard command menu** — central command/search surface.
2. **Pointer-invoked contextual action menu** — anchored close to the invoking property/button.

Property menus must appear near the property being edited, not always center-screen.

Use Popper/Floating UI collision handling:
- 8px viewport margin;
- prefer bottom-start/right-start depending on control;
- flip when insufficient room;
- keep menu width stable while search results update.

Menus are keyboard navigable:
- Arrow Up/Down
- J/K where appropriate
- Enter applies
- Escape closes
- type-to-filter
- focused item uses immediate highlight.

## D. Tooltips

- use only when icon meaning is not already obvious;
- delayed appearance around 400–600ms is acceptable;
- disappear quickly on leave;
- tooltips must not intercept pointer events;
- show shortcut hints where useful.

## E. Toasts

The screen recording shows stacked action confirmations in the lower-right after copy actions in issue detail.

Implement:
- bottom-right stack;
- new toast inserts adjacent to existing toast rather than covering it;
- compact dark panel, subtle 1px border, 8px-ish radius;
- 13px text;
- enter: opacity + translateY 4–8px over ~150ms;
- exit: opacity over ~150ms;
- copy confirmations auto-dismiss ~2–3 seconds;
- errors persist longer and offer retry where relevant.

Do not use giant colorful toast cards.

## F. Structural side panels

Examples:
- project details sidebar;
- issue analytics/Insights sidebar in the recording.

Panel opening:
- parent layout recomputes available content width;
- width animates/settles smoothly;
- content should not scale;
- use opacity only for panel internals if necessary;
- keep current scroll position in the main list.

## G. Rich editor

Issue description and comments:
- plain surface until focused;
- focus does not produce a large blue browser outline;
- expose formatting controls contextually, not permanently;
- markdown shortcuts;
- `@` mention search;
- paste rich text;
- attachments;
- code blocks;
- links;
- checklists;
- slash commands if implemented;
- collaborative cursor/version architecture through Yjs for multi-user documents.

## H. Optimistic property updates

Changing status, priority, assignee, project, labels, due date or milestone:

1. update MobX/local entity immediately;
2. write mutation to IndexedDB operation queue;
3. close the property menu immediately;
4. reflect the new chip/icon immediately;
5. asynchronously send mutation;
6. on success reconcile server version;
7. on conflict merge by field/version rules;
8. on failure restore previous value only when necessary and show a compact retry toast.

No full-list spinner.

---

# 6. Authentication and onboarding flow

Implement complete authentication even though the supplied page captures begin after sign-in. Treat the following login behavior as **DOCUMENTED (Linear Docs, verified 2026-08-24)** rather than CAPTURED.

## Login page

Support these entry points:
- `Continue with Google`
- `Continue with Email`
- Passkey when one is registered and the current client supports WebAuthn
- `Continue with SAML SSO` when the workspace/domain configuration requires it

Email flow:
1. user chooses Continue with Email;
2. collect email and submit;
3. send an email containing both a login link and one-time code;
4. show an `Enter code` state so the user can paste the emailed code instead of opening the magic link;
5. preserve the originally requested deep link through authentication;
6. provide resend/error/expired-code states without clearing the email unnecessarily.

Google flow:
- standard OAuth redirect/popup flow;
- restore intended workspace and deep link after callback;
- do not flash an unauthenticated shell after callback.

Passkeys:
- use WebAuthn;
- support registration and management under Account → Security & Access;
- allow multiple registered devices/passkeys;
- gracefully fall back to Email/Google when passkey is unavailable;
- current Linear documentation says passkeys are **not supported in the Linear desktop app**, so keep the capability client-aware rather than universally showing a broken action.

SAML / enterprise:
- expose SAML SSO only when configuration requires/allows it;
- login method restrictions are configuration/plan dependent;
- do not hard-code SAML as a mandatory path for every workspace.

## Multi-account/workspace behavior

Support:
- one user account belonging to multiple workspaces;
- multiple authenticated accounts;
- workspace switcher under the workspace menu;
- create/join workspace path;
- pending workspace invite handling;
- remember the last visited workspace per account.

## First workspace flow

Use this product flow unless a supplied product requirement overrides it:
1. authenticate;
2. resolve pending invite or workspace picker;
3. create workspace when needed;
4. choose/create an initial team when needed;
5. run profile setup;
6. show welcome/inbox content;
7. land on the user's configured default home view.

Only the profile screen and post-login pages are CAPTURED. Exact ordering of workspace/team setup outside those captures is a **REIMPLEMENTED** product flow and must not be described internally as recovered private Linear code.

## Captured profile onboarding screen

Exact content observed:
- `Set up your profile`
- `Choose how you'll appear in Linear`
- `Name & picture`
- `Title`
- name placeholder: `Enter your name…`
- title placeholder: `Software engineer`
- avatar upload
- Skip
- Continue

Captured buttons:
- 44px high;
- 13px / 500;
- pill radius;
- normal button transition around 150ms.

Validation:
- avatar preview is immediate;
- title is optional;
- Skip and Continue are explicit separate actions;
- successful submit persists locally first and advances without a white page flash;
- loading/disabled state must preserve the button dimensions.

---

# 7. Routing and navigation model

Use workspace slug routes. The supplied workspace is `synquic-labs`.

Observed route families include:

```text
/:workspace/inbox
/:workspace/my-issues/assigned
/:workspace/agent
/:workspace/projects/all
/:workspace/views/issues
/:workspace/loops
/:workspace/team/:teamKey/home
/:workspace/team/:teamKey/issues
/:workspace/team/:teamKey/projects
/:workspace/team/:teamKey/views
/:workspace/issue/:issueIdentifier/:slug?
/:workspace/project/:projectSlug/overview
/:workspace/project/:projectSlug/activity
/:workspace/project/:projectSlug/issues
/:workspace/settings/...
```

Preserve browser history and deep linking.

Opening/closing a details pane should use route state or nested routing so Back behaves predictably.

Do not reload data/store on every route change. The local model layer remains alive across navigation.

---

# 8. Inbox

Inbox is the notification center, not an email client.

## List state

Each notification row includes enough context to identify:
- issue/project/document source;
- triggering event;
- actor;
- team/project metadata where useful;
- read/unread state;
- snoozed state.

## Toolbar

Captured top actions include:
- Add filter
- Display options
- Snooze notification
- Delete notification

The welcome notification capture also has a full detail surface with `Welcome to Linear`, onboarding video/resources and help links.

## Keyboard behavior

Implement:
- `G`, then `I` → Inbox
- `J/K` or arrows → move highlight
- Right click → contextual actions
- `Backspace` → delete selected notification
- `Shift + Backspace` → delete read notifications
- `U` → mark selected read/unread
- `Alt/Option + U` → mark all read
- `H` → snooze
- `Cmd/Ctrl + F` → quick search within Inbox
- `Esc` → clear current quick search/selection first, then close transient UI.

## Snooze

Snoozing hides the notification until scheduled time. Persist snooze server-side. When time arrives, reinsert it in Inbox and update unread state according to product rules.

---

# 9. My Issues

**DOCUMENTED current information architecture:** four tabs — `Assigned`, `Created`, `Subscribed`, and `Activity`. `G` then `M` opens My Issues. Assigned is curated into focus-oriented groups when applicable; Created is creation-ordered; Subscribed contains subscribed work; Activity is a recency feed of relevant issue activity.


Implement tabs/views at minimum:
- Assigned
- Created
- Subscribed
- Activity

Each is a filtered view over the same normalized issue entities, not duplicated data.

Provide:
- list/board toggle where supported;
- filters;
- grouping;
- ordering;
- display properties;
- bulk selection.

---

# 10. Team pages

Each sidebar team expands to:
- Home
- Issues
- Projects
- Views

Team Home should support:
- pinned resources;
- documents/links;
- team members;
- shortcuts to team settings, triage, issues, projects, views;
- optional Documents/Members tabs when those modules are enabled.

Keep team color/icon visible in breadcrumbs and switchers.

---

# 11. Issue list — exact interaction model

The recording shows the `Trendzo > Issues` page with:
- top tabs: `Active`, `Backlog`, `All issues`;
- status grouping row such as `In Progress 1`;
- an issue row `TRENDZO-37 — Research Work`;
- date on the far right;
- top-right view/filter/insights/display controls.

## Highlight vs select

These are separate concepts.

### Highlight
- pointer hover or keyboard navigation highlights one row;
- highlight does not automatically select it.

### Select
- `X` selects highlighted issue;
- Shift+Click selects multiple;
- left-side checkbox appears on hover;
- `Cmd/Ctrl + A` selects all matching visible issues;
- `Esc` clears selection;
- selected rows preserve selection when pointer leaves.

When multiple issues are selected:
- show compact bulk action toolbar at bottom;
- actions operate transactionally/optimistically;
- contextual menu operates on whole selection.

## Keyboard navigation

- arrows or J/K move highlight;
- Enter opens issue;
- `Cmd/Ctrl + K` opens actions for selected/highlighted issue;
- `Option/Alt + Up/Down` reorders when manual ordering is active;
- `Option/Alt + Shift + Up/Down` moves to extremes when supported.

## Row visual layout

Use a 28–40px dense row depending on view mode; no oversized Jira-like cards in list mode.

Keep:
- status icon before title/ID;
- subdued metadata;
- contextual actions hidden until hover;
- stable row height during hover.

---

# 12. Display Options popover

The recording at roughly 42 seconds clearly exposes this menu on `Trendzo > Issues`.

Reconstruct it as a right-anchored popover under the display-options button.

Observed controls:

### Layout segmented control
- `List`
- `Board`

### Main controls
- Grouping → `Status`
- Sub-grouping → `No grouping`
- Ordering → `Priority`
- `Order completed by recency` toggle
- Completed issues → `All`
- `Show sub-issues` toggle

### List options
- `Nested sub-issues` toggle
- `Show empty groups` toggle

### Display properties chips
Examples visible in recording:
- ID
- Status
- Assignee
- Priority
- Project
- Due date
- Milestone
- Release
- Labels
- Links
- Time in status
- Created
- Updated

Interaction rules:
- menu does not close for toggle changes;
- selection dropdowns open anchored submenus;
- list/board switching updates the view immediately;
- save view preference for the current user;
- optionally allow setting as workspace/team default if permission allows;
- selected display-property chips have visibly stronger surface/contrast;
- chips wrap naturally without expanding menu beyond intended width.

Shortcut:
- `Shift + V` opens Display Options;
- `Cmd/Ctrl + B` toggles list/board.

---

# 13. Board / Kanban view

The recording switches to board mode around the latter third.

Observed state:
- one `In Progress` column containing `TRENDZO-37 Research Work`;
- a `+` create affordance below/inside the column;
- a `Hidden columns` area at right;
- hidden status cards include Backlog, Todo, Done, Canceled, Duplicate with counts;
- an Insights panel can remain open on the far right.

## Board layout

Default grouping by Status, but support grouping by:
- Status
- Project
- Priority
- Cycle
- Label
- Label group
- Assignee where meaningful

Allow sub-grouping/swimlanes.

## Cards

Card should show only configured properties. In the captured board state the issue card shows:
- ID
- status/title
- overflow/action affordance
- Created date

Cards must not become tall enterprise-kanban blocks unless additional properties are enabled.

## Drag and drop

Implement true optimistic DnD:

1. pointer-down activation constraint so clicks still open cards;
2. lifted card receives slight elevation, not large scale;
3. original slot leaves a placeholder;
4. valid target column highlights subtly;
5. drop updates local issue grouping/status immediately;
6. server mutation runs after local commit;
7. failure rolls back and shows toast;
8. horizontal board auto-scrolls when dragging near edges;
9. vertical auto-scroll within long columns;
10. preserve relative/manual ordering.

Do not animate every card in the board for 300ms after a drop. Use short ~150–200ms layout settlement.

## Column behavior

- column header shows status icon, name and count;
- `+` creates an issue prefilled with that group/status;
- `…` column menu can hide the column;
- collapsed/hidden groups move into `Hidden columns` section;
- rightmost area allows restoring hidden columns;
- `T` toggles swimlane collapse when sub-grouping is active.

Selection shortcuts remain available in board view.

---

# 14. Issue creation modal

The recording around 57 seconds gives a clean reference.

## Geometry and composition

Centered floating modal, dark surface, rounded panel, subtle border/shadow, backdrop dimming the app without blurring it heavily.

Top row:
- team chip/icon `TRENDZO`
- chevron/breadcrumb separator
- `New issue`
- expand/fullscreen icon
- close X

Editor:
- large title input with placeholder `Issue title`
- description area with placeholder `Add description…`

Property chip row:
- status e.g. `In Progress`
- Priority
- Assignee
- Project
- Labels
- more `…`

Bottom:
- attachment button on left
- `Create more` toggle near right
- primary `Create issue` button

Once text exists, a `Save as draft` affordance is surfaced near the top-right area in the captured flow.

## Keyboard

- `C` opens standard create modal globally when focus is not inside an editable field;
- `V` opens full-screen issue creation;
- `Alt/Option + C` opens create-from-template;
- Escape with untouched empty modal → close;
- Escape/close with meaningful draft → draft confirmation/save behavior;
- Cmd/Ctrl+Enter can create if not conflicting with editor semantics;
- Tab order must follow visual property order.

## Creation semantics

Required:
- team
- status
- title

Optional:
- description
- priority
- assignee
- delegated agent
- project
- labels
- estimate
- cycle
- milestone
- due date
- relations
- attachments

When creating from a board column, prefill group property.
When creating from a project, prefill project.
When creating from a team page, prefill team.

## Draft model

Implement two layers:

1. **ephemeral local composer draft** in IndexedDB/local client state when navigating away;
2. **explicit saved draft** persisted server-side when user deliberately saves draft.

Never throw away a partially written issue due to navigation.

---

# 15. Issue detail page

The supplied captured page is `TRENDZO-37 Research Work`.

Observed main content:
- issue identifier `TRENDZO-37`
- title `Research Work`
- rich description
- sub-issue affordance
- Activity section
- comment composer

Observed top-right actions include:
- Add to favorites
- Issue options
- Copy issue URL
- Copy issue ID
- Copy branch name
- Work on issue

Observed property rail includes:
- Backlog/status
- Set priority
- Assign
- Labels / Add label
- Project / Add to project

Observed footer/activity action:
- Subscribe

## Property rail geometry

Captured property controls are around 28px tall with ~32px vertical rhythm in the top property group. Text is around 13px / 500. Property changes should feel immediate, with popovers anchored to the row.

## Copy actions

Copy Issue URL / ID / branch name:
- perform Clipboard API write;
- close action menu;
- show lower-right confirmation toast;
- allow multiple confirmations to stack as seen in recording.

## Inline editing

Title:
- click title to edit in place;
- Enter commits unless multiline mode;
- Escape reverts current uncommitted text;
- optimistic save.

Description:
- rich editor;
- autosave with debounce;
- version checkpoint logic;
- collaborative state if another user is present.

## Activity feed

Activity entries represent:
- creation
- status/assignee/project/label changes
- comments
- attachments
- relations
- automated/agent actions

Do not record noisy transient composer edits.

Group near-simultaneous property changes by actor/time where reasonable.

---

# 16. Projects list

The captured Projects page is a dense table/list.

Header:
- title `Projects`
- `New project` pill button on right

Top tab:
- `All projects`

Observed columns:
- Name
- Health
- Priority
- Lead
- Target date
- Issues
- Status

Captured example projects include Driver App, Consumer App, Retailer App, Web Portal, Backend, Acti Pro, Icon Realty, Shrujan, Trikaal, Cleanse Ayurveda.

Reference row behavior:
- row height about 48px in capture;
- row radius about 8px;
- project icon/emoji + name + milestone/summary text;
- hover reveal actions without layout shift;
- click opens Project Overview;
- keyboard highlight/selection when appropriate.

At 1914×992 the `New Project` button is roughly 108×28px, 12px/500 with pill radius.

---

# 17. Project creation

`New project` opens a focused project creation modal.

Support:
- name
- summary
- description
- team(s)
- lead
- members
- status
- priority
- target date
- icon/color
- initiatives
- template selector
- initial milestones

Project templates can prefill:
- name/description
- teams
- status
- lead/members
- initiatives
- milestones
- issues.

Create optimistically and navigate to the project once a stable local ID/server ID mapping exists.

---

# 18. Project overview

The supplied `Driver App › Overview` capture is a key reference.

Observed tabs:
- Overview
- Activity
- Issues

Observed sections:
- Properties
- Resources
- Description
- Milestones

Observed actions/properties:
- Add to favorites
- Project actions
- Copy page URL
- Setup project notifications
- Add new view
- Open project insights
- Close project details
- Backlog
- No priority
- Add document or link…
- Write first project update
- Milestone
- Add dependency
- Add members
- Teams channel
- Add label
- Add milestone
- See issues
- Milestone actions

Reference project content describes an Expo/React Native delivery-agent app and milestone `M3 · Delivery flow (handover → deliver → proof)`.

## Layout

Main project overview:
- central readable content column;
- optional project details/property sidebar;
- resources and description are editable directly;
- milestones display progress and issue counts;
- target date/status/lead/team appear as compact properties.

Shortcut:
- `Cmd/Ctrl + I` toggles project details sidebar.

## Project update

`Write first project update` / update composer:
- opens inline or focused update editor;
- allow health state and update text;
- publish produces activity event;
- subsequent updates appear chronologically.

---

# 19. Views

Implement workspace/team custom views as saved query definitions over normalized entities.

A view stores:
- entity type (issue/project/initiative where supported);
- filters;
- layout list/board;
- grouping/sub-grouping;
- ordering;
- visible properties;
- hidden groups/columns;
- owner/scope;
- access visibility;
- default/personal display override.

Allow:
- save current filtered state as a view;
- favorite view;
- rename/duplicate/delete;
- open via sidebar;
- empty-state creation flow.

Do not duplicate issues into a view table. Views are query/configuration objects.

---

# 20. Filters

Build a reusable composable filter system.

Common issue predicates:
- team
- status
- priority
- assignee
- creator
- project
- milestone
- cycle
- label / label group
- due date
- created/updated
- subscriber
- parent/sub-issue
- estimate
- SLA status if enabled

Behavior:
- clicking filter opens anchored searchable menu;
- nested filters use breadcrumb/back transitions inside the same popover;
- active filters render as compact chips in the header;
- removing a filter updates results instantly from local store;
- server request only fills missing data, not every filter interaction.

---

# 21. Search and command system

## Workspace search

`/` opens workspace search.
Search across:
- issues
- projects
- documents

Support prefix modes:
- `i ` issue
- `p ` project
- `u ` user
- `t ` team
- `l ` label
- `f ` favorite
- `d ` document

`O`, then `I` opens issue quick search/recent issues.

`Cmd/Ctrl + F` searches only the current board/list/Inbox by issue title/ID and behaves like a temporary filter; `Esc` clears it.

Search should accept exact issue identifiers and the documented quick-search prefixes. Results should appear as the user types with local results first. Remote search can enrich when needed.

## Command menu

`Cmd/Ctrl + K` opens the global/contextual action system.

Command model:

```ts
type Command = {
  id: string;
  label: string;
  icon?: IconName;
  shortcut?: string[];
  keywords?: string[];
  group: string;
  when(ctx: CommandContext): boolean;
  run(ctx: CommandContext): Promise<void> | void;
};
```

Groups are contextual. When on an issue, issue commands come first. When a selection exists, selection actions come first. When on a project, project actions come first.

Pointer-invoked property commands should render anchored near the source control while retaining search/keyboard behavior.

Implement shortcut sequence handling with a central registry, not ad hoc `keydown` handlers spread throughout components.

Rules:
- disable global shortcuts while typing unless shortcut is explicitly editor-safe;
- show pending sequence hint for multi-key shortcuts such as `G` then `I`;
- cancel pending sequence after a short timeout or Escape;
- respect macOS Cmd vs Windows/Linux Ctrl labels.

---

# 21A. Peek / quick preview

Implement Linear-style keyboard preview as a first-class microinteraction because it materially changes navigation speed.

**DOCUMENTED behavior:**
- with an issue/list item highlighted, pressing `Space` toggles a lightweight Peek preview;
- holding `Space` can be treated as momentary preview where the platform/event model allows it reliably;
- `↑` / `↓` or `J` / `K` continues moving through items while preview remains useful;
- `Esc` closes preview;
- opening the full item transitions from preview to the normal route/detail experience without losing list position.

Implementation rules:
- Peek is not a full route replacement and must not reset the underlying list scroll;
- use a lightweight layer/pane with near-instant entrance (100–150ms maximum);
- preload the highlighted entity from the local normalized store;
- do not fetch the entire entity before opening if summary data is already present;
- preserve keyboard focus semantics so Space does not scroll the page.

---

# 22. Keyboard shortcut baseline

Implement at least:

## Global
- `/` — workspace search
- `Cmd/Ctrl + K` — command menu/actions
- `C` — create issue
- `V` — full-screen issue creation
- `Alt/Option + C` — create issue from template
- `Shift + V` — display options
- `Cmd/Ctrl + B` — list/board toggle on issue views
- `G` then `I` — Inbox
- `G` then `M` — My Issues
- `O` then `I` — issue search/recent issues
- `O` then `V` — open custom views
- `O` then `L` — label view selector
- `O` then `F` — favorites
- `Cmd/Ctrl + J` — Agent chat

## Issue selection/list/board
- Up/Down or J/K — move highlight
- `X` — select highlighted issue
- Shift+Click — multi-select
- `Cmd/Ctrl + A` — select all visible filtered issues when view owns focus
- `Esc` — clear selection
- `Option/Alt + Up/Down` — manual reorder increment
- `Option/Alt + Shift + Up/Down` — move to top/bottom where supported
- `T` — collapse/expand swimlane on board

## Inbox
- `U` — read/unread
- `Alt/Option + U` — mark all read
- `H` — snooze
- Backspace — delete selected notification
- Shift+Backspace — delete read notifications

## Issue properties
- `A` — assignee picker when issue context is active
- `I` — assign self where context permits
- `Shift + M` — milestone picker
- `Cmd/Ctrl + Shift + P` — parent issue picker
- `Shift + S` — subscribe/unsubscribe the focused or selected issue(s), with the command label reflecting current state
- `Cmd/Ctrl + Shift + S` — manage subscribers for selected issues; in contexts that expose a direct unsubscribe command, label/action must remain context-aware rather than globally hard-coded

## Project
- `Cmd/Ctrl + I` — toggle details sidebar

Do not intercept browser/system shortcuts irresponsibly.

---

# 23. Insights side panel

Where the plan/permission exposes Insights, support `Cmd/Ctrl + Shift + I` as the Insights toggle in addition to the toolbar action.

The video shows an issue Insights panel docked on the right.

Observed elements:
- explanatory intro with Examples / Documentation links;
- issue count summary;
- controls:
  - Measure = Issue count
  - Slice = Status
  - Segment = Priority
- chart;
- tabular breakdown;
- actions for expand/settings/more;
- `Set default for everyone` permissioned action at bottom.

Implement this as a docked analytics panel that reads from current filtered view data.

Opening it:
- should not discard filters;
- reduces available main width;
- retains panel state while toggling list/board;
- chart rerenders after data/config changes with a restrained transition (150–250ms).

Do not use excessive chart animation.

---

# 24. Agent experience

The supplied New Chat capture makes the Agent surface **CAPTURED**. The broader capabilities below are **DOCUMENTED (current Linear Agent docs, verified 2026-08-24)**.

Captured New Chat surface:
- `New chat`
- `Skills`
- attachment button
- send/submit button
- `Agent`
- `Chat history`
- compact central composer rather than a generic full-page chatbot layout
- ARIA semantics including agent/chat-history switching and a message send action

## Agent navigation

- Sidebar `Agent` opens the agent area.
- `Cmd/Ctrl + J` opens or focuses Agent chat.
- A new chat is a clean context boundary.
- Multiple chats can remain open simultaneously as toolbar tabs.
- Each open tab can show a concise label plus unread/working state.
- Chat history is browseable and grouped by recency.
- Agent may also be invoked contextually by `@Linear`-style mention semantics in comments where that product capability is enabled.

Support:
- new chat;
- recent/history view;
- multiple open chat tabs;
- token/message streaming;
- explicit working/tool-progress state;
- stop/cancel generation;
- attachments;
- workspace object mentions/references;
- retry failed response;
- unread/working badges on inactive chat tabs;
- context handoff from currently open issue/project/document;
- selected-text-to-chat affordance if implementing the current 2026 experience.

Composer interaction:
- Enter behavior follows the user's keyboard preference;
- disabled send button when the composer contains no sendable text/attachment;
- submitting immediately appends the user message optimistically;
- agent progress appears in-place without blocking the rest of the workspace;
- preserve scroll anchoring intelligently: stay pinned only when the user is already near the bottom.

## Agent action layer

Agent uses the same workspace data and permission boundary as the human UI. It may, when permitted:
- create/update issues;
- create/update projects;
- create/update milestones;
- create/update initiatives when the product scope supports initiatives;
- summarize/analyze workspace work, threads and customer requests;
- answer workspace questions;
- create/edit documents through the same editor/document domain layer;
- post, edit and delete **its own** comments;
- manage Inbox notifications where enabled by the product scope;
- start a coding/delegated work session only if that separate capability is enabled.

Every mutating agent action must resolve to the same permission-checked domain commands used by the human UI. Do not create a privileged second mutation path.

## Skills

A Skill is reusable agent instruction/workflow configuration.

Implement:
- personal skills;
- team-shared skills;
- create/save a Skill from a successful Agent conversation;
- direct invocation from the captured `Skills` button;
- slash-command invocation in the Agent composer;
- optional automatic use when the current context matches skill intent;
- personal management under Account → Agent personalization → Skills;
- team management under Team settings → AI & Agents → Agent skills;
- permission checks for creating/updating/deleting shared skills.

Suggested model:

```ts
type AgentSkill = {
  id: string;
  workspaceId: string;
  teamId?: string;
  ownerUserId?: string;
  scope: "personal" | "team";
  name: string;
  description?: string;
  instructions: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};
```

Do not hard-code Skills as prompt snippets inside the component tree; they are domain entities with permissions and lifecycle.

---

# 25. Loops

Loops are recurring/event-driven Agent workflows. The Loops item is CAPTURED in the workspace navigation; behavior in this section is **DOCUMENTED from current Linear Loops docs, verified 2026-08-24**.

## Entity model

```ts
type Loop = {
  id: string;
  workspaceId: string;
  ownerScope: "workspace" | "team";
  ownerTeamId?: string;
  name: string;
  instructions: string;
  enabled: boolean;
  trigger: LoopScheduleTrigger | LoopIssueTrigger;
  dataScope: LoopDataScope;
  permissions: LoopPermissions;
  connectorIds: string[];
  draftVersion?: number;
  publishedVersion: number;
  lastRunAt?: string;
  nextRunAt?: string;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

type LoopIssueTrigger = {
  type: "issue";
  event: "created" | "updated";
  conditions: FilterExpression[];
};

type LoopScheduleTrigger = {
  type: "schedule";
  schedule: string; // cron/rrule-compatible application representation
  timezone: string;
};
```

## Entry points

- Workspace-level Loops live under the workspace `Loops` navigation entry.
- Team-level Loops live on the relevant team surface/tab.
- `New loop` begins creation.
- Agent chat can also turn a successful workflow into a Loop after the user refines the desired result.

## Manual creation flow

1. Open workspace/team Loops.
2. Choose `New loop`.
3. Choose one trigger family:
   - issue created/updated **and matching conditions**, or
   - schedule.
4. Enter outcome-oriented instructions.
5. Optionally attach allowed MCP connectors/external tools.
6. Review the Loop's scope.
7. Review explicit permissions.
8. Create/publish the Loop.

Do not reduce event triggers to a generic untyped webhook. Issue conditions are filter expressions and must be inspectable/editable in the UI.

## Scope

Allow Loops to be scoped to:
- a specific team;
- a selected set of teams;
- the workspace/all permitted public teams.

The scope controls both data the Loop can read and places it can write. Private-team isolation must be enforced server-side, not only hidden in UI.

## Permission surface

Model independent capabilities/toggles rather than one broad `canEverything` flag. Current documented capability classes include:
- Team access / data scope
- Web access
- Code Intelligence access
- Coding sessions
- writing to externally synced issues/comments
- approved external issue sources
- allow changes outside the single issue that triggered the run
- connector-specific access through authenticated MCP connections

Show risk copy for sensitive external/web/write permissions. Persist least privilege.

## Editing: draft → publish

Editing a live Loop must not mutate the active configuration character-by-character.

Flow:
1. open Loop;
2. click Edit;
3. changes are persisted as a **draft version**;
4. live runs continue using the last published version;
5. user clicks `Publish`;
6. all draft changes atomically become the new published version.

Show dirty/draft state clearly. Closing and reopening the editor must restore the saved draft.

## Published versions / restore

- Persist every published configuration version.
- Provide `Published versions` history.
- A past version can be selected and restored into the current edit flow.
- Do not assume removed/expired external connector credentials can be restored automatically; force re-authentication where needed.

## Run history

Each Loop has an auditable `Run history`.

For each run record:
- trigger source/time;
- published Loop version used;
- status: queued/running/succeeded/failed/cancelled/skipped;
- input entity if issue-triggered;
- actions/tool calls in human-readable form;
- resulting object links;
- error/failure reason where available;
- usage/cost metadata if the product implements metering;
- started/finished timestamps.

Opening a run must never mutate the run. Make it a forensic read-only audit surface.

## Run now / retry

Where product permissions allow:
- `Run loop now` runs a scheduled Loop immediately;
- issue-triggered Loop manual rerun asks which issue/input should be used when the input is not implicit;
- failed runs can be retried as a new run, not by mutating historical records.

## Enable / disable / delete

- contextual menu supports Enable/Disable;
- disabled Loops retain configuration and history but do not schedule/accept triggers;
- deletion is permanent in the current documented behavior, so require explicit confirmation;
- recommend Disable in destructive confirmation copy when the user may want to preserve history.

## Execution architecture — REIMPLEMENTED

The actual private Linear runtime is not exposed. Implement independently with durable jobs:
- schedule trigger → scheduler enqueues `LoopRun`;
- committed issue domain event → condition evaluator → enqueue matching `LoopRun`;
- run captures the exact published version and permission snapshot/reference;
- worker executes Agent plan/tools with idempotent run ID;
- every mutation goes through normal permission-checked domain commands;
- record each externally meaningful action in the run audit;
- retries create attempts under the same run or a linked retry run, never duplicate side effects blindly.

Do not call polling every few seconds from the browser to implement Loops.

---

# 26. Preferences / Settings

The supplied Preferences capture exposes a two-pane settings architecture.

## Settings navigation groups

### Personal
- Preferences
- Profile
- Notifications
- Code & reviews
- Security & access
- Connected accounts
- Agent personalization

### Issues
- Labels
- Templates
- SLAs

### Projects
- Labels
- Templates
- Statuses
- Updates

### Features
- AI & Agents
- Initiatives
- Documents
- Customer requests
- Releases
- Pulse
- Asks
- Emojis
- Integrations

### Your teams
- team-specific settings hierarchy

## Captured general preference fields

- Default home view → `Linear Agent` by default in this capture
- Display names → `Full name`
- First day of week → `Monday`
- Convert text emoticons into emojis
- Send comments on… → `Enter`

### Interface and theme
- App sidebar → `Customize`
- Font size → `Default`
- theme cards:
  - System preference
  - Light
  - Dark

### Desktop application
- desktop-specific preferences/actions.

Settings sidebar row geometry mirrors main nav:
- around 205×28px;
- 13px text;
- active row highlight;
- content pane scroll independent where needed.

Theme changes should update instantly and persist per account.

---

# 27. Cycles

Even though cycles are not prominent in the supplied seven captures, they are core to the product-management flow.

Implement team-level repeating cycles:
- duration 1–8 weeks;
- start weekday;
- optional cooldown;
- future cycles auto-created;
- current/upcoming/completed state;
- issue assignment to cycle;
- automatic rollover rules;
- capacity estimate based on recent velocity;
- cycle detail sidebar/chart.

Treat cycles as planning periods, not releases.

---

# 28. Issue workflows and relations

## Status model

Statuses belong to teams and map to broad categories:
- Triage if enabled
- Backlog
- Unstarted/Todo
- Started/In Progress
- Completed/Done
- Canceled
- Duplicate

The exact visible board in the recording contains:
- Backlog
- Todo
- In Progress
- Done
- Canceled
- Duplicate

Allow custom team workflow statuses but keep category semantics stable.

## Relations

Support:
- parent/sub-issue;
- blocked by;
- blocking;
- related;
- duplicate of.

Relations must update both affected issues atomically.

Converting a large parent issue to a project can be implemented as a dedicated command with preview/confirmation.

---

# 29. Data model

At minimum implement normalized entities:

```text
User
Account
Passkey
Session
Workspace
WorkspaceMembership
WorkspaceInvite
Team
TeamMembership
TeamWorkflowStatus
Label
LabelGroup
Issue
IssueLabel
IssueRelation
IssueSubscriber
IssueDraft
IssueTemplate
IssueActivity
Comment
CommentThread
Reaction
Attachment
Project
ProjectTeam
ProjectMember
ProjectStatus
ProjectUpdate
ProjectMilestone
Initiative
Cycle
CustomView
Favorite
Notification
Reminder
Document
DocumentVersion
AgentThread
AgentMessage
AgentSkill
Loop
LoopRun
Integration
ApiKey
SyncAction
ClientCheckpoint
PendingMutation (client only)
UserPreference
```

Every entity must have:
- stable UUID;
- createdAt;
- updatedAt;
- version or monotonic revision where required;
- actor metadata for auditable mutations.

Do not store giant nested JSON blobs for all product state.

---

# 30. Local-first sync architecture

**Evidence boundary:** Linear's public docs explicitly document realtime synchronization, storing unsent changes locally, retrying when connectivity returns, a `Syncing` indicator with pending-change count, and persistence of those retries across application restart. The captured bundle also exposes an IndexedDB client dependency. The specific `SyncAction`/checkpoint/server architecture below is therefore a **REIMPLEMENTED design recommendation**, not a claim about Linear's private backend implementation.

This local-first behavior is mandatory for Linear-like speed.

## Client model

Maintain normalized observable stores in memory, hydrated from IndexedDB at startup.

Startup:
1. render shell immediately;
2. open IndexedDB;
3. hydrate last local snapshot;
4. authenticate silently;
5. request delta since `clientCheckpoint`;
6. apply ordered delta actions;
7. subscribe to realtime channel;
8. mark bootstrap complete.

Do not block first paint on downloading entire workspace.

## Mutation flow

For every mutation:

```text
User interaction
  -> domain command
  -> local optimistic transaction
  -> IndexedDB entity write
  -> PendingMutation enqueue
  -> GraphQL mutation
  -> server PostgreSQL transaction
  -> append SyncAction
  -> mutation acknowledgement
  -> WebSocket/delta propagation
  -> reconcile client checkpoint
```

If offline or the backend is temporarily unreachable:
- store unsent changes locally;
- pending operations survive application restart;
- retry automatically when connectivity returns;
- show subtle `Syncing` near the workspace name when enough operations are queued or transmission is taking longer than expected;
- show a pending-change count beside Syncing;
- use idempotency keys so transport retries do not create duplicate side effects;
- treat offline as a resilience/failsafe mode, not a promise of conflict-free full offline collaboration.

## Sync action table

A simplified internal implementation:

```ts
SyncAction {
  id: bigint // ordered
  workspaceId: uuid
  entityType: string
  entityId: uuid
  action: "insert" | "update" | "archive" | "delete"
  payload: jsonb
  changedFields: jsonb
  actorId: uuid | null
  createdAt: timestamp
}
```

Client checkpoint stores last applied action ID.

At moderate scale, Postgres can serve deltas directly. Do not reproduce Linear's production-scale infrastructure unless requirements justify it.

## Realtime

WebSocket message can announce newest available sequence/checkpoint. Client fetches/apply delta in order rather than trusting arbitrary event arrival order.

This avoids permanent divergence when socket messages arrive out of order.

---

# 31. Rich text and collaborative editing

Use one editor abstraction for:
- issue descriptions;
- comments;
- project descriptions;
- documents;
- project updates where compatible.

Support:
- markdown shortcuts;
- headings;
- bold/italic/strike;
- inline/code block;
- bullets/numbers/checklists;
- blockquotes;
- links;
- tables where relevant;
- mentions;
- images/files;
- paste normalization.

For long-form collaborative fields:
- ProseMirror document model;
- Yjs shared document;
- awareness/presence optional but architecture-ready;
- local persistence before server acknowledgement;
- version history snapshots for documents/project descriptions.

Never use a plain `<textarea>` for the final implementation.

---

# 32. Performance requirements

Targets on a modern desktop:
- sidebar/nav hover response <50ms perceived;
- opening cached issue detail <100ms perceived;
- local property change visible within same animation frame;
- command/search menu paint <100ms;
- board with 1000+ cards remains smooth through virtualization where compatible;
- large lists use React Window/Virtuoso-style virtualization;
- avoid rerendering entire workspace after one issue update.

MobX store selectors/components should observe only entities/fields they render.

Memoize expensive analytics separately from view rendering.

---

# 33. Accessibility and focus

Every icon-only control requires an accessible name.
The captured HTML includes strong ARIA labeling; preserve this discipline.

Requirements:
- visible keyboard focus that matches design;
- correct roles for dialogs, menus, menuitems, tabs and listboxes;
- focus trap in modals;
- focus restoration on close;
- Escape hierarchy;
- keyboard sortable/alternative for DnD where practical;
- reduced-motion support;
- screen-reader text for status icons and colored dots;
- minimum useful hit target larger than glyph itself.

Observed icon glyphs are often 14–16px while clickable controls are 24–32px. Keep this distinction.

---

# 34. Responsive behavior

Desktop is the primary target, but implementation must be coherent below it.

## >= 1280px
- 244px sidebar;
- inset main frame;
- optional right details/Insights pane;
- dense multi-column content.

## 1024–1279px
- keep sidebar where space permits;
- right panel may use narrower width;
- table columns may progressively hide according to Display properties.

## <= 1023px
- collapse sidebar into overlay/drawer;
- main app frame reaches viewport edges;
- right detail pane becomes overlay or full-screen nested view;
- board remains horizontally scrollable;
- preserve route state.

Do not turn the desktop app into a stack of generic cards.

---

# 35. Component architecture

Use semantic components roughly like:

```text
AppShell
  WorkspaceSidebar
    WorkspaceSwitcher
    GlobalActions
    NavSection
    TeamTree
  AppFrame
    ContentHeader
    RouteOutlet
    OptionalDockedPanel

IssueListView
  ViewTabs
  FilterBar
  DisplayOptionsTrigger
  IssueGroup
  IssueRow
  BulkActionBar

IssueBoardView
  BoardSwimlane
  BoardColumn
  IssueCard
  HiddenColumns

IssueDetail
  IssueHeader
  IssueEditor
  SubIssueSection
  ActivityFeed
  CommentComposer
  IssuePropertyRail

ProjectOverview
  ProjectHeader
  ProjectTabs
  ProjectMain
  ProjectPropertySidebar
  ResourceSection
  MilestoneSection

CommandSurface
PropertyPicker
ContextMenu
SearchPalette
ToastViewport

AgentChat
AgentComposer
AgentSkillPicker
AgentActivityStream

SettingsLayout
SettingsSidebar
SettingsContent
```

Do not create one mega component per page.

---

# 36. State machines for transient UI

Avoid scattered booleans. Model important overlays explicitly.

Example:

```ts
type OverlayState =
  | { type: "none" }
  | { type: "global-search"; query: string }
  | { type: "command-menu"; context: CommandContext }
  | { type: "property-picker"; issueId: string; property: IssueProperty; anchorId: string }
  | { type: "create-issue"; draftId: string; mode: "modal" | "fullscreen" }
  | { type: "display-options"; viewId: string; anchorId: string }
  | { type: "confirm"; id: string };
```

Overlay stack must define Escape behavior predictably:
1. close nested submenu;
2. clear menu search if non-empty;
3. close popover/dialog;
4. clear issue selection;
5. navigate back only when no transient state remains.

---

# 37. Permission system

Implement roles at least:
- owner
- admin
- member
- guest

Permissions must gate:
- workspace settings;
- team management;
- workspace-wide default views;
- `Set default for everyone`;
- templates;
- integrations/API keys;
- agent/loop administration;
- private team data;
- invite/member actions.

Server is authoritative. Client-side hiding is UX only, not authorization.

---

# 38. Testing protocol — do not skip

## Visual golden tests

Primary viewport:
- 1914×992

Golden routes/states:
1. Agent new chat
2. profile onboarding
3. Inbox welcome detail
4. Projects list
5. Driver App project overview
6. Research Work issue detail
7. Preferences
8. Trendzo Issues list
9. Display Options open
10. Insights panel open
11. Board view with hidden columns
12. Create Issue modal empty
13. Create Issue modal with text/draft state

Compare:
- sidebar width;
- header height;
- row heights;
- panel boundaries;
- type size/weight;
- menu positioning;
- radii;
- contrast;
- spacing.

Do not accept “looks similar”. Iterate until pixel difference is small and differences are intentional.

## Interaction Playwright tests

At minimum:

### Issue creation
- press C;
- modal opens and title focused;
- type title;
- select priority;
- close → draft behavior;
- reopen → draft restored;
- create → row appears immediately;
- request can still be in flight.

### Board
- Cmd/Ctrl+B toggles board;
- drag issue from Todo to In Progress;
- card moves immediately;
- refresh after server acknowledgment preserves state;
- simulate API failure → rollback/toast.

### Display options
- Shift+V opens;
- change grouping;
- toggle display property;
- popover remains open;
- reopen route and preference persists.

### Selection
- hover row;
- X selects;
- J/K moves highlight;
- X adds another;
- bulk toolbar appears;
- Esc clears.

### Inbox
- G,I navigation;
- U read/unread;
- H snooze;
- Backspace delete.

### Command menu
- Cmd/Ctrl+K;
- type action;
- execute;
- context-specific action shown only in applicable page.

### Offline
- disconnect API/socket;
- edit issue status;
- refresh application;
- local state remains;
- reconnect;
- queued mutation syncs once;
- checkpoint advances.

---

# 39. Implementation sequence

Do not attempt all modules at once.

## Phase 1 — forensic reconstruction
- token extraction
- route map
- interaction map
- shell measurements
- reference screenshots

## Phase 2 — design system and shell
- tokens
- buttons/icon buttons
- pills/chips
- menu/popover/dialog primitives
- tooltip/toast
- sidebar
- header
- route frame
- theme switch

## Phase 3 — local data engine
- normalized entities
- MobX stores
- IndexedDB persistence
- domain commands
- pending mutation queue
- mock sync action log

## Phase 4 — issues
- list
- highlight/select
- property pickers
- create issue modal/fullscreen
- issue detail
- comments/activity
- list/board display options
- board DnD

## Phase 5 — projects
- projects list
- project creation
- project overview/activity/issues
- milestones/resources/updates
- details sidebar

## Phase 6 — navigation/productivity
- command registry
- global search
- filters
- saved views
- Inbox
- My Issues
- favorites

## Phase 7 — collaboration/realtime
- GraphQL backend
- Postgres
- sync actions/checkpoints
- WebSocket
- offline retry
- Yjs editors

## Phase 8 — auth/settings
- login methods
- onboarding
- workspace/team membership
- Preferences
- permissions

## Phase 9 — Agent/Skills/Loops
- agent chat
- action/tool abstraction
- skills
- scheduled/event loops
- run history

## Phase 10 — refinement
- screenshot diff loop
- animation timings
- keyboard edge cases
- focus/a11y
- performance profiling
- responsive behavior

Do not move to the next phase while the current phase has obvious layout/interaction mismatches.

---

# 40. Strict visual/behavioral constraints

The following are non-negotiable:

1. No giant cards or excess whitespace.
2. No generic Tailwind dashboard appearance.
3. No 300–500ms animation on ordinary controls.
4. No full-page spinner for normal navigation after initial bootstrap.
5. No network-blocking status/priority/assignee changes.
6. No page reload when opening issue/project details.
7. No duplicated issue data per view.
8. No uncontrolled z-index guessing; define overlay layers.
9. No hover-induced layout shifts.
10. No modal with arbitrary 16px rounded “SaaS style” if reference uses tighter geometry.
11. No bright borders everywhere.
12. No browser-default selects; use searchable command/picker surfaces.
13. No inaccessible icon buttons.
14. No implementation that only works with mouse.
15. No board that loses state when toggling back to list.
16. No destructive action without confirmation/undo strategy where appropriate.
17. No optimistic update without failure reconciliation.
18. No hardcoded workspace/team examples throughout production logic.

---

# 41. Reference-specific measurements to use in golden tests

At 1914×992:

- desktop sidebar width: 244px
- sidebar common item: ~205×28px, x≈12px, radius 8px
- main frame begins x≈247px
- main header height: ~60px
- main header content left x≈255px
- project list row: ~48px high
- common toolbar icon buttons: 28×28px
- Agent composer icon actions: 24×24px
- Agent `Skills` chip: ~24px high
- profile onboarding buttons: 44px high
- project/issue top tabs: ~28px high
- issue right-rail property controls: ~28px high with ~32px vertical rhythm
- `Subscribe` issue button: ~32px high
- Settings `Customize` button: ~32px high
- compact settings select: ~30px high with ~8px radius

Use these as initial exact targets, then compare actual reference rendering before declaring completion.

---

# 42. Behavior timeline recovered from the supplied recording

Use the recording as a behavioral regression sequence.

Approximate sequence:

- 0–2s: Agent / New Chat state.
- early seconds: navigation through empty/history/workspace pages.
- ~7–10s: Projects list and project preview/details behavior.
- ~11–14s: Views and Loops empty states.
- ~15s onward: Trendzo team pages.
- ~21s: issue list contains `TRENDZO-37 Research Work`.
- ~22–34s: issue detail, top actions and copy actions; lower-right confirmation toasts stack.
- ~35s: return to `Trendzo > Issues`.
- ~39s: right-side Insights panel loads while issue list remains interactive.
- ~42s: Display Options popover opens over the right area with List/Board, grouping, ordering and display-property controls.
- ~44–56s: board layout shown; `In Progress` column contains Research Work; hidden columns list Backlog/Todo/Done/Canceled/Duplicate; Insights remains docked.
- ~57s: Create Issue modal opens from board.
- ~58s: title typing surfaces draft state / `Save as draft` affordance.
- ~59s: composer returns to empty state during subsequent interaction.
- ~60–62s: returns to board state.

Build an automated Playwright script that reproduces this sequence so regressions are visible.

---

# 43. Completion criteria

The app is only “done” when all of these are true:

## Visual
- shell proportions match reference at 1914×992;
- dark theme surface hierarchy matches;
- typography is dense and restrained;
- buttons/chips/menu geometry matches;
- issue/project rows feel like reference, not a generic table;
- board cards/columns match reference density;
- create issue modal matches reference structure;
- Display Options and docked Insights behavior match recording.

## Interaction
- hover highlights are instant and fade cleanly;
- popovers anchor to their triggers;
- menu-open triggers retain active state;
- keyboard navigation works everywhere described;
- list/board toggles without losing filters/selection/display settings;
- issue creation drafts survive navigation;
- property changes are optimistic;
- toast stack works;
- board DnD is smooth and reversible on failure.

## Product
- auth/onboarding works;
- workspace/team structure works;
- issues/projects/milestones/cycles/views work;
- Inbox works;
- settings/preferences persist;
- rich text works;
- search/command system works;
- permissions enforced server-side;
- Agent/Skills/Loops have real state and action paths, not decorative screens.

## Data/realtime
- IndexedDB hydration works;
- pending mutations survive reload;
- realtime changes reach another open client;
- ordered delta reconciliation works;
- offline edit/reconnect works without duplicates.

## Engineering
- no large monolithic page components;
- no proliferation of magic numbers outside tokens/reference-specific layout constants;
- strong TypeScript types;
- test suite green;
- screenshots stored for regression review;
- no console errors/warnings in core flows.

---

# 44. Final instruction to the coding agent

Do not respond with a generic plan and stop. Execute this as a reconstruction project.

Start by auditing the supplied ZIPs and screen recording. Write the evidence documents. Then implement the app phase by phase. After each phase, run the app, take Playwright screenshots at 1914×992, compare them with the supplied reference, and correct mismatches before continuing.

Where the captured HTML/CSS gives an exact value, use it. Where the video gives a directly observable state transition, reproduce it. Where current public product behavior defines an interaction but the implementation is hidden, build the simplest robust local-first implementation that produces the same user-visible outcome.

Do not invent proprietary Linear internals and do not claim that reimplemented backend code is Linear source code. The goal is an independently engineered product with a **Linear-grade interaction model and a pixel-faithful reconstruction of the supplied observable UI**.


---

# 45. Verification source manifest

The coding agent should use the supplied captures as the primary visual golden source and, when behavior is not visible, verify against the **current official Linear documentation** rather than third-party tutorials. Behavior in this specification was cross-checked on 2026-08-24 against official pages including:

- Login methods
- Security & Access
- Inbox
- My issues
- Search
- Display options
- Board layout
- Select issues
- Custom Views
- Projects
- Project overview
- Project milestones
- Project status
- Linear Agent
- Loops
- Download Linear / realtime sync and offline
- Preferences
- Assign and delegate issues

Whenever current official behavior conflicts with a static capture, preserve the **capture for geometry/visual state** and document the behavioral discrepancy before deciding which behavior the clone product wants. Never silently invent Linear internals.
