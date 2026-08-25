# Linear Docs Research: Login/Auth, Keyboard System, Inbox, Preferences
Researched 2026-08-24 from official linear.app/docs pages (plus linear.app changelog where docs point there).
Note: the old standalone `linear.app/docs/keyboard-shortcuts` page returns 404 as of Aug 2026 — shortcut documentation is now distributed across feature pages; the complete in-app list is behind `?` (help window) or Help & Feedback > Keyboard shortcuts in the sidebar.

---

## 1. LOGIN & AUTH

### Supported login methods (source: https://linear.app/docs/login-methods)
- **Google OAuth** — "Continue with Google"; works for any Google-supported email address (Gmail or Google Workspace).
- **Email login link / code** — "Continue with Email": Linear sends an email containing BOTH a magic login link AND a numeric code; user either clicks the link or pastes the code into the "Enter code" field shown on the login page after submitting their email. Docs recommend whitelisting `notifications@linear.app` and/or `pm_bounces@pm-bounces.linear.app` for delivery.
- **Passkeys** — passwordless login supported by all major browsers, mobile OSes, and password managers (1Password named). Registered from **Preferences > Account > Security & Access**; multiple devices can be registered. IMPORTANT limitation: passkeys are **not currently supported in the Linear desktop application** (source: https://linear.app/docs/security-and-access). Introduced in changelog 2024-05-30 (https://linear.app/changelog/2024-05-30-passkeys-a-fast-and-secure-way-to-log-in-to-linear).
- **SAML SSO** — Enterprise plan only. User can log in from the IdP's app portal OR by choosing "Continue with SAML SSO" on Linear's login page; SAML-approved domains are forced through the IdP (source: https://linear.app/docs/saml-and-access-control).

### Login restrictions & security (sources: login-methods, saml-and-access-control)
- Admins can **require specific login methods** for all members: **Settings > Administration > Security**. Owners/admins always retain access to any login method to prevent lockouts ("Admins and Owners may be able to log in through other methods... depending on the workspace's authentication settings").
- **IP restrictions** (Enterprise): CIDR ranges, applies to web + desktop + mobile; Settings > Administration > Security.
- SAML details: IdPs supported — Okta, Microsoft Entra ID, Google Workspace, OneLogin, LastPass, Auth0, "and most others". **SCIM 2.0** provisioning on Enterprise; SCIM-provisioned guests must sign in via that provider (no email auth). **Just-in-Time provisioning**: first successful SAML login auto-creates the user with profile data from IdP attributes. Admins can also prevent non-admins from creating new workspaces with email credentials from a claimed domain.
- **Logout behavior**: signing out in one location signs out all other sessions ("logs out all other sessions workspace-wide") (source: login-methods).
- **Sessions management** (source: https://linear.app/docs/security-and-access): Settings > Account > Security & Access lists active sessions with location + last-seen (expandable to IP address + sign-in date); revoke individual sessions or "Revoke all" (except current); inactive sessions auto-expire after 30 days. Same page: Personal API keys (with granular permission/team scoping) and Authorized OAuth applications (revocable).

### Login page flow (as documented)
1. linear.app/login: buttons for "Continue with Google", "Continue with Email", passkey login, "Continue with SAML SSO".
2. Email path: enter email → email sent → click magic link OR type/paste code into "Enter code" field.
3. After auth: if the account belongs to multiple workspaces, user picks a workspace; otherwise lands in their workspace.

### Desktop app differences (source: https://linear.app/docs/get-the-app)
- Desktop app for macOS Intel / macOS Apple Silicon / Windows (no Linux); download at linear.app/download. Mobile apps on iOS/Android (5 tabs: Home, Inbox, Create Issue, Search, Settings); PWA supported.
- Desktop advantages: native OS notifications (Safari doesn't support browser notifications), dock/taskbar unread badge, fewer shortcut conflicts with browser bindings, **tab support** inside the app.
- Web app has near-parity including offline mode; supports last 3 versions of Chrome/Firefox/Safari.
- "Open URLs in desktop app" preference makes linear.app links launch the desktop app; Linear detects the desktop app by checking localhost ports 44450, 18450, 33234.
- Desktop login: passkeys not supported in desktop app (security-and-access); docs do not further specify desktop auth flow.

### Signup & workspace-creation onboarding (sources: https://linear.app/docs/start-guide, https://linear.app/docs/workspaces)
- Signup at linear.app with work email → create a workspace for your organization. Start Guide offers video intro, interactive browser demo (sandbox), and live sessions; role-specific guidance (admin vs member).
- **Workspace creation auto-creates a default Team with the same name as the workspace.**
- **Workspace URL slug**: each workspace has a unique URL `linear.app/example`. Admins can "Update a Workspace name and URL" (Settings > Workspace > General). Docs do not enumerate slug character rules.
- Linear's philosophy: one workspace per organization (recommended); multiple workspaces per account are allowed with distinct member lists and separate billing; for work vs personal, Linear recommends separate accounts/emails.
- **Workspace deletion**: owner, Settings > Workspace > General → email confirmation code → deletion within 48h; any admin can cancel in that window. Members can "Leave workspace" (Settings > Account > Profile).

### Joining multiple workspaces & switching (sources: workspaces, invite-members, login-methods)
- Join paths: (a) email invite (Settings > Administration > Members > Invite; role + optional teams); (b) **invite link** — persistent, reusable, generated in Settings > Administration > Security, resettable ("Reset invite link"), unavailable on SAML/SCIM workspaces; (c) **approved email domains** — set in Settings > Administration > Security; matching users can join without an invite (new users see a join prompt at account creation; existing users see the workspace listed when switching); (d) SAML JIT provisioning.
- Free plan: all members are admins and can invite; paid plans: admins only by default, toggle "Allow users to send invites" in Settings > Administration > Security.
- **Switcher**: click workspace name (top-left dropdown) → hover "Switch workspace" → pick workspace or "Create or join a workspace". Keyboard: **O then W** switches workspaces. Multiple accounts can be added and toggled from the same dropdown without re-authentication.
- Email = unique account ID across all workspaces; changing it (Settings > Account > Profile, pencil icon, confirm links to old + new address) applies to every workspace using it.

---

## 2. KEYBOARD SYSTEM

Note: full canonical list lives in-app: press **?** for the shortcuts help window (changelog 2021-03-25), or sidebar Help & Feedback > Keyboard shortcuts. Below are shortcuts explicitly documented on current doc pages.

### Core (source: https://linear.app/docs/conceptual-model search snippet + select-issues)
- **C** create issue; **Cmd/Ctrl+K** command menu; **X** select; **Shift+Up/Down** or Shift+Click extend selection; **Esc** back/clear selection; **?** full shortcut list; **↑/↓ or J/K** navigate lists; **Cmd/Ctrl+Z** undo most actions.

### Navigation — G sequences ("go to")
- **G then I** — Inbox (https://linear.app/docs/inbox)
- **G then T** — Triage (https://linear.app/docs/triage)
- **G then A** — team Active issues (https://linear.app/docs/default-team-pages)
- **G then B** — team Backlog (default-team-pages)
- **G then X** — Archives (default-team-pages, delete-archive-issues)
- **G then V** — current cycle (per triage/team-pages search snippet)

### O sequences ("open")
- **O then W** — switch workspace (https://linear.app/docs/workspaces)
- **O then F** — open favorites menu (https://linear.app/docs/favorites); **Alt/Option+F** toggles favorite on focused item
- **O then T** — open Triage of another team (triage doc)
- **O then U** — open list of all users' views (https://linear.app/docs/user-views)

### Issue actions
- **S** — set status; via keyboard/command menu the issue moves to top of new board column (https://linear.app/docs/board-layout; https://linear.app/changelog/2020-05-26-setting-an-issue-s-status)
- **A** — open assignee menu ("press A when viewing or hovering over an issue") (https://linear.app/docs/assigning-issues)
- **I** — assign to self (assigning-issues)
- **P** — set priority; "select one or more issues, press P, choose a priority; use the shortcut again to change or remove it" (https://linear.app/docs/priority)
- **L** — add/apply label (https://linear.app/docs/labels)
- **Shift+S** — subscribe to issue; **Cmd/Ctrl+Shift+S** unsubscribe (https://linear.app/docs/notifications; inbox doc words it as Shift+S unsubscribe from within Inbox context)
- **Cmd/Ctrl+Shift+M** — move issue to another team (https://linear.app/docs/editing-issues)
- **Cmd/Ctrl+Delete** — delete issue (trash 30 days in Archives "Recently deleted"; restore with #) (https://linear.app/docs/delete-archive-issues)
- **Space** — Peek: tap to toggle, hold for temporary preview; arrows move between adjacent issues while peeking; Esc closes. Shows description, assignee, status, priority, cycle, labels, estimate, created/updated dates; projects show details + graph (https://linear.app/docs/peek)
- **W then O** — Work on issue menu (coding tools); **Cmd+Option+.** / **Ctrl+Alt+.** open in last-used coding tool (assigning-issues)
- Triage actions: **1** accept, **2** mark duplicate (also **M M**), **3** decline, **H** snooze (triage doc)
- Reordering (manual order): **Option/Alt+Shift+Up/Down** to top/bottom of column/list; **Option/Alt+Up/Down** incremental (select-issues, board-layout)

### Selection (https://linear.app/docs/select-issues)
- **X** select highlighted issue (repeat on others to multi-select); **Shift+Click**; hover checkbox at left edge; **Shift+Up/Down** extend range; **Cmd/Ctrl+A** select all in view; **Esc** deselect; bulk actions via Cmd/Ctrl+K or right-click context menu.

### View controls
- **Cmd/Ctrl+B** — toggle board/list layout (https://linear.app/docs/board-layout)
- **Shift+V** — open Display Options (https://linear.app/docs/display-options). Grouping (status, assignee, project, priority, cycle, label, parent, team, customer, release, SLA), sub-grouping/swimlanes, ordering (manual, priority, created/updated, due date, links), show/hide properties (ID, assignee, priority, due date, cycle, estimate, labels, PRs). Personal unless "Set as default" (workspace-wide); "Reset to default" reverts. Inbox/Triage views support ordering only.
- **T** — toggle swimlane collapse (board-layout)
- **F** — filter (conceptual-model snippet)

### Issue creation (https://linear.app/docs/creating-issues)
- **C** — issue creation modal; **V** — create issue fullscreen; **Option/Alt+C** — create from template (template picker). Drafts: client-side temp drafts; Esc/close offers save dialog; saved drafts sync across devices, kept 6 months. Also linear.new, sidebar "Create new issue" icon, email intake, API. Pre-highlighted text pre-fills the title.

### Search & command palette (https://linear.app/docs/search)
- **/** — open workspace search; also magnifying glass icon in sidebar; clock icon in top bar = recent issues. Opening search shows **recent searches and recent issues**.
- **Cmd/Ctrl+F** — quick-filter within current view (board, list, Inbox); matches exact issue IDs or title words; acts as a temporary filter.
- **Cmd/Ctrl+K** — command menu.
- **Search prefixes** (typed in command menu, letter + space): `i ` issues, `p ` projects, `u ` users, `t ` teams, `l ` labels, `f ` favorites, `d ` documents.
- Full-text search covers titles, descriptions, comments; exact ID (`LIN-123`) or shorthand (`lin123`); relevance sort prioritizes unstarted/started over backlog/completed; max 500 results; stop words excluded unless quoted; refine with Filter menu and @-mentioning teams/users/status.
- **Command palette behavior** (changelogs https://linear.app/changelog/2019-12-18-new-command-menu, https://linear.app/changelog/2019-10-07-contextual-command-menu): executes any command in a few keystrokes; commands grouped by functionality with groups **prioritized by current focus/view** (e.g., viewing cycles surfaces cycle commands first); **contextual invocation** — clicking UI elements (assignee, priority) opens the command menu anchored near the element like a dropdown while staying searchable/keyboard-controllable; works on current selection (bulk actions on multi-select).
- **Tab behavior in palette: not documented** on current doc pages — do not assert specific Tab behavior.

### Editor
- **/** in the issue editor brings up formatting options (https://linear.app/docs/editor).

---

## 3. INBOX (source: https://linear.app/docs/inbox, https://linear.app/docs/notifications)

### What generates notifications
Auto-subscribed to issues you **create, are assigned to, or are mentioned in** (comment-thread mentions subscribe you to the thread only). Notified for key events on subscribed issues: status changes (completed/canceled), priority changed to urgent, blocking-relationship changes, @mentions in comments/descriptions, assignments, new comments/replies. Manual subscribe available (Shift+S).

### Inbox mechanics & triage shortcuts
- **G then I** open Inbox; **J/K or ↑/↓** move through notifications.
- **Cmd/Ctrl+F** — filter inbox by issue title, ID, notification type, assignee, team, project, priority.
- Display options: toggle "Show snoozed" / "Show read".
- **U** — mark selected read/unread; **Option/Alt+U** — mark ALL as read.
- **Backspace/Delete** — delete selected notification; **Shift+Backspace** — delete all read notifications.
- **H** — snooze (hides until chosen time, then reappears); also right-click or command menu. (Search snippet also shows "Shift+H snooze" and "E to archive an inbox notification" from Descript guide — treat as secondary; docs page documents H.)
- **Shift+S** — unsubscribe from the issue (also top menu button or Activity feed option).
- Cap: max **2,000 open notifications** retained; older auto-removed; no archiving of inbox history.

### Notification channels (https://linear.app/docs/notifications)
Channels: Inbox (always/default), Desktop app/browser push, Mobile push, Slack (real-time DM), Email (immediate or digest batched by urgency — dropdown selector). Configured per-channel at **Settings > Account > Notifications**; green dot = channel enabled, gray = disabled; notification types toggle in groups (no per-type granularity within a group). Subscriptions listed under **My Issues > Subscribed**.

---

## 4. PREFERENCES / SETTINGS IA

### Settings structure (sources: workspaces, profile, account-preferences, members-roles docs)
- Open settings: click workspace name (top-left) → Settings. Members see personal/account sections; **admins/owners additionally see Administration** (members, billing, security, audit logs, import/export, workspace labels, integrations: GitHub/GitLab/Slack/Figma/Sentry). Owners get sensitive extras (billing, security, audit logs, exports, OAuth app approvals).
- Known paths cited in docs:
  - **Settings > Account > Profile** — avatar, full name, username, email change (pencil icon + dual confirmation), connected accounts, Leave workspace.
  - **Settings > Account > Preferences** (linear.app/settings/account/preferences) — general + interface prefs (below).
  - **Settings > Account > Security & Access** — sessions, passkeys, personal API keys, authorized applications.
  - **Settings > Account > Notifications** — channel/event config.
  - **Settings > Workspace > General** — workspace name/URL, delete workspace.
  - **Settings > Administration > Members / Security** — invites, roles, login-method restrictions, IP restrictions, approved domains, invite links.
  - **Team Settings > Triage**, **Team Settings > Issue statuses & automations** — team-level (triage responsibility, auto-archive period).

### Preferences page contents (https://linear.app/docs/account-preferences)
- **General**: default home view (any default or favorited view; used on reopen/relogin); display full names vs usernames; first day of week; convert text emoticons to emoji; comment submit key (Enter vs Cmd/Ctrl+Enter).
- **Interface & theme**: font size, pointer cursor toggle, link underlines, **theme: Light / Dark / follow system, plus custom themes** ("build your own"), 70+ community themes at linear.style.
- **Desktop app**: open URLs in desktop app, notification badges on dock icon, spell check.
- **Automations**: auto-assign self on created issues; auto-assign on move-to-started-status. (Git-related prefs live on Code & Reviews settings page.)

---

## Source index (all fetched/verified Aug 24, 2026)
- https://linear.app/docs/login-methods · /docs/security-and-access · /docs/saml-and-access-control · /docs/scim
- https://linear.app/docs/workspaces · /docs/start-guide · /docs/invite-members · /docs/adding-and-managing-members · /docs/members-roles · /docs/profile
- https://linear.app/docs/get-the-app · /docs/account-preferences · /docs/notifications · /docs/inbox
- https://linear.app/docs/search · /docs/select-issues · /docs/board-layout · /docs/display-options · /docs/peek · /docs/creating-issues · /docs/editing-issues · /docs/assigning-issues · /docs/priority · /docs/labels · /docs/triage · /docs/default-team-pages · /docs/delete-archive-issues · /docs/favorites · /docs/user-views · /docs/editor
- Changelogs: /changelog/2021-03-25-keyboard-shortcuts-help · /changelog/2024-05-30-passkeys · /changelog/2019-12-18-new-command-menu · /changelog/2019-10-07-contextual-command-menu · /changelog/2020-05-26-setting-an-issue-s-status
- 404 as of Aug 2026: https://linear.app/docs/keyboard-shortcuts (full list now in-app via `?`)
