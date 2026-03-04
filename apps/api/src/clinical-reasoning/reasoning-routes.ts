/**
 * Phase 396 (W22-P8): Clinical Reasoning + Quality Measures -- REST Routes
 *
 * CQL Libraries:
 *   GET  /clinical-reasoning/libraries                -- List libraries
 *   POST /clinical-reasoning/libraries                -- Create library (admin)
 *   GET  /clinical-reasoning/libraries/:id            -- Get library
 *   PUT  /clinical-reasoning/libraries/:id            -- Update library (admin)
 *   DELETE /clinical-reasoning/libraries/:id          -- Delete library (admin)
 *
 * Quality Measures:
 *   GET  /clinical-reasoning/measures                 -- List measures
 *   POST /clinical-reasoning/measures                 -- Create measure (admin)
 *   GET  /clinical-reasoning/measures/:id             -- Get measure
 *   PUT  /clinical-reasoning/measures/:id             -- Update measure (admin)
 *   DELETE /clinical-reasoning/measures/:id           -- Delete measure (admin)
 *
 * Measure Evaluation:
 *   POST /clinical-reasoning/measures/:id/evaluate    -- Start evaluation
 *   GET  /clinical-reasoning/evaluations              -- List evaluation results
 *   GET  /clinical-reasoning/evaluations/:id          -- Get evaluation result
 *
 * Patient Measure Results:
 *   GET  /clinical-reasoning/patient-results          -- List patient results
 *   POST /clinical-reasoning/patient-results          -- Create patient result
 *
 * Plan Definitions:
 *   GET  /clinical-reasoning/plan-definitions         -- List
 *   POST /clinical-reasoning/plan-definitions         -- Create (admin)
 *   GET  /clinical-reasoning/plan-definitions/:id     -- Get
 *   PUT  /clinical-reasoning/plan-definitions/:id     -- Update (admin)
 *   DELETE /clinical-reasoning/plan-definitions/:id   -- Delete (admin)
 *
 * Activity Definitions:
 *   GET  /clinical-reasoning/activity-definitions      -- List
 *   POST /clinical-reasoning/activity-definitions      -- Create (admin)
 *   GET  /clinical-reasoning/activity-definitions/:id  -- Get
 *   PUT  /clinical-reasoning/activity-definitions/:id  -- Update (admin)
 *   DELETE /clinical-reasoning/activity-definitions/:id -- Delete (admin)
 *
 * Reports:
 *   GET  /clinical-reasoning/reports                   -- List reports
 *   POST /clinical-reasoning/reports                   -- Generate report
 *   GET  /clinical-reasoning/reports/:id               -- Get report
 *
 * Dashboard:
 *   GET  /clinical-reasoning/dashboard                 -- Dashboard stats
 *
 * Auth: session-based; admin for create/update/delete.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { log } from '../lib/logger.js';
import {
  listCqlLibraries,
  getCqlLibrary,
  createCqlLibrary,
  updateCqlLibrary,
  deleteCqlLibrary,
  listQualityMeasures,
  getQualityMeasure,
  createQualityMeasure,
  updateQualityMeasure,
  deleteQualityMeasure,
  listMeasureEvalResults,
  getMeasureEvalResult,
  startMeasureEvaluation,
  listPatientMeasureResults,
  createPatientMeasureResult,
  listPlanDefinitions,
  getPlanDefinition,
  createPlanDefinition,
  updatePlanDefinition,
  deletePlanDefinition,
  listActivityDefinitions,
  getActivityDefinition,
  createActivityDefinition,
  updateActivityDefinition,
  deleteActivityDefinition,
  listMeasureReports,
  getMeasureReport,
  generateMeasureReport,
  getClinicalReasoningDashboardStats,
} from './reasoning-store.js';

export default async function clinicalReasoningRoutes(server: FastifyInstance) {
  // ---- CQL Libraries ----

  server.get(
    '/clinical-reasoning/libraries',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return { ok: true, libraries: listCqlLibraries(session.tenantId) };
    }
  );

  server.post(
    '/clinical-reasoning/libraries',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body as any) || {};
      const { name, version, cqlSource, elmJson, status, dependencies, valueSetRefs } = body;
      if (!name || !version || !cqlSource) {
        return reply.code(400).send({ ok: false, error: 'name, version, and cqlSource required' });
      }
      try {
        const lib = createCqlLibrary({
          tenantId: session.tenantId,
          name,
          version,
          cqlSource,
          elmJson: elmJson || null,
          status: status || 'draft',
          dependencies: dependencies || [],
          valueSetRefs: valueSetRefs || [],
        });
        return reply.code(201).send({ ok: true, library: lib });
      } catch (err: any) {
        log.error('CQL library creation failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return reply.code(409).send({ ok: false, error: 'Internal error' });
      }
    }
  );

  server.get(
    '/clinical-reasoning/libraries/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const lib = getCqlLibrary(id);
      if (!lib) return reply.code(404).send({ ok: false, error: 'Library not found' });
      return { ok: true, library: lib };
    }
  );

  server.put(
    '/clinical-reasoning/libraries/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const updated = updateCqlLibrary(id, body);
      if (!updated) return reply.code(404).send({ ok: false, error: 'Library not found' });
      return { ok: true, library: updated };
    }
  );

  server.delete(
    '/clinical-reasoning/libraries/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      if (!deleteCqlLibrary(id))
        return reply.code(404).send({ ok: false, error: 'Library not found' });
      return { ok: true };
    }
  );

  // ---- Quality Measures ----

  server.get(
    '/clinical-reasoning/measures',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return { ok: true, measures: listQualityMeasures(session.tenantId) };
    }
  );

  server.post(
    '/clinical-reasoning/measures',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body as any) || {};
      const {
        measureId,
        name,
        description,
        scoring,
        type,
        program,
        cqlLibraryId,
        populations,
        measurementPeriodStart,
        measurementPeriodEnd,
        improvementNotation,
        status,
        contentPackId,
      } = body;
      if (!measureId || !name || !scoring || !populations) {
        return reply
          .code(400)
          .send({ ok: false, error: 'measureId, name, scoring, and populations required' });
      }
      try {
        const measure = createQualityMeasure({
          tenantId: session.tenantId,
          measureId,
          name,
          description: description || '',
          scoring,
          type: type || 'process',
          program: program || 'custom',
          cqlLibraryId: cqlLibraryId || '',
          populations,
          measurementPeriodStart: measurementPeriodStart || new Date().toISOString(),
          measurementPeriodEnd: measurementPeriodEnd || new Date().toISOString(),
          improvementNotation: improvementNotation || 'increase',
          status: status || 'draft',
          contentPackId: contentPackId || null,
        });
        return reply.code(201).send({ ok: true, measure });
      } catch (err: any) {
        log.error('Quality measure creation failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return reply.code(409).send({ ok: false, error: 'Internal error' });
      }
    }
  );

  server.get(
    '/clinical-reasoning/measures/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const measure = getQualityMeasure(id);
      if (!measure) return reply.code(404).send({ ok: false, error: 'Measure not found' });
      return { ok: true, measure };
    }
  );

  server.put(
    '/clinical-reasoning/measures/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const updated = updateQualityMeasure(id, body);
      if (!updated) return reply.code(404).send({ ok: false, error: 'Measure not found' });
      return { ok: true, measure: updated };
    }
  );

  server.delete(
    '/clinical-reasoning/measures/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      if (!deleteQualityMeasure(id))
        return reply.code(404).send({ ok: false, error: 'Measure not found' });
      return { ok: true };
    }
  );

  // ---- Measure Evaluation ----

  server.post(
    '/clinical-reasoning/measures/:id/evaluate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const { periodStart, periodEnd } = body;
      const measure = getQualityMeasure(id);
      if (!measure) return reply.code(404).send({ ok: false, error: 'Measure not found' });
      const result = startMeasureEvaluation(
        session.tenantId,
        id,
        periodStart || measure.measurementPeriodStart,
        periodEnd || measure.measurementPeriodEnd
      );
      return reply.code(202).send({ ok: true, evaluation: result });
    }
  );

  server.get(
    '/clinical-reasoning/evaluations',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return { ok: true, evaluations: listMeasureEvalResults(session.tenantId) };
    }
  );

  server.get(
    '/clinical-reasoning/evaluations/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const result = getMeasureEvalResult(id);
      if (!result) return reply.code(404).send({ ok: false, error: 'Evaluation not found' });
      return { ok: true, evaluation: result };
    }
  );

  // ---- Patient Measure Results ----

  server.get(
    '/clinical-reasoning/patient-results',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { measureId, patientDfn } = request.query as {
        measureId?: string;
        patientDfn?: string;
      };
      return {
        ok: true,
        results: listPatientMeasureResults(session.tenantId, { measureId, patientDfn }),
      };
    }
  );

  server.post(
    '/clinical-reasoning/patient-results',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body as any) || {};
      const { measureId, patientDfn, populationMembership, periodStart, periodEnd, notes } = body;
      if (!measureId || !patientDfn || !populationMembership) {
        return reply
          .code(400)
          .send({ ok: false, error: 'measureId, patientDfn, and populationMembership required' });
      }
      try {
        const result = createPatientMeasureResult({
          tenantId: session.tenantId,
          measureId,
          patientDfn,
          populationMembership,
          periodStart: periodStart || new Date().toISOString(),
          periodEnd: periodEnd || new Date().toISOString(),
          notes: notes || null,
        });
        return reply.code(201).send({ ok: true, result });
      } catch (err: any) {
        log.error('Patient measure result creation failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return reply.code(409).send({ ok: false, error: 'Internal error' });
      }
    }
  );

  // ---- Plan Definitions ----

  server.get(
    '/clinical-reasoning/plan-definitions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return { ok: true, planDefinitions: listPlanDefinitions(session.tenantId) };
    }
  );

  server.post(
    '/clinical-reasoning/plan-definitions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body as any) || {};
      const { name, title, description, status, cqlLibraryId, actions, goals } = body;
      if (!name || !title) {
        return reply.code(400).send({ ok: false, error: 'name and title required' });
      }
      try {
        const plan = createPlanDefinition({
          tenantId: session.tenantId,
          name,
          title,
          description: description || '',
          status: status || 'draft',
          cqlLibraryId: cqlLibraryId || null,
          actions: actions || [],
          goals: goals || [],
        });
        return reply.code(201).send({ ok: true, planDefinition: plan });
      } catch (err: any) {
        log.error('Plan definition creation failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return reply.code(409).send({ ok: false, error: 'Internal error' });
      }
    }
  );

  server.get(
    '/clinical-reasoning/plan-definitions/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const plan = getPlanDefinition(id);
      if (!plan) return reply.code(404).send({ ok: false, error: 'PlanDefinition not found' });
      return { ok: true, planDefinition: plan };
    }
  );

  server.put(
    '/clinical-reasoning/plan-definitions/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const updated = updatePlanDefinition(id, body);
      if (!updated) return reply.code(404).send({ ok: false, error: 'PlanDefinition not found' });
      return { ok: true, planDefinition: updated };
    }
  );

  server.delete(
    '/clinical-reasoning/plan-definitions/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      if (!deletePlanDefinition(id))
        return reply.code(404).send({ ok: false, error: 'PlanDefinition not found' });
      return { ok: true };
    }
  );

  // ---- Activity Definitions ----

  server.get(
    '/clinical-reasoning/activity-definitions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return { ok: true, activityDefinitions: listActivityDefinitions(session.tenantId) };
    }
  );

  server.post(
    '/clinical-reasoning/activity-definitions',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body as any) || {};
      const { name, title, description, status, kind, cqlLibraryId, dynamicValues } = body;
      if (!name || !title || !kind) {
        return reply.code(400).send({ ok: false, error: 'name, title, and kind required' });
      }
      try {
        const def = createActivityDefinition({
          tenantId: session.tenantId,
          name,
          title,
          description: description || '',
          status: status || 'draft',
          kind,
          cqlLibraryId: cqlLibraryId || null,
          dynamicValues: dynamicValues || [],
        });
        return reply.code(201).send({ ok: true, activityDefinition: def });
      } catch (err: any) {
        log.error('Activity definition creation failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return reply.code(409).send({ ok: false, error: 'Internal error' });
      }
    }
  );

  server.get(
    '/clinical-reasoning/activity-definitions/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const def = getActivityDefinition(id);
      if (!def) return reply.code(404).send({ ok: false, error: 'ActivityDefinition not found' });
      return { ok: true, activityDefinition: def };
    }
  );

  server.put(
    '/clinical-reasoning/activity-definitions/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const updated = updateActivityDefinition(id, body);
      if (!updated)
        return reply.code(404).send({ ok: false, error: 'ActivityDefinition not found' });
      return { ok: true, activityDefinition: updated };
    }
  );

  server.delete(
    '/clinical-reasoning/activity-definitions/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      if (!deleteActivityDefinition(id))
        return reply.code(404).send({ ok: false, error: 'ActivityDefinition not found' });
      return { ok: true };
    }
  );

  // ---- Reports ----

  server.get(
    '/clinical-reasoning/reports',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return { ok: true, reports: listMeasureReports(session.tenantId) };
    }
  );

  server.post(
    '/clinical-reasoning/reports',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body as any) || {};
      const { evalResultId, reportType, qrdaVersion } = body;
      if (!evalResultId) {
        return reply.code(400).send({ ok: false, error: 'evalResultId required' });
      }
      try {
        const report = generateMeasureReport(
          session.tenantId,
          evalResultId,
          reportType || 'summary',
          qrdaVersion || null
        );
        if (!report) {
          return reply
            .code(400)
            .send({ ok: false, error: 'Evaluation not found or not completed' });
        }
        return reply.code(201).send({ ok: true, report });
      } catch (err: any) {
        log.error('Measure report generation failed', {
          error: err instanceof Error ? err.message : String(err),
        });
        return reply.code(409).send({ ok: false, error: 'Internal error' });
      }
    }
  );

  server.get(
    '/clinical-reasoning/reports/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const { id } = request.params as { id: string };
      const report = getMeasureReport(id);
      if (!report) return reply.code(404).send({ ok: false, error: 'Report not found' });
      return { ok: true, report };
    }
  );

  // ---- Dashboard ----

  server.get(
    '/clinical-reasoning/dashboard',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      return { ok: true, stats: getClinicalReasoningDashboardStats(session.tenantId) };
    }
  );
}
