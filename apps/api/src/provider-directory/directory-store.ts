/**
 * Phase 402 (W23-P4): Provider Directory — Store
 */

import { randomBytes } from 'crypto';
import type {
  DirectoryPractitioner,
  DirectoryOrganization,
  DirectoryLocation,
  ProviderDirectoryDashboardStats,
} from './types.js';

const MAX_PRACTITIONERS = 50_000;
const MAX_ORGANIZATIONS = 10_000;
const MAX_LOCATIONS = 20_000;

const practitionerStore = new Map<string, DirectoryPractitioner>();
const organizationStore = new Map<string, DirectoryOrganization>();
const locationStore = new Map<string, DirectoryLocation>();

function enforceMax<T>(store: Map<string, T>, max: number): void {
  if (store.size >= max) {
    const k = store.keys().next().value;
    if (k) store.delete(k);
  }
}

function genId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString('hex')}`;
}

// ─── Practitioner CRUD ─────────────────────────────────────

export function createPractitioner(
  input: Omit<DirectoryPractitioner, 'id' | 'createdAt' | 'updatedAt'>
): DirectoryPractitioner {
  enforceMax(practitionerStore, MAX_PRACTITIONERS);
  const now = new Date().toISOString();
  const rec: DirectoryPractitioner = {
    ...input,
    id: genId('prac'),
    createdAt: now,
    updatedAt: now,
  };
  practitionerStore.set(rec.id, rec);
  return rec;
}

export function getPractitioner(id: string): DirectoryPractitioner | undefined {
  return practitionerStore.get(id);
}

export function listPractitioners(
  tenantId: string,
  opts?: { specialty?: string; status?: string; organizationId?: string }
): DirectoryPractitioner[] {
  let results = Array.from(practitionerStore.values()).filter((p) => p.tenantId === tenantId);
  if (opts?.specialty) results = results.filter((p) => p.specialty === opts.specialty);
  if (opts?.status) results = results.filter((p) => p.status === opts.status);
  if (opts?.organizationId)
    results = results.filter((p) => p.organizationIds.includes(opts.organizationId!));
  return results;
}

export function updatePractitioner(
  id: string,
  patch: Partial<DirectoryPractitioner>
): DirectoryPractitioner | undefined {
  const rec = practitionerStore.get(id);
  if (!rec) return undefined;
  const updated = {
    ...rec,
    ...patch,
    id: rec.id,
    createdAt: rec.createdAt,
    updatedAt: new Date().toISOString(),
  };
  practitionerStore.set(id, updated);
  return updated;
}

export function searchPractitioners(tenantId: string, query: string): DirectoryPractitioner[] {
  const q = query.toLowerCase();
  return Array.from(practitionerStore.values()).filter(
    (p) =>
      p.tenantId === tenantId &&
      (p.familyName.toLowerCase().includes(q) ||
        p.givenName.toLowerCase().includes(q) ||
        (p.npi && p.npi.includes(q)) ||
        (p.specialty && p.specialty.toLowerCase().includes(q)))
  );
}

// ─── Organization CRUD ─────────────────────────────────────

export function createOrganization(
  input: Omit<DirectoryOrganization, 'id' | 'createdAt' | 'updatedAt'>
): DirectoryOrganization {
  enforceMax(organizationStore, MAX_ORGANIZATIONS);
  const now = new Date().toISOString();
  const rec: DirectoryOrganization = { ...input, id: genId('org'), createdAt: now, updatedAt: now };
  organizationStore.set(rec.id, rec);
  return rec;
}

export function getOrganization(id: string): DirectoryOrganization | undefined {
  return organizationStore.get(id);
}

export function listOrganizations(
  tenantId: string,
  opts?: { type?: string; active?: boolean }
): DirectoryOrganization[] {
  let results = Array.from(organizationStore.values()).filter((o) => o.tenantId === tenantId);
  if (opts?.type) results = results.filter((o) => o.type === opts.type);
  if (opts?.active !== undefined) results = results.filter((o) => o.active === opts.active);
  return results;
}

export function updateOrganization(
  id: string,
  patch: Partial<DirectoryOrganization>
): DirectoryOrganization | undefined {
  const rec = organizationStore.get(id);
  if (!rec) return undefined;
  const updated = {
    ...rec,
    ...patch,
    id: rec.id,
    createdAt: rec.createdAt,
    updatedAt: new Date().toISOString(),
  };
  organizationStore.set(id, updated);
  return updated;
}

// ─── Location CRUD ─────────────────────────────────────────

export function createLocation(
  input: Omit<DirectoryLocation, 'id' | 'createdAt' | 'updatedAt'>
): DirectoryLocation {
  enforceMax(locationStore, MAX_LOCATIONS);
  const now = new Date().toISOString();
  const rec: DirectoryLocation = { ...input, id: genId('loc'), createdAt: now, updatedAt: now };
  locationStore.set(rec.id, rec);
  return rec;
}

export function getLocation(id: string): DirectoryLocation | undefined {
  return locationStore.get(id);
}

export function listLocations(
  tenantId: string,
  opts?: { organizationId?: string; status?: string }
): DirectoryLocation[] {
  let results = Array.from(locationStore.values()).filter((l) => l.tenantId === tenantId);
  if (opts?.organizationId)
    results = results.filter((l) => l.organizationId === opts.organizationId);
  if (opts?.status) results = results.filter((l) => l.status === opts.status);
  return results;
}

export function updateLocation(
  id: string,
  patch: Partial<DirectoryLocation>
): DirectoryLocation | undefined {
  const rec = locationStore.get(id);
  if (!rec) return undefined;
  const updated = {
    ...rec,
    ...patch,
    id: rec.id,
    createdAt: rec.createdAt,
    updatedAt: new Date().toISOString(),
  };
  locationStore.set(id, updated);
  return updated;
}

// ─── Dashboard ─────────────────────────────────────────────

export function getDirectoryDashboardStats(tenantId: string): ProviderDirectoryDashboardStats {
  const pracs = Array.from(practitionerStore.values()).filter((p) => p.tenantId === tenantId);
  const orgs = Array.from(organizationStore.values()).filter((o) => o.tenantId === tenantId);
  const locs = Array.from(locationStore.values()).filter((l) => l.tenantId === tenantId);
  return {
    totalPractitioners: pracs.length,
    activePractitioners: pracs.filter((p) => p.status === 'active').length,
    totalOrganizations: orgs.length,
    activeOrganizations: orgs.filter((o) => o.active).length,
    totalLocations: locs.length,
    activeLocations: locs.filter((l) => l.status === 'active').length,
  };
}
