/**
 * Payer Adapter SDK — Phase 261 (Wave 8 P5)
 *
 * Provides a base class with common concerns (rate limiting, idempotency,
 * metrics, health tracking) so individual adapters don't duplicate logic.
 *
 * Extends the existing PayerAdapter interface from Phase 69.
 * Does NOT replace existing adapters — they can optionally extend this.
 */
import { createHash } from 'crypto';

/* ── Rate Limiter ──────────────────────────────────────── */

interface RateLimitWindow {
  count: number;
  windowStart: number;
}

export class AdapterRateLimiter {
  private windows = new Map<string, RateLimitWindow>();
  private readonly maxPerHour: number;

  constructor(maxPerHour: number = 1000) {
    this.maxPerHour = maxPerHour;
  }

  /**
   * Check if a call is allowed. Returns remaining quota.
   * Key should be tenantId + adapterId for per-tenant limits.
   */
  check(key: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now();
    const hourMs = 3600_000;
    let win = this.windows.get(key);

    if (!win || now - win.windowStart > hourMs) {
      win = { count: 0, windowStart: now };
      this.windows.set(key, win);
    }

    const remaining = Math.max(0, this.maxPerHour - win.count);
    const resetAt = win.windowStart + hourMs;

    if (win.count >= this.maxPerHour) {
      return { allowed: false, remaining: 0, resetAt };
    }

    win.count++;
    return { allowed: true, remaining: remaining - 1, resetAt };
  }

  getStats(): { keys: number; limits: Record<string, { count: number; max: number }> } {
    const limits: Record<string, { count: number; max: number }> = {};
    for (const [key, win] of this.windows) {
      limits[key] = { count: win.count, max: this.maxPerHour };
    }
    return { keys: this.windows.size, limits };
  }
}

/* ── Idempotency Store ─────────────────────────────────── */

interface IdempotencyEntry {
  key: string;
  result: unknown;
  createdAt: number;
}

export class AdapterIdempotencyStore {
  private entries = new Map<string, IdempotencyEntry>();
  private readonly ttlMs: number;
  private readonly maxEntries: number;

  constructor(ttlMs: number = 24 * 3600_000, maxEntries: number = 10_000) {
    this.ttlMs = ttlMs;
    this.maxEntries = maxEntries;
  }

  /**
   * Generate an idempotency key from submission parameters.
   */
  static generateKey(adapterId: string, tenantId: string, params: Record<string, unknown>): string {
    const payload = JSON.stringify({ adapterId, tenantId, ...params });
    return createHash('sha256').update(payload).digest('hex').substring(0, 32);
  }

  /**
   * Check if a result already exists for this key.
   */
  get(key: string): unknown | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (Date.now() - entry.createdAt > this.ttlMs) {
      this.entries.delete(key);
      return null;
    }
    return entry.result;
  }

  /**
   * Store a result for idempotency replay.
   */
  set(key: string, result: unknown): void {
    // FIFO eviction
    if (this.entries.size >= this.maxEntries) {
      const oldest = this.entries.keys().next().value;
      if (oldest) this.entries.delete(oldest);
    }
    this.entries.set(key, { key, result, createdAt: Date.now() });
  }

  get size(): number {
    return this.entries.size;
  }
}

/* ── Adapter Metrics ───────────────────────────────────── */

export interface AdapterMetrics {
  totalCalls: number;
  successCalls: number;
  failedCalls: number;
  rateLimitedCalls: number;
  idempotencyHits: number;
  avgLatencyMs: number;
  lastCallAt: number | null;
}

export class AdapterMetricsCollector {
  private metrics: AdapterMetrics = {
    totalCalls: 0,
    successCalls: 0,
    failedCalls: 0,
    rateLimitedCalls: 0,
    idempotencyHits: 0,
    avgLatencyMs: 0,
    lastCallAt: null,
  };
  private latencySum = 0;

  recordCall(success: boolean, latencyMs: number): void {
    this.metrics.totalCalls++;
    if (success) this.metrics.successCalls++;
    else this.metrics.failedCalls++;
    this.latencySum += latencyMs;
    this.metrics.avgLatencyMs = this.latencySum / this.metrics.totalCalls;
    this.metrics.lastCallAt = Date.now();
  }

  recordRateLimited(): void {
    this.metrics.rateLimitedCalls++;
  }

  recordIdempotencyHit(): void {
    this.metrics.idempotencyHits++;
  }

  getMetrics(): AdapterMetrics {
    return { ...this.metrics };
  }
}

/* ── Base Adapter ──────────────────────────────────────── */

export interface AdapterSdkConfig {
  id: string;
  name: string;
  maxRequestsPerHour: number;
  idempotencyTtlMs?: number;
  enabled: boolean;
}

/**
 * Base class providing rate limiting, idempotency, and metrics.
 * Existing adapters can extend this or continue implementing
 * PayerAdapter directly — this is opt-in, not mandatory.
 */
export abstract class BasePayerAdapter {
  readonly config: AdapterSdkConfig;
  readonly rateLimiter: AdapterRateLimiter;
  readonly idempotency: AdapterIdempotencyStore;
  readonly metricsCollector: AdapterMetricsCollector;

  constructor(config: AdapterSdkConfig) {
    this.config = config;
    this.rateLimiter = new AdapterRateLimiter(config.maxRequestsPerHour);
    this.idempotency = new AdapterIdempotencyStore(config.idempotencyTtlMs);
    this.metricsCollector = new AdapterMetricsCollector();
  }

  /**
   * Check rate limit before making a call.
   * Returns null if allowed, or an error response if rate-limited.
   */
  protected checkRateLimit(tenantId: string): { error: string; resetAt: number } | null {
    const key = `${this.config.id}:${tenantId}`;
    const result = this.rateLimiter.check(key);
    if (!result.allowed) {
      this.metricsCollector.recordRateLimited();
      return {
        error: `Rate limit exceeded for ${this.config.name} (${this.config.maxRequestsPerHour}/hr)`,
        resetAt: result.resetAt,
      };
    }
    return null;
  }

  /**
   * Check idempotency store before making a submission.
   */
  protected checkIdempotency(tenantId: string, params: Record<string, unknown>): unknown | null {
    const key = AdapterIdempotencyStore.generateKey(this.config.id, tenantId, params);
    const cached = this.idempotency.get(key);
    if (cached) {
      this.metricsCollector.recordIdempotencyHit();
    }
    return cached;
  }

  /**
   * Store a submission result for idempotency replay.
   */
  protected storeIdempotency(
    tenantId: string,
    params: Record<string, unknown>,
    result: unknown
  ): void {
    const key = AdapterIdempotencyStore.generateKey(this.config.id, tenantId, params);
    this.idempotency.set(key, result);
  }

  /**
   * Get adapter health + metrics summary.
   */
  getAdapterStatus(): {
    id: string;
    name: string;
    enabled: boolean;
    metrics: AdapterMetrics;
    rateLimiter: ReturnType<AdapterRateLimiter['getStats']>;
    idempotencyStoreSize: number;
  } {
    return {
      id: this.config.id,
      name: this.config.name,
      enabled: this.config.enabled,
      metrics: this.metricsCollector.getMetrics(),
      rateLimiter: this.rateLimiter.getStats(),
      idempotencyStoreSize: this.idempotency.size,
    };
  }
}

/* ── Sandbox Test Harness ──────────────────────────────── */

export interface SandboxTestCase {
  name: string;
  description: string;
  method: string; // checkEligibility | submitClaim | pollClaimStatus | handleDenial
  input: Record<string, unknown>;
  expectedOutcome: 'success' | 'error' | 'pending';
}

/**
 * Pre-built test cases for validating adapter behavior in sandbox mode.
 */
export const SANDBOX_TEST_CASES: SandboxTestCase[] = [
  {
    name: 'eligibility-active',
    description: 'Check eligibility for an active member',
    method: 'checkEligibility',
    input: { memberId: 'TEST001', serviceType: '30', tenantId: 'test' },
    expectedOutcome: 'success',
  },
  {
    name: 'eligibility-inactive',
    description: 'Check eligibility for an inactive member',
    method: 'checkEligibility',
    input: { memberId: 'INACTIVE001', serviceType: '30', tenantId: 'test' },
    expectedOutcome: 'error',
  },
  {
    name: 'submit-professional',
    description: 'Submit a professional claim (837P)',
    method: 'submitClaim',
    input: {
      claimId: 'CLM-TEST-001',
      claimType: 'professional',
      tenantId: 'test',
      isDemo: true,
    },
    expectedOutcome: 'success',
  },
  {
    name: 'submit-institutional',
    description: 'Submit an institutional claim (837I)',
    method: 'submitClaim',
    input: {
      claimId: 'CLM-TEST-002',
      claimType: 'institutional',
      tenantId: 'test',
      isDemo: true,
    },
    expectedOutcome: 'success',
  },
  {
    name: 'status-check',
    description: 'Poll claim status (276/277)',
    method: 'pollClaimStatus',
    input: { transactionId: 'TXN-TEST-001', tenantId: 'test' },
    expectedOutcome: 'success',
  },
  {
    name: 'denial-appeal',
    description: 'Handle denial with appeal workflow',
    method: 'handleDenial',
    input: {
      claimId: 'CLM-DENIED-001',
      denialCode: 'CO-50',
      action: 'appeal',
      tenantId: 'test',
    },
    expectedOutcome: 'pending',
  },
  {
    name: 'rate-limit-burst',
    description: 'Verify rate limiter triggers after burst',
    method: 'checkEligibility',
    input: { memberId: 'BURST-TEST', burst: true, tenantId: 'test' },
    expectedOutcome: 'error',
  },
];

/**
 * Run all sandbox test cases against an adapter.
 * Returns pass/fail results for each test case.
 */
export function listSandboxTestCases(): SandboxTestCase[] {
  return [...SANDBOX_TEST_CASES];
}
