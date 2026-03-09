/**
 * HL7v2 Use-Case Routes — Phase 260 (Wave 8 P4)
 *
 * Endpoints for HL7v2 use-case operations:
 * - POST /hl7/ingest — Accept raw HL7 and map to domain event
 * - GET /hl7/use-cases — List supported message type → domain event mappings
 * - GET /hl7/use-cases/fixtures — List available test fixtures
 */
import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { mapHl7ToDomainEvent, listSupportedMappings } from '../hl7/domain-mapper.js';
import { recordMessageEvent } from '../hl7/message-event-store.js';
import { addEnhancedDeadLetter } from '../hl7/dead-letter-enhanced.js';
import * as fs from 'fs/promises';
import * as path from 'path';

export async function hl7UseCaseRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(request: any): string | null {
    const sessionTenantId =
      typeof request?.session?.tenantId === 'string' && request.session.tenantId.trim().length > 0
        ? request.session.tenantId.trim()
        : undefined;
    const requestTenantId =
      typeof request?.tenantId === 'string' && request.tenantId.trim().length > 0
        ? request.tenantId.trim()
        : undefined;
    const headerTenantId = request?.headers?.['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    return sessionTenantId || requestTenantId || headerTenant || null;
  }

  function requireTenantId(request: any, reply: any): string | null {
    const tenantId = resolveTenantId(request);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  /**
   * POST /hl7/ingest — Accept raw HL7 message, parse, map to domain event.
   * Body: { rawMessage: string, tenantId?: string }
   */
  server.post('/hl7/ingest', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = (request.body as { rawMessage?: string; tenantId?: string }) || {};
    const raw = body.rawMessage;
    if (!raw || typeof raw !== 'string') {
      return reply.code(400).send({ ok: false, error: 'rawMessage is required' });
    }

    const tenantId = requireTenantId({ ...request, session }, reply);
    if (!tenantId) return;

    try {
      // Extract MSH fields for event recording
      const firstLine = raw.split(/\r?\n|\r/)[0] ?? '';
      const mshParts = firstLine.split('|');
      const sendingApp = mshParts[2] ?? '';
      const sendingFac = mshParts[3] ?? '';
      const messageType = mshParts[8] ?? '';
      const controlId = mshParts[9] ?? '';

      // Attempt domain mapping
      const domainEvent = mapHl7ToDomainEvent(raw);

      if (domainEvent) {
        // Record successful processing
        recordMessageEvent({
          tenantId,
          direction: 'inbound',
          messageType,
          messageControlId: controlId,
          sendingApplication: sendingApp,
          sendingFacility: sendingFac,
          receivingApplication: 'VISTA_EVOLVED',
          receivingFacility: tenantId,
          status: 'routed',
          rawMessage: raw,
        });

        return reply.send({
          ok: true,
          domainEvent,
          sourceMessageType: messageType,
          sourceControlId: controlId,
        });
      } else {
        // Dead-letter unmappable messages
        addEnhancedDeadLetter({
          messageType,
          messageControlId: controlId,
          sendingApplication: sendingApp,
          sendingFacility: sendingFac,
          reason: `Unsupported message type: ${messageType}`,
          rawMessage: raw,
          tenantId,
        });

        return reply.code(422).send({
          ok: false,
          error: 'Unsupported message type',
          messageType,
          controlId,
          detail: 'Message added to dead-letter queue for review',
        });
      }
    } catch (_err: unknown) {
      return reply.code(500).send({
        ok: false,
        error: 'HL7 ingest failed',
      });
    }
  });

  /**
   * GET /hl7/use-cases — List supported HL7 → domain event mappings
   */
  server.get('/hl7/use-cases', async (_request, reply) => {
    const mappings = listSupportedMappings();
    return reply.send({
      ok: true,
      mappings,
      totalMappings: mappings.length,
    });
  });

  /**
   * GET /hl7/use-cases/fixtures — List available HL7 test fixture files
   */
  server.get('/hl7/use-cases/fixtures', async (_request, reply) => {
    const fixturesDir = path.resolve(process.cwd(), '../../services/hl7/fixtures');
    try {
      await fs.access(fixturesDir);
      const allFiles = await fs.readdir(fixturesDir);
      const files = allFiles.filter((f) => f.endsWith('.hl7'));
      return reply.send({
        ok: true,
        fixtures: files.map((f) => ({
          name: f,
          messageType: f.replace(/_/g, '^').split('^')[0] + '^' + f.split('_')[1],
        })),
        totalFixtures: files.length,
      });
    } catch {
      return reply.send({ ok: true, fixtures: [], note: 'Could not read fixtures directory' });
    }
  });
}
