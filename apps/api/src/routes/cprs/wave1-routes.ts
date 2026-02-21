/**
 * Phase 56 -- CPRS Wave 1 READ routes
 *
 * New endpoints required by wave56-plan.json that don't exist yet.
 * Existing /vista/* endpoints (allergies, problems, vitals, meds, notes, labs)
 * already satisfy most Wave 1 needs. This file adds:
 *   - /vista/cprs/orders-summary
 *   - /vista/cprs/appointments (integration-pending)
 *   - /vista/cprs/reminders (integration-pending)
 *   - /vista/cprs/meds/detail
 *   - /vista/cprs/labs/chart
 *   - /vista/cprs/problems/icd-search
 *
 * Each endpoint declares rpcUsed[] and vivianPresence for traceability.
 */

import type { FastifyInstance } from "fastify";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { connect, disconnect } from "../../vista/rpcBrokerClient.js";
import { validateCredentials } from "../../vista/config.js";
import { audit } from "../../lib/audit.js";

function auditActor(request: any): { name: string } {
  return { name: (request as any).session?.userName ?? "unknown" };
}

export default async function cprsWave1Routes(server: FastifyInstance): Promise<void> {

  /* ----------------------------------------------------------------
   * GET /vista/cprs/orders-summary
   * RPC: ORWORB UNSIG ORDERS
   * ---------------------------------------------------------------- */
  server.get("/vista/cprs/orders-summary", async (request) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: "Missing or non-numeric dfn" };

    const rpcUsed = ["ORWORB UNSIG ORDERS"];
    const vivianPresence = { "ORWORB UNSIG ORDERS": "exception" as const };

    try {
      validateCredentials();
      await connect();
      const lines = await safeCallRpc("ORWORB UNSIG ORDERS", [String(dfn)]);
      disconnect();

      const orders = lines
        .filter((l: string) => l.trim())
        .map((line: string, i: number) => {
          const parts = line.split("^");
          return {
            id: parts[0]?.trim() || `ord-${i}`,
            name: parts[1]?.trim() || line.trim(),
            status: parts[2]?.trim() || "unsigned",
            date: parts[3]?.trim() || "",
          };
        });

      audit("phi.orders-view", "success", auditActor(request), {
        patientDfn: String(dfn),
        detail: { count: orders.length },
      });

      return {
        ok: true,
        unsigned: orders.length,
        recent: orders,
        rpcUsed,
        vivianPresence,
      };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: err.message, rpcUsed, vivianPresence };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/appointments — Phase 63: delegates to scheduling adapter
   * Uses SDOE LIST ENCOUNTERS FOR PAT (real VistA data when available)
   * Falls back to integration-pending with explicit target RPCs
   * ---------------------------------------------------------------- */
  server.get("/vista/cprs/appointments", async (request) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: "Missing or non-numeric dfn" };

    try {
      const { getAdapter } = await import("../../adapters/adapter-loader.js");
      const adapter = getAdapter("scheduling") as any;
      if (adapter && typeof adapter.listAppointments === "function") {
        const result = await adapter.listAppointments(String(dfn));
        return {
          ok: true,
          status: result.ok ? "ok" : "integration-pending",
          results: result.data || [],
          rpcUsed: result.ok ? ["SDOE LIST ENCOUNTERS FOR PAT"] : [],
          pendingTargets: result.ok ? [] : ["SDEC APPADD", "SDEC APPSLOTS"],
          pendingNote: result.ok
            ? undefined
            : "SDOE encounter reads available; booking RPCs (SDEC) absent in sandbox.",
        };
      }
    } catch { /* adapter unavailable */ }

    return {
      ok: true,
      status: "integration-pending",
      results: [],
      rpcUsed: [],
      pendingTargets: ["SDOE LIST ENCOUNTERS FOR PAT", "SDEC APPADD"],
      pendingNote:
        "Scheduling adapter unavailable. SDOE encounter RPCs present in sandbox; " +
        "SDEC booking RPCs absent. See Phase 63.",
    };
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/reminders  (integration-pending)
   * Target RPCs: ORQQPX REMINDERS LIST, ORQQPX REMINDER DETAIL
   * ---------------------------------------------------------------- */
  server.get("/vista/cprs/reminders", async (request) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: "Missing or non-numeric dfn" };

    return {
      ok: true,
      status: "integration-pending",
      results: [],
      rpcUsed: [],
      pendingTargets: ["ORQQPX REMINDERS LIST", "ORQQPX REMINDER DETAIL"],
      vivianPresence: {
        "ORQQPX REMINDERS LIST": "present",
        "ORQQPX REMINDER DETAIL": "present",
      },
      pendingNote:
        "Clinical Reminders RPCs exist in Vivian but require PXRM package " +
        "configuration in the sandbox. Wire when reminder definitions are loaded.",
    };
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/meds/detail
   * RPC: ORWORR GETTXT
   * ---------------------------------------------------------------- */
  server.get("/vista/cprs/meds/detail", async (request) => {
    const orderId = (request.query as any)?.orderId;
    if (!orderId) return { ok: false, error: "Missing orderId query param" };

    const rpcUsed = ["ORWORR GETTXT"];
    const vivianPresence = { "ORWORR GETTXT": "present" as const };

    try {
      validateCredentials();
      await connect();
      const lines = await safeCallRpc("ORWORR GETTXT", [String(orderId)]);
      disconnect();
      return { ok: true, text: lines.join("\n"), rpcUsed, vivianPresence };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: err.message, rpcUsed, vivianPresence };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/labs/chart
   * RPC: ORWLRR CHART
   * ---------------------------------------------------------------- */
  server.get("/vista/cprs/labs/chart", async (request) => {
    const dfn = (request.query as any)?.dfn;
    const testName = (request.query as any)?.testName;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: "Missing or non-numeric dfn" };

    const rpcUsed = ["ORWLRR CHART"];
    const vivianPresence = { "ORWLRR CHART": "present" as const };

    try {
      validateCredentials();
      await connect();
      const lines = await safeCallRpc("ORWLRR CHART", [
        String(dfn),
        testName ?? "",
      ]);
      disconnect();

      const data = lines.filter((l: string) => l.trim()).map((line: string, i: number) => {
        const parts = line.split("^");
        return {
          date: parts[0]?.trim() || "",
          value: parts[1]?.trim() || "",
          units: parts[2]?.trim() || "",
          flag: parts[3]?.trim() || "",
        };
      });

      return { ok: true, data, rpcUsed, vivianPresence };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: err.message, rpcUsed, vivianPresence };
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/cprs/problems/icd-search
   * RPC: ORQQPL4 LEX
   * ---------------------------------------------------------------- */
  server.get("/vista/cprs/problems/icd-search", async (request) => {
    const term = (request.query as any)?.term;
    if (!term || String(term).length < 2)
      return { ok: false, error: "Search term must be >= 2 chars" };

    const rpcUsed = ["ORQQPL4 LEX"];
    const vivianPresence = { "ORQQPL4 LEX": "present" as const };

    try {
      validateCredentials();
      await connect();
      const lines = await safeCallRpc("ORQQPL4 LEX", [String(term)]);
      disconnect();

      const results = lines.filter((l: string) => l.trim()).map((line: string) => {
        const parts = line.split("^");
        return {
          ien: parts[0]?.trim() || "",
          text: parts[1]?.trim() || "",
          code: parts[2]?.trim() || "",
        };
      });

      return { ok: true, results, rpcUsed, vivianPresence };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: err.message, rpcUsed, vivianPresence };
    }
  });
}
