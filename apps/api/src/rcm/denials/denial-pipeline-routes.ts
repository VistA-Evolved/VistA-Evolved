/**
 * Denial Pipeline Hardening Routes — Phase 520 (Wave 37 B8)
 *
 * REST endpoints for:
 *   - Batch 835 → denial pipeline processing
 *   - Posting staging approval workflow
 *   - Pipeline statistics
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import {
  processRemittanceBatch,
  getBatch,
  listBatches,
  getStagingEntry,
  listStagingEntries,
  approveStagingEntry,
  rejectStagingEntry,
  approveBatch,
  getPipelineStats,
  normalizeCodes,
  classifyRemittanceLine,
} from './denial-pipeline-hardener.js';
import type { NormalizedRemittance, NormalizedPaymentLine, PaymentCode } from '../reconciliation/types.js';
import type { PostingApprovalStatus } from './denial-pipeline-hardener.js';

export async function denialPipelineRoutes(server: FastifyInstance): Promise<void> {
  const prefix = '/rcm/denials/pipeline';

  /* ── Process 835 batch ──────────────────────────────────
   * POST /rcm/denials/pipeline/process
   * Body: { remittance: NormalizedRemittance, options?: {...} }
   */
  server.post(`${prefix}/process`, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { remittance, options } = body;

    if (!remittance || !Array.isArray(remittance.lines)) {
      return reply.code(400).send({
        ok: false,
        error: 'remittance object with lines[] required',
      });
    }

    const result = processRemittanceBatch(remittance as NormalizedRemittance, {
      sourceFile: options?.sourceFile,
      parserUsed: options?.parserUsed,
      importedBy: options?.importedBy,
      autoApproveFullPayments: options?.autoApproveFullPayments ?? false,
      autoApproveBelowCents: options?.autoApproveBelowCents,
    });

    return reply.send({ ok: true, ...result });
  });

  /* ── List batches ───────────────────────────────────────
   * GET /rcm/denials/pipeline/batches?limit=50
   */
  server.get(`${prefix}/batches`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { limit } = (req.query as any) || {};
    const batches = listBatches(Number(limit) || 50);

    return reply.send({
      ok: true,
      count: batches.length,
      batches: batches.map(b => ({
        id: b.id,
        payerId: b.payerId,
        checkNumber: b.checkNumber,
        importedAt: b.importedAt,
        lineCount: b.lineCount,
        denialCount: b.denialCount,
        adjustmentCount: b.adjustmentCount,
        fullPaymentCount: b.fullPaymentCount,
        totalBilled: b.totalBilled,
        totalPaid: b.totalPaid,
        status: b.status,
      })),
    });
  });

  /* ── Get batch detail ───────────────────────────────────
   * GET /rcm/denials/pipeline/batches/:id
   */
  server.get(`${prefix}/batches/:id`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const batch = getBatch(id);

    if (!batch) {
      return reply.code(404).send({ ok: false, error: 'Batch not found' });
    }

    return reply.send({
      ok: true,
      batch: {
        id: batch.id,
        sourceFile: batch.sourceFile,
        sourceHash: batch.sourceHash,
        parserUsed: batch.parserUsed,
        payerId: batch.payerId,
        checkNumber: batch.checkNumber,
        importedAt: batch.importedAt,
        importedBy: batch.importedBy,
        lineCount: batch.lineCount,
        denialCount: batch.denialCount,
        adjustmentCount: batch.adjustmentCount,
        fullPaymentCount: batch.fullPaymentCount,
        totalBilled: batch.totalBilled,
        totalPaid: batch.totalPaid,
        status: batch.status,
        stagingEntries: batch.stagingEntries.map(e => ({
          id: e.id,
          claimRef: e.classifiedLine.claimRef,
          classification: e.classifiedLine.classification,
          approvalStatus: e.approvalStatus,
          billedCents: e.classifiedLine.financials.billedAmountCents,
          paidCents: e.classifiedLine.financials.paidAmountCents,
          denialCaseId: e.denialCaseId,
        })),
      },
    });
  });

  /* ── Approve batch (all pending entries) ────────────────
   * POST /rcm/denials/pipeline/batches/:id/approve
   * Body: { approvedBy: string }
   */
  server.post(`${prefix}/batches/:id/approve`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const approvedBy = body.approvedBy ?? 'operator';

    const batch = approveBatch(id, approvedBy);
    if (!batch) {
      return reply.code(404).send({ ok: false, error: 'Batch not found' });
    }

    return reply.send({
      ok: true,
      batchId: batch.id,
      status: batch.status,
      approvedCount: batch.stagingEntries.filter(
        e => e.approvalStatus === 'approved' || e.approvalStatus === 'auto_approved'
      ).length,
    });
  });

  /* ── List staging entries ───────────────────────────────
   * GET /rcm/denials/pipeline/staging?batchId=&status=&limit=100
   */
  server.get(`${prefix}/staging`, async (req: FastifyRequest, reply: FastifyReply) => {
    const query = (req.query as any) || {};
    const entries = listStagingEntries(
      query.batchId,
      query.status as PostingApprovalStatus | undefined,
      Number(query.limit) || 100,
    );

    return reply.send({
      ok: true,
      count: entries.length,
      entries: entries.map(e => ({
        id: e.id,
        batchId: e.remittanceBatchId,
        claimRef: e.classifiedLine.claimRef,
        classification: e.classifiedLine.classification,
        approvalStatus: e.approvalStatus,
        approvedBy: e.approvedBy,
        approvedAt: e.approvedAt,
        rejectionReason: e.rejectionReason,
        denialCaseId: e.denialCaseId,
        billedCents: e.classifiedLine.financials.billedAmountCents,
        paidCents: e.classifiedLine.financials.paidAmountCents,
        adjustmentCents: e.classifiedLine.financials.adjustmentAmountCents,
        primaryDenialReason: e.classifiedLine.primaryDenialReason,
        actionRecommendation: e.classifiedLine.actionRecommendation,
      })),
    });
  });

  /* ── Get staging entry detail ───────────────────────────
   * GET /rcm/denials/pipeline/staging/:id
   */
  server.get(`${prefix}/staging/:id`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const entry = getStagingEntry(id);

    if (!entry) {
      return reply.code(404).send({ ok: false, error: 'Staging entry not found' });
    }

    return reply.send({ ok: true, entry });
  });

  /* ── Approve staging entry ──────────────────────────────
   * POST /rcm/denials/pipeline/staging/:id/approve
   * Body: { approvedBy: string }
   */
  server.post(`${prefix}/staging/:id/approve`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};
    const approvedBy = body.approvedBy ?? 'operator';

    const entry = approveStagingEntry(id, approvedBy);
    if (!entry) {
      return reply.code(404).send({ ok: false, error: 'Staging entry not found' });
    }

    return reply.send({
      ok: true,
      entryId: entry.id,
      approvalStatus: entry.approvalStatus,
      approvedBy: entry.approvedBy,
    });
  });

  /* ── Reject staging entry ───────────────────────────────
   * POST /rcm/denials/pipeline/staging/:id/reject
   * Body: { rejectedBy: string, reason: string }
   */
  server.post(`${prefix}/staging/:id/reject`, async (req: FastifyRequest, reply: FastifyReply) => {
    const { id } = req.params as any;
    const body = (req.body as any) || {};

    if (!body.reason) {
      return reply.code(400).send({ ok: false, error: 'reason required' });
    }

    const entry = rejectStagingEntry(id, body.rejectedBy ?? 'operator', body.reason);
    if (!entry) {
      return reply.code(404).send({ ok: false, error: 'Staging entry not found' });
    }

    return reply.send({
      ok: true,
      entryId: entry.id,
      approvalStatus: entry.approvalStatus,
      rejectionReason: entry.rejectionReason,
    });
  });

  /* ── Pipeline stats ─────────────────────────────────────
   * GET /rcm/denials/pipeline/stats
   */
  server.get(`${prefix}/stats`, async (_req: FastifyRequest, reply: FastifyReply) => {
    return reply.send({ ok: true, ...getPipelineStats() });
  });

  /* ── Normalize codes (utility) ──────────────────────────
   * POST /rcm/denials/pipeline/normalize-codes
   * Body: { codes: PaymentCode[] }
   */
  server.post(`${prefix}/normalize-codes`, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { codes } = body;

    if (!Array.isArray(codes)) {
      return reply.code(400).send({ ok: false, error: 'codes[] required' });
    }

    const normalized = normalizeCodes(codes as PaymentCode[]);
    return reply.send({ ok: true, normalized });
  });

  /* ── Classify single line (utility) ─────────────────────
   * POST /rcm/denials/pipeline/classify-line
   * Body: { line: NormalizedPaymentLine }
   */
  server.post(`${prefix}/classify-line`, async (req: FastifyRequest, reply: FastifyReply) => {
    const body = (req.body as any) || {};
    const { line } = body;

    if (!line || !line.claimRef) {
      return reply.code(400).send({ ok: false, error: 'line with claimRef required' });
    }

    const classified = classifyRemittanceLine(line as NormalizedPaymentLine, 0);
    return reply.send({ ok: true, classified });
  });
}
