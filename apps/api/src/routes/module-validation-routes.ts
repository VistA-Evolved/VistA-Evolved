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
  /** Full validation report */
  server.get('/admin/module-validation/report', async (req, reply) => {
    const { tenantId } = (req.query as any) || {};
    const report = runAllValidations(tenantId || 'default');
    return reply.send({ ok: true, report });
  });

  /** Dependency integrity only */
  server.get('/admin/module-validation/dependencies', async (req, reply) => {
    const { tenantId } = (req.query as any) || {};
    const result = validateDependencyIntegrity(tenantId || 'default');
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
    const result = validateCoverageIntegrity(tenantId || 'default');
    return reply.send({ ok: true, category: result });
  });

  /** Summary: just pass/fail + counts */
  server.get('/admin/module-validation/summary', async (req, reply) => {
    const { tenantId } = (req.query as any) || {};
    const report = runAllValidations(tenantId || 'default');
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
