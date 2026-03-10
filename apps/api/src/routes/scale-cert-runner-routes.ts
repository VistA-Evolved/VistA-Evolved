/**
 * Phase 336 (W15-P10): Scale Certification Runner Routes
 *
 * REST endpoints for running certification, managing profiles/schedules,
 * viewing trends/badges, and querying the gate catalog.
 */
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { requireRole, requireSession } from '../auth/auth-routes.js';
import {
  runCertification,
  getCertRunForTenant,
  listCertRuns,
  getLatestCertRun,
  createCertProfile,
  listCertProfiles,
  getCertProfile,
  createCertSchedule,
  toggleCertSchedule,
  listCertSchedules,
  getCertTrends,
  getCertBadge,
  getGateCatalog,
  getCertAuditLog,
} from '../services/scale-cert-runner.js';

export default async function scaleCertRunnerRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(req: FastifyRequest): string | null {
    const sessionTenantId =
      typeof req?.session?.tenantId === 'string' && req.session.tenantId.trim().length > 0
        ? req.session.tenantId.trim()
        : undefined;
    const requestTenantId =
      typeof (req as any)?.tenantId === 'string' && (req as any).tenantId.trim().length > 0
        ? (req as any).tenantId.trim()
        : undefined;
    return sessionTenantId || requestTenantId || null;
  }

  function requireTenantId(req: FastifyRequest, reply: any): string | null {
    const tenantId = resolveTenantId(req);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  function getActor(req: FastifyRequest): string {
    return req.session?.userName || req.session?.duz || 'unknown';
  }

  // -- Certification Runs ---------------------------------------------

  server.post('/platform/cert/run', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const body = (req.body as any) || {};
    const { profileId } = body;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const run = runCertification(tenantId, profileId, getActor(req));
    return reply.code(201).send({ ok: true, run });
  });

  server.get('/platform/cert/runs', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    return reply.send({ ok: true, runs: listCertRuns(tenantId) });
  });

  server.get('/platform/cert/runs/latest', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const run = getLatestCertRun(tenantId);
    if (!run) return reply.code(404).send({ ok: false, error: 'No certification runs found' });
    return reply.send({ ok: true, run });
  });

  server.get('/platform/cert/runs/:id', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const { id } = req.params as any;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const run = getCertRunForTenant(tenantId, id);
    if (!run) return reply.code(404).send({ ok: false, error: 'Certification run not found' });
    return reply.send({ ok: true, run });
  });

  // -- Profiles -------------------------------------------------------

  server.get('/platform/cert/profiles', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    return reply.send({ ok: true, profiles: listCertProfiles(), scope: 'platform-global' });
  });

  server.get('/platform/cert/profiles/:id', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const { id } = req.params as any;
    const profile = getCertProfile(id);
    if (!profile) return reply.code(404).send({ ok: false, error: 'Profile not found' });
    return reply.send({ ok: true, profile, scope: 'platform-global' });
  });

  server.post('/platform/cert/profiles', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const body = (req.body as any) || {};
    const {
      name,
      description = '',
      requiredGateIds = [],
      minScore = 90,
      warnScore = 70,
    } = body;
    if (!name) return reply.code(400).send({ ok: false, error: 'name required' });
    const profile = createCertProfile(
      name,
      description,
      requiredGateIds,
      minScore,
      warnScore,
      getActor(req)
    );
    return reply.code(201).send({ ok: true, profile, scope: 'platform-global' });
  });

  // -- Schedules ------------------------------------------------------

  server.get('/platform/cert/schedules', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    return reply.send({ ok: true, schedules: listCertSchedules(tenantId) });
  });

  server.post('/platform/cert/schedules', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const body = (req.body as any) || {};
    const {
      profileId,
      cronExpression = '0 0 * * 0',
    } = body;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    if (!profileId) return reply.code(400).send({ ok: false, error: 'profileId required' });
    const sched = createCertSchedule(tenantId, profileId, cronExpression, getActor(req));
    return reply.code(201).send({ ok: true, schedule: sched });
  });

  server.post('/platform/cert/schedules/:id/toggle', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { enabled = true } = body;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const sched = toggleCertSchedule(tenantId, id, enabled, getActor(req));
    if (!sched) return reply.code(404).send({ ok: false, error: 'Schedule not found' });
    return reply.send({ ok: true, schedule: sched });
  });

  // -- Trends & Badge -------------------------------------------------

  server.get('/platform/cert/trends', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const { limit } = req.query as any;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const n = limit ? parseInt(limit, 10) : 20;
    return reply.send({ ok: true, trends: getCertTrends(tenantId, n) });
  });

  server.get('/platform/cert/badge', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const badge = getCertBadge(tenantId);
    if (!badge)
      return reply
        .code(404)
        .send({ ok: false, error: 'No certification badge -- run certification first' });
    return reply.send({ ok: true, badge });
  });

  // -- Gate Catalog ---------------------------------------------------

  server.get('/platform/cert/gates', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    return reply.send({ ok: true, gates: getGateCatalog(), scope: 'platform-global' });
  });

  // -- Audit ----------------------------------------------------------

  server.get('/platform/cert/audit', async (req, reply) => {
    const session = await requireSession(req, reply);
    requireRole(session, ['admin'], reply);
    const limit = parseInt((req.query as any)?.limit || '200', 10);
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    return reply.send({ ok: true, entries: getCertAuditLog(limit, tenantId) });
  });
}
