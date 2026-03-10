/**
 * Enterprise Break-Glass Routes -- Phase 141: Enterprise IAM Posture.
 *
 * REST endpoints for enterprise-wide break-glass management:
 *   POST /admin/break-glass/request  -- Request break-glass (any authenticated user)
 *   POST /admin/break-glass/approve  -- Approve pending request (admin only)
 *   POST /admin/break-glass/deny     -- Deny pending request (admin only)
 *   POST /admin/break-glass/revoke   -- Revoke active session (admin only)
 *   GET  /admin/break-glass/active   -- List active/pending sessions (admin only)
 *   GET  /admin/break-glass/stats    -- Break-glass statistics (admin only)
 *   GET  /admin/break-glass/:id      -- Get specific session (admin only)
 *
 * Auth: All endpoints require admin role (enforced by AUTH_RULES pattern
 * `/admin/` -> "admin"). The /request endpoint is admin-only because
 * break-glass requests go through admin review. In future, this could
 * be relaxed to session-level for self-service with admin approval.
 */

import type { FastifyInstance } from 'fastify';
import { requireSession, requireRole } from '../auth/auth-routes.js';
import {
  requestBreakGlass,
  approveBreakGlass,
  revokeBreakGlass,
  denyBreakGlass,
  getBreakGlassSession,
  listBreakGlassSessions,
  getBreakGlassStats,
} from '../auth/enterprise-break-glass.js';
import { getAuthModeStatus } from '../auth/auth-mode-policy.js';
import { getIdpRoleMappings } from '../auth/idp-role-mapper.js';

export default async function enterpriseBreakGlassRoutes(server: FastifyInstance): Promise<void> {
  /* ---------------------------------------------------------------- */
  /* Break-glass request                                              */
  /* ---------------------------------------------------------------- */

  /**
   * POST /admin/break-glass/request -- Request break-glass access.
   * Any admin user can submit a request.
   */
  server.post('/admin/break-glass/request', async (request, reply) => {
    const session = await requireSession(request, reply);
    // Auth gateway enforces admin for /admin/* routes

    const body = (request.body as any) || {};
    const { targetModule, targetPermission, patientDfn, reason } = body;

    if (!targetModule || !targetPermission) {
      return reply.code(400).send({
        ok: false,
        error: 'targetModule and targetPermission are required',
      });
    }

    if (!reason || typeof reason !== 'string') {
      return reply.code(400).send({
        ok: false,
        error: 'reason is required (string, min 10 characters)',
      });
    }

    const result = requestBreakGlass({
      requesterDuz: session.duz,
      requesterName: session.userName,
      requesterRole: session.role,
      targetModule,
      targetPermission,
      patientDfn,
      reason,
      tenantId: session.tenantId,
      sourceIp: request.ip,
    });

    if (!result.ok) {
      return reply.code(400).send({ ok: false, error: result.error });
    }

    return reply.code(201).send({ ok: true, session: result.session });
  });

  /* ---------------------------------------------------------------- */
  /* Break-glass approve                                              */
  /* ---------------------------------------------------------------- */

  /**
   * POST /admin/break-glass/approve -- Approve a pending break-glass request.
   * Admin only. Self-approval is blocked.
   */
  server.post('/admin/break-glass/approve', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const body = (request.body as any) || {};
    const { sessionId, ttlMinutes } = body;

    if (!sessionId) {
      return reply.code(400).send({ ok: false, error: 'sessionId is required' });
    }

    const result = approveBreakGlass({
      sessionId,
      approverDuz: session.duz,
      approverName: session.userName,
      ttlMinutes: ttlMinutes ? Number(ttlMinutes) : undefined,
      sourceIp: request.ip,
    });

    if (!result.ok) {
      return reply.code(400).send({ ok: false, error: result.error });
    }

    return { ok: true, session: result.session };
  });

  /* ---------------------------------------------------------------- */
  /* Break-glass deny                                                 */
  /* ---------------------------------------------------------------- */

  /**
   * POST /admin/break-glass/deny -- Deny a pending break-glass request.
   * Admin only.
   */
  server.post('/admin/break-glass/deny', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const body = (request.body as any) || {};
    const { sessionId } = body;

    if (!sessionId) {
      return reply.code(400).send({ ok: false, error: 'sessionId is required' });
    }

    const result = denyBreakGlass({
      sessionId,
      denierDuz: session.duz,
      denierName: session.userName,
      sourceIp: request.ip,
    });

    if (!result.ok) {
      return reply.code(400).send({ ok: false, error: result.error });
    }

    return { ok: true, session: result.session };
  });

  /* ---------------------------------------------------------------- */
  /* Break-glass revoke                                               */
  /* ---------------------------------------------------------------- */

  /**
   * POST /admin/break-glass/revoke -- Revoke an active break-glass session.
   * Admin only.
   */
  server.post('/admin/break-glass/revoke', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const body = (request.body as any) || {};
    const { sessionId } = body;

    if (!sessionId) {
      return reply.code(400).send({ ok: false, error: 'sessionId is required' });
    }

    const result = revokeBreakGlass({
      sessionId,
      revokerDuz: session.duz,
      revokerName: session.userName,
      sourceIp: request.ip,
    });

    if (!result.ok) {
      return reply.code(400).send({ ok: false, error: result.error });
    }

    return { ok: true, session: result.session };
  });

  /* ---------------------------------------------------------------- */
  /* List active/pending sessions                                     */
  /* ---------------------------------------------------------------- */

  /**
   * GET /admin/break-glass/active -- List break-glass sessions.
   * Admin only. Optional query: ?status=active|pending|expired|revoked|denied
   */
  server.get('/admin/break-glass/active', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const query = request.query as Record<string, string>;
    const sessions = listBreakGlassSessions({
      status: query.status as any,
      tenantId: session.tenantId,
      limit: query.limit ? Number(query.limit) : 100,
    });

    return {
      ok: true,
      sessions,
      count: sessions.length,
    };
  });

  /* ---------------------------------------------------------------- */
  /* Break-glass statistics                                           */
  /* ---------------------------------------------------------------- */

  /**
   * GET /admin/break-glass/stats -- Break-glass summary statistics.
   * Admin only.
   */
  server.get('/admin/break-glass/stats', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const stats = getBreakGlassStats(session.tenantId);
    return { ok: true, stats };
  });

  /* ---------------------------------------------------------------- */
  /* Get specific session                                              */
  /* ---------------------------------------------------------------- */

  /**
   * GET /admin/break-glass/session/:id -- Get a specific break-glass session.
   * Admin only.
   */
  server.get('/admin/break-glass/session/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const { id } = request.params as { id: string };
    const bgSession = getBreakGlassSession(id, session.tenantId);

    if (!bgSession) {
      return reply.code(404).send({ ok: false, error: 'Break-glass session not found' });
    }

    return { ok: true, session: bgSession };
  });

  /* ---------------------------------------------------------------- */
  /* IAM posture: auth mode + role mapping + break-glass health       */
  /* ---------------------------------------------------------------- */

  /**
   * GET /admin/iam/posture -- Enterprise IAM posture summary.
   * Admin only. Returns auth mode, role mapping, break-glass status.
   */
  server.get('/admin/iam/posture', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);

    const authMode = getAuthModeStatus();
    const roleMapping = getIdpRoleMappings();
    const breakGlassStatus = getBreakGlassStats(session.tenantId);

    return {
      ok: true,
      authMode,
      roleMapping: {
        mappingCount: roleMapping.mappings.length,
        isCustom: roleMapping.isCustom,
        fallbackRole: roleMapping.fallbackRole,
      },
      breakGlass: breakGlassStatus,
    };
  });
}
