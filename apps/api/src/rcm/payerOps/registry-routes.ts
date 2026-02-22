/**
 * Payer Registry + Capability Matrix Routes — Phase 88
 *
 * Endpoints:
 *   GET  /rcm/payerops/registry/health          — Registry subsystem health
 *   GET  /rcm/payerops/registry/sources          — List ingestion sources
 *   POST /rcm/payerops/registry/ingest           — Run full ingestion (admin-only)
 *   GET  /rcm/payerops/registry/snapshots        — List snapshots with diffs
 *
 *   GET  /rcm/payerops/payers                    — List registry payers (filterable)
 *   GET  /rcm/payerops/payers/:id                — Get payer detail
 *   PATCH /rcm/payerops/payers/:id               — Update payer (admin-only)
 *   POST /rcm/payerops/payers/merge              — Merge duplicate payers (admin-only)
 *
 *   GET  /rcm/payerops/capability-matrix         — Full capability matrix
 *   GET  /rcm/payerops/capability-matrix/:payerId — Payer capabilities
 *   PATCH /rcm/payerops/capability-matrix/:payerId — Update capability cell
 *   POST /rcm/payerops/capability-matrix/:payerId/evidence — Add evidence
 *   DELETE /rcm/payerops/capability-matrix/:payerId/evidence/:evidenceId — Remove evidence
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  listSources,
  listRegistryPayers,
  getRegistryPayer,
  patchRegistryPayer,
  mergeRegistryPayers,
  listSnapshots,
  listRelationships,
  getRegistryStats,
  type RegistryPayerType,
  type RegistryPayerStatus,
  type PriorityTier,
} from "./registry-store.js";
import {
  getFullMatrix,
  getPayerCapabilities,
  setCapability,
  addEvidence,
  removeEvidence,
  getMatrixStats,
  type CapabilityType,
  type CapabilityMode,
  type CapabilityMaturity,
  ALL_CAPABILITY_TYPES,
} from "./capability-matrix.js";
import { runFullIngest, ingestHMOList, ingestHMOBrokerList } from "./ingest.js";
import { requireRcmAdmin, requireRcmWrite, requirePermission } from "../../auth/rbac.js";
import type { SessionData } from "../../auth/session-store.js";

/* ── Helpers ─────────────────────────────────────────────────── */

function body(request: FastifyRequest): Record<string, any> {
  return (request.body as any) || {};
}

function query(request: FastifyRequest): Record<string, string> {
  return (request.query as any) || {};
}

function params(request: FastifyRequest): Record<string, string> {
  return (request.params as any) || {};
}

function sessionActor(request: FastifyRequest): string {
  const session = (request as any).session;
  return session?.duz ? `DUZ:${session.duz}` : "unknown";
}

/* ── Route Plugin ────────────────────────────────────────────── */

export default async function registryRoutes(server: FastifyInstance): Promise<void> {

  /* ── RBAC Guard (mirrors rcm-routes.ts pattern) ────────────── */
  server.addHook("onRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url.split("?")[0];
    if (!url.startsWith("/rcm/payerops/")) return;

    // Health is open to any authenticated user (session checked by security.ts)
    if (url === "/rcm/payerops/registry/health") return;

    const session = (request as any).session as SessionData | undefined;
    if (!session) return; // security.ts already rejected

    const method = request.method;

    // Admin-only: ingest, merge, payer patch
    const adminPosts = ["/rcm/payerops/registry/ingest", "/rcm/payerops/payers/merge"];
    if (method === "POST" && adminPosts.includes(url)) {
      requireRcmAdmin(session, reply, { requestId: (request as any).requestId, sourceIp: request.ip });
      return;
    }
    // PATCH on payers or capability-matrix: admin
    if (method === "PATCH") {
      requireRcmAdmin(session, reply, { requestId: (request as any).requestId, sourceIp: request.ip });
      return;
    }
    // Evidence add/remove: rcm:write (billing staff + admin)
    if (method === "POST" || method === "DELETE") {
      requireRcmWrite(session, reply, { requestId: (request as any).requestId, sourceIp: request.ip });
      return;
    }
    // Read routes — rcm:read
    requirePermission(session, "rcm:read", reply, { requestId: (request as any).requestId, sourceIp: request.ip });
  });

  /* ── Health ────────────────────────────────────────────────── */

  server.get("/rcm/payerops/registry/health", async (_request, reply) => {
    const registryStats = getRegistryStats();
    const matrixStats = getMatrixStats();
    return reply.send({
      ok: true,
      module: "payerops-registry",
      phase: 88,
      registry: registryStats,
      matrix: matrixStats,
      timestamp: new Date().toISOString(),
    });
  });

  /* ── Sources ───────────────────────────────────────────────── */

  server.get("/rcm/payerops/registry/sources", async (_request, reply) => {
    const srcs = listSources();
    return reply.send({ ok: true, count: srcs.length, sources: srcs });
  });

  /* ── Ingest (admin-only) ───────────────────────────────────── */

  server.post("/rcm/payerops/registry/ingest", async (request, reply) => {
    const b = body(request);
    const target = b.target || "all"; // "all" | "hmo" | "broker"

    let result;
    if (target === "hmo") {
      result = { ok: true, hmo: ingestHMOList(), broker: null };
    } else if (target === "broker") {
      result = { ok: true, hmo: null, broker: ingestHMOBrokerList() };
    } else {
      result = runFullIngest();
    }

    return reply.send(result);
  });

  /* ── Snapshots ─────────────────────────────────────────────── */

  server.get("/rcm/payerops/registry/snapshots", async (_request, reply) => {
    const snaps = listSnapshots();
    return reply.send({ ok: true, count: snaps.length, snapshots: snaps });
  });

  /* ── Payers: List ──────────────────────────────────────────── */

  server.get("/rcm/payerops/payers", async (request, reply) => {
    const q = query(request);
    const result = listRegistryPayers({
      type: q.type as RegistryPayerType | undefined,
      status: q.status as RegistryPayerStatus | undefined,
      country: q.country,
      tier: q.tier as PriorityTier | undefined,
      search: q.search,
    });
    return reply.send({ ok: true, count: result.length, payers: result });
  });

  /* ── Payers: Detail ────────────────────────────────────────── */

  server.get("/rcm/payerops/payers/:id", async (request, reply) => {
    const { id } = params(request);
    const payer = getRegistryPayer(id);
    if (!payer) return reply.code(404).send({ ok: false, error: "Payer not found" });

    const capabilities = getPayerCapabilities(payer.id);
    const rels = listRelationships({ payerId: payer.id })
      .concat(listRelationships({ brokerId: payer.id }));

    return reply.send({
      ok: true,
      payer,
      capabilities,
      relationships: rels,
    });
  });

  /* ── Payers: Patch (admin-only) ────────────────────────────── */

  server.patch("/rcm/payerops/payers/:id", async (request, reply) => {
    const { id } = params(request);
    const b = body(request);

    const updated = patchRegistryPayer(id, {
      canonicalName: b.canonicalName,
      aliases: b.aliases,
      priorityTier: b.priorityTier,
      portalUrl: b.portalUrl,
      portalInstructions: b.portalInstructions,
      status: b.status,
      type: b.type,
    });

    if (!updated) return reply.code(404).send({ ok: false, error: "Payer not found" });
    return reply.send({ ok: true, payer: updated });
  });

  /* ── Payers: Merge (admin-only) ────────────────────────────── */

  server.post("/rcm/payerops/payers/merge", async (request, reply) => {
    const b = body(request);
    if (!b.targetId || !b.sourceId) {
      return reply.code(400).send({ ok: false, error: "targetId and sourceId are required" });
    }
    const result = mergeRegistryPayers(b.targetId, b.sourceId);
    if (!result.ok) return reply.code(422).send(result);
    return reply.send(result);
  });

  /* ── Capability Matrix: Full Grid ──────────────────────────── */

  server.get("/rcm/payerops/capability-matrix", async (_request, reply) => {
    const matrix = getFullMatrix();
    const stats = getMatrixStats();
    return reply.send({
      ok: true,
      capabilityTypes: ALL_CAPABILITY_TYPES,
      count: matrix.length,
      matrix,
      stats,
    });
  });

  /* ── Capability Matrix: Per-Payer ──────────────────────────── */

  server.get("/rcm/payerops/capability-matrix/:payerId", async (request, reply) => {
    const { payerId } = params(request);
    const capabilities = getPayerCapabilities(payerId);
    return reply.send({ ok: true, payerId, capabilities });
  });

  /* ── Capability Matrix: Update Cell ────────────────────────── */

  server.patch("/rcm/payerops/capability-matrix/:payerId", async (request, reply) => {
    const { payerId } = params(request);
    const b = body(request);

    if (!b.capability || !b.mode || !b.maturity) {
      return reply.code(400).send({
        ok: false,
        error: "capability, mode, and maturity are required",
      });
    }

    if (!ALL_CAPABILITY_TYPES.includes(b.capability as CapabilityType)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid capability. Must be one of: ${ALL_CAPABILITY_TYPES.join(", ")}`,
      });
    }

    const payer = getRegistryPayer(payerId);
    const payerName = payer?.canonicalName ?? b.payerName ?? "Unknown";

    const result = setCapability({
      payerId,
      payerName,
      capability: b.capability as CapabilityType,
      mode: b.mode as CapabilityMode,
      maturity: b.maturity as CapabilityMaturity,
      operationalNotes: b.operationalNotes,
      actor: sessionActor(request),
    });

    if (!result.ok) return reply.code(422).send(result);
    return reply.send(result);
  });

  /* ── Capability Matrix: Add Evidence ───────────────────────── */

  server.post("/rcm/payerops/capability-matrix/:payerId/evidence", async (request, reply) => {
    const { payerId } = params(request);
    const b = body(request);

    if (!b.capability || !b.type || !b.value) {
      return reply.code(400).send({
        ok: false,
        error: "capability, type (url|internal_note|runbook_ref), and value are required",
      });
    }

    const result = addEvidence({
      payerId,
      capability: b.capability as CapabilityType,
      type: b.type,
      value: b.value,
      actor: sessionActor(request),
    });

    if (!result.ok) return reply.code(422).send(result);
    return reply.code(201).send(result);
  });

  /* ── Capability Matrix: Remove Evidence ────────────────────── */

  server.delete("/rcm/payerops/capability-matrix/:payerId/evidence/:evidenceId", async (request, reply) => {
    const { payerId, evidenceId } = params(request);
    const q = query(request);
    const b = body(request);

    // Accept capability from query string or body (DELETE body not always reliable)
    const capability = q.capability || b.capability;
    if (!capability) {
      return reply.code(400).send({
        ok: false,
        error: "capability is required (query param or request body)",
      });
    }

    const result = removeEvidence({
      payerId,
      capability: capability as CapabilityType,
      evidenceId,
    });

    if (!result.ok) return reply.code(422).send(result);
    return reply.send(result);
  });
}
