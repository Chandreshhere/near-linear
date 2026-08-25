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

Nothing else to configure. The workspace seeds itself from fixtures on first
load and persists to IndexedDB.

| Route | What it is |
|---|---|
| `/` | Marketing landing page |
| `/login` | Sign-in (email code, plus provider seams) |
| `/synquic-labs/agent` | The app — agent chat is the default home view |
| `/dev/primitives` | UI primitive gallery |
| `/dev/data` | Sync-engine inspector |

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
              ├── LocalTransport   default — fixtures + BroadcastChannel
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
| `src/lib/data` | The local-first engine (store, persistence, queue, transports) |
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
