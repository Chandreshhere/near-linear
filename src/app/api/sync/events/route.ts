/**
 * ⚠️ DEV-ONLY MOCK of the documented backend contract — the shipped app never
 * calls this route. SyncClient defaults to LocalTransport, whose cross-tab
 * BroadcastChannel replaces this stream; this endpoint only serves
 * HttpTransport when NEXT_PUBLIC_SYNC_TRANSPORT=http. It is the reference
 * implementation the real backend must match (BACKEND_API.md / §19).
 *
 * GET /api/sync/events — Server-Sent Events delta stream.
 * On connect: event "handshake" { lastSyncId, schemaVersion }. With
 * ?since=<id>, immediately replays actionsSince(id) as "action" events, then
 * live-streams every broadcast SyncAction. Heartbeat comment every 25s;
 * subscription is torn down when the request aborts. (MASTER_PROMPT.md §19)
 */

import { SCHEMA_VERSION, type SyncHandshake } from "@/lib/data/types";
import { ServerSyncStore } from "@/server/syncStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const HEARTBEAT_MS = 25_000;

/**
 * Dev-only gate. These mock routes have no auth and hold state in memory, so
 * they must never answer in a production deployment (BACKEND_API.md §1.1).
 * Set ALLOW_SYNC_MOCK=1 to opt in deliberately (e.g. a staging demo).
 */
function mockDisabled(): Response | null {
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_SYNC_MOCK === "1") {
    return null;
  }
  return Response.json(
    { error: "The dev mock is disabled in production. Point NEXT_PUBLIC_API_BASE_URL at a real backend (see BACKEND_API.md)." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(request: Request): Promise<Response> {
  const blocked = mockDisabled();
  if (blocked !== null) return blocked;

  const store = ServerSyncStore.instance();

  const url = new URL(request.url);
  const sinceParam = url.searchParams.get("since");
  const since =
    sinceParam !== null && sinceParam !== ""
      ? Number.parseInt(sinceParam, 10)
      : null;

  const encoder = new TextEncoder();
  let cleanup: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;

      const send = (chunk: string): void => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          // Consumer went away between abort and enqueue.
          cleanup();
        }
      };

      const sendEvent = (event: string, data: unknown): void => {
        send(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      const unsubscribe = store.subscribe((action) => {
        sendEvent("action", action);
      });

      const heartbeat = setInterval(() => {
        send(`: heartbeat ${Date.now()}\n\n`);
      }, HEARTBEAT_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        unsubscribe();
        clearInterval(heartbeat);
        try {
          controller.close();
        } catch {
          // Already closed/errored — nothing to do.
        }
      };

      request.signal.addEventListener("abort", cleanup);
      if (request.signal.aborted) {
        cleanup();
        return;
      }

      const handshake: SyncHandshake = {
        lastSyncId: store.lastSyncId,
        schemaVersion: SCHEMA_VERSION,
      };
      sendEvent("handshake", handshake);

      if (since !== null && Number.isFinite(since)) {
        for (const action of store.actionsSince(since)) {
          sendEvent("action", action);
        }
      }
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
