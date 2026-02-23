/**
 * Payer Admin Routes — Phase 95: Payer Registry Persistence + Audit
 *
 * Admin endpoints for the persistent payer registry:
 *   GET  /admin/payers             — list all payers (filterable, paginated)
 *   GET  /admin/payers/stats       — registry stats + evidence scores
 *   GET  /admin/payers/:id         — single payer detail
 *   POST /admin/payers/import      — import from snapshot JSON
 *   PATCH /admin/payers/:id/capabilities — update capabilities
 *   PATCH /admin/payers/:id/tasks  — update contracting tasks
 *   PATCH /admin/payers/:id/status — update payer status
 *   POST /admin/payers/:id/evidence — add evidence item
 *   GET  /admin/payers/:id/audit   — payer audit trail
 *   GET  /admin/payers/:id/evidence/validate — evidence validation
 *   GET  /admin/payers/audit/verify — verify audit chain integrity
 *   POST /admin/payers/:id/tenant-override — set tenant override
 *   GET  /admin/payers/:id/tenant-override — get tenant override
 *
 * Auth: session-level (matched by /admin/ catch-all in AUTH_RULES).
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import {
  initPayerPersistence,
  importFromSnapshot,
  getPayer,
  listPayers,
  updatePayerCapabilities,
  updatePayerTasks,
  updatePayerStatus,
  addPayerEvidence,
  getPayerRegistryStats,
  getTenantOverride,
  setTenantOverride,
  listTenantOverrides,
  resolvePayerForTenant,
  type PersistedPayer,
  type TenantPayerOverride,
} from "./payer-persistence.js";
import {
  appendPayerAudit,
  getPayerAuditTrail,
  getAllPayerAudit,
  verifyPayerAuditChain,
  getPayerAuditStats,
} from "./payer-audit.js";
import {
  validatePayerEvidence,
  hashEvidenceList,
  computeRegistryEvidenceScore,
} from "./evidence-manager.js";
import type { HmoCapabilities, HmoEvidence, HmoStatus } from "./ph-hmo-registry.js";

let persistenceReady = false;

const payerAdminRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  /* ── Init on first request ──────────────────────────────── */
  function ensurePersistence(): void {
    if (!persistenceReady) {
      const result = initPayerPersistence();
      persistenceReady = true;
      if (!result.ok) {
        server.log.warn(`Payer persistence init failed: ${result.error}`);
      }
    }
  }

  /* ── GET /admin/payers — list all payers ────────────────── */
  server.get("/admin/payers", async (request, reply) => {
    ensurePersistence();
    const query = request.query as {
      status?: string;
      integrationMode?: string;
      search?: string;
      limit?: string;
      offset?: string;
      tenantId?: string;
    };

    const { payers, total } = listPayers({
      status: query.status as any,
      integrationMode: query.integrationMode as any,
      search: query.search,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });

    // If tenantId provided, resolve with tenant overrides
    let resolved: PersistedPayer[] = payers;
    if (query.tenantId) {
      resolved = payers.map(p => {
        const r = resolvePayerForTenant(query.tenantId!, p.payerId);
        return r ?? p;
      });
    }

    return reply.send({
      ok: true,
      count: resolved.length,
      total,
      payers: resolved,
    });
  });

  /* ── GET /admin/payers/stats — registry stats ──────────── */
  server.get("/admin/payers/stats", async (_request, reply) => {
    ensurePersistence();
    const stats = getPayerRegistryStats();

    // Compute evidence scores
    const { payers } = listPayers();
    const evidenceScore = computeRegistryEvidenceScore(payers);

    const auditStats = getPayerAuditStats();

    return reply.send({
      ok: true,
      stats,
      evidenceScore,
      auditStats,
    });
  });

  /* ── GET /admin/payers/audit/verify — chain integrity ──── */
  server.get("/admin/payers/audit/verify", async (_request, reply) => {
    const result = verifyPayerAuditChain();
    return reply.send(result);
  });

  /* ── POST /admin/payers/import — import from snapshot ──── */
  server.post("/admin/payers/import", async (request, reply) => {
    ensurePersistence();
    const body = (request.body as any) || {};
    const actor = body.actor ?? "system";

    const result = importFromSnapshot({
      sourceType: body.sourceType ?? "insurance_commission_snapshot",
      sourceUrl: body.sourceUrl,
      importedBy: actor,
    });

    if (result.imported > 0) {
      appendPayerAudit({
        action: "payer.registry_imported",
        actor,
        detail: `Imported ${result.imported} payers, skipped ${result.skipped}`,
        reason: body.reason ?? "Initial registry import",
      });
    }

    return reply.send({
      ok: result.ok,
      imported: result.imported,
      skipped: result.skipped,
      errors: result.errors,
    });
  });

  /* ── GET /admin/payers/:id — single payer detail ────────── */
  server.get("/admin/payers/:id", async (request, reply) => {
    ensurePersistence();
    const { id } = request.params as { id: string };
    const query = request.query as { tenantId?: string };

    let payer: PersistedPayer | undefined;
    if (query.tenantId) {
      payer = resolvePayerForTenant(query.tenantId, id);
    } else {
      payer = getPayer(id);
    }

    if (!payer) {
      return reply.code(404).send({ ok: false, error: `Payer not found: ${id}` });
    }

    // Compute evidence validation
    const evidenceValidation = validatePayerEvidence(
      payer.payerId,
      payer.capabilities,
      payer.evidence,
    );

    const evidenceHashes = hashEvidenceList(payer.evidence);

    return reply.send({
      ok: true,
      payer,
      evidenceValidation,
      evidenceHashes,
    });
  });

  /* ── PATCH /admin/payers/:id/capabilities — update caps ── */
  server.patch("/admin/payers/:id/capabilities", async (request, reply) => {
    ensurePersistence();
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const actor = body.actor ?? "admin";
    const reason = body.reason ?? "Capability update";
    const capabilities: Partial<HmoCapabilities> = body.capabilities ?? {};

    if (Object.keys(capabilities).length === 0) {
      return reply.code(400).send({ ok: false, error: "No capabilities provided" });
    }

    const result = updatePayerCapabilities(id, capabilities, actor, reason);
    if (!result.ok) {
      return reply.code(404).send(result);
    }

    appendPayerAudit({
      action: "payer.capabilities_updated",
      actor,
      payerId: id,
      before: result.before,
      after: result.payer?.capabilities,
      reason,
    });

    return reply.send({
      ok: true,
      payer: result.payer,
    });
  });

  /* ── PATCH /admin/payers/:id/tasks — update tasks ──────── */
  server.patch("/admin/payers/:id/tasks", async (request, reply) => {
    ensurePersistence();
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const actor = body.actor ?? "admin";
    const reason = body.reason ?? "Task update";
    const tasks: string[] = body.tasks ?? [];

    const result = updatePayerTasks(id, tasks, actor, reason);
    if (!result.ok) {
      return reply.code(404).send(result);
    }

    appendPayerAudit({
      action: "payer.tasks_updated",
      actor,
      payerId: id,
      before: result.before,
      after: tasks,
      reason,
    });

    return reply.send({
      ok: true,
      payer: result.payer,
    });
  });

  /* ── PATCH /admin/payers/:id/status — update status ────── */
  server.patch("/admin/payers/:id/status", async (request, reply) => {
    ensurePersistence();
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const actor = body.actor ?? "admin";
    const reason = body.reason ?? "Status change";
    const status: HmoStatus = body.status;

    if (!status) {
      return reply.code(400).send({ ok: false, error: "Missing status field" });
    }

    const validStatuses = ["in_progress", "contracting_needed", "active", "suspended"];
    if (!validStatuses.includes(status)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid status: ${status}. Valid: ${validStatuses.join(", ")}`,
      });
    }

    const result = updatePayerStatus(id, status, actor, reason);
    if (!result.ok) {
      return reply.code(404).send(result);
    }

    appendPayerAudit({
      action: "payer.status_changed",
      actor,
      payerId: id,
      before: result.before,
      after: status,
      reason,
    });

    return reply.send({
      ok: true,
      payer: result.payer,
    });
  });

  /* ── POST /admin/payers/:id/evidence — add evidence ────── */
  server.post("/admin/payers/:id/evidence", async (request, reply) => {
    ensurePersistence();
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const actor = body.actor ?? "admin";

    const evidence: HmoEvidence = {
      kind: body.kind ?? "other",
      url: body.url,
      title: body.title ?? "Untitled evidence",
      retrievedAt: body.retrievedAt ?? new Date().toISOString(),
      notes: body.notes,
    };

    if (!evidence.url) {
      return reply.code(400).send({ ok: false, error: "Missing evidence URL" });
    }

    const result = addPayerEvidence(id, evidence, actor);
    if (!result.ok) {
      return reply.code(404).send(result);
    }

    appendPayerAudit({
      action: "payer.evidence_added",
      actor,
      payerId: id,
      after: evidence,
      reason: body.reason ?? `Added ${evidence.kind} evidence`,
      evidenceLink: evidence.url,
    });

    return reply.send({
      ok: true,
      payer: result.payer,
    });
  });

  /* ── GET /admin/payers/:id/evidence/validate — validate ─── */
  server.get("/admin/payers/:id/evidence/validate", async (request, reply) => {
    ensurePersistence();
    const { id } = request.params as { id: string };
    const payer = getPayer(id);

    if (!payer) {
      return reply.code(404).send({ ok: false, error: `Payer not found: ${id}` });
    }

    const validation = validatePayerEvidence(payer.payerId, payer.capabilities, payer.evidence);
    const hashes = hashEvidenceList(payer.evidence);

    return reply.send({ ok: true, validation, hashes });
  });

  /* ── GET /admin/payers/:id/audit — audit trail ──────────── */
  server.get("/admin/payers/:id/audit", async (request, reply) => {
    const { id } = request.params as { id: string };
    const query = request.query as { limit?: string; offset?: string };

    const { events, total } = getPayerAuditTrail(id, {
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });

    return reply.send({ ok: true, total, events });
  });

  /* ── POST /admin/payers/:id/tenant-override — set override */
  server.post("/admin/payers/:id/tenant-override", async (request, reply) => {
    ensurePersistence();
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const tenantId = body.tenantId;

    if (!tenantId) {
      return reply.code(400).send({ ok: false, error: "Missing tenantId" });
    }

    const payer = getPayer(id);
    if (!payer) {
      return reply.code(404).send({ ok: false, error: `Payer not found: ${id}` });
    }

    const override: TenantPayerOverride = {
      tenantId,
      payerId: id,
      capabilityOverrides: body.capabilityOverrides,
      contractingTasks: body.contractingTasks,
      statusOverride: body.statusOverride,
      integrationModeOverride: body.integrationModeOverride,
      vaultRef: body.vaultRef,
      routingPreferences: body.routingPreferences,
      enabled: body.enabled ?? true,
      updatedAt: new Date().toISOString(),
      updatedBy: body.actor ?? "admin",
    };

    setTenantOverride(override);

    appendPayerAudit({
      action: "payer.tenant_override_set",
      actor: body.actor ?? "admin",
      payerId: id,
      tenantId,
      after: override,
      reason: body.reason ?? "Tenant override updated",
    });

    return reply.send({ ok: true, override });
  });

  /* ── GET /admin/payers/:id/tenant-override — get override ─ */
  server.get("/admin/payers/:id/tenant-override", async (request, reply) => {
    ensurePersistence();
    const { id } = request.params as { id: string };
    const query = request.query as { tenantId?: string };

    if (!query.tenantId) {
      return reply.code(400).send({ ok: false, error: "Missing tenantId query param" });
    }

    const override = getTenantOverride(query.tenantId, id);
    if (!override) {
      return reply.send({ ok: true, override: null, message: "No tenant override - using global defaults" });
    }

    return reply.send({ ok: true, override });
  });
};

export default payerAdminRoutes;
