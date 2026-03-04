/**
 * dr-gameday-routes.ts -- Multi-Region DR & GameDay REST endpoints
 *
 * Phase 333 (W15-P7)
 *
 * 20 endpoints under /platform/dr/
 */

import { FastifyInstance } from 'fastify';
import {
  createScenario,
  getScenario,
  listScenarios,
  scheduleDrill,
  startDrill,
  advanceDrillStep,
  completeDrill,
  addDrillFinding,
  cancelDrill,
  getDrill,
  listDrills,
  generateEvidencePack,
  getEvidencePack,
  listEvidencePacks,
  createSchedule,
  listSchedules,
  toggleSchedule,
  getDrSummary,
  getDrAuditLog,
} from '../services/dr-gameday.js';

export default async function drGamedayRoutes(server: FastifyInstance): Promise<void> {
  // ── Scenarios ───────────────────────────────────────────────────

  /** POST /platform/dr/scenarios — create a GameDay scenario */
  server.post('/platform/dr/scenarios', async (request, reply) => {
    const b = (request.body as any) || {};
    if (
      !b.name ||
      !b.description ||
      !Array.isArray(b.drillTypes) ||
      !Array.isArray(b.targetRegions)
    ) {
      return reply
        .code(400)
        .send({ ok: false, error: 'name, description, drillTypes[], targetRegions[] required' });
    }
    const scenario = createScenario(b);
    return reply.code(201).send({ ok: true, scenario });
  });

  /** GET /platform/dr/scenarios/:id — get a scenario */
  server.get('/platform/dr/scenarios/:id', async (request, reply) => {
    const { id } = request.params as any;
    const scenario = getScenario(id);
    if (!scenario) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, scenario };
  });

  /** GET /platform/dr/scenarios — list scenarios */
  server.get('/platform/dr/scenarios', async () => {
    const scenarios = listScenarios();
    return { ok: true, count: scenarios.length, scenarios };
  });

  // ── Drills ──────────────────────────────────────────────────────

  /** POST /platform/dr/drills -- schedule a DR drill */
  server.post('/platform/dr/drills', async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.name || !b.type || !b.primaryRegion || !b.failoverRegion) {
      return reply
        .code(400)
        .send({ ok: false, error: 'name, type, primaryRegion, failoverRegion required' });
    }
    const validTypes = ['failover', 'switchback', 'full_cycle', 'tabletop', 'chaos'];
    if (!validTypes.includes(b.type)) {
      return reply
        .code(400)
        .send({ ok: false, error: `Invalid drill type. Must be one of: ${validTypes.join(', ')}` });
    }
    const drill = scheduleDrill(b, 'admin');
    return reply.code(201).send({ ok: true, drill });
  });

  /** POST /platform/dr/drills/:id/start — start a scheduled drill */
  server.post('/platform/dr/drills/:id/start', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const drill = startDrill(id, 'admin');
      return { ok: true, drill };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** POST /platform/dr/drills/:id/steps/:seq — advance a drill step */
  server.post('/platform/dr/drills/:id/steps/:seq', async (request, reply) => {
    const { id, seq } = request.params as any;
    const b = (request.body as any) || {};
    if (!b.status) return reply.code(400).send({ ok: false, error: 'status required' });
    try {
      const drill = advanceDrillStep(id, parseInt(seq, 10), b, 'admin');
      return { ok: true, drill };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** POST /platform/dr/drills/:id/complete — complete a drill */
  server.post('/platform/dr/drills/:id/complete', async (request, reply) => {
    const { id } = request.params as any;
    const b = (request.body as any) || {};
    try {
      const drill = completeDrill(id, b, 'admin');
      return { ok: true, drill };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** POST /platform/dr/drills/:id/findings — add a drill finding */
  server.post('/platform/dr/drills/:id/findings', async (request, reply) => {
    const { id } = request.params as any;
    const b = (request.body as any) || {};
    if (!b.severity || !b.category || !b.description || !b.recommendation) {
      return reply
        .code(400)
        .send({ ok: false, error: 'severity, category, description, recommendation required' });
    }
    const validSeverities = ['low', 'medium', 'high', 'critical'];
    if (!validSeverities.includes(b.severity)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid severity. Must be one of: ${validSeverities.join(', ')}`,
      });
    }
    try {
      const drill = addDrillFinding(id, b, 'admin');
      return { ok: true, drill };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** POST /platform/dr/drills/:id/cancel — cancel a drill */
  server.post('/platform/dr/drills/:id/cancel', async (request, reply) => {
    const { id } = request.params as any;
    try {
      const drill = cancelDrill(id, 'admin');
      return { ok: true, drill };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** GET /platform/dr/drills/:id — get a drill */
  server.get('/platform/dr/drills/:id', async (request, reply) => {
    const { id } = request.params as any;
    const drill = getDrill(id);
    if (!drill) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, drill };
  });

  /** GET /platform/dr/drills — list drills */
  server.get('/platform/dr/drills', async (request) => {
    const q = request.query as any;
    const drills = listDrills(
      {
        type: q.type,
        status: q.status,
        region: q.region,
      },
      q.limit ? parseInt(q.limit, 10) : 50
    );
    return { ok: true, count: drills.length, drills };
  });

  // ── Evidence Packs ──────────────────────────────────────────────

  /** POST /platform/dr/evidence — generate an evidence pack */
  server.post('/platform/dr/evidence', async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.drillId) return reply.code(400).send({ ok: false, error: 'drillId required' });
    try {
      const pack = generateEvidencePack(b.drillId, b.frameworks);
      return reply.code(201).send({ ok: true, evidencePack: pack });
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** GET /platform/dr/evidence/:id — get an evidence pack */
  server.get('/platform/dr/evidence/:id', async (request, reply) => {
    const { id } = request.params as any;
    const pack = getEvidencePack(id);
    if (!pack) return reply.code(404).send({ ok: false, error: 'not found' });
    return { ok: true, evidencePack: pack };
  });

  /** GET /platform/dr/evidence — list evidence packs */
  server.get('/platform/dr/evidence', async (request) => {
    const q = request.query as any;
    const packs = listEvidencePacks(q.drillId);
    return { ok: true, count: packs.length, evidencePacks: packs };
  });

  // ── Schedules ───────────────────────────────────────────────────

  /** POST /platform/dr/schedules — create a DR drill schedule */
  server.post('/platform/dr/schedules', async (request, reply) => {
    const b = (request.body as any) || {};
    if (!b.scenarioId || !b.cronExpression) {
      return reply.code(400).send({ ok: false, error: 'scenarioId, cronExpression required' });
    }
    try {
      const schedule = createSchedule(b);
      return reply.code(201).send({ ok: true, schedule });
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  /** GET /platform/dr/schedules — list schedules */
  server.get('/platform/dr/schedules', async () => {
    const schedules = listSchedules();
    return { ok: true, count: schedules.length, schedules };
  });

  /** PUT /platform/dr/schedules/:id/toggle — enable/disable a schedule */
  server.put('/platform/dr/schedules/:id/toggle', async (request, reply) => {
    const { id } = request.params as any;
    const b = (request.body as any) || {};
    if (typeof b.enabled !== 'boolean') {
      return reply.code(400).send({ ok: false, error: 'enabled (boolean) required' });
    }
    try {
      const schedule = toggleSchedule(id, b.enabled);
      return { ok: true, schedule };
    } catch (e: any) {
      return reply.code(e.statusCode || 500).send({ ok: false, error: e.message });
    }
  });

  // ── Summary + Audit ─────────────────────────────────────────────

  /** GET /platform/dr/summary — DR overall summary */
  server.get('/platform/dr/summary', async () => {
    return { ok: true, summary: getDrSummary() };
  });

  /** GET /platform/dr/audit — DR audit log */
  server.get('/platform/dr/audit', async (request) => {
    const q = request.query as any;
    const limit = q.limit ? parseInt(q.limit, 10) : 100;
    const offset = q.offset ? parseInt(q.offset, 10) : 0;
    const entries = getDrAuditLog(limit, offset);
    return { ok: true, count: entries.length, entries };
  });
}
