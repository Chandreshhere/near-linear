/**
 * IndexedDB persistence layer for the local-first engine.
 * MASTER_PROMPT.md §19: one database per workspace, one object store per
 * model + `_meta` (sync bookkeeping) + `_transaction` (durable write queue).
 *
 * Only sync deltas are persisted to model stores — client optimistic writes
 * live in the in-memory pool and the `_transaction` queue until the matching
 * delta arrives (per spec: "only deltas persist").
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import {
  MODEL_NAMES,
  SCHEMA_VERSION,
  type AnyModelData,
  type ModelDataMap,
  type ModelName,
  type SyncAction,
  type TransactionData,
  type UUID,
} from "@/lib/data/types";

export interface PersistMeta {
  lastSyncId: number;
  schemaVersion: number;
  bootstrappedAt?: string;
}

/** Database name prefix: one IndexedDB database per workspace slug. */
export const DB_PREFIX = "linear_recon_";
export const META_STORE = "_meta";
const TX_STORE = "_transaction";
const META_KEY = "meta";

/**
 * Typed idb schema: every model store keyed by "id" (in-line), `_meta` with a
 * single out-of-line key "meta", `_transaction` keyed by transaction id.
 * NOTE: deliberately NOT intersected with DBSchema — that would widen every
 * store value to `any` via its index signature; the mapped type still
 * satisfies idb's `DBTypes extends DBSchema` conditional structurally.
 */
export type LinearDBSchema = {
  [K in ModelName]: { key: UUID; value: ModelDataMap[K] };
} & {
  _meta: { key: string; value: PersistMeta };
  _transaction: { key: UUID; value: TransactionData };
};

// Compile-time proof the schema satisfies idb's typed path (would fall back
// to untyped `any` stores otherwise).
type AssertTypedSchema = LinearDBSchema extends DBSchema ? true : never;
const _schemaIsTyped: AssertTypedSchema = true;
void _schemaIsTyped;

type LinearDB = IDBPDatabase<LinearDBSchema>;

/**
 * Create every object store of the workspace database. Shared with
 * transports/local.ts so the two connections to the same database can never
 * disagree about the schema (whichever opens first runs this).
 */
export function createSchemaStores(database: LinearDB): void {
  for (const model of MODEL_NAMES) {
    if (!database.objectStoreNames.contains(model)) {
      database.createObjectStore(model, { keyPath: "id" });
    }
  }
  if (!database.objectStoreNames.contains(META_STORE)) {
    // Out-of-line key: bookkeeping records stored under explicit string keys.
    database.createObjectStore(META_STORE);
  }
  if (!database.objectStoreNames.contains(TX_STORE)) {
    database.createObjectStore(TX_STORE, { keyPath: "id" });
  }
}

/**
 * Self-healing opener shared by Persistence and LocalTransport.
 *
 * IndexedDB only creates object stores inside a version-change upgrade, so a
 * grown MODEL_NAMES with an unbumped SCHEMA_VERSION used to strand existing
 * databases without the new stores ("NotFoundError: object store not found"
 * on boot). Opening now verifies every expected store and, when any are
 * missing, reopens one version higher so `createSchemaStores` can fill the
 * gaps — schema bumps remain the contract for DATA-shape changes (the
 * meta.schemaVersion mismatch still wipes + re-bootstraps), but store
 * EXISTENCE no longer depends on anyone remembering to bump.
 */
export async function openSchemaDb(workspaceSlug: string): Promise<LinearDB> {
  const name = DB_PREFIX + workspaceSlug;
  let openedDb: LinearDB | null = null;
  const options = {
    upgrade(database: LinearDB) {
      createSchemaStores(database);
    },
    blocking() {
      // Another tab is upgrading to a newer version — release our
      // connection so it can proceed.
      openedDb?.close();
    },
  };

  let db = await openDB<LinearDBSchema>(name, SCHEMA_VERSION, options);
  openedDb = db;

  const expected = [...MODEL_NAMES, META_STORE, TX_STORE] as const;
  const missing = expected.filter((s) => !db.objectStoreNames.contains(s));
  if (missing.length > 0) {
    const healVersion = db.version + 1;
    db.close();
    db = await openDB<LinearDBSchema>(name, healVersion, options);
    openedDb = db;
  }
  return db;
}

function assertBrowser(): void {
  if (typeof window === "undefined" || typeof indexedDB === "undefined") {
    throw new Error(
      "Persistence requires a browser environment: IndexedDB is not available during SSR. " +
        "Open the database from a client-side effect (e.g. useEffect) only.",
    );
  }
}

export class Persistence {
  private constructor(private readonly db: LinearDB) {}

  /**
   * Open (creating/upgrading as needed) the per-workspace database
   * `linear_recon_<slug>` at version SCHEMA_VERSION. If a previously stored
   * meta record carries a different schemaVersion, all model stores are wiped
   * and meta cleared so the engine re-bootstraps from the server.
   */
  static async open(workspaceSlug: string): Promise<Persistence> {
    assertBrowser();
    const db = await openSchemaDb(workspaceSlug);

    const persistence = new Persistence(db);
    const meta = await persistence.getMeta();
    if (meta !== undefined && meta.schemaVersion !== SCHEMA_VERSION) {
      await persistence.resetForSchemaMismatch();
    }
    return persistence;
  }

  getMeta(): Promise<PersistMeta | undefined> {
    return this.db.get(META_STORE, META_KEY);
  }

  async setMeta(meta: PersistMeta): Promise<void> {
    await this.db.put(META_STORE, meta, META_KEY);
  }

  /** Bulk insert/replace rows in a single readwrite transaction. */
  async putRows(model: ModelName, rows: AnyModelData[]): Promise<void> {
    if (rows.length === 0) return;
    const tx = this.db.transaction(model, "readwrite");
    await Promise.all([...rows.map((row) => tx.store.put(row)), tx.done]);
  }

  async putRow(model: ModelName, row: AnyModelData): Promise<void> {
    await this.db.put(model, row);
  }

  async deleteRow(model: ModelName, id: UUID): Promise<void> {
    await this.db.delete(model, id);
  }

  /** Read every model store — used for the warm local bootstrap. */
  async loadAll(): Promise<{ model: ModelName; data: AnyModelData }[]> {
    const tx = this.db.transaction(MODEL_NAMES, "readonly");
    const out: { model: ModelName; data: AnyModelData }[] = [];
    for (const model of MODEL_NAMES) {
      const rows = await tx.objectStore(model).getAll();
      for (const data of rows) {
        out.push({ model, data });
      }
    }
    await tx.done;
    return out;
  }

  /**
   * Mirror one server sync action into the model stores (deltas only):
   * I — put the full row; U — read-modify-write merge of changed fields;
   * V — merged row with archivedAt removed; A — merged row with archivedAt
   * (from the delta if present, else now); D — delete.
   */
  async applyAction(action: SyncAction): Promise<void> {
    const { modelName, modelId } = action;
    if (action.action === "D") {
      await this.db.delete(modelName, modelId);
      return;
    }

    const tx = this.db.transaction(modelName, "readwrite");
    const store = tx.store;

    if (action.action === "I") {
      if (action.data !== undefined) {
        const row: Record<string, unknown> = { ...action.data };
        await store.put(row as unknown as AnyModelData);
      }
    } else {
      // U / A / V — read-modify-write merge.
      const existing = await store.get(modelId);
      if (existing !== undefined || action.data !== undefined) {
        const merged: Record<string, unknown> = {
          ...(existing ?? {}),
          ...(action.data ?? {}),
        };
        merged.id = modelId;
        if (action.action === "V") {
          delete merged.archivedAt;
        } else if (action.action === "A" && typeof merged.archivedAt !== "string") {
          merged.archivedAt = new Date().toISOString();
        }
        await store.put(merged as unknown as AnyModelData);
      }
    }
    await tx.done;
  }

  // ----- durable transaction queue -----

  async saveTransaction(t: TransactionData): Promise<void> {
    await this.db.put(TX_STORE, t);
  }

  async deleteTransaction(id: UUID): Promise<void> {
    await this.db.delete(TX_STORE, id);
  }

  /** Queue contents ordered by createdAt, then batchIndex (replay order). */
  async loadTransactions(): Promise<TransactionData[]> {
    const all = await this.db.getAll(TX_STORE);
    return all.sort((a, b) => {
      if (a.createdAt < b.createdAt) return -1;
      if (a.createdAt > b.createdAt) return 1;
      return a.batchIndex - b.batchIndex;
    });
  }

  /** Clear every store: models, meta, and the transaction queue. */
  async wipe(): Promise<void> {
    const stores: (ModelName | typeof META_STORE | typeof TX_STORE)[] = [
      ...MODEL_NAMES,
      META_STORE,
      TX_STORE,
    ];
    const tx = this.db.transaction(stores, "readwrite");
    await Promise.all([...stores.map((s) => tx.objectStore(s).clear()), tx.done]);
  }

  /**
   * Schema drift (stored meta.schemaVersion !== SCHEMA_VERSION): wipe all
   * model stores and clear meta so the next boot re-bootstraps. The
   * transaction queue is left intact per spec wording; callers replaying it
   * should validate against the current schema.
   */
  private async resetForSchemaMismatch(): Promise<void> {
    const stores: (ModelName | typeof META_STORE)[] = [...MODEL_NAMES, META_STORE];
    const tx = this.db.transaction(stores, "readwrite");
    await Promise.all([...stores.map((s) => tx.objectStore(s).clear()), tx.done]);
  }
}
