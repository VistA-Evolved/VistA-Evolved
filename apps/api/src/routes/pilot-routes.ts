/**
 * Pilot Routes -- Phase 246: Pilot Hospital Hardening
 *
 * Routes:
 *   GET  /admin/pilot/sites             -- List all pilot sites
 *   POST /admin/pilot/sites             -- Create a new pilot site
 *   GET  /admin/pilot/sites/:id         -- Get site detail
 *   PATCH /admin/pilot/sites/:id        -- Update site config
 *   DELETE /admin/pilot/sites/:id       -- Delete site
 *   POST /admin/pilot/sites/:id/preflight -- Run preflight checks
 *   GET  /admin/pilot/summary           -- Summary stats
 */

import type { FastifyInstance } from 'fastify';
import { requireSession, requireRole } from '../auth/auth-routes.js';
import {
  createSite,
  getSite,
  listSites,
  updateSite,
  deleteSite,
  getSiteSummary,
  type CreateSiteRequest,
} from '../pilot/site-config.js';
import { runPreflightChecks } from '../pilot/preflight.js';

function resolveTenantId(request: any): string | null {
  const headerTenantId = request?.headers?.['x-tenant-id'];
  const headerTenant =
    typeof headerTenantId === 'string' && headerTenantId.trim() ? headerTenantId.trim() : null;
  const requestTenantId =
    typeof request?.tenantId === 'string' && request.tenantId.trim() ? request.tenantId.trim() : null;
  const sessionTenantId =
    typeof request?.session?.tenantId === 'string' && request.session.tenantId.trim()
      ? request.session.tenantId.trim()
      : null;
  return headerTenant || requestTenantId || sessionTenantId || null;
}

function requireTenantId(request: any, reply: any): string | null {
  const tenantId = resolveTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

export default async function pilotRoutes(server: FastifyInstance): Promise<void> {
  /* -- GET /admin/pilot/sites ----------------------------------- */
  server.get('/admin/pilot/sites', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const sites = listSites(tenantId);
    return { ok: true, sites };
  });

  /* -- POST /admin/pilot/sites ---------------------------------- */
  server.post('/admin/pilot/sites', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const body = (request.body as any) || {};
    if (!body.name || !body.code) {
      return reply.code(400).send({ ok: false, error: 'name and code are required' });
    }

    try {
      const site = createSite({ ...(body as CreateSiteRequest), tenantId });
      return { ok: true, site };
    } catch (_err: any) {
      return reply.code(409).send({ ok: false, error: 'Pilot site registration conflict' });
    }
  });

  /* -- GET /admin/pilot/sites/:id ------------------------------- */
  server.get('/admin/pilot/sites/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    const site = getSite(id, tenantId);
    if (!site) return reply.code(404).send({ ok: false, error: 'Site not found' });

    return { ok: true, site };
  });

  /* -- PATCH /admin/pilot/sites/:id ----------------------------- */
  server.patch('/admin/pilot/sites/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};

    try {
      const site = updateSite(id, tenantId, body);
      return { ok: true, site };
    } catch (_err: any) {
      return reply.code(404).send({ ok: false, error: 'Pilot site update failed' });
    }
  });

  /* -- DELETE /admin/pilot/sites/:id ---------------------------- */
  server.delete('/admin/pilot/sites/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    const deleted = deleteSite(id, tenantId);
    if (!deleted) return reply.code(404).send({ ok: false, error: 'Site not found' });

    return { ok: true };
  });

  /* -- POST /admin/pilot/sites/:id/preflight -------------------- */
  server.post('/admin/pilot/sites/:id/preflight', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const { id } = request.params as { id: string };
    const site = getSite(id, tenantId);
    if (!site) return reply.code(404).send({ ok: false, error: 'Site not found' });

    const result = await runPreflightChecks(site);

    // Update site with preflight score
    try {
      updateSite(id, tenantId, {
        lastPreflightScore: result.score,
        status: result.readiness === 'ready' ? 'ready' : 'preflight',
      });
    } catch {
      /* site may have been deleted between check and update */
    }

    return { ok: true, preflight: result };
  });

  /* -- GET /admin/pilot/summary --------------------------------- */
  server.get('/admin/pilot/summary', async (request, reply) => {
    const session = await requireSession(request, reply);
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    const summary = getSiteSummary(listSites(tenantId));
    return { ok: true, summary };
  });
}
