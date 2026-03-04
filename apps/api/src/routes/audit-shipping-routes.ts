/**
 * Audit Shipping Routes — Phase 157
 *
 * Admin-only endpoints for audit JSONL shipping status and control.
 * Auth: admin (matched by /audit/* catch-all in AUTH_RULES)
 *
 * Routes:
 *   GET  /audit/shipping/status    — Current shipping health
 *   POST /audit/shipping/trigger   — Manually trigger a ship cycle
 *   GET  /audit/shipping/manifests — List recent manifests
 *   GET  /audit/shipping/health    — S3 connectivity check
 */

import type { FastifyInstance } from 'fastify';
import {
  getShipperStatus,
  getShipperManifests,
  shipOneCycle,
  checkS3Connectivity,
  getLastShipResult,
} from '../audit-shipping/index.js';
import { log } from '../lib/logger.js';

export async function auditShippingRoutes(server: FastifyInstance): Promise<void> {
  /** GET /audit/shipping/status — Shipping health overview */
  server.get('/audit/shipping/status', async () => {
    const status = getShipperStatus();
    const lastResult = getLastShipResult();
    return {
      ok: true,
      shipping: status,
      lastResult,
      timestamp: new Date().toISOString(),
    };
  });

  /** POST /audit/shipping/trigger — Manually trigger a ship cycle */
  server.post('/audit/shipping/trigger', async (_request, reply) => {
    log.info('Manual audit ship triggered');
    try {
      const result = await shipOneCycle();
      return reply.code(result.ok ? 200 : 207).send({
        ok: result.ok,
        entriesShipped: result.entriesShipped,
        chunks: result.chunks,
        errors: result.errors,
        timestamp: new Date().toISOString(),
      });
    } catch (err: any) {
      log.error('Manual audit ship failed', { error: err.message });
      return reply.code(500).send({
        ok: false,
        error: 'Audit shipping operation failed',
        timestamp: new Date().toISOString(),
      });
    }
  });

  /** GET /audit/shipping/manifests — List recent manifests */
  server.get('/audit/shipping/manifests', async (request) => {
    const query = request.query as { limit?: string };
    const limit = Math.min(Number(query.limit) || 50, 200);
    const items = getShipperManifests(limit);
    return {
      ok: true,
      count: items.length,
      manifests: items,
      timestamp: new Date().toISOString(),
    };
  });

  /** GET /audit/shipping/health — S3 connectivity check */
  server.get('/audit/shipping/health', async () => {
    const connectivity = await checkS3Connectivity();
    const status = getShipperStatus();
    return {
      ok: connectivity.ok,
      s3: {
        reachable: connectivity.ok,
        error: connectivity.error,
        endpoint: status.endpoint,
        bucket: status.bucket,
      },
      jobRunning: status.jobRunning,
      enabled: status.enabled,
      timestamp: new Date().toISOString(),
    };
  });
}
