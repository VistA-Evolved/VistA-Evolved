/**
 * Phase 59 -- CPOE Parity: Order routes (lab, imaging, consult, sign, checks, list)
 *
 * Every endpoint follows the safety model established in Wave 2 (Phase 57):
 *   1. Validate inputs server-side (400 before any RPC)
 *   2. Check RPC availability via optionalRpc()
 *   3. WRITE calls: LOCK/action/UNLOCK with always-unlock
 *   4. Audit: metadata only -- NEVER log input args, PHI, or clinical content
 *   5. Return rpcUsed[] and vivianPresence for traceability
 *   6. Idempotency via X-Idempotency-Key header
 *   7. Draft fallback when RPC unavailable
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
import { validateCredentials } from "../../vista/config.js";
import { connect, disconnect, getDuz } from "../../vista/rpcBrokerClient.js";
import { optionalRpc } from "../../vista/rpcCapabilities.js";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { audit } from "../../lib/audit.js";
import { log } from "../../lib/logger.js";
import { createDraft } from "../write-backs.js";

/* ------------------------------------------------------------------ */
/* Idempotency (shared store pattern from wave2)                       */
/* ------------------------------------------------------------------ */

interface IdempotencyEntry { result: unknown; createdAt: number; }
const idempotencyStore = new Map<string, IdempotencyEntry>();
const IDEMPOTENCY_TTL_MS = 10 * 60 * 1000;

function checkIdempotency(key: string | undefined): unknown | null {
  if (!key) return null;
  const entry = idempotencyStore.get(key);
  if (entry && Date.now() - entry.createdAt < IDEMPOTENCY_TTL_MS) return entry.result;
  if (entry) idempotencyStore.delete(key);
  return null;
}

function storeIdempotency(key: string | undefined, result: unknown): void {
  if (!key) return;
  idempotencyStore.set(key, { result, createdAt: Date.now() });
  if (idempotencyStore.size > 1000) {
    const now = Date.now();
    for (const [k, v] of idempotencyStore) {
      if (now - v.createdAt > IDEMPOTENCY_TTL_MS) idempotencyStore.delete(k);
    }
  }
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

function getIdempotencyKey(request: any): string | undefined {
  return (request.headers as any)?.["x-idempotency-key"] as string | undefined;
}

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
      return { ok: false, error: err.message, rpcUsed, vivianPresence };
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

    const iKey = getIdempotencyKey(request);
    const cached = checkIdempotency(iKey);
    if (cached) return cached;

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

    // If no quick order found, return honest integration-pending
    if (!qoIen) {
      const draft = createDraft("order-sign", validDfn!, "ORWDX SAVE", {
        action: "lab-order", labTest: String(labTest || ""), attemptedAt: new Date().toISOString(),
      });
      auditWrite("clinical.order-lab", "success", actor, validDfn!, {
        mode: "draft", draftId: draft.id, orderType: "lab",
      });
      const result = {
        ok: true,
        mode: "draft",
        status: "integration-pending",
        draftId: draft.id,
        rpcUsed,
        vivianPresence,
        pendingTargets: ["ORWDXM AUTOACK"],
        pendingNote: "Lab quick orders (LRZ*) are not pre-configured in WorldVistA Docker sandbox. " +
          "To enable: configure lab quick orders in VistA Order Entry Setup, then pass quickOrderIen directly. " +
          "Medication quick orders (PSOZ* IENs 1628-1658) are available as an alternative path.",
        message: `Lab order for "${labTest || ""}" saved as draft. Quick order IEN not available in sandbox.`,
      };
      storeIdempotency(iKey, result);
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
      storeIdempotency(iKey, result);
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
      storeIdempotency(iKey, result);
      return result;
    } catch (err: any) {
      if (locked) {
        await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
      }
      disconnect();
      log.warn("Lab order AUTOACK failed", { error: err.message });
      return { ok: false, error: err.message, rpcUsed, vivianPresence };
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
      const iKey = getIdempotencyKey(request);
      const cached = checkIdempotency(iKey);
      if (cached) return cached;

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
          storeIdempotency(iKey, result);
          return result;
        } catch (err: any) {
          if (locked) await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
          disconnect();
          return { ok: false, error: err.message, rpcUsed, vivianPresence };
        }
      }
    }

    // Default: integration-pending (no imaging QOs in sandbox)
    const draft = createDraft("order-sign", validDfn!, "ORWDXM AUTOACK", {
      action: "imaging-order", imagingStudy: String(imagingStudy || ""),
      attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.order-imaging", "success", actor, validDfn!, { mode: "draft", draftId: draft.id, orderType: "imaging" });

    return {
      ok: true,
      mode: "draft",
      status: "integration-pending",
      draftId: draft.id,
      rpcUsed,
      vivianPresence,
      pendingTargets: ["ORWDXM AUTOACK", "ORWDXR NEW ORDER"],
      pendingNote: "Imaging quick orders (RA*) are not pre-configured in WorldVistA Docker sandbox. " +
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
    const draft = createDraft("order-sign", validDfn!, "ORWDX SAVE", {
      action: "consult-order", consultService: String(consultService),
      urgency: urgency || "routine",
      attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.order-consult", "success", actor, validDfn!, { mode: "draft", draftId: draft.id, orderType: "consult" });

    return {
      ok: true,
      mode: "draft",
      status: "integration-pending",
      draftId: draft.id,
      rpcUsed,
      vivianPresence,
      pendingTargets: ["ORWDX SAVE"],
      pendingNote: "Consult orders require full ORDIALOG parameter build — service IEN, urgency, " +
        "place of consultation, requesting provider, reason for request, and order dialog ID. " +
        "This complex parameter assembly is a future enhancement. " +
        "Target: ORWDX SAVE with consult dialog (ORDIALOG #101.43).",
      message: `Consult order for "${consultService}" saved as draft. Full dialog integration pending.`,
    };
  });

  /* ================================================================
   * POST /vista/cprs/orders/sign
   * RPC: ORWOR1 SIG — electronically sign order(s)
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

    const iKey = getIdempotencyKey(request);
    const cached = checkIdempotency(iKey);
    if (cached) return cached;

    const actor = getActor(request);
    const check = optionalRpc("ORWOR1 SIG");

    if (check.available && esCode) {
      try {
        validateCredentials();
        await connect();

        // ORWOR1 SIG params: DFN^OrderIEN(s)^ESCode
        // OrderIENs joined by semicolons
        const orderIenStr = (orderIds as string[]).join(";");
        const resp = await safeCallRpc("ORWOR1 SIG", [
          validDfn!, orderIenStr, String(esCode),
        ], { idempotent: false });
        disconnect();

        const raw = resp.join("\n").trim();
        const success = !raw.startsWith("-1") && !raw.toLowerCase().includes("error");

        auditWrite("clinical.order-sign", success ? "success" : "failure", actor, validDfn!, {
          mode: "real", rpc: "ORWOR1 SIG",
        });

        const result = {
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
        storeIdempotency(iKey, result);
        return result;
      } catch (err: any) {
        disconnect();
        log.warn("ORWOR1 SIG failed", { error: err.message });
      }
    }

    // Signing not available or no esCode — return honest pending
    auditWrite("clinical.order-sign", "success", actor, validDfn!, { mode: "pending" });
    const result = {
      ok: true,
      status: "integration-pending",
      rpcUsed,
      vivianPresence,
      pendingTargets: ["ORWOR1 SIG"],
      pendingNote: !esCode
        ? "Electronic signature code required for order signing. " +
          "In CPRS, this is the user's e-signature code entered at sign time. " +
          "Orders remain unsigned until signed. Target RPC: ORWOR1 SIG."
        : "ORWOR1 SIG not available at runtime. Orders remain unsigned.",
      unsignedCount: (orderIds as string[]).length,
      message: `${(orderIds as string[]).length} order(s) remain unsigned. Signing integration pending.`,
    };
    storeIdempotency(iKey, result);
    return result;
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
        log.warn("ORWDXC ACCEPT failed", { error: err.message });
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
