/**
 * Phases 406-407 (W23-P8/P9): Exchange Packs — Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import {
  getPackProfiles, getPackProfile,
  createConnector, getConnector, listConnectors, updateConnector, deleteConnector,
  listExchangeTransactions, getExchangeTransaction, simulateExchange,
  getExchangePackDashboardStats,
} from "./pack-store.js";

export default async function exchangePackRoutes(server: FastifyInstance): Promise<void> {

  // ─── Pack Profiles (read-only catalog) ─────────────────────

  server.get("/exchange-packs/profiles", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    return { ok: true, profiles: getPackProfiles() };
  });

  server.get("/exchange-packs/profiles/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = getPackProfile(id as any);
    if (!rec) return reply.code(404).send({ ok: false, error: "Pack profile not found" });
    return { ok: true, profile: rec };
  });

  // ─── Connectors ────────────────────────────────────────────

  server.get("/exchange-packs/connectors", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return { ok: true, connectors: listConnectors(session.tenantId, { packId: qs.packId, status: qs.status }) };
  });

  server.get("/exchange-packs/connectors/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = getConnector(id);
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, connector: rec };
  });

  server.post("/exchange-packs/connectors", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    try {
      const rec = createConnector({
        tenantId: session.tenantId,
        packId: body.packId || "custom",
        name: body.name || "",
        description: body.description,
        status: body.status || "inactive",
        direction: body.direction || "bidirectional",
        endpoint: body.endpoint || "",
        authType: body.authType || "none",
        authConfig: body.authConfig,
        headers: body.headers,
        timeoutMs: body.timeoutMs || 30000,
        retryAttempts: body.retryAttempts || 3,
        metadata: body.metadata,
      });
      return reply.code(201).send({ ok: true, connector: rec });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: "Create failed" });
    }
  });

  server.put("/exchange-packs/connectors/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body || {}) as Record<string, any>;
    const rec = updateConnector(id, { ...body, tenantId: session.tenantId });
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, connector: rec };
  });

  server.delete("/exchange-packs/connectors/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const ok = deleteConnector(id);
    if (!ok) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true };
  });

  // ─── Exchange Transactions ─────────────────────────────────

  server.get("/exchange-packs/transactions", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return { ok: true, transactions: listExchangeTransactions(session.tenantId, {
      connectorId: qs.connectorId,
      packId: qs.packId,
      status: qs.status,
      limit: Number(qs.limit) || 200,
    }) };
  });

  server.get("/exchange-packs/transactions/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = getExchangeTransaction(id);
    if (!rec) return reply.code(404).send({ ok: false, error: "Not found" });
    return { ok: true, transaction: rec };
  });

  server.post("/exchange-packs/exchange", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    const result = simulateExchange(session.tenantId, body.connectorId || "", body.payload || "");
    if ("error" in result) return reply.code(400).send({ ok: false, ...result });
    return reply.code(201).send({ ok: true, transaction: result });
  });

  // ─── Dashboard ─────────────────────────────────────────────

  server.get("/exchange-packs/dashboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, stats: getExchangePackDashboardStats(session.tenantId) };
  });
}
