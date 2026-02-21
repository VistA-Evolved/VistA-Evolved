/**
 * ADT + Inpatient Routes -- Phase 67: VistA-first, read-first.
 *
 * Endpoints:
 *   GET  /vista/adt/wards                          -- List all wards (ORQPT WARDS)
 *   GET  /vista/adt/ward-patients?ward=IEN          -- Ward census (ORQPT WARD PATIENTS)
 *   GET  /vista/adt/provider-patients               -- Provider patient list (ORQPT PROVIDER PATIENTS)
 *   GET  /vista/adt/teams                           -- List teams (ORQPT TEAMS)
 *   GET  /vista/adt/team-patients?team=IEN          -- Team patient list (ORQPT TEAM PATIENTS)
 *   GET  /vista/adt/specialties                     -- List specialties (ORQPT SPECIALTIES)
 *   GET  /vista/adt/specialty-patients?specialty=IEN -- Specialty patient list (ORQPT SPECIALTY PATIENTS)
 *   GET  /vista/adt/locations?search=TEXT            -- Location search (ORWU1 NEWLOC)
 *   GET  /vista/adt/admission-list?dfn=N            -- Admission history (ORWPT16 ADMITLST)
 *   POST /vista/adt/admit                           -- (integration-pending)
 *   POST /vista/adt/transfer                        -- (integration-pending)
 *   POST /vista/adt/discharge                       -- (integration-pending)
 *
 * Auth: session-based (/vista/* catch-all in security.ts).
 * Every response includes rpcUsed[], pendingTargets[], source.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../../auth/auth-routes.js";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { log } from "../../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Parse IEN^NAME lines (wards, teams, specialties). */
function parseIenNameList(lines: string[]): Array<{ ien: string; name: string }> {
  const results: Array<{ ien: string; name: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split("^");
    const ien = parts[0]?.trim() || "";
    if (!ien) continue;
    results.push({ ien, name: parts[1]?.trim() || "" });
  }
  return results;
}

/** Parse patient list lines: DFN^NAME (ORQPT patient list RPCs). */
function parsePatientList(lines: string[]): Array<{ dfn: string; name: string }> {
  const results: Array<{ dfn: string; name: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split("^");
    const dfn = parts[0]?.trim() || "";
    if (!dfn) continue;
    results.push({ dfn, name: parts[1]?.trim() || "" });
  }
  return results;
}

/** Parse ORWU1 NEWLOC response: IEN^NAME^... */
function parseLocations(lines: string[]): Array<{ ien: string; name: string; type: string }> {
  const results: Array<{ ien: string; name: string; type: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split("^");
    const ien = parts[0]?.trim() || "";
    if (!ien) continue;
    results.push({
      ien,
      name: parts[1]?.trim() || "",
      type: parts[2]?.trim() || "",
    });
  }
  return results;
}

/** Parse ORWPT16 ADMITLST response: DFN^NAME^ADMIT_DATE^WARD^... */
function parseAdmissionList(lines: string[]): Array<{
  dfn: string;
  name: string;
  admitDate: string;
  ward: string;
  room: string;
}> {
  const results: Array<{
    dfn: string;
    name: string;
    admitDate: string;
    ward: string;
    room: string;
  }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split("^");
    const dfn = parts[0]?.trim() || "";
    if (!dfn) continue;
    results.push({
      dfn,
      name: parts[1]?.trim() || "",
      admitDate: parts[2]?.trim() || "",
      ward: parts[3]?.trim() || "",
      room: parts[4]?.trim() || "",
    });
  }
  return results;
}

/** Standard integration-pending error fallback. */
function pendingFallback(
  reply: FastifyReply,
  rpcName: string,
  err: any
) {
  const errMsg = err?.message || String(err);
  log.warn(`${rpcName} failed -- returning integration-pending`, { err: errMsg });
  return reply.send({
    ok: true,
    source: "vista",
    count: 0,
    results: [],
    rpcUsed: [],
    pendingTargets: [rpcName],
    _integration: "pending",
    _error: errMsg.includes("ECONNREFUSED") ? "VistA unavailable" : "RPC call failed",
  });
}

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

export default async function adtRoutes(server: FastifyInstance): Promise<void> {

  /* ---- GET /vista/adt/wards ---- */
  server.get("/vista/adt/wards", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    try {
      const lines = await safeCallRpc("ORQPT WARDS", []);
      const results = parseIenNameList(lines);
      return reply.send({
        ok: true, source: "vista", count: results.length, results,
        rpcUsed: ["ORQPT WARDS"], pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, "ORQPT WARDS", err);
    }
  });

  /* ---- GET /vista/adt/ward-patients?ward=IEN ---- */
  server.get("/vista/adt/ward-patients", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    const ward = (request.query as any)?.ward;
    if (!ward) {
      return reply.status(400).send({ ok: false, error: "ward query parameter required" });
    }
    try {
      const lines = await safeCallRpc("ORQPT WARD PATIENTS", [String(ward)]);
      const results = parsePatientList(lines);
      return reply.send({
        ok: true, source: "vista", count: results.length, results,
        rpcUsed: ["ORQPT WARD PATIENTS"], pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, "ORQPT WARD PATIENTS", err);
    }
  });

  /* ---- GET /vista/adt/provider-patients ---- */
  server.get("/vista/adt/provider-patients", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    try {
      // ORQPT PROVIDER PATIENTS takes DUZ as param
      const duz = (session as any)?.duz || "";
      const lines = await safeCallRpc("ORQPT PROVIDER PATIENTS", [String(duz)]);
      const results = parsePatientList(lines);
      return reply.send({
        ok: true, source: "vista", count: results.length, results,
        rpcUsed: ["ORQPT PROVIDER PATIENTS"], pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, "ORQPT PROVIDER PATIENTS", err);
    }
  });

  /* ---- GET /vista/adt/teams ---- */
  server.get("/vista/adt/teams", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    try {
      const lines = await safeCallRpc("ORQPT TEAMS", []);
      const results = parseIenNameList(lines);
      return reply.send({
        ok: true, source: "vista", count: results.length, results,
        rpcUsed: ["ORQPT TEAMS"], pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, "ORQPT TEAMS", err);
    }
  });

  /* ---- GET /vista/adt/team-patients?team=IEN ---- */
  server.get("/vista/adt/team-patients", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    const team = (request.query as any)?.team;
    if (!team) {
      return reply.status(400).send({ ok: false, error: "team query parameter required" });
    }
    try {
      const lines = await safeCallRpc("ORQPT TEAM PATIENTS", [String(team)]);
      const results = parsePatientList(lines);
      return reply.send({
        ok: true, source: "vista", count: results.length, results,
        rpcUsed: ["ORQPT TEAM PATIENTS"], pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, "ORQPT TEAM PATIENTS", err);
    }
  });

  /* ---- GET /vista/adt/specialties ---- */
  server.get("/vista/adt/specialties", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    try {
      const lines = await safeCallRpc("ORQPT SPECIALTIES", []);
      const results = parseIenNameList(lines);
      return reply.send({
        ok: true, source: "vista", count: results.length, results,
        rpcUsed: ["ORQPT SPECIALTIES"], pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, "ORQPT SPECIALTIES", err);
    }
  });

  /* ---- GET /vista/adt/specialty-patients?specialty=IEN ---- */
  server.get("/vista/adt/specialty-patients", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    const specialty = (request.query as any)?.specialty;
    if (!specialty) {
      return reply.status(400).send({ ok: false, error: "specialty query parameter required" });
    }
    try {
      const lines = await safeCallRpc("ORQPT SPECIALTY PATIENTS", [String(specialty)]);
      const results = parsePatientList(lines);
      return reply.send({
        ok: true, source: "vista", count: results.length, results,
        rpcUsed: ["ORQPT SPECIALTY PATIENTS"], pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, "ORQPT SPECIALTY PATIENTS", err);
    }
  });

  /* ---- GET /vista/adt/locations?search=TEXT ---- */
  server.get("/vista/adt/locations", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    const search = (request.query as any)?.search || "";
    if (!search) {
      return reply.status(400).send({ ok: false, error: "search query parameter required" });
    }
    try {
      const lines = await safeCallRpc("ORWU1 NEWLOC", [String(search)]);
      const results = parseLocations(lines);
      return reply.send({
        ok: true, source: "vista", count: results.length, results,
        rpcUsed: ["ORWU1 NEWLOC"], pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, "ORWU1 NEWLOC", err);
    }
  });

  /* ---- GET /vista/adt/admission-list?dfn=N ---- */
  server.get("/vista/adt/admission-list", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) {
      return reply.status(400).send({ ok: false, error: "dfn query parameter required" });
    }
    try {
      const lines = await safeCallRpc("ORWPT16 ADMITLST", [String(dfn)]);
      const results = parseAdmissionList(lines);
      return reply.send({
        ok: true, source: "vista", count: results.length, results,
        rpcUsed: ["ORWPT16 ADMITLST"], pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, "ORWPT16 ADMITLST", err);
    }
  });

  /* ---- POST /vista/adt/admit -- INTEGRATION PENDING ---- */
  server.post("/vista/adt/admit", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    return reply.status(202).send({
      ok: false,
      status: "integration-pending",
      message: "Patient admission requires DG ADT package RPCs not available in WorldVistA sandbox.",
      rpcUsed: [],
      pendingTargets: ["DGPM NEW ADMISSION"],
      vistaGrounding: {
        vistaFiles: ["PATIENT MOVEMENT (405)", "PATIENT (2)"],
        targetRoutines: ["DGPMV", "DGADM"],
        migrationPath: "Phase 67B: wire DGPM admission RPCs with ward/bed selection + DG ADT event triggers",
        sandboxNote: "WorldVistA Docker does not expose DG ADT write RPCs in the OR CPRS GUI CHART context",
      },
    });
  });

  /* ---- POST /vista/adt/transfer -- INTEGRATION PENDING ---- */
  server.post("/vista/adt/transfer", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    return reply.status(202).send({
      ok: false,
      status: "integration-pending",
      message: "Patient transfer requires DG ADT package RPCs not available in WorldVistA sandbox.",
      rpcUsed: [],
      pendingTargets: ["DGPM NEW TRANSFER"],
      vistaGrounding: {
        vistaFiles: ["PATIENT MOVEMENT (405)", "WARD LOCATION (42)"],
        targetRoutines: ["DGPMV", "DGTRAN"],
        migrationPath: "Phase 67B: wire DGPM transfer RPC with destination ward/bed + attending provider",
        sandboxNote: "WorldVistA Docker does not expose DG ADT write RPCs in the OR CPRS GUI CHART context",
      },
    });
  });

  /* ---- POST /vista/adt/discharge -- INTEGRATION PENDING ---- */
  server.post("/vista/adt/discharge", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    return reply.status(202).send({
      ok: false,
      status: "integration-pending",
      message: "Patient discharge requires DG ADT package RPCs not available in WorldVistA sandbox.",
      rpcUsed: [],
      pendingTargets: ["DGPM NEW DISCHARGE"],
      vistaGrounding: {
        vistaFiles: ["PATIENT MOVEMENT (405)", "PATIENT (2)"],
        targetRoutines: ["DGPMV", "DGDIS"],
        migrationPath: "Phase 67B: wire DGPM discharge RPC with discharge type + disposition",
        sandboxNote: "WorldVistA Docker does not expose DG ADT write RPCs in the OR CPRS GUI CHART context",
      },
    });
  });
}
