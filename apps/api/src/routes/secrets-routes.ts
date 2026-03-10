/**
 * Secrets Management Routes -- Phase 341 (W16-P5).
 *
 * Admin-only endpoints for key/secret lifecycle management.
 * Raw key material is NEVER returned in responses.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { resolveKeyProvider } from '../auth/key-provider.js';
import {
  rotateKey,
  getRotationStatus,
  getRotationHistory,
  expireRetiringKeys,
} from '../auth/rotation-manager.js';

export async function secretsRoutes(app: FastifyInstance): Promise<void> {
  /**
   * GET /secrets/status -- Key inventory and rotation status.
   * Returns metadata only -- no raw key material.
   */
  app.get('/secrets/status', async (_request: FastifyRequest, reply: FastifyReply) => {
    const kp = resolveKeyProvider();
    const [keys, rotationStatus, healthy] = await Promise.all([
      kp.listKeys(),
      getRotationStatus(kp),
      kp.healthy(),
    ]);

    return reply.send({
      ok: true,
      provider: kp.type,
      healthy,
      keys: keys.map((k) => ({
        keyId: k.keyId,
        version: k.version,
        algorithm: k.algorithm,
        status: k.status,
        fingerprint: k.fingerprint,
        createdAt: k.createdAt,
        rotatedAt: k.rotatedAt,
        expiresAt: k.expiresAt,
      })),
      rotation: rotationStatus,
    });
  });

  /**
   * POST /secrets/rotate -- Trigger key rotation.
   * Body: { keyId: string, reason?: string }
   */
  app.post('/secrets/rotate', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as { keyId?: string; reason?: string }) || {};
    if (!body.keyId) {
      return reply.code(400).send({ ok: false, error: 'keyId required' });
    }

    const event = await rotateKey(body.keyId, body.reason || 'admin-triggered');
    return reply.send({
      ok: true,
      event: {
        keyId: event.keyId,
        oldVersion: event.oldVersion,
        newVersion: event.newVersion,
        timestamp: event.timestamp,
        reason: event.reason,
      },
    });
  });

  /**
   * GET /secrets/rotation-history -- Rotation event history.
   * Query: ?keyId=<id> to filter by key.
   */
  app.get('/secrets/rotation-history', async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as { keyId?: string };
    const history = getRotationHistory(query.keyId);
    return reply.send({
      ok: true,
      events: history,
      total: history.length,
    });
  });

  /**
   * POST /secrets/expire-retiring -- Expire keys past grace period.
   */
  app.post('/secrets/expire-retiring', async (_request: FastifyRequest, reply: FastifyReply) => {
    const expiredCount = await expireRetiringKeys();
    return reply.send({ ok: true, expiredCount });
  });

  /**
   * GET /secrets/health -- Key provider health check.
   */
  app.get('/secrets/health', async (_request: FastifyRequest, reply: FastifyReply) => {
    const kp = resolveKeyProvider();
    const healthy = await kp.healthy();
    return reply.send({ ok: healthy, provider: kp.type });
  });
}
