/**
 * Pharmacy Writeback Executor -- Phase 303 (W12-P5)
 *
 * Domain executor for PHARM writeback commands.
 * Implements the RpcExecutor interface from the command bus.
 *
 * Supported intents:
 *   PLACE_MED_ORDER       -> ORWDX LOCK + ORWDX SAVE + ORWDXM AUTOACK + ORWDX UNLOCK
 *   DISCONTINUE_MED_ORDER -> ORWDX LOCK + ORWDXA DC + ORWDX UNLOCK
 *   ADMINISTER_MED        -> PSB MED LOG (sandbox-absent, integration-pending)
 *
 * Safety:
 *   - LOCK before write, always UNLOCK after (finally block)
 *   - ADMINISTER_MED is integration-pending (PSB package not in WorldVistA sandbox)
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
  PLACE_MED_ORDER: ['ORWDX LOCK', 'ORWDX SAVE', 'ORWDXM AUTOACK', 'ORWDX UNLOCK'],
  DISCONTINUE_MED_ORDER: ['ORWDX LOCK', 'ORWDXA DC', 'ORWDX UNLOCK'],
  ADMINISTER_MED: ['PSB MED LOG'],
};

/* ------------------------------------------------------------------ */
/* Executor                                                            */
/* ------------------------------------------------------------------ */

export const pharmExecutor: RpcExecutor = {
  async execute(command: ClinicalCommand): Promise<{
    vistaRefs: Record<string, string>;
    resultSummary: string;
  }> {
    const intent = command.intent;
    const rpcs = INTENT_RPC_MAP[intent];
    if (!rpcs) {
      throw Object.assign(new Error(`Unknown PHARM intent: ${intent}`), {
        errorClass: 'permanent',
      });
    }

    // ADMINISTER_MED requires PSB package which is not in the sandbox
    if (intent === 'ADMINISTER_MED') {
      throw Object.assign(
        new Error(
          'ADMINISTER_MED requires PSB MED LOG (integration-pending: PSB package not in WorldVistA sandbox)'
        ),
        { errorClass: 'permanent' }
      );
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
      case 'PLACE_MED_ORDER':
        return await execPlaceMedOrder(command);
      case 'DISCONTINUE_MED_ORDER':
        return await execDiscontinueMedOrder(command);
      default:
        throw Object.assign(new Error(`Unimplemented PHARM intent: ${intent}`), {
          errorClass: 'permanent',
        });
    }
  },

  dryRun(command: ClinicalCommand): DryRunTranscript {
    const rpcs = INTENT_RPC_MAP[command.intent] || [];
    const primaryRpc = rpcs[0] || 'UNKNOWN';

    const integrationNote =
      command.intent === 'ADMINISTER_MED'
        ? ' [integration-pending: PSB package not in sandbox]'
        : '';

    return {
      rpcName: primaryRpc,
      params: {
        intent: command.intent,
        domain: command.domain,
        rpcSequence: rpcs,
        payloadKeys: Object.keys(command.payloadJson),
        integrationNote: integrationNote || undefined,
      },
      simulatedResult: `Would execute ${rpcs.length} RPC(s): ${rpcs.join(' -> ')}${integrationNote}`,
      recordedAt: new Date().toISOString(),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Intent executors                                                     */
/* ------------------------------------------------------------------ */

async function execPlaceMedOrder(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const dfn = String(p.dfn || '');
  const orderDialogIen = String(p.orderDialogIen || '');
  const locationIen = String(p.locationIen || '');

  if (!dfn || !orderDialogIen) {
    throw Object.assign(new Error('dfn and orderDialogIen required for PLACE_MED_ORDER'), {
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
    // Step 2: SAVE medication order
    const duz = String(cmd.createdBy || '').trim();
    if (!duz) {
      throw Object.assign(
        new Error('createdBy DUZ required for clinician-attributed PLACE_MED_ORDER'),
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

    // Step 3: AUTOACK (quick order med acknowledge)
    try {
      await safeCallRpc('ORWDXM AUTOACK', [orderIen]);
    } catch (ackErr) {
      log.warn(`ORWDXM AUTOACK failed (non-fatal): ${String(ackErr)}`);
    }

    log.info(`PHARM PLACE_MED_ORDER completed: orderIen=${orderIen}`);

    return {
      vistaRefs: { orderIen },
      resultSummary: `Medication order placed: IEN ${orderIen}`,
    };
  } finally {
    // Step 4: ALWAYS UNLOCK
    try {
      await safeCallRpc('ORWDX UNLOCK', [dfn]);
    } catch (unlockErr) {
      log.warn(`ORWDX UNLOCK failed (best-effort): ${String(unlockErr)}`);
    }
  }
}

async function execDiscontinueMedOrder(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const dfn = String(p.dfn || '');
  const orderIen = String(p.orderIen || '');
  const reason = String(p.reason || '');

  if (!dfn || !orderIen) {
    throw Object.assign(new Error('dfn and orderIen required for DISCONTINUE_MED_ORDER'), {
      errorClass: 'permanent',
    });
  }

  const lockResult = await safeCallRpc('ORWDX LOCK', [dfn]);
  const lockStr = Array.isArray(lockResult) ? lockResult.join('') : String(lockResult || '');
  if (!lockStr.startsWith('1')) {
    throw Object.assign(new Error(`ORWDX LOCK failed: ${lockStr.slice(0, 100)}`), {
      errorClass: 'transient',
    });
  }

  try {
    const duz = String(cmd.createdBy || '').trim();
    if (!duz) {
      throw Object.assign(
        new Error('createdBy DUZ required for clinician-attributed DISCONTINUE_MED_ORDER'),
        {
          errorClass: 'permanent',
        }
      );
    }
    await safeCallRpc('ORWDXA DC', [orderIen, duz, '', reason || 'Discontinued']);

    log.info(`PHARM DISCONTINUE_MED_ORDER completed: orderIen=${orderIen}`);

    return {
      vistaRefs: { orderIen },
      resultSummary: `Medication order discontinued: IEN ${orderIen}`,
    };
  } finally {
    try {
      await safeCallRpc('ORWDX UNLOCK', [dfn]);
    } catch (unlockErr) {
      log.warn(`ORWDX UNLOCK failed (best-effort): ${String(unlockErr)}`);
    }
  }
}
