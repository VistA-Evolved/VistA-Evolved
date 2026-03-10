/**
 * Claims Lifecycle v1 -- API Routes (Phase 91)
 *
 * Endpoints:
 *   GET  /rcm/claims/lifecycle                    -- List claim cases (queue)
 *   POST /rcm/claims/lifecycle                    -- Create claim case
 *   GET  /rcm/claims/lifecycle/:id                -- Get claim case detail
 *   PATCH /rcm/claims/lifecycle/:id               -- Update claim case fields
 *   PUT  /rcm/claims/lifecycle/:id/transition     -- Transition lifecycle state
 *   POST /rcm/claims/lifecycle/:id/scrub          -- Run scrubber on claim
 *   POST /rcm/claims/lifecycle/:id/attachments    -- Add attachment metadata
 *   POST /rcm/claims/lifecycle/:id/denials        -- Record denial
 *   PUT  /rcm/claims/lifecycle/denials/:denialId/resolve -- Resolve denial
 *
 *   GET  /rcm/claims/lifecycle/denials             -- List all denials (workbench)
 *   GET  /rcm/claims/lifecycle/stats               -- Claim case stats
 *   GET  /rcm/claims/lifecycle/scrubber/packs      -- Available rule packs
 *
 * All routes fall under /rcm/ prefix -- existing security catch-all covers auth.
 * Mutations wired to appendRcmAudit.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createClaimCase,
  getClaimCase,
  updateClaimCase,
  transitionClaimCase,
  recordScrubResult,
  addAttachment,
  addDenial,
  resolveDenial,
  listClaimCases,
  listDenials,
  getClaimCaseStats,
  getStoreInfo,
} from './claim-store.js';
import { scrubClaim, getAvailableRulePacks } from './scrubber.js';
import { appendRcmAudit } from '../audit/rcm-audit.js';
import type { ClaimLifecycleStatus } from './claim-types.js';

/* -- Helper: extract session --------------------------------- */

function getSession(request: FastifyRequest): { duz: string; tenantId: string } {
  const s = (request as any).session;
  const requestTenantId = (request as any).tenantId;
  const headerTenantId = request.headers['x-tenant-id'];
  return {
    duz: s?.duz ?? 'system',
    tenantId:
      (typeof requestTenantId === 'string' && requestTenantId.trim().length > 0
        ? requestTenantId.trim()
        : undefined) ||
      (typeof s?.tenantId === 'string' && s.tenantId.trim().length > 0 ? s.tenantId.trim() : undefined) ||
      (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
        ? headerTenantId.trim()
        : undefined) ||
      'default',
  };
}

/* -- Route Registration -------------------------------------- */

export default async function claimLifecycleRoutes(server: FastifyInstance): Promise<void> {
  /* -- List Claim Cases (Queue) ---------------------------- */
  server.get('/rcm/claims/lifecycle', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = getSession(request);
    const q = (request.query as any) || {};

    const result = await listClaimCases({
      tenantId,
      status: q.status as ClaimLifecycleStatus | undefined,
      payerId: q.payerId,
      patientDfn: q.patientDfn,
      priority: q.priority,
      hasDenials: q.hasDenials === 'true' ? true : q.hasDenials === 'false' ? false : undefined,
      limit: q.limit ? parseInt(q.limit, 10) : 50,
      offset: q.offset ? parseInt(q.offset, 10) : 0,
    });

    return reply.send({ ok: true, ...result });
  });

  /* -- Create Claim Case ----------------------------------- */
  server.post('/rcm/claims/lifecycle', async (request: FastifyRequest, reply: FastifyReply) => {
    const { duz, tenantId } = getSession(request);
    const body = (request.body as any) || {};

    if (!body.patientDfn || !body.payerId || !body.dateOfService) {
      return reply.status(400).send({
        ok: false,
        error: 'patientDfn, payerId, and dateOfService are required',
      });
    }

    const cc = createClaimCase({
      tenantId,
      patientDfn: body.patientDfn,
      payerId: body.payerId,
      payerName: body.payerName,
      payerType: body.payerType,
      claimType: body.claimType,
      dateOfService: body.dateOfService,
      dateOfDischarge: body.dateOfDischarge,
      diagnoses: body.diagnoses,
      procedures: body.procedures,
      totalCharge: body.totalCharge,
      patientName: body.patientName,
      patientDob: body.patientDob,
      patientGender: body.patientGender,
      subscriberId: body.subscriberId,
      memberPin: body.memberPin,
      billingProviderNpi: body.billingProviderNpi,
      renderingProviderNpi: body.renderingProviderNpi,
      facilityCode: body.facilityCode,
      facilityName: body.facilityName,
      vistaEncounterIen: body.vistaEncounterIen,
      vistaChargeIen: body.vistaChargeIen,
      vistaArIen: body.vistaArIen,
      baseClaimId: body.baseClaimId,
      philhealthDraftId: body.philhealthDraftId,
      loaCaseId: body.loaCaseId,
      isDemo: body.isDemo,
      isMock: body.isMock,
      priority: body.priority,
      actor: duz,
    });

    appendRcmAudit('claim.created', {
      claimId: cc.id,
      payerId: cc.payerId,
      userId: duz,
      detail: {
        source: cc.philhealthDraftId
          ? 'philhealth_draft'
          : cc.loaCaseId
            ? 'loa_approval'
            : 'manual',
      },
    });

    return reply.status(201).send({ ok: true, claimCase: cc });
  });

  /* -- Get Claim Case Detail ------------------------------- */
  server.get('/rcm/claims/lifecycle/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = getSession(request);
    const { id } = request.params as { id: string };
    const cc = await getClaimCase(id, tenantId);
    if (!cc) return reply.status(404).send({ ok: false, error: 'Claim case not found' });
    return reply.send({ ok: true, claimCase: cc });
  });

  /* -- Update Claim Case Fields ---------------------- */
  server.patch(
    '/rcm/claims/lifecycle/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};

      const existing = await getClaimCase(id, tenantId);
      if (!existing) return reply.status(404).send({ ok: false, error: 'Claim case not found' });

      // Only allow updates in editable states
      const editableStates: ClaimLifecycleStatus[] = [
        'draft',
        'scrub_failed',
        'returned_to_provider',
      ];
      if (!editableStates.includes(existing.lifecycleStatus)) {
        return reply.status(409).send({
          ok: false,
          error: `Cannot edit claim in ${existing.lifecycleStatus} state`,
        });
      }

      // Strip immutable fields from body
      delete body.id;
      delete body.tenantId;
      delete body.createdAt;
      delete body.lifecycleStatus;
      delete body.events;
      delete body.scrubHistory;

      const updated = await updateClaimCase(tenantId, id, body);
      if (!updated) return reply.status(500).send({ ok: false, error: 'Update failed' });

      appendRcmAudit('claim.updated', { claimId: id, userId: duz });
      return reply.send({ ok: true, claimCase: updated });
    }
  );

  /* -- Transition Lifecycle State -------------------------- */
  server.put(
    '/rcm/claims/lifecycle/:id/transition',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};

      if (!body.toStatus) {
        return reply.status(400).send({ ok: false, error: 'toStatus is required' });
      }

      const result = await transitionClaimCase(tenantId, id, body.toStatus, duz, body.detail);
      if (!result.ok) {
        return reply.status(409).send({ ok: false, error: result.error });
      }

      appendRcmAudit('claim.transition', {
        claimId: id,
        userId: duz,
        detail: { toStatus: body.toStatus },
      });

      return reply.send({ ok: true, claimCase: result.claimCase });
    }
  );

  /* -- Run Scrubber ---------------------------------------- */
  server.post(
    '/rcm/claims/lifecycle/:id/scrub',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};

      const cc = await getClaimCase(id, tenantId);
      if (!cc) return reply.status(404).send({ ok: false, error: 'Claim case not found' });

      // Run scrubber
      const scrubResult = scrubClaim(cc, {
        packs: body.packs,
        forcePack: body.forcePack,
        actor: duz,
      });

      // Record result on the claim case
      const updated = await recordScrubResult(tenantId, id, scrubResult);
      if (!updated)
        return reply.status(500).send({ ok: false, error: 'Failed to record scrub result' });

      // Auto-transition based on outcome
      const scrubStates: ClaimLifecycleStatus[] = ['ready_for_scrub', 'draft', 'scrub_failed'];
      if (scrubStates.includes(updated.lifecycleStatus)) {
        const newStatus: ClaimLifecycleStatus =
          scrubResult.outcome === 'fail' ? 'scrub_failed' : 'scrub_passed';
        // Only transition if valid
        const transResult = await transitionClaimCase(tenantId, id, newStatus, 'system', {
          scrubOutcome: scrubResult.outcome,
          findingsCount: scrubResult.findings.length,
        });
        if (transResult.ok) {
          appendRcmAudit('claim.transition', {
            claimId: id,
            userId: 'system',
            detail: { toStatus: newStatus, trigger: 'scrub_auto' },
          });

          return reply.send({ ok: true, scrubResult, claimCase: transResult.claimCase });
        }
      }

      appendRcmAudit('validation.run', {
        claimId: id,
        userId: duz,
        detail: { outcome: scrubResult.outcome, rulesEvaluated: scrubResult.rulesEvaluated },
      });

      return reply.send({ ok: true, scrubResult, claimCase: updated });
    }
  );

  /* -- Add Attachment -------------------------------------- */
  server.post(
    '/rcm/claims/lifecycle/:id/attachments',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};

      if (!body.category || !body.filename) {
        return reply.status(400).send({ ok: false, error: 'category and filename are required' });
      }

      const updated = addAttachment(
        tenantId,
        id,
        {
          category: body.category,
          filename: body.filename,
          mimeType: body.mimeType ?? 'application/octet-stream',
          sizeBytes: body.sizeBytes ?? 0,
          storageRef: body.storageRef,
          uploadedBy: duz,
          uploadedAt: new Date().toISOString(),
          autoGenerated: body.autoGenerated ?? false,
        },
        duz
      );

      if (!updated) return reply.status(404).send({ ok: false, error: 'Claim case not found' });

      appendRcmAudit('claim.updated', {
        claimId: id,
        userId: duz,
        detail: { action: 'attachment_added', category: body.category },
      });

      return reply.status(201).send({ ok: true, claimCase: updated });
    }
  );

  /* -- Record Denial --------------------------------------- */
  server.post(
    '/rcm/claims/lifecycle/:id/denials',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};

      if (!body.source || !body.reasonCode || !body.reasonDescription) {
        return reply.status(400).send({
          ok: false,
          error: 'source, reasonCode, and reasonDescription are required',
        });
      }

      const denial = addDenial(tenantId, id, {
        source: body.source,
        reasonCode: body.reasonCode,
        reasonDescription: body.reasonDescription,
        reasonCategory: body.reasonCategory,
        denialAmount: body.denialAmount,
        deniedAt: body.deniedAt ?? new Date().toISOString(),
        recommendedAction: body.recommendedAction,
        fieldToFix: body.fieldToFix,
        assignedTo: body.assignedTo,
      });

      if (!denial) return reply.status(404).send({ ok: false, error: 'Claim case not found' });

      appendRcmAudit('claim.denied', {
        claimId: id,
        userId: duz,
        detail: { reasonCode: body.reasonCode, source: body.source },
      });

      return reply.status(201).send({ ok: true, denial });
    }
  );

  /* -- Resolve Denial -------------------------------------- */
  server.put(
    '/rcm/claims/lifecycle/denials/:denialId/resolve',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const { denialId } = request.params as { denialId: string };
      const body = (request.body as any) || {};

      const resolved = await resolveDenial(tenantId, denialId, duz, body.resolutionNote ?? '');
      if (!resolved) return reply.status(404).send({ ok: false, error: 'Denial not found' });

      appendRcmAudit('workqueue.resolved', {
        claimId: resolved.claimCaseId,
        userId: duz,
        detail: { denialId, resolution: 'resolved' },
      });

      return reply.send({ ok: true, denial: resolved });
    }
  );

  /* -- List Denials (Workbench) ---------------------------- */
  server.get(
    '/rcm/claims/lifecycle/denials',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = getSession(request);
      const q = (request.query as any) || {};

      const result = listDenials({
        tenantId,
        resolved: q.resolved === 'true' ? true : q.resolved === 'false' ? false : undefined,
        source: q.source,
        limit: q.limit ? parseInt(q.limit, 10) : 50,
        offset: q.offset ? parseInt(q.offset, 10) : 0,
      });

      return reply.send({ ok: true, ...result });
    }
  );

  /* -- Stats ----------------------------------------------- */
  server.get(
    '/rcm/claims/lifecycle/stats',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = getSession(request);
      const stats = getClaimCaseStats(tenantId);
      const storeInfo = getStoreInfo();
      return reply.send({ ok: true, stats, storeInfo });
    }
  );

  /* -- Available Scrubber Packs ---------------------------- */
  server.get(
    '/rcm/claims/lifecycle/scrubber/packs',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      return reply.send({ ok: true, packs: getAvailableRulePacks() });
    }
  );
}
