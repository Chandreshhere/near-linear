/**
 * POST /api/integrations/inbound - the chat-integration webhook receiver.
 *
 * This used to be a shape-check that answered 202 and did nothing. It is now
 * a REAL server-side pipeline: verify -> route -> extract -> create the issue
 * -> answer 202 with the identifier. The steps mirror the browser pipeline
 * (`src/lib/integrations/store.ts#ingest`) function for function, because the
 * parts that can be shared ARE shared - the rule shape, the trigger
 * vocabulary and the message-to-task extraction all come from
 * `src/lib/integrations/shared.ts`, which both sides import.
 *
 * WHAT IT WRITES TO - the same honest caveat as the MCP server. The app is
 * local-first: a browser's workspace lives in ITS OWN IndexedDB and no server
 * route can reach it. So the issue is created in `ServerSyncStore`
 * (src/server/syncStore.ts), through the shared tool layer
 * (`src/server/mcp/tools.ts#createIssueFromChat`) and therefore through
 * `applyMutation` - which allocates a syncId and broadcasts the new row down
 * the existing `GET /api/sync/events` SSE stream. With
 * `NEXT_PUBLIC_SYNC_TRANSPORT=http` a Slack message becomes an issue in the
 * running app end to end. With the default local transport it lands in the
 * server's copy of the workspace instead, and the settings-page simulator -
 * which drives the identical pipeline inside the tab - is the way to see it
 * in your own browser. Both remain true; neither is pretended away.
 *
 * WHERE THE RULES COME FROM: `INTEGRATIONS_RULES` (see
 * src/server/integrations/rules.ts). The browser's rules live in
 * localStorage and are unreachable from here.
 *
 * SIGNATURE SCHEME (enforced when `INTEGRATIONS_SIGNING_SECRET` is set):
 *
 *   X-Signature: sha256=<hex>
 *   X-Timestamp: <unix seconds>        (optional but recommended)
 *
 *   hex = HMAC-SHA256(secret, signedPayload), compared with
 *   `crypto.timingSafeEqual`. `signedPayload` is the RAW request body, or
 *   `<timestamp>.<rawBody>` when X-Timestamp is present. With a timestamp the
 *   request is also rejected outside a 300-second window, which is what makes
 *   a captured request unreplayable; without one, replay protection rests on
 *   `messageId` de-duplication alone - so send the timestamp.
 *
 *   Provider-native schemes (Slack signs `v0:{ts}:{body}` into
 *   `X-Slack-Signature`; Teams sends `Authorization: HMAC {base64}`) are
 *   normalized by the adapter that calls this route, exactly as the request
 *   body is.
 *
 * IDEMPOTENCY: an optional `messageId` (Slack `event_id`, Teams activity
 * `id`) is remembered in a capped in-memory map; a repeat answers 202 with
 * `duplicate: true` and the original identifier, without re-running the
 * pipeline. In-memory means per-process - a real deployment uses a shared
 * store with a TTL.
 *
 * RESPONSES
 *   202 { accepted: true, identifier?: string, ignored?: string, duplicate?: true }
 *       Always 202 once the request is well-formed and authentic: rule and
 *       trigger misses are pipeline outcomes, not transport errors.
 *   400 { accepted: false, error: string }   malformed payload
 *   401 { accepted: false, error: string }   signature verification failed
 *   404                                      production gate (see below)
 */

import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";

import {
  clampPriority,
  describeTask,
  extractTask,
  provenanceFooter,
  triggerRejection,
} from "@/lib/integrations/shared";
import { loadRules, selectRule, FIRST_TEAM } from "@/server/integrations/rules";
import { createIssueFromChat, firstTeam, resolveTeam, ToolError } from "@/server/mcp/tools";
import { ServerSyncStore } from "@/server/syncStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/** Rejection window for a signed request that carries X-Timestamp. */
const REPLAY_WINDOW_SECONDS = 300;

/** How many message ids the de-duplication map remembers. */
const SEEN_LIMIT = 1000;

const inboundSchema = z.object({
  provider: z.enum(["slack", "msteams"]),
  workspaceName: z.string().min(1),
  channel: z.string().min(1),
  author: z.string().min(1),
  text: z.string().min(1),
  /** Provider event id. Optional; supplying it makes retries safe. */
  messageId: z.string().min(1).optional(),
});

/* ================================================================
 * Gates
 * ================================================================ */

/**
 * Dev-only gate - mirrors src/app/api/sync/*: these routes have no auth of
 * their own and hold state in memory, so they must never answer in a
 * production deployment (BACKEND_API.md 1.1). Set ALLOW_SYNC_MOCK=1 to opt
 * in deliberately (e.g. a staging demo).
 */
function mockDisabled(): Response | null {
  if (process.env.NODE_ENV !== "production" || process.env.ALLOW_SYNC_MOCK === "1") {
    return null;
  }
  return Response.json(
    {
      error:
        "The dev mock is disabled in production. Point NEXT_PUBLIC_API_BASE_URL at a real backend (see BACKEND_API.md).",
    },
    { status: 404, headers: NO_STORE },
  );
}

function hexEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  // timingSafeEqual throws on a length mismatch; check that first, and note
  // that the length of a signature is not a secret.
  return left.length === right.length && left.length > 0 && timingSafeEqual(left, right);
}

/**
 * Verify `X-Signature` against the raw body. Returns an error message when
 * the request must be rejected, or `undefined` when it is authentic (or when
 * no secret is configured, which leaves the route open for development).
 */
function signatureFailure(request: Request, rawBody: string): string | undefined {
  const secret = process.env.INTEGRATIONS_SIGNING_SECRET;
  if (secret === undefined || secret === "") return undefined;

  const header = request.headers.get("x-signature");
  if (header === null || header.trim() === "") {
    return "Missing X-Signature header";
  }
  const match = /^sha256=([0-9a-f]+)$/i.exec(header.trim());
  if (match === null) {
    return "Malformed X-Signature header - expected sha256=<hex>";
  }

  const timestampHeader = request.headers.get("x-timestamp");
  let signedPayload = rawBody;
  if (timestampHeader !== null && timestampHeader.trim() !== "") {
    const timestamp = Number.parseInt(timestampHeader.trim(), 10);
    if (!Number.isFinite(timestamp)) {
      return "Malformed X-Timestamp header - expected unix seconds";
    }
    const skew = Math.abs(Math.floor(Date.now() / 1000) - timestamp);
    if (skew > REPLAY_WINDOW_SECONDS) {
      return `Stale request - X-Timestamp is ${skew}s off (window is ${REPLAY_WINDOW_SECONDS}s)`;
    }
    signedPayload = `${timestamp}.${rawBody}`;
  }

  const expected = createHmac("sha256", secret).update(signedPayload, "utf8").digest("hex");
  return hexEqual(match[1].toLowerCase(), expected)
    ? undefined
    : "Signature verification failed";
}

/* ================================================================
 * Idempotency - capped in-memory map, survives dev HMR via globalThis
 * ================================================================ */

const SEEN_KEY = "__linearInboundSeen__";

type GlobalWithSeen = typeof globalThis & {
  [SEEN_KEY]?: Map<string, string | null>;
};

/** messageId -> identifier of the issue it created (null = it was ignored). */
function seenMessages(): Map<string, string | null> {
  const g = globalThis as GlobalWithSeen;
  const existing = g[SEEN_KEY];
  if (existing !== undefined) return existing;
  const created = new Map<string, string | null>();
  g[SEEN_KEY] = created;
  return created;
}

function remember(messageId: string, identifier: string | null): void {
  const seen = seenMessages();
  seen.set(messageId, identifier);
  // Map iterates in insertion order, so the oldest keys fall off first.
  while (seen.size > SEEN_LIMIT) {
    const oldest = seen.keys().next();
    if (oldest.done === true) break;
    seen.delete(oldest.value);
  }
}

/* ================================================================
 * Responses
 * ================================================================ */

interface AcceptedBody {
  accepted: true;
  identifier?: string;
  ignored?: string;
  duplicate?: true;
  /** Set when INTEGRATIONS_RULES could not be read as written. */
  warning?: string;
}

function accepted(body: AcceptedBody): Response {
  return Response.json(body, { status: 202, headers: NO_STORE });
}

function rejected(status: number, error: string): Response {
  return Response.json({ accepted: false, error }, { status, headers: NO_STORE });
}

/* ================================================================
 * The pipeline
 * ================================================================ */

export async function POST(request: Request): Promise<Response> {
  const blocked = mockDisabled();
  if (blocked !== null) return blocked;

  // 0) Raw body FIRST - the signature covers the bytes, not the reparse.
  const rawBody = await request.text();

  const signatureError = signatureFailure(request, rawBody);
  if (signatureError !== undefined) return rejected(401, signatureError);

  let raw: unknown;
  try {
    raw = JSON.parse(rawBody);
  } catch {
    return rejected(400, "Invalid JSON body");
  }

  const parsed = inboundSchema.safeParse(raw);
  if (!parsed.success) {
    return Response.json(
      {
        accepted: false,
        error: "Invalid inbound message",
        details: parsed.error.issues,
      },
      { status: 400, headers: NO_STORE },
    );
  }
  const message = parsed.data;

  // 1) Idempotency - a provider retry must not mint a second issue.
  if (message.messageId !== undefined) {
    const seen = seenMessages();
    if (seen.has(message.messageId)) {
      const identifier = seen.get(message.messageId) ?? undefined;
      return accepted({
        accepted: true,
        duplicate: true,
        ...(identifier !== undefined ? { identifier } : {}),
        ignored: "Duplicate messageId - already processed",
      });
    }
  }

  const finish = (body: AcceptedBody): Response => {
    if (message.messageId !== undefined) {
      remember(message.messageId, body.identifier ?? null);
    }
    return accepted(body);
  };

  const { rules, warning } = loadRules();
  const withWarning = (body: AcceptedBody): AcceptedBody =>
    warning !== undefined ? { ...body, warning } : body;

  // 2) Routing rule - exact channel beats the "*" catch-all.
  const rule = selectRule(rules, message);
  if (rule === undefined) {
    return finish(
      withWarning({ accepted: true, ignored: `No routing rule for #${message.channel}` }),
    );
  }

  // 3) Trigger mode.
  const text = message.text.trim();
  const rejection = triggerRejection(rule.trigger, text);
  if (rejection !== undefined) {
    return finish(withWarning({ accepted: true, ignored: rejection }));
  }

  // 4) Extraction - the same function the browser pipeline runs.
  const task = extractTask(text, rule.trigger);
  if (task === undefined) {
    return finish(
      withWarning({ accepted: true, ignored: "No text left to use as a title" }),
    );
  }

  // 5) Destination team.
  const store = ServerSyncStore.instance();
  let teamId: string;
  try {
    const team = rule.team === FIRST_TEAM ? firstTeam(store) : resolveTeam(store, rule.team);
    if (team === undefined) {
      return finish(withWarning({ accepted: true, ignored: "This workspace has no teams" }));
    }
    teamId = team.id;
  } catch (error) {
    const reason = error instanceof ToolError ? error.message : "Routed team no longer exists";
    return finish(withWarning({ accepted: true, ignored: reason }));
  }

  // 6) Create the issue through the shared tool layer, which writes through
  //    applyMutation and therefore fans out over the SSE delta stream.
  const author = message.author.trim() === "" ? "unknown" : message.author.trim();
  const description = describeTask(
    task.body,
    provenanceFooter(message.provider, message.channel, author),
  );

  try {
    const issue = createIssueFromChat(store, {
      teamId,
      title: task.title,
      description,
      priority: task.priority ?? clampPriority(rule.priority) ?? 0,
      assignSelf: task.assignSelf,
      labelNames: rule.labels ?? [],
    });
    return finish(withWarning({ accepted: true, identifier: issue.identifier }));
  } catch (error) {
    const reason = error instanceof ToolError ? error.message : "Could not create the issue";
    return finish(withWarning({ accepted: true, ignored: reason }));
  }
}
