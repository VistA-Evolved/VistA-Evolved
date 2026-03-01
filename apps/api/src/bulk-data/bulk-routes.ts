/**
 * Phase 404 (W23-P6): Bulk Data — Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import {
  createBulkJob, getBulkJob, listBulkJobs, cancelBulkJob, simulateJobProgress,
  getBulkDataDashboardStats,
} from "./bulk-store.js";

export default async function bulkDataRoutes(server: FastifyInstance): Promise<void> {

  // ─── Jobs ──────────────────────────────────────────────────

  server.get("/bulk-data/jobs", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return listBulkJobs(session.tenantId, { direction: qs.direction, status: qs.status });
  });

  server.get("/bulk-data/jobs/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = getBulkJob(id);
    if (!rec) return reply.code(404).send({ error: "Not found" });
    return rec;
  });

  server.post("/bulk-data/export", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    try {
      const job = createBulkJob({
        tenantId: session.tenantId,
        direction: "export",
        filter: {
          resourceTypes: body.resourceTypes,
          since: body.since,
          outputFormat: body.outputFormat || "application/fhir+ndjson",
          patientIds: body.patientIds,
        },
        requestedBy: session.duz || "unknown",
        metadata: body.metadata,
      });
      return reply.code(202).send(job);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message || "Export failed" });
    }
  });

  server.post("/bulk-data/import", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    try {
      const job = createBulkJob({
        tenantId: session.tenantId,
        direction: "import",
        filter: {
          resourceTypes: body.resourceTypes,
          outputFormat: body.outputFormat || "application/fhir+ndjson",
        },
        requestedBy: session.duz || "unknown",
        metadata: body.metadata,
      });
      return reply.code(202).send(job);
    } catch (err: any) {
      return reply.code(400).send({ error: err.message || "Import failed" });
    }
  });

  server.delete("/bulk-data/jobs/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = cancelBulkJob(id);
    if (!rec) return reply.code(404).send({ error: "Not found or already terminal" });
    return rec;
  });

  // Kick / simulate job progress (dev/sandbox use)
  server.post("/bulk-data/jobs/:id/kick", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = simulateJobProgress(id);
    if (!rec) return reply.code(404).send({ error: "Not found" });
    return rec;
  });

  // ─── Dashboard ─────────────────────────────────────────────

  server.get("/bulk-data/dashboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return getBulkDataDashboardStats(session.tenantId);
  });
}
