/**
 * ⚠️ DEV-ONLY MOCK — NOT part of the shipped app. ⚠️
 *
 * The app runs with NO backend: SyncClient defaults to LocalTransport
 * (src/lib/data/transports/local.ts), which is a complete in-browser sync
 * authority. Nothing here is imported by the client bundle.
 *
 * This in-process store exists only so the HTTP path stays exercisable in
 * development (`NEXT_PUBLIC_SYNC_TRANSPORT=http`). It is the REFERENCE
 * IMPLEMENTATION of the documented wire contract (MASTER_PROMPT.md §19,
 * BACKEND_API.md): the same shapes, ordering, sync-id allocation and
 * per-transaction rejection rules a real backend must reproduce. Behaviour
 * changes here must be mirrored in LocalTransport (and vice versa) — the two
 * are the same contract, one over HTTP and one in the tab.
 *
 * NOTE ON SEEDING: this mock still boots with the §26 fixtures in it, and that
 * is deliberate — it is the stand-in for "a backend that already has data", and
 * it is the only way to exercise the HTTP path without writing a server. It is
 * server-side only and never reaches the client bundle. The SHIPPED app seeds
 * nothing: LocalTransport bootstraps empty and the workspace is created by the
 * user in onboarding (src/lib/workspace/workspaces.ts).
 *
 * Holds the authoritative row set in memory, allocates monotonic syncIds,
 * keeps a capped action log for delta catch-up, and fans broadcast actions
 * out to SSE subscribers. A single instance survives Next.js dev HMR by
 * anchoring itself on `globalThis`. Not durable, not multi-process safe —
 * deliberately: it is a mock.
 */

import {
  MODEL_NAMES,
  SCHEMA_VERSION,
  type AnyModelData,
  type BootstrapLine,
  type ModelName,
  type MutationRequest,
  type MutationResponse,
  type SyncAction,
  type SyncActionType,
  type TransactionData,
  type UUID,
} from "@/lib/data/types";
import { buildFixtures } from "@/lib/data/fixtures";

const LOG_CAP = 5000;

const GLOBAL_KEY = "__linearServerSyncStore__";

type GlobalWithStore = typeof globalThis & {
  [GLOBAL_KEY]?: ServerSyncStore;
};

const MODEL_NAME_SET: ReadonlySet<string> = new Set<string>(MODEL_NAMES);

function isModelName(value: string): value is ModelName {
  return MODEL_NAME_SET.has(value);
}

export class ServerSyncStore {
  /** model -> (modelId -> row). Every known model has a map, even if empty. */
  rows: Map<ModelName, Map<string, AnyModelData>> = new Map();

  /** Highest allocated syncId. */
  lastSyncId = 0;

  /** Rolling action log for `actionsSince`, capped at LOG_CAP entries. */
  log: SyncAction[] = [];

  private subscribers = new Set<(a: SyncAction) => void>();

  private constructor() {
    for (const model of MODEL_NAMES) {
      this.rows.set(model, new Map<string, AnyModelData>());
    }
    for (const { model, data } of buildFixtures()) {
      this.modelRows(model).set(data.id, data);
    }
  }

  /** Global singleton via globalThis so the store survives Next dev HMR. */
  static instance(): ServerSyncStore {
    const g = globalThis as GlobalWithStore;
    if (!g[GLOBAL_KEY]) {
      g[GLOBAL_KEY] = new ServerSyncStore();
    }
    return g[GLOBAL_KEY];
  }

  private modelRows(model: ModelName): Map<string, AnyModelData> {
    let map = this.rows.get(model);
    if (!map) {
      map = new Map<string, AnyModelData>();
      this.rows.set(model, map);
    }
    return map;
  }

  /** Allocate a syncId, append to the capped log, and broadcast. */
  private emit(
    modelName: ModelName,
    modelId: UUID,
    action: SyncActionType,
    data?: Partial<AnyModelData> & { id: UUID },
  ): SyncAction {
    const syncAction: SyncAction = {
      id: ++this.lastSyncId,
      modelName,
      modelId,
      action,
      ...(data !== undefined ? { data } : {}),
    };
    this.log.push(syncAction);
    if (this.log.length > LOG_CAP) {
      this.log.splice(0, this.log.length - LOG_CAP);
    }
    for (const cb of this.subscribers) {
      try {
        cb(syncAction);
      } catch {
        // A broken subscriber must not break the mutation path.
      }
    }
    return syncAction;
  }

  private applyTransaction(
    tx: TransactionData,
    rejected: Record<string, string>,
  ): void {
    if (!isModelName(tx.modelName)) {
      rejected[tx.id] = `Unknown model "${String(tx.modelName)}"`;
      return;
    }
    const model: ModelName = tx.modelName;
    const map = this.modelRows(model);
    const existing = map.get(tx.modelId);

    switch (tx.kind) {
      case "create": {
        // Idempotent for at-least-once delivery: re-creating an id replaces it.
        const row = {
          ...(tx.payload ?? {}),
          id: tx.modelId,
        } as AnyModelData;
        map.set(tx.modelId, row);
        this.emit(model, tx.modelId, "I", row);
        return;
      }
      case "update": {
        if (!existing) {
          rejected[tx.id] = `Unknown ${model} id "${tx.modelId}" for update`;
          return;
        }
        const changed = {
          ...(tx.payload ?? {}),
          id: tx.modelId,
        } as Partial<AnyModelData> & { id: UUID };
        const merged = { ...existing, ...changed } as AnyModelData;
        map.set(tx.modelId, merged);
        this.emit(model, tx.modelId, "U", changed);
        return;
      }
      case "delete": {
        if (!existing) {
          rejected[tx.id] = `Unknown ${model} id "${tx.modelId}" for delete`;
          return;
        }
        map.delete(tx.modelId);
        this.emit(model, tx.modelId, "D");
        return;
      }
      case "archive": {
        if (!existing) {
          rejected[tx.id] = `Unknown ${model} id "${tx.modelId}" for archive`;
          return;
        }
        const archivedAt = new Date().toISOString();
        const merged = { ...existing, archivedAt } as AnyModelData;
        map.set(tx.modelId, merged);
        this.emit(model, tx.modelId, "A", {
          id: tx.modelId,
          archivedAt,
        } as Partial<AnyModelData> & { id: UUID });
        return;
      }
      case "unarchive": {
        if (!existing) {
          rejected[tx.id] = `Unknown ${model} id "${tx.modelId}" for unarchive`;
          return;
        }
        const merged = { ...existing } as AnyModelData & {
          archivedAt?: string;
        };
        delete merged.archivedAt;
        map.set(tx.modelId, merged);
        this.emit(model, tx.modelId, "V", { id: tx.modelId });
        return;
      }
      default: {
        rejected[tx.id] = `Unknown transaction kind "${String(tx.kind)}"`;
      }
    }
  }

  /**
   * Apply a batch of client transactions in batchIndex order. Rejections are
   * per-transaction (the rest of the batch still applies); each applied
   * transaction allocates a syncId and broadcasts its SyncAction.
   */
  applyMutation(req: MutationRequest): MutationResponse {
    const rejected: Record<string, string> = {};
    const ordered = [...req.transactions].sort(
      (a, b) => a.batchIndex - b.batchIndex,
    );
    for (const tx of ordered) {
      this.applyTransaction(tx, rejected);
    }
    const hasRejections = Object.keys(rejected).length > 0;
    return {
      ok: !hasRejections,
      lastSyncId: this.lastSyncId,
      ...(hasRejections ? { rejected } : {}),
    };
  }

  /** Actions with id > sinceId, oldest first (bounded by the log cap). */
  actionsSince(sinceId: number): SyncAction[] {
    return this.log.filter((a) => a.id > sinceId);
  }

  /** Register a broadcast listener; returns an unsubscribe function. */
  subscribe(cb: (a: SyncAction) => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  /** Every row as `{ model, data }` lines plus the bootstrap trailer. */
  bootstrapLines(): BootstrapLine[] {
    const lines: BootstrapLine[] = [];
    for (const model of MODEL_NAMES) {
      for (const data of this.modelRows(model).values()) {
        lines.push({ model, data });
      }
    }
    lines.push({
      _trailer: true,
      lastSyncId: this.lastSyncId,
      schemaVersion: SCHEMA_VERSION,
    });
    return lines;
  }
}
