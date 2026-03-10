/**
 * Edge Device Gateway -- Routes
 *
 * Phase 379 (W21-P2): REST endpoints for edge gateway management,
 * uplink message ingest, observation queries, and gateway health.
 *
 * Auth: admin for management, service for uplink ingest (gateway-to-server).
 *
 * Pattern: follows imaging-worklist.ts, telehealth.ts route style.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import {
  registerGateway,
  getGateway,
  listGateways,
  updateGatewayStatus,
  recordHeartbeat,
  revokeGateway,
  deleteGateway,
  getGatewayConfig,
  setGatewayConfig,
  ingestUplinkMessage,
  getUplinkBuffer,
  storeObservation,
  getObservation,
  listObservations,
  getGatewayHealth,
  getStoreStats,
} from './gateway-store.js';
import type { UplinkEnvelope, DeviceObservation, GatewayStatus } from './types.js';
import { requireDeviceServiceKey } from './service-key-guard.js';
import * as crypto from 'node:crypto';

const DEFAULT_TENANT = 'default';

function tenantId(request: FastifyRequest): string {
  return (request.headers['x-tenant-id'] as string) || DEFAULT_TENANT;
}

function now(): string {
  return new Date().toISOString();
}

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString('hex')}`;
}

export default async function edgeGatewayRoutes(server: FastifyInstance): Promise<void> {
  // -----------------------------------------------------------------------
  // Gateway Management (admin auth -- enforced by AUTH_RULES)
  // -----------------------------------------------------------------------

  /** POST /edge-gateways -- Register a new edge gateway */
  server.post('/edge-gateways', async (request, reply) => {
    const body = (request.body as any) || {};
    const { name, facilityCode, adapters } = body;
    if (!name || !facilityCode) {
      return reply.code(400).send({ ok: false, error: 'name and facilityCode required' });
    }
    const gw = registerGateway(name, facilityCode, adapters || [], tenantId(request));
    return reply.code(201).send({ ok: true, gateway: gw });
  });

  /** GET /edge-gateways -- List all gateways */
  server.get('/edge-gateways', async (request, reply) => {
    const tid = tenantId(request);
    const items = listGateways(tid);
    return { ok: true, gateways: items, total: items.length };
  });

  /** GET /edge-gateways/:id -- Get a single gateway */
  server.get('/edge-gateways/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const gw = getGateway(id);
    if (!gw) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, gateway: gw };
  });

  /** PATCH /edge-gateways/:id/status -- Update gateway status */
  server.patch('/edge-gateways/:id/status', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { status } = body as { status: GatewayStatus };
    if (!status) {
      return reply.code(400).send({ ok: false, error: 'status required' });
    }
    const gw = updateGatewayStatus(id, status);
    if (!gw) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, gateway: gw };
  });

  /** POST /edge-gateways/:id/revoke -- Revoke a gateway */
  server.post('/edge-gateways/:id/revoke', async (request, reply) => {
    const { id } = request.params as { id: string };
    const revoked = revokeGateway(id);
    if (!revoked) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, status: 'revoked' };
  });

  /** DELETE /edge-gateways/:id -- Remove a gateway */
  server.delete('/edge-gateways/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deleteGateway(id);
    if (!deleted) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true };
  });

  // -----------------------------------------------------------------------
  // Gateway Health
  // -----------------------------------------------------------------------

  /** GET /edge-gateways/:id/health -- Gateway health snapshot */
  server.get('/edge-gateways/:id/health', async (request, reply) => {
    const { id } = request.params as { id: string };
    const health = getGatewayHealth(id);
    if (!health) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, health };
  });

  // -----------------------------------------------------------------------
  // Gateway Config (pull model: gateway requests its config)
  // -----------------------------------------------------------------------

  /** GET /edge-gateways/:id/config -- Get gateway config */
  server.get('/edge-gateways/:id/config', async (request, reply) => {
    const { id } = request.params as { id: string };
    const gw = getGateway(id);
    if (!gw) return reply.code(404).send({ ok: false, error: 'not_found' });
    const config = getGatewayConfig(id);
    return { ok: true, config };
  });

  /** PUT /edge-gateways/:id/config -- Update gateway config */
  server.put('/edge-gateways/:id/config', async (request, reply) => {
    const { id } = request.params as { id: string };
    const gw = getGateway(id);
    if (!gw) return reply.code(404).send({ ok: false, error: 'not_found' });
    const body = (request.body as any) || {};
    const config = setGatewayConfig(id, body);
    return { ok: true, config };
  });

  // -----------------------------------------------------------------------
  // Heartbeat (service auth -- gateway-to-server)
  // -----------------------------------------------------------------------

  /** POST /edge-gateways/:id/heartbeat -- Record gateway heartbeat */
  server.post('/edge-gateways/:id/heartbeat', async (request, reply) => {
    if (!requireDeviceServiceKey(request, reply)) return reply;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const gw = recordHeartbeat(id, body.firmwareVersion);
    if (!gw) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, status: gw.status, lastHeartbeat: gw.lastHeartbeat };
  });

  // -----------------------------------------------------------------------
  // Uplink Ingest (service auth -- gateway-to-server)
  // -----------------------------------------------------------------------

  /** POST /edge-gateways/uplink -- Ingest an uplink message from a gateway */
  server.post('/edge-gateways/uplink', async (request, reply) => {
    if (!requireDeviceServiceKey(request, reply)) return reply;
    const body = (request.body as any) || {};
    const { messageId, gatewayId, type, sourceProtocol, payload, gatewayTimestamp } = body;
    if (!messageId || !gatewayId || !type) {
      return reply.code(400).send({ ok: false, error: 'messageId, gatewayId, and type required' });
    }

    const envelope: UplinkEnvelope = {
      messageId,
      gatewayId,
      type,
      sourceProtocol: sourceProtocol || 'raw',
      payload: payload || {},
      gatewayTimestamp: gatewayTimestamp || now(),
    };

    const result = ingestUplinkMessage(envelope);
    if (!result.accepted) {
      return reply
        .code(result.reason === 'duplicate' ? 409 : 400)
        .send({ ok: false, error: result.reason });
    }

    return reply.code(202).send({ ok: true, messageId });
  });

  /** GET /edge-gateways/uplink/buffer -- View uplink buffer */
  server.get('/edge-gateways/uplink/buffer', async (request, reply) => {
    const query = request.query as { gatewayId?: string; limit?: string };
    const messages = getUplinkBuffer(query.gatewayId, parseInt(query.limit || '100', 10));
    return { ok: true, messages, total: messages.length };
  });

  // -----------------------------------------------------------------------
  // Observations
  // -----------------------------------------------------------------------

  /** POST /edge-gateways/observations -- Store a normalized observation */
  server.post('/edge-gateways/observations', async (request, reply) => {
    const body = (request.body as any) || {};
    const { gatewayId, deviceId, code, codeSystem, value, unit, sourceProtocol } = body;
    if (!gatewayId || !deviceId || !code || !value) {
      return reply.code(400).send({
        ok: false,
        error: 'gatewayId, deviceId, code, and value required',
      });
    }

    const obs: DeviceObservation = {
      id: generateId('obs'),
      gatewayId,
      deviceId,
      patientId: body.patientId,
      code,
      codeSystem: codeSystem || 'local',
      value,
      unit: unit || '',
      flag: body.flag,
      referenceRange: body.referenceRange,
      specimen: body.specimen,
      sourceProtocol: sourceProtocol || 'raw',
      observedAt: body.observedAt || now(),
      ingestedAt: now(),
      normalized: body.normalized || false,
      tenantId: tenantId(request),
    };

    storeObservation(obs);
    return reply.code(201).send({ ok: true, observation: obs });
  });

  /** GET /edge-gateways/observations -- Query observations */
  server.get('/edge-gateways/observations', async (request, reply) => {
    const query = request.query as {
      gatewayId?: string;
      deviceId?: string;
      patientId?: string;
      limit?: string;
    };
    const results = listObservations({
      gatewayId: query.gatewayId,
      deviceId: query.deviceId,
      patientId: query.patientId,
      tenantId: tenantId(request),
      limit: parseInt(query.limit || '100', 10),
    });
    return { ok: true, observations: results, total: results.length };
  });

  /** GET /edge-gateways/observations/:id -- Get single observation */
  server.get('/edge-gateways/observations/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const obs = getObservation(id);
    if (!obs) return reply.code(404).send({ ok: false, error: 'not_found' });
    return { ok: true, observation: obs };
  });

  // -----------------------------------------------------------------------
  // Store Diagnostics
  // -----------------------------------------------------------------------

  /** GET /edge-gateways/stats -- Store statistics */
  server.get('/edge-gateways/stats', async (request, reply) => {
    return { ok: true, stats: getStoreStats() };
  });
}
