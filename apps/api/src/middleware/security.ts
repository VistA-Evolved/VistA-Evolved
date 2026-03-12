/**
 * Security & observability middleware -- Phase 15A/D.
 *
 * Fastify hooks for:
 *   - Request correlation IDs (X-Request-Id)
 *   - Request/response logging with redaction
 *   - Global error handler with structured responses
 *   - Rate limiting (per-IP, per-endpoint bucket)
 *   - Security headers (basic hardening)
 *   - Graceful shutdown
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'crypto';
import { log, setRequestId, clearRequestId } from '../lib/logger.js';
import { audit } from '../lib/audit.js';
import { enterRpcContext } from '../lib/rpc-resilience.js';
import { RATE_LIMIT_CONFIG, CSRF_CONFIG } from '../config/server-config.js';
import { getSession } from '../auth/session-store.js';
import type { SessionData } from '../auth/session-store.js';
import { getVistaBinding } from '../auth/idp/vista-binding.js';
import { disconnect as disconnectRpcBroker } from '../vista/rpcBrokerClient.js';
import { disconnectPool as disconnectRpcPool } from '../vista/rpcConnectionPool.js';
import { disconnectRedis } from '../lib/redis.js';
import { stopAggregationJob } from '../services/analytics-aggregator.js';
import { stopRoomCleanup } from '../telehealth/room-store.js';
import { stopBreakGlassCleanup } from '../auth/enterprise-break-glass.js';
import { stopCleanupJob as stopPortabilityCleanup } from '../services/record-portability-store.js';
import { stopShipperJob } from '../audit-shipping/shipper.js';
import { stopLinkRequestCleanup } from '../routes/identity-linking.js';
import { stopEtl } from '../services/analytics-etl.js';
import { stopHealthMonitor } from '../rcm/connectors/health-monitor.js';
import { stopHl7Engine } from '../hl7/index.js';
import { stopMeteringFlush, incrementMeter } from '../billing/metering.js';
import { getFeatureFlagProvider } from '../flags/types.js';
import {
  extractBearerToken,
  validateFhirBearerToken,
  principalFromSession,
} from '../fhir/fhir-bearer-auth.js';
// Phase 36: Telemetry
import { getCurrentTraceId } from '../telemetry/tracing.js';
import {
  httpRequestDuration,
  httpRequestsTotal,
  httpActiveRequests,
  errorsTotal,
  sanitizeRoute,
  recordSloSample,
} from '../telemetry/metrics.js';
import { shutdownTracing } from '../telemetry/tracing.js';
import { closePgDb } from '../platform/pg/pg-db.js';
// Phase 573B/573C: VistA config for RPC context injection
import { VISTA_HOST, VISTA_PORT, VISTA_CONTEXT } from '../vista/config.js';

/* ================================================================== */
/* CORS origin allowlist                                                */
/* ================================================================== */

const ALLOWED_ORIGINS = new Set(
  (
    process.env.ALLOWED_ORIGINS ||
    'http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,http://localhost:3002,http://127.0.0.1:3002,http://localhost:3004,http://127.0.0.1:3004'
  )
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
);

/**
 * Return a CORS origin validator function for @fastify/cors.
 * In production, only origins in the allowlist are accepted.
 * In development, the allowlist defaults to localhost:3000/3001.
 */
export function corsOriginValidator(
  origin: string,
  cb: (err: Error | null, allow?: boolean) => void
): void {
  // No origin header (same-origin, server-to-server, curl) -- allow
  if (!origin) return cb(null, true);
  if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
  // In development, allow any localhost
  if (
    process.env.NODE_ENV !== 'production' &&
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  ) {
    return cb(null, true);
  }
  cb(new Error('CORS origin not allowed'), false);
}

/* ================================================================== */
/* Auth gateway -- path-based auth requirements                          */
/* ================================================================== */

type AuthLevel = 'none' | 'session' | 'admin' | 'service' | 'fhir';

interface AuthRule {
  pattern: RegExp;
  auth: AuthLevel;
}

/**
 * Routes that require no authentication (health checks, auth flow, etc.).
 * Routes are matched top-to-bottom; first match wins.
 */
const AUTH_RULES: AuthRule[] = [
  {
    pattern: /^\/(health|ready|vista\/ping|vista\/swap-boundary|metrics(\/prometheus)?|version|docs(\/.*)?$)/,
    auth: 'none',
  },
  { pattern: /^\/auth\/sessions/, auth: 'session' }, // Phase 338: session management (own session check in handler)
  { pattern: /^\/auth\/security-events/, auth: 'session' }, // Phase 338: security events (admin checked in handler)
  { pattern: /^\/auth\/step-up\//, auth: 'session' }, // Phase 338: step-up status (session required)
  { pattern: /^\/auth\/mfa\//, auth: 'session' }, // Phase 338: MFA status (session required)
  { pattern: /^\/auth\//, auth: 'none' },
  { pattern: /^\/scim\/v2\/ServiceProviderConfig$/, auth: 'none' }, // Phase 339: SCIM discovery (public)
  { pattern: /^\/scim\//, auth: 'none' }, // Phase 339: SCIM endpoints (bearer token auth in handler)
  { pattern: /^\/secrets\//, auth: 'admin' }, // Phase 341: secrets management (admin only)
  { pattern: /^\/tenant-security\//, auth: 'admin' }, // Phase 342: tenant security posture (admin only)
  { pattern: /^\/privacy\//, auth: 'session' }, // Phase 343: privacy segmentation (session, fine-grained in handler)
  { pattern: /^\/siem\//, auth: 'admin' }, // Phase 344: SIEM management (admin only)
  // Wave 17: Multi-Facility + Dept Packs + Workflow Inbox + Patient Comms (Phases 346-353)
  { pattern: /^\/facilities\//, auth: 'admin' }, // Phase 347: facility management (admin only)
  { pattern: /^\/departments\//, auth: 'admin' }, // Phase 347: department management (admin only)
  { pattern: /^\/locations\//, auth: 'admin' }, // Phase 347: location management (admin only)
  { pattern: /^\/provider-assignments\//, auth: 'admin' }, // Phase 347: provider assignments (admin only)
  { pattern: /^\/dept-rbac\//, auth: 'admin' }, // Phase 348: department RBAC templates (admin only)
  { pattern: /^\/dept-packs\//, auth: 'session' }, // Phase 349: department packs (read=session, write=admin in handler)
  { pattern: /^\/workflow\//, auth: 'session' }, // Phase 350: workflow inbox (session, dept-scoped)
  { pattern: /^\/patient-comms\//, auth: 'session' }, // Phase 351: patient communications
  { pattern: /^\/dept-scheduling\//, auth: 'session' }, // Phase 352: dept scheduling (admin checks in handler)
  // Wave 18: Extensibility + Event Bus + Webhooks + Plugins (Phases 354-361)
  { pattern: /^\/events\//, auth: 'admin' }, // Phase 355: event bus management (admin only)
  { pattern: /^\/webhooks\//, auth: 'admin' }, // Phase 356: webhook management (admin only)
  { pattern: /^\/fhir-subscriptions\//, auth: 'session' }, // Phase 357: FHIR subscriptions (session)
  { pattern: /^\/plugins\//, auth: 'admin' }, // Phase 358: plugin SDK (admin only)
  { pattern: /^\/ui-extensions\//, auth: 'session' }, // Phase 359: UI extension slots (session)
  { pattern: /^\/plugin-marketplace\//, auth: 'admin' }, // Phase 360: plugin marketplace (admin only)
  { pattern: /^\/imaging\/ingest\/callback$/, auth: 'service' }, // Phase 23: Orthanc webhook (X-Service-Key)
  { pattern: /^\/imaging\/health$/, auth: 'session' }, // Phase 24: imaging health check
  { pattern: /^\/billing\/webhook$/, auth: 'none' }, // Phase 722: Stripe/Lago webhook (signature verified in handler)
  { pattern: /^\/billing\/plans$/, auth: 'none' }, // Phase 722: public pricing info
  { pattern: /^\/signup\//, auth: 'none' }, // Phase C4: public signup registration (rate limited in handler)
  { pattern: /^\/billing\/health$/, auth: 'session' }, // Phase 284: billing health check
  { pattern: /^\/imaging\/devices/, auth: 'session' }, // Phase 24: device registry (imaging_admin checked in handler)
  { pattern: /^\/imaging\/audit/, auth: 'session' }, // Phase 24: imaging audit (imaging_admin checked in handler)
  { pattern: /^\/security\/break-glass/, auth: 'session' }, // Phase 24: break-glass
  { pattern: /^\/analytics\//, auth: 'session' }, // Phase 25: analytics (permission checked in handler)
  { pattern: /^\/iam\/oidc\/config$/, auth: 'none' }, // Phase 35: OIDC discovery (public)
  { pattern: /^\/iam\/health$/, auth: 'session' }, // Phase 35: IAM health
  { pattern: /^\/iam\//, auth: 'session' }, // Phase 35: IAM routes (role checked in handler)
  { pattern: /^\/portal\/staff\//, auth: 'session' }, // Phase 623: CPRS staff queues use clinician session auth
  { pattern: /^\/portal\/auth\//, auth: 'none' }, // Phase 26: portal login/logout/session (own auth)
  { pattern: /^\/portal\//, auth: 'none' }, // Phase 26: portal routes (own session check in handler)
  { pattern: /^\/ai\/portal\//, auth: 'none' }, // Phase 33: portal AI endpoints use portal session auth in handler
  { pattern: /^\/telehealth\/health$/, auth: 'session' }, // Phase 30: telehealth health (clinician)
  { pattern: /^\/telehealth\/device-check\//, auth: 'none' }, // Phase 30: device check requirements (public)
  { pattern: /^\/telehealth\//, auth: 'session' }, // Phase 30: telehealth rooms (clinician session)
  { pattern: /^\/api\/capabilities/, auth: 'session' }, // Phase 37C: capability resolution (session)
  { pattern: /^\/api\/modules/, auth: 'session' }, // Phase 37C: module status (admin checked in handler)
  { pattern: /^\/api\/adapters/, auth: 'session' }, // Phase 37C: adapter info (admin checked in handler)
  { pattern: /^\/api\/marketplace/, auth: 'session' }, // Phase 51: marketplace config (admin checked in handler)
  { pattern: /^\/migration\//, auth: 'session' }, // Phase 50: Migration toolkit (permission checked in handler)
  { pattern: /^\/rcm\//, auth: 'session' }, // Phase 38: RCM routes (permission checked in handler)
  { pattern: /^\/payerops\//, auth: 'session' }, // Phase 92: Payment tracking + reconciliation + payer intelligence
  { pattern: /^\/scheduling\//, auth: 'session' }, // Phase 63: Scheduling routes (session required)
  { pattern: /^\/messaging\/portal\//, auth: 'none' }, // Phase 64: Portal messaging (own session check)
  { pattern: /^\/messaging\//, auth: 'session' }, // Phase 64: Secure messaging (clinician session)
  { pattern: /^\/emar\//, auth: 'session' }, // Phase 85: eMAR + BCMA posture (session required)
  { pattern: /^\/handoff\//, auth: 'session' }, // Phase 86: Shift handoff + signout (session required)
  { pattern: /^\/qa\//, auth: 'none' }, // Phase 96B: QA routes (own NODE_ENV/QA_ROUTES_ENABLED guard)
  { pattern: /^\/__test__\//, auth: 'none' }, // Phase 96B: test-only trace endpoint (own guard)
  { pattern: /^\/i18n\/locales$/, auth: 'none' }, // Phase 132: supported locales (public)
  { pattern: /^\/i18n\//, auth: 'session' }, // Phase 132: locale preference (session required)
  { pattern: /^\/intake\/question-schema$/, auth: 'none' }, // Phase 132: intake questions (public, for portal)
  { pattern: /^\/intake\//, auth: 'none' }, // Phase 28/143: intake routes (own session check, portal or clinician)
  { pattern: /^\/queue\/display\//, auth: 'none' }, // Phase 159: public queue display board (no auth)
  { pattern: /^\/posture\//, auth: 'admin' }, // Phase 107: production posture (admin only)
  { pattern: /^\/posture$/, auth: 'admin' }, // Phase 107: unified posture endpoint
  { pattern: /^\/hardening\//, auth: 'admin' }, // Phase 118: go-live hardening (admin only)
  { pattern: /^\/admin\/my-tenant$/, auth: 'session' }, // Phase 17: client tenant config (any user)
  { pattern: /^\/(admin|audit|reports)\//, auth: 'admin' },
  { pattern: /^\/ws\//, auth: 'session' }, // WebSocket console + SSH terminal
  { pattern: /^\/terminal\//, auth: 'admin' }, // Terminal session management (admin only)
  { pattern: /^\/vista\/interop\//, auth: 'admin' }, // Phase 21: interop telemetry requires admin/provider
  { pattern: /^\/vista\/provision/, auth: 'admin' }, // Phase 155: provisioning status (admin only)
  { pattern: /^\/vista\//, auth: 'session' },
  { pattern: /^\/fhir\/metadata$/, auth: 'none' }, // Phase 178: FHIR CapabilityStatement (public per FHIR spec)
  { pattern: /^\/\.well-known\/smart-configuration$/, auth: 'none' }, // Phase 179: SMART on FHIR discovery (public per spec)
  { pattern: /^\/fhir\//, auth: 'fhir' }, // Phase 231: FHIR R4 gateway (session OR SMART bearer)
  // Wave 13: Regulatory/Compliance + Multi-Country (Phases 311-315)
  { pattern: /^\/residency\//, auth: 'admin' }, // Phase 311: data residency management
  { pattern: /^\/consent\//, auth: 'session' }, // Phase 312: consent management
  { pattern: /^\/terminology\//, auth: 'session' }, // Phase 313: terminology resolution
  { pattern: /^\/country-packs\//, auth: 'session' }, // Phase 314: country pack config
  { pattern: /^\/country-policy\//, auth: 'session' }, // Phase 493: effective country policy (session)
  { pattern: /^\/conformance\//, auth: 'admin' }, // Phase 499: conformance runner (admin only)
  { pattern: /^\/dsar\//, auth: 'session' }, // Phase 496: DSAR requests (session, fine-grained in handler)
  { pattern: /^\/compliance\//, auth: 'admin' }, // Phase 315: compliance matrix
  // Wave 28: Regulatory Reporting (Phase 444)
  { pattern: /^\/regulatory\//, auth: 'admin' }, // Phase 444: regulatory classification, attestation, export
  // Wave 14: Enterprise Interop (Phases 317-325)
  { pattern: /^\/api\/platform\/integrations\//, auth: 'admin' }, // Phase 318: integration control plane
  { pattern: /^\/hl7\/templates\//, auth: 'session' }, // Phase 319: HL7v2 message template library
  { pattern: /^\/hl7\/ops\//, auth: 'admin' }, // Phase 320: HL7v2 ops maturity (SLA, retry, dashboard)
  { pattern: /^\/x12\/gateway\//, auth: 'admin' }, // Phase 321: X12 inbound gateway (parse, validate, route)
  { pattern: /^\/clearinghouse\//, auth: 'admin' }, // Phase 322: Clearinghouse transport (SFTP, AS2, REST, vault)
  { pattern: /^\/certification\//, auth: 'admin' }, // Phase 323: Certification pipeline (suites, runs, certificates)
  { pattern: /^\/marketplace\//, auth: 'session' }, // Phase 324: Integration marketplace (read=session, write=admin inline)
  { pattern: /^\/onboarding\//, auth: 'admin' }, // Phase 325: Integration onboarding wizard (templates, sessions, readiness)
  // Wave 15: Scale + Cost + Multi-Region (Phase 328+)
  { pattern: /^\/platform\/clusters\//, auth: 'admin' }, // Phase 328: Multi-cluster registry
  { pattern: /^\/platform\/tenants\//, auth: 'admin' }, // Phase 328: Tenant placement
  { pattern: /^\/platform\/placements/, auth: 'admin' }, // Phase 328: Placement queries
  { pattern: /^\/platform\/routing\//, auth: 'admin' }, // Phase 329: Global routing
  { pattern: /^\/platform\/shards\//, auth: 'admin' }, // Phase 330: Data plane sharding
  { pattern: /^\/platform\/queues\//, auth: 'admin' }, // Phase 331: Queue regionalization
  { pattern: /^\/platform\/workers\//, auth: 'admin' }, // Phase 331: Regional workers
  { pattern: /^\/platform\/cache\//, auth: 'admin' }, // Phase 331: Cache partitions
  { pattern: /^\/platform\/costs\//, auth: 'admin' }, // Phase 332: Cost attribution
  { pattern: /^\/platform\/budgets\//, auth: 'admin' }, // Phase 332: Budget management
  { pattern: /^\/platform\/dr\//, auth: 'admin' }, // Phase 333: DR & GameDay
  { pattern: /^\/platform\/perf\//, auth: 'admin' }, // Phase 334: Scale performance
  { pattern: /^\/platform\/sre\//, auth: 'admin' }, // Phase 335: SRE / support posture
  { pattern: /^\/platform\/cert\//, auth: 'admin' }, // Phase 336: Scale certification
  // Wave 20: GA Launch Program + Customer Success + External Validation (Phases 370-377)
  { pattern: /^\/release-train\//, auth: 'admin' }, // Phase 371: release train governance
  { pattern: /^\/customer-success\//, auth: 'admin' }, // Phase 372: customer success tooling
  { pattern: /^\/support-ops\//, auth: 'admin' }, // Phase 373: support ops automation
  { pattern: /^\/external-validation\//, auth: 'admin' }, // Phase 374: external validation harness
  { pattern: /^\/data-rights\//, auth: 'admin' }, // Phase 375: data rights operations
  { pattern: /^\/ga\//, auth: 'admin' }, // Phase 377: GA evidence + trust center
  // Wave 21: Device + Modality Integration (Phases 378-388)
  { pattern: /^\/edge-gateways\/uplink/, auth: 'service' }, // Phase 379: gateway uplink ingest
  { pattern: /^\/edge-gateways\/[^/]+\/heartbeat/, auth: 'service' }, // Phase 379: gateway heartbeat
  { pattern: /^\/edge-gateways\//, auth: 'admin' }, // Phase 379: gateway management
  { pattern: /^\/devices\/hl7v2\/ingest$/, auth: 'service' }, // Phase 381: HL7v2 ingest (gateway)
  { pattern: /^\/devices\/astm\/ingest$/, auth: 'service' }, // Phase 382: ASTM ingest (gateway)
  { pattern: /^\/devices\/poct1a\/ingest$/, auth: 'service' }, // Phase 382: POCT1-A ingest (gateway)
  { pattern: /^\/devices\/sdc\/ingest$/, auth: 'service' }, // Phase 383: SDC ingest (sidecar)
  { pattern: /^\/devices\/infusion\/pump-events$/, auth: 'service' }, // Phase 385: pump event ingest
  { pattern: /^\/devices\//, auth: 'admin' }, // Phase 380: device registry
  // Wave 22: Specialty Clinical Content + CDS + Deep VistA Writeback (Phases 389-398)
  { pattern: /^\/content-packs\/install$/, auth: 'admin' }, // Phase 390: pack install
  { pattern: /^\/content-packs\/rollback$/, auth: 'admin' }, // Phase 390: pack rollback
  { pattern: /^\/content-packs\//, auth: 'session' }, // Phase 390: pack reads
  // -- Wave 22, Phase 391: Inpatient Core --
  { pattern: /^\/inpatient\/beds$/, auth: 'admin' }, // Phase 391: bed create (admin)
  { pattern: /^\/inpatient\/beds\/[^\/]+$/, auth: 'admin' }, // Phase 391: bed update (admin)
  { pattern: /^\/inpatient\//, auth: 'session' }, // Phase 391: inpatient reads
  // -- Wave 22, Phase 392: Pharmacy Deep Workflows --
  { pattern: /^\/pharmacy\/orders\/[^\/]+\/override$/, auth: 'admin' }, // Phase 392: clinical check override
  { pattern: /^\/pharmacy\//, auth: 'session' }, // Phase 392: pharmacy reads + writes
  // -- Wave 22, Phase 393: Lab Deep Workflows --
  { pattern: /^\/lab\/critical-alerts\/[^\/]+\/resolve$/, auth: 'admin' }, // Phase 393: resolve critical alert (admin)
  { pattern: /^\/lab\//, auth: 'session' }, // Phase 393: lab reads + writes
  // -- Wave 22, Phase 394: Imaging/Radiology Deep Workflows --
  { pattern: /^\/radiology\/critical-alerts\/[^\/]+\/resolve$/, auth: 'admin' }, // Phase 394: resolve rad critical alert
  { pattern: /^\/radiology\//, auth: 'session' }, // Phase 394: radiology reads + writes
  // -- Wave 22, Phase 395: CDS Hooks + SMART Launch --
  { pattern: /^\/cds\/cqf\/config$/, auth: 'admin' }, // Phase 395: CQF Ruler config (admin)
  { pattern: /^\/cds\//, auth: 'session' }, // Phase 395: CDS hooks + SMART launch
  // -- Wave 22, Phase 396: Clinical Reasoning + Quality Measures --
  { pattern: /^\/clinical-reasoning\//, auth: 'session' }, // Phase 396: clinical reasoning
  // -- Wave 22, Phase 397: Localization + Multi-Country Packs + Theming --
  { pattern: /^\/localization\/config$/, auth: 'session' }, // Phase 397: tenant config (session)
  { pattern: /^\/localization\/resolve$/, auth: 'session' }, // Phase 397: translation resolve (session)
  { pattern: /^\/localization\//, auth: 'session' }, // Phase 397: localization
  // Wave 23: Longitudinal Interop + HIE + Multi-Country Exchange Packs (Phases 399-408)
  { pattern: /^\/interop-gateway\//, auth: 'session' }, // Phase 400: Interop Gateway Layer
  { pattern: /^\/mpi\//, auth: 'session' }, // Phase 401: MPI / Client Registry
  { pattern: /^\/provider-directory\//, auth: 'session' }, // Phase 402: Provider Directory
  { pattern: /^\/document-exchange\//, auth: 'session' }, // Phase 403: Document Exchange
  { pattern: /^\/bulk-data\//, auth: 'session' }, // Phase 404: Bulk Data
  { pattern: /^\/consent-pou\//, auth: 'session' }, // Phase 405: Consent + Purpose of Use
  { pattern: /^\/exchange-packs\//, auth: 'session' }, // Phase 406-407: Exchange Packs
  // Wave 24: Pilot Go-Lives + Stabilization (Phases 409-417)
  { pattern: /^\/pilots\//, auth: 'admin' }, // Phase 411+: Pilot intake/ops (admin only)
  // Wave 31: Service-line boards -- ED / OR / ICU (Phases 464-471)
  { pattern: /^\/ed\//, auth: 'session' }, // Phase 464-465: ED tracker + board
  { pattern: /^\/or\//, auth: 'session' }, // Phase 466-467: OR scheduling + board
  { pattern: /^\/icu\//, auth: 'session' }, // Phase 468-469: ICU flowsheet + metrics
  // Default: session required for anything else
];

const COOKIE_NAME = process.env.SESSION_COOKIE || 'ehr_session';

/** Extract session token from cookie or Authorization header. */
function extractToken(request: FastifyRequest): string | null {
  const cookie = (request as any).cookies?.[COOKIE_NAME];
  if (cookie) return cookie;
  const auth = request.headers.authorization;
  if (typeof auth === 'string' && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/** Attach resolved session to request for downstream use. */
declare module 'fastify' {
  interface FastifyRequest {
    session?: SessionData;
  }
}

/* ================================================================== */
/* Rate limit state                                                     */
/* ================================================================== */

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateBuckets = new Map<string, RateBucket>();

// Cleanup old buckets every 60s
const _rateBucketCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of rateBuckets) {
    if (bucket.resetAt <= now) rateBuckets.delete(key);
  }
}, 60_000);
_rateBucketCleanup.unref(); // Don't keep process alive for cleanup timer

function checkRateLimit(
  ip: string,
  endpoint: string
): { allowed: boolean; remaining: number; resetAt: number } {
  const isLogin = endpoint === '/auth/login';
  const isAuthSensitive = !isLogin && (
    endpoint.startsWith('/auth/step-up') ||
    endpoint.startsWith('/auth/mfa') ||
    endpoint.startsWith('/auth/sessions') ||
    endpoint.startsWith('/scim/')
  );
  const maxReq = isLogin
    ? RATE_LIMIT_CONFIG.loginMax
    : isAuthSensitive
      ? Math.min(RATE_LIMIT_CONFIG.generalMax, 30)
      : RATE_LIMIT_CONFIG.generalMax;
  const tier = isLogin ? 'login' : isAuthSensitive ? 'auth-sensitive' : 'general';
  const key = `${ip}::${tier}`;
  const now = Date.now();

  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + RATE_LIMIT_CONFIG.windowMs };
    rateBuckets.set(key, bucket);
  }

  bucket.count++;
  const remaining = Math.max(0, maxReq - bucket.count);
  return { allowed: bucket.count <= maxReq, remaining, resetAt: bucket.resetAt };
}

/* ================================================================== */
/* Error message sanitization                                           */
/* ================================================================== */

/** Remove VistA internal details, stack traces, and file paths from client-facing errors. */
function sanitizeClientError(msg: string): string {
  if (!msg) return 'Request failed';
  // Strip file paths
  let s = msg.replace(/[A-Za-z]:\\[^\s]+/g, '[path]');
  s = s.replace(/\/[a-z][^\s]*/gi, '[path]');
  // Strip VistA-internal references
  s = s.replace(/\^[A-Z][A-Z0-9]*/g, '[routine]');
  // Limit length
  if (s.length > 200) s = s.slice(0, 200) + '...';
  return s;
}

/* ================================================================== */
/* Plugin registration                                                  */
/* ================================================================== */

/**
 * Register all security and observability hooks on the Fastify instance.
 */
export async function registerSecurityMiddleware(server: FastifyInstance): Promise<void> {
  /* ---- Request ID + logging ---- */
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    // Generate or inherit request ID
    const incoming = request.headers['x-request-id'];
    const requestId = typeof incoming === 'string' && incoming.length > 0 ? incoming : randomUUID();

    // Store on request for downstream access
    (request as any).requestId = requestId;
    setRequestId(requestId);

    // Expose in response
    reply.header('X-Request-Id', requestId);
    // Phase 133: correlation ID header (same as requestId for distributed tracing)
    reply.header('X-Correlation-Id', requestId);

    // Phase 36: trace ID header
    const traceId = getCurrentTraceId();
    if (traceId) reply.header('X-Trace-Id', traceId);

    // Phase 36: track active requests
    httpActiveRequests.inc();
  });

  /* ---- Security headers ---- */
  server.addHook('onRequest', async (_request: FastifyRequest, reply: FastifyReply) => {
    reply.header('X-Content-Type-Options', 'nosniff');
    reply.header('X-Frame-Options', 'DENY');
    reply.header('X-XSS-Protection', '0'); // Modern: CSP handles XSS prevention
    reply.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    reply.header('Cache-Control', 'no-store'); // PHI: never cache API responses
    reply.header('Pragma', 'no-cache');
    // Phase 118: OWASP-recommended headers
    reply.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
    reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    reply.header('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  });

  /* ---- Rate limiting ---- */
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const ip = request.ip || 'unknown';
    const url = request.url.split('?')[0]; // Strip query params
    const { allowed, remaining, resetAt } = checkRateLimit(ip, url);

    reply.header('X-RateLimit-Remaining', String(remaining));
    reply.header('X-RateLimit-Reset', String(Math.ceil(resetAt / 1000)));

    if (!allowed) {
      log.warn('Rate limit exceeded', { ip, url });
      audit(
        'security.rate-limited',
        'denied',
        { duz: 'anonymous' },
        {
          sourceIp: ip,
          detail: { url },
        }
      );
      (request as any)._rejected = true;
      reply.code(429).send({
        ok: false,
        error: 'Too many requests',
        retryAfterMs: resetAt - Date.now(),
      });
      return;
    }
  });

  /* ---- Auth gateway (path-based authentication + authorization) ---- */
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as any)._rejected || reply.sent) return;
    const url = request.url.split('?')[0];

    // Determine required auth level
    let requiredAuth: AuthLevel = 'session'; // default
    for (const rule of AUTH_RULES) {
      if (rule.pattern.test(url)) {
        requiredAuth = rule.auth;
        break;
      }
    }

    if (requiredAuth === 'none') return;

    // Service auth -- X-Service-Key header (Phase 23: ingest callbacks)
    if (requiredAuth === 'service') {
      // Service endpoints bypass session auth -- validated in route handler
      return;
    }

    // Phase 231: FHIR auth -- accepts session cookie OR SMART Bearer JWT
    if (requiredAuth === 'fhir') {
      const bearerToken = extractBearerToken(request);
      if (bearerToken) {
        // Try SMART Bearer JWT first
        const result = await validateFhirBearerToken(bearerToken);
        if (result.ok) {
          request.fhirPrincipal = result.principal;
          // Also set a synthetic session for backward compat with requireSession()
          const now = Date.now();
          request.session = {
            token: 'bearer',
            duz: result.principal.duz,
            userName: result.principal.userName,
            role: (result.principal.roles[0] || 'provider') as SessionData['role'],
            facilityStation: '',
            facilityName: '',
            divisionIen: '',
            tenantId: result.principal.tenantId,
            createdAt: now,
            lastActivity: now,
            csrfSecret: '',
          } satisfies SessionData;
          return;
        }
        // Bearer token was present but invalid -- reject (don't fall through to session)
        log.warn('FHIR bearer token rejected', { error: result.error, url });
        (request as any)._rejected = true;
        reply.code(401).send({
          ok: false,
          error: 'Invalid bearer token',
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'error', code: 'login', diagnostics: result.error }],
        });
        return;
      }
      // No bearer token -- fall through to session auth below
    }

    // Extract and validate session
    const token = extractToken(request);
    if (!token) {
      (request as any)._rejected = true;
      reply.code(401).send({ ok: false, error: 'Authentication required' });
      return;
    }

    const session = await getSession(token);
    if (!session) {
      (request as any)._rejected = true;
      reply.code(401).send({ ok: false, error: 'Session expired or invalid' });
      return;
    }

    // Attach session to request for downstream audit attribution
    request.session = session;

    if (!session.tenantId || typeof session.tenantId !== 'string') {
      audit(
        'security.invalid-input',
        'denied',
        {
          duz: session.duz,
          name: session.userName,
          role: session.role,
        },
        { sourceIp: request.ip, detail: { url, tokenPresent: true } }
      );
      (request as any)._rejected = true;
      reply.code(403).send({ ok: false, error: 'Tenant context missing from session' });
      return;
    }

    // Inject RPC context so safeCallRpc routes through the connection pool with
    // clinician-bound credentials when available. If the request has a session
    // but no active VistA binding, safeCallRpc will fail closed instead of
    // silently falling back to the system DUZ.
    const vistaBinding = getVistaBinding(token);
    const effectiveDuz = vistaBinding?.duz || session.duz;
    if (effectiveDuz) {
      enterRpcContext({
        tenantId: session.tenantId || vistaBinding?.tenantId || '',
        duz: effectiveDuz,
        vistaHost: VISTA_HOST,
        vistaPort: VISTA_PORT,
        vistaContext: VISTA_CONTEXT,
        accessCode: vistaBinding?.accessCode,
        verifyCode: vistaBinding?.verifyCode,
      });
    }

    // Phase 231: For FHIR routes with session auth, also set fhirPrincipal
    if (requiredAuth === 'fhir') {
      request.fhirPrincipal = principalFromSession(session);
    }

    // Admin role check -- strict admin-only (AGENTS.md #24 RBAC tightening)
    if (requiredAuth === 'admin') {
      if (session.role !== 'admin') {
        audit(
          'security.rbac-denied',
          'denied',
          {
            duz: session.duz,
            name: session.userName,
            role: session.role,
          },
          { sourceIp: request.ip, detail: { url, requiredRole: 'admin' } }
        );
        (request as any)._rejected = true;
        reply.code(403).send({ ok: false, error: 'Insufficient privileges' });
        return;
      }
    }
  });

  /* ---- Origin check for state-changing requests ---- */
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as any)._rejected || reply.sent) return;
    // Only check POST/PUT/DELETE/PATCH
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(request.method)) return;

    const origin = request.headers.origin;
    // No origin header (same-origin requests, curl, server-to-server) -- allow
    if (!origin) return;

    // Check allowlist
    if (ALLOWED_ORIGINS.has(origin)) return;
    // Dev mode: allow localhost
    if (
      process.env.NODE_ENV !== 'production' &&
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
    )
      return;

    log.warn('Origin check failed', { origin, url: request.url, ip: request.ip });
    audit(
      'security.origin-rejected',
      'denied',
      {
        duz: (request.session as any)?.duz || 'anonymous',
      },
      { sourceIp: request.ip, detail: { origin, url: request.url } }
    );

    (request as any)._rejected = true;
    reply.code(403).send({ ok: false, error: 'Origin not allowed' });
  });

  /* ---- CSRF synchronizer token (Phase 132 -- migrated from double-submit cookie) ---- */
  /*
   * The CSRF secret is stored server-side in the session (session-store.ts):
   *   - Generated at session creation (randomBytes(32).toString("hex"))
   *   - Stored in DB column csrf_secret on auth_session table
   *   - Delivered to the client via JSON body (login response, GET /auth/csrf-token)
   *   - Client sends it back as x-csrf-token header on every mutation
   *   - Server validates: header value === session.csrfSecret
   *
   * This is the OWASP "Synchronizer Token" pattern -- strictly stronger than
   * double-submit cookie because the CSRF token is never stored in a cookie,
   * so it's immune to cookie injection attacks (subdomain, HTTP MitM).
   */
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if ((request as any)._rejected || reply.sent) return;

    // Safe methods don't need CSRF validation
    if ((CSRF_CONFIG.safeMethods as readonly string[]).includes(request.method)) return;

    // Auth endpoints are exempt (login doesn't have a session yet)
    const url = request.url.split('?')[0];
    if (url.startsWith('/auth/')) return;
    // Service-to-service callbacks are exempt
    if (url === '/imaging/ingest/callback') return;
    // Health/metrics/version are exempt
    if (/^\/(health|ready|vista\/ping|vista\/swap-boundary|metrics|version)/.test(url)) return;
    // Portal routes use their own CSRF validation (portal-iam/csrf.ts)
    if (url.startsWith('/portal/')) return;
    // QA routes are test-only and gated by NODE_ENV
    if (url.startsWith('/qa/') || url.startsWith('/__test__/')) return;

    // The session must already be loaded by the auth gateway hook above
    const session = request.session;
    if (!session || !session.csrfSecret) {
      // No session = route has auth: "none" and shouldn't get here,
      // but if it does, let it through (the route doesn't need CSRF without a session)
      return;
    }

    // Validate: header must match session-bound secret
    const headerToken = request.headers[CSRF_CONFIG.headerName] as string | undefined;
    if (!headerToken || headerToken !== session.csrfSecret) {
      log.warn('CSRF validation failed (synchronizer token)', {
        url,
        ip: request.ip,
        hasSession: true,
        hasHeader: !!headerToken,
      });
      audit(
        'security.csrf-failed',
        'denied',
        {
          duz: session.duz || 'anonymous',
        },
        { sourceIp: request.ip, detail: { url } }
      );
      (request as any)._rejected = true;
      reply.code(403).send({ ok: false, error: 'CSRF token mismatch' });
      return;
    }
  });

  /* ---- Response scrubber: sanitize error messages before they reach the client ---- */
  server.addHook(
    'onSend',
    async (_request: FastifyRequest, _reply: FastifyReply, payload: unknown) => {
      if (typeof payload !== 'string') return payload;
      try {
        const parsed = JSON.parse(payload);
        if (parsed && parsed.ok === false && typeof parsed.error === 'string') {
          parsed.error = sanitizeClientError(parsed.error);
          return JSON.stringify(parsed);
        }
      } catch {
        // Not JSON -- pass through
      }
      return payload;
    }
  );

  /* ---- Request logging ---- */
  server.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    const duration = reply.elapsedTime;
    const logData = {
      method: request.method,
      url: request.url.split('?')[0],
      statusCode: reply.statusCode,
      durationMs: Math.round(duration),
      ip: request.ip,
      requestId: (request as any).requestId,
    };

    if (reply.statusCode >= 500) {
      log.error('Request completed (5xx)', logData);
      errorsTotal.inc({ category: 'http_5xx' });
    } else if (reply.statusCode >= 400) {
      log.warn('Request completed (4xx)', logData);
    } else {
      log.info('Request completed', logData);
    }

    // Phase 36: Prometheus metrics
    const route = sanitizeRoute(request.url);
    const method = request.method;
    const statusCode = String(reply.statusCode);
    httpRequestDuration.observe({ method, route, status_code: statusCode }, duration / 1000);
    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpActiveRequests.dec();

    // Phase 133: SLO sample (p95 latency budget + error budget tracking)
    const SLO_P95_BUDGET_MS = Number(process.env.SLO_P95_BUDGET_MS) || 500;
    const isError = reply.statusCode >= 500;
    recordSloSample(route, duration, isError, SLO_P95_BUDGET_MS);

    // Phase 586 (W42-P15): Billing metering -- count API calls per tenant
    try {
      const tenantId = (request as any).session?.tenantId;
      if (tenantId) {
        incrementMeter(tenantId, 'api_call');
        if (route.startsWith('/fhir/')) incrementMeter(tenantId, 'fhir_request');
      }
    } catch {
      // Metering is best-effort; never block the response
    }

    clearRequestId();
  });

  /* ---- Global error handler (never leak stack traces or VistA internals) ---- */
  server.setErrorHandler(
    async (
      error: Error & { statusCode?: number; validation?: unknown },
      request: FastifyRequest,
      reply: FastifyReply
    ) => {
      const statusCode = (error as any).statusCode || 500;
      const requestId = (request as any).requestId || 'unknown';

      // Log full detail server-side (redacted)
      log.error('Unhandled error', {
        error: error.message,
        statusCode,
        url: request.url,
        method: request.method,
        requestId,
      });

      // Client response: generic message for 5xx, sanitized for 4xx
      const clientError =
        statusCode >= 500 ? 'Internal server error' : sanitizeClientError(error.message);

      return reply.code(statusCode).send({
        ok: false,
        error: clientError,
        requestId,
      });
    }
  );

  /* ---- Graceful shutdown ---- */
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      log.info('Graceful shutdown initiated', { signal });
      audit(
        'system.shutdown',
        'success',
        { duz: 'system', name: 'system', role: 'system' },
        {
          detail: { signal },
        }
      );

      // Phase 36: drain timeout -- force exit if graceful close takes too long
      const DRAIN_TIMEOUT_MS = Number(process.env.SHUTDOWN_DRAIN_TIMEOUT_MS) || 30_000;
      const drainTimer = setTimeout(() => {
        log.error('Graceful shutdown timed out, forcing exit', {
          drainTimeoutMs: DRAIN_TIMEOUT_MS,
        });
        process.exit(1);
      }, DRAIN_TIMEOUT_MS);
      drainTimer.unref(); // don't keep process alive just for this timer

      try {
        await server.close();
        // Phase 21: disconnect RPC broker to prevent orphaned VistA jobs
        try {
          disconnectRpcBroker();
        } catch {
          /* socket may already be closed */
        }
        try {
          disconnectRpcPool();
        } catch {
          /* pool may already be drained */
        }
        try {
          await disconnectRedis();
        } catch {
          /* redis may already be disconnected */
        }
        // Phase 25: stop analytics aggregation job and ETL writer
        try {
          stopAggregationJob();
        } catch {
          /* timer may already be cleared */
        }
        try {
          stopEtl();
        } catch {
          /* connection may already be closed */
        }
        // Phase 30: stop telehealth room cleanup timer
        try {
          stopRoomCleanup();
        } catch {
          /* timer may already be cleared */
        }
        // Phase 141: stop break-glass cleanup timer
        try {
          stopBreakGlassCleanup();
        } catch {
          /* timer may already be cleared */
        }
        // Phase 80: stop record portability cleanup timer
        try {
          stopPortabilityCleanup();
        } catch {
          /* timer may already be cleared */
        }
        // Phase 157: stop audit JSONL shipper
        try {
          stopShipperJob();
        } catch {
          /* timer may already be cleared */
        }
        // Phase 169: stop identity link request cleanup
        try {
          stopLinkRequestCleanup();
        } catch {
          /* timer may already be cleared */
        }
        // Phase 239: stop HL7v2 MLLP engine
        try {
          await stopHl7Engine();
        } catch {
          /* engine may not be running */
        }
        // Phase 242: stop payer connector health monitor
        try {
          stopHealthMonitor();
        } catch {
          /* timer may already be cleared */
        }
        // Phase 307: stop telehealth session sweeper
        try {
          const { stopSessionSweeper } = await import('../telehealth/session-hardening.js');
          stopSessionSweeper();
        } catch {
          /* sweeper may not be started */
        }
        // Phase 284: stop billing metering flush timer
        try {
          stopMeteringFlush();
        } catch {
          /* timer may already be cleared */
        }
        // Phase 285: destroy feature flag provider (stop Unleash polling)
        try {
          const ffp = getFeatureFlagProvider();
          if (ffp) await ffp.destroy();
        } catch {
          /* provider may not be initialized */
        }
        // Phase 101: close platform Postgres pool
        try {
          await closePgDb();
        } catch {
          /* pool may already be closed */
        }
        // Phase 116: stop Graphile Worker job runner
        try {
          const { stopJobRunner } = await import('../jobs/runner.js');
          await stopJobRunner();
        } catch {
          /* runner may not be started */
        }
        // Phase 36: flush OTel traces/metrics
        try {
          await shutdownTracing();
        } catch {
          /* best effort */
        }
        log.info('Server closed gracefully');
      } catch (err: any) {
        log.error('Error during shutdown', { error: err.message });
      }
      clearTimeout(drainTimer);
      process.exit(0);
    });
  }

  log.info('Security middleware registered', {
    features: [
      'request-ids',
      'security-headers',
      'rate-limiting',
      'auth-gateway',
      'origin-check',
      'csrf-synchronizer-token',
      'error-handler',
      'graceful-shutdown',
    ],
  });
}
