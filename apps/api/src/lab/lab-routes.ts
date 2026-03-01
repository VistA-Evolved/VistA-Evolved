/**
 * Phase 393 (W22-P5): Lab Deep Workflows -- REST Routes
 *
 * Endpoints:
 *   GET  /lab/orders                         â€” List lab orders
 *   POST /lab/orders                         â€” Create lab order
 *   GET  /lab/orders/:id                     â€” Get single order
 *   POST /lab/orders/:id/transition          â€” Transition order status
 *   GET  /lab/specimens                      â€” List specimens
 *   POST /lab/specimens                      â€” Create specimen
 *   POST /lab/specimens/:id/transition       â€” Transition specimen status
 *   POST /lab/specimens/:id/link-device      â€” Link Wave 21 device observation
 *   GET  /lab/results                        â€” List results
 *   POST /lab/results                        â€” Record result (auto-critical-alert)
 *   PATCH /lab/results/:id/status            â€” Update result status
 *   GET  /lab/critical-alerts                â€” List critical alerts
 *   POST /lab/critical-alerts/:id/ack        â€” Acknowledge critical alert
 *   POST /lab/critical-alerts/:id/resolve    â€” Resolve critical alert
 *   GET  /lab/dashboard                      â€” Dashboard stats
 *   GET  /lab/writeback-posture              â€” Writeback posture report
 *
 * Auth: session-based (see security.ts AUTH_RULES).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import {
  createLabOrder,
  getLabOrder,
  listLabOrders,
  transitionLabOrder,
  createSpecimen,
  getSpecimen,
  listSpecimens,
  transitionSpecimen,
  linkDeviceObservation,
  createLabResult,
  getLabResult,
  listLabResults,
  updateResultStatus,
  getCriticalAlert,
  listCriticalAlerts,
  acknowledgeCriticalAlert,
  resolveCriticalAlert,
  getLabDashboardStats,
  getLabWritebackPosture,
} from "./lab-store.js";
import type {
  LabOrderStatus,
  LabOrderPriority,
  SpecimenStatus,
  AbnormalFlag,
  ResultStatus,
  CriticalAlertStatus,
} from "./types.js";

// â”€â”€â”€ Plugin â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function labRoutes(server: FastifyInstance): Promise<void> {

  // â”€â”€ Lab Orders â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  server.get("/lab/orders", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const q = (request.query ?? {}) as Record<string, string>;
    const orders = listLabOrders(session.tenantId ?? "default", {
      patientDfn: q.dfn,
      status: q.status as LabOrderStatus | undefined,
    });
    return { ok: true, orders };
  });

  server.post("/lab/orders", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as Record<string, unknown>) ?? {};
    if (!body.testName || !body.specimenType) {
      return reply.code(400).send({ ok: false, error: "testName and specimenType required" });
    }
    const order = createLabOrder({
      tenantId: session.tenantId ?? "default",
      patientDfn: String(body.dfn ?? ""),
      testName: String(body.testName),
      testCode: body.testCode ? String(body.testCode) : undefined,
      loincCode: body.loincCode ? String(body.loincCode) : undefined,
      priority: (body.priority as LabOrderPriority) ?? "routine",
      specimenType: String(body.specimenType),
      collectionInstructions: body.collectionInstructions
        ? String(body.collectionInstructions)
        : undefined,
      orderingProviderDuz: session.duz,
      orderingProviderName: session.userName ?? session.duz,
    });
    return reply.code(201).send({ ok: true, order });
  });

  server.get("/lab/orders/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const order = getLabOrder(id);
    if (!order) return reply.code(404).send({ ok: false, error: "Lab order not found" });
    return { ok: true, order };
  });

  server.post("/lab/orders/:id/transition", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) ?? {};
    if (!body.status) {
      return reply.code(400).send({ ok: false, error: "status required" });
    }
    const result = transitionLabOrder(id, body.status as LabOrderStatus, {
      duz: session.duz,
      name: session.userName ?? session.duz,
    });
    if (!result.ok) return reply.code(400).send(result);
    return { ok: true, order: result.order };
  });

  // â”€â”€ Specimens â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  server.get("/lab/specimens", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const q = (request.query ?? {}) as Record<string, string>;
    const specimens = listSpecimens(session.tenantId ?? "default", {
      labOrderId: q.labOrderId,
      patientDfn: q.dfn,
      status: q.status as SpecimenStatus | undefined,
    });
    return { ok: true, specimens };
  });

  server.post("/lab/specimens", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as Record<string, unknown>) ?? {};
    if (!body.labOrderId || !body.accessionNumber || !body.specimenType) {
      return reply.code(400).send({
        ok: false,
        error: "labOrderId, accessionNumber, and specimenType required",
      });
    }
    const result = createSpecimen({
      tenantId: session.tenantId ?? "default",
      labOrderId: String(body.labOrderId),
      patientDfn: String(body.dfn ?? ""),
      accessionNumber: String(body.accessionNumber),
      specimenType: String(body.specimenType),
      collectionSite: body.collectionSite ? String(body.collectionSite) : undefined,
      volumeMl: body.volumeMl ? Number(body.volumeMl) : undefined,
      containerType: body.containerType ? String(body.containerType) : undefined,
    });
    if (!result.ok) return reply.code(400).send(result);
    return reply.code(201).send({ ok: true, specimen: result.specimen });
  });

  server.post("/lab/specimens/:id/transition", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) ?? {};
    if (!body.status) {
      return reply.code(400).send({ ok: false, error: "status required" });
    }
    const result = transitionSpecimen(
      id,
      body.status as SpecimenStatus,
      { duz: session.duz, name: session.userName ?? session.duz },
      { rejectReason: body.rejectReason ? String(body.rejectReason) : undefined },
    );
    if (!result.ok) return reply.code(400).send(result);
    return { ok: true, specimen: result.specimen };
  });

  server.post("/lab/specimens/:id/link-device", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) ?? {};
    if (!body.deviceObservationId) {
      return reply.code(400).send({ ok: false, error: "deviceObservationId required" });
    }
    const result = linkDeviceObservation(id, String(body.deviceObservationId));
    if (!result.ok) return reply.code(400).send(result);
    return { ok: true };
  });

  // â”€â”€ Lab Results â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  server.get("/lab/results", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const q = (request.query ?? {}) as Record<string, string>;
    const results = listLabResults(session.tenantId ?? "default", {
      labOrderId: q.labOrderId,
      patientDfn: q.dfn,
      flag: q.flag as AbnormalFlag | undefined,
      status: q.status as ResultStatus | undefined,
    });
    return { ok: true, results };
  });

  server.post("/lab/results", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as Record<string, unknown>) ?? {};
    if (!body.labOrderId || !body.analyteName || body.value === undefined) {
      return reply.code(400).send({
        ok: false,
        error: "labOrderId, analyteName, and value required",
      });
    }
    const { result, criticalAlert } = createLabResult({
      tenantId: session.tenantId ?? "default",
      labOrderId: String(body.labOrderId),
      patientDfn: String(body.dfn ?? ""),
      analyteName: String(body.analyteName),
      loincCode: body.loincCode ? String(body.loincCode) : undefined,
      value: String(body.value),
      units: body.units ? String(body.units) : undefined,
      referenceRange: body.referenceRange ? String(body.referenceRange) : undefined,
      flag: (body.flag as AbnormalFlag) ?? undefined,
      status: (body.status as ResultStatus) ?? undefined,
      comment: body.comment ? String(body.comment) : undefined,
      method: body.method ? String(body.method) : undefined,
      performingDevice: body.performingDevice ? String(body.performingDevice) : undefined,
      source: (body.source as "manual" | "device" | "imported" | "vista") ?? undefined,
      deviceObservationId: body.deviceObservationId ? String(body.deviceObservationId) : undefined,
      vistaLabIen: body.vistaLabIen ? String(body.vistaLabIen) : undefined,
    });
    return reply.code(201).send({ ok: true, result, criticalAlert });
  });

  server.patch("/lab/results/:id/status", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) ?? {};
    if (!body.status) {
      return reply.code(400).send({ ok: false, error: "status required" });
    }
    const res = updateResultStatus(id, body.status as ResultStatus);
    if (!res.ok) return reply.code(400).send(res);
    return { ok: true, result: res.result };
  });

  // â”€â”€ Critical Alerts â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  server.get("/lab/critical-alerts", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const q = (request.query ?? {}) as Record<string, string>;
    const alerts = listCriticalAlerts(session.tenantId ?? "default", {
      patientDfn: q.dfn,
      status: q.status as CriticalAlertStatus | undefined,
    });
    return { ok: true, alerts };
  });

  server.post("/lab/critical-alerts/:id/ack", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as Record<string, unknown>) ?? {};
    const readBackVerified = body.readBackVerified === true;
    const result = acknowledgeCriticalAlert(
      id,
      { duz: session.duz, name: session.userName ?? session.duz },
      readBackVerified,
    );
    if (!result.ok) return reply.code(400).send(result);
    return { ok: true, alert: result.alert };
  });

  server.post("/lab/critical-alerts/:id/resolve", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const result = resolveCriticalAlert(id);
    if (!result.ok) return reply.code(400).send(result);
    return { ok: true, alert: result.alert };
  });

  // â”€â”€ Dashboard & Posture â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

  server.get("/lab/dashboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const stats = getLabDashboardStats(session.tenantId ?? "default");
    return { ok: true, stats };
  });

  server.get("/lab/writeback-posture", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const posture = getLabWritebackPosture();
    return { ok: true, posture };
  });
}
