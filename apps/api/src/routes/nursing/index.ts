/**
 * Nursing Workflow Routes -- Phase 68: VistA-first, read-first.
 *
 * Endpoints:
 *   GET  /vista/nursing/vitals?dfn=N                        -- Patient vitals (ORQQVI VITALS)
 *   GET  /vista/nursing/vitals-range?dfn=N&start=D&end=D    -- Vitals for shift range (ORQQVI VITALS FOR DATE RANGE)
 *   GET  /vista/nursing/notes?dfn=N                         -- Nursing notes via TIU (TIU DOCUMENTS BY CONTEXT)
 *   GET  /vista/nursing/ward-patients?ward=IEN              -- Ward assignment view (ORQPT WARD PATIENTS)
 *   GET  /vista/nursing/tasks?dfn=N                         -- Nursing task list (integration-pending)
 *   GET  /vista/nursing/mar?dfn=N                           -- MAR (integration-pending -- no BCMA)
 *   POST /vista/nursing/mar/administer                      -- Med admin (integration-pending -- no BCMA)
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

/** Standard integration-pending response shape. */
function pendingFallback(
  label: string,
  targets: Array<{ rpc: string; package: string; reason: string }>,
) {
  return {
    ok: true,
    source: "integration-pending",
    status: "integration-pending",
    label,
    items: [],
    rpcUsed: [],
    pendingTargets: targets,
  };
}

/** Parse vitals response lines: date^type^value^... */
function parseVitals(lines: string[]): Array<{ date: string; type: string; value: string; units: string }> {
  const results: Array<{ date: string; type: string; value: string; units: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split("^");
    if (parts.length < 3) continue;
    results.push({
      date: parts[0]?.trim() || "",
      type: parts[1]?.trim() || "",
      value: parts[2]?.trim() || "",
      units: parts[3]?.trim() || "",
    });
  }
  return results;
}

/** Parse TIU document list lines: IEN^TITLE^DATE^AUTHOR^STATUS */
function parseNotesList(lines: string[]): Array<{ ien: string; title: string; date: string; author: string; status: string }> {
  const results: Array<{ ien: string; title: string; date: string; author: string; status: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split("^");
    const ien = parts[0]?.trim() || "";
    if (!ien || ien === "0") continue;
    results.push({
      ien,
      title: parts[1]?.trim() || "",
      date: parts[2]?.trim() || "",
      author: parts[3]?.trim() || "",
      status: parts[4]?.trim() || "",
    });
  }
  return results;
}

/** Parse ward patient list lines: DFN^NAME */
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

/* ------------------------------------------------------------------ */
/* Route Registration                                                   */
/* ------------------------------------------------------------------ */

export default async function nursingRoutes(server: FastifyInstance) {

  /* ------ GET /vista/nursing/vitals?dfn=N ------ */
  server.get("/vista/nursing/vitals", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: "Missing dfn parameter" });

    try {
      const lines = await safeCallRpc("ORQQVI VITALS", [dfn]);
      return {
        ok: true,
        source: "vista",
        items: parseVitals(lines),
        rpcUsed: ["ORQQVI VITALS"],
        pendingTargets: [],
      };
    } catch (err) {
      log.warn("Nursing vitals RPC failed, returning pending", { err: String(err), rpc: "ORQQVI VITALS" });
      return pendingFallback("Nursing Vitals", [
        { rpc: "ORQQVI VITALS", package: "OR", reason: "RPC call failed" },
      ]);
    }
  });

  /* ------ GET /vista/nursing/vitals-range?dfn=N&start=D&end=D ------ */
  server.get("/vista/nursing/vitals-range", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = requireSession(request, reply);
    const { dfn, start, end } = request.query as any;
    if (!dfn) return reply.code(400).send({ ok: false, error: "Missing dfn parameter" });

    try {
      // ORQQVI VITALS FOR DATE RANGE expects DFN, start date, end date
      const params = [dfn, start || "", end || ""];
      const lines = await safeCallRpc("ORQQVI VITALS FOR DATE RANGE", params);
      return {
        ok: true,
        source: "vista",
        items: parseVitals(lines),
        dateRange: { start: start || null, end: end || null },
        rpcUsed: ["ORQQVI VITALS FOR DATE RANGE"],
        pendingTargets: [],
      };
    } catch (err) {
      log.warn("Nursing vitals-range RPC failed, returning pending", { err: String(err), rpc: "ORQQVI VITALS FOR DATE RANGE" });
      return pendingFallback("Nursing Vitals (Shift Range)", [
        { rpc: "ORQQVI VITALS FOR DATE RANGE", package: "OR", reason: "RPC call failed or not available in sandbox" },
      ]);
    }
  });

  /* ------ GET /vista/nursing/notes?dfn=N ------ */
  server.get("/vista/nursing/notes", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: "Missing dfn parameter" });

    try {
      // TIU DOCUMENTS BY CONTEXT: params = [class, context, DFN, ...]
      // Class 3 = Nursing Documents in standard VistA; context 1 = All SIGNED
      const lines = await safeCallRpc("TIU DOCUMENTS BY CONTEXT", ["3", "1", dfn, "", "", "", "", "0", ""]);
      return {
        ok: true,
        source: "vista",
        items: parseNotesList(lines),
        rpcUsed: ["TIU DOCUMENTS BY CONTEXT"],
        pendingTargets: [],
        note: "Filtered by TIU document class 3 (Nursing Documents). Class may differ by site.",
      };
    } catch (err) {
      log.warn("Nursing notes RPC failed, returning pending", { err: String(err), rpc: "TIU DOCUMENTS BY CONTEXT" });
      return pendingFallback("Nursing Notes", [
        { rpc: "TIU DOCUMENTS BY CONTEXT", package: "TIU", reason: "RPC call failed" },
      ]);
    }
  });

  /* ------ GET /vista/nursing/ward-patients?ward=IEN ------ */
  server.get("/vista/nursing/ward-patients", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = requireSession(request, reply);
    const ward = (request.query as any)?.ward;
    if (!ward) return reply.code(400).send({ ok: false, error: "Missing ward parameter" });

    try {
      const lines = await safeCallRpc("ORQPT WARD PATIENTS", [ward]);
      return {
        ok: true,
        source: "vista",
        items: parsePatientList(lines),
        rpcUsed: ["ORQPT WARD PATIENTS"],
        pendingTargets: [],
      };
    } catch (err) {
      log.warn("Nursing ward-patients RPC failed, returning pending", { err: String(err), rpc: "ORQPT WARD PATIENTS" });
      return pendingFallback("Nursing Ward Patients", [
        { rpc: "ORQPT WARD PATIENTS", package: "OR", reason: "RPC call failed" },
      ]);
    }
  });

  /* ------ GET /vista/nursing/tasks?dfn=N (integration-pending) ------ */
  server.get("/vista/nursing/tasks", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: "Missing dfn parameter" });

    // No native VistA "nursing task list" RPC exists -- tasks are derived from orders,
    // MAR schedule, and nursing protocols. Real implementation requires BCMA + order parsing.
    return pendingFallback("Nursing Task List", [
      { rpc: "PSB MED LOG", package: "PSB", reason: "BCMA/PSB package not available in WorldVistA sandbox -- deferred to Phase 68B" },
      { rpc: "ORWORDG IEN", package: "OR", reason: "Ward order group IEN lookup for nursing order view -- deferred to Phase 68B" },
    ]);
  });

  /* ------ GET /vista/nursing/mar?dfn=N (integration-pending) ------ */
  server.get("/vista/nursing/mar", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: "Missing dfn parameter" });

    return pendingFallback("Medication Administration Record", [
      { rpc: "PSB ALLERGY", package: "PSB", reason: "BCMA/PSB package not available in WorldVistA sandbox" },
      { rpc: "PSB MED LOG", package: "PSB", reason: "BCMA/PSB package not available in WorldVistA sandbox" },
    ]);
  });

  /* ------ POST /vista/nursing/mar/administer (integration-pending) ------ */
  server.post("/vista/nursing/mar/administer", async (request: FastifyRequest, reply: FastifyReply) => {
    const _session = requireSession(request, reply);

    return reply.code(202).send({
      ok: true,
      source: "integration-pending",
      status: "integration-pending",
      message: "Medication administration recording requires BCMA/PSB package",
      rpcUsed: [],
      pendingTargets: [
        { rpc: "PSB MED LOG", package: "PSB", reason: "BCMA/PSB package not available in WorldVistA sandbox -- deferred to Phase 68B" },
      ],
      vistaGrounding: {
        vistaFiles: ["PSB(53.79) BCMA MEDICATION LOG"],
        targetRoutines: ["PSBML", "PSBMLEN"],
        migrationPath: "Install BCMA package, configure med routes, enable PSB RPCs",
        sandboxNote: "WorldVistA Docker does not include BCMA/PSB package",
      },
    });
  });
}
