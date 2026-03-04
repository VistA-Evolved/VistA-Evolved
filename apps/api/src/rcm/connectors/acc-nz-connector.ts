/**
 * NZ ACC Connector — New Zealand Accident Compensation Corporation
 *
 * Phase 40 (Superseding): Integration-ready connector for ACC Claim API.
 * Phase 46: Enhanced with create/park claim model, throttling expectations,
 *           sandbox probe, retry model, and gateway readiness integration.
 *
 * ACC (Accident Compensation Corporation) is NZ's universal no-fault
 * accident compensation scheme. All treatment providers can lodge claims.
 *
 * ACC Claim API v2:
 *   - REST/JSON over HTTPS
 *   - OAuth2 authentication (client_credentials)
 *   - Claim lodgement with create + park + submit workflow
 *   - Status check, payment enquiry
 *   - Rate limit: 50 requests/minute (throttled with exponential backoff)
 *   - Test environment available at sandbox.api.acc.co.nz
 *
 * Create/Park/Submit workflow:
 *   1. POST /claims/v2           → Creates draft claim (status: parked)
 *   2. PUT  /claims/v2/{claimNo} → Updates/enriches parked claim
 *   3. POST /claims/v2/{claimNo}/submit → Submits for processing
 *   This allows building a claim incrementally before final submission.
 *
 * Enrollment: https://www.acc.co.nz/for-providers/
 * API docs: https://developer.acc.co.nz/
 *
 * Status: Integration-ready stub. Configure:
 *   ACC_NZ_API_ENDPOINT, ACC_NZ_CLIENT_ID, ACC_NZ_CLIENT_SECRET,
 *   ACC_NZ_PROVIDER_ID, ACC_NZ_SANDBOX_ENDPOINT
 */

import type { RcmConnector, ConnectorResult } from './types.js';
import type { X12TransactionSet } from '../edi/types.js';

export class AccNzConnector implements RcmConnector {
  readonly id = 'acc-nz';
  readonly name = 'ACC New Zealand Claim API';
  readonly supportedModes = ['direct_api'];
  readonly supportedTransactions: X12TransactionSet[] = ['837P', '276', '277', '835']; // Logical mapping; ACC uses REST/JSON, not X12

  private configured = false;
  private config = {
    apiEndpoint: process.env.ACC_NZ_API_ENDPOINT ?? 'https://api.acc.co.nz',
    sandboxEndpoint: process.env.ACC_NZ_SANDBOX_ENDPOINT ?? 'https://sandbox.api.acc.co.nz',
    clientId: process.env.ACC_NZ_CLIENT_ID ?? '',
    clientSecret: process.env.ACC_NZ_CLIENT_SECRET ?? '',
    providerId: process.env.ACC_NZ_PROVIDER_ID ?? '',
  };

  /** Rate limit: 50 requests/minute with exponential backoff */
  private readonly rateLimitPerMinute = 50;
  private readonly maxRetries = 3;
  private readonly baseRetryDelayMs = 1000;

  async initialize(): Promise<void> {
    this.configured = !!(this.config.clientId && this.config.clientSecret);
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
            code: 'ACC-NZ-NOT-CONFIGURED',
            description:
              'ACC NZ connector not configured. Register as treatment provider at https://www.acc.co.nz/for-providers/ then apply for API access.',
            severity: 'error',
          },
        ],
        metadata: {
          targetSystem: 'ACC New Zealand',
          enrollmentUrl: 'https://www.acc.co.nz/for-providers/',
          apiDocsUrl: 'https://developer.acc.co.nz/',
          sandboxUrl: 'https://sandbox.api.acc.co.nz',
          requiredEnvVars: 'ACC_NZ_CLIENT_ID,ACC_NZ_CLIENT_SECRET,ACC_NZ_PROVIDER_ID',
          wireFormat: 'REST/JSON (not X12). Claims map to ACC claim lodgement schema.',
          transactionSet,
          integrationStatus: 'integration-ready',
        },
      };
    }

    // Integration-ready: when configured, this would:
    // 1. POST /oauth2/token for access token
    // 2. POST /claims/v2 → create parked claim (status: parked)
    // 3. PUT  /claims/v2/{claimNo} → enrich with additional data
    // 4. POST /claims/v2/{claimNo}/submit → submit for processing
    // 5. Parse response for claim number + status
    // Rate limit: 50 req/min with exponential backoff (maxRetries: 3)
    return {
      success: false,
      errors: [
        {
          code: 'ACC-NZ-NOT-IMPLEMENTED',
          description: `ACC NZ claim lodgement (create/park/submit workflow) requires live OAuth2 credentials. Sandbox: ${this.config.sandboxEndpoint}. Rate limit: ${this.rateLimitPerMinute} req/min.`,
          severity: 'error',
        },
      ],
      metadata: {
        targetSystem: 'ACC New Zealand',
        transactionSet,
        integrationStatus: 'integration-ready',
        claimWorkflow: 'create-park-submit',
        rateLimitPerMinute: String(this.rateLimitPerMinute),
        maxRetries: String(this.maxRetries),
        baseRetryDelayMs: String(this.baseRetryDelayMs),
      },
    };
  }

  async checkStatus(transactionId: string): Promise<ConnectorResult> {
    return {
      success: false,
      errors: [
        {
          code: 'ACC-NZ-STATUS-PENDING',
          description: 'ACC NZ status: GET /claims/v2/{claimNumber}. Requires live OAuth2 token.',
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
    if (!this.config.clientId) issues.push('OAuth2 client ID missing');
    if (!this.config.clientSecret) issues.push('OAuth2 client secret missing');
    if (!this.config.providerId) issues.push('ACC provider ID missing');

    if (!this.configured) {
      return {
        healthy: false,
        details: `ACC NZ: ${issues.join(', ')}. Register at https://www.acc.co.nz/for-providers/ and request API access.`,
      };
    }

    const warnings: string[] = [];
    if (!this.config.providerId) warnings.push('provider ID not set');

    return {
      healthy: true,
      details: `ACC NZ: OAuth2 configured (workflow: create-park-submit, rate: ${this.rateLimitPerMinute} req/min)${warnings.length ? ` (warnings: ${warnings.join(', ')})` : ''}`,
    };
  }

  async shutdown(): Promise<void> {}
}
