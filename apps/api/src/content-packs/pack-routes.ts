/**
 * Phase 390 (W22-P2): Content Pack Routes — REST endpoints for pack management
 *
 * Admin-only endpoints for installing, previewing, rolling back, and querying
 * content packs, plus CRUD for individual content items (order sets, flowsheets, etc.).
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  installPack,
  rollbackPack,
  previewPackInstall,
  listInstalledPacks,
  listInstallEvents,
  getPackStats,
  listOrderSets,
  getOrderSet,
  updateOrderSet,
  listFlowsheets,
  getFlowsheet,
  updateFlowsheet,
  listCdsRules,
  listDashboards,
  listInboxRules,
} from './pack-store.js';
import type { ContentPackV2 } from './types.js';
import { requireSession } from '../auth/auth-routes.js';

export default async function contentPackRoutes(server: FastifyInstance): Promise<void> {
  // ── Pack Management ──────────────────────────────────────

  /** Preview what a pack install would do */
  server.post('/content-packs/preview', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const pack = (request.body as ContentPackV2) || {};
    if (!pack.packId || !pack.version) {
      return reply.code(400).send({ ok: false, error: 'packId and version required' });
    }
    const preview = previewPackInstall(session.tenantId, pack);
    return { ok: true, preview };
  });

  /** Install a content pack */
  server.post('/content-packs/install', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const pack = (request.body as ContentPackV2) || {};
    if (!pack.packId || !pack.version) {
      return reply.code(400).send({ ok: false, error: 'packId and version required' });
    }
    const event = installPack(session.tenantId, pack, session.duz);
    return { ok: true, event };
  });

  /** Rollback (uninstall) a content pack */
  server.post('/content-packs/rollback', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as { packId?: string }) || {};
    if (!body.packId) {
      return reply.code(400).send({ ok: false, error: 'packId required' });
    }
    const event = rollbackPack(session.tenantId, body.packId, session.duz);
    return { ok: true, event };
  });

  /** List installed packs */
  server.get('/content-packs', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, packs: listInstalledPacks(session.tenantId) };
  });

  /** Pack install history */
  server.get('/content-packs/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const limit = parseInt((request.query as any).limit || '50', 10);
    return { ok: true, events: listInstallEvents(session.tenantId, limit) };
  });

  /** Pack statistics */
  server.get('/content-packs/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, stats: getPackStats(session.tenantId) };
  });

  // ── Order Set Endpoints ──────────────────────────────────

  server.get('/content-packs/order-sets', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const specialty = (request.query as any).specialty;
    return { ok: true, orderSets: listOrderSets(session.tenantId, specialty) };
  });

  server.get(
    '/content-packs/order-sets/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const os = getOrderSet(id);
      if (!os) return reply.code(404).send({ ok: false, error: 'Order set not found' });
      return { ok: true, orderSet: os };
    }
  );

  server.patch(
    '/content-packs/order-sets/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) || {};
      const ALLOWED = ['name', 'description', 'items', 'tags', 'status'] as const;
      const patch: Record<string, unknown> = {};
      for (const key of ALLOWED) {
        if (key in body) patch[key] = body[key];
      }
      const updated = updateOrderSet(id, patch as any);
      if (!updated) return reply.code(404).send({ ok: false, error: 'Order set not found' });
      return { ok: true, orderSet: updated };
    }
  );

  // ── Flowsheet Endpoints ──────────────────────────────────

  server.get('/content-packs/flowsheets', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const specialty = (request.query as any).specialty;
    return { ok: true, flowsheets: listFlowsheets(session.tenantId, specialty) };
  });

  server.get(
    '/content-packs/flowsheets/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const fs = getFlowsheet(id);
      if (!fs) return reply.code(404).send({ ok: false, error: 'Flowsheet not found' });
      return { ok: true, flowsheet: fs };
    }
  );

  server.patch(
    '/content-packs/flowsheets/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) || {};
      const ALLOWED = [
        'name',
        'description',
        'columns',
        'defaultFrequency',
        'tags',
        'status',
      ] as const;
      const patch: Record<string, unknown> = {};
      for (const key of ALLOWED) {
        if (key in body) patch[key] = body[key];
      }
      const updated = updateFlowsheet(id, patch as any);
      if (!updated) return reply.code(404).send({ ok: false, error: 'Flowsheet not found' });
      return { ok: true, flowsheet: updated };
    }
  );

  // ── CDS Rules Endpoints ──────────────────────────────────

  server.get('/content-packs/cds-rules', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const hook = (request.query as any).hook;
    return { ok: true, cdsRules: listCdsRules(session.tenantId, hook) };
  });

  // ── Dashboard Endpoints ──────────────────────────────────

  server.get('/content-packs/dashboards', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const specialty = (request.query as any).specialty;
    return { ok: true, dashboards: listDashboards(session.tenantId, specialty) };
  });

  // ── Inbox Rules Endpoints ────────────────────────────────

  server.get('/content-packs/inbox-rules', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, inboxRules: listInboxRules(session.tenantId) };
  });
}
