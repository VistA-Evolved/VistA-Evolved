/**
 * Data Rights Routes (Phase 375 / W20-P6)
 *
 * Admin endpoints for data rights operations:
 * - Retention policy CRUD
 * - Deletion request lifecycle
 * - Legal hold management
 * - Data rights audit trail
 */

import type { FastifyInstance } from "fastify";
import {
  createRetentionPolicy,
  listRetentionPolicies,
  getRetentionPolicy,
  updateRetentionPolicy,
  deleteRetentionPolicy,
  createDeletionRequest,
  approveDeletionRequest,
  rejectDeletionRequest,
  executeDeletionRequest,
  verifyDeletionRequest,
  getDeletionRequest,
  listDeletionRequests,
  createLegalHold,
  releaseLegalHold,
  getLegalHold,
  listLegalHolds,
  getDataRightsAudit,
  verifyDataRightsAuditChain,
  getDataRightsSummary,
} from "../services/data-rights-service.js";
import type { DataClass, RetentionAction, DeletionStatus, LegalHoldStatus } from "../services/data-rights-service.js";

const DEFAULT_TENANT = "default";

function getTenantId(request: { headers: Record<string, string | string[] | undefined> }): string {
  return (request.headers["x-tenant-id"] as string) || DEFAULT_TENANT;
}

export default async function dataRightsRoutes(server: FastifyInstance): Promise<void> {
  /* ============================================================= */
  /* Retention Policies                                             */
  /* ============================================================= */

  server.post("/data-rights/retention-policies", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.dataClass || !body.retentionDays || !body.action || !body.description || !body.regulatoryBasis || !body.actor) {
      return reply.code(400).send({ ok: false, error: "dataClass, retentionDays, action, description, regulatoryBasis, actor required" });
    }
    const policy = createRetentionPolicy(tenantId, {
      dataClass: body.dataClass as DataClass,
      retentionDays: body.retentionDays as number,
      action: body.action as RetentionAction,
      description: body.description as string,
      regulatoryBasis: body.regulatoryBasis as string,
      actor: body.actor as string,
    });
    return reply.code(201).send({ ok: true, policy });
  });

  server.get("/data-rights/retention-policies", async (request, reply) => {
    const tenantId = getTenantId(request);
    const policies = listRetentionPolicies(tenantId);
    return reply.send({ ok: true, policies, count: policies.length });
  });

  server.get("/data-rights/retention-policies/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const policy = getRetentionPolicy(id);
    if (!policy) return reply.code(404).send({ ok: false, error: "Policy not found" });
    return reply.send({ ok: true, policy });
  });

  server.patch("/data-rights/retention-policies/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.actor) return reply.code(400).send({ ok: false, error: "actor required" });
    const policy = updateRetentionPolicy(id, {
      retentionDays: body.retentionDays as number | undefined,
      action: body.action as RetentionAction | undefined,
      description: body.description as string | undefined,
    }, body.actor as string);
    if (!policy) return reply.code(404).send({ ok: false, error: "Policy not found" });
    return reply.send({ ok: true, policy });
  });

  server.delete("/data-rights/retention-policies/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const q = request.query as Record<string, string>;
    if (!q.actor) return reply.code(400).send({ ok: false, error: "actor query param required" });
    const ok = deleteRetentionPolicy(id, q.actor);
    if (!ok) return reply.code(404).send({ ok: false, error: "Policy not found" });
    return reply.send({ ok: true });
  });

  /* ============================================================= */
  /* Deletion Requests                                              */
  /* ============================================================= */

  server.post("/data-rights/deletion-requests", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.requestedBy || !body.dataClass || !body.subjectId || !body.reason) {
      return reply.code(400).send({ ok: false, error: "requestedBy, dataClass, subjectId, reason required" });
    }
    const req = createDeletionRequest(tenantId, {
      requestedBy: body.requestedBy as string,
      dataClass: body.dataClass as DataClass,
      subjectId: body.subjectId as string,
      reason: body.reason as string,
    });
    return reply.code(201).send({ ok: true, deletionRequest: req });
  });

  server.get("/data-rights/deletion-requests", async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as Record<string, string>;
    const reqs = listDeletionRequests(tenantId, q.status as DeletionStatus | undefined);
    return reply.send({ ok: true, deletionRequests: reqs, count: reqs.length });
  });

  server.get("/data-rights/deletion-requests/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const req = getDeletionRequest(id);
    if (!req) return reply.code(404).send({ ok: false, error: "Deletion request not found" });
    return reply.send({ ok: true, deletionRequest: req });
  });

  server.post("/data-rights/deletion-requests/:id/approve", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.approvedBy) return reply.code(400).send({ ok: false, error: "approvedBy required" });
    const req = approveDeletionRequest(id, body.approvedBy as string);
    if (!req) return reply.code(400).send({ ok: false, error: "Cannot approve deletion request" });
    return reply.send({ ok: true, deletionRequest: req });
  });

  server.post("/data-rights/deletion-requests/:id/reject", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.rejectedBy || !body.reason) return reply.code(400).send({ ok: false, error: "rejectedBy, reason required" });
    const req = rejectDeletionRequest(id, body.rejectedBy as string, body.reason as string);
    if (!req) return reply.code(400).send({ ok: false, error: "Cannot reject deletion request" });
    return reply.send({ ok: true, deletionRequest: req });
  });

  server.post("/data-rights/deletion-requests/:id/execute", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.executor) return reply.code(400).send({ ok: false, error: "executor required" });
    const req = executeDeletionRequest(id, body.executor as string);
    if (!req) return reply.code(400).send({ ok: false, error: "Cannot execute deletion request" });
    return reply.send({ ok: true, deletionRequest: req });
  });

  server.post("/data-rights/deletion-requests/:id/verify", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.verifier) return reply.code(400).send({ ok: false, error: "verifier required" });
    const req = verifyDeletionRequest(id, body.verifier as string);
    if (!req) return reply.code(400).send({ ok: false, error: "Cannot verify deletion request" });
    return reply.send({ ok: true, deletionRequest: req });
  });

  /* ============================================================= */
  /* Legal Holds                                                    */
  /* ============================================================= */

  server.post("/data-rights/legal-holds", async (request, reply) => {
    const tenantId = getTenantId(request);
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.caseReference || !body.dataClasses || !body.reason || !body.createdBy) {
      return reply.code(400).send({ ok: false, error: "caseReference, dataClasses, reason, createdBy required" });
    }
    const hold = createLegalHold(tenantId, {
      caseReference: body.caseReference as string,
      dataClasses: body.dataClasses as DataClass[],
      subjectIds: body.subjectIds as string[] | undefined,
      reason: body.reason as string,
      createdBy: body.createdBy as string,
      expiresAt: body.expiresAt as string | undefined,
    });
    return reply.code(201).send({ ok: true, legalHold: hold });
  });

  server.get("/data-rights/legal-holds", async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as Record<string, string>;
    const holds = listLegalHolds(tenantId, q.status as LegalHoldStatus | undefined);
    return reply.send({ ok: true, legalHolds: holds, count: holds.length });
  });

  server.get("/data-rights/legal-holds/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const hold = getLegalHold(id);
    if (!hold) return reply.code(404).send({ ok: false, error: "Legal hold not found" });
    return reply.send({ ok: true, legalHold: hold });
  });

  server.post("/data-rights/legal-holds/:id/release", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) || {};
    if (!body.releasedBy) return reply.code(400).send({ ok: false, error: "releasedBy required" });
    const hold = releaseLegalHold(id, body.releasedBy as string);
    if (!hold) return reply.code(400).send({ ok: false, error: "Cannot release legal hold" });
    return reply.send({ ok: true, legalHold: hold });
  });

  /* ============================================================= */
  /* Audit Trail                                                    */
  /* ============================================================= */

  server.get("/data-rights/audit", async (request, reply) => {
    const tenantId = getTenantId(request);
    const q = request.query as Record<string, string>;
    const limit = parseInt(q.limit || "100", 10);
    const entries = getDataRightsAudit(tenantId, limit);
    return reply.send({ ok: true, entries, count: entries.length });
  });

  server.get("/data-rights/audit/verify", async (_request, reply) => {
    const result = verifyDataRightsAuditChain();
    return reply.send({ ok: true, chain: result });
  });

  /* ============================================================= */
  /* Summary                                                        */
  /* ============================================================= */

  server.get("/data-rights/summary", async (request, reply) => {
    const tenantId = getTenantId(request);
    const summary = getDataRightsSummary(tenantId);
    return reply.send({ ok: true, summary });
  });
}
