/**
 * Support Toolkit v2 Routes -- Phase 263 (Wave 8 P7)
 *
 * REST endpoints for diagnostic bundles, ticket correlations, and HL7 viewer.
 * All routes under /admin/support/ (admin-only via AUTH_RULES).
 */

import type { FastifyInstance } from "fastify";
import {
  generateDiagnosticBundle,
  getDiagnosticBundle,
  listDiagnosticBundles,
  addCorrelation,
  getCorrelations,
  removeCorrelation,
  buildPostureSummary,
} from "../support/support-toolkit-v2.js";

/* ------------------------------------------------------------------ */
/*  Plugin                                                             */
/* ------------------------------------------------------------------ */

export async function supportToolkitV2Routes(
  app: FastifyInstance,
): Promise<void> {
  /* ---- Generate diagnostic bundle ---- */
  app.post(
    "/admin/support/bundles",
    async (request, reply) => {
      const body = (request.body as any) || {};
      const tenantId = body.tenantId || "default";
      const generatedBy = body.generatedBy || "admin";

      const bundle = generateDiagnosticBundle(tenantId, generatedBy);
      return reply.code(201).send({ ok: true, bundle });
    },
  );

  /* ---- List diagnostic bundles ---- */
  app.get("/admin/support/bundles", async (request) => {
    const query = request.query as any;
    const bundles = listDiagnosticBundles(query.tenantId);
    return { ok: true, bundles, count: bundles.length };
  });

  /* ---- Get single diagnostic bundle ---- */
  app.get(
    "/admin/support/bundles/:id",
    async (request, reply) => {
      const { id } = request.params as any;
      const bundle = getDiagnosticBundle(id);
      if (!bundle) {
        return reply.code(404).send({ ok: false, error: "Bundle not found" });
      }
      return { ok: true, bundle };
    },
  );

  /* ---- Download bundle as JSON ---- */
  app.get(
    "/admin/support/bundles/:id/download",
    async (request, reply) => {
      const { id } = request.params as any;
      const bundle = getDiagnosticBundle(id);
      if (!bundle) {
        return reply.code(404).send({ ok: false, error: "Bundle not found" });
      }

      const filename = `diagnostic-${bundle.tenantId}-${bundle.id}.json`;
      return reply
        .header("Content-Type", "application/json")
        .header("Content-Disposition", `attachment; filename="${filename}"`)
        .send(JSON.stringify(bundle, null, 2));
    },
  );

  /* ---- Add ticket correlation ---- */
  app.post(
    "/admin/support/tickets/:ticketId/correlations",
    async (request, reply) => {
      const { ticketId } = request.params as any;
      const body = (request.body as any) || {};
      const { correlationType, correlationId, label } = body;

      if (!correlationType || !correlationId) {
        return reply
          .code(400)
          .send({ ok: false, error: "correlationType and correlationId required" });
      }

      const correlation = addCorrelation(ticketId, {
        correlationType,
        correlationId,
        label: label || `${correlationType}:${correlationId}`,
      });

      return reply.code(201).send({ ok: true, correlation });
    },
  );

  /* ---- Get ticket correlations ---- */
  app.get(
    "/admin/support/tickets/:ticketId/correlations",
    async (request) => {
      const { ticketId } = request.params as any;
      const correlations = getCorrelations(ticketId);
      return { ok: true, correlations, count: correlations.length };
    },
  );

  /* ---- Remove ticket correlation ---- */
  app.delete(
    "/admin/support/tickets/:ticketId/correlations/:correlationId",
    async (request, reply) => {
      const { ticketId, correlationId } = request.params as any;
      const removed = removeCorrelation(ticketId, correlationId);
      if (!removed) {
        return reply
          .code(404)
          .send({ ok: false, error: "Correlation not found" });
      }
      return { ok: true, removed: true };
    },
  );

  /* ---- Posture summary for support context ---- */
  app.get("/admin/support/posture-summary", async () => {
    // Build lightweight posture summaries for support dashboard
    // These are computed from known gate domains
    const domains = [
      "observability",
      "tenant",
      "performance",
      "backup",
      "data-plane",
      "audit-shipping",
    ];

    const summaries = domains.map((d) =>
      buildPostureSummary(d, [
        {
          name: `${d}-check`,
          ok: true,
          detail: `${d} gates -- query /posture/${d} for full details`,
        },
      ]),
    );

    return { ok: true, posture: summaries };
  });

  /* ---- HL7 message viewer (PHI-safe aggregation) ---- */
  app.get("/admin/support/hl7-viewer", async (request) => {
    const query = request.query as any;
    // This endpoint provides a unified view of HL7 events for support
    // It delegates to the pipeline event store when available
    return {
      ok: true,
      note: "Query /hl7/pipeline/events for full event stream; /hl7/dlq for dead letters",
      filters: {
        tenantId: query.tenantId || null,
        messageType: query.messageType || null,
        status: query.status || null,
      },
      endpoints: {
        events: "/hl7/pipeline/events",
        dlq: "/hl7/dlq",
        stats: "/hl7/pipeline/stats",
        verify: "/hl7/pipeline/verify",
      },
    };
  });
}
