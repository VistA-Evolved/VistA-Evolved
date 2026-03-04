/**
 * Imaging Audit Trail API Routes — Phase 24.
 *
 * Provides compliance admin endpoints for querying and exporting
 * the imaging hash-chained audit trail.
 *
 * All routes require imaging_admin permission.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  queryImagingAudit,
  exportAuditCsv,
  getChainStats,
  verifyChain,
  imagingAudit,
  type ImagingAuditAction,
  type ImagingAuditQuery,
} from '../services/imaging-audit.js';
import { hasImagingPermission } from '../services/imaging-authz.js';

export async function imagingAuditRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /imaging/audit/events
   * Query imaging audit trail with filters.
   */
  server.get('/imaging/audit/events', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: 'Authentication required' });
    if (!hasImagingPermission(session, 'imaging_admin')) {
      return reply.code(403).send({ ok: false, error: 'Imaging admin required' });
    }

    const q = request.query as {
      action?: string;
      actorDuz?: string;
      patientDfn?: string;
      studyInstanceUid?: string;
      since?: string;
      until?: string;
      limit?: string;
      offset?: string;
    };

    const query: ImagingAuditQuery = {
      tenantId: session.tenantId,
      action: q.action as ImagingAuditAction | undefined,
      actorDuz: q.actorDuz,
      patientDfn: q.patientDfn,
      studyInstanceUid: q.studyInstanceUid,
      since: q.since,
      until: q.until,
      limit: q.limit ? parseInt(q.limit, 10) : 100,
      offset: q.offset ? parseInt(q.offset, 10) : 0,
    };

    // Audit the audit query itself
    imagingAudit(
      'AUDIT_QUERY',
      {
        duz: session.duz,
        name: session.userName,
        role: session.role,
      },
      session.tenantId,
      {
        sourceIp: request.ip,
        detail: { filters: q },
      }
    );

    const result = queryImagingAudit(query);
    return {
      ok: true,
      ...result,
    };
  });

  /**
   * GET /imaging/audit/stats
   * Audit chain statistics and integrity verification.
   */
  server.get('/imaging/audit/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: 'Authentication required' });
    if (!hasImagingPermission(session, 'imaging_admin')) {
      return reply.code(403).send({ ok: false, error: 'Imaging admin required' });
    }

    return { ok: true, ...getChainStats() };
  });

  /**
   * GET /imaging/audit/verify
   * Verify hash chain integrity.
   */
  server.get('/imaging/audit/verify', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: 'Authentication required' });
    if (!hasImagingPermission(session, 'imaging_admin')) {
      return reply.code(403).send({ ok: false, error: 'Imaging admin required' });
    }

    const valid = verifyChain();
    return {
      ok: true,
      chainValid: valid,
      message: valid ? 'Audit chain integrity verified' : 'CHAIN INTEGRITY VIOLATION DETECTED',
    };
  });

  /**
   * GET /imaging/audit/export
   * Export audit trail as CSV for compliance review.
   */
  server.get('/imaging/audit/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = request.session;
    if (!session) return reply.code(401).send({ ok: false, error: 'Authentication required' });
    if (!hasImagingPermission(session, 'imaging_admin')) {
      return reply.code(403).send({ ok: false, error: 'Imaging admin required' });
    }

    const q = request.query as {
      action?: string;
      actorDuz?: string;
      patientDfn?: string;
      since?: string;
      until?: string;
    };

    // Audit the export
    imagingAudit(
      'AUDIT_EXPORT',
      {
        duz: session.duz,
        name: session.userName,
        role: session.role,
      },
      session.tenantId,
      {
        sourceIp: request.ip,
        detail: { filters: q },
      }
    );

    const csv = exportAuditCsv({
      tenantId: session.tenantId,
      action: q.action as ImagingAuditAction | undefined,
      actorDuz: q.actorDuz,
      patientDfn: q.patientDfn,
      since: q.since,
      until: q.until,
    });

    reply.header('Content-Type', 'text/csv; charset=utf-8');
    reply.header(
      'Content-Disposition',
      `attachment; filename=imaging-audit-${new Date().toISOString().split('T')[0]}.csv`
    );
    return reply.send(csv);
  });
}
