/**
 * Phase 479 -- RPC Contract Trace Recorder
 *
 * Extends the Phase 96B ring buffer with:
 *   1. JSONL file recording (data/rpc-traces/)
 *   2. Workflow-scoped trace sessions
 *   3. Golden trace comparison for contract testing
 *
 * Design:
 *   - A "session" groups RPC calls belonging to one logical workflow
 *     (e.g. patient-search, note-create-sign, order-place)
 *   - Sessions can be exported as JSONL for golden baseline snapshots
 *   - The compare function checks: same RPCs called, same order, same
 *     success/failure pattern (timing is NOT compared)
 *
 * No PHI: params are sanitized, DUZ is hashed, DFN is redacted.
 */

import { randomUUID } from 'node:crypto';
import { writeFileSync, readFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/* -- Types -------------------------------------------------- */

export interface ContractTraceEntry {
  /** Unique entry ID */
  id: string;
  /** RPC name */
  rpcName: string;
  /** Sequence number within the session (0-based) */
  seq: number;
  /** Whether the call succeeded */
  success: boolean;
  /** Error message (truncated, no PHI) */
  error?: string;
  /** Number of response lines */
  responseLines: number;
  /** Duration in ms */
  durationMs: number;
  /** ISO timestamp */
  timestamp: string;
}

export interface TraceSession {
  /** Session ID */
  id: string;
  /** Workflow name (e.g. "patient-search") */
  workflow: string;
  /** Human description */
  description: string;
  /** When the session started */
  startedAt: string;
  /** When the session ended (null if still recording) */
  endedAt: string | null;
  /** Ordered list of RPC calls */
  entries: ContractTraceEntry[];
  /** VistA instance ID */
  instanceId: string;
  /** Contract version for schema evolution */
  contractVersion: string;
}

export interface CompareResult {
  /** Whether the traces match the golden baseline */
  passed: boolean;
  /** Workflow name */
  workflow: string;
  /** Detailed differences */
  diffs: CompareDiff[];
  /** Summary */
  summary: {
    goldenRpcCount: number;
    actualRpcCount: number;
    matchedRpcs: number;
    mismatchedRpcs: number;
    extraRpcs: number;
    missingRpcs: number;
  };
}

export interface CompareDiff {
  type: 'missing' | 'extra' | 'order' | 'success_mismatch';
  seq: number;
  rpcName: string;
  detail: string;
}

/* -- Constants ---------------------------------------------- */

const CONTRACT_VERSION = '1.0.0';

/**
 * Pre-defined workflow templates. Each lists the expected RPC call
 * sequence. Used as documentation and for generating golden traces.
 */
export const WORKFLOW_TEMPLATES: Record<string, { description: string; expectedRpcs: string[] }> = {
  'patient-search': {
    description: 'Search for a patient and load demographics',
    expectedRpcs: ['ORWPT LIST ALL', 'ORWPT SELECT'],
  },
  'note-create-sign': {
    description: 'Create a TIU note, set text, and sign',
    expectedRpcs: [
      'TIU PERSONAL TITLE LIST',
      'TIU CREATE RECORD',
      'TIU SET DOCUMENT TEXT',
      'TIU LOCK RECORD',
      'TIU SIGN RECORD',
      'TIU UNLOCK RECORD',
    ],
  },
  'order-place': {
    description: 'Lock patient, place a quick order, unlock',
    expectedRpcs: ['ORWDX LOCK', 'ORWDXM AUTOACK', 'ORWDX UNLOCK'],
  },
};

/* -- Session Store ------------------------------------------ */

const activeSessions = new Map<string, TraceSession>();
const completedSessions: TraceSession[] = [];
const MAX_COMPLETED = 100;

/**
 * Start a new trace recording session.
 */
export function startTraceSession(
  workflow: string,
  description?: string,
  instanceId?: string
): TraceSession {
  const session: TraceSession = {
    id: randomUUID(),
    workflow,
    description: description || WORKFLOW_TEMPLATES[workflow]?.description || workflow,
    startedAt: new Date().toISOString(),
    endedAt: null,
    entries: [],
    instanceId: instanceId || 'unknown',
    contractVersion: CONTRACT_VERSION,
  };
  activeSessions.set(session.id, session);
  return session;
}

/**
 * Record an RPC call into an active session.
 */
export function recordTraceEntry(
  sessionId: string,
  entry: Omit<ContractTraceEntry, 'id' | 'seq' | 'timestamp'>
): ContractTraceEntry | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  const fullEntry: ContractTraceEntry = {
    id: randomUUID(),
    seq: session.entries.length,
    timestamp: new Date().toISOString(),
    ...entry,
  };
  session.entries.push(fullEntry);
  return fullEntry;
}

/**
 * End a recording session and optionally write to disk.
 */
export function endTraceSession(
  sessionId: string,
  opts?: { writeToDisk?: boolean; outputDir?: string }
): TraceSession | null {
  const session = activeSessions.get(sessionId);
  if (!session) return null;

  session.endedAt = new Date().toISOString();
  activeSessions.delete(sessionId);

  // Keep in completed ring
  completedSessions.push(session);
  if (completedSessions.length > MAX_COMPLETED) {
    completedSessions.shift();
  }

  // Optionally write JSONL
  if (opts?.writeToDisk) {
    writeSessionToFile(session, opts.outputDir);
  }

  return session;
}

/**
 * Get an active session by ID.
 */
export function getTraceSession(sessionId: string): TraceSession | null {
  return activeSessions.get(sessionId) || null;
}

/**
 * Get all active session IDs.
 */
export function getActiveSessions(): { id: string; workflow: string; entryCount: number }[] {
  return [...activeSessions.values()].map((s) => ({
    id: s.id,
    workflow: s.workflow,
    entryCount: s.entries.length,
  }));
}

/**
 * Get completed sessions (newest first).
 */
export function getCompletedSessions(limit = 20): TraceSession[] {
  return [...completedSessions].reverse().slice(0, limit);
}

/* -- File I/O ----------------------------------------------- */

const DEFAULT_TRACE_DIR = join(process.cwd(), 'data', 'rpc-traces');

const GOLDEN_DIR = join(DEFAULT_TRACE_DIR, 'golden');

/**
 * Write a session to a JSONL file.
 */
function writeSessionToFile(session: TraceSession, outputDir?: string): string {
  const dir = outputDir || DEFAULT_TRACE_DIR;
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  const ts = session.startedAt.replace(/[:.]/g, '-').replace('Z', '');
  const filename = `${session.workflow}_${ts}.jsonl`;
  const filepath = join(dir, filename);

  const lines = session.entries.map((e) => JSON.stringify(e));
  // Prepend session metadata as first line
  const meta = JSON.stringify({
    _type: 'session_meta',
    id: session.id,
    workflow: session.workflow,
    description: session.description,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    instanceId: session.instanceId,
    contractVersion: session.contractVersion,
    entryCount: session.entries.length,
  });
  writeFileSync(filepath, [meta, ...lines].join('\n') + '\n', 'utf-8');
  return filepath;
}

/**
 * Export a session as a golden baseline.
 */
export function saveAsGolden(session: TraceSession): string {
  if (!existsSync(GOLDEN_DIR)) mkdirSync(GOLDEN_DIR, { recursive: true });
  return writeSessionToFile(session, GOLDEN_DIR);
}

/**
 * Load a golden trace file.
 */
export function loadGoldenTrace(workflow: string): TraceSession | null {
  if (!existsSync(GOLDEN_DIR)) return null;

  // Find the latest golden file for this workflow
  const files = readdirSync(GOLDEN_DIR)
    .filter((f) => f.startsWith(workflow + '_') && f.endsWith('.jsonl'))
    .sort()
    .reverse();

  if (files.length === 0) return null;

  const filepath = join(GOLDEN_DIR, files[0]);
  const lines = readFileSync(filepath, 'utf-8').trim().split('\n');
  if (lines.length === 0) return null;

  const meta = JSON.parse(lines[0]);
  const entries: ContractTraceEntry[] = lines.slice(1).map((l) => JSON.parse(l));

  return {
    id: meta.id,
    workflow: meta.workflow,
    description: meta.description,
    startedAt: meta.startedAt,
    endedAt: meta.endedAt,
    entries,
    instanceId: meta.instanceId,
    contractVersion: meta.contractVersion,
  };
}

/**
 * List available golden traces.
 */
export function listGoldenTraces(): { workflow: string; file: string; entryCount: number }[] {
  if (!existsSync(GOLDEN_DIR)) return [];

  return readdirSync(GOLDEN_DIR)
    .filter((f) => f.endsWith('.jsonl'))
    .map((f) => {
      try {
        const firstLine = readFileSync(join(GOLDEN_DIR, f), 'utf-8').split('\n')[0];
        const meta = JSON.parse(firstLine);
        return {
          workflow: meta.workflow,
          file: f,
          entryCount: meta.entryCount,
        };
      } catch {
        return { workflow: f.split('_')[0], file: f, entryCount: -1 };
      }
    });
}

/* -- Contract Comparison ------------------------------------ */

/**
 * Compare an actual trace session against a golden baseline.
 *
 * Checks:
 *   1. Same RPCs called (by name)
 *   2. Same order
 *   3. Same success/failure pattern
 *
 * Does NOT check:
 *   - Timing (durationMs varies)
 *   - Response line counts (data varies)
 *   - Exact timestamps
 */
export function compareTraces(actual: TraceSession, golden: TraceSession): CompareResult {
  const diffs: CompareDiff[] = [];
  const goldenRpcs = golden.entries.map((e) => e.rpcName);
  const actualRpcs = actual.entries.map((e) => e.rpcName);

  let matchedRpcs = 0;
  let mismatchedRpcs = 0;

  // Walk through golden entries and check actual
  const maxLen = Math.max(goldenRpcs.length, actualRpcs.length);
  for (let i = 0; i < maxLen; i++) {
    const g = goldenRpcs[i];
    const a = actualRpcs[i];

    if (!g && a) {
      // Extra RPC in actual
      diffs.push({
        type: 'extra',
        seq: i,
        rpcName: a,
        detail: `Extra RPC at position ${i}: ${a}`,
      });
    } else if (g && !a) {
      // Missing RPC in actual
      diffs.push({
        type: 'missing',
        seq: i,
        rpcName: g,
        detail: `Missing RPC at position ${i}: ${g} (expected from golden)`,
      });
    } else if (g !== a) {
      // Wrong RPC at this position
      diffs.push({
        type: 'order',
        seq: i,
        rpcName: a!,
        detail: `Position ${i}: expected ${g}, got ${a}`,
      });
      mismatchedRpcs++;
    } else {
      // Same RPC -- check success/failure
      const gEntry = golden.entries[i];
      const aEntry = actual.entries[i];
      if (gEntry.success !== aEntry.success) {
        diffs.push({
          type: 'success_mismatch',
          seq: i,
          rpcName: a!,
          detail: `${a}: golden=${gEntry.success}, actual=${aEntry.success}`,
        });
        mismatchedRpcs++;
      } else {
        matchedRpcs++;
      }
    }
  }

  const extraRpcs =
    actualRpcs.length > goldenRpcs.length ? actualRpcs.length - goldenRpcs.length : 0;
  const missingRpcs =
    goldenRpcs.length > actualRpcs.length ? goldenRpcs.length - actualRpcs.length : 0;

  return {
    passed: diffs.length === 0,
    workflow: actual.workflow,
    diffs,
    summary: {
      goldenRpcCount: goldenRpcs.length,
      actualRpcCount: actualRpcs.length,
      matchedRpcs,
      mismatchedRpcs,
      extraRpcs,
      missingRpcs,
    },
  };
}

/**
 * Compare an actual session against the stored golden baseline.
 */
export function compareToGolden(actual: TraceSession): CompareResult | null {
  const golden = loadGoldenTrace(actual.workflow);
  if (!golden) return null;
  return compareTraces(actual, golden);
}
