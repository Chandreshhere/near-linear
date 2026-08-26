# Synquic — a product-development workspace

A working, local-first product-development app (issues, projects, cycles,
triage, inbox, agent, loops) plus its marketing landing page — built with
Next.js 16, React 19 and TypeScript.

It runs **standalone with no backend**: data lives in the browser
(MobX object pool + IndexedDB), writes are optimistic and durable, and two
browser tabs stay in sync in real time. A single `SyncTransport` seam is the
one place a real backend plugs in — see **[BACKEND_API.md](BACKEND_API.md)**.

## Quick start

```bash
npm install
npm run dev          # http://localhost:3000
```

Nothing else to configure.

**First run is genuinely empty.** A new browser lands on the marketing page,
signs in, and onboarding asks it to create a workspace: the name becomes a real
`Workspace` row, the URL becomes both the route prefix and the IndexedDB
database, and a first team named after the workspace is created with its
identifier and the six default workflow statuses. Nothing is seeded, and two
browsers never see each other's data.

| Route | What it is |
|---|---|
| `/` | Marketing landing page |
| `/login` | Sign-in (email code, plus provider seams) |
| `/app` | Entry point — resolves to your workspace, onboarding, or login |
| `/onboarding/workspace` | Create a workspace (+ its first team) |
| `/<your-workspace>/agent` | The app — agent chat is the default home view |
| `/dev/primitives` | UI primitive gallery |
| `/dev/data` | Sync-engine inspector (active workspace) |

## Demo data

The sample workspace used for screenshots and tests (10 projects, issues,
cycles, a triage queue) is **opt-in**. Two ways in:

```
http://localhost:3000/app?demo=1     # creates/opens the demo workspace
http://localhost:3000/?demo=1        # same, from the landing page
```

or, inside any workspace, **Settings → Preferences → Workspace data →
"Load demo data"**, which merges the sample data into the workspace you are
already in without touching its name or your preferences. The same section has
**"Reset workspace"**, which wipes this browser's copy (IndexedDB +
`linearAuth` / `linearOnboarding` / `linearWorkspace` / `linearWorkspaces`) and
returns you to onboarding. Both are behind confirm dialogs.

> The dev-only HTTP mock (`src/server/syncStore.ts`) still seeds fixtures into
> its in-memory store on boot. It is server-side, never in the client bundle,
> and only reachable with `NEXT_PUBLIC_SYNC_TRANSPORT=http`.

Local state lives under four `localStorage` keys: `linearAuth` (session),
`linearOnboarding` (progress), `linearWorkspace` (active slug) and
`linearWorkspaces` (every workspace this browser created). Each workspace slug
maps to its own IndexedDB database, `linear_recon_<slug>`.

## What's in it

**Issues** — grouped lists and a drag-and-drop board (with hidden columns),
property pickers, multi-select with bulk actions, filters that encode into the
URL, display options, sub-issues, reactions, attachments, comments, activity
feed, and a keyboard-first interaction model (`C`, `S`, `P`, `A`, `L`, `X`,
`Space` to peek, `G`-sequences to navigate, `⌘K` command palette).

**Projects** — a subgrid table, project overview with milestones, health
updates, resources and a details rail, plus per-view filters and insights.

**Also** — cycles with a progress graph, triage inbox, notification inbox,
custom views, favorites, an agent that genuinely creates and edits work,
skills, loops with run history, integrations (channel → team routing that
turns a chat message into a real issue), and a full settings surface.

## Architecture

```
UI (React, MobX observers)
  └── SyncClient ── TransactionQueue (optimistic, durable, retrying)
        ├── SyncStore        in-memory object pool
        ├── Persistence      IndexedDB (rows, meta, transaction queue)
        └── SyncTransport ←─ the ONLY seam that can touch a network
              ├── LocalTransport   default — IndexedDB + BroadcastChannel
              └── HttpTransport    REST + SSE (your backend)
```

Every write applies instantly in memory, persists to a durable queue, and is
reconciled when its delta echoes back. Reload, restart and offline are all
survivable by design.

## Connecting a backend

```bash
NEXT_PUBLIC_SYNC_TRANSPORT=http
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

Your service implements three endpoints (bootstrap, mutation, event stream).
The complete contract — payload schemas, ordering guarantees, conflict
semantics, auth seams, the integrations webhook, and a conformance checklist —
is in **[BACKEND_API.md](BACKEND_API.md)**.

> The `src/app/api/sync/*` routes are a **dev-only mock** of that contract.
> They are disabled when `NODE_ENV=production`.

## AI & integrations

Two server routes let something outside the browser act on a workspace.

**MCP server** — `POST /api/mcp` is a real [Model Context Protocol](https://modelcontextprotocol.io)
server over Streamable HTTP, built on the official TypeScript SDK. Nine tools: `list_teams`,
`list_projects`, `list_issues`, `get_issue`, `search_issues`, `create_issue`, `update_issue`,
`add_comment`, `create_project`. Point Claude Desktop or Cursor at it:

```json
{
  "mcpServers": {
    "synquic": {
      "url": "http://localhost:3000/api/mcp",
      "headers": { "Authorization": "Bearer <MCP_TOKEN>" }
    }
  }
}
```

**Chat webhook** — `POST /api/integrations/inbound` turns a Slack/Teams message into a real issue:
HMAC signature check, channel→team routing, task extraction (`/task Fix login priority high assign
me`), `202 { accepted: true, identifier: "TRENDZO-41" }`, and `messageId` de-duplication so a
provider retry cannot create a second issue.

> **What they operate on.** This app is local-first: your workspace lives in *your browser's*
> IndexedDB, which no server route can reach. Both routes read and write the server-side store
> (`src/server/syncStore.ts`) — so they are end-to-end real when the app runs with
> `NEXT_PUBLIC_SYNC_TRANSPORT=http`, and become correct automatically once a real backend is wired
> in. Under the default local transport they work against the server's copy of the workspace rather
> than the tab you have open.

Set `MCP_TOKEN` and `INTEGRATIONS_SIGNING_SECRET` on any deployment — see
**[.env.example](.env.example)**. Full reference:
**[BACKEND_API.md §11 (MCP)](BACKEND_API.md#11-mcp-server)** and
**[§7 (webhook)](BACKEND_API.md#7-integrations-webhook-contract)**. Settings → Integrations shows
the live endpoint URLs, a copy-paste client config and the tool list.

## Scripts

```bash
npm run dev        # dev server
npm run build      # production build
npm start          # serve the build
npx tsc --noEmit   # typecheck
```

## Repository map

| Path | Contents |
|---|---|
| `src/app/(app)` | The application routes |
| `src/app/(marketing)` | Landing page |
| `src/components` | UI primitives and feature surfaces |
| `src/lib/data` | The local-first engine (store, persistence, queue, transports) + opt-in demo data |
| `src/lib/workspace` | Workspace creation, the local workspace registry, team helpers |
| `src/app/api` | MCP server, chat webhook, and the dev-only sync mock |
| `src/server` | Server-side store, MCP tools, webhook routing rules |
| `BACKEND_API.md` | Backend contract |
| `PROGRESS.md` | Build log, decisions and known seams |
| `docs/analysis` | Design-reference research notes |

## Notes

This is an independently written implementation. It is informed by studying
how a well-known issue tracker behaves, but ships no third-party source,
branding, logos or marketing copy. Design-reference captures used during
development are intentionally excluded from version control.

Nine points in the app are marked `BACKEND SEAM` — things that genuinely
require a server (delivering email, verifying a login code, revoking other
sessions, OAuth for connectors, push/Slack/SMTP delivery). Each has complete
UI in front of it and is listed in `BACKEND_API.md`.
