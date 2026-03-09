/**
 * integration-control-plane-routes.ts -- REST endpoints for Integration Control Plane v2
 *
 * Phase 318 (W14-P2)
 *
 * All endpoints are admin-only (enforced by AUTH_RULES pattern /api/platform/).
 *
 * Routes:
 *   POST   /api/platform/integrations/partners           — create partner
 *   GET    /api/platform/integrations/partners           — list partners for tenant
 *   GET    /api/platform/integrations/partners/:id       — get partner
 *   POST   /api/platform/integrations/partners/:id/status — update partner status
 *   POST   /api/platform/integrations/partners/:id/endpoints — add endpoint
 *   GET    /api/platform/integrations/partners/:id/endpoints — list endpoints
 *   POST   /api/platform/integrations/partners/:id/endpoints/:epId/toggle — toggle endpoint
 *   POST   /api/platform/integrations/partners/:id/credentials — add credential ref
 *   GET    /api/platform/integrations/partners/:id/credentials — list credential refs
 *   POST   /api/platform/integrations/partners/:id/credentials/:credId/rotate — rotate credential
 *   POST   /api/platform/integrations/partners/:id/routes — add route
 *   GET    /api/platform/integrations/partners/:id/routes — list routes
 *   POST   /api/platform/integrations/partners/:id/test — run connectivity test
 *   GET    /api/platform/integrations/partners/:id/test-runs — list test runs
 *   GET    /api/platform/integrations/partners/:id/test-runs/:runId — get test run
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  createPartner,
  getPartner,
  listPartners,
  updatePartnerStatus,
  addEndpoint,
  listEndpoints,
  toggleEndpoint,
  addCredentialRef,
  listCredentialRefs,
  rotateCredential,
  addRoute,
  listRoutes,
  startTestRun,
  getTestRunForPartner,
  listTestRuns,
  getValidTransitions,
  type IntegrationPartnerType,
  type PartnerStatus,
  type EndpointDirection,
  type EndpointProtocol,
} from '../services/integration-control-plane.js';

const VALID_TYPES: IntegrationPartnerType[] = ['HL7', 'X12', 'FHIR', 'PACS', 'OTHER'];
const VALID_PROTOCOLS: EndpointProtocol[] = ['MLLP', 'SFTP', 'AS2', 'HTTPS', 'DICOM'];
const VALID_DIRECTIONS: EndpointDirection[] = ['IN', 'OUT', 'BIDIRECTIONAL'];

function getTenantId(request: any): string | null {
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
  const tenantId = getTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

function getUserId(request: any): string {
  return (request as any).session?.duz || 'system';
}

export async function integrationControlPlaneRoutes(app: FastifyInstance): Promise<void> {
  // ─── Partners ────────────────────────────────────────────────────

  app.post('/api/platform/integrations/partners', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { name, type, description, contactEmail, tags } = body;
    if (!name || !type) {
      reply.code(400);
      return { ok: false, error: 'name and type are required' };
    }
    if (!VALID_TYPES.includes(type)) {
      reply.code(400);
      return { ok: false, error: `Invalid type. Valid: ${VALID_TYPES.join(', ')}` };
    }
    const partner = createPartner(
      tenantId,
      { name, type, description, contactEmail, tags },
      getUserId(request)
    );
    reply.code(201);
    return { ok: true, partner };
  });

  app.get('/api/platform/integrations/partners', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const partnersList = listPartners(tenantId);
    return { ok: true, count: partnersList.length, partners: partnersList };
  });

  app.get('/api/platform/integrations/partners/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const partner = getPartner(tenantId, id);
    if (!partner) {
      reply.code(404);
      return { ok: false, error: 'partner_not_found' };
    }
    return { ok: true, partner };
  });

  app.post('/api/platform/integrations/partners/:id/status', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { status } = body;
    if (!status) {
      reply.code(400);
      return { ok: false, error: 'status is required' };
    }
    const result = updatePartnerStatus(tenantId, id, status as PartnerStatus);
    if (!result.ok) {
      const code = result.error === 'partner_not_found' ? 404 : 409;
      reply.code(code);
      return { ok: false, error: result.error };
    }
    return {
      ok: true,
      partner: result.partner,
      validTransitions: getValidTransitions(result.partner!.status),
    };
  });

  // ─── Endpoints ───────────────────────────────────────────────────

  app.post('/api/platform/integrations/partners/:id/endpoints', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { direction, protocol, address, port, path, tlsMode, description } = body;
    if (!direction || !protocol || !address) {
      reply.code(400);
      return { ok: false, error: 'direction, protocol, and address are required' };
    }
    if (!VALID_DIRECTIONS.includes(direction)) {
      reply.code(400);
      return { ok: false, error: `Invalid direction. Valid: ${VALID_DIRECTIONS.join(', ')}` };
    }
    if (!VALID_PROTOCOLS.includes(protocol)) {
      reply.code(400);
      return { ok: false, error: `Invalid protocol. Valid: ${VALID_PROTOCOLS.join(', ')}` };
    }
    const ep = addEndpoint(tenantId, id, {
      direction,
      protocol,
      address,
      port,
      path,
      tlsMode,
      description,
    });
    if (!ep) {
      reply.code(404);
      return { ok: false, error: 'partner_not_found' };
    }
    reply.code(201);
    return { ok: true, endpoint: ep };
  });

  app.get('/api/platform/integrations/partners/:id/endpoints', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const eps = listEndpoints(tenantId, id);
    return { ok: true, count: eps.length, endpoints: eps };
  });

  app.post(
    '/api/platform/integrations/partners/:id/endpoints/:epId/toggle',
    async (request, reply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const { id, epId } = request.params as { id: string; epId: string };
      const body = (request.body as any) || {};
      const enabled = body.enabled !== false;
      const success = toggleEndpoint(tenantId, id, epId, enabled);
      if (!success) {
        reply.code(404);
        return { ok: false, error: 'endpoint_not_found' };
      }
      return { ok: true, enabled };
    }
  );

  // ─── Credential Refs ─────────────────────────────────────────────

  app.post('/api/platform/integrations/partners/:id/credentials', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { secretRef, label } = body;
    if (!secretRef || !label) {
      reply.code(400);
      return { ok: false, error: 'secretRef and label are required' };
    }
    const cred = addCredentialRef(tenantId, id, { secretRef, label });
    if (!cred) {
      reply.code(404);
      return { ok: false, error: 'partner_not_found' };
    }
    reply.code(201);
    return { ok: true, credential: cred };
  });

  app.get('/api/platform/integrations/partners/:id/credentials', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const creds = listCredentialRefs(tenantId, id);
    return { ok: true, count: creds.length, credentials: creds };
  });

  app.post(
    '/api/platform/integrations/partners/:id/credentials/:credId/rotate',
    async (request, reply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const { id, credId } = request.params as { id: string; credId: string };
      const body = (request.body as any) || {};
      const { newSecretRef } = body;
      if (!newSecretRef) {
        reply.code(400);
        return { ok: false, error: 'newSecretRef is required' };
      }
      const success = rotateCredential(tenantId, id, credId, newSecretRef);
      if (!success) {
        reply.code(404);
        return { ok: false, error: 'credential_not_found' };
      }
      return { ok: true, rotated: true };
    }
  );

  // ─── Routes ──────────────────────────────────────────────────────

  app.post('/api/platform/integrations/partners/:id/routes', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { messageType, routeTo, priority, enabled } = body;
    if (!messageType || !routeTo) {
      reply.code(400);
      return { ok: false, error: 'messageType and routeTo are required' };
    }
    const route = addRoute(tenantId, id, { messageType, routeTo, priority, enabled });
    if (!route) {
      reply.code(404);
      return { ok: false, error: 'partner_not_found' };
    }
    reply.code(201);
    return { ok: true, route };
  });

  app.get('/api/platform/integrations/partners/:id/routes', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const routesList = listRoutes(tenantId, id);
    return { ok: true, count: routesList.length, routes: routesList };
  });

  // ─── Test Runs ───────────────────────────────────────────────────

  app.post('/api/platform/integrations/partners/:id/test', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const run = startTestRun(tenantId, id, getUserId(request));
    if (!run) {
      reply.code(404);
      return { ok: false, error: 'partner_not_found' };
    }
    return { ok: true, testRun: run };
  });

  app.get('/api/platform/integrations/partners/:id/test-runs', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const runs = listTestRuns(tenantId, id);
    return { ok: true, count: runs.length, testRuns: runs };
  });

  app.get('/api/platform/integrations/partners/:id/test-runs/:runId', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id, runId } = request.params as { id: string; runId: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const run = getTestRunForPartner(tenantId, id, runId);
    if (!run) {
      reply.code(404);
      return { ok: false, error: 'test_run_not_found' };
    }
    return { ok: true, testRun: run };
  });
}
