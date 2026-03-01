/**
 * Release Train Governance Routes (Phase 371 / W20-P2)
 *
 * Admin-only endpoints for release calendar, approval workflow,
 * canary deployments, comms templates, and maintenance notifications.
 */

import type { FastifyInstance } from "fastify";
import {
  createChangeWindow,
  listChangeWindows,
  getChangeWindow,
  updateChangeWindow,
  deleteChangeWindow,
  scheduleRelease,
  listReleases,
  getRelease,
  requestApproval,
  approveRelease,
  rejectRelease,
  deployCanary,
  activateCanary,
  promoteRelease,
  completePromotion,
  rollbackRelease,
  completeRollback,
  cancelRelease,
  getApprovals,
  createCommsTemplate,
  listCommsTemplates,
  getCommsTemplate,
  updateCommsTemplate,
  deleteCommsTemplate,
  sendMaintenanceNotification,
  listNotifications,
  simulateReleaseCycle,
} from "../services/release-train-service.js";

const DEFAULT_TENANT = "default";

function getTenantId(_request: any): string {
  return DEFAULT_TENANT;
}

export default async function releaseTrainRoutes(server: FastifyInstance): Promise<void> {

  /* ── Change Windows ─────────────────────────────────────────── */

  server.post("/release-train/change-windows", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.name || !body.schedule || !body.durationMinutes) {
      return reply.code(400).send({ ok: false, error: "name, schedule, durationMinutes required" });
    }
    const w = createChangeWindow(getTenantId(request), body);
    return reply.code(201).send({ ok: true, changeWindow: w });
  });

  server.get("/release-train/change-windows", async (request) => {
    return { ok: true, changeWindows: listChangeWindows(getTenantId(request)) };
  });

  server.get("/release-train/change-windows/:id", async (request, reply) => {
    const { id } = request.params as any;
    const w = getChangeWindow(id);
    if (!w) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, changeWindow: w };
  });

  server.patch("/release-train/change-windows/:id", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const w = updateChangeWindow(id, body);
    if (!w) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, changeWindow: w };
  });

  server.delete("/release-train/change-windows/:id", async (request, reply) => {
    const { id } = request.params as any;
    if (!deleteChangeWindow(id)) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true };
  });

  /* ── Releases ───────────────────────────────────────────────── */

  server.post("/release-train/releases", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.version || !body.title || !body.requestedBy) {
      return reply.code(400).send({ ok: false, error: "version, title, requestedBy required" });
    }
    const r = scheduleRelease(getTenantId(request), body);
    return reply.code(201).send({ ok: true, release: r });
  });

  server.get("/release-train/releases", async (request) => {
    return { ok: true, releases: listReleases(getTenantId(request)) };
  });

  server.get("/release-train/releases/:id", async (request, reply) => {
    const { id } = request.params as any;
    const r = getRelease(id);
    if (!r) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, release: r };
  });

  server.post("/release-train/releases/:id/request-approval", async (request, reply) => {
    const { id } = request.params as any;
    const r = requestApproval(id);
    if (!r) return reply.code(400).send({ ok: false, error: "invalid transition" });
    return { ok: true, release: r };
  });

  server.post("/release-train/releases/:id/approve", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    if (!body.approvedBy) return reply.code(400).send({ ok: false, error: "approvedBy required" });
    const result = approveRelease(id, body.approvedBy, body.reason || "");
    if (!result) return reply.code(400).send({ ok: false, error: "invalid transition" });
    return { ok: true, release: result.release, approval: result.approval };
  });

  server.post("/release-train/releases/:id/reject", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    if (!body.rejectedBy) return reply.code(400).send({ ok: false, error: "rejectedBy required" });
    const result = rejectRelease(id, body.rejectedBy, body.reason || "");
    if (!result) return reply.code(400).send({ ok: false, error: "invalid transition" });
    return { ok: true, release: result.release, approval: result.approval };
  });

  server.post("/release-train/releases/:id/deploy-canary", async (request, reply) => {
    const { id } = request.params as any;
    const r = deployCanary(id);
    if (!r) return reply.code(400).send({ ok: false, error: "invalid transition" });
    return { ok: true, release: r };
  });

  server.post("/release-train/releases/:id/activate-canary", async (request, reply) => {
    const { id } = request.params as any;
    const r = activateCanary(id);
    if (!r) return reply.code(400).send({ ok: false, error: "invalid transition" });
    return { ok: true, release: r };
  });

  server.post("/release-train/releases/:id/promote", async (request, reply) => {
    const { id } = request.params as any;
    const r = promoteRelease(id);
    if (!r) return reply.code(400).send({ ok: false, error: "invalid transition" });
    const completed = completePromotion(id);
    return { ok: true, release: completed || r };
  });

  server.post("/release-train/releases/:id/rollback", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const r = rollbackRelease(id, body.reason || "Rollback requested");
    if (!r) return reply.code(400).send({ ok: false, error: "invalid transition" });
    const completed = completeRollback(id);
    return { ok: true, release: completed || r };
  });

  server.post("/release-train/releases/:id/cancel", async (request, reply) => {
    const { id } = request.params as any;
    const r = cancelRelease(id);
    if (!r) return reply.code(400).send({ ok: false, error: "invalid transition" });
    return { ok: true, release: r };
  });

  server.get("/release-train/releases/:id/approvals", async (request, reply) => {
    const { id } = request.params as any;
    if (!getRelease(id)) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, approvals: getApprovals(id) };
  });

  /* ── Comms Templates ────────────────────────────────────────── */

  server.post("/release-train/comms-templates", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.name || !body.channel || !body.subject || !body.body || !body.trigger) {
      return reply.code(400).send({ ok: false, error: "name, channel, subject, body, trigger required" });
    }
    const t = createCommsTemplate(getTenantId(request), body);
    return reply.code(201).send({ ok: true, template: t });
  });

  server.get("/release-train/comms-templates", async (request) => {
    return { ok: true, templates: listCommsTemplates(getTenantId(request)) };
  });

  server.get("/release-train/comms-templates/:id", async (request, reply) => {
    const { id } = request.params as any;
    const t = getCommsTemplate(id);
    if (!t) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, template: t };
  });

  server.patch("/release-train/comms-templates/:id", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const t = updateCommsTemplate(id, body);
    if (!t) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true, template: t };
  });

  server.delete("/release-train/comms-templates/:id", async (request, reply) => {
    const { id } = request.params as any;
    if (!deleteCommsTemplate(id)) return reply.code(404).send({ ok: false, error: "not found" });
    return { ok: true };
  });

  /* ── Notifications ──────────────────────────────────────────── */

  server.post("/release-train/notifications", async (request, reply) => {
    const body = (request.body as any) || {};
    if (!body.releaseId || !body.templateId) {
      return reply.code(400).send({ ok: false, error: "releaseId, templateId required" });
    }
    const n = sendMaintenanceNotification(getTenantId(request), body.releaseId, body.templateId);
    if (!n) return reply.code(400).send({ ok: false, error: "template or release not found" });
    return reply.code(201).send({ ok: true, notification: n });
  });

  server.get("/release-train/notifications", async (request) => {
    return { ok: true, notifications: listNotifications(getTenantId(request)) };
  });

  /* ── Simulation ─────────────────────────────────────────────── */

  server.post("/release-train/simulate", async (request) => {
    const body = (request.body as any) || {};
    const result = simulateReleaseCycle(
      getTenantId(request),
      body.requestedBy || "system"
    );
    return { ok: true, simulation: result };
  });
}
