/**
 * HttpTransport — the networked SyncTransport, moved verbatim out of
 * SyncClient. It talks the contract documented in BACKEND_API.md:
 *
 *   GET  {base}/api/sync/bootstrap          → NDJSON stream, one
 *        `{ model, data }` line per row, then the trailer
 *        `{ _trailer: true, lastSyncId, schemaVersion }`.
 *   POST {base}/api/sync/mutation           → MutationRequest -> MutationResponse.
 *   GET  {base}/api/sync/events?since=<id>  → text/event-stream; `handshake`
 *        event on connect, then one `action` event per SyncAction (replay of
 *        everything after `since`, then live), heartbeat comments.
 *
 * `{base}` is NEXT_PUBLIC_API_BASE_URL (empty = same origin). The dev-only
 * mock under src/app/api/sync/* implements exactly this; a real backend is
 * wired in by pointing NEXT_PUBLIC_API_BASE_URL at it and setting
 * NEXT_PUBLIC_SYNC_TRANSPORT=http — no other change to the app.
 *
 * NOT the default: LocalTransport is (see .env.example).
 */

import type {
  BootstrapPayload,
  SyncTransport,
  TransportStatus,
} from "@/lib/data/transport";
import type {
  AnyModelData,
  BootstrapLine,
  BootstrapTrailer,
  ModelName,
  MutationRequest,
  MutationResponse,
  SyncAction,
} from "@/lib/data/types";

export interface HttpTransportOptions {
  /** Origin (or origin + path prefix) of the sync API. Defaults to same origin. */
  baseUrl?: string;
}

function defaultBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_API_BASE_URL;
  return typeof configured === "string" ? configured : "";
}

export class HttpTransport implements SyncTransport {
  readonly name = "http";

  readonly #baseUrl: string;

  constructor(options: HttpTransportOptions = {}) {
    const raw = options.baseUrl ?? defaultBaseUrl();
    this.#baseUrl = raw.replace(/\/+$/, "");
  }

  #url(path: string): string {
    return `${this.#baseUrl}${path}`;
  }

  /** Stream the NDJSON bootstrap, collecting rows until the trailer. */
  async bootstrap(): Promise<BootstrapPayload> {
    const res = await fetch(this.#url("/api/sync/bootstrap"), { cache: "no-store" });
    if (!res.ok || res.body === null) {
      throw new Error(`bootstrap request failed: HTTP ${res.status}`);
    }

    const rows: { model: ModelName; data: AnyModelData }[] = [];
    let trailer: BootstrapTrailer | null = null;
    const handleLine = (line: string): void => {
      const trimmed = line.trim();
      if (trimmed === "") return;
      const parsed = JSON.parse(trimmed) as BootstrapLine;
      if ("_trailer" in parsed) trailer = parsed;
      else rows.push(parsed);
    };

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline = buffer.indexOf("\n");
      while (newline >= 0) {
        handleLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
        newline = buffer.indexOf("\n");
      }
    }
    buffer += decoder.decode();
    handleLine(buffer);

    // (cast: TS keeps `trailer` narrowed to its initializer across the closure)
    const t = trailer as BootstrapTrailer | null;
    if (t === null) throw new Error("bootstrap stream ended without trailer");

    return { rows, lastSyncId: t.lastSyncId, schemaVersion: t.schemaVersion };
  }

  /** POST the merged batch; non-2xx throws so the queue retries with backoff. */
  async submit(req: MutationRequest): Promise<MutationResponse> {
    const res = await fetch(this.#url("/api/sync/mutation"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error(`mutation request failed: HTTP ${res.status}`);
    }
    return (await res.json()) as MutationResponse;
    // NOTE: lastSyncId is advanced by the delta stream (which also persists
    // the action) — never directly from the mutation response.
  }

  subscribe(
    since: number,
    onAction: (a: SyncAction) => void,
    onStatus?: (s: TransportStatus) => void,
  ): () => void {
    if (typeof EventSource === "undefined") {
      onStatus?.("closed"); // SSR / no live stream available
      return () => {};
    }

    const es = new EventSource(this.#url(`/api/sync/events?since=${since}`));
    onStatus?.("connecting");

    es.addEventListener("action", (event) => {
      const raw = (event as MessageEvent<string>).data;
      let action: SyncAction;
      try {
        action = JSON.parse(raw) as SyncAction;
      } catch {
        return; // malformed frame — ignore
      }
      onAction(action);
    });
    es.addEventListener("open", () => {
      onStatus?.("open");
    });
    es.addEventListener("error", () => {
      // EventSource reconnects on its own while CONNECTING; only a hard
      // CLOSED stream is a real failure.
      if (es.readyState === EventSource.CLOSED) onStatus?.("closed");
    });

    return () => {
      es.close();
    };
  }
}
