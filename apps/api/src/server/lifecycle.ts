/**
 * Server — Lifecycle: Startup & Shutdown
 *
 * Phase 173: Extracted from index.ts — all post-listen startup logic including
 * PG init, repo wiring, Phase 146 durability wave, analytics, ETL,
 * background jobs, and shutdown.
 */

import { log } from "../lib/logger.js";
import { audit } from "../lib/audit.js";
import { isPgConfigured, initPlatformPg, pgHealthCheck, getPgPool } from "../platform/pg/index.js";
import { startAggregationJob, stopAggregationJob } from "../services/analytics-aggregator.js";
import { initEtl } from "../services/analytics-etl.js";
import { initAnalyticsStore } from "../services/analytics-store.js";
import { loadFlowCatalog } from "../qa/index.js";
import { startShipperJob } from "../audit-shipping/shipper.js";
import { dbPoolInUse, dbPoolTotal, dbPoolWaiting } from "../telemetry/metrics.js";
import { getRuntimeMode } from "../platform/runtime-mode.js";
import { initHl7Engine, stopHl7Engine, isHl7EngineEnabled } from "../hl7/index.js";
import { startHealthMonitor, stopHealthMonitor } from "../rcm/connectors/health-monitor.js";
import { initBillingProvider } from "../billing/index.js";
import { startMeteringFlush } from "../billing/metering.js";
import { initFeatureFlagProvider } from "../flags/index.js";
import { bootstrapWritebackExecutors } from "../writeback/executor-bootstrap.js";
import { startSessionSweeper, stopSessionSweeper } from "../telehealth/session-hardening.js";
/**
 * Initialize Postgres platform DB and wire all repos.
 */
async function initPostgresLayer(): Promise<void> {
  if (!isPgConfigured()) {
    log.info("Platform PG not configured (in-memory only)", { hint: "Set PLATFORM_PG_URL to enable Postgres" });
    return;
  }

  const pgResult = await initPlatformPg();
  if (!pgResult.ok) {
    log.warn("Platform PG init failed", {
      ok: false,
      reason: pgResult.reason,
      error: pgResult.error,
    });
    return;
  }

  log.info("Platform PG init", {
    ok: true,
    migrations: pgResult.migrations,
    rls: pgResult.rls ? { applied: pgResult.rls.applied.length } : null,
    latencyMs: pgResult.healthCheck?.latencyMs,
  });

  // Phase 117: Wire repos to PG when STORE_BACKEND resolves to "pg"
  const { resolveBackend } = await import("../platform/store-resolver.js");
  const backend = resolveBackend();
  if (backend !== "pg") return;

  // Session repo -> PG
  try {
    const pgSessionRepoMod = await import("../platform/pg/repo/session-repo.js");
    const { initSessionRepo } = await import("../auth/session-store.js");
    initSessionRepo(pgSessionRepoMod);
    log.info("Session store wired to PG");
  } catch (psErr: any) {
    log.warn("PG session repo wire failed (in-memory fallback)", { error: psErr.message });
  }

  // Workqueue repo -> PG
  try {
    const pgWqRepoMod = await import("../platform/pg/repo/workqueue-repo.js");
    const { initWorkqueueRepo } = await import("../rcm/workqueues/workqueue-store.js");
    initWorkqueueRepo(pgWqRepoMod);
    log.info("Workqueue store wired to PG");
  } catch (pwqErr: any) {
    log.warn("PG workqueue repo wire failed (in-memory fallback)", { error: pwqErr.message });
  }

  // Phase 126: RCM claim store -> PG
  try {
    const pgClaimRepoMod = await import("../platform/pg/repo/rcm-claim-repo.js");
    const { initClaimStoreRepo } = await import("../rcm/domain/claim-store.js");
    initClaimStoreRepo(pgClaimRepoMod);
    log.info("RCM claim store wired to PG");
  } catch (rcErr: any) {
    log.warn("PG RCM claim repo wire failed (in-memory fallback)", { error: rcErr.message });
  }

  // Phase 126: RCM claim case store -> PG
  try {
    const pgCaseRepoMod = await import("../platform/pg/repo/rcm-claim-case-repo.js");
    const { initClaimCaseRepo } = await import("../rcm/claims/claim-store.js");
    initClaimCaseRepo(pgCaseRepoMod);
    log.info("RCM claim case store wired to PG");
  } catch (ccErr: any) {
    log.warn("PG RCM claim case repo wire failed (in-memory fallback)", { error: ccErr.message });
  }

  // Phase 126: EDI ack/status store -> PG
  try {
    const pgAckRepoMod = await import("../platform/pg/repo/edi-ack-repo.js");
    const { initAckStatusRepo } = await import("../rcm/edi/ack-status-processor.js");
    initAckStatusRepo(pgAckRepoMod);
    log.info("EDI ack/status store wired to PG");
  } catch (ackErr: any) {
    log.warn("PG EDI ack repo wire failed (cache-only fallback)", { error: ackErr.message });
  }

  // Phase 126: EDI pipeline store -> PG
  try {
    const pgPipeRepoMod = await import("../platform/pg/repo/edi-pipeline-repo.js");
    const { initPipelineRepo } = await import("../rcm/edi/pipeline.js");
    initPipelineRepo(pgPipeRepoMod);
    log.info("EDI pipeline store wired to PG");
  } catch (pipeErr: any) {
    log.warn("PG EDI pipeline repo wire failed (cache-only fallback)", { error: pipeErr.message });
  }

  // Phase 127: Portal message store -> PG
  try {
    const pgMsgRepoMod = await import("../platform/pg/repo/pg-portal-message-repo.js");
    const { initMessageRepo } = await import("../services/portal-messaging.js");
    await initMessageRepo(pgMsgRepoMod);
    log.info("Portal messaging store wired to PG");
  } catch (pmErr: any) {
    log.warn("PG portal message repo wire failed (in-memory fallback)", { error: pmErr.message });
  }

  // Phase 127: Portal access log store -> PG
  try {
    const pgAlogRepoMod = await import("../platform/pg/repo/pg-portal-access-log-repo.js");
    const { initAccessLogRepo } = await import("../portal-iam/access-log-store.js");
    initAccessLogRepo(pgAlogRepoMod);
    log.info("Portal access log store wired to PG");
  } catch (alErr: any) {
    log.warn("PG portal access log repo wire failed (in-memory fallback)", { error: alErr.message });
  }

  // Phase 127: Portal patient settings store -> PG
  try {
    const pgSettingsRepoMod = await import("../platform/pg/repo/pg-portal-patient-setting-repo.js");
    const { initSettingsRepo } = await import("../services/portal-settings.js");
    initSettingsRepo(pgSettingsRepoMod);
    log.info("Portal settings store wired to PG");
  } catch (psErr: any) {
    log.warn("PG portal settings repo wire failed (cache-only fallback)", { error: psErr.message });
  }

  // Phase 127: Telehealth room store -> PG
  try {
    const pgRoomRepoMod = await import("../platform/pg/repo/pg-telehealth-room-repo.js");
    const { initTelehealthRoomRepo } = await import("../telehealth/room-store.js");
    initTelehealthRoomRepo(pgRoomRepoMod);
    log.info("Telehealth room store wired to PG");
  } catch (trErr: any) {
    log.warn("PG telehealth room repo wire failed (in-memory fallback)", { error: trErr.message });
  }

  // Phase 128: Imaging worklist store -> PG
  try {
    const pgIwRepo = await import("../platform/pg/repo/pg-imaging-worklist-repo.js");
    const { initWorklistRepo } = await import("../services/imaging-worklist.js");
    await initWorklistRepo(pgIwRepo);
    log.info("Imaging worklist store wired to PG");
  } catch (iwErr: any) {
    log.warn("PG imaging worklist repo wire failed (in-memory fallback)", { error: iwErr.message });
  }

  // Phase 128: Imaging ingest store -> PG
  try {
    const pgIiRepo = await import("../platform/pg/repo/pg-imaging-ingest-repo.js");
    const { initIngestRepo } = await import("../services/imaging-ingest.js");
    await initIngestRepo(pgIiRepo);
    log.info("Imaging ingest store wired to PG");
  } catch (iiErr: any) {
    log.warn("PG imaging ingest repo wire failed (in-memory fallback)", { error: iiErr.message });
  }

  // Phase 128: Scheduling request store -> PG
  try {
    const pgSrRepo = await import("../platform/pg/repo/pg-scheduling-request-repo.js");
    const { initSchedulingRepo: initSchedPgRepo } = await import("../adapters/scheduling/vista-adapter.js");
    await initSchedPgRepo(pgSrRepo);
    log.info("Scheduling request store wired to PG");
  } catch (srErr: any) {
    log.warn("PG scheduling request repo wire failed (in-memory fallback)", { error: srErr.message });
  }

  // Phase 128: Scheduling booking lock store -> PG
  try {
    const pgSlRepo = await import("../platform/pg/repo/pg-scheduling-lock-repo.js");
    const { initSchedulingLockRepo } = await import("../adapters/scheduling/vista-adapter.js");
    initSchedulingLockRepo(pgSlRepo);
    log.info("Scheduling lock store wired to PG");
  } catch (slErr: any) {
    log.warn("PG scheduling lock repo wire failed (in-memory fallback)", { error: slErr.message });
  }

  // Phase 131: Scheduling lifecycle repo -> PG (verified via migration v14)
  try {
    await import("../platform/pg/repo/pg-scheduling-lifecycle-repo.js");
    log.info("Scheduling lifecycle repo available (Phase 131)");
  } catch (lcErr: any) {
    log.warn("PG scheduling lifecycle repo not available (non-fatal)", { error: lcErr.message });
  }

  // ═══════════════════════════════════════════════════════════════════
  // W38: Service Lines + Devices v2 — wire in-memory stores to PG
  // ═══════════════════════════════════════════════════════════════════

  // W38: ED store -> PG
  try {
    const pgEdRepo = await import("../platform/pg/repo/pg-ed-repo.js");
    const { initEdStoreRepo } = await import("../service-lines/ed/ed-store.js");
    initEdStoreRepo(pgEdRepo);
    log.info("ED store wired to PG (W38)");
  } catch (edErr: any) {
    log.warn("PG ED repo wire failed (in-memory fallback)", { error: edErr.message });
  }

  // W38: OR store -> PG
  try {
    const pgOrRepo = await import("../platform/pg/repo/pg-or-repo.js");
    const { initOrStoreRepo } = await import("../service-lines/or/or-store.js");
    initOrStoreRepo(pgOrRepo);
    log.info("OR store wired to PG (W38)");
  } catch (orErr: any) {
    log.warn("PG OR repo wire failed (in-memory fallback)", { error: orErr.message });
  }

  // W38: ICU store -> PG
  try {
    const pgIcuRepo = await import("../platform/pg/repo/pg-icu-repo.js");
    const { initIcuStoreRepo } = await import("../service-lines/icu/icu-store.js");
    initIcuStoreRepo(pgIcuRepo);
    log.info("ICU store wired to PG (W38)");
  } catch (icuErr: any) {
    log.warn("PG ICU repo wire failed (in-memory fallback)", { error: icuErr.message });
  }

  // W38: Device registry store -> PG
  try {
    const pgDevRepo = await import("../platform/pg/repo/pg-device-registry-repo.js");
    const { initDeviceRegistryStoreRepo } = await import("../devices/device-registry-store.js");
    initDeviceRegistryStoreRepo(pgDevRepo);
    log.info("Device registry store wired to PG (W38)");
  } catch (devErr: any) {
    log.warn("PG device registry repo wire failed (in-memory fallback)", { error: devErr.message });
  }

  // W38: Radiology store -> PG
  try {
    const pgRadRepo = await import("../platform/pg/repo/pg-radiology-repo.js");
    const { initRadiologyStoreRepo } = await import("../radiology/radiology-store.js");
    initRadiologyStoreRepo(pgRadRepo);
    log.info("Radiology store wired to PG (W38)");
  } catch (radErr: any) {
    log.warn("PG radiology repo wire failed (in-memory fallback)", { error: radErr.message });
  }

  // ═══════════════════════════════════════════════════════════════════
  // Phase 146: Durability Wave — wire all critical Map stores to PG
  // ═══════════════════════════════════════════════════════════════════
  try {
    const DR = await import("../platform/pg/repo/durability-repos.js");

    // Portal domain
    const { initPortalUserStoreRepo } = await import("../portal-iam/portal-user-store.js");
    initPortalUserStoreRepo(DR.createPortalUserRepo());
    const { initRefillStoreRepo } = await import("../services/portal-refills.js");
    initRefillStoreRepo(DR.createPortalRefillRepo());
    const { initTaskStoreRepo } = await import("../services/portal-tasks.js");
    initTaskStoreRepo(DR.createPortalTaskRepo());
    const { initSensitivityStoreRepo } = await import("../services/portal-sensitivity.js");
    initSensitivityStoreRepo(DR.createPortalSensitivityRepo());
    const { initShareStoreRepo } = await import("../services/portal-sharing.js");
    initShareStoreRepo(DR.createPortalShareLinkRepo());
    const { initProxyStoreRepo } = await import("../portal-iam/proxy-store.js");
    initProxyStoreRepo(DR.createPortalProxyInvitationRepo());

    // Imaging domain
    const { initImagingDeviceStoreRepo } = await import("../services/imaging-devices.js");
    initImagingDeviceStoreRepo(DR.createImagingDeviceRepo());

    // Auth / IAM domain
    const { initVistaBindingStoreRepo } = await import("../auth/idp/vista-binding.js");
    initVistaBindingStoreRepo(DR.createVistaBindingRepo());
    const { initBreakGlassStoreRepo } = await import("../auth/enterprise-break-glass.js");
    initBreakGlassStoreRepo(DR.createBreakGlassSessionRepo());

    // RCM domain -- payments
    const { initPaymentStoreRepos } = await import("../rcm/payments/payment-store.js");
    initPaymentStoreRepos({
      batchRepo: DR.createPaymentBatchRepo(),
      lineRepo: DR.createPaymentLineRepo(),
      postingRepo: DR.createPaymentPostingRepo(),
      underpaymentRepo: DR.createUnderpaymentCaseRepo(),
    });

    // RCM domain -- LOA
    const { initLoaStoreRepo } = await import("../rcm/loa/loa-store.js");
    initLoaStoreRepo(DR.createLoaRequestRepo());

    // RCM domain -- workflows
    const { initRemitIntakeRepo } = await import("../rcm/workflows/remittance-intake.js");
    initRemitIntakeRepo(DR.createRemitDocumentRepo());
    const { initDenialStoreRepo } = await import("../rcm/workflows/claims-workflow.js");
    initDenialStoreRepo(DR.createDenialRepo());
    const { initTransactionEnvelopeRepo } = await import("../rcm/transactions/envelope.js");
    initTransactionEnvelopeRepo(DR.createTransactionEnvelopeRepo());

    // RCM domain -- EDI
    const { initRemitProcessorRepo } = await import("../rcm/edi/remit-processor.js");
    initRemitProcessorRepo(DR.createRemitDocumentRepo());

    // RCM domain -- payer ops
    const { initPayerOpsRepos } = await import("../rcm/payerOps/store.js");
    initPayerOpsRepos({
      enrollments: DR.createPayerEnrollmentRepo(),
      loaCases: DR.createLoaCaseRepo(),
      credentials: DR.createCredentialVaultRepo(),
    });
    const { initPhilHealthStoreRepo, initPhFacilityStoreRepo } = await import("../rcm/payerOps/philhealth-store.js");
    initPhilHealthStoreRepo(DR.createPhClaimDraftRepo());
    initPhFacilityStoreRepo(DR.createPhFacilitySetupRepo());
    const { initRegistryStoreRepo } = await import("../rcm/payerOps/registry-store.js");
    initRegistryStoreRepo(DR.createPayerDirectoryEntryRepo());
    const { initDirectoryStoreRepo } = await import("../rcm/payerDirectory/normalization.js");
    initDirectoryStoreRepo(DR.createPayerDirectoryEntryRepo());

    // RCM domain -- rules
    const { initPayerRuleStoreRepo } = await import("../rcm/rules/payer-rules.js");
    initPayerRuleStoreRepo(DR.createPayerRuleRepo());
    const { initRulepackStoreRepo } = await import("../rcm/payers/payer-rulepacks.js");
    initRulepackStoreRepo(DR.createPayerRulepackRepo());

    // RCM domain -- submissions
    const { initPhSubmissionStoreRepo } = await import("../rcm/philhealth-eclaims3/submission-tracker.js");
    initPhSubmissionStoreRepo(DR.createPhSubmissionRepo());
    const { initHmoSubmissionStoreRepo } = await import("../rcm/hmo-portal/submission-tracker.js");
    initHmoSubmissionStoreRepo(DR.createHmoSubmissionRepo());

    // RCM domain -- jobs
    const { initJobQueueStoreRepo } = await import("../rcm/jobs/queue.js");
    initJobQueueStoreRepo(DR.createJobQueueEntryRepo());

    // Clinical domain
    const { initDraftStoreRepo } = await import("../routes/write-backs.js");
    initDraftStoreRepo(DR.createClinicalDraftRepo());
    const { initUiPrefsStoreRepo } = await import("../services/ui-prefs-store.js");
    initUiPrefsStoreRepo(DR.createUiPreferenceRepo());
    const { initHandoffStoreRepo } = await import("../routes/handoff/handoff-store.js");
    initHandoffStoreRepo(DR.createHandoffReportRepo());

    // Other domains
    const { initIntakeStoreRepo } = await import("../intake/intake-store.js");
    initIntakeStoreRepo(DR.createIntakeSessionRepo());
    const { initMigrationStoreRepo } = await import("../migration/migration-store.js");
    initMigrationStoreRepo(DR.createMigrationJobRepo());
    const { initExportStoreRepo } = await import("../lib/export-governance.js");
    initExportStoreRepo(DR.createExportJobRepo());

    log.info("Phase 146: All critical Map stores wired to PG (30+ repos)");

    // Phase 150: Portal session PG write-through (token hashing)
    const { initPortalSessionPgRepo } = await import("../platform/pg/repo/pg-portal-session-repo.js");
    initPortalSessionPgRepo(DR.createPortalSessionRepo());
    log.info("Phase 150: Portal session PG write-through wired");
  } catch (d146Err: any) {
    log.warn("Phase 146 durability wire partially failed (Map cache fallback)", { error: d146Err.message });
  }
}

/**
 * Start all background jobs and services after the server is listening.
 */
async function startBackgroundServices(): Promise<void> {
  // Phase 300: Bootstrap writeback domain executors (6 domains)
  try {
    bootstrapWritebackExecutors();
  } catch (wbErr: any) {
    log.warn("Writeback executor bootstrap failed (non-fatal)", { error: wbErr.message });
  }

  // Phase 307: Start telehealth session sweeper (detects abandoned rooms)
  try {
    startSessionSweeper();
    log.info("Telehealth session sweeper started (Phase 307)");
  } catch (ssErr: any) {
    log.warn("Telehealth session sweeper failed to start (non-fatal)", { error: ssErr.message });
  }

  // Phase 96B: Load QA flow catalog
  const flowResult = loadFlowCatalog();
  log.info("QA flow catalog loaded", { loaded: flowResult.loaded, errors: flowResult.errors.length });

  // Phase 284: Initialize billing provider (mock or Lago based on BILLING_PROVIDER env)
  initBillingProvider();
  startMeteringFlush();

  // Phase 285: Initialize feature flag provider (db or Unleash based on FEATURE_FLAG_PROVIDER env)
  initFeatureFlagProvider();

  // Phase 25: Restore persisted analytics events and start aggregation
  initAnalyticsStore();
  startAggregationJob();

  // Wave 19: Register quality & RCM report generators (Phases 366-367)
  try {
    const { initQualityReportGenerators } = await import("../analytics/quality-metrics.js");
    initQualityReportGenerators();
  } catch (qmErr: any) {
    log.warn("Quality report generators failed to init (non-fatal)", { error: qmErr.message });
  }
  try {
    const { initRcmReportGenerators } = await import("../analytics/rcm-analytics.js");
    initRcmReportGenerators();
  } catch (rmErr: any) {
    log.warn("RCM report generators failed to init (non-fatal)", { error: rmErr.message });
  }

  // Phase 157: Start audit JSONL shipper (if enabled)
  startShipperJob();

  // Phase 25: Initialize ETL writer (non-blocking -- connects to ROcto lazily)
  initEtl();

  // Phase 239: Initialize HL7v2 MLLP engine (if enabled)
  if (isHl7EngineEnabled()) {
    const hl7Started = await initHl7Engine();
    if (hl7Started) {
      log.info("HL7 MLLP engine started (HL7_ENGINE_ENABLED=true)");
    }
  }

  // Phase 242: Start background connector health monitor
  startHealthMonitor();

  // Phase 133: Periodic PG pool stats collection (every 15s)
  if (isPgConfigured()) {
    const poolStatsTimer = setInterval(() => {
      try {
        const pool = getPgPool();
        dbPoolInUse.set(pool.totalCount - pool.idleCount);
        dbPoolTotal.set(pool.totalCount);
        dbPoolWaiting.set(pool.waitingCount);
      } catch { /* non-fatal -- metrics skip */ }
    }, 15_000);
    poolStatsTimer.unref(); // don't keep process alive
    log.info("PG pool stats collection started (15s interval)");
  }

  // Phase 116: Optionally start embedded Graphile Worker job runner
  if (process.env.JOB_WORKER_ENABLED === "true" && isPgConfigured()) {
    try {
      const { startJobRunner } = await import("../jobs/runner.js");
      await startJobRunner({ noHandleSignals: true }); // API handles signals
      log.info("Embedded job runner started (JOB_WORKER_ENABLED=true)");
    } catch (jwErr: any) {
      log.warn("Embedded job runner failed to start (non-fatal)", { error: jwErr.message });
    }
  }
}

/**
 * Full post-listen lifecycle: init databases, wire repos, start background services.
 */
export async function runLifecycle(opts: {
  host: string;
  port: number;
}): Promise<void> {
  log.info("Server listening", { host: opts.host, port: opts.port, url: `http://${opts.host}:${opts.port}` });
  log.info("Runtime mode", {
    mode: getRuntimeMode(),
    pgConfigured: isPgConfigured(),
    storeBackend: process.env.STORE_BACKEND || "auto",
  });
  audit("system.startup", "success", { duz: "system", name: "system", role: "system" }, {
    detail: { host: opts.host, port: opts.port, phase: "25-bi-analytics", commitSha: process.env.BUILD_SHA || "dev" },
  });

  // Initialize Postgres platform DB and wire repos
  await initPostgresLayer();

  // Start background jobs
  await startBackgroundServices();
}
