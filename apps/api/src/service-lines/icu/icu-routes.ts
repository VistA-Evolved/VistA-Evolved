/**
 * apps/api/src/service-lines/icu/icu-routes.ts
 *
 * Phase 469 (W31-P6). ICU device & flowsheet REST endpoints.
 */

import type { FastifyInstance } from "fastify";
import {
  createAdmission,
  getAdmission,
  listAdmissions,
  dischargeAdmission,
  listBeds,
  addFlowsheetEntry,
  getFlowsheet,
  addVentSettings,
  getVentHistory,
  addIoRecord,
  getIoRecords,
  getIoBalance,
  addScore,
  getScores,
  getIcuMetrics,
} from "./icu-store.js";

export default async function icuRoutes(server: FastifyInstance) {
  // ── Admissions ─────────────────────────────────────────────────

  server.post("/icu/admissions", async (request, reply) => {
    const body = (request.body as any) || {};
    const { patientDfn, bedId, admitSource, attendingProvider, diagnosis } = body;
    if (!patientDfn || !bedId || !attendingProvider || !diagnosis) {
      return reply.code(400).send({ ok: false, error: "patientDfn, bedId, attendingProvider, diagnosis required" });
    }
    const adm = createAdmission({
      patientDfn, bedId,
      admitSource: admitSource || "ed",
      attendingProvider, diagnosis,
      codeStatus: body.codeStatus,
    });
    if (!adm) return reply.code(400).send({ ok: false, error: "Bed unavailable" });
    return reply.code(201).send({ ok: true, admission: adm });
  });

  server.get("/icu/admissions", async (request) => {
    const { unit, status } = request.query as any;
    return { ok: true, admissions: listAdmissions({ unit, status }) };
  });

  server.get("/icu/admissions/:id", async (request, reply) => {
    const { id } = request.params as any;
    const adm = getAdmission(id);
    if (!adm) return reply.code(404).send({ ok: false, error: "Admission not found" });
    return { ok: true, admission: adm };
  });

  server.post("/icu/admissions/:id/discharge", async (request, reply) => {
    const { id } = request.params as any;
    const { disposition } = (request.body as any) || {};
    if (!disposition) return reply.code(400).send({ ok: false, error: "disposition required" });
    const ok = dischargeAdmission(id, disposition);
    if (!ok) return reply.code(400).send({ ok: false, error: "Admission not found or not active" });
    return { ok: true };
  });

  // ── Beds ───────────────────────────────────────────────────────

  server.get("/icu/beds", async (request) => {
    const { unit } = request.query as any;
    return { ok: true, beds: listBeds(unit) };
  });

  // ── Flowsheet ──────────────────────────────────────────────────

  server.post("/icu/admissions/:id/flowsheet", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { category, values } = body;
    if (!category || !values) {
      return reply.code(400).send({ ok: false, error: "category and values required" });
    }
    const entry = addFlowsheetEntry({
      admissionId: id, category, values,
      recordedBy: body.recordedBy || "system",
    });
    if (!entry) return reply.code(404).send({ ok: false, error: "Admission not found" });
    return reply.code(201).send({ ok: true, entry });
  });

  server.get("/icu/admissions/:id/flowsheet", async (request) => {
    const { id } = request.params as any;
    const { category } = request.query as any;
    return { ok: true, entries: getFlowsheet(id, category) };
  });

  // ── Ventilator ─────────────────────────────────────────────────

  server.post("/icu/admissions/:id/vent", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { mode, peep, fio2 } = body;
    if (!mode || peep === undefined || fio2 === undefined) {
      return reply.code(400).send({ ok: false, error: "mode, peep, fio2 required" });
    }
    const vs = addVentSettings({
      admissionId: id,
      timestamp: new Date().toISOString(),
      mode, peep, fio2,
      tidalVolume: body.tidalVolume,
      respiratoryRate: body.respiratoryRate,
      pressureSupport: body.pressureSupport,
      inspiratoryPressure: body.inspiratoryPressure,
      pip: body.pip,
      plateau: body.plateau,
      compliance: body.compliance,
      recordedBy: body.recordedBy || "system",
    });
    if (!vs) return reply.code(404).send({ ok: false, error: "Admission not found" });
    return reply.code(201).send({ ok: true, ventSettings: vs });
  });

  server.get("/icu/admissions/:id/vent", async (request) => {
    const { id } = request.params as any;
    return { ok: true, ventHistory: getVentHistory(id) };
  });

  // ── Intake & Output ────────────────────────────────────────────

  server.post("/icu/admissions/:id/io", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { type, source, volumeMl } = body;
    if (!type || !source || volumeMl === undefined) {
      return reply.code(400).send({ ok: false, error: "type, source, volumeMl required" });
    }
    const rec = addIoRecord({
      admissionId: id, type, source, volumeMl,
      timestamp: new Date().toISOString(),
      recordedBy: body.recordedBy || "system",
      description: body.description,
    });
    if (!rec) return reply.code(404).send({ ok: false, error: "Admission not found" });
    return reply.code(201).send({ ok: true, record: rec });
  });

  server.get("/icu/admissions/:id/io", async (request) => {
    const { id } = request.params as any;
    const { type } = request.query as any;
    return { ok: true, records: getIoRecords(id, type), balance: getIoBalance(id) };
  });

  // ── Severity Scores ────────────────────────────────────────────

  server.post("/icu/admissions/:id/scores", async (request, reply) => {
    const { id } = request.params as any;
    const body = (request.body as any) || {};
    const { scoreType, score } = body;
    if (!scoreType || score === undefined) {
      return reply.code(400).send({ ok: false, error: "scoreType and score required" });
    }
    const sc = addScore({
      admissionId: id, scoreType, score,
      components: body.components,
      timestamp: new Date().toISOString(),
      calculatedBy: body.calculatedBy || "system",
    });
    if (!sc) return reply.code(404).send({ ok: false, error: "Admission not found" });
    return reply.code(201).send({ ok: true, score: sc });
  });

  server.get("/icu/admissions/:id/scores", async (request) => {
    const { id } = request.params as any;
    const { scoreType } = request.query as any;
    return { ok: true, scores: getScores(id, scoreType) };
  });

  // ── ICU Metrics ────────────────────────────────────────────────

  server.get("/icu/metrics", async () => {
    return { ok: true, metrics: getIcuMetrics() };
  });
}
