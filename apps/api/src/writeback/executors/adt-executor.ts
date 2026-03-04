/**
 * ADT Writeback Executor — Phase 305 (W12-P7)
 *
 * Domain executor for ADT (Admit/Discharge/Transfer) writeback commands.
 * Implements the RpcExecutor interface from the command bus.
 *
 * Supported intents:
 *   ADMIT_PATIENT     → integration-pending (DGPM ADMIT not in sandbox RPCs)
 *   TRANSFER_PATIENT  → integration-pending (DGPM TRANSFER not in sandbox RPCs)
 *   DISCHARGE_PATIENT → integration-pending (DGPM DISCHARGE not in sandbox RPCs)
 *
 * All 3 intents are integration-pending because the WorldVistA Docker sandbox
 * does not expose DGPM write RPCs. The executor provides:
 *   - Structured dry-run transcripts with VistA grounding metadata
 *   - Clear integration-pending error messages with target routines/files
 *   - No silent no-ops; every call either returns data or throws
 *
 * Target VistA integration:
 *   - File 405 (Patient Movement) via DGPM routines
 *   - File 2 (Patient) admission/discharge dates
 *   - File 42 (Ward Location) for bed assignments
 */

import type { ClinicalCommand, RpcExecutor, DryRunTranscript } from '../types.js';

/* ------------------------------------------------------------------ */
/* Intent → target RPC/routine mapping (integration-pending)           */
/* ------------------------------------------------------------------ */

const INTENT_TARGET_MAP: Record<
  string,
  {
    targetRpcs: string[];
    targetRoutines: string[];
    vistaFiles: string[];
    migrationPath: string;
  }
> = {
  ADMIT_PATIENT: {
    targetRpcs: ['DGPM ADMIT (custom)'],
    targetRoutines: ['DGPM', 'DGPMV'],
    vistaFiles: ['File 405 (Patient Movement)', 'File 2 (Patient)', 'File 42 (Ward Location)'],
    migrationPath: 'Create ZVEADT ADMIT wrapper → register RPC → test with File 405 writes',
  },
  TRANSFER_PATIENT: {
    targetRpcs: ['DGPM TRANSFER (custom)'],
    targetRoutines: ['DGPM', 'DGPMV'],
    vistaFiles: ['File 405 (Patient Movement)', 'File 42 (Ward Location)'],
    migrationPath: 'Create ZVEADT TRANSFER wrapper → register RPC → test with File 405 writes',
  },
  DISCHARGE_PATIENT: {
    targetRpcs: ['DGPM DISCHARGE (custom)'],
    targetRoutines: ['DGPM', 'DGPMV'],
    vistaFiles: ['File 405 (Patient Movement)', 'File 2 (Patient)'],
    migrationPath: 'Create ZVEADT DISCHARGE wrapper → register RPC → test with File 405 writes',
  },
};

/* ------------------------------------------------------------------ */
/* Executor                                                            */
/* ------------------------------------------------------------------ */

export const adtExecutor: RpcExecutor = {
  async execute(command: ClinicalCommand): Promise<{
    vistaRefs: Record<string, string>;
    resultSummary: string;
  }> {
    const intent = command.intent;
    const target = INTENT_TARGET_MAP[intent];
    if (!target) {
      throw Object.assign(new Error(`Unknown ADT intent: ${intent}`), {
        errorClass: 'permanent',
      });
    }

    // All ADT intents are integration-pending
    throw Object.assign(
      new Error(
        `${intent} is integration-pending: DGPM write RPCs not available in WorldVistA sandbox. ` +
          `Target routines: ${target.targetRoutines.join(', ')}. ` +
          `VistA files: ${target.vistaFiles.join(', ')}. ` +
          `Migration: ${target.migrationPath}`
      ),
      {
        errorClass: 'permanent',
        integrationPending: true,
        vistaGrounding: target,
      }
    );
  },

  dryRun(command: ClinicalCommand): DryRunTranscript {
    const target = INTENT_TARGET_MAP[command.intent];
    const targetRpcs = target?.targetRpcs || ['UNKNOWN'];

    return {
      rpcName: targetRpcs[0],
      params: {
        intent: command.intent,
        domain: command.domain,
        targetRpcs,
        targetRoutines: target?.targetRoutines || [],
        vistaFiles: target?.vistaFiles || [],
        payloadKeys: Object.keys(command.payloadJson),
        integrationNote: 'integration-pending: DGPM write RPCs not in sandbox',
      },
      simulatedResult:
        `[integration-pending] Would call ${targetRpcs.join(', ')} via DGPM routines. ` +
        `Migration: ${target?.migrationPath || 'unknown'}`,
      recordedAt: new Date().toISOString(),
    };
  },
};
