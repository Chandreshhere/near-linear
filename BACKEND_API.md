# BACKEND_API.md

**The contract your backend must implement to replace this app's local-only mode.**

Audience: a backend engineer who has never seen this repo. Everything below is derived from the
code in this repository as it stands today; each claim cites `path:symbol` so you can jump to the
source. Nothing here requires changing the frontend.

- Schema version: **`SCHEMA_VERSION = 7`** (`src/lib/data/types.ts:449`)
- Models: **18** (`src/lib/data/types.ts:MODEL_NAMES`)
- Transport seam: `src/lib/data/transport.ts:SyncTransport`
- Reference HTTP client: `src/lib/data/transports/http.ts:HttpTransport`
- Reference server (dev-only mock): `src/server/syncStore.ts` + `src/app/api/sync/*/route.ts`

> **Line numbers move.** Every `file.ts:NNN` below was verified against the working tree at
> `SCHEMA_VERSION 7`. Symbol names (`file.ts:someSymbol`) are stable; if a line number looks off,
> trust the symbol and `grep`. Where this document and `MASTER_PROMPT.md` / `PROGRESS.md`
> disagree, **this document wins** — see [Appendix C](#appendix-c--where-the-older-docs-disagree-with-the-code).

---

## Table of contents

1. [Overview](#1-overview)
2. [Quick start](#2-quick-start)
3. [Endpoint reference](#3-endpoint-reference)
4. [Data model reference](#4-data-model-reference)
5. [Sync protocol](#5-sync-protocol)
6. [Auth contract](#6-auth-contract)
7. [Integrations webhook contract](#7-integrations-webhook-contract)
8. [Permissions & multi-user](#8-permissions--multi-user)
9. [Migration & versioning](#9-migration--versioning)
10. [Conformance checklist](#10-conformance-checklist)
- [Appendix A — file map](#appendix-a--file-map)
- [Appendix B — the whole contract in TypeScript](#appendix-b--the-whole-contract-in-typescript)
- [Appendix C — where the older docs disagree with the code](#appendix-c--where-the-older-docs-disagree-with-the-code)

---

## 1. Overview

### 1.1 How the client works

This is a **local-first** app. The UI never talks to a network directly. It reads from an
in-memory MobX object pool, writes optimistically, and persists everything to IndexedDB. A single
narrow interface — `SyncTransport` — is the only thing in the codebase permitted to touch a
network.

Four layers, bottom-up:

| Layer | File | Responsibility |
|---|---|---|
| Object pool | `src/lib/data/store.ts:SyncStore` | One observable `Map` per model. The UI reads *only* here. Upserts merge field-by-field (`store.ts:mergeInto`) so MobX reactions stay granular. |
| Durable mirror | `src/lib/data/persistence.ts:Persistence` | IndexedDB database `linear_recon_<workspaceSlug>` (`persistence.ts:DB_PREFIX`), one object store per model plus `_meta` and `_transaction`. |
| Optimistic queue | `src/lib/data/transactions.ts:TransactionQueue` | Applies each edit instantly, persists a `TransactionData` durably, batches per event-loop tick, submits, retries with backoff, rolls back rejections. |
| Facade | `src/lib/data/SyncClient.ts:SyncClient` | Boots the above, selects the transport, applies deltas, keeps `lastSyncId`. One instance per workspace, anchored on `globalThis` so it survives Fast Refresh. |

Today the default transport is `LocalTransport` (`src/lib/data/transports/local.ts`), which is a
**complete sync authority running inside the browser**: fixtures seed IndexedDB on first run,
mutations are validated and applied locally, sync ids come from a persisted counter allocated
inside the same IndexedDB readwrite transaction, and other tabs stay in realtime sync over
`BroadcastChannel("linear-recon-sync")`. With no `.env` file at all the app boots to `ready`
offline, with zero network calls (`.env.example:3-4, 9-15`).

Your job is to replace that authority with a server.

> **On the mock under `src/app/api/sync/*`.** It is "dev-only" by *convention* — every one of the
> four route files carries a `⚠️ DEV-ONLY MOCK` header, and the shipped app never calls them
> because the default transport is `local`. But there is **no `NODE_ENV` guard**: they compile
> into a production build and will serve anyone who requests them. Delete the routes (and
> `src/server/syncStore.ts`) once your backend is live, or gate them.

### 1.2 The single seam

```ts
// src/lib/data/transport.ts
export type TransportStatus = "connecting" | "open" | "closed";

export interface BootstrapPayload {
  rows: { model: ModelName; data: AnyModelData }[];
  lastSyncId: number;
  schemaVersion: number;
}

export interface SyncTransport {
  readonly name: string;
  bootstrap(): Promise<BootstrapPayload>;
  submit(req: MutationRequest): Promise<MutationResponse>;
  subscribe(
    since: number,
    onAction: (a: SyncAction) => void,
    onStatus?: (s: TransportStatus) => void,
  ): () => void;   // returns unsubscribe
}
```

That is the whole contract. Three methods.

### 1.3 Two ways to integrate

**Option A — implement the HTTP contract (recommended).** Stand up three endpoints matching
§3, set two env vars, ship. Zero frontend changes. `HttpTransport`
(`src/lib/data/transports/http.ts`) already speaks it.

**Option B — write a custom `SyncTransport`.** If your backend speaks GraphQL, gRPC-web,
WebSocket, Supabase Realtime, Firestore, or anything else, implement the three-method interface
above and register it in `src/lib/data/SyncClient.ts:createTransport`. Everything above the seam
(pool, IndexedDB, optimistic queue, meta bookkeeping) is unchanged. `http.ts` is a 153-line
worked example; `local.ts` is a second, very different one.

The ordering/idempotency guarantees in §5 apply to **both** options — they are properties the
client depends on, not properties of HTTP.

### 1.4 Architecture

```
 ┌──────────────────────────── browser ──────────────────────────────┐
 │                                                                   │
 │   React views (observer components)                               │
 │        │ read                          │ write                    │
 │        ▼                                ▼                         │
 │   SyncStore (MobX pool)  ◄────┐    TransactionQueue               │
 │   src/lib/data/store.ts       │    src/lib/data/transactions.ts   │
 │        │                      │         │                         │
 │        │ hydrate              │ apply   │ batch (per tick)        │
 │        ▼                      │ delta   ▼                         │
 │   Persistence (IndexedDB) ────┘    SyncClient (facade)            │
 │   linear_recon_<slug>              src/lib/data/SyncClient.ts     │
 │     models + _meta + _transaction        │                        │
 │                                          ▼                        │
 │                          ╔═══════════ THE SEAM ═══════════╗       │
 │                          ║  SyncTransport                 ║       │
 │                          ║  src/lib/data/transport.ts     ║       │
 │                          ╚═╤══════════════════════════╤═══╝       │
 └────────────────────────────┼──────────────────────────┼───────────┘
                              │                          │
              NEXT_PUBLIC_SYNC_TRANSPORT=local           = http
                              │                          │
                 ┌────────────▼─────────┐   ┌────────────▼─────────────┐
                 │ LocalTransport       │   │ HttpTransport            │
                 │ IndexedDB + fixtures │   │ GET  /api/sync/bootstrap │
                 │ BroadcastChannel     │   │ POST /api/sync/mutation  │
                 │ (no network at all)  │   │ GET  /api/sync/events    │
                 └──────────────────────┘   └────────────┬─────────────┘
                                                         │
                                            ┌────────────▼─────────────┐
                                            │  YOUR BACKEND            │
                                            │  (dev mock today:        │
                                            │   src/server/syncStore)  │
                                            └──────────────────────────┘
```

---

## 2. Quick start

### 2.1 Environment variables

Both are read at build time by Next.js (`NEXT_PUBLIC_` prefix) and are the *only* two variables
the data layer reads (`grep -rn "process.env.NEXT_PUBLIC" src/` returns exactly two hits).

| Variable | Read at | Values | Meaning |
|---|---|---|---|
| `NEXT_PUBLIC_SYNC_TRANSPORT` | `src/lib/data/SyncClient.ts:53` | `http` selects `HttpTransport`. **Any other value, including unset, selects `LocalTransport`.** The comparison is a strict `=== "http"`. | Which transport boots. |
| `NEXT_PUBLIC_API_BASE_URL` | `src/lib/data/transports/http.ts:42` | Origin, optionally with a path prefix. Empty/unset = same origin. Trailing slashes are stripped (`http.ts:53`). | Prefix for every sync URL. |

```bash
# .env.local
NEXT_PUBLIC_SYNC_TRANSPORT=http
NEXT_PUBLIC_API_BASE_URL=https://api.example.com
```

With that, the client requests `https://api.example.com/api/sync/bootstrap`, etc. The path
segment `/api/sync/...` is hard-coded in `http.ts` — put your prefix in the base URL if you need
a different mount point (e.g. `NEXT_PUBLIC_API_BASE_URL=https://api.example.com/v1` yields
`https://api.example.com/v1/api/sync/bootstrap`).

### 2.2 Minimum endpoints

| # | Endpoint | Required? |
|---|---|---|
| 1 | `GET {base}/api/sync/bootstrap` | **Yes.** Without it a cold client cannot boot; `SyncClient.start()` catches the failure and sets `status = "error"` (`SyncClient.ts:191-197`). |
| 2 | `POST {base}/api/sync/mutation` | **Yes**, for any write. Without it every edit stays optimistic and retries on the backoff ladder forever. |
| 3 | `GET {base}/api/sync/events?since=<id>` | **Yes.** Not optional in practice: optimistic writes only reach IndexedDB when their delta echoes back (see §5.5). Without it, writes vanish on reload. |

### 2.3 Hello-world bootstrap

The smallest response that boots the app to a usable workspace. Note two hard requirements from
the current frontend:

- The route is `/<workspaceSlug>/...`. Nothing in the app hardcodes a slug any more: the
  active one is created by the user in onboarding and stored in
  `localStorage.linearWorkspace` (`src/lib/workspace/active.ts`), so your Workspace row's
  `slug` should simply match the segment the client is on. The `[workspace]` route param
  itself is opaque to `HttpTransport` (it is *not* sent to the server — see §8.2); the UI
  renders `store.all("Workspace")[0]` (`src/components/nav/WorkspaceMenu.tsx`).
- An **empty bootstrap is valid**: zero rows means "this workspace does not exist / has no
  data yet", and the client routes the user to onboarding rather than inventing one.
- The signed-in user id is currently the constant `CURRENT_USER_ID = "u-yk"`
  (`src/lib/issues/viewPrefs.ts:21`). **Your bootstrap must contain a `User` row with that id**
  until you wire the session through (§6.4).

`Content-Type: application/x-ndjson`, one JSON object per line, trailer last:

```
{"model":"Workspace","data":{"id":"ws-synquic","slug":"synquic-labs","name":"Synquic","createdAt":"2026-07-01T09:00:00.000Z"}}
{"model":"User","data":{"id":"u-yk","email":"yatharth.kaushal@synquic.in","name":"yatharth.kaushal@synquic.in","displayName":"yatharth.kaushal","initials":"YK","avatarColor":"lch(70% 60 210)","role":"admin","joinedAt":"2026-07-01T09:00:00.000Z"}}
{"model":"Team","data":{"id":"t-trendzo","key":"TRENDZO","name":"Trendzo","icon":"Team","color":"#00a0ff","sortOrder":0,"cyclesEnabled":true,"triageEnabled":true,"issueCounter":40,"memberIds":["u-yk"]}}
{"model":"WorkflowState","data":{"id":"state-trendzo-backlog","teamId":"t-trendzo","name":"Backlog","color":"#bec2c8","category":"backlog","position":0}}
{"model":"WorkflowState","data":{"id":"state-trendzo-todo","teamId":"t-trendzo","name":"Todo","color":"#e2e2e2","category":"unstarted","position":0}}
{"model":"WorkflowState","data":{"id":"state-trendzo-in-progress","teamId":"t-trendzo","name":"In Progress","color":"#f2994a","category":"started","position":0}}
{"model":"WorkflowState","data":{"id":"state-trendzo-done","teamId":"t-trendzo","name":"Done","color":"#5e6ad2","category":"completed","position":0}}
{"model":"WorkflowState","data":{"id":"state-trendzo-canceled","teamId":"t-trendzo","name":"Canceled","color":"#8a8f98","category":"canceled","position":0}}
{"model":"Issue","data":{"id":"issue-tre-37","identifier":"TRENDZO-37","number":37,"teamId":"t-trendzo","title":"Research Work","stateId":"state-trendzo-in-progress","priority":2,"creatorId":"u-yk","labelIds":[],"subscriberIds":["u-yk"],"sortOrder":1000,"createdAt":"2026-08-24T17:35:28.000Z","updatedAt":"2026-08-24T18:10:00.000Z"}}
{"model":"UserSettings","data":{"id":"u-yk","homeView":"agent","theme":"dark","firstDayOfWeek":"Monday","displayFullNames":true,"convertEmoticons":true,"commentSubmitKey":"Enter","fontSize":"default","pointerCursor":false,"underlineLinks":false,"disableAnimations":false,"openInDesktop":false,"autoAssignSelf":false,"assignOnStart":false}}
{"_trailer":true,"lastSyncId":0,"schemaVersion":7}
```

Then serve an SSE stream at `/api/sync/events` that emits at least the `handshake` event and
stays open. Open `http://localhost:3000/synquic-labs/team/TRENDZO/all` — you should see the
issue. `http://localhost:3000/dev/data` (`src/app/(app)/dev/data/DataInspector.tsx`) shows
`status`, `lastSyncId`, pending count and per-model row counts.

> **Production notes.** The `UserSettings` row is what drives theme/font/cursor app-wide
> (`src/components/settings/SettingsEffects.tsx`); omit it and the app falls back to defaults but
> still boots. Row *order* in the NDJSON stream is not significant — `SyncStore.hydrate`
> (`store.ts:186`) upserts into flat pools with no referential integrity checks. The reference
> mock emits rows grouped by model in `MODEL_NAMES` order (`syncStore.ts:bootstrapLines`).

---

## 3. Endpoint reference

All three paths are built by `src/lib/data/transports/http.ts:HttpTransport.#url` as
`` `${baseUrl}${path}` ``.

---

### 3.1 `GET {base}/api/sync/bootstrap`

The complete authoritative row set plus the sync high-water mark. Called **only on a cold
start** — when the local IndexedDB mirror has no `_meta` record (`SyncClient.ts:209-219`). A warm
start never hits the transport at all.

**Request**

| | |
|---|---|
| Method | `GET` |
| Path | `/api/sync/bootstrap` |
| Query | none |
| Headers sent | none set by the client. `fetch` is called with `{ cache: "no-store" }` only (`http.ts:62`). No `Authorization`, no `credentials` option — so the browser default `credentials: "same-origin"` applies (see §6.5). |
| Body | none |

**Response**

| | |
|---|---|
| Status | `200`. Anything else, or a null body, throws `bootstrap request failed: HTTP <status>` (`http.ts:63-65`). |
| Content-Type | `application/x-ndjson; charset=utf-8` (reference: `src/app/api/sync/bootstrap/route.ts:35`). The client does **not** check the content type — it parses the raw byte stream line by line. |
| Cache-Control | `no-store, no-transform` in the reference impl. |
| Body | Newline-delimited JSON. |

**Streaming format.** One JSON object per line. Two line shapes (`types.ts:BootstrapLine`):

```ts
// row line
{ "model": ModelName, "data": AnyModelData }
// trailer line — MUST be present, MUST be the last meaningful line
{ "_trailer": true, "lastSyncId": number, "schemaVersion": number }
```

Parser behaviour (`http.ts:69-98`), exactly:

- The body is read with a `ReadableStream` reader and a `TextDecoder`; lines are split on `\n`.
- Each line is `.trim()`ed; **empty lines are skipped**, so `\r\n` and a trailing newline are both fine.
- A line containing the key `_trailer` is taken as the trailer; every other line is pushed as a row.
- After the stream ends, the residual buffer is parsed as one final line.
- If no trailer was seen, the client throws `bootstrap stream ended without trailer`.
- `JSON.parse` is **not** guarded — a malformed line rejects the whole bootstrap.
- Only the *last* trailer wins if you send several. Send exactly one.

You may stream lazily (that is the point of NDJSON) or write the whole body at once; the
reference impl enqueues every line synchronously then closes the stream
(`bootstrap/route.ts:23-30`).

**Worked example — request**

```
GET /api/sync/bootstrap HTTP/1.1
Host: api.example.com
Accept: */*
```

**Worked example — response** (real fixture values from `src/lib/data/fixtures.ts`; abridged —
the real fixture set is **80 rows** + trailer)

```
HTTP/1.1 200 OK
Content-Type: application/x-ndjson; charset=utf-8
Cache-Control: no-store, no-transform

{"model":"Workspace","data":{"id":"ws-synquic","slug":"synquic-labs","name":"Synquic","createdAt":"2026-07-01T09:00:00.000Z"}}
{"model":"User","data":{"id":"u-yk","email":"yatharth.kaushal@synquic.in","name":"yatharth.kaushal@synquic.in","displayName":"yatharth.kaushal","initials":"YK","avatarColor":"lch(70% 60 210)","role":"admin","joinedAt":"2026-07-01T09:00:00.000Z"}}
{"model":"User","data":{"id":"u-cd","email":"chandresh.delwar@synquic.in","name":"chandresh.delwar@synquic.in","displayName":"chandresh.delwar","initials":"CD","avatarColor":"lch(60% 60 140)","role":"member","joinedAt":"2026-07-01T09:00:00.000Z"}}
{"model":"Team","data":{"id":"t-trendzo","key":"TRENDZO","name":"Trendzo","icon":"Team","color":"#00a0ff","sortOrder":0,"cyclesEnabled":true,"triageEnabled":true,"issueCounter":40,"memberIds":["u-yk","u-cd"]}}
{"model":"Team","data":{"id":"t-pgme","key":"PGME","name":"PGME","icon":"Feather","color":"#008fff","sortOrder":1,"cyclesEnabled":false,"triageEnabled":false,"issueCounter":1,"memberIds":["u-yk","u-cd"]}}
{"model":"WorkflowState","data":{"id":"state-trendzo-in-progress","teamId":"t-trendzo","name":"In Progress","color":"#f2994a","category":"started","position":0}}
{"model":"WorkflowState","data":{"id":"state-trendzo-triage","teamId":"t-trendzo","name":"Triage","color":"#f2994a","category":"triage","position":0}}
{"model":"Issue","data":{"id":"issue-tre-37","identifier":"TRENDZO-37","number":37,"teamId":"t-trendzo","title":"Research Work","description":"- [ ] ai models/ deployment pipeline mock up gen and virtual try on cheaper way for this functionality\n- [ ] billing software to be integrated with our register service - billing s/w with good customer support","stateId":"state-trendzo-in-progress","priority":2,"creatorId":"u-yk","labelIds":["label-feature","label-improvement"],"projectId":"proj-driver-app","milestoneId":"ms-driver-m3","dueDate":"2026-09-30","cycleId":"cycle-trendzo-2","subscriberIds":["u-yk"],"sortOrder":1000,"createdAt":"2026-08-24T17:35:28.000Z","updatedAt":"2026-08-24T18:10:00.000Z"}}
{"model":"Label","data":{"id":"label-feature","name":"Feature","color":"#bb87fc","isGroup":false}}
{"model":"Label","data":{"id":"label-improvement","name":"Improvement","color":"#4ea7fc","isGroup":false}}
{"model":"Project","data":{"id":"proj-driver-app","slug":"driver-app-0f150687c354","name":"Driver App","icon":"🚚","color":"lch(74.025% 57.688 76.196)","summary":"Expo/React Native app for delivery agents — orders, door events, COD","description":"Delivery agent app. Receives orders, updates status, logs door events, captures photos, records COD collection — every action tied to an authenticated agent identity for the audit trail. Stack: Expo · React Native.\n\nRepo: https://github.com/Trendzo/driver-app\nLocal: c:\\AIB\\Products\\Trendzo\\driver-app","statusCategory":"started","health":"noUpdate","priority":0,"leadId":"u-yk","memberIds":["u-yk"],"teamIds":["t-trendzo"],"startDate":"2026-07-27","targetDate":"2026-09-30","sortOrder":100,"createdAt":"2026-08-24T15:57:57.000Z","updatedAt":"2026-08-24T17:25:02.000Z"}}
{"model":"Milestone","data":{"id":"ms-driver-m3","projectId":"proj-driver-app","name":"M3 · Delivery flow (handover → deliver → proof)","description":"Driver app wired to the new agent backend: login, see assigned deliveries, pickup at store (pickup-code), deliver, capture proof, record COD. (Door try-and-buy + returns are M4.)","targetDate":"2026-08-28","sortOrder":100}}
{"model":"Activity","data":{"id":"act-tre-37-state","issueId":"issue-tre-37","actorId":"u-cd","type":"stateChanged","from":"Backlog","to":"In Progress","createdAt":"2026-08-24T17:50:00.000Z"}}
{"model":"Notification","data":{"id":"notif-welcome","userId":"u-yk","type":"welcome","title":"Welcome to Linear-style workspace","snippet":"Watch an introductory video and access a list of resources below.","createdAt":"2026-08-24T16:20:00.000Z"}}
{"model":"UserSettings","data":{"id":"u-yk","homeView":"agent","theme":"dark","firstDayOfWeek":"Monday","displayFullNames":true,"convertEmoticons":true,"commentSubmitKey":"Enter","fontSize":"default","pointerCursor":false,"underlineLinks":false,"disableAnimations":false,"openInDesktop":false,"autoAssignSelf":false,"assignOnStart":false}}
{"model":"Cycle","data":{"id":"cycle-trendzo-2","teamId":"t-trendzo","number":2,"startsAt":"2026-08-24T00:00:00.000Z","endsAt":"2026-09-07T00:00:00.000Z"}}
{"_trailer":true,"lastSyncId":0,"schemaVersion":7}
```

**Failure modes**

| Situation | Client behaviour |
|---|---|
| Non-2xx status, or `res.body === null` | Throws; `SyncClient.start()` catches, logs `[SyncClient] boot failed`, sets `status = "error"` (`SyncClient.ts:191-197`). **No retry** — the user must reload. |
| Stream ends with no trailer | Throws `bootstrap stream ended without trailer`. Same as above. |
| A malformed JSON line | `JSON.parse` throws inside `handleLine`. Same as above. |
| Trailer `schemaVersion` ≠ 7 | Bootstrap *succeeds* this session but the value is written into `_meta` (`SyncClient.ts:251-255`); on the next reload `Persistence.open` (`persistence.ts:141-144`) sees the mismatch, wipes every model store and re-bootstraps. See §9.2 for the exact loop and how it self-heals. |
| Very large payloads | The whole row set is buffered in memory before hydration. The reference fixture set is 80 rows; issue attachments can carry inline base64 data URLs up to `ATTACHMENT_INLINE_MAX_BYTES = 1_000_000` bytes each (`types.ts:145`). Budget accordingly. |

> **Production notes.** The mock has **no authentication, no workspace scoping, and no
> pagination** — it serves its entire in-memory row set to anyone who asks
> (`bootstrap/route.ts:18-38`). A real backend must authenticate the request, scope rows to what
> the caller may see (§8), and consider a `lastSyncId`-consistent snapshot: the trailer's
> `lastSyncId` must be the high-water mark **as of the snapshot you just streamed**, not a later
> one, or the client will skip deltas it never received.

---

### 3.2 `POST {base}/api/sync/mutation`

Apply one merged batch of optimistic transactions.

**Request**

| | |
|---|---|
| Method | `POST` |
| Path | `/api/sync/mutation` |
| Headers | `Content-Type: application/json`. Nothing else is set (`http.ts:104-108`). |
| Body | `MutationRequest` (`types.ts:491`) |

```ts
interface MutationRequest {
  clientId: string;              // per-SyncClient UUID (SyncClient.ts:newClientId)
  transactions: TransactionData[];
}

interface TransactionData {                       // types.ts:477
  id: string;                                     // client-generated UUID — the idempotency key
  kind: "create" | "update" | "delete" | "archive" | "unarchive";
  modelName: ModelName;                           // one of the 18, §4
  modelId: string;
  payload?: Record<string, unknown>;              // create: full row · update: changed fields
  changeSnapshot?: Record<string, unknown>;       // previous values — CLIENT-ONLY, ignore it
  batchIndex: number;                             // one per event-loop tick; apply in ascending order
  createdAt: string;                              // ISO-8601
  status: "queued" | "executing" | "acked";       // always "executing" on the wire
}
```

Notes on the request that matter:

- The client sends **the entire pending queue** in one request, not just the newest tick
  (`transactions.ts:197` `const batch = this.queue.slice()`). A batch can therefore span several
  `batchIndex` values.
- `changeSnapshot` is the client's rollback data. It is on the wire only because the transaction
  is serialized whole. **Ignore it.** (The reference schema accepts it and drops it:
  `mutation/route.ts:27`.)
- `status` is always `"executing"` at send time (`transactions.ts:198-201`), but accept all three
  values — the reference zod schema does (`mutation/route.ts:30`).
- The client **never** enqueues `archive` / `unarchive` today (verified: no `enqueue("archive"…)`
  call site exists). They are part of the contract; implement them for completeness.
- `Cycle` and `Workspace` have no client write path today. Every other model does.

**Response**

| | |
|---|---|
| Status | `200`. **Any non-2xx throws** `mutation request failed: HTTP <status>` (`http.ts:109-111`) and the queue retries the whole batch on the backoff ladder — forever. See the warning below. |
| Body | `MutationResponse` |

```ts
interface MutationResponse {           // types.ts:496
  ok: boolean;
  lastSyncId: number;                  // IGNORED by the client — see below
  rejected?: Record<string, string>;   // transaction id -> human-readable error
}
```

**How the client interprets it** (`transactions.ts:203-245`), precisely:

| Server answer | Client does |
|---|---|
| throws / non-2xx | `requeueForRetry` — the whole batch stays queued, retried after 1s, 2s, 5s, 10s, 10s… (`transactions.ts:BACKOFF_MS`), paused while `navigator.onLine === false` and resumed on the window `online` event. |
| `{ ok: false }` with no `rejected` (or empty) | Treated as a **transient** failure → `requeueForRetry`, same ladder. |
| `{ ok: true }` | Every transaction marked `acked`, removed from the in-memory queue and deleted from the durable `_transaction` store. |
| any response carrying `rejected` | For each id in `rejected`, `SyncClient.#rollback` reverts that transaction using its `changeSnapshot` (create → remove the row; delete → re-insert the snapshot; update/archive/unarchive → merge the previous field values back). All batch transactions — rejected or not — leave the queue and the durable store. **The `rejected` map drives rollback regardless of `ok`.** |

`lastSyncId` in the response is **never read**. Both `http.ts:113-114` and `SyncClient.ts:431-432`
say so explicitly: *"lastSyncId is advanced by the delta stream (which also persists the action) —
never directly from the mutation response."*

> ⚠️ **The most important status-code rule.** The client treats *every* non-2xx as retryable.
> If you answer `400` for a permanently malformed transaction, the client will resubmit it on the
> backoff ladder forever and the user's "Syncing N" badge never clears. **Per-transaction problems
> must be reported as `200` + `rejected`.** Reserve 4xx/5xx for genuinely retryable transport-level
> failures (auth expiry, overload, deploy) — and for auth expiry, prefer a redirect-to-login flow
> over an infinite retry.

**Worked example — request**

Dragging TRENDZO-37 to the top of the "Done" column and adding a comment in the same tick:

```
POST /api/sync/mutation HTTP/1.1
Content-Type: application/json

{
  "clientId": "3b8f1a54-0f7d-4e6b-9a21-6d4c0b9e1f77",
  "transactions": [
    {
      "id": "f0b7a1e2-9c34-4d18-8a55-2e1b7c9d4a03",
      "kind": "update",
      "modelName": "Issue",
      "modelId": "issue-tre-37",
      "payload": { "stateId": "state-trendzo-done", "sortOrder": 999 },
      "changeSnapshot": { "stateId": "state-trendzo-in-progress", "sortOrder": 1000 },
      "batchIndex": 0,
      "createdAt": "2026-08-25T09:14:02.311Z",
      "status": "executing"
    },
    {
      "id": "9a1d5c77-2b40-4f9e-b0c8-71ad3e5f2c66",
      "kind": "create",
      "modelName": "Comment",
      "modelId": "c2f4b8d0-6e13-4a7c-9f52-88b0d1e6a934",
      "payload": {
        "id": "c2f4b8d0-6e13-4a7c-9f52-88b0d1e6a934",
        "issueId": "issue-tre-37",
        "authorId": "u-yk",
        "body": "Moving this to Done — pipeline mock-up is live.",
        "createdAt": "2026-08-25T09:14:02.311Z",
        "updatedAt": "2026-08-25T09:14:02.311Z"
      },
      "batchIndex": 0,
      "createdAt": "2026-08-25T09:14:02.311Z",
      "status": "executing"
    }
  ]
}
```

**Worked example — success response**

```
HTTP/1.1 200 OK
Content-Type: application/json
Cache-Control: no-store

{ "ok": true, "lastSyncId": 42 }
```

…followed (over SSE, §3.3) by:

```
event: action
data: {"id":41,"modelName":"Issue","modelId":"issue-tre-37","action":"U","data":{"stateId":"state-trendzo-done","sortOrder":999,"id":"issue-tre-37"}}

event: action
data: {"id":42,"modelName":"Comment","modelId":"c2f4b8d0-6e13-4a7c-9f52-88b0d1e6a934","action":"I","data":{"id":"c2f4b8d0-6e13-4a7c-9f52-88b0d1e6a934","issueId":"issue-tre-37","authorId":"u-yk","body":"Moving this to Done — pipeline mock-up is live.","createdAt":"2026-08-25T09:14:02.311Z","updatedAt":"2026-08-25T09:14:02.311Z"}}
```

**Worked example — partial rejection**

```
HTTP/1.1 200 OK
Content-Type: application/json

{
  "ok": false,
  "lastSyncId": 42,
  "rejected": {
    "f0b7a1e2-9c34-4d18-8a55-2e1b7c9d4a03": "Unknown Issue id \"issue-tre-37\" for update"
  }
}
```

The Issue update rolls back in the UI; the Comment create is kept (it was not rejected) and is
expected to arrive as an `I` delta.

**Reference server rejection messages** (`src/server/syncStore.ts:applyTransaction`, mirrored
verbatim in `transports/local.ts:#applyTransaction`) — reproduce these or improve on them:

| Condition | Message |
|---|---|
| `modelName` not one of the 18 | `Unknown model "<name>"` |
| `update` on a missing row | `Unknown <Model> id "<id>" for update` |
| `delete` on a missing row | `Unknown <Model> id "<id>" for delete` |
| `archive` on a missing row | `Unknown <Model> id "<id>" for archive` |
| `unarchive` on a missing row | `Unknown <Model> id "<id>" for unarchive` |
| unrecognised `kind` | `Unknown transaction kind "<kind>"` |

Note that `create` is **never rejected**: it is an idempotent upsert (`syncStore.ts:132-140`,
`local.ts:236-242`) — *"Idempotent for at-least-once delivery: re-creating an id replaces it."*

**Reference server error responses** (`src/app/api/sync/mutation/route.ts`)

| Status | Body | When |
|---|---|---|
| `400` | `{ "error": "Invalid JSON body" }` | body is not JSON |
| `400` | `{ "error": "Invalid MutationRequest", "details": [...zod issues] }` | shape validation failed |
| `200` | `MutationResponse` | otherwise |

> **Production notes.** The mock authenticates nothing, authorizes nothing, and validates only
> the envelope shape — `payload` is `z.record(z.string(), z.unknown())`, so any field with any
> value is accepted and merged (`mutation/route.ts:26`). A real backend must (a) authenticate,
> (b) authorize per transaction, (c) validate `payload` per model, and (d) reject unknown/forbidden
> fields via `rejected` rather than 4xx. Also note that the mock's `400`s are exactly the
> footgun described above — they will retry-loop a real client.

---

### 3.3 `GET {base}/api/sync/events?since=<id>`

The live delta stream. Opened once per boot, after bootstrap/warm-hydration, with
`since = SyncClient.lastSyncId` (`SyncClient.ts:263-269`).

**Request**

| | |
|---|---|
| Method | `GET` (via the browser `EventSource` API) |
| Path | `/api/sync/events` |
| Query | `since=<integer>` — always present. Value is the client's current high-water mark; `0` on a fresh cold boot with `lastSyncId: 0`. |
| Headers | Whatever `EventSource` sends (`Accept: text/event-stream`). The client passes **no** options, so `withCredentials` is `false` (§6.5). |
| Body | none |

If `EventSource` is undefined (SSR), the client calls `onStatus("closed")` and returns a no-op
unsubscribe (`http.ts:122-125`).

**Response**

| | |
|---|---|
| Status | `200` |
| Content-Type | `text/event-stream; charset=utf-8` |
| Other headers (reference) | `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no` (the last one matters behind nginx) |

**Stream format** (`src/app/api/sync/events/route.ts`)

1. **`handshake`** — sent immediately on connect:
   ```
   event: handshake
   data: {"lastSyncId":42,"schemaVersion":7}

   ```
   Shape is `types.ts:SyncHandshake`. ⚠️ **The client does not subscribe to this event.**
   `HttpTransport.subscribe` registers listeners for `action`, `open` and `error` only
   (`http.ts:130-147`). Send it anyway — it is part of the documented contract, useful for
   debugging, and a future client may consume it — but do not depend on the client reacting.

2. **`action`** — replay then live. One `SyncAction` per event:
   ```
   event: action
   data: {"id":43,"modelName":"Issue","modelId":"issue-tre-37","action":"U","data":{"priority":1,"id":"issue-tre-37"}}

   ```
   With `?since=<id>` present and finite, the server first replays every logged action with
   `id > since`, oldest first (`events/route.ts:86-90`, `syncStore.ts:actionsSince`), then
   live-streams every subsequent broadcast.

3. **Heartbeat** — an SSE comment every `HEARTBEAT_MS = 25_000`:
   ```
   : heartbeat 1756113242311

   ```
   Comments are ignored by `EventSource` but keep proxies from closing an idle connection.

Every frame is `event: <name>\ndata: <json>\n\n` (`events/route.ts:50-52`). The client
`JSON.parse`s the `data` payload; a malformed frame is silently dropped (`http.ts:133-137`) — one
bad frame does not kill the stream.

**Status callbacks** (`http.ts:117-152` → `SyncClient.ts:#handleTransportStatus`)

| Transport event | `TransportStatus` | `SyncClient.status` |
|---|---|---|
| `subscribe()` called | `connecting` | ignored |
| `EventSource` `open` | `open` | clears a previous `error` back to `ready` |
| `EventSource` `error` while `readyState === CLOSED` | `closed` | `error` → sidebar shows a red dot and "Offline" (`DataProvider.tsx:SyncStatus`) |
| `EventSource` `error` while reconnecting | *(none)* | ignored — `EventSource` retries on its own |

Because `EventSource` reconnects automatically, **the reconnect will re-issue the same URL with
the original `since` value** — the client does not rebuild the URL with a fresher `lastSyncId`.
This is safe (the client dedupes by id, §5.4) but means your replay window must cover the whole
session, not just the gap.

**Worked example — request**

```
GET /api/sync/events?since=42 HTTP/1.1
Accept: text/event-stream
```

**Worked example — response**

```
HTTP/1.1 200 OK
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache, no-transform
Connection: keep-alive
X-Accel-Buffering: no

event: handshake
data: {"lastSyncId":45,"schemaVersion":7}

event: action
data: {"id":43,"modelName":"Issue","modelId":"issue-tre-37","action":"U","data":{"priority":1,"id":"issue-tre-37"}}

event: action
data: {"id":44,"modelName":"Issue","modelId":"issue-tre-38","action":"A","data":{"id":"issue-tre-38","archivedAt":"2026-08-25T09:20:11.004Z"}}

event: action
data: {"id":45,"modelName":"Notification","modelId":"notif-welcome","action":"D"}

: heartbeat 1756113242311

```

**Failure modes**

| Situation | Consequence |
|---|---|
| Stream never opens / immediately closes | `status = "error"`, sidebar shows "Offline". Optimistic writes still apply locally and still submit, but **their rows are never persisted to IndexedDB** (§5.5) — they are lost on reload. |
| An action delivered out of order (higher id before a lower one) | The lower id is silently dropped by `SyncClient.#handleAction` (`id <= lastSyncId`). **Permanent divergence** until the next cold bootstrap. Total ordering is mandatory. |
| Replay window too short (client's `since` older than your log) | Silent gap — the mock's `actionsSince` just filters a `LOG_CAP = 5000` ring buffer (`syncStore.ts:38,105-108`). The client has no way to detect this. See §5.7. |
| Proxy buffers the stream | Nothing arrives until the buffer fills. Set `X-Accel-Buffering: no` and disable compression/buffering for this route. |

> **Production notes.** The mock registers its live subscription *before* it sends the handshake
> and replay (`events/route.ts:54-90`). It gets away with this only because its replay is fully
> synchronous inside one Node tick, so nothing can interleave. **A real backend whose replay is
> async (a DB query) must buffer live broadcasts until the replay finishes, then flush the buffer,
> de-duplicating by id** — otherwise a live action can overtake older replayed actions and the
> client will drop them forever. The mock also keeps only the last 5000 actions, in memory, in one
> process: not durable, not multi-process safe, and no back-pressure. Deliberately so — it is a
> mock (`syncStore.ts:1-21`).

---

## 4. Data model reference

Source of truth: `src/lib/data/types.ts`. These are the **wire and storage shapes** — plain JSON.

### 4.0 Conventions that apply to every model

| Rule | Detail |
|---|---|
| `id` | Always a string. The client generates `crypto.randomUUID()` for new rows, but ids are opaque — the fixtures use readable ids like `"issue-tre-37"`, `"t-trendzo"`. `id` is never changed by a merge (`store.ts:mergeInto` skips it). |
| Dates | ISO-8601 strings (`types.ts:ISODate`). Timestamps are full instants (`"2026-08-24T17:35:28.000Z"`); date-only fields — `startDate`, `targetDate`, `dueDate` — are stored as `"YYYY-MM-DD"` in the fixtures. Both are just strings on the wire. |
| Optional fields (`?`) | Simply absent from the JSON object. |
| **Clearing a field** | JSON cannot encode `undefined`, so the client sends **`null`** to clear (e.g. `{"assigneeId": null}`, `{"readAt": null}`, `{"targetDate": null}`). **Verified in `src/lib/data/store.ts:61-67` (`mergeInto`): `t[key] = value === null ? undefined : value`** — the in-memory store normalizes wire `null` to `undefined`. Your server should treat `null` in an update `payload` as "clear this field" and it should echo the cleared field back the same way (as `null`, or by omitting it from the row on a full `I`). Note: `Persistence.applyAction` (`persistence.ts:190-223`) writes the raw merged object to IndexedDB, so a `null` *is* stored as `null` there; it is normalized to `undefined` again on the next warm hydrate through `SyncStore.hydrate`. Both paths converge on the same in-memory shape. |
| Unknown fields | Merged in blindly (`mergeInto` iterates `Object.entries(patch)`). Extra fields are harmless to the client but are not persisted through a `SCHEMA_VERSION` wipe. |
| Referential integrity | **Not enforced anywhere on the client.** A dangling `assigneeId` renders as unassigned; a dangling `stateId` hides the issue from grouped views. The server must keep these consistent. |
| Deletes | `D` removes the row from the pool immediately, with no cascade. If you delete a `Project`, emit the `Issue` updates that clear `projectId` yourself. |

### 4.1 `Workspace` — `types.ts:32`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | ✔ | |
| `slug` | string | ✔ | URL segment. Must match the `/<workspaceSlug>/...` path the client is on (created in onboarding, remembered in `localStorage.linearWorkspace`). |
| `name` | string | ✔ | Shown in the sidebar header (`store.all("Workspace")[0]?.name`). |
| `createdAt` | ISODate | ✔ | |

The UI reads only the **first** Workspace row. No client write path exists.

### 4.2 `User` — `types.ts:42`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | ✔ | **Must include `"u-yk"`** until §6.4 is done — `CURRENT_USER_ID` (`src/lib/issues/viewPrefs.ts:21`) is a hard-coded constant. |
| `email` | string | ✔ | |
| `name` | string | ✔ | Fixtures put the email address here (`fixtures.ts:73-83`). |
| `displayName` | string | ✔ | Fixtures use the email local part. |
| `initials` | string | ✔ | Avatar fallback, e.g. `"YK"`. `src/lib/auth/profile.ts:initialsFor` is the client's derivation. |
| `avatarColor` | string | ✔ | Any CSS color; fixtures use `lch(...)`. |
| `avatarUrl` | string | | Data URL or http URL. Client-uploaded avatars are 128×128 JPEG data URLs (`profile.ts:fileToAvatarDataUrl`). |
| `role` | `"admin" \| "member" \| "guest"` | | Absent = `member`. Members directory column. |
| `joinedAt` | ISODate | | Members directory column. |
| `title` | string | | **Added in `SCHEMA_VERSION` 7.** Job title — onboarding step 1 and Settings → Profile. Absent = unset. |

Writes: `update` (profile edit, role change), `delete` (remove member).

### 4.3 `Team` — `types.ts:83`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | ✔ | |
| `key` | string | ✔ | e.g. `"TRENDZO"`. **Prefix of every issue identifier.** Route segment (`/team/TRENDZO/all`); lookup is case-insensitive (`store.ts:teamByKey`). |
| `name` | string | ✔ | |
| `icon` | string | ✔ | Sprite symbol name from `src/components/icons/Sprites.tsx` (`"Team"`, `"Feather"`, `"Chip"`, `"Europe"`, `"Radar"`, `"Home"`, …). |
| `color` | string | ✔ | |
| `sortOrder` | number | ✔ | Sidebar order. |
| `cyclesEnabled` | boolean | ✔ | Gates the Cycles surface. |
| `triageEnabled` | boolean | ✔ | Gates the Triage surface. |
| `issueCounter` | number | ✔ | *Next* issue number. Documented "server-owned" (`types.ts:92`) — **the client never reads it**; see §4.5. Maintain it server-side and echo it back. |
| `memberIds` | string[] | | Absent = everyone is a member. Drives "Your teams" and the join menu. |
| `description` | string | | **Added in `SCHEMA_VERSION` 7.** Team Home's editable hero description. Absent = unset. |
| `resources` | `{id, title, url}[]` | | **Added in `SCHEMA_VERSION` 7.** Documents + links pinned to Team Home. Shape is `types.ts:ResourceLink` — the same one `Project.resources` uses (`ProjectResource` is now an alias of it, `types.ts:186`). Whole-array replacement (`src/components/teams/TeamHomeView.tsx:238,245`). |
| `notifySubscriberIds` | string[] | | **Added in `SCHEMA_VERSION` 7.** Members subscribed to this team's notifications. Per-user opt-**IN**: absent or missing = not subscribed. Whole-array replacement (`TeamHomeView.tsx:254`). |

### 4.4 `WorkflowState` — `types.ts:110`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | ✔ | |
| `teamId` | string | ✔ | States are per-team. |
| `name` | string | ✔ | |
| `color` | string | ✔ | |
| `description` | string | | |
| `category` | `"triage" \| "backlog" \| "unstarted" \| "started" \| "completed" \| "canceled"` | ✔ | Board/group ordering follows `store.ts:CATEGORY_ORDER` — exactly that sequence. |
| `position` | number | ✔ | Order *within* the category. |

Only teams with `triageEnabled` should own a `triage`-category state (`fixtures.ts:156-166`).

### 4.5 `Issue` — `types.ts:147`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | ✔ | |
| `identifier` | string | ✔ | **`` `${team.key}-${number}` ``.** Built client-side at `src/components/issues/CreateIssueModal.tsx:456`, `src/lib/agent/engine.ts:476`, `src/lib/integrations/store.ts:567`. Lookup is case-insensitive (`store.ts:issueByIdentifier`). |
| `number` | number | ✔ | The client allocates `max(existing team issue numbers) + 1` (`CreateIssueModal.tsx:446-448`) and admits this is wrong: *"The server owns numbering"*. **The server should reallocate** from `Team.issueCounter` and echo the corrected `number` + `identifier` in the `I` delta — the client merges deltas field-by-field, so the row simply corrects itself in place. |
| `teamId` | string | ✔ | |
| `title` | string | ✔ | |
| `description` | string | | Markdown snapshot. `types.ts:153` notes a Yjs doc is a later phase — see §9.4. |
| `stateId` | string | ✔ | Must reference a `WorkflowState` of the same team. |
| `priority` | `0 \| 1 \| 2 \| 3 \| 4` | ✔ | 0 none, 1 urgent, 2 high, 3 medium, 4 low (`types.ts:12`). |
| `assigneeId` | string | | Send `null` to unassign — `src/components/members/MembersView.tsx:83`, `src/components/nav/CommandPalette.tsx:530`. `src/components/issues/pickers/AssigneePicker.tsx:17` states the rule: *"Clearing the assignee sends `assigneeId: null` on the wire — JSON drops undefined."* |
| `creatorId` | string | ✔ | |
| `labelIds` | string[] | ✔ | Always present, may be `[]`. Whole-array replacement, not a patch. |
| `projectId` | string | | Send `null` to detach. |
| `milestoneId` | string | | |
| `cycleId` | string | | |
| `estimate` | number | | |
| `dueDate` | ISODate | | `"YYYY-MM-DD"` in fixtures. |
| `parentId` | string | | Sub-issue parent. |
| `subscriberIds` | string[] | ✔ | Always present. |
| `reactions` | `{emoji: string, userIds: string[]}[]` | | `types.ts:ReactionData`. An empty bucket is dropped rather than stored. Chip count = `userIds.length`; active = `userIds.includes(currentUserId)`. |
| `attachments` | `{id, name, size, type, dataUrl?}[]` | | `types.ts:AttachmentData`. **No blob storage exists.** `dataUrl` carries base64 for images under `ATTACHMENT_INLINE_MAX_BYTES = 1_000_000` (`types.ts:145`) and is absent otherwise. See §9.4. |
| `sortOrder` | number | ✔ | **Fractional.** Board drag computes `(before.sortOrder + after.sortOrder) / 2` (`src/components/issues/board/Board.tsx:224-231`); top-of-column insert uses `first.sortOrder - 1`, empty column uses `1000`. **Store this as a float/double, never an integer.** Sorted ascending everywhere (`store.ts:issuesForState`). |
| `createdAt` | ISODate | ✔ | |
| `updatedAt` | ISODate | ✔ | |
| `archivedAt` | ISODate | | **Presence = archived.** `Issue` is the only model in `store.ts:ARCHIVABLE_MODELS`. Every derived query filters `!issue.archivedAt` (`store.ts:issuesForTeam`, `issuesForState`, `issuesForCycle`, `issuesForProject`). |

### 4.6 `Label` — `types.ts:176`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | ✔ | |
| `name` | string | ✔ | |
| `color` | string | ✔ | |
| `teamId` | string | | **Absent = workspace-scoped label.** |
| `groupId` | string | | Parent label group. |
| `isGroup` | boolean | ✔ | A group is a container, not an applicable label. |

### 4.7 `Project` — `types.ts:188`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | ✔ | |
| `slug` | string | ✔ | Route + copy-link identity, e.g. `"driver-app-0f150687c354"` (name-slug + hex suffix). Looked up by `store.ts:projectBySlug` — **exact match, case-sensitive**. |
| `name` | string | ✔ | |
| `icon` | string | | Emoji (`"🚚"`) or sprite name. |
| `color` | string | ✔ | |
| `summary` | string | | One-line description. |
| `description` | string | | Markdown. |
| `statusCategory` | `"backlog" \| "planned" \| "started" \| "completed" \| "canceled"` | ✔ | |
| `health` | `"onTrack" \| "atRisk" \| "offTrack" \| "noUpdate"` | ✔ | |
| `priority` | `0..4` | ✔ | |
| `leadId` | string | | |
| `memberIds` | string[] | ✔ | May be `[]`. |
| `teamIds` | string[] | ✔ | A project can span teams. |
| `startDate` | ISODate | | |
| `targetDate` | ISODate | | Rendered red when in the past. |
| `labelIds` | string[] | | |
| `resources` | `{id, title, url}[]` | | The "Add document or link…" rows. Since `SCHEMA_VERSION` 7 `ProjectResource` is an alias of the shared `types.ts:ResourceLink` (`types.ts:186`) — structurally identical, and the same shape `Team.resources` uses. |
| `dependsOnIds` | string[] | | Other project ids. |
| `sortOrder` | number | ✔ | Fractional, same convention as Issue. |
| `createdAt` / `updatedAt` | ISODate | ✔ | |

### 4.8 `ProjectUpdate` — `types.ts:220`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id`, `projectId`, `authorId` | string | ✔ | |
| `health` | `ProjectHealth` | ✔ | The health the author declared with this update. |
| `body` | string | ✔ | Markdown-ish snapshot, same convention as `Issue.description`. |
| `createdAt` / `updatedAt` | ISODate | ✔ | |

### 4.9 `Milestone` — `types.ts:230`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id`, `projectId`, `name` | string | ✔ | |
| `description` | string | | |
| `targetDate` | ISODate | | Cleared with `null` (`{"targetDate": null}` is a live call site). |
| `sortOrder` | number | ✔ | Fixtures step by 100. |

### 4.10 `Comment` — `types.ts:239`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id`, `issueId`, `authorId`, `body` | string | ✔ | |
| `parentId` | string | | Threaded reply. Threading is resolved in the UI; `store.ts:commentsForIssue` returns a flat oldest-first list. |
| `createdAt` / `updatedAt` | ISODate | ✔ | |

Posting a comment enqueues **two** transactions in the same batch — a `Comment` create and an
`Activity` create of type `commented` (`src/components/issues/detail/CommentComposer.tsx:43-55`).

### 4.11 `Activity` — `types.ts:249`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | ✔ | |
| `issueId` | string | | Exactly one of `issueId` / `projectId` in practice. |
| `projectId` | string | | |
| `actorId` | string | ✔ | |
| `type` | `"created" \| "stateChanged" \| "priorityChanged" \| "assigneeChanged" \| "labelAdded" \| "labelRemoved" \| "projectChanged" \| "milestoneCompleted" \| "commented"` | ✔ | Closed enum. |
| `from` / `to` | string | | Human-readable values (`"Backlog"` → `"In Progress"`), **not** ids. |
| `createdAt` | ISODate | ✔ | Feed is oldest-first (`store.ts:activitiesForIssue`). |

Today activity rows are written by the client alongside the mutation they describe. A real backend
will likely want to generate them server-side instead; if you do, suppress or reconcile the
client-written ones (they arrive as ordinary `create` transactions and are idempotent by id).

### 4.12 `Notification` — `types.ts:269`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id`, `userId`, `type`, `title` | string | ✔ | `type` is a free-form string (fixtures use `"welcome"`). |
| `actorId` / `issueId` | string | | |
| `snippet` | string | | |
| `readAt` | ISODate | | Presence = read. Toggled with `{readAt: <iso>}` / `{readAt: null}` (`SyncClient.ts:mutate.markNotificationRead`). |
| `snoozedUntil` | ISODate | | |
| `createdAt` | ISODate | ✔ | Inbox is newest-first (`store.ts:notificationsForUser`). |

### 4.13 `Favorite` — `types.ts:282`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id`, `userId`, `entityId` | string | ✔ | |
| `entityType` | `"issue" \| "project" \| "view" \| "team"` | ✔ | |
| `sortOrder` | number | ✔ | |

### 4.14 `ViewPreference` — `types.ts:290`

Per-user, per-view display settings. **Upserted** by the client: `SyncClient.mutate.updateViewPreference`
checks the pool and sends `create` or `update` accordingly (`SyncClient.ts:453-461`).

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | ✔ | **`` `${userId}:${viewKey}` ``** (`src/lib/issues/viewPrefs.ts:59`). |
| `userId` | string | ✔ | |
| `viewKey` | string | ✔ | e.g. `"team/TRENDZO/all"`. |
| `layout` | `"list" \| "board"` | ✔ | |
| `grouping` / `subGrouping` / `ordering` / `completedFilter` | string | ✔ | Free-form option keys. |
| `showSubIssues` / `showEmptyGroups` | boolean | ✔ | |
| `displayProperties` | string[] | ✔ | |
| `hiddenColumnIds` | string[] | | Board columns hidden by hand — distinct from the empty-column collapse. |
| `nestedSubIssues` | boolean | | Indent children under their parent. |
| `showSnoozed` / `showRead` | boolean | | Inbox display options. |

### 4.15 `UserSettings` — `types.ts:316`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id` | string | ✔ | **Equals the `userId`.** One row per user. |
| `homeView` | string | ✔ | Fixture: `"agent"`. |
| `theme` | `"system" \| "light" \| "dark"` | ✔ | |
| `firstDayOfWeek` | `"Monday" \| "Sunday"` | ✔ | |
| `displayFullNames`, `convertEmoticons`, `pointerCursor`, `underlineLinks`, `disableAnimations`, `openInDesktop`, `autoAssignSelf`, `assignOnStart` | boolean | ✔ | All required. |
| `commentSubmitKey` | `"Enter" \| "ModEnter"` | ✔ | |
| `fontSize` | `"small" \| "default" \| "large"` | ✔ | |
| `newsletterOptIn` | boolean | | **Added in `SCHEMA_VERSION` 7.** Product-newsletter opt-in (onboarding step 2, Settings → Notifications). Absent (pre-v7 rows) = not opted in. *Delivering* the mail is server work; storing the preference is not. |

Every field except `newsletterOptIn` is required. Send a complete row.

### 4.16 `Invite` — `types.ts:63`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id`, `email`, `invitedById` | string | ✔ | |
| `role` | `"admin" \| "member" \| "guest"` | ✔ | |
| `status` | `"pending" \| "revoked"` | ✔ | |
| `createdAt` | ISODate | ✔ | |

The doc comment is explicit: *"Delivering the mail is the only server-side part; the pending row
itself is real local state."* Your backend owns sending the invite email and, on acceptance,
creating the `User` row + removing/updating the `Invite`.

### 4.17 `Initiative` — `types.ts:346`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id`, `name` | string | ✔ | |
| `slug` | string | ✔ | Route + copy-link identity, e.g. `"q4-platform-2f9c"`. |
| `description` | string | | |
| `status` | `"planned" \| "active" \| "completed" \| "canceled"` | ✔ | |
| `ownerId` | string | | |
| `projectIds` | string[] | ✔ | Rolled-up projects. |
| `targetDate` | ISODate | | |
| `sortOrder` | number | ✔ | |
| `createdAt` / `updatedAt` | ISODate | ✔ | |

### 4.18 `Cycle` — `types.ts:368`

| Field | Type | Req | Notes |
|---|---|---|---|
| `id`, `teamId` | string | ✔ | |
| `number` | number | ✔ | Sequential **per team**. |
| `name` | string | | Falls back to `"Cycle {number}"`. |
| `startsAt` / `endsAt` | ISODate | ✔ | A cycle is active while `startsAt ≤ now < endsAt`. |
| `cooldownEndsAt` | ISODate | | Optional cooldown window after `endsAt`, during which issues cannot be assigned to the cycle. |

No client write path today — cycles are read-only in the app. If your product creates cycles on a
schedule, emit them as `I` deltas.

---

## 5. Sync protocol

### 5.1 Lifecycle, end to end

```mermaid
sequenceDiagram
    autonumber
    participant UI as React UI
    participant Q as TransactionQueue
    participant C as SyncClient
    participant DB as IndexedDB
    participant S as Your backend

    Note over C,DB: BOOT — SyncClient.#start()
    C->>DB: Persistence.open(slug)  (wipes if meta.schemaVersion ≠ 7)
    C->>DB: getMeta()
    alt warm (meta present)
        DB-->>C: { lastSyncId, schemaVersion, bootstrappedAt }
        C->>DB: loadAll() → store.hydrate(rows)
    else cold (no meta)
        C->>S: GET /api/sync/bootstrap
        S-->>C: NDJSON rows … + {_trailer, lastSyncId, schemaVersion}
        C->>DB: putRows(model, rows) per model
        C->>DB: setMeta({lastSyncId, schemaVersion, bootstrappedAt})
    end
    C->>Q: restore()  — replay durable pending transactions
    C->>S: GET /api/sync/events?since=lastSyncId
    S-->>C: event: handshake {lastSyncId, schemaVersion}
    S-->>C: event: action  (replay of id > since, ascending)
    Note over C: status = "ready"

    Note over UI,S: WRITE — one edit
    UI->>Q: enqueue("update","Issue",id,{priority:1})
    Q->>C: applyLocal → store.applyAction({id:0, …})  (instant UI)
    Q->>DB: saveTransaction(t)  (durable _transaction store)
    Note over Q: batch closes at end of tick; flush on next macrotask
    Q->>S: POST /api/sync/mutation {clientId, transactions:[…]}
    S-->>Q: 200 {ok:true, lastSyncId:43}
    Q->>DB: deleteTransaction(t.id)
    Note over Q: acked — row is NOT yet in IndexedDB
    S-->>C: event: action {id:43, action:"U", data:{priority:1,id}}
    C->>C: 43 > lastSyncId → apply
    C->>DB: applyAction(43)   ← the row finally persists
    C->>C: lastSyncId = 43; debounced setMeta (400 ms)
```

### 5.2 Ordering and ID guarantees the server MUST provide

These are not preferences. The client's dedupe logic (`SyncClient.ts:281`) is
`if (action.id <= this.lastSyncId) return;` — a single dropped or reordered action diverges the
client permanently.

1. **Monotonic sync ids.** `SyncAction.id` is a positive integer that strictly increases across
   the whole stream. No gaps are required, but they are harmless. **Never reuse an id.**
2. **Total ordering.** There is exactly one sequence per client stream. Actions must be delivered
   in strictly ascending id order, on both the replay path and the live path, with no interleaving
   between them (see the buffering note in §3.3).
3. **Allocation is per applied transaction.** One client transaction that mutates one row
   allocates exactly one id (`syncStore.ts:emit`, `local.ts:emit`). A batch of N transactions
   allocates N consecutive ids in `batchIndex` order.
4. **Echo to the originator.** The stream carries *every* action, including ones the requesting
   client caused. `transport.ts:63-66` is explicit: *"Delivers every SyncAction with id > since,
   in ascending id order, **including actions this client originated**."* This is not an
   optimization — see §5.5.
5. **Replay from `since`.** On connect with `?since=N`, replay every action with `id > N` before
   (or merged into) the live stream. `EventSource` auto-reconnects with the **original** `since`,
   so your window must cover the whole session.
6. **At-least-once is fine; the client dedupes.** Re-delivering an action the client already
   applied is harmless (it is dropped by id). Delivering it *late* is not.

### 5.3 Batching and the write path

- Every `enqueue` in the same microtask shares one `batchIndex`
  (`transactions.ts:currentBatchIndex`).
- A flush is scheduled for the next macrotask (`setTimeout(…, 0)`), so same-tick edits merge into
  one `MutationRequest`.
- One request is in flight at a time (`inFlight`). Anything enqueued during a flight goes out in
  the next batch.
- **The server must apply `transactions` sorted by `batchIndex` ascending.** Both reference impls
  do `[...req.transactions].sort((a,b) => a.batchIndex - b.batchIndex)` (`syncStore.ts:205-207`,
  `local.ts:167`). Within the same `batchIndex`, array order is the tie-break.
- Rejections are **per transaction**: the rest of the batch still applies (`syncStore.ts:198-217`).
  There is no batch-level transactionality in the contract.

### 5.4 Delta application and dedupe

`SyncClient.#handleAction` (`SyncClient.ts:280-296`):

1. Drop if `action.id <= lastSyncId`.
2. Chain a `Persistence.applyAction(action)` (serialized, best-effort — a failure is swallowed;
   *"durable mirror is best-effort; re-bootstrap heals divergence"*).
3. `store.applyAction(action)` synchronously → instant UI update.
4. `lastSyncId = action.id`.
5. Schedule a debounced `setMeta` (400 ms, `META_SAVE_DEBOUNCE_MS`).

Per-action semantics (`store.ts:applyAction` + `persistence.ts:applyAction`):

| `action` | `data` | Store effect | IndexedDB effect |
|---|---|---|---|
| `I` insert | **full row** | upsert-merge into the pool | `put` the full row |
| `U` update | **changed fields only** (+ `id`) | merge field-by-field, `null` → `undefined` | read-modify-write merge |
| `A` archive | `{id, archivedAt}` in the reference impls; `archivedAt` optional | merge, then set `archivedAt = now` if still empty. **No-op if the row is not in the pool.** On a model with no `archivedAt` concept, the row is **removed** instead | merge; set `archivedAt = now` if not a string |
| `V` unarchive | `{id}` in the reference impls | merge, then clear `archivedAt` — unless `data` explicitly carries `archivedAt` | merge, then `delete merged.archivedAt` |
| `D` delete | *(omit `data` entirely)* | remove from the pool | `delete` the key |

Send `U` deltas containing **only the fields that changed**, plus `id`. Sending a whole row as a
`U` also works (it is just a bigger merge) but defeats the granular-reaction design.

### 5.5 ⚠️ Why the echo is mandatory

Read `src/lib/data/persistence.ts:1-9`: *"Only sync deltas are persisted to model stores — client
optimistic writes live in the in-memory pool and the `_transaction` queue until the matching delta
arrives."*

Trace it: `Persistence.putRows` is called only from `SyncClient.#coldBootstrap`, and
`Persistence.applyAction` only from `SyncClient.#handleAction`. Nothing in the optimistic path
writes a model row to IndexedDB.

Consequence: when your server `ack`s a mutation, the client deletes the durable transaction
(`transactions.ts:237-241`) — but the row is still **only in memory**. If the matching delta never
arrives and the user reloads, the edit is gone.

**Therefore: acking without echoing loses user data.** Echo every applied transaction as a delta on
every subscriber's stream, including the originator's.

### 5.6 Conflict semantics

**Last-write-wins, per field.** `store.ts:mergeInto` assigns each key of the patch onto the stored
object individually; `id` is skipped. There is no vector clock, no version field, no
`If-Match`/ETag anywhere in the contract.

Practical rules for the server:

- Two clients editing *different* fields of the same row both win. No conflict.
- Two clients editing the *same* field: the later-applied transaction wins, and both clients
  converge because both receive both deltas in the same total order.
- Array fields (`labelIds`, `subscriberIds`, `memberIds`, `teamIds`, `projectIds`,
  `dependsOnIds`, `hiddenColumnIds`, `displayProperties`) are sent as **whole replacements**, not
  patches. Concurrent label edits therefore lose one side's change. If you need better, that is a
  server-side merge decision — the wire format cannot express it today.
- `reactions` and `attachments` are likewise whole-array replacements.
- The client never sends a base version, so the server cannot detect a stale write. If you want
  optimistic-concurrency rejection, compare `updatedAt` in the payload against the stored row and
  report a mismatch through `rejected`.

#### 5.6.1 There is no rebase pass — and what that means for you

`src/lib/data/transport.ts:4` lists "rebase" among the things above the seam. **That word appears
exactly once in the entire `src/` tree, in that comment.** There is no rebase implementation:
`SyncClient.#handleAction` applies the incoming delta to the pool and never consults
`TransactionQueue`; the queue has no `rebase` method.

The practical consequences:

- A delta that lands while a conflicting optimistic write is still in flight **overwrites the
  optimistic value in the UI**. The user sees their edit flicker back to the server value.
- The queued transaction is *not* dropped or re-based — it is still in flight or still queued, so
  it lands on the server afterwards and comes back as a delta that restores the user's intent.
  The end state converges; the intermediate frame is just visibly wrong.
- The only place pending transactions are re-applied on top of fresh state is
  `TransactionQueue.restore()` at boot (`transactions.ts:253-286`).

**What the server can do to minimise the flicker:** apply and echo promptly (the window is the
round-trip), and keep `U` deltas narrow — send only the fields that actually changed, so an
unrelated concurrent edit does not clobber a field the user is mid-way through editing.

### 5.7 Offline and restart

| Behaviour | Where |
|---|---|
| Pending transactions survive a reload | `_transaction` IndexedDB store; `TransactionQueue.restore()` (`transactions.ts:253-286`) loads them ordered by `createdAt` then `batchIndex`, re-applies them optimistically on the freshly hydrated pool, refreshes each `changeSnapshot` against current values, and resubmits. |
| Retry ladder | `1s, 2s, 5s, 10s, 10s, …` (`transactions.ts:BACKOFF_MS`). Reset to the start on a successful response or on the window `online` event. |
| Offline pause | `flush()` and `requeueForRetry()` both bail when `navigator.onLine === false`; a `window "online"` listener clears the timer, resets the attempt counter and flushes immediately (`transactions.ts:127-138`). |
| **Server idempotency requirement** | A restart between "server applied" and "client acked" resubmits the same `TransactionData.id`. The reference impls make `create` idempotent-by-replace and `update` naturally idempotent; `delete`/`archive`/`unarchive` on an already-applied row produce a `rejected` entry, which the client treats as a no-op rollback against an already-correct pool. **Best practice: dedupe on `TransactionData.id` server-side** and return the original outcome. |
| Replay-window overflow | **Not handled today.** The mock keeps 5000 actions and silently returns a partial replay. There is no protocol frame for "your `since` is too old — re-bootstrap". If you need one, the cleanest hook is to close the SSE stream and let a future client version fall back to bootstrap; today the only recovery is a `SCHEMA_VERSION` bump (§9) or clearing site data. See §9.4. |

---

## 6. Auth contract

### 6.1 What exists today

There is **no auth server, no route guard and no middleware** (verified: no `middleware.ts`
anywhere; `src/app/(app)/layout.tsx` and `src/app/(app)/[workspace]/layout.tsx` contain no session
check). Login is a client-side ritual that writes a `localStorage` record.

| Key | Shape | Written by |
|---|---|---|
| `linearAuth` | `AuthSession { userId, loggedInAt, method?, email? }` (`src/lib/auth/session.ts:28`) | `session.ts:writeSession` |
| `linearOnboarding` | `OnboardingState { completedAt?, lastStep? }` (`session.ts:37`) | `session.ts:markStepReached` / `markOnboarded` |

There used to be a third key, `linearProfile`, standing in for two onboarding answers that had
no column. **`SCHEMA_VERSION` 7 retired it**: job title is now `UserData.title` and the newsletter
opt-in is `UserSettingsData.newsletterOptIn`, both written through the ordinary transaction queue
(`src/app/(app)/onboarding/[step]/OnboardingView.tsx`, `src/lib/auth/profile.ts:1-11`). Onboarding
progress itself is still browser-local.


`writeSession` hard-codes the identity:

```ts
// src/lib/auth/session.ts:71-81
export function writeSession(method: LoginMethod, email?: string): AuthSession {
  const session: AuthSession = {
    // TODO(auth-backend): use the id returned by the token exchange.
    userId: CURRENT_USER_ID,          // "u-yk"
    loggedInAt: new Date().toISOString(),
    method,
    ...(email !== undefined ? { email } : null),
  };
  writeJSON(AUTH_STORAGE_KEY, session);
  return session;
}
```

### 6.2 The four login methods

`LoginMethod = "google" | "email" | "passkey" | "saml"` (`session.ts:26`). All four are rendered in
`src/app/(app)/login/LoginView.tsx:151-179`. The backend seams are enumerated verbatim in the
`session.ts` header comment (lines 8-18):

| # | Client function | Backend call | Notes |
|---|---|---|---|
| 1 | `startEmailLogin(email)` | `POST /auth/email { email }` | Sends the 6-digit code + magic link. Today: `LoginView.tsx:67` just advances to the code stage. |
| 2 | `verifyEmailCode(email, code)` | `POST /auth/email/verify { email, code }` → `{ token, user }` → set an httpOnly cookie | Today: `LoginView.tsx:134` accepts **any 6 digits**. Code UI is 6 boxes with paste-spread (`CODE_LENGTH = 6`). |
| 3 | `startOAuth("google")` | redirect to `/auth/google` (OAuth 2.0 + PKCE) | Today: `LoginView.tsx:158` logs straight in. |
| 4 | `startPasskeyLogin()` | `GET /auth/passkey/challenge` → `navigator.credentials.get()` → `POST /auth/passkey/verify` | Today: `LoginView.tsx:168` logs straight in. Settings → Security says registration *"needs a WebAuthn challenge from the server"*. |
| 5 | `startSamlLogin(domain)` | `GET /auth/saml?domain=` → IdP redirect | Today: `LoginView.tsx:173` logs straight in. |
| 6 | `signOut()` | `POST /auth/logout` | Documented semantics: **ends every session of the account workspace-wide**, not just this browser (`session.ts:16`, `SecurityView.tsx:118-120`, `WorkspaceMenu.tsx:100-102`). |

Also: `LoginView.tsx:278` "Resend" should re-`POST /auth/email`.

### 6.3 Expected session payload

The token exchange should return at minimum what `AuthSession` needs plus the identity the sync
layer will scope on:

```json
{
  "token": "<opaque or JWT — prefer an httpOnly Set-Cookie>",
  "user": {
    "id": "u-yk",
    "email": "yatharth.kaushal@synquic.in",
    "name": "yatharth.kaushal@synquic.in",
    "displayName": "yatharth.kaushal",
    "initials": "YK",
    "avatarColor": "lch(70% 60 210)",
    "role": "admin"
  },
  "workspace": { "id": "ws-synquic", "slug": "synquic-labs", "name": "Synquic" },
  "expiresAt": "2026-09-24T09:00:00.000Z"
}
```

`user` is exactly a `UserData` row (§4.2) — the same row must also appear in the bootstrap. The
Settings → Security page advertises *"Inactive sessions expire automatically after 30 days"*
(`SecurityView.tsx`), so a 30-day sliding session with refresh is the documented intent.

### 6.4 Exactly which functions to replace

| File:symbol | Change |
|---|---|
| `src/lib/auth/session.ts:writeSession` | Take the id from the token exchange instead of `CURRENT_USER_ID`. |
| `src/lib/auth/session.ts:readSession` | Verify against the server (or read the httpOnly cookie's mirror) rather than trusting `localStorage`. |
| `src/lib/auth/session.ts:clearSession` | `POST /auth/logout` first, then clear. |
| `src/lib/issues/viewPrefs.ts:21` `CURRENT_USER_ID` | **The single highest-value change.** It is a module constant `"u-yk"` used across the app (view-preference ids, "assigned to me", subscriber defaults, comment authorship, integration issue creation). Replace it with a session-derived value. |
| `src/app/(app)/login/LoginView.tsx:67, 134, 158, 168, 173, 278` | Wire each `TODO(auth-backend)` to its endpoint; reject a wrong code at line 134. |
| `src/app/(app)/[workspace]/settings/account/security/SecurityView.tsx:121` | `POST /auth/logout` before `clearSession()`; populate the "Other sessions" list and enable "Revoke all". |
| `src/components/nav/WorkspaceMenu.tsx:105` `logOut` | Same. It already calls `client.dispose()` to stop the delta stream and queue timers — keep that. |
| `src/lib/auth/profile.ts` | Nothing to do — as of `SCHEMA_VERSION` 7 this file is pure computation (`initialsFor`, `fileToAvatarDataUrl`) with no storage of its own. |
| *new* — route guard | Add a `middleware.ts` or a layout-level check; there is none today. |

### 6.5 Getting credentials onto the sync requests

This is the part that surprises people. `HttpTransport` sends **no auth headers**:

- `fetch(url, { cache: "no-store" })` — no `credentials` option, so the browser default
  `credentials: "same-origin"` applies. **Same-origin cookies are sent automatically.**
- `new EventSource(url)` — no options, so `withCredentials` is `false`. **Same-origin cookies are
  sent**; cross-origin cookies are not.

| Deployment | Works today? | What to do |
|---|---|---|
| Backend on the **same origin** as the app (e.g. reverse-proxy `/api/*`), httpOnly session cookie | ✅ Yes, zero code change | Set `NEXT_PUBLIC_API_BASE_URL=` (empty). Cookies ride along on all three endpoints. **This is the recommended path.** |
| Backend on a **different origin**, cookie auth | ❌ No | Edit `src/lib/data/transports/http.ts`: add `credentials: "include"` to both `fetch` calls and construct `new EventSource(url, { withCredentials: true })`. Server needs `Access-Control-Allow-Origin: <app origin>`, `Access-Control-Allow-Credentials: true`, and `SameSite=None; Secure` on the cookie. |
| Bearer token | ❌ No for SSE | `fetch` can take an `Authorization` header (small edit), but **`EventSource` cannot set headers at all**. Either put the token in the query string (`?since=…&token=…` — logged by proxies, be careful), switch to a cookie, or replace the SSE half with a custom `SyncTransport` using `fetch` + `ReadableStream` or a WebSocket. |

### 6.6 ⚠️ `MutationRequest` carries no authenticated actor

The only identity on the write path is `clientId` — a per-`SyncClient` UUID minted in the browser
(`SyncClient.ts:newClientId`) and reset on every fresh page context. It is a **diagnostic tag, not
a principal**. There is no user id, no token, no workspace id, and no signature anywhere in the
`MutationRequest` envelope (`types.ts:491-494`).

This is a contract decision you have to make, and neither of the older planning docs anticipated
it. Three workable answers, in order of preference:

1. **Ambient session (recommended).** Authenticate from the httpOnly cookie the request already
   carries (§6.5, same-origin deployment). No wire-format change at all. Derive the actor from the
   session and overwrite every client-supplied identity field (§8.1 item 4).
2. **Transport header.** Add `Authorization` in `HttpTransport.submit` and solve SSE separately.
   Small edit, but you now have two auth mechanisms.
3. **Envelope field.** Add e.g. `actorId` / `token` to `MutationRequest`. Touches `types.ts`, the
   queue's `submit` call and every server-side validator — do this only if 1 and 2 are impossible.

Whichever you pick: `clientId` is useful to log, and useful if you ever want to suppress the echo
to the originator — but **do not** suppress it (§5.5), and never use it for authorization.

---

## 7. Integrations webhook contract

Source: the doc comment at `src/app/api/integrations/inbound/route.ts:1-72` (which is the intended
contract, written verbatim for this document) plus the reference pipeline at
`src/lib/integrations/store.ts:IntegrationsStore.ingest`.

> **Shorthand for this section only:** `store.ts` means **`src/lib/integrations/store.ts`** (not the
> sync object pool `src/lib/data/store.ts`), and `route.ts` means
> **`src/app/api/integrations/inbound/route.ts`**.

### 7.1 What already works, and what is missing

Everything except the receiver runs in the client today: connections (simulated OAuth), routing
rules, trigger modes, task extraction, real issue creation through the optimistic queue, and the
activity log. It is driven by the message simulator on Settings → Integrations. The only missing
piece is a server that actually receives provider events and pushes the resulting issue through
the sync engine.

The mock route validates the request shape and answers `202`. It explicitly cannot do more:
routing rules and the activity log live in `localStorage` under the key `"integrations"`
(`store.ts:INTEGRATIONS_STORAGE_KEY`), and issues are created through the client-side transaction
queue — none of which is reachable from a server route.

### 7.2 `POST {base}/api/integrations/inbound`

One normalized chat message from a connected provider. Provider adapters (Slack Events API, Teams
bot messaging endpoint) map native payloads onto this shape before calling it — or your backend
implements that normalization inline and treats this route as the provider-facing webhook itself.

**Request** (`application/json`, schema at `route.ts:79-85`)

| Field | Type | Req | Notes |
|---|---|---|---|
| `provider` | `"slack" \| "msteams"` | ✔ | |
| `workspaceName` | string, min 1 | ✔ | Provider workspace/tenant the bot is installed in. |
| `channel` | string, min 1 | ✔ | Channel id **or** name the message was posted in. |
| `author` | string, min 1 | ✔ | Display name of the message author. |
| `text` | string, min 1 | ✔ | Raw text, trigger token included. |

```json
{
  "provider": "slack",
  "workspaceName": "synquic",
  "channel": "eng",
  "author": "sana",
  "text": "/task Fix retailer login priority high"
}
```

**Responses**

| Status | Body | When |
|---|---|---|
| `202` | `{ "accepted": true }` | Queued for processing. **Always 202, even when the message will be logged as ignored** — trigger-mode and rule matching are pipeline outcomes, not transport errors. |
| `400` | `{ "accepted": false, "error": string }` (the mock adds `details` with zod issues) | Malformed payload. |
| `401` | `{ "accepted": false, "error": string }` | Signature verification failed. |

### 7.3 Signature verification (REQUIRED in the real receiver; skipped in the mock)

| Provider | Verification |
|---|---|
| `slack` | Verify `X-Slack-Signature` = HMAC-SHA256 over `` `v0:{X-Slack-Request-Timestamp}:{rawBody}` `` with the app's signing secret, and **reject timestamps older than 5 minutes**. |
| `msteams` | Verify the `Authorization: HMAC {base64}` header — HMAC-SHA256 of the raw body with the outgoing-webhook security token. |

Both require the **raw** request body. Capture it before JSON parsing.

### 7.4 Processing pipeline

Re-implement `src/lib/integrations/store.ts:ingest` server-side. The reference implementation is
authoritative; these are its exact steps.

**1 — Resolve the connection** by `(provider, workspaceName)`. Unknown → ignored
(`"Unknown connection"`). `status !== "connected"` → ignored
(`` `${ProviderLabel} workspace is disconnected` ``). Shape:

```ts
interface IntegrationConnection {          // store.ts:43
  id: string;
  provider: "slack" | "msteams";
  workspaceName: string;                    // provider-side tenant name
  connectedAt: string;                      // ISO
  status: "connected" | "disconnected";
  channels: { id: string; name: string }[];
}
```

**2 — Resolve the channel** within the connection. Unknown → ignored
(`` `Unknown channel for ${workspaceName}` ``).

**3 — Resolve the routing rule.** **A rule for the exact channel wins over the `"*"` catch-all**
(`store.ts:517-522`). No rule → ignored (`` `No routing rule for #${channel.name}` ``).

```ts
interface RoutingRule {                    // store.ts:61
  id: string;
  connectionId: string;
  channelId: string | "*";                 // "*" = any channel of the connection
  teamId: string;                          // the Linear team tasks land in
  defaultPriority?: number;                // clamped to 0..4
  defaultLabelIds?: string[];
  triggerMode: "mention" | "command" | "all";
}
```

**4 — Check the trigger mode.**

| Mode | Passes when | Regex |
|---|---|---|
| `mention` | text contains `@linear` (case-insensitive) | `/@linear\b/i` |
| `command` | text starts with `/task` | `/^\/task\b/i` |
| `all` | always | — |

Failure → ignored, with reason `"No @linear mention (rule requires mentions)"` or
`"Not a /task command (rule requires /task)"`.

**5 — Extract the task** (`store.ts:extractTask`):

1. Strip the trigger token: for `command`, `` /^\/task\b[:,]?\s*/i ``; always strip
   `` /@linear\b[:,]?\s*/gi ``.
2. Consume a priority hint — `` /\b(urgent|critical|high|medium|normal|low|no|none|p0|p1|p2|p3)\s+priority\b[.,;:]?/i ``
   then `` /\bpriority\s*(?:is|to|=|:)?\s*(…)\b[.,;:]?/i ``. Mapping (`store.ts:PRIORITY_WORDS`):
   `urgent|critical|p0 → 1`, `high|p1 → 2`, `medium|normal|p2 → 3`, `low|p3 → 4`, `none|no → 0`.
3. Consume an assignment hint —
   `` /\b(?:assign(?:ed)?\s+(?:it\s+|this\s+)?(?:to\s+)?me|to\s+myself)\b[.,;:]?/i `` → `assignSelf`.
4. Collapse whitespace. First line, first sentence (`` /^(.*?[.!?])\s+(\S[\s\S]*)$/ `` — a bare
   period inside a token like `v1.2` never splits) becomes the **title**; the remainder becomes
   the **body**.
5. Hard-cap the title at `TITLE_MAX_LENGTH = 140`; the overflow moves into the body prefixed with
   `…`. Strip trailing `.,;:!?` from the title.
6. Empty title → ignored (`"No text left to use as a title"`).
7. Append the footer to the description:
   `` `Created from ${PROVIDER_LABELS[provider]} · #${channel.name} · ${author}` `` — separated from
   the body by a blank line, or standing alone if the body is empty.
   `PROVIDER_LABELS = { slack: "Slack", msteams: "Microsoft Teams" }`.

**6 — Create the issue THROUGH THE SAME MUTATION CONTRACT AS THE CLIENT.** A `create` `Issue`
transaction, exactly the §3.2 shape. From `route.ts:63-69` and `store.ts:553-582`:

| Field | Value |
|---|---|
| `identifier` / `number` | Allocated from the team's `issueCounter` (server-side; the client mock uses `max(number)+1`). |
| `stateId` | The team's first **backlog**-category state, falling back to the first state (`states.find(s => s.category === "backlog") ?? states[0]`). No states → ignored (`` `${team.name} has no workflow states` ``). |
| `sortOrder` | Above the state's current top row: `first.sortOrder - 1`, or `1000` if the state is empty. |
| `priority` | `task.priority ?? clamp(rule.defaultPriority) ?? 0`. |
| `assigneeId` | The acting user when `assignSelf`, else absent. |
| `creatorId` | **The integration's bot/service user.** (The client mock uses `CURRENT_USER_ID`.) |
| `labelIds` | `rule.defaultLabelIds ?? []`. |
| `subscriberIds` | `[creatorId]` in the reference impl. |
| `teamId` | `rule.teamId`. Missing team → ignored (`"Routed team no longer exists"`). |
| `createdAt` / `updatedAt` | now. |

> *"Applying it through the sync engine is what fans the new issue out to every connected client
> as a delta — no side channel."* (`route.ts:67-69`)

**7 — Append an `InboundMessage`** to the connection's activity log so Settings → Integrations can
render it. Every message is logged, matching or not — *"the activity log is the debugging surface
for 'why didn't my message become an issue?'"*.

```ts
interface InboundMessage {                 // store.ts:76
  id: string;
  connectionId: string;
  channelId: string;
  author: string;                           // "" → "unknown"
  text: string;
  receivedAt: string;                       // ISO
  outcome:
    | { kind: "created"; issueId: string; identifier: string }
    | { kind: "ignored"; reason: string };
}
```

Cap: `INBOUND_LOG_LIMIT = 100`, newest first, oldest fall off.

### 7.5 Idempotency

**Not implemented today** — the mock has no dedupe at all. Slack and Teams both retry on
non-2xx and on timeouts, so a real receiver must:

- Dedupe on the provider's event id (Slack `event_id`, Teams activity `id`) with a short TTL, and
  answer `202` for a duplicate without re-running the pipeline.
- Answer within the provider's timeout (Slack: 3 s) — acknowledge first, process async.
- Use a deterministic `TransactionData.id` derived from the provider event id, so that even a
  duplicated pipeline run collapses to one issue at the sync layer.

### 7.6 Moving the state server-side

If you implement the receiver, the connection list, routing rules and activity log must move from
`localStorage` to your database, and Settings → Integrations must read them from an API instead of
`src/lib/integrations/store.ts`. Alternatively, model them as new sync models (§9.3) so they ride
the existing bootstrap/delta machinery for free.

---

## 8. Permissions & multi-user

### 8.1 The client trusts its local copy — completely

There is no permission check anywhere in the client data layer. `SyncStore` hands out every row it
holds; every list view is a filter over `store.all(model)`. `UserData.role`
(`"admin" | "member" | "guest"`) is used for *display* in the Members directory, not for
enforcement. `TeamData.memberIds` drives which teams appear in the sidebar, not access.

Therefore the server is the only enforcement point:

1. **Filter the bootstrap.** Send only rows the caller may see. What you omit simply does not exist
   for that user.
2. **Filter the delta stream.** Same rule, per subscriber. Never broadcast a row the subscriber
   cannot see.
3. **Authorize every transaction.** Report denials through `rejected` with a `200`
   (§3.2) so the client rolls the optimistic change back cleanly and shows the row snapping
   back. Do **not** return `403` — the client will retry-loop it.
4. **Never trust client-supplied identity fields.** `creatorId`, `authorId`, `actorId`,
   `invitedById`, `userId` all come from the client and are currently the constant `"u-yk"`.
   Overwrite them from the session and echo the corrected values in the delta.
5. **Never trust client-allocated identity.** `Issue.number` / `identifier` are guesses (§4.5).
   Reallocate and echo.

### 8.2 Workspace scoping

`HttpTransport` is constructed with **no arguments** (`SyncClient.ts:53-55`
`new HttpTransport()`), so the `[workspace]` route param never reaches the wire. None of the three
URLs carries a workspace segment.

Consequences and options:

- **Infer the workspace from the session** (recommended, zero frontend change). One session → one
  workspace's data.
- **Add it to the URL.** Pass the slug into the transport
  (`new HttpTransport({ baseUrl: … })` already accepts a `baseUrl`; adding a workspace option is a
  few lines) and mount your API per workspace. Note that IndexedDB is already per-workspace
  (`linear_recon_<slug>`), so multi-workspace switching works locally.
- **Header/cookie scoping.** Also fine, subject to the credential constraints in §6.5.

### 8.3 Sync groups / per-team delivery

If you want a user to receive only their teams' deltas, be aware of the hard constraint:

> **The client tracks exactly one `lastSyncId`** (`SyncClient.lastSyncId`) and reconnects with a
> single `?since=<id>`. The protocol has no concept of multiple streams or per-group cursors.

So per-team scoping must be implemented as **a per-subscriber sequence**, not by filtering a global
one:

- ❌ **Wrong:** allocate global ids and drop the ones a user cannot see. The user's stream becomes
  `41, 44, 47…`; that is *fine* on its own (gaps are legal), but the moment their team membership
  changes they will never receive the rows they now can see, because those actions carry ids below
  their high-water mark.
- ✅ **Right:** maintain a per-user (or per-sync-group) monotonic counter. Each user's stream is
  dense and totally ordered *for them*. Grant a new team → append catch-up actions with **new,
  higher** ids for that user.
- ✅ **Also right (simplest):** one sequence per workspace, delivered in full to every workspace
  member. This is what the reference impl does and is adequate for small workspaces.

Whatever you choose, the trailer's `lastSyncId` from `/api/sync/bootstrap` must be a value from
**the same sequence** the SSE stream will use for that user.

### 8.4 Revocation

Removing a user's access to rows they already hold is not expressible today: there is no "you can
no longer see this" action. The blunt instruments are (a) emit `D` deltas for the revoked rows, or
(b) force a re-bootstrap via a `SCHEMA_VERSION` bump (§9), which wipes the local mirror. Option (a)
is precise and works with the current client.

---

## 9. Migration & versioning

### 9.1 `SCHEMA_VERSION` semantics

```ts
// src/lib/data/types.ts:449
export const SCHEMA_VERSION = 7;
```

The value does **two** things:

1. It is the **IndexedDB database version** (`persistence.ts:openSchemaDb` passes it to
   `openDB(name, SCHEMA_VERSION, …)`), so bumping it triggers an `upgrade` that runs
   `createSchemaStores` and creates any new object stores.
2. It is compared against the stored `_meta.schemaVersion` on every boot
   (`persistence.ts:141-144`). On mismatch, `resetForSchemaMismatch()` clears **every model store
   and `_meta`** — the `_transaction` queue is deliberately left intact — which makes the next
   step a cold bootstrap.

Its documented history (`types.ts:427-448`):

| Version | Change |
|---|---|
| 2 | `IssueData` gains `reactions`/`attachments`; `ViewPreferenceData` gains `hiddenColumnIds`/`nestedSubIssues`/`showSnoozed`/`showRead`. |
| 3 | New `ProjectUpdate` model; `ProjectData` gains `labelIds`/`resources`/`dependsOnIds`. |
| 4 | New `Invite` + `Initiative` models (new object stores — the bump is what creates them); `UserData` gains `role`/`joinedAt`; `TeamData` gains `memberIds`. |
| 5 | New `Cycle` model; fixtures enable cycles + triage on TRENDZO. |
| 6 | Data-only fixture bump, no shape change — *"warm IndexedDB mirrors must re-bootstrap to pick the enriched row up."* |
| **7 (current)** | `TeamData` gains `description`/`resources`/`notifySubscriberIds`; `UserData` gains `title`; `UserSettingsData` gains `newsletterOptIn` — the last two retire the `localStorage` "linearProfile" workaround. `ProjectResource` becomes an alias of the shared `ResourceLink` (structurally identical, so no wire change). |

Two precedents matter for you:

- **Version 6** — a bump is the mechanism for forcing every client to re-bootstrap, *even when
  nothing structural changed*. If you need every client to re-pull, that is the lever.
- **Version 7** — the shape of a bump that only adds **optional** fields. Nothing on the wire
  became invalid; old rows are still legal; the bump exists purely so warm mirrors pick the new
  columns up. This is the pattern to copy for most additive changes.

### 9.2 What forces a re-bootstrap

| Trigger | Effect |
|---|---|
| Client `SCHEMA_VERSION` bumped (a frontend deploy) | Stored meta mismatches → wipe → cold bootstrap on next load. |
| The bootstrap trailer's `schemaVersion` ≠ the client's `SCHEMA_VERSION` | ⚠️ Subtle. `SyncClient.#coldBootstrap` writes **the server's value** into `_meta` (`SyncClient.ts:251-255`), so the *next* boot mismatches and wipes. **It self-heals as soon as one delta arrives**, because the debounced `#saveMeta` writes the *client's* `SCHEMA_VERSION` (`SyncClient.ts:306-318`). In a quiet workspace where no delta ever lands, you get a re-bootstrap on every single page load. **Always return `7` in the trailer** (or whatever `types.ts:SCHEMA_VERSION` currently says). |
| Clearing site data / a fresh browser profile | No `_meta` → cold bootstrap. |
| Nothing else | There is no server-initiated re-bootstrap signal. |

### 9.3 How to add a field or a model safely

**Adding an optional field to an existing model:**

1. Add it to the interface in `src/lib/data/types.ts` as `field?: T`.
2. Start sending it from the server — in `I` deltas and in the bootstrap.
3. **Warm clients will not have it** until a delta touches the row. If the field must appear
   immediately everywhere, bump `SCHEMA_VERSION` and add a line to its doc comment (this is
   exactly what version 6 did, and what version 7 did for the new Team/User fields).
4. Servers must tolerate clients that do not know the field yet — extra keys merge in harmlessly
   (`store.ts:mergeInto`) but are dropped on the next schema wipe.

**Adding a required field:** treat it as a breaking change. Bump `SCHEMA_VERSION`, and make sure
the bootstrap includes the field on every row before the new client ships.

**Adding a new model:**

1. Add the interface, add it to `ModelDataMap`, and **add its name to `MODEL_NAMES`**
   (`types.ts:406-425`) — that array drives the object-store list, the pool list, hydration,
   `loadAll`, and the mutation route's zod enum.
2. Bump `SCHEMA_VERSION` so existing clients re-bootstrap and actually receive the rows.
   *Store creation* alone no longer needs the bump — `openSchemaDb` (`persistence.ts:89-115`)
   self-heals by reopening one version higher when an expected store is missing — but a
   re-bootstrap does.
3. The mutation endpoint's model enum is derived from `MODEL_NAMES` (`mutation/route.ts:24`), so
   mirror that on your side.

**Renaming or removing a field:** LWW merge means a removed field lingers in warm mirrors until a
wipe. Bump `SCHEMA_VERSION`.

### 9.4 Not required today — and what each would need

| Thing | Status | To build it |
|---|---|---|
| **Yjs / CRDT collaborative editing** | **Deliberately NOT built.** `types.ts:153` marks `description` as a *"markdown snapshot (Yjs doc comes later phase)"*; `src/components/issues/detail/markdown.ts:14` says the same. There is no `yjs` dependency in `package.json` and no reference anywhere else in `src/`. | A separate document channel: a Yjs awareness/update WebSocket, per-document rooms, and a persisted update log. It would *not* ride the `SyncAction` stream — the current protocol carries whole-field LWW values, which cannot express character-level intent. Keep `description` as the snapshot for search/list rendering and treat the CRDT doc as the source of truth for the editor. |
| **Blob / file storage** | Not built. `AttachmentData` (`types.ts:136`) carries metadata only; `dataUrl` inlines base64 for images under 1 MB (`ATTACHMENT_INLINE_MAX_BYTES`) and is absent otherwise. | A presigned-upload endpoint plus a `url` field on `AttachmentData`. Note that large `dataUrl`s currently travel inside the `MutationRequest` body and the delta stream — moving to real storage will materially shrink both. |
| **Server-generated activity** | Not built — the client writes `Activity` rows alongside its own mutations. | Generate them server-side and stop the client from enqueueing them (`CommentComposer.tsx:43-55` and friends), or dedupe by id. |
| **Invite email delivery** | Not built. `types.ts:58-62`: *"Delivering the mail is the only server-side part."* | SMTP + an accept flow that creates the `User` and resolves the `Invite`. |
| **Push / email notifications** | Not built. `Notification` rows exist; delivery does not. | Out of band; the `Notification` model is already the payload. |
| **Replay-window overflow signal** | Not built (§5.7). | Add a `resync` SSE event (or close the stream with a distinguishing code) and teach `SyncClient` to wipe + re-bootstrap. That is a small change in `SyncClient.#handleTransportStatus` plus a new listener in `HttpTransport.subscribe`. |
| **`archive` / `unarchive` from the UI** | Contract exists; no call site enqueues them. | Add UI actions calling `queue.enqueue("archive", …)`. The server side is already specified (§5.4). |
| **Full-text search** | Not built — search is client-side over the pool. | A search endpoint outside the sync contract. |

---

## 10. Conformance checklist

Tick these off. Each is verifiable against the running app.

### Bootstrap

1. `GET {base}/api/sync/bootstrap` returns `200` with `Content-Type: application/x-ndjson`.
2. Body is one JSON object per line, `\n`-terminated; blank lines are tolerated by the client but avoid them.
3. Every row line is `{ "model": <one of the 18 names>, "data": { …, "id": <string> } }`.
4. Exactly one trailer line, last: `{ "_trailer": true, "lastSyncId": <int>, "schemaVersion": 7 }`.
5. `schemaVersion` equals the client's `SCHEMA_VERSION` (**7** today).
6. `lastSyncId` is the high-water mark **as of this snapshot** — no action with a lower id may still be pending delivery.
7. The row set includes a `User` with the id the client will use (`"u-yk"` until §6.4 is done) and a `Workspace` whose `slug` matches the route.
8. Rows are scoped to what the caller may see; the request is authenticated.

### Mutation

9. `POST {base}/api/sync/mutation` accepts `{ clientId, transactions[] }` and returns `200` + `MutationResponse`.
10. Transactions are applied sorted by `batchIndex` ascending (array order as tie-break).
11. All five `kind`s are handled: `create`, `update`, `delete`, `archive`, `unarchive`.
12. `create` is an idempotent upsert by `modelId`.
13. `update` merges only the fields present in `payload`; **a `null` value clears the field.**
14. Per-transaction failures are returned as `200` + `rejected: { <transactionId>: <message> }`.
15. **No 4xx for per-transaction problems.** Non-2xx is retried forever by the client.
16. `changeSnapshot` and `status` in the request are ignored.
17. Re-submitting the same `TransactionData.id` is safe (dedupe or idempotent apply).
18. Server-owned fields (`Issue.number`/`identifier`, `creatorId`/`authorId`/`actorId`, `Team.issueCounter`) are reallocated/overwritten server-side and echoed back in the delta.

### Delta stream

19. `GET {base}/api/sync/events?since=<id>` returns `200` with `Content-Type: text/event-stream` and stays open.
20. A `handshake` event (`{lastSyncId, schemaVersion}`) is sent on connect. *(The current client ignores it — send it anyway.)*
21. Every action is one `event: action` frame whose `data` is a `SyncAction` JSON object.
22. Actions with `id > since` are replayed on connect, oldest first, **before or safely merged with** live traffic — never interleaved out of order.
23. Sync ids are **strictly increasing**, never reused, and delivered in ascending order.
24. **Every applied transaction is echoed to the originating client**, not just to other clients. (Without this, writes are lost on reload — §5.5.)
25. `I` carries the full row; `U` carries only changed fields plus `id`; `D` carries no `data`; `A` carries `{id, archivedAt}`; `V` carries `{id}`.
26. A heartbeat comment (`: …\n\n`) is sent at least every ~30 s.
27. `X-Accel-Buffering: no` (or your proxy's equivalent) is set; the stream is not buffered or compressed.
28. The stream survives `EventSource`'s automatic reconnect, which re-sends the **original** `since` value.
29. The replay window covers at least a full working session; you have a plan for overflow (§5.7).

### Cross-cutting

30. Auth: same-origin cookies work as-is; cross-origin needs the edits in §6.5.
31. Every entity field matches §4 in name, type and optionality.
32. `sortOrder` is stored as a **float**, not an integer.
33. `identifier` is `` `${team.key}-${number}` `` and unique per team.
34. Referential integrity is maintained server-side (nothing on the client enforces it).
35. Deletes cascade explicitly — emit the dependent updates yourself.

### How to test against the app

```bash
# 1. Point the app at your backend
cat > .env.local <<'EOF'
NEXT_PUBLIC_SYNC_TRANSPORT=http
NEXT_PUBLIC_API_BASE_URL=https://your-backend.example.com
EOF

# Leave NEXT_PUBLIC_API_BASE_URL empty to hit the dev mock at
# src/app/api/sync/* on the same origin — a useful known-good baseline.

npm run dev
```

Then verify, in order:

| # | Action | Expected |
|---|---|---|
| 1 | Open `http://localhost:3000/dev/data` in a fresh profile | `status: ready`, `lastSyncId` = your trailer value, `pending: 0`, per-model row counts match your bootstrap. |
| 2 | DevTools → Network | One `bootstrap` request (NDJSON), one `events` request (pending/streaming). No `mutation` yet. |
| 3 | Click **Toggle priority** | The value flips instantly. Network shows one `POST /api/sync/mutation`. Within a moment `lastSyncId` increments and `pending` returns to 0. |
| 4 | Reload the page | The new priority **persists** and Network shows **no** `bootstrap` request (warm start). *If the priority reverts, you acked without echoing the delta — checklist item 24.* |
| 5 | Open the same URL in a second browser profile | Both show the same data. Mutate in one; the other updates within a second (checklist item 24 again, cross-client). |
| 6 | Stop the backend | Sidebar shows a red dot and "Offline"; `status: error`. Mutations queue and `pending` climbs. |
| 7 | Restart the backend | `EventSource` reconnects, status returns to `ready`, the queue drains, `pending` returns to 0. |
| 8 | Force a rejection (e.g. update a `modelId` that does not exist) | Return `200 {ok:false, rejected:{…}}`. The optimistic change visibly snaps back and `pending` returns to 0 — **it must not retry**. |
| 9 | Kill the backend, make an edit, reload, restart the backend | The pending transaction is restored from IndexedDB and resubmitted (checklist item 17). |
| 10 | Return `schemaVersion: 6` in the trailer | Reproduces the re-bootstrap loop of §9.2 — confirm you are returning **7**. |
| 11 | Full app sweep | `/synquic-labs/team/TRENDZO/all` (list + board), `/synquic-labs/projects/all`, `/synquic-labs/inbox`, `/synquic-labs/my-issues/assigned`, an issue detail page. Every surface reads from the same pool, so a missing model shows up as an empty section. |

`node scripts/verify-sync.mjs` (puppeteer-core, expects a dev server on `:3001`) automates
steps 1–5: two independent browser contexts, optimistic round-trip, realtime convergence, warm-reload
persistence.

---

## Appendix A — file map

| Path | What it is |
|---|---|
| `src/lib/data/transport.ts` | **The seam.** `SyncTransport`, `BootstrapPayload`, `TransportStatus`. |
| `src/lib/data/transports/http.ts` | Reference HTTP client. The contract in §3 is exactly what this file does. |
| `src/lib/data/transports/local.ts` | The default in-browser sync authority. Useful as a second `SyncTransport` example. |
| `src/lib/data/SyncClient.ts` | Facade: transport selection, boot sequence, delta application, `lastSyncId`. |
| `src/lib/data/types.ts` | **All wire types.** Entities, `MODEL_NAMES`, `SCHEMA_VERSION`, `SyncAction`, `MutationRequest`/`Response`, `TransactionData`, `BootstrapLine`. |
| `src/lib/data/store.ts` | MobX pool + merge semantics (`mergeInto`, `applyAction`). |
| `src/lib/data/persistence.ts` | IndexedDB layer, schema wipe rule, durable transaction queue. |
| `src/lib/data/transactions.ts` | Optimistic queue: batching, backoff, rollback, restore. |
| `src/lib/data/fixtures.ts` | The 80-row DEMO set used in every example here (opt-in only — see `src/lib/data/demo.ts`). |
| `src/lib/workspace/workspaces.ts` | Workspace creation (workspace + owner + default team + statuses). |
| `src/server/syncStore.ts` | Dev-only reference server: row map, sync-id allocation, action log, subscribers. |
| `src/app/api/sync/bootstrap/route.ts` | Dev-only NDJSON bootstrap endpoint. |
| `src/app/api/sync/mutation/route.ts` | Dev-only mutation endpoint (zod validation). |
| `src/app/api/sync/events/route.ts` | Dev-only SSE delta endpoint. |
| `src/app/api/integrations/inbound/route.ts` | Dev-only webhook receiver; its header comment is the §7 contract. |
| `src/lib/integrations/store.ts` | Reference ingest pipeline (`ingest`, `extractTask`). |
| `src/lib/auth/session.ts` | Session seam + the six documented auth endpoints. |
| `src/lib/auth/profile.ts` | Initials derivation + avatar downscaling. No storage since `SCHEMA_VERSION` 7. |
| `src/app/(app)/login/LoginView.tsx` | The four login methods; six `TODO(auth-backend)` markers. |
| `src/lib/issues/viewPrefs.ts:21` | `CURRENT_USER_ID = "u-yk"` — the hard-coded identity. |
| `src/app/(app)/dev/data/DataInspector.tsx` | Live engine inspector at `/dev/data`. |
| `scripts/verify-sync.mjs` | Two-context puppeteer sync gate. |
| `.env.example` | The two environment variables, documented. |

## Appendix B — the whole contract in TypeScript

Copy-paste for your server. Verbatim from `src/lib/data/types.ts`.

```ts
export type ModelName =
  | "Workspace" | "User" | "Team" | "WorkflowState" | "Issue" | "Label"
  | "Project" | "ProjectUpdate" | "Milestone" | "Comment" | "Activity"
  | "Notification" | "Favorite" | "ViewPreference" | "UserSettings"
  | "Invite" | "Initiative" | "Cycle";

export const SCHEMA_VERSION = 7;

// insert / update / archive / delete / unarchive
export type SyncActionType = "I" | "U" | "A" | "D" | "V";

export interface SyncAction {
  id: number;                 // monotonic syncId
  modelName: ModelName;
  modelId: string;
  action: SyncActionType;
  data?: Record<string, unknown> & { id: string };  // full row for I; changed fields for U; omit for D
}

export interface BootstrapTrailer {
  _trailer: true;
  lastSyncId: number;
  schemaVersion: number;
}

export type BootstrapLine =
  | { model: ModelName; data: Record<string, unknown> & { id: string } }
  | BootstrapTrailer;

export type TransactionKind = "create" | "update" | "delete" | "archive" | "unarchive";

export interface TransactionData {
  id: string;
  kind: TransactionKind;
  modelName: ModelName;
  modelId: string;
  payload?: Record<string, unknown>;
  changeSnapshot?: Record<string, unknown>;   // client-only; ignore
  batchIndex: number;
  createdAt: string;
  status: "queued" | "executing" | "acked";
}

export interface MutationRequest {
  clientId: string;
  transactions: TransactionData[];
}

export interface MutationResponse {
  ok: boolean;
  lastSyncId: number;                         // ignored by the current client
  rejected?: Record<string, string>;          // transaction id -> error message
}

export interface SyncHandshake {
  lastSyncId: number;
  schemaVersion: number;
}
```

---

## Appendix C — where the older docs disagree with the code

`MASTER_PROMPT.md` and `PROGRESS.md` predate the current implementation. **Where they and this
document disagree, this document (and the code it cites) wins.** If someone hands you
`MASTER_PROMPT.md §19` as "the backend spec", these are the traps.

### MASTER_PROMPT.md — aspirational, not descriptive

| Doc says | Code does | Impact |
|---|---|---|
| L54, L479, L445, L550: **WebSocket** delta sync (`ws` / `graphql-ws`), *"handshake exchanges `{lastSyncId}`; behind → request missing range"* | **SSE** via `EventSource`. The handshake is server→client only and the client does not even listen for it; the catch-up position rides in the `?since=` query string; there is no "request missing range" round-trip. | Build SSE (§3.3), not a socket. |
| L54, L228, L477, L554: **GraphQL** for mutations | Plain REST JSON `POST /api/sync/mutation`. No GraphQL anywhere in `src/` or `package.json`. | Build REST (§3.2). |
| L479: sync actions `I\|U\|A\|D\|C\|V\|G\|S` (8 letters) | `SyncActionType = "I"\|"U"\|"A"\|"D"\|"V"` — **5** (`types.ts:452`). `C`, `G`, `S` do not exist. | Implement 5. |
| L467 §18: **30 entities**, incl. `WorkspaceMember`, `TeamMembership`, `Reaction`, `Attachment`, `Document`, `CustomView`, `Draft`, `AgentChat`, `AgentSkill`, `Loop`, `LoopRun`, `IssueRelation`, `Template`; `ProjectMilestone` | **18** in `MODEL_NAMES`. Memberships/reactions/attachments/resources collapsed into *fields*; custom views, drafts, agent chats/skills, loops live in `localStorage` and are **not synced**; `IssueRelation` and `Template` were never built; `ProjectMilestone` is `Milestone`. `Activity` and `Invite` are in the code but absent from §18's list. | **The single biggest gap.** A backend built from §18 ships ~12 tables the client never reads and misses 2 it does. Use §4 of this document. |
| L473, L475, L479: `_meta` holds `firstSyncId`, `subscribedSyncGroups`, `schemaHash`; trailer carries `subscribedSyncGroups`/`databaseVersion`; **sync groups** scope delivery | `PersistMeta` is `{lastSyncId, schemaVersion, bootstrappedAt?}`; the trailer is `{_trailer, lastSyncId, schemaVersion}`. `syncGroup`, `subscribedSyncGroups`, `firstSyncId`, `schemaHash`, `databaseVersion` appear **nowhere** in `src/`. Broadcast is unscoped. | Do not implement sync groups against the current client — see §8.3 for the constraint (one `lastSyncId`) and the workable alternative. |
| L475: **partial / lazy bootstrap** per sync-group/model, batching model loader, partial indexes | `bootstrap()` takes no arguments and returns every row; the endpoint accepts no query params. "Three bootstrap modes" is really two — cold via transport, warm via IndexedDB (and warm never reaches the transport). | Serve one full snapshot (§3.1). |
| L473: per-workspace DB `app_<hash>` + a root DB registry; *"schema-hash change → migrate or re-bootstrap"* | `linear_recon_<slug>` (`persistence.ts:30`); no registry DB; mismatch always **wipes and re-bootstraps**, never migrates. | Cosmetic for you; §9 is the real rule. |
| L479: *"rebase queued transactions (client-wins per changed property)"* | **Not implemented.** See §5.6.1. | Do not assume the client re-bases. |
| L469, L582: `owner > admin > member > guest`, *"server-side enforcement on every mutation"* | `WorkspaceRole = "admin" \| "member" \| "guest"` — **no `owner`**. Zero enforcement; `MutationRequest` has no principal at all (§6.6). | You must design the auth envelope; no doc anticipated it. |
| L56, §17.1: **Auth.js / NextAuth v5** + `@simplewebauthn/*` | Neither is installed. `session.ts` is a `localStorage` wrapper. | The seven real endpoint shapes are in `src/lib/auth/session.ts:9-16` and in §6 — they appear in **no** planning doc. |
| L43, L334, L485, L554: **Yjs + y-prosemirror** everywhere, collab server, presence, `descriptionYDoc`/`bodyYDoc` | Tiptap starter-kit only; no `yjs`, no `y-prosemirror`, no provider. `description` is a markdown string. | Serve markdown strings. See §9.4. |
| L54: *"REST for auth/webhooks"* — the only webhook mention; no shape given | `src/app/api/integrations/inbound/route.ts` carries a complete contract in its header, reproduced in §7. | The **code is ahead of the doc** here; use §7. |
| L55, L57: Postgres + Drizzle, Redis event bus, Anthropic API behind a server action layer, BullMQ/pg-boss for Loop schedules | None exist. `src/server/syncStore.ts` is one in-process in-memory map. The agent is rule-based (`LocalAgentAdapter`), and **Loops have a builder and run history but nothing that fires a schedule**. | The Loops scheduler is a genuine backend requirement that no client code covers. |
| L59, L544, L583: Vitest / Playwright, *"sync engine unit-tested"* | No test runner installed. Verification is ad-hoc `scripts/*.mjs` (puppeteer-core). | Do not expect a conformance suite to exist. `scripts/verify-sync.mjs` is the closest thing (§10). |
| L12, L36: *"the architecture in §20"* / *"per §20"* | §20 is RICH TEXT; the sync architecture is **§19**. Stale cross-references. | Read §19. |
| L34/L47 stack list (`react-virtuoso`, `react-window`, `comlink`, `Dexie`, `nivo`/`visx`/`d3`, `date-fns`, `@floating-ui/react`) | None installed. `idb` and `cmdk` are. MobX is **7.x**, not 6. Next is 16.3.2. | Non-contract, listed for completeness. |

### PROGRESS.md — stale status

| Doc says | Reality |
|---|---|
| L35-40: *"Open bug ... `LocalTransport` cannot persist any CREATE — `DataCloneError`"* | **Closed.** Fixed at `transactions.ts:95-101` (`toPlain` deep-converts via mobx `toJS`) — and L27 of the same file already records the fix. The file contradicts itself; L35-40 is dead text. |
| L7, L45: SSE deltas / *"the app's open SSE stream"* | True only under `NEXT_PUBLIC_SYNC_TRANSPORT=http`. Phase 7 made `LocalTransport` the default, so the shipped app holds **no SSE stream at all** — realtime is `BroadcastChannel`. |
| L13: *"fixtures pristine: 1 issue…"* · L33: *"1 issue, 5 milestones, 0 view prefs"* | **3 issues** (`issue-tre-37` plus the two triage arrivals added at `SCHEMA_VERSION` 5). Projects (10) and milestones (5) are right. Total: **80 rows**. |
| L45: `scripts/probe.mjs` | Does not exist. The real scripts are `verify-sync.mjs`, `verify-integrations.mjs`, `verify-facet-panel.mjs`, `debug-facet{,2}.mjs`, `shoot-phase{4,5}.mjs`, `tmp-verify-chips.mjs`. |
| L17-21: Phases 13–16b marked `🔄 running` | All shipped — FacetPanel, PropertyChips, the Integrations MVP (including the webhook route that is §7's source), Cycles + Triage, and the marketing landing all exist. |
| L11: *"`/api/sync` routes demoted to a DEV-ONLY mock"* | True by convention, **not by a runtime guard** — see the callout in §1.1. |
| L5, L10, L12: route counts (19 / 24 / 52) | Historical per-phase snapshots. There are 58 `page.tsx` files today; L12's "26 settings routes" is accurate. |
| L50: dependency list | Missing `@dnd-kit/*`, `@tiptap/*`, `cmdk`, `puppeteer-core`. |
| **L11**: *"Contract lives in `src/lib/data/transport.ts` → becomes BACKEND_API.md"* | ✅ **Accurate.** That is this document. |
