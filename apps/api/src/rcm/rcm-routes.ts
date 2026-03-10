/**
 * RCM API Routes -- Revenue Cycle Management + Payer Connectivity
 *
 * Endpoints:
 *   GET  /rcm/health              -- RCM subsystem health
 *   GET  /rcm/payers              -- List payers (with filter/pagination)
 *   GET  /rcm/payers/:id          -- Get single payer
 *   POST /rcm/payers              -- Create/update payer (admin)
 *   PATCH /rcm/payers/:id         -- Partial update payer (Phase 40)
 *   POST /rcm/payers/import       -- CSV payer import (Phase 40)
 *   GET  /rcm/payers/stats        -- Payer registry statistics
 *   GET  /rcm/claims              -- List claims (with filter/pagination)
 *   GET  /rcm/claims/:id          -- Get single claim
 *   POST /rcm/claims/draft        -- Create draft claim
 *   POST /rcm/claims/:id/validate -- Validate claim (returns edits + score)
 *   POST /rcm/claims/:id/submit   -- Submit claim to payer (safety-gated)
 *   POST /rcm/claims/:id/export   -- Export claim as X12 artifact (Phase 40)
 *   POST /rcm/claims/:id/transition -- Manual claim transition
 *   GET  /rcm/claims/:id/timeline -- Claim audit timeline
 *   GET  /rcm/claims/stats        -- Claim statistics
 *   GET  /rcm/submission-safety   -- Submission safety status (Phase 40)
 *   POST /rcm/eligibility/check   -- Eligibility inquiry (270/271)
 *   GET  /rcm/edi/pipeline        -- EDI pipeline entries
 *   GET  /rcm/edi/pipeline/stats  -- EDI pipeline statistics
 *   GET  /rcm/connectors          -- List registered connectors
 *   GET  /rcm/connectors/health   -- Connector health check
 *   GET  /rcm/validation/rules    -- List validation rules
 *   GET  /rcm/remittances         -- List remittances
 *   POST /rcm/remittances/import  -- Import remittance (835)
 *   GET  /rcm/audit               -- RCM audit trail
 *   GET  /rcm/audit/verify        -- Verify audit chain integrity
 *   GET  /rcm/audit/stats         -- Audit statistics
 *   GET  /rcm/directory/stats     -- Payer directory statistics (Phase 44)
 *   GET  /rcm/directory/importers -- List directory importers (Phase 44)
 *   GET  /rcm/directory/history   -- Directory refresh history (Phase 44)
 *   GET  /rcm/directory/payers    -- List directory payers (Phase 44)
 *   GET  /rcm/directory/payers/:id-- Single directory payer (Phase 44)
 *   POST /rcm/directory/refresh   -- Refresh directory from importers (Phase 44)
 *   POST /rcm/directory/import/:id-- Run single importer (Phase 44)
 *   GET  /rcm/enrollment          -- List enrollment packets (Phase 44)
 *   GET  /rcm/enrollment/:id      -- Get enrollment packet (Phase 44)
 *   POST /rcm/enrollment/:id      -- Create/update enrollment packet (Phase 44)
 *   POST /rcm/claims/:id/route    -- Resolve claim route (Phase 44)
 *   GET  /rcm/routing/resolve     -- Resolve route by payerId (Phase 44)
 *   GET  /rcm/gateways/readiness       -- Unified gateway readiness (Phase 46)
 *   GET  /rcm/gateways/readiness/:id   -- Single gateway readiness (Phase 46)
 *   GET  /rcm/gateways/ids             -- List gateway IDs (Phase 46)
 *   GET  /rcm/conformance/gateways     -- All gateway conformance (Phase 46)
 *   GET  /rcm/conformance/gateways/:id -- Single gateway conformance (Phase 46)
 *   POST /rcm/conformance/gateways/:id/validate -- Validate payload (Phase 46)
 *
 * Phase 38 -- RCM + Payer Connectivity
 * Phase 40 -- Submission safety, X12 serializer, CSV import, export artifacts
 * Phase 46 -- National gateway packs (PH eClaims 3.0, AU ECLIPSE, SG NPHC, NZ ACC)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Domain
import { createDraftClaim, transitionClaim, isValidTransition } from './domain/claim.js';
import type { ClaimStatus } from './domain/claim.js';
import {
  storeClaim,
  getClaim,
  updateClaim,
  listClaims,
  getClaimStats,
  storeRemittance,
  getRemittance,
  listRemittances,
  matchRemittanceToClaim,
  getStoreStats,
} from './domain/claim-store.js';

// Payer registry
import {
  initPayerRegistry,
  getPayer,
  listPayers,
  upsertPayer,
  getPayerStats,
} from './payer-registry/registry.js';

// Validation
import { validateClaim, describeValidationRules } from './validation/engine.js';

// EDI pipeline
import {
  createPipelineEntry,
  advancePipelineStage,
  listPipelineEntries,
  getPipelineStats,
  buildClaim837FromDomain,
} from './edi/pipeline.js';

// Connectors
import {
  registerConnector,
  listConnectors,
  getConnectorForMode,
  getAllConnectors,
} from './connectors/types.js';
import { ClearinghouseConnector } from './connectors/clearinghouse-connector.js';
import { PhilHealthConnector } from './connectors/philhealth-connector.js';
import { SandboxConnector } from './connectors/sandbox-connector.js';
import { PortalBatchConnector } from './connectors/portal-batch-connector.js';
import { OfficeAllyConnector } from './connectors/officeally-connector.js';
import { AvailityConnector } from './connectors/availity-connector.js';
import { StediConnector } from './connectors/stedi-connector.js';
import { EclipseAuConnector } from './connectors/eclipse-au-connector.js';
import { AccNzConnector } from './connectors/acc-nz-connector.js';
import { NphcSgConnector } from './connectors/nphc-sg-connector.js';

// Audit
import {
  appendRcmAudit,
  getRcmAuditEntries,
  verifyRcmAuditChain,
  getRcmAuditStats,
} from './audit/rcm-audit.js';

// X12 serializer (Phase 40)
import { serialize837, exportX12Bundle } from './edi/x12-serializer.js';

// Job queue (Phase 40 Superseding)
import { getJobQueue } from './jobs/queue.js';
import type { RcmJobType } from './jobs/queue.js';

// Payer adapters (Phase 69)
import {
  registerPayerAdapter,
  listPayerAdapters,
  getAllPayerAdapters,
} from './adapters/payer-adapter.js';
import { SandboxPayerAdapter } from './adapters/sandbox-adapter.js';
import { X12ClearinghouseAdapter } from './adapters/x12-adapter.js';
import { PhilHealthAdapter } from './adapters/philhealth-adapter.js';

// Polling scheduler + pollers (Phase 69)
import { getPollingScheduler } from './jobs/polling-scheduler.js';
import {
  getEligibilityPollerConfig,
  getEligibilityResultsSlice,
} from './jobs/eligibility-poller.js';
import {
  getClaimStatusPollerConfig,
  getClaimStatusResultsSlice,
} from './jobs/claim-status-poller.js';
// Phase 142: Denial followup tick + remittance import job
import { getDenialFollowupConfig } from './jobs/denial-followup-tick.js';
import { getRemittanceImportConfig } from './jobs/remittance-import-job.js';

// Payer catalog importers (Phase 40 Superseding)
import { JsonPayerImporter } from './importers/payer-catalog-importer.js';

// VistA binding points (Phase 40 Superseding)
import {
  buildClaimFromVistaEncounter,
  buildClaimFromEncounterData,
  getChargeCaptureCandidates,
  postEraToVista,
} from './vistaBindings/index.js';

// Phase 42 -- Claim Draft Builder from VistA
import {
  buildClaimDraftFromVista,
  getVistaCoverage,
  type RpcCaller,
} from './vistaBindings/buildClaimDraftFromVista.js';
import { validateCredentials } from '../vista/config.js';
import { connect, disconnect, callRpc } from '../vista/rpcBrokerClient.js';
import { log } from '../lib/logger.js';
import { requirePermission, requireRcmWrite, requireRcmAdmin } from '../auth/rbac.js';

// Phase 43 -- Ack/Status/Remit processors, workqueues, payer rules
import {
  ingestAck,
  ingestStatusUpdate,
  listAcks,
  getAck,
  getAcksForClaim,
  getAckStats,
  listStatusUpdates,
  getStatusUpdatesForClaim,
  getStatusStats,
} from './edi/ack-status-processor.js';
import {
  ingestRemittance as processRemittance,
  getRemitProcessorStats,
} from './edi/remit-processor.js';
import {
  getWorkqueueItem,
  updateWorkqueueItem,
  listWorkqueueItems,
  getWorkqueueItemsForClaim,
  getWorkqueueStats,
} from './workqueues/workqueue-store.js';
import {
  seedDefaultRules,
  addRule,
  getRule,
  updateRule as updatePayerRule,
  deleteRule,
  listRules,
  evaluateRules,
  getRuleStats,
} from './rules/payer-rules.js';
import { lookupCarc, lookupRarc, CARC_CODES, RARC_CODES } from './reference/carc-rarc.js';

// Phase 44 -- Payer Directory Engine + Jurisdiction Packs
import {
  runDirectoryRefresh,
  getDirectoryPayer,
  listDirectoryPayers,
  getDirectoryStats,
  getRefreshHistory,
  getEnrollmentPacket,
  upsertEnrollmentPacket,
  listEnrollmentPackets,
} from './payerDirectory/normalization.js';
import { resolveRoute, isRouteNotFound } from './payerDirectory/routing.js';
import {
  runAllImporters,
  runImportersByCountry,
  listImporters,
  getImporter,
} from './payerDirectory/importers/index.js';
import type { EnrollmentPacket, EnrollmentStatus } from './payerDirectory/types.js';

// Phase 45 -- Transaction Correctness Engine
import {
  buildEnvelope,
  storeTransaction,
  getTransaction as getTxn,
  transitionTransaction,
  listTransactions as listTxns,
  getTransactionStats,
  getActiveTranslator,
  listTranslators,
  getConnectivityProfile,
  getConnectivityHealth,
  checkPreTransmitGates,
  checkAckGates,
  processRetry,
  getDLQTransactions,
  retryFromDLQ,
  buildReconciliationSummary,
  buildReconciliationStats,
} from './transactions/index.js';
import type { TransactionState } from './transactions/index.js';
import type { X12TransactionSet } from './edi/types.js';

// Phase 46 -- National Gateway Packs
import { probeAllGateways, probeGateway, getGatewayIds } from './gateways/readiness.js';
import type { GatewayId } from './gateways/readiness.js';
import {
  getAllGatewayConformance,
  getGatewayConformance,
  validatePayloadConformance,
} from './conformance/gateway-conformance.js';

/* --- Submission safety (Phase 40) --------------------------------- */

function isSubmissionEnabled(): boolean {
  return process.env.CLAIM_SUBMISSION_ENABLED === 'true';
}

function getSubmissionSafetyStatus(): {
  enabled: boolean;
  mode: 'live' | 'export_only';
  reason: string;
} {
  const enabled = isSubmissionEnabled();
  return {
    enabled,
    mode: enabled ? 'live' : 'export_only',
    reason: enabled
      ? 'CLAIM_SUBMISSION_ENABLED=true -- live submission active'
      : 'CLAIM_SUBMISSION_ENABLED is not true -- claims will be exported as artifacts, not submitted to payers',
  };
}

/* --- Initialize subsystems ---------------------------------------- */

let initialized = false;

function resolveTenantId(request: FastifyRequest): string {
  const requestTenantId = (request as any).tenantId || (request as any).session?.tenantId;
  if (typeof requestTenantId === 'string' && requestTenantId.trim().length > 0) {
    return requestTenantId.trim();
  }
  const headerTenantId = request.headers['x-tenant-id'];
  if (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0) {
    return headerTenantId.trim();
  }
  return 'default';
}

function resolveExplicitTenantId(request: FastifyRequest): string | null {
  const headerTenantId = request.headers['x-tenant-id'];
  if (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0) {
    return headerTenantId.trim();
  }
  const requestTenantId = (request as any).tenantId;
  if (typeof requestTenantId === 'string' && requestTenantId.trim().length > 0) {
    return requestTenantId.trim();
  }
  const sessionTenantId = (request as any).session?.tenantId;
  if (typeof sessionTenantId === 'string' && sessionTenantId.trim().length > 0) {
    return sessionTenantId.trim();
  }
  return null;
}

function requireTenantId(request: FastifyRequest, reply: FastifyReply): string | null {
  const tenantId = resolveExplicitTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Load payer seed data
  initPayerRegistry();

  // Seed payer rules (Phase 43)
  seedDefaultRules();

  // Phase 44 -- Initialize payer directory from authoritative importers
  try {
    const importResults = runAllImporters();
    runDirectoryRefresh(importResults, 'system');
  } catch (e: unknown) {
    log.warn('Payer directory initialization failed (non-fatal)', { err: String(e) });
  }

  // Register connectors
  const sandbox = new SandboxConnector();
  await sandbox.initialize();
  registerConnector(sandbox);

  const clearinghouse = new ClearinghouseConnector();
  await clearinghouse.initialize();
  registerConnector(clearinghouse);

  const philhealth = new PhilHealthConnector();
  await philhealth.initialize();
  registerConnector(philhealth);

  const portalBatch = new PortalBatchConnector();
  await portalBatch.initialize();
  registerConnector(portalBatch);

  // Phase 40 (Superseding) -- Global connectors
  const officeAlly = new OfficeAllyConnector();
  await officeAlly.initialize();
  registerConnector(officeAlly);

  const availity = new AvailityConnector();
  await availity.initialize();
  registerConnector(availity);

  const stedi = new StediConnector();
  await stedi.initialize();
  registerConnector(stedi);

  const eclipseAu = new EclipseAuConnector();
  await eclipseAu.initialize();
  registerConnector(eclipseAu);

  const accNz = new AccNzConnector();
  await accNz.initialize();
  registerConnector(accNz);

  const nphcSg = new NphcSgConnector();
  await nphcSg.initialize();
  registerConnector(nphcSg);

  // Phase 69 -- Payer adapters
  registerPayerAdapter(new SandboxPayerAdapter());
  registerPayerAdapter(new X12ClearinghouseAdapter());
  registerPayerAdapter(new PhilHealthAdapter());

  // Phase 69 -- Polling scheduler
  const scheduler = getPollingScheduler();
  scheduler.registerJob(getEligibilityPollerConfig());
  scheduler.registerJob(getClaimStatusPollerConfig());
  // Phase 142: Register denial followup tick + remittance import processor
  scheduler.registerJob(getDenialFollowupConfig());
  scheduler.registerJob(getRemittanceImportConfig());
  // Scheduler starts only if env vars enable it
  scheduler.start();
}

/* --- Route plugin ------------------------------------------------- */

export default async function rcmRoutes(server: FastifyInstance): Promise<void> {
  await ensureInitialized();

  /* -- Phase 49: RBAC guard for all RCM routes -------------------- */
  /*                                                                   */
  /* - GET (reads): require rcm:read (all authenticated clinical roles)*/
  /* - POST/PATCH/PUT/DELETE: require rcm:write (billing, admin)       */
  /* - Payer management + audit admin: require rcm:admin (admin only)  */
  /*                                                                   */
  /* Admin-only routes (rcm:admin):                                    */
  /*   POST /rcm/payers, PATCH /rcm/payers/:id, POST /rcm/payers/import*/
  /*   POST /rcm/rules, PATCH /rcm/rules/:id, DELETE /rcm/rules/:id   */
  /*   POST /rcm/directory/refresh, POST /rcm/directory/import/:id     */
  /*   POST /rcm/payers/import/json                                    */
  /* ------------------------------------------------------------------- */
  server.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    const url = request.url.split('?')[0];
    if (!url.startsWith('/rcm/')) return;

    // Health is open to any authenticated user (session check in security.ts)
    if (url === '/rcm/health') return;

    const session = (request as any).session;
    if (!session) return; // security.ts already rejected unauthenticated

    const method = request.method;

    // Admin-only routes
    const adminRoutes = ['/rcm/payers/import', '/rcm/payers/import/json', '/rcm/directory/refresh'];
    const adminRoutePatterns = [
      /^\/rcm\/payers\/[^/]+$/, // PATCH/PUT on specific payer
      /^\/rcm\/rules\/[^/]+$/, // PATCH/DELETE on specific rule
      /^\/rcm\/directory\/import\//, // Import specific directory
    ];
    if (method === 'POST' && (url === '/rcm/payers' || adminRoutes.includes(url))) {
      requireRcmAdmin(session, reply, {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
      });
      return;
    }
    if (
      (method === 'PATCH' || method === 'DELETE') &&
      adminRoutePatterns.some((p) => p.test(url))
    ) {
      requireRcmAdmin(session, reply, {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
      });
      return;
    }
    if (method === 'POST' && url === '/rcm/rules') {
      requireRcmAdmin(session, reply, {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
      });
      return;
    }

    // Write routes (billing + admin)
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
      requireRcmWrite(session, reply, {
        requestId: (request as any).requestId,
        sourceIp: request.ip,
      });
      return;
    }

    // Read routes -- rcm:read (all authenticated clinical roles)
    requirePermission(session, 'rcm:read', reply, {
      requestId: (request as any).requestId,
      sourceIp: request.ip,
    });
  });

  // ----- Health ----------------------------------------------------
  server.get('/rcm/health', async (request: FastifyRequest) => {
    const tenantId = resolveTenantId(request);
    const payerStats = getPayerStats();
    const claimStats = getClaimStats(tenantId);
    const pipelineStats = getPipelineStats(tenantId);
    const connectorList = listConnectors();

    const healthChecks: Record<string, { healthy: boolean; details?: string }> = {};
    for (const [id, connector] of getAllConnectors()) {
      healthChecks[id] = await connector.healthCheck();
    }

    return {
      ok: true,
      subsystem: 'rcm',
      payers: payerStats,
      claims: claimStats,
      pipeline: pipelineStats,
      connectors: { registered: connectorList.length, health: healthChecks },
      timestamp: new Date().toISOString(),
    };
  });

  // ----- Payers ---------------------------------------------------
  server.get('/rcm/payers/stats', async () => {
    return { ok: true, stats: getPayerStats() };
  });

  server.get('/rcm/payers', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const result = listPayers({
      country: q.country as any,
      integrationMode: q.integrationMode as any,
      status: q.status as any,
      search: q.search,
      limit: Number(q.limit ?? 50),
      offset: Number(q.offset ?? 0),
    });
    return { ok: true, ...result };
  });

  server.get('/rcm/payers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const payer = getPayer(id);
    if (!payer) return reply.code(404).send({ ok: false, error: 'Payer not found' });
    return { ok: true, payer };
  });

  server.post('/rcm/payers', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.payerId || !body.name) {
      return reply.code(400).send({ ok: false, error: 'payerId and name are required' });
    }
    upsertPayer(body);
    const payer = getPayer(body.payerId);
    appendRcmAudit('payer.created', { payerId: body.payerId, detail: { name: body.name } });
    return { ok: true, payer };
  });

  // ----- PATCH Payer (Phase 40) -----------------------------------
  server.patch('/rcm/payers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = getPayer(id);
    if (!existing) return reply.code(404).send({ ok: false, error: 'Payer not found' });

    const body = (request.body as any) || {};
    const merged = {
      ...existing,
      ...body,
      // Pin immutable fields -- cannot be overwritten by user input
      payerId: id,
      createdAt: existing.createdAt,
      country: existing.country,
    };
    upsertPayer(merged);
    appendRcmAudit('payer.updated', { payerId: id, detail: { fields: Object.keys(body) } });
    return { ok: true, payer: getPayer(id) };
  });

  // ----- CSV Payer Import (Phase 40) ------------------------------
  server.post('/rcm/payers/import', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const csvText = body.csv;
    if (!csvText || typeof csvText !== 'string') {
      return reply.code(400).send({ ok: false, error: 'csv field (string) is required' });
    }

    const lines = csvText
      .split('\n')
      .map((l: string) => l.trim())
      .filter(Boolean);
    if (lines.length < 2) {
      return reply
        .code(400)
        .send({ ok: false, error: 'CSV must have header + at least one data row' });
    }

    const headers = lines[0].split(',').map((h: string) => h.trim().toLowerCase());
    const payerIdIdx = headers.indexOf('payerid');
    const nameIdx = headers.indexOf('name');
    if (payerIdIdx === -1 || nameIdx === -1) {
      return reply.code(400).send({ ok: false, error: 'CSV must have payerId and name columns' });
    }

    const imported: string[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map((c: string) => c.trim());
      const payerId = cols[payerIdIdx];
      const name = cols[nameIdx];
      if (!payerId || !name) {
        errors.push(`Row ${i + 1}: missing payerId or name`);
        continue;
      }

      const payer: Record<string, unknown> = { payerId, name };
      // Map remaining columns
      for (let j = 0; j < headers.length; j++) {
        if (j !== payerIdIdx && j !== nameIdx && cols[j]) {
          payer[headers[j]] = cols[j];
        }
      }
      // Set defaults
      if (!payer.country) payer.country = 'US';
      if (!payer.status) payer.status = 'active';
      if (!payer.integrationMode) payer.integrationMode = 'not_classified';

      upsertPayer(payer as any);
      imported.push(payerId);
    }

    appendRcmAudit('payer.created', { detail: { csvImport: true, count: imported.length } });
    return { ok: true, imported: imported.length, errors, payerIds: imported };
  });

  // ----- Claims ----------------------------------------------------
  server.get('/rcm/claims/stats', async (request: FastifyRequest) => {
    const tenantId = resolveTenantId(request);
    return { ok: true, stats: getClaimStats(tenantId), store: getStoreStats() };
  });

  server.get('/rcm/claims', async (request: FastifyRequest) => {
    const tenantId = resolveTenantId(request);
    const q = request.query as Record<string, string>;
    const result = await listClaims(tenantId, {
      status: q.status as ClaimStatus | undefined,
      patientDfn: q.patientDfn,
      payerId: q.payerId,
      limit: Number(q.limit ?? 50),
      offset: Number(q.offset ?? 0),
    });
    return { ok: true, ...result };
  });

  server.get('/rcm/claims/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = resolveTenantId(request);
    const { id } = request.params as { id: string };
    const claim = await getClaim(id, tenantId);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });
    return { ok: true, claim };
  });

  server.post('/rcm/claims/draft', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.patientDfn || !body.payerId) {
      return reply.code(400).send({ ok: false, error: 'patientDfn and payerId are required' });
    }

    const session = (request as any).session;
    const claim = createDraftClaim({
      tenantId: resolveTenantId(request),
      patientDfn: body.patientDfn,
      payerId: body.payerId,
      claimType: body.claimType ?? 'professional',
      totalCharge: body.totalCharge ?? 0,
      dateOfService:
        body.dateOfService ?? body.serviceDate ?? new Date().toISOString().slice(0, 10),
      diagnoses: body.diagnoses ?? body.diagnosisCodes ?? [],
      lines: body.lines ?? body.serviceLines ?? [],
      subscriberId: body.subscriberId ?? body.subscriberMemberId,
      patientFirstName: body.patientFirstName,
      patientLastName: body.patientLastName,
      patientName: body.patientName,
      patientDob: body.patientDob,
      patientGender: body.patientGender,
      billingProviderNpi: body.billingProviderNpi,
      facilityName: body.facilityName,
      facilityTaxId: body.facilityTaxId,
      payerName: body.payerName,
      vistaChargeIen: body.vistaChargeIen,
      vistaArIen: body.vistaArIen,
      isDemo: body.isDemo,
      actor: session?.duz ?? 'unknown',
    });

    storeClaim(claim);
    appendRcmAudit('claim.created', {
      claimId: claim.id,
      payerId: claim.payerId,
      userId: session?.duz,
      patientDfn: claim.patientDfn,
      detail: { totalCharge: claim.totalCharge, claimType: claim.claimType },
    });

    return reply.code(201).send({ ok: true, claim });
  });

  server.post('/rcm/claims/:id/validate', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = resolveTenantId(request);
    const { id } = request.params as { id: string };
    const claim = await getClaim(id, tenantId);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

    const result = validateClaim(claim);

    // Transition to validated if clean
    if (result.valid && claim.status === 'draft') {
      const session = (request as any).session;
      const updated = transitionClaim(claim, 'validated', session?.duz ?? 'system');
      updated.validationResult = result;
      updateClaim(updated);
      appendRcmAudit('claim.validated', {
        claimId: id,
        detail: { readinessScore: result.readinessScore, editsCount: result.edits.length },
      });
    } else {
      // Store validation result even if not clean
      claim.validationResult = result;
      updateClaim(claim);
      appendRcmAudit('validation.run', {
        claimId: id,
        detail: {
          valid: result.valid,
          readinessScore: result.readinessScore,
          blockers: result.edits.filter((e) => e.blocksSubmission).length,
        },
      });
    }

    return { ok: true, validation: result };
  });

  server.post('/rcm/claims/:id/submit', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = resolveTenantId(request);
    const { id } = request.params as { id: string };
    const idempotencyKey = (request.headers as Record<string, string>)['x-idempotency-key'] ?? '';
    const claim = await getClaim(id, tenantId);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

    // Idempotency guard: if already submitted with same key, return cached result
    if (
      idempotencyKey &&
      claim.status === 'submitted' &&
      claim.auditTrail?.some((e: any) => e.idempotencyKey === idempotencyKey)
    ) {
      return { ok: true, submitted: true, idempotent: true, claim };
    }

    // Demo claims can never be submitted
    if (claim.isDemo) {
      return reply.code(403).send({
        ok: false,
        error: 'Demo claims cannot be submitted to payers. Use /rcm/claims/:id/export instead.',
        isDemo: true,
      });
    }

    // Must be validated or ready_to_submit
    if (claim.status !== 'validated' && claim.status !== 'ready_to_submit') {
      return reply.code(400).send({
        ok: false,
        error: `Claim status is '${claim.status}' -- must be 'validated' or 'ready_to_submit' before submission`,
      });
    }

    // --- Submission safety gate (Phase 40) -----------------------
    const safety = getSubmissionSafetyStatus();
    if (!safety.enabled) {
      // Export-only mode: generate X12 artifact and transition to ready_to_submit
      const payer = getPayer(claim.payerId);
      if (!payer) {
        return reply.code(400).send({ ok: false, error: `Payer '${claim.payerId}' not found` });
      }

      const edi837 = buildClaim837FromDomain(claim);
      const x12Wire = serialize837(edi837, { usageIndicator: 'T' });
      const exportResult = await exportX12Bundle(
        x12Wire,
        claim.id,
        claim.claimType === 'institutional' ? '837I' : '837P'
      );

      const session = (request as any).session;
      let updated = claim;
      if (claim.status === 'validated') {
        updated = transitionClaim(
          claim,
          'ready_to_submit',
          session?.duz ?? 'system',
          'CLAIM_SUBMISSION_ENABLED=false -- exported as artifact'
        );
      }
      updated = { ...updated, exportArtifactPath: exportResult.path };
      updateClaim(updated);

      appendRcmAudit('claim.transition', {
        claimId: id,
        detail: {
          safetyMode: 'export_only',
          exportPath: exportResult.path,
          segmentCount: exportResult.segmentCount,
          byteSize: exportResult.byteSize,
        },
      });

      return {
        ok: true,
        submitted: false,
        safetyMode: 'export_only',
        message:
          'Claim exported as X12 artifact (CLAIM_SUBMISSION_ENABLED=false). Review artifact before enabling live submission.',
          claim: await getClaim(id, tenantId),
        exportArtifact: exportResult,
      };
    }

    // Find connector for payer
    const payer = getPayer(claim.payerId);
    if (!payer) {
      return reply.code(400).send({ ok: false, error: `Payer '${claim.payerId}' not found` });
    }

    const connector =
      getConnectorForMode(payer.integrationMode) ?? getConnectorForMode('clearinghouse_edi');
    if (!connector) {
      return reply.code(500).send({ ok: false, error: 'No connector available for payer' });
    }

    // Build EDI and submit
    const edi837 = buildClaim837FromDomain(claim);
    const payload = JSON.stringify(edi837); // In production: serialize to X12 wire format

    const entry = createPipelineEntry(
      claim.tenantId || tenantId,
      claim.id,
      claim.claimType === 'institutional' ? '837I' : '837P',
      connector.id,
      claim.payerId
    );

    advancePipelineStage(entry.id, 'validate', { outbound: payload });
    advancePipelineStage(entry.id, 'enqueue');

    const result = await connector.submit(
      claim.claimType === 'institutional' ? '837I' : '837P',
      payload,
      { claimId: claim.id, chargeAmount: String(claim.totalCharge) }
    );

    if (result.success) {
      advancePipelineStage(entry.id, 'transmit');
      advancePipelineStage(entry.id, 'ack_pending');

      const session2 = (request as any).session;
      const updated = transitionClaim(claim, 'submitted', session2?.duz ?? 'system');
      updated.submittedAt = new Date().toISOString();
      updated.pipelineEntryId = entry.id;
      updateClaim(updated);

      appendRcmAudit('claim.submitted', {
        claimId: id,
        payerId: claim.payerId,
        detail: {
          connector: connector.id,
          transactionId: result.transactionId,
          pipelineEntryId: entry.id,
          idempotencyKey: idempotencyKey || undefined,
        },
      });

      return {
        ok: true,
        submitted: true,
        claim: await getClaim(id, tenantId),
        pipelineEntry: entry,
        connectorResult: result,
      };
    } else {
      advancePipelineStage(entry.id, 'error', { errors: result.errors });

      appendRcmAudit('edi.error', {
        claimId: id,
        detail: { connector: connector.id, errors: result.errors },
      });

      return reply.code(502).send({
        ok: false,
        error: 'Claim submission failed at connector',
        connectorResult: result,
      });
    }
  });

  server.post(
    '/rcm/claims/:id/transition',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = resolveTenantId(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const { newStatus, reason } = body;

      if (!newStatus) {
        return reply.code(400).send({ ok: false, error: 'newStatus is required' });
      }

      const claim = await getClaim(id, tenantId);
      if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

      if (!isValidTransition(claim.status, newStatus)) {
        return reply.code(400).send({
          ok: false,
          error: `Invalid transition: ${claim.status} -> ${newStatus}`,
        });
      }

      const session = (request as any).session;
      const updated = transitionClaim(claim, newStatus, session?.duz ?? 'system', reason);
      if (!updated) {
        return reply.code(400).send({ ok: false, error: 'Transition failed' });
      }

      updateClaim(updated);
      appendRcmAudit('claim.transition', {
        claimId: id,
        detail: { from: claim.status, to: newStatus, reason },
      });

      return { ok: true, claim: updated };
    }
  );

  server.get('/rcm/claims/:id/timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = resolveTenantId(request);
    const { id } = request.params as { id: string };
    const claim = await getClaim(id, tenantId);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

    const auditEntries = getRcmAuditEntries({ claimId: id, limit: 1000 });
    return { ok: true, claimId: id, timeline: auditEntries.items };
  });

  // ----- Export Claim as X12 Artifact (Phase 40) ------------------
  server.post('/rcm/claims/:id/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = resolveTenantId(request);
    const { id } = request.params as { id: string };
    const claim = await getClaim(id, tenantId);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

    if (claim.status === 'draft') {
      return reply.code(400).send({
        ok: false,
        error: 'Validate the claim before exporting',
      });
    }

    const payer = getPayer(claim.payerId);
    if (!payer)
      return reply.code(400).send({ ok: false, error: `Payer '${claim.payerId}' not found` });

    const edi837 = buildClaim837FromDomain(claim);
    const x12Wire = serialize837(edi837, { usageIndicator: 'T' });
    const exportResult = await exportX12Bundle(
      x12Wire,
      claim.id,
      claim.claimType === 'institutional' ? '837I' : '837P'
    );

    const updated = { ...claim, exportArtifactPath: exportResult.path };
    updateClaim(updated);

    appendRcmAudit('claim.transition', {
      claimId: id,
      detail: { action: 'export', exportPath: exportResult.path },
    });

    return { ok: true, claim: await getClaim(id, tenantId), exportArtifact: exportResult };
  });

  // ----- Submission Safety Status (Phase 40) ----------------------
  server.get('/rcm/submission-safety', async () => {
    const safety = getSubmissionSafetyStatus();
    return { ok: true, ...safety };
  });

  // ----- Eligibility (Phase 69 route removed -- superseded by Phase 100) -----
  // Phase 100 registers POST /rcm/eligibility/check in eligibility/routes.ts
  // with adapter-first provenance tracking + durable SQLite persistence.

  // ----- EDI Pipeline ---------------------------------------------
  server.get('/rcm/edi/pipeline', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as Record<string, string>;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const result = listPipelineEntries({
      tenantId,
      stage: q.stage as any,
      payerId: q.payerId,
      transactionSet: q.transactionSet as any,
      limit: Number(q.limit ?? 50),
      offset: Number(q.offset ?? 0),
    });
    return { ok: true, ...result };
  });

  server.get('/rcm/edi/pipeline/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return { ok: true, stats: getPipelineStats(tenantId) };
  });

  // ----- Connectors -----------------------------------------------
  server.get('/rcm/connectors', async () => {
    return { ok: true, connectors: listConnectors() };
  });

  server.get('/rcm/connectors/health', async () => {
    const healthChecks: Record<string, { healthy: boolean; details?: string }> = {};
    for (const [id, connector] of getAllConnectors()) {
      healthChecks[id] = await connector.healthCheck();
    }
    return { ok: true, health: healthChecks };
  });

  // ----- Validation Rules -----------------------------------------
  server.get('/rcm/validation/rules', async () => {
    return { ok: true, rules: describeValidationRules() };
  });

  // ----- Remittances ----------------------------------------------
  server.get('/rcm/remittances', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const result = await listRemittances(
      resolveTenantId(request),
      Number(q.limit ?? 50),
      Number(q.offset ?? 0)
    );
    return { ok: true, ...result };
  });

  server.post('/rcm/remittances/import', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.payerId || !body.checkNumber || body.paymentAmount === undefined) {
      return reply
        .code(400)
        .send({ ok: false, error: 'payerId, checkNumber, and paymentAmount are required' });
    }
    if (body.claimId) {
      const claim = await getClaim(body.claimId, resolveTenantId(request));
      if (!claim) {
        return reply.code(404).send({ ok: false, error: 'Claim not found' });
      }
    }

    const now = new Date().toISOString();
    const remittance: import('./domain/remit.js').Remittance = {
      id: `remit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: resolveTenantId(request),
      status: 'received',
      payerId: body.payerId,
      payerName: body.payerName ?? getPayer(body.payerId)?.name ?? 'Unknown',
      checkNumber: body.checkNumber,
      checkDate: body.paymentDate ?? now.slice(0, 10),
      totalCharged: body.totalCharged ?? body.paymentAmount,
      totalPaid: body.paymentAmount,
      totalAdjusted: body.totalAdjusted ?? 0,
      totalPatientResponsibility: body.totalPatientResponsibility ?? 0,
      serviceLines: body.serviceLines ?? [],
      isMock: true,
      importedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    storeRemittance(remittance);

    // Auto-match to claims if claimId provided
    let matched = false;
    if (body.claimId) {
      matched = await matchRemittanceToClaim(remittance.id, body.claimId);
    }

    appendRcmAudit('remit.received', {
      payerId: remittance.payerId,
      detail: {
        remittanceId: remittance.id,
        checkNumber: remittance.checkNumber,
        amount: remittance.totalPaid,
        autoMatched: matched,
      },
    });

    return reply.code(201).send({
      ok: true,
      remittance,
      autoMatched: matched,
    });
  });

  // ----- Audit ----------------------------------------------------
  server.get('/rcm/audit', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const result = getRcmAuditEntries({
      claimId: q.claimId,
      action: q.action as any,
      since: q.since,
      limit: Number(q.limit ?? 50),
      offset: Number(q.offset ?? 0),
    });
    return { ok: true, ...result };
  });

  server.get('/rcm/audit/verify', async () => {
    const result = verifyRcmAuditChain();
    return { ok: result.valid, ...result };
  });

  server.get('/rcm/audit/stats', async () => {
    return { ok: true, stats: getRcmAuditStats() };
  });

  // ----- Job Queue (Phase 40 Superseding) -------------------------
  server.get('/rcm/jobs', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const queue = getJobQueue();
    const jobs = await queue.listJobs({
      status: q.status as any,
      type: q.type as any,
      limit: Number(q.limit ?? 50),
      offset: Number(q.offset ?? 0),
    });
    return { ok: true, ...jobs };
  });

  server.get('/rcm/jobs/stats', async () => {
    const queue = getJobQueue();
    return { ok: true, stats: await queue.getStats() };
  });

  server.get('/rcm/jobs/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const queue = getJobQueue();
    const job = await queue.getJob(id);
    if (!job) return reply.code(404).send({ ok: false, error: 'Job not found' });
    return { ok: true, job };
  });

  server.post('/rcm/jobs/:id/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const queue = getJobQueue();
    try {
      await queue.cancel(id);
      appendRcmAudit('job.cancelled', { detail: { jobId: id } });
      return { ok: true, message: 'Job cancelled' };
    } catch {
      return reply.code(404).send({ ok: false, error: 'Job not found or not cancellable' });
    }
  });

  server.post('/rcm/jobs/enqueue', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { type, payload, priority, idempotencyKey } = body;
    if (!type || !payload) {
      return reply.code(400).send({ ok: false, error: 'type and payload are required' });
    }
    const validTypes: RcmJobType[] = [
      'CLAIM_SUBMIT',
      'ELIGIBILITY_CHECK',
      'STATUS_POLL',
      'ERA_INGEST',
      'ACK_PROCESS',
    ];
    if (!validTypes.includes(type)) {
      return reply
        .code(400)
        .send({ ok: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }
    const queue = getJobQueue();
    const jobId = await queue.enqueue({ type, payload, priority, idempotencyKey });
    appendRcmAudit('job.enqueued', { detail: { jobId, type, priority } });
    return reply.code(201).send({ ok: true, jobId });
  });

  // ----- Payer Catalog Import via Importer Framework (Phase 40 Superceding) --
  server.post('/rcm/payers/import/json', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const jsonData = body.data;
    if (!jsonData) {
      return reply.code(400).send({ ok: false, error: 'data field (JSON) is required' });
    }
    const raw = typeof jsonData === 'string' ? jsonData : JSON.stringify(jsonData);
    const importer = new JsonPayerImporter();
    const validation = importer.validate(raw);
    if (!validation.valid) {
      return reply.code(400).send({ ok: true, validation });
    }
    const result = importer.parse(raw);
    // Upsert each payer
    for (const p of result.payers) {
      upsertPayer(p as any);
    }
    appendRcmAudit('payer.created', { detail: { jsonImport: true, count: result.payers.length } });
    return { ok: true, imported: result.payers.length, errors: result.errors };
  });

  // ----- Connector capability matrix (Phase 40 Superseding) ------
  server.get('/rcm/connectors/capabilities', async () => {
    const all = Array.from(getAllConnectors().values());
    const matrix = all.map((c) => ({
      id: c.id,
      name: c.name,
      supportedModes: c.supportedModes,
      supportedTransactions: c.supportedTransactions,
    }));
    return { ok: true, connectors: matrix, total: matrix.length };
  });

  // ----- VistA Binding Routes (Phase 40 Superseding) -------------
  server.post(
    '/rcm/vista/encounter-to-claim',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body as any) || {};
      const { visitIen, patientDfn, payerId } = body;
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      if (!patientDfn || !payerId) {
        return reply.code(400).send({ ok: false, error: 'patientDfn and payerId are required' });
      }
      const session = (request as any).session;
      const actor = session?.duz ?? 'unknown';

      if (visitIen) {
        // Try VistA-native binding
        const result = await buildClaimFromVistaEncounter(visitIen, patientDfn, payerId, actor);
        if (!result.ok) {
          return {
            ok: false,
            integrationPending: result.integrationPending,
            vistaGrounding: result.vistaGrounding,
            errors: result.errors,
          };
        }
        if (result.data) {
          storeClaim(result.data);
          appendRcmAudit('claim.created', {
            claimId: result.data.id,
            detail: { source: 'vista-encounter', visitIen },
          });
          return reply.code(201).send({ ok: true, claim: result.data });
        }
      }

      // Fallback: use manual encounter data if provided
      if (body.encounterData) {
        const claim = buildClaimFromEncounterData(body.encounterData, payerId, actor, {
          ...(body.options || {}),
          tenantId,
        });
        storeClaim(claim);
        appendRcmAudit('claim.created', {
          claimId: claim.id,
          detail: { source: 'manual-encounter-data' },
        });
        return reply.code(201).send({ ok: true, claim });
      }

      return reply
        .code(400)
        .send({ ok: false, error: 'Either visitIen or encounterData is required' });
    }
  );

  server.get('/rcm/vista/charge-candidates', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const { patientDfn, dateFrom, dateTo } = q;
    if (!patientDfn) {
      return { ok: false, error: 'patientDfn query param is required' };
    }
    const result = await getChargeCaptureCandidates(patientDfn, { dateFrom, dateTo });
    return result;
  });

  server.post('/rcm/vista/era-post', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { remittanceId } = body;
    if (!remittanceId) {
      return reply.code(400).send({ ok: false, error: 'remittanceId is required' });
    }
    const remittance = await getRemittance(remittanceId);
    if (!remittance) {
      return reply.code(404).send({ ok: false, error: 'Remittance not found' });
    }
    const result = await postEraToVista(remittance);
    appendRcmAudit('era.post_attempted', {
      detail: {
        remittanceId,
        posted: result.posted,
        integrationPending: result.integrationPending,
      },
    });
    return result;
  });

  // ----- Phase 42: Claim Draft from VistA Endpoints --------------

  /** Create an RPC caller that uses the broker client */
  function makeRpcCaller(): RpcCaller {
    return {
      async call(rpcName: string, params: string[]): Promise<string[]> {
        await connect();
        const result = await callRpc(rpcName, params);
        return result;
      },
    };
  }

  /** RPCs used by the claim draft builder */
  const DRAFT_RPCS = [
    { name: 'ORWPCE VISIT', source: 'Vivian', required: true, description: 'PCE encounters' },
    { name: 'ORWPCE DIAG', source: 'Vivian', required: true, description: 'PCE diagnoses' },
    { name: 'ORWPCE PROC', source: 'Vivian', required: true, description: 'PCE procedures' },
    {
      name: 'IBCN INSURANCE QUERY',
      source: 'Vivian',
      required: false,
      description: 'Patient insurance',
    },
    {
      name: 'VE RCM PROVIDER INFO',
      source: 'Custom',
      required: false,
      description: 'Provider NPI/facility (install ZVERCMP.m)',
    },
  ];

  /**
   * GET /rcm/vista/rpc-check
   * Checks which claim-draft RPCs are available in the live VistA instance.
   * Returns per-RPC availability with source (Vivian/Custom) and install hints.
   */
  server.get('/rcm/vista/rpc-check', async () => {
    try {
      validateCredentials();
    } catch {
      return {
        ok: false,
        error: 'VistA credentials not configured',
        rpcs: DRAFT_RPCS.map((r) => ({ ...r, available: 'unknown' as const })),
      };
    }

    const results: Array<(typeof DRAFT_RPCS)[0] & { available: boolean; error?: string }> = [];

    try {
      await connect();
      for (const rpc of DRAFT_RPCS) {
        try {
          // Probe each RPC with a benign call (DFN=0 will return empty but not crash)
          await callRpc(rpc.name, ['0']);
          results.push({ ...rpc, available: true });
        } catch (err: any) {
          const msg = err?.message || '';
          // "not found" or context errors mean the RPC isn't registered
          results.push({ ...rpc, available: false, error: msg.substring(0, 120) });
        }
      }
      disconnect();
    } catch (_err: any) {
      disconnect();
      return {
        ok: false,
        error: 'VistA connection failed',
        rpcs: DRAFT_RPCS.map((r) => ({ ...r, available: 'unknown' as const })),
      };
    }

    return {
      ok: true,
      rpcs: results,
      allRequired: results.filter((r) => r.required).every((r) => r.available),
      summary: `${results.filter((r) => r.available).length}/${results.length} available`,
    };
  });

  /**
   * GET /rcm/vista/encounters?patientIen=N&from=YYYY-MM-DD&to=YYYY-MM-DD
   * Returns PCE encounters from VistA for claim draft selection.
   */
  server.get('/rcm/vista/encounters', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const patientIen = q.patientIen || q.dfn;
    if (!patientIen || !/^\d+$/.test(patientIen)) {
      return { ok: false, error: 'Missing or non-numeric patientIen', hint: 'Use ?patientIen=3' };
    }

    try {
      validateCredentials();
    } catch {
      return { ok: false, error: 'VistA credentials not configured' };
    }

    try {
      const rpc = makeRpcCaller();
      const { buildClaimDraftFromVista: _builder } =
        await import('./vistaBindings/buildClaimDraftFromVista.js');
      const visitLines = await rpc.call('ORWPCE VISIT', [patientIen]);
      const { parseEncounters } = await import('./vistaBindings/buildClaimDraftFromVista.js');
      let encounters = parseEncounters(visitLines);

      // Date filtering
      if (q.from) {
        encounters = encounters.filter((e) => e.dateTime >= q.from.replace(/-/g, ''));
      }
      if (q.to) {
        encounters = encounters.filter((e) => e.dateTime <= q.to.replace(/-/g, ''));
      }

      disconnect();

      appendRcmAudit('vista.encounters.read', {
        detail: { patientIen, count: encounters.length },
      });

      return {
        ok: true,
        status: 'live',
        count: encounters.length,
        results: encounters,
        rpcUsed: 'ORWPCE VISIT',
        vistaFiles: ['9000010 (VISIT)', '9000010.18 (V CPT)', '9000010.07 (V POV)'],
      };
    } catch (err: any) {
      disconnect();
      log.error('rcm-vista-encounters error', { err: err.message });
      return { ok: false, error: 'VistA service unavailable' };
    }
  });

  /**
   * POST /rcm/vista/claim-drafts
   * Builds claim draft candidates from VistA encounter data.
   * Body: { patientIen, dateFrom?, dateTo?, encounterId?, payerId?, tenantId? }
   */
  server.post('/rcm/vista/claim-drafts', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { patientIen, dateFrom, dateTo, encounterId, payerId } = body;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    if (!patientIen || !/^\d+$/.test(String(patientIen))) {
      return reply.code(400).send({ ok: false, error: 'patientIen is required (numeric)' });
    }

    try {
      validateCredentials();
    } catch {
      return reply.code(503).send({ ok: false, error: 'VistA credentials not configured' });
    }

    const session = (request as any).session;
    const actor = session?.duz ?? 'unknown';

    try {
      const rpc = makeRpcCaller();
      const result = await buildClaimDraftFromVista(rpc, String(patientIen), actor, {
        dateFrom,
        dateTo,
        encounterId,
        payerId,
        tenantId,
      });

      // Store generated drafts
      for (const candidate of result.candidates) {
        storeClaim(candidate.claim);
      }

      disconnect();

      appendRcmAudit('vista.claim-drafts.created', {
        detail: {
          patientIen,
          candidateCount: result.candidates.length,
          encountersFound: result.encountersFound,
          rpcsCalled: result.rpcsCalled,
        },
      });

      return reply.code(201).send(result);
    } catch (err: any) {
      disconnect();
      log.error('rcm-vista-claim-drafts error', { err: err.message });
      return reply.code(503).send({ ok: false, error: 'VistA service unavailable' });
    }
  });

  /**
   * GET /rcm/vista/coverage?patientIen=N
   * Returns patient insurance/coverage from VistA.
   */
  server.get('/rcm/vista/coverage', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const patientIen = q.patientIen || q.dfn;
    if (!patientIen || !/^\d+$/.test(patientIen)) {
      return { ok: false, error: 'Missing or non-numeric patientIen', hint: 'Use ?patientIen=3' };
    }

    try {
      validateCredentials();
    } catch {
      return { ok: false, error: 'VistA credentials not configured' };
    }

    try {
      const rpc = makeRpcCaller();
      const result = await getVistaCoverage(rpc, patientIen);
      disconnect();

      appendRcmAudit('vista.coverage.read', {
        detail: { patientIen, policyCount: result.policies.length },
      });

      return {
        ok: result.ok,
        status: result.ok ? 'live' : 'error',
        count: result.policies.length,
        results: result.policies,
        rpcUsed: result.rpcUsed,
        vistaFiles: ['36 (INSURANCE COMPANY)', '2.312 (PATIENT INSURANCE)'],
        errors: result.errors.length > 0 ? result.errors : undefined,
      };
    } catch (err: any) {
      disconnect();
      log.error('rcm-vista-coverage error', { err: err.message });
      return { ok: false, error: 'VistA service unavailable' };
    }
  });

  // ===============================================================
  // Phase 43 -- Ack/Status/Remit Pipeline + Workqueues + Rules
  // ===============================================================

  // ----- Ack Ingestion (999 / 277CA) -----------------------------
  server.post('/rcm/acks/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { type, disposition, originalControlNumber, ackControlNumber, idempotencyKey } = body;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!type || !disposition || !originalControlNumber || !ackControlNumber || !idempotencyKey) {
      return reply.code(400).send({
        ok: false,
        error:
          'type, disposition, originalControlNumber, ackControlNumber, and idempotencyKey are required',
      });
    }

    const result = await ingestAck({
      tenantId,
      type,
      disposition,
      originalControlNumber,
      ackControlNumber,
      claimId: body.claimId,
      payerId: body.payerId,
      payerName: body.payerName,
      errors: body.errors ?? [],
      rawPayload: body.rawPayload,
      idempotencyKey,
    });

    appendRcmAudit('ack.ingested', {
      claimId: body.claimId,
      payerId: body.payerId,
      detail: { ackId: result.ack.id, disposition, idempotent: result.idempotent },
    });

    return reply.code(result.idempotent ? 200 : 201).send(result);
  });

  server.get('/rcm/acks', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as Record<string, string>;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return {
      ok: true,
      ...listAcks({
        tenantId,
        type: q.type as any,
        disposition: q.disposition as any,
        claimId: q.claimId,
        limit: Number(q.limit ?? 50),
        offset: Number(q.offset ?? 0),
      }),
    };
  });

  server.get('/rcm/acks/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const ack = getAck(tenantId, id);
    if (!ack) return reply.code(404).send({ ok: false, error: 'Ack not found' });
    return { ok: true, ack };
  });

  server.get('/rcm/acks/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return { ok: true, stats: getAckStats(tenantId) };
  });

  // ----- Status Ingestion (276/277) ------------------------------
  server.post('/rcm/status/ingest', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { categoryCode, statusCode, statusDescription, idempotencyKey } = body;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;

    if (!categoryCode || !statusCode || !idempotencyKey) {
      return reply.code(400).send({
        ok: false,
        error: 'categoryCode, statusCode, and idempotencyKey are required',
      });
    }

    const result = await ingestStatusUpdate({
      tenantId,
      claimId: body.claimId,
      payerClaimId: body.payerClaimId,
      categoryCode,
      statusCode,
      statusDescription: statusDescription ?? '',
      effectiveDate: body.effectiveDate,
      checkDate: body.checkDate,
      totalCharged: body.totalCharged,
      totalPaid: body.totalPaid,
      payerId: body.payerId,
      payerName: body.payerName,
      rawPayload: body.rawPayload,
      idempotencyKey,
    });

    appendRcmAudit('status.ingested', {
      claimId: body.claimId,
      payerId: body.payerId,
      detail: {
        statusId: result.statusUpdate.id,
        categoryCode,
        idempotent: result.idempotent,
      },
    });

    return reply.code(result.idempotent ? 200 : 201).send(result);
  });

  server.get('/rcm/status', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as Record<string, string>;
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return {
      ok: true,
      ...listStatusUpdates({
        tenantId,
        categoryCode: q.categoryCode,
        claimId: q.claimId,
        limit: Number(q.limit ?? 50),
        offset: Number(q.offset ?? 0),
      }),
    };
  });

  server.get('/rcm/status/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return { ok: true, stats: getStatusStats(tenantId) };
  });

  // ----- Claim History (combined acks + status + remits) ---------
  server.get('/rcm/claims/:id/history', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = resolveTenantId(request);
    const { id } = request.params as { id: string };
    const claim = await getClaim(id, tenantId);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

    const claimAcks = getAcksForClaim(tenantId, id);
    const claimStatuses = getStatusUpdatesForClaim(tenantId, id);
    const claimWorkqueue = await getWorkqueueItemsForClaim(tenantId, id);
    const auditEntries = getRcmAuditEntries({ claimId: id, limit: 1000 });

    return {
      ok: true,
      claimId: id,
      claimStatus: claim.status,
      acks: claimAcks,
      statusUpdates: claimStatuses,
      workqueueItems: claimWorkqueue,
      auditTimeline: auditEntries.items,
    };
  });

  // ----- Enhanced Remittance Ingestion (Phase 43) ----------------
  server.post('/rcm/remittances/process', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { payerId, totalCharged, totalPaid, idempotencyKey } = body;

    if (!payerId || totalCharged === undefined || totalPaid === undefined || !idempotencyKey) {
      return reply.code(400).send({
        ok: false,
        error: 'payerId, totalCharged, totalPaid, and idempotencyKey are required',
      });
    }
    if (body.claimId) {
      const claim = await getClaim(body.claimId, resolveTenantId(request));
      if (!claim) {
        return reply.code(404).send({ ok: false, error: 'Claim not found' });
      }
    }

    const result = await processRemittance({
      payerId,
      payerName: body.payerName,
      checkNumber: body.checkNumber,
      checkDate: body.checkDate,
      eftTraceNumber: body.eftTraceNumber,
      totalCharged,
      totalPaid,
      totalAdjusted: body.totalAdjusted,
      totalPatientResponsibility: body.totalPatientResponsibility,
      claimId: body.claimId,
      payerClaimId: body.payerClaimId,
      patientDfn: body.patientDfn,
      ediControlNumber: body.ediControlNumber,
      serviceLines: body.serviceLines ?? [],
      idempotencyKey,
      rawPayload: body.rawPayload,
      tenantId: resolveTenantId(request),
    });

    return reply.code(result.idempotent ? 200 : 201).send(result);
  });

  server.get('/rcm/remittances/processor-stats', async () => {
    return { ok: true, stats: getRemitProcessorStats() };
  });

  // ----- Workqueues ----------------------------------------------
  server.get('/rcm/workqueues', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const result = await listWorkqueueItems({
      type: q.type as any,
      status: q.status as any,
      claimId: q.claimId,
      payerId: q.payerId,
      priority: q.priority as any,
      tenantId: resolveTenantId(request),
      limit: Number(q.limit ?? 50),
      offset: Number(q.offset ?? 0),
    });
    return { ok: true, ...result };
  });

  server.get('/rcm/workqueues/stats', async (request: FastifyRequest) => {
    return { ok: true, stats: await getWorkqueueStats(resolveTenantId(request)) };
  });

  server.get('/rcm/workqueues/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const item = await getWorkqueueItem(resolveTenantId(request), id);
    if (!item) return reply.code(404).send({ ok: false, error: 'Workqueue item not found' });
    return { ok: true, item };
  });

  server.patch('/rcm/workqueues/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const tenantId = resolveTenantId(request);
    const existing = await getWorkqueueItem(tenantId, id);
    if (!existing) return reply.code(404).send({ ok: false, error: 'Workqueue item not found' });

    const session = (request as any).session;
    const updates: Record<string, unknown> = {};
    if (body.status) updates.status = body.status;
    if (body.assignedTo) updates.assignedTo = body.assignedTo;
    if (body.priority) updates.priority = body.priority;
    if (body.resolutionNote) updates.resolutionNote = body.resolutionNote;

    if (body.status === 'resolved') {
      updates.resolvedAt = new Date().toISOString();
      updates.resolvedBy = session?.duz ?? 'unknown';
    }

    const updated = await updateWorkqueueItem(tenantId, id, updates as any);

    appendRcmAudit('workqueue.updated', {
      claimId: existing.claimId,
      detail: { workqueueItemId: id, changes: Object.keys(updates) },
    });

    return { ok: true, item: updated };
  });

  server.get('/rcm/claims/:id/workqueue', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = resolveTenantId(request);
    const { id } = request.params as { id: string };
    const claim = await getClaim(id, tenantId);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });
    const items = await getWorkqueueItemsForClaim(tenantId, id);
    return { ok: true, claimId: id, items, total: items.length };
  });

  // ----- Payer Rules --------------------------------------------
  server.get('/rcm/rules', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const result = listRules({
      payerId: q.payerId,
      category: q.category as any,
      enabled: q.enabled === undefined ? undefined : q.enabled === 'true',
      limit: Number(q.limit ?? 100),
      offset: Number(q.offset ?? 0),
    });
    return { ok: true, ...result };
  });

  server.get('/rcm/rules/stats', async () => {
    return { ok: true, stats: getRuleStats() };
  });

  server.get('/rcm/rules/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const rule = getRule(id);
    if (!rule) return reply.code(404).send({ ok: false, error: 'Rule not found' });
    return { ok: true, rule };
  });

  server.post('/rcm/rules', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { payerId, name, description, category, condition, actionOnFail } = body;

    if (!payerId || !name || !condition || !actionOnFail) {
      return reply.code(400).send({
        ok: false,
        error: 'payerId, name, condition, and actionOnFail are required',
      });
    }

    const now = new Date().toISOString();
    const rule = {
      id: `rule-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      payerId,
      name,
      description: description ?? '',
      category: category ?? 'custom',
      severity: body.severity ?? 'error',
      enabled: body.enabled !== false,
      condition,
      actionOnFail,
      fieldHint: body.fieldHint,
      effectiveDate: body.effectiveDate,
      expirationDate: body.expirationDate,
      source: 'admin' as const,
      version: 1,
      createdAt: now,
      updatedAt: now,
    };

    addRule(rule);
    appendRcmAudit('rule.created', {
      payerId,
      detail: { ruleId: rule.id, name, category },
    });

    return reply.code(201).send({ ok: true, rule });
  });

  server.patch('/rcm/rules/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const existing = getRule(id);
    if (!existing) return reply.code(404).send({ ok: false, error: 'Rule not found' });

    const updated = updatePayerRule(id, body);
    appendRcmAudit('rule.updated', {
      payerId: existing.payerId,
      detail: { ruleId: id, changes: Object.keys(body) },
    });

    return { ok: true, rule: updated };
  });

  server.delete('/rcm/rules/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = getRule(id);
    if (!existing) return reply.code(404).send({ ok: false, error: 'Rule not found' });

    deleteRule(id);
    appendRcmAudit('rule.deleted', {
      payerId: existing.payerId,
      detail: { ruleId: id, name: existing.name },
    });

    return { ok: true, message: 'Rule deleted' };
  });

  server.post('/rcm/rules/evaluate', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { payerId, claimId } = body;

    if (!payerId && !claimId) {
      return reply.code(400).send({ ok: false, error: 'Either payerId or claimId is required' });
    }

    let claim: Record<string, unknown>;
    let resolvedPayerId = payerId;

    if (claimId) {
      const existingClaim = await getClaim(claimId);
      if (!existingClaim) return reply.code(404).send({ ok: false, error: 'Claim not found' });
      claim = existingClaim as unknown as Record<string, unknown>;
      resolvedPayerId = resolvedPayerId ?? existingClaim.payerId;
    } else {
      claim = body.claim ?? {};
    }

    const result = evaluateRules(resolvedPayerId, claim);

    appendRcmAudit('rule.evaluated', {
      claimId,
      payerId: resolvedPayerId,
      detail: { score: result.score, passCount: result.passCount, failCount: result.failCount },
    });

    return { ok: true, ...result };
  });

  // ----- CARC/RARC Reference ------------------------------------
  server.get('/rcm/reference/carc', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    if (q.code) {
      const entry = lookupCarc(q.code);
      return entry ? { ok: true, entry } : { ok: false, error: `CARC code ${q.code} not found` };
    }
    return { ok: true, codes: CARC_CODES, total: Object.keys(CARC_CODES).length };
  });

  server.get('/rcm/reference/rarc', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    if (q.code) {
      const entry = lookupRarc(q.code);
      return entry ? { ok: true, entry } : { ok: false, error: `RARC code ${q.code} not found` };
    }
    return { ok: true, codes: RARC_CODES, total: Object.keys(RARC_CODES).length };
  });

  // ----- Payer Directory (Phase 44) -----------------------------

  /** GET /rcm/directory/stats -- directory statistics */
  server.get('/rcm/directory/stats', async () => {
    return { ok: true, ...getDirectoryStats() };
  });

  /** GET /rcm/directory/importers -- list registered importers */
  server.get('/rcm/directory/importers', async () => {
    return { ok: true, importers: listImporters() };
  });

  /** GET /rcm/directory/history -- refresh history */
  server.get('/rcm/directory/history', async () => {
    return { ok: true, history: getRefreshHistory() };
  });

  /** GET /rcm/directory/payers -- list directory payers with filters */
  server.get('/rcm/directory/payers', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const result = listDirectoryPayers({
      country: q.country as any,
      payerType: q.payerType as any,
      search: q.search,
    });
    return { ok: true, ...result };
  });

  /** GET /rcm/directory/payers/:id -- single directory payer detail */
  server.get('/rcm/directory/payers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const payer = getDirectoryPayer(id);
    if (!payer) return reply.code(404).send({ ok: false, error: 'Directory payer not found' });
    return { ok: true, payer };
  });

  /** POST /rcm/directory/refresh -- run all importers and refresh directory (admin) */
  server.post('/rcm/directory/refresh', async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    const country = body.country as string | undefined;
    const userId = body.userId ?? 'admin';

    const importResults = country ? runImportersByCountry(country as any) : runAllImporters();

    const result = runDirectoryRefresh(importResults, userId);
    return { ok: true, ...result };
  });

  /** POST /rcm/directory/import/:importerId -- run a single importer */
  server.post(
    '/rcm/directory/import/:importerId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { importerId } = request.params as { importerId: string };
      const importer = getImporter(importerId);
      if (!importer)
        return reply.code(404).send({ ok: false, error: `Importer '${importerId}' not found` });

      const body = (request.body as any) || {};
      const userId = body.userId ?? 'admin';

      let importResults;
      if (body.fileData && importer.importFromFile) {
        importResults = [importer.importFromFile(body.fileData, body.format ?? 'json')];
      } else {
        importResults = [importer.importFromSnapshot()];
      }

      const result = runDirectoryRefresh(importResults, userId);
      return { ok: true, importerId, ...result };
    }
  );

  // ----- Enrollment Packets (Phase 44) --------------------------

  /** GET /rcm/enrollment -- list all enrollment packets */
  server.get('/rcm/enrollment', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const packets = listEnrollmentPackets({
      status: q.status as EnrollmentStatus | undefined,
    });
    return { ok: true, ...packets };
  });

  /** GET /rcm/enrollment/:payerId -- get enrollment packet for a payer */
  server.get('/rcm/enrollment/:payerId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { payerId } = request.params as { payerId: string };
    const packet = getEnrollmentPacket(payerId);
    if (!packet)
      return reply.code(404).send({ ok: false, error: 'No enrollment packet for this payer' });
    return { ok: true, packet };
  });

  /** POST /rcm/enrollment/:payerId -- create or update enrollment packet */
  server.post('/rcm/enrollment/:payerId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { payerId } = request.params as { payerId: string };
    const body = (request.body as any) || {};
    if (!body.orgIdentifiers) {
      return reply.code(400).send({ ok: false, error: 'orgIdentifiers is required' });
    }
    const now = new Date().toISOString();
    const existing = getEnrollmentPacket(payerId);
    const packet: EnrollmentPacket = {
      payerId,
      orgIdentifiers: body.orgIdentifiers,
      certRequirements: body.certRequirements ?? [],
      goLiveChecklist: body.goLiveChecklist ?? [],
      contacts: body.contacts ?? [],
      testingSteps: body.testingSteps ?? [],
      enrollmentStatus: body.enrollmentStatus ?? 'NOT_STARTED',
      notes: body.notes,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const isNew = !existing;
    upsertEnrollmentPacket(packet);
    appendRcmAudit(isNew ? 'enrollment.created' : 'enrollment.updated', {
      payerId,
      detail: { status: packet.enrollmentStatus },
    });
    return { ok: true, packet };
  });

  // ----- Claim Routing (Phase 44) ------------------------------

  /** POST /rcm/claims/:id/route -- resolve route for a claim */
  server.post('/rcm/claims/:id/route', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = resolveTenantId(request);
    const { id } = request.params as { id: string };
    const claim = await getClaim(id, tenantId);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

    const body = (request.body as any) || {};
    const jurisdiction = body.jurisdiction ?? (claim as any).patientCountry ?? 'US';

    const route = resolveRoute(claim.payerId, jurisdiction);

    if (isRouteNotFound(route)) {
      appendRcmAudit('route.not_found', {
        claimId: id,
        payerId: claim.payerId,
        detail: { jurisdiction, remediation: route.remediation },
      });
      return reply.code(422).send({ ok: false, ...route });
    }

    appendRcmAudit('route.resolved', {
      claimId: id,
      payerId: claim.payerId,
      detail: { connectorId: route.connectorId, channelType: route.channel?.type, jurisdiction },
    });

    return { ok: true, route };
  });

  /** GET /rcm/routing/resolve -- resolve route by payerId + jurisdiction */
  server.get('/rcm/routing/resolve', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = request.query as Record<string, string>;
    if (!q.payerId)
      return reply.code(400).send({ ok: false, error: 'payerId query param required' });
    const jurisdiction = (q.jurisdiction ?? 'US') as any;
    const route = resolveRoute(q.payerId, jurisdiction);

    if (isRouteNotFound(route)) {
      return reply.code(422).send({ ok: false, ...route });
    }
    return { ok: true, route };
  });

  // ----- Transaction Engine (Phase 45) --------------------------

  /** GET /rcm/transactions -- list transactions with optional filters */
  server.get('/rcm/transactions', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const q = request.query as Record<string, string>;
    const items = listTxns({
      tenantId,
      state: q.state as TransactionState | undefined,
      transactionSet: q.transactionSet as X12TransactionSet | undefined,
      sourceId: q.sourceId,
      limit: q.limit ? Number(q.limit) : undefined,
    });
    return { ok: true, items, total: items.length };
  });

  /** GET /rcm/transactions/stats -- transaction statistics */
  server.get('/rcm/transactions/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return { ok: true, stats: getTransactionStats(tenantId) };
  });

  /** GET /rcm/transactions/:id -- get single transaction */
  server.get('/rcm/transactions/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const { id } = request.params as { id: string };
    const txn = getTxn(id);
    if (!txn || txn.envelope.tenantId !== tenantId) {
      return reply.code(404).send({ ok: false, error: 'Transaction not found' });
    }
    return { ok: true, transaction: txn };
  });

  /** POST /rcm/transactions/build -- build envelope + translate to X12 */
  server.post('/rcm/transactions/build', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    if (!body.transactionSet || !body.senderId || !body.receiverId) {
      return reply
        .code(400)
        .send({ ok: false, error: 'transactionSet, senderId, receiverId required' });
    }

    const envelope = buildEnvelope({
      tenantId,
      transactionSet: body.transactionSet,
      senderId: body.senderId,
      receiverId: body.receiverId,
      senderQualifier: body.senderQualifier,
      receiverQualifier: body.receiverQualifier,
      usageIndicator: body.usageIndicator ?? 'T',
      sourceId: body.sourceId,
      sourceType: body.sourceType,
      correlationId: body.correlationId,
    });

    let x12Payload: string | undefined;
    const translator = getActiveTranslator();

    if (translator && body.canonical) {
      // Validate first
      const validation = translator.validate(body.transactionSet, body.canonical);
      if (validation.length > 0) {
        appendRcmAudit('connectivity.gate_failed', {
          detail: { errors: validation, transactionSet: body.transactionSet },
        });
        return reply.code(422).send({ ok: false, error: 'Validation failed', validation });
      }

      const result = translator.buildX12(body.transactionSet, body.canonical, envelope);
      x12Payload = result.x12Payload;

      appendRcmAudit('translator.build', {
        detail: {
          transactionSet: body.transactionSet,
          translatorId: translator.id,
          segmentCount: result.segmentCount,
          byteSize: result.byteSize,
        },
      });
    }

    const record = storeTransaction(envelope, x12Payload);

    appendRcmAudit('transaction.created', {
      claimId: body.sourceId,
      detail: {
        transactionId: record.id,
        transactionSet: body.transactionSet,
        controlNumber: envelope.controlNumber,
      },
    });

    return { ok: true, transaction: record };
  });

  /** POST /rcm/transactions/:id/transition -- manually transition state */
  server.post(
    '/rcm/transactions/:id/transition',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      if (!body.state) return reply.code(400).send({ ok: false, error: 'state is required' });
      const existing = getTxn(id);
      if (!existing || existing.envelope.tenantId !== tenantId) {
        return reply.code(404).send({ ok: false, error: 'Transaction not found' });
      }

      const result = transitionTransaction(id, body.state, {
        responsePayload: body.responsePayload,
        error: body.error,
      });

      if (!result) return reply.code(422).send({ ok: false, error: 'Invalid state transition' });

      appendRcmAudit(
        `transaction.${body.state === 'failed' ? 'failed' : body.state === 'dlq' ? 'dlq' : body.state === 'reconciled' ? 'reconciled' : 'transmitted'}` as any,
        {
          detail: { transactionId: id, newState: body.state },
        }
      );

      return { ok: true, transaction: result };
    }
  );

  /** POST /rcm/transactions/:id/check-gates -- run pre-transmit or ack gates */
  server.post(
    '/rcm/transactions/:id/check-gates',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const gateType = body.gateType ?? 'pre-transmit';

      const txn = getTxn(id);
      if (!txn || txn.envelope.tenantId !== tenantId) {
        return reply.code(404).send({ ok: false, error: 'Transaction not found' });
      }

      if (gateType === 'ack') {
        const ackResult = checkAckGates(id);
        return { ok: true, gateType: 'ack', gates: ackResult };
      }

      // Pre-transmit gates
      if (!txn.x12Payload) {
        return reply.code(422).send({ ok: false, error: 'Transaction has no X12 payload' });
      }
      const gateResults = checkPreTransmitGates(txn.envelope.transactionSet, txn.x12Payload);
      const allPassed = gateResults.every((g) => g.passed || g.severity !== 'error');
      if (!allPassed) {
        appendRcmAudit('connectivity.gate_failed', {
          detail: { transactionId: id, failures: gateResults.filter((g) => !g.passed) },
        });
      }
      return { ok: true, gateType: 'pre-transmit', gates: gateResults, allPassed };
    }
  );

  /** POST /rcm/transactions/:id/retry -- retry a failed transaction */
  server.post(
    '/rcm/transactions/:id/retry',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const { id } = request.params as { id: string };
      const txn = getTxn(id);
      if (!txn || txn.envelope.tenantId !== tenantId) {
        return reply.code(404).send({ ok: false, error: 'Transaction not found' });
      }
      const result = processRetry(id);
      if (!result.retried && !result.movedToDLQ) {
        return reply.code(422).send({ ok: false, error: 'Cannot retry this transaction' });
      }

      appendRcmAudit('transaction.retried', {
        detail: { transactionId: id, retried: result.retried, movedToDLQ: result.movedToDLQ },
      });

      return { ok: true, transaction: result };
    }
  );

  /** GET /rcm/transactions/dlq -- list dead-letter queue transactions */
  server.get('/rcm/transactions/dlq', async (request: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(request, reply);
    if (!tenantId) return;
    return {
      ok: true,
      items: getDLQTransactions().filter((txn) => txn.envelope.tenantId === tenantId),
    };
  });

  /** POST /rcm/transactions/dlq/:id/retry -- retry from dead-letter queue */
  server.post(
    '/rcm/transactions/dlq/:id/retry',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = requireTenantId(request, reply);
      if (!tenantId) return;
      const { id } = request.params as { id: string };
      const txn = getTxn(id);
      if (!txn || txn.envelope.tenantId !== tenantId) {
        return reply.code(404).send({ ok: false, error: 'Transaction not found' });
      }
      const success = retryFromDLQ(id);
      if (!success)
        return reply.code(422).send({ ok: false, error: 'Cannot retry: not in DLQ or not found' });

      appendRcmAudit('transaction.retried', {
        detail: { transactionId: id, fromDLQ: true },
      });

      return { ok: true, retried: true };
    }
  );

  /** GET /rcm/translators -- list registered translators */
  server.get('/rcm/translators', async () => {
    return { ok: true, translators: listTranslators() };
  });

  /** GET /rcm/connectivity/profile -- get active connectivity profile */
  server.get('/rcm/connectivity/profile', async () => {
    return { ok: true, profile: getConnectivityProfile() };
  });

  /** GET /rcm/connectivity/health -- connectivity health check */
  server.get('/rcm/connectivity/health', async () => {
    return { ok: true, ...getConnectivityHealth() };
  });

  /** GET /rcm/claims/:id/reconciliation -- full claim reconciliation */
  server.get(
    '/rcm/claims/:id/reconciliation',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const tenantId = resolveTenantId(request);
      const { id } = request.params as { id: string };
      const claim = await getClaim(id, tenantId);
      if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

      const summary = await buildReconciliationSummary(id);
      return { ok: true, reconciliation: summary };
    }
  );

  /** POST /rcm/claims/batch-reconciliation -- batch reconciliation stats */
  server.post('/rcm/claims/batch-reconciliation', async (request: FastifyRequest) => {
    const body = (request.body as any) || {};
    const claimIds = body.claimIds ?? [];
    const stats = await buildReconciliationStats(claimIds);
    return { ok: true, stats };
  });

  /* ===================================================================
   * Phase 46 -- National Gateway Packs
   * =================================================================== */

  /** GET /rcm/gateways/readiness -- Unified readiness for all gateways */
  server.get('/rcm/gateways/readiness', async (_request: FastifyRequest) => {
    const gateways = probeAllGateways();
    appendRcmAudit('gateway.readiness_checked', { detail: { gatewayCount: gateways.length } });
    return { ok: true, gateways };
  });

  /** GET /rcm/gateways/readiness/:id -- Readiness for single gateway */
  server.get(
    '/rcm/gateways/readiness/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const validIds = getGatewayIds();
      if (!validIds.includes(id as GatewayId)) {
        return reply
          .code(404)
          .send({ ok: false, error: `Unknown gateway: ${id}. Valid: ${validIds.join(', ')}` });
      }
      const gateway = probeGateway(id as GatewayId);
      appendRcmAudit('gateway.probe', {
        detail: { gatewayId: id, overallStatus: gateway.overallStatus },
      });
      return { ok: true, gateway };
    }
  );

  /** GET /rcm/gateways/ids -- List available gateway IDs */
  server.get('/rcm/gateways/ids', async (_request: FastifyRequest) => {
    return { ok: true, gatewayIds: getGatewayIds() };
  });

  /** GET /rcm/conformance/gateways -- All gateway conformance data */
  server.get('/rcm/conformance/gateways', async (_request: FastifyRequest) => {
    return { ok: true, conformance: getAllGatewayConformance() };
  });

  /** GET /rcm/conformance/gateways/:id -- Single gateway conformance */
  server.get(
    '/rcm/conformance/gateways/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const conformance = getGatewayConformance(id);
      if (!conformance) {
        return reply.code(404).send({ ok: false, error: `No conformance data for gateway: ${id}` });
      }
      return { ok: true, conformance };
    }
  );

  /** POST /rcm/conformance/gateways/:id/validate -- Validate payload against conformance */
  server.post(
    '/rcm/conformance/gateways/:id/validate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as Record<string, unknown>) || {};
      const result = validatePayloadConformance(id, body);
      appendRcmAudit('gateway.conformance_validated', {
        detail: { gatewayId: id, valid: result.valid, missingFields: result.missingFields.length },
      });
      return { ok: true, ...result };
    }
  );

  /* ===================================================================
   * Phase 69 -- RCM Ops Excellence: Adapters, Polling, Jobs
   * =================================================================== */

  /** GET /rcm/adapters -- List registered payer adapters */
  server.get('/rcm/adapters', async () => {
    const adapters = listPayerAdapters();
    return { ok: true, adapters };
  });

  /** GET /rcm/adapters/health -- Adapter health status */
  server.get('/rcm/adapters/health', async () => {
    const healthResults: Record<string, unknown> = {};
    for (const [id, adapter] of getAllPayerAdapters()) {
      healthResults[id] = await adapter.healthCheck();
    }
    return { ok: true, health: healthResults };
  });

  /** GET /rcm/jobs/scheduler -- Polling scheduler status */
  server.get('/rcm/jobs/scheduler', async () => {
    const scheduler = getPollingScheduler();
    return { ok: true, scheduler: scheduler.getStatus() };
  });

  /** GET /rcm/jobs/queue/stats -- Job queue statistics */
  server.get('/rcm/jobs/queue/stats', async () => {
    const queue = getJobQueue();
    return { ok: true, stats: queue.getStats() };
  });

  /** GET /rcm/eligibility/results -- Eligibility poll results */
  server.get('/rcm/eligibility/results', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const offset = parseInt(q.offset ?? '0', 10) || 0;
    const limit = Math.min(parseInt(q.limit ?? '50', 10) || 50, 200);
    const result = getEligibilityResultsSlice(offset, limit);
    return { ok: true, ...result };
  });

  /** GET /rcm/claims/status/results -- Claim status poll results */
  server.get('/rcm/claims/status/results', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const offset = parseInt(q.offset ?? '0', 10) || 0;
    const limit = Math.min(parseInt(q.limit ?? '50', 10) || 50, 200);
    const result = getClaimStatusResultsSlice(offset, limit);
    return { ok: true, ...result };
  });
}
