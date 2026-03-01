/**
 * compliance-routes.ts — REST endpoints for compliance evidence mapping.
 *
 * Phase 315 (W13-P7)
 *
 * Endpoints:
 *   GET  /compliance/matrix           — Full compliance matrix
 *   GET  /compliance/summary          — Per-framework summary
 *   GET  /compliance/summary/:fw      — Single framework summary
 *   GET  /compliance/requirements     — Filter requirements by category/status
 *   GET  /compliance/categories       — List unique categories
 *   GET  /compliance/evidence         — All evidence artifacts
 *   GET  /compliance/gaps             — Planned/partial requirements (gaps)
 */

import { FastifyInstance } from 'fastify';
import {
  buildComplianceMatrix,
  getComplianceSummary,
  getRequirementsByCategory,
  getRequirementsByStatus,
  getCategories,
  getAllEvidence,
  type RegulatoryFramework,
  type ComplianceStatus,
} from '../services/compliance-matrix.js';

const VALID_FRAMEWORKS: RegulatoryFramework[] = ['HIPAA', 'DPA_PH', 'DPA_GH'];
const VALID_STATUSES: ComplianceStatus[] = ['implemented', 'partial', 'planned', 'not_applicable'];

export async function complianceRoutes(app: FastifyInstance): Promise<void> {

  // Full matrix
  app.get('/compliance/matrix', async (_request, _reply) => {
    const matrix = buildComplianceMatrix();
    return { ok: true, ...matrix };
  });

  // Per-framework summaries
  app.get('/compliance/summary', async (_request, _reply) => {
    const summaries = VALID_FRAMEWORKS.map((fw) => getComplianceSummary(fw));
    return { ok: true, summaries };
  });

  // Single framework summary
  app.get('/compliance/summary/:fw', async (request, reply) => {
    const { fw } = request.params as { fw: string };
    const framework = fw.toUpperCase() as RegulatoryFramework;
    if (!VALID_FRAMEWORKS.includes(framework)) {
      reply.code(400);
      return { ok: false, error: `Invalid framework. Valid: ${VALID_FRAMEWORKS.join(', ')}` };
    }
    const summary = getComplianceSummary(framework);
    return { ok: true, ...summary };
  });

  // Filter by category and/or status
  app.get('/compliance/requirements', async (request, _reply) => {
    const { category, status } = request.query as { category?: string; status?: string };
    let results = buildComplianceMatrix().requirements;

    if (category) {
      results = results.filter((r) => r.category === category);
    }
    if (status && VALID_STATUSES.includes(status as ComplianceStatus)) {
      results = results.filter((r) => r.status === status);
    }

    return { ok: true, count: results.length, requirements: results };
  });

  // List categories
  app.get('/compliance/categories', async (_request, _reply) => {
    const categories = getCategories();
    return { ok: true, categories };
  });

  // All evidence artifacts
  app.get('/compliance/evidence', async (_request, _reply) => {
    const evidence = getAllEvidence();
    return { ok: true, count: evidence.length, evidence };
  });

  // Gaps: planned + partial requirements
  app.get('/compliance/gaps', async (_request, _reply) => {
    const planned = buildComplianceMatrix().requirements.filter(
      (r) => r.status === 'planned' || r.status === 'partial'
    );
    return {
      ok: true,
      count: planned.length,
      gaps: planned.map((r) => ({
        id: r.id,
        framework: r.framework,
        title: r.title,
        status: r.status,
        category: r.category,
        notes: r.notes,
      })),
    };
  });
}
