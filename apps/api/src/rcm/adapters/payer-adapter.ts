/**
 * PayerAdapter Interface -- Phase 69: RCM Ops Excellence v1
 *
 * Higher-level abstraction above connectors (Phase 38 transport layer).
 * Each PayerAdapter wraps workflow-level operations:
 *   - Eligibility check (270/271)
 *   - Claim status poll (276/277)
 *   - Claim submission (837P/I)
 *   - Denial handling workflow
 *   - Health check
 *
 * Connectors handle raw transport (HTTP, SFTP, API).
 * PayerAdapters handle business logic (mapping, validation, retry, tenant scoping).
 *
 * No payer-specific logic in core routes. All payer-specific behavior
 * is encapsulated in the adapter implementation.
 */

/* -- Response Types ------------------------------------------- */

export interface EligibilityResponse {
  eligible: boolean;
  status: 'active' | 'inactive' | 'unknown' | 'pending';
  payerId: string;
  payerName: string;
  /** True when response is from sandbox/test adapter -- never trust for real workflows */
  isTestData?: boolean;
  memberId?: string;
  groupId?: string;
  coverageType?: string;
  effectiveDate?: string;
  terminationDate?: string;
  copay?: { amount: number; currency: string };
  deductible?: { remaining: number; total: number; currency: string };
  rawResponse?: string;
  checkedAt: string;
}

export interface ClaimStatusResponse {
  claimId: string;
  payerClaimId?: string;
  status: 'accepted' | 'rejected' | 'pending' | 'adjudicated' | 'unknown';
  /** True when response is from sandbox/test adapter */
  isTestData?: boolean;
  statusCode?: string;
  statusDescription?: string;
  adjudicationDate?: string;
  paidAmount?: number;
  patientResponsibility?: number;
  denialReasons?: Array<{ code: string; description: string }>;
  rawResponse?: string;
  checkedAt: string;
}

export interface SubmissionResponse {
  accepted: boolean;
  trackingId?: string;
  /** True when response is from sandbox/test adapter */
  isTestData?: boolean;
  errors: Array<{ code: string; description: string; field?: string }>;
  rawResponse?: string;
  submittedAt: string;
}

export interface DenialWorkflowResponse {
  appealCreated: boolean;
  appealId?: string;
  recommendedActions: string[];
  automatedCorrections: Array<{ field: string; oldValue: string; newValue: string }>;
  escalationRequired: boolean;
  rawResponse?: string;
}

export interface AdapterHealthResult {
  healthy: boolean;
  adapterId: string;
  adapterName: string;
  latencyMs?: number;
  details?: string;
  checkedAt: string;
}

/* -- Adapter Configuration ------------------------------------ */

export interface PayerAdapterConfig {
  /** Unique adapter ID (e.g., "x12-clearinghouse", "philhealth") */
  id: string;

  /** Human-readable name */
  name: string;

  /** Which integration modes this adapter handles */
  supportedModes: string[];

  /** Tenant-scoped rate limits */
  rateLimits: {
    eligibilityPerHour: number;
    claimStatusPerHour: number;
    submissionsPerHour: number;
  };

  /** Environment variables required (checked at init) */
  requiredEnvVars?: string[];

  /** Whether adapter is enabled */
  enabled: boolean;
}

/* -- PayerAdapter Interface ----------------------------------- */

export interface PayerAdapter {
  /** Configuration */
  readonly config: PayerAdapterConfig;

  /** Initialize adapter (validate config, test connectivity) */
  initialize(): Promise<void>;

  /** Check patient eligibility (270/271) */
  checkEligibility(params: {
    patientDfn: string;
    payerId: string;
    subscriberId?: string;
    memberId?: string;
    dateOfService?: string;
    tenantId: string;
  }): Promise<EligibilityResponse>;

  /** Poll claim status (276/277) */
  pollClaimStatus(params: {
    claimId: string;
    payerClaimId?: string;
    payerId: string;
    tenantId: string;
  }): Promise<ClaimStatusResponse>;

  /** Submit claim (837P/I) */
  submitClaim(params: {
    claimId: string;
    payerId: string;
    payload: string;
    transactionSet: '837P' | '837I';
    tenantId: string;
  }): Promise<SubmissionResponse>;

  /** Handle denial workflow */
  handleDenial(params: {
    claimId: string;
    denialReasons: Array<{ code: string; description: string }>;
    payerId: string;
    tenantId: string;
  }): Promise<DenialWorkflowResponse>;

  /** Health check */
  healthCheck(): Promise<AdapterHealthResult>;

  /** Shutdown / cleanup */
  shutdown(): Promise<void>;
}

/* -- Adapter Registry ----------------------------------------- */

const adapters = new Map<string, PayerAdapter>();

export function registerPayerAdapter(adapter: PayerAdapter): void {
  if (adapters.has(adapter.config.id)) {
    // Warn but allow -- idempotent re-registration on hot reload
    return;
  }
  adapters.set(adapter.config.id, adapter);
}

export function getPayerAdapter(id: string): PayerAdapter | undefined {
  return adapters.get(id);
}

export function getPayerAdapterForMode(mode: string): PayerAdapter | undefined {
  for (const adapter of adapters.values()) {
    if (adapter.config.supportedModes.includes(mode)) return adapter;
  }
  return undefined;
}

export function listPayerAdapters(): Array<{
  id: string;
  name: string;
  enabled: boolean;
  supportedModes: string[];
  rateLimits: PayerAdapterConfig['rateLimits'];
}> {
  return Array.from(adapters.values()).map((a) => ({
    id: a.config.id,
    name: a.config.name,
    enabled: a.config.enabled,
    supportedModes: a.config.supportedModes,
    rateLimits: a.config.rateLimits,
  }));
}

export function getAllPayerAdapters(): Map<string, PayerAdapter> {
  return adapters;
}

export function resetPayerAdapters(): void {
  adapters.clear();
}
