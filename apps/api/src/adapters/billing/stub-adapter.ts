/**
 * Stub Billing Adapter — Phase 37C.
 */

import type { BillingAdapter, Claim, EOB, EligibilityResult } from './interface.js';
import type { AdapterResult } from '../types.js';

const STUB = { ok: false as const, pending: true, error: 'Billing adapter not configured' };

export class StubBillingAdapter implements BillingAdapter {
  readonly adapterType = 'billing' as const;
  readonly implementationName = 'external-stub';
  readonly _isStub = true;

  async healthCheck() {
    return { ok: false, latencyMs: 0, detail: 'Stub adapter' };
  }
  async getClaims(): Promise<AdapterResult<Claim[]>> {
    return STUB;
  }
  async submitClaim(): Promise<AdapterResult<Claim>> {
    return STUB;
  }
  async getEOB(): Promise<AdapterResult<EOB>> {
    return STUB;
  }
  async getEligibility(): Promise<AdapterResult<EligibilityResult>> {
    return STUB;
  }
}
