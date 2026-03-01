/**
 * Data Access Controls — Phase 368 (W19-P7)
 *
 * Dataset-level RBAC, column sensitivity masking, export policies,
 * and audit logging for the analytics data platform.
 */

import { randomUUID } from "node:crypto";
import { log } from "../lib/logger.js";
import type {
  DatasetId,
  ColumnSensitivity,
  DatasetPermission,
  ColumnMaskRule,
  ExportAuditEntry,
} from "./extract-types.js";

// ── Dataset Definitions ─────────────────────────────────────────────────

interface DatasetDefinition {
  id: DatasetId;
  name: string;
  description: string;
  columns: ColumnDefinition[];
}

interface ColumnDefinition {
  name: string;
  sensitivity: ColumnSensitivity;
  label: string;
}

const DATASETS: DatasetDefinition[] = [
  {
    id: "extract_events",
    name: "Extract Events",
    description: "Raw analytics event stream (PHI-safe)",
    columns: [
      { name: "eventId", sensitivity: "public", label: "Event ID" },
      { name: "category", sensitivity: "public", label: "Category" },
      { name: "action", sensitivity: "public", label: "Action" },
      { name: "tenantId", sensitivity: "internal", label: "Tenant" },
      { name: "userId", sensitivity: "restricted", label: "User Hash" },
      { name: "timestamp", sensitivity: "public", label: "Timestamp" },
    ],
  },
  {
    id: "extract_claims",
    name: "Extracted Claims",
    description: "De-identified claim records from extract runs",
    columns: [
      { name: "claimId", sensitivity: "internal", label: "Claim ID" },
      { name: "status", sensitivity: "public", label: "Status" },
      { name: "amount", sensitivity: "restricted", label: "Amount" },
      { name: "submittedAt", sensitivity: "public", label: "Submitted" },
      { name: "payer", sensitivity: "internal", label: "Payer" },
    ],
  },
  {
    id: "quality_metrics",
    name: "Quality Metrics",
    description: "Computed quality measure results",
    columns: [
      { name: "measureId", sensitivity: "public", label: "Measure" },
      { name: "value", sensitivity: "internal", label: "Value" },
      { name: "sampleSize", sensitivity: "internal", label: "Sample Size" },
      { name: "computedAt", sensitivity: "public", label: "Computed At" },
    ],
  },
  {
    id: "rcm_metrics",
    name: "RCM Metrics",
    description: "Revenue cycle analytics results",
    columns: [
      { name: "metricKey", sensitivity: "public", label: "Metric" },
      { name: "value", sensitivity: "internal", label: "Value" },
      { name: "breakdown", sensitivity: "restricted", label: "Breakdown" },
    ],
  },
  {
    id: "report_outputs",
    name: "Report Outputs",
    description: "Generated report result data",
    columns: [
      { name: "reportId", sensitivity: "public", label: "Report" },
      { name: "data", sensitivity: "restricted", label: "Report Data" },
      { name: "summary", sensitivity: "internal", label: "Summary" },
    ],
  },
  {
    id: "deid_audit",
    name: "De-Identification Audit",
    description: "De-identification processing audit trail",
    columns: [
      { name: "runId", sensitivity: "internal", label: "Run ID" },
      { name: "mode", sensitivity: "public", label: "De-ID Mode" },
      { name: "recordsProcessed", sensitivity: "public", label: "Records" },
      { name: "fieldsRedacted", sensitivity: "internal", label: "Redacted" },
    ],
  },
];

// ── Permission Store ────────────────────────────────────────────────────

const permissionStore = new Map<string, DatasetPermission>();
const maskRuleStore = new Map<string, ColumnMaskRule[]>();
const exportAuditStore: ExportAuditEntry[] = [];
const MAX_EXPORT_AUDIT = 5000;

/**
 * Check if a role can access a dataset with a specific action.
 */
export function checkDatasetPermission(
  tenantId: string,
  datasetId: DatasetId,
  role: string,
  action: "read" | "export" | "admin",
): { allowed: boolean; reason?: string } {
  // Admin always allowed
  if (role === "admin") return { allowed: true };

  const key = `${tenantId}:${datasetId}:${role}`;
  const perm = permissionStore.get(key);

  if (!perm) {
    // Default: analytics_admin can read+export, analytics_viewer can read
    if (role === "analytics_admin") return { allowed: true };
    if (role === "analytics_viewer" && action === "read") return { allowed: true };
    return { allowed: false, reason: "no_permission_grant" };
  }

  if (!perm.actions.includes(action)) {
    return { allowed: false, reason: `action_${action}_not_granted` };
  }

  return { allowed: true };
}

/**
 * Grant a dataset permission to a role.
 */
export function grantDatasetPermission(
  tenantId: string,
  datasetId: DatasetId,
  role: string,
  actions: Array<"read" | "export" | "admin">,
  grantedBy: string,
): DatasetPermission {
  const key = `${tenantId}:${datasetId}:${role}`;
  const perm: DatasetPermission = {
    id: randomUUID(),
    tenantId,
    datasetId,
    role,
    actions,
    grantedBy,
    grantedAt: new Date().toISOString(),
  };
  permissionStore.set(key, perm);
  log.info(`Dataset permission granted: ${datasetId} -> ${role} [${actions.join(",")}]`);
  return perm;
}

/**
 * Revoke a dataset permission.
 */
export function revokeDatasetPermission(
  tenantId: string,
  datasetId: DatasetId,
  role: string,
): boolean {
  const key = `${tenantId}:${datasetId}:${role}`;
  const existed = permissionStore.delete(key);
  if (existed) log.info(`Dataset permission revoked: ${datasetId} -> ${role}`);
  return existed;
}

export function listDatasetPermissions(tenantId: string): DatasetPermission[] {
  return [...permissionStore.values()].filter((p) => p.tenantId === tenantId);
}

// ── Column Masking ──────────────────────────────────────────────────────

/**
 * Apply column masking to a record based on the viewer's role.
 */
export function applyColumnMasking(
  tenantId: string,
  datasetId: DatasetId,
  record: Record<string, unknown>,
  viewerRole: string,
): Record<string, unknown> {
  const dataset = DATASETS.find((d) => d.id === datasetId);
  if (!dataset) return record;

  // Admin sees everything
  if (viewerRole === "admin" || viewerRole === "analytics_admin") return { ...record };

  const customRules = maskRuleStore.get(`${tenantId}:${datasetId}`) || [];

  const masked = { ...record };
  for (const col of dataset.columns) {
    if (!(col.name in masked)) continue;

    // Check custom rules first
    const custom = customRules.find((r) => r.column === col.name);
    if (custom) {
      masked[col.name] = applyMask(masked[col.name], custom.maskType);
      continue;
    }

    // Default rules by sensitivity
    if (col.sensitivity === "restricted" && viewerRole === "analytics_viewer") {
      masked[col.name] = "[RESTRICTED]";
    }
  }

  return masked;
}

function applyMask(
  value: unknown,
  maskType: ColumnMaskRule["maskType"],
): unknown {
  if (value == null) return null;
  switch (maskType) {
    case "redact":
      return "[REDACTED]";
    case "hash":
      return `HASH:${String(value).slice(0, 4)}...`;
    case "truncate":
      return String(value).slice(0, 3) + "***";
    case "null":
      return null;
    default:
      return "[MASKED]";
  }
}

/**
 * Set custom column mask rules for a dataset.
 */
export function setColumnMaskRules(
  tenantId: string,
  datasetId: DatasetId,
  rules: ColumnMaskRule[],
): void {
  maskRuleStore.set(`${tenantId}:${datasetId}`, rules);
  log.info(`Column mask rules updated: ${datasetId} (${rules.length} rules)`);
}

export function getColumnMaskRules(
  tenantId: string,
  datasetId: DatasetId,
): ColumnMaskRule[] {
  return maskRuleStore.get(`${tenantId}:${datasetId}`) || [];
}

// ── Export Audit ─────────────────────────────────────────────────────────

/**
 * Record an export event for compliance tracking.
 */
export function recordExportAudit(
  tenantId: string,
  datasetId: DatasetId,
  exportedBy: string,
  format: "csv" | "json",
  rowCount: number,
  filterSummary?: string,
): ExportAuditEntry {
  const entry: ExportAuditEntry = {
    id: randomUUID(),
    tenantId,
    datasetId,
    exportedBy,
    exportedAt: new Date().toISOString(),
    format,
    rowCount,
    filterSummary: filterSummary || "none",
  };
  exportAuditStore.push(entry);
  if (exportAuditStore.length > MAX_EXPORT_AUDIT) exportAuditStore.shift();
  log.info(`Export audit: ${datasetId} by ${exportedBy} (${format}, ${rowCount} rows)`);
  return entry;
}

export function getExportAuditLog(
  tenantId: string,
  limit = 100,
  offset = 0,
): { entries: ExportAuditEntry[]; total: number } {
  const filtered = exportAuditStore.filter((e) => e.tenantId === tenantId);
  return {
    entries: filtered.slice(offset, offset + limit),
    total: filtered.length,
  };
}

// ── Dataset Catalog ─────────────────────────────────────────────────────

export function getDatasets(): DatasetDefinition[] {
  return [...DATASETS];
}

export function getDataset(id: DatasetId): DatasetDefinition | undefined {
  return DATASETS.find((d) => d.id === id);
}

// ── Clear (for testing) ─────────────────────────────────────────────────

export function clearAccessControlData(): void {
  permissionStore.clear();
  maskRuleStore.clear();
  exportAuditStore.length = 0;
}
