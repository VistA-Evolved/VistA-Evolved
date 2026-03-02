/**
 * HL7v2 Tenant Endpoint Routes — Phase 258
 *
 * Admin endpoints for managing per-tenant HL7v2 integration endpoints.
 *
 * Routes:
 *   POST /api/platform/integrations/hl7v2/endpoints     — Create endpoint
 *   GET  /api/platform/integrations/hl7v2/endpoints      — List endpoints
 *   GET  /api/platform/integrations/hl7v2/endpoints/:id  — Get endpoint
 *   PUT  /api/platform/integrations/hl7v2/endpoints/:id  — Update endpoint
 *   DELETE /api/platform/integrations/hl7v2/endpoints/:id — Delete endpoint
 */

import type { FastifyInstance } from "fastify";
import {
  createEndpoint,
  getEndpoint,
  listEndpoints,
  updateEndpoint,
  deleteEndpoint,
} from "../hl7/tenant-endpoints.js";
import type { CreateEndpointRequest } from "../hl7/tenant-endpoints.js";
import { log } from "../lib/logger.js";

export default async function hl7TenantEndpointRoutes(server: FastifyInstance): Promise<void> {

  /**
   * POST /api/platform/integrations/hl7v2/endpoints — Create a tenant endpoint.
   */
  server.post("/api/platform/integrations/hl7v2/endpoints", async (request, reply) => {
    const body = (request.body as CreateEndpointRequest) || {};
    if (!body.tenantId || !body.name || !body.direction) {
      return reply.code(400).send({
        ok: false,
        error: "tenantId, name, and direction are required",
      });
    }

    try {
      const endpoint = createEndpoint(body);
      log.info("HL7 endpoint created via API", {
        component: "hl7-admin",
        endpointId: endpoint.id,
        tenantId: endpoint.tenantId,
      });
      return reply.code(201).send({ ok: true, endpoint });
    } catch (err: any) {
      log.warn("HL7 endpoint creation failed", { error: err.message });
      return reply.code(400).send({ ok: false, error: "HL7 endpoint creation failed" });
    }
  });

  /**
   * GET /api/platform/integrations/hl7v2/endpoints — List endpoints.
   * Optional query: ?tenantId=...
   */
  server.get("/api/platform/integrations/hl7v2/endpoints", async (request, reply) => {
    const { tenantId } = (request.query as any) || {};
    const endpoints = listEndpoints(tenantId);
    return reply.send({
      ok: true,
      count: endpoints.length,
      endpoints,
    });
  });

  /**
   * GET /api/platform/integrations/hl7v2/endpoints/:id — Get endpoint.
   */
  server.get("/api/platform/integrations/hl7v2/endpoints/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const endpoint = getEndpoint(id);
    if (!endpoint) {
      return reply.code(404).send({ ok: false, error: "Endpoint not found" });
    }
    return reply.send({ ok: true, endpoint });
  });

  /**
   * PUT /api/platform/integrations/hl7v2/endpoints/:id — Update endpoint.
   */
  server.put("/api/platform/integrations/hl7v2/endpoints/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    try {
      const endpoint = updateEndpoint(id, body);
      return reply.send({ ok: true, endpoint });
    } catch (err: any) {
      log.warn("HL7 endpoint update failed", { error: err.message });
      return reply.code(404).send({ ok: false, error: "HL7 endpoint update failed" });
    }
  });

  /**
   * DELETE /api/platform/integrations/hl7v2/endpoints/:id — Delete endpoint.
   */
  server.delete("/api/platform/integrations/hl7v2/endpoints/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deleteEndpoint(id);
    if (!deleted) {
      return reply.code(404).send({ ok: false, error: "Endpoint not found" });
    }
    return reply.send({ ok: true });
  });
}
