/**
 * HMO Portal Routes — Phase 97
 *
 * Fastify plugin for HMO LOA + Claim Packet + Portal Adapter endpoints.
 *
 * Route prefix: /rcm/hmo-portal/*
 * Auth: session-level via /rcm/ catch-all in security.ts AUTH_RULES.
 *
 * Endpoints:
 *   GET  /rcm/hmo-portal/status                   — Adapter overview + registered adapters
 *   GET  /rcm/hmo-portal/adapters                  — List registered portal adapters
 *   GET  /rcm/hmo-portal/adapters/:payerId         — Single adapter detail
 *   GET  /rcm/hmo-portal/adapters/:payerId/health  — Adapter health check
 *   GET  /rcm/hmo-portal/specialties               — List specialty templates
 *   POST /rcm/hmo-portal/loa/build                 — Build LOA packet from LOA request
 *   POST /rcm/hmo-portal/loa/export                — Export LOA packet (JSON/text)
 *   POST /rcm/hmo-portal/loa/submit                — Submit LOA via adapter (manual-assisted)
 *   POST /rcm/hmo-portal/claims/build              — Build HMO claim packet from claim
 *   POST /rcm/hmo-portal/claims/export             — Export HMO claim packet
 *   POST /rcm/hmo-portal/claims/submit             — Submit claim via adapter (manual-assisted)
 *   POST /rcm/hmo-portal/status-check              — Check portal status (manual)
 *   POST /rcm/hmo-portal/remit-check               — Check remittance (manual)
 *   GET  /rcm/hmo-portal/submissions               — List submission records
 *   GET  /rcm/hmo-portal/submissions/:id           — Get submission detail
 *   PUT  /rcm/hmo-portal/submissions/:id/status    — Transition status
 *   POST /rcm/hmo-portal/submissions/:id/note      — Add staff note
 *   GET  /rcm/hmo-portal/submissions/stats         — Submission stats
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  getPortalAdapter,
  listPortalAdapters,
  isPortalCapableHmo,
  PORTAL_CAPABLE_HMOS,
  type LoaPacket,
  type HmoClaimPacket,
  type HmoSubmissionStatus,
} from './types.js';
import { buildLoaPacket, generateLoaExports, listSpecialtyTemplates } from './loa-engine.js';
import {
  buildHmoClaimPacket,
  exportHmoPacketJson,
  exportHmoPacketText,
} from './hmo-packet-builder.js';
import {
  createSubmission,
  getSubmission,
  listSubmissions,
  transitionSubmission,
  updateSubmissionFields,
  addStaffNote,
  addExportFile,
  getSubmissionStats,
} from './submission-tracker.js';

/* ── In-Memory Packet Caches ────────────────────────────────── */

const loaPacketCache = new Map<string, LoaPacket>();
const claimPacketCache = new Map<string, HmoClaimPacket>();

function resolveTenantId(request: FastifyRequest): string | null {
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
  const tenantId = resolveTenantId(request);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, error: 'TENANT_REQUIRED' });
  return null;
}

/* ── Plugin ─────────────────────────────────────────────────── */

export default async function hmoPortalRoutes(server: FastifyInstance): Promise<void> {
  /* ── GET /rcm/hmo-portal/status ───────────────────────────── */
  server.get('/rcm/hmo-portal/status', async () => {
    const adapters = listPortalAdapters();
    return {
      ok: true,
      phase: 97,
      module: 'hmo-portal-adapter',
      mode: 'manual_assisted',
      portalCapableHmos: [...PORTAL_CAPABLE_HMOS],
      registeredAdapters: adapters.length,
      adapters,
    };
  });

  /* ── GET /rcm/hmo-portal/adapters ─────────────────────────── */
  server.get('/rcm/hmo-portal/adapters', async () => {
    return { ok: true, adapters: listPortalAdapters() };
  });

  /* ── GET /rcm/hmo-portal/adapters/:payerId ────────────────── */
  server.get(
    '/rcm/hmo-portal/adapters/:payerId',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { payerId } = req.params as { payerId: string };
      const adapter = getPortalAdapter(payerId);
      if (!adapter) {
        reply.code(404);
        return { ok: false, error: `No adapter registered for ${payerId}` };
      }
      return {
        ok: true,
        payerId: adapter.payerId,
        adapterName: adapter.adapterName,
        mode: adapter.mode,
        portalBaseUrl: adapter.portalBaseUrl,
      };
    }
  );

  /* ── GET /rcm/hmo-portal/adapters/:payerId/health ─────────── */
  server.get(
    '/rcm/hmo-portal/adapters/:payerId/health',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { payerId } = req.params as { payerId: string };
      const adapter = getPortalAdapter(payerId);
      if (!adapter) {
        reply.code(404);
        return { ok: false, error: `No adapter registered for ${payerId}` };
      }
      const health = await adapter.healthCheck();
      return { ok: true, ...health };
    }
  );

  /* ── GET /rcm/hmo-portal/specialties ──────────────────────── */
  server.get('/rcm/hmo-portal/specialties', async () => {
    return { ok: true, templates: listSpecialtyTemplates() };
  });

  /* ── POST /rcm/hmo-portal/loa/build ──────────────────────── */
  server.post('/rcm/hmo-portal/loa/build', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const {
      loaRequest,
      specialty,
      admissionType,
      requestedServices,
      estimatedDays,
      estimatedCharges,
      attendingPhysicianLicense,
      facilityCode,
    } = body;

    if (!loaRequest) {
      reply.code(400);
      return { ok: false, error: 'loaRequest is required.' };
    }
    if (!specialty) {
      reply.code(400);
      return { ok: false, error: 'specialty is required.' };
    }

    const session = (req as any).session;
    const actor = session?.userName ?? session?.duz ?? 'system';

    const result = buildLoaPacket({
      loaRequest,
      specialty,
      admissionType: admissionType ?? 'outpatient',
      requestedServices: requestedServices ?? [],
      estimatedDays,
      estimatedCharges,
      attendingPhysicianLicense,
      facilityCode,
      actor,
    });

    if (!result.ok || !result.packet) {
      reply.code(400);
      return { ok: false, errors: result.errors };
    }

    loaPacketCache.set(result.packet.packetId, result.packet);
    return { ok: true, packet: result.packet };
  });

  /* ── POST /rcm/hmo-portal/loa/export ─────────────────────── */
  server.post('/rcm/hmo-portal/loa/export', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { packetId, formats } = body;

    if (!packetId) {
      reply.code(400);
      return { ok: false, error: 'packetId is required.' };
    }

    const packet = loaPacketCache.get(packetId);
    if (!packet) {
      reply.code(404);
      return { ok: false, error: `LOA packet not found: ${packetId}` };
    }

    const exports = generateLoaExports(packet, formats);
    return { ok: true, exports };
  });

  /* ── POST /rcm/hmo-portal/loa/submit ─────────────────────── */
  server.post('/rcm/hmo-portal/loa/submit', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { packetId } = body;

    if (!packetId) {
      reply.code(400);
      return { ok: false, error: 'packetId is required.' };
    }

    const packet = loaPacketCache.get(packetId);
    if (!packet) {
      reply.code(404);
      return { ok: false, error: `LOA packet not found: ${packetId}` };
    }

    if (!isPortalCapableHmo(packet.payerId)) {
      reply.code(400);
      return { ok: false, error: `${packet.payerId} is not a portal-capable HMO.` };
    }

    const adapter = getPortalAdapter(packet.payerId);
    if (!adapter) {
      reply.code(404);
      return { ok: false, error: `No adapter registered for ${packet.payerId}` };
    }

    const result = await adapter.submitLOA(packet);

    // Create submission record
    const session = (req as any).session;
    const actor = session?.userName ?? session?.duz ?? 'system';
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const sub = createSubmission({
      tenantId,
      payerId: packet.payerId,
      payerName: packet.payerName,
      loaRequestId: packet.loaRequestId,
      actor,
    });
    updateSubmissionFields(tenantId, sub.id, { loaPacketId: packet.packetId });
    transitionSubmission(
      tenantId,
      sub.id,
      'loa_pending',
      actor,
      'LOA packet generated for manual portal submission.'
    );
    for (const f of result.exportFiles) {
      addExportFile(tenantId, sub.id, f.filename);
    }

    return { ok: true, submissionId: sub.id, result };
  });

  /* ── POST /rcm/hmo-portal/claims/build ───────────────────── */
  server.post('/rcm/hmo-portal/claims/build', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const {
      claim,
      payerName,
      loaReferenceNumber,
      memberId,
      memberType,
      employerName,
      employerCode,
      facilityCode,
      accreditationNumber,
      tinNumber,
      specialty,
      charges,
      professionalFees,
    } = body;

    if (!claim) {
      reply.code(400);
      return { ok: false, error: 'claim is required.' };
    }

    const session = (req as any).session;
    const actor = session?.userName ?? session?.duz ?? 'system';

    const result = buildHmoClaimPacket({
      claim,
      payerName: payerName ?? claim.payerName ?? claim.payerId,
      loaReferenceNumber,
      memberId,
      memberType,
      employerName,
      employerCode,
      facilityCode,
      accreditationNumber,
      tinNumber,
      specialty,
      charges,
      professionalFees,
      actor,
    });

    if (!result.ok || !result.packet) {
      reply.code(400);
      return { ok: false, errors: result.errors };
    }

    claimPacketCache.set(result.packet.packetId, result.packet);
    return { ok: true, packet: result.packet };
  });

  /* ── POST /rcm/hmo-portal/claims/export ──────────────────── */
  server.post('/rcm/hmo-portal/claims/export', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { packetId, format } = body;

    if (!packetId) {
      reply.code(400);
      return { ok: false, error: 'packetId is required.' };
    }

    const packet = claimPacketCache.get(packetId);
    if (!packet) {
      reply.code(404);
      return { ok: false, error: `Claim packet not found: ${packetId}` };
    }

    const exportFn = format === 'text' ? exportHmoPacketText : exportHmoPacketJson;
    const exported = exportFn(packet);
    return { ok: true, export: exported };
  });

  /* ── POST /rcm/hmo-portal/claims/submit ──────────────────── */
  server.post('/rcm/hmo-portal/claims/submit', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { packetId } = body;

    if (!packetId) {
      reply.code(400);
      return { ok: false, error: 'packetId is required.' };
    }

    const packet = claimPacketCache.get(packetId);
    if (!packet) {
      reply.code(404);
      return { ok: false, error: `Claim packet not found: ${packetId}` };
    }

    if (!isPortalCapableHmo(packet.payerId)) {
      reply.code(400);
      return { ok: false, error: `${packet.payerId} is not a portal-capable HMO.` };
    }

    const adapter = getPortalAdapter(packet.payerId);
    if (!adapter) {
      reply.code(404);
      return { ok: false, error: `No adapter registered for ${packet.payerId}.` };
    }

    const result = await adapter.submitClaim(packet);

    const session = (req as any).session;
    const actor = session?.userName ?? session?.duz ?? 'system';
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    const sub = createSubmission({
      tenantId,
      payerId: packet.payerId,
      payerName: packet.payerName,
      claimId: packet.sourceClaimId,
      actor,
    });
    updateSubmissionFields(tenantId, sub.id, { claimPacketId: packet.packetId });
    // Advance through state machine to claim_exported
    transitionSubmission(tenantId, sub.id, 'loa_pending', actor, 'Claim submission initiated.');
    transitionSubmission(tenantId, sub.id, 'loa_approved', actor, 'LOA pre-approved for claim.');
    transitionSubmission(tenantId, sub.id, 'claim_prepared', actor, 'Claim packet built.');
    transitionSubmission(
      tenantId,
      sub.id,
      'claim_exported',
      actor,
      'Claim packet exported for portal submission.'
    );
    for (const f of result.exportFiles) {
      addExportFile(tenantId, sub.id, f.filename);
    }

    return { ok: true, submissionId: sub.id, result };
  });

  /* ── POST /rcm/hmo-portal/status-check ───────────────────── */
  server.post('/rcm/hmo-portal/status-check', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { payerId, claimId } = body;

    if (!payerId || !claimId) {
      reply.code(400);
      return { ok: false, error: 'payerId and claimId are required.' };
    }

    const adapter = getPortalAdapter(payerId);
    if (!adapter) {
      reply.code(404);
      return { ok: false, error: `No adapter for ${payerId}` };
    }

    const result = await adapter.checkStatus(claimId);
    return { ok: true, result };
  });

  /* ── POST /rcm/hmo-portal/remit-check ────────────────────── */
  server.post('/rcm/hmo-portal/remit-check', async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { payerId, claimId } = body;

    if (!payerId || !claimId) {
      reply.code(400);
      return { ok: false, error: 'payerId and claimId are required.' };
    }

    const adapter = getPortalAdapter(payerId);
    if (!adapter) {
      reply.code(404);
      return { ok: false, error: `No adapter for ${payerId}` };
    }

    const result = await adapter.downloadRemit(claimId);
    return { ok: true, result };
  });

  /* ── GET /rcm/hmo-portal/submissions ──────────────────────── */
  server.get('/rcm/hmo-portal/submissions', async (req: FastifyRequest, reply: FastifyReply) => {
    const q = req.query as any;
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    return {
      ok: true,
      submissions: listSubmissions({
        tenantId,
        payerId: q.payerId,
        status: q.status as HmoSubmissionStatus | undefined,
        claimId: q.claimId,
        loaRequestId: q.loaRequestId,
      }),
    };
  });

  /* ── GET /rcm/hmo-portal/submissions/stats ────────────────── */
  server.get('/rcm/hmo-portal/submissions/stats', async (req: FastifyRequest, reply: FastifyReply) => {
    const tenantId = requireTenantId(req, reply);
    if (!tenantId) return;
    return { ok: true, stats: getSubmissionStats(tenantId) };
  });

  /* ── GET /rcm/hmo-portal/submissions/:id ──────────────────── */
  server.get(
    '/rcm/hmo-portal/submissions/:id',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const sub = getSubmission(tenantId, id);
      if (!sub) {
        reply.code(404);
        return { ok: false, error: 'Submission not found.' };
      }
      return { ok: true, submission: sub };
    }
  );

  /* ── PUT /rcm/hmo-portal/submissions/:id/status ───────────── */
  server.put(
    '/rcm/hmo-portal/submissions/:id/status',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const body = (req.body as any) || {};
      const { toStatus, detail } = body;

      if (!toStatus) {
        reply.code(400);
        return { ok: false, error: 'toStatus is required.' };
      }

      const session = (req as any).session;
      const actor = session?.userName ?? session?.duz ?? 'system';
      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;

      const result = transitionSubmission(tenantId, id, toStatus, actor, detail);
      if (!result.ok) {
        reply.code(400);
        return result;
      }

      return { ok: true, submission: result.record };
    }
  );

  /* ── POST /rcm/hmo-portal/submissions/:id/note ───────────── */
  server.post(
    '/rcm/hmo-portal/submissions/:id/note',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { id } = req.params as { id: string };
      const body = (req.body as any) || {};
      const { note } = body;

      if (!note) {
        reply.code(400);
        return { ok: false, error: 'note is required.' };
      }

      const tenantId = requireTenantId(req, reply);
      if (!tenantId) return;
      const result = addStaffNote(tenantId, id, note);
      if (!result.ok) {
        reply.code(404);
        return result;
      }

      return { ok: true, message: 'Note added.' };
    }
  );
}
