/**
 * apps/api/src/migration/fhir-import.ts
 *
 * Phase 456 (W30-P1). FHIR R4 Bundle import pipeline.
 * Parses bundles, validates resources, tracks batch status.
 * In-memory store (matches imaging worklist pattern from Phase 23).
 */

import { randomBytes } from 'crypto';
import type {
  FhirBundle,
  FhirResource,
  FhirMigrationBatch,
  FhirMigrationError,
  FhirImportResult,
} from './types.js';

// -- In-memory batch store ------------------------------------------

const batches = new Map<string, FhirMigrationBatch>();

export function getBatch(id: string): FhirMigrationBatch | undefined {
  return batches.get(id);
}

export function listBatches(): FhirMigrationBatch[] {
  return Array.from(batches.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// -- Supported resource types ---------------------------------------

const SUPPORTED_TYPES = new Set([
  'Patient',
  'Condition',
  'MedicationRequest',
  'AllergyIntolerance',
  'Observation',
  'Encounter',
]);

// -- Validation -----------------------------------------------------

function validateResource(resource: FhirResource): FhirMigrationError[] {
  const errors: FhirMigrationError[] = [];
  const rt = resource.resourceType;

  if (!rt) {
    errors.push({ resourceType: 'unknown', message: 'Missing resourceType', severity: 'error' });
    return errors;
  }

  if (!SUPPORTED_TYPES.has(rt)) {
    errors.push({
      resourceType: rt,
      message: `Unsupported resource type: ${rt}`,
      severity: 'warning',
    });
    return errors;
  }

  // Type-specific validation
  switch (rt) {
    case 'Patient': {
      const p = resource as Record<string, unknown>;
      if (!p.name && !p.identifier) {
        errors.push({
          resourceType: rt,
          field: 'name/identifier',
          message: 'Patient needs name or identifier',
          severity: 'error',
        });
      }
      break;
    }
    case 'Condition': {
      const c = resource as Record<string, unknown>;
      if (!c.subject) {
        errors.push({
          resourceType: rt,
          field: 'subject',
          message: 'Condition needs subject reference',
          severity: 'error',
        });
      }
      if (!c.code) {
        errors.push({
          resourceType: rt,
          field: 'code',
          message: 'Condition needs code',
          severity: 'warning',
        });
      }
      break;
    }
    case 'MedicationRequest': {
      const m = resource as Record<string, unknown>;
      if (!m.subject) {
        errors.push({
          resourceType: rt,
          field: 'subject',
          message: 'MedicationRequest needs subject',
          severity: 'error',
        });
      }
      break;
    }
    case 'AllergyIntolerance': {
      const a = resource as Record<string, unknown>;
      if (!a.patient) {
        errors.push({
          resourceType: rt,
          field: 'patient',
          message: 'AllergyIntolerance needs patient reference',
          severity: 'error',
        });
      }
      break;
    }
  }

  return errors;
}

// -- Import pipeline ------------------------------------------------

export function importFhirBundle(bundle: FhirBundle, userId: string): FhirImportResult {
  const batchId = `mig-${randomBytes(8).toString('hex')}`;
  const now = new Date().toISOString();

  const batch: FhirMigrationBatch = {
    id: batchId,
    format: 'fhir-r4',
    status: 'validating',
    createdAt: now,
    updatedAt: now,
    createdBy: userId,
    totalResources: 0,
    importedCount: 0,
    failedCount: 0,
    skippedCount: 0,
    errors: [],
    summary: {},
  };

  // Validate bundle structure
  if (bundle.resourceType !== 'Bundle') {
    batch.status = 'failed';
    batch.errors.push({
      resourceType: 'Bundle',
      message: 'Root resource must be a FHIR Bundle',
      severity: 'error',
    });
    batches.set(batchId, batch);
    return {
      ok: false,
      batchId,
      status: 'failed',
      imported: 0,
      failed: 1,
      skipped: 0,
      errors: batch.errors,
    };
  }

  const entries = bundle.entry || [];
  batch.totalResources = entries.length;

  // Process each entry
  for (const entry of entries) {
    const resource = entry.resource;
    if (!resource) {
      batch.skippedCount++;
      continue;
    }

    const rt = resource.resourceType;
    const validationErrors = validateResource(resource);
    const hasErrors = validationErrors.some((e) => e.severity === 'error');

    if (hasErrors) {
      batch.failedCount++;
      batch.errors.push(...validationErrors);
    } else if (!SUPPORTED_TYPES.has(rt)) {
      batch.skippedCount++;
      batch.errors.push(...validationErrors);
    } else {
      batch.importedCount++;
      batch.summary![rt] = (batch.summary![rt] || 0) + 1;
    }
  }

  // Set final status
  if (batch.failedCount === 0 && batch.importedCount > 0) {
    batch.status = 'completed';
  } else if (batch.importedCount > 0) {
    batch.status = 'partial';
  } else {
    batch.status = 'failed';
  }

  batch.updatedAt = new Date().toISOString();
  batches.set(batchId, batch);

  return {
    ok: batch.status !== 'failed',
    batchId,
    status: batch.status,
    imported: batch.importedCount,
    failed: batch.failedCount,
    skipped: batch.skippedCount,
    errors: batch.errors,
  };
}
