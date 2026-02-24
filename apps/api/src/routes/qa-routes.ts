/**
 * QA/Audit OS Routes
 *
 * Phase 96B: QA/Audit OS v1.1
 *
 * Routes for:
 * - RPC trace inspection
 * - QA flow catalog browsing + execution
 * - QA flow results
 * - Dead-click report ingestion
 *
 * GUARD: Routes only available when:
 *   NODE_ENV === 'test' || QA_ROUTES_ENABLED === 'true'
 */

import { FastifyInstance } from "fastify";
import {
  getRecentTraces,
  getTracesByRpc,
  getTracesByRequestId,
  getFailedTraces,
  getRpcTraceStats,
  clearRpcTraceBuffer,
  isRpcTraceEnabled,
  loadFlowCatalog,
  getAllFlows,
  getFlowById,
  getFlowsByPriority,
  getFlowsByDomain,
  executeFlow,
  storeFlowResult,
  getRecentFlowResults,
  getFlowResultsByFlowId,
} from "../qa/index.js";
import type { DeadClickEntry } from "../qa/types.js";
import { safeErr } from '../lib/safe-error.js';

/* ── Guard ────────────────────────────────────────────────── */

function isQaEnabled(): boolean {
  return process.env.NODE_ENV === "test" || process.env.QA_ROUTES_ENABLED === "true";
}

/* ── Dead-click store (in-memory) ─────────────────────────── */

const MAX_DEAD_CLICKS = 500;
const deadClicks: DeadClickEntry[] = [];

/* ── Plugin ───────────────────────────────────────────────── */

export default async function qaRoutes(server: FastifyInstance) {
  // All routes under /qa/ prefix
  // Guard: return 403 if QA routes not enabled
  server.addHook("onRequest", async (request, reply) => {
    if (request.url.startsWith("/qa/") && !isQaEnabled()) {
      return reply.status(403).send({
        ok: false,
        error: "QA routes disabled. Set QA_ROUTES_ENABLED=true or NODE_ENV=test",
      });
    }
  });

  /* ═══ RPC TRACE ═══════════════════════════════════════════ */

  server.get("/qa/traces", async (request) => {
    const { limit, rpc, requestId } = request.query as any;
    if (requestId) {
      return { ok: true, traces: getTracesByRequestId(requestId) };
    }
    if (rpc) {
      return { ok: true, traces: getTracesByRpc(rpc, Number(limit) || 50) };
    }
    return { ok: true, traces: getRecentTraces(Number(limit) || 100) };
  });

  server.get("/qa/traces/failed", async (request) => {
    const { limit } = request.query as any;
    return { ok: true, traces: getFailedTraces(Number(limit) || 50) };
  });

  server.get("/qa/traces/stats", async () => {
    return { ok: true, stats: getRpcTraceStats(), enabled: isRpcTraceEnabled() };
  });

  server.delete("/qa/traces", async () => {
    clearRpcTraceBuffer();
    return { ok: true, message: "Trace buffer cleared" };
  });

  /* ═══ QA FLOWS ════════════════════════════════════════════ */

  server.post("/qa/flows/reload", async () => {
    const result = loadFlowCatalog();
    return { ok: true, ...result };
  });

  server.get("/qa/flows", async (request) => {
    const { priority, domain } = request.query as any;
    if (priority) return { ok: true, flows: getFlowsByPriority(priority) };
    if (domain) return { ok: true, flows: getFlowsByDomain(domain) };
    return { ok: true, flows: getAllFlows() };
  });

  server.get("/qa/flows/:flowId", async (request, reply) => {
    const { flowId } = request.params as any;
    const flow = getFlowById(flowId);
    if (!flow) return reply.status(404).send({ ok: false, error: "Flow not found" });
    return { ok: true, flow };
  });

  server.post("/qa/flows/:flowId/run", async (request, reply) => {
    const { flowId } = request.params as any;
    const body = (request.body as any) || {};
    const flow = getFlowById(flowId);
    if (!flow) return reply.status(404).send({ ok: false, error: "Flow not found" });

    const baseUrl = body.baseUrl || `http://127.0.0.1:${process.env.PORT || 3001}`;
    const variables = body.variables || {};
    const cookie = body.cookie;

    try {
      const result = await executeFlow(flow, baseUrl, variables, cookie);
      storeFlowResult(result);
      return { ok: true, result };
    } catch (err) {
      return reply.status(500).send({ ok: false, error: safeErr(err) });
    }
  });

  /* ═══ FLOW RESULTS ════════════════════════════════════════ */

  server.get("/qa/results", async (request) => {
    const { flowId, limit } = request.query as any;
    if (flowId) return { ok: true, results: getFlowResultsByFlowId(flowId) };
    return { ok: true, results: getRecentFlowResults(Number(limit) || 50) };
  });

  /* ═══ DEAD-CLICK REPORTS ══════════════════════════════════ */

  server.post("/qa/dead-clicks", async (request) => {
    const body = (request.body as any) || {};
    const entries: DeadClickEntry[] = Array.isArray(body.entries) ? body.entries : [];
    for (const entry of entries) {
      deadClicks.push({
        page: (entry.page || "unknown").slice(0, 500),
        selector: (entry.selector || "").slice(0, 500),
        text: (entry.text || "").slice(0, 100),
        elementType: (entry.elementType || "").slice(0, 100),
        hasOnClick: !!entry.hasOnClick,
        producedEffect: !!entry.producedEffect,
        visuallyDisabled: !!entry.visuallyDisabled,
        detectedAt: new Date().toISOString(),
      });
    }
    while (deadClicks.length > MAX_DEAD_CLICKS) deadClicks.shift();
    return { ok: true, stored: entries.length, total: deadClicks.length };
  });

  server.get("/qa/dead-clicks", async () => {
    return { ok: true, entries: deadClicks, total: deadClicks.length };
  });

  server.delete("/qa/dead-clicks", async () => {
    deadClicks.length = 0;
    return { ok: true, message: "Dead-click reports cleared" };
  });

  /* ═══ HEALTH ══════════════════════════════════════════════ */

  server.get("/qa/status", async () => {
    return {
      ok: true,
      qaEnabled: isQaEnabled(),
      traceEnabled: isRpcTraceEnabled(),
      traceStats: getRpcTraceStats(),
      flowCount: getAllFlows().length,
      resultCount: getRecentFlowResults(1).length > 0 ? "has_results" : "no_results",
      deadClickCount: deadClicks.length,
    };
  });

  /* ═══ __test__ ALIAS (Phase 96B spec requirement) ═════════ */
  /* Dev/test-only endpoint — mirrors /qa/traces for traceId lookup */

  server.get("/__test__/rpc-traces", async (request, reply) => {
    if (!isQaEnabled()) {
      return reply.status(403).send({ ok: false, error: "Test routes disabled" });
    }
    const { traceId, limit, rpc, requestId } = request.query as any;
    if (traceId) {
      const traces = getRecentTraces(5000).filter((t) => t.traceId === traceId);
      return { ok: true, traces };
    }
    if (requestId) return { ok: true, traces: getTracesByRequestId(requestId) };
    if (rpc) return { ok: true, traces: getTracesByRpc(rpc, Number(limit) || 50) };
    return { ok: true, traces: getRecentTraces(Number(limit) || 100) };
  });
}
