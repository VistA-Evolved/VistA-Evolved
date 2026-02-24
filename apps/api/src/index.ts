import Fastify from "fastify";
import cors from "@fastify/cors";
import cookie from "@fastify/cookie";
import websocket from "@fastify/websocket";
import { probeConnect } from "./vista/rpcBroker";
import { validateCredentials } from "./vista/config";
import { connect, disconnect, callRpc, callRpcWithList, getDuz } from "./vista/rpcBrokerClient";
import { registerDomainRoutes } from "./routes/index.js";
import authRoutes from "./auth/auth-routes.js";
import { requireSession } from "./auth/auth-routes.js";
import wsConsoleRoutes from "./routes/ws-console.js";
import { discoverCapabilities, getCapabilities, optionalRpc, isRpcAvailable, getDomainCapabilities } from "./vista/rpcCapabilities.js";
import capabilityRoutes from "./routes/capabilities.js";
import writeBackRoutes from "./routes/write-backs.js";
import imagingRoutes from "./services/imaging-service.js";
import imagingProxyRoutes from "./routes/imaging-proxy.js";
import imagingWorklistRoutes from "./services/imaging-worklist.js";
import imagingIngestRoutes from "./services/imaging-ingest.js";
import { imagingAuthzRoutes } from "./services/imaging-authz.js";
import { imagingDeviceRoutes } from "./services/imaging-devices.js";
import { imagingAuditRoutes } from "./routes/imaging-audit-routes.js";
import imagingViewerRoutes from "./routes/imaging-viewer.js";
import adminRoutes from "./routes/admin.js";
import interopRoutes from "./routes/interop.js";
import vistaInteropRoutes from "./routes/vista-interop.js";
import reportingRoutes from "./routes/reporting.js";
import analyticsRoutes from "./routes/analytics-routes.js";
import portalAuthRoutes from "./routes/portal-auth.js";
import { getPortalSession } from "./routes/portal-auth.js";
import portalCoreRoutes, { initPortalCore } from "./routes/portal-core.js";
// Phase 80: Patient Record Portability
import recordPortabilityRoutes, { initRecordPortability } from "./routes/record-portability.js";
import { startCleanupJob as startPortabilityCleanup } from "./services/record-portability-store.js";
// Phase 28: Enterprise Intake OS
import intakeRoutes, { initIntakeRoutes } from "./intake/intake-routes.js";
import "./intake/packs/index.js"; // registers 23 built-in packs
// Phase 29: Portal IAM + Proxy Workflows + Access Logs
import portalIamRoutes from "./portal-iam/portal-iam-routes.js";
import { seedDevUsers } from "./portal-iam/portal-user-store.js";
// Phase 30: Telehealth provider adapters + device check + waiting room
import telehealthRoutes, { initTelehealthRoutes } from "./routes/telehealth.js";
import { startRoomCleanup, stopRoomCleanup } from "./telehealth/room-store.js";
// Phase 33: AI Gateway (governed, grounded, safe)
import aiGatewayRoutes, { initAiRoutes } from "./routes/ai-gateway.js";
// Phase 35: Enterprise IAM, Policy Authorization & Immutable Audit
import iamRoutes from "./routes/iam-routes.js";
// Phase 36: Observability & Reliability
import { initTracing, isTracingEnabled, getCurrentTraceId, getCurrentSpanId } from "./telemetry/tracing.js";
import { getPrometheusMetrics, getMetricsContentType, circuitBreakerState as cbStateGauge } from "./telemetry/metrics.js";
import { bridgeTracingToLogger } from "./lib/logger.js";
// Phase 15: Enterprise hardening imports
import { registerSecurityMiddleware, corsOriginValidator } from "./middleware/security.js";
import { log } from "./lib/logger.js";
import { audit, queryAuditEvents, getAuditStats } from "./lib/audit.js";
import { getRpcHealthSummary, getCircuitBreakerStats, resetCircuitBreaker, invalidateCache, safeCallRpc, safeCallRpcWithList } from "./lib/rpc-resilience.js";
// Phase 18: Integration registry for metrics
import { getIntegrationHealthSummary } from "./config/integration-registry.js";
// Phase 25: Analytics aggregation engine
import { startAggregationJob, stopAggregationJob } from "./services/analytics-aggregator.js";
import { initEtl } from "./services/analytics-etl.js";
import { initAnalyticsStore } from "./services/analytics-store.js";
// Phase 37C: Product modularity — module registry, capability service, adapter loader, module guard
import { initModuleRegistry, setDbEntitlementProvider } from "./modules/module-registry.js";
import { initCapabilityService } from "./modules/capability-service.js";
import { initAdapters } from "./adapters/adapter-loader.js";
import { moduleGuardHook } from "./middleware/module-guard.js";
import moduleCapabilityRoutes from "./routes/module-capability-routes.js";
import moduleEntitlementRoutes from "./routes/module-entitlement-routes.js";
// Phase 51: Marketplace tenant config loader
import { initMarketplaceTenantConfig } from "./config/marketplace-tenant.js";
// Phase 38: RCM + Payer Connectivity
import rcmRoutes from "./rcm/rcm-routes.js";
// Phase 39: VistA Billing Grounding -- read-only VistA RCM surfaces
import vistaRcmRoutes from "./routes/vista-rcm.js";
// Phase 82: RCM Ops routes -- connector state, queue depth, denial queue
import rcmOpsRoutes from "./rcm/rcm-ops-routes.js";
// Phase 87: PayerOps routes -- enrollment, LOA, credential vault, adapters
import payerOpsRoutes from "./rcm/payerOps/payerops-routes.js";
// Phase 88: Payer registry + capability matrix routes
import registryRoutes from "./rcm/payerOps/registry-routes.js";
// Phase 90: PhilHealth eClaims 3.0 posture routes
import philhealthRoutes from "./rcm/payerOps/philhealth-routes.js";
// Phase 91: Claims Lifecycle v1 + Scrubber + Denial Workbench
import claimLifecycleRoutes from "./rcm/claims/claim-routes.js";
// Phase 92: Payment Tracking + Reconciliation + Payer Intelligence
import paymentRoutes from "./rcm/payments/payment-routes.js";
// Phase 93: PH HMO Deepening Pack -- canonical registry + adapter + routes
import phHmoRoutes from "./rcm/payers/ph-hmo-routes.js";
// Phase 94: PH HMO Workflow Automation -- LOA + Claims + Remittance workbenches
import loaRoutes from "./rcm/loa/loa-routes.js";
import claimsWorkflowRoutes from "./rcm/workflows/claims-workflow-routes.js";
import remittanceRoutes from "./rcm/workflows/remittance-routes.js";
// Phase 95: Payer Registry Persistence + Audit + Evidence
import payerAdminRoutes from "./rcm/payers/payer-admin-routes.js";
// Phase 95B: Platform Persistence Unification (SQLite + Drizzle ORM)
import adminPayerDbRoutes from "./routes/admin-payer-db-routes.js";
import { initPlatformDb } from "./platform/db/init.js";
// closeDb now called from security.ts shutdown handler
// Phase 101: Platform Data Architecture Convergence (Postgres)
import { initPlatformPg, isPgConfigured, pgHealthCheck } from "./platform/pg/index.js";
// Phase 96: PhilHealth eClaims 3.0 Adapter Skeleton
import eclaims3Routes from "./rcm/philhealth-eclaims3/eclaims3-routes.js";
// Phase 96B: QA/Audit OS v1.1
import qaRoutes from "./routes/qa-routes.js";
import { loadFlowCatalog } from "./qa/index.js";
// Phase 97: HMO Portal Adapter — LOA + Claim Packet + Manual-Assisted Portal
import hmoPortalRoutes from "./rcm/hmo-portal/hmo-portal-routes.js";
import { initHmoPortalAdapters } from "./rcm/hmo-portal/adapters/index.js";
// Phase 97B: PH HMO Deepening Pack v2 — manifest, LOA templates, claim config, contracting hub
import phase97bRoutes from "./rcm/hmo-portal/phase97b-routes.js";
// Phase 98: RCM Denials & Appeals Loop
import denialRoutes from "./rcm/denials/denial-routes.js";
// Phase 99: RCM Payments + Reconciliation
import reconciliationRoutes from "./rcm/reconciliation/recon-routes.js";
// Phase 100: Eligibility + Claim Status Polling Framework (Adapter-first)
import eligibilityClaimStatusRoutes from "./rcm/eligibility/routes.js";
// Phase 110: RCM Core v1 -- DB-backed credential vault + accreditation
import credentialVaultRoutes from "./rcm/credential-vault/credential-vault-routes.js";
// Phase 111: Claim Lifecycle + Scrubber + Denial Loop
import claimLifecycle111Routes from "./rcm/claim-lifecycle/claim-lifecycle-routes.js";
// Phase 112: Evidence Pipeline + No-Fake-Integrations Gate
import evidenceRoutes from "./rcm/evidence/evidence-routes.js";
// Phase 41: RPC Registry + Action Registry (Vivian snapshot integration)
import { RPC_REGISTRY, RPC_EXCEPTIONS, getFullRpcInventory } from "./vista/rpcRegistry.js";
// Phase 48: Unified audit + connector resilience stats
import { queryUnifiedAudit, getUnifiedAuditStats } from "./lib/unified-audit.js";
import { getConnectorCbStats, resetConnectorCb, resetAllConnectorCbs } from "./rcm/connectors/connector-resilience.js";
// Phase 50: Data Portability + Migration Toolkit
import migrationRoutes from "./migration/migration-routes.js";
// Phase 56: CPRS Wave 1 READ routes (cover sheet + tabs)
import cprsWave1Routes from "./routes/cprs/wave1-routes.js";
// Phase 57: CPRS Wave 2 WRITE routes (safety + capability detection)
import cprsWave2Routes from "./routes/cprs/wave2-routes.js";
// Phase 59: CPOE parity (orders + order checks + signing)
import ordersCpoeRoutes from "./routes/cprs/orders-cpoe.js";
// Phase 60: TIU notes parity (list + text + sign + addendum + titles)
import tiuNotesRoutes from "./routes/cprs/tiu-notes.js";
// Phase 63: Scheduling v1 (VistA-first SD*)
import schedulingRoutes from "./routes/scheduling/index.js";
// Phase 64: Secure messaging v1 (MailMan-backed)
import messagingRoutes from "./routes/messaging/index.js";
// Phase 65: Immunizations v1 (VistA-first)
import immunizationsRoutes from "./routes/immunizations/index.js";
// Phase 66: Production IAM v1 (OIDC + SAML posture)
import idpRoutes from "./auth/idp/idp-routes.js";
import { initIdentityProviders } from "./auth/idp/index.js";
// Phase 67: ADT + Inpatient Lists v1 (VistA-first read posture)
import adtRoutes from "./routes/adt/index.js";
// Phase 83: Inpatient Operations (census + bedboard + ADT workflow + movements)
import inpatientRoutes from "./routes/inpatient/index.js";
// Phase 68: Nursing Workflow v1 (VistA-first posture)
import nursingRoutes from "./routes/nursing/index.js";
// Phase 72: Reality Verifier Pack -- no-fake-success tripwire
import { registerNoFakeSuccessHook, getFakeSuccessViolations, getFakeSuccessViolationCount, getNoFakeSuccessAuditReport } from "./middleware/no-fake-success.js";
// Phase 79: UI Preferences (coversheet layout persistence)
import uiPrefsRoutes from "./routes/ui-prefs.js";
// Phase 85: eMAR + BCMA Posture (medication administration records)
import emarRoutes from "./routes/emar/index.js";
// Phase 86: Shift Handoff + Signout (SBAR workflow)
import handoffRoutes from "./routes/handoff/index.js";
// Phase 107: Production Posture Pack
import postureRoutes from "./posture/index.js";

/* ================================================================== */
/* Phase 36: Initialize OTel tracing (must be before Fastify)           */
/* ================================================================== */
initTracing();
bridgeTracingToLogger(getCurrentTraceId, getCurrentSpanId);

/* ================================================================== */
/* Phase 15B helpers: safe error + session-based audit actor             */
/* ================================================================== */

/** Sanitize error for client response - never leak VistA internals. */
function safeErr(err: unknown): string {
  if (err instanceof Error) {
    const m = err.message;
    if (m.includes("credential") || m.includes("VISTA_")) return "Configuration error";
    if (m.includes("ECONNREFUSED") || m.includes("timeout")) return "VistA service unavailable";
    // Strip MUMPS routine refs, file paths
    let s = m.replace(/\^[A-Z][A-Z0-9]*/g, "").replace(/[A-Z]:\\[^\s]+/g, "").trim();
    if (s.length > 120) s = s.slice(0, 120) + "...";
    return s || "Operation failed";
  }
  return "Operation failed";
}

/** Extract audit actor from request session (set by auth gateway). */
function auditActor(request: any): { duz: string; name?: string; role?: string } {
  const s = request.session;
  if (s) return { duz: s.duz, name: s.userName, role: s.role };
  return { duz: "system" };
}

const server = Fastify();
server.register(cors, { origin: corsOriginValidator as any, credentials: true });
server.register(cookie);
server.register(websocket);

// Phase 15: Register security middleware (request IDs, headers, rate limiting, error handler)
await registerSecurityMiddleware(server);

// Phase 72: Register no-fake-success tripwire (before routes, after security)
registerNoFakeSuccessHook(server);

// Phase 37C: Initialize module registry + capability service + adapters + guard
initModuleRegistry();
initCapabilityService();
await initAdapters();
// Phase 51: Initialize marketplace tenant config (after module registry)
initMarketplaceTenantConfig();
server.addHook("onRequest", moduleGuardHook);

// Accept empty-body POSTs with any Content-Type (e.g., logout)
server.addContentTypeParser(
  'application/x-www-form-urlencoded',
  { parseAs: 'string' },
  (_req: any, body: string, done: (err: null, result?: unknown) => void) => {
    try { done(null, body ? JSON.parse(body) : {}); } catch { done(null, {}); }
  }
);

// Override default JSON parser to tolerate empty body (for logout etc.)
server.removeContentTypeParser('application/json');
server.addContentTypeParser(
  'application/json',
  { parseAs: 'string' },
  (_req: any, body: string, done: (err: null, result?: unknown) => void) => {
    if (!body || body.trim() === '') { done(null, {}); return; }
    try { done(null, JSON.parse(body)); } catch (e: any) { done(null, {}); }
  }
);

// Register auth routes (Phase 13)
server.register(authRoutes);

// Phase 66: Identity provider routes (OIDC/SAML/VistA binding)
initIdentityProviders();
server.register(idpRoutes);

// Register WebSocket console (Phase 13F)
server.register(wsConsoleRoutes);

// Register RPC capability discovery (Phase 14A)
server.register(capabilityRoutes);

// Register write-back routes (Phase 14C)
server.register(writeBackRoutes);

// Register imaging routes (Phase 14D)
server.register(imagingRoutes);

// Register imaging proxy routes (Phase 22)
server.register(imagingProxyRoutes);

// Register imaging worklist routes (Phase 23)
server.register(imagingWorklistRoutes);

// Register imaging ingest/reconciliation routes (Phase 23)
server.register(imagingIngestRoutes);

// Register imaging authorization & break-glass routes (Phase 24)
server.register(imagingAuthzRoutes);

// Register imaging device registry routes (Phase 24)
server.register(imagingDeviceRoutes);

// Register imaging audit trail routes (Phase 24)
server.register(imagingAuditRoutes);

// Register imaging viewer routes (Phase 81)
server.register(imagingViewerRoutes);

// Register admin/tenant routes (Phase 17B)
server.register(adminRoutes);

// Register interop routes (Phase 18B/D)
server.register(interopRoutes);

// Register VistA interop telemetry routes (Phase 21)
server.register(vistaInteropRoutes);

// Register reporting & export routes (Phase 19A)
server.register(reportingRoutes);

// Register analytics & BI routes (Phase 25)
server.register(analyticsRoutes);

// Register portal auth + health proxy routes (Phase 26)
server.register(portalAuthRoutes);

// Register portal core routes — messaging, appointments, sharing, settings, export (Phase 27)
initPortalCore(getPortalSession);
server.register(portalCoreRoutes);

// Register record portability routes — export, download, share, audit (Phase 80)
initRecordPortability(getPortalSession);
server.register(recordPortabilityRoutes);
startPortabilityCleanup();

// Register intake OS routes — adaptive questionnaire, packs, clinician review, kiosk (Phase 28)
initIntakeRoutes(
  (req: any) => {
    const ps = getPortalSession(req);
    return ps ? { patientDfn: ps.patientDfn, patientName: ps.patientName } : null;
  },
  (req: any) => {
    try {
      const session = requireSession(req, { code: () => ({ send: () => {} }) });
      return session ? { duz: session.duz, name: session.userName } : null;
    } catch { return null; }
  }
);
server.register(intakeRoutes);

// Register portal IAM routes -- identity, proxy invitations, access logs (Phase 29)
await seedDevUsers();
server.register(portalIamRoutes);

// Register telehealth routes -- video visit lifecycle, device check, waiting room (Phase 30)
initTelehealthRoutes(
  getPortalSession,
  (req: any, reply: any) => requireSession(req, reply)
);
server.register(telehealthRoutes);
startRoomCleanup();

// Register AI Gateway routes -- governed AI assist (Phase 33)
initAiRoutes(
  (req: any, reply: any) => requireSession(req, reply),
  getPortalSession
);
server.register(aiGatewayRoutes);

// Register IAM routes -- audit, policy, biometric, OIDC (Phase 35)
server.register(iamRoutes);

// Register module & capability routes -- SKU, adapters, toggles (Phase 37C)
server.register(moduleCapabilityRoutes);

// Register module entitlement routes -- DB-backed entitlements, feature flags, audit (Phase 109)
server.register(moduleEntitlementRoutes);

// Register RCM routes -- claim lifecycle, payer registry, EDI pipeline (Phase 38)
server.register(rcmRoutes);

// Register VistA RCM routes -- read-only billing grounding (Phase 39)
server.register(vistaRcmRoutes);

// Register RCM Ops routes -- connector state, queue depth, scheduler, dashboard (Phase 82)
server.register(rcmOpsRoutes);

// Register PayerOps routes -- enrollment, LOA, credential vault (Phase 87)
server.register(payerOpsRoutes);

// Register Registry + Capability Matrix routes (Phase 88)
server.register(registryRoutes);

// Register PhilHealth eClaims 3.0 posture routes (Phase 90)
server.register(philhealthRoutes);

// Register Claims Lifecycle v1 + Scrubber + Denial Workbench (Phase 91)
server.register(claimLifecycleRoutes);

// Register Payment Tracking + Reconciliation + Payer Intelligence (Phase 92)
server.register(paymentRoutes);

// Register PH HMO Deepening routes -- canonical registry + adapter (Phase 93)
server.register(phHmoRoutes);

// Register Phase 94 PH HMO Workflow Automation -- LOA + Claims + Remittance
server.register(loaRoutes);
server.register(claimsWorkflowRoutes);
server.register(remittanceRoutes);

// Register Phase 95 Payer Registry Admin -- persistence + audit + evidence
server.register(payerAdminRoutes);

// Register Phase 95B Platform Persistence (SQLite-backed payer DB routes)
server.register(adminPayerDbRoutes);

// Register Phase 96 PhilHealth eClaims 3.0 adapter skeleton
server.register(eclaims3Routes);

// Register Phase 96B QA/Audit OS routes (guarded by QA_ROUTES_ENABLED)
server.register(qaRoutes);

// Register Phase 97 HMO Portal Adapter — LOA + Claim Packet + Manual-Assisted
initHmoPortalAdapters();
server.register(hmoPortalRoutes);

// Register Phase 97B — manifest, LOA templates, claim config, contracting hub, market dashboard
server.register(phase97bRoutes);

// Register Phase 98 — Denials & Appeals Loop (VistA-first operational overlay)
server.register(denialRoutes);

// Register Phase 99 — RCM Payments + Reconciliation
server.register(reconciliationRoutes);

// Register Phase 100 — Eligibility + Claim Status Polling Framework
server.register(eligibilityClaimStatusRoutes);

// Register Phase 110 — DB-backed Credential Vault + Accreditation Dashboard
server.register(credentialVaultRoutes);

// Register Phase 111 — Claim Lifecycle + Scrubber + Denial Loop
server.register(claimLifecycle111Routes);

// Register Phase 112 — Evidence Pipeline + No-Fake-Integrations Gate
server.register(evidenceRoutes);

// Register Migration Toolkit routes -- data portability import/export (Phase 50)
server.register(migrationRoutes);

// Register CPRS Wave 1 READ routes -- orders summary, appointments, reminders, etc. (Phase 56)
server.register(cprsWave1Routes);

// Register CPRS Wave 2 WRITE routes -- problems/notes/orders/meds/labs/vitals/allergies (Phase 57)
server.register(cprsWave2Routes);

// Register CPOE parity routes -- orders list, lab/imaging/consult/sign/checks (Phase 59)
server.register(ordersCpoeRoutes);

// Register TIU notes parity routes -- list, text, sign, addendum, titles (Phase 60)
server.register(tiuNotesRoutes);

// Register scheduling routes -- VistA SD* encounter + wait list RPCs (Phase 63)
server.register(schedulingRoutes);

// Register secure messaging routes -- VistA MailMan bridge (Phase 64)
server.register(messagingRoutes);

// Register immunization routes -- VistA-first ORQQPX IMMUN LIST (Phase 65)
server.register(immunizationsRoutes);

// Register ADT / inpatient routes -- VistA-first ward/team/provider/specialty lists (Phase 67)
server.register(adtRoutes);

// Register inpatient operations routes -- census/bedboard/ADT/movements (Phase 83)
server.register(inpatientRoutes);

// Register nursing workflow routes -- VistA-first vitals/notes/tasks/MAR (Phase 68)
server.register(nursingRoutes);

// Register eMAR + BCMA posture routes -- medication admin records (Phase 85)
server.register(emarRoutes);

// Register shift handoff + signout routes -- SBAR workflow (Phase 86)
server.register(handoffRoutes);

// Register UI preferences routes -- coversheet layout persistence (Phase 79)
server.register(uiPrefsRoutes);

// Register production posture routes -- observability/tenant/perf/backup gates (Phase 107)
server.register(postureRoutes);

// Register auto-generated domain RPC stub routes (problems, meds, notes, orders, labs, reports)
registerDomainRoutes(server);

// Phase 15D: Enhanced health check (Phase 36: SLO-ready fields)
server.get("/health", async () => {
  const cbStats = getCircuitBreakerStats();
  // Phase 101: Include Postgres health if configured
  let platformPg: { configured: boolean; ok?: boolean; latencyMs?: number } = { configured: false };
  if (isPgConfigured()) {
    try {
      const pgHealth = await pgHealthCheck();
      platformPg = { configured: true, ok: pgHealth.ok, latencyMs: pgHealth.latencyMs };
    } catch {
      platformPg = { configured: true, ok: false };
    }
  }
  return {
    ok: true,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    version: "phase-101",
    circuitBreaker: cbStats.state,
    tracingEnabled: isTracingEnabled(),
    platformPg,
  };
});

// Phase 15D: Readiness probe (Phase 36: includes circuit breaker state)
server.get("/ready", async () => {
  const cbStats = getCircuitBreakerStats();
  // Update Prometheus CB gauge
  const cbVal = cbStats.state === "closed" ? 0 : cbStats.state === "open" ? 1 : 2;
  cbStateGauge.set(cbVal);
  try {
    await probeConnect();
    return {
      ok: cbStats.state !== "open",
      vista: "reachable",
      circuitBreaker: cbStats.state,
      uptime: process.uptime(),
    };
  } catch {
    return {
      ok: false,
      vista: "unreachable",
      circuitBreaker: cbStats.state,
      uptime: process.uptime(),
    };
  }
});

// Phase 16: Version/build metadata endpoint
server.get("/version", async () => ({
  ok: true,
  version: "phase-16",
  commitSha: process.env.BUILD_SHA || "dev",
  buildTime: process.env.BUILD_TIME || "unknown",
  nodeVersion: process.version,
  uptime: process.uptime(),
}));

// Phase 16: Enhanced metrics endpoint (RPC health, circuit breaker, cache, process)
server.get("/metrics", async () => {
  const mem = process.memoryUsage();
  return {
    ok: true,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    process: {
      heapUsedMB: Math.round(mem.heapUsed / 1024 / 1024 * 100) / 100,
      heapTotalMB: Math.round(mem.heapTotal / 1024 / 1024 * 100) / 100,
      rssMB: Math.round(mem.rss / 1024 / 1024 * 100) / 100,
      pid: process.pid,
    },
    rpcHealth: getRpcHealthSummary(),
    integrations: getIntegrationHealthSummary("default"),
  };
});

// Phase 36: Prometheus exposition format endpoint
server.get("/metrics/prometheus", async (_request, reply) => {
  const metrics = await getPrometheusMetrics();
  reply.header("Content-Type", getMetricsContentType());
  return reply.send(metrics);
});

// Phase 15C: Audit event query endpoint
server.get("/audit/events", async (request) => {
  const { actionPrefix, actorDuz, patientDfn, since, limit } = request.query as any;
  const events = queryAuditEvents({
    actionPrefix,
    actorDuz,
    patientDfn,
    since,
    limit: limit ? Number(limit) : undefined,
  });
  return { ok: true, count: events.length, events };
});

// Phase 15C: Audit stats endpoint
server.get("/audit/stats", async () => {
  return { ok: true, ...getAuditStats() };
});

// Phase 48: Unified audit query (all 3 stores in one response)
server.get("/audit/unified", async (request) => {
  const { sources, actionPrefix, actor, since, limit } = request.query as any;
  const entries = queryUnifiedAudit({
    sources: sources ? String(sources).split(",") as any : undefined,
    actionPrefix,
    actor,
    since,
    limit: limit ? Number(limit) : undefined,
  });
  return { ok: true, count: entries.length, entries };
});

// Phase 48: Unified audit stats
server.get("/audit/unified/stats", async () => {
  return { ok: true, ...getUnifiedAuditStats() };
});

// Phase 48: Connector circuit breaker stats
server.get("/admin/connector-cbs", async () => {
  return { ok: true, connectors: getConnectorCbStats() };
});

// Phase 48: Reset a specific connector circuit breaker
server.post("/admin/connector-cb/reset", async (request) => {
  const { connectorId } = (request.body as any) || {};
  if (connectorId) {
    resetConnectorCb(connectorId);
    return { ok: true, reset: connectorId };
  }
  resetAllConnectorCbs();
  return { ok: true, reset: "all" };
});

// Phase 15B: Circuit breaker admin endpoints
server.post("/admin/circuit-breaker/reset", async () => {
  resetCircuitBreaker();
  return { ok: true, state: getCircuitBreakerStats() };
});

// Phase 15B: Cache invalidation endpoint
server.post("/admin/cache/invalidate", async (request) => {
  const { pattern } = request.body as any || {};
  const count = invalidateCache(pattern);
  return { ok: true, invalidated: count };
});

// Phase 72: No-fake-success violations endpoint (admin)
server.get("/admin/fake-success-violations", async () => {
  return { ok: true, count: getFakeSuccessViolationCount(), violations: getFakeSuccessViolations() };
});

// Phase 74: Structured no-fake-success audit (for automated verification)
server.get("/admin/fake-success-audit", async () => {
  return { ok: true, report: getNoFakeSuccessAuditReport() };
});

// Phase 3 connectivity endpoint remains available (retain behavior)
server.get("/vista/ping", async () => {
  try {
    await probeConnect();
    return { ok: true, vista: "reachable", port: Number(process.env.VISTA_PORT || 9430) };
  } catch (err: any) {
    return { ok: false, vista: "unreachable", error: err.message, port: Number(process.env.VISTA_PORT || 9430) };
  }
});

// Phase 37B: RPC Catalog — list all registered RPCs from File 8994
// Uses VE LIST RPCS custom RPC (installed via scripts/install-rpc-catalog.ps1)
// Falls back to empty if RPC not available (sandbox may not have it installed)
let rpcCatalogCache: { data: any; ts: number } | null = null;
const RPC_CATALOG_TTL = 60_000; // 60 seconds cache

server.get("/vista/rpc-catalog", async (request, reply) => {
  const session = requireSession(request, reply);
  if (!session) return;

  // Return cached if fresh
  if (rpcCatalogCache && Date.now() - rpcCatalogCache.ts < RPC_CATALOG_TTL) {
    return rpcCatalogCache.data;
  }

  try { validateCredentials(); } catch (err: any) {
    return { ok: false, error: err.message };
  }

  try {
    await connect();
    const lines = await callRpc("VE LIST RPCS", [""]);
    disconnect();

    // Parse: IEN|NAME|TAG|ROUTINE
    const catalog = (Array.isArray(lines) ? lines : [lines])
      .filter((l: string) => l && l.includes("|"))
      .map((line: string) => {
        const [ien, name, tag, routine] = line.split("|");
        return { ien: ien?.trim(), name: name?.trim(), tag: tag?.trim(), routine: routine?.trim(), present: true };
      })
      .filter(r => r.name);

    const result = { ok: true, rpc: "VE LIST RPCS", count: catalog.length, catalog };
    rpcCatalogCache = { data: result, ts: Date.now() };
    audit("config.rpc-catalog", "success", auditActor(request), { detail: { count: catalog.length } });
    return result;
  } catch (err: any) {
    disconnect();
    // RPC not installed — return empty catalog with hint
    if (err.message?.includes("not found") || err.message?.includes("not registered") || err.message?.includes("Application")) {
      return {
        ok: true,
        rpc: "VE LIST RPCS",
        count: 0,
        catalog: [],
        hint: "VE LIST RPCS not installed. Run scripts/install-rpc-catalog.ps1",
      };
    }
    return { ok: false, rpc: "VE LIST RPCS", error: safeErr(err) };
  }
});

// Phase 41: RPC Debug endpoints (admin/dev) — action registry + rpc registry
server.get("/vista/rpc-debug/actions", async (request, reply) => {
  const session = requireSession(request, reply);
  if (!session) return;
  // Inline action registry data (avoids cross-app import)
  const { ACTION_REGISTRY_DATA } = await import("./vista/rpcDebugData.js");
  return { ok: true, actions: ACTION_REGISTRY_DATA, count: ACTION_REGISTRY_DATA.length };
});

server.get("/vista/rpc-debug/registry", async (request, reply) => {
  const session = requireSession(request, reply);
  if (!session) return;
  const { registry, exceptions } = getFullRpcInventory();
  return { ok: true, registry, exceptions, count: registry.length };
});

server.get("/vista/rpc-debug/coverage", async (request, reply) => {
  const session = requireSession(request, reply);
  if (!session) return;
  try {
    const { readFileSync, existsSync } = await import("node:fs");
    const { resolve } = await import("node:path");
    const root = resolve(process.cwd(), "../..");
    const presentFile = resolve(root, "data/vista/vista_instance/rpc_present.json");
    const missingFile = resolve(root, "data/vista/vista_instance/rpc_missing_vs_vivian.json");
    const extraFile = resolve(root, "data/vista/vista_instance/rpc_extra_vs_vivian.json");
    const result: any = { ok: true };
    if (existsSync(presentFile)) result.present = JSON.parse(readFileSync(presentFile, "utf-8"));
    if (existsSync(missingFile)) result.missing = JSON.parse(readFileSync(missingFile, "utf-8"));
    if (existsSync(extraFile)) result.extra = JSON.parse(readFileSync(extraFile, "utf-8"));
    if (!result.present) result.hint = "Run buildRpcCoverageMatrix.ts to generate coverage data";
    return result;
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
});

// Phase 4B: Patient search via ORWPT LIST ALL RPC
server.get("/vista/patient-search", async (request) => {
  const q = (request.query as any)?.q;
  if (!q || typeof q !== "string" || q.trim().length < 2) {
    return { ok: false, error: "Query too short", hint: "Use ?q=SMI (minimum 2 characters)" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  const RPC_NAME = "ORWPT LIST ALL";

  try {
    await connect();

    // ORWPT LIST ALL params: (FROM, DIR)
    //   FROM = starting search string (case-insensitive)
    //   DIR  = "1" for forward alphabetical
    const lines = await callRpc(RPC_NAME, [q.trim().toUpperCase(), "1"]);

    // Response lines: "DFN^NAME^^^^NAME" — parse DFN and first NAME field
    const results = lines
      .map((line) => {
        const parts = line.split("^");
        const dfn = parts[0]?.trim();
        const name = parts[1]?.trim();
        if (dfn && name) {
          return { dfn, name };
        }
        return null;
      })
      .filter((r) => r !== null);

    disconnect();

    // Phase 15C: Audit patient search
    audit("phi.patient-search", "success", auditActor(request), {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { query: q.trim(), resultCount: results.length },
    });

    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 5B: Patient demographics via ORWPT SELECT RPC
server.get("/vista/patient-demographics", async (request) => {
  const dfn = (request.query as any)?.dfn;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  const RPC_NAME = "ORWPT SELECT";

  try {
    await connect();
    const lines = await callRpc(RPC_NAME, [String(dfn)]);
    disconnect();

    const raw = lines[0] || "";
    const parts = raw.split("^");

    // ORWPT SELECT returns "-1" as first field when DFN is unknown
    if (parts[0] === "-1" || !parts[0]) {
      const reason = parts.slice(5).join(" ").trim() || "Patient not found";
      return { ok: false, error: reason, hint: `DFN ${dfn} not found in VistA` };
    }

    const name = parts[0] || "";
    const sex = parts[1] || "";
    const dobFM = parts[2] || "";

    // Convert FileMan date YYYMMDD → YYYY-MM-DD (YYY = year - 1700)
    let dob = dobFM;
    if (/^\d{7}$/.test(dobFM)) {
      const y = parseInt(dobFM.substring(0, 3), 10) + 1700;
      const m = dobFM.substring(3, 5);
      const d = dobFM.substring(5, 7);
      dob = `${y}-${m}-${d}`;
    }

    // Phase 15C: Audit demographics view
    audit("phi.demographics-view", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
    });

    return {
      ok: true,
      patient: { dfn: String(dfn), name, dob, sex },
      rpcUsed: RPC_NAME,
    };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 5C: Allergies via ORQQAL LIST RPC
server.get("/vista/allergies", async (request) => {
  const dfn = (request.query as any)?.dfn;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  const RPC_NAME = "ORQQAL LIST";

  try {
    await connect();
    const lines = await callRpc(RPC_NAME, [String(dfn)]);
    disconnect();

    // Each line: id^allergen^severity^reactions (reactions semicolon-separated)
    // "No Allergy Assessment" returns: "^No Allergy Assessment"
    const results = lines
      .map((line) => {
        const parts = line.split("^");
        const id = parts[0]?.trim();
        const allergen = parts[1]?.trim() || "";
        const severity = parts[2]?.trim() || "";
        const reactions = parts[3]?.trim() || "";
        if (!id) return null; // skip "No Allergy Assessment" line
        return { id, allergen, severity, reactions };
      })
      .filter((r) => r !== null);

    // Phase 15C: Audit allergies view
    audit("phi.allergies-view", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { count: results.length },
    });

    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 5D: Add allergy via ORWDAL32 ALLERGY MATCH + ORWDAL32 SAVE ALLERGY RPCs
server.post("/vista/allergies", async (request) => {
  const body = request.body as any;
  const dfn = body?.dfn;
  const allergyText = body?.allergyText;

  // Validate inputs
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: 'Body: { "dfn": "1", "allergyText": "PENICILLIN" }' };
  }
  if (!allergyText || typeof allergyText !== "string" || allergyText.trim().length < 2) {
    return { ok: false, error: "allergyText must be at least 2 characters", hint: 'Body: { "dfn": "1", "allergyText": "PENICILLIN" }' };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    await connect();

    // Step 1: Search for matching allergen via ORWDAL32 ALLERGY MATCH
    const matchLines = await callRpc("ORWDAL32 ALLERGY MATCH", [allergyText.trim().toUpperCase()]);

    // Find the first non-TOP entry from the VA Allergies file (GMRD(120.82,"B"))
    // Format: IEN^name^source_global^allergyType^sourceNum
    let matchEntry: { ien: string; name: string; source: string; allergyType: string } | null = null;
    for (const line of matchLines) {
      const parts = line.split("^");
      const ien = parts[0]?.trim();
      const name = parts[1]?.trim();
      const source = parts[2]?.trim() || "";
      const allergyType = parts[3]?.trim() || "";
      // Skip TOP/header lines (source is empty for headers)
      if (!source || !ien) continue;
      // Prefer VA Allergies file (GMRD(120.82)), but accept any match
      if (source.includes("GMRD(120.82")) {
        matchEntry = { ien, name, source, allergyType };
        break;
      }
      // Fall back to first non-header match
      if (!matchEntry) {
        matchEntry = { ien, name, source, allergyType };
      }
    }

    if (!matchEntry) {
      disconnect();
      return {
        ok: false,
        error: `No matching allergen found for "${allergyText.trim()}"`,
        hint: "Try a different allergen name (e.g., PENICILLIN, PEANUT, ASPIRIN)",
      };
    }

    // Step 2: Build OREDITED list for ORWDAL32 SAVE ALLERGY
    // Required fields based on EDITSAVE^ORWDAL32 -> UPDATE^GMRAGUI1
    const duz = getDuz();
    // Strip the B-index qualifier (e.g. "B") → "D") from source, keep trailing comma
    const sourceGlobal = matchEntry.source.replace(/"B"\)$|"D"\)$|"T"\)$|"P"\)$|"C"\)$/, "");
    // GMRAGNT format: NAME^IEN;file_root  (semicolon between IEN and global ref)
    // UPDATE splits on "^": piece1=NAME (.02 field), piece2=IEN;root (cross-ref source)
    const gmragnt = matchEntry.name + "^" + matchEntry.ien + ";" + sourceGlobal;
    const allergyType = matchEntry.allergyType || "D";

    // Build FileMan date/time for GMRAORDT: YYYMMDD.HHMMSS (YYY = year - 1700)
    const now = new Date();
    const fmYear = now.getFullYear() - 1700;
    const fmDate = `${fmYear}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}.${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}${String(now.getSeconds()).padStart(2, "0")}`;

    const oredited: Record<string, string> = {
      "GMRAGNT": gmragnt,
      "GMRATYPE": allergyType,
      "GMRANATR": "U^Unknown",
      "GMRAORIG": duz,
      "GMRAORDT": fmDate,
      "GMRAOBHX": "h^HISTORICAL",
    };

    // ORALIEN=0 for new allergy, ORDFN=dfn, OREDITED=list
    const saveLines = await callRpcWithList("ORWDAL32 SAVE ALLERGY", [
      { type: "literal", value: "0" },
      { type: "literal", value: String(dfn) },
      { type: "list", value: oredited },
    ]);

    disconnect();

    const result = saveLines.join("\n").trim();
    // SAVE ALLERGY returns "0" on success, or "-1^error message" on failure
    if (result.startsWith("-1")) {
      const errMsg = result.split("^").slice(1).join("^") || "Save failed";
      return { ok: false, error: errMsg, hint: "The allergy could not be saved" };
    }

    // Phase 15C: Audit allergy add
    audit("clinical.allergy-add", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { allergen: matchEntry.name },
    });

    return {
      ok: true,
      message: "Allergy created",
      allergen: matchEntry.name,
      result,
      rpcUsed: "ORWDAL32 SAVE ALLERGY",
    };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 6A: Vitals via ORQQVI VITALS RPC
server.get("/vista/vitals", async (request) => {
  const dfn = (request.query as any)?.dfn;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  // ORQQVI VITALS params: (DFN, ORSDT, OREDT)
  //   DFN   = patient IEN
  //   ORSDT = start date in FileMan format (use 0 for earliest)
  //   OREDT = end date in FileMan format (use a far-future date)
  const RPC_NAME = "ORQQVI VITALS";

  try {
    await connect();

    // Wide date range: 2000-01-01 (3000101) to 2099-12-31 (3991231)
    const lines = await callRpc(RPC_NAME, [String(dfn), "3000101", "3991231"]);
    disconnect();

    // Response format: ien^type^value^datetime
    // (Note: MUMPS comment says ien^type^datetime^rate but actual wire is reversed)
    // Informational line: "^No vitals found." — id is empty
    const results = lines
      .map((line) => {
        const parts = line.split("^");
        const id = parts[0]?.trim();
        const type = parts[1]?.trim() || "";
        const value = parts[2]?.trim() || "";
        const takenAtFM = parts[3]?.trim() || "";
        if (!id) return null; // skip informational lines like "^No vitals found."

        // Convert FileMan date YYYMMDD.HHMMSS → human-readable YYYY-MM-DD HH:MM
        let takenAt = takenAtFM;
        if (takenAtFM && takenAtFM.length >= 7) {
          const datePart = takenAtFM.split(".")[0] || "";
          const timePart = takenAtFM.split(".")[1] || "";
          if (/^\d{7}$/.test(datePart)) {
            const y = parseInt(datePart.substring(0, 3), 10) + 1700;
            const m = datePart.substring(3, 5);
            const d = datePart.substring(5, 7);
            let timeStr = "";
            if (timePart && timePart.length >= 4) {
              timeStr = " " + timePart.substring(0, 2) + ":" + timePart.substring(2, 4);
            }
            takenAt = `${y}-${m}-${d}${timeStr}`;
          }
        }

        return { type, value, takenAt };
      })
      .filter((r) => r !== null);

    // Phase 15C: Audit vitals view
    audit("phi.vitals-view", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { count: results.length },
    });

    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 6B: Add a vital via GMV ADD VM RPC
// Vital type abbreviation → IEN in file 120.51 (WorldVistA defaults)
const VITAL_TYPE_IEN: Record<string, number> = {
  BP: 1, T: 2, R: 3, P: 5, HT: 8, WT: 9, PO2: 21, PN: 22,
};
const VALID_VITAL_TYPES = Object.keys(VITAL_TYPE_IEN);

server.post("/vista/vitals", async (request) => {
  const body = request.body as any;
  const dfn = body?.dfn;
  const type = (body?.type || "").toUpperCase().trim();
  const value = (body?.value || "").trim();

  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: 'Body: { "dfn": "1", "type": "BP", "value": "120/80" }' };
  }
  if (!type || !VITAL_TYPE_IEN[type]) {
    return { ok: false, error: `Invalid vital type. Must be one of: ${VALID_VITAL_TYPES.join(", ")}`, hint: 'Body: { "dfn": "1", "type": "BP", "value": "120/80" }' };
  }
  if (!value || value.length < 1) {
    return { ok: false, error: "Missing value", hint: 'Body: { "dfn": "1", "type": "BP", "value": "120/80" }' };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    await connect();
    const duz = getDuz();

    // Build FileMan date for "now": YYYMMDD.HHMM (YYY = year - 1700)
    const now = new Date();
    const fmYear = now.getFullYear() - 1700;
    const fmMonth = String(now.getMonth() + 1).padStart(2, "0");
    const fmDay = String(now.getDate()).padStart(2, "0");
    const fmHour = String(now.getHours()).padStart(2, "0");
    const fmMin = String(now.getMinutes()).padStart(2, "0");
    const fmDate = `${fmYear}${fmMonth}${fmDay}.${fmHour}${fmMin}`;

    const vitalTypeIen = VITAL_TYPE_IEN[type];

    // GMV ADD VM format: datetime^DFN^vitalTypeIEN;reading;^hospitalLocation^DUZ
    // Hospital location 2 = DR OFFICE (default in WorldVistA)
    const hospitalLocation = 2;
    const gmvData = `${fmDate}^${dfn}^${vitalTypeIen};${value};^${hospitalLocation}^${duz}`;

    // GMV ADD VM takes a single literal string param
    const lines = await callRpc("GMV ADD VM", [gmvData]);
    disconnect();

    // Check for errors: GMVDCSAV sets RESULT(n) = "ERROR: ..." on failure
    const allText = lines.join("\n");
    if (allText.includes("ERROR")) {
      return {
        ok: false,
        error: allText.trim() || "VistA returned an error",
        hint: "The vital could not be saved",
      };
    }

    // Phase 15C: Audit vital add
    audit("clinical.vitals-add", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { type, value },
    });

    return {
      ok: true,
      message: "Vital recorded",
      type,
      value,
      rpcUsed: "GMV ADD VM",
    };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 7A: Notes list via TIU DOCUMENTS BY CONTEXT
server.get("/vista/notes", async (request) => {
  const { dfn } = request.query as any;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn query parameter", hint: "Example: /vista/notes?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  const RPC_NAME = "TIU DOCUMENTS BY CONTEXT";
  try {
    await connect();

    // Fetch signed (CONTEXT=1) and unsigned (CONTEXT=2) notes, merge results.
    // CONTEXT=1: all signed, CONTEXT=2: unsigned by current author.
    // Params: CLASS, CONTEXT, DFN, EARLY, LATE, PERSON, OCCLIM, SEQUENCE
    const signedLines = await callRpc(RPC_NAME, [
      "3",          // CLASS - progress notes (document definition 8925.1)
      "1",          // CONTEXT - all signed
      String(dfn),  // DFN - patient
      "",           // EARLY - no start filter
      "",           // LATE - no end filter
      "0",          // PERSON - all authors
      "0",          // OCCLIM - no limit
      "D",          // SEQUENCE - descending (newest first)
    ]);
    const unsignedLines = await callRpc(RPC_NAME, [
      "3",          // CLASS - progress notes
      "2",          // CONTEXT - unsigned
      String(dfn),  // DFN - patient
      "",           // EARLY
      "",           // LATE
      "0",          // PERSON - all authors
      "0",          // OCCLIM
      "D",          // SEQUENCE
    ]);
    disconnect();

    // Merge lines, dedup by IEN (unsigned first so newest show at top)
    const seenIens = new Set<string>();
    const allLines: string[] = [];
    for (const line of [...unsignedLines, ...signedLines]) {
      const ien = line.split("^")[0]?.trim();
      if (ien && /^\d+$/.test(ien) && !seenIens.has(ien)) {
        seenIens.add(ien);
        allLines.push(line);
      }
    }

    // Check for -1^error pattern (from either call)
    const errorLine = [...signedLines, ...unsignedLines].find(l => l.startsWith("-1"));
    if (errorLine && allLines.length === 0) {
      const errMsg = errorLine.split("^").slice(1).join("^") || "Unknown VistA error";
      return { ok: false, error: errMsg, rpcUsed: RPC_NAME };
    }

    // Wire format per line:
    // IEN^title^editDate(FM)^patient^authorDUZ;sigName;authorName^location^status^visitDate^...
    const results = allLines
      .map((line) => {
        const parts = line.split("^");
        if (parts.length < 7) return null;

        const id = parts[0].trim();
        if (!id || !/^\d+$/.test(id)) return null;

        const title = (parts[1] || "").replace(/^\+\s*/, "").trim();
        const fmDate = parts[2] || "";
        const authorField = parts[4] || "";
        const location = parts[5] || "";
        const status = parts[6] || "";

        // Convert FileMan date YYYMMDD.HHMM → YYYY-MM-DD HH:MM
        let date = fmDate;
        if (fmDate && fmDate.length >= 7) {
          const [datePart, timePart] = fmDate.split(".");
          const y = parseInt(datePart.substring(0, 3), 10) + 1700;
          const m = datePart.substring(3, 5);
          const d = datePart.substring(5, 7);
          date = `${y}-${m}-${d}`;
          if (timePart && timePart.length >= 4) {
            date += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
          }
        }

        // Author: "DUZ;sigName;displayName" → use displayName
        const authorParts = authorField.split(";");
        const author = authorParts.length >= 3 ? authorParts[2] : authorParts[1] || authorField;

        return { id, title, date, author, location, status };
      })
      .filter(Boolean);

    // Phase 15C: Audit notes view (never log note text content — HIPAA)
    audit("phi.notes-view", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { count: results.length },
    });

    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 7B: Create note via TIU CREATE RECORD + TIU SET DOCUMENT TEXT
server.post("/vista/notes", async (request) => {
  const body = request.body as any;
  const dfn = body?.dfn;
  const title = (body?.title || "").trim();
  const text = (body?.text || "").trim();

  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: 'Body: { "dfn": "1", "title": "TEST NOTE", "text": "hello world" }' };
  }
  if (!title || title.length < 1) {
    return { ok: false, error: "Missing title", hint: 'Body: { "dfn": "1", "title": "TEST NOTE", "text": "hello world" }' };
  }
  if (!text || text.length < 1) {
    return { ok: false, error: "Missing text", hint: 'Body: { "dfn": "1", "title": "TEST NOTE", "text": "hello world" }' };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    await connect();
    const duz = getDuz();

    // Build FileMan date for "now": YYYMMDD.HHMM (YYY = year - 1700)
    const now = new Date();
    const fmYear = now.getFullYear() - 1700;
    const fmMonth = String(now.getMonth() + 1).padStart(2, "0");
    const fmDay = String(now.getDate()).padStart(2, "0");
    const fmHour = String(now.getHours()).padStart(2, "0");
    const fmMin = String(now.getMinutes()).padStart(2, "0");
    const fmDate = `${fmYear}${fmMonth}${fmDay}.${fmHour}${fmMin}`;

    // STEP 1: TIU CREATE RECORD
    //   MAKE(SUCCESS,DFN,TITLE,VDT,VLOC,VSIT,TIUX,VSTR,SUPPRESS,NOASF)
    //   Title IEN 10 = GENERAL NOTE (DOC type in 8925.1)
    //   VLOC 2 = DR OFFICE (hospital location)
    //   TIUX: 1202=Author(DUZ), 1301=RefDate
    const TITLE_IEN = "10";   // GENERAL NOTE
    const VLOC = "2";         // DR OFFICE
    const tiux: Record<string, string> = {
      "1202": String(duz),   // Author/dictator
      "1301": fmDate,        // Reference date
    };

    const createLines = await callRpcWithList("TIU CREATE RECORD", [
      { type: "literal", value: String(dfn) },    // DFN
      { type: "literal", value: TITLE_IEN },       // TITLE
      { type: "literal", value: fmDate },          // VDT
      { type: "literal", value: VLOC },            // VLOC
      { type: "literal", value: "" },              // VSIT
      { type: "list", value: tiux },               // TIUX (field data, no text)
      { type: "literal", value: "" },              // VSTR
      { type: "literal", value: "1" },             // SUPPRESS (suppress alerts)
      { type: "literal", value: "0" },             // NOASF
    ]);

    const createResult = createLines[0] || "";
    if (createResult.startsWith("0^") || createResult.startsWith("-1")) {
      const errMsg = createResult.split("^").slice(1).join("^") || "Failed to create note record";
      disconnect();
      return { ok: false, error: errMsg, hint: "TIU CREATE RECORD failed" };
    }

    const noteId = createResult.split("^")[0].trim();
    if (!noteId || !/^\d+$/.test(noteId)) {
      disconnect();
      return { ok: false, error: `Unexpected response: ${createResult}`, hint: "TIU CREATE RECORD returned non-numeric ID" };
    }

    // STEP 2: TIU SET DOCUMENT TEXT
    //   SETTEXT(TIUY,TIUDA,TIUX,SUPPRESS)
    //   TIUX: HDR="page^pages", TEXT,N,0 = line N
    // Build user-supplied title as first line, then text body
    const bodyLines = text.split(/\r?\n/);
    const allLines = [title, "", ...bodyLines];
    const textData: Record<string, string> = {
      "HDR": "1^1",
    };
    allLines.forEach((line, i) => {
      textData[`TEXT,${i + 1},0`] = line;
    });

    const textResult = await callRpcWithList("TIU SET DOCUMENT TEXT", [
      { type: "literal", value: noteId },       // TIUDA
      { type: "list", value: textData },         // TIUX (HDR + TEXT lines)
      { type: "literal", value: "0" },           // SUPPRESS
    ]);

    disconnect();

    const textResp = textResult[0] || "";
    // SETTEXT returns "TIUDA^page^pages" on success, "0^...^...^error" on failure
    if (textResp.startsWith("0^")) {
      return {
        ok: false,
        error: `Note ${noteId} created but text save failed: ${textResp}`,
        id: noteId,
        hint: "TIU SET DOCUMENT TEXT failed",
      };
    }

    // Phase 15C: Audit note creation (never log note text — HIPAA)
    audit("clinical.note-create", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { noteId, titleIen: TITLE_IEN },
    });

    return {
      ok: true,
      id: noteId,
      message: "Note created",
      rpcUsed: "TIU CREATE RECORD + TIU SET DOCUMENT TEXT",
    };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 8A: Medications list via ORWPS ACTIVE + ORWORR GETTXT
server.get("/vista/medications", async (request) => {
  const { dfn } = request.query as any;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn query parameter", hint: "Example: /vista/medications?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    await connect();

    // Step 1: ORWPS ACTIVE returns active meds grouped by type
    // Params: DFN (LITERAL)
    // Output: header lines starting with ~ and continuation lines for qty/sig
    const activeLines = await callRpc("ORWPS ACTIVE", [String(dfn)]);

    // Check for -1^error
    if (activeLines.length > 0 && activeLines[0].startsWith("-1")) {
      const errMsg = activeLines[0].split("^").slice(1).join("^") || "Unknown VistA error";
      disconnect();
      return { ok: false, error: errMsg, rpcUsed: "ORWPS ACTIVE" };
    }

    // Parse header lines to build medication objects
    // Header: ~TYPE^rxIEN;kind^drugName^?^?^?^?^?^orderIEN^status^?^?^qty^?^?
    // Continuation: "   Qty: N", "\ Sig: ..."
    interface MedEntry {
      orderIEN: string;
      rxId: string;
      type: string;      // OP, NV, UD, IV, CP
      drugName: string;   // often empty in WorldVistA Docker
      status: string;
      qty: string;
      sig: string;
    }

    const meds: MedEntry[] = [];
    let current: MedEntry | null = null;

    for (const line of activeLines) {
      if (line.startsWith("~")) {
        // New medication header
        const typeEnd = line.indexOf("^");
        const type = line.substring(1, typeEnd); // e.g., "OP"
        const fields = line.substring(typeEnd + 1).split("^");
        // fields[0]=rxIEN;kind, fields[1]=drugName, fields[7]=orderIEN, fields[8]=status, fields[11]=qty
        current = {
          orderIEN: fields[7]?.trim() || "",
          rxId: fields[0]?.split(";")[0] || "",
          type,
          drugName: fields[1]?.trim() || "",
          status: fields[8]?.trim() || "",
          qty: fields[11]?.trim() || "",
          sig: "",
        };
        meds.push(current);
      } else if (current) {
        // Continuation line
        const trimmed = line.trim();
        if (trimmed.startsWith("\\ Sig:") || trimmed.startsWith("\\Sig:")) {
          current.sig = trimmed.replace(/^\\\s*Sig:\s*/i, "").trim();
        } else if (trimmed.startsWith("Qty:")) {
          current.qty = trimmed.replace(/^Qty:\s*/, "").trim();
        }
      }
    }

    // Step 2: For meds with empty drug name, call ORWORR GETTXT to resolve it
    for (const med of meds) {
      if (!med.drugName && med.orderIEN && /^\d+$/.test(med.orderIEN)) {
        try {
          const txtLines = await callRpc("ORWORR GETTXT", [med.orderIEN]);
          if (txtLines.length > 0 && !txtLines[0].startsWith("-1")) {
            med.drugName = txtLines[0].trim();
            // If sig was empty, grab it from GETTXT line 1
            if (!med.sig && txtLines[1]) {
              med.sig = txtLines[1].trim();
            }
          }
        } catch {
          // Non-fatal: leave drugName empty
        }
      }
    }

    disconnect();

    const results = meds.map((m) => ({
      id: m.rxId || m.orderIEN,
      name: m.drugName || "(unknown medication)",
      sig: m.sig,
      status: m.status.toLowerCase() || "active",
    }));

    // Phase 15C: Audit medications view
    audit("phi.medications-view", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { count: results.length },
    });

    return { ok: true, count: results.length, results, rpcUsed: "ORWPS ACTIVE" };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 8B: Add medication via ORWDXM AUTOACK (quick order path)
//
// VistA CPOE (Computerized Provider Order Entry) is extremely complex:
//   Full flow: LOCK → build ORDIALOG (13+ params) → SAVE → order checks → SEND (e-sig) → UNLOCK
//   AUTOACK simplify: LOCK → AUTOACK(DFN, DUZ, Location, QuickOrder) → UNLOCK
//
// MVP approach: match drug name to pre-configured quick orders (PSOZ*) in the
// WorldVistA Docker sandbox, then use AUTOACK to place an unsigned order.
// Drugs without a matching quick order return an honest error explaining the limitation.
//
// Quick orders available in WorldVistA Docker (IEN → drug name keyword):
const QUICK_ORDERS: { ien: number; name: string; keywords: string[] }[] = [
  { ien: 1638, name: "ASPIRIN CHEW",        keywords: ["ASPIRIN CHEW", "ASPIRIN CHEWABLE", "ASA CHEW"] },
  { ien: 1639, name: "ASPIRIN TAB EC",      keywords: ["ASPIRIN TAB", "ASPIRIN EC", "ASA TAB", "ASPIRIN"] },
  { ien: 1640, name: "ATENOLOL TAB",        keywords: ["ATENOLOL"] },
  { ien: 1641, name: "ATORVASTATIN TAB",    keywords: ["ATORVASTATIN", "LIPITOR"] },
  { ien: 1642, name: "BENAZEPRIL TAB",      keywords: ["BENAZEPRIL"] },
  { ien: 1643, name: "CANDESARTAN TAB",     keywords: ["CANDESARTAN"] },
  { ien: 1644, name: "CAPTOPRIL TAB",       keywords: ["CAPTOPRIL"] },
  { ien: 1645, name: "CARVEDILOL TAB",      keywords: ["CARVEDILOL"] },
  { ien: 1646, name: "ENALAPRIL TAB",       keywords: ["ENALAPRIL"] },
  { ien: 1658, name: "FLUVASTATIN CAP",     keywords: ["FLUVASTATIN CAP"] },
  { ien: 1647, name: "FLUVASTATIN XL TAB",  keywords: ["FLUVASTATIN TAB", "FLUVASTATIN XL", "FLUVASTATIN"] },
  { ien: 1648, name: "LISINOPRIL TAB",      keywords: ["LISINOPRIL"] },
  { ien: 1649, name: "LOSARTAN TAB",        keywords: ["LOSARTAN"] },
  { ien: 1650, name: "LOVASTATIN TAB",      keywords: ["LOVASTATIN"] },
  { ien: 1651, name: "METOPROLOL TAB",      keywords: ["METOPROLOL"] },
  { ien: 1652, name: "NADOLOL TAB",         keywords: ["NADOLOL"] },
  { ien: 1653, name: "CLOPIDOGREL TAB",     keywords: ["CLOPIDOGREL", "PLAVIX"] },
  { ien: 1654, name: "PRAVASTATIN TAB",     keywords: ["PRAVASTATIN"] },
  { ien: 1655, name: "PROPRANOLOL TAB",     keywords: ["PROPRANOLOL"] },
  { ien: 1656, name: "ROSUVASTATIN TAB",    keywords: ["ROSUVASTATIN", "CRESTOR"] },
  { ien: 1657, name: "SIMVASTATIN TAB",     keywords: ["SIMVASTATIN", "ZOCOR"] },
  { ien: 1628, name: "WARFARIN",            keywords: ["WARFARIN", "COUMADIN"] },
];

/** Find the best-matching quick order for a drug name. */
function matchQuickOrder(drug: string): (typeof QUICK_ORDERS)[number] | null {
  const upper = drug.toUpperCase().trim();
  // Exact keyword match first
  for (const qo of QUICK_ORDERS) {
    for (const kw of qo.keywords) {
      if (upper === kw) return qo;
    }
  }
  // Substring match (drug contains keyword or keyword contains drug)
  for (const qo of QUICK_ORDERS) {
    for (const kw of qo.keywords) {
      if (upper.includes(kw) || kw.includes(upper)) return qo;
    }
  }
  return null;
}

server.post("/vista/medications", async (request) => {
  const body = request.body as any;
  const dfn = body?.dfn;
  const drug = body?.drug;

  // Validate inputs
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return {
      ok: false,
      error: "Missing or non-numeric dfn",
      hint: 'Body: { "dfn": "1", "drug": "ASPIRIN" }',
    };
  }
  if (!drug || typeof drug !== "string" || drug.trim().length < 2) {
    return {
      ok: false,
      error: "drug must be at least 2 characters",
      hint: 'Body: { "dfn": "1", "drug": "ASPIRIN" }',
    };
  }

  // Match drug name to a pre-configured quick order
  const qo = matchQuickOrder(drug);
  if (!qo) {
    const available = QUICK_ORDERS.map((q) => q.name).join(", ");
    return {
      ok: false,
      error: `No matching quick order for "${drug.trim()}". VistA CPOE ordering is ` +
        `complex and requires pre-configured quick orders in this sandbox.`,
      availableDrugs: available,
      hint: "Available quick-order drugs: " + available,
    };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    await connect();
    const duz = getDuz();

    // Step 1: Lock patient for ordering
    const lockLines = await callRpc("ORWDX LOCK", [String(dfn)]);
    const lockResult = lockLines[0]?.trim() || "";
    if (lockResult !== "1") {
      disconnect();
      return {
        ok: false,
        error: "Could not lock patient for ordering: " + (lockResult || "empty response"),
        hint: "Another user may be placing orders for this patient",
      };
    }

    // Step 2: AUTOACK — place quick order without verify step
    // Params: ORVP=DFN, ORNP=DUZ, ORL=Location(2=DR OFFICE), ORIT=QuickOrderIEN
    const LOCATION_IEN = "2"; // DR OFFICE in WorldVistA Docker
    let autoackLines: string[];
    try {
      autoackLines = await callRpc("ORWDXM AUTOACK", [
        String(dfn),
        duz,
        LOCATION_IEN,
        String(qo.ien),
      ]);
    } catch (autoackErr: any) {
      // Unlock patient before returning error
      try { await callRpc("ORWDX UNLOCK", [String(dfn)]); } catch { /* best-effort */ }
      disconnect();
      return {
        ok: false,
        error: "AUTOACK failed: " + autoackErr.message,
        hint: "VistA CPOE quick-order placement failed. This may require full dialog-based ordering.",
      };
    }

    // Step 3: Unlock patient
    try { await callRpc("ORWDX UNLOCK", [String(dfn)]); } catch { /* best-effort */ }

    disconnect();

    // Parse AUTOACK response — returns order record lines from GETBYIFN^ORWORR
    // Format: orderIEN;status^...  or multiple lines describing the new order
    const raw = autoackLines.join("\n").trim();
    if (!raw || raw === "0" || raw.startsWith("-1")) {
      return {
        ok: false,
        error: "Order was not created. AUTOACK returned: " + (raw || "(empty)"),
        hint: "The quick order may be misconfigured or the patient context invalid.",
      };
    }

    // Extract order IEN from response (first field before ^ or ;, strip leading ~)
    const orderIEN = (raw.split(/[\^;]/)[0]?.trim() || raw).replace(/^~/, "");

    // Phase 15C: Audit medication add
    audit("clinical.medication-add", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { quickOrder: qo.name, orderIEN },
    });

    return {
      ok: true,
      message: `Medication order created (unsigned): ${qo.name}`,
      orderIEN,
      quickOrder: qo.name,
      raw: autoackLines,
      rpcUsed: "ORWDXM AUTOACK",
    };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 4A: Real RPC call to get default patient list
server.get("/vista/default-patient-list", async (request) => {
  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  try {
    // Connect and sign on to Broker
    await connect();

    // Call ORQPT DEFAULT PATIENT LIST RPC
    // This RPC returns a list of patients in the format: DFN^PATIENT NAME
    const lines = await callRpc("ORQPT DEFAULT PATIENT LIST", []);

    // Parse response: each line is "DFN^NAME"
    const results = lines
      .map((line) => {
        const [dfn, name] = line.split("^").map((s) => s.trim());
        if (dfn && name) {
          return { dfn, name };
        }
        return null;
      })
      .filter((r) => r !== null);

    disconnect();

    // Phase 15C: Audit default patient list access
    audit("phi.patient-list", "success", auditActor(request), {
      detail: { count: results.length },
    });

    return { ok: true, count: results.length, results };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 9A: Problem List via ORWCH PROBLEM LIST RPC
server.get("/vista/problems", async (request) => {
  const dfn = (request.query as any)?.dfn;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn query parameter", hint: "Example: /vista/problems?dfn=1" };
  }

  try {
    validateCredentials();
  } catch (err: any) {
    return { ok: false, error: err.message, hint: "Set VISTA credentials in apps/api/.env.local" };
  }

  const RPC_NAME = "ORWCH PROBLEM LIST";

  try {
    await connect();

    // ORWCH PROBLEM LIST params: (DFN, FLAG)
    // DFN   = patient IEN
    // FLAG  = 1 for active problems only, 0 for all
    const lines = await callRpc(RPC_NAME, [String(dfn), "0"]);

    disconnect();

    // Check for -1^error pattern
    if (lines.length > 0 && lines[0].startsWith("-1")) {
      const errMsg = lines[0].split("^").slice(1).join("^") || "Unknown VistA error";
      return { ok: false, error: errMsg, rpcUsed: RPC_NAME };
    }

    // Parse problem list lines
    // Wire format per line: IEN^problem_text^status^onset_date^...
    // where status is typically: "A" (active), "I" (inactive), etc.
    interface ProblemEntry {
      id: string;
      text: string;
      status: string;
      onset?: string;
    }

    const results: ProblemEntry[] = lines
      .map((line) => {
        if (!line || line.trim() === "") return null;
        const parts = line.split("^");
        if (parts.length < 2) return null;

        const ien = parts[0]?.trim();
        const text = parts[1]?.trim();
        const status = parts[2]?.trim() || "Unknown";
        const onset = parts[3]?.trim() || "";

        // Skip empty entries
        if (!ien || !text) return null;

        // Simplify status for display
        let displayStatus = "active";
        if (status.toUpperCase().includes("I") || status === "0") {
          displayStatus = "inactive";
        } else if (status.toUpperCase().includes("R") || status === "2") {
          displayStatus = "resolved";
        }

        return {
          id: ien,
          text,
          status: displayStatus,
          onset: onset || undefined,
        };
      })
      .filter((r) => r !== null);

    // Phase 15C: Audit problems view
    audit("phi.problems-view", "success", auditActor(request), {
      patientDfn: String(dfn),
      requestId: (request as any).requestId,
      sourceIp: request.ip,
      detail: { count: results.length },
    });

    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return {
      ok: false,
      error: err.message,
      hint: "Ensure VistA RPC Broker is running on 127.0.0.1:9430 and credentials are correct",
    };
  }
});

// Phase 9B: Add Problem — NOT YET IMPLEMENTED (documented blocker)
//
// Problem creation in VistA requires complex validation:
//   1. ICD-9/ICD-10 diagnosis code lookup (not just free text)
//   2. Provider credential validation and assignment
//   3. Service conditions setup (SC, AO, IR, EC, HNC, MST, CV, SHD flags)
//   4. Lexicon entry mapping and SNOMED concept handling
//   5. Duplicate problem checking
//
// These go beyond MVP scope. Real problem entry should use VistA CPRS GUI or
// a fully-validated provider workstation. This endpoint returns a documented
// "not yet implemented" error rather than risking invalid data.
//
server.post("/vista/problems", async (request) => {
  const body = request.body as any;
  const dfn = body?.dfn;
  const text = body?.text;

  // Validate inputs
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return {
      ok: false,
      error: "Missing or non-numeric dfn",
      hint: 'Body: { "dfn": "1", "text": "Hypertension" }',
    };
  }
  if (!text || typeof text !== "string" || text.trim().length < 2) {
    return {
      ok: false,
      error: "text must be at least 2 characters",
      hint: 'Body: { "dfn": "1", "text": "Hypertension" }',
    };
  }

  // Honest error: problem creation requires complex validation
  return {
    ok: false,
    error:
      "Problem creation is not yet implemented in this MVP. VistA problem entry requires " +
      "ICD-9/ICD-10 diagnosis codes, provider validation, and service condition flags. " +
      "Please use VistA CPRS or a provider workstation for this task.",
    hint: "To add problems, use VistA CPRS Chart at the patient encounter screen.",
    blocker: {
      reason: "Complex CPOE validation",
      requiredFields: [
        "DFN (patient)",
        "Text (problem description)",
        "ICD-9/ICD-10 diagnosis code",
        "Provider DUZ",
        "Service conditions (SC, AO, IR, EC, HNC, MST, CV, SHD)",
        "Onset date",
        "Location",
      ],
      rpcNotAvailable: "GMPLUTL.CREATE requires complex array validation",
      recommendation: "Use VistA CPRS GUI which handles validation safely",
    },
  };
});

// ============================================================================
// Phase 12: Consults, Surgery, D/C Summaries, Labs, Reports, ICD Search
// ============================================================================

// Phase 12F: ICD/Lexicon search via ORQQPL4 LEX
server.get("/vista/icd-search", async (request) => {
  const { q } = request.query as any;
  if (!q || typeof q !== "string" || q.trim().length < 2) {
    return { ok: false, error: "Search query must be at least 2 characters", hint: "Use ?q=hyper" };
  }
  try { validateCredentials(); } catch (err: any) {
    return { ok: false, error: err.message };
  }
  const RPC_NAME = "ORQQPL4 LEX";
  try {
    await connect();
    const lines = await callRpc(RPC_NAME, [q.trim()]);
    disconnect();
    // ORQQPL4 LEX returns lines: IEN^Description^ICD-code
    const results = (Array.isArray(lines) ? lines : [lines])
      .filter((l: string) => l && l.trim())
      .map((line: string, idx: number) => {
      const parts = line.split("^");
      if (parts.length >= 3) {
        return { id: parts[0], description: parts[1], icd: parts[2] };
      } else if (parts.length === 2) {
        return { id: String(idx), description: parts[0], icd: parts[1] };
      }
      return { id: String(idx), icd: "", description: line };
    });
    return { ok: true, rpc: RPC_NAME, count: results.length, results };
  } catch (err: any) {
    disconnect();
    return { ok: false, rpc: RPC_NAME, error: err.message };
  }
});

// Phase 12A: Consults via ORQQCN LIST + ORQQCN DETAIL
server.get("/vista/consults", async (request) => {
  const { dfn } = request.query as any;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1" };
  }
  try { validateCredentials(); } catch (err: any) {
    return { ok: false, error: err.message };
  }
  const RPC_NAME = "ORQQCN LIST";
  try {
    await connect();
    // Params: DFN, startDate, stopDate, service, status
    const lines = await callRpc(RPC_NAME, [String(dfn), "", "", "", ""]);
    disconnect();
    if (lines.length === 0 || (lines.length === 1 && lines[0].startsWith("<"))) {
      return { ok: true, count: 0, results: [], rpcUsed: RPC_NAME };
    }
    const results = lines
      .map((line) => {
        const p = line.split("^");
        if (p.length < 5) return null;
        const id = p[0]?.trim();
        if (!id || !/^\d+$/.test(id)) return null;
        // FM date → YYYY-MM-DD
        let date = p[1] || "";
        if (date && date.length >= 7) {
          const [dp, tp] = date.split(".");
          const y = parseInt(dp.substring(0, 3), 10) + 1700;
          const m = dp.substring(3, 5);
          const d = dp.substring(5, 7);
          date = `${y}-${m}-${d}`;
          if (tp && tp.length >= 4) date += ` ${tp.substring(0, 2)}:${tp.substring(2, 4)}`;
        }
        const status = (p[2] || "").trim();
        const service = (p[3] || "").trim();
        const typeStr = (p[4] || "").trim();
        const typeCode = (p[8] || "").trim(); // C/P/M/I/R
        return { id, date, status, service, type: typeStr || "Consult", typeCode };
      })
      .filter(Boolean);
    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return { ok: false, error: err.message, rpcUsed: RPC_NAME };
  }
});

server.get("/vista/consults/detail", async (request) => {
  const { id } = request.query as any;
  if (!id || !/^\d+$/.test(String(id))) {
    return { ok: false, error: "Missing or non-numeric consult id", hint: "Use ?id=123" };
  }
  try { validateCredentials(); } catch (err: any) {
    return { ok: false, error: err.message };
  }
  const RPC_NAME = "ORQQCN DETAIL";
  try {
    await connect();
    const lines = await callRpc(RPC_NAME, [String(id)]);
    disconnect();
    return { ok: true, text: lines.join("\n"), rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return { ok: false, error: err.message, rpcUsed: RPC_NAME };
  }
});

// Phase 12B: Surgery via ORWSR LIST
server.get("/vista/surgery", async (request) => {
  const { dfn } = request.query as any;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1" };
  }
  try { validateCredentials(); } catch (err: any) {
    return { ok: false, error: err.message };
  }
  const RPC_NAME = "ORWSR LIST";
  try {
    await connect();
    // Params: DFN, startDate, endDate, context(-1=all), max(999)
    const lines = await callRpc(RPC_NAME, [String(dfn), "", "", "-1", "999"]);
    disconnect();
    if (lines.length === 0 || (lines.length === 1 && !lines[0].trim())) {
      return { ok: true, count: 0, results: [], rpcUsed: RPC_NAME };
    }
    const results = lines
      .map((line) => {
        const p = line.split("^");
        if (p.length < 3) return null;
        const id = p[0]?.trim();
        if (!id) return null;
        const procedure = (p[1] || "").trim();
        let date = (p[2] || "").trim();
        if (date && date.length >= 7 && !date.includes("-")) {
          const [dp, tp] = date.split(".");
          const y = parseInt(dp.substring(0, 3), 10) + 1700;
          const m = dp.substring(3, 5);
          const d = dp.substring(5, 7);
          date = `${y}-${m}-${d}`;
          if (tp && tp.length >= 4) date += ` ${tp.substring(0, 2)}:${tp.substring(2, 4)}`;
        }
        const surgeonField = (p[3] || "").trim();
        const surgeon = surgeonField.includes(";") ? surgeonField.split(";")[1] || surgeonField : surgeonField;
        return { id, procedure, date, surgeon, status: "Complete" };
      })
      .filter(Boolean);
    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return { ok: false, error: err.message, rpcUsed: RPC_NAME };
  }
});

// Phase 12C: Discharge Summaries via TIU DOCUMENTS BY CONTEXT (CLASS=244)
server.get("/vista/dc-summaries", async (request) => {
  const { dfn } = request.query as any;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1" };
  }
  try { validateCredentials(); } catch (err: any) {
    return { ok: false, error: err.message };
  }
  const RPC_NAME = "TIU DOCUMENTS BY CONTEXT";
  try {
    await connect();
    // CLASS=244 for Discharge Summaries (CLS_DC_SUMM in rDCSumm.pas)
    const signedLines = await callRpc(RPC_NAME, [
      "244", "1", String(dfn), "", "", "0", "0", "D",
    ]);
    const unsignedLines = await callRpc(RPC_NAME, [
      "244", "2", String(dfn), "", "", "0", "0", "D",
    ]);
    disconnect();
    const seenIens = new Set<string>();
    const allLines: string[] = [];
    for (const line of [...unsignedLines, ...signedLines]) {
      const ien = line.split("^")[0]?.trim();
      if (ien && /^\d+$/.test(ien) && !seenIens.has(ien)) {
        seenIens.add(ien);
        allLines.push(line);
      }
    }
    const results = allLines
      .map((line) => {
        const parts = line.split("^");
        if (parts.length < 7) return null;
        const id = parts[0].trim();
        if (!id || !/^\d+$/.test(id)) return null;
        const title = (parts[1] || "").replace(/^\+\s*/, "").trim();
        const fmDate = parts[2] || "";
        let date = fmDate;
        if (fmDate && fmDate.length >= 7) {
          const [datePart, timePart] = fmDate.split(".");
          const y = parseInt(datePart.substring(0, 3), 10) + 1700;
          const m = datePart.substring(3, 5);
          const d = datePart.substring(5, 7);
          date = `${y}-${m}-${d}`;
          if (timePart && timePart.length >= 4) {
            date += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
          }
        }
        const authorField = parts[4] || "";
        const authorParts = authorField.split(";");
        const author = authorParts.length >= 3 ? authorParts[2] : authorParts[1] || authorField;
        const location = parts[5] || "";
        const status = parts[6] || "";
        return { id, title, date, author, location, status };
      })
      .filter(Boolean);
    return { ok: true, count: results.length, results, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return { ok: false, error: err.message, rpcUsed: RPC_NAME };
  }
});

// Phase 12C: Get full text of a TIU document (works for notes AND DC summaries)
server.get("/vista/tiu-text", async (request) => {
  const { id } = request.query as any;
  if (!id || !/^\d+$/.test(String(id))) {
    return { ok: false, error: "Missing or non-numeric document id", hint: "Use ?id=123" };
  }
  try { validateCredentials(); } catch (err: any) {
    return { ok: false, error: err.message };
  }
  const RPC_NAME = "TIU GET RECORD TEXT";
  try {
    await connect();
    const lines = await callRpc(RPC_NAME, [String(id)]);
    disconnect();
    return { ok: true, text: lines.join("\n"), rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return { ok: false, error: err.message, rpcUsed: RPC_NAME };
  }
});

// Phase 12D: Labs via ORWLRR INTERIM
server.get("/vista/labs", async (request) => {
  const { dfn } = request.query as any;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1" };
  }
  try { validateCredentials(); } catch (err: any) {
    return { ok: false, error: err.message };
  }
  const RPC_NAME = "ORWLRR INTERIM";
  try {
    await connect();
    // Params: DFN, startDate(FM), endDate(FM) — empty strings fetch all
    const lines = await callRpc(RPC_NAME, [String(dfn), "", ""]);
    disconnect();
    // Response is free-text lab report lines
    // Parse structured data from the text: look for test name, result, units, ref range, flag
    const results: { testName: string; result: string; units: string; refRange: string; flag: string; specimen: string; collectionDate: string }[] = [];
    let currentSpecimen = "";
    let currentDate = "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      // Specimen headers: "Specimen: BLOOD" or "Specimen: URINE"
      if (/^Specimen:/i.test(trimmed)) {
        currentSpecimen = trimmed.replace(/^Specimen:\s*/i, "").trim();
        continue;
      }
      // Collection date lines: "Collection Date: ..." or date-like patterns
      if (/^(Collection\s+Date|Collected):/i.test(trimmed)) {
        currentDate = trimmed.replace(/^(Collection\s+Date|Collected):\s*/i, "").trim();
        continue;
      }
      // Test result lines — try to parse structured lab results
      // Common format: TestName  Result  Units  RefRange  Flag
      // or caret-delimited: test^result^units^refRange^flag
      if (trimmed.includes("^")) {
        const p = trimmed.split("^");
        if (p.length >= 2) {
          results.push({
            testName: (p[0] || "").trim(),
            result: (p[1] || "").trim(),
            units: (p[2] || "").trim(),
            refRange: (p[3] || "").trim(),
            flag: (p[4] || "").trim(),
            specimen: currentSpecimen,
            collectionDate: currentDate,
          });
        }
      }
    }
    // If no structured results parsed, return raw text
    const rawText = lines.join("\n");
    if (results.length === 0) {
      return {
        ok: true,
        count: 0,
        results: [],
        rawText,
        rpcUsed: RPC_NAME,
        note: "Lab results returned as free text; structured parsing found no caret-delimited entries",
      };
    }
    return { ok: true, count: results.length, results, rawText, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return { ok: false, error: err.message, rpcUsed: RPC_NAME };
  }
});

// Phase 12E: Reports — list available reports + fetch report text
server.get("/vista/reports", async (_request) => {
  try { validateCredentials(); } catch (err: any) {
    return { ok: false, error: err.message };
  }
  const RPC_NAME = "ORWRP REPORT LISTS";
  try {
    await connect();
    const lines = await callRpc(RPC_NAME, []);
    disconnect();
    // Response has sections: [DATE RANGES], [HEALTH SUMMARY TYPES], [REPORT LIST]
    let inReportList = false;
    const reports: { id: string; heading: string; qualifier: string; remote: string; rpcName: string; category: string }[] = [];
    const dateRanges: string[] = [];
    const hsTypes: string[] = [];
    let currentSection = "";
    for (const line of lines) {
      if (line.includes("[DATE RANGES]")) { currentSection = "dateRanges"; continue; }
      if (line.includes("[HEALTH SUMMARY TYPES]")) { currentSection = "hsTypes"; continue; }
      if (line.includes("[REPORT LIST]")) { currentSection = "reportList"; inReportList = true; continue; }
      if (currentSection === "dateRanges") { dateRanges.push(line); continue; }
      if (currentSection === "hsTypes") { hsTypes.push(line); continue; }
      if (currentSection === "reportList" && line.trim()) {
        const p = line.split("^");
        reports.push({
          id: (p[0] || "").trim(),
          heading: (p[1] || "").trim(),
          qualifier: (p[2] || "").trim(),
          remote: (p[6] || "").trim(),
          rpcName: (p[9] || "").trim(),
          category: (p[8] || "").trim(),
        });
      }
    }
    return { ok: true, count: reports.length, reports, dateRanges, hsTypes, rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return { ok: false, error: err.message, rpcUsed: RPC_NAME };
  }
});

server.get("/vista/reports/text", async (request) => {
  const { dfn, id, hsType } = request.query as any;
  if (!dfn || !/^\d+$/.test(String(dfn))) {
    return { ok: false, error: "Missing or non-numeric dfn", hint: "Use ?dfn=1&id=1" };
  }
  if (!id) {
    return { ok: false, error: "Missing report id", hint: "Use ?dfn=1&id=1" };
  }
  try { validateCredentials(); } catch (err: any) {
    return { ok: false, error: err.message };
  }
  const RPC_NAME = "ORWRP REPORT TEXT";
  try {
    await connect();
    // Params: DFN, reportId, hsType, daysBack, section, alpha, omega
    const lines = await callRpc(RPC_NAME, [
      String(dfn), String(id), String(hsType || ""), "", "0", "", "",
    ]);
    disconnect();
    return { ok: true, text: lines.join("\n"), rpcUsed: RPC_NAME };
  } catch (err: any) {
    disconnect();
    return { ok: false, error: err.message, rpcUsed: RPC_NAME };
  }
});

const port = Number(process.env.PORT || 3001)
const host = process.env.HOST || "127.0.0.1"

try {
  await server.listen({ port, host });
  log.info("Server listening", { host, port, url: `http://${host}:${port}` });
  audit("system.startup", "success", { duz: "system", name: "system", role: "system" }, {
    detail: { host, port, phase: "25-bi-analytics", commitSha: process.env.BUILD_SHA || "dev" },
  });
  // Phase 95B: Initialize SQLite platform DB (migrate + seed)
  const dbResult = initPlatformDb();
  if (dbResult.ok) {
    log.info("Platform DB init", { ok: dbResult.ok, migrated: dbResult.migrated, seeded: dbResult.seeded });
    // Phase 109: Seed module catalog + default tenant entitlements from modules.json
    try {
      const { seedModuleCatalogFromConfig } = await import("./modules/module-catalog-seed.js");
      const seedResult = seedModuleCatalogFromConfig();
      log.info("Module catalog seeded", { ...seedResult });
      // Wire DB-backed entitlement provider into module-registry
      const { getEnabledModuleIds } = await import("./platform/db/repo/module-repo.js");
      setDbEntitlementProvider((tenantId: string) => getEnabledModuleIds(tenantId));
    } catch (seedErr: any) {
      log.warn("Module catalog seed failed (non-fatal)", { error: seedErr.message });
    }
  } else {
    log.warn("Platform DB init failed", { ok: false, error: dbResult.error });
  }
  // Phase 101: Initialize Postgres platform DB (if configured)
  if (isPgConfigured()) {
    const pgResult = await initPlatformPg();
    if (pgResult.ok) {
      log.info("Platform PG init", {
        ok: true,
        migrations: pgResult.migrations,
        rls: pgResult.rls ? { applied: pgResult.rls.applied.length } : null,
        latencyMs: pgResult.healthCheck?.latencyMs,
      });
    } else {
      log.warn("Platform PG init failed (SQLite fallback active)", {
        ok: false,
        reason: pgResult.reason,
        error: pgResult.error,
      });
    }
  } else {
    log.info("Platform PG not configured (SQLite-only mode)", { hint: "Set PLATFORM_PG_URL to enable Postgres" });
  }
  // Phase 96B: Load QA flow catalog
  const flowResult = loadFlowCatalog();
  log.info("QA flow catalog loaded", { loaded: flowResult.loaded, errors: flowResult.errors.length });
  // Phase 25: Restore persisted analytics events and start aggregation
  initAnalyticsStore();
  startAggregationJob();
  // Phase 25: Initialize ETL writer (non-blocking — connects to ROcto lazily)
  initEtl();
} catch (err) {
  const e = err as NodeJS.ErrnoException;
  if (e.code === "EADDRINUSE") {
    log.fatal(`Port ${port} already in use. Kill the existing process or pick another port.`, {
      error: e.message,
      hint: "See docs/runbooks/windows-port-3001-fix.md",
    });
  } else {
    log.fatal("Server failed to start", { error: e.message });
  }
  process.exit(1);
}
