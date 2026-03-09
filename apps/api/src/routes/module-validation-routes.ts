/**
 * module-validation-routes.ts -- Module packaging validation REST endpoints (Phase 163)
 *
 * All routes under /admin/module-validation/* (admin auth required).
 */

import type { FastifyInstance } from 'fastify';
import {
  runAllValidations,
  validateDependencyIntegrity,
  validateBoundaryIntegrity,
  validateCoverageIntegrity,
} from '../modules/validation/index.js';

export default async function moduleValidationRoutes(server: FastifyInstance) {
  function resolveTenantId(req: any, explicitTenantId?: string): string | null {
    if (typeof explicitTenantId === 'string' && explicitTenantId.trim().length > 0) {
      return explicitTenantId.trim();
    }
    const requestTenantId =
      typeof req?.tenantId === 'string' && req.tenantId.trim().length > 0 ? req.tenantId.trim() : undefined;
    const sessionTenantId =
      typeof req?.session?.tenantId === 'string' && req.session.tenantId.trim().length > 0
        ? req.session.tenantId.trim()
        : undefined;
    const headerTenantId = req?.headers?.['x-tenant-id'];
    const headerTenant =
      typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined;
    return requestTenantId || sessionTenantId || headerTenant || null;
  }

  function requireTenantId(req: any, reply: any, explicitTenantId?: string): string | null {
    const tenantId = resolveTenantId(req, explicitTenantId);
    if (tenantId) return tenantId;
    reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
    return null;
  }

  /** Full validation report */
  server.get('/admin/module-validation/report', async (req, reply) => {
    const { tenantId } = (req.query as any) || {};
    const resolvedTenantId = requireTenantId(req, reply, tenantId);
    if (!resolvedTenantId) return;
    const report = runAllValidations(resolvedTenantId);
    return reply.send({ ok: true, report });
  });

  /** Dependency integrity only */
  server.get('/admin/module-validation/dependencies', async (req, reply) => {
    const { tenantId } = (req.query as any) || {};
    const resolvedTenantId = requireTenantId(req, reply, tenantId);
    if (!resolvedTenantId) return;
    const result = validateDependencyIntegrity(resolvedTenantId);
    return reply.send({ ok: true, category: result });
  });

  /** Boundary integrity only */
  server.get('/admin/module-validation/boundaries', async (_req, reply) => {
    const result = validateBoundaryIntegrity();
    return reply.send({ ok: true, category: result });
  });

  /** Coverage integrity only */
  server.get('/admin/module-validation/coverage', async (req, reply) => {
    const { tenantId } = (req.query as any) || {};
    const resolvedTenantId = requireTenantId(req, reply, tenantId);
    if (!resolvedTenantId) return;
    const result = validateCoverageIntegrity(resolvedTenantId);
    return reply.send({ ok: true, category: result });
  });

  /** Summary: just pass/fail + counts */
  server.get('/admin/module-validation/summary', async (req, reply) => {
    const { tenantId } = (req.query as any) || {};
    const resolvedTenantId = requireTenantId(req, reply, tenantId);
    if (!resolvedTenantId) return;
    const report = runAllValidations(resolvedTenantId);
    return reply.send({
      ok: true,
      passed: report.passed,
      errorCount: report.errorCount,
      warningCount: report.warningCount,
      infoCount: report.infoCount,
      activeSku: report.activeSku,
      categoryCount: report.categories.length,
    });
  });
}
