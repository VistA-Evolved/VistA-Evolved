/**
 * VistA Interop Telemetry routes — Phase 21.
 *
 * Real-time read-only HL7/HLO telemetry from VistA files via custom RPCs:
 *   - VE INTEROP HL7 LINKS  → HL7 logical links from file #870
 *   - VE INTEROP HL7 MSGS   → HL7 message stats from file #773/#772
 *   - VE INTEROP HLO STATUS → HLO app registry + system params
 *   - VE INTEROP QUEUE DEPTH → Queue depth indicators
 *
 * These RPCs read the ZVEMIOP M routine installed in the VistA sandbox.
 * All reads are strictly read-only — no clinical data is modified.
 *
 * Routes:
 *   GET /vista/interop/hl7-links     — logical link inventory
 *   GET /vista/interop/hl7-messages   — message activity summary
 *   GET /vista/interop/hlo-status     — HLO engine status
 *   GET /vista/interop/queue-depth    — queue depth indicators
 *   GET /vista/interop/summary        — combined dashboard summary
 */

import type { FastifyInstance } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { log } from "../lib/logger.js";
import {
  connect,
  callRpc,
  disconnect,
} from "../vista/rpcBrokerClient.js";

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
 * Call a VE INTEROP RPC and return the raw lines.
 * Handles connect/disconnect lifecycle.
 */
async function callInteropRpc(
  rpcName: string,
  params: string[] = []
): Promise<{ ok: boolean; lines: string[]; error?: string }> {
  try {
    await connect();
    const lines = await callRpc(rpcName, params);
    disconnect();
    return { ok: true, lines };
  } catch (err: any) {
    try { disconnect(); } catch { /* ignore */ }
    return { ok: false, lines: [], error: err.message };
  }
}

/* ------------------------------------------------------------------ */
/*  Route plugin                                                       */
/* ------------------------------------------------------------------ */

export default async function vistaInteropRoutes(server: FastifyInstance): Promise<void> {

  // ---- GET /vista/interop/hl7-links ----
  server.get("/vista/interop/hl7-links", async (request, reply) => {
    requireSession(request, reply);

    const maxN = (request.query as any)?.max || "100";
    const result = await callInteropRpc("VE INTEROP HL7 LINKS", [String(maxN)]);

    if (!result.ok) {
      return reply.status(502).send({
        ok: false,
        error: "VistA RPC failed",
        detail: result.error,
        rpc: "VE INTEROP HL7 LINKS",
      });
    }

    // Parse header: count^status^description
    const header = result.lines[0] || "";
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
    for (let i = 1; i < result.lines.length; i++) {
      const parts = result.lines[i].split("^");
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
  });

  // ---- GET /vista/interop/hl7-messages ----
  server.get("/vista/interop/hl7-messages", async (request, reply) => {
    requireSession(request, reply);

    const hours = (request.query as any)?.hours || "24";
    const result = await callInteropRpc("VE INTEROP HL7 MSGS", [String(hours)]);

    if (!result.ok) {
      return reply.status(502).send({
        ok: false,
        error: "VistA RPC failed",
        detail: result.error,
        rpc: "VE INTEROP HL7 MSGS",
      });
    }

    const header = result.lines[0] || "";
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

    for (let i = 1; i < result.lines.length; i++) {
      const parts = result.lines[i].split("^");
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
  });

  // ---- GET /vista/interop/hlo-status ----
  server.get("/vista/interop/hlo-status", async (request, reply) => {
    requireSession(request, reply);

    const result = await callInteropRpc("VE INTEROP HLO STATUS");

    if (!result.ok) {
      return reply.status(502).send({
        ok: false,
        error: "VistA RPC failed",
        detail: result.error,
        rpc: "VE INTEROP HLO STATUS",
      });
    }

    const header = result.lines[0] || "";
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

    for (let i = 1; i < result.lines.length; i++) {
      const line = result.lines[i];
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
  });

  // ---- GET /vista/interop/queue-depth ----
  server.get("/vista/interop/queue-depth", async (request, reply) => {
    requireSession(request, reply);

    const result = await callInteropRpc("VE INTEROP QUEUE DEPTH");

    if (!result.ok) {
      return reply.status(502).send({
        ok: false,
        error: "VistA RPC failed",
        detail: result.error,
        rpc: "VE INTEROP QUEUE DEPTH",
      });
    }

    const header = result.lines[0] || "";
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

    for (let i = 1; i < result.lines.length; i++) {
      const line = result.lines[i];
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
  });

  // ---- GET /vista/interop/summary ----
  // Combined dashboard endpoint — calls all 4 RPCs sequentially
  server.get("/vista/interop/summary", async (request, reply) => {
    requireSession(request, reply);

    const startTime = Date.now();

    // Call all 4 RPCs sequentially (shared TCP connection)
    const results: Record<string, { ok: boolean; lines: string[]; error?: string }> = {};

    try {
      await connect();

      for (const rpc of [
        "VE INTEROP HL7 LINKS",
        "VE INTEROP HL7 MSGS",
        "VE INTEROP HLO STATUS",
        "VE INTEROP QUEUE DEPTH",
      ]) {
        try {
          const lines = await callRpc(rpc, rpc.includes("LINKS") ? ["20"] : rpc.includes("MSGS") ? ["168"] : []);
          results[rpc] = { ok: true, lines };
        } catch (err: any) {
          results[rpc] = { ok: false, lines: [], error: err.message };
        }
      }

      disconnect();
    } catch (err: any) {
      try { disconnect(); } catch { /* ignore */ }
      return reply.status(502).send({
        ok: false,
        error: "VistA connection failed",
        detail: err.message,
      });
    }

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
  });

  log.info("VistA Interop Telemetry routes registered", {
    routes: [
      "GET /vista/interop/hl7-links",
      "GET /vista/interop/hl7-messages",
      "GET /vista/interop/hlo-status",
      "GET /vista/interop/queue-depth",
      "GET /vista/interop/summary",
    ],
  });
}
