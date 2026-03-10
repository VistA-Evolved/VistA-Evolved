/**
 * UI Extension Slot routes -- Phase 359 (W18-P6)
 *
 * REST endpoints for managing UI extension slots and policies.
 * Prefix: /ui-extensions
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  registerExtension,
  getExtension,
  updateExtensionStatus,
  unregisterExtension,
  getExtensionsForSlot,
  listExtensions,
  getExtensionStats,
  setSlotPolicy,
  getSlotPolicy,
  listSlotPolicies,
  SLOT_LOCATIONS,
  type SlotLocation,
} from '../services/ui-extension-service.js';

export async function uiExtensionRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(req: FastifyRequest): string | null {
    const requestTenantId =
      typeof (req as any).tenantId === 'string' && (req as any).tenantId.trim().length > 0
        ? (req as any).tenantId.trim()
        : undefined;
    const sessionTenantId =
      typeof (req as any).session?.tenantId === 'string' &&
      (req as any).session.tenantId.trim().length > 0
        ? (req as any).session.tenantId.trim()
        : undefined;
    const headerTenantId = req.headers['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    return requestTenantId || sessionTenantId || headerTenant || null;
  }

  function requireTenantId(req: FastifyRequest, reply: FastifyReply): string | null {
    const tenantId = resolveTenantId(req);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  // -- Health ----------------------------------------------------------
  server.get('/ui-extensions/health', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const stats = getExtensionStats(tenantId);
    return reply.send({ ok: true, phase: 359, ...stats });
  });

  // -- Slot locations -------------------------------------------------
  server.get('/ui-extensions/slots', async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true, slotLocations: SLOT_LOCATIONS });
  });

  // -- Register extension ---------------------------------------------
  server.post('/ui-extensions', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const body = (req.body as any) || {};
    const { pluginId, slotLocation, label, componentRef, icon, priority, allowedRoles, config } =
      body;

    if (!pluginId || !slotLocation || !label || !componentRef) {
      return reply.code(400).send({
        ok: false,
        error: 'pluginId, slotLocation, label, componentRef required',
      });
    }

    if (!SLOT_LOCATIONS.includes(slotLocation)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid slotLocation. Valid: ${SLOT_LOCATIONS.join(', ')}`,
      });
    }

    try {
      const ext = registerExtension(tenantId, pluginId, slotLocation, {
        label,
        componentRef,
        icon,
        priority,
        allowedRoles,
        config,
      });
      return reply.code(201).send({ ok: true, extension: ext });
    } catch (_err: any) {
      return reply.code(400).send({ ok: false, error: 'UI extension registration failed' });
    }
  });

  // -- Get extension --------------------------------------------------
  server.get('/ui-extensions/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { id } = req.params as any;
    const ext = getExtension(id, tenantId);
    if (!ext) return reply.code(404).send({ ok: false, error: 'Extension not found' });
    return reply.send({ ok: true, extension: ext });
  });

  // -- Update extension status (approve/disable) ---------------------
  server.patch('/ui-extensions/:id/status', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const { status } = body;

    if (!status || !['active', 'disabled', 'pending_review'].includes(status)) {
      return reply.code(400).send({
        ok: false,
        error: 'status must be active|disabled|pending_review',
      });
    }

    const ext = updateExtensionStatus(id, tenantId, status);
    if (!ext) return reply.code(404).send({ ok: false, error: 'Extension not found' });
    return reply.send({ ok: true, extension: ext });
  });

  // -- Unregister extension -------------------------------------------
  server.delete('/ui-extensions/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { id } = req.params as any;
    const deleted = unregisterExtension(id, tenantId);
    if (!deleted) return reply.code(404).send({ ok: false, error: 'Extension not found' });
    return reply.send({ ok: true, deleted: true });
  });

  // -- Get extensions for a slot --------------------------------------
  server.get('/ui-extensions/slot/:location', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { location } = req.params as any;
    const query = (req.query as any) || {};
    const exts = getExtensionsForSlot(tenantId, location as SlotLocation, {
      status: query.status,
      role: query.role,
    });
    return reply.send({ ok: true, extensions: exts, count: exts.length });
  });

  // -- List all extensions --------------------------------------------
  server.get('/ui-extensions/list', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const query = (req.query as any) || {};
    const exts = listExtensions(tenantId, {
      pluginId: query.pluginId,
      status: query.status,
    });
    return reply.send({ ok: true, extensions: exts, count: exts.length });
  });

  // -- Set slot policy ------------------------------------------------
  server.post('/ui-extensions/policies', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const body = (req.body as any) || {};
    const { slotLocation, maxExtensions, requireApproval, adminRoles } = body;

    if (!slotLocation || !SLOT_LOCATIONS.includes(slotLocation)) {
      return reply.code(400).send({
        ok: false,
        error: `slotLocation required. Valid: ${SLOT_LOCATIONS.join(', ')}`,
      });
    }

    const policy = setSlotPolicy(tenantId, slotLocation, {
      maxExtensions,
      requireApproval,
      adminRoles,
    });
    return reply.send({ ok: true, policy });
  });

  // -- Get slot policy ------------------------------------------------
  server.get(
    '/ui-extensions/policies/:location',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const { location } = req.params as any;
      const policy = getSlotPolicy(tenantId, location as SlotLocation);
      if (!policy) return reply.code(404).send({ ok: false, error: 'No policy for this slot' });
      return reply.send({ ok: true, policy });
    }
  );

  // -- List all policies ----------------------------------------------
  server.get('/ui-extensions/policies', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const policies = listSlotPolicies(tenantId);
    return reply.send({ ok: true, policies, count: policies.length });
  });

  // -- Stats ----------------------------------------------------------
  server.get('/ui-extensions/stats', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const stats = getExtensionStats(tenantId);
    return reply.send({ ok: true, ...stats });
  });
}
