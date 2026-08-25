/**
 * ⚠️ DEV-ONLY MOCK of the documented backend contract — the shipped app never
 * calls this route. SyncClient defaults to LocalTransport (zero network); this
 * endpoint only serves HttpTransport when NEXT_PUBLIC_SYNC_TRANSPORT=http.
 * It is the reference implementation the real backend must match
 * (BACKEND_API.md / MASTER_PROMPT.md §19).
 *
 * GET /api/sync/bootstrap — full bootstrap as streamed NDJSON.
 * One JSON object per line: every row as { model, data }, then the trailer
 * { _trailer: true, lastSyncId, schemaVersion }.
 */

import { ServerSyncStore } from "@/server/syncStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

export async function GET(): Promise<Response> {
  const blocked = mockDisabled();
  if (blocked !== null) return blocked;

  const store = ServerSyncStore.instance();
  const lines = store.bootstrapLines();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const line of lines) {
        controller.enqueue(encoder.encode(`${JSON.stringify(line)}\n`));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store, no-transform",
    },
  });
}
