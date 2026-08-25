/**
 * ⚠️ DEV-ONLY MOCK of the documented backend contract — the shipped app never
 * calls this route. SyncClient defaults to LocalTransport, which applies
 * mutations in the browser; this endpoint only serves HttpTransport when
 * NEXT_PUBLIC_SYNC_TRANSPORT=http. It is the reference implementation the real
 * backend must match (BACKEND_API.md / MASTER_PROMPT.md §19 write path).
 *
 * POST /api/sync/mutation — apply a MutationRequest batch, return the
 * MutationResponse (per-transaction rejections; lastSyncId high-water mark).
 */

import { z } from "zod";

import type { MutationRequest, MutationResponse } from "@/lib/data/types";
import { MODEL_NAMES } from "@/lib/data/types";
import { ServerSyncStore } from "@/server/syncStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const transactionSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["create", "update", "delete", "archive", "unarchive"]),
  modelName: z.enum(MODEL_NAMES as [(typeof MODEL_NAMES)[number], ...typeof MODEL_NAMES]),
  modelId: z.string().min(1),
  payload: z.record(z.string(), z.unknown()).optional(),
  changeSnapshot: z.record(z.string(), z.unknown()).optional(),
  batchIndex: z.number().int(),
  createdAt: z.string(),
  status: z.enum(["queued", "executing", "acked"]),
});

const mutationRequestSchema = z.object({
  clientId: z.string().min(1),
  transactions: z.array(transactionSchema),
});

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
    { error: "The dev sync mock is disabled in production. Point NEXT_PUBLIC_API_BASE_URL at a real backend (see BACKEND_API.md)." },
    { status: 404, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  const blocked = mockDisabled();
  if (blocked !== null) return blocked;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = mutationRequestSchema.safeParse(raw);
  if (!parsed.success) {
    // CONTRACT (BACKEND_API.md §3.2): a 4xx makes HttpTransport throw, and the
    // queue treats a throw as "retryable" — it would resubmit this malformed
    // batch forever. Per-transaction failures must come back 200 + `rejected`
    // so the client rolls those writes back and drops them. Only a genuinely
    // transient server fault deserves a non-2xx.
    const rejected: Record<string, string> = {};
    const body: unknown = raw;
    const list =
      typeof body === "object" && body !== null && Array.isArray((body as { transactions?: unknown }).transactions)
        ? ((body as { transactions: unknown[] }).transactions)
        : [];
    for (const t of list) {
      const id = typeof t === "object" && t !== null && typeof (t as { id?: unknown }).id === "string"
        ? (t as { id: string }).id
        : undefined;
      if (id !== undefined) rejected[id] = "Malformed transaction: does not match the MutationRequest schema";
    }
    const res: MutationResponse = {
      ok: false,
      lastSyncId: ServerSyncStore.instance().lastSyncId,
      rejected,
    };
    return Response.json(res, { status: 200, headers: { "Cache-Control": "no-store" } });
  }

  const req: MutationRequest = parsed.data;
  const res: MutationResponse = ServerSyncStore.instance().applyMutation(req);

  return Response.json(res, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}
