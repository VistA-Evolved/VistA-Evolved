/**
 * Privacy Segmentation — Phase 343 (W16-P7).
 *
 * Sensitivity tags on clinical records, break-glass enforcement,
 * access reason tracking for compliance (42 CFR Part 2, HIV, etc.)
 */

import { immutableAudit, type ImmutableAuditAction } from '../lib/immutable-audit.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

/** Sensitivity categories per federal regulation. */
export type SensitivityCategory =
  | 'normal' // No special restriction
  | 'confidential' // General confidential
  | 'substance_use' // 42 CFR Part 2 (SUD treatment)
  | 'hiv' // HIV/AIDS status
  | 'mental_health' // Mental health / psychiatric
  | 'reproductive' // Reproductive health
  | 'genetic' // GINA-protected genetic information
  | 'vip' // VIP/celebrity patient
  | 'employee' // Employee health record
  | 'research'; // Research-only data

/** A sensitivity tag applied to a record. */
export interface SensitivityTag {
  /** Tag ID. */
  id: string;
  /** Tenant. */
  tenantId: string;
  /** Patient DFN (if patient-level). */
  patientDfn?: string;
  /** Record type (note, order, lab, etc.). */
  recordType?: string;
  /** Record identifier (IEN, etc.). */
  recordId?: string;
  /** Sensitivity category. */
  category: SensitivityCategory;
  /** Who applied the tag. */
  appliedBy: string;
  /** When applied. */
  appliedAt: string;
  /** Source system (VistA DGBT, manual, etc.). */
  source: string;
  /** Optional label. */
  label?: string;
}

/** An access reason entry for accessing restricted data. */
export interface AccessReason {
  id: string;
  tenantId: string;
  /** Who accessed. */
  userId: string;
  userName: string;
  /** Patient DFN involved. */
  patientDfn: string;
  /** Record accessed. */
  recordType: string;
  recordId: string;
  /** Sensitivity categories that applied. */
  categories: SensitivityCategory[];
  /** Stated reason for access. */
  reason: string;
  /** Whether break-glass was used. */
  breakGlass: boolean;
  /** Access timestamp. */
  accessedAt: string;
}

/** Break-glass access request. */
export interface BreakGlassRequest {
  userId: string;
  userName: string;
  patientDfn: string;
  reason: string;
  tenantId: string;
}

/* ------------------------------------------------------------------ */
/* In-memory stores                                                    */
/* ------------------------------------------------------------------ */

const sensitivityTags = new Map<string, SensitivityTag>();
const accessReasons: AccessReason[] = [];
const MAX_ACCESS_REASONS = 10000;

let tagIdCounter = 0;
let reasonIdCounter = 0;

/* ------------------------------------------------------------------ */
/* Sensitivity Tag CRUD                                                */
/* ------------------------------------------------------------------ */

export function addSensitivityTag(tag: Omit<SensitivityTag, 'id' | 'appliedAt'>): SensitivityTag {
  const id = `st-${++tagIdCounter}`;
  const full: SensitivityTag = {
    ...tag,
    id,
    appliedAt: new Date().toISOString(),
  };
  sensitivityTags.set(id, full);

  immutableAudit(
    'privacy.sensitivity-tag-applied' as ImmutableAuditAction,
    'success',
    { sub: tag.appliedBy, name: tag.appliedBy, roles: [] },
    { detail: { tagId: id, category: tag.category, recordType: tag.recordType } }
  );

  return full;
}

export function removeSensitivityTag(id: string, removedBy: string): boolean {
  const tag = sensitivityTags.get(id);
  if (!tag) return false;
  sensitivityTags.delete(id);

  immutableAudit(
    'privacy.sensitivity-tag-removed' as ImmutableAuditAction,
    'success',
    { sub: removedBy, name: removedBy, roles: [] },
    { detail: { tagId: id, category: tag.category } }
  );

  return true;
}

export function getSensitivityTags(filters: {
  tenantId?: string;
  patientDfn?: string;
  recordType?: string;
  recordId?: string;
  category?: SensitivityCategory;
}): SensitivityTag[] {
  return Array.from(sensitivityTags.values()).filter((t) => {
    if (filters.tenantId && t.tenantId !== filters.tenantId) return false;
    if (filters.patientDfn && t.patientDfn !== filters.patientDfn) return false;
    if (filters.recordType && t.recordType !== filters.recordType) return false;
    if (filters.recordId && t.recordId !== filters.recordId) return false;
    if (filters.category && t.category !== filters.category) return false;
    return true;
  });
}

/**
 * Check if a record has any restricting sensitivity tags.
 * Returns the most restrictive categories found.
 */
export function getRecordSensitivity(
  tenantId: string,
  recordType: string,
  recordId: string
): SensitivityCategory[] {
  const tags = getSensitivityTags({ tenantId, recordType, recordId });
  const categories = new Set(tags.map((t) => t.category));
  categories.delete('normal'); // Normal is non-restricting
  return Array.from(categories);
}

/**
 * Check if a patient has any restricting sensitivity tags.
 */
export function getPatientSensitivity(tenantId: string, patientDfn: string): SensitivityCategory[] {
  const tags = getSensitivityTags({ tenantId, patientDfn });
  const categories = new Set(tags.map((t) => t.category));
  categories.delete('normal');
  return Array.from(categories);
}

/* ------------------------------------------------------------------ */
/* Access Reason Tracking                                              */
/* ------------------------------------------------------------------ */

/**
 * Record an access reason for viewing restricted data.
 */
export function recordAccessReason(entry: Omit<AccessReason, 'id' | 'accessedAt'>): AccessReason {
  const id = `ar-${++reasonIdCounter}`;
  const full: AccessReason = {
    ...entry,
    id,
    accessedAt: new Date().toISOString(),
  };
  accessReasons.push(full);
  if (accessReasons.length > MAX_ACCESS_REASONS) accessReasons.shift();

  immutableAudit(
    'privacy.access-reason' as ImmutableAuditAction,
    'success',
    { sub: entry.userId, name: entry.userName, roles: [] },
    {
      detail: {
        recordType: entry.recordType,
        categories: entry.categories,
        breakGlass: entry.breakGlass,
        // Reason text NOT logged to avoid PHI leak — only hash
        reasonHash: entry.reason.length > 0 ? 'present' : 'empty',
      },
    }
  );

  return full;
}

/**
 * Query access reasons.
 */
export function queryAccessReasons(filters: {
  tenantId?: string;
  userId?: string;
  patientDfn?: string;
  breakGlass?: boolean;
  limit?: number;
}): AccessReason[] {
  let results = accessReasons.filter((r) => {
    if (filters.tenantId && r.tenantId !== filters.tenantId) return false;
    if (filters.userId && r.userId !== filters.userId) return false;
    if (filters.patientDfn && r.patientDfn !== filters.patientDfn) return false;
    if (filters.breakGlass !== undefined && r.breakGlass !== filters.breakGlass) return false;
    return true;
  });
  if (filters.limit) results = results.slice(-filters.limit);
  return results;
}

/* ------------------------------------------------------------------ */
/* Access Decision                                                     */
/* ------------------------------------------------------------------ */

/** Categories that always require break-glass for non-admin access. */
const BREAK_GLASS_REQUIRED: SensitivityCategory[] = ['substance_use', 'hiv', 'vip', 'employee'];

/**
 * Check if a user can access a record based on sensitivity.
 * Returns { allowed, requiresBreakGlass, requiresReason, categories }.
 */
export function checkSensitivityAccess(
  tenantId: string,
  recordType: string,
  recordId: string,
  userRole: string,
  hasBreakGlass: boolean
): {
  allowed: boolean;
  requiresBreakGlass: boolean;
  requiresReason: boolean;
  categories: SensitivityCategory[];
  denialReason?: string;
} {
  const categories = getRecordSensitivity(tenantId, recordType, recordId);

  if (categories.length === 0) {
    return { allowed: true, requiresBreakGlass: false, requiresReason: false, categories: [] };
  }

  const needsBreakGlass = categories.some((c) => BREAK_GLASS_REQUIRED.includes(c));

  // Admin always has access but still needs reason logged
  if (userRole === 'admin') {
    return {
      allowed: true,
      requiresBreakGlass: false,
      requiresReason: true,
      categories,
    };
  }

  if (needsBreakGlass && !hasBreakGlass) {
    return {
      allowed: false,
      requiresBreakGlass: true,
      requiresReason: true,
      categories,
      denialReason: `Record has ${categories.join(',')} sensitivity tags requiring break-glass access`,
    };
  }

  // Other restricted categories require reason but not break-glass
  return {
    allowed: true,
    requiresBreakGlass: false,
    requiresReason: true,
    categories,
  };
}

/* ------------------------------------------------------------------ */
/* Statistics                                                          */
/* ------------------------------------------------------------------ */

export function getPrivacyStats(tenantId?: string): {
  totalTags: number;
  totalAccessReasons: number;
  breakGlassAccesses: number;
  categoryCounts: Record<string, number>;
} {
  let tags = Array.from(sensitivityTags.values());
  let reasons = accessReasons;

  if (tenantId) {
    tags = tags.filter((t) => t.tenantId === tenantId);
    reasons = reasons.filter((r) => r.tenantId === tenantId);
  }

  const categoryCounts: Record<string, number> = {};
  for (const tag of tags) {
    categoryCounts[tag.category] = (categoryCounts[tag.category] || 0) + 1;
  }

  return {
    totalTags: tags.length,
    totalAccessReasons: reasons.length,
    breakGlassAccesses: reasons.filter((r) => r.breakGlass).length,
    categoryCounts,
  };
}
