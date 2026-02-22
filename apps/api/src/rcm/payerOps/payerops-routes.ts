/**
 * PayerOps Routes — Phase 87: Philippines RCM Foundation
 *
 * Endpoints:
 *   GET  /rcm/payerops/health              — PayerOps subsystem health
 *   GET  /rcm/payerops/stats               — Aggregate stats
 *
 *   GET  /rcm/payerops/enrollments         — List facility-payer enrollments
 *   GET  /rcm/payerops/enrollments/:id     — Get enrollment detail
 *   POST /rcm/payerops/enrollments         — Create enrollment
 *   PUT  /rcm/payerops/enrollments/:id/status — Update enrollment status
 *
 *   GET  /rcm/payerops/loa                 — List LOA cases
 *   GET  /rcm/payerops/loa/:id            — Get LOA case detail
 *   POST /rcm/payerops/loa                 — Create LOA case
 *   PUT  /rcm/payerops/loa/:id/status     — Transition LOA status
 *   POST /rcm/payerops/loa/:id/attachments — Attach credential to LOA
 *   POST /rcm/payerops/loa/:id/submit     — Submit LOA via adapter
 *   POST /rcm/payerops/loa/:id/pack       — Generate submission pack
 *
 *   GET  /rcm/payerops/credentials         — List credential vault entries
 *   GET  /rcm/payerops/credentials/:id    — Get credential entry
 *   POST /rcm/payerops/credentials         — Create credential entry
 *   DELETE /rcm/payerops/credentials/:id  — Delete credential entry
 *   GET  /rcm/payerops/credentials/expiring — Expiring credentials
 *
 *   GET  /rcm/payerops/adapters            — List available adapters
 *
 * All routes fall under /rcm/ prefix → existing security rule covers auth.
 * RBAC: reads = rcm:read, mutations = rcm:write.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

// Store operations
import {
  createEnrollment,
  getEnrollment,
  listEnrollments,
  updateEnrollmentStatus,
  addCredentialRefToEnrollment,
  createLOACase,
  getLOACase,
  listLOACases,
  transitionLOAStatus,
  addAttachmentToLOA,
  updateLOAPayerRef,
  createCredentialEntry,
  getCredentialEntry,
  listCredentialEntries,
  deleteCredentialEntry,
  getExpiringCredentials,
  getPayerOpsStats,
} from "./store.js";

// Adapters
import { ManualAdapter, generateLOASubmissionPack } from "./manual-adapter.js";
import { getPortalAdapter } from "./portal-adapter.js";

// Encryption health check
import { testEncryptionHealth } from "./credential-encryption.js";

// Types
import type { EnrollmentStatus, LOAStatus } from "./types.js";

/* ── Adapter registry (manual + portal; API adapters added in future phases) ── */

const manualAdapter = new ManualAdapter();
const portalAdapter = getPortalAdapter();

function resolveAdapter(mode: "manual" | "portal" | "api") {
  if (mode === "portal") return portalAdapter;
  // API mode is future — fall back to manual
  return manualAdapter;
}

/* ── Helper: safe body parse ────────────────────────────────── */
function body(request: FastifyRequest): Record<string, any> {
  return (request.body as Record<string, any>) || {};
}

function query(request: FastifyRequest): Record<string, any> {
  return (request.query as Record<string, any>) || {};
}

function params(request: FastifyRequest): Record<string, any> {
  return (request.params as Record<string, any>) || {};
}

function sessionActor(request: FastifyRequest): string {
  const s = (request as any).session;
  return s?.userName || s?.duz || "unknown";
}

/* ── Route plugin ────────────────────────────────────────────── */

export default async function payerOpsRoutes(server: FastifyInstance): Promise<void> {

  /* ── Health ────────────────────────────────────────────────── */

  server.get("/rcm/payerops/health", async (_request, reply) => {
    const encryptionResult = testEncryptionHealth();
    return reply.send({
      ok: true,
      module: "payerops",
      phase: 87,
      encryption: encryptionResult.ok ? "healthy" : "degraded",
      adapters: ["manual", "portal"],
      portalConfigs: portalAdapter.listPortalConfigs().length,
      timestamp: new Date().toISOString(),
    });
  });

  /* ── Stats ─────────────────────────────────────────────────── */

  server.get("/rcm/payerops/stats", async (_request, reply) => {
    return reply.send({ ok: true, stats: getPayerOpsStats() });
  });

  /* ── Enrollments ───────────────────────────────────────────── */

  server.get("/rcm/payerops/enrollments", async (request, reply) => {
    const q = query(request);
    const results = listEnrollments({
      facilityId: q.facilityId,
      payerId: q.payerId,
      status: q.status as EnrollmentStatus | undefined,
    });
    return reply.send({ ok: true, count: results.length, enrollments: results });
  });

  server.get("/rcm/payerops/enrollments/:id", async (request, reply) => {
    const { id } = params(request);
    const enrollment = getEnrollment(id);
    if (!enrollment) return reply.code(404).send({ ok: false, error: "Enrollment not found" });
    return reply.send({ ok: true, enrollment });
  });

  server.post("/rcm/payerops/enrollments", async (request, reply) => {
    const b = body(request);
    if (!b.facilityId || !b.payerId || !b.payerName) {
      return reply.code(400).send({
        ok: false,
        error: "facilityId, payerId, and payerName are required",
      });
    }
    const enrollment = createEnrollment({
      facilityId: b.facilityId,
      facilityName: b.facilityName || b.facilityId,
      payerId: b.payerId,
      payerName: b.payerName,
      integrationMode: b.integrationMode || "manual",
      portalUrl: b.portalUrl,
      portalInstructions: b.portalInstructions,
      notes: b.notes,
      actor: sessionActor(request),
    });
    return reply.code(201).send({ ok: true, enrollment });
  });

  server.put("/rcm/payerops/enrollments/:id/status", async (request, reply) => {
    const { id } = params(request);
    const b = body(request);
    if (!b.status) {
      return reply.code(400).send({ ok: false, error: "status is required" });
    }
    const updated = updateEnrollmentStatus(id, b.status, sessionActor(request), b.detail);
    if (!updated) return reply.code(404).send({ ok: false, error: "Enrollment not found" });
    return reply.send({ ok: true, enrollment: updated });
  });

  /* ── LOA Cases ─────────────────────────────────────────────── */

  server.get("/rcm/payerops/loa", async (request, reply) => {
    const q = query(request);
    const results = listLOACases({
      facilityId: q.facilityId,
      patientDfn: q.patientDfn,
      payerId: q.payerId,
      status: q.status as LOAStatus | undefined,
    });
    return reply.send({ ok: true, count: results.length, loaCases: results });
  });

  server.get("/rcm/payerops/loa/:id", async (request, reply) => {
    const { id } = params(request);
    const loa = getLOACase(id);
    if (!loa) return reply.code(404).send({ ok: false, error: "LOA case not found" });
    return reply.send({ ok: true, loaCase: loa });
  });

  server.post("/rcm/payerops/loa", async (request, reply) => {
    const b = body(request);
    if (!b.facilityId || !b.patientDfn || !b.payerId || !b.payerName || !b.requestType) {
      return reply.code(400).send({
        ok: false,
        error: "facilityId, patientDfn, payerId, payerName, and requestType are required",
      });
    }
    const loa = createLOACase({
      facilityId: b.facilityId,
      patientDfn: b.patientDfn,
      encounterIen: b.encounterIen,
      payerId: b.payerId,
      payerName: b.payerName,
      memberId: b.memberId,
      planName: b.planName,
      requestType: b.requestType,
      requestedServices: b.requestedServices || [],
      diagnosisCodes: b.diagnosisCodes || [],
      createdBy: sessionActor(request),
    });
    return reply.code(201).send({ ok: true, loaCase: loa });
  });

  server.put("/rcm/payerops/loa/:id/status", async (request, reply) => {
    const { id } = params(request);
    const b = body(request);
    if (!b.status) {
      return reply.code(400).send({ ok: false, error: "status is required" });
    }
    const result = transitionLOAStatus(id, b.status, sessionActor(request), b.reason);
    if (!result.ok) {
      const code = result.error?.includes("not found") ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result.error });
    }
    // If transitioning to approved, optionally set payer reference
    if (b.status === "approved" || b.status === "partially_approved") {
      if (b.payerRefNumber) {
        updateLOAPayerRef(id, b.payerRefNumber, b.approvedAmount, b.approvedServices);
      }
    }
    return reply.send({ ok: true, loaCase: result.loaCase });
  });

  server.post("/rcm/payerops/loa/:id/attachments", async (request, reply) => {
    const { id } = params(request);
    const b = body(request);
    if (!b.credentialId) {
      return reply.code(400).send({ ok: false, error: "credentialId is required" });
    }
    const ok = addAttachmentToLOA(id, b.credentialId);
    if (!ok) return reply.code(404).send({ ok: false, error: "LOA case not found" });
    return reply.send({ ok: true, message: "Attachment added" });
  });

  server.post("/rcm/payerops/loa/:id/submit", async (request, reply) => {
    const { id } = params(request);
    const loa = getLOACase(id);
    if (!loa) return reply.code(404).send({ ok: false, error: "LOA case not found" });

    // Determine which adapter to use
    const adapter = resolveAdapter(loa.submissionMode);
    const result = await adapter.submitLOA(loa);

    return reply.send({
      ok: true,
      adapterMode: adapter.mode,
      result,
    });
  });

  server.post("/rcm/payerops/loa/:id/pack", async (request, reply) => {
    const { id } = params(request);
    const loa = getLOACase(id);
    if (!loa) return reply.code(404).send({ ok: false, error: "LOA case not found" });

    const pack = generateLOASubmissionPack(loa);
    return reply.send({ ok: true, pack });
  });

  /* ── Credential Vault ──────────────────────────────────────── */

  server.get("/rcm/payerops/credentials", async (request, reply) => {
    const q = query(request);
    const results = listCredentialEntries({
      facilityId: q.facilityId,
      docType: q.docType,
      payerId: q.payerId,
      expiringWithinDays: q.expiringDays ? Number(q.expiringDays) : undefined,
    });
    return reply.send({ ok: true, count: results.length, credentials: results });
  });

  /* Static /expiring registered before parametric /:id to avoid ambiguity */
  server.get("/rcm/payerops/credentials/expiring", async (request, reply) => {
    const q = query(request);
    const days = q.days ? Number(q.days) : 30;
    const expiring = getExpiringCredentials(days);
    return reply.send({ ok: true, count: expiring.length, credentials: expiring });
  });

  server.get("/rcm/payerops/credentials/:id", async (request, reply) => {
    const { id } = params(request);
    const entry = getCredentialEntry(id);
    if (!entry) return reply.code(404).send({ ok: false, error: "Credential entry not found" });
    return reply.send({ ok: true, credential: entry });
  });

  server.post("/rcm/payerops/credentials", async (request, reply) => {
    const b = body(request);
    if (!b.facilityId || !b.docType || !b.title || !b.fileName) {
      return reply.code(400).send({
        ok: false,
        error: "facilityId, docType, title, and fileName are required",
      });
    }
    const entry = createCredentialEntry({
      facilityId: b.facilityId,
      docType: b.docType,
      title: b.title,
      fileName: b.fileName,
      mimeType: b.mimeType || "application/octet-stream",
      storagePath: b.storagePath || `uploads/${b.facilityId}/${b.fileName}`,
      sizeBytes: b.sizeBytes || 0,
      contentHash: b.contentHash || "pending",
      issuedBy: b.issuedBy,
      issueDate: b.issueDate,
      expiryDate: b.expiryDate,
      renewalReminderDays: b.renewalReminderDays,
      associatedPayerIds: b.associatedPayerIds,
      notes: b.notes,
      uploadedBy: sessionActor(request),
    });
    // Optionally link to enrollment
    if (b.enrollmentId) {
      addCredentialRefToEnrollment(b.enrollmentId, entry.id);
    }
    return reply.code(201).send({ ok: true, credential: entry });
  });

  server.delete("/rcm/payerops/credentials/:id", async (request, reply) => {
    const { id } = params(request);
    const deleted = deleteCredentialEntry(id);
    if (!deleted) return reply.code(404).send({ ok: false, error: "Credential entry not found" });
    return reply.send({ ok: true, message: "Credential deleted" });
  });

  /* ── Adapters ──────────────────────────────────────────────── */

  server.get("/rcm/payerops/adapters", async (_request, reply) => {
    return reply.send({
      ok: true,
      adapters: [
        {
          id: manualAdapter.id,
          name: manualAdapter.name,
          mode: manualAdapter.mode,
          capabilities: manualAdapter.capabilities(),
        },
        {
          id: portalAdapter.id,
          name: portalAdapter.name,
          mode: portalAdapter.mode,
          capabilities: portalAdapter.capabilities(),
          portalConfigs: portalAdapter.listPortalConfigs().length,
        },
      ],
    });
  });
}
