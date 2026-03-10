/**
 * Integration Evidence Routes -- Phase 112: Evidence Pipeline + No-Fake-Integrations Gate
 *
 * REST endpoints for managing per-payer integration evidence entries.
 * Every payer adapter claiming api/portal/fhir support must have backing evidence.
 */

import { FastifyPluginAsync } from "fastify";
import * as repo from "./evidence-registry-repo.js";
import { listPayers } from "../payer-registry/registry.js";
import { requireSession } from "../../auth/auth-routes.js";

/** Integration modes that REQUIRE evidence backing */
const EVIDENCE_REQUIRED_MODES = new Set([
  "direct_api",
  "fhir_payer",
  "government_portal",
  "clearinghouse_edi",
  "portal_batch",
]);

const evidenceRoutes: FastifyPluginAsync = async (server) => {
  /* -- LIST all evidence --------------------------- */
  server.get("/rcm/evidence", async (request, reply) => {
    const session = await requireSession(request, reply);
    const tenantId = session.tenantId;
    const q = request.query as { status?: string; method?: string };
    let rows: repo.IntegrationEvidenceRow[];

    if (q.status) {
      rows = await repo.listByStatus(tenantId, q.status);
    } else if (q.method) {
      rows = await repo.listByMethod(tenantId, q.method);
    } else {
      rows = await repo.listAll(tenantId);
    }

    return { ok: true, evidence: rows, total: rows.length };
  });

  /* -- GET evidence by payer (BEFORE :id to avoid param collision) -- */
  server.get("/rcm/evidence/by-payer/:payerId", async (request, reply) => {
    const session = await requireSession(request, reply);
    const { payerId } = request.params as { payerId: string };
    const rows = await repo.listByPayer(session.tenantId, payerId);
    return { ok: true, payerId, evidence: rows, total: rows.length };
  });

  /* -- COVERAGE: cross-ref payers vs evidence (BEFORE :id) -- */
  server.get("/rcm/evidence/coverage", async (request, reply) => {
    const session = await requireSession(request, reply);
    const { payers } = listPayers();
    const allEvidence = await repo.listAll(session.tenantId);

    // Group evidence by payerId
    const evidenceByPayer = new Map<string, repo.IntegrationEvidenceRow[]>();
    for (const ev of allEvidence) {
      const arr = evidenceByPayer.get(ev.payerId) ?? [];
      arr.push(ev);
      evidenceByPayer.set(ev.payerId, arr);
    }

    const coverage: repo.EvidenceCoverage[] = payers.map((p) => {
      const payerEvidence = evidenceByPayer.get(p.payerId) ?? [];
      return {
        payerId: p.payerId,
        payerName: p.name,
        integrationMode: p.integrationMode,
        evidenceCount: payerEvidence.length,
        hasVerified: payerEvidence.some((e) => e.status === "verified"),
        methods: [...new Set(payerEvidence.map((e) => e.method))],
      };
    });

    const total = coverage.length;
    const withEvidence = coverage.filter((c) => c.evidenceCount > 0).length;
    const withVerified = coverage.filter((c) => c.hasVerified).length;
    const requiresEvidence = coverage.filter((c) =>
      EVIDENCE_REQUIRED_MODES.has(c.integrationMode),
    ).length;
    const missingEvidence = coverage.filter(
      (c) => EVIDENCE_REQUIRED_MODES.has(c.integrationMode) && c.evidenceCount === 0,
    ).length;

    return {
      ok: true,
      summary: {
        totalPayers: total,
        withEvidence,
        withVerified,
        requiresEvidence,
        missingEvidence,
        coveragePercent:
          requiresEvidence > 0
            ? Math.round(((requiresEvidence - missingEvidence) / requiresEvidence) * 100)
            : 100,
      },
      coverage,
    };
  });

  /* -- GAPS: payers needing evidence but missing it (BEFORE :id) -- */
  server.get("/rcm/evidence/gaps", async (request, reply) => {
    const session = await requireSession(request, reply);
    const { payers } = listPayers();
    const allEvidence = await repo.listAll(session.tenantId);

    const evidenceByPayer = new Map<string, repo.IntegrationEvidenceRow[]>();
    for (const ev of allEvidence) {
      const arr = evidenceByPayer.get(ev.payerId) ?? [];
      arr.push(ev);
      evidenceByPayer.set(ev.payerId, arr);
    }

    const gaps = payers
      .filter((p) => EVIDENCE_REQUIRED_MODES.has(p.integrationMode))
      .filter((p) => {
        const ev = evidenceByPayer.get(p.payerId) ?? [];
        return ev.length === 0;
      })
      .map((p) => ({
        payerId: p.payerId,
        payerName: p.name,
        integrationMode: p.integrationMode,
        country: p.country,
        status: p.status,
      }));

    return { ok: true, gaps, totalGaps: gaps.length };
  });

  /* -- STATS (BEFORE :id) -------------------------- */
  server.get("/rcm/evidence/stats", async (request, reply) => {
    const session = await requireSession(request, reply);
    const stats = await repo.getEvidenceStats(session.tenantId);
    return { ok: true, ...stats };
  });

  /* -- GET single evidence entry ------------------- */
  server.get("/rcm/evidence/:id", async (request, reply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const row = await repo.findByIdForTenant(session.tenantId, id);
    if (!row) return reply.code(404).send({ ok: false, error: "Evidence entry not found" });
    return { ok: true, evidence: row };
  });

  /* -- CREATE evidence entry ----------------------- */
  server.post("/rcm/evidence", async (request, reply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { payerId, method, source } = body;

    if (!payerId || !method || !source) {
      return reply.code(400).send({
        ok: false,
        error: "Missing required fields: payerId, method, source",
      });
    }

    const validMethods = ["api", "portal", "manual", "edi", "fhir"];
    if (!validMethods.includes(method)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid method '${method}'. Must be one of: ${validMethods.join(", ")}`,
      });
    }

    const row = await repo.insertEvidence({
      tenantId: session.tenantId,
      payerId,
      method,
      channel: body.channel,
      source,
      sourceType: body.sourceType,
      contactInfo: body.contactInfo,
      submissionRequirements: body.submissionRequirements,
      supportedChannelsJson: body.supportedChannelsJson
        ? (typeof body.supportedChannelsJson === "string" ? body.supportedChannelsJson : JSON.stringify(body.supportedChannelsJson))
        : undefined,
      lastVerifiedAt: body.lastVerifiedAt,
      verifiedBy: body.verifiedBy,
      status: body.status,
      confidence: body.confidence,
      notes: body.notes,
    });

    return reply.code(201).send({ ok: true, evidence: row });
  });

  /* -- UPDATE evidence entry ----------------------- */
  server.put("/rcm/evidence/:id", async (request, reply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    const row = await repo.updateEvidence(session.tenantId, id, {
      method: body.method,
      channel: body.channel,
      source: body.source,
      sourceType: body.sourceType,
      contactInfo: body.contactInfo,
      submissionRequirements: body.submissionRequirements,
      supportedChannelsJson: body.supportedChannelsJson
        ? (typeof body.supportedChannelsJson === "string" ? body.supportedChannelsJson : JSON.stringify(body.supportedChannelsJson))
        : undefined,
      lastVerifiedAt: body.lastVerifiedAt,
      verifiedBy: body.verifiedBy,
      status: body.status,
      confidence: body.confidence,
      notes: body.notes,
    });

    if (!row) return reply.code(404).send({ ok: false, error: "Evidence entry not found" });
    return { ok: true, evidence: row };
  });

  /* -- DELETE (archive) evidence entry -------------- */
  server.delete("/rcm/evidence/:id", async (request, reply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const ok = await repo.archiveEvidence(session.tenantId, id);
    if (!ok) return reply.code(404).send({ ok: false, error: "Evidence entry not found" });
    return { ok: true, archived: true };
  });
};

export default evidenceRoutes;
