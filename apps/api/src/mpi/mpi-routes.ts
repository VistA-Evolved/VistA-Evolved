/**
 * Phase 401 (W23-P3): MPI / Client Registry — Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { log } from '../lib/logger.js';
import {
  createIdentity,
  getIdentity,
  listIdentities,
  updateIdentity,
  findMatches,
  mergeIdentities,
  listMergeEvents,
  getMpiDashboardStats,
} from './mpi-store.js';

export default async function mpiRoutes(server: FastifyInstance): Promise<void> {
  // ─── Identity CRUD ─────────────────────────────────────────

  server.get('/mpi/identities', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return {
      ok: true,
      identities: listIdentities(session.tenantId, { goldenRecordId: qs.goldenRecordId }),
    };
  });

  server.get('/mpi/identities/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = getIdentity(id);
    if (!rec) return reply.code(404).send({ ok: false, error: 'Not found' });
    return { ok: true, identity: rec };
  });

  server.post('/mpi/identities', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    try {
      const rec = createIdentity({
        tenantId: session.tenantId,
        identifiers: body.identifiers || [],
        familyName: body.familyName || '',
        givenName: body.givenName || '',
        dateOfBirth: body.dateOfBirth || '',
        gender: body.gender || 'unknown',
        goldenRecordId: body.goldenRecordId || null,
        addressCity: body.addressCity || null,
        addressCountry: body.addressCountry || null,
        phoneNumber: body.phoneNumber || null,
        provenanceSource: body.provenanceSource || 'manual',
      });
      return reply.code(201).send({ ok: true, identity: rec });
    } catch (err: any) {
      log.error('MPI identity creation failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return reply.code(400).send({ ok: false, error: 'Create failed' });
    }
  });

  server.put('/mpi/identities/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body || {}) as Record<string, any>;
    const rec = updateIdentity(id, { ...body, tenantId: session.tenantId });
    if (!rec) return reply.code(404).send({ ok: false, error: 'Not found' });
    return { ok: true, identity: rec };
  });

  // ─── Matching ──────────────────────────────────────────────

  server.post('/mpi/match', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    const results = findMatches(session.tenantId, {
      familyName: body.familyName || '',
      givenName: body.givenName || '',
      dateOfBirth: body.dateOfBirth || '',
      identifiers: body.identifiers,
    });
    return { ok: true, results };
  });

  // ─── Merge / Link ─────────────────────────────────────────

  server.post('/mpi/merge', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    const result = mergeIdentities(
      session.tenantId,
      body.survivorId || '',
      body.retiredId || '',
      body.action || 'merge',
      body.reason || '',
      session.duz || 'unknown'
    );
    if ('error' in result) return reply.code(400).send(result);
    return reply.code(201).send(result);
  });

  server.get('/mpi/merge-events', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return { ok: true, events: listMergeEvents(session.tenantId, Number(qs.limit) || 100) };
  });

  // ─── Dashboard ─────────────────────────────────────────────

  server.get('/mpi/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, stats: getMpiDashboardStats(session.tenantId) };
  });
}
