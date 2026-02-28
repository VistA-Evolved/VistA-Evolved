/**
 * Orders Writeback Executor — Phase 302 (W12-P4)
 *
 * Domain executor for ORDERS writeback commands.
 * Implements the RpcExecutor interface from the command bus.
 *
 * Supported intents:
 *   PLACE_ORDER       → ORWDX LOCK + ORWDX SAVE + ORWDX UNLOCK
 *   DISCONTINUE_ORDER → ORWDX LOCK + ORWDXA DC + ORWDX UNLOCK
 *   VERIFY_ORDER      → ORWDXA VERIFY
 *   SIGN_ORDER        → ORWDX LOCK + ORWOR1 SIG + ORWDX UNLOCK
 *   FLAG_ORDER        → ORWDXA FLAG
 *
 * Safety:
 *   - LOCK before write, always UNLOCK after
 *   - esCode hashed for SIGN (never stored raw)
 *   - All writes audited via immutable audit
 */

import { createHash } from "crypto";
import type { ClinicalCommand, RpcExecutor, DryRunTranscript } from "../types.js";
import { optionalRpc } from "../../vista/rpcCapabilities.js";
import { safeCallRpc } from "../../lib/rpc-resilience.js";
import { validateCredentials } from "../../vista/config.js";
import { connect, disconnect, getDuz } from "../../vista/rpcBrokerClient.js";
import { log } from "../../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Intent → RPC mapping                                                */
/* ------------------------------------------------------------------ */

const INTENT_RPC_MAP: Record<string, string[]> = {
  PLACE_ORDER: ["ORWDX LOCK", "ORWDX SAVE", "ORWDX UNLOCK"],
  DISCONTINUE_ORDER: ["ORWDX LOCK", "ORWDXA DC", "ORWDX UNLOCK"],
  VERIFY_ORDER: ["ORWDXA VERIFY"],
  SIGN_ORDER: ["ORWDX LOCK", "ORWOR1 SIG", "ORWDX UNLOCK"],
  FLAG_ORDER: ["ORWDXA FLAG"],
};

/* ------------------------------------------------------------------ */
/* Executor implementation                                             */
/* ------------------------------------------------------------------ */

export const ordersExecutor: RpcExecutor = {
  async execute(command: ClinicalCommand): Promise<{
    vistaRefs: Record<string, string>;
    resultSummary: string;
  }> {
    const intent = command.intent;
    const rpcs = INTENT_RPC_MAP[intent];
    if (!rpcs) {
      throw Object.assign(new Error(`Unknown ORDERS intent: ${intent}`), {
        errorClass: "permanent",
      });
    }

    for (const rpcName of rpcs) {
      const check = optionalRpc(rpcName);
      if (!check.available) {
        throw Object.assign(
          new Error(`RPC ${rpcName} not available: ${check.error}`),
          { errorClass: "permanent" },
        );
      }
    }

    validateCredentials();
    await connect();

    try {
      switch (intent) {
        case "PLACE_ORDER":
          return await execPlaceOrder(command);
        case "DISCONTINUE_ORDER":
          return await execDiscontinueOrder(command);
        case "VERIFY_ORDER":
          return await execVerifyOrder(command);
        case "SIGN_ORDER":
          return await execSignOrder(command);
        case "FLAG_ORDER":
          return await execFlagOrder(command);
        default:
          throw Object.assign(new Error(`Unimplemented ORDERS intent: ${intent}`), {
            errorClass: "permanent",
          });
      }
    } finally {
      try { disconnect(); } catch { /* best-effort */ }
    }
  },

  dryRun(command: ClinicalCommand): DryRunTranscript {
    const rpcs = INTENT_RPC_MAP[command.intent] || [];
    const primaryRpc = rpcs[0] || "UNKNOWN";

    return {
      rpcName: primaryRpc,
      params: {
        intent: command.intent,
        domain: command.domain,
        rpcSequence: rpcs,
        payloadKeys: Object.keys(command.payloadJson),
      },
      simulatedResult: `Would execute ${rpcs.length} RPC(s): ${rpcs.join(" -> ")}`,
      recordedAt: new Date().toISOString(),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Intent executors                                                     */
/* ------------------------------------------------------------------ */

async function execPlaceOrder(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const dfn = String(p.dfn || "");
  const orderDialogIen = String(p.orderDialogIen || "");
  const locationIen = String(p.locationIen || "");

  if (!dfn || !orderDialogIen) {
    throw Object.assign(new Error("dfn and orderDialogIen required for PLACE_ORDER"), {
      errorClass: "permanent",
    });
  }

  // Step 1: LOCK patient
  const lockResult = await safeCallRpc("ORWDX LOCK", [dfn]);
  const lockStr = Array.isArray(lockResult) ? lockResult.join("") : String(lockResult || "");
  if (!lockStr.startsWith("1")) {
    throw Object.assign(new Error(`ORWDX LOCK failed: ${lockStr.slice(0, 100)}`), {
      errorClass: "transient",
    });
  }

  try {
    // Step 2: SAVE order
    const duz = getDuz();
    const saveResult = await safeCallRpc("ORWDX SAVE", [
      dfn,
      duz,
      locationIen || "0",
      orderDialogIen,
    ]);

    const orderIen = Array.isArray(saveResult)
      ? saveResult[0]?.split("^")[0]?.trim()
      : String(saveResult || "").split("^")[0]?.trim();

    if (!orderIen || orderIen === "0") {
      throw Object.assign(
        new Error(`ORWDX SAVE returned invalid order IEN: ${String(orderIen).slice(0, 50)}`),
        { errorClass: "permanent" },
      );
    }

    log.info(`ORDERS PLACE_ORDER completed: orderIen=${orderIen}`);

    return {
      vistaRefs: { orderIen },
      resultSummary: `Order placed: IEN ${orderIen}`,
    };
  } finally {
    // Step 3: ALWAYS UNLOCK
    try {
      await safeCallRpc("ORWDX UNLOCK", [dfn]);
    } catch (unlockErr) {
      log.warn(`ORWDX UNLOCK failed for dfn (best-effort): ${String(unlockErr)}`);
    }
  }
}

async function execDiscontinueOrder(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const dfn = String(p.dfn || "");
  const orderIen = String(p.orderIen || "");
  const reason = String(p.reason || "");

  if (!dfn || !orderIen) {
    throw Object.assign(new Error("dfn and orderIen required for DISCONTINUE_ORDER"), {
      errorClass: "permanent",
    });
  }

  const lockResult = await safeCallRpc("ORWDX LOCK", [dfn]);
  const lockStr = Array.isArray(lockResult) ? lockResult.join("") : String(lockResult || "");
  if (!lockStr.startsWith("1")) {
    throw Object.assign(new Error(`ORWDX LOCK failed: ${lockStr.slice(0, 100)}`), {
      errorClass: "transient",
    });
  }

  try {
    const duz = getDuz();
    await safeCallRpc("ORWDXA DC", [orderIen, duz, "", reason || "Discontinued"]);

    log.info(`ORDERS DISCONTINUE_ORDER completed: orderIen=${orderIen}`);

    return {
      vistaRefs: { orderIen },
      resultSummary: `Order discontinued: IEN ${orderIen}`,
    };
  } finally {
    try {
      await safeCallRpc("ORWDX UNLOCK", [dfn]);
    } catch (unlockErr) {
      log.warn(`ORWDX UNLOCK failed (best-effort): ${String(unlockErr)}`);
    }
  }
}

async function execVerifyOrder(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const orderIen = String(p.orderIen || "");

  if (!orderIen) {
    throw Object.assign(new Error("orderIen required for VERIFY_ORDER"), {
      errorClass: "permanent",
    });
  }

  const duz = getDuz();
  await safeCallRpc("ORWDXA VERIFY", [orderIen, duz, ""]);

  log.info(`ORDERS VERIFY_ORDER completed: orderIen=${orderIen}`);

  return {
    vistaRefs: { orderIen },
    resultSummary: `Order verified: IEN ${orderIen}`,
  };
}

async function execSignOrder(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const dfn = String(p.dfn || "");
  const orderIen = String(p.orderIen || "");
  const esCode = String(p.esCode || "");

  if (!dfn || !orderIen) {
    throw Object.assign(new Error("dfn and orderIen required for SIGN_ORDER"), {
      errorClass: "permanent",
    });
  }

  if (!esCode) {
    throw Object.assign(new Error("esCode required for SIGN_ORDER"), {
      errorClass: "permanent",
    });
  }

  const esHash = createHash("sha256").update(esCode).digest("hex").slice(0, 16);

  const lockResult = await safeCallRpc("ORWDX LOCK", [dfn]);
  const lockStr = Array.isArray(lockResult) ? lockResult.join("") : String(lockResult || "");
  if (!lockStr.startsWith("1")) {
    throw Object.assign(new Error(`ORWDX LOCK failed: ${lockStr.slice(0, 100)}`), {
      errorClass: "transient",
    });
  }

  try {
    await safeCallRpc("ORWOR1 SIG", [orderIen, esCode]);

    log.info(`ORDERS SIGN_ORDER completed: orderIen=${orderIen} esHash=${esHash}`);

    return {
      vistaRefs: { orderIen, esHash },
      resultSummary: `Order signed: IEN ${orderIen}`,
    };
  } finally {
    try {
      await safeCallRpc("ORWDX UNLOCK", [dfn]);
    } catch (unlockErr) {
      log.warn(`ORWDX UNLOCK failed (best-effort): ${String(unlockErr)}`);
    }
  }
}

async function execFlagOrder(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const orderIen = String(p.orderIen || "");
  const flagText = String(p.flagText || "");

  if (!orderIen) {
    throw Object.assign(new Error("orderIen required for FLAG_ORDER"), {
      errorClass: "permanent",
    });
  }

  const duz = getDuz();
  await safeCallRpc("ORWDXA FLAG", [orderIen, duz, flagText || "Flagged"]);

  log.info(`ORDERS FLAG_ORDER completed: orderIen=${orderIen}`);

  return {
    vistaRefs: { orderIen },
    resultSummary: `Order flagged: IEN ${orderIen}`,
  };
}
