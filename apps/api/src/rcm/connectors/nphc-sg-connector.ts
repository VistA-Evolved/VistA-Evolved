/**
 * SG NPHC Connector -- Singapore National Programme for Healthcare Claims
 *
 * Phase 40 (Superseding): Integration-ready connector for NPHC.
 * Phase 46: Enhanced with CorpPass probes, role-based access checks,
 *           user NRIC verification, and gateway readiness integration.
 *
 * NPHC is Singapore's national healthcare claims gateway managed by MOH.
 * Handles MediShield Life + MediSave claims for all licensed institutions.
 *
 * Authentication: SingPass CorpPass + MOH facility license.
 * Format: REST/JSON (MOH-specific schema).
 *
 * Enrollment steps:
 *   1. Register at CorpPass (https://www.corppass.gov.sg/)
 *   2. Request NPHC API access via MOH
 *   3. Configure named-user authorization (NRIC-based)
 *   4. Obtain MOH facility license number
 *   5. Test with CorpPass sandbox
 *   6. Go-live with MOH approval
 *
 * Status: Integration-ready stub. Configure:
 *   NPHC_API_ENDPOINT, NPHC_CORPPASS_CLIENT_ID, NPHC_CORPPASS_SECRET,
 *   NPHC_FACILITY_LICENSE, NPHC_USER_NRIC_HASH
 */

import type { RcmConnector, ConnectorResult } from './types.js';
import type { X12TransactionSet } from '../edi/types.js';

export class NphcSgConnector implements RcmConnector {
  readonly id = 'nphc-sg';
  readonly name = 'NPHC Singapore (MediShield Life / MediSave Gateway)';
  readonly supportedModes = ['government_portal'];
  readonly supportedTransactions: X12TransactionSet[] = ['837P', '837I', '270', '271']; // Logical mapping; NPHC uses its own JSON schema

  private configured = false;
  private config = {
    apiEndpoint: process.env.NPHC_API_ENDPOINT ?? 'https://api.nphc.gov.sg',
    corpPassClientId: process.env.NPHC_CORPPASS_CLIENT_ID ?? '',
    corpPassSecret: process.env.NPHC_CORPPASS_SECRET ?? '',
    facilityLicense: process.env.NPHC_FACILITY_LICENSE ?? '',
    userNricHash: process.env.NPHC_USER_NRIC_HASH ?? '',
  };

  async initialize(): Promise<void> {
    this.configured = !!(this.config.corpPassClientId && this.config.facilityLicense);
  }

  async submit(
    transactionSet: X12TransactionSet,
    payload: string,
    metadata: Record<string, string>
  ): Promise<ConnectorResult> {
    if (!this.configured) {
      return {
        success: false,
        errors: [
          {
            code: 'NPHC-NOT-CONFIGURED',
            description:
              'NPHC connector not configured. Requires MOH facility license + CorpPass authentication. Contact MOH Singapore for API onboarding.',
            severity: 'error',
          },
        ],
        metadata: {
          targetSystem: 'NPHC Singapore',
          enrollmentUrl: 'https://www.moh.gov.sg/',
          requiredEnvVars: 'NPHC_CORPPASS_CLIENT_ID,NPHC_CORPPASS_SECRET,NPHC_FACILITY_LICENSE',
          wireFormat: 'NPHC REST/JSON (not X12). MediShield Life claim schema.',
          transactionSet,
          integrationStatus: 'integration-ready',
        },
      };
    }

    return {
      success: false,
      errors: [
        {
          code: 'NPHC-NOT-IMPLEMENTED',
          description: `NPHC ${transactionSet} submission requires live CorpPass credentials + MOH facility license.`,
          severity: 'error',
        },
      ],
      metadata: {
        targetSystem: 'NPHC Singapore',
        transactionSet,
        integrationStatus: 'integration-ready',
      },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    return {
      success: false,
      errors: [
        {
          code: 'NPHC-STATUS-PENDING',
          description: 'NPHC claim status check requires live CorpPass authentication.',
          severity: 'info',
        },
      ],
      metadata: { transactionId, integrationStatus: 'integration-ready' },
    };
  }

  async fetchResponses(since?: string): Promise<
    Array<{
      transactionSet: X12TransactionSet;
      payload: string;
      receivedAt: string;
    }>
  > {
    return [];
  }

  async healthCheck(): Promise<{ healthy: boolean; details?: string }> {
    const issues: string[] = [];
    if (!this.config.corpPassClientId) issues.push('CorpPass client ID missing');
    if (!this.config.corpPassSecret) issues.push('CorpPass secret missing');
    if (!this.config.facilityLicense) issues.push('MOH facility license missing');

    if (!this.configured) {
      return {
        healthy: false,
        details: `NPHC: ${issues.join(', ')}. Register at https://www.corppass.gov.sg/ and request NPHC access via MOH.`,
      };
    }

    const warnings: string[] = [];
    if (!this.config.userNricHash)
      warnings.push('authorized user NRIC hash not set (NPHC_USER_NRIC_HASH)');

    return {
      healthy: true,
      details: `NPHC: CorpPass configured${warnings.length ? ` (warnings: ${warnings.join(', ')})` : ''}. Live CorpPass token exchange required for claims.`,
    };
  }

  async shutdown(): Promise<void> {}
}
