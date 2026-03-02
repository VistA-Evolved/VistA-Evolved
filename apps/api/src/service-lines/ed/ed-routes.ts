/**
 * apps/api/src/service-lines/ed/ed-routes.ts
 *
 * Phase 465 (W31-P2). ED whiteboard REST endpoints.
 */

import type { FastifyInstance } from "fastify";
import {
  createVisit,
  getVisit,
  listVisits,
  updateVisitStatus,
  triageVisit,
  assignBed,
  releaseBed,
  listBeds,
  disposeVisit,
  getBoardMetrics,
} from "./ed-store.js";

export default async function edRoutes(server: FastifyInstance) {
  // ── Visit CRUD ─────────────────────────────────────────────────

  server.post("/ed/visits", async (request, reply) => {
    const body = (request.body as any) || {};
    const { patientDfn, arrivalMode } = body;
    if (!patientDfn) return reply.code(400).send({ ok: false, error: "patientDfn required" });
    const visit = createVisit(patientDfn, arrivalMode || "walk-in", "system");
    return reply.code(201).send({ ok: true, visit });
  });

  server.get("/ed/visits", async (request) => {
    const { status } = request.query as any;
    return { ok: true, visits: listVisits(status || undefined) };
  });

  server.get("/ed/visits/:id", async (request, reply) => {
    const { id } = request.params as any;
    const visit = getVisit(id);
    if (!visit) return reply.code(404).send({ ok: false, error: "Visit not found" });
    return { ok: true, visit };
  });

  server.patch("/ed/visits/:id/status", async (request, reply) => {
    const { id } = request.params as any;
    const { status } = (request.body as any) || {};
    if (!status) return reply.code(400).send({ ok: false, error: "status required" });
    const ok = updateVisitStatus(id, status);
    if (!ok) return reply.code(404).send({ ok: false, error: "Visit not found" });
    return { ok: true };
  });

  // ── Triage ─────────────────────────────────────────────────────

  server.post("/ed/visits/:id/triage", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { level, chiefComplaint, triageNurse } = body;
    if (!level || !chiefComplaint) {
      return reply.code(400).send({ ok: false, error: "level and chiefComplaint required" });
    }
    const acuityMap: Record<number, string> = {
      1: "resuscitation", 2: "emergent", 3: "urgent", 4: "less-urgent", 5: "non-urgent",
    };
    const ok = triageVisit(id, {
      level,
      chiefComplaint,
      acuityCategory: (acuityMap[level] || "urgent") as any,
      triageNurse: triageNurse || "system",
      triageTime: new Date().toISOString(),
      vitalSigns: body.vitalSigns,
      notes: body.notes,
    });
    if (!ok) return reply.code(404).send({ ok: false, error: "Visit not found" });
    return { ok: true };
  });

  // ── Bed Management ─────────────────────────────────────────────

  server.get("/ed/beds", async () => {
    return { ok: true, beds: listBeds() };
  });

  server.post("/ed/visits/:id/assign-bed", async (request, reply) => {
    const { id } = request.params as any;
    const { bedId } = (request.body as any) || {};
    if (!bedId) return reply.code(400).send({ ok: false, error: "bedId required" });
    const ok = assignBed(id, bedId, "system");
    if (!ok) return reply.code(400).send({ ok: false, error: "Visit not found or bed unavailable" });
    return { ok: true };
  });

  server.post("/ed/visits/:id/release-bed", async (request, reply) => {
    const { id } = request.params as any;
    const ok = releaseBed(id);
    if (!ok) return reply.code(400).send({ ok: false, error: "Visit not found or no bed assigned" });
    return { ok: true };
  });

  // ── Disposition ────────────────────────────────────────────────

  server.post("/ed/visits/:id/disposition", async (request, reply) => {
    const { id } = request.params as any;
    const { disposition } = (request.body as any) || {};
    if (!disposition) return reply.code(400).send({ ok: false, error: "disposition required" });
    const ok = disposeVisit(id, disposition, "system");
    if (!ok) return reply.code(404).send({ ok: false, error: "Visit not found" });
    return { ok: true };
  });

  // ── Board Metrics ──────────────────────────────────────────────

  server.get("/ed/board", async () => {
    return { ok: true, metrics: getBoardMetrics() };
  });
}
