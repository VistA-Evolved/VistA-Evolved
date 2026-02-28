/**
 * Admin Payer DB Routes — Phase 102: Registry Migration to PlatformStore
 * Phase 104: Security posture — admin role enforcement + audit endpoints
 *
 * Uses store-resolver to select PG backend.
 * All repo calls are now async (await).
 *
 * Endpoints:
 *   GET  /admin/payer-db/payers             — list payers
 *   GET  /admin/payer-db/payers/stats       — registry stats
 *   GET  /admin/payer-db/payers/:id         — single payer detail
 *   PATCH /admin/payer-db/payers/:id        — update payer
 *
 *   GET  /admin/payer-db/payers/:id/capabilities — list capabilities
 *   PUT  /admin/payer-db/payers/:id/capabilities — set capability (reason required)
 *
 *   GET  /admin/payer-db/payers/:id/tasks   — list tasks
 *   POST /admin/payer-db/payers/:id/tasks   — create task
 *   PATCH /admin/payer-db/tasks/:taskId     — update task status
 *
 *   POST /admin/payer-db/evidence/ingest-json  — ingest JSON snapshot
 *   POST /admin/payer-db/evidence/upload-pdf   — upload PDF evidence
 *   GET  /admin/payer-db/evidence              — list evidence snapshots
 *   GET  /admin/payer-db/evidence/:id          — single evidence detail
 *   GET  /admin/payer-db/evidence/:id/diff     — diff vs current DB
 *   POST /admin/payer-db/evidence/:id/promote  — promote snapshot
 *
 *   GET  /admin/payer-db/audit              — query audit trail
 *   GET  /admin/payer-db/audit/stats        — audit statistics
 *   GET  /admin/payer-db/audit/payer/:id    — audit for specific payer
 *   GET  /admin/payer-db/audit/verify       — verify audit hash chain (Phase 104)
 *   GET  /admin/payer-db/audit/export       — export audit entries (Phase 104)
 *   GET  /admin/payer-db/audit/retention    — audit retention policy (Phase 104)
 *
 *   GET  /admin/payer-db/tenant/:tenantId/payers — tenant payer config
 *   PUT  /admin/payer-db/tenant/:tenantId/payers/:payerId — upsert tenant config
 *
 *   GET  /admin/payer-db/backend            — which backend is active
 *
 * Auth: admin-level (matched by /admin/ catch-all in AUTH_RULES).
 * Phase 104: In-handler requireRole("admin") enforced for mutation routes.
 */

import type { FastifyInstance, FastifyPluginAsync } from "fastify";
import { resolveStore } from "../platform/store-resolver.js";
import { isPgConfigured, pgHealthCheck } from "../platform/pg/pg-db.js";
import { initPlatformPg } from "../platform/pg/pg-init.js";
import { verifyAuditChain, exportAuditEntries, getRetentionPolicy } from "../platform/pg/audit-integrity.js";
import { ingestJsonSnapshot, ingestPdfEvidence, computeSnapshotDiff, promoteSnapshot } from "../platform/payers/evidence-ingest.js";
import { idempotencyGuard, idempotencyOnSend } from "../middleware/idempotency.js";
import { requireSession, requireRole } from "../auth/auth-routes.js";
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { safeErr } from '../lib/safe-error.js';

const __dirname_resolved = typeof __dirname !== "undefined"
  ? __dirname
  : dirname(fileURLToPath(import.meta.url));

const REPO_ROOT = join(__dirname_resolved, "..", "..", "..", "..");

let pgReady = false;
let pgInitPromise: Promise<void> | null = null;

const adminPayerDbRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {

  // Phase 103: Register idempotency hooks for mutation routes
  server.addHook("preHandler", idempotencyGuard());
  server.addHook("onSend", idempotencyOnSend);

  async function ensureDb(): Promise<void> {
    if (pgReady) return;
    if (!isPgConfigured()) return;
    // Deduplicate concurrent init calls via shared promise
    if (!pgInitPromise) {
      pgInitPromise = (async () => {
        const pgResult = await initPlatformPg();
        pgReady = true;
        if (pgResult.ok) {
          server.log.info(`Platform PG initialized (migrations: ${pgResult.migrations?.applied ?? 0} applied)`);
        } else {
          server.log.warn(`Platform PG init failed: ${pgResult.error}`);
        }
      })();
    }
    await pgInitPromise;
  }

  /** Get repo facade for the active backend */
  function getStore() {
    return resolveStore();
  }

  /* ═══════════════════════════════════════════════════════════ */
  /* BACKEND INFO                                                */
  /* ═══════════════════════════════════════════════════════════ */

  server.get("/admin/payer-db/backend", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const info: Record<string, unknown> = { backend: s.backend };
    if (s.backend === "pg") {
      try {
        const hc = await pgHealthCheck();
        info.pgHealthy = hc.ok;
        info.pgLatencyMs = hc.latencyMs;
      } catch {
        info.pgHealthy = false;
      }
    }
    return reply.send({ ok: true, ...info });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PAYER CRUD                                                  */
  /* ═══════════════════════════════════════════════════════════ */

  server.get("/admin/payer-db/payers", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const query = request.query as {
      countryCode?: string; active?: string; search?: string;
      limit?: string; offset?: string;
    };
    const { rows, total } = await s.payerRepo.listPayers({
      countryCode: query.countryCode,
      active: query.active === "true" ? true : query.active === "false" ? false : undefined,
      search: query.search,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return reply.send({ ok: true, count: rows.length, total, payers: rows });
  });

  server.get("/admin/payer-db/payers/stats", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const total = await s.payerRepo.getPayerCount();
    const auditStats = await s.auditRepo.getAuditStats();
    const pendingEvidence = (await s.evidenceRepo.listEvidenceByStatus("pending")).length;
    return reply.send({ ok: true, totalPayers: total, audit: auditStats, pendingEvidence, backend: s.backend });
  });

  // IMPORTANT: evidence routes BEFORE :id param routes to avoid collision
  /* ═══════════════════════════════════════════════════════════ */
  /* EVIDENCE PIPELINE                                           */
  /* ═══════════════════════════════════════════════════════════ */

  server.post("/admin/payer-db/evidence/ingest-json", async (request, reply) => {
    // Phase 104: Explicit admin role enforcement for mutations
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    await ensureDb();
    const body = (request.body as any) || {};

    let jsonContent: string;
    if (body.filePath) {
      // Read from a committed file path (relative to repo root)
      const fullPath = join(REPO_ROOT, body.filePath);
      if (!existsSync(fullPath)) {
        return reply.code(400).send({ ok: false, error: `File not found: ${body.filePath}` });
      }
      jsonContent = readFileSync(fullPath, "utf-8");
    } else if (body.json) {
      jsonContent = typeof body.json === "string" ? body.json : JSON.stringify(body.json);
    } else {
      return reply.code(400).send({ ok: false, error: "Provide 'filePath' or 'json' in request body" });
    }

    const result = await ingestJsonSnapshot({
      jsonContent,
      sourceUrl: body.sourceUrl,
      asOfDate: body.asOfDate ?? new Date().toISOString().split("T")[0],
      actor: body.actor,
    });

    return reply.code(result.ok ? 200 : 400).send(result);
  });

  server.post("/admin/payer-db/evidence/upload-pdf", async (request, reply) => {
    // Phase 104: Explicit admin role enforcement for mutations
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    await ensureDb();
    // For PDF upload, expect base64-encoded content or raw buffer
    const body = (request.body as any) || {};
    if (!body.base64 && !body.filename) {
      return reply.code(400).send({ ok: false, error: "Provide 'base64' PDF content and 'filename'" });
    }

    const buffer = Buffer.from(body.base64, "base64");
    const result = await ingestPdfEvidence({
      buffer,
      filename: body.filename ?? "evidence.pdf",
      asOfDate: body.asOfDate ?? new Date().toISOString().split("T")[0],
      actor: body.actor,
    });

    return reply.code(result.ok ? 200 : 400).send(result);
  });

  server.get("/admin/payer-db/evidence", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const query = request.query as { tenantId?: string; status?: string };
    let snapshots;
    if (query.status) {
      snapshots = await s.evidenceRepo.listEvidenceByStatus(query.status);
    } else {
      snapshots = await s.evidenceRepo.listEvidence(query.tenantId);
    }
    return reply.send({ ok: true, count: snapshots.length, snapshots });
  });

  server.get("/admin/payer-db/evidence/:id", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const { id } = request.params as { id: string };
    const snapshot = await s.evidenceRepo.findEvidenceById(id);
    if (!snapshot) {
      return reply.code(404).send({ ok: false, error: "Evidence snapshot not found" });
    }
    return reply.send({ ok: true, snapshot });
  });

  server.get("/admin/payer-db/evidence/:id/diff", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const { id } = request.params as { id: string };
    const snapshot = await s.evidenceRepo.findEvidenceById(id);
    if (!snapshot) {
      return reply.code(404).send({ ok: false, error: "Evidence snapshot not found" });
    }
    if (!snapshot.storedPath) {
      return reply.code(400).send({ ok: false, error: "No stored file for this snapshot" });
    }
    const fullPath = join(REPO_ROOT, snapshot.storedPath);
    if (!existsSync(fullPath)) {
      return reply.code(400).send({ ok: false, error: "Stored file not found on disk" });
    }

    let raw = readFileSync(fullPath, "utf-8");
    if (raw.charCodeAt(0) === 0xfeff) raw = raw.slice(1);
    const data = JSON.parse(raw);
    const payerList = Array.isArray(data.payers) ? data.payers : Array.isArray(data) ? data : [];
    const diff = await computeSnapshotDiff(payerList);

    return reply.send({ ok: true, snapshotId: id, diff });
  });

  server.post("/admin/payer-db/evidence/:id/promote", async (request, reply) => {
    // Phase 104: Explicit admin role enforcement for mutations
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    await ensureDb();
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const result = await promoteSnapshot(id, body.actor);
    return reply.code(result.ok ? 200 : 400).send(result);
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* PAYER :id routes (AFTER evidence routes)                    */
  /* ═══════════════════════════════════════════════════════════ */

  server.get("/admin/payer-db/payers/:id", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const { id } = request.params as { id: string };
    const p = await s.payerRepo.findPayerById(id);
    if (!p) return reply.code(404).send({ ok: false, error: "Payer not found" });

    const capabilities = await s.capabilityRepo.listCapabilities(id);
    const tasks = await s.taskRepo.listTasks(id);
    const audit = await s.auditRepo.getAuditForPayer(id);

    return reply.send({ ok: true, payer: p, capabilities, tasks, auditCount: audit.length });
  });

  server.patch("/admin/payer-db/payers/:id", async (request, reply) => {
    // Phase 104: Explicit admin role enforcement for mutations
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    await ensureDb();
    const s = getStore();
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    if (!body.reason) {
      return reply.code(400).send({ ok: false, error: "reason is required for payer updates" });
    }

    try {
      const result = await s.payerRepo.updatePayer(
        id, body, body.reason, body.actor ?? session.duz,
        body.expectedVersion !== undefined ? Number(body.expectedVersion) : undefined,
      );
      if (!result) return reply.code(404).send({ ok: false, error: "Payer not found" });
      return reply.send({ ok: true, payer: result });
    } catch (err: any) {
      if (err.code === "CONCURRENCY_CONFLICT") {
        return reply.code(409).send({ ok: false, error: safeErr(err) });
      }
      throw err;
    }
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* CAPABILITIES                                                */
  /* ═══════════════════════════════════════════════════════════ */

  server.get("/admin/payer-db/payers/:id/capabilities", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const { id } = request.params as { id: string };
    const query = request.query as { tenantId?: string };
    const capabilities = await s.capabilityRepo.listCapabilities(id, query.tenantId);
    return reply.send({ ok: true, capabilities });
  });

  server.put("/admin/payer-db/payers/:id/capabilities", async (request, reply) => {
    // Phase 104: Explicit admin role enforcement for mutations
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    await ensureDb();
    const s = getStore();
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    if (!body.capabilityKey || !body.value) {
      return reply.code(400).send({ ok: false, error: "capabilityKey and value are required" });
    }
    if (!body.reason) {
      return reply.code(400).send({ ok: false, error: "reason is required for capability changes" });
    }

    const payer = await s.payerRepo.findPayerById(id);
    if (!payer) return reply.code(404).send({ ok: false, error: "Payer not found" });

    const result = await s.capabilityRepo.setCapability({
      payerId: id,
      capabilityKey: body.capabilityKey,
      value: body.value,
      confidence: body.confidence,
      tenantId: body.tenantId,
      evidenceSnapshotId: body.evidenceSnapshotId,
      reason: body.reason,
      actor: body.actor,
    });

    return reply.send({ ok: true, capability: result });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* TASKS                                                       */
  /* ═══════════════════════════════════════════════════════════ */

  server.get("/admin/payer-db/payers/:id/tasks", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const { id } = request.params as { id: string };
    const query = request.query as { tenantId?: string };
    const tasks = await s.taskRepo.listTasks(id, query.tenantId);
    return reply.send({ ok: true, tasks });
  });

  server.post("/admin/payer-db/payers/:id/tasks", async (request, reply) => {
    // Phase 104: Explicit admin role enforcement for mutations
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    await ensureDb();
    const s = getStore();
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    if (!body.title) {
      return reply.code(400).send({ ok: false, error: "title is required" });
    }
    const payer = await s.payerRepo.findPayerById(id);
    if (!payer) return reply.code(404).send({ ok: false, error: "Payer not found" });

    const task = await s.taskRepo.createTask({
      payerId: id,
      tenantId: body.tenantId,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
    }, body.actor);

    return reply.code(201).send({ ok: true, task });
  });

  server.patch("/admin/payer-db/tasks/:taskId", async (request, reply) => {
    // Phase 104: Explicit admin role enforcement for mutations
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    await ensureDb();
    const s = getStore();
    const { taskId } = request.params as { taskId: string };
    const body = (request.body as any) || {};
    if (!body.status) {
      return reply.code(400).send({ ok: false, error: "status is required" });
    }
    if (!body.reason) {
      return reply.code(400).send({ ok: false, error: "reason is required for task status changes" });
    }
    const result = await s.taskRepo.updateTaskStatus(taskId, body.status, body.reason, body.actor);
    if (!result) return reply.code(404).send({ ok: false, error: "Task not found" });
    return reply.send({ ok: true, task: result });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* AUDIT                                                       */
  /* ═══════════════════════════════════════════════════════════ */

  server.get("/admin/payer-db/audit", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const query = request.query as {
      action?: string; entityType?: string; actorId?: string;
      tenantId?: string; limit?: string; offset?: string;
    };
    const { rows, total } = await s.auditRepo.searchAudit({
      action: query.action,
      entityType: query.entityType,
      actorId: query.actorId,
      tenantId: query.tenantId,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });
    return reply.send({ ok: true, count: rows.length, total, events: rows });
  });

  server.get("/admin/payer-db/audit/stats", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const stats = await s.auditRepo.getAuditStats();
    return reply.send({ ok: true, stats });
  });

  server.get("/admin/payer-db/audit/payer/:id", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const { id } = request.params as { id: string };
    const events = await s.auditRepo.getAuditForPayer(id);
    return reply.send({ ok: true, count: events.length, events });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* AUDIT INTEGRITY (Phase 104)                                 */
  /* ═══════════════════════════════════════════════════════════ */

  server.get("/admin/payer-db/audit/verify", async (request, reply) => {
    // Phase 104: Verify hash chain integrity of platform_audit_event
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const result = await verifyAuditChain();
    return reply.send(result);
  });

  server.get("/admin/payer-db/audit/export", async (request, reply) => {
    // Phase 104: Export audit entries (PHI-sanitized)
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const query = request.query as {
      since?: string; until?: string; tenantId?: string;
      entityType?: string; limit?: string;
    };
    const result = await exportAuditEntries({
      since: query.since,
      until: query.until,
      tenantId: query.tenantId,
      entityType: query.entityType,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
    return reply.send(result);
  });

  server.get("/admin/payer-db/audit/retention", async (_request, reply) => {
    // Phase 104: Return current retention policy metadata
    const policy = getRetentionPolicy();
    return reply.send({ ok: true, policy });
  });

  /* ═══════════════════════════════════════════════════════════ */
  /* TENANT PAYER CONFIG                                         */
  /* ═══════════════════════════════════════════════════════════ */

  server.get("/admin/payer-db/tenant/:tenantId/payers", async (request, reply) => {
    await ensureDb();
    const s = getStore();
    const { tenantId } = request.params as { tenantId: string };
    const tenantPayers = await s.tenantPayerRepo.listTenantPayers(tenantId);
    return reply.send({ ok: true, tenantPayers });
  });

  server.put("/admin/payer-db/tenant/:tenantId/payers/:payerId", async (request, reply) => {
    // Phase 104: Explicit admin role enforcement for mutations
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    await ensureDb();
    const s = getStore();
    const { tenantId, payerId } = request.params as { tenantId: string; payerId: string };
    const body = (request.body as any) || {};
    if (!body.reason) {
      return reply.code(400).send({ ok: false, error: "reason is required" });
    }

    const payer = await s.payerRepo.findPayerById(payerId);
    if (!payer) return reply.code(404).send({ ok: false, error: "Payer not found" });

    const result = await s.tenantPayerRepo.upsertTenantPayer(
      { tenantId, payerId, status: body.status, notes: body.notes, vaultRef: body.vaultRef },
      body.reason,
      body.actor,
    );

    return reply.send({ ok: true, tenantPayer: result });
  });
};

export default adminPayerDbRoutes;
