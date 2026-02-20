/**
 * migration-routes.ts -- Migration REST Endpoints (Phase 50)
 *
 * Admin-only migration console API:
 *   - Job lifecycle (create, validate, dry-run, import, export, rollback)
 *   - Template management (list, get, create, delete)
 *   - Health + stats
 *
 * All endpoints require session + migration:admin permission.
 * Audit trail entries for every mutation.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { requirePermission } from "../auth/rbac.js";
import { immutableAudit } from "../lib/immutable-audit.js";
import { log } from "../lib/logger.js";
import {
  createJob,
  getJob,
  listJobs,
  deleteJob,
  updateJob,
  transitionJob,
  listTemplates,
  getTemplate,
  registerTemplate,
  deleteTemplate,
  getRollbackPlan,
  getMigrationStats,
} from "./migration-store.js";
import { runValidation, runDryRun, runImport } from "./import-pipeline.js";
import { runExport, type ExportOptions } from "./export-pipeline.js";
import { registerBuiltinTemplates } from "./templates.js";
import type { MappingTemplate, ImportEntityType, SourceFormat, ExportBundleType } from "./types.js";

/* ------------------------------------------------------------------ */
/* Init                                                                */
/* ------------------------------------------------------------------ */

let initialized = false;

function ensureInit() {
  if (!initialized) {
    registerBuiltinTemplates();
    initialized = true;
  }
}

/* ------------------------------------------------------------------ */
/* Helper: audit migration actions                                     */
/* ------------------------------------------------------------------ */

function auditMigration(
  action: string,
  outcome: "success" | "failure" | "denied",
  session: any,
  detail?: Record<string, unknown>,
) {
  immutableAudit(action as any, outcome, {
    sub: session.duz,
    name: session.userName,
    roles: [session.role],
  }, { detail });
}

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function migrationRoutes(server: FastifyInstance) {
  ensureInit();

  // ---- Health / Stats ----

  server.get("/migration/health", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:read", reply);
    const stats = getMigrationStats();
    return { ok: true, ...stats };
  });

  server.get("/migration/stats", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:read", reply);
    return { ok: true, ...getMigrationStats() };
  });

  // ---- Template management ----

  server.get("/migration/templates", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:read", reply);
    return { ok: true, templates: listTemplates() };
  });

  server.get("/migration/templates/:id", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:read", reply);
    const { id } = request.params as { id: string };
    const tpl = getTemplate(id);
    if (!tpl) { reply.code(404).send({ ok: false, error: "Template not found" }); return; }
    return { ok: true, template: tpl };
  });

  server.post("/migration/templates", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:admin", reply);
    const body = (request.body as any) || {};
    if (!body.id || !body.name || !body.entityType || !body.fields) {
      reply.code(400).send({ ok: false, error: "Missing required fields: id, name, entityType, fields" });
      return;
    }
    registerTemplate(body as MappingTemplate);
    auditMigration("system.config-change", "success", session, { action: "template.created", templateId: body.id });
    return { ok: true, templateId: body.id };
  });

  server.delete("/migration/templates/:id", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:admin", reply);
    const { id } = request.params as { id: string };
    const deleted = deleteTemplate(id);
    if (!deleted) { reply.code(404).send({ ok: false, error: "Template not found" }); return; }
    auditMigration("system.config-change", "success", session, { action: "template.deleted", templateId: id });
    return { ok: true };
  });

  // ---- Job lifecycle ----

  server.get("/migration/jobs", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:read", reply);
    const q = request.query as any;
    const jobs = listJobs({
      direction: q.direction,
      status: q.status,
      entityType: q.entityType,
    });
    // Strip rawData from list view (can be large)
    const stripped = jobs.map(({ rawData, ...rest }) => rest);
    return { ok: true, jobs: stripped, total: stripped.length };
  });

  server.get("/migration/jobs/:id", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:read", reply);
    const { id } = request.params as { id: string };
    const job = getJob(id);
    if (!job) { reply.code(404).send({ ok: false, error: "Job not found" }); return; }
    // Return job without rawData (too large for JSON response)
    const { rawData, ...rest } = job;
    return { ok: true, job: { ...rest, hasRawData: !!rawData } };
  });

  server.post("/migration/jobs/import", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:admin", reply);
    const body = (request.body as any) || {};

    if (!body.entityType) {
      reply.code(400).send({ ok: false, error: "entityType is required" });
      return;
    }

    const job = createJob({
      direction: "import",
      entityType: body.entityType as ImportEntityType,
      sourceFormat: (body.sourceFormat as SourceFormat) ?? "generic-csv",
      templateId: body.templateId,
      createdBy: session.duz,
      createdByName: session.userName,
      fileName: body.fileName,
      rawData: body.data,
    });

    if (body.mappingOverrides) {
      updateJob(job.id, { mappingOverrides: body.mappingOverrides });
    }

    auditMigration("system.config-change", "success", session, {
      action: "import.job.created",
      jobId: job.id,
      entityType: body.entityType,
    });

    return { ok: true, jobId: job.id, status: job.status };
  });

  server.post("/migration/jobs/export", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:admin", reply);
    const body = (request.body as any) || {};

    if (!body.bundleType) {
      reply.code(400).send({ ok: false, error: "bundleType is required (patient-summary, audit-export, clinical-data)" });
      return;
    }

    const job = createJob({
      direction: "export",
      bundleType: body.bundleType as ExportBundleType,
      createdBy: session.duz,
      createdByName: session.userName,
    });

    // Auto-transition to validated for export jobs (no CSV to validate)
    transitionJob(job.id, "validating");
    transitionJob(job.id, "validated");

    auditMigration("audit.export", "success", session, {
      action: "export.job.created",
      jobId: job.id,
      bundleType: body.bundleType,
    });

    return { ok: true, jobId: job.id, status: "validated" };
  });

  // ---- Pipeline actions ----

  server.post("/migration/jobs/:id/validate", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:admin", reply);
    const { id } = request.params as { id: string };

    const result = runValidation(id);
    auditMigration("system.config-change", result.ok ? "success" : "failure", session, {
      action: "import.validate",
      jobId: id,
      valid: result.validation?.valid,
    });

    if (!result.ok) {
      reply.code(400).send({ ok: false, error: result.error });
      return;
    }

    return { ok: true, validation: result.validation };
  });

  server.post("/migration/jobs/:id/dry-run", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:admin", reply);
    const { id } = request.params as { id: string };

    const result = runDryRun(id);
    auditMigration("system.config-change", result.ok ? "success" : "failure", session, {
      action: "import.dry-run",
      jobId: id,
    });

    if (!result.ok) {
      reply.code(400).send({ ok: false, error: result.error });
      return;
    }

    return { ok: true, dryRun: result.dryRun };
  });

  server.post("/migration/jobs/:id/run", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:admin", reply);
    const { id } = request.params as { id: string };

    const job = getJob(id);
    if (!job) { reply.code(404).send({ ok: false, error: "Job not found" }); return; }

    if (job.direction === "export") {
      const body = (request.body as any) || {};
      const opts: ExportOptions = {
        dfn: body.dfn,
        encrypt: body.encrypt,
        format: body.format,
        startDate: body.startDate,
        endDate: body.endDate,
        actions: body.actions,
        includeAllergies: body.includeAllergies,
        includeProblems: body.includeProblems,
        includeMedications: body.includeMedications,
        includeNotes: body.includeNotes,
        includeVitals: body.includeVitals,
      };

      const result = runExport(id, opts);
      auditMigration("audit.export", result.ok ? "success" : "failure", session, {
        action: "export.run",
        jobId: id,
        bundleType: job.bundleType,
        encrypted: opts.encrypt,
      });

      if (!result.ok) {
        reply.code(400).send({ ok: false, error: result.error });
        return;
      }

      return { ok: true, result: result.result };
    }

    // Import
    const result = runImport(id);
    auditMigration("system.config-change", result.ok ? "success" : "failure", session, {
      action: "import.run",
      jobId: id,
      entityType: job.entityType,
      successCount: result.result?.successCount,
    });

    if (!result.ok) {
      reply.code(400).send({ ok: false, error: result.error });
      return;
    }

    return { ok: true, result: result.result };
  });

  // ---- Rollback ----

  server.get("/migration/jobs/:id/rollback-plan", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:admin", reply);
    const { id } = request.params as { id: string };

    const plan = getRollbackPlan(id);
    if (!plan) { reply.code(404).send({ ok: false, error: "No rollback plan for this job" }); return; }
    return { ok: true, plan };
  });

  server.post("/migration/jobs/:id/rollback", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:admin", reply);
    const { id } = request.params as { id: string };

    const plan = getRollbackPlan(id);
    if (!plan || !plan.canRollback) {
      reply.code(400).send({ ok: false, error: "Rollback not available for this job" });
      return;
    }

    // In sandbox, mark job as rolled back (simulated entities don't persist)
    const t = transitionJob(id, "rolled-back");
    if (!t.ok) {
      reply.code(400).send({ ok: false, error: t.error });
      return;
    }

    auditMigration("system.config-change", "success", session, {
      action: "import.rollback",
      jobId: id,
      entitiesRolledBack: plan.createdEntities.length,
    });

    return {
      ok: true,
      rolledBack: plan.createdEntities.length,
      message: "Sandbox rollback complete (simulated entities marked rolled back)",
    };
  });

  // ---- Delete job ----

  server.delete("/migration/jobs/:id", async (request, reply) => {
    const session = requireSession(request, reply);
    requirePermission(session, "migration:admin", reply);
    const { id } = request.params as { id: string };

    const deleted = deleteJob(id);
    if (!deleted) { reply.code(404).send({ ok: false, error: "Job not found" }); return; }

    auditMigration("system.config-change", "success", session, { action: "job.deleted", jobId: id });
    return { ok: true };
  });

  log.info("Migration routes registered (Phase 50)");
}
