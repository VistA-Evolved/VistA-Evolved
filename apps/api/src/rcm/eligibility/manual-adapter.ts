/**
 * Phase 100 -- Manual PayerAdapter
 *
 * Accepts user-entered eligibility and claim status results directly.
 * No external connectivity. MANUAL provenance on all results.
 * Used when staff verifies eligibility by phone/portal and enters
 * the result into the system.
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

const CONFIG: PayerAdapterConfig = {
  id: 'manual',
  name: 'Manual Entry Adapter (User-reported)',
  supportedModes: ['manual'],
  rateLimits: {
    eligibilityPerHour: 500,
    claimStatusPerHour: 500,
    submissionsPerHour: 0, // Manual adapter does not submit claims
  },
  enabled: true,
};

/**
 * ManualPayerAdapter -- returns user-provided results as structured responses.
 *
 * The caller passes manual results in the adapter params; this adapter
 * wraps them in the standard response format with MANUAL provenance markers.
 */
export class ManualPayerAdapter implements PayerAdapter {
  readonly config = CONFIG;

  async initialize(): Promise<void> {
    /* No external resources to initialize */
  }

  async checkEligibility(params: {
    patientDfn: string;
    payerId: string;
    subscriberId?: string;
    memberId?: string;
    dateOfService?: string;
    tenantId: string;
    /** Manual entry fields -- pass via extended params */
    manualEligible?: boolean;
    manualCoverageType?: string;
    manualNotes?: string;
  }): Promise<EligibilityResponse> {
    return {
      eligible: params.manualEligible ?? true,
      status: 'active',
      isTestData: false,
      payerId: params.payerId,
      payerName: `Manual entry (${params.payerId})`,
      memberId: params.memberId ?? undefined,
      coverageType: params.manualCoverageType ?? 'unknown',
      checkedAt: new Date().toISOString(),
    };
  }

  async pollClaimStatus(params: {
    claimId: string;
    payerClaimId?: string;
    payerId: string;
    tenantId: string;
    /** Manual entry fields */
    manualClaimStatus?: string;
    manualAdjudicationDate?: string;
    manualPaidAmountCents?: number;
    manualNotes?: string;
  }): Promise<ClaimStatusResponse> {
    return {
      claimId: params.claimId,
      payerClaimId: params.payerClaimId,
      status: (params.manualClaimStatus as ClaimStatusResponse['status']) ?? 'pending',
      isTestData: false,
      statusDescription: params.manualNotes ?? 'Manually reported claim status',
      adjudicationDate: params.manualAdjudicationDate,
      paidAmount:
        params.manualPaidAmountCents != null ? params.manualPaidAmountCents / 100 : undefined,
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
            'Manual adapter does not support claim submission. Use a clearinghouse or portal adapter.',
        },
      ],
      submittedAt: new Date().toISOString(),
    };
  }

  async handleDenial(params: {
    claimId: string;
    denialReasons: Array<{ code: string; description: string }>;
    payerId: string;
    tenantId: string;
  }): Promise<DenialWorkflowResponse> {
    return {
      appealCreated: false,
      recommendedActions: params.denialReasons.map(
        (r) => `Manual review: denial ${r.code} - ${r.description}`
      ),
      automatedCorrections: [],
      escalationRequired: false,
    };
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    return {
      healthy: true,
      adapterId: this.config.id,
      adapterName: this.config.name,
      latencyMs: 0,
      details: 'Manual adapter always available - no external dependencies',
      checkedAt: new Date().toISOString(),
    };
  }

  async shutdown(): Promise<void> {
    /* No-op */
  }
}
