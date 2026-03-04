/**
 * export-pipeline.ts -- Export Pipeline (Phase 50)
 *
 * Generates patient summary bundles and audit exports.
 * Supports encrypted JSON export for PHI safety.
 *
 * Design:
 *   - Patient summaries aggregate VistA data via existing RPC layer
 *   - Audit exports use the immutable audit API
 *   - Encryption uses AES-256-GCM with a configurable key
 *   - Export files are Base64-encoded in the job result
 */

import { randomBytes, createCipheriv, createHash } from 'node:crypto';
import type { ExportResult } from './types.js';
import { getJob, updateJob, transitionJob } from './migration-store.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const EXPORT_ENCRYPTION_KEY = process.env.MIGRATION_EXPORT_KEY ?? '';
const ENCRYPTION_ALGO = 'aes-256-gcm';

/* ------------------------------------------------------------------ */
/* Patient summary builder                                             */
/* ------------------------------------------------------------------ */

interface PatientSummaryOptions {
  dfn?: string;
  includeAllergies?: boolean;
  includeProblems?: boolean;
  includeMedications?: boolean;
  includeNotes?: boolean;
  includeVitals?: boolean;
}

/**
 * Build a patient summary export bundle.
 * In sandbox mode, returns a structured placeholder.
 * Production would call VistA RPCs to gather real data.
 */
function buildPatientSummary(options: PatientSummaryOptions): Record<string, unknown> {
  return {
    resourceType: 'Bundle',
    type: 'document',
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'VistA-Evolved',
      version: 'phase-50',
    },
    patient: {
      dfn: options.dfn ?? 'unknown',
      note: 'Production implementation would aggregate VistA RPC data here',
    },
    sections: {
      allergies: options.includeAllergies
        ? { status: 'integration-pending', targetRpc: 'ORQQAL LIST' }
        : undefined,
      problems: options.includeProblems
        ? { status: 'integration-pending', targetRpc: 'ORQQPL LIST' }
        : undefined,
      medications: options.includeMedications
        ? { status: 'integration-pending', targetRpc: 'ORWPS ACTIVE' }
        : undefined,
      notes: options.includeNotes
        ? { status: 'integration-pending', targetRpc: 'TIU DOCUMENTS BY CONTEXT' }
        : undefined,
      vitals: options.includeVitals
        ? { status: 'integration-pending', targetRpc: 'GMV V/M ALLDATA' }
        : undefined,
    },
  };
}

/**
 * Build an audit export bundle.
 * Exports from the immutable audit trail (in-memory ring buffer).
 */
function buildAuditExport(params?: {
  startDate?: string;
  endDate?: string;
  actions?: string[];
}): Record<string, unknown> {
  return {
    resourceType: 'AuditExport',
    meta: {
      generatedAt: new Date().toISOString(),
      source: 'VistA-Evolved',
      version: 'phase-50',
      filters: {
        startDate: params?.startDate,
        endDate: params?.endDate,
        actions: params?.actions,
      },
    },
    note: 'Production implementation queries immutable-audit store. Sandbox returns this placeholder.',
    entries: [],
  };
}

/* ------------------------------------------------------------------ */
/* Encryption                                                          */
/* ------------------------------------------------------------------ */

/**
 * Encrypt a JSON string with AES-256-GCM.
 * Returns Base64-encoded ciphertext with IV + auth tag prepended.
 */
function encryptData(plaintext: string, key: string): { encrypted: string; keyId: string } {
  // Derive a 32-byte key from the passphrase
  const derivedKey = createHash('sha256').update(key).digest();
  const iv = randomBytes(12); // 96-bit IV for GCM
  const cipher = createCipheriv(ENCRYPTION_ALGO, derivedKey, iv);

  let ciphertext = cipher.update(plaintext, 'utf8');
  ciphertext = Buffer.concat([ciphertext, cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: IV (12) + authTag (16) + ciphertext
  const combined = Buffer.concat([iv, authTag, ciphertext]);

  return {
    encrypted: combined.toString('base64'),
    keyId: createHash('sha256').update(key).digest('hex').substring(0, 16),
  };
}

/* ------------------------------------------------------------------ */
/* Export orchestrator                                                  */
/* ------------------------------------------------------------------ */

export interface ExportOptions {
  dfn?: string;
  encrypt?: boolean;
  format?: 'json' | 'csv';
  startDate?: string;
  endDate?: string;
  actions?: string[];
  includeAllergies?: boolean;
  includeProblems?: boolean;
  includeMedications?: boolean;
  includeNotes?: boolean;
  includeVitals?: boolean;
}

/**
 * Run the export pipeline for a job.
 * Transitions: validated → exporting → exported | export-failed
 */
export function runExport(
  jobId: string,
  options?: ExportOptions
): { ok: boolean; result?: ExportResult; error?: string } {
  const job = getJob(jobId);
  if (!job) return { ok: false, error: 'Job not found' };
  if (job.direction !== 'export') return { ok: false, error: 'Job is not an export job' };

  const t1 = transitionJob(jobId, 'exporting');
  if (!t1.ok) return { ok: false, error: t1.error };

  try {
    let data: Record<string, unknown>;
    let recordCount = 0;

    switch (job.bundleType) {
      case 'patient-summary':
        data = buildPatientSummary({
          dfn: options?.dfn,
          includeAllergies: options?.includeAllergies ?? true,
          includeProblems: options?.includeProblems ?? true,
          includeMedications: options?.includeMedications ?? true,
          includeNotes: options?.includeNotes ?? true,
          includeVitals: options?.includeVitals ?? true,
        });
        recordCount = 1;
        break;

      case 'audit-export':
        data = buildAuditExport({
          startDate: options?.startDate,
          endDate: options?.endDate,
          actions: options?.actions,
        });
        recordCount = (data.entries as any[])?.length ?? 0;
        break;

      case 'clinical-data':
        data = {
          resourceType: 'ClinicalDataExport',
          meta: { generatedAt: new Date().toISOString(), source: 'VistA-Evolved' },
          note: 'Clinical data export -- production would aggregate multiple domains',
        };
        recordCount = 0;
        break;

      default:
        transitionJob(jobId, 'export-failed');
        updateJob(jobId, { error: `Unknown bundle type: ${job.bundleType}` });
        return { ok: false, error: `Unknown bundle type: ${job.bundleType}` };
    }

    const jsonStr = JSON.stringify(data, null, 2);
    const shouldEncrypt = options?.encrypt && EXPORT_ENCRYPTION_KEY;

    let resultData: string;
    let encrypted = false;
    let encryptionMeta: ExportResult['encryptionMeta'];

    if (shouldEncrypt) {
      const enc = encryptData(jsonStr, EXPORT_ENCRYPTION_KEY);
      resultData = enc.encrypted;
      encrypted = true;
      encryptionMeta = {
        algorithm: ENCRYPTION_ALGO,
        keyId: enc.keyId,
      };
    } else {
      resultData = Buffer.from(jsonStr).toString('base64');
    }

    const fileName = `${job.bundleType}-${job.id}-${Date.now()}.${encrypted ? 'enc.json' : 'json'}`;

    const exportResult: ExportResult = {
      format: encrypted ? 'encrypted-json' : 'json',
      fileName,
      recordCount,
      generatedAt: new Date().toISOString(),
      data: resultData,
      encrypted,
      encryptionMeta,
    };

    transitionJob(jobId, 'exported');
    updateJob(jobId, { exportResult });

    log.info('Migration export complete', {
      jobId,
      bundleType: job.bundleType,
      encrypted,
      recordCount,
    });

    return { ok: true, result: exportResult };
  } catch (err: any) {
    transitionJob(jobId, 'export-failed');
    updateJob(jobId, { error: err.message });
    return { ok: false, error: err.message };
  }
}
