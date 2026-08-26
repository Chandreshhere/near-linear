/**
 * MCP (Model Context Protocol) server — Streamable HTTP transport.
 *
 *   POST /api/mcp   JSON-RPC 2.0 request → `application/json` response
 *   GET  /api/mcp   405 (this server opens no server→client SSE stream)
 *
 * Built on the OFFICIAL SDK (`@modelcontextprotocol/sdk`) using its
 * Web-Standards transport (`WebStandardStreamableHTTPServerTransport`), which
 * takes a `Request` and returns a `Response` — exactly what a Next App Router
 * route handler has. Stateless mode: one `McpServer` + transport per request,
 * no session ids, so it works on serverless just as well as on a long-lived
 * node. The SDK owns protocol negotiation, JSON-Schema generation from the
 * zod input shapes, and the JSON-RPC error vocabulary; this file owns the
 * gate, the auth check and the shape validation in front of it.
 *
 * ── ⚠️ WHAT IT OPERATES ON — be honest about this ─────────────────────────
 * The app is LOCAL-FIRST: a normal user's workspace lives in THEIR BROWSER's
 * IndexedDB, which no server route can reach. This server therefore reads and
 * writes `ServerSyncStore` (src/server/syncStore.ts) — the server-side store
 * that is the reference implementation of the documented backend contract.
 *
 *   • Run the app with `NEXT_PUBLIC_SYNC_TRANSPORT=http` and this is END TO
 *     END REAL: an MCP `create_issue` lands in the same store the app reads,
 *     and the resulting SyncAction fans out over `GET /api/sync/events` to
 *     every connected tab within milliseconds.
 *   • Leave the default local transport on and MCP still works — but against
 *     the SERVER's copy of the workspace, not the tab you have open.
 *   • Point the app at a real backend and this layer becomes correct for free:
 *     the tools only ever speak the mutation contract (see
 *     src/server/mcp/tools.ts).
 *
 * ── AUTH ──────────────────────────────────────────────────────────────────
 * Two gates, both off by default in development:
 *   1. The same production gate as the sync mocks: 404 in production unless
 *      `ALLOW_SYNC_MOCK=1` (BACKEND_API.md §1.1).
 *   2. `MCP_TOKEN` — when set, every request must carry
 *      `Authorization: Bearer <token>` or gets a 401. A REAL DEPLOYMENT MUST
 *      SET IT: these tools create and mutate workspace data, and the endpoint
 *      is otherwise unauthenticated.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";

import {
  MCP_SERVER_NAME,
  MCP_SERVER_VERSION,
  TOOLS,
  runTool,
} from "@/server/mcp/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" } as const;

/* ================================================================
 * Gates
 * ================================================================ */

/**
 * Dev-only gate — mirrors src/app/api/sync/*: these routes have no auth of
 * their own and hold state in memory, so they must never answer in a
 * production deployment. Set ALLOW_SYNC_MOCK=1 to opt in deliberately.
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

/** Constant-time-ish comparison for the shared secret. */
function tokenMatches(presented: string, expected: string): boolean {
  if (presented.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < presented.length; i += 1) {
    diff |= presented.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return diff === 0;
}

/** `Authorization: Bearer <MCP_TOKEN>` when MCP_TOKEN is set; open otherwise. */
function unauthorized(request: Request): Response | null {
  const expected = process.env.MCP_TOKEN;
  if (expected === undefined || expected === "") return null;

  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (match !== null && tokenMatches(match[1].trim(), expected)) return null;

  return Response.json(
    jsonRpcError(null, -32001, "Unauthorized: send Authorization: Bearer <MCP_TOKEN>"),
    {
      status: 401,
      headers: { ...NO_STORE, "WWW-Authenticate": 'Bearer realm="mcp"' },
    },
  );
}

/* ================================================================
 * JSON-RPC helpers
 * ================================================================ */

interface JsonRpcErrorBody {
  jsonrpc: "2.0";
  id: string | number | null;
  error: { code: number; message: string };
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
): JsonRpcErrorBody {
  return { jsonrpc: "2.0", id, error: { code, message } };
}

/** The id of an incoming message, when it has a usable one. */
function messageId(value: unknown): string | number | null {
  if (typeof value !== "object" || value === null) return null;
  const id = (value as { id?: unknown }).id;
  return typeof id === "string" || typeof id === "number" ? id : null;
}

/**
 * Shape check ahead of the SDK so a malformed envelope answers -32600
 * (Invalid Request) rather than the SDK's blanket parse error. Accepts a
 * single request/notification or a batch of them.
 */
function invalidRequestReason(message: unknown): string | null {
  if (Array.isArray(message)) {
    if (message.length === 0) return "Batch must not be empty";
    for (const entry of message) {
      const reason = invalidRequestReason(entry);
      if (reason !== null) return reason;
    }
    return null;
  }
  if (typeof message !== "object" || message === null) {
    return "A JSON-RPC message must be an object";
  }
  const bag = message as Record<string, unknown>;
  if (bag.jsonrpc !== "2.0") return 'Missing or invalid "jsonrpc": expected "2.0"';
  if ("result" in bag || "error" in bag) {
    return "This endpoint accepts requests and notifications, not responses";
  }
  if (typeof bag.method !== "string" || bag.method === "") {
    return 'Missing or invalid "method"';
  }
  if ("id" in bag && bag.id !== null) {
    const type = typeof bag.id;
    if (type !== "string" && type !== "number") {
      return '"id" must be a string, a number or null';
    }
  }
  if ("params" in bag && bag.params !== undefined) {
    if (typeof bag.params !== "object" || bag.params === null) {
      return '"params" must be an object or an array';
    }
  }
  return null;
}

/* ================================================================
 * Server assembly (one per request — stateless transport)
 * ================================================================ */

function buildServer(): McpServer {
  const server = new McpServer(
    { name: MCP_SERVER_NAME, version: MCP_SERVER_VERSION },
    {
      capabilities: { tools: {} },
      instructions:
        "Tools for a product-development workspace: teams, projects, issues and comments. " +
        "Identifiers look like TRENDZO-37. Names resolve leniently — a team can be given by key or name, " +
        "a state by name or category, a member by name or email. Call list_teams first if you are unsure where work belongs.",
    },
  );

  for (const tool of TOOLS) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
      },
      (args: unknown) => {
        const { text, isError } = runTool(tool.name, args);
        return { content: [{ type: "text" as const, text }], isError };
      },
    );
  }

  return server;
}

/**
 * The SDK's Streamable HTTP transport requires clients to accept BOTH
 * `application/json` and `text/event-stream`. A hand-written curl or a
 * simpler client rarely does, and rejecting those is pure friction for a
 * server that only ever answers JSON — so the header is normalized here.
 */
function withNegotiableAccept(request: Request, body: string): Request {
  const headers = new Headers(request.headers);
  headers.set("accept", "application/json, text/event-stream");
  headers.set("content-type", "application/json");
  return new Request(request.url, { method: "POST", headers, body });
}

/* ================================================================
 * Handlers
 * ================================================================ */

export async function POST(request: Request): Promise<Response> {
  const blocked = mockDisabled();
  if (blocked !== null) return blocked;

  const denied = unauthorized(request);
  if (denied !== null) return denied;

  const rawBody = await request.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawBody);
  } catch {
    return Response.json(jsonRpcError(null, -32700, "Parse error: body is not valid JSON"), {
      status: 400,
      headers: NO_STORE,
    });
  }

  const reason = invalidRequestReason(parsed);
  if (reason !== null) {
    return Response.json(
      jsonRpcError(messageId(parsed), -32600, `Invalid Request: ${reason}`),
      { status: 400, headers: NO_STORE },
    );
  }

  const server = buildServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    // Stateless: no session ids, one transport per request.
    sessionIdGenerator: undefined,
    // Answer application/json rather than opening an SSE stream.
    enableJsonResponse: true,
  });

  try {
    await server.connect(transport);
    const response = await transport.handleRequest(
      withNegotiableAccept(request, rawBody),
      { parsedBody: parsed },
    );
    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "no-store");
    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    return Response.json(
      jsonRpcError(messageId(parsed), -32603, `Internal error: ${detail}`),
      { status: 500, headers: NO_STORE },
    );
  } finally {
    // Per-request lifecycle: never leak a server/transport pair.
    await server.close().catch(() => {});
  }
}

/**
 * Streamable HTTP lets a server offer a standalone server→client SSE stream
 * on GET. This one does not (the app already has `GET /api/sync/events` for
 * live deltas), and 405 is the specified answer for that case.
 */
export function GET(): Response {
  const blocked = mockDisabled();
  if (blocked !== null) return blocked;
  return Response.json(
    jsonRpcError(null, -32601, "This MCP server does not offer a GET event stream; POST JSON-RPC instead"),
    { status: 405, headers: { ...NO_STORE, Allow: "POST" } },
  );
}

/** Session teardown is meaningless for a stateless server. */
export function DELETE(): Response {
  const blocked = mockDisabled();
  if (blocked !== null) return blocked;
  return Response.json(
    jsonRpcError(null, -32601, "This MCP server is stateless; there is no session to delete"),
    { status: 405, headers: { ...NO_STORE, Allow: "POST" } },
  );
}
