/**
 * apps/api/src/routes/migration-routes.ts
 *
 * Phases 456-459 (W30-P1/P2/P3/P4).
 * REST endpoints for data migration operations.
 * Admin-only access for all migration endpoints.
 */

import type { FastifyInstance } from "fastify";
import { importFhirBundle, getBatch, listBatches } from "../migration/fhir-import.js";
import { ingestCcda, getCcdaBatch, listCcdaBatches } from "../migration/ccda-ingest.js";
import { processAdtMessage, getAdtEvent, listAdtEvents } from "../migration/hl7v2-adt.js";
import { dualRunHarness } from "../migration/dual-run.js";
import type { DualRunMode } from "../migration/dual-run.js";
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

  // POST /migration/hl7v2/adt — process an HL7v2 ADT message (Phase 458)
  server.post("/migration/hl7v2/adt", async (request, reply) => {
    const bodyText = typeof request.body === "string"
      ? request.body
      : (request.body as any)?.message || "";
    if (!bodyText || !bodyText.includes("MSH|")) {
      return reply.code(400).send({ ok: false, error: "Request body must contain an HL7v2 message with MSH segment" });
    }

    const userId = (request as any).session?.duz || "system";
    const result = processAdtMessage(bodyText, userId);
    const code = result.ok ? 200 : 422;
    return reply.code(code).send(result);
  });

  // GET /migration/hl7v2/adt/events — list ADT events
  server.get("/migration/hl7v2/adt/events", async (_request, reply) => {
    const events = listAdtEvents();
    return reply.send({ ok: true, events, total: events.length });
  });

  // GET /migration/hl7v2/adt/events/:id — get single ADT event
  server.get("/migration/hl7v2/adt/events/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const event = getAdtEvent(id);
    if (!event) return reply.code(404).send({ ok: false, error: "ADT event not found" });
    return reply.send({ ok: true, event });
  });

  // ── Dual-run endpoints (Phase 459) ────────────────────────────

  // GET /migration/dual-run/status — current dual-run mode + stats
  server.get("/migration/dual-run/status", async (_request, reply) => {
    return reply.send({ ok: true, ...dualRunHarness.getStats() });
  });

  // POST /migration/dual-run/mode — set dual-run mode
  server.post("/migration/dual-run/mode", async (request, reply) => {
    const body = (request.body as any) || {};
    const mode = body.mode as DualRunMode | undefined;
    if (!mode || !["off", "shadow", "compare"].includes(mode)) {
      return reply.code(400).send({ ok: false, error: "mode must be off, shadow, or compare" });
    }
    dualRunHarness.setMode(mode);
    return reply.send({ ok: true, mode });
  });

  // GET /migration/dual-run/comparisons — recent comparison log
  server.get("/migration/dual-run/comparisons", async (request, reply) => {
    const limit = Number((request.query as any)?.limit) || 50;
    const comps = dualRunHarness.getComparisons(limit);
    return reply.send({ ok: true, comparisons: comps, total: comps.length });
  });

  // GET /migration/health — migration subsystem health
  server.get("/migration/health", async (_request, reply) => {
    const fhirBatches = listBatches();
    const ccdaBatches = listCcdaBatches();
    const adtEvts = listAdtEvents();
    const dualRun = dualRunHarness.getStats();
    return reply.send({
      ok: true,
      status: "ready",
      formats: ["fhir-r4", "ccda", "hl7v2"],
      fhirBatchCount: fhirBatches.length,
      ccdaBatchCount: ccdaBatches.length,
      adtEventCount: adtEvts.length,
      dualRunMode: dualRun.mode,
    });
  });
}
