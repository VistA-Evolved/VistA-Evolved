/**
 * scale-performance-routes.ts -- Scale Performance Campaign REST endpoints
 *
 * Phase 334 (W15-P8)
 *
 * 20 endpoints under /platform/perf/
 */

import { FastifyInstance } from "fastify";
import {
  createProfile,
  getProfile,
  listProfiles,
  startRun,
  completeRun,
  cancelRun,
  getRun,
  listRuns,
  listRegressions,
  defineSlo,
  evaluateSlo,
  getSlo,
  listSlos,
  createCampaign,
  updateCampaignStatus,
  getCampaign,
  listCampaigns,
  getPerformanceSummary,
  getPerformanceAuditLog,
} from "../services/scale-performance.js";

export default async function scalePerformanceRoutes(server: FastifyInstance): Promise<void> {

  // ── Load Test Profiles ──────────────────────────────────────────

  /** POST /platform/perf/profiles — create a load test profile */
  server.post("/platform/perf/profiles", async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.name || !Array.isArray(b.targetRegions) || !Array.isArray(b.endpoints)) {
      return reply.code(400).send({ ok: false, error: "name, targetRegions[], endpoints[] required" });
    }
    const profile = createProfile(b, "admin");
    return reply.code(201).send({ ok: true, profile });
  });

  /** GET /platform/perf/profiles/:id — get a profile */
  server.get("/platform/perf/profiles/:id", async (request, reply) => {
    const { id } = request.params as any;
    const profile = getProfile(id);
    if (!profile) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, profile };
  });

  /** GET /platform/perf/profiles — list profiles */
  server.get("/platform/perf/profiles", async () => {
    const profiles = listProfiles();
    return { ok: true, count: profiles.length, profiles };
  });

  // ── Load Test Runs ──────────────────────────────────────────────

  /** POST /platform/perf/runs — start a load test run */
  server.post("/platform/perf/runs", async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.profileId || !b.region) {
      return reply.code(400).send({ ok: false, error: "profileId, region required" });
    }
    try {
      const run = startRun(b.profileId, b.region, "admin");
      return reply.code(201).send({ ok: true, run });
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** POST /platform/perf/runs/:id/complete — submit results for a run */
  server.post("/platform/perf/runs/:id/complete", async (request, reply) => {
    const { id } = request.params as any;
    const b = (request.body as any) || {};
    if (!b.results) return reply.code(400).send({ ok: false, error: "results required" });
    try {
      const run = completeRun(id, b.results, "admin");
      return { ok: true, run };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** POST /platform/perf/runs/:id/cancel — cancel a running test */
  server.post("/platform/perf/runs/:id/cancel", async (request, reply) => {
    const { id } = request.params as any;
    try {
      const run = cancelRun(id, "admin");
      return { ok: true, run };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** GET /platform/perf/runs/:id — get a run */
  server.get("/platform/perf/runs/:id", async (request, reply) => {
    const { id } = request.params as any;
    const run = getRun(id);
    if (!run) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, run };
  });

  /** GET /platform/perf/runs — list runs */
  server.get("/platform/perf/runs", async (request) => {
    const q = request.query as any;
    const runs = listRuns({
      profileId: q.profileId,
      status: q.status,
      region: q.region,
    }, q.limit ? parseInt(q.limit, 10) : 50);
    return { ok: true, count: runs.length, runs };
  });

  // ── Regressions ─────────────────────────────────────────────────

  /** GET /platform/perf/regressions — list detected regressions */
  server.get("/platform/perf/regressions", async (request) => {
    const q = request.query as any;
    const regressions = listRegressions({ runId: q.runId, severity: q.severity }, q.limit ? parseInt(q.limit, 10) : 100);
    return { ok: true, count: regressions.length, regressions };
  });

  // ── SLO Management ──────────────────────────────────────────────

  /** POST /platform/perf/slos — define an SLO */
  server.post("/platform/perf/slos", async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.name || !b.service || !b.metric || b.target === undefined || !b.unit) {
      return reply.code(400).send({ ok: false, error: "name, service, metric, target, unit required" });
    }
    const slo = defineSlo(b, "admin");
    return reply.code(201).send({ ok: true, slo });
  });

  /** POST /platform/perf/slos/:id/evaluate — evaluate an SLO with current value */
  server.post("/platform/perf/slos/:id/evaluate", async (request, reply) => {
    const { id } = request.params as any;
    const b = (request.body as any) || {};
    if (b.currentValue === undefined) {
      return reply.code(400).send({ ok: false, error: "currentValue required" });
    }
    try {
      const slo = evaluateSlo(id, b.currentValue);
      return { ok: true, slo };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** GET /platform/perf/slos/:id — get an SLO */
  server.get("/platform/perf/slos/:id", async (request, reply) => {
    const { id } = request.params as any;
    const slo = getSlo(id);
    if (!slo) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, slo };
  });

  /** GET /platform/perf/slos — list SLOs */
  server.get("/platform/perf/slos", async (request) => {
    const q = request.query as any;
    const slos = listSlos({ service: q.service, status: q.status });
    return { ok: true, count: slos.length, slos };
  });

  // ── Campaigns ───────────────────────────────────────────────────

  /** POST /platform/perf/campaigns — create a performance campaign */
  server.post("/platform/perf/campaigns", async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.name || !b.startDate) {
      return reply.code(400).send({ ok: false, error: "name, startDate required" });
    }
    const campaign = createCampaign(b, "admin");
    return reply.code(201).send({ ok: true, campaign });
  });

  /** PUT /platform/perf/campaigns/:id/status — update campaign status */
  server.put("/platform/perf/campaigns/:id/status", async (request, reply) => {
    const { id } = request.params as any;
    const b = (request.body as any) || {};
    if (!b.status) return reply.code(400).send({ ok: false, error: "status required" });
    try {
      const campaign = updateCampaignStatus(id, b.status, "admin");
      return { ok: true, campaign };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** GET /platform/perf/campaigns/:id — get a campaign */
  server.get("/platform/perf/campaigns/:id", async (request, reply) => {
    const { id } = request.params as any;
    const campaign = getCampaign(id);
    if (!campaign) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, campaign };
  });

  /** GET /platform/perf/campaigns — list campaigns */
  server.get("/platform/perf/campaigns", async () => {
    const campaigns = listCampaigns();
    return { ok: true, count: campaigns.length, campaigns };
  });

  // ── Summary + Audit ─────────────────────────────────────────────

  /** GET /platform/perf/summary — performance summary */
  server.get("/platform/perf/summary", async () => {
    return { ok: true, summary: getPerformanceSummary() };
  });

  /** GET /platform/perf/audit — performance audit log */
  server.get("/platform/perf/audit", async (request) => {
    const q = request.query as any;
    const limit = q.limit ? parseInt(q.limit, 10) : 100;
    const offset = q.offset ? parseInt(q.offset, 10) : 0;
    const entries = getPerformanceAuditLog(limit, offset);
    return { ok: true, count: entries.length, entries };
  });
}
