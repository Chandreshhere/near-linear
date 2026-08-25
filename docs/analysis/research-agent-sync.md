# Research: Linear Agent / Skills / Loops + Linear Sync Engine (LSE) architecture
Research date: 2026-08-24. All information from public sources (Linear docs/changelog/blog, endorsed reverse-engineering write-ups, public talks).

---

## 1. Linear Agent (built-in AI)

Source: https://linear.app/docs/linear-agent · https://linear.app/changelog/2026-03-24-introducing-linear-agent · https://linear.app/docs/agents-in-linear

### Access / chat UI
- Open with **Cmd/Ctrl + J** (opens agent chat or recent conversations); dedicated interface at `linear.app/agent`; chat window docked bottom-right of the desktop app; also on mobile.
- Also invoked by mentioning **@Linear** in any comment/reply (issues, documents, project & initiative descriptions, updates), and via **Slack** and **Microsoft Teams** integrations.
- **Multiple open chats**: "multiple open chats at once. In the toolbar, each open chat appears as a tab" with labels and unread indicators.
- **Chat history**: "Linear keeps a history of your past chats so you can return to them later" — accessible from the agent toolbar, organized by recency/relevance.
- Public beta announced **2026-03-24**; available by default in the workspace; admins can disable under Settings → AI → Linear Agent. Users can change their default home view from Linear Agent in Preferences.

### Capabilities
- "Create and update issues, projects, milestones and initiatives."
- "Summarize and analyze ongoing work, threads, and customer requests."
- "Answer questions about your workspace data" (context: teams/sub-teams, initiatives, projects w/ milestones & cycles, issues + relationships, comments, activity history, documents).
- "Post, edit, and delete its own comments in threads"; draft documents and stakeholder updates.
- Respects existing permissions: "it can only reference or change content that you already have access to."
- **MCP servers**: "Linear Agent can connect to MCP servers to access tools and data outside of Linear," configured workspace-wide by admins.
- **Guidance** layers: workspace-wide instructions, team-specific guidance, personal guidance (Settings → Account → Agent personalization).
- **Coding sessions** (changelog 2026-06-11, updated 2026-08-20): delegate an issue to Linear (or @linear in Slack/Teams) → agentic coding in a secure sandbox → draft PR with diff, reviewable/mergeable from Linear. Model selectable by workspace admins in Coding sessions settings (docs list Claude and GPT model families; default tracked as "Auto"). Environments: one repo per active environment; runtimes (Node, Python, Ruby, Go), services (Postgres, Redis), env vars, prep scripts; browser automation for testing/screenshots. Promotional AI credits ($20/user) then paid AI credits.
- **Agent-assisted editing / project updates** (changelog 2026-07-23, 2026-06-18): text attribution and drafting of project updates.

### Slash commands & Skills
Source: https://linear.app/docs/linear-agent (Skills section), changelog 2026-03-24.
- Reusable workflows saved as **skills**, triggered via **slash command (`/`)** in the agent input or the skills menu; Linear "automatically applies relevant skills" when context matches the skill's intent.
- **Personal skills**: Settings → Account → Agent personalization → Skills. For personal/evolving/individual workflows. Invoked "directly with a slash command in the agent input."
- **Team skills**: team settings → AI & Agents → Agent skills; "visible for use across all members of that specific team"; managed under Team permissions → Agent skills management. For repeatable team workflows.
- Creation: ask Linear Agent in chat to save the current interaction as a personal or team skill.
- "Agent and Skills are included on all Linear plans" (beta: everything free; at GA chat expected to remain in base seat price; Automations/Code Intelligence may become usage-based past thresholds).

### Loops (agent automations)
Sources: https://linear.app/docs/loops · https://linear.app/now/introducing-loops · https://linear.app/changelog/2026-07-20-introducing-loops
- Launched **2026-07-20**. "Loops let you define scheduled or event-driven operations for Linear Agent to run across your workspace." Business & Enterprise plans; consume AI credits (launch promo: $20/seat credits, expired 2026-08-20).
- **Triggers**: (a) scheduled cadence ("Every Monday afternoon"), (b) event/condition-based — issue created or updated in specific teams "when issues match a set of conditions" (condition matching evaluated before instructions run).
- **Execution model**: "Each time a loop runs, Linear Agent reviews its instructions and determines what should happen next," using context from Linear, connected codebases, MCP servers, and previous runs; applies judgment to handle exceptions, gather missing info.
- **Creation**: via agent chat (Cmd/Ctrl+J, describe outcome, ask to save as loop) or manually: Loops section → New loop → choose trigger → instructions → optional MCP connectors → scope/permissions → publish.
- **Draft vs published**: loops are drafts until published; "All published versions of a loop are saved and can be restored"; removed connectors need re-auth to restore.
- **Run history**: loop details → Run history tab (audit timing + actions per run). "Anyone with access can review their instructions, see how they are configured, and inspect what happened during each run."
- **Enable/disable**: right-click loop in workspace/team loop view → Enable/Disable (since 2026-08-13, the Disabled badge is clickable to re-enable). Deletion is permanent.
- **Permissions (per loop)**: team read/write access; web access; Code Intelligence (browse/analyze repos); coding sessions (start draft PRs); write to externally synced issues; run on issues from external sources; act outside the triggering issue.
- **Connectors/MCP**: "When a connected MCP is available to a loop, Linear can use it to gather context or take supported actions in other services" (e.g. GitHub, Notion, Slack, Sentry). Admins can restrict to allowlisted MCP servers.

---

## 2. Linear Sync Engine (LSE) — public architecture, as reimplementation guidance

Primary sources:
- Talks: Tuomas Artman, "Scaling the Linear Sync Engine" (2023-06-29, https://linear.app/now/scaling-the-linear-sync-engine, YouTube Wo2m3jaJixU); earlier React Helsinki talk "Real-time sync" (YouTube WxK11RsLqp4); devtools.fm ep. 61 (https://www.devtools.fm/episode/61).
- Reverse engineering (endorsed by Linear's CTO): https://github.com/wzhudev/reverse-linear-sync-engine
- https://performance.dev/how-is-linear-so-fast-a-technical-breakdown · https://marknotfound.com/posts/reverse-engineering-linears-sync-magic/
- Official offline docs: https://linear.app/docs/get-the-app

### Core inversion (local-first)
"The actual database the UI reads from is in the browser, in IndexedDB." Client trusts local data; server is source of truth for correctness; the two reconcile asynchronously. UI never waits on the network for its own writes.

### Client object model
- Entities (Issue, Team, Organization, Comment, …) are **models**: TypeScript classes with decorators — `@ClientModel` registers in a `ModelRegistry` (load strategy, schema version, property metadata); `@Property`, `@Reference`, `@OneToMany` register properties/references/collections/back-references/reference arrays. Registry keeps a combined **schema hash** for migration detection.
- **MobX observability**: property getters/setters wrapped (Object.defineProperty); a setter records (name, old, new) into `modifiedProperties` — this both re-renders `observer` React components granularly and feeds transaction generation. Models never write to the DB directly.
- **Object pool**: `modelLookup` map UUID → in-memory instance on the SyncClient; instances hydrated via `updateFromData`.

### Bootstrap
- **Full bootstrap**: `GET client-api.linear.app/sync/bootstrap?type=full&onlyModels=...` → newline-delimited JSON stream of model instances, terminated by metadata: `{"lastSyncId": 2326713666, "subscribedSyncGroups": [...], "databaseVersion": 948}`. (Later optimization: sync groups fetched first via `/sync/user_sync_groups` and passed in the request so bootstrap can be split/parallelized.)
- **Partial bootstrap**: for lazily loaded models — `?type=partial&syncGroups=<id>&onlyModels=Issue,Attachment`.
- **Local bootstrap**: warm start from IndexedDB, then catch up via delta packets.
- Heavy tables (Issue, Comment) are lazy-loaded so a 10k-issue workspace boots ~like a 100-issue one.

### Persistence (IndexedDB)
- `linear_databases` DB: registry of workspace DBs (name derived from userId/version/userVersion, `schemaHash`, `schemaVersion` for migrations).
- `linear_<hash>` per workspace: one store per model (hashed names), `_meta` store (persistence state incl. `lastSyncId`, `firstSyncId` = lastSyncId at full bootstrap, `subscribedSyncGroups`), `_transaction` store (queued/unsent transactions).

### Ordering: lastSyncId
"All transactions sent by clients follow a total order … represented by the sync id, an incremental integer." `lastSyncId` = global DB version; every server-executed transaction increments it. Client compares its `lastSyncId` to the server's (from the WebSocket handshake: `{"userSyncGroups": ..., "lastSyncId": ..., "databaseVersion": ...}`) and requests missing deltas if behind. No CRDT/OT for the object graph — total order + last-write-wins per property + rebasing.

### Sync groups & partial indexes
- **SyncGroup** ≈ collection of models tied to a User or Team → permission-scoped delta delivery (only receive packets for subscribed groups). Delta action types G/S handle sync-group membership changes → trigger partial bootstrap for newly granted data.
- **Partial indexes** enable lazy hydration: e.g. comments of an issue via index `issueId-<uuid>`; up to ~3 levels of indirection (e.g. `issue.cycleId-<cycle-id>`). `LazyReferenceCollection` checks local index → else batches network loads via `BatchModelLoader`: `POST /sync/batch {"firstSyncId": ..., "requests": [{"indexedKey": "issueId", "keyValue": "...", "modelName": "Comment"}]}`.

### Transactions (write path)
- Kinds: Creation / Update / Deletion / Archival / Unarchival transactions.
- `TransactionQueue` arrays: `createdTransactions` → (microtask `commitCreatedTransactions`, grouped by `batchIndex` per event-loop tick) → `queuedTransactions` (serialized to `_transaction` store for durability) → `executingTransactions` (in flight) → `completedButUnsyncedTransactions` (server ACKed with a `lastSyncId`; waiting for matching delta packet); plus `persistedTransactionsEnqueue` for reloads after restart.
- `TransactionExecutor` merges a batch into one GraphQL request (e.g. `mutation IssueUpdate($issueUpdateInput: ...)`), sent to the API; optimistic in-memory update already happened.
- **Undo/redo**: transactions carry `changeSnapshot` with old+new values.
- **Rebasing**: after applying a delta, queued transactions are rebased onto the new state (`rebased` flag) so client ops stay consistent — effectively client-wins-per-changed-property over stale fields.

### Delta sync (read path)
- Server broadcasts **delta packets** (to all clients incl. originator) over the realtime connection (GraphQL over WebSocket). Each **sync action**: `{id (sync id), modelName, modelId, action, data}`; actions: I=Insert, U=Update, A=Archive, D=Delete, C=Covering, V=Unarchive, G/S=sync-group changes.
- `applyDelta`: (1) handle sync-group changes (partial bootstrap if needed), (2) `DependentsLoader` fetches dependent models whose previously-loaded partial indexes are affected, (3) write to IndexedDB (only deltas persist — never direct client writes), (4) update in-memory models, (5) rebase queued transactions.
- MobX granularity: a 50-issue batch update re-renders 50 cells, not the whole list.

### Offline behavior (official docs, linear.app/docs/get-the-app)
- "Syncing" appears next to the workspace name in the sidebar when many changes are waiting or sending is slow; "The number next to it shows how many changes are waiting to be sent."
- "Offline mode is designed as a failsafe and not a full-fledged feature." Changes "will be reloaded and retried even if you restart the application before restoring connectivity" (via the persisted `_transaction` store → `loadPersistedTransactions`, replay in memory, resubmit).
- Caveat: heavy offline editing can overwrite teammates' changes (LWW semantics); non-idempotent replays can error ("can't delete a model that doesn't exist").
- Web app has near-parity with desktop, including offline mode.

### Reimplementation checklist (derived)
1. Model layer: decorator-registered schema metadata + registry hash; observable properties (MobX or signals); UUID object pool.
2. Storage: per-workspace IndexedDB with per-model stores + `_meta` + `_transaction`; schema-hash-driven migration/rebootstrap.
3. Bootstrap: streamed NDJSON full bootstrap w/ `lastSyncId` snapshot; partial bootstrap per sync group; local bootstrap + delta catch-up.
4. Writes: optimistic mutation → transaction objects (5 kinds) → batched per tick → persisted queue → merged GraphQL mutation; ACK carries `lastSyncId`; complete on matching delta.
5. Reads: WebSocket delta packets with monotonic sync ids; apply to DB + memory; rebase pending transactions; gap detection via lastSyncId comparison on (re)connect.
6. Scoping: sync groups for permissions; partial indexes + batch loader for lazy collections.
7. UX: Syncing indicator w/ pending count; retry-after-restart; undo via change snapshots.

---

## 3. Publicly acknowledged tech stack

Sources: performance.dev breakdown; stackshare.io/linear/linear; devtools.fm ep. 61; Linear changelogs.
- **Frontend**: React + TypeScript; **MobX** (observable object graph, granular re-renders); **IndexedDB** (via `idb`) as the local store; ProseMirror + **y-prosemirror/Yjs** (CRDT) for collaborative rich-text/document editing (docs/issue descriptions use Yjs even though the object graph sync does not use CRDTs); GraphQL transport (graphql-request + GraphQL over WebSocket for realtime); Emotion + StyleX styling; Radix UI; Vite/Rolldown bundling; ~21MB minified JS aggressively code-split into hundreds of route chunks.
- **Desktop**: Electron (same web runtime). **Mobile**: Swift/Kotlin native reimplementations.
- **Backend**: Node.js + TypeScript; PostgreSQL (issues table partitioned ~300 ways) on Cloud SQL; Redis/Memorystore (event bus, cache, sync cursors); Kubernetes on GCP; Cloudflare Workers edge proxy; turbopuffer vector DB (similarity/duplicate detection); GraphQL public API + MCP server (changelog 2026-03-24 notes GraphQL subscriptions & MCP pagination).

## Source list
- https://linear.app/docs/linear-agent
- https://linear.app/docs/agents-in-linear
- https://linear.app/docs/coding-sessions
- https://linear.app/docs/loops
- https://linear.app/now/introducing-loops
- https://linear.app/changelog/2026-03-24-introducing-linear-agent
- https://linear.app/changelog/2026-07-20-introducing-loops
- https://linear.app/changelog/2026-06-11-coding-sessions
- https://linear.app/changelog/2026-08-20-coding-environments
- https://linear.app/changelog/2026-07-23-agent-assisted-editing
- https://linear.app/docs/get-the-app (offline mode / Syncing indicator)
- https://linear.app/now/scaling-the-linear-sync-engine (talk, 2023-06-29; YouTube Wo2m3jaJixU; React Helsinki predecessor WxK11RsLqp4)
- https://github.com/wzhudev/reverse-linear-sync-engine (endorsed by Linear CTO)
- https://performance.dev/how-is-linear-so-fast-a-technical-breakdown
- https://marknotfound.com/posts/reverse-engineering-linears-sync-magic/
- https://gist.github.com/pesterhazy/3e039677f2e314cb77ffe3497ebca07b (CTO-endorsed sync-engine write-up/resource list)
- https://www.devtools.fm/episode/61 (Tuomas Artman)
- https://stackshare.io/linear/linear
