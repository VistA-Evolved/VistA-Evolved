/**
 * Phase 405 (W23-P7): Consent + Purpose of Use -- Store
 */

import { randomBytes } from 'crypto';
import type {
  ConsentDirective,
  DisclosureLog,
  ConsentDashboardStats,
  PurposeOfUse,
  ConsentDecision,
} from './types.js';

const MAX_DIRECTIVES = 50_000;
const MAX_DISCLOSURES = 100_000;

const directiveStore = new Map<string, ConsentDirective>();
const disclosureStore = new Map<string, DisclosureLog>();

function enforceMax<T>(store: Map<string, T>, max: number): void {
  if (store.size >= max) {
    const k = store.keys().next().value;
    if (k) store.delete(k);
  }
}

function genId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString('hex')}`;
}

// --- Consent Directive CRUD --------------------------------

export function createDirective(
  input: Omit<ConsentDirective, 'id' | 'createdAt' | 'updatedAt'>
): ConsentDirective {
  enforceMax(directiveStore, MAX_DIRECTIVES);
  const now = new Date().toISOString();
  const rec: ConsentDirective = { ...input, id: genId('cns'), createdAt: now, updatedAt: now };
  directiveStore.set(rec.id, rec);
  return rec;
}

export function getDirective(id: string): ConsentDirective | undefined {
  return directiveStore.get(id);
}

export function listDirectives(
  tenantId: string,
  opts?: { patientDfn?: string; status?: string; scope?: string }
): ConsentDirective[] {
  let results = Array.from(directiveStore.values()).filter((d) => d.tenantId === tenantId);
  if (opts?.patientDfn) results = results.filter((d) => d.patientDfn === opts.patientDfn);
  if (opts?.status) results = results.filter((d) => d.status === opts.status);
  if (opts?.scope) results = results.filter((d) => d.scope === opts.scope);
  return results.sort((a, b) => b.dateTime.localeCompare(a.dateTime));
}

export function updateDirective(
  id: string,
  patch: Partial<ConsentDirective>
): ConsentDirective | undefined {
  const rec = directiveStore.get(id);
  if (!rec) return undefined;
  const updated = {
    ...rec,
    ...patch,
    id: rec.id,
    createdAt: rec.createdAt,
    updatedAt: new Date().toISOString(),
  };
  directiveStore.set(id, updated);
  return updated;
}

export function revokeDirective(id: string, revokedBy: string): ConsentDirective | undefined {
  const rec = directiveStore.get(id);
  if (!rec || rec.status === 'revoked') return undefined;
  rec.status = 'revoked';
  rec.updatedAt = new Date().toISOString();
  rec.metadata = { ...rec.metadata, revokedBy, revokedAt: rec.updatedAt };
  directiveStore.set(id, rec);
  return rec;
}

// --- Purpose of Use Enforcement ----------------------------

export function evaluateConsent(
  tenantId: string,
  patientDfn: string,
  purposeOfUse: PurposeOfUse,
  actorDuz: string
): { decision: ConsentDecision; matchedDirectiveId?: string; reason: string } {
  const actives = listDirectives(tenantId, { patientDfn, status: 'active' });

  // Emergency treatment always permits (safety valve)
  if (purposeOfUse === 'ETREAT') {
    return { decision: 'permit', reason: 'Emergency treatment override' };
  }

  for (const d of actives) {
    for (const p of d.provisions) {
      if (p.purposes && p.purposes.includes(purposeOfUse)) {
        return {
          decision: p.type,
          matchedDirectiveId: d.id,
          reason: `Matched provision in directive ${d.id}`,
        };
      }
    }
  }

  // Default: permit if no explicit deny exists
  return { decision: 'permit', reason: 'No applicable consent restriction found' };
}

// --- Disclosure Logging ------------------------------------

export function logDisclosure(input: Omit<DisclosureLog, 'id' | 'createdAt'>): DisclosureLog {
  enforceMax(disclosureStore, MAX_DISCLOSURES);
  const rec: DisclosureLog = { ...input, id: genId('dsc'), createdAt: new Date().toISOString() };
  disclosureStore.set(rec.id, rec);
  return rec;
}

export function listDisclosures(
  tenantId: string,
  opts?: { patientDfn?: string; purposeOfUse?: string; limit?: number }
): DisclosureLog[] {
  let results = Array.from(disclosureStore.values()).filter((d) => d.tenantId === tenantId);
  if (opts?.patientDfn) results = results.filter((d) => d.patientDfn === opts.patientDfn);
  if (opts?.purposeOfUse) results = results.filter((d) => d.purposeOfUse === opts.purposeOfUse);
  return results
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, opts?.limit || 200);
}

// --- Dashboard ---------------------------------------------

export function getConsentDashboardStats(tenantId: string): ConsentDashboardStats {
  const dirs = Array.from(directiveStore.values()).filter((d) => d.tenantId === tenantId);
  const discs = Array.from(disclosureStore.values()).filter((d) => d.tenantId === tenantId);
  const byPurpose: Record<string, number> = {};
  for (const d of discs) {
    byPurpose[d.purposeOfUse] = (byPurpose[d.purposeOfUse] || 0) + 1;
  }
  return {
    totalDirectives: dirs.length,
    activeDirectives: dirs.filter((d) => d.status === 'active').length,
    revokedDirectives: dirs.filter((d) => d.status === 'revoked').length,
    totalDisclosureLogs: discs.length,
    disclosuresByPurpose: byPurpose,
  };
}
