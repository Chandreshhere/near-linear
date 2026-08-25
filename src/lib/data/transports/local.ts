/**
 * LocalTransport — the DEFAULT SyncTransport (MASTER_PROMPT.md §19 with the
 * server half folded into the browser). It is a complete sync authority that
 * runs 100% client-side: no fetch, no WebSocket, no EventSource, no server of
 * any kind. The app boots, mutates, persists and syncs across tabs with the
 * network unplugged.
 *
 *   bootstrap() — fresh database → the §26 fixtures; database that already
 *                 holds rows → those rows (never re-seeds over real data).
 *   submit()    — validates each transaction exactly like the dev mock
 *                 (src/server/syncStore.ts), applies it to the IndexedDB
 *                 mirror, allocates monotonic sync ids from the persisted
 *                 `_meta` counter ("localSyncId") inside the SAME IndexedDB
 *                 readwrite transaction — so two tabs can never mint the same
 *                 id — then publishes the resulting SyncActions to this tab
 *                 (the server echoes the originator too) and to every other
 *                 tab over BroadcastChannel("linear-recon-sync").
 *   subscribe() — BroadcastChannel replaces SSE. Status is "open" at once:
 *                 there is nothing to connect to.
 *
 * SSR-safe: no IndexedDB/BroadcastChannel access at module scope or in the
 * constructor — the SyncClient is also constructed on the server.
 */

import type { IDBPDatabase } from "idb";

import { buildFixtures } from "@/lib/data/fixtures";
import {
  META_STORE,
  openSchemaDb,
  type LinearDBSchema,
} from "@/lib/data/persistence";
import type {
  BootstrapPayload,
  SyncTransport,
  TransportStatus,
} from "@/lib/data/transport";
import {
  MODEL_NAMES,
  SCHEMA_VERSION,
  type AnyModelData,
  type ModelName,
  type MutationRequest,
  type MutationResponse,
  type SyncAction,
  type TransactionData,
  type UUID,
} from "@/lib/data/types";

/** Cross-tab realtime channel (one per origin — messages carry the workspace). */
export const SYNC_CHANNEL_NAME = "linear-recon-sync";

/** `_meta` key holding the locally allocated sync-id high-water mark. */
export const LOCAL_SYNC_ID_KEY = "localSyncId";

const DEFAULT_WORKSPACE_SLUG = "default";

type LinearDB = IDBPDatabase<LinearDBSchema>;

/**
 * Permissive view of one model store: `tx.objectStore(name)` with a union of
 * store names would otherwise demand the intersection of every row shape.
 */
interface RowStore {
  get(key: UUID): Promise<AnyModelData | undefined>;
  getAll(): Promise<AnyModelData[]>;
  put(value: AnyModelData): Promise<UUID>;
  delete(key: UUID): Promise<void>;
  count(): Promise<number>;
}

interface ChannelMessage {
  workspace: string;
  sender: string;
  actions: SyncAction[];
}

const MODEL_NAME_SET: ReadonlySet<string> = new Set<string>(MODEL_NAMES);

function isModelName(value: string): value is ModelName {
  return MODEL_NAME_SET.has(value);
}

function newSenderId(): string {
  const c = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `tab-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function parseMessage(data: unknown): ChannelMessage | null {
  if (typeof data !== "object" || data === null) return null;
  const m = data as Partial<ChannelMessage>;
  if (
    typeof m.workspace !== "string" ||
    typeof m.sender !== "string" ||
    !Array.isArray(m.actions)
  ) {
    return null;
  }
  return { workspace: m.workspace, sender: m.sender, actions: m.actions };
}

export interface LocalTransportOptions {
  /** Workspace slug — selects the IndexedDB database (`linear_recon_<slug>`). */
  workspaceSlug?: string;
}

export class LocalTransport implements SyncTransport {
  readonly name = "local";

  readonly #workspaceSlug: string;
  readonly #senderId = newSenderId();
  readonly #listeners = new Set<(a: SyncAction) => void>();

  #dbPromise: Promise<LinearDB> | null = null;
  #channel: BroadcastChannel | null = null;
  /** Serializes submit() so ids and actions publish in allocation order. */
  #chain: Promise<unknown> = Promise.resolve();

  constructor(options: LocalTransportOptions = {}) {
    this.#workspaceSlug = options.workspaceSlug ?? DEFAULT_WORKSPACE_SLUG;
  }

  // ---------- bootstrap ----------

  /**
   * Cold bootstrap. A database that already holds rows (meta lost, rows kept)
   * returns those rows rather than re-seeding fixtures over live data; the
   * ordinary warm path never reaches the transport at all.
   */
  async bootstrap(): Promise<BootstrapPayload> {
    const db = await this.#db();
    const lastSyncId = await this.#readCounter(db);
    const stored = await this.#loadRows(db);
    return {
      rows: stored.length > 0 ? stored : buildFixtures(),
      lastSyncId,
      schemaVersion: SCHEMA_VERSION,
    };
  }

  // ---------- write path ----------

  submit(req: MutationRequest): Promise<MutationResponse> {
    const run = this.#chain.then(
      () => this.#applyBatch(req),
      () => this.#applyBatch(req),
    );
    // Keep the chain alive regardless of this batch's outcome.
    this.#chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  /**
   * One IndexedDB readwrite transaction spanning every touched model store
   * plus `_meta`: read the counter, apply each client transaction in
   * batchIndex order against the durable rows, allocate a sync id per applied
   * transaction, write the counter back. Atomic and serialized across tabs by
   * IndexedDB itself — no two tabs can mint the same id.
   */
  async #applyBatch(req: MutationRequest): Promise<MutationResponse> {
    const db = await this.#db();

    const ordered = [...req.transactions].sort((a, b) => a.batchIndex - b.batchIndex);
    const models = new Set<ModelName>();
    for (const t of ordered) {
      if (isModelName(t.modelName)) models.add(t.modelName);
    }
    const storeNames: (ModelName | typeof META_STORE)[] = [...models, META_STORE];

    const actions: SyncAction[] = [];
    const rejected: Record<string, string> = {};

    const tx = db.transaction(storeNames, "readwrite");
    const meta = tx.objectStore(META_STORE);
    const counter = await meta.get(LOCAL_SYNC_ID_KEY);
    let lastSyncId = counter?.lastSyncId ?? 0;

    const emit = (
      modelName: ModelName,
      modelId: UUID,
      action: SyncAction["action"],
      data?: Partial<AnyModelData> & { id: UUID },
    ): void => {
      lastSyncId += 1;
      actions.push({
        id: lastSyncId,
        modelName,
        modelId,
        action,
        ...(data !== undefined ? { data } : {}),
      });
    };

    for (const t of ordered) {
      await this.#applyTransaction(t, tx, emit, rejected);
    }

    await meta.put({ lastSyncId, schemaVersion: SCHEMA_VERSION }, LOCAL_SYNC_ID_KEY);
    await tx.done;

    this.#publish(actions);

    const hasRejections = Object.keys(rejected).length > 0;
    return {
      ok: !hasRejections,
      lastSyncId,
      ...(hasRejections ? { rejected } : {}),
    };
  }

  /** Same validation + effects as the dev mock (src/server/syncStore.ts). */
  async #applyTransaction(
    t: TransactionData,
    tx: { objectStore(name: ModelName): unknown },
    emit: (
      modelName: ModelName,
      modelId: UUID,
      action: SyncAction["action"],
      data?: Partial<AnyModelData> & { id: UUID },
    ) => void,
    rejected: Record<string, string>,
  ): Promise<void> {
    if (!isModelName(t.modelName)) {
      rejected[t.id] = `Unknown model "${String(t.modelName)}"`;
      return;
    }
    const model: ModelName = t.modelName;
    const store = tx.objectStore(model) as RowStore;
    const existing = await store.get(t.modelId);

    switch (t.kind) {
      case "create": {
        // Idempotent for at-least-once delivery: re-creating an id replaces it.
        const row = { ...(t.payload ?? {}), id: t.modelId } as AnyModelData;
        await store.put(row);
        emit(model, t.modelId, "I", row);
        return;
      }
      case "update": {
        if (!existing) {
          rejected[t.id] = `Unknown ${model} id "${t.modelId}" for update`;
          return;
        }
        const changed = { ...(t.payload ?? {}), id: t.modelId } as Partial<AnyModelData> & {
          id: UUID;
        };
        await store.put({ ...existing, ...changed } as AnyModelData);
        emit(model, t.modelId, "U", changed);
        return;
      }
      case "delete": {
        if (!existing) {
          rejected[t.id] = `Unknown ${model} id "${t.modelId}" for delete`;
          return;
        }
        await store.delete(t.modelId);
        emit(model, t.modelId, "D");
        return;
      }
      case "archive": {
        if (!existing) {
          rejected[t.id] = `Unknown ${model} id "${t.modelId}" for archive`;
          return;
        }
        const archivedAt = new Date().toISOString();
        await store.put({ ...existing, archivedAt } as AnyModelData);
        emit(model, t.modelId, "A", { id: t.modelId, archivedAt } as Partial<AnyModelData> & {
          id: UUID;
        });
        return;
      }
      case "unarchive": {
        if (!existing) {
          rejected[t.id] = `Unknown ${model} id "${t.modelId}" for unarchive`;
          return;
        }
        const merged = { ...existing } as AnyModelData & { archivedAt?: string };
        delete merged.archivedAt;
        await store.put(merged);
        emit(model, t.modelId, "V", { id: t.modelId } as Partial<AnyModelData> & { id: UUID });
        return;
      }
      default: {
        rejected[t.id] = `Unknown transaction kind "${String(t.kind)}"`;
      }
    }
  }

  // ---------- delta stream (BroadcastChannel instead of SSE) ----------

  /**
   * `since` is unused: there is no durable action log to catch up from — the
   * IndexedDB mirror IS the caught-up state, and BroadcastChannel only carries
   * live traffic from other tabs.
   */
  subscribe(
    since: number,
    onAction: (a: SyncAction) => void,
    onStatus?: (s: TransportStatus) => void,
  ): () => void {
    void since;
    this.#listeners.add(onAction);
    this.#ensureChannel();
    // Nothing to connect to — the authority is this tab.
    onStatus?.("open");

    return () => {
      this.#listeners.delete(onAction);
      if (this.#listeners.size === 0 && this.#channel !== null) {
        this.#channel.close();
        this.#channel = null;
      }
    };
  }

  /** Deliver to this tab (the server echoes the originator) and to the others. */
  #publish(actions: SyncAction[]): void {
    if (actions.length === 0) return;

    queueMicrotask(() => {
      for (const action of actions) {
        for (const listener of [...this.#listeners]) {
          try {
            listener(action);
          } catch {
            // A broken subscriber must not break the write path.
          }
        }
      }
    });

    const channel = this.#ensureChannel();
    if (channel === null) return;
    const message: ChannelMessage = {
      workspace: this.#workspaceSlug,
      sender: this.#senderId,
      actions,
    };
    try {
      channel.postMessage(message);
    } catch {
      // Structured-clone failure would mean a non-JSON payload — ignore.
    }
  }

  #ensureChannel(): BroadcastChannel | null {
    if (this.#channel !== null) return this.#channel;
    if (typeof BroadcastChannel === "undefined") return null; // SSR / old runtime

    const channel = new BroadcastChannel(SYNC_CHANNEL_NAME);
    channel.onmessage = (event: MessageEvent<unknown>) => {
      const message = parseMessage(event.data);
      if (message === null) return;
      if (message.workspace !== this.#workspaceSlug) return; // other workspace
      if (message.sender === this.#senderId) return; // our own echo
      for (const action of message.actions) {
        for (const listener of [...this.#listeners]) {
          try {
            listener(action);
          } catch {
            // ignore — one bad subscriber must not stop the stream
          }
        }
      }
    };
    this.#channel = channel;
    return channel;
  }

  // ---------- IndexedDB ----------

  #db(): Promise<LinearDB> {
    if (this.#dbPromise === null) {
      if (typeof indexedDB === "undefined") {
        return Promise.reject(
          new Error(
            "LocalTransport requires a browser environment: IndexedDB is not available during SSR.",
          ),
        );
      }
      // Shared self-healing opener (persistence.ts): verifies every expected
      // store exists and reopens one version higher to create any missing.
      this.#dbPromise = openSchemaDb(this.#workspaceSlug);
    }
    return this.#dbPromise;
  }

  async #readCounter(db: LinearDB): Promise<number> {
    const record = await db.get(META_STORE, LOCAL_SYNC_ID_KEY);
    return record?.lastSyncId ?? 0;
  }

  /** Every persisted row, as bootstrap lines. */
  async #loadRows(db: LinearDB): Promise<{ model: ModelName; data: AnyModelData }[]> {
    const tx = db.transaction(MODEL_NAMES, "readonly");
    const out: { model: ModelName; data: AnyModelData }[] = [];
    for (const model of MODEL_NAMES) {
      const store = tx.objectStore(model) as unknown as RowStore;
      for (const data of await store.getAll()) {
        out.push({ model, data });
      }
    }
    await tx.done;
    return out;
  }
}
