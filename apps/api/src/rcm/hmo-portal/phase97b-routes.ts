/**
 * Phase 97B Routes — PH HMO Deepening Pack v2
 *
 * Routes for:
 *   - HMO adapter manifest (all 27 IC HMOs)
 *   - LOA templates (per-HMO LOA config)
 *   - Claim packet configs (per-HMO claim packet config)
 *   - Contracting hub (task management)
 *   - PH market dashboard (summary)
 *
 * All routes require session auth (caught by /rcm/* AUTH_RULES pattern).
 */

import type { FastifyInstance } from "fastify";
import { generateHmoManifest, getHmoManifestEntry } from "./adapter-manifest.js";
import { getLoaTemplate, listLoaTemplates, getSpecialtyFields } from "./loa-templates.js";
import { getClaimPacketConfig, listClaimPacketConfigs, getVistaAnnotations } from "./claim-packet-config.js";
import {
  initContractingTasks,
  getContractingSummary,
  getContractingDashboard,
  updateContractingTask,
  getContractingTask,
} from "./contracting-hub.js";
import { generateMarketSummary } from "./market-dashboard.js";

export default async function phase97bRoutes(server: FastifyInstance): Promise<void> {

  /* ── Adapter Manifest ─────────────────────────────────────── */

  server.get("/rcm/hmo/manifest", async (_request, reply) => {
    const manifest = await generateHmoManifest();
    return reply.send({ ok: true, manifest });
  });

  server.get("/rcm/hmo/manifest/:payerId", async (request, reply) => {
    const { payerId } = request.params as { payerId: string };
    const entry = await getHmoManifestEntry(payerId);
    if (!entry) {
      return reply.status(404).send({ ok: false, error: `HMO not found: ${payerId}` });
    }
    return reply.send({ ok: true, entry });
  });

  /* ── LOA Templates ────────────────────────────────────────── */

  server.get("/rcm/hmo/loa-templates", async (_request, reply) => {
    const templates = listLoaTemplates();
    return reply.send({ ok: true, count: templates.length, templates });
  });

  server.get("/rcm/hmo/loa-templates/:payerId", async (request, reply) => {
    const { payerId } = request.params as { payerId: string };
    const template = getLoaTemplate(payerId);
    if (!template) {
      return reply.status(404).send({ ok: false, error: `LOA template not found: ${payerId}` });
    }
    return reply.send({ ok: true, template });
  });

  server.get("/rcm/hmo/loa-templates/:payerId/specialty/:specialty", async (request, reply) => {
    const { payerId, specialty } = request.params as { payerId: string; specialty: string };
    const fields = getSpecialtyFields(payerId, specialty);
    if (!fields) {
      return reply.status(404).send({ ok: false, error: `Specialty config not found: ${payerId}/${specialty}` });
    }
    return reply.send({ ok: true, ...fields });
  });

  /* ── Claim Packet Configs ─────────────────────────────────── */

  server.get("/rcm/hmo/claim-configs", async (_request, reply) => {
    const configs = listClaimPacketConfigs();
    return reply.send({ ok: true, count: configs.length, configs });
  });

  server.get("/rcm/hmo/claim-configs/:payerId", async (request, reply) => {
    const { payerId } = request.params as { payerId: string };
    const config = getClaimPacketConfig(payerId);
    if (!config) {
      return reply.status(404).send({ ok: false, error: `Claim config not found: ${payerId}` });
    }
    return reply.send({ ok: true, config });
  });

  server.get("/rcm/hmo/claim-configs/:payerId/vista-annotations", async (request, reply) => {
    const { payerId } = request.params as { payerId: string };
    const annotations = getVistaAnnotations(payerId);
    return reply.send({ ok: true, payerId, annotations });
  });

  /* ── Contracting Hub ──────────────────────────────────────── */

  server.get("/rcm/hmo/contracting", async (request, reply) => {
    const { tenantId } = (request.query as any) || {};
    const dashboard = await getContractingDashboard(tenantId);
    return reply.send({ ok: true, dashboard });
  });

  server.get("/rcm/hmo/contracting/:payerId", async (request, reply) => {
    const { payerId } = request.params as { payerId: string };
    const { tenantId } = (request.query as any) || {};
    const summary = await getContractingSummary(payerId, payerId, tenantId);
    return reply.send({ ok: true, summary });
  });

  server.post("/rcm/hmo/contracting/:payerId/init", async (request, reply) => {
    const { payerId } = request.params as { payerId: string };
    const body = (request.body as any) || {};
    const { tenantId, actor } = body;
    const result = await initContractingTasks(payerId, payerId, tenantId, actor);
    return reply.send({ ok: true, ...result });
  });

  server.patch("/rcm/hmo/contracting/tasks/:taskId", async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const body = (request.body as any) || {};
    const { status, reason, actor } = body;

    if (!status || !reason) {
      return reply.status(400).send({ ok: false, error: "status and reason are required" });
    }

    const validStatuses = ["open", "in_progress", "blocked", "done"];
    if (!validStatuses.includes(status)) {
      return reply.status(400).send({ ok: false, error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` });
    }

    const task = await updateContractingTask(taskId, status, reason, actor);
    if (!task) {
      return reply.status(404).send({ ok: false, error: `Task not found: ${taskId}` });
    }
    return reply.send({ ok: true, task });
  });

  server.get("/rcm/hmo/contracting/tasks/:taskId", async (request, reply) => {
    const { taskId } = request.params as { taskId: string };
    const task = await getContractingTask(taskId);
    if (!task) {
      return reply.status(404).send({ ok: false, error: `Task not found: ${taskId}` });
    }
    return reply.send({ ok: true, task });
  });

  /* ── PH Market Dashboard ──────────────────────────────────── */

  server.get("/rcm/hmo/market-summary", async (request, reply) => {
    const { tenantId } = (request.query as any) || {};
    const summary = await generateMarketSummary(tenantId);
    return reply.send({ ok: true, summary });
  });
}
