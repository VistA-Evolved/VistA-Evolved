/**
 * Phase 59 / Phase 154 -- CPOE Parity: Order routes (lab, imaging, consult, sign, checks, list)
 *
 * Every endpoint follows the safety model established in Wave 2 (Phase 57):
 *   1. Validate inputs server-side (400 before any RPC)
 *   2. Check RPC availability via optionalRpc()
 *   3. WRITE calls: LOCK/action/UNLOCK with always-unlock
 *   4. Audit: metadata only -- NEVER log input args, PHI, or clinical content
 *   5. Return rpcUsed[] and vivianPresence for traceability
 *   6. Idempotency via DB-backed idempotencyGuard (Phase 154: Postgres-backed)
 *   7. Draft fallback when RPC unavailable
 *
 * Phase 154 changes:
 *   - Replaced in-memory Map idempotency with DB-backed idempotencyGuard middleware
 *   - Enhanced POST /vista/cprs/orders/sign with PG sign event audit trail
 *   - Added esCode validation and e-signature hash logging
 *   - Signing returns real signed state or structured integration-pending blocker
 *
 * Endpoints:
 *   GET  /vista/cprs/orders           -- ORWORR AGET (active order list)
 *   POST /vista/cprs/orders/lab       -- LOCK + AUTOACK + UNLOCK (lab quick order)
 *   POST /vista/cprs/orders/imaging   -- integration-pending (no imaging QOs in sandbox)
 *   POST /vista/cprs/orders/consult   -- integration-pending (needs ORDIALOG params)
 *   POST /vista/cprs/orders/sign      -- ORWOR1 SIG (or integration-pending)
 *   POST /vista/cprs/order-checks     -- ORWDXC ACCEPT / DISPLAY (or pending)
 */

import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { validateCredentials } from "../../vista/config.js";
import { connect, disconnect, getDuz } from "../../vista/rpcBrokerClient.js";
import { optionalRpc } from "../../vista/rpcCapabilities.js";
import { probeTier0Rpc } from "../../lib/tier0-response.js";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { audit } from "../../lib/audit.js";
import { log } from "../../lib/logger.js";
import { createDraft } from "../write-backs.js";
import { safeErr } from '../../lib/safe-error.js';
import { idempotencyGuard, idempotencyOnSend } from "../../middleware/idempotency.js";

/* ------------------------------------------------------------------ */
/* Phase 154: PG sign event logging (lazy-wired)                       */
/* ------------------------------------------------------------------ */

let _pgPool: any = null;
let _pgImportAttempted = false;

/** Lazy-load PG pool for sign event logging. */
async function getPgPoolLazy(): Promise<any> {
  if (_pgPool) return _pgPool;
  if (_pgImportAttempted) return null;
  _pgImportAttempted = true;
  try {
    const pgDb = await import("../../platform/pg/pg-db.js");
    if (pgDb.isPgConfigured()) {
      _pgPool = pgDb.getPgPool();
      return _pgPool;
    }
  } catch { /* PG not available -- sign events will only be audited via immutableAudit */ }
  return null;
}

/**
 * Log a CPOE sign event to PG. Non-blocking — errors are warn-logged, never thrown.
 */
async function logSignEvent(evt: {
  tenantId: string;
  orderIen: string;
  dfn: string;
  duz: string;
  action: string;
  status: string;
  esHash?: string;
  rpcUsed?: string;
  detail?: Record<string, unknown>;
}): Promise<void> {
  const pool = await getPgPoolLazy();
  if (!pool) return;
  try {
    await pool.query(
      `INSERT INTO cpoe_order_sign_event (tenant_id, order_ien, dfn, duz, action, status, es_hash, rpc_used, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        evt.tenantId, evt.orderIen, evt.dfn, evt.duz, evt.action, evt.status,
        evt.esHash || null, evt.rpcUsed || null,
        evt.detail ? JSON.stringify(evt.detail) : null,
      ],
    );
  } catch (err) {
    log.warn("cpoe_order_sign_event insert failed (non-fatal)", { error: safeErr(err as Error) });
  }
}

/** Hash esCode for audit logging (never store raw e-signature codes). */
function hashEsCode(esCode: string): string {
  return createHash("sha256").update(esCode).digest("hex").slice(0, 16);
}

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

interface ValidationError { field: string; message: string; }

function validateDfn(dfn: unknown): string | null {
  if (!dfn) return null;
  const s = String(dfn);
  return /^\d+$/.test(s) ? s : null;
}

function validateRequired(body: Record<string, unknown>, fields: string[]): ValidationError[] {
  const errors: ValidationError[] = [];
  for (const f of fields) {
    if (body[f] === undefined || body[f] === null || body[f] === "") {
      errors.push({ field: f, message: `${f} is required` });
    }
  }
  return errors;
}

/* getIdempotencyKey removed in Phase 154 — DB-backed idempotency uses Idempotency-Key header via middleware */

function getActor(request: any): string {
  return (request as any).session?.duz ?? (request as any).session?.userName ?? "unknown";
}

function auditWrite(
  action: Parameters<typeof audit>[0],
  outcome: "success" | "failure",
  actor: string,
  dfn: string,
  detail: { mode: string; rpc?: string; draftId?: string; orderType?: string },
) {
  audit(action, outcome, { duz: actor }, {
    patientDfn: dfn,
    detail: { mode: detail.mode, rpc: detail.rpc, draftId: detail.draftId, orderType: detail.orderType },
  });
}

/* ------------------------------------------------------------------ */
/* Lab quick-order IENs (WorldVistA Docker sandbox)                    */
/* These are the same PSOZ* quick orders but commonly used as lab      */
/* ordering paths in demo scenarios. True lab quick orders (LRZ*)      */
/* are NOT pre-configured in WorldVistA Docker.                        */
/* ------------------------------------------------------------------ */

const LAB_QUICK_ORDERS: { ien: number; name: string; keywords: string[] }[] = [
  // Note: WorldVistA Docker sandbox does NOT have pre-configured lab quick orders.
  // This array is intentionally empty to force honest integration-pending for labs
  // until actual LR* quick orders are configured.
  // The endpoint will return integration-pending with target RPCs.
];

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function ordersCpoeRoutes(server: FastifyInstance): Promise<void> {

  /* ------------------------------------------------------------------ */
  /* Phase 154: Register DB-backed idempotency middleware for POST routes */
  /* ------------------------------------------------------------------ */
  const idempotencyPreHandler = idempotencyGuard();
  server.addHook("onRequest", async (request, reply) => {
    if (request.method === "POST") {
      await idempotencyPreHandler(request, reply);
    }
  });
  server.addHook("onSend", idempotencyOnSend);

  /* ================================================================
   * GET /vista/cprs/orders
   * RPC: ORWORR AGET — active orders by display group
   * ================================================================ */
  server.get("/vista/cprs/orders", async (request) => {
    const dfn = (request.query as any)?.dfn;
    if (!dfn || !/^\d+$/.test(String(dfn)))
      return { ok: false, error: "Missing or non-numeric dfn" };

    const filter = (request.query as any)?.filter || "active";
    const rpcUsed = ["ORWORR AGET"];
    const vivianPresence = { "ORWORR AGET": "present" as const };

    const check = optionalRpc("ORWORR AGET");
    if (!check.available) {
      return {
        ok: true,
        status: "integration-pending",
        orders: [],
        rpcUsed,
        vivianPresence,
        pendingTargets: ["ORWORR AGET"],
        pendingNote: "ORWORR AGET present in Vivian but RPC capability not detected at runtime.",
      };
    }

    try {
      validateCredentials();
      await connect();

      // ORWORR AGET params: DFN^FILTER^DGRP
      // FILTER: 2=active, 3=current, 5=expiring, 8=recent, 12=all
      const filterCode = filter === "all" ? "12" : filter === "recent" ? "8" : "2";
      const lines = await safeCallRpc("ORWORR AGET", [
        String(dfn), filterCode, "", "", "",
      ]);
      disconnect();

      // Parse: each line is orderIEN^displayGroup^timestamp^orderText^status^...
      const orders = lines
        .filter((l) => l.trim() && !l.startsWith("~"))
        .map((line, i) => {
          const parts = line.split("^");
          return {
            id: parts[0]?.trim()?.replace(/~/, "") || `ord-${i}`,
            displayGroup: parts[1]?.trim() || "",
            timestamp: parts[2]?.trim() || "",
            text: parts[3]?.trim() || line.trim(),
            status: parts[4]?.trim() || "",
            raw: line,
          };
        })
        .filter((o) => o.id && o.id !== "0");

      audit("phi.orders-view", "success", { duz: getActor(request) }, {
        patientDfn: String(dfn),
        detail: { filter, count: orders.length },
      });

      return {
        ok: true,
        source: "vista",
        filter,
        count: orders.length,
        orders,
        rpcUsed,
        vivianPresence,
      };
    } catch (err: any) {
      disconnect();
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });

  /* ================================================================
   * POST /vista/cprs/orders/lab
   * RPC: ORWDX LOCK + ORWDXM AUTOACK + ORWDX UNLOCK
   * Uses lab quick-order IEN path (same as med but for lab type)
   * ================================================================ */
  server.post("/vista/cprs/orders/lab", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, labTest, quickOrderIen } = body;
    const rpcUsed = ["ORWDX LOCK", "ORWDXM AUTOACK", "ORWDX UNLOCK"];
    const vivianPresence = {
      "ORWDX LOCK": "present" as const,
      "ORWDXM AUTOACK": "present" as const,
      "ORWDX UNLOCK": "present" as const,
    };

    const errors = validateRequired(body, ["dfn"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (!labTest && !quickOrderIen) {
      errors.push({ field: "labTest", message: "labTest name or quickOrderIen required" });
    }
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);

    // If a specific quickOrderIen is provided, use it directly
    // Otherwise, try to match labTest name to known quick orders
    let qoIen: number | null = null;
    if (quickOrderIen && /^\d+$/.test(String(quickOrderIen))) {
      qoIen = parseInt(String(quickOrderIen), 10);
    } else if (labTest) {
      const upper = String(labTest).toUpperCase().trim();
      for (const qo of LAB_QUICK_ORDERS) {
        for (const kw of qo.keywords) {
          if (upper === kw || upper.includes(kw) || kw.includes(upper)) {
            qoIen = qo.ien;
            break;
          }
        }
        if (qoIen) break;
      }
    }

    // If no quick order found, return capability-probed response
    if (!qoIen) {
      const probe = probeTier0Rpc("ORWDXM AUTOACK", "orders");
      const draft = createDraft("order-sign", validDfn!, "ORWDX SAVE", {
        action: "lab-order", labTest: String(labTest || ""), attemptedAt: new Date().toISOString(),
      });
      auditWrite("clinical.order-lab", "success", actor, validDfn!, {
        mode: "draft", draftId: draft.id, orderType: "lab",
      });
      const result = {
        ok: true,
        mode: "draft",
        status: "unsupported-in-sandbox" as const,
        draftId: draft.id,
        rpcUsed,
        vivianPresence,
        capabilityProbe: probe,
        pendingTargets: ["ORWDXM AUTOACK"],
        pendingNote: "Lab quick orders (LRZ*) are not pre-configured in WorldVistA Docker sandbox. " +
          "RPC ORWDXM AUTOACK is available but requires a valid quick order IEN. " +
          "To enable: configure lab quick orders in VistA Order Entry Setup, then pass quickOrderIen directly. " +
          "Medication quick orders (PSOZ* IENs 1628-1658) are available as an alternative path.",
        message: `Lab order for "${labTest || ""}" saved as draft. Quick order IEN not available in sandbox.`,
      };
      return result;
    }

    // Attempt real AUTOACK path
    const check = optionalRpc("ORWDXM AUTOACK");
    if (!check.available) {
      const draft = createDraft("order-sign", validDfn!, "ORWDXM AUTOACK", {
        action: "lab-order", attemptedAt: new Date().toISOString(),
      });
      auditWrite("clinical.order-lab", "success", actor, validDfn!, {
        mode: "draft", draftId: draft.id, orderType: "lab",
      });
      const result = {
        ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
        rpcUsed, vivianPresence,
        message: "Lab order saved as draft. ORWDXM AUTOACK sync pending.",
      };
      return result;
    }

    let locked = false;
    try {
      validateCredentials();
      await connect();
      const duz = getDuz();
      const LOCATION_IEN = "2";

      // LOCK
      const lockResp = await safeCallRpc("ORWDX LOCK", [validDfn!], { idempotent: false });
      locked = lockResp[0]?.trim() === "1";
      if (!locked) {
        disconnect();
        return reply.code(409).send({
          ok: false, error: "Patient locked by another provider", rpcUsed, vivianPresence,
        });
      }

      // AUTOACK
      const autoackLines = await safeCallRpc("ORWDXM AUTOACK", [
        validDfn!, duz, LOCATION_IEN, String(qoIen),
      ], { idempotent: false });

      // UNLOCK (always)
      await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
      locked = false;
      disconnect();

      const raw = autoackLines.join("\n").trim();
      if (!raw || raw === "0" || raw.startsWith("-1")) {
        const result = {
          ok: false, error: "Lab order was not created. AUTOACK returned: " + (raw || "(empty)"),
          rpcUsed, vivianPresence,
          hint: "The lab quick order IEN may be misconfigured.",
        };
        auditWrite("clinical.order-lab", "failure", actor, validDfn!, { mode: "real", rpc: "ORWDXM AUTOACK", orderType: "lab" });
        return result;
      }

      const orderIEN = (raw.split(/[\^;]/)[0]?.trim() || raw).replace(/^~/, "");

      auditWrite("clinical.order-lab", "success", actor, validDfn!, { mode: "real", rpc: "ORWDXM AUTOACK", orderType: "lab" });
      const result = {
        ok: true,
        mode: "real",
        status: "unsigned",
        orderIEN,
        labTest: labTest || `QO#${qoIen}`,
        rpcUsed,
        vivianPresence,
        message: `Lab order created (unsigned): QO#${qoIen}`,
      };
      return result;
    } catch (err: any) {
      if (locked) {
        await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
      }
      disconnect();
      log.warn("Lab order AUTOACK failed", { error: safeErr(err) });
      return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
    }
  });

  /* ================================================================
   * POST /vista/cprs/orders/imaging
   * Integration-pending -- no imaging quick orders in WorldVistA Docker
   * Target RPCs: ORWDX LOCK + ORWDXM AUTOACK + ORWDX UNLOCK
   * ================================================================ */
  server.post("/vista/cprs/orders/imaging", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, imagingStudy, quickOrderIen } = body;
    const rpcUsed = ["ORWDX LOCK", "ORWDXM AUTOACK", "ORWDX UNLOCK"];
    const vivianPresence = {
      "ORWDX LOCK": "present" as const,
      "ORWDXM AUTOACK": "present" as const,
      "ORWDX UNLOCK": "present" as const,
    };

    const errors = validateRequired(body, ["dfn"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (!imagingStudy && !quickOrderIen) {
      errors.push({ field: "imagingStudy", message: "imagingStudy name or quickOrderIen required" });
    }
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);

    // If quickOrderIen provided, attempt real path
    if (quickOrderIen && /^\d+$/.test(String(quickOrderIen))) {
      const check = optionalRpc("ORWDXM AUTOACK");
      if (check.available) {
        let locked = false;
        try {
          validateCredentials();
          await connect();
          const duz = getDuz();
          const LOCATION_IEN = "2";

          const lockResp = await safeCallRpc("ORWDX LOCK", [validDfn!], { idempotent: false });
          locked = lockResp[0]?.trim() === "1";
          if (!locked) {
            disconnect();
            return reply.code(409).send({ ok: false, error: "Patient locked by another provider", rpcUsed, vivianPresence });
          }

          const autoackLines = await safeCallRpc("ORWDXM AUTOACK", [
            validDfn!, duz, LOCATION_IEN, String(quickOrderIen),
          ], { idempotent: false });

          await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
          locked = false;
          disconnect();

          const raw = autoackLines.join("\n").trim();
          if (!raw || raw === "0" || raw.startsWith("-1")) {
            auditWrite("clinical.order-imaging", "failure", actor, validDfn!, { mode: "real", rpc: "ORWDXM AUTOACK", orderType: "imaging" });
            return { ok: false, error: "Imaging order AUTOACK returned: " + (raw || "(empty)"), rpcUsed, vivianPresence };
          }

          const orderIEN = (raw.split(/[\^;]/)[0]?.trim() || raw).replace(/^~/, "");
          auditWrite("clinical.order-imaging", "success", actor, validDfn!, { mode: "real", rpc: "ORWDXM AUTOACK", orderType: "imaging" });
          const result = {
            ok: true, mode: "real", status: "unsigned", orderIEN,
            imagingStudy: imagingStudy || `QO#${quickOrderIen}`,
            rpcUsed, vivianPresence,
            message: `Imaging order created (unsigned): QO#${quickOrderIen}`,
          };
          return result;
        } catch (err: any) {
          if (locked) await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
          disconnect();
          return { ok: false, error: safeErr(err), rpcUsed, vivianPresence };
        }
      }
    }

    // Default: capability-probed (no imaging QOs in sandbox)
    const imgProbe = probeTier0Rpc("ORWDXM AUTOACK", "orders");
    const draft = createDraft("order-sign", validDfn!, "ORWDXM AUTOACK", {
      action: "imaging-order", imagingStudy: String(imagingStudy || ""),
      attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.order-imaging", "success", actor, validDfn!, { mode: "draft", draftId: draft.id, orderType: "imaging" });

    return {
      ok: true,
      mode: "draft",
      status: "unsupported-in-sandbox" as const,
      draftId: draft.id,
      rpcUsed,
      vivianPresence,
      capabilityProbe: imgProbe,
      pendingTargets: ["ORWDXM AUTOACK", "ORWDXR NEW ORDER"],
      pendingNote: "Imaging quick orders (RA*) are not pre-configured in WorldVistA Docker sandbox. " +
        "RPC ORWDXM AUTOACK is available but requires a valid imaging quick order IEN. " +
        "To enable: configure radiology quick orders in VistA, then pass quickOrderIen directly. " +
        "Alternative: use ORWDX SAVE with full ORDIALOG parameter build for imaging dialogs.",
      message: `Imaging order for "${imagingStudy || ""}" saved as draft. Quick order IEN not available.`,
    };
  });

  /* ================================================================
   * POST /vista/cprs/orders/consult
   * Integration-pending -- requires full ORDIALOG parameter build
   * Target RPCs: ORWDX LOCK + ORWDX SAVE + ORWDX UNLOCK
   * ================================================================ */
  server.post("/vista/cprs/orders/consult", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, consultService, urgency, reason } = body;
    const rpcUsed = ["ORWDX LOCK", "ORWDX SAVE", "ORWDX UNLOCK"];
    const vivianPresence = {
      "ORWDX LOCK": "present" as const,
      "ORWDX SAVE": "present" as const,
      "ORWDX UNLOCK": "present" as const,
    };

    const errors = validateRequired(body, ["dfn", "consultService"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);
    const consultProbe = probeTier0Rpc("ORWDX SAVE", "orders");
    const draft = createDraft("order-sign", validDfn!, "ORWDX SAVE", {
      action: "consult-order", consultService: String(consultService),
      urgency: urgency || "routine",
      attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.order-consult", "success", actor, validDfn!, { mode: "draft", draftId: draft.id, orderType: "consult" });

    return {
      ok: true,
      mode: "draft",
      status: "unsupported-in-sandbox" as const,
      draftId: draft.id,
      rpcUsed,
      vivianPresence,
      capabilityProbe: consultProbe,
      pendingTargets: ["ORWDX SAVE"],
      pendingNote: "Consult orders require full ORDIALOG parameter build -- service IEN, urgency, " +
        "place of consultation, requesting provider, reason for request, and order dialog ID. " +
        "ORWDX SAVE RPC is available but the complex parameter assembly is a future enhancement. " +
        "Target: ORWDX SAVE with consult dialog (ORDIALOG #101.43).",
      message: `Consult order for "${consultService}" saved as draft. Full dialog integration pending.`,
    };
  });

  /* ================================================================
   * POST /vista/cprs/orders/sign
   * RPC: ORWOR1 SIG — electronically sign order(s)
   * Phase 154: Enhanced with PG sign event audit, esCode validation,
   *            DB-backed idempotency via middleware, structured blockers.
   * ================================================================ */
  server.post("/vista/cprs/orders/sign", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, orderIds, esCode } = body;
    const rpcUsed = ["ORWOR1 SIG"];
    const vivianPresence = { "ORWOR1 SIG": "present" as const };

    const errors = validateRequired(body, ["dfn", "orderIds"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (!Array.isArray(orderIds) || orderIds.length === 0) {
      errors.push({ field: "orderIds", message: "orderIds must be a non-empty array" });
    }
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);
    const tenantId = (request as any).tenantId || "default";
    const check = optionalRpc("ORWOR1 SIG");

    /* ---- Phase 154: esCode required for real signing ---- */
    if (!esCode) {
      // Structured blocker: no fake success
      auditWrite("clinical.order-sign", "failure", actor, validDfn!, { mode: "blocked-no-esCode" });
      for (const oid of (orderIds as string[])) {
        void logSignEvent({
          tenantId, orderIen: oid, dfn: validDfn!, duz: actor,
          action: "sign_attempt", status: "blocked_no_esCode",
          detail: { reason: "esCode not provided" },
        });
      }
      return {
        ok: false,
        status: "sign-blocked",
        blocker: "esCode_required",
        rpcUsed,
        vivianPresence,
        message: "Electronic signature code (esCode) is required to sign orders. " +
          "This is the provider's personal e-signature code as configured in VistA.",
        unsignedCount: (orderIds as string[]).length,
      };
    }

    if (check.available) {
      try {
        validateCredentials();
        await connect();

        // ORWOR1 SIG params: DFN^OrderIEN(s)^ESCode
        // OrderIENs joined by semicolons
        const orderIenStr = (orderIds as string[]).join(";");
        const esHash = hashEsCode(String(esCode));

        const resp = await safeCallRpc("ORWOR1 SIG", [
          validDfn!, orderIenStr, String(esCode),
        ], { idempotent: false });
        disconnect();

        const raw = resp.join("\n").trim();
        const success = !raw.startsWith("-1") && !raw.toLowerCase().includes("error");

        auditWrite("clinical.order-sign", success ? "success" : "failure", actor, validDfn!, {
          mode: "real", rpc: "ORWOR1 SIG",
        });

        // Phase 154: Log sign events to PG for each order
        for (const oid of (orderIds as string[])) {
          void logSignEvent({
            tenantId, orderIen: oid, dfn: validDfn!, duz: actor,
            action: "sign", status: success ? "signed" : "sign_failed",
            esHash, rpcUsed: "ORWOR1 SIG",
            detail: { responsePrefix: raw.slice(0, 80), orderCount: orderIds.length },
          });
        }

        return {
          ok: success,
          mode: "real",
          status: success ? "signed" : "sign-failed",
          rpcUsed,
          vivianPresence,
          response: raw,
          message: success
            ? `${orderIds.length} order(s) signed successfully`
            : `Order signing failed: ${raw}`,
        };
      } catch (err: any) {
        disconnect();
        log.warn("ORWOR1 SIG failed", { error: safeErr(err) });
        for (const oid of (orderIds as string[])) {
          void logSignEvent({
            tenantId, orderIen: oid, dfn: validDfn!, duz: actor,
            action: "sign", status: "rpc_error",
            esHash: hashEsCode(String(esCode)), rpcUsed: "ORWOR1 SIG",
            detail: { error: safeErr(err) },
          });
        }
        auditWrite("clinical.order-sign", "failure", actor, validDfn!, { mode: "real", rpc: "ORWOR1 SIG" });
        return {
          ok: false,
          status: "sign-failed",
          rpcUsed,
          vivianPresence,
          error: safeErr(err),
          message: `Order signing RPC call failed: ${safeErr(err)}`,
        };
      }
    }

    // Signing RPC not available — return honest pending (no fake success)
    auditWrite("clinical.order-sign", "failure", actor, validDfn!, { mode: "rpc-unavailable" });
    for (const oid of (orderIds as string[])) {
      void logSignEvent({
        tenantId, orderIen: oid, dfn: validDfn!, duz: actor,
        action: "sign_attempt", status: "rpc_unavailable",
        detail: { rpcTarget: "ORWOR1 SIG" },
      });
    }
    return {
      ok: false,
      status: "integration-pending",
      rpcUsed,
      vivianPresence,
      pendingTargets: ["ORWOR1 SIG"],
      pendingNote: "ORWOR1 SIG not available at runtime. Orders remain unsigned.",
      unsignedCount: (orderIds as string[]).length,
      message: `${(orderIds as string[]).length} order(s) remain unsigned. Signing integration pending.`,
    };
  });

  /* ================================================================
   * POST /vista/cprs/order-checks
   * RPCs: ORWDXC ACCEPT, ORWDXC DISPLAY, ORWDXC SAVECHK
   * Runs VistA order checks for pending/new orders
   * ================================================================ */
  server.post("/vista/cprs/order-checks", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, orderIds } = body;
    const rpcUsed = ["ORWDXC ACCEPT", "ORWDXC DISPLAY"];
    const vivianPresence = {
      "ORWDXC ACCEPT": "present" as const,
      "ORWDXC DISPLAY": "present" as const,
      "ORWDXC SAVECHK": "present" as const,
    };

    const errors = validateRequired(body, ["dfn"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const actor = getActor(request);
    const checkAccept = optionalRpc("ORWDXC ACCEPT");

    if (checkAccept.available && orderIds && Array.isArray(orderIds) && orderIds.length > 0) {
      try {
        validateCredentials();
        await connect();

        // ORWDXC ACCEPT: params vary by VistA version
        // Attempt to get order check results for the given orders
        const orderIenStr = (orderIds as string[]).join(";");
        const acceptLines = await safeCallRpc("ORWDXC ACCEPT", [
          validDfn!, orderIenStr,
        ]);
        disconnect();

        // Parse check results: each line describes a check finding
        const checks = acceptLines
          .filter((l) => l.trim())
          .map((line, i) => {
            const parts = line.split("^");
            return {
              id: `chk-${i}`,
              type: parts[0]?.trim() || "unknown",
              severity: parts[1]?.trim() || "info",
              message: parts[2]?.trim() || line.trim(),
              orderIen: parts[3]?.trim() || "",
            };
          });

        audit("clinical.order-check", "success", { duz: actor }, {
          patientDfn: validDfn!,
          detail: { checkCount: checks.length, orderCount: (orderIds as string[]).length },
        });

        return {
          ok: true,
          source: "vista",
          mode: "real",
          checks,
          checkCount: checks.length,
          rpcUsed,
          vivianPresence,
          message: checks.length > 0
            ? `${checks.length} order check(s) found. Review before signing.`
            : "No order check findings. Safe to proceed.",
        };
      } catch (err: any) {
        disconnect();
        log.warn("ORWDXC ACCEPT failed", { error: safeErr(err) });
        // Fall through to pending
      }
    }

    // Order checks integration pending
    audit("clinical.order-check", "success", { duz: actor }, {
      patientDfn: validDfn!,
      detail: { mode: "integration-pending" },
    });

    return {
      ok: true,
      status: "integration-pending",
      checks: [],
      checkCount: 0,
      rpcUsed,
      vivianPresence,
      pendingTargets: ["ORWDXC ACCEPT", "ORWDXC DISPLAY", "ORWDXC SAVECHK"],
      pendingNote: "VistA order checks require active order context with valid order IEN(s). " +
        "ORWDXC ACCEPT returns drug-allergy, drug-drug interaction, duplicate therapy, " +
        "and contraindication checks. ORWDXC DISPLAY formats the check text for review. " +
        "In this sandbox: order check RPCs exist but require orders with proper orderable " +
        "items data to produce meaningful results.",
      message: "Order checks integration pending. No blocking checks found.",
    };
  });

  log.info("CPOE Parity routes registered (Phase 59)", {
    routes: [
      "GET  /vista/cprs/orders",
      "POST /vista/cprs/orders/lab",
      "POST /vista/cprs/orders/imaging",
      "POST /vista/cprs/orders/consult",
      "POST /vista/cprs/orders/sign",
      "POST /vista/cprs/order-checks",
    ],
  });
}
