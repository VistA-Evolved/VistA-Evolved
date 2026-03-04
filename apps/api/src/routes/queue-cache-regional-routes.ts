/**
 * queue-cache-regional-routes.ts -- Queue & Cache Regionalization REST endpoints
 *
 * Phase 331 (W15-P5)
 *
 * 18 endpoints under /platform/queues/, /platform/workers/, /platform/cache/
 */

import { FastifyInstance } from 'fastify';
import {
  enqueueJob,
  claimJob,
  completeJob,
  retryJob,
  getJob,
  listJobs,
  transferJobs,
  listTransfers,
  registerWorker,
  heartbeatWorker,
  listWorkers,
  registerCachePartition,
  updateCacheStats,
  listCachePartitions,
  getQueueMetrics,
  getRegionalSummary,
  getQueueAuditLog,
} from '../services/queue-cache-regional.js';

export default async function queueCacheRegionalRoutes(server: FastifyInstance): Promise<void> {
  // ── Job Endpoints ───────────────────────────────────────────────

  /** POST /platform/queues/enqueue — enqueue a regional job */
  server.post('/platform/queues/enqueue', async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.region || !b.tenantId || !b.queue || !b.payload) {
      return reply
        .code(400)
        .send({ ok: false, error: 'region, tenantId, queue, payload required' });
    }
    const job = enqueueJob(b, 'admin');
    return reply.code(201).send({ ok: true, job });
  });

  /** POST /platform/queues/claim — claim next job from a region/queue */
  server.post('/platform/queues/claim', async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.region || !b.queue || !b.workerId) {
      return reply.code(400).send({ ok: false, error: 'region, queue, workerId required' });
    }
    const job = claimJob(b.region, b.queue, b.workerId);
    if (!job) return reply.code(204).send();
    return { ok: true, job };
  });

  /** POST /platform/queues/complete — mark job completed or failed */
  server.post('/platform/queues/complete', async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.jobId || typeof b.success !== 'boolean') {
      return reply.code(400).send({ ok: false, error: 'jobId, success required' });
    }
    try {
      const job = completeJob(b.jobId, b.success, b.error);
      return { ok: true, job };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** POST /platform/queues/retry — retry a failed/dead_letter job */
  server.post('/platform/queues/retry', async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.jobId) return reply.code(400).send({ ok: false, error: 'jobId required' });
    try {
      const job = retryJob(b.jobId, 'admin');
      return { ok: true, job };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** GET /platform/queues/jobs/:id — get a single job */
  server.get('/platform/queues/jobs/:id', async (request, reply) => {
    const { id } = request.params as any;
    const job = getJob(id);
    if (!job) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, job };
  });

  /** GET /platform/queues/jobs — list jobs with optional filters */
  server.get('/platform/queues/jobs', async (request) => {
    const q = request.query as any;
    const jobs = listJobs(
      {
        region: q.region,
        queue: q.queue,
        status: q.status,
        tenantId: q.tenantId,
      },
      q.limit ? parseInt(q.limit, 10) : 100
    );
    return { ok: true, count: jobs.length, jobs };
  });

  /** GET /platform/queues/metrics — queue metrics per region/queue */
  server.get('/platform/queues/metrics', async (request) => {
    const q = request.query as any;
    const metrics = getQueueMetrics(q.region);
    return { ok: true, metrics };
  });

  // ── Failover Transfer Endpoints ─────────────────────────────────

  /** POST /platform/queues/transfer — transfer jobs between regions */
  server.post('/platform/queues/transfer', async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.fromRegion || !b.toRegion || !b.queue) {
      return reply.code(400).send({ ok: false, error: 'fromRegion, toRegion, queue required' });
    }
    if (b.fromRegion === b.toRegion) {
      return reply.code(400).send({ ok: false, error: 'fromRegion and toRegion must differ' });
    }
    const transfer = transferJobs(b, 'admin');
    return reply.code(201).send({ ok: true, transfer });
  });

  /** GET /platform/queues/transfers — list transfer history */
  server.get('/platform/queues/transfers', async (request) => {
    const q = request.query as any;
    const transfers = listTransfers(q.limit ? parseInt(q.limit, 10) : 50);
    return { ok: true, count: transfers.length, transfers };
  });

  // ── Worker Endpoints ────────────────────────────────────────────

  /** POST /platform/workers/register — register a regional worker */
  server.post('/platform/workers/register', async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.region || !Array.isArray(b.queues) || b.queues.length === 0) {
      return reply.code(400).send({ ok: false, error: 'region, queues[] required' });
    }
    const worker = registerWorker(b);
    return reply.code(201).send({ ok: true, worker });
  });

  /** POST /platform/workers/:id/heartbeat — worker heartbeat */
  server.post('/platform/workers/:id/heartbeat', async (request, reply) => {
    const { id } = request.params as any;
    const worker = heartbeatWorker(id);
    if (!worker) return reply.code(404).send({ ok: false, error: 'worker not found' });
    return { ok: true, worker };
  });

  /** GET /platform/workers — list workers */
  server.get('/platform/workers', async (request) => {
    const q = request.query as any;
    const workers = listWorkers({ region: q.region, status: q.status });
    return { ok: true, count: workers.length, workers };
  });

  // ── Cache Partition Endpoints ───────────────────────────────────

  /** POST /platform/cache/partitions — register a cache partition */
  server.post('/platform/cache/partitions', async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.region || !b.name) {
      return reply.code(400).send({ ok: false, error: 'region, name required' });
    }
    const partition = registerCachePartition(b);
    return reply.code(201).send({ ok: true, partition });
  });

  /** PUT /platform/cache/partitions/:region/:name/stats — update cache stats */
  server.put('/platform/cache/partitions/:region/:name/stats', async (request, reply) => {
    const { region, name } = request.params as any;
    const b = (request.body as any) || {};
    const partition = updateCacheStats(region, name, b);
    if (!partition) return reply.code(404).send({ ok: false, error: 'partition not found' });
    return { ok: true, partition };
  });

  /** GET /platform/cache/partitions — list cache partitions */
  server.get('/platform/cache/partitions', async (request) => {
    const q = request.query as any;
    const partitions = listCachePartitions({ region: q.region });
    return { ok: true, count: partitions.length, partitions };
  });

  // ── Summary + Audit ─────────────────────────────────────────────

  /** GET /platform/queues/summary — regional summary */
  server.get('/platform/queues/summary', async () => {
    return { ok: true, summary: getRegionalSummary() };
  });

  /** GET /platform/queues/audit — queue audit log */
  server.get('/platform/queues/audit', async (request) => {
    const q = request.query as any;
    const limit = q.limit ? parseInt(q.limit, 10) : 100;
    const offset = q.offset ? parseInt(q.offset, 10) : 0;
    const entries = getQueueAuditLog(limit, offset);
    return { ok: true, count: entries.length, entries };
  });
}
