/**
 * FHIR Subscription routes — Phase 357 (W18-P4)
 *
 * REST endpoints for managing FHIR R4 Subscriptions with rest-hook delivery.
 * Prefix: /fhir-subscriptions
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  createFhirSubscription,
  getFhirSubscription,
  listFhirSubscriptions,
  updateFhirSubscription,
  deleteFhirSubscription,
  getFhirNotifications,
  getFhirSubscriptionStats,
  getEventResourceMapping,
  SUPPORTED_RESOURCE_TYPES,
} from "../services/fhir-subscription-service.js";

export async function fhirSubscriptionRoutes(server: FastifyInstance): Promise<void> {
  const TENANT = "default";

  // ── Health ──────────────────────────────────────────────────────────
  server.get("/fhir-subscriptions/health", async (_req: FastifyRequest, reply: FastifyReply) => {
    const stats = getFhirSubscriptionStats(TENANT);
    return reply.send({ ok: true, phase: 357, ...stats });
  });

  // ── Supported resource types ───────────────────────────────────────
  server.get("/fhir-subscriptions/resource-types", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      ok: true,
      resourceTypes: SUPPORTED_RESOURCE_TYPES,
      eventMapping: getEventResourceMapping(),
    });
  });

  // ── Create subscription ────────────────────────────────────────────
  server.post("/fhir-subscriptions", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { criteria, channel, end, reason } = body;

    if (!criteria || typeof criteria !== "string") {
      return reply.code(400).send({ ok: false, error: "criteria is required (e.g. 'Patient?_id=3')" });
    }
    if (!channel || !channel.endpoint) {
      return reply.code(400).send({ ok: false, error: "channel with endpoint is required" });
    }

    try {
      const sub = createFhirSubscription(TENANT, criteria, channel, { end, reason });
      return reply.code(201).send({ ok: true, subscription: sub });
    } catch (err: any) {
      return reply.code(400).send({ ok: false, error: "Failed to create FHIR subscription" });
    }
  });

  // ── List subscriptions ─────────────────────────────────────────────
  server.get("/fhir-subscriptions/list", async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as any) || {};
    const subs = listFhirSubscriptions(TENANT, {
      status: query.status,
      resourceType: query.resourceType,
    });
    return reply.send({ ok: true, subscriptions: subs, count: subs.length });
  });

  // ── Get subscription ───────────────────────────────────────────────
  server.get("/fhir-subscriptions/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const sub = getFhirSubscription(id, TENANT);
    if (!sub) return reply.code(404).send({ ok: false, error: "Subscription not found" });
    return reply.send({ ok: true, subscription: sub });
  });

  // ── Update subscription ────────────────────────────────────────────
  server.patch("/fhir-subscriptions/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { status, end, reason } = body;

    const sub = updateFhirSubscription(id, TENANT, { status, end, reason });
    if (!sub) return reply.code(404).send({ ok: false, error: "Subscription not found" });
    return reply.send({ ok: true, subscription: sub });
  });

  // ── Delete subscription ────────────────────────────────────────────
  server.delete("/fhir-subscriptions/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const deleted = deleteFhirSubscription(id, TENANT);
    if (!deleted) return reply.code(404).send({ ok: false, error: "Subscription not found" });
    return reply.send({ ok: true, deleted: true });
  });

  // ── Notifications ──────────────────────────────────────────────────
  server.get("/fhir-subscriptions/notifications", async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as any) || {};
    const notes = getFhirNotifications(TENANT, {
      subscriptionId: query.subscriptionId,
      status: query.status,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
    });
    return reply.send({ ok: true, notifications: notes, count: notes.length });
  });

  // ── Stats ──────────────────────────────────────────────────────────
  server.get("/fhir-subscriptions/stats", async (_req: FastifyRequest, reply: FastifyReply) => {
    const stats = getFhirSubscriptionStats(TENANT);
    return reply.send({ ok: true, ...stats });
  });
}
