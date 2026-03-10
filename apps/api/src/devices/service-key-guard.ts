/**
 * Device / Gateway service-key validation.
 *
 * All device ingest and edge-gateway service-auth routes MUST call
 * `requireDeviceServiceKey(request, reply)` at the top of the handler.
 * Returns true if the key is valid; sends 403 and returns false otherwise.
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import { DEVICE_INGEST_CONFIG } from '../config/server-config.js';

/**
 * Validate the X-Service-Key header against DEVICE_INGEST_SERVICE_KEY.
 * Uses constant-time comparison to prevent timing attacks.
 *
 * @returns true if valid, false if rejected (reply already sent).
 */
export function requireDeviceServiceKey(request: FastifyRequest, reply: FastifyReply): boolean {
  const key = request.headers['x-service-key'] as string | undefined;
  if (!key) {
    reply.code(403).send({ ok: false, error: 'missing_service_key' });
    return false;
  }
  const expected = DEVICE_INGEST_CONFIG.serviceKey;
  // Constant-time comparison
  if (key.length !== expected.length) {
    reply.code(403).send({ ok: false, error: 'invalid_service_key' });
    return false;
  }
  let result = 0;
  for (let i = 0; i < key.length; i++) {
    result |= key.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  if (result !== 0) {
    reply.code(403).send({ ok: false, error: 'invalid_service_key' });
    return false;
  }
  return true;
}
