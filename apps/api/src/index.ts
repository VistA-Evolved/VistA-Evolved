/**
 * VistA-Evolved API -- Entrypoint
 *
 * Phase 173: Decomposed from 2,911-line monolith into server/ modules.
 * This file handles only pre-server validation and then delegates to
 * the server module for building, listening, and lifecycle management.
 *
 * Architecture:
 *   server/register-plugins.ts  -- Fastify plugins, security, content parsers
 *   server/register-routes.ts   -- All 92+ route plugin registrations
 *   server/inline-routes.ts     -- Health/ready/metrics/audit/admin/vista routes
 *   server/lifecycle.ts         -- DB init, repo wiring, background services
 *   server/build-server.ts      -- Composes Fastify instance
 *   server/start.ts             -- Listen + lifecycle orchestration
 */

// ----------------------------------------------------------------------
// Phase 125: Validate runtime mode contract BEFORE anything else
// Throws in rc/prod if PLATFORM_PG_URL is missing.
// ----------------------------------------------------------------------
import { validateRuntimeMode } from './platform/runtime-mode.js';
validateRuntimeMode();

// ----------------------------------------------------------------------
// Phase 141: Validate auth mode policy (after runtime mode)
// In rc/prod: requires AUTH_MODE=oidc. In dev/test: permissive.
// ----------------------------------------------------------------------
import { enforceAuthMode } from './auth/auth-mode-policy.js';
enforceAuthMode();

// ----------------------------------------------------------------------
// Phase 153: Validate OIDC config depth (warnings/errors at boot)
// Surfaces JWKS derivability + client_id explicitness issues.
// ----------------------------------------------------------------------
import { validateOidcConfig } from './auth/oidc-provider.js';
import { log } from './lib/logger.js';

{
  const oidcValidation = validateOidcConfig();
  if (oidcValidation.errors.length > 0) {
    throw new Error(`OIDC configuration validation failed: ${oidcValidation.errors.join('; ')}`);
  }
  if (oidcValidation.warnings.length > 0) {
    for (const w of oidcValidation.warnings) {
      log.warn(w, { component: 'oidc-config' });
    }
  }
}

// ----------------------------------------------------------------------
// Phase 36: Initialize OTel tracing (must be before Fastify)
// ----------------------------------------------------------------------
import { initTracing, getCurrentTraceId, getCurrentSpanId } from './telemetry/tracing.js';
import { bridgeTracingToLogger } from './lib/logger.js';

initTracing();
bridgeTracingToLogger(getCurrentTraceId, getCurrentSpanId);

// ----------------------------------------------------------------------
// Global safety net: log + exit on unhandled rejections / exceptions.
// Without this, Node.js 15+ terminates silently on unhandled rejections.
// ----------------------------------------------------------------------
process.on('unhandledRejection', (reason) => {
  log.error('Unhandled promise rejection -- shutting down', {
    error: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
  process.exit(1);
});
process.on('uncaughtException', (err) => {
  log.error('Uncaught exception -- shutting down', {
    error: err.message,
    stack: err.stack,
  });
  process.exit(1);
});

// ----------------------------------------------------------------------
// Start the server (build + listen + lifecycle)
// ----------------------------------------------------------------------
import { startServer } from './server/start.js';

await startServer();

// ----------------------------------------------------------------------
// Module Manifest (Phase 173 decomposition reference)
//
// The following registrations moved to server/ modules in Phase 173.
// This manifest exists so certification gates can discover wiring
// by scanning this entrypoint file.
//
// Routes (register-routes.ts):
//   identityLinkingRoutes  <- routes/identity-linking.ts
//   opsAdminRoutes         <- routes/ops-admin.ts
//   certificationEvidenceRoutes <- routes/certification-evidence.ts
//
// Lifecycle (lifecycle.ts):
//   dbPoolInUse, dbPoolTotal <- telemetry/metrics.ts (PG pool gauges)
//
// See server/register-routes.ts for the full 92+ route plugin list.
// See server/lifecycle.ts for DB init, background jobs, and pool stats.
// ----------------------------------------------------------------------
