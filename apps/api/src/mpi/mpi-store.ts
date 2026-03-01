/**
 * Phase 401 (W23-P3): MPI / Client Registry — Store
 */

import { randomBytes } from "crypto";
import type { MpiPatientIdentity, MatchResult, MergeEvent, MpiDashboardStats, MergeAction } from "./types.js";

const MAX_IDENTITIES = 50_000;
const MAX_MERGES = 20_000;

const identityStore = new Map<string, MpiPatientIdentity>();
const mergeStore = new Map<string, MergeEvent>();

function enforceMax<T>(store: Map<string, T>, max: number): void {
  if (store.size >= max) {
    const k = store.keys().next().value;
    if (k) store.delete(k);
  }
}

function genId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString("hex")}`;
}

// ─── Identity CRUD ─────────────────────────────────────────

export function createIdentity(input: Omit<MpiPatientIdentity, "id" | "createdAt" | "updatedAt">): MpiPatientIdentity {
  enforceMax(identityStore, MAX_IDENTITIES);
  const now = new Date().toISOString();
  const rec: MpiPatientIdentity = { ...input, id: genId("mpi"), createdAt: now, updatedAt: now };
  identityStore.set(rec.id, rec);
  return rec;
}

export function getIdentity(id: string): MpiPatientIdentity | undefined {
  return identityStore.get(id);
}

export function listIdentities(tenantId: string, opts?: { goldenRecordId?: string }): MpiPatientIdentity[] {
  let results = Array.from(identityStore.values()).filter((i) => i.tenantId === tenantId);
  if (opts?.goldenRecordId) results = results.filter((i) => i.goldenRecordId === opts.goldenRecordId);
  return results;
}

export function updateIdentity(id: string, patch: Partial<MpiPatientIdentity>): MpiPatientIdentity | undefined {
  const rec = identityStore.get(id);
  if (!rec) return undefined;
  const updated = { ...rec, ...patch, id: rec.id, createdAt: rec.createdAt, updatedAt: new Date().toISOString() };
  identityStore.set(id, updated);
  return updated;
}

// ─── Deterministic Matching ────────────────────────────────

export function findMatches(tenantId: string, query: { familyName: string; givenName: string; dateOfBirth: string; identifiers?: Array<{ system: string; value: string }> }): MatchResult[] {
  const candidates = Array.from(identityStore.values()).filter((i) => i.tenantId === tenantId);
  const results: MatchResult[] = [];

  for (const c of candidates) {
    const matchedFields: string[] = [];
    let score = 0;

    // Exact identifier match
    if (query.identifiers) {
      for (const qi of query.identifiers) {
        if (c.identifiers.some((ci) => ci.system === qi.system && ci.value === qi.value)) {
          matchedFields.push(`identifier:${qi.system}`);
          score += 50;
        }
      }
    }

    // Demographics matching
    if (c.familyName.toLowerCase() === query.familyName.toLowerCase()) { matchedFields.push("familyName"); score += 15; }
    if (c.givenName.toLowerCase() === query.givenName.toLowerCase()) { matchedFields.push("givenName"); score += 10; }
    if (c.dateOfBirth === query.dateOfBirth) { matchedFields.push("dateOfBirth"); score += 25; }

    if (score >= 50) {
      results.push({
        candidateId: c.id,
        confidence: score >= 90 ? "exact" : score >= 65 ? "high" : score >= 50 ? "medium" : "low",
        method: "deterministic",
        score,
        matchedFields,
      });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

// ─── Merge / Link Operations ───────────────────────────────

export function mergeIdentities(
  tenantId: string,
  survivorId: string,
  retiredId: string,
  action: MergeAction,
  reason: string,
  actorDuz: string,
): MergeEvent | { error: string } {
  const survivor = identityStore.get(survivorId);
  const retired = identityStore.get(retiredId);
  if (!survivor || survivor.tenantId !== tenantId) return { error: "Survivor not found" };
  if (!retired || retired.tenantId !== tenantId) return { error: "Retired record not found" };

  enforceMax(mergeStore, MAX_MERGES);

  if (action === "merge" || action === "link") {
    // Absorb identifiers from retired into survivor
    const mergedIds = [...survivor.identifiers];
    for (const ri of retired.identifiers) {
      if (!mergedIds.some((m) => m.system === ri.system && m.value === ri.value)) {
        mergedIds.push(ri);
      }
    }
    updateIdentity(survivorId, { identifiers: mergedIds, goldenRecordId: survivor.goldenRecordId || survivorId });
    updateIdentity(retiredId, { goldenRecordId: survivorId });
  }

  const evt: MergeEvent = {
    id: genId("mrg"),
    tenantId,
    action,
    survivorId,
    retiredId,
    reason,
    actorDuz,
    createdAt: new Date().toISOString(),
  };
  mergeStore.set(evt.id, evt);
  return evt;
}

export function listMergeEvents(tenantId: string, limit = 100): MergeEvent[] {
  return Array.from(mergeStore.values())
    .filter((e) => e.tenantId === tenantId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, limit);
}

// ─── Dashboard Stats ───────────────────────────────────────

export function getMpiDashboardStats(tenantId: string): MpiDashboardStats {
  const ids = Array.from(identityStore.values()).filter((i) => i.tenantId === tenantId);
  const golden = new Set(ids.filter((i) => i.goldenRecordId).map((i) => i.goldenRecordId));
  const merges = Array.from(mergeStore.values()).filter((e) => e.tenantId === tenantId);
  return {
    totalIdentities: ids.length,
    goldenRecords: golden.size,
    pendingSuggestions: 0,
    totalMerges: merges.length,
  };
}
