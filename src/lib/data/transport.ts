/**
 * SyncTransport — the ONE seam between the local-first client engine and
 * whatever supplies sync. Everything above this interface (MobX pool,
 * IndexedDB persistence, optimistic transaction queue, rebase, meta
 * bookkeeping) is transport-agnostic and never touches the network.
 *
 * Implementations:
 *   - transports/local.ts  LocalTransport — DEFAULT. 100% in-browser: the
 *                          IndexedDB mirror IS the authority (a new workspace
 *                          bootstraps empty), sync ids come from a persisted
 *                          counter, cross-tab realtime rides a
 *                          BroadcastChannel. Zero server dependency.
 *   - transports/http.ts   HttpTransport — GET  bootstrap (NDJSON stream),
 *                          POST mutation, EventSource delta stream. This is
 *                          the shape a REAL backend must implement (the
 *                          dev-only mock under src/app/api/sync/* is one).
 *
 * Selected once, at SyncClient construction, from NEXT_PUBLIC_SYNC_TRANSPORT
 * (see .env.example). Nothing else in the app may import a transport directly.
 */

import type {
  AnyModelData,
  ModelName,
  MutationRequest,
  MutationResponse,
  SyncAction,
} from "@/lib/data/types";

/** Delta-stream connection state reported back to the client facade. */
export type TransportStatus = "connecting" | "open" | "closed";

/** Full row set + high-water mark handed back by a cold bootstrap. */
export interface BootstrapPayload {
  rows: { model: ModelName; data: AnyModelData }[];
  lastSyncId: number;
  schemaVersion: number;
}

export interface SyncTransport {
  /** Stable identifier for diagnostics ("local" | "http"). */
  readonly name: string;

  /**
   * Cold bootstrap: the complete authoritative row set plus the sync
   * high-water mark. Only called when the local IndexedDB mirror has no
   * `_meta` record — a warm start never hits the transport. ZERO rows is a
   * valid answer: that is what a workspace nobody has created yet looks like.
   */
  bootstrap(): Promise<BootstrapPayload>;

  /**
   * Apply one merged batch of optimistic transactions (already ordered by
   * batchIndex on the client). Per-transaction failures are reported in
   * `rejected` (id -> message) and roll back on the client; a thrown error
   * means "retryable" and keeps the batch queued with backoff.
   */
  submit(req: MutationRequest): Promise<MutationResponse>;

  /**
   * Live delta stream. Delivers every SyncAction with id > `since`, in
   * ascending id order, including actions this client originated. Returns the
   * unsubscribe function.
   */
  subscribe(
    since: number,
    onAction: (a: SyncAction) => void,
    onStatus?: (s: TransportStatus) => void,
  ): () => void;
}
