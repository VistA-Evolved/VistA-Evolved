/**
 * Clinical Procedures Routes -- Phase 537: CP/MD v1
 *
 * Endpoints:
 *   GET  /vista/clinical-procedures?dfn=N                -- List CP results for patient
 *   GET  /vista/clinical-procedures/:id                  -- Detail of a CP result
 *   GET  /vista/clinical-procedures/medicine?dfn=N       -- Medicine (MD) data
 *   GET  /vista/clinical-procedures/consult-link?consultId=N -- Consult-procedure linkage
 *
 * Auth: session-based (/vista/* catch-all in security.ts).
 * VistA RPCs: MD namespace + ORQQCN medicine RPCs + TIU CLINPROC RPCs.
 *
 * All endpoints return integration-pending in the sandbox because
 * MD package RPCs have no data in WorldVistA Docker.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../../auth/auth-routes.js";
import { log } from "../../lib/logger.js";

/* ------------------------------------------------------------------ */
/* In-memory stub store (future writeback prep)                        */
/* ------------------------------------------------------------------ */

interface CpResult {
  id: string;
  dfn: string;
  procedureName: string;
  status: string;
  datePerformed: string;
  provider: string;
  linkedConsultId?: string;
  vistaIen?: string;
}

const cpResultStore = new Map<string, CpResult>();
const patientCpIndex = new Map<string, string[]>();

/* ------------------------------------------------------------------ */
/* Integration-pending response builder                                */
/* ------------------------------------------------------------------ */

interface PendingInfo {
  vistaFiles: string[];
  targetRoutines: string[];
  targetRpcs: string[];
  migrationPath: string;
  sandboxNote: string;
}

function integrationPendingResponse(
  endpoint: string,
  dfn: string,
  info: PendingInfo,
) {
  return {
    ok: true,
    status: "integration-pending",
    endpoint,
    count: 0,
    results: [],
    vistaGrounding: {
      vistaFiles: info.vistaFiles,
      targetRoutines: info.targetRoutines,
      targetRpcs: info.targetRpcs,
      migrationPath: info.migrationPath,
      sandboxNote: info.sandboxNote,
    },
    hint: "This endpoint returns real VistA data in production. MD package RPCs are callable but return empty results in the WorldVistA sandbox.",
  };
}

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function clinicalProceduresRoutes(server: FastifyInstance) {
  // Ensure stores are ready
  log.info("Clinical Procedures routes registered (Phase 537)");

  /* ------------------------------------------------------------ */
  /* GET /vista/clinical-procedures?dfn=N -- List CP results       */
  /* ------------------------------------------------------------ */
  server.get("/vista/clinical-procedures", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { dfn } = request.query as { dfn?: string };
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: "Missing dfn query parameter" });
    }

    // Check in-memory store first
    const ids = patientCpIndex.get(dfn) || [];
    const localResults = ids.map((id) => cpResultStore.get(id)).filter(Boolean);
    if (localResults.length > 0) {
      return {
        ok: true,
        source: "local",
        count: localResults.length,
        results: localResults,
      };
    }

    // MD CLIO / MD TMDPROCEDURE -- not wired in sandbox
    return integrationPendingResponse("/vista/clinical-procedures", dfn, {
      vistaFiles: [
        "File 702 (Clinical Procedures)",
        "File 702.01 (CP Definitions)",
        "File 702.09 (CP Results)",
        "File 697.2 (Medicine)",
      ],
      targetRoutines: ["MDCLIO", "MDRPCOD", "MDRPCOP", "MDRPCOR"],
      targetRpcs: ["MD CLIO", "MD TMDPROCEDURE", "MD TMDPATIENT", "MD TMDRECORDID"],
      migrationPath: "1) Wire MD CLIO to fetch CP results from File 702, 2) Parse CliO XML/delimited results, 3) Map to CpResult type",
      sandboxNote: "MD RPCs are callable but File 702 has no data in WorldVistA Docker. Requires CP package configuration.",
    });
  });

  /* ------------------------------------------------------------ */
  /* GET /vista/clinical-procedures/:id -- CP result detail        */
  /* ------------------------------------------------------------ */
  server.get("/vista/clinical-procedures/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { id } = request.params as { id: string };
    const result = cpResultStore.get(id);
    if (result) {
      return { ok: true, source: "local", result };
    }

    return integrationPendingResponse("/vista/clinical-procedures/:id", id, {
      vistaFiles: [
        "File 702 (Clinical Procedures)",
        "File 702.09 (CP Results)",
      ],
      targetRoutines: ["MDCLIO", "MDRPCOR", "MDRPCOO"],
      targetRpcs: ["MD CLIO", "MD TMDRECORDID", "MD TMDOUTPUT"],
      migrationPath: "1) Call MD TMDRECORDID with CP IEN, 2) Parse result record, 3) Optionally call MD TMDOUTPUT for report text",
      sandboxNote: "Detail endpoint requires seeded CP data in File 702.",
    });
  });

  /* ------------------------------------------------------------ */
  /* GET /vista/clinical-procedures/medicine?dfn=N -- Medicine data */
  /* ------------------------------------------------------------ */
  server.get("/vista/clinical-procedures/medicine", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { dfn } = request.query as { dfn?: string };
    if (!dfn) {
      return reply.code(400).send({ ok: false, error: "Missing dfn query parameter" });
    }

    return integrationPendingResponse("/vista/clinical-procedures/medicine", dfn, {
      vistaFiles: [
        "File 697.2 (Medicine)",
        "File 690 (Electrocardiogram)",
        "File 691 (Pulmonary Function)",
        "File 694 (Cardiac Catheterization)",
        "File 699 (Endoscopy)",
      ],
      targetRoutines: ["MDRPCOP", "MDRPCOW", "MDRPCW"],
      targetRpcs: ["MD TMDPATIENT", "MD TMDWIDGET", "MD TMDCIDC"],
      migrationPath: "1) Wire MD TMDPATIENT for medicine results by patient, 2) Wire MD TMDWIDGET for widget display data, 3) Map to medicine result types",
      sandboxNote: "Medicine files (690-699) have no data in WorldVistA Docker. Requires procedure recording in production.",
    });
  });

  /* ------------------------------------------------------------ */
  /* GET /vista/clinical-procedures/consult-link?consultId=N       */
  /* ------------------------------------------------------------ */
  server.get("/vista/clinical-procedures/consult-link", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    if (!session) return;

    const { consultId } = request.query as { consultId?: string };
    if (!consultId) {
      return reply.code(400).send({ ok: false, error: "Missing consultId query parameter" });
    }

    return integrationPendingResponse("/vista/clinical-procedures/consult-link", consultId, {
      vistaFiles: [
        "File 123 (Request/Consultation)",
        "File 702 (Clinical Procedures)",
      ],
      targetRoutines: ["ORQQCN3", "MDRPCOD"],
      targetRpcs: [
        "ORQQCN ASSIGNABLE MED RESULTS",
        "ORQQCN ATTACH MED RESULTS",
        "ORQQCN REMOVABLE MED RESULTS",
        "ORQQCN GET MED RESULT DETAILS",
      ],
      migrationPath: "1) Call ORQQCN ASSIGNABLE MED RESULTS to get linkable results, 2) Present for selection, 3) POST ORQQCN ATTACH MED RESULTS to link",
      sandboxNote: "Consult-procedure linking requires both File 123 consults and File 702 CP results.",
    });
  });
}
