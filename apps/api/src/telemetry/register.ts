/**
 * OTel SDK registration for ESM -- Phase 36
 *
 * This file MUST be loaded via `--import` before index.ts so that
 * the NodeSDK registers require/import hooks BEFORE http, net, and
 * Fastify modules are imported.
 *
 * Usage:
 *   node --import ./src/telemetry/register.ts src/index.ts
 *   tsx --import ./src/telemetry/register.ts --env-file=.env.local src/index.ts
 *
 * Without --import, ESM hoists all `import` declarations, causing
 * http/Fastify to load before initTracing(), which means the
 * auto-instrumentation hooks never patch them.
 */

import { NodeSDK } from "@opentelemetry/sdk-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { ConsoleSpanExporter } from "@opentelemetry/sdk-trace-base";
import { resourceFromAttributes } from "@opentelemetry/resources";
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from "@opentelemetry/semantic-conventions";
import { PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import type { Span } from "@opentelemetry/api";

const OTEL_ENABLED = process.env.OTEL_ENABLED === "true";
const OTEL_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT || "http://localhost:4318";
const SERVICE_NAME = process.env.OTEL_SERVICE_NAME || "vista-evolved-api";
const SERVICE_VERSION = process.env.BUILD_SHA || "dev";

if (OTEL_ENABLED) {
  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: SERVICE_NAME,
    [ATTR_SERVICE_VERSION]: SERVICE_VERSION,
  });

  const traceExporter = new OTLPTraceExporter({
    url: `${OTEL_ENDPOINT}/v1/traces`,
  });

  // Phase 133: Use console exporter for dev mode if no collector is reachable
  const useConsoleExporter = process.env.OTEL_DEV_CONSOLE === "true";

  const metricExporter = new OTLPMetricExporter({
    url: `${OTEL_ENDPOINT}/v1/metrics`,
  });

  const sdk = new NodeSDK({
    resource,
    traceExporter: useConsoleExporter ? new ConsoleSpanExporter() : traceExporter,
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
        // Phase 133: Enable PG instrumentation for database span tracing
        "@opentelemetry/instrumentation-pg": {
          enabled: true,
          enhancedDatabaseReporting: false, // PHI-safe: no query params
        },
      }),
    ],
  });

  sdk.start();

  // Store reference globally so tracing.ts can access it for shutdown
  (globalThis as any).__otelSdk = sdk;

  // eslint-disable-next-line no-console
  console.log(`[otel] SDK started → ${OTEL_ENDPOINT} (service=${SERVICE_NAME})`);
} else {
  // eslint-disable-next-line no-console
  console.log("[otel] Tracing disabled (OTEL_ENABLED != true)");
}
