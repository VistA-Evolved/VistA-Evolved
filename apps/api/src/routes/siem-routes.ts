/**
 * SIEM Management Routes — Phase 344 (W16-P8).
 *
 * Admin-only endpoints for SIEM configuration, alert rules, and triggers.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { getSiemStatus, flushEvents, type SiemSeverity } from "../auth/siem-sink.js";
import {
  getAlertRules,
  getAlertTriggers,
  getAlertStats,
  enableAlertRule,
} from "../auth/security-alerts.js";

export async function siemRoutes(app: FastifyInstance): Promise<void> {

  /**
   * GET /siem/status — SIEM sink status.
   */
  app.get("/siem/status", async (_request: FastifyRequest, reply: FastifyReply) => {
    const status = getSiemStatus();
    const stats = getAlertStats();
    return reply.send({ ok: true, ...status, alerts: stats });
  });

  /**
   * POST /siem/flush — Force flush event buffer.
   */
  app.post("/siem/flush", async (_request: FastifyRequest, reply: FastifyReply) => {
    const result = await flushEvents();
    return reply.send({ ok: true, ...result });
  });

  /**
   * GET /siem/rules — List alert rules.
   */
  app.get("/siem/rules", async (_request: FastifyRequest, reply: FastifyReply) => {
    const rules = getAlertRules();
    return reply.send({
      ok: true,
      rules: rules.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        category: r.category,
        actionPattern: r.actionPattern.source,
        threshold: r.threshold,
        windowMs: r.windowMs,
        severity: r.severity,
        enabled: r.enabled,
      })),
      total: rules.length,
    });
  });

  /**
   * PUT /siem/rules/:id/toggle — Enable/disable an alert rule.
   */
  app.put("/siem/rules/:id/toggle", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as { enabled?: boolean }) || {};
    const enabled = body.enabled ?? true;
    const updated = enableAlertRule(id, enabled);
    if (!updated) {
      return reply.code(404).send({ ok: false, error: "Rule not found" });
    }
    return reply.send({ ok: true, ruleId: id, enabled });
  });

  /**
   * GET /siem/triggers — List alert triggers.
   */
  app.get("/siem/triggers", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      ruleId?: string;
      severity?: SiemSeverity;
      limit?: string;
    };
    const triggers = getAlertTriggers({
      ruleId: query.ruleId,
      severity: query.severity,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
    return reply.send({ ok: true, triggers, total: triggers.length });
  });

  /**
   * GET /siem/stats — Alert statistics.
   */
  app.get("/siem/stats", async (_request: FastifyRequest, reply: FastifyReply) => {
    const stats = getAlertStats();
    return reply.send({ ok: true, ...stats });
  });
}
