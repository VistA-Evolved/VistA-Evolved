/**
 * apps/api/src/routes/migration-routes.ts
 *
 * Phase 456 (W30-P1). REST endpoints for data migration operations.
 * Admin-only access for all migration endpoints.
 */

import type { FastifyInstance } from "fastify";
import { importFhirBundle, getBatch, listBatches } from "../migration/fhir-import.js";
import type { FhirBundle } from "../migration/types.js";

export async function migrationRoutes(server: FastifyInstance) {
  // POST /migration/fhir/import — import a FHIR R4 Bundle
  server.post("/migration/fhir/import", async (request, reply) => {
    const body = (request.body as FhirBundle) || {};
    if (!body.resourceType) {
      return reply.code(400).send({ ok: false, error: "Request body must be a FHIR Bundle" });
    }

    // userId from session (admin required by AUTH_RULES)
    const userId = (request as any).session?.duz || "system";
    const result = importFhirBundle(body, userId);
    const code = result.ok ? 200 : 422;
    return reply.code(code).send(result);
  });

  // GET /migration/batches — list all import batches
  server.get("/migration/batches", async (_request, reply) => {
    const all = listBatches();
    return reply.send({ ok: true, batches: all, total: all.length });
  });

  // GET /migration/batches/:id — get single batch details
  server.get("/migration/batches/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const batch = getBatch(id);
    if (!batch) return reply.code(404).send({ ok: false, error: "Batch not found" });
    return reply.send({ ok: true, batch });
  });

  // GET /migration/health — migration subsystem health
  server.get("/migration/health", async (_request, reply) => {
    const all = listBatches();
    return reply.send({
      ok: true,
      status: "ready",
      formats: ["fhir-r4", "ccda", "hl7v2"],
      batchCount: all.length,
    });
  });
}
