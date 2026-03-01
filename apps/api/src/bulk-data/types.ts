/**
 * Phase 404 (W23-P6): Bulk Data — Types
 */

export type BulkJobStatus = "queued" | "in-progress" | "completed" | "failed" | "cancelled";
export type BulkJobDirection = "export" | "import";
export type BulkResourceType = "Patient" | "AllergyIntolerance" | "Condition" | "MedicationRequest" | "Observation" | "Encounter" | "DocumentReference" | "Practitioner" | "Organization" | "Location";

export interface BulkJobFilter {
  resourceTypes?: BulkResourceType[];
  since?: string;
  outputFormat?: "application/fhir+ndjson" | "application/ndjson";
  patientIds?: string[];
}

export interface BulkJobOutput {
  type: string;
  url: string;
  count: number;
}

export interface BulkJob {
  id: string;
  tenantId: string;
  direction: BulkJobDirection;
  status: BulkJobStatus;
  filter: BulkJobFilter;
  outputs: BulkJobOutput[];
  errorMessage?: string;
  requestedBy: string;
  totalResources: number;
  processedResources: number;
  requestedAt: string;
  startedAt?: string;
  completedAt?: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
}

export interface BulkDataDashboardStats {
  totalJobs: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  totalResourcesExported: number;
  totalResourcesImported: number;
}
