/**
 * Observability Configuration — Phase 77.
 *
 * Centralizes all observability settings: sampling, label/attribute allowlists,
 * PHI redaction mode, and SLO targets. Reads from env vars and
 * config/performance-budgets.json.
 *
 * PHI redaction is ALWAYS ON and cannot be disabled.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/* ------------------------------------------------------------------ */
/* Performance budgets (loaded once at startup)                        */
/* ------------------------------------------------------------------ */

interface LatencyBudget { p95: number; p99: number }

interface PerformanceBudgets {
  apiLatencyBudgets: {
    auth: Record<string, LatencyBudget>;
    clinicalReads: Record<string, LatencyBudget>;
    clinicalWrites: Record<string, LatencyBudget>;
    adminReads: Record<string, LatencyBudget>;
    infrastructure: Record<string, LatencyBudget>;
  };
  vistaRpcBudgets: {
    connectionTimeoutMs: number;
    rpcCallTimeoutMs: number;
    rpcCallP95Ms: number;
    rpcCallP99Ms: number;
    loginTimeoutMs: number;
    circuitBreakerThreshold: number;
    circuitBreakerResetMs: number;
    maxConcurrentRpcs: number;
    healthCheckIntervalMs: number;
  };
  loadTestThresholds: {
    httpReqDuration: { p95: number; p99: number };
    httpReqFailed: { maxRate: number };
  };
}

let _budgets: PerformanceBudgets | null = null;

function loadBudgets(): PerformanceBudgets {
  if (_budgets) return _budgets;
  try {
    const raw = readFileSync(
      resolve(__dirname, '../../../../config/performance-budgets.json'),
      'utf-8',
    );
    // Strip BOM (BUG-064 / AGENTS.md #101)
    const clean = raw.charCodeAt(0) === 0xfeff ? raw.slice(1) : raw;
    _budgets = JSON.parse(clean);
    return _budgets!;
  } catch {
    // Fallback defaults if file missing
    _budgets = {
      apiLatencyBudgets: {
        auth: { login: { p95: 3000, p99: 5000 }, session: { p95: 100, p99: 200 } },
        clinicalReads: { patientSearch: { p95: 3000, p99: 5000 } },
        clinicalWrites: { addAllergy: { p95: 5000, p99: 8000 } },
        adminReads: { moduleStatus: { p95: 200, p99: 500 } },
        infrastructure: { health: { p95: 50, p99: 100 }, ready: { p95: 100, p99: 200 }, metrics: { p95: 200, p99: 500 } },
      },
      vistaRpcBudgets: {
        connectionTimeoutMs: 10000, rpcCallTimeoutMs: 15000, rpcCallP95Ms: 5000,
        rpcCallP99Ms: 10000, loginTimeoutMs: 15000, circuitBreakerThreshold: 5,
        circuitBreakerResetMs: 30000, maxConcurrentRpcs: 10, healthCheckIntervalMs: 30000,
      },
      loadTestThresholds: {
        httpReqDuration: { p95: 10000, p99: 15000 },
        httpReqFailed: { maxRate: 0.10 },
      },
    };
    return _budgets!;
  }
}

/* ------------------------------------------------------------------ */
/* Core observability config                                           */
/* ------------------------------------------------------------------ */

export const OBSERVABILITY_CONFIG = {
  /**
   * Head-based sampling rate for OTel traces.
   * 1.0 = sample everything, 0.1 = sample 10%.
   * Override via OTEL_SAMPLING_RATE env var.
   */
  samplingRate: Math.max(0, Math.min(1, parseFloat(process.env.OTEL_SAMPLING_RATE ?? '1.0'))),

  /**
   * Whether OTel tracing is enabled at all.
   * Override via OTEL_ENABLED env var.
   */
  tracingEnabled: process.env.OTEL_ENABLED === 'true',

  /**
   * PHI redaction mode — ALWAYS ON. Cannot be disabled.
   * This ensures no PHI appears in traces, metrics, or logs.
   */
  phiRedactionEnabled: true as const,

  /**
   * Metric label allowlist — only these labels are permitted on Prometheus metrics.
   * Adding patient-identifying labels (dfn, patientName, ssn) is forbidden.
   */
  metricLabelAllowlist: [
    'method', 'route', 'status_code', 'status',
    'rpc_name', 'state', 'module', 'level',
    'connector', 'payer_type', 'stage',
  ] as readonly string[],

  /**
   * Span attribute allowlist — only these attribute keys are permitted on OTel spans.
   * PHI-carrying attributes are structurally excluded.
   */
  spanAttributeAllowlist: [
    'request.id', 'rpc.name', 'rpc.duz', 'module', 'action',
    'operation', 'claimId', 'studyUid', 'connector', 'stage',
    'http.method', 'http.route', 'http.status_code', 'http.target',
    'net.peer.name', 'net.peer.port',
  ] as readonly string[],

  /**
   * SLO error budget — maximum error rate before alerting.
   * Default 0.1% (99.9% availability target).
   */
  sloErrorBudget: parseFloat(process.env.SLO_ERROR_BUDGET ?? '0.001'),

  /**
   * SLO evaluation window in milliseconds.
   * Default: 1 hour.
   */
  sloWindowMs: parseInt(process.env.SLO_WINDOW_MS ?? '3600000', 10),
} as const;

/* ------------------------------------------------------------------ */
/* SLO budget helpers                                                  */
/* ------------------------------------------------------------------ */

/**
 * Get the p95 latency budget for a route category.
 * Returns undefined if no budget is defined for this category.
 */
export function getLatencyBudget(category: string, operation: string): LatencyBudget | undefined {
  const budgets = loadBudgets();
  const cat = (budgets.apiLatencyBudgets as Record<string, Record<string, LatencyBudget>>)[category];
  return cat?.[operation];
}

/**
 * Check if a request duration is within the SLO budget.
 */
export function isWithinLatencyBudget(category: string, operation: string, durationMs: number): boolean {
  const budget = getLatencyBudget(category, operation);
  if (!budget) return true; // No budget defined = always within budget
  return durationMs <= budget.p95;
}

/**
 * Get the RPC timeout budget.
 */
export function getRpcBudgets(): PerformanceBudgets['vistaRpcBudgets'] {
  return loadBudgets().vistaRpcBudgets;
}

/**
 * Get load test thresholds.
 */
export function getLoadTestThresholds(): PerformanceBudgets['loadTestThresholds'] {
  return loadBudgets().loadTestThresholds;
}

/**
 * Get all API latency budgets (for verifier/evidence generation).
 */
export function getAllLatencyBudgets(): PerformanceBudgets['apiLatencyBudgets'] {
  return loadBudgets().apiLatencyBudgets;
}
