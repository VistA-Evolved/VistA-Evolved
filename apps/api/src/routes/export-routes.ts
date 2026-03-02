/**
 * Export v2 Routes — Phase 245: Data Exports v2
 *
 * Unified export REST API.
 *
 * Routes:
 *   GET  /admin/exports/sources   — List available export sources
 *   POST /admin/exports/jobs      — Create a new export job
 *   GET  /admin/exports/jobs      — List export jobs
 *   GET  /admin/exports/jobs/:id  — Get job detail / download
 *   GET  /admin/exports/stats     — Export engine stats
 */

import type { FastifyInstance } from "fastify";
import { requireSession, requireRole } from "../auth/auth-routes.js";
import { getSourcesSummary } from "../exports/export-sources.js";
import {
  createExportJob,
  getExportJob,
  listExportJobs,
  getExportStats,
  type CreateExportRequest,
} from "../exports/export-engine.js";
import { SUPPORTED_FORMATS, type ExportV2Format } from "../exports/export-formats.js";
import { log } from "../lib/logger.js";

export default async function exportV2Routes(server: FastifyInstance): Promise<void> {

  /* ── GET /admin/exports/sources ─────────────────────────────── */
  server.get("/admin/exports/sources", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const sources = getSourcesSummary();
    return { ok: true, sources, supportedFormats: SUPPORTED_FORMATS };
  });

  /* ── POST /admin/exports/jobs ───────────────────────────────── */
  server.post("/admin/exports/jobs", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const body = (request.body as any) || {};
    const { sourceId, format, filters } = body;

    if (!sourceId || !format) {
      return reply.code(400).send({ ok: false, error: "sourceId and format are required" });
    }

    if (!SUPPORTED_FORMATS.includes(format as ExportV2Format)) {
      return reply.code(400).send({
        ok: false,
        error: `Unsupported format: ${format}. Supported: ${SUPPORTED_FORMATS.join(", ")}`,
      });
    }

    try {
      const job = await createExportJob(
        { duz: session.duz, name: session.userName, role: session.role },
        session.tenantId || "default",
        { sourceId, format, filters } as CreateExportRequest,
      );

      // Return without data blob (use GET to download)
      const { data: _data, ...meta } = job;
      return { ok: true, job: meta };
    } catch (err: any) {
      log.warn("Export v2 creation failed", { error: err.message });
      return reply.code(400).send({ ok: false, error: "Export creation failed" });
    }
  });

  /* ── GET /admin/exports/jobs ────────────────────────────────── */
  server.get("/admin/exports/jobs", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const query = request.query as any;
    const jobs = listExportJobs({
      duz: query.mine === "true" ? session.duz : undefined,
      status: query.status,
      limit: query.limit ? Number(query.limit) : 50,
    });

    // Strip data blobs from listing
    const items = jobs.map(({ data: _d, ...rest }) => rest);
    return { ok: true, jobs: items };
  });

  /* ── GET /admin/exports/jobs/:id ────────────────────────────── */
  server.get("/admin/exports/jobs/:id", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const { id } = request.params as { id: string };
    const job = getExportJob(id);

    if (!job) {
      return reply.code(404).send({ ok: false, error: "Export job not found" });
    }

    // If ?download=true, return the raw file data
    const query = request.query as any;
    if (query.download === "true" && job.status === "completed" && job.data) {
      reply.header("Content-Type", job.mimeType || "application/octet-stream");
      reply.header(
        "Content-Disposition",
        `attachment; filename="export-${job.sourceId}-${job.id}.${job.extension || "dat"}"`,
      );
      return reply.send(job.data);
    }

    // Otherwise, return job metadata (without data blob)
    const { data: _d, ...meta } = job;
    return { ok: true, job: meta };
  });

  /* ── GET /admin/exports/stats ───────────────────────────────── */
  server.get("/admin/exports/stats", async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ["admin"], reply);

    const stats = getExportStats();
    return { ok: true, stats };
  });
}
