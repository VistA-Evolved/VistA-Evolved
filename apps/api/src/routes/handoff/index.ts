/**
 * Phase 86 — Shift Handoff + Signout Routes.
 *
 * Endpoints:
 *   GET    /handoff/reports           -- List handoff reports (filter by ward/status)
 *   GET    /handoff/reports/:id       -- Get single handoff report
 *   POST   /handoff/reports           -- Create new handoff report (SBAR + patients)
 *   PUT    /handoff/reports/:id       -- Update handoff report (draft/submitted only)
 *   POST   /handoff/reports/:id/submit   -- Submit for incoming shift
 *   POST   /handoff/reports/:id/accept   -- Accept handoff (incoming staff)
 *   POST   /handoff/reports/:id/archive  -- Archive completed handoff
 *   GET    /handoff/ward-patients?ward=X -- Assemble patient list for ward (VistA RPCs)
 *
 * Storage: In-memory (resets on restart). See handoff-store.ts for migration plan.
 * VistA RPCs used: ORQPT WARD PATIENTS, ORWPS ACTIVE, ORQQAL LIST (for data assembly).
 * VistA RPCs targeted: CRHD * (58 RPCs, not available in WorldVistA sandbox).
 *
 * Auth: session-based (/handoff/ in AUTH_RULES).
 * Audit: clinical.handoff-create, clinical.handoff-accept, clinical.handoff-view.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../../auth/auth-routes.js";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { log } from "../../lib/logger.js";
import { audit } from "../../lib/audit.js";
import {
  createHandoffReport,
  getHandoffReport,
  listHandoffReports,
  updateHandoffReport,
  submitHandoffReport,
  acceptHandoffReport,
  archiveHandoffReport,
  getStoreStats,
} from "./handoff-store.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Extract session actor for audit. */
function actorFromSession(session: any): { duz: string; name: string; role?: string } {
  return {
    duz: session?.duz || session?.user?.duz || "unknown",
    name: session?.userName || session?.user?.name || "Unknown User",
    role: session?.role || session?.user?.role,
  };
}

/** CRHD migration targets — all responses include these. */
const CRHD_MIGRATION_TARGETS = [
  { rpc: "CRHD GET PAT LIST", package: "CRHD", reason: "VistA-native patient list assembly for handoff" },
  { rpc: "CRHD HOT TEAM SAVE", package: "CRHD", reason: "Persist handoff team data in VistA" },
  { rpc: "CRHD HOT TEAM LIST", package: "CRHD", reason: "Retrieve team-based handoff history" },
];

const VISTA_GROUNDING = {
  vistaPackage: "CRHD (Shift Handoff Tool)",
  rpcCount: 58,
  vistaFiles: ["CRHD files (proprietary to Shift Handoff Tool package)"],
  targetRoutines: ["CRHD*"],
  currentStorage: "In-memory (API process). Resets on restart.",
  migrationPath: "Install CRHD package → configure CRHD RPCs → replace in-memory store with CRHD calls. Alternatively: persist as TIU document class 'SHIFT HANDOFF NOTE' via TIU CREATE RECORD.",
  sandboxNote: "WorldVistA Docker does not include CRHD (Shift Handoff Tool) package. 0 of 58 RPCs available.",
  alternativeMigration: "Custom TIU document type or MailMan bulletin for shift-to-shift notifications.",
};

/* ------------------------------------------------------------------ */
/* Ward patient assembly (VistA RPCs)                                   */
/* ------------------------------------------------------------------ */

interface WardPatientSummary {
  dfn: string;
  name: string;
  roomBed: string;
  activeMedCount: number;
  allergyCount: number;
}

async function assembleWardPatients(ward: string): Promise<{
  patients: WardPatientSummary[];
  rpcsUsed: string[];
}> {
  const rpcsUsed: string[] = [];

  // Get ward patient list
  let patientLines: string[];
  try {
    patientLines = await safeCallRpc("ORQPT WARD PATIENTS", [ward]);
    rpcsUsed.push("ORQPT WARD PATIENTS");
  } catch {
    return { patients: [], rpcsUsed: ["ORQPT WARD PATIENTS"] };
  }

  if (!patientLines || patientLines.length === 0) {
    return { patients: [], rpcsUsed };
  }

  const patients: WardPatientSummary[] = [];

  for (const line of patientLines) {
    if (!line.trim()) continue;
    // Format: DFN^NAME or DFN^NAME^extra
    const parts = line.split("^");
    const dfn = parts[0]?.trim();
    const name = parts[1]?.trim() || "";
    if (!dfn || !/^\d+$/.test(dfn)) continue;

    // For each patient, try to get med count and allergy count
    let activeMedCount = 0;
    let allergyCount = 0;

    try {
      const medLines = await safeCallRpc("ORWPS ACTIVE", [dfn]);
      if (medLines && medLines.length > 0 && !medLines[0].startsWith("-1")) {
        activeMedCount = medLines.filter((l: string) => l.startsWith("~")).length;
        if (!rpcsUsed.includes("ORWPS ACTIVE")) rpcsUsed.push("ORWPS ACTIVE");
      }
    } catch {
      // Non-fatal — just leave count at 0
    }

    try {
      const allergyLines = await safeCallRpc("ORQQAL LIST", [dfn]);
      if (allergyLines && allergyLines.length > 0 && !allergyLines[0].startsWith("-1")) {
        allergyCount = allergyLines.filter((l: string) => l.trim()).length;
        if (!rpcsUsed.includes("ORQQAL LIST")) rpcsUsed.push("ORQQAL LIST");
      }
    } catch {
      // Non-fatal
    }

    patients.push({ dfn, name, roomBed: "", activeMedCount, allergyCount });
  }

  return { patients, rpcsUsed };
}

/* ================================================================== */
/* Route registration                                                   */
/* ================================================================== */

export default async function handoffRoutes(server: FastifyInstance) {

  /* ------ GET /handoff/ward-patients?ward=X ------ */
  server.get("/handoff/ward-patients", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const ward = String((request.query as any)?.ward || "").trim();

    if (!ward) {
      return reply.code(400).send({ ok: false, error: "Missing ward query parameter" });
    }
    if (ward.length > 100) {
      return reply.code(400).send({ ok: false, error: "Ward name exceeds maximum length" });
    }

    const actor = actorFromSession(session);
    audit("phi.patient-list", "success", actor, { detail: { context: "handoff-ward-assembly", ward } });

    try {
      const { patients, rpcsUsed } = await assembleWardPatients(ward);
      return {
        ok: true,
        source: "vista",
        ward,
        count: patients.length,
        patients,
        rpcUsed: rpcsUsed,
        pendingTargets: [
          { rpc: "CRHD GET PAT LIST", package: "CRHD", reason: "VistA-native ward patient assembly for handoff (not available in sandbox)" },
          { rpc: "CRHD INPT LIST", package: "CRHD", reason: "Inpatient list with handoff-specific metadata" },
        ],
        vistaGrounding: VISTA_GROUNDING,
      };
    } catch (err: any) {
      log.error("Handoff ward patient assembly failed", { error: err.message, ward });
      return reply.code(502).send({
        ok: false,
        error: err.message,
        source: "error",
        rpcUsed: ["ORQPT WARD PATIENTS"],
        pendingTargets: [],
      });
    }
  });

  /* ------ GET /handoff/reports ------ */
  server.get("/handoff/reports", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const query = request.query as any;
    const ward = query?.ward ? String(query.ward).trim() : undefined;
    const status = query?.status ? String(query.status).trim() : undefined;

    const actor = actorFromSession(session);
    audit("clinical.handoff-view", "success", actor, { detail: { context: "list", ward, status } });

    const reports = listHandoffReports({ ward, status });
    const stats = getStoreStats();

    return {
      ok: true,
      source: "local-store",
      count: reports.length,
      reports: reports.map(r => ({
        id: r.id,
        ward: r.ward,
        shiftLabel: r.shiftLabel,
        shiftStart: r.shiftStart,
        shiftEnd: r.shiftEnd,
        createdBy: r.createdBy,
        acceptedBy: r.acceptedBy,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
        acceptedAt: r.acceptedAt,
        status: r.status,
        patientCount: r.patients.length,
      })),
      storeStats: stats,
      storageNote: "Handoff reports are stored in API process memory. They reset on API restart. See vistaGrounding for migration path.",
      pendingTargets: CRHD_MIGRATION_TARGETS,
      vistaGrounding: VISTA_GROUNDING,
    };
  });

  /* ------ GET /handoff/reports/:id ------ */
  server.get("/handoff/reports/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };

    const report = getHandoffReport(id);
    if (!report) {
      return reply.code(404).send({ ok: false, error: "Handoff report not found" });
    }

    const actor = actorFromSession(session);
    audit("clinical.handoff-view", "success", actor, {
      detail: { handoffId: id, ward: report.ward, status: report.status },
    });

    return {
      ok: true,
      source: "local-store",
      report,
      pendingTargets: CRHD_MIGRATION_TARGETS,
      vistaGrounding: VISTA_GROUNDING,
    };
  });

  /* ------ POST /handoff/reports ------ */
  server.post("/handoff/reports", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};

    const ward = String(body.ward || "").trim();
    const shiftLabel = String(body.shiftLabel || "").trim();
    const shiftStart = String(body.shiftStart || "").trim();
    const shiftEnd = String(body.shiftEnd || "").trim();

    if (!ward) {
      return reply.code(400).send({ ok: false, error: "Missing ward" });
    }
    if (ward.length > 100) {
      return reply.code(400).send({ ok: false, error: "Ward name exceeds maximum length" });
    }
    if (!shiftLabel) {
      return reply.code(400).send({ ok: false, error: "Missing shiftLabel" });
    }
    if (shiftLabel.length > 200) {
      return reply.code(400).send({ ok: false, error: "Shift label exceeds maximum length" });
    }
    if (!shiftStart || !shiftEnd) {
      return reply.code(400).send({ ok: false, error: "Missing shiftStart or shiftEnd" });
    }

    const actor = actorFromSession(session);
    const patients = Array.isArray(body.patients) ? body.patients : [];
    const shiftNotes = String(body.shiftNotes || "").trim();

    if (shiftNotes.length > 10000) {
      return reply.code(400).send({ ok: false, error: "Shift notes exceed maximum length (10000 chars)" });
    }

    // Validate patient SBAR fields (limit content size)
    for (const p of patients) {
      const sbar = p.sbar || {};
      for (const field of ["situation", "background", "assessment", "recommendation"]) {
        if (typeof sbar[field] === "string" && sbar[field].length > 5000) {
          return reply.code(400).send({ ok: false, error: `Patient SBAR ${field} exceeds maximum length (5000 chars)` });
        }
      }
    }

    const report = createHandoffReport({
      ward,
      shiftLabel,
      shiftStart,
      shiftEnd,
      createdBy: { duz: actor.duz, name: actor.name },
      patients,
      shiftNotes,
    });

    log.info("Handoff report created", { handoffId: report.id, ward, patientCount: report.patients.length });
    audit("clinical.handoff-create", "success", actor, {
      detail: { handoffId: report.id, ward, shiftLabel, patientCount: patients.length },
    });

    return reply.code(201).send({
      ok: true,
      source: "local-store",
      report,
      storageNote: "Stored in API process memory. Resets on API restart.",
      pendingTargets: CRHD_MIGRATION_TARGETS,
      vistaGrounding: VISTA_GROUNDING,
    });
  });

  /* ------ PUT /handoff/reports/:id ------ */
  server.put("/handoff/reports/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    const existing = getHandoffReport(id);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: "Handoff report not found" });
    }
    if (existing.status === "archived") {
      return reply.code(409).send({ ok: false, error: "Cannot update archived handoff report" });
    }

    const updates: any = {};
    if (body.patients !== undefined) updates.patients = body.patients;
    if (body.shiftNotes !== undefined) {
      if (String(body.shiftNotes).length > 10000) {
        return reply.code(400).send({ ok: false, error: "Shift notes exceed maximum length (10000 chars)" });
      }
      updates.shiftNotes = String(body.shiftNotes);
    }
    if (body.shiftLabel !== undefined) {
      if (String(body.shiftLabel).length > 200) {
        return reply.code(400).send({ ok: false, error: "Shift label exceeds maximum length" });
      }
      updates.shiftLabel = String(body.shiftLabel);
    }

    const updated = updateHandoffReport(id, updates);
    if (!updated) {
      return reply.code(409).send({ ok: false, error: "Update failed — report may be archived" });
    }

    const actor = actorFromSession(session);
    log.info("Handoff report updated", { handoffId: id });
    audit("clinical.handoff-update", "success", actor, {
      detail: { handoffId: id, ward: updated.ward },
    });

    return {
      ok: true,
      source: "local-store",
      report: updated,
      pendingTargets: CRHD_MIGRATION_TARGETS,
      vistaGrounding: VISTA_GROUNDING,
    };
  });

  /* ------ POST /handoff/reports/:id/submit ------ */
  server.post("/handoff/reports/:id/submit", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };

    const submitted = submitHandoffReport(id);
    if (!submitted) {
      return reply.code(409).send({ ok: false, error: "Cannot submit — report must be in draft status" });
    }

    const actor = actorFromSession(session);
    log.info("Handoff report submitted", { handoffId: id, ward: submitted.ward });
    audit("clinical.handoff-submit", "success", actor, {
      detail: { handoffId: id, ward: submitted.ward },
    });

    return {
      ok: true,
      source: "local-store",
      report: submitted,
      pendingTargets: CRHD_MIGRATION_TARGETS,
      vistaGrounding: VISTA_GROUNDING,
    };
  });

  /* ------ POST /handoff/reports/:id/accept ------ */
  server.post("/handoff/reports/:id/accept", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };

    const actor = actorFromSession(session);
    const accepted = acceptHandoffReport(id, { duz: actor.duz, name: actor.name });
    if (!accepted) {
      return reply.code(409).send({ ok: false, error: "Cannot accept — report must be in submitted status" });
    }

    log.info("Handoff report accepted", { handoffId: id, acceptedBy: actor.duz, ward: accepted.ward });
    audit("clinical.handoff-accept", "success", actor, {
      detail: { handoffId: id, ward: accepted.ward, acceptedBy: actor.duz },
    });

    return {
      ok: true,
      source: "local-store",
      report: accepted,
      pendingTargets: CRHD_MIGRATION_TARGETS,
      vistaGrounding: VISTA_GROUNDING,
    };
  });

  /* ------ POST /handoff/reports/:id/archive ------ */
  server.post("/handoff/reports/:id/archive", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };

    const archived = archiveHandoffReport(id);
    if (!archived) {
      return reply.code(409).send({ ok: false, error: "Cannot archive — report must be in accepted status" });
    }

    const actor = actorFromSession(session);
    log.info("Handoff report archived", { handoffId: id, ward: archived.ward });
    audit("clinical.handoff-archive", "success", actor, {
      detail: { handoffId: id, ward: archived.ward },
    });

    return {
      ok: true,
      source: "local-store",
      report: archived,
      pendingTargets: CRHD_MIGRATION_TARGETS,
      vistaGrounding: VISTA_GROUNDING,
    };
  });
}
