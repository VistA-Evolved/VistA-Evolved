/**
 * Phase 100 -- EDI Stub Adapters
 *
 * Stub adapters for EDI 270/271 (eligibility) and 276/277 (claim status).
 * These return "integration_pending" with clear documentation of what
 * transaction sets they will support when connected.
 *
 * No fake payer endpoints. No stored credentials. No simulated connectivity.
 * Each stub clearly identifies its target transaction set and requirements.
 */

import type {
  PayerAdapter,
  PayerAdapterConfig,
  EligibilityResponse,
  ClaimStatusResponse,
  SubmissionResponse,
  DenialWorkflowResponse,
  AdapterHealthResult,
} from '../adapters/payer-adapter.js';

/* -- EDI 270/271 Eligibility Stub ----------------------------- */

const EDI_270_CONFIG: PayerAdapterConfig = {
  id: 'edi-270-271',
  name: 'EDI 270/271 Eligibility (Integration Pending)',
  supportedModes: ['clearinghouse_edi'],
  rateLimits: {
    eligibilityPerHour: 0,
    claimStatusPerHour: 0,
    submissionsPerHour: 0,
  },
  requiredEnvVars: ['EDI_CLEARINGHOUSE_URL', 'EDI_SENDER_ID', 'EDI_RECEIVER_ID'],
  enabled: false, // Explicitly disabled until clearinghouse connected
};

export class Edi270271StubAdapter implements PayerAdapter {
  readonly config = EDI_270_CONFIG;

  async initialize(): Promise<void> {
    /* Stub: will validate clearinghouse connectivity when implemented */
  }

  async checkEligibility(params: {
    patientDfn: string;
    payerId: string;
    subscriberId?: string;
    memberId?: string;
    dateOfService?: string;
    tenantId: string;
  }): Promise<EligibilityResponse> {
    return {
      eligible: false,
      status: 'unknown',
      isTestData: false,
      payerId: params.payerId,
      payerName: `EDI 270/271 - Integration Pending`,
      checkedAt: new Date().toISOString(),
      rawResponse: JSON.stringify({
        integrationPending: true,
        transactionSet: '270/271',
        description: 'ANSI X12 270 Eligibility Inquiry / 271 Eligibility Response',
        requirements: [
          'Clearinghouse enrollment (e.g., Availity, Change Healthcare, Trizetto)',
          'Sender/Receiver ISA identifiers',
          'Trading partner agreement with target payer',
          'HIPAA 5010 270/271 compliance certification',
        ],
        targetRpcs: ['IB ELIGIBILITY INQUIRY'],
        migrationPath: 'Configure EDI_CLEARINGHOUSE_URL + enroll with clearinghouse',
      }),
    };
  }

  async pollClaimStatus(): Promise<ClaimStatusResponse> {
    return {
      claimId: '',
      status: 'unknown',
      isTestData: false,
      statusDescription:
        'EDI 270/271 adapter handles eligibility only. Use 276/277 for claim status.',
      checkedAt: new Date().toISOString(),
    };
  }

  async submitClaim(): Promise<SubmissionResponse> {
    return {
      accepted: false,
      isTestData: false,
      errors: [
        {
          code: 'UNSUPPORTED',
          description:
            'EDI 270/271 adapter handles eligibility only. Use 837P/I for claim submission.',
        },
      ],
      submittedAt: new Date().toISOString(),
    };
  }

  async handleDenial(): Promise<DenialWorkflowResponse> {
    return {
      appealCreated: false,
      recommendedActions: ['EDI 270/271 adapter does not handle denials.'],
      automatedCorrections: [],
      escalationRequired: false,
    };
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    return {
      healthy: false,
      adapterId: this.config.id,
      adapterName: this.config.name,
      latencyMs: 0,
      details: 'Integration pending - clearinghouse enrollment required',
      checkedAt: new Date().toISOString(),
    };
  }

  async shutdown(): Promise<void> {
    /* no-op */
  }
}

/* -- EDI 276/277 Claim Status Stub ---------------------------- */

const EDI_276_CONFIG: PayerAdapterConfig = {
  id: 'edi-276-277',
  name: 'EDI 276/277 Claim Status (Integration Pending)',
  supportedModes: ['clearinghouse_edi_status'],
  rateLimits: {
    eligibilityPerHour: 0,
    claimStatusPerHour: 0,
    submissionsPerHour: 0,
  },
  requiredEnvVars: ['EDI_CLEARINGHOUSE_URL', 'EDI_SENDER_ID', 'EDI_RECEIVER_ID'],
  enabled: false,
};

export class Edi276277StubAdapter implements PayerAdapter {
  readonly config = EDI_276_CONFIG;

  async initialize(): Promise<void> {
    /* Stub: will validate clearinghouse connectivity when implemented */
  }

  async checkEligibility(): Promise<EligibilityResponse> {
    return {
      eligible: false,
      status: 'unknown',
      isTestData: false,
      payerId: '',
      payerName: 'EDI 276/277 adapter handles claim status only. Use 270/271 for eligibility.',
      checkedAt: new Date().toISOString(),
    };
  }

  async pollClaimStatus(params: {
    claimId: string;
    payerClaimId?: string;
    payerId: string;
    tenantId: string;
  }): Promise<ClaimStatusResponse> {
    return {
      claimId: params.claimId,
      payerClaimId: params.payerClaimId,
      status: 'unknown',
      isTestData: false,
      statusDescription: 'ANSI X12 276/277 Claim Status Inquiry - Integration Pending',
      checkedAt: new Date().toISOString(),
      rawResponse: JSON.stringify({
        integrationPending: true,
        transactionSet: '276/277',
        description: 'ANSI X12 276 Claim Status Request / 277 Claim Status Response',
        requirements: [
          'Clearinghouse enrollment with 276/277 capability',
          'Payer-specific trading partner agreement',
          'HIPAA 5010 276/277 compliance certification',
          'Claim tracking number or payer claim ID',
        ],
        migrationPath: 'Configure EDI_CLEARINGHOUSE_URL + enable 276/277 transaction set',
      }),
    };
  }

  async submitClaim(): Promise<SubmissionResponse> {
    return {
      accepted: false,
      isTestData: false,
      errors: [
        {
          code: 'UNSUPPORTED',
          description: 'EDI 276/277 adapter handles claim status only. Use 837P/I for submission.',
        },
      ],
      submittedAt: new Date().toISOString(),
    };
  }

  async handleDenial(): Promise<DenialWorkflowResponse> {
    return {
      appealCreated: false,
      recommendedActions: ['EDI 276/277 adapter does not handle denials.'],
      automatedCorrections: [],
      escalationRequired: false,
    };
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    return {
      healthy: false,
      adapterId: this.config.id,
      adapterName: this.config.name,
      latencyMs: 0,
      details: 'Integration pending - clearinghouse enrollment required for 276/277',
      checkedAt: new Date().toISOString(),
    };
  }

  async shutdown(): Promise<void> {
    /* no-op */
  }
}
