/**
 * TIU Notes Writeback Executor — Phase 301 (W12-P3)
 *
 * Domain executor for TIU (notes) writeback commands.
 * Implements the RpcExecutor interface from the command bus.
 *
 * Supported intents:
 *   CREATE_NOTE_DRAFT  → TIU CREATE RECORD + TIU SET DOCUMENT TEXT
 *   UPDATE_NOTE_TEXT   → TIU SET DOCUMENT TEXT (existing doc)
 *   SIGN_NOTE          → TIU LOCK RECORD + TIU SIGN RECORD + TIU UNLOCK RECORD
 *   CREATE_ADDENDUM    → TIU CREATE ADDENDUM RECORD + TIU SET DOCUMENT TEXT
 *
 * Safety:
 *   - LOCK before SIGN, always UNLOCK after
 *   - esCode hashed (never stored raw)
 *   - All writes audited via immutable audit
 *   - dry-run returns transcript without RPC execution
 */

import { createHash } from 'crypto';
import type { ClinicalCommand, RpcExecutor, DryRunTranscript } from '../types.js';
import { optionalRpc } from '../../vista/rpcCapabilities.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { validateCredentials } from '../../vista/config.js';
import { connect, disconnect, getDuz } from '../../vista/rpcBrokerClient.js';
import { log } from '../../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Intent → RPC mapping                                                */
/* ------------------------------------------------------------------ */

const INTENT_RPC_MAP: Record<string, string[]> = {
  CREATE_NOTE_DRAFT: ['TIU CREATE RECORD', 'TIU SET DOCUMENT TEXT'],
  UPDATE_NOTE_TEXT: ['TIU SET DOCUMENT TEXT'],
  SIGN_NOTE: ['TIU LOCK RECORD', 'TIU SIGN RECORD', 'TIU UNLOCK RECORD'],
  CREATE_ADDENDUM: ['TIU CREATE ADDENDUM RECORD', 'TIU SET DOCUMENT TEXT'],
};

/* ------------------------------------------------------------------ */
/* Executor implementation                                             */
/* ------------------------------------------------------------------ */

export const tiuExecutor: RpcExecutor = {
  async execute(command: ClinicalCommand): Promise<{
    vistaRefs: Record<string, string>;
    resultSummary: string;
  }> {
    const intent = command.intent;

    // Check RPC availability
    const rpcs = INTENT_RPC_MAP[intent];
    if (!rpcs) {
      throw Object.assign(new Error(`Unknown TIU intent: ${intent}`), {
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

    validateCredentials();
    await connect();

    try {
      switch (intent) {
        case 'CREATE_NOTE_DRAFT':
          return await execCreateDraft(command);
        case 'UPDATE_NOTE_TEXT':
          return await execUpdateText(command);
        case 'SIGN_NOTE':
          return await execSignNote(command);
        case 'CREATE_ADDENDUM':
          return await execCreateAddendum(command);
        default:
          throw Object.assign(new Error(`Unimplemented TIU intent: ${intent}`), {
            errorClass: 'permanent',
          });
      }
    } finally {
      try {
        disconnect();
      } catch {
        /* best-effort */
      }
    }
  },

  dryRun(command: ClinicalCommand): DryRunTranscript {
    const rpcs = INTENT_RPC_MAP[command.intent] || [];
    const primaryRpc = rpcs[0] || 'UNKNOWN';

    // Build simulated params (no PHI — just structure)
    const params: Record<string, unknown> = {
      intent: command.intent,
      domain: command.domain,
      rpcSequence: rpcs,
    };

    // Add sanitized payload keys (no values)
    params.payloadKeys = Object.keys(command.payloadJson);

    return {
      rpcName: primaryRpc,
      params,
      simulatedResult: `Would execute ${rpcs.length} RPC(s): ${rpcs.join(' -> ')}`,
      recordedAt: new Date().toISOString(),
    };
  },
};

/* ------------------------------------------------------------------ */
/* Intent executors                                                     */
/* ------------------------------------------------------------------ */

async function execCreateDraft(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const dfn = String(p.dfn || '');
  const titleIen = String(p.titleIen || '');
  const text = String(p.text || '');
  const visitStr = String(p.visitStr || '');

  if (!dfn || !titleIen) {
    throw Object.assign(new Error('dfn and titleIen are required for CREATE_NOTE_DRAFT'), {
      errorClass: 'permanent',
    });
  }

  const duz = getDuz();

  // Step 1: TIU CREATE RECORD
  const createResult = await safeCallRpc('TIU CREATE RECORD', [
    dfn, // patient DFN
    titleIen, // title IEN
    '', // visit date (empty = now)
    '', // visit IEN
    visitStr, // location visit string
    '', // SUPPRESS
    duz, // author DUZ
  ]);

  const docIen = Array.isArray(createResult)
    ? createResult[0]?.trim()
    : String(createResult || '').trim();

  if (!docIen || !/^\d+$/.test(docIen)) {
    throw Object.assign(
      new Error(`TIU CREATE RECORD returned invalid IEN: ${String(docIen).slice(0, 50)}`),
      { errorClass: 'permanent' }
    );
  }

  // Step 2: TIU SET DOCUMENT TEXT (if text provided)
  if (text) {
    await safeCallRpc('TIU SET DOCUMENT TEXT', [docIen, text, '1']);
  }

  log.info(`TIU CREATE_NOTE_DRAFT completed: docIen=${docIen}`);

  return {
    vistaRefs: { docIen },
    resultSummary: `Draft note created: IEN ${docIen}`,
  };
}

async function execUpdateText(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const docIen = String(p.docIen || '');
  const text = String(p.text || '');

  if (!docIen || !text) {
    throw Object.assign(new Error('docIen and text are required for UPDATE_NOTE_TEXT'), {
      errorClass: 'permanent',
    });
  }

  await safeCallRpc('TIU SET DOCUMENT TEXT', [docIen, text, '1']);

  log.info(`TIU UPDATE_NOTE_TEXT completed: docIen=${docIen}`);

  return {
    vistaRefs: { docIen },
    resultSummary: `Note text updated: IEN ${docIen}`,
  };
}

async function execSignNote(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const docIen = String(p.docIen || '');
  const esCode = String(p.esCode || '');

  if (!docIen) {
    throw Object.assign(new Error('docIen is required for SIGN_NOTE'), {
      errorClass: 'permanent',
    });
  }

  if (!esCode) {
    throw Object.assign(new Error('esCode is required for SIGN_NOTE'), {
      errorClass: 'permanent',
    });
  }

  // Hash the esCode for audit (never store raw)
  const esHash = createHash('sha256').update(esCode).digest('hex').slice(0, 16);

  // Step 1: LOCK
  const lockResult = await safeCallRpc('TIU LOCK RECORD', [docIen]);
  const lockStr = Array.isArray(lockResult) ? lockResult.join('') : String(lockResult || '');
  if (lockStr.includes('1') === false && !lockStr.startsWith('1')) {
    throw Object.assign(new Error(`TIU LOCK RECORD failed: ${lockStr.slice(0, 100)}`), {
      errorClass: 'transient',
    });
  }

  try {
    // Step 2: SIGN
    await safeCallRpc('TIU SIGN RECORD', [docIen, esCode]);

    log.info(`TIU SIGN_NOTE completed: docIen=${docIen} esHash=${esHash}`);

    return {
      vistaRefs: { docIen, esHash },
      resultSummary: `Note signed: IEN ${docIen}`,
    };
  } finally {
    // Step 3: ALWAYS UNLOCK
    try {
      await safeCallRpc('TIU UNLOCK RECORD', [docIen]);
    } catch (unlockErr) {
      log.warn(`TIU UNLOCK RECORD failed for docIen=${docIen} (best-effort): ${String(unlockErr)}`);
    }
  }
}

async function execCreateAddendum(cmd: ClinicalCommand): Promise<{
  vistaRefs: Record<string, string>;
  resultSummary: string;
}> {
  const p = cmd.payloadJson;
  const parentIen = String(p.parentIen || '');
  const text = String(p.text || '');

  if (!parentIen) {
    throw Object.assign(new Error('parentIen is required for CREATE_ADDENDUM'), {
      errorClass: 'permanent',
    });
  }

  // Step 1: TIU CREATE ADDENDUM RECORD
  const addResult = await safeCallRpc('TIU CREATE ADDENDUM RECORD', [parentIen]);
  const addIen = Array.isArray(addResult) ? addResult[0]?.trim() : String(addResult || '').trim();

  if (!addIen || !/^\d+$/.test(addIen)) {
    throw Object.assign(
      new Error(`TIU CREATE ADDENDUM RECORD returned invalid IEN: ${String(addIen).slice(0, 50)}`),
      { errorClass: 'permanent' }
    );
  }

  // Step 2: TIU SET DOCUMENT TEXT (if text provided)
  if (text) {
    await safeCallRpc('TIU SET DOCUMENT TEXT', [addIen, text, '1']);
  }

  log.info(`TIU CREATE_ADDENDUM completed: addendumIen=${addIen} parentIen=${parentIen}`);

  return {
    vistaRefs: { addendumIen: addIen, parentIen },
    resultSummary: `Addendum created: IEN ${addIen} on parent ${parentIen}`,
  };
}
