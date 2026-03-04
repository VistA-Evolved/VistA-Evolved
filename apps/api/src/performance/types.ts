/**
 * types.ts -- Performance + UX Speed Pass types (Phase 162)
 */

/* ------------------------------------------------------------------ */
/*  Route profiling                                                    */
/* ------------------------------------------------------------------ */
export interface RouteProfile {
  routePattern: string;
  method: string;
  /** Total requests observed */
  requestCount: number;
  /** Average response time in ms */
  avgMs: number;
  /** P50 response time ms */
  p50Ms: number;
  /** P95 response time ms */
  p95Ms: number;
  /** P99 response time ms */
  p99Ms: number;
  /** Max response time ms */
  maxMs: number;
  /** Min response time ms */
  minMs: number;
  /** Average response size in bytes */
  avgBytes: number;
  /** Max response size in bytes */
  maxBytes: number;
  /** Error count (4xx + 5xx) */
  errorCount: number;
  /** Budget status */
  budgetStatus: 'within' | 'warning' | 'exceeded';
  /** Last updated */
  updatedAt: string;
}

export interface RouteTiming {
  routePattern: string;
  method: string;
  durationMs: number;
  responseBytes: number;
  statusCode: number;
  timestamp: string;
}

/* ------------------------------------------------------------------ */
/*  Performance budgets                                                */
/* ------------------------------------------------------------------ */
export interface PerformanceBudget {
  id: string;
  routePattern: string;
  method: string;
  /** Max acceptable response time in ms */
  maxMs: number;
  /** Warning threshold (fraction of maxMs, e.g. 0.8 = 80%) */
  warningThreshold: number;
  /** Max acceptable response size in bytes (0 = no limit) */
  maxBytes: number;
  /** Whether this budget is enforced (violations logged vs rejected) */
  enforce: boolean;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Slow query tracking                                                */
/* ------------------------------------------------------------------ */
export interface SlowQueryEntry {
  id: string;
  routePattern: string;
  method: string;
  durationMs: number;
  responseBytes: number;
  statusCode: number;
  timestamp: string;
  /** Budget that was exceeded (if any) */
  budgetId?: string;
  /** How much over budget (ms) */
  overByMs?: number;
}

/* ------------------------------------------------------------------ */
/*  Performance summary                                                */
/* ------------------------------------------------------------------ */
export interface PerformanceSummary {
  /** Total routes being profiled */
  routeCount: number;
  /** Total requests observed */
  totalRequests: number;
  /** Routes within budget */
  withinBudget: number;
  /** Routes in warning zone */
  warningZone: number;
  /** Routes exceeding budget */
  overBudget: number;
  /** Top 10 slowest routes */
  slowestRoutes: RouteProfile[];
  /** Top 10 largest responses */
  largestRoutes: RouteProfile[];
  /** Recent slow queries */
  recentSlowQueries: SlowQueryEntry[];
  /** System P95 across all routes */
  systemP95Ms: number;
  /** System avg response time */
  systemAvgMs: number;
  generatedAt: string;
}
