/**
 * Phase 57 -- CPRS Wave 2 WRITE routes (Safety + Capability Detection)
 *
 * Every write endpoint follows the same safety model:
 *   1. Validate inputs server-side (return 400 with field errors before any RPC)
 *   2. Check RPC availability via optionalRpc()
 *   3. If available: safeCallRpc with idempotent:false (no auto-retry on writes)
 *   4. If RPC unavailable or fails: fall back to ServerDraft
 *   5. Audit: metadata only -- NEVER log input args, PHI, or clinical content
 *   6. Return rpcUsed[] and vivianPresence for traceability
 *   7. LOCK/UNLOCK pattern for order writes (always unlock, even on error)
 *
 * Idempotency: DB-backed via idempotencyGuard middleware (Phase 154: Postgres-backed).
 * Draft fallback: server-side structured draft when RPC is unavailable.
 *
 * Endpoints:
 *   POST /vista/cprs/problems/add       -- ORQQPL ADD SAVE
 *   POST /vista/cprs/problems/edit      -- ORQQPL EDIT SAVE
 *   POST /vista/cprs/notes/create       -- TIU CREATE RECORD + TIU SET DOCUMENT TEXT
 *   POST /vista/cprs/orders/draft       -- ORWDX LOCK + ORWDX SAVE + ORWDX UNLOCK
 *   POST /vista/cprs/orders/verify      -- ORWDXA VERIFY
 *   POST /vista/cprs/orders/dc          -- ORWDXA DC (Phase 78: wired with LOCK/UNLOCK)
 *   POST /vista/cprs/meds/quick-order   -- ORWDX LOCK + ORWDXM AUTOACK + ORWDX UNLOCK
 *   POST /vista/cprs/labs/ack           -- ORWLRR ACK
 *   POST /vista/cprs/vitals/add         -- GMV ADD VM
 *   POST /vista/cprs/allergies/add      -- ORWDAL32 SAVE ALLERGY
 *   POST /vista/cprs/consults/complete  -- ORQQCN2 MED RESULTS
 */

import type { FastifyInstance } from "fastify";
import { validateCredentials } from "../../vista/config.js";
import { connect, disconnect, getDuz } from "../../vista/rpcBrokerClient.js";
import { optionalRpc } from "../../vista/rpcCapabilities.js";
import { safeCallRpc, safeCallRpcWithList } from "../../lib/rpc-resilience.js";
import { audit } from "../../lib/audit.js";
import { log } from "../../lib/logger.js";
import { createDraft, type ServerDraft } from "../write-backs.js";
import { idempotencyGuard, idempotencyOnSend } from "../../middleware/idempotency.js";

/* ------------------------------------------------------------------ */
/* Phase 154: In-memory idempotency REMOVED.                           */
/* DB-backed idempotency via idempotencyGuard middleware (PG-backed).   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/* Validation helpers                                                  */
/* ------------------------------------------------------------------ */

interface ValidationError {
  field: string;
  message: string;
}

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

/* getIdempotencyKey removed in Phase 154 -- DB-backed middleware uses Idempotency-Key header */

/* ------------------------------------------------------------------ */
/* Shared audit helper -- metadata only, never log input args          */
/* ------------------------------------------------------------------ */

function auditWrite(
  action: Parameters<typeof audit>[0],
  outcome: "success" | "failure",
  actor: string,
  dfn: string,
  detail: { mode: string; rpc?: string; draftId?: string },
) {
  audit(action, outcome, { duz: actor }, {
    patientDfn: dfn,
    detail: { mode: detail.mode, rpc: detail.rpc, draftId: detail.draftId },
  });
}

function getActor(request: any): string {
  return (request as any).session?.duz ?? (request as any).session?.userName ?? "unknown";
}

/* ------------------------------------------------------------------ */
/* Route plugin                                                        */
/* ------------------------------------------------------------------ */

export default async function cprsWave2Routes(server: FastifyInstance): Promise<void> {

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
   * POST /vista/cprs/problems/add
   * RPC: ORQQPL ADD SAVE
   * ================================================================ */
  server.post("/vista/cprs/problems/add", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, problemText, icdCode, onset, status: probStatus, comment } = body;
    const rpcUsed = ["ORQQPL ADD SAVE"];
    const vivianPresence = { "ORQQPL ADD SAVE": "present" as const };

    // Validate
    const errors = validateRequired(body, ["dfn", "problemText"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    // Idempotency
    const check = optionalRpc("ORQQPL ADD SAVE");
    const actor = getActor(request);

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();
        const resp = await safeCallRpc("ORQQPL ADD SAVE", [
          validDfn!, duz, String(problemText), icdCode || "", onset || "", probStatus || "A",
        ], { idempotent: false });
        disconnect();

        const result = {
          ok: true, mode: "real", status: "saved",
          rpcUsed, vivianPresence,
          response: resp.join("\n"),
        };
        auditWrite("clinical.problem-add", "success", actor, validDfn!, { mode: "real", rpc: "ORQQPL ADD SAVE" });
        return result;
      } catch (err: any) {
        disconnect();
        log.warn("ORQQPL ADD SAVE failed, falling back to draft", { error: err.message });
      }
    }

    // Draft fallback
    const draft = createDraft("problem-save", validDfn!, "ORQQPL ADD SAVE", {
      action: "add", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.problem-add", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Problem saved as server-side draft. ORQQPL ADD SAVE sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/problems/edit
   * RPC: ORQQPL EDIT SAVE
   * ================================================================ */
  server.post("/vista/cprs/problems/edit", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, problemIen, problemText, icdCode, onset, status: probStatus, comment } = body;
    const rpcUsed = ["ORQQPL EDIT SAVE"];
    const vivianPresence = { "ORQQPL EDIT SAVE": "present" as const };

    const errors = validateRequired(body, ["dfn", "problemIen"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check = optionalRpc("ORQQPL EDIT SAVE");
    const actor = getActor(request);

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();
        const resp = await safeCallRpc("ORQQPL EDIT SAVE", [
          validDfn!, String(problemIen), duz, problemText || "", icdCode || "", onset || "", probStatus || "A",
        ], { idempotent: false });
        disconnect();

        const result = {
          ok: true, mode: "real", status: "saved",
          rpcUsed, vivianPresence,
          response: resp.join("\n"),
        };
        auditWrite("clinical.problem-edit", "success", actor, validDfn!, { mode: "real", rpc: "ORQQPL EDIT SAVE" });
        return result;
      } catch (err: any) {
        disconnect();
        log.warn("ORQQPL EDIT SAVE failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("problem-save", validDfn!, "ORQQPL EDIT SAVE", {
      action: "edit", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.problem-edit", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Problem edit saved as server-side draft. ORQQPL EDIT SAVE sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/notes/create
   * RPC: TIU CREATE RECORD + TIU SET DOCUMENT TEXT
   * ================================================================ */
  server.post("/vista/cprs/notes/create", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, titleIen, noteText, visitDate, visitLocation } = body;
    const rpcUsed = ["TIU CREATE RECORD", "TIU SET DOCUMENT TEXT"];
    const vivianPresence = {
      "TIU CREATE RECORD": "present" as const,
      "TIU SET DOCUMENT TEXT": "present" as const,
    };

    const errors = validateRequired(body, ["dfn", "titleIen", "noteText"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check1 = optionalRpc("TIU CREATE RECORD");
    const check2 = optionalRpc("TIU SET DOCUMENT TEXT");
    const actor = getActor(request);

    if (check1.available && check2.available) {
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();

        // Step 1: Create the record with LIST params
        const createResp = await safeCallRpcWithList("TIU CREATE RECORD", [
          { type: "literal", value: validDfn! },
          { type: "literal", value: String(titleIen) },
          { type: "literal", value: duz },
          { type: "literal", value: visitLocation || "" },
          { type: "literal", value: visitDate || "" },
        ], { idempotent: false });

        const docIen = createResp[0]?.split("^")[0]?.trim();
        if (!docIen || docIen.startsWith("-1")) {
          disconnect();
          throw new Error(`TIU CREATE RECORD returned error: ${createResp.join(" ")}`);
        }

        // Step 2: Set the text
        const textLines: Record<string, string> = {};
        const noteLines = String(noteText).split("\n");
        noteLines.forEach((line, i) => {
          textLines[`"TEXT",${i + 1},0`] = line;
        });
        await safeCallRpcWithList("TIU SET DOCUMENT TEXT", [
          { type: "literal", value: docIen },
          { type: "list", value: textLines },
        ], { idempotent: false });

        disconnect();

        const result = {
          ok: true, mode: "real", status: "created",
          documentIen: docIen,
          rpcUsed, vivianPresence,
        };
        auditWrite("clinical.note-create", "success", actor, validDfn!, { mode: "real", rpc: "TIU CREATE RECORD" });
        return result;
      } catch (err: any) {
        disconnect();
        log.warn("TIU note creation failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("order-sign", validDfn!, "TIU CREATE RECORD", {
      action: "note-create", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.note-create", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Note saved as server-side draft. TIU CREATE RECORD sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/orders/draft
   * RPC: ORWDX LOCK + ORWDX SAVE + ORWDX UNLOCK (always unlock)
   * ================================================================ */
  server.post("/vista/cprs/orders/draft", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, orderDialog, orderItems, urgency, comment } = body;
    const rpcUsed = ["ORWDX LOCK", "ORWDX SAVE", "ORWDX UNLOCK"];
    const vivianPresence = {
      "ORWDX LOCK": "present" as const,
      "ORWDX SAVE": "present" as const,
      "ORWDX UNLOCK": "present" as const,
    };

    const errors = validateRequired(body, ["dfn", "orderDialog"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check = optionalRpc("ORWDX SAVE");
    const actor = getActor(request);

    if (check.available) {
      let locked = false;
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();

        // LOCK
        const lockResp = await safeCallRpc("ORWDX LOCK", [validDfn!], { idempotent: false });
        locked = lockResp[0]?.trim() === "1";
        if (!locked) {
          disconnect();
          return reply.code(409).send({
            ok: false, error: "Patient locked by another provider",
            rpcUsed, vivianPresence,
          });
        }

        // SAVE
        const saveResp = await safeCallRpc("ORWDX SAVE", [
          validDfn!, duz, "1", String(orderDialog), ...(orderItems ? [JSON.stringify(orderItems)] : []),
        ], { idempotent: false });

        // UNLOCK (always)
        await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
        locked = false;

        disconnect();

        const result = {
          ok: true, mode: "real", status: "saved",
          rpcUsed, vivianPresence,
          response: saveResp.join("\n"),
        };
        auditWrite("clinical.order-draft", "success", actor, validDfn!, { mode: "real", rpc: "ORWDX SAVE" });
        return result;
      } catch (err: any) {
        // ALWAYS unlock on error
        if (locked) {
          await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
        }
        disconnect();
        log.warn("ORWDX SAVE failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("order-sign", validDfn!, "ORWDX SAVE", {
      action: "order-draft", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.order-draft", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Order saved as server-side draft. ORWDX SAVE sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/orders/verify
   * RPC: ORWDXA VERIFY
   * ================================================================ */
  server.post("/vista/cprs/orders/verify", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, orderId, verifyAction } = body;
    const rpcUsed = ["ORWDXA VERIFY"];
    const vivianPresence = { "ORWDXA VERIFY": "present" as const };

    const errors = validateRequired(body, ["dfn", "orderId"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check = optionalRpc("ORWDXA VERIFY");
    const actor = getActor(request);

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        const resp = await safeCallRpc("ORWDXA VERIFY", [
          validDfn!, String(orderId), verifyAction || "E",
        ], { idempotent: false });
        disconnect();

        const result = {
          ok: true, mode: "real", status: "verified",
          rpcUsed, vivianPresence,
          response: resp.join("\n"),
        };
        auditWrite("clinical.order-verify", "success", actor, validDfn!, { mode: "real", rpc: "ORWDXA VERIFY" });
        return result;
      } catch (err: any) {
        disconnect();
        log.warn("ORWDXA VERIFY failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("order-release", validDfn!, "ORWDXA VERIFY", {
      action: "order-verify", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.order-verify", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Order verification stored as draft. ORWDXA VERIFY sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/orders/dc  (Phase 78: wired to ORWDXA DC)
   * RPC: ORWDX LOCK + ORWDXA DC + ORWDX UNLOCK
   * Params: ORWDXA DC(ORIFN,PROVIEN,DCTYPE,DESSION,DCDATE,RSIEN)
   *   ORIFN   = order IEN
   *   PROVIEN = provider DUZ
   *   DCTYPE  = 1 (Discontinue) or 2 (Cancel)
   *   DESSION = e-sig hash (empty if not required)
   *   DCDATE  = FM date (empty = NOW)
   *   RSIEN   = reason-for-DC IEN from 100.02 (empty for default)
   * ================================================================ */
  server.post("/vista/cprs/orders/dc", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, orderId, reason, dcType } = body;
    const rpcUsed = ["ORWDX LOCK", "ORWDXA DC", "ORWDX UNLOCK"];
    const vivianPresence = {
      "ORWDX LOCK": "present" as const,
      "ORWDXA DC": "present" as const,
      "ORWDX UNLOCK": "present" as const,
    };

    const errors = validateRequired(body, ["dfn", "orderId"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check = optionalRpc("ORWDXA DC");
    const actor = getActor(request);

    if (check.available) {
      let locked = false;
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();

        // LOCK — positive match pattern ("1" = acquired, anything else = fail)
        const lockResp = await safeCallRpc("ORWDX LOCK", [validDfn!], { idempotent: false });
        locked = lockResp[0]?.trim() === "1";
        if (!locked) {
          disconnect();
          return reply.code(409).send({
            ok: false, error: "Patient locked by another provider", rpcUsed, vivianPresence,
          });
        }

        // ORWDXA DC: ORIFN^PROVIEN^DCTYPE^DESSION^DCDATE^RSIEN
        const dcTypeVal = String(dcType || 1); // 1=discontinue, 2=cancel
        const reasonIen = reason ? String(reason) : ""; // IEN from File 100.02 if provided
        const resp = await safeCallRpc("ORWDXA DC", [
          String(orderId), duz, dcTypeVal, "", "", reasonIen,
        ], { idempotent: false });

        // UNLOCK
        await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
        locked = false;
        disconnect();

        const respText = resp.join("\n").trim();
        const hasError = respText.includes("cannot be") || respText.startsWith("-1") || respText.includes("ERROR");

        if (hasError) {
          const result = {
            ok: false, mode: "error", error: respText || "ORWDXA DC returned error",
            rpcUsed, vivianPresence,
          };
          auditWrite("clinical.order-dc", "failure", actor, validDfn!, { mode: "error", rpc: "ORWDXA DC" });
          return result;
        }

        const result = {
          ok: true, mode: "real", status: "discontinued",
          rpcUsed, vivianPresence,
          response: respText,
          message: `Order ${orderId} discontinued via ORWDXA DC.`,
        };
        auditWrite("clinical.order-dc", "success", actor, validDfn!, { mode: "real", rpc: "ORWDXA DC" });
        return result;
      } catch (err: any) {
        if (locked) {
          await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
        }
        disconnect();
        log.warn("ORWDXA DC failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("order-dc", validDfn!, "ORWDXA DC", {
      action: "order-dc", orderId, reason: reason || "", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.order-dc", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Order discontinue stored as draft. ORWDXA DC sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/orders/flag  (Phase 78: wired to ORWDXA FLAG)
   * RPC: ORWDXA FLAG
   * Params: ORIFN^FLAG REASON (text)
   * ================================================================ */
  server.post("/vista/cprs/orders/flag", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, orderId, flagReason } = body;
    const rpcUsed = ["ORWDXA FLAG"];
    const vivianPresence = { "ORWDXA FLAG": "present" as const };

    const errors = validateRequired(body, ["dfn", "orderId", "flagReason"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check = optionalRpc("ORWDXA FLAG");
    const actor = getActor(request);

    if (check.available) {
      try {
        validateCredentials();
        await connect();

        // ORWDXA FLAG: ORIFN^FLAG REASON (flagReason is required — validated above)
        const resp = await safeCallRpc("ORWDXA FLAG", [
          String(orderId), String(flagReason),
        ], { idempotent: false });
        disconnect();

        const respText = resp.join("\n").trim();
        const hasError = respText.startsWith("-1") || respText.includes("ERROR");

        if (hasError) {
          const result = {
            ok: false, mode: "error", error: respText || "ORWDXA FLAG returned error",
            rpcUsed, vivianPresence,
          };
          auditWrite("clinical.order-flag", "failure", actor, validDfn!, { mode: "error", rpc: "ORWDXA FLAG" });
          return result;
        }

        const result = {
          ok: true, mode: "real", status: "flagged",
          rpcUsed, vivianPresence,
          response: respText,
          message: `Order ${orderId} flagged via ORWDXA FLAG.`,
        };
        auditWrite("clinical.order-flag", "success", actor, validDfn!, { mode: "real", rpc: "ORWDXA FLAG" });
        return result;
      } catch (err: any) {
        disconnect();
        log.warn("ORWDXA FLAG failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("order-flag", validDfn!, "ORWDXA FLAG", {
      action: "order-flag", orderId, flagReason: flagReason || "", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.order-flag", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Order flag stored as draft. ORWDXA FLAG sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/meds/quick-order
   * RPC: ORWDX LOCK + ORWDXM AUTOACK + ORWDX UNLOCK
   * ================================================================ */
  server.post("/vista/cprs/meds/quick-order", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, quickOrderIen } = body;
    const rpcUsed = ["ORWDX LOCK", "ORWDXM AUTOACK", "ORWDX UNLOCK"];
    const vivianPresence = {
      "ORWDX LOCK": "present" as const,
      "ORWDXM AUTOACK": "present" as const,
      "ORWDX UNLOCK": "present" as const,
    };

    const errors = validateRequired(body, ["dfn", "quickOrderIen"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check = optionalRpc("ORWDXM AUTOACK");
    const actor = getActor(request);

    if (check.available) {
      let locked = false;
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();

        // LOCK
        const lockResp = await safeCallRpc("ORWDX LOCK", [validDfn!], { idempotent: false });
        locked = lockResp[0]?.trim() === "1";
        if (!locked) {
          disconnect();
          return reply.code(409).send({
            ok: false, error: "Patient locked by another provider",
            rpcUsed, vivianPresence,
          });
        }

        // AUTOACK
        const ackResp = await safeCallRpc("ORWDXM AUTOACK", [
          validDfn!, duz, String(quickOrderIen),
        ], { idempotent: false });

        // UNLOCK (always)
        await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
        locked = false;

        disconnect();

        const result = {
          ok: true, mode: "real", status: "ordered",
          rpcUsed, vivianPresence,
          response: ackResp.join("\n"),
        };
        auditWrite("clinical.medication-add", "success", actor, validDfn!, { mode: "real", rpc: "ORWDXM AUTOACK" });
        return result;
      } catch (err: any) {
        if (locked) {
          await safeCallRpc("ORWDX UNLOCK", [validDfn!], { idempotent: true }).catch(() => {});
        }
        disconnect();
        log.warn("ORWDXM AUTOACK failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("order-sign", validDfn!, "ORWDXM AUTOACK", {
      action: "meds-quick-order", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.medication-add", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Quick order saved as server-side draft. ORWDXM AUTOACK sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/labs/ack
   * RPC: ORWLRR ACK
   * ================================================================ */
  server.post("/vista/cprs/labs/ack", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, labIds } = body;
    const rpcUsed = ["ORWLRR ACK"];
    const vivianPresence = { "ORWLRR ACK": "present" as const };

    const errors = validateRequired(body, ["dfn", "labIds"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (!Array.isArray(labIds) || labIds.length === 0) {
      errors.push({ field: "labIds", message: "labIds must be a non-empty array" });
    }
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check = optionalRpc("ORWLRR ACK");
    const actor = getActor(request);

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        for (const labId of labIds) {
          await safeCallRpc("ORWLRR ACK", [validDfn!, String(labId)], { idempotent: false });
        }
        disconnect();

        const result = {
          ok: true, mode: "real", count: labIds.length, status: "acknowledged",
          rpcUsed, vivianPresence,
        };
        auditWrite("clinical.lab-ack", "success", actor, validDfn!, { mode: "real", rpc: "ORWLRR ACK" });
        return result;
      } catch (err: any) {
        disconnect();
        log.warn("ORWLRR ACK failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("lab-ack", validDfn!, "ORWLRR ACK", {
      action: "lab-ack", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.lab-ack", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, count: labIds.length,
      status: "acknowledged-locally", syncPending: true,
      rpcUsed, vivianPresence,
      message: "Lab acknowledgements stored as draft. ORWLRR ACK sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/vitals/add
   * RPC: GMV ADD VM
   * ================================================================ */
  server.post("/vista/cprs/vitals/add", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, vitalType, value, units, qualifier } = body;
    const rpcUsed = ["GMV ADD VM"];
    const vivianPresence = { "GMV ADD VM": "present" as const };

    const errors = validateRequired(body, ["dfn", "vitalType", "value"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check = optionalRpc("GMV ADD VM");
    const actor = getActor(request);

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();
        // GMV ADD VM param format: DFN^date/time^vital type IEN^value^units^qualifier^DUZ^location
        const now = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14);
        const paramStr = `${validDfn}^${now}^${vitalType}^${value}^${units || ""}^${qualifier || ""}^${duz}^1`;
        const resp = await safeCallRpc("GMV ADD VM", [paramStr], { idempotent: false });
        disconnect();

        const result = {
          ok: true, mode: "real", status: "saved",
          rpcUsed, vivianPresence,
          response: resp.join("\n"),
        };
        auditWrite("clinical.vitals-add", "success", actor, validDfn!, { mode: "real", rpc: "GMV ADD VM" });
        return result;
      } catch (err: any) {
        disconnect();
        log.warn("GMV ADD VM failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("order-sign", validDfn!, "GMV ADD VM", {
      action: "vitals-add", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.vitals-add", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Vital measurement saved as draft. GMV ADD VM sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/allergies/add
   * RPC: ORWDAL32 SAVE ALLERGY
   * ================================================================ */
  server.post("/vista/cprs/allergies/add", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, reactant, reactions, severity, observedHistorical, comments } = body;
    const rpcUsed = ["ORWDAL32 SAVE ALLERGY"];
    const vivianPresence = { "ORWDAL32 SAVE ALLERGY": "present" as const };

    const errors = validateRequired(body, ["dfn", "reactant"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check = optionalRpc("ORWDAL32 SAVE ALLERGY");
    const actor = getActor(request);

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();

        // ORWDAL32 SAVE ALLERGY requires 6 OREDITED fields as LIST params
        const listParams: Record<string, string> = {
          '"GMRAGNT"': String(reactant),
          '"GMRATYPE"': "D",
          '"GMRANATR"': "A^Allergy",
          '"GMRAORIG"': duz,
          '"GMRACHT"': new Date().toISOString(),
          '"GMRAOBHX"': observedHistorical || "h^HISTORICAL",
        };
        if (severity) listParams['"GMRASEVR"'] = String(severity);
        if (comments) listParams['"GMRACMTS"'] = String(comments);
        if (reactions && Array.isArray(reactions)) {
          reactions.forEach((r: string, i: number) => {
            listParams[`"GMRASYMP",${i}`] = String(r);
          });
        }

        const resp = await safeCallRpcWithList("ORWDAL32 SAVE ALLERGY", [
          { type: "literal", value: validDfn! },
          { type: "list", value: listParams },
        ], { idempotent: false });
        disconnect();

        const result = {
          ok: true, mode: "real", status: "saved",
          rpcUsed, vivianPresence,
          response: resp.join("\n"),
        };
        auditWrite("clinical.allergy-add", "success", actor, validDfn!, { mode: "real", rpc: "ORWDAL32 SAVE ALLERGY" });
        return result;
      } catch (err: any) {
        disconnect();
        log.warn("ORWDAL32 SAVE ALLERGY failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("order-sign", validDfn!, "ORWDAL32 SAVE ALLERGY", {
      action: "allergy-add", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.allergy-add", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Allergy saved as draft. ORWDAL32 SAVE ALLERGY sync pending.",
    };
    return result;
  });

  /* ================================================================
   * POST /vista/cprs/consults/complete
   * RPC: ORQQCN2 MED RESULTS
   * ================================================================ */
  server.post("/vista/cprs/consults/complete", async (request, reply) => {
    const body = (request.body as any) || {};
    const { dfn, consultIen, resultText, urgency } = body;
    const rpcUsed = ["ORQQCN2 MED RESULTS"];
    const vivianPresence = { "ORQQCN2 MED RESULTS": "present" as const };

    const errors = validateRequired(body, ["dfn", "consultIen"]);
    const validDfn = validateDfn(dfn);
    if (!validDfn) errors.push({ field: "dfn", message: "dfn must be numeric" });
    if (errors.length) return reply.code(400).send({ ok: false, errors, rpcUsed, vivianPresence });

    const check = optionalRpc("ORQQCN2 MED RESULTS");
    const actor = getActor(request);

    if (check.available) {
      try {
        validateCredentials();
        await connect();
        const duz = getDuz();
        const resp = await safeCallRpc("ORQQCN2 MED RESULTS", [
          validDfn!, duz, String(consultIen), urgency || "Routine", resultText || "",
        ], { idempotent: false });
        disconnect();

        const result = {
          ok: true, mode: "real", status: "completed",
          rpcUsed, vivianPresence,
          response: resp.join("\n"),
        };
        auditWrite("clinical.consult-complete", "success", actor, validDfn!, { mode: "real", rpc: "ORQQCN2 MED RESULTS" });
        return result;
      } catch (err: any) {
        disconnect();
        log.warn("ORQQCN2 MED RESULTS failed, falling back to draft", { error: err.message });
      }
    }

    const draft = createDraft("consult-create", validDfn!, "ORQQCN2 MED RESULTS", {
      action: "consult-complete", attemptedAt: new Date().toISOString(),
    });
    auditWrite("clinical.consult-complete", "success", actor, validDfn!, { mode: "draft", draftId: draft.id });
    const result = {
      ok: true, mode: "draft", draftId: draft.id, status: "sync-pending",
      syncPending: true, rpcUsed, vivianPresence,
      message: "Consult completion stored as draft. ORQQCN2 MED RESULTS sync pending.",
    };
    return result;
  });
}
