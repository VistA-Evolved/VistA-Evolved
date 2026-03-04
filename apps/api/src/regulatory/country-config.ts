/**
 * Multi-Country Config Layer — Phase 441.
 *
 * Bridges tenant-config.ts and country-pack-loader.ts by providing
 * a persistent, audited tenant→country mapping layer. Previously,
 * tenant→country lived only in classification-engine.ts as an in-memory
 * Map with just "default"→"US". This module:
 *
 * 1. Provides a durable tenant→country assignment store
 * 2. Wires country assignments to the regulatory classification engine
 * 3. Resolves effective regulatory config per tenant (country + framework + pack)
 * 4. Supports country override (admin) with audit trail
 */

import { createHash, randomUUID } from 'crypto';
import { setTenantCountry, getTenantCountry } from './classification-engine.js';
import { resolveFrameworksByCountry } from './framework-registry.js';
import type { RegulatoryFramework } from './types.js';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export interface TenantCountryAssignment {
  id: string;
  tenantId: string;
  /** ISO 3166-1 alpha-2 (uppercase) */
  countryCode: string;
  /** Why this assignment was made */
  reason: string;
  /** Who made the assignment */
  assignedBy: string;
  /** ISO 8601 */
  assignedAt: string;
  /** Previous country (null if first assignment) */
  previousCountry: string | null;
  /** Is this the active assignment? Only one active per tenant. */
  active: boolean;
}

export interface TenantRegulatoryConfig {
  tenantId: string;
  countryCode: string;
  frameworks: RegulatoryFramework[];
  /** Whether a country pack exists and is active for this country */
  packAvailable: boolean;
  /** Resolved regulatory constraints summary */
  consentModel: string;
  retentionMinYears: number;
  crossBorderPolicy: string;
  breachNotificationHours: number;
}

export interface CountryAssignmentAudit {
  id: string;
  tenantId: string;
  action: 'assign' | 'reassign' | 'clear';
  fromCountry: string | null;
  toCountry: string | null;
  actor: string;
  reason: string;
  timestamp: string;
  hash: string;
  prevHash: string;
}

/* ------------------------------------------------------------------ */
/* Stores                                                               */
/* ------------------------------------------------------------------ */

const MAX_ASSIGNMENTS = 2000;
const MAX_AUDIT = 5000;

/** Active assignments: tenantId → TenantCountryAssignment */
const activeAssignments = new Map<string, TenantCountryAssignment>();

/** Assignment history (all changes, including superseded) */
const assignmentHistory: TenantCountryAssignment[] = [];

/** Audit trail */
const assignmentAudit: CountryAssignmentAudit[] = [];
let lastAuditHash = 'genesis';

/** Supported country codes (must have a country pack or framework definition) */
const SUPPORTED_COUNTRIES = new Set(['US', 'PH', 'GH']);

/* ------------------------------------------------------------------ */
/* Internal                                                             */
/* ------------------------------------------------------------------ */

function computeAuditHash(entry: Omit<CountryAssignmentAudit, 'hash'>): string {
  const payload = JSON.stringify({
    id: entry.id,
    tenantId: entry.tenantId,
    action: entry.action,
    fromCountry: entry.fromCountry,
    toCountry: entry.toCountry,
    timestamp: entry.timestamp,
    prevHash: entry.prevHash,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

function appendAudit(
  tenantId: string,
  action: 'assign' | 'reassign' | 'clear',
  fromCountry: string | null,
  toCountry: string | null,
  actor: string,
  reason: string
): void {
  if (assignmentAudit.length >= MAX_AUDIT) {
    assignmentAudit.shift(); // FIFO
  }
  const entry: Omit<CountryAssignmentAudit, 'hash'> = {
    id: randomUUID(),
    tenantId,
    action,
    fromCountry,
    toCountry,
    actor,
    reason,
    timestamp: new Date().toISOString(),
    prevHash: lastAuditHash,
  };
  const hash = computeAuditHash(entry);
  const full: CountryAssignmentAudit = { ...entry, hash };
  lastAuditHash = hash;
  assignmentAudit.push(full);
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Assign a country to a tenant. Returns the assignment record.
 * If the tenant already has a country, this is a reassignment.
 */
export function assignCountryToTenant(params: {
  tenantId: string;
  countryCode: string;
  assignedBy: string;
  reason: string;
}): TenantCountryAssignment {
  const cc = params.countryCode.toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) {
    throw new Error(`Invalid country code: ${cc}. Must be ISO 3166-1 alpha-2.`);
  }

  const existing = activeAssignments.get(params.tenantId);
  const action = existing ? 'reassign' : 'assign';
  const previousCountry = existing?.countryCode || null;

  // Deactivate old assignment
  if (existing) {
    existing.active = false;
  }

  // FIFO eviction on history
  if (assignmentHistory.length >= MAX_ASSIGNMENTS) {
    assignmentHistory.shift();
  }

  const assignment: TenantCountryAssignment = {
    id: randomUUID(),
    tenantId: params.tenantId,
    countryCode: cc,
    reason: params.reason,
    assignedBy: params.assignedBy,
    assignedAt: new Date().toISOString(),
    previousCountry,
    active: true,
  };

  activeAssignments.set(params.tenantId, assignment);
  assignmentHistory.push(assignment);

  // Wire to classification engine
  setTenantCountry(params.tenantId, cc);

  // Audit
  appendAudit(params.tenantId, action, previousCountry, cc, params.assignedBy, params.reason);

  return assignment;
}

/**
 * Get the active country assignment for a tenant.
 */
export function getTenantCountryAssignment(tenantId: string): TenantCountryAssignment | undefined {
  return activeAssignments.get(tenantId);
}

/**
 * List all active tenant→country assignments.
 */
export function listTenantCountryAssignments(): TenantCountryAssignment[] {
  return [...activeAssignments.values()];
}

/**
 * Get the assignment history for a tenant (all changes).
 */
export function getTenantAssignmentHistory(tenantId: string): TenantCountryAssignment[] {
  return assignmentHistory.filter((a) => a.tenantId === tenantId);
}

/**
 * Clear a tenant's country assignment (revert to default "US").
 */
export function clearTenantCountry(tenantId: string, clearedBy: string, reason: string): boolean {
  const existing = activeAssignments.get(tenantId);
  if (!existing) return false;

  existing.active = false;
  activeAssignments.delete(tenantId);

  // Revert classification engine to default
  setTenantCountry(tenantId, 'US');

  appendAudit(tenantId, 'clear', existing.countryCode, null, clearedBy, reason);
  return true;
}

/**
 * Resolve the effective regulatory configuration for a tenant.
 * Combines country assignment + framework resolution + pack availability check.
 */
export function resolveTenantRegulatoryConfig(tenantId: string): TenantRegulatoryConfig {
  const cc = getTenantCountry(tenantId); // falls back to "US"
  const frameworks = resolveFrameworksByCountry(cc);
  const packAvailable = SUPPORTED_COUNTRIES.has(cc);

  // Derive regulatory constraints from primary framework
  let consentModel = 'category';
  let retentionMinYears = 6;
  let crossBorderPolicy = 'blocked';
  let breachNotificationHours = 1440; // 60 days default (HIPAA)

  if (cc === 'PH') {
    consentModel = 'all-or-nothing';
    retentionMinYears = 5;
    crossBorderPolicy = 'allowed_with_consent';
    breachNotificationHours = 72;
  } else if (cc === 'GH') {
    consentModel = 'all-or-nothing';
    retentionMinYears = 5;
    crossBorderPolicy = 'allowed_with_consent';
    breachNotificationHours = 72;
  }

  return {
    tenantId,
    countryCode: cc,
    frameworks,
    packAvailable,
    consentModel,
    retentionMinYears,
    crossBorderPolicy,
    breachNotificationHours,
  };
}

/**
 * Get supported country codes.
 */
export function getSupportedCountries(): string[] {
  return [...SUPPORTED_COUNTRIES];
}

/**
 * Add a supported country code (when adding new country packs).
 */
export function addSupportedCountry(cc: string): void {
  SUPPORTED_COUNTRIES.add(cc.toUpperCase());
}

/**
 * Get audit trail for tenant country assignments.
 */
export function getCountryAssignmentAudit(tenantId?: string): CountryAssignmentAudit[] {
  if (tenantId) return assignmentAudit.filter((a) => a.tenantId === tenantId);
  return [...assignmentAudit];
}

/**
 * Verify the country assignment audit hash chain.
 */
export function verifyCountryAuditChain(): { valid: boolean; brokenAt?: string; checked: number } {
  for (const entry of assignmentAudit) {
    const { hash: _h, ...rest } = entry;
    const expected = computeAuditHash(rest);
    if (expected !== entry.hash) {
      return { valid: false, brokenAt: entry.id, checked: assignmentAudit.indexOf(entry) };
    }
  }
  return { valid: true, checked: assignmentAudit.length };
}

/**
 * Reset stores (for testing).
 */
export function _resetCountryConfigStore(): void {
  activeAssignments.clear();
  assignmentHistory.length = 0;
  assignmentAudit.length = 0;
  lastAuditHash = 'genesis';
}
