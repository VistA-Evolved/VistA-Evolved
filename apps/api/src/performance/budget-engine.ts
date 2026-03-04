/**
 * budget-engine.ts -- Performance budget management (Phase 162)
 *
 * Configurable response time and size budgets per route pattern.
 * Budgets are evaluated by the profiler on every request.
 */

import { randomUUID } from 'node:crypto';
import type { PerformanceBudget } from './types.js';

/* ------------------------------------------------------------------ */
/*  In-memory budget store                                             */
/* ------------------------------------------------------------------ */
const budgetStore = new Map<string, PerformanceBudget>();

/* ------------------------------------------------------------------ */
/*  Default budgets                                                    */
/* ------------------------------------------------------------------ */
const DEFAULT_BUDGETS: Omit<PerformanceBudget, 'id' | 'createdAt'>[] = [
  // Clinical read routes should be fast
  {
    routePattern: '/vista/',
    method: '*',
    maxMs: 2000,
    warningThreshold: 0.8,
    maxBytes: 512_000,
    enforce: false,
  },
  // Admin routes can be slower
  {
    routePattern: '/admin/',
    method: '*',
    maxMs: 5000,
    warningThreshold: 0.8,
    maxBytes: 2_000_000,
    enforce: false,
  },
  // Auth should be very fast
  {
    routePattern: '/auth/',
    method: '*',
    maxMs: 1000,
    warningThreshold: 0.7,
    maxBytes: 10_000,
    enforce: false,
  },
  // Health/ready must be instant
  {
    routePattern: '/health',
    method: 'GET',
    maxMs: 100,
    warningThreshold: 0.8,
    maxBytes: 1_000,
    enforce: false,
  },
  {
    routePattern: '/ready',
    method: 'GET',
    maxMs: 200,
    warningThreshold: 0.8,
    maxBytes: 1_000,
    enforce: false,
  },
  // Imaging proxy is allowed more time (DICOMweb)
  {
    routePattern: '/imaging/',
    method: '*',
    maxMs: 10000,
    warningThreshold: 0.8,
    maxBytes: 50_000_000,
    enforce: false,
  },
  // Portal routes
  {
    routePattern: '/portal/',
    method: '*',
    maxMs: 3000,
    warningThreshold: 0.8,
    maxBytes: 1_000_000,
    enforce: false,
  },
  // Scheduling
  {
    routePattern: '/scheduling/',
    method: '*',
    maxMs: 3000,
    warningThreshold: 0.8,
    maxBytes: 500_000,
    enforce: false,
  },
  // Queue display (public, must be fast)
  {
    routePattern: '/queue/display',
    method: 'GET',
    maxMs: 500,
    warningThreshold: 0.8,
    maxBytes: 100_000,
    enforce: false,
  },
];

/* ------------------------------------------------------------------ */
/*  Budget CRUD                                                        */
/* ------------------------------------------------------------------ */

export function setBudget(
  routePattern: string,
  method: string,
  maxMs: number,
  opts?: { warningThreshold?: number; maxBytes?: number; enforce?: boolean }
): PerformanceBudget {
  const existing = [...budgetStore.values()].find(
    (b) => b.routePattern === routePattern && b.method === method
  );

  const budget: PerformanceBudget = {
    id: existing?.id ?? randomUUID(),
    routePattern,
    method,
    maxMs,
    warningThreshold: opts?.warningThreshold ?? 0.8,
    maxBytes: opts?.maxBytes ?? 0,
    enforce: opts?.enforce ?? false,
    createdAt: existing?.createdAt ?? new Date().toISOString(),
  };

  budgetStore.set(budget.id, budget);
  return budget;
}

export function listBudgets(): PerformanceBudget[] {
  return [...budgetStore.values()];
}

export function getBudget(id: string): PerformanceBudget | undefined {
  return budgetStore.get(id);
}

export function deleteBudget(id: string): boolean {
  return budgetStore.delete(id);
}

/* ------------------------------------------------------------------ */
/*  Budget evaluation                                                  */
/* ------------------------------------------------------------------ */

/**
 * Check if a route timing is within budget.
 * Returns "within", "warning", or "exceeded".
 */
export function checkBudget(
  routePattern: string,
  method: string,
  durationMs: number,
  responseBytes: number
): 'within' | 'warning' | 'exceeded' {
  // Find matching budget (most specific match wins)
  let bestMatch: PerformanceBudget | undefined;
  let bestMatchLen = 0;

  for (const budget of budgetStore.values()) {
    if (budget.method !== '*' && budget.method !== method) continue;
    if (!routePattern.startsWith(budget.routePattern)) continue;
    if (budget.routePattern.length > bestMatchLen) {
      bestMatch = budget;
      bestMatchLen = budget.routePattern.length;
    }
  }

  if (!bestMatch) return 'within'; // No budget = within by default

  // Check size budget
  if (bestMatch.maxBytes > 0 && responseBytes > bestMatch.maxBytes) {
    return 'exceeded';
  }

  // Check time budget
  if (durationMs > bestMatch.maxMs) {
    return 'exceeded';
  }

  if (durationMs > bestMatch.maxMs * bestMatch.warningThreshold) {
    return 'warning';
  }

  return 'within';
}

/* ------------------------------------------------------------------ */
/*  Seed default budgets (idempotent)                                  */
/* ------------------------------------------------------------------ */

export function seedDefaultBudgets(): number {
  let seeded = 0;
  for (const def of DEFAULT_BUDGETS) {
    const existing = [...budgetStore.values()].find(
      (b) => b.routePattern === def.routePattern && b.method === def.method
    );
    if (!existing) {
      setBudget(def.routePattern, def.method, def.maxMs, {
        warningThreshold: def.warningThreshold,
        maxBytes: def.maxBytes,
        enforce: def.enforce,
      });
      seeded++;
    }
  }
  return seeded;
}

export function getBudgetCount(): number {
  return budgetStore.size;
}
