/**
 * Sandbox Connector -- Simulated Transport for Development/Testing
 *
 * Accepts all transactions, generates realistic acknowledgments and
 * simulated responses (835, 271, 277) after configurable delay.
 * Used when no real clearinghouse or payer portal is configured.
 *
 * Phase 38 -- RCM + Payer Connectivity
 */

import type { X12TransactionSet } from '../edi/types.js';
import type { RcmConnector, ConnectorResult } from './types.js';
import { randomBytes } from 'node:crypto';
import { exportX12Bundle, type ExportBundleResult } from '../edi/x12-serializer.js';

interface SandboxSubmission {
  id: string;
  transactionSet: X12TransactionSet;
  payload: string;
  metadata: Record<string, string>;
  submittedAt: string;
  responseGeneratedAt?: string;
  status: 'accepted' | 'rejected_random';
}

export class SandboxConnector implements RcmConnector {
  readonly id = 'sandbox';
  readonly name = 'Sandbox (Simulated Transport)';
  readonly supportedModes = [
    'clearinghouse_edi',
    'direct_api',
    'portal_batch',
    'government_portal',
    'fhir_payer',
    'not_classified',
  ];
  readonly supportedTransactions: X12TransactionSet[] = [
    '837P',
    '837I',
    '835',
    '270',
    '271',
    '276',
    '277',
    '275',
    '278',
    '999',
    '997',
    'TA1',
  ];

  private submissions = new Map<string, SandboxSubmission>();
  private simulatedResponses: Array<{
    transactionSet: X12TransactionSet;
    payload: string;
    receivedAt: string;
  }> = [];
  private exportedBundles: ExportBundleResult[] = [];
  /** Configurable rejection rate for testing error handling (0.0 - 1.0) */
  private rejectionRate: number;

  constructor(rejectionRate = 0.1) {
    this.rejectionRate = rejectionRate;
  }

  async initialize(): Promise<void> {
    const envRate = process.env.RCM_SANDBOX_REJECTION_RATE;
    if (envRate) this.rejectionRate = Math.min(1, Math.max(0, parseFloat(envRate)));
  }

  async submit(
    transactionSet: X12TransactionSet,
    payload: string,
    metadata: Record<string, string>
  ): Promise<ConnectorResult> {
    const txId = `sbx-${Date.now()}-${randomBytes(4).toString('hex')}`;
    const rejected = Math.random() < this.rejectionRate;

    const submission: SandboxSubmission = {
      id: txId,
      transactionSet,
      payload,
      metadata,
      submittedAt: new Date().toISOString(),
      status: rejected ? 'rejected_random' : 'accepted',
    };
    this.submissions.set(txId, submission);

    if (rejected) {
      return {
        success: false,
        transactionId: txId,
        errors: [
          {
            code: 'SBX-REJECT',
            description: 'Sandbox simulated rejection (random) -- retry or adjust claim',
            severity: 'error',
          },
        ],
        metadata: { connector: this.id, simulated: 'true' },
      };
    }

    // Generate simulated response for claim submissions
    if (transactionSet === '837P' || transactionSet === '837I') {
      this.generateSimulated835(txId, metadata);
    }
    if (transactionSet === '270') {
      this.generateSimulated271(txId);
    }
    if (transactionSet === '276') {
      this.generateSimulated277(txId);
    }

    return {
      success: true,
      transactionId: txId,
      errors: [],
      metadata: { connector: this.id, simulated: 'true' },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    const entry = this.submissions.get(transactionId);
    if (!entry) {
      return {
        success: false,
        errors: [
          { code: 'NOT_FOUND', description: 'Sandbox transaction not found', severity: 'error' },
        ],
      };
    }
    return {
      success: true,
      transactionId,
      errors: [],
      metadata: {
        status: entry.status,
        submittedAt: entry.submittedAt,
        simulated: 'true',
      },
    };
  }

  async fetchResponses(since?: string): Promise<
    Array<{
      transactionSet: X12TransactionSet;
      payload: string;
      receivedAt: string;
    }>
  > {
    if (since) {
      return this.simulatedResponses.filter((r) => r.receivedAt >= since);
    }
    return [...this.simulatedResponses];
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    return {
      healthy: true,
      details: `Sandbox connector active (rejection rate: ${(this.rejectionRate * 100).toFixed(0)}%, submissions: ${this.submissions.size})`,
    };
  }

  async shutdown(): Promise<void> {
    this.submissions.clear();
    this.simulatedResponses = [];
  }

  /* --- Response generators ---------------------------------------- */

  private generateSimulated835(claimTxId: string, metadata: Record<string, string>): void {
    const chargeAmount = parseFloat(metadata.chargeAmount ?? '100.00');
    const allowedAmount = chargeAmount * 0.8; // simulate 80% allowed
    const paidAmount = allowedAmount * 0.7; // simulate 70% of allowed

    const response = {
      transactionSet: '835' as const,
      simulated: true,
      referenceClaimTxId: claimTxId,
      checkNumber: `SBX${randomBytes(3).toString('hex').toUpperCase()}`,
      paymentDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
      totalPayment: paidAmount.toFixed(2),
      claimStatus: '1', // processed as primary
      chargedAmount: chargeAmount.toFixed(2),
      allowedAmount: allowedAmount.toFixed(2),
      paidAmount: paidAmount.toFixed(2),
      patientResponsibility: (chargeAmount - paidAmount).toFixed(2),
      adjustments: [
        { groupCode: 'CO', reasonCode: '45', amount: (chargeAmount - allowedAmount).toFixed(2) },
        { groupCode: 'PR', reasonCode: '2', amount: (allowedAmount - paidAmount).toFixed(2) },
      ],
    };

    this.simulatedResponses.push({
      transactionSet: '835',
      payload: JSON.stringify(response),
      receivedAt: new Date().toISOString(),
    });
  }

  private generateSimulated271(inquiryTxId: string): void {
    const response = {
      transactionSet: '271' as const,
      simulated: true,
      referenceInquiryTxId: inquiryTxId,
      subscriberStatus: 'active',
      benefits: [
        {
          serviceTypeCode: '30',
          description: 'Health Benefit Plan Coverage',
          coverageLevel: 'IND',
          inNetwork: true,
          deductible: { amount: 500, remaining: 350, period: 'calendar_year' },
          copay: { amount: 30, type: 'per_visit' },
          coinsurance: { percent: 20, type: 'after_deductible' },
          outOfPocketMax: { amount: 5000, remaining: 4200, period: 'calendar_year' },
        },
      ],
    };

    this.simulatedResponses.push({
      transactionSet: '271',
      payload: JSON.stringify(response),
      receivedAt: new Date().toISOString(),
    });
  }

  private generateSimulated277(statusTxId: string): void {
    const statuses = ['A1', 'A2', 'A3', 'A4', 'A5'];
    const descriptions: Record<string, string> = {
      A1: 'Acknowledgement/Receipt - The claim/encounter has been received.',
      A2: 'Accepted for processing.',
      A3: 'Adjudicated - Payment or denial has been finalized.',
      A4: 'Forwarded to additional payer(s).',
      A5: 'Request additional information from submitter.',
    };
    const status = statuses[Math.floor(Math.random() * statuses.length)];

    const response = {
      transactionSet: '277' as const,
      simulated: true,
      referenceStatusTxId: statusTxId,
      claimStatusCode: status,
      description: descriptions[status],
      statusDate: new Date().toISOString().slice(0, 10).replace(/-/g, ''),
    };

    this.simulatedResponses.push({
      transactionSet: '277',
      payload: JSON.stringify(response),
      receivedAt: new Date().toISOString(),
    });
  }

  /* --- Export-only mode (Phase 40) ---------------------------------- */

  /**
   * When CLAIM_SUBMISSION_ENABLED=false, serialize and export to filesystem
   * instead of submitting. Returns the export artifact path.
   */
  async exportClaim(
    transactionSet: X12TransactionSet,
    payload: string,
    claimId: string
  ): Promise<ExportBundleResult> {
    const result = await exportX12Bundle(payload, claimId, transactionSet);
    this.exportedBundles.push(result);
    return result;
  }

  getExportedBundles(): ExportBundleResult[] {
    return [...this.exportedBundles];
  }

  /* --- Test helpers ----------------------------------------------- */

  getSubmissionCount(): number {
    return this.submissions.size;
  }

  getResponseCount(): number {
    return this.simulatedResponses.length;
  }

  setRejectionRate(rate: number): void {
    this.rejectionRate = Math.min(1, Math.max(0, rate));
  }
}
