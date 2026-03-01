/**
 * Phase 391 (W22-P3): Inpatient Core — REST Routes
 *
 * Endpoints:
 *   GET  /inpatient/bedboard               — Bedboard (all beds for tenant)
 *   GET  /inpatient/bedboard/summary       — Occupancy summary
 *   POST /inpatient/beds                    — Create bed assignment
 *   PATCH /inpatient/beds/:id               — Update bed assignment
 *   POST /inpatient/beds/:id/assign         — Assign patient to bed
 *   POST /inpatient/beds/:id/discharge      — Discharge patient from bed
 *   GET  /inpatient/adt-events              — ADT event log
 *   POST /inpatient/adt-events              — Record ADT event
 *   GET  /inpatient/flowsheet-rows          — Nursing flowsheet rows
 *   POST /inpatient/flowsheet-rows          — Record flowsheet row
 *   GET  /inpatient/vitals                  — Vitals entries
 *   POST /inpatient/vitals                  — Record vitals entry
 *   GET  /inpatient/writeback-posture       — Writeback posture report
 *
 * Auth: session-based (/inpatient/* in security.ts AUTH_RULES).
 * Admin: beds create/PATCH admin-only; reads session-level.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import {
  createBedAssignment,
  getBedAssignment,
  listBedAssignments,
  updateBedAssignment,
  assignPatientToBed,
  dischargePatientFromBed,
  recordAdtEvent,
  listAdtEvents,
  createFlowsheetRow,
  listFlowsheetRows,
  createVitalsEntry,
  listVitalsEntries,
  getWritebackPosture,
  getBedboardSummary,
} from "./inpatient-store.js";
import type {
  BedStatus,
  AdtEventType,
  VitalSign,
} from "./types.js";

// ─── Allowed patch fields ───────────────────────────────────

const BED_PATCH_FIELDS = new Set([
  "status", "patientDfn", "patientName", "admittingProviderDuz",
  "admitDateTime", "dischargeDateTime", "precautions", "acuity",
  "wardName", "roomNumber",
]);

// ─── Plugin ─────────────────────────────────────────────────

export async function inpatientRoutes(server: FastifyInstance): Promise<void> {

  // ── Bedboard ────────────────────────────────────────────

  server.get("/inpatient/bedboard", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const locationId = (request.query as any)?.locationId;
    const beds = listBedAssignments(tenantId, locationId || undefined);
    return { ok: true, beds, total: beds.length };
  });

  server.get("/inpatient/bedboard/summary", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const summary = getBedboardSummary(tenantId);
    return { ok: true, summary };
  });

  // ── Bed CRUD ────────────────────────────────────────────

  server.post("/inpatient/beds", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const body = (request.body as any) || {};
    const {
      locationId, bedLabel, wardName, roomNumber,
      status = "available", precautions = [], acuity = null,
    } = body;
    if (!locationId || !bedLabel || !wardName || !roomNumber) {
      return reply.code(400).send({ ok: false, error: "locationId, bedLabel, wardName, roomNumber required" });
    }
    const bed = createBedAssignment(tenantId, {
      locationId, bedLabel, wardName, roomNumber,
      status: status as BedStatus,
      patientDfn: null, patientName: null,
      admittingProviderDuz: null,
      admitDateTime: null, dischargeDateTime: null,
      precautions: precautions || [],
      acuity: acuity || null,
    });
    return reply.code(201).send({ ok: true, bed });
  });

  server.patch("/inpatient/beds/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const patch: Record<string, unknown> = {};
    for (const key of Object.keys(body)) {
      if (BED_PATCH_FIELDS.has(key)) patch[key] = body[key];
    }
    const updated = updateBedAssignment(id, patch as any);
    if (!updated) return reply.code(404).send({ ok: false, error: "Bed not found" });
    return { ok: true, bed: updated };
  });

  server.post("/inpatient/beds/:id/assign", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { patientDfn, patientName, providerDuz } = body;
    if (!patientDfn || !patientName) {
      return reply.code(400).send({ ok: false, error: "patientDfn and patientName required" });
    }
    const bed = assignPatientToBed(id, patientDfn, patientName, providerDuz || session.duz || "");
    if (!bed) return reply.code(404).send({ ok: false, error: "Bed not found" });

    // Record ADT admit event
    recordAdtEvent(tenantId, {
      patientDfn,
      eventType: "admit" as AdtEventType,
      fromLocationId: null,
      toLocationId: bed.locationId,
      fromBedLabel: null,
      toBedLabel: bed.bedLabel,
      providerDuz: providerDuz || session.duz || "",
      reason: body.reason || "Bed assignment",
      vistaMovementIen: null,
    });

    return { ok: true, bed };
  });

  server.post("/inpatient/beds/:id/discharge", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const { id } = request.params as { id: string };
    const existingBed = getBedAssignment(id);
    if (!existingBed) return reply.code(404).send({ ok: false, error: "Bed not found" });
    const body = (request.body as any) || {};

    // Record ADT discharge event before clearing patient
    if (existingBed.patientDfn) {
      recordAdtEvent(tenantId, {
        patientDfn: existingBed.patientDfn,
        eventType: "discharge" as AdtEventType,
        fromLocationId: existingBed.locationId,
        toLocationId: null,
        fromBedLabel: existingBed.bedLabel,
        toBedLabel: null,
        providerDuz: session.duz || "",
        reason: body.reason || "Discharge",
        vistaMovementIen: null,
      });
    }

    const bed = dischargePatientFromBed(id);
    return { ok: true, bed };
  });

  // ── ADT Events ──────────────────────────────────────────

  server.get("/inpatient/adt-events", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const dfn = (request.query as any)?.dfn;
    const events = listAdtEvents(tenantId, dfn || undefined);
    return { ok: true, events, total: events.length };
  });

  server.post("/inpatient/adt-events", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const body = (request.body as any) || {};
    const {
      patientDfn, eventType, fromLocationId = null, toLocationId = null,
      fromBedLabel = null, toBedLabel = null, reason = "",
    } = body;
    if (!patientDfn || !eventType) {
      return reply.code(400).send({ ok: false, error: "patientDfn and eventType required" });
    }
    const event = recordAdtEvent(tenantId, {
      patientDfn,
      eventType: eventType as AdtEventType,
      fromLocationId, toLocationId,
      fromBedLabel, toBedLabel,
      providerDuz: session.duz || "",
      reason,
      vistaMovementIen: null,
    });
    return reply.code(201).send({ ok: true, event });
  });

  // ── Nursing Flowsheet Rows ──────────────────────────────

  server.get("/inpatient/flowsheet-rows", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const { dfn, flowsheetId } = request.query as any;
    if (!dfn) return reply.code(400).send({ ok: false, error: "dfn query param required" });
    const rows = listFlowsheetRows(tenantId, dfn, flowsheetId || undefined);
    return { ok: true, rows, total: rows.length };
  });

  server.post("/inpatient/flowsheet-rows", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const body = (request.body as any) || {};
    const { patientDfn, flowsheetId, values = {}, flags = {}, source = "manual" } = body;
    if (!patientDfn || !flowsheetId) {
      return reply.code(400).send({ ok: false, error: "patientDfn and flowsheetId required" });
    }
    const row = createFlowsheetRow(tenantId, {
      patientDfn,
      flowsheetId,
      values,
      flags,
      recordedBy: session.duz || session.userName || "",
      recordedAt: new Date().toISOString(),
      source: source as "manual" | "device" | "imported",
      deviceObservationId: body.deviceObservationId || null,
    });
    return reply.code(201).send({ ok: true, row });
  });

  // ── Vitals ──────────────────────────────────────────────

  server.get("/inpatient/vitals", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const { dfn } = request.query as any;
    if (!dfn) return reply.code(400).send({ ok: false, error: "dfn query param required" });
    const entries = listVitalsEntries(tenantId, dfn);
    return { ok: true, entries, total: entries.length };
  });

  server.post("/inpatient/vitals", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = (session as any).tenantId || "default";
    const body = (request.body as any) || {};
    const { patientDfn, vitals = {}, units = {}, source = "manual" } = body;
    if (!patientDfn || Object.keys(vitals).length === 0) {
      return reply.code(400).send({ ok: false, error: "patientDfn and at least one vital required" });
    }
    const entry = createVitalsEntry(tenantId, {
      patientDfn,
      vitals,
      units,
      recordedBy: session.duz || session.userName || "",
      recordedAt: new Date().toISOString(),
      source: source as "manual" | "device" | "imported",
      writebackStatus: "not_attempted",
      vistaVitalsIen: null,
      writebackError: null,
    });
    return reply.code(201).send({ ok: true, entry });
  });

  // ── Writeback Posture ───────────────────────────────────

  server.get("/inpatient/writeback-posture", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const posture = getWritebackPosture();
    return { ok: true, posture };
  });
}

export default inpatientRoutes;
