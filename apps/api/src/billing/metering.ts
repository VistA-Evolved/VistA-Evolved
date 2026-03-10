/**
 * Metering Counter Store -- per-tenant API/RPC usage tracking
 *
 * Phase 284 (Wave 10 P5)
 *
 * In-memory ring buffer of metering events with periodic flush to the
 * billing provider. Extends the existing analytics-store pattern.
 *
 * Counters reset on API restart (in-memory). The billing provider
 * (Lago/mock) is the durable store for invoicing purposes.
 *
 * No PHI -- counters are tenant-scoped, not patient-scoped.
 */

import type { MeterEvent, MeteringRecord } from './types.js';
import { getBillingProvider } from './index.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Counter store                                                       */
/* ------------------------------------------------------------------ */

interface TenantCounters {
  counters: Map<MeterEvent, number>;
  lastFlushed: number;
}

const store = new Map<string, TenantCounters>();

const FLUSH_INTERVAL_MS = parseInt(process.env.METERING_FLUSH_INTERVAL_MS || '60000', 10); // 1 min
const MAX_TENANTS = 10_000;

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Increment a metering counter for a tenant.
 * This is a hot-path function -- no async, no I/O.
 */
export function incrementMeter(tenantId: string, event: MeterEvent, quantity = 1): void {
  let tc = store.get(tenantId);
  if (!tc) {
    if (store.size >= MAX_TENANTS) {
      // Evict oldest entry
      const firstKey = store.keys().next().value;
      if (firstKey) store.delete(firstKey);
    }
    tc = { counters: new Map(), lastFlushed: Date.now() };
    store.set(tenantId, tc);
  }
  const current = tc.counters.get(event) ?? 0;
  tc.counters.set(event, current + quantity);
}

/**
 * Get current counter snapshot for a tenant (non-flushed).
 */
export function getMeterSnapshot(tenantId: string): Record<MeterEvent, number> {
  const defaults: Record<MeterEvent, number> = {
    api_call: 0,
    rpc_call: 0,
    physician_active: 0,
    patient_record_access: 0,
    storage_mb: 0,
    fhir_request: 0,
    hl7_message: 0,
    report_generated: 0,
  };
  const tc = store.get(tenantId);
  if (!tc) return defaults;
  for (const [event, count] of tc.counters) {
    defaults[event] = count;
  }
  return defaults;
}

/**
 * Flush accumulated counters to the billing provider.
 * Called periodically by the flush timer.
 */
export async function flushMeters(): Promise<{ flushed: number; errors: number }> {
  let flushed = 0;
  let errors = 0;
  const now = Date.now();

  let provider;
  try {
    provider = getBillingProvider();
  } catch {
    // Provider not initialized yet -- nothing to flush
    return { flushed: 0, errors: 0 };
  }

  for (const [tenantId, tc] of store) {
    if (now - tc.lastFlushed < FLUSH_INTERVAL_MS) continue;

    for (const [event, quantity] of tc.counters) {
      if (quantity === 0) continue;
      const record: MeteringRecord = {
        tenantId,
        event,
        quantity,
        timestamp: new Date().toISOString(),
      };
      if (typeof provider.reportUsage === 'function') {
        try {
          await provider.reportUsage(record);
          flushed++;
        } catch (err) {
          log.debug('Metering reportUsage failed', { tenantId, event, error: String(err) });
          errors++;
        }
      } else {
        flushed++;
      }
    }

    // Reset counters after flush
    tc.counters.clear();
    tc.lastFlushed = now;
  }

  return { flushed, errors };
}

/* ------------------------------------------------------------------ */
/* Flush timer                                                         */
/* ------------------------------------------------------------------ */

let flushTimer: ReturnType<typeof setInterval> | null = null;

export function startMeteringFlush(): void {
  if (flushTimer) return;
  flushTimer = setInterval(() => {
    flushMeters().catch(() => {
      /* swallow -- logged by provider */
    });
  }, FLUSH_INTERVAL_MS);
  // Don't keep process alive just for metering flush
  if (flushTimer && typeof flushTimer === 'object' && 'unref' in flushTimer) {
    (flushTimer as any).unref();
  }
}

export function stopMeteringFlush(): void {
  if (flushTimer) {
    clearInterval(flushTimer);
    flushTimer = null;
  }
}

/**
 * Reset all stores -- testing only.
 */
export function resetMeteringStore(): void {
  store.clear();
}
