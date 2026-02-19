/**
 * OpenTelemetry tracing bootstrap -- Phase 36
 *
 * Initializes the OTel SDK with:
 *  - OTLP HTTP exporter (to OTel Collector / Jaeger)
 *  - Auto-instrumentation for HTTP, net, Fastify
 *  - PHI-safe span attributes (never record request/response bodies)
 *
 * Must be imported BEFORE Fastify is instantiated in index.ts.
 * Gated by OTEL_ENABLED env var (default: false).
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { trace, context, SpanStatusCode } from "@opentelemetry/api";
import type { Span } from "@opentelemetry/api";

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

const OTEL_ENABLED = process.env.OTEL_ENABLED === "true";
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "vista-evolved-api";
const SERVICE_VERSION = process.env.BUILD_SHA || "dev";

/* ------------------------------------------------------------------ */
/* SDK Instance                                                        */
/* ------------------------------------------------------------------ */

/**
 * SDK reference — set either by register.ts (via --import, preferred for ESM)
 * or by initTracing() fallback (for backward compat / CJS).
 */
let sdk: NodeSDK | null = (globalThis as any).__otelSdk ?? null;

/**
 * Initialize OTel SDK. No-op if already registered via --import register.ts
 * (the preferred ESM path). Falls back to inline registration for CJS.
 */
export function initTracing(): void {
  if (!OTEL_ENABLED) return;
  if (sdk) return; // Already started by register.ts

  // Fallback: inline registration (works in CJS, NOT reliable in ESM)
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${OTEL_ENDPOINT}/v1/traces`,
  });

  const metricExporter = new OTLPMetricExporter({
    url: `${OTEL_ENDPOINT}/v1/metrics`,
  });

  sdk = new NodeSDK({
    resource,
    traceExporter,
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30_000,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": { enabled: false },
        "@opentelemetry/instrumentation-dns": { enabled: false },
        "@opentelemetry/instrumentation-http": {
          enabled: true,
          requestHook: (_span: Span, _request: any) => {},
          responseHook: (_span: Span, _response: any) => {},
        },
        "@opentelemetry/instrumentation-net": { enabled: true },
      }),
    ],
  });

  sdk.start();
}

/**
 * Gracefully shutdown OTel SDK (flush pending spans/metrics).
 */
export async function shutdownTracing(): Promise<void> {
  if (sdk) {
    try {
      await sdk.shutdown();
    } catch {
      // best effort
    }
  }
}

/**
 * Whether OTel tracing is active.
 */
export function isTracingEnabled(): boolean {
  return OTEL_ENABLED && sdk !== null;
}

/* ------------------------------------------------------------------ */
/* Helpers for manual span creation                                    */
/* ------------------------------------------------------------------ */

const tracer = trace.getTracer(SERVICE_NAME, SERVICE_VERSION);

/**
 * Create a child span for an RPC call.
 * Only safe attributes are recorded (RPC name, DUZ -- never request bodies).
 */
export function startRpcSpan(rpcName: string, duz?: string): Span {
  const span = tracer.startSpan(`rpc.${rpcName}`, {
    attributes: {
      "rpc.system": "vista-xwb",
      "rpc.method": rpcName,
      ...(duz ? { "enduser.id": duz } : {}),
    },
  });
  return span;
}

/**
 * End an RPC span with success or failure.
 */
export function endRpcSpan(span: Span, error?: Error): void {
  if (error) {
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    span.recordException(error);
  } else {
    span.setStatus({ code: SpanStatusCode.OK });
  }
  span.end();
}

/**
 * Get the current trace ID from active context (for log correlation).
 * Returns empty string if no active span.
 */
export function getCurrentTraceId(): string {
  const span = trace.getActiveSpan();
  if (!span) return "";
  return span.spanContext().traceId;
}

/**
 * Get the current span ID from active context.
 */
export function getCurrentSpanId(): string {
  const span = trace.getActiveSpan();
  if (!span) return "";
  return span.spanContext().spanId;
}

export { tracer, context, trace };
