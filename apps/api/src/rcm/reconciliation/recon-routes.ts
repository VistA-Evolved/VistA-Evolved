/**
 * Reconciliation API Routes — Phase 99
 *
 * Endpoints:
 *   POST /rcm/reconciliation/import       — Import remittance batch (835 or manual)
 *   GET  /rcm/reconciliation/imports       — List remittance imports
 *   GET  /rcm/reconciliation/imports/:id   — Get import detail with payments
 *   GET  /rcm/reconciliation/payments      — Paginated payment list
 *   GET  /rcm/reconciliation/payments/:id  — Get payment detail with matches
 *   POST /rcm/reconciliation/payments/:id/match — Manual match payment to claim
 *   POST /rcm/reconciliation/match-batch   — Run matching engine on an import batch
 *   GET  /rcm/reconciliation/matches/review — List matches needing review
 *   PATCH /rcm/reconciliation/matches/:id  — Confirm / reject match
 *   GET  /rcm/reconciliation/underpayments — Paginated underpayment list
 *   GET  /rcm/reconciliation/underpayments/:id — Get underpayment detail
 *   PATCH /rcm/reconciliation/underpayments/:id — Update underpayment status
 *   POST /rcm/reconciliation/underpayments/:id/send-to-denials — Bridge to Phase 98
 *   GET  /rcm/reconciliation/stats         — Dashboard stats
 *
 * All under /rcm/ — existing catch-all covers session auth.
 * Mutations wired to appendRcmAudit.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  createRemittanceImport,
  getRemittanceImportById,
  listRemittanceImports,
  createPaymentRecord,
  getPaymentById,
  updatePaymentStatus,
  listPayments,
  listPaymentsByImport,
  createMatch,
  getMatchById,
  confirmMatch,
  listMatchesByPayment,
  listMatchesByStatus,
  getUnderpaymentById,
  updateUnderpaymentCase,
  listUnderpayments,
  getReconciliationStats,
} from './recon-store.js';
import { matchImportBatch } from './matching-engine.js';
import { appendRcmAudit } from '../audit/rcm-audit.js';
import {
  ImportRemittanceBatchSchema,
  PaymentListQuerySchema,
  ConfirmMatchSchema,
  UnderpaymentListQuerySchema,
  UpdateUnderpaymentSchema,
  isValidUnderpaymentTransition,
} from './types.js';
import type { UnderpaymentStatus } from './types.js';

/* ── Session helper ────────────────────────────────────────── */

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

/* ── Route Registration ────────────────────────────────────── */

export default async function reconciliationRoutes(server: FastifyInstance): Promise<void> {
  /* ─────────────────────────────────────────────────
   * POST /rcm/reconciliation/import
   * Import a remittance batch (EDI 835 JSON or manual)
   * ───────────────────────────────────────────────── */
  server.post(
    '/rcm/reconciliation/import',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body as any) || {};
      const parsed = ImportRemittanceBatchSchema.safeParse(body);
      if (!parsed.success) {
        return reply.status(400).send({ ok: false, error: parsed.error.issues });
      }

      const { duz, tenantId } = getSession(request);
      const { entries, sourceType, originalFilename, parserVersion } = parsed.data;

      // Compute totals
      let totalPaidCents = 0;
      let totalBilledCents = 0;
      for (const e of entries) {
        totalPaidCents += Math.round(e.paidAmount * 100);
        totalBilledCents += Math.round(e.billedAmount * 100);
      }

      // Create import record
      const imp = await createRemittanceImport({
        tenantId,
        sourceType,
        originalFilename,
        parserName: 'batch-api',
        parserVersion,
        lineCount: entries.length,
        totalPaidCents,
        totalBilledCents,
        importedBy: duz,
      });

      // Create payment records for each line
      const payments = await Promise.all(
        entries.map((e, idx) =>
          createPaymentRecord({
            tenantId,
            remittanceImportId: imp.id,
            claimRef: e.claimRef,
            payerId: e.payerId,
            billedAmountCents: Math.round(e.billedAmount * 100),
            paidAmountCents: Math.round(e.paidAmount * 100),
            allowedAmountCents:
              e.allowedAmount != null ? Math.round(e.allowedAmount * 100) : undefined,
            patientRespCents: e.patientResp != null ? Math.round(e.patientResp * 100) : undefined,
            adjustmentAmountCents:
              e.adjustmentAmount != null ? Math.round(e.adjustmentAmount * 100) : undefined,
            traceNumber: e.traceNumber,
            checkNumber: e.checkNumber,
            postedDate: e.postedDate,
            serviceDate: e.serviceDate,
            rawCodes: e.rawCodes ?? [],
            patientDfn: e.patientDfn,
            lineIndex: idx,
          })
        )
      );

      appendRcmAudit('recon.imported', {
        userId: duz,
        detail: {
          importId: imp.id,
          sourceType,
          lineCount: entries.length,
          totalPaidCents,
          totalBilledCents,
        },
      });

      return reply.status(201).send({
        ok: true,
        import: imp,
        paymentsCreated: payments.length,
      });
    }
  );

  /* ─────────────────────────────────────────────────
   * GET /rcm/reconciliation/imports
   * ───────────────────────────────────────────────── */
  server.get(
    '/rcm/reconciliation/imports',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const imports = await listRemittanceImports(getSession(request).tenantId);
      return reply.send({ ok: true, imports });
    }
  );

  /* ─────────────────────────────────────────────────
   * GET /rcm/reconciliation/imports/:id
   * ───────────────────────────────────────────────── */
  server.get(
    '/rcm/reconciliation/imports/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = getSession(request);
      const imp = await getRemittanceImportById(tenantId, id);
      if (!imp) {
        return reply.status(404).send({ ok: false, error: 'Import not found' });
      }
      const payments = await listPaymentsByImport(tenantId, id);
      return reply.send({ ok: true, import: imp, payments });
    }
  );

  /* ─────────────────────────────────────────────────
   * GET /rcm/reconciliation/payments
   * ───────────────────────────────────────────────── */
  server.get(
    '/rcm/reconciliation/payments',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const q = (request.query as any) || {};
      const parsed = PaymentListQuerySchema.safeParse(q);
      if (!parsed.success) {
        return reply.status(400).send({ ok: false, error: parsed.error.issues });
      }
      const result = await listPayments(getSession(request).tenantId, parsed.data);
      return reply.send({ ok: true, ...result });
    }
  );

  /* ─────────────────────────────────────────────────
   * GET /rcm/reconciliation/payments/:id
   * ───────────────────────────────────────────────── */
  server.get(
    '/rcm/reconciliation/payments/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = getSession(request);
      const payment = await getPaymentById(tenantId, id);
      if (!payment) {
        return reply.status(404).send({ ok: false, error: 'Payment not found' });
      }
      const matches = await listMatchesByPayment(tenantId, id);
      return reply.send({ ok: true, payment, matches });
    }
  );

  /* ─────────────────────────────────────────────────
   * POST /rcm/reconciliation/payments/:id/match
   * Manual match: create a match record for a payment
   * ───────────────────────────────────────────────── */
  server.post(
    '/rcm/reconciliation/payments/:id/match',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { duz, tenantId } = getSession(request);
      const payment = await getPaymentById(tenantId, id);
      if (!payment) {
        return reply.status(404).send({ ok: false, error: 'Payment not found' });
      }

      const body = (request.body as any) || {};
      const claimRef = body.claimRef;
      const notes = body.notes ?? null;
      if (!claimRef) {
        return reply.status(400).send({ ok: false, error: 'claimRef is required' });
      }

      const match = await createMatch({
        tenantId,
        paymentId: id,
        claimRef,
        matchConfidence: 100,
        matchMethod: 'MANUAL',
        matchStatus: 'CONFIRMED',
        matchNotes: notes,
      });

      // Confirm match immediately
      await confirmMatch(tenantId, match.id, 'CONFIRMED', duz, notes);
      await updatePaymentStatus(tenantId, id, 'MATCHED');

      appendRcmAudit('recon.matched', {
        claimId: claimRef,
        payerId: payment.payerId,
        userId: duz,
        detail: { paymentId: id, matchId: match.id, method: 'MANUAL' },
      });

      return reply.status(201).send({ ok: true, match });
    }
  );

  /* ─────────────────────────────────────────────────
   * POST /rcm/reconciliation/match-batch
   * Run matching engine on an import batch
   * ───────────────────────────────────────────────── */
  server.post(
    '/rcm/reconciliation/match-batch',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const body = (request.body as any) || {};
      const importId = body.importId;
      if (!importId) {
        return reply.status(400).send({ ok: false, error: 'importId is required' });
      }

      const { duz, tenantId } = getSession(request);
      const imp = await getRemittanceImportById(tenantId, importId);
      if (!imp) {
        return reply.status(404).send({ ok: false, error: 'Import not found' });
      }

      const result = await matchImportBatch(tenantId, importId);

      appendRcmAudit('recon.batch_matched', {
        userId: duz,
        detail: {
          importId,
          totalLines: result.totalLines,
          matched: result.matched,
          needsReview: result.needsReview,
          unmatched: result.unmatched,
          underpayments: result.underpayments,
          errors: result.errors.length,
        },
      });

      return reply.send({ ok: true, ...result });
    }
  );

  /* ─────────────────────────────────────────────────
   * GET /rcm/reconciliation/matches/review
   * List matches needing human review
   * ───────────────────────────────────────────────── */
  server.get(
    '/rcm/reconciliation/matches/review',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const matches = await listMatchesByStatus(getSession(request).tenantId, 'REVIEW_REQUIRED');
      return reply.send({ ok: true, matches });
    }
  );

  /* ─────────────────────────────────────────────────
   * PATCH /rcm/reconciliation/matches/:id
   * Confirm or reject a match
   * ───────────────────────────────────────────────── */
  server.patch(
    '/rcm/reconciliation/matches/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { duz, tenantId } = getSession(request);
      const existing = await getMatchById(tenantId, id);
      if (!existing) {
        return reply.status(404).send({ ok: false, error: 'Match not found' });
      }

      const body = (request.body as any) || {};
      const parsed = ConfirmMatchSchema.safeParse(body);
      if (!parsed.success) {
        return reply.status(400).send({ ok: false, error: parsed.error.issues });
      }

      const updated = await confirmMatch(tenantId, id, parsed.data.matchStatus, duz, parsed.data.notes);

      // Update payment status based on match decision
      if (parsed.data.matchStatus === 'CONFIRMED') {
        await updatePaymentStatus(tenantId, existing.paymentId, 'MATCHED');
      } else if (parsed.data.matchStatus === 'REJECTED') {
        await updatePaymentStatus(tenantId, existing.paymentId, 'UNMATCHED');
      }

      appendRcmAudit('recon.confirmed', {
        claimId: existing.claimRef,
        userId: duz,
        detail: {
          matchId: id,
          paymentId: existing.paymentId,
          decision: parsed.data.matchStatus,
          confidence: existing.matchConfidence,
        },
      });

      return reply.send({ ok: true, match: updated });
    }
  );

  /* ─────────────────────────────────────────────────
   * GET /rcm/reconciliation/underpayments
   * ───────────────────────────────────────────────── */
  server.get(
    '/rcm/reconciliation/underpayments',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const q = (request.query as any) || {};
      const parsed = UnderpaymentListQuerySchema.safeParse(q);
      if (!parsed.success) {
        return reply.status(400).send({ ok: false, error: parsed.error.issues });
      }
      const result = await listUnderpayments(getSession(request).tenantId, parsed.data);
      return reply.send({ ok: true, ...result });
    }
  );

  /* ─────────────────────────────────────────────────
   * GET /rcm/reconciliation/underpayments/:id
   * ───────────────────────────────────────────────── */
  server.get(
    '/rcm/reconciliation/underpayments/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { tenantId } = getSession(request);
      const up = await getUnderpaymentById(tenantId, id);
      if (!up) {
        return reply.status(404).send({ ok: false, error: 'Underpayment case not found' });
      }
      // Fetch the associated payment + matches for context
      const payment = await getPaymentById(tenantId, up.paymentId);
      const matches = payment ? await listMatchesByPayment(tenantId, payment.id) : [];
      return reply.send({ ok: true, underpayment: up, payment, matches });
    }
  );

  /* ─────────────────────────────────────────────────
   * PATCH /rcm/reconciliation/underpayments/:id
   * Update underpayment status with FSM validation
   * ───────────────────────────────────────────────── */
  server.patch(
    '/rcm/reconciliation/underpayments/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { duz, tenantId } = getSession(request);
      const existing = await getUnderpaymentById(tenantId, id);
      if (!existing) {
        return reply.status(404).send({ ok: false, error: 'Underpayment case not found' });
      }

      const body = (request.body as any) || {};
      const parsed = UpdateUnderpaymentSchema.safeParse(body);
      if (!parsed.success) {
        return reply.status(400).send({ ok: false, error: parsed.error.issues });
      }

      // FSM guard
      if (
        parsed.data.status &&
        !isValidUnderpaymentTransition(existing.status, parsed.data.status)
      ) {
        return reply.status(400).send({
          ok: false,
          error: `Invalid transition: ${existing.status} -> ${parsed.data.status}`,
        });
      }

      const updated = await updateUnderpaymentCase(
        tenantId,
        id,
        {
          status: parsed.data.status,
          resolutionNote: parsed.data.resolutionNote,
        },
        duz
      );

      appendRcmAudit('recon.underpayment_updated', {
        claimId: existing.claimRef,
        payerId: existing.payerId,
        userId: duz,
        detail: {
          underpaymentId: id,
          oldStatus: existing.status,
          newStatus: parsed.data.status ?? existing.status,
          reason: parsed.data.reason,
          deltaCents: existing.deltaCents,
        },
      });

      return reply.send({ ok: true, underpayment: updated });
    }
  );

  /* ─────────────────────────────────────────────────
   * POST /rcm/reconciliation/underpayments/:id/send-to-denials
   * Bridge: create a Phase 98 denial case from underpayment
   * ───────────────────────────────────────────────── */
  server.post(
    '/rcm/reconciliation/underpayments/:id/send-to-denials',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { id } = request.params as { id: string };
      const { duz, tenantId } = getSession(request);
      const up = await getUnderpaymentById(tenantId, id);
      if (!up) {
        return reply.status(404).send({ ok: false, error: 'Underpayment case not found' });
      }

      if (up.denialCaseId) {
        return reply.status(409).send({
          ok: false,
          error: 'Already linked to denial case',
          denialCaseId: up.denialCaseId,
        });
      }

      // Lazy import to avoid circular dependency
      const { createDenialCase } = await import('../denials/denial-store.js');

      // Create denial case from underpayment
      const denial = await createDenialCase(
        {
          tenantId,
          claimRef: up.claimRef,
          payerId: up.payerId,
          denialSource: 'EDI_835',
          billedAmount: up.expectedAmountCents / 100,
          paidAmount: up.paidAmountCents / 100,
          denialCodes: [],
          denialNarrative: `Auto-created from underpayment case ${up.id}. Expected: $${(up.expectedAmountCents / 100).toFixed(2)}, Paid: $${(up.paidAmountCents / 100).toFixed(2)}, Delta: $${(up.deltaCents / 100).toFixed(2)}`,
        },
        duz
      );

      // Link underpayment to denial
      await updateUnderpaymentCase(
        tenantId,
        id,
        {
          status: 'APPEALING' as UnderpaymentStatus,
          denialCaseId: denial.id,
        },
        duz
      );

      appendRcmAudit('recon.sent_to_denials', {
        claimId: up.claimRef,
        payerId: up.payerId,
        userId: duz,
        detail: {
          underpaymentId: id,
          denialCaseId: denial.id,
          deltaCents: up.deltaCents,
        },
      });

      return reply.status(201).send({ ok: true, denialCaseId: denial.id, underpaymentId: id });
    }
  );

  /* ─────────────────────────────────────────────────
   * GET /rcm/reconciliation/stats
   * ───────────────────────────────────────────────── */
  server.get('/rcm/reconciliation/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    const stats = await getReconciliationStats(getSession(request).tenantId);
    return reply.send({ ok: true, stats });
  });
}
