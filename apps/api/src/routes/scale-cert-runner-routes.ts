/**
 * Phase 336 (W15-P10): Scale Certification Runner Routes
 *
 * REST endpoints for running certification, managing profiles/schedules,
 * viewing trends/badges, and querying the gate catalog.
 */
import { FastifyInstance } from "fastify";
import {
  runCertification,
  getCertRun,
  listCertRuns,
  getLatestCertRun,
  createCertProfile,
  listCertProfiles,
  getCertProfile,
  createCertSchedule,
  toggleCertSchedule,
  listCertSchedules,
  getCertTrends,
  getCertBadge,
  getGateCatalog,
  getCertAuditLog,
} from "../services/scale-cert-runner.js";

export default async function scaleCertRunnerRoutes(server: FastifyInstance): Promise<void> {
  const defaultTenant = "default";

  // ── Certification Runs ─────────────────────────────────────────────

  server.post("/platform/cert/run", async (req, reply) => {
    const body = (req.body as any) || {};
    const { tenantId = defaultTenant, profileId, actor = "system" } = body;
    const run = runCertification(tenantId, profileId, actor);
    return reply.code(201).send({ ok: true, run });
  });

  server.get("/platform/cert/runs", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, runs: listCertRuns(tenantId) });
  });

  server.get("/platform/cert/runs/latest", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    const run = getLatestCertRun(tenantId);
    if (!run) return reply.code(404).send({ ok: false, error: "No certification runs found" });
    return reply.send({ ok: true, run });
  });

  server.get("/platform/cert/runs/:id", async (req, reply) => {
    const { id } = req.params as any;
    const run = getCertRun(id);
    if (!run) return reply.code(404).send({ ok: false, error: "Certification run not found" });
    return reply.send({ ok: true, run });
  });

  // ── Profiles ───────────────────────────────────────────────────────

  server.get("/platform/cert/profiles", async (_req, reply) => {
    return reply.send({ ok: true, profiles: listCertProfiles() });
  });

  server.get("/platform/cert/profiles/:id", async (req, reply) => {
    const { id } = req.params as any;
    const profile = getCertProfile(id);
    if (!profile) return reply.code(404).send({ ok: false, error: "Profile not found" });
    return reply.send({ ok: true, profile });
  });

  server.post("/platform/cert/profiles", async (req, reply) => {
    const body = (req.body as any) || {};
    const { name, description = "", requiredGateIds = [], minScore = 90, warnScore = 70, actor = "system" } = body;
    if (!name) return reply.code(400).send({ ok: false, error: "name required" });
    const profile = createCertProfile(name, description, requiredGateIds, minScore, warnScore, actor);
    return reply.code(201).send({ ok: true, profile });
  });

  // ── Schedules ──────────────────────────────────────────────────────

  server.get("/platform/cert/schedules", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    return reply.send({ ok: true, schedules: listCertSchedules(tenantId) });
  });

  server.post("/platform/cert/schedules", async (req, reply) => {
    const body = (req.body as any) || {};
    const { tenantId = defaultTenant, profileId, cronExpression = "0 0 * * 0", actor = "system" } = body;
    if (!profileId) return reply.code(400).send({ ok: false, error: "profileId required" });
    const sched = createCertSchedule(tenantId, profileId, cronExpression, actor);
    return reply.code(201).send({ ok: true, schedule: sched });
  });

  server.post("/platform/cert/schedules/:id/toggle", async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { enabled = true, actor = "system" } = body;
    const sched = toggleCertSchedule(id, enabled, actor);
    if (!sched) return reply.code(404).send({ ok: false, error: "Schedule not found" });
    return reply.send({ ok: true, schedule: sched });
  });

  // ── Trends & Badge ─────────────────────────────────────────────────

  server.get("/platform/cert/trends", async (req, reply) => {
    const { tenantId = defaultTenant, limit } = req.query as any;
    const n = limit ? parseInt(limit, 10) : 20;
    return reply.send({ ok: true, trends: getCertTrends(tenantId, n) });
  });

  server.get("/platform/cert/badge", async (req, reply) => {
    const tenantId = (req.query as any)?.tenantId || defaultTenant;
    const badge = getCertBadge(tenantId);
    if (!badge) return reply.code(404).send({ ok: false, error: "No certification badge — run certification first" });
    return reply.send({ ok: true, badge });
  });

  // ── Gate Catalog ───────────────────────────────────────────────────

  server.get("/platform/cert/gates", async (_req, reply) => {
    return reply.send({ ok: true, gates: getGateCatalog() });
  });

  // ── Audit ──────────────────────────────────────────────────────────

  server.get("/platform/cert/audit", async (req, reply) => {
    const limit = parseInt((req.query as any)?.limit || "200", 10);
    return reply.send({ ok: true, entries: getCertAuditLog(limit) });
  });
}
