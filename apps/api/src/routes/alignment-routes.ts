/**
 * alignment-routes.ts -- VistA + CPRS Alignment REST endpoints (Phase 161)
 *
 * All routes under /admin/alignment/* require admin auth.
 */

import type { FastifyInstance } from 'fastify';
import {
  captureGoldenSnapshot,
  compareSnapshots,
  listSnapshots,
  getSnapshot,
  deleteSnapshot,
  getSnapshotCount,
  listTripwires,
  registerTripwire,
  enableTripwire,
  deleteTripwire,
  seedDefaultTripwires,
  listTripwireEvents,
  resolveEvent,
  getTripwireStats,
  calculateAlignmentScore,
  runAlignmentGates,
} from '../vista/alignment/index.js';
import type { TripwireCondition } from '../vista/alignment/types.js';

export default async function alignmentRoutes(server: FastifyInstance) {
  /* ── Golden Snapshots ─────────────────────────────────────────── */

  server.get('/admin/alignment/snapshots', async (_req, reply) => {
    const snapshots = listSnapshots();
    return reply.send({ ok: true, snapshots, count: snapshots.length });
  });

  server.post('/admin/alignment/snapshots', async (req, reply) => {
    const body = (req.body as any) || {};
    const name = body.name || `Snapshot ${new Date().toISOString()}`;
    const description = body.description || '';
    const capturedBy = body.capturedBy || 'system';
    const snapshot = captureGoldenSnapshot(name, description, capturedBy);
    return reply.code(201).send({ ok: true, snapshot });
  });

  server.get('/admin/alignment/snapshots/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const snapshot = getSnapshot(id);
    if (!snapshot) return reply.code(404).send({ ok: false, error: 'Snapshot not found' });
    return reply.send({ ok: true, snapshot });
  });

  server.delete('/admin/alignment/snapshots/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = deleteSnapshot(id);
    return reply.send({ ok: deleted, deleted });
  });

  server.post('/admin/alignment/snapshots/compare', async (req, reply) => {
    const body = (req.body as any) || {};
    const { baselineId, currentId } = body;
    if (!baselineId || !currentId) {
      return reply.code(400).send({ ok: false, error: 'baselineId and currentId required' });
    }
    const comparison = compareSnapshots(baselineId, currentId);
    if (!comparison)
      return reply.code(404).send({ ok: false, error: 'One or both snapshots not found' });
    return reply.send({ ok: true, comparison });
  });

  /* ── Tripwires ────────────────────────────────────────────────── */

  server.get('/admin/alignment/tripwires', async (_req, reply) => {
    const tripwires = listTripwires();
    return reply.send({ ok: true, tripwires, count: tripwires.length });
  });

  server.post('/admin/alignment/tripwires', async (req, reply) => {
    const body = (req.body as any) || {};
    const { rpcName, condition, description, threshold } = body;
    if (!rpcName || !condition) {
      return reply.code(400).send({ ok: false, error: 'rpcName and condition required' });
    }
    const tw = registerTripwire(
      rpcName,
      condition as TripwireCondition,
      description || '',
      threshold
    );
    return reply.code(201).send({ ok: true, tripwire: tw });
  });

  server.post('/admin/alignment/tripwires/seed', async (_req, reply) => {
    const seeded = seedDefaultTripwires();
    const tripwires = listTripwires();
    return reply.send({ ok: true, seeded, total: tripwires.length });
  });

  server.put('/admin/alignment/tripwires/:id/toggle', async (req, reply) => {
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const enabled = body.enabled ?? true;
    const ok = enableTripwire(id, enabled);
    return reply.send({ ok });
  });

  server.delete('/admin/alignment/tripwires/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const deleted = deleteTripwire(id);
    return reply.send({ ok: deleted });
  });

  server.get('/admin/alignment/tripwires/events', async (req, reply) => {
    const q = req.query as { limit?: string };
    const limit = parseInt(q.limit || '100', 10);
    const events = listTripwireEvents(limit);
    return reply.send({ ok: true, events, count: events.length });
  });

  server.post('/admin/alignment/tripwires/events/:id/resolve', async (req, reply) => {
    const { id } = req.params as { id: string };
    const ok = resolveEvent(id);
    return reply.send({ ok });
  });

  server.get('/admin/alignment/tripwires/stats', async (_req, reply) => {
    const stats = getTripwireStats();
    return reply.send({ ok: true, stats });
  });

  /* ── Alignment Scoring ────────────────────────────────────────── */

  server.get('/admin/alignment/score', async (_req, reply) => {
    const score = calculateAlignmentScore();
    return reply.send({ ok: true, score });
  });

  server.get('/admin/alignment/gates', async (_req, reply) => {
    const report = runAlignmentGates();
    return reply.send({ ok: true, report });
  });

  /* ── Summary ──────────────────────────────────────────────────── */

  server.get('/admin/alignment/summary', async (_req, reply) => {
    const score = calculateAlignmentScore();
    const report = runAlignmentGates();
    const snapCount = getSnapshotCount();
    const twStats = getTripwireStats();

    return reply.send({
      ok: true,
      summary: {
        globalScore: score.globalScore,
        fullyWiredPanels: score.fullyWiredPanels,
        partiallyWiredPanels: score.partiallyWiredPanels,
        noVistaPanels: score.noVistaPanels,
        registrySize: score.registry.totalRegistered,
        exceptionCount: score.registry.totalExceptions,
        gatesPass: report.passCount,
        gatesFail: report.failCount,
        gatesWarn: report.warnCount,
        overallGateStatus: report.overallStatus,
        snapshotCount: snapCount,
        tripwireStats: twStats,
      },
    });
  });
}
