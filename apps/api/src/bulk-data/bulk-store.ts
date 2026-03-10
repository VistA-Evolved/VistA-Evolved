/**
 * Phase 404 (W23-P6): Bulk Data -- Store
 */

import { randomBytes } from 'crypto';
import type { BulkJob, BulkJobFilter, BulkDataDashboardStats } from './types.js';

const MAX_JOBS = 5_000;

const jobStore = new Map<string, BulkJob>();

function enforceMax<T>(store: Map<string, T>, max: number): void {
  if (store.size >= max) {
    const k = store.keys().next().value;
    if (k) store.delete(k);
  }
}

function genId(prefix: string): string {
  return `${prefix}-${randomBytes(8).toString('hex')}`;
}

// --- Job CRUD ----------------------------------------------

export function createBulkJob(input: {
  tenantId: string;
  direction: 'export' | 'import';
  filter: BulkJobFilter;
  requestedBy: string;
  metadata?: Record<string, unknown>;
}): BulkJob {
  enforceMax(jobStore, MAX_JOBS);
  const now = new Date().toISOString();
  const job: BulkJob = {
    id: genId('bulk'),
    tenantId: input.tenantId,
    direction: input.direction,
    status: 'queued',
    filter: input.filter,
    outputs: [],
    requestedBy: input.requestedBy,
    totalResources: 0,
    processedResources: 0,
    requestedAt: now,
    metadata: input.metadata,
  };
  jobStore.set(job.id, job);
  return job;
}

export function getBulkJob(id: string): BulkJob | undefined {
  return jobStore.get(id);
}

export function listBulkJobs(
  tenantId: string,
  opts?: { direction?: string; status?: string }
): BulkJob[] {
  let results = Array.from(jobStore.values()).filter((j) => j.tenantId === tenantId);
  if (opts?.direction) results = results.filter((j) => j.direction === opts.direction);
  if (opts?.status) results = results.filter((j) => j.status === opts.status);
  return results.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export function updateBulkJob(id: string, patch: Partial<BulkJob>): BulkJob | undefined {
  const rec = jobStore.get(id);
  if (!rec) return undefined;
  const updated = { ...rec, ...patch, id: rec.id, requestedAt: rec.requestedAt };
  jobStore.set(id, updated);
  return updated;
}

export function cancelBulkJob(id: string): BulkJob | undefined {
  const rec = jobStore.get(id);
  if (!rec) return undefined;
  if (rec.status === 'completed' || rec.status === 'failed') return undefined;
  rec.status = 'cancelled';
  rec.completedAt = new Date().toISOString();
  jobStore.set(id, rec);
  return rec;
}

/**
 * Simulate job progression -- in production this would be a background worker.
 * For now, transitions queued -> in-progress -> completed with mock outputs.
 */
export function simulateJobProgress(id: string): BulkJob | undefined {
  const rec = jobStore.get(id);
  if (!rec) return undefined;

  if (rec.status === 'queued') {
    rec.status = 'in-progress';
    rec.startedAt = new Date().toISOString();
    rec.totalResources = Math.floor(Math.random() * 1000) + 10;
  } else if (rec.status === 'in-progress') {
    rec.status = 'completed';
    rec.completedAt = new Date().toISOString();
    rec.processedResources = rec.totalResources;
    const types = rec.filter.resourceTypes || ['Patient'];
    rec.outputs = types.map((t) => ({
      type: t,
      url: `/bulk-data/jobs/${rec.id}/output/${t.toLowerCase()}.ndjson`,
      count: Math.floor(rec.totalResources / types.length),
    }));
    // 6-hour expiry
    rec.expiresAt = new Date(Date.now() + 6 * 60 * 60_000).toISOString();
  }

  jobStore.set(id, rec);
  return rec;
}

// --- Dashboard ---------------------------------------------

export function getBulkDataDashboardStats(tenantId: string): BulkDataDashboardStats {
  const jobs = Array.from(jobStore.values()).filter((j) => j.tenantId === tenantId);
  return {
    totalJobs: jobs.length,
    activeJobs: jobs.filter((j) => j.status === 'queued' || j.status === 'in-progress').length,
    completedJobs: jobs.filter((j) => j.status === 'completed').length,
    failedJobs: jobs.filter((j) => j.status === 'failed').length,
    totalResourcesExported: jobs
      .filter((j) => j.direction === 'export' && j.status === 'completed')
      .reduce((s, j) => s + j.processedResources, 0),
    totalResourcesImported: jobs
      .filter((j) => j.direction === 'import' && j.status === 'completed')
      .reduce((s, j) => s + j.processedResources, 0),
  };
}
