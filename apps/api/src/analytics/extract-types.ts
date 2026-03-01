/**
 * Analytics Extract Types — Phase 363 (W19-P2)
 *
 * Shared types for the analytics extract layer, de-identification,
 * reporting, and data access controls.
 */

// ── Extract Types ───────────────────────────────────────────────────────

export type ExtractEntityType =
  | "analytics_event"
  | "claim"
  | "session"
  | "appointment"
  | "imaging_order"
  | "medication_order"
  | "note"
  | "lab_result"
  | "patient_encounter";

export interface ExtractRunConfig {
  tenantId: string;
  entityTypes: ExtractEntityType[];
  incremental?: boolean;
  maxRecords?: number;
  since?: string; // ISO timestamp -- incremental from this point
  until?: string; // ISO timestamp -- extract up to this point
  deidMode?: DeidMode;
}

export interface ExtractRunResult {
  runId: string;
  tenantId: string;
  startedAt: string;
  completedAt: string;
  status: "completed" | "partial" | "failed";
  counts: Record<string, number>;
  totalRecords: number;
  extractedCount: number;
  deidMode: DeidMode;
  durationMs: number;
  errors: string[];
}

export interface ExtractRecord {
  id: string;
  entityType: ExtractEntityType;
  tenantId: string;
  extractedAt: string;
  data: Record<string, unknown>;
}

// ── De-Identification Types ─────────────────────────────────────────────

export type DeidMode = "strict" | "pseudonymized" | "raw";

export interface DeidConfig {
  tenantId?: string;
  mode: DeidMode;
  pseudonymizationSecret?: string; // HMAC key -- tenant-scoped
  redactFreeText?: boolean;
  redactDirectIdentifiers?: boolean;
  customRedactFields?: string[];
  denylistScanEnabled?: boolean;
  customFieldDenylist?: string[];
}

export const DEFAULT_DEID_CONFIG: Omit<DeidConfig, "tenantId"> = {
  mode: "strict",
  redactFreeText: true,
  redactDirectIdentifiers: true,
};

export const DIRECT_IDENTIFIER_FIELDS = new Set([
  "name", "patientName", "patient_name", "firstName", "lastName",
  "ssn", "socialSecurityNumber", "social_security_number",
  "dob", "dateOfBirth", "date_of_birth", "birthDate",
  "mrn", "medicalRecordNumber", "medical_record_number",
  "dfn", "patientDfn", "patient_dfn",
  "address", "streetAddress", "street_address",
  "city", "state", "zip", "zipCode", "zip_code",
  "phone", "phoneNumber", "phone_number", "telephone",
  "email", "emailAddress", "email_address",
  "memberid", "memberId", "member_id",
  "insuranceId", "insurance_id", "policyNumber", "policy_number",
  "accountNumber", "account_number",
]);

export const INLINE_PHI_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: "[SSN-REDACTED]" },
  { pattern: /\b(19|20)\d{2}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/g, replacement: "[DOB-REDACTED]" },
  { pattern: /\b(0[1-9]|1[0-2])\/(0[1-9]|[12]\d|3[01])\/(19|20)\d{2}\b/g, replacement: "[DOB-REDACTED]" },
  { pattern: /\b[A-Z][A-Z'-]+,[A-Z][A-Z'-]+(\s[A-Z])?\b/g, replacement: "[NAME-REDACTED]" },
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replacement: "[EMAIL-REDACTED]" },
  { pattern: /\b(\+?1[-.]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g, replacement: "[PHONE-REDACTED]" },
];

// ── Reporting Types ─────────────────────────────────────────────────────

export type ReportId =
  | "active_users"
  | "error_rate"
  | "queue_lag"
  | "uptime"
  | "patient_volume"
  | "appointment_volume"
  | "quality_lab_followup"
  | "quality_med_admin"
  | "quality_note_completion"
  | "rcm_claim_throughput"
  | "rcm_denial_distribution"
  | "rcm_days_in_ar"
  | "rcm_ack_reject_rate";

export interface ReportDefinition {
  id: ReportId;
  name: string;
  description: string;
  category: "operational" | "clinical" | "rcm" | "quality";
  parameters: ReportParameter[];
  requiredPermission: "analytics_viewer" | "analytics_admin";
}

export interface ReportParameter {
  name: string;
  type: "string" | "number" | "date" | "select";
  required: boolean;
  defaultValue?: string | number;
  options?: string[];
}

export interface ReportResult {
  reportId: ReportId;
  tenantId: string;
  generatedAt: string;
  parameters: Record<string, unknown>;
  data: ReportRow[];
  summary: Record<string, number | string>;
  totalRows: number;
}

export interface ReportRow {
  [key: string]: unknown;
}

// ── Quality Metrics Types ───────────────────────────────────────────────

export type QualityMeasureId =
  | "lab_followup_time"
  | "med_order_to_admin"
  | "note_completion_timeliness";

export interface QualityMeasure {
  id: QualityMeasureId;
  name: string;
  description: string;
  unit: "hours" | "minutes" | "percent";
  target?: number;
  disclaimer: string;
}

export interface QualityMetricRun {
  runId: string;
  measureId: QualityMeasureId;
  tenantId: string;
  computedAt: string;
  periodStart: string;
  periodEnd: string;
  value: number;
  sampleSize: number;
  inputRefs: string[];
  status: "computed" | "insufficient_data" | "error";
}

// ── Data Access Control Types ───────────────────────────────────────────

export type DatasetId =
  | "analytics_events"
  | "extract_events"
  | "extract_claims"
  | "extract_records"
  | "quality_metrics"
  | "rcm_metrics"
  | "rcm_analytics"
  | "report_outputs"
  | "deid_audit"
  | "reports"
  | "raw_exports";

export type ColumnSensitivity = "public" | "internal" | "sensitive" | "restricted";

export interface DatasetPermission {
  id: string;
  tenantId: string;
  datasetId: DatasetId;
  role: string;
  actions: Array<"read" | "export" | "admin">;
  grantedBy: string;
  grantedAt: string;
  canRead?: boolean;
  canExport?: boolean;
  maskedColumns?: string[];
}

export interface ColumnMaskRule {
  datasetId: DatasetId;
  column: string;
  sensitivity?: ColumnSensitivity;
  maskType: "redact" | "hash" | "truncate" | "null";
  maskForRoles?: string[];
  maskValue?: string;
}

export interface ExportAuditEntry {
  id: string;
  tenantId: string;
  datasetId: DatasetId;
  exportedBy: string;
  exportedAt: string;
  format: "csv" | "json";
  rowCount: number;
  filterSummary?: string;
  actorId?: string;
  actorHash?: string;
  reason?: string;
  columns?: string[];
  filters?: Record<string, unknown>;
}
