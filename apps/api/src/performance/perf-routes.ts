/**
 * perf-routes.ts -- Performance monitoring REST endpoints (Phase 162)
 *
 * All routes under /admin/performance/* (admin auth required).
 */

import type { FastifyInstance } from 'fastify';
import {
  getRouteProfiles,
  getSlowRoutes,
  getSlowQueryLog,
  getSystemP95,
  getSystemAvg,
  resetProfiles,
  recordRouteProfile,
} from './profiler.js';
import {
  listBudgets,
  getBudget,
  setBudget,
  deleteBudget,
  seedDefaultBudgets,
  getBudgetCount,
} from './budget-engine.js';

export default async function perfRoutes(server: FastifyInstance) {
  /* ---- Route profiles ---- */

  server.get('/admin/performance/profiles', async (_req, reply) => {
    const profiles = getRouteProfiles();
    return reply.send({ ok: true, profiles, count: profiles.length });
  });

  server.get('/admin/performance/slow-routes', async (req, reply) => {
    const { threshold, limit } = (req.query as any) || {};
    const thresholdMs = threshold ? Number(threshold) : 1000;
    const max = limit ? Math.min(Number(limit), 500) : 50;
    const slow = getSlowRoutes(thresholdMs, max);
    return reply.send({ ok: true, slowRoutes: slow, count: slow.length, thresholdMs });
  });

  server.get('/admin/performance/slow-queries', async (req, reply) => {
    const { limit } = (req.query as any) || {};
    const max = limit ? Math.min(Number(limit), 500) : 100;
    const queries = getSlowQueryLog().slice(0, max);
    return reply.send({ ok: true, queries, count: queries.length });
  });

  /* ---- Performance summary ---- */

  server.get('/admin/performance/summary', async (_req, reply) => {
    const profiles = getRouteProfiles();
    const systemP95 = getSystemP95();
    const systemAvg = getSystemAvg();
    const budgets = listBudgets();
    const slowRoutes = getSlowRoutes(1000, 100);

    const budgetViolations = profiles.filter((p) => p.budgetStatus === 'exceeded').length;
    const budgetWarnings = profiles.filter((p) => p.budgetStatus === 'warning').length;

    return reply.send({
      ok: true,
      summary: {
        totalRoutes: profiles.length,
        systemP95Ms: systemP95,
        systemAvgMs: systemAvg,
        slowRouteCount: slowRoutes.length,
        budgetCount: budgets.length,
        budgetViolations,
        budgetWarnings,
        healthScore: calculateHealthScore(profiles.length, budgetViolations, systemP95),
      },
    });
  });

  /* ---- Budget CRUD ---- */

  server.get('/admin/performance/budgets', async (_req, reply) => {
    const budgets = listBudgets();
    return reply.send({ ok: true, budgets, count: budgets.length });
  });

  server.get('/admin/performance/budgets/:id', async (req, reply) => {
    const { id } = req.params as any;
    const budget = getBudget(id);
    if (!budget) return reply.code(404).send({ ok: false, error: 'Budget not found' });
    return reply.send({ ok: true, budget });
  });

  server.post('/admin/performance/budgets', async (req, reply) => {
    const body = (req.body as any) || {};
    const { routePattern, method, maxMs, warningThreshold, maxBytes, enforce } = body;
    if (!routePattern || !maxMs) {
      return reply.code(400).send({ ok: false, error: 'routePattern and maxMs required' });
    }
    const budget = setBudget(routePattern, method || '*', Number(maxMs), {
      warningThreshold: warningThreshold ? Number(warningThreshold) : undefined,
      maxBytes: maxBytes ? Number(maxBytes) : undefined,
      enforce: enforce ?? false,
    });
    return reply.code(201).send({ ok: true, budget });
  });

  server.delete('/admin/performance/budgets/:id', async (req, reply) => {
    const { id } = req.params as any;
    const deleted = deleteBudget(id);
    if (!deleted) return reply.code(404).send({ ok: false, error: 'Budget not found' });
    return reply.send({ ok: true, deleted: true });
  });

  server.post('/admin/performance/budgets/seed', async (_req, reply) => {
    const seeded = seedDefaultBudgets();
    return reply.send({ ok: true, seeded, total: getBudgetCount() });
  });

  /* ---- Record (internal / testing) ---- */

  server.post('/admin/performance/record', async (req, reply) => {
    const body = (req.body as any) || {};
    const { route, method, durationMs, statusCode, responseBytes } = body;
    if (!route || !method || durationMs == null) {
      return reply.code(400).send({ ok: false, error: 'route, method, durationMs required' });
    }
    recordRouteProfile({
      routePattern: route,
      method,
      durationMs: Number(durationMs),
      statusCode: statusCode ?? 200,
      responseBytes: responseBytes ?? 0,
      timestamp: new Date().toISOString(),
    });
    return reply.send({ ok: true, recorded: true });
  });

  /* ---- Reset ---- */

  server.post('/admin/performance/reset', async (_req, reply) => {
    resetProfiles();
    return reply.send({ ok: true, reset: true });
  });
}

/* ------------------------------------------------------------------ */
/*  Health Score Calculator                                            */
/* ------------------------------------------------------------------ */

function calculateHealthScore(totalRoutes: number, violations: number, systemP95: number): number {
  if (totalRoutes === 0) return 100;

  // Start at 100, deduct for violations and high p95
  let score = 100;

  // Each violation costs 5 points
  score -= violations * 5;

  // High system p95 costs points
  if (systemP95 > 5000) score -= 20;
  else if (systemP95 > 2000) score -= 10;
  else if (systemP95 > 1000) score -= 5;

  return Math.max(0, Math.min(100, Math.round(score)));
}
