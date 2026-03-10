/**
 * import-pipeline.ts -- Import Pipeline (Phase 50)
 *
 * Orchestrates the import flow: parse -> validate -> dry-run -> import.
 * Works with the mapping engine and migration store.
 *
 * All domain writes go through VistA-Evolved's existing write-back
 * endpoints (or in-memory simulation for sandbox).
 */

import type {
  MigrationJob,
  ImportResult,
  ImportRowResult,
  DryRunResult,
  DryRunRowResult,
  FieldMapping,
  ValidationResult,
} from './types.js';
import { parseCsv, validateData, mapRow, mergeFieldMappings } from './mapping-engine.js';
import {
  getJob,
  updateJob,
  transitionJob,
  getTemplate,
  saveRollbackPlan,
} from './migration-store.js';
import { log } from '../lib/logger.js';
import { safeErr } from '../lib/safe-error.js';

/* ------------------------------------------------------------------ */
/* Validate step                                                       */
/* ------------------------------------------------------------------ */

/**
 * Parse and validate the uploaded CSV against the job's mapping template.
 * Transitions: created -> validating -> validated | validation-failed
 */
export function runValidation(jobId: string): {
  ok: boolean;
  validation?: ValidationResult;
  error?: string;
} {
  const job = getJob(jobId);
  if (!job) return { ok: false, error: 'Job not found' };
  if (!job.rawData) return { ok: false, error: 'No data uploaded' };

  // Transition to validating
  const t1 = transitionJob(jobId, 'validating');
  if (!t1.ok) return { ok: false, error: t1.error };

  try {
    // Get mapping fields
    const fields = resolveFields(job);
    if (!fields.length) {
      transitionJob(jobId, 'validation-failed');
      updateJob(jobId, { error: 'No mapping template or fields configured' });
      return { ok: false, error: 'No mapping template or fields configured' };
    }

    // Parse CSV
    const { headers, rows } = parseCsv(job.rawData);
    if (rows.length === 0) {
      transitionJob(jobId, 'validation-failed');
      updateJob(jobId, { error: 'CSV has no data rows' });
      return { ok: false, error: 'CSV has no data rows' };
    }

    // Validate
    const validation = validateData(headers, rows, fields);

    if (validation.valid) {
      transitionJob(jobId, 'validated');
    } else {
      transitionJob(jobId, 'validation-failed');
    }

    updateJob(jobId, { validation });

    log.info('Migration validation complete', {
      jobId,
      valid: validation.valid,
      totalRows: validation.totalRows,
      errorCount: validation.errorCount,
    });

    return { ok: true, validation };
  } catch (err: any) {
    transitionJob(jobId, 'validation-failed');
    updateJob(jobId, { error: err.message });
    return { ok: false, error: safeErr(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Dry-run step                                                        */
/* ------------------------------------------------------------------ */

/**
 * Simulate the import without writing to any store.
 * Transitions: validated -> dry-run -> dry-run-complete
 */
export function runDryRun(jobId: string): {
  ok: boolean;
  dryRun?: DryRunResult;
  error?: string;
} {
  const job = getJob(jobId);
  if (!job) return { ok: false, error: 'Job not found' };
  if (!job.rawData) return { ok: false, error: 'No data uploaded' };

  const t1 = transitionJob(jobId, 'dry-run');
  if (!t1.ok) return { ok: false, error: t1.error };

  try {
    const fields = resolveFields(job);
    const { rows } = parseCsv(job.rawData);

    const dryRunRows: DryRunRowResult[] = [];
    let createCount = 0;
    let updateCount = 0;
    let skipCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const mapped = mapRow(rows[i], fields);
      // In sandbox, all are "create" (no duplicate detection yet)
      // Future: check existing records by key fields
      const hasRequiredFields = fields
        .filter((f) => f.required)
        .every((f) => {
          const val = mapped[f.target];
          return val !== undefined && val !== '';
        });

      if (!hasRequiredFields) {
        dryRunRows.push({
          row: i + 1,
          action: 'skip',
          reason: 'Missing required fields',
          mapped,
        });
        skipCount++;
      } else {
        dryRunRows.push({
          row: i + 1,
          action: 'create',
          mapped,
        });
        createCount++;
      }
    }

    const dryRunResult: DryRunResult = {
      totalRows: rows.length,
      createCount,
      updateCount,
      skipCount,
      rows: dryRunRows,
    };

    transitionJob(jobId, 'dry-run-complete');
    updateJob(jobId, { dryRunResult });

    log.info('Migration dry-run complete', {
      jobId,
      totalRows: rows.length,
      createCount,
      skipCount,
    });

    return { ok: true, dryRun: dryRunResult };
  } catch (err: any) {
    // dry-run can't fail to a specific state, revert to validated
    updateJob(jobId, { error: err.message, status: 'validated' });
    return { ok: false, error: safeErr(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Import step (sandbox: in-memory simulation)                         */
/* ------------------------------------------------------------------ */

/**
 * Execute the actual import. In sandbox mode, this simulates record
 * creation. Production would call VistA write-back RPCs.
 *
 * Transitions: validated|dry-run-complete -> importing -> imported | import-failed
 */
export function runImport(jobId: string): {
  ok: boolean;
  result?: ImportResult;
  error?: string;
} {
  const job = getJob(jobId);
  if (!job) return { ok: false, error: 'Job not found' };
  if (!job.rawData) return { ok: false, error: 'No data uploaded' };

  const t1 = transitionJob(jobId, 'importing');
  if (!t1.ok) return { ok: false, error: t1.error };

  try {
    const fields = resolveFields(job);
    const { rows } = parseCsv(job.rawData);

    const importRows: ImportRowResult[] = [];
    const createdEntities: { entityType: any; entityId: string }[] = [];
    let successCount = 0;
    let failureCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < rows.length; i++) {
      const mapped = mapRow(rows[i], fields);

      const hasRequiredFields = fields
        .filter((f) => f.required)
        .every((f) => {
          const val = mapped[f.target];
          return val !== undefined && val !== '';
        });

      if (!hasRequiredFields) {
        importRows.push({
          row: i + 1,
          success: false,
          action: 'skipped',
          error: 'Missing required fields',
        });
        skippedCount++;
        continue;
      }

      // Sandbox: simulate creation with generated ID
      const entityId = `sim-${job.entityType ?? 'record'}-${i + 1}`;
      importRows.push({
        row: i + 1,
        success: true,
        action: 'created',
        entityId,
      });
      successCount++;

      if (job.entityType) {
        createdEntities.push({ entityType: job.entityType, entityId });
      }

      // Update progress
      updateJob(jobId, {
        progress: { current: i + 1, total: rows.length, phase: 'importing' },
      });
    }

    const importResult: ImportResult = {
      totalRows: rows.length,
      successCount,
      failureCount,
      skippedCount,
      rows: importRows,
      rollbackAvailable: createdEntities.length > 0,
    };

    // Save rollback plan
    if (createdEntities.length > 0) {
      saveRollbackPlan({
        jobId,
        createdEntities,
        canRollback: true,
        reason: 'Sandbox import -- simulated entities can be marked rolled back',
      });
    }

    transitionJob(jobId, 'imported');
    updateJob(jobId, { importResult, progress: undefined });

    log.info('Migration import complete', {
      jobId,
      successCount,
      failureCount,
      skippedCount,
    });

    return { ok: true, result: importResult };
  } catch (err: any) {
    transitionJob(jobId, 'import-failed');
    updateJob(jobId, { error: err.message, progress: undefined });
    return { ok: false, error: safeErr(err) };
  }
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function resolveFields(job: MigrationJob): FieldMapping[] {
  let baseFields: FieldMapping[] = [];

  if (job.templateId) {
    const tpl = getTemplate(job.templateId);
    if (tpl) baseFields = tpl.fields;
  }

  return mergeFieldMappings(baseFields, job.mappingOverrides);
}
