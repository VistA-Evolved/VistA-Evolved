/**
 * VistA Billing Adapter — Phase 37C.
 * Placeholder: IB (Integrated Billing) RPCs not available in sandbox.
 */

import type { BillingAdapter, Claim, EOB, EligibilityResult } from './interface.js';
import type { AdapterResult } from '../types.js';

const PENDING = { ok: false as const, pending: true, target: 'IB BILLING RPCs' };

export class VistaBillingAdapter implements BillingAdapter {
  readonly adapterType = 'billing' as const;
  readonly implementationName = 'vista-rpc';
  readonly _isStub = false;

  async healthCheck() {
    return { ok: true, latencyMs: 0, detail: 'VistA billing adapter (IB RPCs pending)' };
  }

  async getClaims(): Promise<AdapterResult<Claim[]>> {
    return PENDING;
  }
  async submitClaim(): Promise<AdapterResult<Claim>> {
    return PENDING;
  }
  async getEOB(): Promise<AdapterResult<EOB>> {
    return PENDING;
  }
  async getEligibility(): Promise<AdapterResult<EligibilityResult>> {
    return PENDING;
  }
}
