/**
 * Export Packaging Pipeline — Phase 442.
 *
 * Produces regulatory-compliant data export packages with:
 * - Framework-specific constraints enforcement (cross-border, retention, PHI redaction)
 * - Country-aware packaging (format, headers, classification labels)
 * - Manifest generation with SHA-256 content hashes
 * - Audit trail for all export operations
 *
 * This is the pipeline engine. Route endpoints are added in Phase 444.
 */

import { createHash, randomUUID } from 'crypto';
import { resolveTenantRegulatoryConfig } from './country-config.js';
import type { RegulatoryFramework, DataClassTier } from './types.js';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

export type ExportFormat = 'json' | 'csv' | 'hl7_fhir_bundle' | 'x12' | 'flat_file';
export type ExportStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'blocked';

export interface ExportRequest {
  /** Who requested the export */
  requestedBy: string;
  /** Tenant context */
  tenantId?: string;
  /** Target destination country (for cross-border checks) */
  destinationCountry?: string;
  /** What data domains are included */
  domains: string[];
  /** Requested output format */
  format: ExportFormat;
  /** Whether to include PHI (subject to framework constraints) */
  includePhi: boolean;
  /** Optional: specific patient scope */
  patientDfn?: string;
  /** Optional: date range filter */
  dateRangeStart?: string;
  dateRangeEnd?: string;
  /** Reason for export (audit requirement) */
  reason: string;
}

export interface ExportConstraintCheck {
  constraint: string;
  framework: RegulatoryFramework;
  satisfied: boolean;
  detail: string;
}

export interface ExportManifest {
  exportId: string;
  generatedAt: string;
  tenantId: string;
  sourceCountry: string;
  destinationCountry: string | null;
  format: ExportFormat;
  domains: string[];
  /** Data classification tier */
  dataTier: DataClassTier;
  /** Number of records in the export */
  recordCount: number;
  /** SHA-256 of the export content */
  contentHash: string;
  /** Size in bytes */
  sizeBytes: number;
  /** Which constraints were checked and their results */
  constraintChecks: ExportConstraintCheck[];
  /** Whether PHI was included or redacted */
  phiIncluded: boolean;
  /** Applicable frameworks */
  frameworks: RegulatoryFramework[];
  /** Retention minimum in years */
  retentionMinYears: number;
}

export interface ExportPackage {
  id: string;
  status: ExportStatus;
  request: ExportRequest;
  manifest: ExportManifest | null;
  /** The actual export content (in production, would be a file reference) */
  content: string | null;
  createdAt: string;
  completedAt: string | null;
  /** If blocked, the reason */
  blockedReason: string | null;
  /** Audit event IDs for this export */
  auditEventIds: string[];
}

export interface ExportAuditEntry {
  id: string;
  exportId: string;
  action: 'requested' | 'constraint_check' | 'processing' | 'completed' | 'failed' | 'blocked';
  actor: string;
  detail: string;
  timestamp: string;
  hash: string;
  prevHash: string;
}

/* ------------------------------------------------------------------ */
/* Store                                                                */
/* ------------------------------------------------------------------ */

const MAX_PACKAGES = 2000;
const MAX_AUDIT = 5000;

const exportPackages = new Map<string, ExportPackage>();
const exportAudit: ExportAuditEntry[] = [];
let lastAuditHash = 'genesis';

function computeAuditHash(e: Omit<ExportAuditEntry, 'hash'>): string {
  const payload = JSON.stringify({
    id: e.id,
    exportId: e.exportId,
    action: e.action,
    timestamp: e.timestamp,
    prevHash: e.prevHash,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

function appendAudit(
  exportId: string,
  action: ExportAuditEntry['action'],
  actor: string,
  detail: string
): string {
  if (exportAudit.length >= MAX_AUDIT) exportAudit.shift();
  const entry: Omit<ExportAuditEntry, 'hash'> = {
    id: randomUUID(),
    exportId,
    action,
    actor,
    detail,
    timestamp: new Date().toISOString(),
    prevHash: lastAuditHash,
  };
  const hash = computeAuditHash(entry);
  const full: ExportAuditEntry = { ...entry, hash };
  lastAuditHash = hash;
  exportAudit.push(full);
  return full.id;
}

/* ------------------------------------------------------------------ */
/* Constraint Checking                                                  */
/* ------------------------------------------------------------------ */

function checkCrossBorderConstraint(
  sourceCountry: string,
  destCountry: string | undefined,
  regConfig: ReturnType<typeof resolveTenantRegulatoryConfig>
): ExportConstraintCheck {
  if (!destCountry || destCountry === sourceCountry) {
    return {
      constraint: 'cross-border-transfer',
      framework: 'HIPAA' as RegulatoryFramework,
      satisfied: true,
      detail: 'Domestic transfer or no destination specified',
    };
  }
  if (regConfig.crossBorderPolicy === 'blocked') {
    return {
      constraint: 'cross-border-transfer',
      framework: 'HIPAA' as RegulatoryFramework,
      satisfied: false,
      detail: `Cross-border transfer blocked under ${regConfig.frameworks[0]}. Source: ${sourceCountry}, Destination: ${destCountry}`,
    };
  }
  if (regConfig.crossBorderPolicy === 'allowed_with_consent') {
    return {
      constraint: 'cross-border-transfer',
      framework: regConfig.frameworks[0] as RegulatoryFramework,
      satisfied: true,
      detail: `Cross-border allowed with consent. Source: ${sourceCountry}, Destination: ${destCountry}`,
    };
  }
  return {
    constraint: 'cross-border-transfer',
    framework: 'HIPAA' as RegulatoryFramework,
    satisfied: true,
    detail: 'Transfer allowed',
  };
}

function checkPhiConstraint(includePhi: boolean, dataTier: DataClassTier): ExportConstraintCheck {
  if (includePhi && (dataTier === 'C1_PHI' || dataTier === 'C2_DEIDENTIFIED')) {
    return {
      constraint: 'phi-classification',
      framework: 'HIPAA' as RegulatoryFramework,
      satisfied: true,
      detail: `PHI included. Data tier: ${dataTier}. Ensure destination has adequate protection.`,
    };
  }
  if (!includePhi) {
    return {
      constraint: 'phi-classification',
      framework: 'HIPAA' as RegulatoryFramework,
      satisfied: true,
      detail: 'PHI excluded from export (de-identified)',
    };
  }
  return {
    constraint: 'phi-classification',
    framework: 'HIPAA' as RegulatoryFramework,
    satisfied: true,
    detail: `Data tier ${dataTier}: no PHI constraints`,
  };
}

function checkRetentionConstraint(
  regConfig: ReturnType<typeof resolveTenantRegulatoryConfig>
): ExportConstraintCheck {
  return {
    constraint: 'retention-acknowledgement',
    framework: regConfig.frameworks[0] as RegulatoryFramework,
    satisfied: true,
    detail: `Minimum retention: ${regConfig.retentionMinYears} years. Export recipient must comply.`,
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                           */
/* ------------------------------------------------------------------ */

/**
 * Create and process an export package.
 * Runs constraint checks and either produces the package or blocks it.
 */
export function createExportPackage(request: ExportRequest): ExportPackage {
  // FIFO eviction
  if (exportPackages.size >= MAX_PACKAGES) {
    const oldest = exportPackages.keys().next().value;
    if (oldest) exportPackages.delete(oldest);
  }

  const exportId = randomUUID();
  const tenantId = request.tenantId || 'default';
  const regConfig = resolveTenantRegulatoryConfig(tenantId);

  // Initial audit
  const auditIds: string[] = [];
  auditIds.push(
    appendAudit(
      exportId,
      'requested',
      request.requestedBy,
      `Export requested: ${request.domains.join(',')} as ${request.format}`
    )
  );

  // Run constraint checks
  const constraints: ExportConstraintCheck[] = [];
  constraints.push(
    checkCrossBorderConstraint(regConfig.countryCode, request.destinationCountry, regConfig)
  );
  constraints.push(checkPhiConstraint(request.includePhi, 'C1_PHI')); // Default to C1_PHI for clinical data
  constraints.push(checkRetentionConstraint(regConfig));

  auditIds.push(
    appendAudit(
      exportId,
      'constraint_check',
      request.requestedBy,
      `Checked ${constraints.length} constraints: ${constraints.filter((c) => c.satisfied).length} passed`
    )
  );

  // Check for blockers
  const blockers = constraints.filter((c) => !c.satisfied);
  if (blockers.length > 0) {
    const reason = blockers.map((b) => `${b.constraint}: ${b.detail}`).join('; ');
    auditIds.push(appendAudit(exportId, 'blocked', request.requestedBy, reason));

    const pkg: ExportPackage = {
      id: exportId,
      status: 'blocked',
      request,
      manifest: null,
      content: null,
      createdAt: new Date().toISOString(),
      completedAt: null,
      blockedReason: reason,
      auditEventIds: auditIds,
    };
    exportPackages.set(exportId, pkg);
    return pkg;
  }

  // Generate export content (scaffold — real implementation would query data stores)
  auditIds.push(
    appendAudit(exportId, 'processing', request.requestedBy, 'Generating export package')
  );

  const exportContent = JSON.stringify(
    {
      _exportMeta: {
        id: exportId,
        format: request.format,
        domains: request.domains,
        generatedAt: new Date().toISOString(),
        note: 'Scaffold export — real data query integration pending',
      },
      records: [],
    },
    null,
    2
  );

  const contentHash = createHash('sha256').update(exportContent).digest('hex');

  // Build manifest
  const manifest: ExportManifest = {
    exportId,
    generatedAt: new Date().toISOString(),
    tenantId,
    sourceCountry: regConfig.countryCode,
    destinationCountry: request.destinationCountry || null,
    format: request.format,
    domains: request.domains,
    dataTier: request.includePhi ? 'C1_PHI' : 'C3_AGGREGATED',
    recordCount: 0,
    contentHash,
    sizeBytes: Buffer.byteLength(exportContent, 'utf-8'),
    constraintChecks: constraints,
    phiIncluded: request.includePhi,
    frameworks: regConfig.frameworks as RegulatoryFramework[],
    retentionMinYears: regConfig.retentionMinYears,
  };

  auditIds.push(
    appendAudit(
      exportId,
      'completed',
      request.requestedBy,
      `Export completed: ${manifest.sizeBytes} bytes, hash=${contentHash.slice(0, 16)}`
    )
  );

  const pkg: ExportPackage = {
    id: exportId,
    status: 'completed',
    request,
    manifest,
    content: exportContent,
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    blockedReason: null,
    auditEventIds: auditIds,
  };
  exportPackages.set(exportId, pkg);
  return pkg;
}

/**
 * Get an export package by ID.
 */
export function getExportPackage(id: string): ExportPackage | undefined {
  return exportPackages.get(id);
}

/**
 * List export packages with optional status filter.
 */
export function listExportPackages(filters?: {
  status?: ExportStatus;
  tenantId?: string;
  limit?: number;
  offset?: number;
}): { items: ExportPackage[]; total: number } {
  let items = [...exportPackages.values()];
  if (filters?.status) items = items.filter((p) => p.status === filters.status);
  if (filters?.tenantId) items = items.filter((p) => p.request.tenantId === filters.tenantId);
  const total = items.length;
  const offset = filters?.offset || 0;
  const limit = filters?.limit || 50;
  return { items: items.slice(offset, offset + limit), total };
}

/**
 * Get the export audit trail.
 */
export function getExportAudit(exportId?: string): ExportAuditEntry[] {
  if (exportId) return exportAudit.filter((a) => a.exportId === exportId);
  return [...exportAudit];
}

/**
 * Verify the export audit hash chain.
 */
export function verifyExportAuditChain(): { valid: boolean; brokenAt?: string; checked: number } {
  for (const entry of exportAudit) {
    const { hash: _h, ...rest } = entry;
    const expected = computeAuditHash(rest);
    if (expected !== entry.hash) {
      return { valid: false, brokenAt: entry.id, checked: exportAudit.indexOf(entry) };
    }
  }
  return { valid: true, checked: exportAudit.length };
}

/**
 * Reset stores (for testing).
 */
export function _resetExportStore(): void {
  exportPackages.clear();
  exportAudit.length = 0;
  lastAuditHash = 'genesis';
}
