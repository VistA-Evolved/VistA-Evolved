/**
 * Patient Communications Routes — Phase 351
 *
 * Endpoints for consent management, notification templates,
 * sending notifications, and notification log.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  setConsent,
  listConsents,
  hasConsent,
  createTemplate,
  listTemplates,
  getTemplate,
  sendNotification,
  getNotificationLog,
  listProviders,
  isPhiAllowed,
} from "../services/patient-comms-service.js";
import type {
  NotificationChannel,
  NotificationCategory,
  ConsentStatus,
} from "../services/patient-comms-service.js";

export async function patientCommsRoutes(server: FastifyInstance): Promise<void> {
  const tenantId = "default";

  // ─── Consent Management ──────────────────────────────

  server.get("/patient-comms/consent", async (req: FastifyRequest, reply: FastifyReply) => {
    const { patientDfn } = (req.query as any) || {};
    if (!patientDfn) {
      return reply.code(400).send({ ok: false, error: "patientDfn query param is required" });
    }
    return reply.send({
      ok: true,
      consents: listConsents(tenantId, patientDfn),
    });
  });

  server.post("/patient-comms/consent", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.patientDfn || !body.channel || !body.status) {
      return reply.code(400).send({
        ok: false,
        error: "patientDfn, channel, and status are required",
      });
    }
    const consent = setConsent(
      tenantId,
      body.patientDfn,
      body.channel as NotificationChannel,
      (body.category || "*") as NotificationCategory | "*",
      body.status as ConsentStatus,
      body.locale,
    );
    return reply.code(201).send({ ok: true, consent });
  });

  server.get("/patient-comms/consent/check", async (req: FastifyRequest, reply: FastifyReply) => {
    const { patientDfn, channel, category } = (req.query as any) || {};
    if (!patientDfn || !channel || !category) {
      return reply.code(400).send({
        ok: false,
        error: "patientDfn, channel, and category are required",
      });
    }
    return reply.send({
      ok: true,
      hasConsent: hasConsent(tenantId, patientDfn, channel, category),
    });
  });

  // ─── Templates ───────────────────────────────────────

  server.get("/patient-comms/templates", async (req: FastifyRequest, reply: FastifyReply) => {
    const { category, locale } = (req.query as any) || {};
    return reply.send({
      ok: true,
      templates: listTemplates(tenantId, category, locale),
    });
  });

  server.get("/patient-comms/templates/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as { id: string };
    const t = getTemplate(id);
    if (!t || t.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: "Template not found" });
    }
    return reply.send({ ok: true, template: t });
  });

  server.post("/patient-comms/templates", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.category || !body.channel || !body.subject || !body.body) {
      return reply.code(400).send({
        ok: false,
        error: "category, channel, subject, and body are required",
      });
    }
    const t = createTemplate(tenantId, {
      category: body.category,
      channel: body.channel,
      locale: body.locale || "en",
      subject: body.subject,
      body: body.body,
      containsPhi: body.containsPhi || false,
      metadata: body.metadata || {},
    });
    return reply.code(201).send({ ok: true, template: t });
  });

  // ─── Send Notification ───────────────────────────────

  server.post("/patient-comms/send", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.patientDfn || !body.channel || !body.category || !body.templateId || !body.recipientContact) {
      return reply.code(400).send({
        ok: false,
        error: "patientDfn, channel, category, templateId, and recipientContact are required",
      });
    }
    const result = await sendNotification({
      tenantId,
      patientDfn: body.patientDfn,
      channel: body.channel,
      category: body.category,
      templateId: body.templateId,
      templateParams: body.templateParams || {},
      locale: body.locale,
      recipientContact: body.recipientContact,
      providerId: body.providerId,
    });
    const code = result.sent ? 200 : 422;
    return reply.code(code).send({ ok: result.sent, ...result });
  });

  // ─── Notification Log ────────────────────────────────

  server.get("/patient-comms/log", async (req: FastifyRequest, reply: FastifyReply) => {
    const { patientDfn, limit } = (req.query as any) || {};
    // Note: No raw DFN in response — log entries use hashed DFN
    return reply.send({
      ok: true,
      records: getNotificationLog(tenantId, patientDfn, limit ? parseInt(limit, 10) : undefined),
    });
  });

  // ─── Providers ───────────────────────────────────────

  server.get("/patient-comms/providers", async (_req: FastifyRequest, reply: FastifyReply) => {
    const providers = listProviders().map((p) => ({
      id: p.id,
      name: p.name,
      channels: p.channels,
    }));
    return reply.send({ ok: true, providers });
  });

  // ─── Health / Config ─────────────────────────────────

  server.get("/patient-comms/health", async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({
      ok: true,
      phiEnabled: isPhiAllowed(),
      providers: listProviders().length,
      supportedChannels: ["email", "sms", "push", "portal_inbox", "voice"],
    });
  });
}

export default patientCommsRoutes;
