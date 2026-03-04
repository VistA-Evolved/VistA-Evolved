/**
 * Business Action Spans — Phase 77.
 *
 * Higher-level span helpers for non-RPC business operations.
 * All attributes are PHI-safe — no patient names, SSN, DOB, etc.
 *
 * Uses the underlying OTel SDK from tracing.ts. When tracing is disabled
 * (OTEL_ENABLED != true), all functions are safe no-ops that still execute
 * the wrapped function.
 *
 * Usage:
 *   import { withSpan, spanBusinessAction } from '../telemetry/spans.js';
 *
 *   // Context manager pattern
 *   const result = await withSpan('module.toggle', { module: 'rcm', action: 'enable' }, async () => {
 *     return doSomething();
 *   });
 *
 *   // Fire-and-forget span (returns span for manual end)
 *   const span = spanBusinessAction('claim.submit', { claimId: 'C-001' });
 *   try { ... } finally { endBusinessSpan(span); }
 */

import { isTracingEnabled, tracer, context, trace } from './tracing.js';
import { getRequestId } from '../lib/logger.js';
import { assertNoPhiInAttributes } from '../lib/phi-redaction.js';

import { SpanStatusCode } from '@opentelemetry/api';
import type { Span } from '@opentelemetry/api';

/* ------------------------------------------------------------------ */
/* Attribute sanitization                                              */
/* ------------------------------------------------------------------ */

/** Safe span attribute type — only primitives allowed */
type SafeAttributes = Record<string, string | number | boolean | undefined>;

/**
 * Sanitize and validate span attributes.
 * Removes undefined values and validates no PHI keys are present.
 */
function sanitizeAttributes(attrs?: SafeAttributes): Record<string, string | number | boolean> {
  if (!attrs) return {};
  const clean: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(attrs)) {
    if (value === undefined) continue;
    clean[key] = value;
  }
  // Runtime PHI guard — throws if any attribute key matches PHI fields
  assertNoPhiInAttributes(clean);
  return clean;
}

/* ------------------------------------------------------------------ */
/* Context manager pattern                                             */
/* ------------------------------------------------------------------ */

/**
 * Execute an async function within an OTel span.
 * Automatically sets status and records errors.
 * When tracing is disabled, executes fn directly.
 */
export async function withSpan<T>(
  name: string,
  attrs: SafeAttributes | undefined,
  fn: () => Promise<T>
): Promise<T> {
  if (!isTracingEnabled()) {
    return fn();
  }

  const spanAttrs = sanitizeAttributes(attrs);
  const requestId = getRequestId();
  if (requestId) {
    spanAttrs['request.id'] = requestId;
  }

  const span = tracer.startSpan(`ve.${name}`, { attributes: spanAttrs });
  const ctx = trace.setSpan(context.active(), span);

  try {
    const result = await context.with(ctx, fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : 'unknown',
    });
    span.recordException(err instanceof Error ? err : new Error(String(err)));
    throw err;
  } finally {
    span.end();
  }
}

/**
 * Synchronous version of withSpan.
 */
export function withSpanSync<T>(name: string, attrs: SafeAttributes | undefined, fn: () => T): T {
  if (!isTracingEnabled()) {
    return fn();
  }

  const spanAttrs = sanitizeAttributes(attrs);
  const requestId = getRequestId();
  if (requestId) {
    spanAttrs['request.id'] = requestId;
  }

  const span = tracer.startSpan(`ve.${name}`, { attributes: spanAttrs });
  const ctx = trace.setSpan(context.active(), span);

  try {
    const result = context.with(ctx, fn);
    span.setStatus({ code: SpanStatusCode.OK });
    return result;
  } catch (err) {
    span.setStatus({
      code: SpanStatusCode.ERROR,
      message: err instanceof Error ? err.message : 'unknown',
    });
    span.recordException(err instanceof Error ? err : new Error(String(err)));
    throw err;
  } finally {
    span.end();
  }
}

/* ------------------------------------------------------------------ */
/* Named span factories                                                */
/* ------------------------------------------------------------------ */

/**
 * Start a generic business action span. Returns span for manual end.
 */
export function spanBusinessAction(name: string, attrs?: SafeAttributes): Span {
  if (!isTracingEnabled()) {
    return tracer.startSpan('noop'); // returns a no-op span when tracing disabled
  }
  const spanAttrs = sanitizeAttributes(attrs);
  const requestId = getRequestId();
  if (requestId) {
    spanAttrs['request.id'] = requestId;
  }
  return tracer.startSpan(`ve.${name}`, { attributes: spanAttrs });
}

/**
 * Start a module toggle span (enable/disable/override).
 */
export function spanModuleToggle(module: string, action: string): Span {
  return spanBusinessAction('module.toggle', { module, action });
}

/**
 * Start an RCM operation span (claim lifecycle events).
 */
export function spanRcmOperation(operation: string, claimId?: string): Span {
  return spanBusinessAction('rcm.operation', {
    operation,
    ...(claimId ? { claimId } : {}),
  });
}

/**
 * Start an imaging operation span.
 */
export function spanImagingOperation(operation: string, studyUid?: string): Span {
  return spanBusinessAction('imaging.operation', {
    operation,
    ...(studyUid ? { studyUid } : {}),
  });
}

/**
 * Start a scheduling operation span.
 */
export function spanSchedulingOperation(operation: string): Span {
  return spanBusinessAction('scheduling.operation', { operation });
}

/**
 * End a business span. Safe to call on any span (including no-op).
 */
export function endBusinessSpan(span: Span, error?: Error): void {
  if (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }
  span.end();
}
