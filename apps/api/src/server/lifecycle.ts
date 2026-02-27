/**
 * Server — Lifecycle: Startup & Shutdown
 *
 * Phase 173: Extracted from index.ts — all post-listen startup logic including
 * SQLite init, PG init, repo wiring (both SQLite and PG phases),
 * Phase 146 durability wave, analytics, ETL, background jobs, and shutdown.
 */

import { log } from "../lib/logger.js";
import { audit } from "../lib/audit.js";
import { isPgConfigured, initPlatformPg, pgHealthCheck, getPgPool } from "../platform/pg/index.js";
import { initPlatformDb } from "../platform/db/init.js";
import { setDbEntitlementProvider } from "../modules/module-registry.js";
import { startAggregationJob, stopAggregationJob } from "../services/analytics-aggregator.js";
import { initEtl } from "../services/analytics-etl.js";
import { initAnalyticsStore } from "../services/analytics-store.js";
import { loadFlowCatalog } from "../qa/index.js";
import { startShipperJob } from "../audit-shipping/shipper.js";
import { dbPoolInUse, dbPoolTotal, dbPoolWaiting } from "../telemetry/metrics.js";
import { getRuntimeMode } from "../platform/runtime-mode.js";

/**
 * Initialize SQLite platform DB and wire all SQLite-backed repos.
 * Returns true if DB init succeeded.
 */
async function initSqliteLayer(): Promise<boolean> {
  const dbResult = initPlatformDb();
  if (!dbResult.ok) {
    log.warn("Platform DB init failed", { ok: false, error: dbResult.error });
    return false;
  }

  log.info("Platform DB init", { ok: dbResult.ok, migrated: dbResult.migrated, seeded: dbResult.seeded });

  // Phase 114: Wire DB-backed durable session store
  try {
    const sessionRepoMod = await import("../platform/db/repo/session-repo.js");
    const { initSessionRepo } = await import("../auth/session-store.js");
    initSessionRepo(sessionRepoMod);
    log.info("Session store wired to DB");
  } catch (sessErr: any) {
    log.warn("Session repo wire failed (cache-only fallback)", { error: sessErr.message });
  }

  // Phase 114: Wire DB-backed durable workqueue store
  try {
    const wqRepoMod = await import("../platform/db/repo/workqueue-repo.js");
    const { initWorkqueueRepo } = await import("../rcm/workqueues/workqueue-store.js");
    initWorkqueueRepo(wqRepoMod);
    log.info("Workqueue store wired to DB");
  } catch (wqErr: any) {
    log.warn("Workqueue repo wire failed (non-fatal)", { error: wqErr.message });
  }

  // Phase 114: Wire capability matrix audit to DB
  try {
    const { getDb } = await import("../platform/db/db.js");
    const { payerAuditEvent } = await import("../platform/db/schema.js");
    const { initCapabilityAudit } = await import("../rcm/payerOps/capability-matrix.js");
    initCapabilityAudit({ getDb, payerAuditEvent });
    log.info("Capability matrix audit wired to DB");
  } catch (capErr: any) {
    log.warn("Capability audit wire failed (non-fatal)", { error: capErr.message });
  }

  // Phase 115: Wire DB-backed portal messaging store
  try {
    const pmRepo = await import("../platform/db/repo/portal-message-repo.js");
    const { initMessageRepo } = await import("../services/portal-messaging.js");
    await initMessageRepo(pmRepo);
    log.info("Portal messaging store wired to DB");
  } catch (pmErr: any) {
    log.warn("Portal message repo wire failed (non-fatal)", { error: pmErr.message });
  }

  // Phase 115: Wire DB-backed portal appointments store
  try {
    const paRepo = await import("../platform/db/repo/portal-appointment-repo.js");
    const { initAppointmentRepo } = await import("../services/portal-appointments.js");
    initAppointmentRepo(paRepo);
    log.info("Portal appointments store wired to DB");
  } catch (paErr: any) {
    log.warn("Portal appointment repo wire failed (non-fatal)", { error: paErr.message });
  }

  // Phase 115: Wire DB-backed telehealth room store
  try {
    const trRepo = await import("../platform/db/repo/telehealth-room-repo.js");
    const { initTelehealthRoomRepo } = await import("../telehealth/room-store.js");
    initTelehealthRoomRepo(trRepo);
    log.info("Telehealth room store wired to DB");
  } catch (trErr: any) {
    log.warn("Telehealth room repo wire failed (non-fatal)", { error: trErr.message });
  }

  // Phase 115: Wire DB-backed imaging worklist store
  try {
    const iwRepo = await import("../platform/db/repo/imaging-worklist-repo.js");
    const { initWorklistRepo } = await import("../services/imaging-worklist.js");
    await initWorklistRepo(iwRepo);
    log.info("Imaging worklist store wired to DB");
  } catch (iwErr: any) {
    log.warn("Imaging worklist repo wire failed (non-fatal)", { error: iwErr.message });
  }

  // Phase 115: Wire DB-backed imaging ingest store
  try {
    const iiRepo = await import("../platform/db/repo/imaging-ingest-repo.js");
    const { initIngestRepo } = await import("../services/imaging-ingest.js");
    await initIngestRepo(iiRepo);
    log.info("Imaging ingest store wired to DB");
  } catch (iiErr: any) {
    log.warn("Imaging ingest repo wire failed (non-fatal)", { error: iiErr.message });
  }

  // Phase 115: Wire DB-backed idempotency store
  try {
    const idRepo = await import("../platform/db/repo/idempotency-repo.js");
    const { initIdempotencyRepo } = await import("../middleware/idempotency.js");
    initIdempotencyRepo(idRepo);
    log.info("Idempotency store wired to DB");
  } catch (idErr: any) {
    log.warn("Idempotency repo wire failed (non-fatal)", { error: idErr.message });
  }

  // Phase 121: Wire DB-backed RCM claim store
  try {
    const rcRepo = await import("../platform/db/repo/rcm-claim-repo.js");
    const { initClaimStoreRepo } = await import("../rcm/domain/claim-store.js");
    initClaimStoreRepo(rcRepo);
    log.info("RCM claim store wired to DB");
  } catch (rcErr: any) {
    log.warn("RCM claim repo wire failed (non-fatal)", { error: rcErr.message });
  }

  // Phase 121: Wire DB-backed RCM claim case store
  try {
    const ccRepo = await import("../platform/db/repo/rcm-claim-case-repo.js");
    const { initClaimCaseRepo } = await import("../rcm/claims/claim-store.js");
    initClaimCaseRepo(ccRepo);
    log.info("RCM claim case store wired to DB");
  } catch (ccErr: any) {
    log.warn("RCM claim case repo wire failed (non-fatal)", { error: ccErr.message });
  }

  // Phase 121: Wire DB-backed portal access log store
  try {
    const alRepo = await import("../platform/db/repo/access-log-repo.js");
    const { initAccessLogRepo } = await import("../portal-iam/access-log-store.js");
    initAccessLogRepo(alRepo);
    log.info("Portal access log store wired to DB");
  } catch (alErr: any) {
    log.warn("Portal access log repo wire failed (non-fatal)", { error: alErr.message });
  }

  // Phase 121: Wire DB-backed scheduling request store
  try {
    const srRepo = await import("../platform/db/repo/scheduling-request-repo.js");
    const { initSchedulingRepo } = await import("../adapters/scheduling/vista-adapter.js");
    await initSchedulingRepo(srRepo);
    log.info("Scheduling request store wired to DB");
  } catch (srErr: any) {
    log.warn("Scheduling request repo wire failed (non-fatal)", { error: srErr.message });
  }

  // Phase 109: Seed module catalog + default tenant entitlements from modules.json
  try {
    const { seedModuleCatalogFromConfig } = await import("../modules/module-catalog-seed.js");
    const seedResult = seedModuleCatalogFromConfig();
    log.info("Module catalog seeded", { ...seedResult });
    // Wire DB-backed entitlement provider into module-registry
    const { getEnabledModuleIds } = await import("../platform/db/repo/module-repo.js");
    setDbEntitlementProvider((tenantId: string) => getEnabledModuleIds(tenantId));
  } catch (seedErr: any) {
    log.warn("Module catalog seed failed (non-fatal)", { error: seedErr.message });
  }

  return true;
}

/**
 * Initialize Postgres platform DB and re-wire repos.
 * This overrides the SQLite wiring when STORE_BACKEND=pg.
 */
async function initPostgresLayer(): Promise<void> {
  if (!isPgConfigured()) {
    log.info("Platform PG not configured (SQLite-only mode)", { hint: "Set PLATFORM_PG_URL to enable Postgres" });
    return;
  }

  const pgResult = await initPlatformPg();
  if (!pgResult.ok) {
    log.warn("Platform PG init failed (SQLite fallback active)", {
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

  // Phase 117: Re-wire repos to PG when STORE_BACKEND resolves to "pg"
  const { resolveBackend } = await import("../platform/store-resolver.js");
  const backend = resolveBackend();
  if (backend !== "pg") return;

  // Session repo -> PG (overrides SQLite wiring above)
  try {
    const pgSessionRepoMod = await import("../platform/pg/repo/session-repo.js");
    const { initSessionRepo } = await import("../auth/session-store.js");
    initSessionRepo(pgSessionRepoMod);
    log.info("Session store re-wired to PG (multi-instance safe)");
  } catch (psErr: any) {
    log.warn("PG session repo wire failed (SQLite fallback)", { error: psErr.message });
  }

  // Workqueue repo -> PG (overrides SQLite wiring above)
  try {
    const pgWqRepoMod = await import("../platform/pg/repo/workqueue-repo.js");
    const { initWorkqueueRepo } = await import("../rcm/workqueues/workqueue-store.js");
    initWorkqueueRepo(pgWqRepoMod);
    log.info("Workqueue store re-wired to PG (multi-instance safe)");
  } catch (pwqErr: any) {
    log.warn("PG workqueue repo wire failed (SQLite fallback)", { error: pwqErr.message });
  }

  // Phase 126: RCM claim store -> PG (overrides SQLite wiring above)
  try {
    const pgClaimRepoMod = await import("../platform/pg/repo/rcm-claim-repo.js");
    const { initClaimStoreRepo } = await import("../rcm/domain/claim-store.js");
    initClaimStoreRepo(pgClaimRepoMod);
    log.info("RCM claim store re-wired to PG");
  } catch (rcErr: any) {
    log.warn("PG RCM claim repo wire failed (SQLite fallback)", { error: rcErr.message });
  }

  // Phase 126: RCM claim case store -> PG (overrides SQLite wiring above)
  try {
    const pgCaseRepoMod = await import("../platform/pg/repo/rcm-claim-case-repo.js");
    const { initClaimCaseRepo } = await import("../rcm/claims/claim-store.js");
    initClaimCaseRepo(pgCaseRepoMod);
    log.info("RCM claim case store re-wired to PG");
  } catch (ccErr: any) {
    log.warn("PG RCM claim case repo wire failed (SQLite fallback)", { error: ccErr.message });
  }

  // Phase 126: EDI ack/status store -> PG (new -- no SQLite predecessor)
  try {
    const pgAckRepoMod = await import("../platform/pg/repo/edi-ack-repo.js");
    const { initAckStatusRepo } = await import("../rcm/edi/ack-status-processor.js");
    initAckStatusRepo(pgAckRepoMod);
    log.info("EDI ack/status store wired to PG");
  } catch (ackErr: any) {
    log.warn("PG EDI ack repo wire failed (cache-only fallback)", { error: ackErr.message });
  }

  // Phase 126: EDI pipeline store -> PG (new -- no SQLite predecessor)
  try {
    const pgPipeRepoMod = await import("../platform/pg/repo/edi-pipeline-repo.js");
    const { initPipelineRepo } = await import("../rcm/edi/pipeline.js");
    initPipelineRepo(pgPipeRepoMod);
    log.info("EDI pipeline store wired to PG");
  } catch (pipeErr: any) {
    log.warn("PG EDI pipeline repo wire failed (cache-only fallback)", { error: pipeErr.message });
  }

  // Phase 127: Portal message store -> PG (overrides SQLite wiring above)
  try {
    const pgMsgRepoMod = await import("../platform/pg/repo/pg-portal-message-repo.js");
    const { initMessageRepo } = await import("../services/portal-messaging.js");
    await initMessageRepo(pgMsgRepoMod);
    log.info("Portal messaging store re-wired to PG");
  } catch (pmErr: any) {
    log.warn("PG portal message repo wire failed (SQLite fallback)", { error: pmErr.message });
  }

  // Phase 127: Portal access log store -> PG (overrides SQLite wiring above)
  try {
    const pgAlogRepoMod = await import("../platform/pg/repo/pg-portal-access-log-repo.js");
    const { initAccessLogRepo } = await import("../portal-iam/access-log-store.js");
    initAccessLogRepo(pgAlogRepoMod);
    log.info("Portal access log store re-wired to PG");
  } catch (alErr: any) {
    log.warn("PG portal access log repo wire failed (SQLite fallback)", { error: alErr.message });
  }

  // Phase 127: Portal patient settings store -> PG (new -- no SQLite predecessor)
  try {
    const pgSettingsRepoMod = await import("../platform/pg/repo/pg-portal-patient-setting-repo.js");
    const { initSettingsRepo } = await import("../services/portal-settings.js");
    initSettingsRepo(pgSettingsRepoMod);
    log.info("Portal settings store wired to PG");
  } catch (psErr: any) {
    log.warn("PG portal settings repo wire failed (cache-only fallback)", { error: psErr.message });
  }

  // Phase 127: Telehealth room store -> PG (overrides SQLite wiring above)
  try {
    const pgRoomRepoMod = await import("../platform/pg/repo/pg-telehealth-room-repo.js");
    const { initTelehealthRoomRepo } = await import("../telehealth/room-store.js");
    initTelehealthRoomRepo(pgRoomRepoMod);
    log.info("Telehealth room store re-wired to PG");
  } catch (trErr: any) {
    log.warn("PG telehealth room repo wire failed (SQLite fallback)", { error: trErr.message });
  }

  // Phase 128: Imaging worklist store -> PG (overrides SQLite wiring above)
  try {
    const pgIwRepo = await import("../platform/pg/repo/pg-imaging-worklist-repo.js");
    const { initWorklistRepo } = await import("../services/imaging-worklist.js");
    await initWorklistRepo(pgIwRepo);
    log.info("Imaging worklist store re-wired to PG");
  } catch (iwErr: any) {
    log.warn("PG imaging worklist repo wire failed (SQLite fallback)", { error: iwErr.message });
  }

  // Phase 128: Imaging ingest store -> PG (overrides SQLite wiring above)
  try {
    const pgIiRepo = await import("../platform/pg/repo/pg-imaging-ingest-repo.js");
    const { initIngestRepo } = await import("../services/imaging-ingest.js");
    await initIngestRepo(pgIiRepo);
    log.info("Imaging ingest store re-wired to PG");
  } catch (iiErr: any) {
    log.warn("PG imaging ingest repo wire failed (SQLite fallback)", { error: iiErr.message });
  }

  // Phase 128: Scheduling request store -> PG (overrides SQLite wiring above)
  try {
    const pgSrRepo = await import("../platform/pg/repo/pg-scheduling-request-repo.js");
    const { initSchedulingRepo: initSchedPgRepo } = await import("../adapters/scheduling/vista-adapter.js");
    await initSchedPgRepo(pgSrRepo);
    log.info("Scheduling request store re-wired to PG");
  } catch (srErr: any) {
    log.warn("PG scheduling request repo wire failed (SQLite fallback)", { error: srErr.message });
  }

  // Phase 128: Scheduling booking lock store -> PG (new -- no SQLite predecessor)
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
  // Phase 96B: Load QA flow catalog
  const flowResult = loadFlowCatalog();
  log.info("QA flow catalog loaded", { loaded: flowResult.loaded, errors: flowResult.errors.length });

  // Phase 25: Restore persisted analytics events and start aggregation
  initAnalyticsStore();
  startAggregationJob();

  // Phase 157: Start audit JSONL shipper (if enabled)
  startShipperJob();

  // Phase 25: Initialize ETL writer (non-blocking -- connects to ROcto lazily)
  initEtl();

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

  // Phase 95B: Initialize SQLite platform DB (migrate + seed)
  await initSqliteLayer();

  // Phase 101: Initialize Postgres platform DB (if configured)
  await initPostgresLayer();

  // Start background jobs
  await startBackgroundServices();
}
