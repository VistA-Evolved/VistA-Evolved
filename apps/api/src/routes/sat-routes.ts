/**
 * SAT (Site Acceptance Test) + Degraded Mode Routes — Phase 265 (Wave 8 P9)
 *
 * Endpoints for pilot hospital go-live acceptance testing and
 * runtime degradation monitoring.
 *
 * All routes under /admin/pilot/sat/* and /admin/pilot/degraded-mode/*
 * — admin-only via AUTH_RULES.
 */
import type { FastifyInstance } from 'fastify';
import {
  startSatRun,
  getSatRun,
  listSatRuns,
  deleteSatRun,
  recordScenarioResult,
  getSatScenarios,
  exportSatEvidence,
  reportDegradation,
  resolveDegradation,
  getDegradedModeStatus,
  DEFAULT_SAT_SCENARIOS,
} from '../pilot/sat-suite.js';

export async function satRoutes(app: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // SAT Scenarios (read-only catalog)
  // -----------------------------------------------------------------------

  app.get('/admin/pilot/sat/scenarios', async (_req, reply) => {
    return reply.send({
      ok: true,
      scenarios: getSatScenarios(),
      count: DEFAULT_SAT_SCENARIOS.length,
      categories: [...new Set(DEFAULT_SAT_SCENARIOS.map((s) => s.category))],
    });
  });

  // -----------------------------------------------------------------------
  // SAT Runs — CRUD + execute
  // -----------------------------------------------------------------------

  app.post('/admin/pilot/sat/runs', async (req, reply) => {
    const body = (req.body as any) || {};
    const { siteId, tenantId, scenarioIds } = body;
    if (!siteId || !tenantId) {
      return reply.code(400).send({ ok: false, error: 'siteId and tenantId required' });
    }

    try {
      const executedBy = (req as any).session?.duz || 'system';
      const run = startSatRun(siteId, tenantId, executedBy, scenarioIds);
      return reply.code(201).send({ ok: true, run });
    } catch (_err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: 'Failed to start SAT run',
      });
    }
  });

  app.get('/admin/pilot/sat/runs', async (req, reply) => {
    const siteId = (req.query as any)?.siteId;
    const runs = listSatRuns(siteId);
    return reply.send({ ok: true, runs, count: runs.length });
  });

  app.get('/admin/pilot/sat/runs/:id', async (req, reply) => {
    const { id } = req.params as any;
    const run = getSatRun(id);
    if (!run) return reply.code(404).send({ ok: false, error: 'SAT run not found' });
    return reply.send({ ok: true, run });
  });

  app.delete('/admin/pilot/sat/runs/:id', async (req, reply) => {
    const { id } = req.params as any;
    const deleted = deleteSatRun(id);
    if (!deleted) return reply.code(404).send({ ok: false, error: 'SAT run not found' });
    return reply.send({ ok: true, deleted: true });
  });

  // -----------------------------------------------------------------------
  // SAT Scenario result recording (manual override)
  // -----------------------------------------------------------------------

  app.post('/admin/pilot/sat/runs/:id/results', async (req, reply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { scenarioId, status, detail, evidence } = body;

    const validStatuses = ['pass', 'fail', 'skip'];
    if (!scenarioId || !status) {
      return reply.code(400).send({ ok: false, error: 'scenarioId and status required' });
    }
    if (!validStatuses.includes(status)) {
      return reply
        .code(400)
        .send({ ok: false, error: `status must be one of: ${validStatuses.join(', ')}` });
    }

    try {
      const run = recordScenarioResult(id, scenarioId, status, detail || '', evidence);
      if (!run) return reply.code(404).send({ ok: false, error: 'Run or scenario not found' });
      return reply.send({ ok: true, run });
    } catch (_err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: 'Failed to record scenario result',
      });
    }
  });

  // -----------------------------------------------------------------------
  // SAT Evidence export
  // -----------------------------------------------------------------------

  app.get('/admin/pilot/sat/runs/:id/evidence', async (req, reply) => {
    const { id } = req.params as any;
    const evidence = exportSatEvidence(id);
    if (!evidence) return reply.code(404).send({ ok: false, error: 'SAT run not found' });
    return reply.send({ ok: true, evidence });
  });

  // -----------------------------------------------------------------------
  // Degraded Mode monitoring
  // -----------------------------------------------------------------------

  app.get('/admin/pilot/degraded-mode', async (_req, reply) => {
    const status = getDegradedModeStatus();
    return reply.send({ ok: true, ...status });
  });

  app.post('/admin/pilot/degraded-mode/report', async (req, reply) => {
    const body = (req.body as any) || {};
    const { source, level, message } = body;
    const validSources = [
      'vista-rpc',
      'database',
      'oidc',
      'imaging',
      'hl7-engine',
      'payer-connector',
      'audit-shipping',
      'analytics',
    ];
    const validLevels = ['normal', 'degraded', 'critical', 'offline'];
    if (!source || !level || !message) {
      return reply.code(400).send({ ok: false, error: 'source, level, message required' });
    }
    if (!validSources.includes(source)) {
      return reply
        .code(400)
        .send({ ok: false, error: `source must be one of: ${validSources.join(', ')}` });
    }
    if (!validLevels.includes(level)) {
      return reply
        .code(400)
        .send({ ok: false, error: `level must be one of: ${validLevels.join(', ')}` });
    }

    try {
      const event = reportDegradation(source, level, message);
      return reply.code(201).send({ ok: true, event });
    } catch (_err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: 'Failed to report degradation',
      });
    }
  });

  app.post('/admin/pilot/degraded-mode/resolve/:eventId', async (req, reply) => {
    const { eventId } = req.params as any;
    try {
      const event = resolveDegradation(eventId);
      if (!event) return reply.code(404).send({ ok: false, error: 'Degradation event not found' });
      return reply.send({ ok: true, event });
    } catch (_err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: 'Failed to resolve degradation',
      });
    }
  });

  // -----------------------------------------------------------------------
  // Hardening summary (aggregates pilot + posture + degraded mode)
  // -----------------------------------------------------------------------

  app.get('/admin/pilot/hardening-summary', async (_req, reply) => {
    const degradedStatus = getDegradedModeStatus();
    const runs = listSatRuns();
    const latestRun = runs.length > 0 ? runs[runs.length - 1] : null;

    return reply.send({
      ok: true,
      degradedMode: {
        overallLevel: degradedStatus.overallLevel,
        activeEventCount: degradedStatus.activeEvents.length,
        mitigationsActive: degradedStatus.mitigations.filter((m) => m.isActive).length,
      },
      latestSatRun: latestRun
        ? {
            id: latestRun.id,
            siteId: latestRun.siteId,
            verdict: latestRun.summary.verdict,
            overallScore: latestRun.summary.overallScore,
            completedAt: latestRun.completedAt,
          }
        : null,
      totalSatRuns: runs.length,
      defaultMitigations: degradedStatus.mitigations.length,
    });
  });
}
