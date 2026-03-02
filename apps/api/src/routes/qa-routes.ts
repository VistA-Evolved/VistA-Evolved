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
  startTraceSession,
  recordTraceEntry,
  endTraceSession,
  getTraceSession,
  getActiveSessions,
  getCompletedSessions,
  saveAsGolden,
  listGoldenTraces,
  compareToGolden,
  WORKFLOW_TEMPLATES,
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

  /* ═══ CONTRACT TRACE SESSIONS (Phase 479) ═════════════════ */

  /** List workflow templates and active sessions */
  server.get("/qa/contract-traces", async () => {
    return {
      ok: true,
      workflows: WORKFLOW_TEMPLATES,
      activeSessions: getActiveSessions(),
      completedSessions: getCompletedSessions(10).map((s) => ({
        id: s.id,
        workflow: s.workflow,
        entryCount: s.entries.length,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
      })),
      goldenTraces: listGoldenTraces(),
    };
  });

  /** Start a new contract trace session */
  server.post("/qa/contract-traces/sessions", async (request) => {
    const body = (request.body as any) || {};
    const workflow = body.workflow || "unnamed";
    const description = body.description;
    const instanceId = body.instanceId || "unknown";
    const session = startTraceSession(workflow, description, instanceId);
    return { ok: true, session: { id: session.id, workflow: session.workflow } };
  });

  /** Record an entry into an active session */
  server.post("/qa/contract-traces/sessions/:id/entry", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    if (!body.rpcName) {
      return reply.status(400).send({ ok: false, error: "rpcName required" });
    }
    const entry = recordTraceEntry(id, {
      rpcName: body.rpcName,
      success: body.success !== false,
      error: body.error,
      responseLines: body.responseLines || 0,
      durationMs: body.durationMs || 0,
    });
    if (!entry) {
      return reply.status(404).send({ ok: false, error: "Session not found or already ended" });
    }
    return { ok: true, entry };
  });

  /** End a session (optionally write to disk and/or save as golden) */
  server.post("/qa/contract-traces/sessions/:id/end", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const session = endTraceSession(id, {
      writeToDisk: body.writeToDisk !== false,
    });
    if (!session) {
      return reply.status(404).send({ ok: false, error: "Session not found or already ended" });
    }
    // Optionally save as golden baseline
    let goldenPath: string | undefined;
    if (body.saveAsGolden) {
      goldenPath = saveAsGolden(session);
    }
    return {
      ok: true,
      session: {
        id: session.id,
        workflow: session.workflow,
        entryCount: session.entries.length,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
      },
      goldenPath,
    };
  });

  /** Get a specific session's details */
  server.get("/qa/contract-traces/sessions/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getTraceSession(id);
    if (!session) {
      return reply.status(404).send({ ok: false, error: "Session not found" });
    }
    return { ok: true, session };
  });

  /** Compare an active or completed session against golden */
  server.post("/qa/contract-traces/sessions/:id/compare", async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getTraceSession(id);
    const completed = getCompletedSessions(100).find((s) => s.id === id);
    const target = session || completed;
    if (!target) {
      return reply.status(404).send({ ok: false, error: "Session not found" });
    }
    const result = compareToGolden(target);
    if (!result) {
      return reply.status(404).send({ ok: false, error: "No golden baseline for workflow: " + target.workflow });
    }
    return { ok: true, ...result };
  });
}
