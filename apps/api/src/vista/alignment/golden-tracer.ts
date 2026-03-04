/**
 * golden-tracer.ts -- Capture and compare golden RPC trace snapshots (Phase 161)
 *
 * Golden traces record the expected behavior of every registered RPC at a
 * point in time. Compare current behavior against a baseline to detect
 * regressions or improvements.
 *
 * In-memory store -- snapshots reset on API restart. Future: persist to PG.
 */

import { randomUUID } from 'node:crypto';
import type { GoldenTraceEntry, GoldenSnapshot, SnapshotComparison } from './types.js';
import { RPC_REGISTRY, RPC_EXCEPTIONS } from '../rpcRegistry.js';

/* ------------------------------------------------------------------ */
/*  In-memory snapshot store                                           */
/* ------------------------------------------------------------------ */
const snapshotStore = new Map<string, GoldenSnapshot>();

/* ------------------------------------------------------------------ */
/*  Capture a new golden snapshot                                      */
/* ------------------------------------------------------------------ */

/**
 * Build a GoldenSnapshot from the current RPC registry state.
 * In sandbox mode this does NOT actually call RPCs (that requires an
 * active VistA connection). Instead it records the registry shape and
 * marks each entry as "not-probed".
 */
export function captureGoldenSnapshot(
  name: string,
  description: string,
  capturedBy: string,
  tenantId = 'default'
): GoldenSnapshot {
  const now = new Date().toISOString();
  const traces: GoldenTraceEntry[] = RPC_REGISTRY.map((rpc) => ({
    rpcName: rpc.name,
    domain: rpc.domain,
    tag: rpc.tag,
    expectedShape: 'registry-only',
    capturedAt: now,
    success: true, // registered = baseline success
    responseBytes: 0,
    elapsedMs: 0,
  }));

  const snapshot: GoldenSnapshot = {
    id: randomUUID(),
    tenantId,
    name,
    description,
    capturedAt: now,
    capturedBy,
    traces,
    registrySize: RPC_REGISTRY.length,
    exceptionCount: RPC_EXCEPTIONS.length,
    passRate: 100, // baseline is 100% by definition
  };

  snapshotStore.set(snapshot.id, snapshot);
  return snapshot;
}

/* ------------------------------------------------------------------ */
/*  Compare two snapshots                                              */
/* ------------------------------------------------------------------ */

export function compareSnapshots(baselineId: string, currentId: string): SnapshotComparison | null {
  const baseline = snapshotStore.get(baselineId);
  const current = snapshotStore.get(currentId);
  if (!baseline || !current) return null;

  const baseRpcs = new Set(baseline.traces.map((t) => t.rpcName));
  const currRpcs = new Set(current.traces.map((t) => t.rpcName));

  const newRpcs = [...currRpcs].filter((r) => !baseRpcs.has(r));
  const removedRpcs = [...baseRpcs].filter((r) => !currRpcs.has(r));

  const baseMap = new Map(baseline.traces.map((t) => [t.rpcName, t]));
  const currMap = new Map(current.traces.map((t) => [t.rpcName, t]));

  const regressions: GoldenTraceEntry[] = [];
  const improvements: GoldenTraceEntry[] = [];

  for (const [name, baseTrace] of baseMap) {
    const currTrace = currMap.get(name);
    if (!currTrace) continue;
    if (baseTrace.success && !currTrace.success) {
      regressions.push(currTrace);
    } else if (!baseTrace.success && currTrace.success) {
      improvements.push(currTrace);
    }
  }

  const alignmentDelta =
    current.passRate - baseline.passRate + improvements.length - regressions.length;

  return {
    baselineId,
    currentId,
    regressions,
    improvements,
    newRpcs,
    removedRpcs,
    alignmentDelta,
  };
}

/* ------------------------------------------------------------------ */
/*  Store CRUD                                                         */
/* ------------------------------------------------------------------ */

export function getSnapshot(id: string): GoldenSnapshot | undefined {
  return snapshotStore.get(id);
}

export function listSnapshots(tenantId = 'default'): GoldenSnapshot[] {
  return [...snapshotStore.values()]
    .filter((s) => s.tenantId === tenantId)
    .sort((a, b) => b.capturedAt.localeCompare(a.capturedAt));
}

export function deleteSnapshot(id: string): boolean {
  return snapshotStore.delete(id);
}

export function getSnapshotCount(): number {
  return snapshotStore.size;
}
