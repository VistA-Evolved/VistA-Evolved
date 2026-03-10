#!/usr/bin/env node
/**
 * G15 -- Observability Gate (Phase 133)
 *
 * Validates enterprise observability baseline:
 *   1. Correlation: X-Correlation-Id header set in onRequest
 *   2. OTel: tracing.ts has PG instrumentation + console exporter
 *   3. Metrics: /metrics/prometheus endpoint exports required metric families
 *   4. SLO: recordSloSample() wired in onResponse
 *   5. Audit: correlationId auto-injected, auditEventsTotal counter wired
 *   6. Runbook: docs/runbooks/observability.md exists
 */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../../..');
const API_SRC = resolve(ROOT, 'apps/api/src');

export const id = 'G15_observability';
export const name = 'Observability (Phase 133)';

export async function run(opts = {}) {
  const start = Date.now();
  const details = [];
  let status = 'pass';

  function fail(msg) {
    details.push(msg);
    status = 'fail';
  }
  function pass(msg) {
    details.push(msg);
  }

  // -- 1. X-Correlation-Id in security.ts --------------------
  const securityPath = resolve(API_SRC, 'middleware/security.ts');
  if (!existsSync(securityPath)) {
    fail('security.ts: MISSING');
  } else {
    const sec = readFileSync(securityPath, 'utf8');
    if (sec.includes('X-Correlation-Id')) {
      pass('security.ts: X-Correlation-Id header present');
    } else {
      fail('security.ts: X-Correlation-Id header NOT found');
    }
    // SLO wiring
    if (sec.includes('recordSloSample')) {
      pass('security.ts: recordSloSample() wired in onResponse');
    } else {
      fail('security.ts: recordSloSample() NOT wired');
    }
  }

  // -- 2. OTel tracing: PG instrumentation + console exporter --
  const tracingPath = resolve(API_SRC, 'telemetry/tracing.ts');
  if (!existsSync(tracingPath)) {
    fail('tracing.ts: MISSING');
  } else {
    const tr = readFileSync(tracingPath, 'utf8');
    if (tr.includes('instrumentation-pg') || tr.includes('PgInstrumentation')) {
      pass('tracing.ts: PG instrumentation enabled');
    } else {
      fail('tracing.ts: PG instrumentation NOT found');
    }
    if (tr.includes('ConsoleSpanExporter')) {
      pass('tracing.ts: ConsoleSpanExporter available for dev mode');
    } else {
      fail('tracing.ts: ConsoleSpanExporter NOT found');
    }
    if (tr.includes('enhancedDatabaseReporting') && tr.includes('false')) {
      pass('tracing.ts: enhancedDatabaseReporting disabled (PHI-safe)');
    } else {
      fail('tracing.ts: enhancedDatabaseReporting not explicitly disabled');
    }
  }

  // -- 3. Metrics: required metric families ------------------
  const metricsPath = resolve(API_SRC, 'telemetry/metrics.ts');
  if (!existsSync(metricsPath)) {
    fail('metrics.ts: MISSING');
  } else {
    const met = readFileSync(metricsPath, 'utf8');
    const requiredMetrics = [
      'http_request_duration_seconds',
      'http_requests_total',
      'db_pool_in_use',
      'db_pool_total',
      'db_pool_waiting',
      'db_query_duration_seconds',
      'audit_events_total',
    ];
    const missing = requiredMetrics.filter((m) => !met.includes(m));
    if (missing.length === 0) {
      pass(`metrics.ts: all ${requiredMetrics.length} required metrics present`);
    } else {
      fail(`metrics.ts: missing metrics: ${missing.join(', ')}`);
    }
  }

  // -- 4. Pool stats wiring in index.ts ----------------------
  const indexPath = resolve(API_SRC, 'index.ts');
  if (!existsSync(indexPath)) {
    fail('index.ts: MISSING');
  } else {
    const idx = readFileSync(indexPath, 'utf8');
    if (idx.includes('dbPoolInUse') && idx.includes('dbPoolTotal')) {
      pass('index.ts: PG pool stats gauges wired');
    } else {
      fail('index.ts: PG pool stats gauges NOT wired');
    }
  }

  // -- 5. Audit correlation auto-inject ----------------------
  const auditPath = resolve(API_SRC, 'lib/audit.ts');
  if (!existsSync(auditPath)) {
    fail('audit.ts: MISSING');
  } else {
    const aud = readFileSync(auditPath, 'utf8');
    if (aud.includes('getRequestId') && aud.includes('auditEventsTotal')) {
      pass('audit.ts: correlationId auto-inject + audit counter wired');
    } else {
      const issues = [];
      if (!aud.includes('getRequestId')) issues.push('getRequestId missing');
      if (!aud.includes('auditEventsTotal')) issues.push('auditEventsTotal missing');
      fail(`audit.ts: ${issues.join(', ')}`);
    }
  }

  // -- 6. Runbook exists -------------------------------------
  const runbookPath = resolve(ROOT, 'docs/runbooks/observability.md');
  if (existsSync(runbookPath)) {
    const rb = readFileSync(runbookPath, 'utf8');
    if (rb.length > 200) {
      pass('docs/runbooks/observability.md: exists (' + rb.length + ' chars)');
    } else {
      fail('docs/runbooks/observability.md: too short (' + rb.length + ' chars)');
    }
  } else {
    fail('docs/runbooks/observability.md: MISSING');
  }

  // -- 7. register.ts ESM entrypoint also has PG instrumentation --
  const registerPath = resolve(API_SRC, 'telemetry/register.ts');
  if (!existsSync(registerPath)) {
    fail('register.ts: MISSING');
  } else {
    const reg = readFileSync(registerPath, 'utf8');
    if (reg.includes('instrumentation-pg') || reg.includes('PgInstrumentation')) {
      pass('register.ts: PG instrumentation in ESM entrypoint');
    } else {
      fail('register.ts: PG instrumentation NOT in ESM entrypoint');
    }
  }

  // -- 8. No PHI in OTel collector config --------------------
  const collectorPath = resolve(ROOT, 'services/observability/otel-collector-config.yaml');
  if (existsSync(collectorPath)) {
    const col = readFileSync(collectorPath, 'utf8');
    if (col.includes('strip-phi') || col.includes('delete')) {
      pass('otel-collector-config.yaml: PHI stripping configured');
    } else {
      fail('otel-collector-config.yaml: no PHI stripping found');
    }
  } else {
    // Not a hard fail -- collector is optional for dev
    details.push('otel-collector-config.yaml: not present (optional in dev)');
  }

  return {
    id,
    name,
    status,
    details,
    durationMs: Date.now() - start,
  };
}
