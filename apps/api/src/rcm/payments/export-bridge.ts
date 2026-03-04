/**
 * Payment Export Bridge — Pluggable (Phase 92)
 *
 * Defines the PaymentExportBridge interface and two default implementations:
 *   - CSV export (for spreadsheet/ERP import)
 *   - JSON export (for API-based ERP connectors like ERPNext/Odoo)
 *
 * Adding a new connector:
 *   1. Implement PaymentExportBridge
 *   2. Register with registerExportBridge()
 *   3. Call exportBatch(batchId, format, tenantId) from routes
 *
 * No PHI in export filenames or metadata fields.
 */

import type { ExportFormat, ExportResult, PaymentExportBridge } from './payment-types.js';
import { getBatch, getAllLinesForBatch } from './payment-store.js';

/* ── Bridge Registry ───────────────────────────────────────── */

const bridges = new Map<ExportFormat, PaymentExportBridge>();

export function registerExportBridge(bridge: PaymentExportBridge): void {
  bridges.set(bridge.format, bridge);
}

export function getAvailableFormats(): ExportFormat[] {
  return Array.from(bridges.keys());
}

export function exportBatch(
  batchId: string,
  format: ExportFormat,
  tenantId: string
): ExportResult | undefined {
  const bridge = bridges.get(format);
  if (!bridge) return undefined;
  return bridge.exportBatch(batchId, tenantId);
}

/* ── CSV Bridge ────────────────────────────────────────────── */

const csvBridge: PaymentExportBridge = {
  name: 'Generic CSV',
  format: 'csv',
  exportBatch(batchId: string, tenantId: string): ExportResult | undefined {
    const batch = getBatch(batchId);
    if (!batch || batch.tenantId !== tenantId) return undefined;

    const allLines = getAllLinesForBatch(batchId);

    const headers = [
      'line_number',
      'match_status',
      'matched_claim_id',
      'external_claim_ref',
      'amount_billed',
      'amount_paid',
      'amount_adjusted',
      'patient_responsibility',
      'service_date',
      'procedure_code',
      'reason_text',
      'paid_at',
    ];

    const rows = allLines.map((l) =>
      [
        l.lineNumber,
        l.matchStatus,
        l.matchedClaimCaseId ?? '',
        l.externalClaimRef ?? '',
        (l.amountBilled / 100).toFixed(2),
        (l.amountPaid / 100).toFixed(2),
        (l.amountAdjusted / 100).toFixed(2),
        (l.patientResponsibility / 100).toFixed(2),
        l.serviceDate ?? '',
        l.procedureCode ?? '',
        (l.reasonText ?? '').replace(/,/g, ';'),
        l.paidAt ?? '',
      ].join(',')
    );

    const content = [headers.join(','), ...rows].join('\n');

    return {
      format: 'csv',
      filename: `remittance-batch-${batchId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.csv`,
      content,
      mimeType: 'text/csv',
      recordCount: allLines.length,
      generatedAt: new Date().toISOString(),
    };
  },
};

/* ── JSON Bridge ───────────────────────────────────────────── */

const jsonBridge: PaymentExportBridge = {
  name: 'Generic JSON (ERPNext/Odoo compatible)',
  format: 'json',
  exportBatch(batchId: string, tenantId: string): ExportResult | undefined {
    const batch = getBatch(batchId);
    if (!batch || batch.tenantId !== tenantId) return undefined;

    const allLines = getAllLinesForBatch(batchId);

    const payload = {
      exportVersion: '1.0',
      exportedAt: new Date().toISOString(),
      batch: {
        id: batch.id,
        facilityId: batch.facilityId,
        payerId: batch.payerId,
        payerName: batch.payerName,
        sourceMode: batch.sourceMode,
        status: batch.status,
        receivedAt: batch.receivedAt,
      },
      summary: {
        totalLines: allLines.length,
        matchedCount: batch.matchedCount,
        unmatchedCount: batch.unmatchedCount,
        totalPaid: allLines.reduce((s, l) => s + l.amountPaid, 0),
        totalBilled: allLines.reduce((s, l) => s + l.amountBilled, 0),
        totalAdjusted: allLines.reduce((s, l) => s + l.amountAdjusted, 0),
      },
      lines: allLines.map((l) => ({
        lineNumber: l.lineNumber,
        matchStatus: l.matchStatus,
        matchedClaimCaseId: l.matchedClaimCaseId,
        externalClaimRef: l.externalClaimRef,
        amountBilled: l.amountBilled,
        amountPaid: l.amountPaid,
        amountAdjusted: l.amountAdjusted,
        patientResponsibility: l.patientResponsibility,
        serviceDate: l.serviceDate,
        procedureCode: l.procedureCode,
        reasonText: l.reasonText,
        paidAt: l.paidAt,
      })),
    };

    return {
      format: 'json',
      filename: `remittance-batch-${batchId.slice(0, 8)}-${new Date().toISOString().slice(0, 10)}.json`,
      content: JSON.stringify(payload, null, 2),
      mimeType: 'application/json',
      recordCount: allLines.length,
      generatedAt: new Date().toISOString(),
    };
  },
};

/* ── Register defaults ─────────────────────────────────────── */

registerExportBridge(csvBridge);
registerExportBridge(jsonBridge);
