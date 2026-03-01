/**
 * Department Scheduling Routes — Phase 352
 *
 * Endpoints for department-scoped scheduling: schedule templates,
 * resource management, resource allocation, scheduling rules,
 * and cross-department referrals.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  createScheduleTemplate,
  listScheduleTemplates,
  getScheduleTemplate,
  updateScheduleTemplate,
  deleteScheduleTemplate,
  createResource,
  listResources,
  getResource,
  updateResource,
  createAllocation,
  listAllocations,
  updateAllocationStatus,
  createSchedulingRule,
  listSchedulingRules,
  evaluateSchedulingRules,
  updateSchedulingRule,
  deleteSchedulingRule,
  createReferral,
  listReferrals,
  getReferral,
  transitionReferral,
} from "../services/dept-scheduling-service.js";
import type { ResourceType, ReferralStatus } from "../services/dept-scheduling-service.js";

export async function deptSchedulingRoutes(server: FastifyInstance): Promise<void> {
  const tenantId = "default";

  // ─── Schedule Templates ────────────────────────────────

  server.get("/dept-scheduling/templates", async (req: FastifyRequest, reply: FastifyReply) => {
    const { departmentId } = (req.query as any) || {};
    return reply.send({ ok: true, templates: listScheduleTemplates(tenantId, departmentId) });
  });

  server.get("/dept-scheduling/templates/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const t = getScheduleTemplate(id);
    if (!t || t.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: "Template not found" });
    }
    return reply.send({ ok: true, template: t });
  });

  server.post("/dept-scheduling/templates", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.departmentId || !body.facilityId || !body.name || !body.effectiveFrom || !body.blocks) {
      return reply.code(400).send({
        ok: false,
        error: "departmentId, facilityId, name, effectiveFrom, and blocks are required",
      });
    }
    const t = createScheduleTemplate(tenantId, body);
    return reply.code(201).send({ ok: true, template: t });
  });

  server.patch("/dept-scheduling/templates/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const t = updateScheduleTemplate(id, body);
    if (!t) return reply.code(404).send({ ok: false, error: "Template not found" });
    return reply.send({ ok: true, template: t });
  });

  server.delete("/dept-scheduling/templates/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const deleted = deleteScheduleTemplate(id);
    if (!deleted) return reply.code(404).send({ ok: false, error: "Template not found" });
    return reply.send({ ok: true });
  });

  // ─── Resources ─────────────────────────────────────────

  server.get("/dept-scheduling/resources", async (req: FastifyRequest, reply: FastifyReply) => {
    const { departmentId, type } = (req.query as any) || {};
    return reply.send({
      ok: true,
      resources: listResources(tenantId, departmentId, type as ResourceType),
    });
  });

  server.get("/dept-scheduling/resources/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const r = getResource(id);
    if (!r || r.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: "Resource not found" });
    }
    return reply.send({ ok: true, resource: r });
  });

  server.post("/dept-scheduling/resources", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.departmentId || !body.facilityId || !body.type || !body.name) {
      return reply.code(400).send({
        ok: false,
        error: "departmentId, facilityId, type, and name are required",
      });
    }
    const r = createResource(tenantId, body);
    return reply.code(201).send({ ok: true, resource: r });
  });

  server.patch("/dept-scheduling/resources/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const r = updateResource(id, body);
    if (!r) return reply.code(404).send({ ok: false, error: "Resource not found" });
    return reply.send({ ok: true, resource: r });
  });

  // ─── Resource Allocations ──────────────────────────────

  server.get("/dept-scheduling/allocations", async (req: FastifyRequest, reply: FastifyReply) => {
    const { resourceId, departmentId, date, status } = (req.query as any) || {};
    return reply.send({
      ok: true,
      allocations: listAllocations(tenantId, { resourceId, departmentId, date, status }),
    });
  });

  server.post("/dept-scheduling/allocations", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.resourceId || !body.departmentId || !body.scheduledStart || !body.scheduledEnd || !body.allocatedBy || !body.reason) {
      return reply.code(400).send({
        ok: false,
        error: "resourceId, departmentId, scheduledStart, scheduledEnd, allocatedBy, and reason are required",
      });
    }
    const result = createAllocation(tenantId, body);
    if ("error" in result) {
      return reply.code(409).send({ ok: false, error: result.error });
    }
    return reply.code(201).send({ ok: true, allocation: result });
  });

  server.patch("/dept-scheduling/allocations/:id/status", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    if (!body.status) {
      return reply.code(400).send({ ok: false, error: "status is required" });
    }
    const alloc = updateAllocationStatus(id, body.status);
    if (!alloc) return reply.code(404).send({ ok: false, error: "Allocation not found" });
    return reply.send({ ok: true, allocation: alloc });
  });

  // ─── Scheduling Rules ──────────────────────────────────

  server.get("/dept-scheduling/rules", async (req: FastifyRequest, reply: FastifyReply) => {
    const { departmentId } = (req.query as any) || {};
    return reply.send({ ok: true, rules: listSchedulingRules(tenantId, departmentId) });
  });

  server.post("/dept-scheduling/rules", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.departmentId || !body.facilityId || !body.name || !body.condition || !body.action) {
      return reply.code(400).send({
        ok: false,
        error: "departmentId, facilityId, name, condition, and action are required",
      });
    }
    const rule = createSchedulingRule(tenantId, body);
    return reply.code(201).send({ ok: true, rule });
  });

  server.post("/dept-scheduling/rules/evaluate", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.departmentId) {
      return reply.code(400).send({ ok: false, error: "departmentId is required" });
    }
    const result = evaluateSchedulingRules(tenantId, body.departmentId, body);
    return reply.send({ ok: true, ...result });
  });

  server.patch("/dept-scheduling/rules/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const r = updateSchedulingRule(id, body);
    if (!r) return reply.code(404).send({ ok: false, error: "Rule not found" });
    return reply.send({ ok: true, rule: r });
  });

  server.delete("/dept-scheduling/rules/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const deleted = deleteSchedulingRule(id);
    if (!deleted) return reply.code(404).send({ ok: false, error: "Rule not found" });
    return reply.send({ ok: true });
  });

  // ─── Cross-Department Referrals ────────────────────────

  server.get("/dept-scheduling/referrals", async (req: FastifyRequest, reply: FastifyReply) => {
    const { fromDepartmentId, toDepartmentId, status, urgency } = (req.query as any) || {};
    return reply.send({
      ok: true,
      referrals: listReferrals(tenantId, {
        fromDepartmentId,
        toDepartmentId,
        status: status as ReferralStatus,
        urgency,
      }),
    });
  });

  server.get("/dept-scheduling/referrals/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const r = getReferral(id);
    if (!r || r.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: "Referral not found" });
    }
    return reply.send({ ok: true, referral: r });
  });

  server.post("/dept-scheduling/referrals", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.fromDepartmentId || !body.toDepartmentId || !body.fromFacilityId || !body.toFacilityId || !body.patientDfn || !body.referredBy || !body.reason) {
      return reply.code(400).send({
        ok: false,
        error: "fromDepartmentId, toDepartmentId, fromFacilityId, toFacilityId, patientDfn, referredBy, and reason are required",
      });
    }
    const ref = createReferral(tenantId, body);
    return reply.code(201).send({ ok: true, referral: ref });
  });

  server.post("/dept-scheduling/referrals/:id/transition", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    if (!body.status) {
      return reply.code(400).send({ ok: false, error: "status is required" });
    }
    const result = transitionReferral(id, body.status, body.appointmentRef);
    if ("error" in result) {
      return reply.code(422).send({ ok: false, error: result.error });
    }
    return reply.send({ ok: true, referral: result });
  });

  // ─── Health ────────────────────────────────────────────

  server.get("/dept-scheduling/health", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      ok: true,
      phase: 352,
      stores: {
        templates: listScheduleTemplates(tenantId).length,
        resources: listResources(tenantId).length,
        allocations: listAllocations(tenantId).length,
        rules: listSchedulingRules(tenantId).length,
        referrals: listReferrals(tenantId).length,
      },
    });
  });
}

export default deptSchedulingRoutes;
