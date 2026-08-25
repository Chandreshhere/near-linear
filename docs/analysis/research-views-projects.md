# Linear Official Docs Research — Issues, Views, Projects, Cycles, Triage
Researched 2026-08-24 against linear.app/docs (current official documentation). All facts below are cited to the docs page they came from.

---

## 1. ISSUES

### 1.1 Creating issues — https://linear.app/docs/creating-issues
- **Shortcuts**: `C` opens the issue creation modal; `V` launches full-screen creation mode; `Option/Alt + C` opens creation with the template picker; issues can also be created from `Cmd/Ctrl+K` command menu, the "Create new issue" (pencil/plus) icon in the upper-left of the app, or by visiting `https://linear.new`.
- **Column "+"**: On boards, a `+` sign at the top of each column creates an issue directly in that column/status (see Board layout, §2.4).
- **Required fields**: an issue must have a **team**, a **title**, and a **status**. Everything else (assignee, estimate, priority, labels, cycle, project, due date, etc.) is optional.
- **Modal anatomy**: title, description (markdown editor), property pill buttons (status, priority, assignee, labels, project, cycle, estimate…), a `…` overflow menu for extras (e.g. due date, "Make recurring…", Set SLA), a team selector, and Save/Create controls. Highlighted text on screen pre-fills the title when you press `C`.
- **Drafts / "Save as draft"**: Linear auto-saves a temporary draft locally if you navigate away mid-composition. Pressing `Esc` or closing the modal manually triggers a dialog offering to **save the issue as a draft**. Saved drafts appear in a **Drafts** section in the sidebar and "are stored for 6 months before being deleted automatically."
- **Default status**: the first Backlog status is the team default for new issues (changeable — see §1.3); the creator can override status in the modal.
- **Activity-log grace period**: property changes made "in the first 3 minutes" of an issue's life count as part of creation and are not logged in the activity feed.
- **Create by email**: teams can enable an intake email address (Settings > Your teams > General > Create issues by email); 25 MB attachment limit.

### 1.2 Templates — https://linear.app/docs/issue-templates
- Two kinds: **standard templates** (workspace-level or team-level) and **form templates** (structured intake forms with text fields, dropdowns, checkboxes, date pickers, instructions, plus property fields).
- Templates can pre-fill: title, description (including placeholder text), **team, status, priority, assignee, delegated agent, project, labels, estimate, and sub-issues**. Workspace templates cannot preset team-specific properties (team labels, statuses); team templates can, and inherit to sub-teams.
- Apply at creation via `Option/Alt + C` or the **Template** selector in the creation modal. Sub-issues cannot be created from templates that themselves contain sub-issues.
- Teams can set **default templates** that auto-apply, with separate defaults for team members vs non-members ("Form templates are only available as default templates for non-team members"). Issues remain filterable by originating template.

### 1.3 Statuses / workflows — https://linear.app/docs/configuring-workflows
- Status **categories**, in fixed order: **Triage, Backlog, Unstarted (typically "Todo"), Started (typically "In Progress"), Completed (typically "Done"), Canceled**, plus a system-managed **Duplicate** status auto-applied when issues are merged as duplicates (cannot be renamed or customized).
- Configured per team at Settings → Teams → Issue statuses. Each status has a custom name, color, and description. Teams may add or remove statuses but must keep **at least one status per category**; statuses reorder by drag within a category; category order itself is fixed.
- Multiple statuses per category are common (Linear's own team uses "In Progress, In Review, Ready to Merge" under Started).
- **Default status** for new issues = first Backlog status; change by hovering a Backlog/Todo status and choosing "Make default."

### 1.4 Priorities — https://linear.app/docs/priority
- Five levels: **No priority, Low, Medium, High, Urgent**. Deliberately not customizable ("too many options makes it harder to set priority"); recommended workarounds are extra statuses or labels.
- Set with `P` on one or more selected issues; press again to change/remove.
- In priority-ordered views, drag-and-drop reorders items **within** priority; "the exact position will be saved globally across your workspace" so everyone sees the same relative order. No-priority items sort last.
- **Urgent** notifies the assignee (plus an urgent email if email notifications are on).

### 1.5 Labels — https://linear.app/docs/labels
- **Workspace labels** (all teams; e.g. "Bug") vs **team labels** (team-scoped). Sub-teams inherit parent-team labels.
- **Label groups**: hierarchy container; you apply individual labels *from* the group, never the group itself; **"Only one label from a given label group can be applied to an issue at a time"** (not multi-selectable); groups limited to 250 labels. Create group+label in one step with `Group/label` or `Group:label` syntax (e.g. "Type/Bug").
- Apply with `L` on an issue, or via the Labels field in the right sidebar. Labels have name, color, description; can be archived (kept on existing issues, blocked for future use) or deleted (irreversible). Bulk label management via multi-select + right-click (move, re-scope, merge).
- Cross-team filtering: same-named team labels act like one label in multi-team views/search.
- Reserved label names: assignee, cycle, effort, estimate, hours, priority, project, state, status.

### 1.6 Estimates — https://linear.app/docs/estimates
- Per-team feature: Team Settings > General > Estimates. Scales: **Exponential** (1,2,4,8,16), **Fibonacci** (1,2,3,5,8), **Linear** (1–5), **T-shirt** (XS–XL, mapped to Fibonacci values internally). "Extended" option adds two higher values (e.g. 32/64, 13/21, 6/7, XXL/XXXL).
- Options: allow **zero estimates** (explicit 0 ≠ unestimated); unestimated issues **default to 1 point** for stats (can be disabled); sub-teams can inherit settings.
- Set with `Shift+E`. Estimates feed cycle and project graphs/statistics. Filter with `F` → estimate.

### 1.7 Due dates — https://linear.app/docs/due-dates
- Set with `Shift+D` (or `…` menu in the creation modal). Calendar icon colors: **red** = due today/overdue, **orange** = due within a week, gray otherwise; hover shows exact date and days remaining/elapsed. Enable the Due date property in Display Options if icons don't show.
- Optional personal notifications when a due date nears / passes. Filter by Overdue, 1 day/1 week/3 months away, custom, or no due date; list views can sort by due date.
- **Mutually exclusive with SLAs**: "An issue may use either due dates or an SLA, but not both" — applying an SLA replaces a due date.

### 1.8 SLAs — https://linear.app/docs/sla
- **Business & Enterprise plans only.** Configured at Settings > Issues > SLAs; rules evaluated top-down, first match wins. Default rules: Urgent → 24h SLA; High → 1-week SLA; Medium/Low/No priority → remove SLA. Rules can filter on Team, Status, Assignee, Creator, Priority, Labels, Project, Project Status, Initiative. Manual "Set SLA" via `…` menu.
- Indicator: **fire icon** progressing gray → yellow → orange → red. Six SLA states: Low risk (>1 week), Medium risk (<1 week), High risk (<1 day), Breached, Achieved, Failed. Durations 12h–4 weeks, incl. business-day variants.

### 1.9 Relations — https://linear.app/docs/issue-relations
- Types: **Related**, **Blocked by**, **Blocking**, **Duplicate (of)**.
- Shortcuts: `M` then `R` = related; `M` then `B` = blocked by; `M` then `X` = blocking; also via `Cmd/Ctrl+K`, the issue `…` menu, or right-click contextual menus in lists/boards. Referencing an issue ID in a description/comment auto-links it.
- Visuals: relations listed in the issue sidebar; **orange flag** on issues blocked by other work, **red flag** on issues blocking other work (visible on list/board items). When a blocker completes, the relation auto-downgrades to Related.
- **Duplicates**: "Merge duplicate of…" marks the current issue as duplicate, applies the reserved **Duplicate** status (Canceled category), moves attachments, and shows a banner linking to the canonical issue.

### 1.10 Sub-issues — https://linear.app/docs/parent-and-sub-issues
- Create via `+ Add sub-issues` under the parent's description, command-menu "Create sub-issue", or `Cmd/Ctrl+Shift+O`. Convert comments, list items (bullets/checklists), or selected text into sub-issues with the same shortcut; paste a list of titles to create several at once.
- After saving one sub-issue the editor reopens for the next; `Cmd/Ctrl+Shift+Enter` (or Shift-click Save) carries over properties; `Esc` exits.
- Inheritance: team, priority, project inherited from parent; assignee inherited conditionally; cycle inherited if created in an active status; **labels are NOT inherited**.
- Optional team automations: parent auto-closes when all sub-issues are done; sub-issues auto-close when parent is done.
- Display: parent rows can expand to show sub-issues; Display Options toggles sub-issue visibility; filters exist for top-level only / has-sub-issues / sub-issues only; "Always hide completed sub-issues" toggle. Convert parent to project via `…` → "Convert to project".

### 1.11 Issue IDs — https://linear.app/docs/creating-issues, https://linear.app/docs/search, https://linear.app/docs/teams
- Every issue gets an ID of the form `<TEAM-IDENTIFIER>-<number>` (e.g. `ENG-123`, `LIN-123`): team identifier prefix + sequential per-team number. The identifier is set in Team Settings > General ("Customize team name and team identifier"). Search accepts exact IDs (`LIN-123`) or shorthand (`lin123`). Issue lists can be shared by comma-separated IDs in URLs (`/issues/ENG-123,ENG-456` — custom-views doc).

### 1.12 Editor / markdown — https://linear.app/docs/editor
- Markdown auto-converts to rich text: bold/italic/strikethrough/underline/inline code; headings H1–H4; bulleted, numbered, and check-lists; blockquotes; horizontal dividers; code blocks with syntax highlighting; **tables** (`|--` or `/table`); **collapsible sections**; **Mermaid diagrams**.
- `/` slash commands (code blocks, diagrams, collapsible sections, tables, dates, file insertion); selection popup toolbar; `Shift+Enter` line break; `Cmd/Ctrl+B` bold, `Cmd/Ctrl+K` link, etc.
- `@`-mentions for users, issues, projects, dates, documents; `@ENG-123` style references create issue relations; `:emoji:` syntax; file attachments via `/file`; auto-embeds for YouTube, Loom, Descript, Figma.

---

## 2. VIEWS

### 2.1 List vs Board — https://linear.app/docs/display-options, https://linear.app/docs/board-layout
- `Cmd/Ctrl+B` toggles list ↔ board on issue views; also via the layout icons next to Display options. Project/initiative views additionally support timeline layout.

### 2.2 Display options (`Shift+V`) — https://linear.app/docs/display-options
- Open with **`Shift+V`**, the Display-options button top-right of the view, or command menu "Show display options".
- **Grouping** (issues): status, assignee, project, priority, cycle, label, parent issue, team, customer, release, SLA status; "Focus" grouping in My Issues. **Grouping** (projects/initiatives): lead, member, status, health, start date, target date, and (projects) initiative.
- **Ordering**: manual, status, priority, created, updated, due date, link count; most views can reverse order. Manual reordering saves workspace-wide.
- **Sub-grouping**: "available in lists and boards (as rows)" — on boards this produces **swimlanes** with sticky headers.
- **Display properties**: per-view toggles for ID (Priority), status, assignee, priority, SLA, project, due date, milestone, cycle, release, estimate, labels, links, etc.
- Extra toggles: show/hide **sub-issues**, show **empty groups**, completed-issue/project timeframe filters.
- Persistence: personal display options auto-save per view; **"Set as default"** pushes the configuration workspace-wide; "Reset to default" reverts.

### 2.3 Filtering — https://linear.app/docs/filters
- Press **`F`** (or click Filter) to add filters; applied filters render as **chips in a filter bar** under the view header; each chip = **property + operator + value**, each segment independently clickable/editable (property type itself can't be swapped in place). Filters update the view live and encode into the URL for sharing.
- Properties: assignee, status, labels, project, cycle, team, priority, creator, subscribers, relations, dates, links, milestones, estimates, SLA, template, etc. Type-ahead quick search inside the filter menu.
- **Operators** vary by type: "is / is not" (single), "is either of / is not" (multi), "includes any / all / neither / none" (labels, links), "before / after" (dates). Selecting multiple values auto-switches the operator.
- **Advanced filters**: grouped conditions with AND/OR logic and nested filter groups; plus AI natural-language filtering ("what issues are due next week").
- Saving: once ≥1 filter is applied, save the filter set as a **custom view** (`Option/Alt+V` or the Save-view icon) — see §2.5.

### 2.4 Board specifics — https://linear.app/docs/board-layout
- Columns default to **status** grouping; alternatives: project, priority, cycle, label, label group, SLA status. When grouped by status, "board views are always ordered with statuses from first to last."
- **Drag & drop across columns changes the grouped property** (e.g. status). `S` (status shortcut) drops the issue at the **top** of the target column; mouse drag respects the exact drop position. `Option/Alt+Shift+↑/↓` sends selected issues to column top/bottom.
- `+` at the top of a column creates an issue pre-set to that column's value.
- **Hidden columns**: hide a column via its `…` menu; hidden columns collapse into a **rightmost hidden area**; you can "drag issues into hidden columns without having to unhide them."
- **Swimlanes**: row-based sub-grouping (by assignee, cycle, team, etc.); `T` toggles swimlane expansion. `Space` peeks at a card's details; descriptions are never shown on cards.

### 2.5 Custom views — https://linear.app/docs/custom-views
- Create from the sidebar **Views** page (choose Issue / Project / Initiative type → "New view") or save the current filters with **`Option/Alt+V`** / Save-view icon.
- Scopes: **workspace views**, **team views** (team/project/initiative-scoped), and multi-team "All teams" views. Views page lists them under Workspace views / Team views.
- Each view has a name, description, **icon + color**, and an **owner** (defaults to creator, reassignable). Views can be favorited (starred → sidebar; can even be a default homepage), edited ("Edit view…"), duplicated, and shared by link ("sharing a link does not automatically give anyone access… it must be shared first").
- View-level subscriptions: notify (personally or to Slack) on issues added/completed/canceled.
- Teams ship default views: **All Issues**, **Active**, **Backlog** (+ contextual custom views).

### 2.6 Multi-select & bulk actions — https://linear.app/docs/select-issues
- Select: `X` on the highlighted issue, `Shift+Click`, hover-left-edge checkbox, `Shift+↑/↓` to extend, `Cmd/Ctrl+A` to select all (post-filter). Navigate with `↑/↓` or `J/K`. **`Esc` deselects all.**
- Act on selection via `Cmd/Ctrl+K`, right-click contextual menu, or the **bulk-actions toolbar that appears at the bottom**; bulk operations include status, priority, assignee, labels, project/cycle moves, etc.
- With no grouping + manual ordering, move selected issues with `Option/Alt+arrows`.

---

## 3. PROJECTS

### 3.1 Basics & fields — https://linear.app/docs/projects
- A project = a unit of work with "a clear outcome or planned completion date," made of issues + optional documents; can **span multiple teams** (tabs toggle all-issues vs per-team issues).
- Properties: **name (required)**, summary, icon+color, **status**, **priority** (https://linear.app/docs/project-priority), **lead** (single), **members**, **teams**, **start date & target date** (granularity: year, half, quarter, month, or exact day), **initiatives**, **labels** (https://linear.app/docs/project-labels), **milestones**, dependencies, and health via updates.
- Created via `+` in a workspace or team Projects view. Deletion → team archive for 30 days, then permanent.
- `Cmd/Ctrl+I` toggles the project details sidebar. A **project graph** shows scope, velocity, progress over time and a completion prediction when dates are set.

### 3.2 Project statuses — https://linear.app/docs/project-status
- Five fixed categories: **Backlog, Planned, In Progress, Completed, Canceled** (no "Paused" category in current docs). Workspaces can add custom statuses (name, description, color) per category at Settings → Projects → Statuses.
- Status changes are **manual** — "we do not do this automatically, even if all issues are completed." Completed/Canceled + no unarchived issues + inactivity ⇒ auto-archival.

### 3.3 Overview tab — https://linear.app/docs/project-overview
- Anatomy: short **summary** field; long-form **description that works like a document** (full markdown editor, mentions, issue links, **inline comments**); **Resources** (external links with custom labels + Linear documents, https://linear.app/docs/project-documents); **Milestones list** (reorderable, with names/dates/descriptions); properties sidebar (status, lead, teams, dates, members, milestone); latest **project update** pinned on Overview.
- Project tabs include **Overview**, **Issues**, and **Updates** (all prior updates chronologically, with property-change history — initiative-and-project-updates doc); docs live under Resources.

### 3.4 Milestones — https://linear.app/docs/project-milestones
- Created on the Overview (under description), via the details pane `+`, or `Cmd/Ctrl+K`. Dates optional; editable by clicking, or by right-click/drag on the timeline.
- Assign issues with **`Shift+M`**, command-menu "Add to milestone," or drag onto the milestone; milestone auto-suggested when creating issues in a milestone-bearing project.
- Each milestone shows a **completion percentage**; **diamond icon** changes with completion state; the milestone currently being worked toward is **yellow**. Group/filter by milestone in issue views.

### 3.5 Updates & health — https://linear.app/docs/initiative-and-project-updates
- A project update = **health indicator** (**On track** green / **At risk** yellow / **Off track** red; gray = no update yet) + rich-text body (formatting + file uploads).
- First update posted by the lead/owner; then any workspace member can post. Latest update shows on Overview; history in the **Updates tab**; auto-posts to configured **Slack** channels; optional Inbox delivery.
- **Reminder schedules** set by admins in workspace settings (daily / weekly / biweekly, custom timing); leads get follow-up nudges after 1 and 2 working days; per-project override via the bell icon. Emoji reactions + threaded comments (bidirectional Slack sync).

### 3.6 Projects list pages & grouping — https://linear.app/docs/projects, https://linear.app/docs/display-options
- Each team has a **Projects page** (list, board, or timeline layout); a workspace-level Projects page shows all projects. Project views group by **lead, member, status, health, start date, target date, initiative**; order manually or by status/priority/updated/created. Project custom views supported (§2.5).

### 3.7 Initiatives — https://linear.app/docs/initiatives
- Initiatives group projects around company objectives for high-level planning; enabled in Settings. Team initiatives on Business+; initiative custom views Enterprise-only.
- Properties: **status (Proposed, Planned, Active, Completed, Canceled)**, priority, **owner**, lead team, target date, labels, description, resources. Health rolls up per-update; per-project colored dots (green/yellow/red/gray) show each project's latest health. **Sub-initiatives** supported. Visible to all members except guests; private team initiatives restricted.

---

## 4. CYCLES — https://linear.app/docs/use-cycles
- Per-team; enable at Team Settings > Cycles. Config: **duration 1–8 weeks**, start day (cycle starts 12:01 AM team timezone), optional **cooldown** between cycles ("Issues cannot be assigned to a cooldown"), and up to **15 upcoming cycles** created ahead.
- **Auto-add rule**: optionally, issues moved to Started/Completed statuses without a cycle are auto-added to the **active cycle** (cooldown behavior configurable: move to backlog vs keep).
- **Rollover**: unfinished issues "generally roll over automatically" to the next cycle; issues moved to backlog/triage/canceled/completed during cooldown do not carry over. Issues completed after a cycle closes can be re-attributed to it.
- **Capacity**: upcoming cycles show a capacity dial based on the velocity of the previous three completed cycles (or team size initially).
- **Cycle pages/graph**: the Cycles page lists cycles; a cycle's page shows a **graph of scope and effort over time** plus stats (percentage completed, total effort). Cycles are numbered sequentially (may be renamed). Calendar subscription (Google Calendar / .ics). Future cycle dates adjustable; cycles can be started early via the `…` menu. (Docs do not spell out a "Shift+C" shortcut on this page; issues are assigned to cycles via the cycle property / command menu.)

---

## 5. TRIAGE — https://linear.app/docs/triage
- A per-team **inbox for incoming issues**, enabled at Team Settings > Triage; appears in the sidebar under the team. Navigate with `G T` (or `O T` from another team view).
- Lands in Triage: issues from **integrations** (Slack, Sentry, Zendesk, Intercom, Asks, etc.), issues **created by members outside the team**, and issues created while viewing Triage. Default templates can override routing.
- Actions & shortcuts: **Accept = `1`** (→ team default status, optional comment); **Mark as duplicate = `2`** (or `M M`; merges into canonical issue, moves attachments); **Decline = `3`** (→ Canceled, optional comment); **Snooze = `H`** (hide until a time or new activity).
- **Responsibility**: pick members to be notified/auto-assigned for new triage issues; first-responder rotations via PagerDuty, Opsgenie, Rootly, incident.io; custom schedules via API.
- **Triage Rules** (Business/Enterprise): condition→action automations (set team, status, assignee, labels, project, priority), evaluated top-down. **Triage Intelligence** (AI) suggests properties and flags likely duplicates.

---

## Source index
- https://linear.app/docs/creating-issues · /issue-templates · /configuring-workflows · /priority · /labels · /estimates · /due-dates · /sla · /issue-relations · /parent-and-sub-issues · /editor · /search · /teams
- https://linear.app/docs/display-options · /filters · /board-layout · /custom-views · /select-issues
- https://linear.app/docs/projects · /project-status · /project-overview · /project-milestones · /initiative-and-project-updates · /project-documents · /project-labels · /project-priority · /initiatives
- https://linear.app/docs/use-cycles · https://linear.app/docs/triage
