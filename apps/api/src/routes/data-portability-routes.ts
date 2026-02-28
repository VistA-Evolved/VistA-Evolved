/**
 * Data Portability Routes -- Phase 264 (Wave 8 P8)
 *
 * REST endpoints for FHIR bulk export, patient chart export, and tenant data export.
 * All routes under /admin/exports/ (admin-only via AUTH_RULES).
 */

import type { FastifyInstance } from "fastify";
import {
  kickoffBulkExport,
  getBulkExportJob,
  listBulkExportJobs,
  deleteBulkExportJob,
  generatePatientChart,
  getPatientChart,
  listPatientCharts,
  kickoffTenantExport,
  getTenantExportJob,
  listTenantExportJobs,
  verifyExportManifest,
  SUPPORTED_FHIR_RESOURCE_TYPES,
  PATIENT_CHART_SECTIONS,
  TENANT_EXPORT_SCOPES,
} from "../exports/data-portability.js";

/* ------------------------------------------------------------------ */
/*  Plugin                                                             */
/* ------------------------------------------------------------------ */

export async function dataPortabilityRoutes(
  app: FastifyInstance,
): Promise<void> {
  /* ==== FHIR Bulk Export ==== */

  /** Kick off bulk export (FHIR Bulk Data Access pattern) */
  app.post("/admin/exports/bulk/kickoff", async (request, reply) => {
    const body = (request.body as any) || {};
    const {
      level = "system",
      subjectId,
      tenantId = "default",
      resourceTypes,
      since,
    } = body;

    if (!["system", "patient", "group"].includes(level)) {
      return reply
        .code(400)
        .send({ ok: false, error: "level must be system, patient, or group" });
    }

    if ((level === "patient" || level === "group") && !subjectId) {
      return reply
        .code(400)
        .send({ ok: false, error: "subjectId required for patient/group level" });
    }

    const requestedBy = (request as any).session?.duz || "admin";
    try {
      const job = kickoffBulkExport({
        level,
        subjectId,
        tenantId,
        requestedBy,
        resourceTypes,
        since,
      });

      // Return 202 Accepted with Content-Location (FHIR Bulk Data pattern)
      return reply
        .code(202)
        .header(
          "Content-Location",
          `/admin/exports/bulk/${job.id}/status`,
        )
        .send({ ok: true, job });
    } catch (err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: "Failed to kick off bulk export",
        detail: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  /** Check bulk export status */
  app.get(
    "/admin/exports/bulk/:id/status",
    async (request, reply) => {
      const { id } = request.params as any;
      const job = getBulkExportJob(id);
      if (!job) {
        return reply.code(404).send({ ok: false, error: "Job not found" });
      }

      if (job.status === "completed") {
        return {
          ok: true,
          transactionTime: job.completedAt,
          request: `/admin/exports/bulk/kickoff`,
          requiresAccessToken: true,
          output: job.outputFiles.map((f) => ({
            type: f.resourceType,
            url: f.url,
            count: f.count,
          })),
          manifest: job.manifest,
        };
      }

      // Not complete yet — return 202
      return reply.code(202).send({
        ok: true,
        status: job.status,
        progress: job.progress,
        retryAfter: 5,
      });
    },
  );

  /** List bulk export jobs */
  app.get("/admin/exports/bulk", async (request) => {
    const query = request.query as any;
    const jobs = listBulkExportJobs(query.tenantId);
    return {
      ok: true,
      jobs,
      count: jobs.length,
      supportedTypes: [...SUPPORTED_FHIR_RESOURCE_TYPES],
    };
  });

  /** Delete bulk export job */
  app.delete("/admin/exports/bulk/:id", async (request, reply) => {
    const { id } = request.params as any;
    const deleted = deleteBulkExportJob(id);
    if (!deleted) {
      return reply.code(404).send({ ok: false, error: "Job not found" });
    }
    return { ok: true, deleted: true };
  });

  /* ==== Patient Chart Export ==== */

  /** Generate patient chart FHIR bundle */
  app.post("/admin/exports/patient-chart", async (request, reply) => {
    const body = (request.body as any) || {};
    const { patientDfn, tenantId = "default", format } = body;

    if (!patientDfn) {
      return reply
        .code(400)
        .send({ ok: false, error: "patientDfn required" });
    }

    try {
      const chart = generatePatientChart({ patientDfn, tenantId, format });
      return reply.code(201).send({ ok: true, chart });
    } catch (err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: "Failed to generate patient chart",
        detail: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  /** Get patient chart */
  app.get(
    "/admin/exports/patient-chart/:id",
    async (request, reply) => {
      const { id } = request.params as any;
      const chart = getPatientChart(id);
      if (!chart) {
        return reply.code(404).send({ ok: false, error: "Chart not found" });
      }
      return { ok: true, chart };
    },
  );

  /** List patient charts */
  app.get("/admin/exports/patient-charts", async (request) => {
    const query = request.query as any;
    const charts = listPatientCharts(query.tenantId);
    return {
      ok: true,
      charts,
      count: charts.length,
      sections: [...PATIENT_CHART_SECTIONS],
    };
  });

  /* ==== Tenant Data Export ==== */

  /** Kick off tenant data export */
  app.post("/admin/exports/tenant/kickoff", async (request, reply) => {
    const body = (request.body as any) || {};
    const { tenantId = "default", scopes, format } = body;

    const requestedBy = (request as any).session?.duz || "admin";
    try {
      const job = kickoffTenantExport({
        tenantId,
        requestedBy,
        scopes,
        format,
      });

      return reply
        .code(202)
        .header(
          "Content-Location",
          `/admin/exports/tenant/${job.id}/status`,
        )
        .send({ ok: true, job });
    } catch (err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: "Failed to kick off tenant export",
        detail: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  /** Check tenant export status */
  app.get(
    "/admin/exports/tenant/:id/status",
    async (request, reply) => {
      const { id } = request.params as any;
      const job = getTenantExportJob(id);
      if (!job) {
        return reply.code(404).send({ ok: false, error: "Job not found" });
      }

      if (job.status === "completed") {
        return {
          ok: true,
          job,
          manifest: job.manifest,
        };
      }

      return reply.code(202).send({
        ok: true,
        status: job.status,
        progress: job.progress,
        retryAfter: 5,
      });
    },
  );

  /** List tenant export jobs */
  app.get("/admin/exports/tenant", async (request) => {
    const query = request.query as any;
    const jobs = listTenantExportJobs(query.tenantId);
    return {
      ok: true,
      jobs,
      count: jobs.length,
      availableScopes: [...TENANT_EXPORT_SCOPES],
    };
  });

  /* ==== Manifest Verification ==== */

  /** Verify export manifest integrity */
  app.post("/admin/exports/verify-manifest", async (request, reply) => {
    const body = (request.body as any) || {};
    const { manifest } = body;

    if (!manifest?.manifestHash || !manifest?.files) {
      return reply
        .code(400)
        .send({ ok: false, error: "manifest with manifestHash and files required" });
    }

    try {
      const result = verifyExportManifest(manifest);
      return { ok: true, verification: result };
    } catch (err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: "Failed to verify manifest",
        detail: err instanceof Error ? err.message : "Unknown error",
      });
    }
  });

  /* ==== Capabilities summary ==== */

  app.get("/admin/exports/portability/capabilities", async () => {
    return {
      ok: true,
      capabilities: {
        bulkExport: {
          levels: ["system", "patient", "group"],
          resourceTypes: [...SUPPORTED_FHIR_RESOURCE_TYPES],
          outputFormat: "application/fhir+ndjson",
          asyncPattern: true,
        },
        patientChart: {
          formats: ["fhir-bundle", "fhir-ndjson", "summary-json"],
          sections: [...PATIENT_CHART_SECTIONS],
        },
        tenantExport: {
          scopes: [...TENANT_EXPORT_SCOPES],
          formats: ["json", "ndjson", "csv"],
          asyncPattern: true,
        },
        manifestVerification: {
          algorithm: "SHA-256",
          perFile: true,
          manifestLevel: true,
        },
      },
    };
  });
}
