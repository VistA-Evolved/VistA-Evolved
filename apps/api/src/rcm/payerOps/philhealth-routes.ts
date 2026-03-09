/**
 * PhilHealth eClaims 3.0 Posture Routes — Phase 90
 *
 * Endpoints:
 *   GET  /rcm/philhealth/stats                    — PhilHealth subsystem stats
 *
 *   POST /rcm/philhealth/claims                   — Create claim draft
 *   GET  /rcm/philhealth/claims                   — List claim drafts
 *   GET  /rcm/philhealth/claims/:id               — Get claim draft detail
 *   PATCH /rcm/philhealth/claims/:id              — Patch draft fields
 *   PUT  /rcm/philhealth/claims/:id/status        — Transition claim status
 *   POST /rcm/philhealth/claims/:id/validate      — Validate claim draft
 *   POST /rcm/philhealth/claims/:id/export        — Generate export package
 *   POST /rcm/philhealth/claims/:id/test-upload   — Simulate test upload
 *
 *   GET  /rcm/philhealth/setup                    — Get facility setup
 *   PATCH /rcm/philhealth/setup                   — Update facility setup
 *   POST /rcm/philhealth/setup/providers          — Add provider accreditation
 *   DELETE /rcm/philhealth/setup/providers/:prc   — Remove provider accreditation
 *   PUT  /rcm/philhealth/setup/readiness/:itemId  — Toggle readiness checklist item
 *
 * All routes fall under /rcm/ prefix -- existing security catch-all covers auth.
 * RBAC: reads = rcm:read, mutations = rcm:write.
 * ALL mutations wired to appendRcmAudit.
 *
 * NOT CERTIFIED: This module generates eClaims 3.0-structured export packages
 * for review and facility readiness. It does NOT submit to PhilHealth.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

import {
  createPhilHealthClaimDraft,
  getPhilHealthClaimDraft,
  listPhilHealthClaimDrafts,
  patchPhilHealthClaimDraft,
  transitionPhilHealthClaimStatus,
  generateExportPackage,
  simulateTestUpload,
  getOrCreateFacilitySetup,
  updateFacilitySetup,
  addProviderAccreditation,
  removeProviderAccreditation,
  updateReadinessItem,
  getPhilHealthStats,
} from './philhealth-store.js';

import { validatePhilHealthClaimDraft } from './philhealth-validator.js';
import { appendRcmAudit } from '../audit/rcm-audit.js';
import type { PhilHealthClaimStatus } from './philhealth-types.js';

/* ── Session helper ─────────────────────────────────────────── */

function sessionActor(request: FastifyRequest): string {
  const s = (request as any).session;
  return s?.userName || s?.duz || 'unknown';
}

function resolveTenantId(request: FastifyRequest): string {
  const headerTenantId = request.headers['x-tenant-id'];
  if (typeof headerTenantId === 'string' && headerTenantId.trim().length > 0) {
    return headerTenantId.trim();
  }
  const requestTenantId = (request as any).tenantId || (request as any).session?.tenantId;
  if (typeof requestTenantId === 'string' && requestTenantId.trim().length > 0) {
    return requestTenantId.trim();
  }
  return 'default';
}

/* ── Default facility ID (single-tenant sandbox) ────────────── */

const DEFAULT_FACILITY_ID = process.env.PHILHEALTH_FACILITY_CODE || 'DEFAULT';

/* ── Route Registration ─────────────────────────────────────── */

export default async function philhealthRoutes(server: FastifyInstance): Promise<void> {
  /* ── Stats ────────────────────────────────────────────────── */

  server.get('/rcm/philhealth/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = getPhilHealthStats(resolveTenantId(request));
    return reply.send({ ok: true, ...stats });
  });

  /* ── Create Claim Draft ───────────────────────────────────── */

  server.post('/rcm/philhealth/claims', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const actor = sessionActor(request);

    if (
      !body.patientLastName ||
      !body.patientFirstName ||
      !body.philhealthPin ||
      !body.admissionDate ||
      !body.patientType
    ) {
      return reply.status(400).send({
        ok: false,
        error:
          'Required: patientLastName, patientFirstName, philhealthPin, admissionDate, patientType',
      });
    }

    const draft = createPhilHealthClaimDraft({
      tenantId: resolveTenantId(request),
      facilityId: body.facilityId || DEFAULT_FACILITY_ID,
      patientDfn: body.patientDfn || '',
      patientLastName: body.patientLastName,
      patientFirstName: body.patientFirstName,
      patientMiddleName: body.patientMiddleName,
      patientDob: body.patientDob,
      patientSex: body.patientSex,
      philhealthPin: body.philhealthPin,
      memberPin: body.memberPin,
      memberRelationship: body.memberRelationship,
      encounterIen: body.encounterIen,
      admissionDate: body.admissionDate,
      dischargeDate: body.dischargeDate,
      patientType: body.patientType,
      caseRateCode: body.caseRateCode,
      caseRateDescription: body.caseRateDescription,
      createdBy: actor,
    });

    appendRcmAudit('claim.created', {
      claimId: draft.id,
      userId: actor,
      patientDfn: body.patientDfn,
      detail: { source: 'philhealth-eclaims3', patientType: draft.patientType },
    });

    return reply.status(201).send({ ok: true, draft });
  });

  /* ── List Claim Drafts ────────────────────────────────────── */

  server.get('/rcm/philhealth/claims', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query as any) || {};
    const drafts = listPhilHealthClaimDrafts({
      tenantId: resolveTenantId(request),
      facilityId: q.facilityId,
      patientDfn: q.patientDfn,
      status: q.status as PhilHealthClaimStatus | undefined,
    });
    return reply.send({ ok: true, count: drafts.length, drafts });
  });

  /* ── Get Claim Draft ──────────────────────────────────────── */

  server.get('/rcm/philhealth/claims/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const { id } = request.params as { id: string };
    const draft = getPhilHealthClaimDraft(resolveTenantId(request), id);
    if (!draft) return reply.status(404).send({ ok: false, error: 'Claim draft not found' });
    return reply.send({ ok: true, draft });
  });

  /* ── Patch Claim Draft ────────────────────────────────────── */

  server.patch(
    '/rcm/philhealth/claims/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const actor = sessionActor(request);

      const result = patchPhilHealthClaimDraft(resolveTenantId(request), id, body);
      if (!result.ok) return reply.status(400).send(result);

      appendRcmAudit('claim.updated', {
        claimId: id,
        userId: actor,
        detail: { source: 'philhealth-eclaims3', fields: Object.keys(body) },
      });

      return reply.send({ ok: true, draft: result.draft });
    }
  );

  /* ── Transition Status ────────────────────────────────────── */

  server.put(
    '/rcm/philhealth/claims/:id/status',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};
      const actor = sessionActor(request);

      if (!body.status) {
        return reply.status(400).send({ ok: false, error: 'Required: status' });
      }

      const result = transitionPhilHealthClaimStatus(
        resolveTenantId(request),
        id,
        body.status,
        actor,
        body.reason
      );
      if (!result.ok) return reply.status(400).send(result);

      appendRcmAudit('claim.transition', {
        claimId: id,
        userId: actor,
        detail: { source: 'philhealth-eclaims3', toStatus: body.status, reason: body.reason },
      });

      return reply.send({ ok: true, draft: result.draft });
    }
  );

  /* ── Validate ─────────────────────────────────────────────── */

  server.post(
    '/rcm/philhealth/claims/:id/validate',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const draft = getPhilHealthClaimDraft(resolveTenantId(request), id);
      if (!draft) return reply.status(404).send({ ok: false, error: 'Claim draft not found' });

      const result = validatePhilHealthClaimDraft(draft);

      appendRcmAudit('validation.run', {
        claimId: id,
        userId: sessionActor(request),
        detail: {
          source: 'philhealth-eclaims3',
          valid: result.valid,
          errorCount: result.errors.length,
          warningCount: result.warnings.length,
          eclaims3: result.eclaims3Compliance,
        },
      });

      return reply.send({ ok: true, validation: result });
    }
  );

  /* ── Export Package ───────────────────────────────────────── */

  server.post(
    '/rcm/philhealth/claims/:id/export',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const actor = sessionActor(request);
      const signingKey = process.env.PHILHEALTH_SOA_SIGNING_KEY;

      const result = generateExportPackage(resolveTenantId(request), id, actor, signingKey);
      if (!result.ok) return reply.status(400).send(result);

      appendRcmAudit('claim.exported', {
        claimId: id,
        userId: actor,
        detail: {
          source: 'philhealth-eclaims3',
          exportId: result.manifest?.exportId,
          fileCount: result.manifest?.files.length,
          version: '3.0',
        },
      });

      return reply.send({
        ok: true,
        manifest: result.manifest,
        draft: result.draft,
        _notice:
          'NOT CERTIFIED: This export is for review only. PhilHealth submission requires facility certification.',
      });
    }
  );

  /* ── Test Upload (Simulated) ──────────────────────────────── */

  server.post(
    '/rcm/philhealth/claims/:id/test-upload',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const actor = sessionActor(request);

      // Run validation first to determine errors/warnings
      const draft = getPhilHealthClaimDraft(resolveTenantId(request), id);
      if (!draft) return reply.status(404).send({ ok: false, error: 'Claim draft not found' });

      const validation = validatePhilHealthClaimDraft(draft);
      const valErrors = validation.errors.map((e) => `${e.field}: ${e.message}`);
      const valWarnings = validation.warnings.map((w) => `${w.field}: ${w.message}`);

      const result = simulateTestUpload(resolveTenantId(request), id, actor, valErrors, valWarnings);
      if (!result.ok) return reply.status(400).send(result);

      appendRcmAudit('gateway.probe', {
        claimId: id,
        userId: actor,
        detail: {
          source: 'philhealth-eclaims3-test-upload',
          simulated: true,
          tcn: result.result?.transmittalControlNumber,
          passed: result.result?.validationPassed,
        },
      });

      return reply.send({
        ok: true,
        result: result.result,
        draft: result.draft,
        _notice:
          'SIMULATED: This test upload was simulated locally. No data was sent to PhilHealth.',
      });
    }
  );

  /* ── Get Facility Setup ───────────────────────────────────── */

  server.get('/rcm/philhealth/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    const q = (request.query as any) || {};
    const facilityId = q.facilityId || DEFAULT_FACILITY_ID;
    const setup = getOrCreateFacilitySetup(resolveTenantId(request), facilityId);
    return reply.send({ ok: true, setup });
  });

  /* ── Update Facility Setup ────────────────────────────────── */

  server.patch('/rcm/philhealth/setup', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = (request.body as any) || {};
    const actor = sessionActor(request);
    const facilityId = body.facilityId || DEFAULT_FACILITY_ID;

    const setup = updateFacilitySetup(resolveTenantId(request), facilityId, body);

    appendRcmAudit('enrollment.updated', {
      userId: actor,
      payerId: 'PH-PHIC',
      detail: { source: 'philhealth-setup', facilityId, fields: Object.keys(body) },
    });

    return reply.send({ ok: true, setup });
  });

  /* ── Add Provider Accreditation ───────────────────────────── */

  server.post(
    '/rcm/philhealth/setup/providers',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body as any) || {};
      const actor = sessionActor(request);
      const facilityId = body.facilityId || DEFAULT_FACILITY_ID;

      if (!body.providerName || !body.prcLicenseNumber) {
        return reply
          .status(400)
          .send({ ok: false, error: 'Required: providerName, prcLicenseNumber' });
      }

      const setup = addProviderAccreditation(resolveTenantId(request), facilityId, {
        providerName: body.providerName,
        prcLicenseNumber: body.prcLicenseNumber,
        philhealthAccreditationNumber: body.philhealthAccreditationNumber,
        specialty: body.specialty,
        expiryDate: body.expiryDate,
      });

      appendRcmAudit('enrollment.created', {
        userId: actor,
        payerId: 'PH-PHIC',
        detail: { source: 'philhealth-provider-accreditation', prc: body.prcLicenseNumber },
      });

      return reply.send({ ok: true, setup });
    }
  );

  /* ── Remove Provider Accreditation ────────────────────────── */

  server.delete(
    '/rcm/philhealth/setup/providers/:prc',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { prc } = request.params as { prc: string };
      const actor = sessionActor(request);
      const q = (request.query as any) || {};
      const facilityId = q.facilityId || DEFAULT_FACILITY_ID;

      const setup = removeProviderAccreditation(resolveTenantId(request), facilityId, prc);

      appendRcmAudit('enrollment.updated', {
        userId: actor,
        payerId: 'PH-PHIC',
        detail: { source: 'philhealth-provider-removed', prc },
      });

      return reply.send({ ok: true, setup });
    }
  );

  /* ── Toggle Readiness Checklist Item ──────────────────────── */

  server.put(
    '/rcm/philhealth/setup/readiness/:itemId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { itemId } = request.params as { itemId: string };
      const body = (request.body as any) || {};
      const actor = sessionActor(request);
      const facilityId = body.facilityId || DEFAULT_FACILITY_ID;

      const setup = updateReadinessItem(
        resolveTenantId(request),
        facilityId,
        itemId,
        !!body.completed,
        actor
      );

      appendRcmAudit('gateway.readiness_checked', {
        userId: actor,
        payerId: 'PH-PHIC',
        detail: { source: 'philhealth-readiness', itemId, completed: !!body.completed },
      });

      return reply.send({ ok: true, setup });
    }
  );
}
