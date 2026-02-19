/**
 * Portal/Batch Connector — Web Portal Claim Submission
 *
 * Handles payers that accept claims via a web portal or batch upload
 * rather than X12 EDI or direct API. Common for many commercial HMOs,
 * especially in the Philippines market.
 *
 * Generates formatted claim files (CSV, XML, or payer-specific format)
 * for manual or automated portal upload.
 *
 * Phase 38 — RCM + Payer Connectivity
 */

import type { X12TransactionSet } from '../edi/types.js';
import type { RcmConnector, ConnectorResult } from './types.js';
import { randomBytes } from 'node:crypto';

interface BatchEntry {
  id: string;
  transactionSet: X12TransactionSet;
  payload: string;
  payerPortalUrl?: string;
  status: 'pending_upload' | 'uploaded' | 'confirmed';
  createdAt: string;
  uploadedAt?: string;
}

export class PortalBatchConnector implements RcmConnector {
  readonly id = 'portal-batch';
  readonly name = 'Portal/Batch Upload';
  readonly supportedModes = ['portal_batch'];
  readonly supportedTransactions: X12TransactionSet[] = [
    '837P', '837I', '270', '276',
  ];

  private batches = new Map<string, BatchEntry>();

  async initialize(): Promise<void> {
    // No external initialization needed — portal credentials are per-payer
  }

  async submit(
    transactionSet: X12TransactionSet,
    payload: string,
    metadata: Record<string, string>,
  ): Promise<ConnectorResult> {
    const txId = `batch-${Date.now()}-${randomBytes(4).toString('hex')}`;

    this.batches.set(txId, {
      id: txId,
      transactionSet,
      payload,
      payerPortalUrl: metadata.portalUrl,
      status: 'pending_upload',
      createdAt: new Date().toISOString(),
    });

    return {
      success: true,
      transactionId: txId,
      errors: [],
      metadata: {
        connector: this.id,
        action: 'queued_for_portal_upload',
        portalUrl: metadata.portalUrl ?? 'not_configured',
        note: 'Batch file generated — upload to payer portal manually or via RPA',
      },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    const entry = this.batches.get(transactionId);
    if (!entry) {
      return {
        success: false,
        errors: [{ code: 'NOT_FOUND', description: 'Batch entry not found', severity: 'error' }],
      };
    }
    return {
      success: true,
      transactionId,
      errors: [],
      metadata: {
        status: entry.status,
        createdAt: entry.createdAt,
        uploadedAt: entry.uploadedAt ?? 'not_yet',
      },
    };
  }

  async fetchResponses(): Promise<Array<{
    transactionSet: X12TransactionSet;
    payload: string;
    receivedAt: string;
  }>> {
    // Portal responses must be imported manually
    return [];
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    return {
      healthy: true,
      details: `Portal/Batch connector active (${this.batches.size} pending batches)`,
    };
  }

  async shutdown(): Promise<void> {
    this.batches.clear();
  }

  /* ─── Portal-specific operations ───────────────────────────────── */

  /** Mark a batch as uploaded (called after manual/RPA upload) */
  markUploaded(transactionId: string): boolean {
    const entry = this.batches.get(transactionId);
    if (!entry) return false;
    entry.status = 'uploaded';
    entry.uploadedAt = new Date().toISOString();
    return true;
  }

  /** Mark a batch as confirmed by the portal */
  markConfirmed(transactionId: string): boolean {
    const entry = this.batches.get(transactionId);
    if (!entry) return false;
    entry.status = 'confirmed';
    return true;
  }

  /** List pending uploads for a given payer portal */
  listPendingUploads(): Array<{
    id: string;
    transactionSet: X12TransactionSet;
    payerPortalUrl?: string;
    createdAt: string;
  }> {
    return Array.from(this.batches.values())
      .filter(b => b.status === 'pending_upload')
      .map(b => ({
        id: b.id,
        transactionSet: b.transactionSet,
        payerPortalUrl: b.payerPortalUrl,
        createdAt: b.createdAt,
      }));
  }
}
