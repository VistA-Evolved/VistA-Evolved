/**
 * Immunization Routes — Phase 65: VistA-first immunization history.
 *
 * Endpoints:
 *   GET  /vista/immunizations?dfn=N   — Patient immunization history via ORQQPX IMMUN LIST
 *   GET  /vista/immunizations/catalog  — Immunization type picker via PXVIMM IMM SHORT LIST
 *   POST /vista/immunizations?dfn=N   — Add immunization (integration-pending; target: PX SAVE DATA)
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

/** Parse ORQQPX IMMUN LIST response: IEN^NAME^DATE/TIME^REACTION^INVERSE_DT */
function parseImmunList(lines: string[]): Array<{
  ien: string;
  name: string;
  dateTime: string;
  reaction: string;
  inverseDt: string;
}> {
  const results: Array<{
    ien: string;
    name: string;
    dateTime: string;
    reaction: string;
    inverseDt: string;
  }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split("^");
    const ien = parts[0]?.trim() || "";
    if (!ien) continue;
    results.push({
      ien,
      name: parts[1]?.trim() || "",
      dateTime: parts[2]?.trim() || "",
      reaction: parts[3]?.trim() || "",
      inverseDt: parts[4]?.trim() || "",
    });
  }
  return results;
}

/** Parse PXVIMM IMM SHORT LIST: IEN^NAME */
function parseCatalog(lines: string[]): Array<{ ien: string; name: string }> {
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

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

export default async function immunizationsRoutes(
  server: FastifyInstance
): Promise<void> {
  /**
   * GET /vista/immunizations?dfn=N
   * Returns patient immunization history from VistA ORQQPX IMMUN LIST.
   */
  server.get("/vista/immunizations", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) {
      return reply.status(400).send({ ok: false, error: "dfn query parameter required" });
    }

    try {
      const lines = await safeCallRpc("ORQQPX IMMUN LIST", [String(dfn)]);
      const results = parseImmunList(lines);
      return reply.send({
        ok: true,
        source: "vista",
        count: results.length,
        results,
        rpcUsed: ["ORQQPX IMMUN LIST"],
        pendingTargets: [],
      });
    } catch (err: any) {
      log.warn("ORQQPX IMMUN LIST failed -- returning integration-pending", { err: err.message });
      return reply.send({
        ok: true,
        source: "vista",
        count: 0,
        results: [],
        rpcUsed: [],
        pendingTargets: ["ORQQPX IMMUN LIST"],
        _integration: "pending",
        _error: err.message?.includes("ECONNREFUSED") ? "VistA unavailable" : err.message,
      });
    }
  });

  /**
   * GET /vista/immunizations/catalog
   * Returns immunization type picker list from PXVIMM IMM SHORT LIST.
   */
  server.get("/vista/immunizations/catalog", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);

    try {
      const lines = await safeCallRpc("PXVIMM IMM SHORT LIST", []);
      const results = parseCatalog(lines);
      return reply.send({
        ok: true,
        source: "vista",
        count: results.length,
        results,
        rpcUsed: ["PXVIMM IMM SHORT LIST"],
        pendingTargets: [],
      });
    } catch (err: any) {
      log.warn("PXVIMM IMM SHORT LIST failed -- returning integration-pending", { err: err.message });
      return reply.send({
        ok: true,
        source: "vista",
        count: 0,
        results: [],
        rpcUsed: [],
        pendingTargets: ["PXVIMM IMM SHORT LIST"],
        _integration: "pending",
        _error: err.message?.includes("ECONNREFUSED") ? "VistA unavailable" : err.message,
      });
    }
  });

  /**
   * POST /vista/immunizations?dfn=N
   * Add immunization — INTEGRATION PENDING.
   * Target: PX SAVE DATA (complex PCE encounter save, requires visit context).
   * Returns honest pending posture with target RPC info.
   */
  server.post("/vista/immunizations", async (request: FastifyRequest, reply: FastifyReply) => {
    const session = requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) {
      return reply.status(400).send({ ok: false, error: "dfn query parameter required" });
    }

    return reply.status(202).send({
      ok: false,
      status: "integration-pending",
      message: "Add immunization requires PCE encounter context (PX SAVE DATA). Deferred to Phase 65B.",
      rpcUsed: [],
      pendingTargets: [
        "PX SAVE DATA",
        "PXVIMM ADMIN ROUTE",
        "PXVIMM ADMIN SITE",
        "PXVIMM INFO SOURCE",
      ],
      vistaGrounding: {
        vistaFiles: ["V IMMUNIZATION (9000010.11)", "IMMUNIZATION (9999999.14)"],
        targetRoutines: ["PXRPC", "PXVRPC2"],
        migrationPath: "Phase 65B: wire PX SAVE DATA with encounter/visit IEN + immunization IEN + admin route/site",
        sandboxNote: "WorldVistA Docker has IMMUNIZATION file entries but PCE encounter save is untested in sandbox",
      },
    });
  });
}
