/**
 * Phase 411 (W24-P3): Customer Integration Intake -- Routes
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../../auth/auth-routes.js';
import { log } from '../../lib/logger.js';
import {
  createIntake,
  getIntake,
  listIntakes,
  updateIntake,
  transitionIntake,
  getConfigArtifact,
  storeConfigArtifact,
  getIntakeDashboard,
} from './intake-store.js';
import { generateConfigFromIntake, validateIntakeForConfig } from './config-generator.js';

export default async function intakeRoutes(server: FastifyInstance): Promise<void> {
  // List intakes for tenant
  server.get('/pilots/intakes', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const qs = (request.query || {}) as Record<string, string>;
    return {
      ok: true,
      intakes: listIntakes(session.tenantId, { status: qs.status, partnerType: qs.partnerType }),
    };
  });

  // Get single intake
  server.get('/pilots/intakes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const rec = getIntake(id);
    if (!rec) return reply.code(404).send({ ok: false, error: 'Intake not found' });
    return { ok: true, intake: rec };
  });

  // Create intake
  server.post('/pilots/intakes', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body || {}) as Record<string, any>;
    try {
      const rec = createIntake({
        tenantId: session.tenantId,
        facilityId: body.facilityId || '',
        partnerName: body.partnerName || '',
        partnerType: body.partnerType || 'hl7',
        environment: body.environment || 'test',
        transport: body.transport || 'mllp',
        securityPosture: body.securityPosture || 'tls_server',
        hl7MessageTypes: body.hl7MessageTypes,
        hl7Version: body.hl7Version,
        hl7SendingFacility: body.hl7SendingFacility,
        hl7ReceivingFacility: body.hl7ReceivingFacility,
        x12TransactionSets: body.x12TransactionSets,
        x12SenderId: body.x12SenderId,
        x12ReceiverId: body.x12ReceiverId,
        x12TestIndicator: body.x12TestIndicator,
        deviceTypes: body.deviceTypes,
        deviceProtocol: body.deviceProtocol,
        hiePackId: body.hiePackId,
        hieDocumentTypes: body.hieDocumentTypes,
        contacts: body.contacts || [],
        testWindowStart: body.testWindowStart,
        testWindowEnd: body.testWindowEnd,
        goLiveDate: body.goLiveDate,
        status: 'draft',
        notes: body.notes,
      });
      return reply.code(201).send({ ok: true, intake: rec });
    } catch (err: any) {
      log.error('Pilot intake creation failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      return reply.code(400).send({ ok: false, error: 'Create failed' });
    }
  });

  // Update intake
  server.put('/pilots/intakes/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const body = (request.body || {}) as Record<string, any>;
    const rec = updateIntake(id, { ...body, tenantId: session.tenantId });
    if (!rec) return reply.code(404).send({ ok: false, error: 'Intake not found' });
    return { ok: true, intake: rec };
  });

  // Transition intake status
  server.post(
    '/pilots/intakes/:id/transition',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body || {}) as Record<string, any>;
      if (!body.status) return reply.code(400).send({ ok: false, error: 'status required' });
      const rec = transitionIntake(id, body.status);
      if (!rec) return reply.code(404).send({ ok: false, error: 'Intake not found' });
      return { ok: true, intake: rec };
    }
  );

  // Generate config from intake
  server.post(
    '/pilots/intakes/:id/generate-config',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const intake = getIntake(id);
      if (!intake) return reply.code(404).send({ ok: false, error: 'Intake not found' });

      const errors = validateIntakeForConfig(intake);
      if (errors.length > 0) {
        return reply.code(400).send({ ok: false, error: 'Validation failed', details: errors });
      }

      const artifact = generateConfigFromIntake(intake);
      storeConfigArtifact(artifact);
      transitionIntake(id, 'config_generated');
      return { ok: true, config: artifact };
    }
  );

  // Get generated config for an intake
  server.get('/pilots/intakes/:id/config', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const { id } = request.params as { id: string };
    const artifact = getConfigArtifact(id);
    if (!artifact) return reply.code(404).send({ ok: false, error: 'No config generated yet' });
    return { ok: true, config: artifact };
  });

  // Dashboard
  server.get('/pilots/intake/dashboard', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    return { ok: true, stats: getIntakeDashboard(session.tenantId) };
  });
}
