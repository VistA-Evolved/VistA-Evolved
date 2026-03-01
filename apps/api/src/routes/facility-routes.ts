/**
 * Facility / Department / Location Routes — Phase 347
 *
 * Admin-only CRUD for the multi-facility hierarchy.
 * Follows the Fastify plugin pattern used by all Wave 16+ routes.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  createFacility,
  getFacility,
  listFacilities,
  updateFacility,
  decommissionFacility,
  createDepartment,
  getDepartment,
  listDepartments,
  updateDepartment,
  decommissionDepartment,
  createLocation,
  getLocation,
  listLocations,
  updateLocation,
  decommissionLocation,
  assignProvider,
  listProviderAssignments,
  removeAssignment,
  getFacilityHierarchy,
  getVistaMappingPosture,
} from "../services/facility-service.js";

export async function facilityRoutes(server: FastifyInstance): Promise<void> {
  const tenantId = "default"; // Phase 347: single-tenant default; multi-tenant via middleware later

  // ─── Facilities ──────────────────────────────────────

  server.get("/facilities", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true, facilities: listFacilities(tenantId) });
  });

  server.get("/facilities/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const facility = getFacility(id);
    if (!facility || facility.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: "Facility not found" });
    }
    return reply.send({ ok: true, facility });
  });

  server.get("/facilities/:id/hierarchy", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const hierarchy = getFacilityHierarchy(tenantId, id);
    if (!hierarchy) {
      return reply.code(404).send({ ok: false, error: "Facility not found" });
    }
    return reply.send({ ok: true, hierarchy });
  });

  server.post("/facilities", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.name || !body.facilityType) {
      return reply.code(400).send({ ok: false, error: "name and facilityType are required" });
    }
    const facility = createFacility(tenantId, {
      name: body.name,
      facilityType: body.facilityType,
      stationNumber: body.stationNumber || null,
      vistaStationIen: body.vistaStationIen || null,
      address: body.address || null,
      city: body.city || null,
      state: body.state || null,
      postalCode: body.postalCode || null,
      country: body.country || "US",
      timezone: body.timezone || "America/New_York",
      parentFacilityId: body.parentFacilityId || null,
      status: "active",
      metadata: body.metadata || {},
    });
    return reply.code(201).send({ ok: true, facility });
  });

  server.patch("/facilities/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const updated = updateFacility(id, body);
    if (!updated) {
      return reply.code(404).send({ ok: false, error: "Facility not found" });
    }
    return reply.send({ ok: true, facility: updated });
  });

  server.delete("/facilities/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const ok = decommissionFacility(id);
    if (!ok) {
      return reply.code(404).send({ ok: false, error: "Facility not found" });
    }
    return reply.send({ ok: true, decommissioned: true });
  });

  // ─── Departments ─────────────────────────────────────

  server.get("/departments", async (req: FastifyRequest, reply: FastifyReply) => {
    const { facilityId } = (req.query as any) || {};
    return reply.send({ ok: true, departments: listDepartments(tenantId, facilityId) });
  });

  server.get("/departments/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const dept = getDepartment(id);
    if (!dept || dept.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: "Department not found" });
    }
    return reply.send({ ok: true, department: dept });
  });

  server.post("/departments", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.facilityId || !body.name || !body.departmentType || !body.code) {
      return reply.code(400).send({
        ok: false,
        error: "facilityId, name, departmentType, and code are required",
      });
    }
    const dept = createDepartment(tenantId, {
      facilityId: body.facilityId,
      name: body.name,
      departmentType: body.departmentType,
      code: body.code,
      vistaServiceIen: body.vistaServiceIen || null,
      costCenter: body.costCenter || null,
      parentDepartmentId: body.parentDepartmentId || null,
      status: "active",
      metadata: body.metadata || {},
    });
    return reply.code(201).send({ ok: true, department: dept });
  });

  server.patch("/departments/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const updated = updateDepartment(id, body);
    if (!updated) {
      return reply.code(404).send({ ok: false, error: "Department not found" });
    }
    return reply.send({ ok: true, department: updated });
  });

  server.delete("/departments/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const ok = decommissionDepartment(id);
    if (!ok) {
      return reply.code(404).send({ ok: false, error: "Department not found" });
    }
    return reply.send({ ok: true, decommissioned: true });
  });

  // ─── Locations ───────────────────────────────────────

  server.get("/locations", async (req: FastifyRequest, reply: FastifyReply) => {
    const { departmentId } = (req.query as any) || {};
    return reply.send({ ok: true, locations: listLocations(tenantId, departmentId) });
  });

  server.get("/locations/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const loc = getLocation(id);
    if (!loc || loc.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: "Location not found" });
    }
    return reply.send({ ok: true, location: loc });
  });

  server.post("/locations", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.departmentId || !body.name || !body.locationType) {
      return reply.code(400).send({
        ok: false,
        error: "departmentId, name, and locationType are required",
      });
    }
    const loc = createLocation(tenantId, {
      departmentId: body.departmentId,
      name: body.name,
      locationType: body.locationType,
      vistaLocationIen: body.vistaLocationIen || null,
      floor: body.floor || null,
      wing: body.wing || null,
      roomNumber: body.roomNumber || null,
      bedCount: body.bedCount ?? null,
      status: "active",
      metadata: body.metadata || {},
    });
    return reply.code(201).send({ ok: true, location: loc });
  });

  server.patch("/locations/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const updated = updateLocation(id, body);
    if (!updated) {
      return reply.code(404).send({ ok: false, error: "Location not found" });
    }
    return reply.send({ ok: true, location: updated });
  });

  server.delete("/locations/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const ok = decommissionLocation(id);
    if (!ok) {
      return reply.code(404).send({ ok: false, error: "Location not found" });
    }
    return reply.send({ ok: true, decommissioned: true });
  });

  // ─── Provider Facility Assignments ───────────────────

  server.get("/provider-assignments", async (req: FastifyRequest, reply: FastifyReply) => {
    const { providerId, facilityId } = (req.query as any) || {};
    return reply.send({
      ok: true,
      assignments: listProviderAssignments(tenantId, providerId, facilityId),
    });
  });

  server.post("/provider-assignments", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.providerId || !body.facilityId || !body.role) {
      return reply.code(400).send({
        ok: false,
        error: "providerId, facilityId, and role are required",
      });
    }
    const assignment = assignProvider(tenantId, {
      providerId: body.providerId,
      facilityId: body.facilityId,
      departmentId: body.departmentId || null,
      role: body.role,
      isPrimary: body.isPrimary ?? false,
      startDate: body.startDate || new Date().toISOString(),
      endDate: body.endDate || null,
      status: "active",
    });
    return reply.code(201).send({ ok: true, assignment });
  });

  server.delete("/provider-assignments/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const ok = removeAssignment(id);
    if (!ok) {
      return reply.code(404).send({ ok: false, error: "Assignment not found" });
    }
    return reply.send({ ok: true, removed: true });
  });

  // ─── VistA Mapping Posture ───────────────────────────

  server.get("/facilities/vista/mapping-posture", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true, posture: getVistaMappingPosture(tenantId) });
  });
}

export default facilityRoutes;
