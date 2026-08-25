/**
 * Transaction queue — the optimistic write path of the local-first engine.
 * MASTER_PROMPT.md §19 (write path) + §6.8 (optimistic mutation pipeline).
 *
 * Lifecycle of one edit:
 *   1) applyLocal mutates the MobX pool instantly and returns the
 *      changeSnapshot (previous values of the changed fields) for rollback.
 *   2) A TransactionData is built (uuid, per-tick batchIndex) and persisted
 *      durably to the `_transaction` IndexedDB store.
 *   3) A flush is scheduled for the next macrotask so every enqueue in the
 *      same microtask joins one batch and one MutationRequest.
 *   4) ACK → acked + deleted from the durable store. Rejected ids → rolled
 *      back + deleted. Network error → kept queued, retried with backoff
 *      (1s, 2s, 5s, 10s max); the retry pauses while offline and resumes on
 *      the window "online" event. Pending transactions survive restart via
 *      restore() (reload → replay → resubmit).
 *
 * This module never imports the store or the persistence layer — both arrive
 * through TransactionQueueDeps (structural typing connects the real modules).
 */

import { makeAutoObservable, runInAction, toJS } from "mobx";
import type {
  ModelName,
  MutationRequest,
  MutationResponse,
  TransactionData,
  TransactionKind,
  UUID,
} from "@/lib/data/types";

// ---------- deps contract (constructor injection; no store/persistence imports) ----------

export interface TransactionQueueDeps {
  /**
   * Applies the optimistic change to the MobX store and returns the
   * changeSnapshot (previous values of the changed fields) for rollback.
   */
  applyLocal: (
    kind: TransactionKind,
    modelName: ModelName,
    modelId: UUID,
    payload?: Record<string, unknown>,
  ) => Record<string, unknown> | undefined;
  /** Reverts the optimistic change of a rejected transaction (uses changeSnapshot). */
  rollback: (t: TransactionData) => void;
  /** Durable `_transaction` store (structural subset of the persistence layer). */
  persist: {
    saveTransaction(t: TransactionData): Promise<void>;
    deleteTransaction(id: UUID): Promise<void>;
    loadTransactions(): Promise<TransactionData[]>;
  };
  /** POSTs /api/sync/mutation (done by the integration layer). */
  submit: (req: MutationRequest) => Promise<MutationResponse>;
  clientId: string;
}

// ---------- internals ----------

const BACKOFF_MS: readonly number[] = [1_000, 2_000, 5_000, 10_000];

function newUUID(): UUID {
  const c =
    typeof globalThis !== "undefined" && typeof globalThis.crypto !== "undefined"
      ? globalThis.crypto
      : undefined;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  // RFC 4122 v4 fallback (SSR / very old runtimes without crypto.randomUUID)
  let uuid = "";
  for (let i = 0; i < 36; i++) {
    if (i === 8 || i === 13 || i === 18 || i === 23) uuid += "-";
    else if (i === 14) uuid += "4";
    else {
      const r = Math.floor(Math.random() * 16);
      uuid += (i === 19 ? (r & 0x3) | 0x8 : r).toString(16);
    }
  }
  return uuid;
}

function microtask(fn: () => void): void {
  if (typeof queueMicrotask === "function") queueMicrotask(fn);
  else void Promise.resolve().then(fn);
}

/**
 * DEEP plain copy so the wire/storage layers never see MobX proxies. The queue
 * itself is makeAutoObservable, so a pushed transaction's nested arrays
 * (labelIds, subscriberIds, ...) become observable proxies when read back —
 * IndexedDB's structured clone rejects proxies with DataCloneError, which
 * silently wedged every create through LocalTransport ("Syncing 1" forever).
 * mobx toJS converts deeply while preserving undefined-valued snapshot keys
 * (JSON round-tripping would drop them and break field-clearing rollbacks).
 */
function toPlain(t: TransactionData): TransactionData {
  return {
    ...t,
    payload: t.payload ? (toJS(t.payload) as Record<string, unknown>) : undefined,
    changeSnapshot: t.changeSnapshot
      ? (toJS(t.changeSnapshot) as Record<string, unknown>)
      : undefined,
  };
}

// ---------- the queue ----------

export class TransactionQueue {
  /** Transactions awaiting server ACK. Treat as internal — MobX observable. */
  private queue: TransactionData[] = [];
  /** True while one merged MutationRequest is in flight. Internal — observable. */
  private inFlight = false;

  // ES-private bookkeeping — invisible to MobX, deliberately non-observable.
  readonly #deps: TransactionQueueDeps;
  #batchCounter = 0;
  #batchOpen = false;
  #flushScheduled = false;
  #retryTimer: ReturnType<typeof setTimeout> | null = null;
  #retryAttempt = 0;
  #disposed = false;
  readonly #onOnline: (() => void) | null = null;

  constructor(deps: TransactionQueueDeps) {
    this.#deps = deps;
    makeAutoObservable(this, {}, { autoBind: true });

    if (typeof window !== "undefined") {
      this.#onOnline = () => {
        // Reconnected: restart the backoff ladder and resume immediately.
        this.#retryAttempt = 0;
        if (this.#retryTimer !== null) {
          clearTimeout(this.#retryTimer);
          this.#retryTimer = null;
        }
        if (this.pendingCount > 0) this.scheduleFlush();
      };
      window.addEventListener("online", this.#onOnline);
    }
  }

  /** Number of transactions still awaiting server ACK (drives the "Syncing" badge count). */
  get pendingCount(): number {
    return this.queue.length;
  }

  /** True while a batch is in flight or the queue is non-empty (incl. offline/backoff waits). */
  get syncing(): boolean {
    return this.inFlight || this.queue.length > 0;
  }

  /**
   * §6.8 steps 1–3: mutate instantly, enqueue durably, schedule the async send.
   * All enqueues in the same microtask share one batchIndex (one per-tick batch).
   */
  enqueue(
    kind: TransactionKind,
    modelName: ModelName,
    modelId: UUID,
    payload?: Record<string, unknown>,
  ): void {
    // 1) optimistic apply — returns previous values of the changed fields
    const changeSnapshot = this.#deps.applyLocal(kind, modelName, modelId, payload);

    // 2) build the transaction
    const t: TransactionData = {
      id: newUUID(),
      kind,
      modelName,
      modelId,
      payload: payload ? { ...payload } : undefined,
      changeSnapshot,
      batchIndex: this.currentBatchIndex(),
      createdAt: new Date().toISOString(),
      status: "queued",
    };
    this.queue.push(t);

    // 3) persist durably (fire-and-forget: the optimistic state must never block)
    void this.#deps.persist.saveTransaction(toPlain(t)).catch(() => {
      /* durable write failed — the in-memory queue still retries this session */
    });

    // 4) flush on the next macrotask so same-tick enqueues merge into one request
    this.scheduleFlush();
  }

  /**
   * Sends every queued transaction as ONE MutationRequest.
   * ok → acked + deleted from the durable store; rejected ids → rolled back +
   * deleted; network error → kept queued and retried with backoff (paused
   * while offline). `syncing` stays true until the queue drains.
   */
  async flush(): Promise<void> {
    if (this.#disposed || this.inFlight || this.queue.length === 0) return;
    if (!this.isOnline()) return; // paused — the "online" listener resumes us

    const batch = this.queue.slice();
    runInAction(() => {
      this.inFlight = true;
      for (const t of batch) t.status = "executing";
    });

    let response: MutationResponse;
    try {
      response = await this.#deps.submit({
        clientId: this.#deps.clientId,
        transactions: batch.map(toPlain),
      });
    } catch {
      this.requeueForRetry(batch);
      return;
    }

    const rejected = response.rejected ?? {};
    if (!response.ok && Object.keys(rejected).length === 0) {
      // Transient server failure with no per-transaction verdicts: retryable.
      this.requeueForRetry(batch);
      return;
    }

    const batchIds = new Set(batch.map((t) => t.id));
    runInAction(() => {
      this.inFlight = false;
      this.#retryAttempt = 0;
      for (const t of batch) {
        if (rejected[t.id] !== undefined) {
          // §6.8 step 8: revert only the affected fields via changeSnapshot
          this.#deps.rollback(toPlain(t));
        } else {
          t.status = "acked";
        }
      }
      this.queue = this.queue.filter((t) => !batchIds.has(t.id));
    });

    // Acked and rejected alike leave the durable store.
    for (const t of batch) {
      void this.#deps.persist.deleteTransaction(t.id).catch(() => {
        /* best-effort — restore() replay of an acked tx is idempotent server-side */
      });
    }

    // Anything enqueued while we were in flight goes out in the next batch.
    if (this.queue.length > 0) this.scheduleFlush();
  }

  /**
   * Boot-time replay (§19: pending transactions survive restart).
   * Loads the durable queue, re-applies each payload optimistically on the
   * hydrated store, refreshes the changeSnapshot against current values, and
   * resubmits.
   */
  async restore(): Promise<void> {
    const stored = await this.#deps.persist.loadTransactions();
    if (this.#disposed || stored.length === 0) return;

    const ordered = stored
      .slice()
      .sort(
        (a, b) =>
          a.createdAt.localeCompare(b.createdAt) || a.batchIndex - b.batchIndex,
      );

    const restored: TransactionData[] = [];
    runInAction(() => {
      for (const t of ordered) {
        const fresh = this.#deps.applyLocal(t.kind, t.modelName, t.modelId, t.payload);
        const r: TransactionData = {
          ...t,
          // Rollback must target the freshly hydrated values when available.
          changeSnapshot: fresh ?? t.changeSnapshot,
          status: "queued",
        };
        restored.push(r);
        this.queue.push(r);
        this.#batchCounter = Math.max(this.#batchCounter, t.batchIndex + 1);
      }
    });

    // Re-persist with the refreshed snapshots (idempotent puts).
    for (const r of restored) {
      void this.#deps.persist.saveTransaction(toPlain(r)).catch(() => {});
    }

    this.scheduleFlush();
  }

  dispose(): void {
    this.#disposed = true;
    if (this.#retryTimer !== null) {
      clearTimeout(this.#retryTimer);
      this.#retryTimer = null;
    }
    if (typeof window !== "undefined" && this.#onOnline) {
      window.removeEventListener("online", this.#onOnline);
    }
  }

  // ---------- private ----------

  /** One batchIndex per event-loop tick: the batch closes at end of the current microtask. */
  private currentBatchIndex(): number {
    if (!this.#batchOpen) {
      this.#batchOpen = true;
      microtask(() => {
        this.#batchOpen = false;
        this.#batchCounter += 1;
      });
    }
    return this.#batchCounter;
  }

  /** Flush after the current tick (setTimeout(0) runs after all microtask enqueues). */
  private scheduleFlush(delay = 0): void {
    if (this.#disposed || this.#flushScheduled) return;
    this.#flushScheduled = true;
    setTimeout(() => {
      this.#flushScheduled = false;
      void this.flush();
    }, delay);
  }

  /** Network failure: keep everything queued and retry on the backoff ladder. */
  private requeueForRetry(batch: TransactionData[]): void {
    runInAction(() => {
      this.inFlight = false;
      for (const t of batch) t.status = "queued";
    });
    if (this.#disposed) return;
    if (!this.isOnline()) return; // paused — resumed by the "online" event
    const delay = BACKOFF_MS[Math.min(this.#retryAttempt, BACKOFF_MS.length - 1)];
    this.#retryAttempt += 1;
    this.#retryTimer = setTimeout(() => {
      this.#retryTimer = null;
      void this.flush();
    }, delay);
  }

  /** SSR-safe connectivity check; unknown counts as online. */
  private isOnline(): boolean {
    return typeof navigator === "undefined" || navigator.onLine !== false;
  }
}
