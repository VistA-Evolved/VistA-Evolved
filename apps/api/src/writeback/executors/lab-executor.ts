/**
 * Lab Writeback Executor -- Phase 304 (W12-P6)
 *
 * Domain executor for LAB writeback commands.
 * Implements the RpcExecutor interface from the command bus.
 *
 * Supported intents:
 *   PLACE_LAB_ORDER  -> ORWDX LOCK + ORWDX SAVE + ORWDX UNLOCK
 *   ACK_LAB_RESULT   -> ORWLRR ACK
 *
 * Safety:
 *   - LOCK before order placement, always UNLOCK after
 *   - ACK does not require patient lock (result-level operation)
 *   - No PHI in logs or audit
 */

import type { ClinicalCommand, RpcExecutor, DryRunTranscript } from '../types.js';
import { optionalRpc } from '../../vista/rpcCapabilities.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { log } from '../../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Intent -> RPC mapping                                                */
/* ------------------------------------------------------------------ */

const INTENT_RPC_MAP: Record<string, string[]> = {
  PLACE_LAB_ORDER: ['ORWDX LOCK', 'ORWDX SAVE', 'ORWDX UNLOCK'],
  ACK_LAB_RESULT: ['ORWLRR ACK'],
};

/* ------------------------------------------------------------------ */
/* Executor                                                            */
/* ------------------------------------------------------------------ */

export const labExecutor: RpcExecutor = {
  async execute(command: ClinicalCommand): Promise<{
    vistaRefs: Record<string, string>;
    resultSummary: string;
  }> {
    const intent = command.intent;
    const rpcs = INTENT_RPC_MAP[intent];
    if (!rpcs) {
      throw Object.assign(new Error(`Unknown LAB intent: ${intent}`), {
        errorClass: 'permanent',
      });
    }

    for (const rpcName of rpcs) {
      const check = optionalRpc(rpcName);
      if (!check.available) {
        throw Object.assign(new Error(`RPC ${rpcName} not available: ${check.error}`), {
          errorClass: 'permanent',
        });
      }
    }

    switch (intent) {
      case 'PLACE_LAB_ORDER':
        return await execPlaceLabOrder(command);
      case 'ACK_LAB_RESULT':
        return await execAckLabResult(command);
      default:
        throw Object.assign(new Error(`Unimplemented LAB intent: ${intent}`), {
          errorClass: 'permanent',
        });
    }
  },

  dryRun(command: ClinicalCommand): DryRunTranscript {
    const rpcs = INTENT_RPC_MAP[command.intent] || [];
    const primaryRpc = rpcs[0] || 'UNKNOWN';

    return {
      rpcName: primaryRpc,
      params: {
        intent: command.intent,
        domain: command.domain,
        rpcSequence: rpcs,
        payloadKeys: Object.keys(command.payloadJson),
      },
      simulatedResult: `Would execute ${rpcs.length} RPC(s): ${rpcs.join(' -> ')}`,
      recordedAt: new Date().toISOString(),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Intent executors                                                     */
/* ------------------------------------------------------------------ */

async function execPlaceLabOrder(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const dfn = String(p.dfn || '');
  const orderDialogIen = String(p.orderDialogIen || '');
  const locationIen = String(p.locationIen || '');

  if (!dfn || !orderDialogIen) {
    throw Object.assign(new Error('dfn and orderDialogIen required for PLACE_LAB_ORDER'), {
      errorClass: 'permanent',
    });
  }

  // Step 1: LOCK patient
  const lockResult = await safeCallRpc('ORWDX LOCK', [dfn]);
  const lockStr = Array.isArray(lockResult) ? lockResult.join('') : String(lockResult || '');
  if (!lockStr.startsWith('1')) {
    throw Object.assign(new Error(`ORWDX LOCK failed: ${lockStr.slice(0, 100)}`), {
      errorClass: 'transient',
    });
  }

  try {
    // Step 2: SAVE lab order
    const duz = String(cmd.createdBy || '').trim();
    if (!duz) {
      throw Object.assign(
        new Error('createdBy DUZ required for clinician-attributed PLACE_LAB_ORDER'),
        {
          errorClass: 'permanent',
        }
      );
    }
    const saveResult = await safeCallRpc('ORWDX SAVE', [
      dfn,
      duz,
      locationIen || '0',
      orderDialogIen,
    ]);

    const orderIen = Array.isArray(saveResult)
      ? saveResult[0]?.split('^')[0]?.trim()
      : String(saveResult || '')
          .split('^')[0]
          ?.trim();

    if (!orderIen || orderIen === '0') {
      throw Object.assign(
        new Error(`ORWDX SAVE returned invalid order IEN: ${String(orderIen).slice(0, 50)}`),
        { errorClass: 'permanent' }
      );
    }

    log.info(`LAB PLACE_LAB_ORDER completed: orderIen=${orderIen}`);

    return {
      vistaRefs: { orderIen },
      resultSummary: `Lab order placed: IEN ${orderIen}`,
    };
  } finally {
    // Step 3: ALWAYS UNLOCK
    try {
      await safeCallRpc('ORWDX UNLOCK', [dfn]);
    } catch (unlockErr) {
      log.warn(`ORWDX UNLOCK failed (best-effort): ${String(unlockErr)}`);
    }
  }
}

async function execAckLabResult(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const orderIen = String(p.orderIen || '');

  if (!orderIen) {
    throw Object.assign(new Error('orderIen required for ACK_LAB_RESULT'), {
      errorClass: 'permanent',
    });
  }

  const duz = String(cmd.createdBy || '').trim();
  if (!duz) {
    throw Object.assign(
      new Error('createdBy DUZ required for clinician-attributed ACK_LAB_RESULT'),
      {
        errorClass: 'permanent',
      }
    );
  }
  await safeCallRpc('ORWLRR ACK', [orderIen, duz]);

  log.info(`LAB ACK_LAB_RESULT completed: orderIen=${orderIen}`);

  return {
    vistaRefs: { orderIen },
    resultSummary: `Lab result acknowledged: IEN ${orderIen}`,
  };
}
