/**
 * Device Observation Pipeline -- PG-backed durable observation processing
 *
 * Phase 527 (W38-C6): Bridges the device observation ingest path to the
 * PG-backed device registry. Observations flow through 4 stages:
 *
 *   1. INGEST   -- Raw observation arrives from gateway uplink
 *   2. VALIDATE -- Device exists, patient association active, schema check
 *   3. ENRICH   -- Lookup patient DFN from device association, add metadata
 *   4. PERSIST  -- Write to PG audit log + emit for downstream consumers
 *
 * The pipeline is stateless -- each call processes one observation.
 * State (device registry, associations) is read from PG repos when available,
 * with fallback to in-memory stores.
 *
 * VistA alignment:
 *   - GMRV VITALS (File 120.5): target RPC for vital-type observations
 *   - Equipment Management (File 6914): device identity grounding
 *   - Results from pipeline feed alarm-store.ts for alert evaluation
 */

import type { DeviceObservation } from './types.js';

// -- Pipeline types ---------------------------------------------

export type PipelineStage = 'ingest' | 'validate' | 'enrich' | 'persist';

export interface PipelineResult {
  ok: boolean;
  stage: PipelineStage;
  observation?: DeviceObservation;
  errors: string[];
  enrichments: Record<string, string>;
  durationMs: number;
}

export interface PipelineStats {
  total: number;
  success: number;
  failed: number;
  byStageFailure: Record<PipelineStage, number>;
  lastProcessedAt: string | null;
}

// -- In-memory stats --------------------------------------------

const stats: PipelineStats = {
  total: 0,
  success: 0,
  failed: 0,
  byStageFailure: { ingest: 0, validate: 0, enrich: 0, persist: 0 },
  lastProcessedAt: null,
};

export function getPipelineStats(): PipelineStats {
  return { ...stats };
}

export function resetPipelineStats(): void {
  stats.total = 0;
  stats.success = 0;
  stats.failed = 0;
  stats.byStageFailure = { ingest: 0, validate: 0, enrich: 0, persist: 0 };
  stats.lastProcessedAt = null;
}

// -- Stage implementations --------------------------------------

function stageIngest(obs: Partial<DeviceObservation>): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!obs.id) errors.push('missing observation id');
  if (!obs.deviceId) errors.push('missing deviceId');
  if (!obs.gatewayId) errors.push('missing gatewayId');
  if (!obs.code) errors.push('missing observation code');
  if (!obs.value) errors.push('missing observation value');
  if (!obs.observedAt) errors.push('missing observedAt timestamp');

  return { ok: errors.length === 0, errors };
}

function stageValidate(
  obs: Partial<DeviceObservation>,
  knownDeviceIds: Set<string>,
  activePatientMap: Map<string, string>
): { ok: boolean; errors: string[] } {
  const errors: string[] = [];

  // Device must be registered
  if (obs.deviceId && !knownDeviceIds.has(obs.deviceId)) {
    errors.push(`unknown device: ${obs.deviceId}`);
  }

  // If patient association exists, validate it's active
  if (obs.deviceId && obs.patientId) {
    const expected = activePatientMap.get(obs.deviceId);
    if (expected && expected !== obs.patientId) {
      errors.push(`patient mismatch: expected ${expected}, got ${obs.patientId}`);
    }
  }

  return { ok: errors.length === 0, errors };
}

function stageEnrich(
  obs: Partial<DeviceObservation>,
  activePatientMap: Map<string, string>
): { enrichments: Record<string, string> } {
  const enrichments: Record<string, string> = {};

  // Auto-assign patient from active association if not provided
  if (!obs.patientId && obs.deviceId) {
    const patientDfn = activePatientMap.get(obs.deviceId);
    if (patientDfn) {
      obs.patientId = patientDfn;
      enrichments['patientId'] = patientDfn;
    }
  }

  // Add ingest timestamp if missing
  if (!obs.ingestedAt) {
    obs.ingestedAt = new Date().toISOString();
    enrichments['ingestedAt'] = obs.ingestedAt;
  }

  // Default tenant
  if (!obs.tenantId) {
    obs.tenantId = 'default';
    enrichments['tenantId'] = 'default';
  }

  return { enrichments };
}

// -- Main pipeline entry point ----------------------------------

/**
 * Process a single device observation through the 4-stage pipeline.
 *
 * @param obs - Partial observation from gateway uplink
 * @param knownDeviceIds - Set of registered device IDs (from registry store or PG)
 * @param activePatientMap - Map<deviceId, patientDfn> for active associations
 * @param persistFn - Optional async persist callback (e.g. PG audit log write)
 */
export async function processObservation(
  obs: Partial<DeviceObservation>,
  knownDeviceIds: Set<string>,
  activePatientMap: Map<string, string>,
  persistFn?: (observation: DeviceObservation) => Promise<void>
): Promise<PipelineResult> {
  const start = Date.now();
  stats.total++;

  // Stage 1: Ingest validation
  const ingest = stageIngest(obs);
  if (!ingest.ok) {
    stats.failed++;
    stats.byStageFailure.ingest++;
    return {
      ok: false,
      stage: 'ingest',
      errors: ingest.errors,
      enrichments: {},
      durationMs: Date.now() - start,
    };
  }

  // Stage 2: Business validation
  const validate = stageValidate(obs, knownDeviceIds, activePatientMap);
  if (!validate.ok) {
    stats.failed++;
    stats.byStageFailure.validate++;
    return {
      ok: false,
      stage: 'validate',
      errors: validate.errors,
      enrichments: {},
      durationMs: Date.now() - start,
    };
  }

  // Stage 3: Enrichment
  const { enrichments } = stageEnrich(obs, activePatientMap);

  // Stage 4: Persist
  const observation = obs as DeviceObservation;
  if (persistFn) {
    try {
      await persistFn(observation);
    } catch (err: any) {
      stats.failed++;
      stats.byStageFailure.persist++;
      return {
        ok: false,
        stage: 'persist',
        observation,
        errors: [`persist failed: ${err.message || 'unknown'}`],
        enrichments,
        durationMs: Date.now() - start,
      };
    }
  }

  stats.success++;
  stats.lastProcessedAt = new Date().toISOString();
  return {
    ok: true,
    stage: 'persist',
    observation,
    errors: [],
    enrichments,
    durationMs: Date.now() - start,
  };
}

/**
 * Process a batch of observations. Non-failing obs continue even if some fail.
 */
export async function processObservationBatch(
  observations: Partial<DeviceObservation>[],
  knownDeviceIds: Set<string>,
  activePatientMap: Map<string, string>,
  persistFn?: (observation: DeviceObservation) => Promise<void>
): Promise<{ results: PipelineResult[]; successCount: number; failCount: number }> {
  const results: PipelineResult[] = [];
  let successCount = 0;
  let failCount = 0;

  for (const obs of observations) {
    const result = await processObservation(obs, knownDeviceIds, activePatientMap, persistFn);
    results.push(result);
    if (result.ok) successCount++;
    else failCount++;
  }

  return { results, successCount, failCount };
}
