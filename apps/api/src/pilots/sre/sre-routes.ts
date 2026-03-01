/**
 * Phase 416 (W24-P8): SRE Routes
 *
 * REST endpoints for SLO monitoring, incident tracking, and SRE dashboard.
 * All routes under /pilots/sre/* (admin auth via /pilots/ prefix).
 */
import type { FastifyInstance } from "fastify";
import { requireSession } from "../../auth/auth-routes.js";
import {
  getAllSloSnapshots,
  getSloSnapshot,
  updateSloSnapshot,
  createIncident,
  getIncident,
  listIncidents,
  transitionIncident,
  getSreDashboard,
} from "./sre-store.js";
import type { IncidentSeverity, IncidentStatus, SloId } from "./types.js";

export default async function sreRoutes(server: FastifyInstance): Promise<void> {
  // --- SLO endpoints ---

  server.get("/pilots/sre/slos", async (request, reply) => {
    await requireSession(request, reply);
    return { ok: true, snapshots: getAllSloSnapshots() };
  });

  server.get<{ Params: { sloId: string } }>(
    "/pilots/sre/slos/:sloId",
    async (request, reply) => {
      await requireSession(request, reply);
      const snap = getSloSnapshot(request.params.sloId as SloId);
      if (!snap) return reply.code(404).send({ ok: false, error: "SLO not found" });
      return { ok: true, snapshot: snap };
    },
  );

  server.post<{ Params: { sloId: string }; Body: { currentValue: number } }>(
    "/pilots/sre/slos/:sloId/update",
    async (request, reply) => {
      await requireSession(request, reply);
      const body = (request.body as any) || {};
      if (typeof body.currentValue !== "number") {
        return reply.code(400).send({ ok: false, error: "currentValue required (number)" });
      }
      const snap = updateSloSnapshot(request.params.sloId as SloId, body.currentValue);
      return { ok: true, snapshot: snap };
    },
  );

  // --- Incident endpoints ---

  server.get("/pilots/sre/incidents", async (request, reply) => {
    await requireSession(request, reply);
    const query = request.query as any;
    return {
      ok: true,
      incidents: listIncidents({
        status: query.status as IncidentStatus | undefined,
        severity: query.severity as IncidentSeverity | undefined,
      }),
    };
  });

  server.get<{ Params: { id: string } }>(
    "/pilots/sre/incidents/:id",
    async (request, reply) => {
      await requireSession(request, reply);
      const inc = getIncident(request.params.id);
      if (!inc) return reply.code(404).send({ ok: false, error: "Incident not found" });
      return { ok: true, incident: inc };
    },
  );

  server.post("/pilots/sre/incidents", async (request, reply) => {
    await requireSession(request, reply);
    const body = (request.body as any) || {};
    if (!body.title || !body.severity || !body.description) {
      return reply.code(400).send({
        ok: false,
        error: "title, severity, and description required",
      });
    }
    const inc = createIncident({
      title: body.title,
      severity: body.severity,
      description: body.description,
      impactSummary: body.impactSummary || "",
      triggerSloId: body.triggerSloId,
      assignee: body.assignee,
    });
    return reply.code(201).send({ ok: true, incident: inc });
  });

  server.post<{ Params: { id: string } }>(
    "/pilots/sre/incidents/:id/transition",
    async (request, reply) => {
      await requireSession(request, reply);
      const body = (request.body as any) || {};
      if (!body.status || !body.author) {
        return reply.code(400).send({
          ok: false,
          error: "status and author required",
        });
      }
      const inc = transitionIncident(
        request.params.id,
        body.status,
        body.author,
        body.detail || "",
      );
      if (!inc) return reply.code(404).send({ ok: false, error: "Incident not found" });
      return { ok: true, incident: inc };
    },
  );

  // --- Dashboard ---

  server.get("/pilots/sre/dashboard", async (request, reply) => {
    await requireSession(request, reply);
    return { ok: true, dashboard: getSreDashboard() };
  });
}
