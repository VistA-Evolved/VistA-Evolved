/**
 * Backend Plugin SDK routes — Phase 358 (W18-P5)
 *
 * REST endpoints for plugin lifecycle management, signing, and audit.
 * Prefix: /plugins
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
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
  const TENANT = 'default';

  // ── Health ──────────────────────────────────────────────────────────
  server.get('/plugins/health', async (_req: FastifyRequest, reply: FastifyReply) => {
    const stats = getPluginStats(TENANT);
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
    const body = (req.body as any) || {};
    const { manifest, actor } = body;
    if (!manifest) {
      return reply.code(400).send({ ok: false, error: 'manifest is required' });
    }
    try {
      const plugin = installPlugin(TENANT, manifest, actor || 'admin');
      return reply.code(201).send({ ok: true, plugin });
    } catch (_err: any) {
      return reply.code(400).send({ ok: false, error: 'Plugin registration failed' });
    }
  });

  // ── Activate plugin ────────────────────────────────────────────────
  server.post('/plugins/:pluginId/activate', async (req: FastifyRequest, reply: FastifyReply) => {
    const { pluginId } = req.params as any;
    try {
      const plugin = activatePlugin(TENANT, pluginId, 'admin');
      return reply.send({ ok: true, plugin });
    } catch (_err: any) {
      return reply.code(404).send({ ok: false, error: 'Plugin not found' });
    }
  });

  // ── Suspend plugin ─────────────────────────────────────────────────
  server.post('/plugins/:pluginId/suspend', async (req: FastifyRequest, reply: FastifyReply) => {
    const { pluginId } = req.params as any;
    const body = (req.body as any) || {};
    try {
      const plugin = suspendPlugin(TENANT, pluginId, 'admin', body.reason);
      return reply.send({ ok: true, plugin });
    } catch (_err: any) {
      return reply.code(404).send({ ok: false, error: 'Plugin not found' });
    }
  });

  // ── Uninstall plugin ───────────────────────────────────────────────
  server.delete('/plugins/:pluginId', async (req: FastifyRequest, reply: FastifyReply) => {
    const { pluginId } = req.params as any;
    const deleted = uninstallPlugin(TENANT, pluginId, 'admin');
    if (!deleted) return reply.code(404).send({ ok: false, error: 'Plugin not found' });
    return reply.send({ ok: true, deleted: true });
  });

  // ── Get plugin ─────────────────────────────────────────────────────
  server.get('/plugins/:pluginId', async (req: FastifyRequest, reply: FastifyReply) => {
    const { pluginId } = req.params as any;
    const plugin = getPlugin(TENANT, pluginId);
    if (!plugin) return reply.code(404).send({ ok: false, error: 'Plugin not found' });
    return reply.send({ ok: true, plugin });
  });

  // ── List plugins ───────────────────────────────────────────────────
  server.get('/plugins/list', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as any) || {};
    const list = listPlugins(TENANT, { status: query.status });
    return reply.send({ ok: true, plugins: list, count: list.length });
  });

  // ── Plugin audit ───────────────────────────────────────────────────
  server.get('/plugins/audit', async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as any) || {};
    const entries = getPluginAudit(TENANT, {
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
