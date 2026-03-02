/**
 * apps/api/src/routes/migration-routes.ts
 *
 * Phase 456 (W30-P1) + Phase 457 (W30-P2).
 * REST endpoints for data migration operations.
 * Admin-only access for all migration endpoints.
 */

import type { FastifyInstance } from "fastify";
import { importFhirBundle, getBatch, listBatches } from "../migration/fhir-import.js";
import { ingestCcda, getCcdaBatch, listCcdaBatches } from "../migration/ccda-ingest.js";
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

  // GET /migration/batches — list all import batches (FHIR + C-CDA)
  server.get("/migration/batches", async (_request, reply) => {
    const fhir = listBatches();
    const ccda = listCcdaBatches();
    const all = [...fhir, ...ccda].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
    return reply.send({ ok: true, batches: all, total: all.length });
  });

  // GET /migration/batches/:id — get single batch details
  server.get("/migration/batches/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const batch = getBatch(id) || getCcdaBatch(id);
    if (!batch) return reply.code(404).send({ ok: false, error: "Batch not found" });
    return reply.send({ ok: true, batch });
  });

  // POST /migration/ccda/import — import a C-CDA XML document (Phase 457)
  server.post("/migration/ccda/import", async (request, reply) => {
    const bodyText = typeof request.body === "string"
      ? request.body
      : JSON.stringify(request.body || "");
    if (!bodyText || !bodyText.includes("ClinicalDocument")) {
      return reply.code(400).send({ ok: false, error: "Request body must be a C-CDA XML document" });
    }

    const userId = (request as any).session?.duz || "system";
    const result = ingestCcda(bodyText, userId);
    const code = result.ok ? 200 : 422;
    return reply.code(code).send(result);
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
