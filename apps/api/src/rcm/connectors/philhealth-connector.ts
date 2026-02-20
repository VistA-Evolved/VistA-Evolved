/**
 * PhilHealth eClaims 3.0 Connector
 *
 * Handles claims submission and eligibility for PhilHealth (PHIC),
 * the Philippines' universal health insurer. Uses the PhilHealth
 * eClaims 3.0 REST API (mandatory from April 1, 2026).
 *
 * PhilHealth eClaims 3.0 flow:
 *   1. Facility accreditation + eClaims 3.0 API credential request
 *   2. TLS client certificate enrollment (facility PKI)
 *   3. Member eligibility check → PIN validation
 *   4. CF1/CF2/CF3/CF4 form generation (claim forms)
 *   5. Electronic SOA generation (scanned PDFs REJECTED)
 *   6. eClaims 3.0 JSON submission with electronic SOA
 *   7. Status tracking via claim reference number
 *   8. Payment reconciliation via SSS/GSIS/PHIC remittance
 *
 * Phase 38 — RCM + Payer Connectivity
 * Phase 46 — eClaims 3.0 upgrade + SOA + cert probes
 */

import type { X12TransactionSet } from '../edi/types.js';
import type { RcmConnector, ConnectorResult } from './types.js';
import { randomBytes } from 'node:crypto';
import { isScannedPdf } from '../gateways/soa-generator.js';

export class PhilHealthConnector implements RcmConnector {
  readonly id = 'philhealth-eclaims';
  readonly name = 'PhilHealth eClaims 3.0 (PHIC)';
  readonly supportedModes = ['government_portal'];
  readonly supportedTransactions: X12TransactionSet[] = [
    '837P', '837I', '270', '271', '276', '277',
  ];

  private config: {
    apiEndpoint?: string;
    facilityCode?: string;
    apiToken?: string;
    certPath?: string;
    certKeyPath?: string;
    soaSigningKey?: string;
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
      apiEndpoint: process.env.PHILHEALTH_API_ENDPOINT ?? 'https://eclaims3.philhealth.gov.ph/api/v3',
      facilityCode: process.env.PHILHEALTH_FACILITY_CODE,
      apiToken: process.env.PHILHEALTH_API_TOKEN,
      certPath: process.env.PHILHEALTH_CERT_PATH,
      certKeyPath: process.env.PHILHEALTH_CERT_KEY_PATH,
      soaSigningKey: process.env.PHILHEALTH_SOA_SIGNING_KEY,
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
    // and POST to eClaims 3.0 API with electronic SOA.
    //
    // eClaims 3.0 changes:
    //   - Scanned PDF SOAs are REJECTED (must use electronic SOA)
    //   - TLS client certificates required
    //   - API endpoint changed to /api/v3
    //
    // PhilHealth-specific mapping:
    //   - 837P → CF2 (professional claim) + CF1 (member data) + electronic SOA
    //   - 837I → CF2 + CF3 (hospital charges) + optional CF4 (professional fees) + electronic SOA
    //   - 270  → Member eligibility/PIN check
    //   - 276  → Claim status inquiry

    // Reject scanned PDF payloads (eClaims 3.0 mandate)
    if (isScannedPdf(payload)) {
      return {
        success: false,
        transactionId: txId,
        errors: [{
          code: 'PH-SOA-FORMAT-INVALID',
          description: 'Scanned PDF SOA rejected. eClaims 3.0 requires electronic SOA. Use soa-generator.ts.',
          severity: 'error',
        }],
      };
    }

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
    const hasCert = !!(this.config.certPath && this.config.certKeyPath);

    const issues: string[] = [];
    if (!this.config.facilityCode) issues.push('facility code missing');
    if (!this.config.apiToken) issues.push('API token missing');
    if (!this.config.certPath) issues.push('TLS cert missing (PHILHEALTH_CERT_PATH)');
    if (!this.config.certKeyPath) issues.push('TLS key missing (PHILHEALTH_CERT_KEY_PATH)');

    if (this.config.testMode) {
      return {
        healthy: true,
        details: `PhilHealth eClaims 3.0 TEST mode${issues.length ? ` (warnings: ${issues.join(', ')})` : ''}`,
      };
    }

    return {
      healthy: hasConfig && hasCert,
      details: hasConfig && hasCert
        ? `PhilHealth eClaims 3.0 configured (facility: ${this.config.facilityCode}, cert: present)`
        : `PhilHealth eClaims 3.0: ${issues.join(', ')}`,
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
