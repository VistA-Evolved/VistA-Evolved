/**
 * queue-cache-regional.ts -- Queue & Cache Regionalization Service
 *
 * Phase 331 (W15-P5)
 *
 * Region-local job queues and cache partitioning. Workers process jobs from
 * their own region. Cache keys are region-prefixed. Failover is idempotent
 * (jobs can be re-queued to another region without duplication).
 */

import { randomUUID } from "node:crypto";

// --- Types ------------------------------------------------------------------

export type JobStatus = "pending" | "processing" | "completed" | "failed" | "dead_letter";
export type JobPriority = "low" | "normal" | "high" | "critical";

export interface RegionalJob {
  id: string;
  region: string;
  tenantId: string;
  queue: string;              // e.g., "edi-submission", "hl7-outbound", "report-gen"
  payload: Record<string, unknown>;
  idempotencyKey: string;     // prevents duplicate processing across failover
  priority: JobPriority;
  status: JobStatus;
  attempts: number;
  maxAttempts: number;
  lastError: string | null;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  workerRegion: string | null;
  workerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RegionalWorker {
  id: string;
  region: string;
  queues: string[];           // queues this worker processes
  status: "active" | "draining" | "offline";
  heartbeatAt: string;
  jobsProcessed: number;
  jobsFailed: number;
  metadata: Record<string, string>;
  registeredAt: string;
}

export interface RegionalCachePartition {
  id: string;
  region: string;
  name: string;               // e.g., "rpc-results", "patient-demographics"
  maxEntries: number;
  currentEntries: number;
  hitRate: number;             // 0-1
  missRate: number;
  evictions: number;
  createdAt: string;
}

export interface QueueMetrics {
  region: string;
  queue: string;
  pending: number;
  processing: number;
  completed: number;
  failed: number;
  deadLetter: number;
  avgProcessingMs: number | null;
  oldestPendingAge: string | null;
}

export interface FailoverTransfer {
  id: string;
  tenantId: string;
  fromRegion: string;
  toRegion: string;
  queue: string;
  jobsTransferred: number;
  duplicatesSkipped: number;
  status: "in_progress" | "completed" | "failed";
  startedAt: string;
  completedAt: string | null;
  actor: string;
}

// --- In-Memory Stores -------------------------------------------------------

const jobStore = new Map<string, RegionalJob>();
const jobsByRegionQueue = new Map<string, Set<string>>();    // `${region}:${queue}` -> job IDs
const idempotencyIndex = new Map<string, string>();           // idempotencyKey -> job ID
const workerStore = new Map<string, RegionalWorker>();
const cachePartitionStore = new Map<string, RegionalCachePartition>();
const transferStore = new Map<string, FailoverTransfer>();

const auditLog: Array<{ ts: string; action: string; actor: string; detail: Record<string, unknown> }> = [];
const MAX_AUDIT = 10_000;

// --- Job Management ---------------------------------------------------------

function regionQueueKey(region: string, queue: string): string {
  return `${region}:${queue}`;
}

export function enqueueJob(input: {
  region: string;
  tenantId: string;
  queue: string;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  priority?: JobPriority;
  maxAttempts?: number;
  scheduledAt?: string;
}, actor: string): RegionalJob {
  const key = input.idempotencyKey || randomUUID();

  // Idempotency check
  const existingId = idempotencyIndex.get(key);
  if (existingId) {
    const existing = jobStore.get(existingId);
    if (existing) return existing; // already queued
  }

  const job: RegionalJob = {
    id: randomUUID(),
    region: input.region,
    tenantId: input.tenantId,
    queue: input.queue,
    payload: input.payload,
    idempotencyKey: key,
    priority: input.priority || "normal",
    status: "pending",
    attempts: 0,
    maxAttempts: input.maxAttempts || 3,
    lastError: null,
    scheduledAt: input.scheduledAt || new Date().toISOString(),
    startedAt: null,
    completedAt: null,
    workerRegion: null,
    workerId: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  jobStore.set(job.id, job);
  idempotencyIndex.set(key, job.id);

  const rqKey = regionQueueKey(job.region, job.queue);
  if (!jobsByRegionQueue.has(rqKey)) jobsByRegionQueue.set(rqKey, new Set());
  jobsByRegionQueue.get(rqKey)!.add(job.id);

  appendAudit("job.enqueued", actor, { jobId: job.id, region: job.region, queue: job.queue, tenant: job.tenantId });
  return job;
}

export function claimJob(
  region: string,
  queue: string,
  workerId: string,
  tenantId?: string
): RegionalJob | null {
  const rqKey = regionQueueKey(region, queue);
  const jobIds = jobsByRegionQueue.get(rqKey);
  if (!jobIds) return null;

  // Priority ordering: critical > high > normal > low
  const PRIORITY_ORDER: Record<JobPriority, number> = { critical: 0, high: 1, normal: 2, low: 3 };
  const pending: RegionalJob[] = [];
  for (const id of jobIds) {
    const job = jobStore.get(id);
    if (!job || job.status !== "pending") continue;
    if (tenantId && job.tenantId !== tenantId) continue;
    pending.push(job);
  }

  if (pending.length === 0) return null;

  pending.sort((a, b) => {
    const pDiff = PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority];
    if (pDiff !== 0) return pDiff;
    return a.scheduledAt.localeCompare(b.scheduledAt);
  });

  const job = pending[0];
  job.status = "processing";
  job.attempts++;
  job.startedAt = new Date().toISOString();
  job.workerRegion = region;
  job.workerId = workerId;
  job.updatedAt = new Date().toISOString();
  jobStore.set(job.id, job);

  return job;
}

export function completeJob(
  jobId: string,
  success: boolean,
  error?: string,
  tenantId?: string
): RegionalJob {
  const job = jobStore.get(jobId);
  if (!job) throw Object.assign(new Error("Job not found"), { statusCode: 404 });
  if (tenantId && job.tenantId !== tenantId) {
    throw Object.assign(new Error("Job not found"), { statusCode: 404 });
  }

  if (success) {
    job.status = "completed";
    job.completedAt = new Date().toISOString();
  } else {
    job.lastError = error || "unknown error";
    if (job.attempts >= job.maxAttempts) {
      job.status = "dead_letter";
    } else {
      job.status = "failed";
    }
  }
  job.updatedAt = new Date().toISOString();
  jobStore.set(jobId, job);
  return job;
}

export function retryJob(jobId: string, actor: string, tenantId?: string): RegionalJob {
  const job = jobStore.get(jobId);
  if (!job) throw Object.assign(new Error("Job not found"), { statusCode: 404 });
  if (tenantId && job.tenantId !== tenantId) {
    throw Object.assign(new Error("Job not found"), { statusCode: 404 });
  }
  if (job.status !== "failed" && job.status !== "dead_letter") {
    throw Object.assign(new Error(`Cannot retry job in status: ${job.status}`), { statusCode: 400 });
  }

  job.status = "pending";
  job.attempts = 0;
  job.lastError = null;
  job.startedAt = null;
  job.completedAt = null;
  job.workerRegion = null;
  job.workerId = null;
  job.updatedAt = new Date().toISOString();
  jobStore.set(jobId, job);
  appendAudit("job.retried", actor, { jobId, queue: job.queue, region: job.region, tenant: job.tenantId });
  return job;
}

export function getJob(id: string): RegionalJob | undefined {
  return jobStore.get(id);
}

export function getJobForTenant(tenantId: string, id: string): RegionalJob | undefined {
  const job = jobStore.get(id);
  if (!job || job.tenantId !== tenantId) return undefined;
  return job;
}

export function listJobs(filters?: {
  region?: string;
  queue?: string;
  status?: JobStatus;
  tenantId?: string;
}, limit = 100): RegionalJob[] {
  let results = Array.from(jobStore.values());
  if (filters?.region) results = results.filter((j) => j.region === filters.region);
  if (filters?.queue) results = results.filter((j) => j.queue === filters.queue);
  if (filters?.status) results = results.filter((j) => j.status === filters.status);
  if (filters?.tenantId) results = results.filter((j) => j.tenantId === filters.tenantId);
  return results.sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, limit);
}

// --- Failover Transfer ------------------------------------------------------

/**
 * Transfer pending/failed jobs from one region to another.
 * Idempotent: uses idempotencyKey to skip already-transferred jobs.
 */
export function transferJobs(input: {
  tenantId: string;
  fromRegion: string;
  toRegion: string;
  queue: string;
}, actor: string): FailoverTransfer {
  const rqKey = regionQueueKey(input.fromRegion, input.queue);
  const jobIds = jobsByRegionQueue.get(rqKey);

  const transfer: FailoverTransfer = {
    id: randomUUID(),
    tenantId: input.tenantId,
    fromRegion: input.fromRegion,
    toRegion: input.toRegion,
    queue: input.queue,
    jobsTransferred: 0,
    duplicatesSkipped: 0,
    status: "in_progress",
    startedAt: new Date().toISOString(),
    completedAt: null,
    actor,
  };

  if (!jobIds || jobIds.size === 0) {
    transfer.status = "completed";
    transfer.completedAt = new Date().toISOString();
    transferStore.set(transfer.id, transfer);
    return transfer;
  }

  for (const jobId of jobIds) {
    const job = jobStore.get(jobId);
    if (!job || (job.status !== "pending" && job.status !== "failed")) continue;
    if (job.tenantId !== input.tenantId) continue;

    // Check if job already exists in target region (duplicate detection)
    const existingMappedId = idempotencyIndex.get(job.idempotencyKey);
    if (existingMappedId) {
      const existingJob = jobStore.get(existingMappedId);
      if (existingJob && existingJob.region === input.toRegion && existingJob.id !== job.id) {
        transfer.duplicatesSkipped++;
        continue;
      }
    }

    // Remove original idempotency entry so re-enqueue can create a new job
    idempotencyIndex.delete(job.idempotencyKey);

    // Re-enqueue in target region (gets a new ID, same idempotency key)
    enqueueJob({
      region: input.toRegion,
      tenantId: job.tenantId,
      queue: job.queue,
      payload: job.payload,
      idempotencyKey: job.idempotencyKey,
      priority: job.priority,
      maxAttempts: job.maxAttempts,
    }, "system");

    // Mark original as dead_letter (transferred)
    job.status = "dead_letter";
    job.lastError = `transferred to ${input.toRegion} (transfer ${transfer.id})`;
    job.updatedAt = new Date().toISOString();
    jobStore.set(jobId, job);

    transfer.jobsTransferred++;
  }

  transfer.status = "completed";
  transfer.completedAt = new Date().toISOString();
  transferStore.set(transfer.id, transfer);
  appendAudit("jobs.transferred", actor, {
    tenant: input.tenantId,
    fromRegion: input.fromRegion,
    toRegion: input.toRegion,
    queue: input.queue,
    transferred: transfer.jobsTransferred,
    skipped: transfer.duplicatesSkipped,
  });
  return transfer;
}

export function listTransfers(tenantId?: string, limit = 50): FailoverTransfer[] {
  let results = Array.from(transferStore.values());
  if (tenantId) results = results.filter((transfer) => transfer.tenantId === tenantId);
  return results
    .sort((a, b) => b.startedAt.localeCompare(a.startedAt))
    .slice(0, limit);
}

// --- Worker Management ------------------------------------------------------

export function registerWorker(input: {
  region: string;
  queues: string[];
  metadata?: Record<string, string>;
}): RegionalWorker {
  const worker: RegionalWorker = {
    id: randomUUID(),
    region: input.region,
    queues: input.queues,
    status: "active",
    heartbeatAt: new Date().toISOString(),
    jobsProcessed: 0,
    jobsFailed: 0,
    metadata: input.metadata || {},
    registeredAt: new Date().toISOString(),
  };
  workerStore.set(worker.id, worker);
  return worker;
}

export function heartbeatWorker(workerId: string): RegionalWorker | undefined {
  const worker = workerStore.get(workerId);
  if (!worker) return undefined;
  worker.heartbeatAt = new Date().toISOString();
  workerStore.set(workerId, worker);
  return worker;
}

export function listWorkers(filters?: { region?: string; status?: string }): RegionalWorker[] {
  let results = Array.from(workerStore.values());
  if (filters?.region) results = results.filter((w) => w.region === filters.region);
  if (filters?.status) results = results.filter((w) => w.status === filters.status);
  return results;
}

// --- Cache Partition Management ---------------------------------------------

export function registerCachePartition(input: {
  region: string;
  name: string;
  maxEntries?: number;
}): RegionalCachePartition {
  const id = `${input.region}:${input.name}`;
  const partition: RegionalCachePartition = {
    id,
    region: input.region,
    name: input.name,
    maxEntries: input.maxEntries || 10_000,
    currentEntries: 0,
    hitRate: 0,
    missRate: 0,
    evictions: 0,
    createdAt: new Date().toISOString(),
  };
  cachePartitionStore.set(id, partition);
  return partition;
}

export function updateCacheStats(
  region: string,
  name: string,
  stats: { currentEntries?: number; hitRate?: number; missRate?: number; evictions?: number },
): RegionalCachePartition | undefined {
  const id = `${region}:${name}`;
  const partition = cachePartitionStore.get(id);
  if (!partition) return undefined;
  // Whitelist only valid stats fields to prevent data corruption
  if (stats.currentEntries !== undefined) partition.currentEntries = stats.currentEntries;
  if (stats.hitRate !== undefined) partition.hitRate = stats.hitRate;
  if (stats.missRate !== undefined) partition.missRate = stats.missRate;
  if (stats.evictions !== undefined) partition.evictions = stats.evictions;
  cachePartitionStore.set(id, partition);
  return partition;
}

export function listCachePartitions(filters?: { region?: string }): RegionalCachePartition[] {
  let results = Array.from(cachePartitionStore.values());
  if (filters?.region) results = results.filter((p) => p.region === filters.region);
  return results.sort((a, b) => a.id.localeCompare(b.id));
}

// --- Queue Metrics ----------------------------------------------------------

export function getQueueMetrics(region?: string, tenantId?: string): QueueMetrics[] {
  const metricsMap = new Map<string, QueueMetrics>();

  for (const job of jobStore.values()) {
    if (region && job.region !== region) continue;
    if (tenantId && job.tenantId !== tenantId) continue;
    const key = `${job.region}:${job.queue}`;
    if (!metricsMap.has(key)) {
      metricsMap.set(key, {
        region: job.region,
        queue: job.queue,
        pending: 0,
        processing: 0,
        completed: 0,
        failed: 0,
        deadLetter: 0,
        avgProcessingMs: null,
        oldestPendingAge: null,
      });
    }
    const m = metricsMap.get(key)!;
    m[job.status === "dead_letter" ? "deadLetter" : job.status]++;
  }

  return Array.from(metricsMap.values()).sort((a, b) => a.region.localeCompare(b.region) || a.queue.localeCompare(b.queue));
}

// --- Summary ----------------------------------------------------------------

export function getRegionalSummary(tenantId?: string): {
  totalJobs: number;
  jobsByStatus: Record<string, number>;
  jobsByRegion: Record<string, number>;
  activeWorkers: number | null;
  cachePartitions: number | null;
  transfers: number | null;
} {
  const jobsByStatus: Record<string, number> = {};
  const jobsByRegion: Record<string, number> = {};
  const scopedJobs = tenantId
    ? Array.from(jobStore.values()).filter((job) => job.tenantId === tenantId)
    : Array.from(jobStore.values());
  for (const j of scopedJobs) {
    jobsByStatus[j.status] = (jobsByStatus[j.status] || 0) + 1;
    jobsByRegion[j.region] = (jobsByRegion[j.region] || 0) + 1;
  }

  let activeWorkers: number | null = null;
  let cachePartitions: number | null = null;
  let transfers: number | null = null;

  if (!tenantId) {
    activeWorkers = 0;
    for (const w of workerStore.values()) if (w.status === "active") activeWorkers++;
    cachePartitions = cachePartitionStore.size;
    transfers = transferStore.size;
  }

  return {
    totalJobs: scopedJobs.length,
    jobsByStatus,
    jobsByRegion,
    activeWorkers,
    cachePartitions,
    transfers,
  };
}

// --- Audit ------------------------------------------------------------------

function appendAudit(action: string, actor: string, detail: Record<string, unknown>): void {
  auditLog.push({ ts: new Date().toISOString(), action, actor, detail });
  if (auditLog.length > MAX_AUDIT) auditLog.splice(0, auditLog.length - MAX_AUDIT);
}

export function getQueueAuditLog(limit = 100, offset = 0, tenantId?: string): typeof auditLog {
  const scoped = tenantId
    ? auditLog.filter((entry) => entry.detail?.tenant === tenantId)
    : auditLog;
  return scoped.slice().reverse().slice(offset, offset + limit);
}
