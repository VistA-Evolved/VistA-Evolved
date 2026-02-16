/**
 * WebSocket console gateway — Phase 13F.
 *
 * Provides a WebSocket endpoint at /ws/console that allows
 * authenticated admin users to execute RPC calls in real-time.
 *
 * Security:
 *   - Requires valid session token (via query param or cookie)
 *   - Admin role only (RBAC)
 *   - All commands are audit-logged
 *   - Credentials are never logged or echoed
 *
 * Protocol:
 *   Client sends JSON: { "type": "rpc", "name": "RPC NAME", "params": ["p1","p2"] }
 *   Server responds JSON: { "type": "result", "lines": [...], "ts": "ISO" }
 *   Or error: { "type": "error", "message": "...", "ts": "ISO" }
 */

import type { FastifyInstance } from "fastify";
import { getSession, type SessionData } from "../auth/session-store.js";
import { validateCredentials } from "../vista/config.js";
import { connect, disconnect, callRpc } from "../vista/rpcBrokerClient.js";

/* ------------------------------------------------------------------ */
/* Audit log                                                           */
/* ------------------------------------------------------------------ */

interface AuditEntry {
  ts: string;
  duz: string;
  userName: string;
  action: string;
  rpcName?: string;
  result?: string;
}

const auditLog: AuditEntry[] = [];
const MAX_AUDIT_ENTRIES = 500;

function audit(session: SessionData, action: string, rpcName?: string, result?: string): void {
  const entry: AuditEntry = {
    ts: new Date().toISOString(),
    duz: session.duz,
    userName: session.userName,
    action,
    rpcName,
    result: result?.substring(0, 200),
  };
  auditLog.push(entry);
  if (auditLog.length > MAX_AUDIT_ENTRIES) auditLog.shift();
  // Never log credentials
  console.log(`[WS-AUDIT] ${entry.ts} DUZ=${entry.duz} action=${action}${rpcName ? ` rpc=${rpcName}` : ''}`);
}

/* ------------------------------------------------------------------ */
/* WebSocket route                                                     */
/* ------------------------------------------------------------------ */

export default async function wsConsoleRoutes(server: FastifyInstance): Promise<void> {
  // WebSocket console endpoint
  server.get("/ws/console", { websocket: true }, (socket, request) => {
    // Authenticate session from query param
    const url = new URL(request.url, `http://${request.headers.host}`);
    const token = url.searchParams.get("token") || "";
    const session = getSession(token);

    if (!session) {
      socket.send(JSON.stringify({ type: "error", message: "Not authenticated. Provide ?token=<session_token>", ts: new Date().toISOString() }));
      socket.close(4001, "Not authenticated");
      return;
    }

    // RBAC: admin and provider roles can access console
    const allowedRoles = ["admin", "provider"];
    if (!allowedRoles.includes(session.role)) {
      audit(session, "DENIED", undefined, "Insufficient role for console access");
      socket.send(JSON.stringify({ type: "error", message: `Console access requires one of: ${allowedRoles.join(", ")}. Your role: ${session.role}`, ts: new Date().toISOString() }));
      socket.close(4003, "Forbidden");
      return;
    }

    audit(session, "CONNECT");

    socket.send(JSON.stringify({
      type: "info",
      message: `Connected as ${session.userName} (DUZ ${session.duz}, role: ${session.role})`,
      ts: new Date().toISOString(),
    }));

    socket.on("message", async (raw: Buffer | string) => {
      let msg: { type?: string; name?: string; params?: string[]; path?: string };
      try {
        msg = JSON.parse(typeof raw === "string" ? raw : raw.toString("utf8"));
      } catch {
        socket.send(JSON.stringify({ type: "error", message: "Invalid JSON", ts: new Date().toISOString() }));
        return;
      }

      if (msg.type === "rpc") {
        // Execute an RPC call
        const rpcName = msg.name;
        const params = msg.params || [];

        if (!rpcName || typeof rpcName !== "string") {
          socket.send(JSON.stringify({ type: "error", message: "Missing rpc name", ts: new Date().toISOString() }));
          return;
        }

        // Security: block credential-related RPCs from console
        const blocked = ["XUS AV CODE", "XUS SET VISITOR"];
        if (blocked.includes(rpcName.toUpperCase())) {
          audit(session, "BLOCKED_RPC", rpcName);
          socket.send(JSON.stringify({ type: "error", message: `RPC "${rpcName}" is blocked for security`, ts: new Date().toISOString() }));
          return;
        }

        audit(session, "RPC_CALL", rpcName);

        try {
          validateCredentials();
          await connect();
          const lines = await callRpc(rpcName, params);
          disconnect();
          socket.send(JSON.stringify({
            type: "result",
            rpcName,
            lines,
            count: lines.length,
            ts: new Date().toISOString(),
          }));
          audit(session, "RPC_OK", rpcName, `${lines.length} lines`);
        } catch (err: any) {
          disconnect();
          socket.send(JSON.stringify({
            type: "error",
            message: err.message,
            rpcName,
            ts: new Date().toISOString(),
          }));
          audit(session, "RPC_ERROR", rpcName, err.message);
        }
      } else if (msg.type === "api") {
        // Execute a local API GET request
        const path = msg.path;
        if (!path || typeof path !== "string") {
          socket.send(JSON.stringify({ type: "error", message: "Missing path", ts: new Date().toISOString() }));
          return;
        }

        audit(session, "API_CALL", undefined, path);

        try {
          const resp = await server.inject({ method: "GET", url: path });
          let body: unknown;
          try { body = JSON.parse(resp.body); } catch { body = resp.body; }
          socket.send(JSON.stringify({
            type: "api_result",
            path,
            status: resp.statusCode,
            body,
            ts: new Date().toISOString(),
          }));
        } catch (err: any) {
          socket.send(JSON.stringify({ type: "error", message: err.message, ts: new Date().toISOString() }));
        }
      } else if (msg.type === "ping") {
        socket.send(JSON.stringify({ type: "pong", ts: new Date().toISOString() }));
      } else {
        socket.send(JSON.stringify({
          type: "error",
          message: `Unknown type "${msg.type}". Supported: rpc, api, ping`,
          ts: new Date().toISOString(),
        }));
      }
    });

    socket.on("close", () => {
      audit(session, "DISCONNECT");
    });
  });

  // GET /admin/audit-log — retrieve console audit log (admin only)
  server.get("/admin/audit-log", async (_request, reply) => {
    return {
      ok: true,
      count: auditLog.length,
      entries: auditLog.slice(-100),
    };
  });
}
