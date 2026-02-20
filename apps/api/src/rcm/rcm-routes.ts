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
 *
 * Phase 38 -- RCM + Payer Connectivity
 * Phase 40 -- Submission safety, X12 serializer, CSV import, export artifacts
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Domain
import { createDraftClaim, transitionClaim, isValidTransition } from './domain/claim.js';
import type { ClaimStatus } from './domain/claim.js';
import {
  storeClaim, getClaim, updateClaim, listClaims, getClaimStats,
  storeRemittance, getRemittance, listRemittances, matchRemittanceToClaim,
  getStoreStats,
} from './domain/claim-store.js';

// Payer registry
import { initPayerRegistry, getPayer, listPayers, upsertPayer, getPayerStats } from './payer-registry/registry.js';

// Validation
import { validateClaim, describeValidationRules } from './validation/engine.js';

// EDI pipeline
import {
  createPipelineEntry, advancePipelineStage,
  listPipelineEntries, getPipelineStats,
  buildClaim837FromDomain, buildEligibilityInquiry270,
} from './edi/pipeline.js';

// Connectors
import {
  registerConnector, listConnectors, getConnectorForMode, getAllConnectors,
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
  appendRcmAudit, getRcmAuditEntries, verifyRcmAuditChain, getRcmAuditStats,
} from './audit/rcm-audit.js';

// X12 serializer (Phase 40)
import { serialize837, exportX12Bundle } from './edi/x12-serializer.js';

// Job queue (Phase 40 Superseding)
import { getJobQueue } from './jobs/queue.js';
import type { RcmJobType } from './jobs/queue.js';

// Payer catalog importers (Phase 40 Superseding)
import { CsvPayerImporter, JsonPayerImporter } from './importers/payer-catalog-importer.js';

// VistA binding points (Phase 40 Superseding)
import {
  buildClaimFromVistaEncounter,
  buildClaimFromEncounterData,
  getChargeCaptureCandidates,
  postEraToVista,
} from './vistaBindings/index.js';

/* ─── Submission safety (Phase 40) ───────────────────────────────── */

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

/* ─── Initialize subsystems ──────────────────────────────────────── */

let initialized = false;

async function ensureInitialized(): Promise<void> {
  if (initialized) return;
  initialized = true;

  // Load payer seed data
  initPayerRegistry();

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
}

/* ─── Route plugin ───────────────────────────────────────────────── */

export default async function rcmRoutes(server: FastifyInstance): Promise<void> {
  await ensureInitialized();

  // ───── Health ────────────────────────────────────────────────────
  server.get('/rcm/health', async () => {
    const payerStats = getPayerStats();
    const claimStats = getClaimStats('default');
    const pipelineStats = getPipelineStats();
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

  // ───── Payers ───────────────────────────────────────────────────
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

  // ───── PATCH Payer (Phase 40) ───────────────────────────────────
  server.patch('/rcm/payers/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const existing = getPayer(id);
    if (!existing) return reply.code(404).send({ ok: false, error: 'Payer not found' });

    const body = (request.body as any) || {};
    const merged = { ...existing, ...body, payerId: id };
    upsertPayer(merged);
    appendRcmAudit('payer.updated', { payerId: id, detail: { fields: Object.keys(body) } });
    return { ok: true, payer: getPayer(id) };
  });

  // ───── CSV Payer Import (Phase 40) ──────────────────────────────
  server.post('/rcm/payers/import', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const csvText = body.csv;
    if (!csvText || typeof csvText !== 'string') {
      return reply.code(400).send({ ok: false, error: 'csv field (string) is required' });
    }

    const lines = csvText.split('\n').map((l: string) => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      return reply.code(400).send({ ok: false, error: 'CSV must have header + at least one data row' });
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

  // ───── Claims ────────────────────────────────────────────────────
  server.get('/rcm/claims/stats', async () => {
    return { ok: true, stats: getClaimStats('default'), store: getStoreStats() };
  });

  server.get('/rcm/claims', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const result = listClaims('default', {
      status: q.status as ClaimStatus | undefined,
      patientDfn: q.patientDfn,
      payerId: q.payerId,
      limit: Number(q.limit ?? 50),
      offset: Number(q.offset ?? 0),
    });
    return { ok: true, ...result };
  });

  server.get('/rcm/claims/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const claim = getClaim(id);
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
      tenantId: 'default',
      patientDfn: body.patientDfn,
      payerId: body.payerId,
      claimType: body.claimType ?? 'professional',
      totalCharge: body.totalCharge ?? 0,
      dateOfService: body.dateOfService ?? body.serviceDate ?? new Date().toISOString().slice(0, 10),
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
    const { id } = request.params as { id: string };
    const claim = getClaim(id);
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
          blockers: result.edits.filter(e => e.blocksSubmission).length,
        },
      });
    }

    return { ok: true, validation: result };
  });

  server.post('/rcm/claims/:id/submit', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const idempotencyKey = (request.headers as Record<string, string>)['x-idempotency-key'] ?? '';
    const claim = getClaim(id);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

    // Idempotency guard: if already submitted with same key, return cached result
    if (idempotencyKey && claim.status === 'submitted' &&
        claim.auditTrail?.some((e: any) => e.idempotencyKey === idempotencyKey)) {
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

    // ─── Submission safety gate (Phase 40) ───────────────────────
    const safety = getSubmissionSafetyStatus();
    if (!safety.enabled) {
      // Export-only mode: generate X12 artifact and transition to ready_to_submit
      const payer = getPayer(claim.payerId);
      if (!payer) {
        return reply.code(400).send({ ok: false, error: `Payer '${claim.payerId}' not found` });
      }

      const edi837 = buildClaim837FromDomain(claim);
      const x12Wire = serialize837(edi837, { usageIndicator: 'T' });
      const exportResult = await exportX12Bundle(x12Wire, claim.id, 
        claim.claimType === 'institutional' ? '837I' : '837P');

      const session = (request as any).session;
      let updated = claim;
      if (claim.status === 'validated') {
        updated = transitionClaim(claim, 'ready_to_submit', session?.duz ?? 'system',
          'CLAIM_SUBMISSION_ENABLED=false -- exported as artifact');
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
        message: 'Claim exported as X12 artifact (CLAIM_SUBMISSION_ENABLED=false). Review artifact before enabling live submission.',
        claim: getClaim(id),
        exportArtifact: exportResult,
      };
    }

    // Find connector for payer
    const payer = getPayer(claim.payerId);
    if (!payer) {
      return reply.code(400).send({ ok: false, error: `Payer '${claim.payerId}' not found` });
    }

    const connector = getConnectorForMode(payer.integrationMode) ?? getConnectorForMode('clearinghouse_edi');
    if (!connector) {
      return reply.code(500).send({ ok: false, error: 'No connector available for payer' });
    }

    // Build EDI and submit
    const edi837 = buildClaim837FromDomain(claim);
    const payload = JSON.stringify(edi837); // In production: serialize to X12 wire format

    const entry = createPipelineEntry(
      claim.id,
      claim.claimType === 'institutional' ? '837I' : '837P',
      connector.id,
      claim.payerId,
    );

    advancePipelineStage(entry.id, 'validate', { outbound: payload });
    advancePipelineStage(entry.id, 'enqueue');

    const result = await connector.submit(
      claim.claimType === 'institutional' ? '837I' : '837P',
      payload,
      { claimId: claim.id, chargeAmount: String(claim.totalCharge) },
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
        claim: getClaim(id),
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

  server.post('/rcm/claims/:id/transition', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const body = (request.body as any) || {};
    const { newStatus, reason } = body;

    if (!newStatus) {
      return reply.code(400).send({ ok: false, error: 'newStatus is required' });
    }

    const claim = getClaim(id);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

    if (!isValidTransition(claim.status, newStatus)) {
      return reply.code(400).send({
        ok: false,
        error: `Invalid transition: ${claim.status} → ${newStatus}`,
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
  });

  server.get('/rcm/claims/:id/timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const claim = getClaim(id);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

    const auditEntries = getRcmAuditEntries({ claimId: id, limit: 1000 });
    return { ok: true, claimId: id, timeline: auditEntries.items };
  });

  // ───── Export Claim as X12 Artifact (Phase 40) ──────────────────
  server.post('/rcm/claims/:id/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const claim = getClaim(id);
    if (!claim) return reply.code(404).send({ ok: false, error: 'Claim not found' });

    if (claim.status === 'draft') {
      return reply.code(400).send({
        ok: false,
        error: 'Validate the claim before exporting',
      });
    }

    const payer = getPayer(claim.payerId);
    if (!payer) return reply.code(400).send({ ok: false, error: `Payer '${claim.payerId}' not found` });

    const edi837 = buildClaim837FromDomain(claim);
    const x12Wire = serialize837(edi837, { usageIndicator: 'T' });
    const exportResult = await exportX12Bundle(x12Wire, claim.id,
      claim.claimType === 'institutional' ? '837I' : '837P');

    const updated = { ...claim, exportArtifactPath: exportResult.path };
    updateClaim(updated);

    appendRcmAudit('claim.transition', {
      claimId: id,
      detail: { action: 'export', exportPath: exportResult.path },
    });

    return { ok: true, claim: getClaim(id), exportArtifact: exportResult };
  });

  // ───── Submission Safety Status (Phase 40) ──────────────────────
  server.get('/rcm/submission-safety', async () => {
    const safety = getSubmissionSafetyStatus();
    return { ok: true, ...safety };
  });

  // ───── Eligibility ──────────────────────────────────────────────
  server.post('/rcm/eligibility/check', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { memberId, payerId, patientFirstName, patientLastName, patientDob } = body;

    if (!memberId || !payerId) {
      return reply.code(400).send({ ok: false, error: 'memberId and payerId are required' });
    }

    const payer = getPayer(payerId);
    if (!payer) return reply.code(404).send({ ok: false, error: 'Payer not found' });

    const connector = getConnectorForMode(payer.integrationMode) ?? getConnectorForMode('clearinghouse_edi');
    if (!connector) {
      return reply.code(500).send({ ok: false, error: 'No connector available' });
    }

    const inquiry = buildEligibilityInquiry270(
      memberId,
      payerId,
      body.providerNpi ?? '0000000000',
      { firstName: patientFirstName ?? '', lastName: patientLastName ?? '', dob: patientDob },
    );

    const entry = createPipelineEntry('eligibility-check', '270', connector.id, payerId);
    const payload = JSON.stringify(inquiry);
    advancePipelineStage(entry.id, 'validate', { outbound: payload });
    advancePipelineStage(entry.id, 'enqueue');

    const result = await connector.submit('270', payload, { memberId, payerId });

    if (result.success) {
      advancePipelineStage(entry.id, 'transmit');
      appendRcmAudit('eligibility.checked', {
        payerId,
        detail: { memberId: '[REDACTED]', transactionId: result.transactionId },
      });
    }

    return { ok: result.success, pipelineEntry: entry, connectorResult: result };
  });

  // ───── EDI Pipeline ─────────────────────────────────────────────
  server.get('/rcm/edi/pipeline', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const result = listPipelineEntries({
      stage: q.stage as any,
      payerId: q.payerId,
      transactionSet: q.transactionSet as any,
      limit: Number(q.limit ?? 50),
      offset: Number(q.offset ?? 0),
    });
    return { ok: true, ...result };
  });

  server.get('/rcm/edi/pipeline/stats', async () => {
    return { ok: true, stats: getPipelineStats() };
  });

  // ───── Connectors ───────────────────────────────────────────────
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

  // ───── Validation Rules ─────────────────────────────────────────
  server.get('/rcm/validation/rules', async () => {
    return { ok: true, rules: describeValidationRules() };
  });

  // ───── Remittances ──────────────────────────────────────────────
  server.get('/rcm/remittances', async (request: FastifyRequest) => {
    const q = request.query as Record<string, string>;
    const result = listRemittances('default',
      Number(q.limit ?? 50),
      Number(q.offset ?? 0),
    );
    return { ok: true, ...result };
  });

  server.post('/rcm/remittances/import', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    if (!body.payerId || !body.checkNumber || body.paymentAmount === undefined) {
      return reply.code(400).send({ ok: false, error: 'payerId, checkNumber, and paymentAmount are required' });
    }

    const now = new Date().toISOString();
    const remittance: import('./domain/remit.js').Remittance = {
      id: `remit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      tenantId: 'default',
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
      matched = matchRemittanceToClaim(remittance.id, body.claimId);
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

  // ───── Audit ────────────────────────────────────────────────────
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

  // ───── Job Queue (Phase 40 Superseding) ─────────────────────────
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
      'CLAIM_SUBMIT', 'ELIGIBILITY_CHECK', 'STATUS_POLL', 'ERA_INGEST', 'ACK_PROCESS',
    ];
    if (!validTypes.includes(type)) {
      return reply.code(400).send({ ok: false, error: `Invalid type. Must be one of: ${validTypes.join(', ')}` });
    }
    const queue = getJobQueue();
    const jobId = await queue.enqueue({ type, payload, priority, idempotencyKey });
    appendRcmAudit('job.enqueued', { detail: { jobId, type, priority } });
    return reply.code(201).send({ ok: true, jobId });
  });

  // ───── Payer Catalog Import via Importer Framework (Phase 40 Superceding) ──
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

  // ───── Connector capability matrix (Phase 40 Superseding) ──────
  server.get('/rcm/connectors/capabilities', async () => {
    const all = Array.from(getAllConnectors().values());
    const matrix = all.map(c => ({
      id: c.id,
      name: c.name,
      supportedModes: c.supportedModes,
      supportedTransactions: c.supportedTransactions,
    }));
    return { ok: true, connectors: matrix, total: matrix.length };
  });

  // ───── VistA Binding Routes (Phase 40 Superseding) ─────────────
  server.post('/rcm/vista/encounter-to-claim', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const { visitIen, patientDfn, payerId } = body;
    if (!patientDfn || !payerId) {
      return reply.code(400).send({ ok: false, error: 'patientDfn and payerId are required' });
    }
    const session = (request as any).session;
    const actor = session?.duz ?? 'unknown';

    if (visitIen) {
      // Try VistA-native binding
      const result = await buildClaimFromVistaEncounter(visitIen, patientDfn, payerId, actor);
      if (!result.ok) {
        return { ok: false, integrationPending: result.integrationPending, vistaGrounding: result.vistaGrounding, errors: result.errors };
      }
      if (result.data) {
        storeClaim(result.data);
        appendRcmAudit('claim.created', { claimId: result.data.id, detail: { source: 'vista-encounter', visitIen } });
        return reply.code(201).send({ ok: true, claim: result.data });
      }
    }

    // Fallback: use manual encounter data if provided
    if (body.encounterData) {
      const claim = buildClaimFromEncounterData(body.encounterData, payerId, actor, body.options);
      storeClaim(claim);
      appendRcmAudit('claim.created', { claimId: claim.id, detail: { source: 'manual-encounter-data' } });
      return reply.code(201).send({ ok: true, claim });
    }

    return reply.code(400).send({ ok: false, error: 'Either visitIen or encounterData is required' });
  });

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
    const remittance = getRemittance(remittanceId);
    if (!remittance) {
      return reply.code(404).send({ ok: false, error: 'Remittance not found' });
    }
    const result = await postEraToVista(remittance);
    appendRcmAudit('era.post_attempted', {
      detail: { remittanceId, posted: result.posted, integrationPending: result.integrationPending },
    });
    return result;
  });
}
