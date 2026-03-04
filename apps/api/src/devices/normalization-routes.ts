/**
 * LOINC / UCUM Normalization — Routes
 *
 * Phase 387 (W21-P10): REST endpoints for observation normalization,
 * mapping table queries, and QA validation.
 *
 * Endpoints:
 *   POST /devices/normalize                — Normalize single observation
 *   POST /devices/normalize/batch          — Normalize batch of observations
 *   GET  /devices/normalize/mappings       — List available mapping tables
 *   GET  /devices/normalize/mappings/loinc — List LOINC mappings
 *   GET  /devices/normalize/mappings/ucum  — List UCUM unit mappings
 *   POST /devices/normalize/validate       — QA validation (check mapping coverage)
 *   GET  /devices/normalize/stats          — Mapping statistics
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  normalizeObservation,
  normalizeObservationBatch,
  getMappingStats,
  MDC_TO_LOINC,
  LAB_TO_LOINC,
  UNIT_TO_UCUM,
} from './normalization-engine.js';

export default async function normalizationRoutes(server: FastifyInstance): Promise<void> {
  /** POST /devices/normalize — normalize single observation */
  server.post('/devices/normalize', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!body.sourceCode) {
      return reply.code(400).send({ ok: false, error: 'sourceCode required' });
    }
    const result = normalizeObservation(
      body.sourceSystem || 'unknown',
      body.sourceCode,
      body.sourceUnit || '',
      body.value !== undefined ? Number(body.value) : undefined
    );
    return { ok: true, normalization: result };
  });

  /** POST /devices/normalize/batch — normalize multiple observations */
  server.post('/devices/normalize/batch', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!Array.isArray(body.observations)) {
      return reply.code(400).send({ ok: false, error: 'observations array required' });
    }
    const results = normalizeObservationBatch(body.observations);
    const mappedCount = results.filter((r) => r.loincMapped).length;
    const unmappedCount = results.length - mappedCount;
    return {
      ok: true,
      count: results.length,
      mappedCount,
      unmappedCount,
      coverageRate: results.length > 0 ? mappedCount / results.length : 0,
      results,
    };
  });

  /** GET /devices/normalize/mappings — list available mapping tables */
  server.get('/devices/normalize/mappings', async () => {
    return {
      ok: true,
      tables: [
        {
          name: 'MDC_TO_LOINC',
          description: 'IEEE 11073 MDC to LOINC (vital signs, bedside monitors)',
          count: MDC_TO_LOINC.length,
        },
        {
          name: 'LAB_TO_LOINC',
          description: 'Lab analyte to LOINC (chemistry, blood gas, hematology, coag)',
          count: LAB_TO_LOINC.length,
        },
        {
          name: 'UNIT_TO_UCUM',
          description: 'Device units to UCUM (with conversion factors)',
          count: UNIT_TO_UCUM.length,
        },
      ],
    };
  });

  /** GET /devices/normalize/mappings/loinc — list LOINC mappings */
  server.get('/devices/normalize/mappings/loinc', async (req: FastifyRequest) => {
    const q = req.query as any;
    let mappings = [...MDC_TO_LOINC, ...LAB_TO_LOINC];
    if (q.system) {
      mappings = mappings.filter((m) => m.sourceSystem === q.system);
    }
    if (q.component) {
      mappings = mappings.filter((m) =>
        m.component.toLowerCase().includes(q.component.toLowerCase())
      );
    }
    return { ok: true, count: mappings.length, mappings };
  });

  /** GET /devices/normalize/mappings/ucum — list UCUM unit mappings */
  server.get('/devices/normalize/mappings/ucum', async () => {
    return { ok: true, count: UNIT_TO_UCUM.length, mappings: UNIT_TO_UCUM };
  });

  /** POST /devices/normalize/validate — QA validation */
  server.post('/devices/normalize/validate', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    if (!Array.isArray(body.observations)) {
      return reply.code(400).send({ ok: false, error: 'observations array required' });
    }

    const results = normalizeObservationBatch(body.observations);
    const issues: Array<{ index: number; sourceCode: string; warnings: string[] }> = [];

    for (let i = 0; i < results.length; i++) {
      if (results[i].warnings.length > 0) {
        issues.push({
          index: i,
          sourceCode: results[i].sourceCode || '',
          warnings: results[i].warnings,
        });
      }
    }

    const allMapped = issues.length === 0;
    return {
      ok: true,
      valid: allMapped,
      totalChecked: results.length,
      issueCount: issues.length,
      issues,
    };
  });

  /** GET /devices/normalize/stats — mapping statistics */
  server.get('/devices/normalize/stats', async () => {
    return { ok: true, stats: getMappingStats() };
  });
}
