/**
 * PayerOps Routes -- Phase 87+89: Philippines RCM Foundation + LOA Engine v1
 *
 * Endpoints:
 *   GET  /rcm/payerops/health              -- PayerOps subsystem health
 *   GET  /rcm/payerops/stats               -- Aggregate stats
 *
 *   GET  /rcm/payerops/enrollments         -- List facility-payer enrollments
 *   GET  /rcm/payerops/enrollments/:id     -- Get enrollment detail
 *   POST /rcm/payerops/enrollments         -- Create enrollment
 *   PUT  /rcm/payerops/enrollments/:id/status -- Update enrollment status
 *
 *   GET  /rcm/payerops/loa                 -- List LOA cases
 *   GET  /rcm/payerops/loa-queue           -- LOA work queue (SLA filtered)
 *   GET  /rcm/payerops/loa/:id            -- Get LOA case detail
 *   POST /rcm/payerops/loa                 -- Create LOA case
 *   PATCH /rcm/payerops/loa/:id           -- Patch LOA draft fields
 *   PUT  /rcm/payerops/loa/:id/status     -- Transition LOA status
 *   PUT  /rcm/payerops/loa/:id/assign     -- Assign LOA to staff member
 *   POST /rcm/payerops/loa/:id/attachments -- Attach credential to LOA
 *   POST /rcm/payerops/loa/:id/submit     -- Submit LOA via adapter
 *   POST /rcm/payerops/loa/:id/pack       -- Generate submission pack
 *
 *   GET  /rcm/payerops/credentials         -- List credential vault entries
 *   GET  /rcm/payerops/credentials/:id    -- Get credential entry
 *   POST /rcm/payerops/credentials         -- Create credential entry
 *   DELETE /rcm/payerops/credentials/:id  -- Delete credential entry
 *   GET  /rcm/payerops/credentials/expiring -- Expiring credentials
 *
 *   GET  /rcm/payerops/adapters            -- List available adapters
 *
 * All routes fall under /rcm/ prefix -> existing security rule covers auth.
 * RBAC: reads = rcm:read, mutations = rcm:write.
 * Phase 89: appendRcmAudit wired to ALL LOA mutation routes.
 */

import type { FastifyInstance, FastifyRequest } from 'fastify';
import { randomBytes } from 'node:crypto';

// Store operations
import {
  createEnrollment,
  getEnrollmentForTenant,
  listEnrollments,
  updateEnrollmentStatus,
  addCredentialRefToEnrollment,
  createLOACase,
  getLOACaseForTenant,
  listLOACases,
  transitionLOAStatus,
  addAttachmentToLOA,
  updateLOAPayerRef,
  createCredentialEntry,
  getCredentialEntryForTenant,
  listCredentialEntries,
  deleteCredentialEntry,
  getExpiringCredentials,
  getPayerOpsStats,
  patchLOADraft,
  listLOAQueue,
  addPackToLOA,
  assignLOA,
  refreshSLARisk,
} from './store.js';

// Adapters
import { ManualAdapter, generateLOASubmissionPack } from './manual-adapter.js';
import { getPortalAdapter } from './portal-adapter.js';

// Encryption health check
import { testEncryptionHealth } from './credential-encryption.js';

// Audit (Phase 89: wired to all LOA mutations)
import { appendRcmAudit } from '../audit/rcm-audit.js';

// Types
import type { EnrollmentStatus, LOAStatus, LOAPack } from './types.js';

/* -- Adapter registry (manual + portal; API adapters added in future phases) -- */

const manualAdapter = new ManualAdapter();
const portalAdapter = getPortalAdapter();

function resolveAdapter(mode: 'manual' | 'portal' | 'api') {
  if (mode === 'portal') return portalAdapter;
  // API mode is future -- fall back to manual
  return manualAdapter;
}

/* -- Helper: safe body parse ---------------------------------- */
function body(request: FastifyRequest): Record<string, any> {
  return (request.body as Record<string, any>) || {};
}

function query(request: FastifyRequest): Record<string, any> {
  return (request.query as Record<string, any>) || {};
}

function params(request: FastifyRequest): Record<string, any> {
  return (request.params as Record<string, any>) || {};
}

function sessionActor(request: FastifyRequest): string {
  const s = (request as any).session;
  return s?.userName || s?.duz || 'unknown';
}

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

/* -- Route plugin ---------------------------------------------- */

export default async function payerOpsRoutes(server: FastifyInstance): Promise<void> {
  /* -- Health -------------------------------------------------- */

  server.get('/rcm/payerops/health', async (_request, reply) => {
    const encryptionResult = testEncryptionHealth();
    return reply.send({
      ok: true,
      module: 'payerops',
      phase: 87,
      encryption: encryptionResult.ok ? 'healthy' : 'degraded',
      adapters: ['manual', 'portal'],
      portalConfigs: portalAdapter.listPortalConfigs().length,
      timestamp: new Date().toISOString(),
    });
  });

  /* -- Stats --------------------------------------------------- */

  server.get('/rcm/payerops/stats', async (request, reply) => {
    return reply.send({ ok: true, stats: getPayerOpsStats(resolveTenantId(request)) });
  });

  /* -- Enrollments --------------------------------------------- */

  server.get('/rcm/payerops/enrollments', async (request, reply) => {
    const q = query(request);
    const results = listEnrollments({
      tenantId: resolveTenantId(request),
      facilityId: q.facilityId,
      payerId: q.payerId,
      status: q.status as EnrollmentStatus | undefined,
    });
    return reply.send({ ok: true, count: results.length, enrollments: results });
  });

  server.get('/rcm/payerops/enrollments/:id', async (request, reply) => {
    const { id } = params(request);
    const enrollment = getEnrollmentForTenant(resolveTenantId(request), id);
    if (!enrollment) return reply.code(404).send({ ok: false, error: 'Enrollment not found' });
    return reply.send({ ok: true, enrollment });
  });

  server.post('/rcm/payerops/enrollments', async (request, reply) => {
    const b = body(request);
    if (!b.facilityId || !b.payerId || !b.payerName) {
      return reply.code(400).send({
        ok: false,
        error: 'facilityId, payerId, and payerName are required',
      });
    }
    const actor = sessionActor(request);
    const enrollment = createEnrollment({
      tenantId: resolveTenantId(request),
      facilityId: b.facilityId,
      facilityName: b.facilityName || b.facilityId,
      payerId: b.payerId,
      payerName: b.payerName,
      integrationMode: b.integrationMode || 'manual',
      portalUrl: b.portalUrl,
      portalInstructions: b.portalInstructions,
      notes: b.notes,
      actor,
    });
    appendRcmAudit('enrollment.created', {
      payerId: b.payerId,
      userId: actor,
      detail: { enrollmentId: enrollment.id, facilityId: b.facilityId },
    });
    return reply.code(201).send({ ok: true, enrollment });
  });

  server.put('/rcm/payerops/enrollments/:id/status', async (request, reply) => {
    const { id } = params(request);
    const b = body(request);
    if (!b.status) {
      return reply.code(400).send({ ok: false, error: 'status is required' });
    }
    const actor = sessionActor(request);
    const updated = updateEnrollmentStatus(resolveTenantId(request), id, b.status, actor, b.detail);
    if (!updated) return reply.code(404).send({ ok: false, error: 'Enrollment not found' });
    appendRcmAudit('enrollment.updated', {
      payerId: updated.payerId,
      userId: actor,
      detail: { enrollmentId: id, newStatus: b.status },
    });
    return reply.send({ ok: true, enrollment: updated });
  });

  /* -- LOA Cases ----------------------------------------------- */

  server.get('/rcm/payerops/loa', async (request, reply) => {
    const q = query(request);
    const results = listLOACases({
      tenantId: resolveTenantId(request),
      facilityId: q.facilityId,
      patientDfn: q.patientDfn,
      payerId: q.payerId,
      status: q.status as LOAStatus | undefined,
    }).map(refreshSLARisk);
    return reply.send({ ok: true, count: results.length, loaCases: results });
  });

  /* -- LOA Work Queue (Phase 89) ------------------------------ */

  server.get('/rcm/payerops/loa-queue', async (request, reply) => {
    const q = query(request);
    const statusFilter = q.status
      ? ((Array.isArray(q.status) ? q.status : q.status.split(',')) as LOAStatus[])
      : undefined;
    const result = listLOAQueue({
      tenantId: resolveTenantId(request),
      status: statusFilter,
      payerId: q.payerId,
      assignedTo: q.assignedTo,
      slaRiskLevel: q.slaRiskLevel as any,
      patientDfn: q.patientDfn,
      priority: q.priority as any,
      olderThanHours: q.olderThanHours ? Number(q.olderThanHours) : undefined,
      sortBy: (q.sortBy as any) || 'slaDeadline',
      sortDir: (q.sortDir as any) || 'asc',
      limit: q.limit ? Number(q.limit) : 50,
      offset: q.offset ? Number(q.offset) : 0,
    });
    return reply.send({ ok: true, ...result });
  });

  server.get('/rcm/payerops/loa/:id', async (request, reply) => {
    const { id } = params(request);
    const loa = getLOACaseForTenant(resolveTenantId(request), id);
    if (!loa) return reply.code(404).send({ ok: false, error: 'LOA case not found' });
    return reply.send({ ok: true, loaCase: refreshSLARisk(loa) });
  });

  server.post('/rcm/payerops/loa', async (request, reply) => {
    const b = body(request);
    if (!b.facilityId || !b.patientDfn || !b.payerId || !b.payerName || !b.requestType) {
      return reply.code(400).send({
        ok: false,
        error: 'facilityId, patientDfn, payerId, payerName, and requestType are required',
      });
    }
    const actor = sessionActor(request);
    const loa = createLOACase({
      tenantId: resolveTenantId(request),
      facilityId: b.facilityId,
      patientDfn: b.patientDfn,
      encounterIen: b.encounterIen,
      payerId: b.payerId,
      payerName: b.payerName,
      memberId: b.memberId,
      planName: b.planName,
      requestType: b.requestType,
      requestedServices: b.requestedServices || [],
      diagnosisCodes: b.diagnosisCodes || [],
      createdBy: actor,
      priority: b.priority,
      assignedTo: b.assignedTo,
      slaDeadline: b.slaDeadline,
      urgencyNotes: b.urgencyNotes,
      enrollmentId: b.enrollmentId,
    });
    appendRcmAudit('loa.created', {
      claimId: loa.id,
      payerId: loa.payerId,
      userId: actor,
      patientDfn: loa.patientDfn,
      detail: { requestType: loa.requestType, priority: loa.priority },
    });
    return reply.code(201).send({ ok: true, loaCase: loa });
  });

  /* -- Patch LOA Draft (Phase 89) ----------------------------- */

  server.patch('/rcm/payerops/loa/:id', async (request, reply) => {
    const { id } = params(request);
    const b = body(request);
    const actor = sessionActor(request);
    const result = patchLOADraft(resolveTenantId(request), id, {
      memberId: b.memberId,
      planName: b.planName,
      requestType: b.requestType,
      requestedServices: b.requestedServices,
      diagnosisCodes: b.diagnosisCodes,
      priority: b.priority,
      assignedTo: b.assignedTo,
      slaDeadline: b.slaDeadline,
      urgencyNotes: b.urgencyNotes,
      enrollmentId: b.enrollmentId,
      denialReason: b.denialReason,
    });
    if (!result.ok) {
      const code = result.error?.includes('not found') ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result.error });
    }
    appendRcmAudit('loa.updated', {
      claimId: id,
      payerId: result.loaCase?.payerId,
      userId: actor,
      detail: { fields: Object.keys(b) },
    });
    return reply.send({ ok: true, loaCase: result.loaCase });
  });

  server.put('/rcm/payerops/loa/:id/status', async (request, reply) => {
    const { id } = params(request);
    const b = body(request);
    if (!b.status) {
      return reply.code(400).send({ ok: false, error: 'status is required' });
    }
    const actor = sessionActor(request);
    const tenantId = resolveTenantId(request);
    const result = transitionLOAStatus(tenantId, id, b.status, actor, b.reason);
    if (!result.ok) {
      const code = result.error?.includes('not found') ? 404 : 422;
      return reply.code(code).send({ ok: false, error: result.error });
    }
    // If transitioning to approved, optionally set payer reference
    if (b.status === 'approved' || b.status === 'partially_approved') {
      if (b.payerRefNumber) {
        updateLOAPayerRef(tenantId, id, b.payerRefNumber, b.approvedAmount, b.approvedServices);
      }
    }
    // Audit: use specific action for terminal states
    const auditAction =
      b.status === 'approved' || b.status === 'partially_approved'
        ? ('loa.approved' as const)
        : b.status === 'denied'
          ? ('loa.denied' as const)
          : b.status === 'cancelled'
            ? ('loa.cancelled' as const)
            : b.status === 'expired'
              ? ('loa.expired' as const)
              : ('loa.transition' as const);
    appendRcmAudit(auditAction, {
      claimId: id,
      payerId: result.loaCase?.payerId,
      userId: actor,
      detail: { fromStatus: b.fromStatus, toStatus: b.status, reason: b.reason },
    });
    return reply.send({ ok: true, loaCase: result.loaCase });
  });

  /* -- Assign LOA (Phase 89) ---------------------------------- */

  server.put('/rcm/payerops/loa/:id/assign', async (request, reply) => {
    const { id } = params(request);
    const b = body(request);
    if (!b.assignedTo) {
      return reply.code(400).send({ ok: false, error: 'assignedTo is required' });
    }
    const actor = sessionActor(request);
    const result = assignLOA(resolveTenantId(request), id, b.assignedTo, actor);
    if (!result.ok) {
      return reply.code(404).send({ ok: false, error: result.error });
    }
    appendRcmAudit('loa.assigned', {
      claimId: id,
      payerId: result.loaCase?.payerId,
      userId: actor,
      detail: { assignedTo: b.assignedTo },
    });
    return reply.send({ ok: true, loaCase: result.loaCase });
  });

  server.post('/rcm/payerops/loa/:id/attachments', async (request, reply) => {
    const { id } = params(request);
    const b = body(request);
    if (!b.credentialId) {
      return reply.code(400).send({ ok: false, error: 'credentialId is required' });
    }
    const actor = sessionActor(request);
    const ok = addAttachmentToLOA(resolveTenantId(request), id, b.credentialId);
    if (!ok) return reply.code(404).send({ ok: false, error: 'LOA case not found' });
    appendRcmAudit('loa.attachment_added', {
      claimId: id,
      userId: actor,
      detail: { credentialId: b.credentialId },
    });
    return reply.send({ ok: true, message: 'Attachment added' });
  });

  server.post('/rcm/payerops/loa/:id/submit', async (request, reply) => {
    const { id } = params(request);
    const loa = getLOACaseForTenant(resolveTenantId(request), id);
    if (!loa) return reply.code(404).send({ ok: false, error: 'LOA case not found' });

    const actor = sessionActor(request);
    // Determine which adapter to use
    const adapter = resolveAdapter(loa.submissionMode);
    const result = await adapter.submitLOA(loa);

    appendRcmAudit('loa.submitted', {
      claimId: id,
      payerId: loa.payerId,
      userId: actor,
      patientDfn: loa.patientDfn,
      detail: { adapterMode: adapter.mode, resultStatus: result.status },
    });

    return reply.send({
      ok: true,
      adapterMode: adapter.mode,
      result,
    });
  });

  server.post('/rcm/payerops/loa/:id/pack', async (request, reply) => {
    const { id } = params(request);
    const loa = getLOACaseForTenant(resolveTenantId(request), id);
    if (!loa) return reply.code(404).send({ ok: false, error: 'LOA case not found' });

    const actor = sessionActor(request);
    const b = body(request);

    // Generate enhanced pack
    const packData = generateLOASubmissionPack(loa, {
      payerInstructions: b.payerInstructions,
      includedCredentials: b.includedCredentials,
    });

    // Store pack in history
    const pack: LOAPack = {
      id: `pack-${Date.now().toString(36)}-${randomBytes(4).toString('hex')}`,
      loaId: id,
      generatedAt: new Date().toISOString(),
      generatedBy: actor,
      format: 'manifest',
      sections: packData.sections,
      checklist: packData.checklist,
      emailTemplate: packData.emailTemplate,
      payerInstructions: packData.payerInstructions,
      includedCredentials: packData.includedCredentials,
    };
    addPackToLOA(resolveTenantId(request), id, pack);

    appendRcmAudit('loa.pack_generated', {
      claimId: id,
      payerId: loa.payerId,
      userId: actor,
      detail: { packId: pack.id, sectionsCount: pack.sections.length },
    });

    return reply.send({ ok: true, pack: { ...packData, id: pack.id } });
  });

  /* -- Credential Vault ---------------------------------------- */

  server.get('/rcm/payerops/credentials', async (request, reply) => {
    const q = query(request);
    const results = listCredentialEntries({
      tenantId: resolveTenantId(request),
      facilityId: q.facilityId,
      docType: q.docType,
      payerId: q.payerId,
      expiringWithinDays: q.expiringDays ? Number(q.expiringDays) : undefined,
    });
    return reply.send({ ok: true, count: results.length, credentials: results });
  });

  /* Static /expiring registered before parametric /:id to avoid ambiguity */
  server.get('/rcm/payerops/credentials/expiring', async (request, reply) => {
    const q = query(request);
    const days = q.days ? Number(q.days) : 30;
    const expiring = getExpiringCredentials(resolveTenantId(request), days);
    return reply.send({ ok: true, count: expiring.length, credentials: expiring });
  });

  server.get('/rcm/payerops/credentials/:id', async (request, reply) => {
    const { id } = params(request);
    const entry = getCredentialEntryForTenant(resolveTenantId(request), id);
    if (!entry) return reply.code(404).send({ ok: false, error: 'Credential entry not found' });
    return reply.send({ ok: true, credential: entry });
  });

  server.post('/rcm/payerops/credentials', async (request, reply) => {
    const b = body(request);
    if (!b.facilityId || !b.docType || !b.title || !b.fileName) {
      return reply.code(400).send({
        ok: false,
        error: 'facilityId, docType, title, and fileName are required',
      });
    }
    const entry = createCredentialEntry({
      tenantId: resolveTenantId(request),
      facilityId: b.facilityId,
      docType: b.docType,
      title: b.title,
      fileName: b.fileName,
      mimeType: b.mimeType || 'application/octet-stream',
      storagePath: b.storagePath || `uploads/${b.facilityId}/${b.fileName}`,
      sizeBytes: b.sizeBytes || 0,
      contentHash: b.contentHash || 'pending',
      issuedBy: b.issuedBy,
      issueDate: b.issueDate,
      expiryDate: b.expiryDate,
      renewalReminderDays: b.renewalReminderDays,
      associatedPayerIds: b.associatedPayerIds,
      notes: b.notes,
      uploadedBy: sessionActor(request),
    });
    // Optionally link to enrollment
    if (b.enrollmentId) {
      addCredentialRefToEnrollment(resolveTenantId(request), b.enrollmentId, entry.id);
    }
    return reply.code(201).send({ ok: true, credential: entry });
  });

  server.delete('/rcm/payerops/credentials/:id', async (request, reply) => {
    const { id } = params(request);
    const deleted = deleteCredentialEntry(resolveTenantId(request), id);
    if (!deleted) return reply.code(404).send({ ok: false, error: 'Credential entry not found' });
    return reply.send({ ok: true, message: 'Credential deleted' });
  });

  /* -- Adapters ------------------------------------------------ */

  server.get('/rcm/payerops/adapters', async (_request, reply) => {
    return reply.send({
      ok: true,
      adapters: [
        {
          id: manualAdapter.id,
          name: manualAdapter.name,
          mode: manualAdapter.mode,
          capabilities: manualAdapter.capabilities(),
        },
        {
          id: portalAdapter.id,
          name: portalAdapter.name,
          mode: portalAdapter.mode,
          capabilities: portalAdapter.capabilities(),
          portalConfigs: portalAdapter.listPortalConfigs().length,
        },
      ],
    });
  });
}
