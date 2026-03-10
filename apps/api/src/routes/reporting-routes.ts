/**
 * Reporting & Data-Access-Control Routes -- Phases 365/368 (W19-P4/P7)
 *
 * Fastify plugin for the analytics reporting API, dataset access controls,
 * column masking, and export auditing.
 *
 * Route prefix: /analytics/reports/*
 *                /analytics/datasets/*
 *                /analytics/access/*
 *
 * All routes require session auth + analytics_viewer or analytics_admin.
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { audit, type AuditAction } from '../lib/audit.js';
import {
  ANALYTICS_ROLE_PERMISSIONS,
  type AnalyticsPermission,
} from '../config/analytics-config.js';
import type { ReportId, DatasetId } from '../analytics/extract-types.js';
import {
  getReportDefinitions,
  getReportDefinition,
  generateReport,
  exportReportCsv,
  exportReportJson,
} from '../analytics/reporting-service.js';
import {
  getDatasets,
  getDataset,
  grantDatasetPermission,
  revokeDatasetPermission,
  listDatasetPermissions,
  applyColumnMasking,
  getColumnMaskRules,
  setColumnMaskRules,
  recordExportAudit,
  getExportAuditLog,
} from '../analytics/data-access-controls.js';

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = (request as any).session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: 'system' };
}

function hasAnalyticsPerm(role: string, perm: AnalyticsPermission): boolean {
  const perms = ANALYTICS_ROLE_PERMISSIONS[role as keyof typeof ANALYTICS_ROLE_PERMISSIONS];
  if (!perms) return false;
  return perms.includes(perm);
}

function requirePerm(session: any, perm: AnalyticsPermission, reply: any): void {
  if (!hasAnalyticsPerm(session.role, perm)) {
    reply.code(403).send({ ok: false, error: `Missing permission: ${perm}` });
    throw new Error(`Missing permission: ${perm}`);
  }
}

function getTenantId(request: any): string | null {
  const headerTenantId = request.headers?.['x-tenant-id'];
  const headerTenant =
    typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
      ? headerTenantId.trim()
      : undefined;
  return (request as any).session?.tenantId || (request as any).tenantId || headerTenant || null;
}

function requireTenantId(request: any, reply: any): string | null {
  const tenantId = getTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

/* ================================================================== */
/* Route Plugin                                                         */
/* ================================================================== */

export default async function w19ReportingRoutes(server: FastifyInstance): Promise<void> {
  /* -- REPORTING API (Phase 365) ---------------------------------- */

  server.get('/analytics/reports', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_viewer', reply);
    const q = request.query as any;
    const reports = getReportDefinitions(q.category);
    return reply.send({ ok: true, reports, count: reports.length });
  });

  server.get('/analytics/reports/:reportId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_viewer', reply);
    const { reportId } = request.params as any;
    const report = getReportDefinition(reportId as ReportId);
    if (!report) return reply.code(404).send({ ok: false, error: 'Report not found' });
    return reply.send({ ok: true, report });
  });

  server.post('/analytics/reports/:reportId/generate', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_admin', reply);
    const { reportId } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    try {
      const result = generateReport(reportId as ReportId, tenantId, body.parameters || {});
      audit('analytics.report.generate' as AuditAction, 'success', auditActor(request), {
        detail: { reportId, rowCount: result.data.length },
      });
      return reply.send({ ok: true, result });
    } catch (e: any) {
      return reply.code(400).send({ ok: false, error: e.message });
    }
  });

  server.post('/analytics/reports/:reportId/export', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_admin', reply);
    const { reportId } = request.params as any;
    const body = (request.body as any) || {};
    const format: 'csv' | 'json' = body.format === 'csv' ? 'csv' : 'json';
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    try {
      const result = generateReport(reportId as ReportId, tenantId, body.parameters || {});

      // Apply column masking before export (per-row)
      const datasetId: DatasetId = 'report_outputs';
      const maskedData = result.data.map((row) => applyColumnMasking(tenantId, datasetId, row, session.role));

      const maskedResult = { ...result, data: maskedData };
      const exported =
        format === 'csv' ? exportReportCsv(maskedResult) : exportReportJson(maskedResult);

      // Record the export for audit
      recordExportAudit(tenantId, datasetId, session.duz, format, maskedData.length, `reportId=${reportId}`);

      audit('analytics.report.export' as AuditAction, 'success', auditActor(request), {
        detail: { reportId, format, rowCount: maskedData.length },
      });

      if (format === 'csv') {
        return reply.header('Content-Type', 'text/csv').send(exported);
      }
      return reply.send({ ok: true, data: exported });
    } catch (e: any) {
      return reply.code(400).send({ ok: false, error: e.message });
    }
  });

  /* -- DATASETS (Phase 368) --------------------------------------- */

  server.get('/analytics/datasets', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_viewer', reply);
    return reply.send({ ok: true, datasets: getDatasets() });
  });

  server.get('/analytics/datasets/:datasetId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_viewer', reply);
    const { datasetId } = request.params as any;
    const ds = getDataset(datasetId as DatasetId);
    if (!ds) return reply.code(404).send({ ok: false, error: 'Dataset not found' });
    return reply.send({ ok: true, dataset: ds });
  });

  /* -- ACCESS CONTROLS (Phase 368) -------------------------------- */

  server.get('/analytics/access/permissions', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_admin', reply);
    const q = request.query as any;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const perms = listDatasetPermissions(tenantId);
    const filtered = q.datasetId ? perms.filter((p) => p.datasetId === q.datasetId) : perms;
    return reply.send({ ok: true, permissions: filtered, count: filtered.length });
  });

  server.post('/analytics/access/permissions', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_admin', reply);
    const body = (request.body as any) || {};
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    if (!body.datasetId || !body.role || !body.actions) {
      return reply.code(400).send({ ok: false, error: 'datasetId, role, and actions required' });
    }
    const perm = grantDatasetPermission(tenantId, body.datasetId as DatasetId, body.role, body.actions, session.duz);
    audit('analytics.access.grant' as AuditAction, 'success', auditActor(request), {
      detail: { datasetId: body.datasetId, role: body.role, actions: body.actions },
    });
    return reply.send({ ok: true, permission: perm });
  });

  server.delete('/analytics/access/permissions', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_admin', reply);
    const q = request.query as any;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    if (!q.datasetId || !q.role) {
      return reply.code(400).send({ ok: false, error: 'datasetId and role required' });
    }
    const revoked = revokeDatasetPermission(tenantId, q.datasetId as DatasetId, q.role);
    if (!revoked) return reply.code(404).send({ ok: false, error: 'Permission not found' });
    audit('analytics.access.revoke' as AuditAction, 'success', auditActor(request), {
      detail: { datasetId: q.datasetId, role: q.role },
    });
    return reply.send({ ok: true, revoked: true });
  });

  /* -- COLUMN MASKING (Phase 368) --------------------------------- */

  server.get('/analytics/access/mask/:datasetId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_admin', reply);
    const { datasetId } = request.params as any;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return reply.send({
      ok: true,
      rules: getColumnMaskRules(tenantId, datasetId as DatasetId),
    });
  });

  server.put('/analytics/access/mask/:datasetId', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_admin', reply);
    const { datasetId } = request.params as any;
    const body = (request.body as any) || {};
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    if (!body.rules || !Array.isArray(body.rules)) {
      return reply.code(400).send({ ok: false, error: 'rules array required' });
    }
    setColumnMaskRules(tenantId, datasetId as DatasetId, body.rules);
    audit('analytics.access.mask' as AuditAction, 'success', auditActor(request), {
      detail: { datasetId, ruleCount: body.rules.length },
    });
    return reply.send({
      ok: true,
      rules: getColumnMaskRules(tenantId, datasetId as DatasetId),
    });
  });

  /* -- EXPORT AUDIT (Phase 368) ----------------------------------- */

  server.get('/analytics/access/export-audit', async (request, reply) => {
    const session = await requireSession(request, reply);
    requirePerm(session, 'analytics_admin', reply);
    const q = request.query as any;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const result = getExportAuditLog(tenantId, parseInt(q.limit) || 100);
    return reply.send({ ok: true, entries: result.entries, count: result.total });
  });
}
