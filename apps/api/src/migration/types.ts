/**
 * types.ts -- Migration Toolkit domain types (Phase 50)
 *
 * Defines the core entities for data import/export: jobs, mapping configs,
 * validation results, and pipeline state machines.
 */

/* ------------------------------------------------------------------ */
/* Enums & Literals                                                    */
/* ------------------------------------------------------------------ */

export type MigrationDirection = 'import' | 'export';

export type ImportEntityType =
  | 'patient'
  | 'problem'
  | 'medication'
  | 'allergy'
  | 'appointment'
  | 'note';

export type ExportBundleType = 'patient-summary' | 'audit-export' | 'clinical-data';

export type MigrationJobStatus =
  | 'created'
  | 'validating'
  | 'validated'
  | 'validation-failed'
  | 'dry-run'
  | 'dry-run-complete'
  | 'importing'
  | 'imported'
  | 'import-failed'
  | 'exporting'
  | 'exported'
  | 'export-failed'
  | 'rolled-back';

export type SourceFormat =
  | 'generic-csv'
  | 'openemr-csv'
  | 'fhir-bundle'
  | 'ccda'
  | 'epic-ccda'
  | 'cerner-ccda'
  | 'athena-ccda'
  | 'ecw-ccda'
  | 'practicefusion-ccda'
  | 'custom';

/* ------------------------------------------------------------------ */
/* Mapping DSL types                                                   */
/* ------------------------------------------------------------------ */

export type TransformFunction =
  | 'uppercase'
  | 'lowercase'
  | 'trim'
  | 'date-iso8601'
  | 'date-mmddyyyy'
  | 'date-yyyymmdd'
  | 'split-first'
  | 'split-last'
  | 'default'
  | 'map-value'
  | 'concat'
  | 'regex-extract'
  | 'number'
  | 'boolean';

export interface FieldTransform {
  fn: TransformFunction;
  /** Extra args, e.g. { separator: "," } for split, { default: "Unknown" } */
  args?: Record<string, string>;
}

export interface FieldMapping {
  /** Source column/field name */
  source: string;
  /** Target VistA-Evolved field */
  target: string;
  /** Whether this field is required */
  required?: boolean;
  /** Ordered list of transforms to apply */
  transforms?: FieldTransform[];
  /** Validation regex pattern */
  validationPattern?: string;
  /** Human description of the mapping */
  description?: string;
}

export interface MappingTemplate {
  /** Unique template ID */
  id: string;
  /** Human-readable name */
  name: string;
  /** Source format this template handles */
  sourceFormat: SourceFormat;
  /** Entity type this maps */
  entityType: ImportEntityType;
  /** Version for schema evolution */
  version: string;
  /** Field mappings */
  fields: FieldMapping[];
  /** Description of the template */
  description?: string;
}

/* ------------------------------------------------------------------ */
/* Validation types                                                    */
/* ------------------------------------------------------------------ */

export type ValidationSeverity = 'error' | 'warning' | 'info';

export interface ValidationIssue {
  row?: number;
  field?: string;
  severity: ValidationSeverity;
  code: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  totalRows: number;
  validRows: number;
  errorCount: number;
  warningCount: number;
  issues: ValidationIssue[];
  /** Sample of parsed rows (max 5) for preview */
  preview?: Record<string, unknown>[];
}

/* ------------------------------------------------------------------ */
/* Import/Export Job                                                    */
/* ------------------------------------------------------------------ */

export interface MigrationJob {
  id: string;
  direction: MigrationDirection;
  status: MigrationJobStatus;
  /** Entity type for imports */
  entityType?: ImportEntityType;
  /** Bundle type for exports */
  bundleType?: ExportBundleType;
  /** Source format for imports */
  sourceFormat?: SourceFormat;
  /** Template ID used for mapping */
  templateId?: string;
  /** Who started this job */
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  /** Raw file content (CSV text, kept in memory for sandbox) */
  rawData?: string;
  /** Original filename */
  fileName?: string;
  /** Validation result after validate step */
  validation?: ValidationResult;
  /** Dry-run result (row-level import simulation) */
  dryRunResult?: DryRunResult;
  /** Import result (actual import outcome) */
  importResult?: ImportResult;
  /** Export result (download payload) */
  exportResult?: ExportResult;
  /** Field mapping overrides (merged with template) */
  mappingOverrides?: FieldMapping[];
  /** Error message if status is *-failed */
  error?: string;
  /** Progress tracking */
  progress?: {
    current: number;
    total: number;
    phase: string;
  };
}

/* ------------------------------------------------------------------ */
/* Dry-run / Import result                                             */
/* ------------------------------------------------------------------ */

export interface DryRunRowResult {
  row: number;
  action: 'create' | 'update' | 'skip';
  reason?: string;
  mapped: Record<string, unknown>;
}

export interface DryRunResult {
  totalRows: number;
  createCount: number;
  updateCount: number;
  skipCount: number;
  rows: DryRunRowResult[];
}

export interface ImportRowResult {
  row: number;
  success: boolean;
  action: 'created' | 'updated' | 'skipped' | 'failed';
  entityId?: string;
  error?: string;
}

export interface ImportResult {
  totalRows: number;
  successCount: number;
  failureCount: number;
  skippedCount: number;
  rows: ImportRowResult[];
  rollbackAvailable: boolean;
}

/* ------------------------------------------------------------------ */
/* Export result                                                        */
/* ------------------------------------------------------------------ */

export interface ExportResult {
  format: 'json' | 'csv' | 'encrypted-json';
  fileName: string;
  recordCount: number;
  generatedAt: string;
  /** Base64-encoded data or JSON string */
  data: string;
  /** Whether the export is encrypted */
  encrypted: boolean;
  /** Encryption metadata (algorithm, key hint) */
  encryptionMeta?: {
    algorithm: string;
    keyId: string;
  };
}

/* ------------------------------------------------------------------ */
/* Rollback                                                            */
/* ------------------------------------------------------------------ */

export interface RollbackPlan {
  jobId: string;
  createdEntities: { entityType: ImportEntityType; entityId: string }[];
  canRollback: boolean;
  reason?: string;
}

/* ------------------------------------------------------------------ */
/* FHIR R4 types (Phase 456 — W30-P1)                                 */
/* ------------------------------------------------------------------ */

export type FhirImportStatus =
  | 'pending'
  | 'validating'
  | 'importing'
  | 'completed'
  | 'failed'
  | 'partial';

export interface FhirMigrationBatch {
  id: string;
  format: 'fhir-r4';
  status: FhirImportStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  totalResources: number;
  importedCount: number;
  failedCount: number;
  skippedCount: number;
  errors: FhirMigrationError[];
  summary?: Record<string, number>;
}

export interface FhirMigrationError {
  resourceType: string;
  resourceId?: string;
  field?: string;
  message: string;
  severity: 'error' | 'warning';
}

export interface FhirImportResult {
  ok: boolean;
  batchId: string;
  status: FhirImportStatus;
  imported: number;
  failed: number;
  skipped: number;
  errors: FhirMigrationError[];
}

export interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

export interface FhirBundle {
  resourceType: 'Bundle';
  type: 'collection' | 'transaction' | 'batch' | 'document';
  entry?: Array<{ resource?: FhirResource; fullUrl?: string }>;
}

export interface FhirPatient extends FhirResource {
  resourceType: 'Patient';
  name?: Array<{ family?: string; given?: string[]; text?: string }>;
  birthDate?: string;
  gender?: string;
  identifier?: Array<{ system?: string; value?: string }>;
}

export interface FhirCondition extends FhirResource {
  resourceType: 'Condition';
  subject?: { reference?: string };
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
  clinicalStatus?: { coding?: Array<{ code?: string }> };
  onsetDateTime?: string;
}

export interface FhirMedicationRequest extends FhirResource {
  resourceType: 'MedicationRequest';
  subject?: { reference?: string };
  medicationCodeableConcept?: {
    coding?: Array<{ system?: string; code?: string; display?: string }>;
  };
  status?: string;
  authoredOn?: string;
}

export interface FhirAllergyIntolerance extends FhirResource {
  resourceType: 'AllergyIntolerance';
  patient?: { reference?: string };
  code?: { coding?: Array<{ system?: string; code?: string; display?: string }> };
  type?: string;
  category?: string[];
  criticality?: string;
}
