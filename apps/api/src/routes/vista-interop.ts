/**
 * VistA Interop Telemetry routes — Phase 21 + Phase 58 (v2).
 *
 * VistA-sourced read-only HL7/HLO telemetry from:
 *   - File #870  HL LOGICAL LINK         (via VE INTEROP HL7 LINKS)
 *   - File #773  HL7 MESSAGE ADMIN        (via VE INTEROP HL7 MSGS, VE INTEROP MSG LIST)
 *   - File #772  HL7 MESSAGE TEXT         (via VE INTEROP MSG DETAIL — segment summary only)
 *   - File #779.1/2/4/9 HLO registries   (via VE INTEROP HLO STATUS)
 *   - File #778  HLO MESSAGES             (count only)
 *   - File #776  HL7 MONITOR              (via VE INTEROP QUEUE DEPTH)
 *
 * These RPCs read the ZVEMIOP M routine (v1.1/Build 2) installed in the VistA sandbox.
 * All reads are strictly read-only — no clinical data is modified.
 *
 * Security:
 *   - All endpoints require authenticated session + admin/provider role
 *   - PHI masking ON by default for HL7 segment content (PID, NK1, GT1, IN1, IN2, ACC)
 *   - Unmasking requires admin role + reason text, logged to immutable audit
 *   - No HL7 message bodies returned from ZVEMIOP.m (segment type counts only)
 *
 * Resilience:
 *   - Circuit breaker (5 failures → open, 30s reset)
 *   - Timeout (15s per RPC_CONFIG)
 *   - Retry with exponential backoff (2 retries, reads are idempotent)
 *   - Response caching (configurable TTL, default 10s)
 *
 * Phase 21 Routes (legacy):
 *   GET /vista/interop/hl7-links     — logical link inventory
 *   GET /vista/interop/hl7-messages   — message activity summary
 *   GET /vista/interop/hlo-status     — HLO engine status
 *   GET /vista/interop/queue-depth    — queue depth indicators
 *   GET /vista/interop/summary        — combined dashboard summary
 *
 * Phase 58 Routes (v2):
 *   GET /vista/interop/v2/hl7/messages         — individual message list with filters
 *   GET /vista/interop/v2/hl7/messages/:id     — single message detail (masked by default)
 *   POST /vista/interop/v2/hl7/messages/:id/unmask — unmask (admin + reason, audited)
 *   GET /vista/interop/v2/hl7/summary          — HL7 dashboard summary (combined)
 *   GET /vista/interop/v2/hlo/summary          — HLO dashboard summary (combined)
 */

import type { FastifyInstance } from "fastify";
import { z } from "zod/v4";
import { requireSession, requireRole } from "../auth/auth-routes.js";
import { log } from "../lib/logger.js";
import { validate } from "../lib/validation.js";
import { audit } from "../lib/audit.js";
import { cachedRpc, CircuitOpenError, RpcTimeoutError } from "../lib/rpc-resilience.js";
import {
  connect,
  callRpc,
  disconnect,
} from "../vista/rpcBrokerClient.js";

/* ------------------------------------------------------------------ */
/*  Configuration                                                      */
/* ------------------------------------------------------------------ */

/** Cache TTL for interop telemetry responses (ms). Default 10s. */
const INTEROP_CACHE_TTL_MS = parseInt(
  process.env.INTEROP_CACHE_TTL_MS || "10000", 10,
);

/* ------------------------------------------------------------------ */
/*  Zod query schemas                                                  */
/* ------------------------------------------------------------------ */

const Hl7LinksQuerySchema = z.object({
  max: z.string().regex(/^\d+$/).optional(),
});

const Hl7MessagesQuerySchema = z.object({
  hours: z.string().regex(/^\d+$/).optional(),
});

/* Phase 58: v2 message list query schema */
const MsgListQuerySchema = z.object({
  direction: z.enum(["I", "O", "*"]).optional(),
  status: z.enum(["D", "E", "P", "*"]).optional(),
  limit: z.string().regex(/^\d+$/).optional(),
});

/* Phase 58: unmask request body schema */
const UnmaskBodySchema = z.object({
  reason: z.string().min(10, "Reason must be at least 10 characters"),
});

/* ------------------------------------------------------------------ */
/*  PHI Segment Masking (Phase 58)                                     */
/* ------------------------------------------------------------------ */

/** HL7 segment types that may contain PHI — masked by default. */
const PHI_SEGMENT_TYPES = new Set(["PID", "NK1", "GT1", "IN1", "IN2", "ACC"]);

/** Direction code to human-readable label */
const DIRECTION_LABELS: Record<string, string> = {
  I: "inbound",
  O: "outbound",
};

/** Status code to human-readable label */
const STATUS_LABELS: Record<string, string> = {
  D: "done",
  E: "error",
  P: "pending",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

interface HL7Link {
  ien: number;
  name: string;
  type: string;
  state: string;
  device: string;
  port: string;
}

interface HL7MessageStats {
  total: number;
  outbound: number;
  inbound: number;
  completed: number;
  errors: number;
  pending: number;
  lookbackHours: number;
}

interface HLOApp {
  ien: number;
  name: string;
  package: string;
  type: string;
}

interface HLOStatus {
  system: {
    domain: string;
    maxQueues: number;
    mode: string;
  };
  apps: HLOApp[];
  subscriptionCount: number;
  priorityQueueCount: number;
  hloMessageCount: number;
}

interface QueueDepth {
  hl7Messages: { total: number; pending: number; errors: number };
  hloMessages: { total: number };
  monitorJobs: { count: number };
}

/* Phase 58 interfaces */
interface HL7MessageRow {
  ien: number;
  direction: string;
  directionLabel: string;
  status: string;
  statusLabel: string;
  linkIen: number;
  date: string;
  textIen: number;
}

interface HL7MessageDetail {
  ien: number;
  direction: string;
  directionLabel: string;
  status: string;
  statusLabel: string;
  linkIen: number;
  date: string;
  textIen: number;
  segments: Array<{ type: string; count: number; masked: boolean }>;
  totalSegments: number;
}

/** Parse "key=value" pairs from a caret-delimited line */
function parseKV(segment: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const part of segment.split("^")) {
    const eq = part.indexOf("=");
    if (eq > 0) {
      result[part.substring(0, eq)] = part.substring(eq + 1);
    }
  }
  return result;
}

/**
 * Call a VE INTEROP RPC with full resilience:
 *   - TTL cache (configurable via INTEROP_CACHE_TTL_MS, default 10s)
 *   - Circuit breaker (5 failures → open, 30s reset via RPC_CONFIG)
 *   - Timeout (15s per RPC_CONFIG)
 *   - Retry with exponential backoff (2 retries — reads are idempotent)
 *   - Per-RPC metrics recording
 *
 * Manages connect/disconnect lifecycle per call.
 * Throws on failure (CircuitOpenError, RpcTimeoutError, or raw Error).
 */
async function callInteropRpcCached(
  rpcName: string,
  params: string[] = [],
  ttlMs: number = INTEROP_CACHE_TTL_MS,
): Promise<string[]> {
  return cachedRpc(
    async () => {
      await connect();
      try {
        const lines = await callRpc(rpcName, params);
        disconnect();
        return lines;
      } catch (err) {
        try { disconnect(); } catch { /* ignore */ }
        throw err;
      }
    },
    rpcName,
    params,
    ttlMs,
  );
}

/** Map CircuitOpenError / RpcTimeoutError to appropriate HTTP status. */
function handleRpcError(err: unknown, rpcName: string, reply: any): void {
  const message = err instanceof Error ? err.message : String(err);
  if (err instanceof CircuitOpenError) {
    reply.status(503).send({
      ok: false,
      error: "VistA temporarily unavailable",
      detail: "Circuit breaker open — too many recent failures",
      rpc: rpcName,
    });
  } else if (err instanceof RpcTimeoutError) {
    reply.status(504).send({
      ok: false,
      error: "VistA RPC timed out",
      detail: message,
      rpc: rpcName,
    });
  } else {
    reply.status(502).send({
      ok: false,
      error: "VistA RPC failed",
      detail: message,
      rpc: rpcName,
    });
  }
}

/* ------------------------------------------------------------------ */
/*  Route plugin                                                       */
/* ------------------------------------------------------------------ */

export default async function vistaInteropRoutes(server: FastifyInstance): Promise<void> {

  // ---- GET /vista/interop/hl7-links ----
  server.get("/vista/interop/hl7-links", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin", "provider"], reply);

    const parsed = validate(Hl7LinksQuerySchema, request.query);
    const maxN = parsed.ok ? (parsed.data.max || "100") : "100";

    try {
      const lines = await callInteropRpcCached("VE INTEROP HL7 LINKS", [maxN]);

      // Parse header: count^status^description
      const header = lines[0] || "";
      const headerParts = header.split("^");
      const count = parseInt(headerParts[0], 10) || 0;
      const status = headerParts[1] || "UNKNOWN";

      if (status === "NOT_AVAILABLE") {
        return {
          ok: true,
          source: "vista",
          available: false,
          message: headerParts[2] || "HL7 data unavailable",
          links: [],
          timestamp: new Date().toISOString(),
        };
      }

      // Parse link rows: IEN^NAME^TYPE^STATE^DEVICE^PORT
      const links: HL7Link[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split("^");
        if (parts.length < 2) continue;
        links.push({
          ien: parseInt(parts[0], 10) || 0,
          name: parts[1] || "",
          type: parts[2] || "unknown",
          state: parts[3] || "unknown",
          device: parts[4] || "",
          port: parts[5] || "",
        });
      }

      return {
        ok: true,
        source: "vista",
        available: true,
        count,
        links,
        rpc: "VE INTEROP HL7 LINKS",
        vistaFile: "#870 HL LOGICAL LINK",
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      handleRpcError(err, "VE INTEROP HL7 LINKS", reply);
    }
  });

  // ---- GET /vista/interop/hl7-messages ----
  server.get("/vista/interop/hl7-messages", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin", "provider"], reply);

    const parsed = validate(Hl7MessagesQuerySchema, request.query);
    const hours = parsed.ok ? (parsed.data.hours || "24") : "24";

    try {
      const lines = await callInteropRpcCached("VE INTEROP HL7 MSGS", [hours]);

      const header = lines[0] || "";
      const headerParts = header.split("^");
      const status = headerParts[1] || "UNKNOWN";

      if (status === "NOT_AVAILABLE") {
        return {
          ok: true,
          source: "vista",
          available: false,
          message: headerParts[2] || "HL7 message data unavailable",
          stats: null,
          timestamp: new Date().toISOString(),
        };
      }

      // Parse stat rows: label^value
      const stats: HL7MessageStats = {
        total: 0, outbound: 0, inbound: 0,
        completed: 0, errors: 0, pending: 0,
        lookbackHours: parseInt(hours, 10) || 24,
      };

      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split("^");
        const label = parts[0];
        const value = parseInt(parts[1], 10) || 0;
        switch (label) {
          case "total": stats.total = value; break;
          case "outbound": stats.outbound = value; break;
          case "inbound": stats.inbound = value; break;
          case "completed": stats.completed = value; break;
          case "errors": stats.errors = value; break;
          case "pending": stats.pending = value; break;
        }
      }

      return {
        ok: true,
        source: "vista",
        available: true,
        stats,
        rpc: "VE INTEROP HL7 MSGS",
        vistaFile: "#773 HL7 MESSAGE ADMIN",
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      handleRpcError(err, "VE INTEROP HL7 MSGS", reply);
    }
  });

  // ---- GET /vista/interop/hlo-status ----
  server.get("/vista/interop/hlo-status", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin", "provider"], reply);

    try {
      const lines = await callInteropRpcCached("VE INTEROP HLO STATUS");

      const header = lines[0] || "";
      const headerParts = header.split("^");
      const status = headerParts[1] || "UNKNOWN";

      if (status === "NOT_AVAILABLE") {
        return {
          ok: true,
          source: "vista",
          available: false,
          message: headerParts[2] || "HLO data unavailable",
          hloStatus: null,
          timestamp: new Date().toISOString(),
        };
      }

      // Parse rows
      const hloStatus: HLOStatus = {
        system: { domain: "", maxQueues: 0, mode: "" },
        apps: [],
        subscriptionCount: 0,
        priorityQueueCount: 0,
        hloMessageCount: 0,
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split("^");
        const rowType = parts[0];

        if (rowType === "system") {
          const kv = parseKV(line);
          hloStatus.system.domain = kv.domain || "";
          hloStatus.system.maxQueues = parseInt(kv.maxQueues, 10) || 0;
          hloStatus.system.mode = kv.mode || "";
        } else if (rowType === "app") {
          const kv = parseKV(line);
          hloStatus.apps.push({
            ien: parseInt(kv.ien, 10) || 0,
            name: kv.name || "",
            package: kv.package || "",
            type: kv.type || "",
          });
        } else if (rowType === "subscriptions") {
          const kv = parseKV(line);
          hloStatus.subscriptionCount = parseInt(kv.count, 10) || 0;
        } else if (rowType === "priorityQueues") {
          const kv = parseKV(line);
          hloStatus.priorityQueueCount = parseInt(kv.count, 10) || 0;
        } else if (rowType === "hloMessages") {
          const kv = parseKV(line);
          hloStatus.hloMessageCount = parseInt(kv.totalCount, 10) || 0;
        }
      }

      return {
        ok: true,
        source: "vista",
        available: true,
        hloStatus,
        rpc: "VE INTEROP HLO STATUS",
        vistaFiles: "#779.1, #779.2, #779.4, #779.9, #778",
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      handleRpcError(err, "VE INTEROP HLO STATUS", reply);
    }
  });

  // ---- GET /vista/interop/queue-depth ----
  server.get("/vista/interop/queue-depth", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin", "provider"], reply);

    try {
      const lines = await callInteropRpcCached("VE INTEROP QUEUE DEPTH");

      const header = lines[0] || "";
      const headerParts = header.split("^");
      const status = headerParts[1] || "UNKNOWN";

      if (status === "NOT_AVAILABLE") {
        return {
          ok: true,
          source: "vista",
          available: false,
          message: "Queue data unavailable",
          queues: null,
          timestamp: new Date().toISOString(),
        };
      }

      const queues: QueueDepth = {
        hl7Messages: { total: 0, pending: 0, errors: 0 },
        hloMessages: { total: 0 },
        monitorJobs: { count: 0 },
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split("^");
        const rowType = parts[0];
        const kv = parseKV(line);

        if (rowType === "hl7Messages") {
          queues.hl7Messages.total = parseInt(kv.total, 10) || 0;
          queues.hl7Messages.pending = parseInt(kv.pending, 10) || 0;
          queues.hl7Messages.errors = parseInt(kv.errors, 10) || 0;
        } else if (rowType === "hloMessages") {
          queues.hloMessages.total = parseInt(kv.total, 10) || 0;
        } else if (rowType === "monitorJobs") {
          queues.monitorJobs.count = parseInt(kv.count, 10) || 0;
        }
      }

      return {
        ok: true,
        source: "vista",
        available: true,
        queues,
        rpc: "VE INTEROP QUEUE DEPTH",
        vistaFiles: "#773, #778, #776",
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      handleRpcError(err, "VE INTEROP QUEUE DEPTH", reply);
    }
  });

  // ---- GET /vista/interop/summary ----
  // Combined dashboard endpoint — calls all 4 RPCs, cached as aggregate
  server.get("/vista/interop/summary", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin", "provider"], reply);

    const startTime = Date.now();

    try {
      // Cache the entire 4-RPC batch as one aggregate result.
      // resilientRpc (inside cachedRpc) provides circuit breaker + timeout + retry.
      // Individual RPC failures are captured gracefully — partial data is returned.
      const results = await cachedRpc(
        async () => {
          const batch: Record<string, { ok: boolean; lines: string[]; error?: string }> = {};
          await connect();

          for (const rpc of [
            "VE INTEROP HL7 LINKS",
            "VE INTEROP HL7 MSGS",
            "VE INTEROP HLO STATUS",
            "VE INTEROP QUEUE DEPTH",
          ]) {
            try {
              const lines = await callRpc(rpc, rpc.includes("LINKS") ? ["20"] : rpc.includes("MSGS") ? ["168"] : []);
              batch[rpc] = { ok: true, lines };
            } catch (err: any) {
              batch[rpc] = { ok: false, lines: [], error: err.message };
            }
          }

          disconnect();
          return batch;
        },
        "VE INTEROP SUMMARY",
        [],
        INTEROP_CACHE_TTL_MS,
      );

      // Parse LINKS result
      const linksRaw = results["VE INTEROP HL7 LINKS"];
      let linkCount = 0;
      const linkSample: HL7Link[] = [];
      if (linksRaw?.ok && linksRaw.lines.length > 0) {
        const hdr = linksRaw.lines[0].split("^");
        linkCount = parseInt(hdr[0], 10) || 0;
        for (let i = 1; i < linksRaw.lines.length; i++) {
          const p = linksRaw.lines[i].split("^");
          linkSample.push({
            ien: parseInt(p[0], 10) || 0,
            name: p[1] || "",
            type: p[2] || "",
            state: p[3] || "",
            device: p[4] || "",
            port: p[5] || "",
          });
        }
      }

      // Parse MSGS result
      const msgsRaw = results["VE INTEROP HL7 MSGS"];
      const msgStats: HL7MessageStats = {
        total: 0, outbound: 0, inbound: 0,
        completed: 0, errors: 0, pending: 0,
        lookbackHours: 168,
      };
      if (msgsRaw?.ok) {
        for (let i = 1; i < msgsRaw.lines.length; i++) {
          const p = msgsRaw.lines[i].split("^");
          const v = parseInt(p[1], 10) || 0;
          switch (p[0]) {
            case "total": msgStats.total = v; break;
            case "outbound": msgStats.outbound = v; break;
            case "inbound": msgStats.inbound = v; break;
            case "completed": msgStats.completed = v; break;
            case "errors": msgStats.errors = v; break;
            case "pending": msgStats.pending = v; break;
          }
        }
      }

      // Parse HLO result
      const hloRaw = results["VE INTEROP HLO STATUS"];
      let hloDomain = "";
      let hloMode = "";
      let hloAppCount = 0;
      if (hloRaw?.ok) {
        for (const line of hloRaw.lines) {
          const parts = line.split("^");
          if (parts[0] === "system") {
            const kv = parseKV(line);
            hloDomain = kv.domain || "";
            hloMode = kv.mode || "";
          }
          if (parts[0] === "app") hloAppCount++;
        }
      }

      // Parse QUEUE result
      const qRaw = results["VE INTEROP QUEUE DEPTH"];
      const queues: QueueDepth = {
        hl7Messages: { total: 0, pending: 0, errors: 0 },
        hloMessages: { total: 0 },
        monitorJobs: { count: 0 },
      };
      if (qRaw?.ok) {
        for (const line of qRaw.lines) {
          const parts = line.split("^");
          const kv = parseKV(line);
          if (parts[0] === "hl7Messages") {
            queues.hl7Messages.total = parseInt(kv.total, 10) || 0;
            queues.hl7Messages.pending = parseInt(kv.pending, 10) || 0;
            queues.hl7Messages.errors = parseInt(kv.errors, 10) || 0;
          }
          if (parts[0] === "hloMessages") queues.hloMessages.total = parseInt(kv.total, 10) || 0;
          if (parts[0] === "monitorJobs") queues.monitorJobs.count = parseInt(kv.count, 10) || 0;
        }
      }

      const elapsed = Date.now() - startTime;

      return {
        ok: true,
        source: "vista",
        elapsedMs: elapsed,
        hl7: {
          linkCount,
          linkSample,
          messageStats: msgStats,
        },
        hlo: {
          domain: hloDomain,
          mode: hloMode,
          appCount: hloAppCount,
        },
        queues,
        rpcsUsed: [
          "VE INTEROP HL7 LINKS",
          "VE INTEROP HL7 MSGS",
          "VE INTEROP HLO STATUS",
          "VE INTEROP QUEUE DEPTH",
        ],
        vistaFiles: ["#870", "#773", "#772", "#779.1", "#779.2", "#779.4", "#779.9", "#778", "#776"],
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      handleRpcError(err, "VE INTEROP SUMMARY", reply);
    }
  });

  /* ================================================================== */
  /*  Phase 58: v2 endpoints — real VistA HL7/HLO data with masking     */
  /* ================================================================== */

  // ---- GET /vista/interop/v2/hl7/messages ----
  // List individual HL7 messages from VistA file #773 with direction/status filters.
  // Uses VE INTEROP MSG LIST (MSGLIST^ZVEMIOP).
  // Returns metadata only — NO message bodies.
  server.get("/vista/interop/v2/hl7/messages", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin", "provider"], reply);

    const parsed = validate(MsgListQuerySchema, request.query);
    const direction = parsed.ok ? (parsed.data.direction || "*") : "*";
    const status = parsed.ok ? (parsed.data.status || "*") : "*";
    const limit = parsed.ok ? (parsed.data.limit || "50") : "50";

    try {
      const lines = await callInteropRpcCached(
        "VE INTEROP MSG LIST",
        [direction, status, limit],
        INTEROP_CACHE_TTL_MS,
      );

      const header = (lines[0] || "").split("^");
      const count = parseInt(header[0], 10) || 0;
      const rpcStatus = header[1] || "UNKNOWN";

      if (rpcStatus === "NOT_AVAILABLE") {
        return {
          ok: true,
          source: "vista",
          available: false,
          message: header[2] || "HL7 MESSAGE ADMIN (#773) not available",
          messages: [],
          timestamp: new Date().toISOString(),
        };
      }

      // Parse message rows: IEN^DIR^STATUS^LINK_IEN^DATE^MSG_IEN_772
      const messages: HL7MessageRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const parts = lines[i].split("^");
        if (parts.length < 2) continue;
        const dir = parts[1] || "";
        const st = parts[2] || "";
        messages.push({
          ien: parseInt(parts[0], 10) || 0,
          direction: dir,
          directionLabel: DIRECTION_LABELS[dir] || dir,
          status: st,
          statusLabel: STATUS_LABELS[st] || st,
          linkIen: parseInt(parts[3], 10) || 0,
          date: parts[4] || "",
          textIen: parseInt(parts[5], 10) || 0,
        });
      }

      audit("interop.message-list", "success", {
        duz: session.duz,
        name: session.displayName,
        role: session.role,
      }, {
        detail: { direction, status, limit, count },
      });

      return {
        ok: true,
        source: "vista",
        available: true,
        count,
        filters: { direction, status, limit: parseInt(limit, 10) },
        messages,
        rpc: "VE INTEROP MSG LIST",
        vistaFile: "#773 HL7 MESSAGE ADMIN",
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      handleRpcError(err, "VE INTEROP MSG LIST", reply);
    }
  });

  // ---- GET /vista/interop/v2/hl7/messages/:id ----
  // Single HL7 message detail with segment type summary (masked by default).
  // Uses VE INTEROP MSG DETAIL (MSGDETL^ZVEMIOP).
  // Returns segment TYPE COUNTS only — no raw segment content.
  // PHI segment types (PID, NK1, GT1, IN1, IN2, ACC) are flagged as masked.
  server.get("/vista/interop/v2/hl7/messages/:id", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin", "provider"], reply);

    const { id } = request.params as { id: string };
    const msgIen = parseInt(id, 10);
    if (!msgIen || msgIen < 1) {
      return reply.status(400).send({ ok: false, error: "Invalid message IEN" });
    }

    try {
      const lines = await callInteropRpcCached(
        "VE INTEROP MSG DETAIL",
        [String(msgIen)],
        5000, // shorter TTL for detail — 5s
      );

      const header = (lines[0] || "").split("^");
      const rpcStatus = header[1] || "UNKNOWN";

      if (rpcStatus === "NOT_FOUND" || rpcStatus === "ERROR") {
        return reply.status(404).send({
          ok: false,
          error: header[2] || "Message not found",
        });
      }

      // Parse metadata row: meta^ien=N^dir=X^status=X^link=N^date=D^textIen=N
      let detail: HL7MessageDetail = {
        ien: msgIen,
        direction: "",
        directionLabel: "",
        status: "",
        statusLabel: "",
        linkIen: 0,
        date: "",
        textIen: 0,
        segments: [],
        totalSegments: 0,
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split("^");
        const rowType = parts[0];

        if (rowType === "meta") {
          const kv = parseKV(line);
          detail.ien = parseInt(kv.ien, 10) || msgIen;
          detail.direction = kv.dir || "";
          detail.directionLabel = DIRECTION_LABELS[kv.dir] || kv.dir || "";
          detail.status = kv.status || "";
          detail.statusLabel = STATUS_LABELS[kv.status] || kv.status || "";
          detail.linkIen = parseInt(kv.link, 10) || 0;
          detail.date = kv.date || "";
          detail.textIen = parseInt(kv.textIen, 10) || 0;
        } else if (rowType === "seg") {
          const kv = parseKV(line);
          const segType = kv.type || "UNK";
          const segCount = parseInt(kv.count, 10) || 0;
          detail.segments.push({
            type: segType,
            count: segCount,
            masked: PHI_SEGMENT_TYPES.has(segType),
          });
        } else if (rowType === "segTotal") {
          const kv = parseKV(line);
          detail.totalSegments = parseInt(kv.count, 10) || 0;
        }
      }

      audit("interop.message-detail", "success", {
        duz: session.duz,
        name: session.displayName,
        role: session.role,
      }, {
        detail: { msgIen, segmentCount: detail.totalSegments },
      });

      return {
        ok: true,
        source: "vista",
        available: true,
        masked: true,
        maskNote: "PHI segment types (PID, NK1, GT1, IN1, IN2, ACC) are flagged. " +
          "No raw segment content is returned — only type counts.",
        detail,
        rpc: "VE INTEROP MSG DETAIL",
        vistaFiles: "#773 HL7 MESSAGE ADMIN, #772 HL7 MESSAGE TEXT",
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      handleRpcError(err, "VE INTEROP MSG DETAIL", reply);
    }
  });

  // ---- POST /vista/interop/v2/hl7/messages/:id/unmask ----
  // Unmask PHI flag for a message detail view.
  // Requires admin role + reason text. Logged to immutable audit trail.
  // NOTE: ZVEMIOP.m does NOT return raw content, so "unmasking" here
  // means returning the detail with masked=false flags on PHI segments.
  // If future M routines return actual segment content, this endpoint
  // would gate access to that content.
  server.post("/vista/interop/v2/hl7/messages/:id/unmask", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const { id } = request.params as { id: string };
    const msgIen = parseInt(id, 10);
    if (!msgIen || msgIen < 1) {
      return reply.status(400).send({ ok: false, error: "Invalid message IEN" });
    }

    const body = (request.body as any) || {};
    const bodyParsed = validate(UnmaskBodySchema, body);
    if (!bodyParsed.ok) {
      return reply.status(400).send({
        ok: false,
        error: "Reason is required (minimum 10 characters)",
        validation: bodyParsed.error,
      });
    }

    const reason = bodyParsed.data.reason;

    // Audit the unmask action BEFORE returning data
    audit("interop.message-unmask", "success", {
      duz: session.duz,
      name: session.displayName,
      role: session.role,
    }, {
      detail: {
        msgIen,
        reason,
        warning: "PHI unmask granted for HL7 message detail",
      },
    });

    log.info("Interop message unmask granted", {
      duz: session.duz,
      msgIen,
      reason: reason.substring(0, 100),
    });

    try {
      const lines = await callInteropRpcCached(
        "VE INTEROP MSG DETAIL",
        [String(msgIen)],
        0, // no cache for unmask — always fresh
      );

      const header = (lines[0] || "").split("^");
      const rpcStatus = header[1] || "UNKNOWN";

      if (rpcStatus === "NOT_FOUND" || rpcStatus === "ERROR") {
        return reply.status(404).send({
          ok: false,
          error: header[2] || "Message not found",
        });
      }

      // Parse same as detail but with masked=false
      let detail: HL7MessageDetail = {
        ien: msgIen,
        direction: "",
        directionLabel: "",
        status: "",
        statusLabel: "",
        linkIen: 0,
        date: "",
        textIen: 0,
        segments: [],
        totalSegments: 0,
      };

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        const parts = line.split("^");
        const rowType = parts[0];

        if (rowType === "meta") {
          const kv = parseKV(line);
          detail.ien = parseInt(kv.ien, 10) || msgIen;
          detail.direction = kv.dir || "";
          detail.directionLabel = DIRECTION_LABELS[kv.dir] || kv.dir || "";
          detail.status = kv.status || "";
          detail.statusLabel = STATUS_LABELS[kv.status] || kv.status || "";
          detail.linkIen = parseInt(kv.link, 10) || 0;
          detail.date = kv.date || "";
          detail.textIen = parseInt(kv.textIen, 10) || 0;
        } else if (rowType === "seg") {
          const kv = parseKV(line);
          const segType = kv.type || "UNK";
          const segCount = parseInt(kv.count, 10) || 0;
          detail.segments.push({
            type: segType,
            count: segCount,
            masked: false, // ALL segments unmasked after admin approval
          });
        } else if (rowType === "segTotal") {
          const kv = parseKV(line);
          detail.totalSegments = parseInt(kv.count, 10) || 0;
        }
      }

      return {
        ok: true,
        source: "vista",
        available: true,
        masked: false,
        unmaskedBy: session.displayName,
        unmaskedAt: new Date().toISOString(),
        reason,
        detail,
        rpc: "VE INTEROP MSG DETAIL",
        vistaFiles: "#773 HL7 MESSAGE ADMIN, #772 HL7 MESSAGE TEXT",
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      handleRpcError(err, "VE INTEROP MSG DETAIL", reply);
    }
  });

  // ---- GET /vista/interop/v2/hl7/summary ----
  // Enhanced HL7 dashboard summary combining links + messages + queue depth.
  // Uses 3 existing RPCs in parallel (through the summary batch approach).
  server.get("/vista/interop/v2/hl7/summary", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin", "provider"], reply);

    const startTime = Date.now();

    try {
      const batch = await cachedRpc(
        async () => {
          const result: Record<string, { ok: boolean; lines: string[]; error?: string }> = {};
          await connect();
          for (const rpc of [
            "VE INTEROP HL7 LINKS",
            "VE INTEROP HL7 MSGS",
            "VE INTEROP QUEUE DEPTH",
          ]) {
            try {
              const lines = await callRpc(
                rpc,
                rpc.includes("LINKS") ? ["20"] : rpc.includes("MSGS") ? ["168"] : [],
              );
              result[rpc] = { ok: true, lines };
            } catch (err: any) {
              result[rpc] = { ok: false, lines: [], error: err.message };
            }
          }
          disconnect();
          return result;
        },
        "VE INTEROP V2 HL7 SUMMARY",
        [],
        INTEROP_CACHE_TTL_MS,
      );

      // Parse LINKS
      const linksRaw = batch["VE INTEROP HL7 LINKS"];
      let linkCount = 0;
      const activeLinkNames: string[] = [];
      if (linksRaw?.ok && linksRaw.lines.length > 0) {
        const hdr = linksRaw.lines[0].split("^");
        linkCount = parseInt(hdr[0], 10) || 0;
        for (let i = 1; i < linksRaw.lines.length; i++) {
          const p = linksRaw.lines[i].split("^");
          if (p[3] === "ACTIVE" || p[3] === "active") {
            activeLinkNames.push(p[1] || "");
          }
        }
      }

      // Parse MSGS
      const msgsRaw = batch["VE INTEROP HL7 MSGS"];
      const msgStats: HL7MessageStats = {
        total: 0, outbound: 0, inbound: 0,
        completed: 0, errors: 0, pending: 0,
        lookbackHours: 168,
      };
      if (msgsRaw?.ok) {
        for (let i = 1; i < msgsRaw.lines.length; i++) {
          const p = msgsRaw.lines[i].split("^");
          const v = parseInt(p[1], 10) || 0;
          switch (p[0]) {
            case "total": msgStats.total = v; break;
            case "outbound": msgStats.outbound = v; break;
            case "inbound": msgStats.inbound = v; break;
            case "completed": msgStats.completed = v; break;
            case "errors": msgStats.errors = v; break;
            case "pending": msgStats.pending = v; break;
          }
        }
      }

      // Parse QUEUE
      const qRaw = batch["VE INTEROP QUEUE DEPTH"];
      const queues: QueueDepth = {
        hl7Messages: { total: 0, pending: 0, errors: 0 },
        hloMessages: { total: 0 },
        monitorJobs: { count: 0 },
      };
      if (qRaw?.ok) {
        for (const line of qRaw.lines) {
          const parts = line.split("^");
          const kv = parseKV(line);
          if (parts[0] === "hl7Messages") {
            queues.hl7Messages.total = parseInt(kv.total, 10) || 0;
            queues.hl7Messages.pending = parseInt(kv.pending, 10) || 0;
            queues.hl7Messages.errors = parseInt(kv.errors, 10) || 0;
          }
          if (parts[0] === "hloMessages") queues.hloMessages.total = parseInt(kv.total, 10) || 0;
          if (parts[0] === "monitorJobs") queues.monitorJobs.count = parseInt(kv.count, 10) || 0;
        }
      }

      return {
        ok: true,
        source: "vista",
        version: 2,
        elapsedMs: Date.now() - startTime,
        hl7: {
          linkCount,
          activeLinkNames,
          messageStats: msgStats,
          queues: queues.hl7Messages,
        },
        rpcsUsed: ["VE INTEROP HL7 LINKS", "VE INTEROP HL7 MSGS", "VE INTEROP QUEUE DEPTH"],
        vistaFiles: ["#870", "#773", "#776"],
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      handleRpcError(err, "VE INTEROP V2 HL7 SUMMARY", reply);
    }
  });

  // ---- GET /vista/interop/v2/hlo/summary ----
  // Enhanced HLO dashboard summary combining HLO status + queue depth.
  server.get("/vista/interop/v2/hlo/summary", async (request, reply) => {
    const session = requireSession(request, reply);
    requireRole(session, ["admin", "provider"], reply);

    const startTime = Date.now();

    try {
      const batch = await cachedRpc(
        async () => {
          const result: Record<string, { ok: boolean; lines: string[]; error?: string }> = {};
          await connect();
          for (const rpc of ["VE INTEROP HLO STATUS", "VE INTEROP QUEUE DEPTH"]) {
            try {
              const lines = await callRpc(rpc, []);
              result[rpc] = { ok: true, lines };
            } catch (err: any) {
              result[rpc] = { ok: false, lines: [], error: err.message };
            }
          }
          disconnect();
          return result;
        },
        "VE INTEROP V2 HLO SUMMARY",
        [],
        INTEROP_CACHE_TTL_MS,
      );

      // Parse HLO STATUS
      const hloRaw = batch["VE INTEROP HLO STATUS"];
      const hloStatus: HLOStatus = {
        system: { domain: "", maxQueues: 0, mode: "" },
        apps: [],
        subscriptionCount: 0,
        priorityQueueCount: 0,
        hloMessageCount: 0,
      };
      if (hloRaw?.ok) {
        for (const line of hloRaw.lines) {
          const parts = line.split("^");
          const kv = parseKV(line);
          if (parts[0] === "system") {
            hloStatus.system.domain = kv.domain || "";
            hloStatus.system.maxQueues = parseInt(kv.maxQueues, 10) || 0;
            hloStatus.system.mode = kv.mode || "";
          } else if (parts[0] === "app") {
            hloStatus.apps.push({
              ien: parseInt(kv.ien, 10) || 0,
              name: kv.name || "",
              package: kv.package || "",
              type: kv.type || "",
            });
          } else if (parts[0] === "subscriptions") {
            hloStatus.subscriptionCount = parseInt(kv.count, 10) || 0;
          } else if (parts[0] === "priorityQueues") {
            hloStatus.priorityQueueCount = parseInt(kv.count, 10) || 0;
          } else if (parts[0] === "hloMessages") {
            hloStatus.hloMessageCount = parseInt(kv.totalCount, 10) || 0;
          }
        }
      }

      // Parse queue depth for HLO portion
      const qRaw = batch["VE INTEROP QUEUE DEPTH"];
      let hloQueueTotal = 0;
      if (qRaw?.ok) {
        for (const line of qRaw.lines) {
          const parts = line.split("^");
          if (parts[0] === "hloMessages") {
            const kv = parseKV(line);
            hloQueueTotal = parseInt(kv.total, 10) || 0;
          }
        }
      }

      return {
        ok: true,
        source: "vista",
        version: 2,
        elapsedMs: Date.now() - startTime,
        hlo: {
          system: hloStatus.system,
          appCount: hloStatus.apps.length,
          apps: hloStatus.apps,
          subscriptions: hloStatus.subscriptionCount,
          priorityQueues: hloStatus.priorityQueueCount,
          messageCount: hloStatus.hloMessageCount,
          queueTotal: hloQueueTotal,
        },
        rpcsUsed: ["VE INTEROP HLO STATUS", "VE INTEROP QUEUE DEPTH"],
        vistaFiles: ["#779.1", "#779.2", "#779.4", "#779.9", "#778"],
        timestamp: new Date().toISOString(),
      };
    } catch (err: unknown) {
      handleRpcError(err, "VE INTEROP V2 HLO SUMMARY", reply);
    }
  });

  log.info("VistA Interop Telemetry routes registered", {
    routes: [
      "GET /vista/interop/hl7-links",
      "GET /vista/interop/hl7-messages",
      "GET /vista/interop/hlo-status",
      "GET /vista/interop/queue-depth",
      "GET /vista/interop/summary",
      "GET /vista/interop/v2/hl7/messages",
      "GET /vista/interop/v2/hl7/messages/:id",
      "POST /vista/interop/v2/hl7/messages/:id/unmask",
      "GET /vista/interop/v2/hl7/summary",
      "GET /vista/interop/v2/hlo/summary",
    ],
  });
}
