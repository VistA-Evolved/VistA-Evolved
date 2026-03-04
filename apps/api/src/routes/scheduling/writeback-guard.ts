/**
 * Phase 170: Scheduling Writeback Guard
 *
 * Enforces truth gates on all scheduling write operations.
 * Ensures no appointment is reported as "scheduled" to the UI
 * unless VistA confirms it via truth gate verification.
 *
 * The guard wraps the approve/create flows and requires VistA
 * round-trip confirmation before status transitions to "scheduled".
 *
 * VistA RPCs used:
 *   - SDES GET APPT BY APPT IEN (primary truth gate)
 *   - SDOE LIST ENCOUNTERS FOR PAT (fallback verification)
 *   - SDES CREATE APPOINTMENTS (writeback when enabled)
 *   - SDES CANCEL APPOINTMENT 2 (writeback cancel)
 *
 * Modes:
 *   - request_only: All appointments go through staff approval queue.
 *     No VistA writeback. "approved" but never "scheduled" without VistA.
 *   - sdes_partial: SDES installed but writeback not verified safe.
 *     Truth gate runs after approve to confirm VistA-side booking.
 *   - vista_direct: Full SDES writeback. Truth gate mandatory.
 */

import { log } from '../../lib/logger.js';
import { immutableAudit } from '../../lib/immutable-audit.js';
import { getAdapter } from '../../adapters/adapter-loader.js';
import type {
  SchedulingAdapter,
  TruthGateResult,
  SchedulingMode,
} from '../../adapters/scheduling/interface.js';

// ── Types ───────────────────────────────────────────────────

export type WritebackStatus =
  | 'requested' // Patient submitted request
  | 'pending_approval' // In staff queue
  | 'approved' // Staff approved, VistA writeback pending
  | 'scheduled' // VistA confirmed (truth gate passed)
  | 'failed' // Writeback attempted but failed
  | 'cancelled' // Cancelled
  | 'integration_pending'; // Infrastructure not ready

export interface WritebackResult {
  ok: boolean;
  status: WritebackStatus;
  truthGate?: TruthGateResult;
  vistaIen?: string;
  rpcUsed?: string[];
  error?: string;
  nextSteps?: string[];
}

export interface WritebackPolicy {
  requireTruthGate: boolean;
  allowDirectWriteback: boolean;
  mode: SchedulingMode['mode'];
  detail: string;
}

// ── In-memory writeback tracking ────────────────────────────

export interface WritebackEntry {
  id: string;
  tenantId: string;
  appointmentRef: string;
  patientDfn: string;
  clinicIen?: string;
  status: WritebackStatus;
  truthGateResult?: TruthGateResult;
  vistaIen?: string;
  attempts: number;
  lastAttemptAt?: string;
  createdAt: string;
  updatedAt: string;
}

const writebackEntries = new Map<string, WritebackEntry>();
const WRITEBACK_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const WRITEBACK_MAX_SIZE = 1000;

// ── PG Write-Through (W41-P4) ──────────────────────────────

interface WritebackRepo {
  upsert(data: any): Promise<any>;
  findByTenant(tenantId: string, opts?: { limit?: number }): Promise<any[]>;
}

let _writebackRepo: WritebackRepo | null = null;

/**
 * Wire PG repo for scheduling writeback entries.
 * Called from lifecycle.ts during PG init.
 */
export function initWritebackGuardRepo(repo: WritebackRepo): void {
  _writebackRepo = repo;
  log.info('Scheduling writeback store wired to PG (W41-P4)');
}

/**
 * Rehydrate writeback entries from PG on startup.
 */
export async function rehydrateWritebackEntries(tenantId: string): Promise<void> {
  if (!_writebackRepo) return;
  try {
    const rows = await _writebackRepo.findByTenant(tenantId, { limit: WRITEBACK_MAX_SIZE });
    for (const row of rows) {
      if (!writebackEntries.has(row.id)) {
        writebackEntries.set(row.id, row as WritebackEntry);
      }
    }
    log.info('Scheduling writeback entries rehydrated from PG', { count: rows.length });
  } catch (e) {
    log.warn('Scheduling writeback rehydration failed', { error: String(e) });
  }
}

function persistWritebackEntry(entry: WritebackEntry): void {
  if (!_writebackRepo) return;
  void _writebackRepo
    .upsert({
      id: entry.id,
      tenantId: entry.tenantId,
      appointmentRef: entry.appointmentRef,
      patientDfn: entry.patientDfn,
      clinicIen: entry.clinicIen || null,
      status: entry.status,
      truthGateResult: entry.truthGateResult ? JSON.stringify(entry.truthGateResult) : null,
      vistaIen: entry.vistaIen || null,
      attempts: entry.attempts,
      lastAttemptAt: entry.lastAttemptAt || null,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
    })
    .catch((e: unknown) => log.warn('Scheduling writeback persist failed', { error: String(e) }));
}

export function getWritebackEntryCount(): number {
  return writebackEntries.size;
}

export function getWritebackEntries(): WritebackEntry[] {
  return Array.from(writebackEntries.values());
}

/** Evict completed/failed/cancelled entries older than TTL */
function evictStaleWritebackEntries(): void {
  const now = Date.now();
  const terminalStatuses: WritebackStatus[] = ['scheduled', 'failed', 'cancelled'];
  for (const [id, e] of writebackEntries) {
    const age = now - new Date(e.createdAt).getTime();
    if (age > WRITEBACK_TTL_MS && terminalStatuses.includes(e.status)) {
      writebackEntries.delete(id);
    }
  }
  if (writebackEntries.size > WRITEBACK_MAX_SIZE) {
    const oldest = [...writebackEntries.entries()].sort(
      (a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime()
    );
    while (writebackEntries.size > WRITEBACK_MAX_SIZE && oldest.length) {
      writebackEntries.delete(oldest.shift()![0]);
    }
  }
}

const _writebackCleanup = setInterval(evictStaleWritebackEntries, 60 * 60 * 1000);
_writebackCleanup.unref();

// ── Policy resolution ───────────────────────────────────────

let cachedMode: SchedulingMode | null = null;
let cachedModeAt = 0;
const MODE_CACHE_TTL = 60_000; // 1 min

async function resolveMode(): Promise<SchedulingMode> {
  const now = Date.now();
  if (cachedMode && now - cachedModeAt < MODE_CACHE_TTL) return cachedMode;

  try {
    const adapter = getAdapter('scheduling') as SchedulingAdapter;
    if (adapter && typeof adapter.getSchedulingMode === 'function') {
      const result = await adapter.getSchedulingMode();
      if (result && typeof result === 'object' && 'data' in result && (result as any).data) {
        cachedMode = (result as any).data;
      } else {
        cachedMode = result as unknown as SchedulingMode;
      }
      cachedModeAt = now;
      return cachedMode!;
    }
  } catch {
    // fallback
  }

  return {
    writebackEnabled: false,
    sdesInstalled: false,
    sdoeInstalled: false,
    sdwlInstalled: false,
    mode: 'request_only',
    detail: 'Mode resolution failed — defaulting to request_only',
  };
}

export async function getWritebackPolicy(): Promise<WritebackPolicy> {
  const mode = await resolveMode();
  return {
    requireTruthGate: true, // Always require truth gate
    allowDirectWriteback: mode.mode === 'vista_direct',
    mode: mode.mode,
    detail: mode.detail,
  };
}

// ── Truth gate enforcement ──────────────────────────────────

/**
 * Run truth gate verification for an appointment reference.
 * Returns the gate result. NEVER returns "scheduled" if gate fails.
 */
export async function enforceTruthGate(
  appointmentRef: string,
  patientDfn: string,
  tenantId: string,
  actorDuz: string
): Promise<WritebackResult> {
  const rpcUsed: string[] = [];

  try {
    const adapter = getAdapter('scheduling') as SchedulingAdapter;
    if (!adapter || typeof adapter.verifyAppointment !== 'function') {
      return {
        ok: false,
        status: 'integration_pending',
        error: 'Scheduling adapter not available',
        nextSteps: ['Configure ADAPTER_SCHEDULING=vista', 'Verify SDES RPCs installed'],
      };
    }

    const rawResult = await adapter.verifyAppointment(appointmentRef, patientDfn);
    const gateResult: TruthGateResult =
      rawResult && typeof rawResult === 'object' && 'data' in rawResult && (rawResult as any).data
        ? (rawResult as any).data
        : (rawResult as unknown as TruthGateResult);
    if (gateResult.rpcUsed) rpcUsed.push(gateResult.rpcUsed);

    // Update tracking entry
    const entry = writebackEntries.get(appointmentRef);
    if (entry) {
      entry.truthGateResult = gateResult;
      entry.attempts += 1;
      entry.lastAttemptAt = new Date().toISOString();
      entry.updatedAt = new Date().toISOString();
      if (gateResult.passed) {
        entry.status = 'scheduled';
        entry.vistaIen = gateResult.vistaIen;
      }
      persistWritebackEntry(entry);
    }

    immutableAudit(
      'scheduling.truth_gate',
      gateResult.passed ? 'success' : 'failure',
      { sub: actorDuz },
      { tenantId, detail: { appointmentRef, passed: gateResult.passed, rpcUsed } }
    );

    if (gateResult.passed) {
      return {
        ok: true,
        status: 'scheduled',
        truthGate: gateResult,
        vistaIen: gateResult.vistaIen,
        rpcUsed,
      };
    }

    return {
      ok: false,
      status: 'approved', // Stays approved, NOT scheduled
      truthGate: gateResult,
      rpcUsed,
      error: 'Truth gate did not confirm VistA booking',
      nextSteps: [
        'VistA appointment may not exist yet',
        'Retry verification after manual VistA booking',
        'Contact clinic staff for manual confirmation',
      ],
    };
  } catch (err: any) {
    log.warn('Truth gate enforcement error', { error: err.message, appointmentRef });
    return {
      ok: false,
      status: 'failed',
      error: 'Truth gate verification failed',
      rpcUsed,
    };
  }
}

// ── Writeback tracking ──────────────────────────────────────

export function trackWriteback(
  appointmentRef: string,
  patientDfn: string,
  tenantId: string,
  clinicIen?: string
): WritebackEntry {
  const now = new Date().toISOString();
  const entry: WritebackEntry = {
    id: appointmentRef,
    tenantId,
    appointmentRef,
    patientDfn,
    clinicIen,
    status: 'pending_approval',
    attempts: 0,
    createdAt: now,
    updatedAt: now,
  };
  writebackEntries.set(appointmentRef, entry);
  persistWritebackEntry(entry);
  return entry;
}

export function updateWritebackStatus(
  appointmentRef: string,
  status: WritebackStatus
): WritebackEntry | null {
  const entry = writebackEntries.get(appointmentRef);
  if (!entry) return null;
  entry.status = status;
  entry.updatedAt = new Date().toISOString();
  persistWritebackEntry(entry);
  return entry;
}
