/**
 * Imaging Modality Connectivity — Routes
 *
 * Phase 386 (W21-P9): REST endpoints for modality worklist (MWL),
 * MPPS tracking, modality AE configuration, and DICOMweb bridge.
 *
 * Endpoints:
 *
 * Worklist (MWL):
 *   POST /devices/imaging/worklist            — Create worklist item
 *   GET  /devices/imaging/worklist            — List worklist items
 *   GET  /devices/imaging/worklist/:id        — Get worklist item
 *   PATCH /devices/imaging/worklist/:id/status — Update status
 *
 * MPPS:
 *   POST /devices/imaging/mpps                — Create MPPS record (N-CREATE)
 *   GET  /devices/imaging/mpps                — List MPPS records
 *   GET  /devices/imaging/mpps/:id            — Get MPPS record
 *   PATCH /devices/imaging/mpps/:id/status    — Update MPPS status (N-SET)
 *
 * Modalities:
 *   POST /devices/imaging/modalities          — Register modality AE
 *   GET  /devices/imaging/modalities          — List modalities
 *   GET  /devices/imaging/modalities/:id      — Get modality
 *   PATCH /devices/imaging/modalities/:id/status — Update modality status
 *   POST /devices/imaging/modalities/:id/echo — Record C-ECHO success
 *
 * Stats & Audit:
 *   GET  /devices/imaging/stats               — Imaging modality statistics
 *   GET  /devices/imaging/audit               — Audit log
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import {
  createWorklistItem,
  getWorklistItem,
  listWorklistItems,
  updateWorklistStatus,
  createMppsRecord,
  getMppsRecord,
  listMppsRecords,
  updateMppsStatus,
  registerModality,
  getModality,
  listModalities,
  updateModalityStatus,
  updateModalityEcho,
  getImagingModalityStats,
  getModalityAudit,
} from "./imaging-modality-store.js";

const DEFAULT_TENANT = "default";

function tenant(req: FastifyRequest): string {
  return (req.headers["x-tenant-id"] as string) || DEFAULT_TENANT;
}

export default async function imagingModalityRoutes(server: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // Worklist (MWL)
  // -----------------------------------------------------------------------

  /** POST /devices/imaging/worklist */
  server.post("/devices/imaging/worklist", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.accessionNumber || !body.patientDfn || !body.patientName || !body.requestedProcedure || !body.modality || !body.scheduledDateTime) {
      return reply.code(400).send({ ok: false, error: "accessionNumber, patientDfn, patientName, requestedProcedure, modality, and scheduledDateTime required" });
    }
    const item = createWorklistItem(tenant(req), {
      accessionNumber: body.accessionNumber,
      patientDfn: body.patientDfn,
      patientName: body.patientName,
      patientDob: body.patientDob,
      patientSex: body.patientSex,
      requestedProcedure: body.requestedProcedure,
      requestedProcedureId: body.requestedProcedureId,
      modality: body.modality,
      scheduledAeTitle: body.scheduledAeTitle,
      scheduledDateTime: body.scheduledDateTime,
      scheduledPhysician: body.scheduledPhysician,
      referringPhysician: body.referringPhysician,
      studyInstanceUid: body.studyInstanceUid,
      scheduledStepId: body.scheduledStepId,
      vistaOrderIen: body.vistaOrderIen,
    });
    return reply.code(201).send({ ok: true, worklistItem: item });
  });

  /** GET /devices/imaging/worklist */
  server.get("/devices/imaging/worklist", async (req: FastifyRequest) => {
    const q = req.query as any;
    const items = listWorklistItems(tenant(req), {
      modality: q.modality,
      status: q.status,
      patientDfn: q.patientDfn,
      scheduledAeTitle: q.scheduledAeTitle,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return { ok: true, count: items.length, worklistItems: items };
  });

  /** GET /devices/imaging/worklist/:id */
  server.get("/devices/imaging/worklist/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const item = getWorklistItem(id);
    if (!item) return reply.code(404).send({ ok: false, error: "worklist item not found" });
    return { ok: true, worklistItem: item };
  });

  /** PATCH /devices/imaging/worklist/:id/status */
  server.patch("/devices/imaging/worklist/:id/status", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    if (!body.status) return reply.code(400).send({ ok: false, error: "status required" });
    const item = updateWorklistStatus(id, body.status);
    if (!item) return reply.code(404).send({ ok: false, error: "worklist item not found" });
    return { ok: true, worklistItem: item };
  });

  // -----------------------------------------------------------------------
  // MPPS
  // -----------------------------------------------------------------------

  /** POST /devices/imaging/mpps — N-CREATE equivalent */
  server.post("/devices/imaging/mpps", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.studyInstanceUid || !body.performingAeTitle || !body.modality || !body.startDateTime) {
      return reply.code(400).send({ ok: false, error: "studyInstanceUid, performingAeTitle, modality, and startDateTime required" });
    }
    const rec = createMppsRecord(tenant(req), {
      mppsInstanceUid: body.mppsInstanceUid,
      studyInstanceUid: body.studyInstanceUid,
      accessionNumber: body.accessionNumber,
      performingAeTitle: body.performingAeTitle,
      status: body.status || "IN PROGRESS",
      modality: body.modality,
      procedureDescription: body.procedureDescription,
      startDateTime: body.startDateTime,
      endDateTime: body.endDateTime,
      seriesCount: body.seriesCount,
      instanceCount: body.instanceCount,
      performingPhysician: body.performingPhysician,
      doseReport: body.doseReport,
    });
    return reply.code(201).send({ ok: true, mppsRecord: rec });
  });

  /** GET /devices/imaging/mpps */
  server.get("/devices/imaging/mpps", async (req: FastifyRequest) => {
    const q = req.query as any;
    const recs = listMppsRecords(tenant(req), {
      status: q.status,
      modality: q.modality,
      performingAeTitle: q.performingAeTitle,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return { ok: true, count: recs.length, mppsRecords: recs };
  });

  /** GET /devices/imaging/mpps/:id */
  server.get("/devices/imaging/mpps/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const rec = getMppsRecord(id);
    if (!rec) return reply.code(404).send({ ok: false, error: "MPPS record not found" });
    return { ok: true, mppsRecord: rec };
  });

  /** PATCH /devices/imaging/mpps/:id/status — N-SET equivalent */
  server.patch("/devices/imaging/mpps/:id/status", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    if (!body.status) return reply.code(400).send({ ok: false, error: "status required" });
    const rec = updateMppsStatus(id, body.status, {
      endDateTime: body.endDateTime,
      seriesCount: body.seriesCount,
      instanceCount: body.instanceCount,
    });
    if (!rec) return reply.code(404).send({ ok: false, error: "MPPS record not found" });
    return { ok: true, mppsRecord: rec };
  });

  // -----------------------------------------------------------------------
  // Modalities
  // -----------------------------------------------------------------------

  /** POST /devices/imaging/modalities */
  server.post("/devices/imaging/modalities", async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.aeTitle || !body.modality || !body.host || !body.port) {
      return reply.code(400).send({ ok: false, error: "aeTitle, modality, host, and port required" });
    }
    const result = registerModality(tenant(req), {
      aeTitle: body.aeTitle,
      modality: body.modality,
      host: body.host,
      port: body.port,
      displayName: body.displayName,
      location: body.location,
      mwlEnabled: body.mwlEnabled ?? true,
      mppsEnabled: body.mppsEnabled ?? true,
    });
    if ("error" in result) return reply.code(409).send({ ok: false, error: result.error });
    return reply.code(201).send({ ok: true, modality: result });
  });

  /** GET /devices/imaging/modalities */
  server.get("/devices/imaging/modalities", async (req: FastifyRequest) => {
    const q = req.query as any;
    const mods = listModalities(tenant(req), {
      modality: q.modality,
      status: q.status,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return { ok: true, count: mods.length, modalities: mods };
  });

  /** GET /devices/imaging/modalities/:id */
  server.get("/devices/imaging/modalities/:id", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const mod = getModality(id);
    if (!mod) return reply.code(404).send({ ok: false, error: "modality not found" });
    return { ok: true, modality: mod };
  });

  /** PATCH /devices/imaging/modalities/:id/status */
  server.patch("/devices/imaging/modalities/:id/status", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    if (!body.status) return reply.code(400).send({ ok: false, error: "status required" });
    const mod = updateModalityStatus(id, body.status);
    if (!mod) return reply.code(404).send({ ok: false, error: "modality not found" });
    return { ok: true, modality: mod };
  });

  /** POST /devices/imaging/modalities/:id/echo — record C-ECHO success */
  server.post("/devices/imaging/modalities/:id/echo", async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const mod = updateModalityEcho(id);
    if (!mod) return reply.code(404).send({ ok: false, error: "modality not found" });
    return { ok: true, modality: mod };
  });

  // -----------------------------------------------------------------------
  // Stats & Audit
  // -----------------------------------------------------------------------

  /** GET /devices/imaging/stats */
  server.get("/devices/imaging/stats", async (req: FastifyRequest) => {
    return { ok: true, stats: getImagingModalityStats(tenant(req)) };
  });

  /** GET /devices/imaging/audit */
  server.get("/devices/imaging/audit", async (req: FastifyRequest) => {
    const q = req.query as any;
    const limit = q.limit ? Number(q.limit) : 200;
    return { ok: true, audit: getModalityAudit(tenant(req), limit) };
  });
}
