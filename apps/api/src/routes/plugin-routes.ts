/**
 * Backend Plugin SDK routes — Phase 358 (W18-P5)
 *
 * REST endpoints for plugin lifecycle management, signing, and audit.
 * Prefix: /plugins
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  installPlugin,
  activatePlugin,
  suspendPlugin,
  uninstallPlugin,
  getPlugin,
  listPlugins,
  getPluginAudit,
  getPluginStats,
  computeManifestHash,
  signManifest,
  verifyManifestSignature,
  runValidators,
  runTransformers,
  type PluginManifest,
} from '../services/plugin-sdk.js';

export async function pluginRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(req: FastifyRequest): string | null {
    const sessionTenantId =
      typeof (req as any).session?.tenantId === 'string' &&
      (req as any).session.tenantId.trim().length > 0
        ? (req as any).session.tenantId.trim()
        : undefined;
    return sessionTenantId || null;
  }

  function requireTenantId(req: FastifyRequest, reply: FastifyReply): string | null {
    const tenantId = resolveTenantId(req);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  function resolveActor(req: FastifyRequest): string {
    return (
      (req as any).session?.userName ||
      (req as any).session?.duz ||
      'admin'
    );
  }

  // ── Health ──────────────────────────────────────────────────────────
  server.get('/plugins/health', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const stats = getPluginStats(tenantId);
    return reply.send({ ok: true, phase: 358, ...stats });
  });

  // ── Sign manifest (dev/CI helper) ──────────────────────────────────
  server.post('/plugins/sign-manifest', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const {
      pluginId,
      name,
      version,
      description,
      author,
      extensionPoints,
      permissions,
      minApiVersion,
    } = body;

    if (!pluginId || !name || !version) {
      return reply.code(400).send({ ok: false, error: 'pluginId, name, version required' });
    }

    const base = {
      pluginId,
      name,
      version,
      description: description || '',
      author: author || 'unknown',
      extensionPoints: extensionPoints || [],
      permissions: permissions || [],
      minApiVersion,
    };

    const contentHash = computeManifestHash(base);
    const signature = signManifest(contentHash);

    const manifest: PluginManifest = {
      ...base,
      contentHash,
      signature,
    };

    return reply.send({ ok: true, manifest });
  });

  // ── Verify signature ───────────────────────────────────────────────
  server.post('/plugins/verify-signature', async (req: FastifyRequest, reply: FastifyReply) => {
    const manifest = (req.body as any) || {};
    if (!manifest.contentHash || !manifest.signature) {
      return reply.code(400).send({ ok: false, error: 'contentHash and signature required' });
    }
    const valid = verifyManifestSignature(manifest as PluginManifest);
    return reply.send({ ok: true, valid });
  });

  // ── Install plugin ─────────────────────────────────────────────────
  server.post('/plugins/install', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const body = (req.body as any) || {};
    const { manifest } = body;
    if (!manifest) {
      return reply.code(400).send({ ok: false, error: 'manifest is required' });
    }
    try {
      const plugin = installPlugin(tenantId, manifest, resolveActor(req));
      return reply.code(201).send({ ok: true, plugin });
    } catch (_err: any) {
      return reply.code(400).send({ ok: false, error: 'Plugin registration failed' });
    }
  });

  // ── Activate plugin ────────────────────────────────────────────────
  server.post('/plugins/:pluginId/activate', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { pluginId } = req.params as any;
    try {
      const plugin = activatePlugin(tenantId, pluginId, resolveActor(req));
      return reply.send({ ok: true, plugin });
    } catch (_err: any) {
      return reply.code(404).send({ ok: false, error: 'Plugin not found' });
    }
  });

  // ── Suspend plugin ─────────────────────────────────────────────────
  server.post('/plugins/:pluginId/suspend', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { pluginId } = req.params as any;
    const body = (req.body as any) || {};
    try {
      const plugin = suspendPlugin(tenantId, pluginId, resolveActor(req), body.reason);
      return reply.send({ ok: true, plugin });
    } catch (_err: any) {
      return reply.code(404).send({ ok: false, error: 'Plugin not found' });
    }
  });

  // ── Uninstall plugin ───────────────────────────────────────────────
  server.delete('/plugins/:pluginId', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { pluginId } = req.params as any;
    const deleted = uninstallPlugin(tenantId, pluginId, resolveActor(req));
    if (!deleted) return reply.code(404).send({ ok: false, error: 'Plugin not found' });
    return reply.send({ ok: true, deleted: true });
  });

  // ── Get plugin ─────────────────────────────────────────────────────
  server.get('/plugins/:pluginId', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { pluginId } = req.params as any;
    const plugin = getPlugin(tenantId, pluginId);
    if (!plugin) return reply.code(404).send({ ok: false, error: 'Plugin not found' });
    return reply.send({ ok: true, plugin });
  });

  // ── List plugins ───────────────────────────────────────────────────
  server.get('/plugins/list', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const query = (req.query as any) || {};
    const list = listPlugins(tenantId, { status: query.status });
    return reply.send({ ok: true, plugins: list, count: list.length });
  });

  // ── Plugin audit ───────────────────────────────────────────────────
  server.get('/plugins/audit', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const query = (req.query as any) || {};
    const entries = getPluginAudit(tenantId, {
      pluginId: query.pluginId,
      limit: query.limit ? parseInt(query.limit, 10) : 100,
    });
    return reply.send({ ok: true, audit: entries, count: entries.length });
  });

  // ── Run validators (test/debug) ────────────────────────────────────
  server.post('/plugins/validate', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { stage, data } = body;
    if (!stage) return reply.code(400).send({ ok: false, error: 'stage is required' });
    const result = await runValidators(stage, data);
    return reply.send({ ok: true, ...result });
  });

  // ── Run transformers (test/debug) ──────────────────────────────────
  server.post('/plugins/transform', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { transformKey, data } = body;
    if (!transformKey)
      return reply.code(400).send({ ok: false, error: 'transformKey is required' });
    const result = await runTransformers(transformKey, data);
    return reply.send({ ok: true, result });
  });
}
