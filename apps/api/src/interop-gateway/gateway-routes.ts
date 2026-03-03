/**
 * Phase 400 (W23-P2): Interop Gateway Layer — Routes
 *
 * REST endpoints for channel management, transform pipelines, transaction
 * routing/audit, and mediator configuration.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { log } from "../lib/logger.js";
import {
  createChannel,
  getChannel,
  listChannels,
  updateChannel,
  updateChannelStatus,
  deleteChannel,
  createPipeline,
  getPipeline,
  listPipelines,
  updatePipeline,
  deletePipeline,
  recordTransaction,
  getTransaction,
  listTransactions,
  routeTransaction,
  createMediator,
  getMediator,
  listMediators,
  updateMediator,
  deleteMediator,
  getGatewayDashboardStats,
} from "./gateway-store.js";

export default async function interopGatewayRoutes(server: FastifyInstance): Promise<void> {

  // ── Channels ─────────────────────────────────────────────

  server.get("/interop-gateway/channels", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, channels: listChannels(session.tenantId) };
  });

  server.post("/interop-gateway/channels", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { name, description, direction, source, destination, transformPipelineId, status, tags } = body;
    if (!name || !direction || !source || !destination) {
      return reply.code(400).send({ ok: false, error: "name, direction, source, and destination required" });
    }
    try {
      const ch = createChannel({
        tenantId: session.tenantId,
        name,
        description: description || "",
        direction,
        source,
        destination,
        transformPipelineId: transformPipelineId || null,
        status: status || "active",
        tags: tags || [],
      });
      return reply.code(201).send({ ok: true, channel: ch });
    } catch (err: any) {
      log.error("Interop channel creation failed", { error: err instanceof Error ? err.message : String(err) });
      return reply.code(409).send({ ok: false, error: "Internal error" });
    }
  });

  server.get("/interop-gateway/channels/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const ch = getChannel(id);
    if (!ch) return reply.code(404).send({ ok: false, error: "Channel not found" });
    return { ok: true, channel: ch };
  });

  server.put("/interop-gateway/channels/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const updated = updateChannel(id, body);
    if (!updated) return reply.code(404).send({ ok: false, error: "Channel not found" });
    return { ok: true, channel: updated };
  });

  server.put("/interop-gateway/channels/:id/status", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const { status } = (request.body as any) || {};
    if (!status) return reply.code(400).send({ ok: false, error: "status required" });
    const updated = updateChannelStatus(id, status);
    if (!updated) return reply.code(404).send({ ok: false, error: "Channel not found" });
    return { ok: true, channel: updated };
  });

  server.delete("/interop-gateway/channels/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    if (!deleteChannel(id)) return reply.code(404).send({ ok: false, error: "Channel not found" });
    return { ok: true };
  });

  // ── Transform Pipelines ──────────────────────────────────

  server.get("/interop-gateway/pipelines", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, pipelines: listPipelines(session.tenantId) };
  });

  server.post("/interop-gateway/pipelines", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { name, description, steps } = body;
    if (!name || !steps) {
      return reply.code(400).send({ ok: false, error: "name and steps required" });
    }
    try {
      const p = createPipeline({
        tenantId: session.tenantId,
        name,
        description: description || "",
        steps,
      });
      return reply.code(201).send({ ok: true, pipeline: p });
    } catch (err: any) {
      log.error("Transform pipeline creation failed", { error: err instanceof Error ? err.message : String(err) });
      return reply.code(409).send({ ok: false, error: "Internal error" });
    }
  });

  server.get("/interop-gateway/pipelines/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const p = getPipeline(id);
    if (!p) return reply.code(404).send({ ok: false, error: "Pipeline not found" });
    return { ok: true, pipeline: p };
  });

  server.put("/interop-gateway/pipelines/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const updated = updatePipeline(id, body);
    if (!updated) return reply.code(404).send({ ok: false, error: "Pipeline not found" });
    return { ok: true, pipeline: updated };
  });

  server.delete("/interop-gateway/pipelines/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    if (!deletePipeline(id)) return reply.code(404).send({ ok: false, error: "Pipeline not found" });
    return { ok: true };
  });

  // ── Transactions ─────────────────────────────────────────

  server.get("/interop-gateway/transactions", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { channelId, status, limit } = request.query as { channelId?: string; status?: string; limit?: string };
    return {
      ok: true,
      transactions: listTransactions(session.tenantId, {
        channelId,
        status: status as any,
        limit: limit ? parseInt(limit, 10) : undefined,
      }),
    };
  });

  server.get("/interop-gateway/transactions/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const tx = getTransaction(id);
    if (!tx) return reply.code(404).send({ ok: false, error: "Transaction not found" });
    return { ok: true, transaction: tx };
  });

  server.post("/interop-gateway/route", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { channelId, payload } = body;
    if (!channelId || !payload) {
      return reply.code(400).send({ ok: false, error: "channelId and payload required" });
    }
    const tx = routeTransaction(session.tenantId, channelId, typeof payload === "string" ? payload : JSON.stringify(payload));
    const code = tx.status === "rejected" ? 422 : tx.status === "failed" ? 502 : 200;
    return reply.code(code).send({ ok: tx.status === "completed", transaction: tx });
  });

  // ── Mediators ────────────────────────────────────────────

  server.get("/interop-gateway/mediators", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, mediators: listMediators(session.tenantId) };
  });

  server.post("/interop-gateway/mediators", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { type, name, description, openhimUrl, openhimClientId, enabled } = body;
    if (!name || !type) {
      return reply.code(400).send({ ok: false, error: "name and type required" });
    }
    try {
      const m = createMediator({
        tenantId: session.tenantId,
        type,
        name,
        description: description || "",
        openhimUrl: openhimUrl || null,
        openhimClientId: openhimClientId || null,
        enabled: enabled !== false,
      });
      return reply.code(201).send({ ok: true, mediator: m });
    } catch (err: any) {
      log.error("Mediator creation failed", { error: err instanceof Error ? err.message : String(err) });
      return reply.code(409).send({ ok: false, error: "Internal error" });
    }
  });

  server.put("/interop-gateway/mediators/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const updated = updateMediator(id, body);
    if (!updated) return reply.code(404).send({ ok: false, error: "Mediator not found" });
    return { ok: true, mediator: updated };
  });

  server.delete("/interop-gateway/mediators/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    if (!deleteMediator(id)) return reply.code(404).send({ ok: false, error: "Mediator not found" });
    return { ok: true };
  });

  // ── Dashboard ────────────────────────────────────────────

  server.get("/interop-gateway/dashboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, stats: getGatewayDashboardStats(session.tenantId) };
  });
}
