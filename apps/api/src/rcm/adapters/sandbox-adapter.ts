/**
 * Sandbox PayerAdapter — Phase 69
 *
 * In-memory simulation for dev/testing. Returns deterministic responses
 * based on input parameters. No external calls. Always available.
 */

import type {
  PayerAdapter,
  PayerAdapterConfig,
  EligibilityResponse,
  ClaimStatusResponse,
  SubmissionResponse,
  DenialWorkflowResponse,
  AdapterHealthResult,
} from "./payer-adapter.js";

const CONFIG: PayerAdapterConfig = {
  id: "sandbox",
  name: "Sandbox Payer Adapter (Dev/Test)",
  supportedModes: ["sandbox", "not_classified"],
  rateLimits: {
    eligibilityPerHour: 1000,
    claimStatusPerHour: 1000,
    submissionsPerHour: 1000,
  },
  enabled: true,
};

export class SandboxPayerAdapter implements PayerAdapter {
  readonly config = CONFIG;

  async initialize(): Promise<void> {
    /* no-op for sandbox */
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
      eligible: true,
      status: "active",
      isTestData: true,
      payerId: params.payerId,
      payerName: `Sandbox Payer (${params.payerId})`,
      memberId: params.memberId ?? `SBX-${params.patientDfn}`,
      coverageType: "HMO",
      effectiveDate: "2024-01-01",
      copay: { amount: 20, currency: "USD" },
      deductible: { remaining: 500, total: 2000, currency: "USD" },
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
      payerClaimId: params.payerClaimId ?? `SBX-${params.claimId}`,
      status: "pending",
      isTestData: true,
      statusCode: "P1",
      statusDescription: "Claim received, processing (sandbox simulation)",
      checkedAt: new Date().toISOString(),
    };
  }

  async submitClaim(params: {
    claimId: string;
    payerId: string;
    payload: string;
    transactionSet: "837P" | "837I";
    tenantId: string;
  }): Promise<SubmissionResponse> {
    return {
      accepted: true,
      isTestData: true,
      trackingId: `SBX-TRK-${Date.now()}`,
      errors: [],
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
        (r) => `Review denial code ${r.code}: ${r.description}`,
      ),
      automatedCorrections: [],
      escalationRequired: params.denialReasons.some(
        (r) => r.code.startsWith("CO-") || r.code.startsWith("PR-"),
      ),
    };
  }

  async healthCheck(): Promise<AdapterHealthResult> {
    return {
      healthy: true,
      adapterId: this.config.id,
      adapterName: this.config.name,
      latencyMs: 0,
      details: "Sandbox adapter always healthy",
      checkedAt: new Date().toISOString(),
    };
  }

  async shutdown(): Promise<void> {
    /* no-op for sandbox */
  }
}
