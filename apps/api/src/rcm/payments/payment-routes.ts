/**
 * Payment Tracking + Reconciliation + Payer Intelligence — API Routes (Phase 92)
 *
 * Endpoints:
 *   POST /payerops/payments/batches                        — Create batch
 *   POST /payerops/payments/batches/:id/upload             — Upload file data
 *   POST /payerops/payments/batches/:id/import             — Parse CSV into lines
 *   POST /payerops/payments/batches/:id/match              — Run matching engine
 *   GET  /payerops/payments/batches                        — List batches
 *   GET  /payerops/payments/batches/:id                    — Get batch + lines
 *   GET  /payerops/payments/reconciliation                 — Needs-review worklist
 *   POST /payerops/payments/reconciliation/:lineId/link-claim — Manual link
 *   GET  /payerops/analytics/payer-intelligence            — Payer KPIs
 *   GET  /payerops/analytics/aging                         — Aging buckets
 *   GET  /payerops/exports/payments/:batchId               — Export CSV/JSON
 *   GET  /payerops/payments/underpayments                  — Underpayment cases
 *   GET  /payerops/payments/store-info                     — Store stats
 *
 * All routes under /payerops/ — existing security catch-all covers auth.
 * Mutations call appendRcmAudit.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { createHash } from 'node:crypto';
import {
  createBatch,
  getBatch,
  updateBatch,
  listBatches,
  addLine,
  listLines,
  getLine,
  getUnresolvedLines,
  listUnderpayments,
  getPaymentStoreInfo,
} from './payment-store.js';
import { matchBatch, manualLinkLine, parseRemittanceCsv } from './matching-engine.js';
import { computeAging } from './aging-intelligence.js';
import { computePayerIntelligence } from './aging-intelligence.js';
import { exportBatch, getAvailableFormats } from './export-bridge.js';
import { appendRcmAudit } from '../audit/rcm-audit.js';
import type { BatchStatus } from './payment-types.js';

/* ── Helper: extract session ───────────────────────────────── */

function getSession(request: FastifyRequest): { duz: string; tenantId: string } {
  const s = (request as any).session;
  return {
    duz: s?.duz ?? 'system',
    tenantId: s?.tenantId ?? 'default',
  };
}

/* ── Route Registration ────────────────────────────────────── */

export default async function paymentRoutes(server: FastifyInstance): Promise<void> {
  /* ── Create Batch ──────────────────────────────────────── */
  server.post(
    '/payerops/payments/batches',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const body = (request.body as any) || {};

      if (!body.payerId || !body.facilityId) {
        return reply.status(400).send({ ok: false, error: 'payerId and facilityId are required' });
      }

      const batch = createBatch({
        tenantId,
        facilityId: body.facilityId,
        payerId: body.payerId,
        payerName: body.payerName,
        sourceMode: body.sourceMode ?? 'manual_upload',
        createdBy: duz,
        isDemo: body.isDemo,
      });

      appendRcmAudit('remit.received', {
        claimId: batch.id,
        payerId: batch.payerId,
        userId: duz,
        detail: { sourceMode: batch.sourceMode, facilityId: batch.facilityId },
      });

      return reply.status(201).send({ ok: true, batch });
    }
  );

  /* ── Upload file to batch ──────────────────────────────── */
  server.post(
    '/payerops/payments/batches/:id/upload',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const { id } = request.params as { id: string };
      const body = (request.body as any) || {};

      const batch = getBatch(id);
      if (!batch) return reply.status(404).send({ ok: false, error: 'Batch not found' });
      if (batch.tenantId !== tenantId)
        return reply.status(403).send({ ok: false, error: 'Access denied' });

      if (!body.content) {
        return reply
          .status(400)
          .send({ ok: false, error: 'content is required (CSV text or base64)' });
      }

      // Compute checksum for evidence
      const checksum = createHash('sha256').update(body.content).digest('hex').slice(0, 16);

      updateBatch(id, {
        status: 'uploaded',
        fileName: body.fileName ?? 'remittance.csv',
        fileMimeType: body.mimeType ?? 'text/csv',
        fileSizeBytes: body.content.length,
        fileChecksum: checksum,
        fileUri: `memory://${id}/${body.fileName ?? 'remittance.csv'}`,
      });

      // Store content transiently for import step (attach to batch via weakmap)
      uploadCache.set(id, body.content);

      appendRcmAudit('remit.received', {
        claimId: id,
        userId: duz,
        detail: { action: 'file_uploaded', checksum, fileName: body.fileName },
      });

      return reply.send({ ok: true, checksum, fileSize: body.content.length });
    }
  );

  /* ── Import (parse CSV) ────────────────────────────────── */
  server.post(
    '/payerops/payments/batches/:id/import',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const { id } = request.params as { id: string };

      const batch = getBatch(id);
      if (!batch) return reply.status(404).send({ ok: false, error: 'Batch not found' });
      if (batch.tenantId !== tenantId)
        return reply.status(403).send({ ok: false, error: 'Access denied' });

      const csvContent = uploadCache.get(id);
      if (!csvContent) {
        return reply
          .status(400)
          .send({ ok: false, error: 'No file uploaded. Upload first via /upload endpoint.' });
      }

      const parseResult = parseRemittanceCsv(csvContent, id, tenantId);

      // Store parsed lines
      for (const lineData of parseResult.lines) {
        addLine(lineData);
      }

      // Update batch parse summary
      updateBatch(id, {
        status: 'imported',
        parsedSummary: {
          totalLines: parseResult.lines.length,
          totalPaidAmount: parseResult.totalPaid,
          totalBilledAmount: parseResult.totalBilled,
          totalAdjustments: parseResult.totalAdjusted,
          parseErrors: parseResult.errors.length,
          parsedAt: new Date().toISOString(),
        },
        unmatchedCount: parseResult.lines.length, // all unmatched initially
      });

      // Clear upload cache
      uploadCache.delete(id);

      appendRcmAudit('remit.processed', {
        claimId: id,
        userId: duz,
        detail: {
          linesImported: parseResult.lines.length,
          parseErrors: parseResult.errors.length,
          totalPaid: parseResult.totalPaid,
        },
      });

      return reply.send({
        ok: true,
        linesImported: parseResult.lines.length,
        parseErrors: parseResult.errors,
        summary: {
          totalPaid: parseResult.totalPaid,
          totalBilled: parseResult.totalBilled,
          totalAdjusted: parseResult.totalAdjusted,
        },
      });
    }
  );

  /* ── Match batch ───────────────────────────────────────── */
  server.post(
    '/payerops/payments/batches/:id/match',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const { id } = request.params as { id: string };

      const batch = getBatch(id);
      if (!batch) return reply.status(404).send({ ok: false, error: 'Batch not found' });
      if (batch.tenantId !== tenantId)
        return reply.status(403).send({ ok: false, error: 'Access denied' });

      const result = matchBatch(id, duz);

      appendRcmAudit('remit.matched', {
        claimId: id,
        userId: duz,
        detail: {
          matched: result.matched,
          needsReview: result.needsReview,
          totalLines: result.totalLines,
        },
      });

      return reply.send({ ok: true, matchResult: result });
    }
  );

  /* ── List batches ──────────────────────────────────────── */
  server.get('/payerops/payments/batches', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = getSession(request);
    const q = (request.query as any) || {};

    const result = listBatches({
      tenantId,
      status: q.status as BatchStatus | undefined,
      payerId: q.payerId,
      limit: q.limit ? parseInt(q.limit, 10) : 50,
      offset: q.offset ? parseInt(q.offset, 10) : 0,
    });

    return reply.send({ ok: true, ...result });
  });

  /* ── Get batch detail + lines ──────────────────────────── */
  server.get(
    '/payerops/payments/batches/:id',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = getSession(request);
      const { id } = request.params as { id: string };
      const q = (request.query as any) || {};

      const batch = getBatch(id);
      if (!batch) return reply.status(404).send({ ok: false, error: 'Batch not found' });
      if (batch.tenantId !== tenantId)
        return reply.status(403).send({ ok: false, error: 'Access denied' });

      const linesResult = listLines({
        batchId: id,
        matchStatus: q.matchStatus,
        limit: q.limit ? parseInt(q.limit, 10) : 100,
        offset: q.offset ? parseInt(q.offset, 10) : 0,
      });

      return reply.send({
        ok: true,
        batch,
        lines: linesResult.items,
        linesTotal: linesResult.total,
      });
    }
  );

  /* ── Reconciliation worklist ───────────────────────────── */
  server.get(
    '/payerops/payments/reconciliation',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = getSession(request);
      const q = (request.query as any) || {};
      const limit = q.limit ? parseInt(q.limit, 10) : 100;

      const unresolvedLines = getUnresolvedLines(tenantId, limit);

      // Enrich with batch info
      const enriched = unresolvedLines.map((line) => {
        const batch = getBatch(line.batchId);
        return {
          ...line,
          batchPayerId: batch?.payerId,
          batchPayerName: batch?.payerName,
          batchSourceMode: batch?.sourceMode,
          batchReceivedAt: batch?.receivedAt,
        };
      });

      return reply.send({ ok: true, items: enriched, total: enriched.length });
    }
  );

  /* ── Manual link claim ─────────────────────────────────── */
  server.post(
    '/payerops/payments/reconciliation/:lineId/link-claim',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { duz, tenantId } = getSession(request);
      const { lineId } = request.params as { lineId: string };
      const body = (request.body as any) || {};

      if (!body.claimCaseId) {
        return reply.status(400).send({ ok: false, error: 'claimCaseId is required' });
      }

      // Verify line belongs to tenant
      const line = getLine(lineId);
      if (!line) return reply.status(404).send({ ok: false, error: 'Line not found' });
      if (line.tenantId !== tenantId)
        return reply.status(403).send({ ok: false, error: 'Access denied' });

      const result = manualLinkLine(lineId, body.claimCaseId, duz);

      appendRcmAudit('remit.matched', {
        claimId: body.claimCaseId,
        userId: duz,
        detail: { lineId, matchMethod: 'manual', matchStatus: result.matchStatus },
      });

      return reply.send({ ok: true, result });
    }
  );

  /* ── Payer Intelligence ────────────────────────────────── */
  server.get(
    '/payerops/analytics/payer-intelligence',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = getSession(request);
      const q = (request.query as any) || {};

      const report = computePayerIntelligence(tenantId, q.periodStart, q.periodEnd);

      return reply.send({ ok: true, report });
    }
  );

  /* ── Aging ─────────────────────────────────────────────── */
  server.get('/payerops/analytics/aging', async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId } = getSession(request);
    const report = computeAging(tenantId);
    return reply.send({ ok: true, report });
  });

  /* ── Export ────────────────────────────────────────────── */
  server.get(
    '/payerops/exports/payments/:batchId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = getSession(request);
      const { batchId } = request.params as { batchId: string };
      const q = (request.query as any) || {};
      const format = (q.format ?? 'csv') as 'csv' | 'json';

      const result = exportBatch(batchId, format, tenantId);
      if (!result) {
        return reply
          .status(404)
          .send({ ok: false, error: 'Batch not found or export format unavailable' });
      }

      appendRcmAudit('claim.exported', {
        claimId: batchId,
        userId: getSession(request).duz,
        detail: { format, recordCount: result.recordCount },
      });

      // Return as downloadable content
      return reply
        .header('Content-Type', result.mimeType)
        .header('Content-Disposition', `attachment; filename="${result.filename}"`)
        .send(result.content);
    }
  );

  /* ── Underpayments ─────────────────────────────────────── */
  server.get(
    '/payerops/payments/underpayments',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const { tenantId } = getSession(request);
      const q = (request.query as any) || {};

      const result = listUnderpayments({
        tenantId,
        status: q.status,
        payerId: q.payerId,
        limit: q.limit ? parseInt(q.limit, 10) : 50,
        offset: q.offset ? parseInt(q.offset, 10) : 0,
      });

      return reply.send({ ok: true, ...result });
    }
  );

  /* ── Store Info ────────────────────────────────────────── */
  server.get(
    '/payerops/payments/store-info',
    async (_request: FastifyRequest, reply: FastifyReply) => {
      const storeInfo = getPaymentStoreInfo();
      const formats = getAvailableFormats();
      return reply.send({ ok: true, storeInfo, availableExportFormats: formats });
    }
  );
}

/* ── Upload Cache (transient, in-memory) ───────────────────── */
const uploadCache = new Map<string, string>();
