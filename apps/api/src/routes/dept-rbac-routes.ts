/**
 * Department RBAC Routes — Phase 348
 *
 * Admin endpoints for department role templates and membership management.
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import {
  seedDefaultTemplates,
  createTemplate,
  getTemplate,
  listTemplates,
  updateTemplate,
  assignMembership,
  listMemberships,
  revokeMembership,
  evaluateDeptAccess,
} from '../auth/dept-rbac-templates.js';
import type { DeptRoleAction } from '../auth/dept-rbac-templates.js';

export async function deptRbacRoutes(server: FastifyInstance): Promise<void> {
  function resolveTenantId(req: FastifyRequest): string | null {
    const sessionTenantId =
      typeof (req as any).session?.tenantId === 'string' &&
      (req as any).session.tenantId.trim().length > 0
        ? (req as any).session.tenantId.trim()
        : undefined;
    const requestTenantId =
      typeof (req as any).tenantId === 'string' && (req as any).tenantId.trim().length > 0
        ? (req as any).tenantId.trim()
        : undefined;
    return sessionTenantId || requestTenantId || null;
  }

  function requireTenantId(req: FastifyRequest, reply: FastifyReply): string | null {
    const tenantId = resolveTenantId(req);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  // ─── Templates ───────────────────────────────────────

  server.get('/dept-rbac/templates', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { departmentType, role } = (req.query as any) || {};
    return reply.send({
      ok: true,
      templates: listTemplates(tenantId, departmentType, role),
    });
  });

  server.get('/dept-rbac/templates/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { id } = req.params as { id: string };
    const template = getTemplate(id);
    if (!template || template.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: 'Template not found' });
    }
    return reply.send({ ok: true, template });
  });

  server.post('/dept-rbac/templates', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const body = (req.body as any) || {};
    if (!body.name || !body.departmentType || !body.role) {
      return reply.code(400).send({
        ok: false,
        error: 'name, departmentType, and role are required',
      });
    }
    const template = createTemplate(tenantId, {
      name: body.name,
      departmentType: body.departmentType,
      role: body.role,
      allowedActions: body.allowedActions || [],
      deniedActions: body.deniedActions || [],
      constraints: body.constraints || {},
      status: 'active',
    });
    return reply.code(201).send({ ok: true, template });
  });

  server.patch('/dept-rbac/templates/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { id } = req.params as { id: string };
    const body = (req.body as any) || {};
    const existing = getTemplate(id);
    if (!existing || existing.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: 'Template not found' });
    }
    const updated = updateTemplate(tenantId, id, body);
    if (!updated) {
      return reply.code(404).send({ ok: false, error: 'Template not found' });
    }
    return reply.send({ ok: true, template: updated });
  });

  server.post('/dept-rbac/seed-defaults', async (_req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(_req, reply);
    if (!session) return;
    const tenantId = requireTenantId(_req, reply);
    if (!tenantId) return;
    const seeded = seedDefaultTemplates(tenantId);
    return reply.send({ ok: true, seeded: seeded.length, templates: seeded });
  });

  // ─── Memberships ─────────────────────────────────────

  server.get('/dept-rbac/memberships', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { userId, departmentId } = (req.query as any) || {};
    return reply.send({
      ok: true,
      memberships: listMemberships(tenantId, userId, departmentId),
    });
  });

  server.post('/dept-rbac/memberships', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const body = (req.body as any) || {};
    if (!body.userId || !body.departmentId || !body.templateId || !body.grantedBy) {
      return reply.code(400).send({
        ok: false,
        error: 'userId, departmentId, templateId, and grantedBy are required',
      });
    }
    const membership = assignMembership(tenantId, {
      userId: body.userId,
      departmentId: body.departmentId,
      templateId: body.templateId,
      grantedBy: body.grantedBy,
      expiresAt: body.expiresAt || null,
      status: 'active',
    });
    return reply.code(201).send({ ok: true, membership });
  });

  server.delete('/dept-rbac/memberships/:id', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const { id } = req.params as { id: string };
    const existing = listMemberships(tenantId).find((membership) => membership.id === id);
    if (!existing) {
      return reply.code(404).send({ ok: false, error: 'Membership not found' });
    }
    const ok = revokeMembership(tenantId, id);
    if (!ok) {
      return reply.code(404).send({ ok: false, error: 'Membership not found' });
    }
    return reply.send({ ok: true, revoked: true });
  });

  // ─── Access Decision ─────────────────────────────────

  server.post('/dept-rbac/evaluate', async (req: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(req, reply);
    if (!session) return;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const body = (req.body as any) || {};
    if (!body.userId || !body.departmentId || !body.action) {
      return reply.code(400).send({
        ok: false,
        error: 'userId, departmentId, and action are required',
      });
    }
    const decision = evaluateDeptAccess(
      tenantId,
      body.userId,
      body.departmentId,
      body.action as DeptRoleAction
    );
    return reply.send({ ok: true, decision });
  });
}

export default deptRbacRoutes;
