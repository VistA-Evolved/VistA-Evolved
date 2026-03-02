/**
 * apps/api/src/routes/dashboard-routes.ts
 *
 * Phase 453 (W29-P7). REST endpoints for Dashboard/Rules Engine.
 * Session auth required (via AUTH_RULES catch-all for /dashboard/*).
 */

import type { FastifyInstance } from "fastify";
import { getDashboardAdapter } from "../adapters/dashboard/index.js";

export async function dashboardRoutes(server: FastifyInstance) {
  // GET /dashboard/rules — list all clinical rules
  server.get("/dashboard/rules", async (_request, reply) => {
    const adapter = getDashboardAdapter();
    const result = await adapter.getRules();
    return reply.send(result);
  });

  // GET /dashboard/rules/evaluate?dfn=3 — evaluate rules for patient
  server.get("/dashboard/rules/evaluate", async (request, reply) => {
    const { dfn } = request.query as { dfn?: string };
    if (!dfn) return reply.code(400).send({ ok: false, error: "dfn required" });
    const adapter = getDashboardAdapter();
    const result = await adapter.evaluateRules(dfn);
    return reply.send(result);
  });

  // GET /dashboard/alerts?dfn=3 — get alerts for patient
  server.get("/dashboard/alerts", async (request, reply) => {
    const { dfn } = request.query as { dfn?: string };
    if (!dfn) return reply.code(400).send({ ok: false, error: "dfn required" });
    const adapter = getDashboardAdapter();
    const result = await adapter.getAlerts(dfn);
    return reply.send(result);
  });

  // GET /dashboard/patient-lists — list patient lists
  server.get("/dashboard/patient-lists", async (_request, reply) => {
    const adapter = getDashboardAdapter();
    const result = await adapter.getPatientLists();
    return reply.send(result);
  });

  // GET /dashboard/health — dashboard service health
  server.get("/dashboard/health", async (_request, reply) => {
    const adapter = getDashboardAdapter();
    const health = await adapter.health();
    return reply.send(health);
  });
}
