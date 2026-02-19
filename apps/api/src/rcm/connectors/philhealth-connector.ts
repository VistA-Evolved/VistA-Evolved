/**
 * PhilHealth eClaims Connector
 *
 * Handles claims submission and eligibility for PhilHealth (PHIC),
 * the Philippines' universal health insurer. Uses the PhilHealth
 * eClaims REST API.
 *
 * PhilHealth eClaims flow:
 *   1. Facility accreditation (one-time portal registration)
 *   2. Member eligibility check → PIN validation
 *   3. CF1/CF2/CF3/CF4 form generation (claim forms)
 *   4. eClaims XML/JSON submission
 *   5. Status tracking via claim reference number
 *   6. Payment reconciliation via SSS/GSIS/PHIC remittance
 *
 * Phase 38 — RCM + Payer Connectivity
 */

import type { X12TransactionSet } from '../edi/types.js';
import type { RcmConnector, ConnectorResult } from './types.js';
import { randomBytes } from 'node:crypto';

export class PhilHealthConnector implements RcmConnector {
  readonly id = 'philhealth-eclaims';
  readonly name = 'PhilHealth eClaims (PHIC)';
  readonly supportedModes = ['government_portal'];
  readonly supportedTransactions: X12TransactionSet[] = [
    '837P', '837I', '270', '271', '276', '277',
  ];

  private config: {
    apiEndpoint?: string;
    facilityCode?: string;
    apiToken?: string;
    testMode: boolean;
  } = { testMode: true };

  private submissions: Map<string, {
    id: string;
    claimRefNo?: string;
    status: 'queued' | 'submitted' | 'returned' | 'approved' | 'denied';
    submittedAt: string;
    payload: string;
  }> = new Map();

  async initialize(): Promise<void> {
    this.config = {
      apiEndpoint: process.env.PHILHEALTH_API_ENDPOINT ?? 'https://eclaims.philhealth.gov.ph/api/v1',
      facilityCode: process.env.PHILHEALTH_FACILITY_CODE,
      apiToken: process.env.PHILHEALTH_API_TOKEN,
      testMode: process.env.PHILHEALTH_TEST_MODE !== 'false',
    };
  }

  async submit(
    transactionSet: X12TransactionSet,
    payload: string,
    metadata: Record<string, string>,
  ): Promise<ConnectorResult> {
    const txId = `ph-${Date.now()}-${randomBytes(4).toString('hex')}`;

    // In production: transform internal claim → PhilHealth CF1-CF4 format
    // and POST to eClaims API.
    //
    // PhilHealth-specific mapping:
    //   - 837P → CF2 (professional claim) + CF1 (member data)
    //   - 837I → CF2 + CF3 (hospital charges) + optional CF4 (professional fees)
    //   - 270  → Member eligibility/PIN check
    //   - 276  → Claim status inquiry

    this.submissions.set(txId, {
      id: txId,
      status: 'queued',
      submittedAt: new Date().toISOString(),
      payload,
    });

    if (!this.config.facilityCode) {
      return {
        success: false,
        transactionId: txId,
        errors: [{
          code: 'PH-NO-FACILITY',
          description: 'PhilHealth facility code not configured (PHILHEALTH_FACILITY_CODE)',
          severity: 'error',
        }],
      };
    }

    // Simulate successful queueing
    return {
      success: true,
      transactionId: txId,
      errors: [],
      metadata: {
        connector: this.id,
        facilityCode: this.config.facilityCode ?? '',
        testMode: String(this.config.testMode),
        phClaimType: transactionSet === '837I' ? 'institutional' : 'professional',
      },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    const entry = this.submissions.get(transactionId);
    if (!entry) {
      return {
        success: false,
        errors: [{ code: 'NOT_FOUND', description: 'PhilHealth submission not found', severity: 'error' }],
      };
    }

    // In production: call PhilHealth GetClaimStatus API with claim reference no.
    return {
      success: true,
      transactionId,
      errors: [],
      metadata: {
        status: entry.status,
        claimRefNo: entry.claimRefNo ?? 'pending',
        submittedAt: entry.submittedAt,
      },
    };
  }

  async fetchResponses(since?: string): Promise<Array<{
    transactionSet: X12TransactionSet;
    payload: string;
    receivedAt: string;
  }>> {
    // In production: poll PhilHealth for remittance/payment notifications
    // PhilHealth uses batch payment with separate remittance advice
    return [];
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    const hasConfig = !!(this.config.facilityCode && this.config.apiToken);
    return {
      healthy: hasConfig || this.config.testMode,
      details: this.config.testMode
        ? 'PhilHealth connector in TEST mode'
        : hasConfig
          ? `PhilHealth configured (facility: ${this.config.facilityCode})`
          : 'PhilHealth credentials not configured',
    };
  }

  async shutdown(): Promise<void> {
    this.submissions.clear();
  }

  /* ─── PhilHealth-specific helpers ─────────────────────────────── */

  /**
   * Check member eligibility using PhilHealth PIN
   * In production: calls PHIC member verification API
   */
  async checkMemberEligibility(pin: string): Promise<{
    eligible: boolean;
    memberName?: string;
    category?: string;
    expiryDate?: string;
    error?: string;
  }> {
    if (this.config.testMode) {
      return {
        eligible: true,
        memberName: 'TEST MEMBER',
        category: 'employed',
        expiryDate: '2027-12-31',
      };
    }

    // In production: POST to PhilHealth member eligibility endpoint
    return { eligible: false, error: 'PhilHealth API integration pending' };
  }
}
