/**
 * Privacy Management Routes — Phase 343 (W16-P7).
 *
 * Endpoints for sensitivity tag management, access reason queries,
 * and privacy stats.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  addSensitivityTag,
  removeSensitivityTag,
  getSensitivityTags,
  checkSensitivityAccess,
  recordAccessReason,
  queryAccessReasons,
  getPrivacyStats,
  type SensitivityCategory,
} from "../auth/privacy-segmentation.js";

export async function privacyRoutes(app: FastifyInstance): Promise<void> {

  /**
   * GET /privacy/tags — List sensitivity tags.
   */
  app.get("/privacy/tags", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      tenantId?: string;
      patientDfn?: string;
      recordType?: string;
      category?: SensitivityCategory;
    };
    const tags = getSensitivityTags(query);
    return reply.send({ ok: true, tags, total: tags.length });
  });

  /**
   * POST /privacy/tags — Add a sensitivity tag.
   */
  app.post("/privacy/tags", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const session = (request as any).session;

    if (!body.category) {
      return reply.code(400).send({ ok: false, error: "category required" });
    }

    const tag = addSensitivityTag({
      tenantId: (body.tenantId as string) || session?.tenantId || "default",
      patientDfn: body.patientDfn as string | undefined,
      recordType: body.recordType as string | undefined,
      recordId: body.recordId as string | undefined,
      category: body.category as SensitivityCategory,
      appliedBy: session?.userName || session?.duz || "admin",
      source: (body.source as string) || "manual",
      label: body.label as string | undefined,
    });

    return reply.code(201).send({ ok: true, tag });
  });

  /**
   * DELETE /privacy/tags/:id — Remove a sensitivity tag.
   */
  app.delete("/privacy/tags/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const session = (request as any).session;
    const removed = removeSensitivityTag(id, session?.userName || session?.duz || "admin");
    return reply.send({ ok: removed, removed });
  });

  /**
   * POST /privacy/check-access — Check sensitivity access for a record.
   */
  app.post("/privacy/check-access", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const session = (request as any).session;

    if (!body.recordType || !body.recordId) {
      return reply.code(400).send({ ok: false, error: "recordType and recordId required" });
    }

    const result = checkSensitivityAccess(
      (body.tenantId as string) || session?.tenantId || "default",
      body.recordType as string,
      body.recordId as string,
      session?.role || "clerk",
      !!(body.hasBreakGlass ?? false),
    );

    return reply.send({ ok: true, ...result });
  });

  /**
   * POST /privacy/access-reasons — Record access reason.
   */
  app.post("/privacy/access-reasons", async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as Record<string, unknown>) || {};
    const session = (request as any).session;

    if (!body.reason || !body.patientDfn || !body.recordType || !body.recordId) {
      return reply.code(400).send({ ok: false, error: "reason, patientDfn, recordType, and recordId required" });
    }

    const entry = recordAccessReason({
      tenantId: (body.tenantId as string) || session?.tenantId || "default",
      userId: session?.duz || "unknown",
      userName: session?.userName || "unknown",
      patientDfn: body.patientDfn as string,
      recordType: body.recordType as string,
      recordId: body.recordId as string,
      categories: (body.categories as SensitivityCategory[]) || [],
      reason: body.reason as string,
      breakGlass: !!(body.breakGlass ?? false),
    });

    return reply.code(201).send({ ok: true, accessReason: entry });
  });

  /**
   * GET /privacy/access-reasons — Query access reasons.
   */
  app.get("/privacy/access-reasons", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as {
      tenantId?: string;
      userId?: string;
      patientDfn?: string;
      breakGlass?: string;
      limit?: string;
    };
    const reasons = queryAccessReasons({
      ...query,
      breakGlass: query.breakGlass === "true" ? true : query.breakGlass === "false" ? false : undefined,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
    });
    return reply.send({ ok: true, reasons, total: reasons.length });
  });

  /**
   * GET /privacy/stats — Privacy statistics.
   */
  app.get("/privacy/stats", async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { tenantId?: string };
    const stats = getPrivacyStats(query.tenantId);
    return reply.send({ ok: true, ...stats });
  });
}
