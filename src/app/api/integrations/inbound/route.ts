/**
 * ⚠️ DEV-ONLY MOCK — the real backend implements this contract.
 *
 * POST /api/integrations/inbound — the chat-integration webhook receiver.
 * This is THE seam of the integrations MVP: everything else (connections,
 * routing rules, trigger modes, task extraction, issue creation, the activity
 * log) already runs in the client (`src/lib/integrations/store.ts#ingest`,
 * driven today by the settings-page message simulator). The one thing a
 * backend must add is this endpoint actually receiving provider events and
 * pushing the resulting issue through the sync engine.
 *
 * This mock CANNOT do that: routing rules and the activity log live in the
 * browser (localStorage "integrations") and issues are created through the
 * client-side transaction queue, none of which is reachable from a server
 * route. So the mock only validates the request shape and answers 202 — a
 * contract check, not a pipeline.
 *
 * ── CONTRACT (verbatim for BACKEND_API.md) ─────────────────────────────────
 *
 * ### POST /api/integrations/inbound
 * One normalized chat message from a connected provider. The provider-facing
 * adapters (Slack Events API endpoint, Teams bot messaging endpoint) map
 * their native event payloads onto this shape before calling it — or the
 * backend implements this normalization inline and treats this route as the
 * provider-facing webhook itself.
 *
 * Request (application/json):
 * {
 *   "provider":      "slack" | "msteams",
 *   "workspaceName": "synquic",          // provider workspace/tenant the bot is installed in
 *   "channel":       "eng",              // channel id or name the message was posted in
 *   "author":        "sana",             // display name of the message author
 *   "text":          "/task Fix retailer login priority high"  // raw text, trigger token included
 * }
 *
 * Responses:
 *   202 { "accepted": true }                      — queued for processing (always
 *       202, even when the message will be logged as ignored: trigger-mode and
 *       rule matching are pipeline outcomes, not transport errors)
 *   400 { "accepted": false, "error": string }    — malformed payload
 *   401 { "accepted": false, "error": string }    — signature verification failed
 *
 * Signature verification (REQUIRED in the real receiver, skipped here):
 *   - slack:   verify `X-Slack-Signature` = HMAC-SHA256 over
 *              "v0:{X-Slack-Request-Timestamp}:{rawBody}" with the app's
 *              signing secret, and reject timestamps older than 5 minutes.
 *   - msteams: verify the `Authorization: HMAC {base64}` header — HMAC-SHA256
 *              of the raw body with the outgoing-webhook security token.
 *
 * Processing rules (the backend re-implements `ingest()` server-side —
 * src/lib/integrations/store.ts is the reference implementation):
 *   1. Resolve the IntegrationConnection by (provider, workspaceName); drop
 *      with 202 + activity-log "ignored" when disconnected or unknown.
 *   2. Resolve the RoutingRule: a rule for the exact channel wins over the
 *      "*" catch-all; no rule → ignored.
 *   3. Check the rule's triggerMode: "mention" needs "@linear" (case-
 *      insensitive) in the text, "command" needs the text to start with
 *      "/task", "all" always passes.
 *   4. Extract the task: strip the trigger token, consume "priority
 *      urgent/high/medium/low" and "assign me" hints, first sentence/line
 *      (≤140 chars) = title, remainder = description, then append the footer
 *      line "Created from {Provider} · #{channel} · {author}".
 *   5. Create the issue THROUGH THE SAME MUTATION CONTRACT AS THE CLIENT —
 *      a "create" Issue transaction (POST /api/sync/mutation shape, §19):
 *      identifier/number allocated from the team's issueCounter, stateId =
 *      the team's first backlog state, sortOrder above the state's current
 *      top row, creatorId = the integration's bot/service user. Applying it
 *      through the sync engine is what fans the new issue out to every
 *      connected client as a delta — no side channel.
 *   6. Append the InboundMessage (with its created/ignored outcome) to the
 *      connection's activity log so the settings page can render it.
 */

import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const inboundSchema = z.object({
  provider: z.enum(["slack", "msteams"]),
  workspaceName: z.string().min(1),
  channel: z.string().min(1),
  author: z.string().min(1),
  text: z.string().min(1),
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
    { error: "The dev mock is disabled in production. Point NEXT_PUBLIC_API_BASE_URL at a real backend (see BACKEND_API.md)." },
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
      { accepted: false, error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = inboundSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      { accepted: false, error: "Invalid inbound message", details: parsed.error.issues },
      { status: 400 },
    );
  }

  // Real backend: verify the provider signature (see header comment), then
  // run the routing pipeline and submit the create-Issue transaction into the
  // sync engine. The dev mock accepts the shape and does nothing — the
  // settings-page simulator drives the same pipeline in the browser instead.
  return Response.json({ accepted: true }, { status: 202 });
}
