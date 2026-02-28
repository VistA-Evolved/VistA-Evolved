/**
 * Billing & Metering REST routes
 *
 * Phase 284 (Wave 10 P5)
 *
 * All routes require admin auth via AUTH_RULES catch-all for /admin/*.
 * Prefix: /admin/billing/*
 *
 * No PHI — billing is tenant-scoped.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getBillingProvider } from "./types.js";
import { getMeterSnapshot, flushMeters } from "./metering.js";

export default async function billingRoutes(server: FastifyInstance): Promise<void> {
  /* ================================================================ */
  /* Plans                                                             */
  /* ================================================================ */

  /** GET /admin/billing/plans — list all available plans */
  server.get("/admin/billing/plans", async (_req: FastifyRequest, reply: FastifyReply) => {
    const provider = getBillingProvider();
    const plans = await provider.listPlans();
    return reply.send({ ok: true, plans });
  });

  /** GET /admin/billing/plans/:planId — get a specific plan */
  server.get("/admin/billing/plans/:planId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { planId } = req.params as { planId: string };
    const provider = getBillingProvider();
    const plan = await provider.getPlan(planId);
    if (!plan) return reply.code(404).send({ ok: false, error: "Plan not found" });
    return reply.send({ ok: true, plan });
  });

  /* ================================================================ */
  /* Subscriptions                                                     */
  /* ================================================================ */

  /** GET /admin/billing/subscriptions/:tenantId — get tenant subscription */
  server.get("/admin/billing/subscriptions/:tenantId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = req.params as { tenantId: string };
    const provider = getBillingProvider();
    const sub = await provider.getSubscription(tenantId);
    if (!sub) return reply.send({ ok: true, subscription: null, status: "no_subscription" });
    return reply.send({ ok: true, subscription: sub });
  });

  /** POST /admin/billing/subscriptions — create subscription */
  server.post("/admin/billing/subscriptions", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { tenantId, planId } = body;
    if (!tenantId || !planId) {
      return reply.code(400).send({ ok: false, error: "tenantId and planId required" });
    }
    const provider = getBillingProvider();
    const sub = await provider.createSubscription(tenantId, planId);
    return reply.code(201).send({ ok: true, subscription: sub });
  });

  /** PUT /admin/billing/subscriptions/:tenantId — change plan */
  server.put("/admin/billing/subscriptions/:tenantId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = req.params as { tenantId: string };
    const body = (req.body as any) || {};
    const { planId } = body;
    if (!planId) {
      return reply.code(400).send({ ok: false, error: "planId required" });
    }
    const provider = getBillingProvider();
    const sub = await provider.updateSubscription(tenantId, planId);
    return reply.send({ ok: true, subscription: sub });
  });

  /** DELETE /admin/billing/subscriptions/:tenantId — cancel subscription */
  server.delete("/admin/billing/subscriptions/:tenantId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = req.params as { tenantId: string };
    const body = (req.body as any) || {};
    const cancelAtPeriodEnd = body.cancelAtPeriodEnd !== false; // default true
    const provider = getBillingProvider();
    try {
      const sub = await provider.cancelSubscription(tenantId, cancelAtPeriodEnd);
      return reply.send({ ok: true, subscription: sub });
    } catch (err: any) {
      return reply.code(404).send({ ok: false, error: err.message });
    }
  });

  /* ================================================================ */
  /* Metering                                                          */
  /* ================================================================ */

  /** GET /admin/billing/usage/:tenantId — current metering snapshot */
  server.get("/admin/billing/usage/:tenantId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = req.params as { tenantId: string };
    const snapshot = getMeterSnapshot(tenantId);
    return reply.send({ ok: true, tenantId, counters: snapshot });
  });

  /** POST /admin/billing/usage/flush — force-flush metering counters */
  server.post("/admin/billing/usage/flush", async (_req: FastifyRequest, reply: FastifyReply) => {
    const result = await flushMeters();
    return reply.send({ ok: true, ...result });
  });

  /* ================================================================ */
  /* Invoices                                                          */
  /* ================================================================ */

  /** GET /admin/billing/invoices/:tenantId — list invoices */
  server.get("/admin/billing/invoices/:tenantId", async (req: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = req.params as { tenantId: string };
    const provider = getBillingProvider();
    const invoices = await provider.listInvoices(tenantId);
    return reply.send({ ok: true, invoices });
  });

  /** GET /admin/billing/invoices/:tenantId/current — current draft invoice */
  server.get("/admin/billing/invoices/:tenantId/current", async (req: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = req.params as { tenantId: string };
    const provider = getBillingProvider();
    const invoice = await provider.getCurrentInvoice(tenantId);
    return reply.send({ ok: true, invoice });
  });

  /* ================================================================ */
  /* Health                                                            */
  /* ================================================================ */

  /** GET /admin/billing/health — billing provider health check */
  server.get("/admin/billing/health", async (_req: FastifyRequest, reply: FastifyReply) => {
    const provider = getBillingProvider();
    const health = await provider.healthCheck();
    const code = health.ok ? 200 : 503;
    return reply.code(code).send(health);
  });
}
