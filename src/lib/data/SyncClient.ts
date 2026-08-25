/**
 * SyncClient — the client-side facade of the local-first engine.
 * Wires together the MobX pool (store.ts), IndexedDB persistence
 * (persistence.ts), the optimistic transaction queue (transactions.ts) and a
 * SyncTransport (transport.ts). One instance per workspace, anchored on
 * globalThis so it survives Next.js Fast Refresh.
 *
 * The transport is the ONLY seam that can touch a network. It is chosen once,
 * here, from NEXT_PUBLIC_SYNC_TRANSPORT — default `local` (LocalTransport:
 * fixtures + IndexedDB + BroadcastChannel, zero server dependency), `http`
 * for the dev mock or a real backend. Nothing below this line knows which.
 *
 * Boot sequence (start()):
 *   1) Persistence.open(workspaceSlug)
 *   2) meta present  → warm local bootstrap (loadAll → store.hydrate)
 *      meta missing  → transport.bootstrap(): hydrate the store AND mirror
 *                      rows into IndexedDB, save meta from the payload
 *   3) transaction queue restore() (replay pending optimistic writes)
 *   4) transport.subscribe(lastSyncId) — replay + live deltas
 */

import { makeObservable, observable, runInAction, toJS } from "mobx";
import { SyncStore } from "@/lib/data/store";
import { Persistence } from "@/lib/data/persistence";
import { TransactionQueue } from "@/lib/data/transactions";
import type { SyncTransport, TransportStatus } from "@/lib/data/transport";
import { HttpTransport } from "@/lib/data/transports/http";
import { LocalTransport } from "@/lib/data/transports/local";
import {
  SCHEMA_VERSION,
  type AnyModelData,
  type IssueData,
  type ModelName,
  type MutationRequest,
  type MutationResponse,
  type ProjectData,
  type SyncAction,
  type TransactionData,
  type TransactionKind,
  type UUID,
  type ViewPreferenceData,
} from "@/lib/data/types";

export type SyncClientStatus = "booting" | "ready" | "error";

const META_SAVE_DEBOUNCE_MS = 400;

/**
 * The transport seam. `local` (default) needs no server at all; `http` speaks
 * the documented REST/SSE contract (dev mock today, real backend later).
 */
function createTransport(workspaceSlug: string): SyncTransport {
  return process.env.NEXT_PUBLIC_SYNC_TRANSPORT === "http"
    ? new HttpTransport()
    : new LocalTransport({ workspaceSlug });
}

// ---------- small helpers ----------

function newClientId(): string {
  const c =
    typeof globalThis !== "undefined" && typeof globalThis.crypto !== "undefined"
      ? globalThis.crypto
      : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  return `client-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve: (value: T) => void;
}

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

/** Cast a plain field bag into the SyncAction data shape (wire-compatible). */
function toActionData(
  payload: Record<string, unknown> | undefined,
  id: UUID,
): Partial<AnyModelData> & { id: UUID } {
  return { ...(payload ?? {}), id } as unknown as Partial<AnyModelData> & { id: UUID };
}

// ---------- HMR-safe singleton registry ----------

const REGISTRY_KEY = "__linearSyncClients__";

type GlobalWithClients = typeof globalThis & {
  [REGISTRY_KEY]?: Map<string, SyncClient>;
};

function registry(): Map<string, SyncClient> {
  const g = globalThis as GlobalWithClients;
  if (!g[REGISTRY_KEY]) g[REGISTRY_KEY] = new Map<string, SyncClient>();
  return g[REGISTRY_KEY];
}

// ---------- the facade ----------

export class SyncClient {
  readonly workspaceSlug: string;
  readonly store: SyncStore;
  readonly queue: TransactionQueue;

  /** MobX observable boot status (skeletons key off this). */
  status: SyncClientStatus = "booting";
  /** MobX observable high-water mark of applied sync actions. */
  lastSyncId = 0;

  /**
   * Not an ES #private: the globalThis registry can hand back an instance
   * created by a different module copy (Turbopack emits separate SSR/client
   * chunks), and reading a #field across copies throws. TS `private` erases to
   * a plain property, so the liveness check below works on any copy.
   */
  private disposed = false;

  #persistence: Persistence | null = null;
  readonly #persistenceReady = deferred<Persistence>();
  /** Serializes persistence.applyAction calls (read-modify-write safety). */
  #persistChain: Promise<void> = Promise.resolve();
  readonly #transport: SyncTransport;
  #unsubscribe: (() => void) | null = null;
  #metaTimer: ReturnType<typeof setTimeout> | null = null;
  #bootstrappedAt: string | undefined = undefined;
  #startPromise: Promise<void> | null = null;
  readonly #clientId = newClientId();

  private constructor(workspaceSlug: string) {
    this.workspaceSlug = workspaceSlug;
    this.store = new SyncStore();
    this.#transport = createTransport(workspaceSlug);
    this.queue = new TransactionQueue({
      applyLocal: this.#applyLocal,
      rollback: this.#rollback,
      submit: this.#submit,
      persist: {
        // The durable store opens asynchronously in start(); these adapters
        // wait for it so early enqueues are still persisted.
        saveTransaction: async (t: TransactionData) => {
          const p = this.#persistence ?? (await this.#persistenceReady.promise);
          await p.saveTransaction(t);
        },
        deleteTransaction: async (id: UUID) => {
          const p = this.#persistence ?? (await this.#persistenceReady.promise);
          await p.deleteTransaction(id);
        },
        loadTransactions: async () => {
          const p = this.#persistence ?? (await this.#persistenceReady.promise);
          return p.loadTransactions();
        },
      },
      clientId: this.#clientId,
    });
    makeObservable(this, {
      status: observable,
      lastSyncId: observable,
    });
  }

  /** Which transport this client booted with ("local" | "http"). */
  get transportName(): string {
    return this.#transport.name;
  }

  /** Browser singleton per workspace (survives Fast Refresh via globalThis). */
  static get(workspaceSlug: string): SyncClient {
    // SSR renders the provider too, but a server-side registry would be shared
    // by every request on the Node global. Hand back a throwaway instance
    // instead — nothing boots until the browser effect calls start().
    if (typeof window === "undefined") return new SyncClient(workspaceSlug);

    const clients = registry();
    let client = clients.get(workspaceSlug);
    if (!client || client.disposed) {
      client = new SyncClient(workspaceSlug);
      clients.set(workspaceSlug, client);
    }
    return client;
  }

  /** Idempotent boot — safe to call repeatedly (StrictMode double effects). */
  start(): Promise<void> {
    if (!this.#startPromise) {
      this.#startPromise = this.#start().catch((error: unknown) => {
        console.error("[SyncClient] boot failed", error);
        runInAction(() => {
          this.status = "error";
        });
      });
    }
    return this.#startPromise;
  }

  async #start(): Promise<void> {
    // 1) durable storage
    const persistence = await Persistence.open(this.workspaceSlug);
    this.#persistence = persistence;
    this.#persistenceReady.resolve(persistence);
    if (this.disposed) return;

    // 2) bootstrap — warm (IndexedDB) or cold (transport)
    const meta = await persistence.getMeta();
    if (meta !== undefined) {
      const rows = await persistence.loadAll();
      this.store.hydrate(rows);
      this.#bootstrappedAt = meta.bootstrappedAt;
      runInAction(() => {
        this.lastSyncId = meta.lastSyncId;
      });
    } else {
      await this.#coldBootstrap(persistence);
    }
    if (this.disposed) return;

    // 3+4) replay pending optimistic writes on the hydrated pool
    await this.queue.restore();
    if (this.disposed) return;

    // 5) live delta stream
    this.#openDeltaStream();

    runInAction(() => {
      this.status = "ready";
    });
  }

  /** No local mirror yet: pull the full row set from the transport. */
  async #coldBootstrap(persistence: Persistence): Promise<void> {
    const { rows, lastSyncId, schemaVersion } = await this.#transport.bootstrap();

    // Hydrate the in-memory pool and mirror every row into IndexedDB.
    this.store.hydrate(rows);
    const byModel = new Map<ModelName, AnyModelData[]>();
    for (const { model, data } of rows) {
      const list = byModel.get(model);
      if (list) list.push(data);
      else byModel.set(model, [data]);
    }
    for (const [model, list] of byModel) {
      await persistence.putRows(model, list);
    }

    this.#bootstrappedAt = new Date().toISOString();
    await persistence.setMeta({
      lastSyncId,
      schemaVersion,
      bootstrappedAt: this.#bootstrappedAt,
    });
    runInAction(() => {
      this.lastSyncId = lastSyncId;
    });
  }

  // ---------- delta stream ----------

  #openDeltaStream(): void {
    this.#unsubscribe = this.#transport.subscribe(
      this.lastSyncId,
      this.#handleAction,
      this.#handleTransportStatus,
    );
  }

  /** "open" recovers from a transient failure; "closed" is a real failure. */
  readonly #handleTransportStatus = (state: TransportStatus): void => {
    if (state === "connecting") return;
    runInAction(() => {
      if (state === "closed") this.status = "error";
      else if (this.status === "error") this.status = "ready";
    });
  };

  readonly #handleAction = (action: SyncAction): void => {
    if (action.id <= this.lastSyncId) return; // already applied (replay overlap)

    // Persistence writes are chained so read-modify-write merges never
    // interleave; the pool applies synchronously for instant UI updates.
    this.#persistChain = this.#persistChain
      .then(() => this.#persistence?.applyAction(action))
      .catch(() => {
        /* durable mirror is best-effort; re-bootstrap heals divergence */
      });
    this.store.applyAction(action);

    runInAction(() => {
      this.lastSyncId = action.id;
    });
    this.#scheduleMetaSave();
  };

  #scheduleMetaSave(): void {
    if (this.#metaTimer !== null || this.disposed) return;
    this.#metaTimer = setTimeout(() => {
      this.#metaTimer = null;
      void this.#saveMeta();
    }, META_SAVE_DEBOUNCE_MS);
  }

  async #saveMeta(): Promise<void> {
    const p = this.#persistence;
    if (p === null || this.disposed) return;
    try {
      await p.setMeta({
        lastSyncId: this.lastSyncId,
        schemaVersion: SCHEMA_VERSION,
        bootstrappedAt: this.#bootstrappedAt,
      });
    } catch {
      /* best-effort bookkeeping */
    }
  }

  // ---------- transaction queue deps ----------

  /**
   * Optimistic apply. Mutates the MobX pool through the same merge machinery
   * the delta path uses (synthetic id 0 never advances lastSyncId) and
   * returns the previous values of the changed fields for rollback.
   */
  readonly #applyLocal = (
    kind: TransactionKind,
    modelName: ModelName,
    modelId: UUID,
    payload?: Record<string, unknown>,
  ): Record<string, unknown> | undefined => {
    switch (kind) {
      case "create": {
        this.store.applyAction({
          id: 0,
          modelName,
          modelId,
          action: "I",
          data: toActionData(payload, modelId),
        });
        return undefined; // rollback of a create = remove the row
      }
      case "update": {
        const existing = this.store.get(modelName, modelId) as
          | Record<string, unknown>
          | undefined;
        const snapshot: Record<string, unknown> = {};
        if (payload) {
          for (const key of Object.keys(payload)) {
            if (key === "id") continue;
            snapshot[key] = existing ? toJS(existing[key]) : undefined;
          }
        }
        this.store.applyAction({
          id: 0,
          modelName,
          modelId,
          action: "U",
          data: toActionData(payload, modelId),
        });
        return snapshot;
      }
      case "delete": {
        const existing = this.store.get(modelName, modelId);
        const snapshot = existing
          ? (toJS(existing) as unknown as Record<string, unknown>)
          : undefined;
        this.store.applyAction({ id: 0, modelName, modelId, action: "D" });
        return snapshot;
      }
      case "archive": {
        const existing = this.store.get(modelName, modelId) as
          | Record<string, unknown>
          | undefined;
        const snapshot = { archivedAt: existing ? toJS(existing["archivedAt"]) : undefined };
        this.store.applyAction({ id: 0, modelName, modelId, action: "A" });
        return snapshot;
      }
      case "unarchive": {
        const existing = this.store.get(modelName, modelId) as
          | Record<string, unknown>
          | undefined;
        const snapshot = { archivedAt: existing ? toJS(existing["archivedAt"]) : undefined };
        this.store.applyAction({ id: 0, modelName, modelId, action: "V" });
        return snapshot;
      }
      default:
        return undefined;
    }
  };

  /** Revert a rejected transaction using its changeSnapshot. */
  readonly #rollback = (t: TransactionData): void => {
    switch (t.kind) {
      case "create": {
        this.store.remove(t.modelName, t.modelId);
        return;
      }
      case "delete": {
        if (t.changeSnapshot) {
          this.store.applyAction({
            id: 0,
            modelName: t.modelName,
            modelId: t.modelId,
            action: "I",
            data: toActionData(t.changeSnapshot, t.modelId),
          });
        }
        return;
      }
      default: {
        // update / archive / unarchive — merge the previous field values back.
        if (t.changeSnapshot) {
          this.store.applyAction({
            id: 0,
            modelName: t.modelName,
            modelId: t.modelId,
            action: "U",
            data: toActionData(t.changeSnapshot, t.modelId),
          });
        }
      }
    }
  };

  /**
   * Hand the merged batch to the transport; a thrown error keeps the batch
   * queued so the queue retries with backoff.
   *
   * NOTE: lastSyncId is advanced by the delta stream (which also persists the
   * action) — never directly from the mutation response.
   */
  readonly #submit = (req: MutationRequest): Promise<MutationResponse> =>
    this.#transport.submit(req);

  // ---------- public write API (thin helpers over queue.enqueue) ----------

  readonly mutate = {
    updateIssue: (id: UUID, fields: Partial<Omit<IssueData, "id">>): void => {
      this.queue.enqueue("update", "Issue", id, fields as Record<string, unknown>);
    },
    createIssue: (row: IssueData): void => {
      this.queue.enqueue("create", "Issue", row.id, row as unknown as Record<string, unknown>);
    },
    deleteIssue: (id: UUID): void => {
      this.queue.enqueue("delete", "Issue", id);
    },
    updateProject: (id: UUID, fields: Partial<Omit<ProjectData, "id">>): void => {
      this.queue.enqueue("update", "Project", id, fields as Record<string, unknown>);
    },
    /** Upsert: view preferences are created lazily the first time a view is customized. */
    updateViewPreference: (row: ViewPreferenceData): void => {
      const exists = this.store.get("ViewPreference", row.id) !== undefined;
      this.queue.enqueue(
        exists ? "update" : "create",
        "ViewPreference",
        row.id,
        row as unknown as Record<string, unknown>,
      );
    },
    markNotificationRead: (id: UUID, read: boolean): void => {
      // Wire `null` clears the field (JSON cannot carry undefined).
      this.queue.enqueue("update", "Notification", id, {
        readAt: read ? new Date().toISOString() : null,
      });
    },
  };

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.#unsubscribe?.();
    this.#unsubscribe = null;
    if (this.#metaTimer !== null) {
      clearTimeout(this.#metaTimer);
      this.#metaTimer = null;
    }
    this.queue.dispose();
    const clients = registry();
    if (clients.get(this.workspaceSlug) === this) {
      clients.delete(this.workspaceSlug);
    }
  }
}
