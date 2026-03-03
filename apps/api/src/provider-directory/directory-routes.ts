/**
 * Phase 402 (W23-P4): Provider Directory — Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import {
  createPractitioner, getPractitioner, listPractitioners, updatePractitioner, searchPractitioners,
  createOrganization, getOrganization, listOrganizations, updateOrganization,
  createLocation, getLocation, listLocations, updateLocation,
  getDirectoryDashboardStats,
} from "./directory-store.js";

export default async function providerDirectoryRoutes(server: FastifyInstance): Promise<void> {

  // ─── Practitioner ──────────────────────────────────────────

  server.get("/provider-directory/practitioners", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return { ok: true, practitioners: listPractitioners(session.tenantId, { specialty: qs.specialty, status: qs.status, organizationId: qs.organizationId }) };
  });

  server.get("/provider-directory/practitioners/search", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return { ok: true, practitioners: searchPractitioners(session.tenantId, qs.q || "") };
  });

  server.get("/provider-directory/practitioners/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = getPractitioner(id);
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, practitioner: rec };
  });

  server.post("/provider-directory/practitioners", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    try {
      const rec = createPractitioner({
        tenantId: session.tenantId,
        npi: body.npi,
        identifiers: body.identifiers || [],
        familyName: body.familyName || "",
        givenName: body.givenName || "",
        prefix: body.prefix,
        suffix: body.suffix,
        specialty: body.specialty,
        status: body.status || "active",
        qualifications: body.qualifications || [],
        organizationIds: body.organizationIds || [],
        locationIds: body.locationIds || [],
        telecom: body.telecom || [],
        metadata: body.metadata,
      });
      return reply.code(201).send({ ok: true, practitioner: rec });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: "Create failed" });
    }
  });

  server.put("/provider-directory/practitioners/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body || {}) as Record<string, any>;
    const rec = updatePractitioner(id, { ...body, tenantId: session.tenantId });
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, practitioner: rec };
  });

  // ─── Organization ──────────────────────────────────────────

  server.get("/provider-directory/organizations", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return { ok: true, organizations: listOrganizations(session.tenantId, { type: qs.type, active: qs.active === "true" ? true : qs.active === "false" ? false : undefined }) };
  });

  server.get("/provider-directory/organizations/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = getOrganization(id);
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, organization: rec };
  });

  server.post("/provider-directory/organizations", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    try {
      const rec = createOrganization({
        tenantId: session.tenantId,
        npi: body.npi,
        name: body.name || "",
        type: body.type || "other",
        active: body.active !== false,
        alias: body.alias,
        telecom: body.telecom || [],
        address: body.address,
        parentOrganizationId: body.parentOrganizationId,
        metadata: body.metadata,
      });
      return reply.code(201).send({ ok: true, organization: rec });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: "Create failed" });
    }
  });

  server.put("/provider-directory/organizations/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body || {}) as Record<string, any>;
    const rec = updateOrganization(id, { ...body, tenantId: session.tenantId });
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, organization: rec };
  });

  // ─── Location ──────────────────────────────────────────────

  server.get("/provider-directory/locations", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return { ok: true, locations: listLocations(session.tenantId, { organizationId: qs.organizationId, status: qs.status }) };
  });

  server.get("/provider-directory/locations/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = getLocation(id);
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, location: rec };
  });

  server.post("/provider-directory/locations", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    try {
      const rec = createLocation({
        tenantId: session.tenantId,
        name: body.name || "",
        status: body.status || "active",
        organizationId: body.organizationId,
        type: body.type,
        telecom: body.telecom || [],
        address: body.address,
        position: body.position,
        metadata: body.metadata,
      });
      return reply.code(201).send({ ok: true, location: rec });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: "Create failed" });
    }
  });

  server.put("/provider-directory/locations/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body || {}) as Record<string, any>;
    const rec = updateLocation(id, { ...body, tenantId: session.tenantId });
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, location: rec };
  });

  // ─── Dashboard ─────────────────────────────────────────────

  server.get("/provider-directory/dashboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, stats: getDirectoryDashboardStats(session.tenantId) };
  });
}
