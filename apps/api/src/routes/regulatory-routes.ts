/**
 * Regulatory Reporting Endpoints — Phase 444.
 *
 * REST routes for the regulatory module:
 * - /regulatory/classify — Runtime classification
 * - /regulatory/frameworks — Framework registry
 * - /regulatory/attestations — Attestation store CRUD
 * - /regulatory/country-config — Tenant→country assignments
 * - /regulatory/export — Export packaging pipeline
 * - /regulatory/validate — Country-specific validation
 * - /regulatory/posture — Compliance posture summary
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { RegulatoryFramework } from "../regulatory/types.js";

import {
  classify,
  getFramework,
  getAllFrameworks,
  resolveFrameworksByCountry,
  createAttestation,
  getAttestation,
  listAttestations,
  revokeAttestation,
  checkExpiredAttestations,
  getAttestationSummary,
  verifyAttestationChain,
  assignCountryToTenant,
  getTenantCountryAssignment,
  listTenantCountryAssignments,
  resolveTenantRegulatoryConfig,
  getSupportedCountries,
  getCountryAssignmentAudit,
  verifyCountryAuditChain,
  createExportPackage,
  getExportPackage,
  listExportPackages,
  getExportAudit,
  verifyExportAuditChain,
  validateForCountry,
  listCountryValidators,
} from "../regulatory/index.js";

/* ------------------------------------------------------------------ */
/* Plugin                                                               */
/* ------------------------------------------------------------------ */

export default async function regulatoryRoutes(server: FastifyInstance): Promise<void> {
  /* ── Frameworks ─────────────────────────────────────── */

  server.get("/regulatory/frameworks", async () => {
    return { ok: true, frameworks: getAllFrameworks() };
  });

  server.get("/regulatory/frameworks/:id", async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const fw = getFramework(request.params.id as RegulatoryFramework);
    if (!fw) return { ok: false, error: "Framework not found" };
    return { ok: true, framework: fw };
  });

  server.get("/regulatory/frameworks/country/:cc", async (request: FastifyRequest<{ Params: { cc: string } }>) => {
    const frameworks = resolveFrameworksByCountry(request.params.cc.toUpperCase());
    return { ok: true, country: request.params.cc.toUpperCase(), frameworks };
  });

  /* ── Classification ─────────────────────────────────── */

  server.post("/regulatory/classify", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.operation) {
      reply.code(400);
      return { ok: false, error: "operation is required" };
    }
    const result = classify({
      tenantId: body.tenantId,
      countryCode: body.countryCode,
      operation: body.operation,
      operationRisk: body.operationRisk || "read",
      dataElements: body.dataElements || [],
      dataTier: body.dataTier,
    });
    return { ok: true, classification: result };
  });

  /* ── Attestations ───────────────────────────────────── */

  server.get("/regulatory/attestations", async (request: FastifyRequest) => {
    const q = request.query as any;
    const result = listAttestations({
      framework: q.framework,
      status: q.status,
      tenantId: q.tenantId,
      requirementId: q.requirementId,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });
    return { ok: true, ...result };
  });

  server.get("/regulatory/attestations/:id", async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const att = getAttestation(request.params.id);
    if (!att) return { ok: false, error: "Attestation not found" };
    return { ok: true, attestation: att };
  });

  server.post("/regulatory/attestations", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.framework || !body.requirementId || !body.attestedBy) {
      reply.code(400);
      return { ok: false, error: "framework, requirementId, and attestedBy are required" };
    }
    const att = createAttestation({
      framework: body.framework,
      requirementId: body.requirementId,
      requirementTitle: body.requirementTitle || body.requirementId,
      attestedBy: body.attestedBy,
      attesterRole: body.attesterRole || "admin",
      evidence: body.evidence || [],
      notes: body.notes,
      tenantId: body.tenantId,
      reviewIntervalDays: body.reviewIntervalDays,
    });
    reply.code(201);
    return { ok: true, attestation: att };
  });

  server.post("/regulatory/attestations/:id/revoke", async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const ok = revokeAttestation(request.params.id, body.revokedBy || "system", body.reason);
    if (!ok) {
      reply.code(404);
      return { ok: false, error: "Attestation not found or already revoked" };
    }
    return { ok: true };
  });

  server.get("/regulatory/attestations/summary", async (request: FastifyRequest) => {
    const q = request.query as any;
    return { ok: true, summary: getAttestationSummary(q.tenantId) };
  });

  server.get("/regulatory/attestations/verify", async () => {
    return { ok: true, chain: verifyAttestationChain() };
  });

  server.post("/regulatory/attestations/check-expired", async () => {
    const count = checkExpiredAttestations();
    return { ok: true, expiredCount: count };
  });

  /* ── Country Config ─────────────────────────────────── */

  server.get("/regulatory/country-config", async () => {
    return { ok: true, assignments: listTenantCountryAssignments(), supportedCountries: getSupportedCountries() };
  });

  server.get("/regulatory/country-config/:tenantId", async (request: FastifyRequest<{ Params: { tenantId: string } }>) => {
    const assignment = getTenantCountryAssignment(request.params.tenantId);
    const regConfig = resolveTenantRegulatoryConfig(request.params.tenantId);
    return { ok: true, assignment: assignment || null, regulatoryConfig: regConfig };
  });

  server.post("/regulatory/country-config", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.tenantId || !body.countryCode || !body.assignedBy) {
      reply.code(400);
      return { ok: false, error: "tenantId, countryCode, and assignedBy are required" };
    }
    try {
      const assignment = assignCountryToTenant({
        tenantId: body.tenantId,
        countryCode: body.countryCode,
        assignedBy: body.assignedBy,
        reason: body.reason || "Admin assignment",
      });
      reply.code(201);
      return { ok: true, assignment };
    } catch (err: any) {
      reply.code(400);
      return { ok: false, error: "Country assignment failed" };
    }
  });

  server.get("/regulatory/country-config/audit", async (request: FastifyRequest) => {
    const q = request.query as any;
    return { ok: true, audit: getCountryAssignmentAudit(q.tenantId) };
  });

  server.get("/regulatory/country-config/audit/verify", async () => {
    return { ok: true, chain: verifyCountryAuditChain() };
  });

  /* ── Export ─────────────────────────────────────────── */

  server.post("/regulatory/export", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.requestedBy || !body.domains || !body.format) {
      reply.code(400);
      return { ok: false, error: "requestedBy, domains, and format are required" };
    }
    const pkg = createExportPackage({
      requestedBy: body.requestedBy,
      tenantId: body.tenantId,
      destinationCountry: body.destinationCountry,
      domains: body.domains,
      format: body.format,
      includePhi: body.includePhi ?? false,
      patientDfn: body.patientDfn,
      dateRangeStart: body.dateRangeStart,
      dateRangeEnd: body.dateRangeEnd,
      reason: body.reason || "Export requested",
    });
    reply.code(201);
    return { ok: true, package: pkg };
  });

  server.get("/regulatory/export", async (request: FastifyRequest) => {
    const q = request.query as any;
    const result = listExportPackages({
      status: q.status,
      tenantId: q.tenantId,
      limit: q.limit ? parseInt(q.limit, 10) : undefined,
      offset: q.offset ? parseInt(q.offset, 10) : undefined,
    });
    return { ok: true, ...result };
  });

  server.get("/regulatory/export/:id", async (request: FastifyRequest<{ Params: { id: string } }>) => {
    const pkg = getExportPackage(request.params.id);
    if (!pkg) return { ok: false, error: "Export package not found" };
    return { ok: true, package: pkg };
  });

  server.get("/regulatory/export/audit", async (request: FastifyRequest) => {
    const q = request.query as any;
    return { ok: true, audit: getExportAudit(q.exportId) };
  });

  server.get("/regulatory/export/audit/verify", async () => {
    return { ok: true, chain: verifyExportAuditChain() };
  });

  /* ── Validation ─────────────────────────────────────── */

  server.get("/regulatory/validators", async () => {
    const validators = listCountryValidators();
    return {
      ok: true,
      validators: validators.map((v) => ({
        countryCode: v.countryCode,
        name: v.name,
        domains: v.domains,
      })),
    };
  });

  server.post("/regulatory/validate", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.countryCode || !body.domain || !body.record) {
      reply.code(400);
      return { ok: false, error: "countryCode, domain, and record are required" };
    }
    const result = validateForCountry(body.countryCode, body.domain, body.record);
    return { ok: true, validation: result };
  });

  /* ── Posture ────────────────────────────────────────── */

  server.get("/regulatory/posture", async (request: FastifyRequest) => {
    const q = request.query as any;
    const tenantId = q.tenantId || "default";
    const regConfig = resolveTenantRegulatoryConfig(tenantId);
    const attestationSummary = getAttestationSummary(tenantId);
    const validators = listCountryValidators();
    const supportedCountries = getSupportedCountries();
    const attestationChain = verifyAttestationChain();
    const countryAuditChain = verifyCountryAuditChain();

    return {
      ok: true,
      posture: {
        tenantId,
        regulatory: regConfig,
        attestations: attestationSummary,
        validatorCount: validators.length,
        supportedCountries,
        chainIntegrity: {
          attestations: attestationChain.valid,
          countryAssignments: countryAuditChain.valid,
        },
      },
    };
  });
}
