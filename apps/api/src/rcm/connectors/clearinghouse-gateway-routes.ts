/**
 * Clearinghouse Gateway v2 Routes — Phase 519 (Wave 37 B7)
 *
 * REST endpoints for the provider-agnostic clearinghouse adapter
 * with record/replay trace management.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { getClearinghouseGateway } from './clearinghouse-gateway-v2.js';
import type { X12TransactionSet } from '../edi/types.js';

export async function clearinghouseGatewayRoutes(server: FastifyInstance): Promise<void> {
  const prefix = '/rcm/clearinghouse/v2';

  /* ── Health ──────────────────────────────────────────────
   * GET /rcm/clearinghouse/v2/health
   */
  server.get(`${prefix}/health`, async (_req: FastifyRequest, reply: FastifyReply) => {
    const gw = getClearinghouseGateway();
    const health = await gw.healthCheck();
    return reply.send(health);
  });

  /* ── Config (redacted) ──────────────────────────────────
   * GET /rcm/clearinghouse/v2/config
   */
  server.get(`${prefix}/config`, async (_req: FastifyRequest, reply: FastifyReply) => {
    const gw = getClearinghouseGateway();
    return reply.send({ ok: true, config: gw.getConfig() });
  });

  /* ── Submit 837 ─────────────────────────────────────────
   * POST /rcm/clearinghouse/v2/submit
   * Body: { payload: string, metadata?: Record<string,string> }
   */
  server.post(`${prefix}/submit`, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { payload, metadata } = body;

    if (!payload || typeof payload !== 'string') {
      return reply.code(400).send({ ok: false, error: 'payload (string) required' });
    }

    const gw = getClearinghouseGateway();
    const submission = await gw.submit837(payload, metadata ?? {});

    return reply.send({
      ok: submission.result?.success ?? false,
      submission: {
        id: submission.id,
        transactionSet: submission.transactionSet,
        provider: submission.provider,
        submittedAt: submission.submittedAt,
        durationMs: submission.durationMs,
        result: submission.result,
      },
    });
  });

  /* ── Check 276/277 ──────────────────────────────────────
   * POST /rcm/clearinghouse/v2/check-status
   * Body: { payload: string, metadata?: Record<string,string> }
   */
  server.post(`${prefix}/check-status`, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { payload, metadata } = body;

    if (!payload || typeof payload !== 'string') {
      return reply.code(400).send({ ok: false, error: 'payload (string) required' });
    }

    const gw = getClearinghouseGateway();
    const submission = await gw.check276277(payload, metadata ?? {});

    return reply.send({
      ok: submission.result?.success ?? false,
      submission: {
        id: submission.id,
        transactionSet: submission.transactionSet,
        provider: submission.provider,
        submittedAt: submission.submittedAt,
        durationMs: submission.durationMs,
        result: submission.result,
      },
    });
  });

  /* ── Receive 835s ───────────────────────────────────────
   * GET /rcm/clearinghouse/v2/receive?since=ISO
   */
  server.get(`${prefix}/receive`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { since } = (req.query as any) || {};
    const gw = getClearinghouseGateway();
    const results = await gw.receive835(since);

    return reply.send({
      ok: true,
      count: results.length,
      results: results.map((r) => ({
        transactionSet: r.transactionSet,
        receivedAt: r.receivedAt,
        contentHash: r.contentHash,
        payloadLength: r.payload.length,
      })),
    });
  });

  /* ── Submission history ─────────────────────────────────
   * GET /rcm/clearinghouse/v2/submissions?limit=50
   */
  server.get(`${prefix}/submissions`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { limit } = (req.query as any) || {};
    const gw = getClearinghouseGateway();
    const subs = gw.listSubmissions(Number(limit) || 50);

    return reply.send({
      ok: true,
      count: subs.length,
      submissions: subs.map((s) => ({
        id: s.id,
        transactionSet: s.transactionSet,
        provider: s.provider,
        submittedAt: s.submittedAt,
        durationMs: s.durationMs,
        success: s.result?.success,
      })),
    });
  });

  /* ── Get single submission ──────────────────────────────
   * GET /rcm/clearinghouse/v2/submissions/:id
   */
  server.get(`${prefix}/submissions/:id`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const gw = getClearinghouseGateway();
    const sub = gw.getSubmission(id);

    if (!sub) {
      return reply.code(404).send({ ok: false, error: 'Submission not found' });
    }

    return reply.send({
      ok: true,
      submission: {
        id: sub.id,
        transactionSet: sub.transactionSet,
        provider: sub.provider,
        submittedAt: sub.submittedAt,
        durationMs: sub.durationMs,
        result: sub.result,
        metadata: sub.metadata,
      },
    });
  });

  /* ── Trace list ─────────────────────────────────────────
   * GET /rcm/clearinghouse/v2/traces?transactionSet=835&limit=50
   */
  server.get(`${prefix}/traces`, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as any) || {};
    const txSet = query.transactionSet as X12TransactionSet | undefined;
    const limit = Number(query.limit) || 50;

    const gw = getClearinghouseGateway();
    const traces = gw.listTraces(txSet, limit);

    return reply.send({
      ok: true,
      count: traces.length,
      traces: traces.map((t) => ({
        id: t.id,
        timestamp: t.timestamp,
        direction: t.direction,
        transactionSet: t.transactionSet,
        provider: t.provider,
        requestHash: t.requestHash,
        responseHash: t.responseHash,
        durationMs: t.durationMs,
        success: t.result?.success,
      })),
    });
  });

  /* ── Get single trace ───────────────────────────────────
   * GET /rcm/clearinghouse/v2/traces/:id
   */
  server.get(`${prefix}/traces/:id`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const gw = getClearinghouseGateway();
    const trace = gw.getTrace(id);

    if (!trace) {
      return reply.code(404).send({ ok: false, error: 'Trace not found' });
    }

    return reply.send({ ok: true, trace });
  });

  /* ── Trace stats ────────────────────────────────────────
   * GET /rcm/clearinghouse/v2/traces/stats
   */
  server.get(`${prefix}/traces/stats`, async (_req: FastifyRequest, reply: FastifyReply) => {
    const gw = getClearinghouseGateway();
    return reply.send({ ok: true, stats: gw.getTraceStats() });
  });
}
