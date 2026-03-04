/**
 * LOA Routes — Phase 94: PH HMO Workflow Automation
 *
 * REST endpoints for LOA (Letter of Authorization) workflow:
 *   POST  /rcm/loa                  — create LOA request
 *   GET   /rcm/loa                  — list LOA requests
 *   GET   /rcm/loa/stats            — LOA stats
 *   GET   /rcm/loa/:id              — single LOA detail
 *   POST  /rcm/loa/:id/transition   — transition LOA status
 *   POST  /rcm/loa/:id/submit       — submit LOA (generate packet)
 *   POST  /rcm/loa/:id/approve      — record LOA approval
 *   POST  /rcm/loa/:id/deny         — record LOA denial
 *   POST  /rcm/loa/:id/checklist    — update checklist item
 *   POST  /rcm/loa/:id/attachment   — add attachment ref
 *
 * Auth: session-level (matched by /rcm/ catch-all in AUTH_RULES).
 */

import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import {
  getLoaRequest,
  listLoaRequests,
  getLoaStats,
  transitionLoa,
  updateLoaChecklist,
  addLoaAttachment,
} from '../loa/loa-store.js';
import {
  createLoaWithPayerDefaults,
  resolveSubmissionMode,
  submitLoa,
  recordLoaApproval,
  recordLoaDenial,
} from '../loa/loa-workflow.js';
import type { LoaStatus } from '../loa/loa-types.js';

const loaRoutes: FastifyPluginAsync = async (server: FastifyInstance) => {
  /* ── POST /rcm/loa — create ────────────────────────────── */
  server.post('/rcm/loa', async (request, reply) => {
    const body = (request.body as any) || {};
    const {
      tenantId = 'default',
      patientDfn,
      patientName,
      payerId,
      encounterDate = new Date().toISOString().slice(0, 10),
      diagnosisCodes,
      procedureCodes,
      providerName,
      providerDuz,
      facilityName,
      memberId,
    } = body;

    if (!patientDfn || !payerId) {
      return reply.status(400).send({ ok: false, error: 'patientDfn and payerId required' });
    }

    try {
      // Transform plain string arrays into typed code objects
      const dxCodes = Array.isArray(diagnosisCodes)
        ? diagnosisCodes.map((c: any) =>
            typeof c === 'string' ? { code: c, codeSystem: 'ICD10' as const } : c
          )
        : [];
      const pxCodes = Array.isArray(procedureCodes)
        ? procedureCodes.map((c: any) =>
            typeof c === 'string' ? { code: c, codeSystem: 'CPT' as const } : c
          )
        : [];

      const loa = createLoaWithPayerDefaults({
        tenantId,
        patientDfn,
        patientName,
        payerId,
        encounterDate,
        diagnosisCodes: dxCodes,
        procedureCodes: pxCodes,
        providerName,
        providerDuz,
        facilityName,
        memberId,
        createdBy: body.actor ?? 'system',
      });

      const resolved = resolveSubmissionMode(payerId);

      return reply.status(201).send({
        ok: true,
        loa,
        submissionMode: resolved.mode,
        instructions: resolved.instructions,
      });
    } catch (err) {
      return reply.status(500).send({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /* ── GET /rcm/loa — list ───────────────────────────────── */
  server.get('/rcm/loa', async (request, reply) => {
    const query = request.query as {
      tenantId?: string;
      status?: string;
      payerId?: string;
      limit?: string;
      offset?: string;
    };

    const result = listLoaRequests(query.tenantId ?? 'default', {
      status: query.status as LoaStatus | undefined,
      payerId: query.payerId,
      limit: query.limit ? parseInt(query.limit, 10) : undefined,
      offset: query.offset ? parseInt(query.offset, 10) : undefined,
    });

    return reply.send({ ok: true, requests: result.loas, total: result.total });
  });

  /* ── GET /rcm/loa/stats ───────────────────────────────── */
  server.get('/rcm/loa/stats', async (request, reply) => {
    const tenantId = (request.query as any)?.tenantId ?? 'default';
    const byStatus = getLoaStats(tenantId);
    const total = Object.values(byStatus).reduce((sum, n) => sum + n, 0);
    return reply.send({ ok: true, total, byStatus });
  });

  /* ── GET /rcm/loa/:id — detail ────────────────────────── */
  server.get('/rcm/loa/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const loa = getLoaRequest(id);
    if (!loa) return reply.status(404).send({ ok: false, error: 'LOA not found' });
    return reply.send({ ok: true, loa });
  });

  /* ── POST /rcm/loa/:id/transition ─────────────────────── */
  server.post('/rcm/loa/:id/transition', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { toStatus, actor = 'system' } = body;

    if (!toStatus) {
      return reply.status(400).send({ ok: false, error: 'toStatus required' });
    }

    try {
      const loa = transitionLoa(id, toStatus, actor);
      return reply.send({ ok: true, loa });
    } catch (err) {
      return reply.status(400).send({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /* ── POST /rcm/loa/:id/submit — generate packet + submit  */
  server.post('/rcm/loa/:id/submit', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { actor = 'system' } = body;

    try {
      const result = submitLoa(id, actor);
      return reply.send({ ok: true, ...result });
    } catch (err) {
      return reply.status(400).send({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /* ── POST /rcm/loa/:id/approve ────────────────────────── */
  server.post('/rcm/loa/:id/approve', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { referenceNumber = '', approvedDate, expirationDate, actor = 'system' } = body;

    try {
      const loa = recordLoaApproval(
        id,
        referenceNumber,
        approvedDate ?? new Date().toISOString().slice(0, 10),
        expirationDate,
        actor
      );
      return reply.send({ ok: true, loa });
    } catch (err) {
      return reply.status(400).send({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /* ── POST /rcm/loa/:id/deny ──────────────────────────── */
  server.post('/rcm/loa/:id/deny', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { reason, actor = 'system' } = body;

    try {
      const loa = recordLoaDenial(id, reason ?? 'No reason provided', actor);
      return reply.send({ ok: true, loa });
    } catch (err) {
      return reply.status(400).send({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /* ── POST /rcm/loa/:id/checklist ──────────────────────── */
  server.post('/rcm/loa/:id/checklist', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { itemId, checked } = body;

    if (typeof itemId !== 'string' || typeof checked !== 'boolean') {
      return reply
        .status(400)
        .send({ ok: false, error: 'itemId (string) and checked (boolean) required' });
    }

    try {
      const loa = updateLoaChecklist(id, itemId, checked, body.actor ?? 'system');
      return reply.send({ ok: true, loa });
    } catch (err) {
      return reply.status(400).send({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });

  /* ── POST /rcm/loa/:id/attachment ─────────────────────── */
  server.post('/rcm/loa/:id/attachment', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { filename, mimeType, storageRef, uploadedBy = 'system', category = 'other' } = body;

    if (!filename || !storageRef) {
      return reply.status(400).send({ ok: false, error: 'filename and storageRef required' });
    }

    try {
      const now = new Date().toISOString();
      const loa = addLoaAttachment(
        id,
        {
          id: `att-${Date.now()}`,
          filename,
          mimeType: mimeType ?? 'application/octet-stream',
          sizeBytes: body.sizeBytes ?? 0,
          storageRef,
          uploadedAt: now,
          uploadedBy,
          category,
        },
        uploadedBy
      );
      return reply.send({ ok: true, loa });
    } catch (err) {
      return reply.status(400).send({
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  });
};

export default loaRoutes;
