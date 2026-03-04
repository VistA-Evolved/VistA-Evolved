/**
 * LOA Adapter -- Phase 110
 *
 * Adapter-first design for payer LOA communication.
 * The LOA adapter interface defines submitLOA(), checkLOAStatus(),
 * and getRequirements() operations. A stub adapter is provided for
 * development; real adapters (clearinghouse, portal, etc.) can be
 * registered later.
 *
 * Selection via LOA_ADAPTER env var: "stub" (default) or future adapters.
 */

import type { LoaRequestRow } from './loa-repo.js';

/* ------------------------------------------------------------------ */
/* Adapter Interface                                                   */
/* ------------------------------------------------------------------ */

export interface LoaAdapterResult {
  ok: boolean;
  trackingNumber?: string;
  status?: string;
  requirements?: string[];
  error?: string;
}

export interface LoaAdapter {
  /** Adapter name for logging/audit */
  readonly name: string;

  /** Submit an LOA request to the payer */
  submitLOA(loa: LoaRequestRow): Promise<LoaAdapterResult>;

  /** Check the current status of a submitted LOA */
  checkLOAStatus(loa: LoaRequestRow): Promise<LoaAdapterResult>;

  /** Get payer-specific requirements for LOA submission */
  getRequirements(payerId: string): Promise<LoaAdapterResult>;
}

/* ------------------------------------------------------------------ */
/* Stub Adapter (development/sandbox)                                  */
/* ------------------------------------------------------------------ */

class StubLoaAdapter implements LoaAdapter {
  readonly name = 'stub';

  async submitLOA(loa: LoaRequestRow): Promise<LoaAdapterResult> {
    // Simulate processing delay
    return {
      ok: true,
      trackingNumber: `STUB-${Date.now()}-${loa.id.slice(0, 8)}`,
      status: 'submitted',
    };
  }

  async checkLOAStatus(loa: LoaRequestRow): Promise<LoaAdapterResult> {
    // Stub always returns pending -- integration pending
    return {
      ok: true,
      status: 'pending_payer_review',
    };
  }

  async getRequirements(payerId: string): Promise<LoaAdapterResult> {
    // Return generic requirements
    return {
      ok: true,
      requirements: [
        'Clinical summary or medical necessity letter',
        'Relevant diagnosis codes (ICD-10)',
        'Procedure codes (CPT/HCPCS)',
        'Supporting lab results or imaging reports',
        'Provider NPI and facility information',
      ],
    };
  }
}

/* ------------------------------------------------------------------ */
/* Adapter Registry                                                    */
/* ------------------------------------------------------------------ */

const adapterRegistry = new Map<string, LoaAdapter>();

// Register the stub adapter
adapterRegistry.set('stub', new StubLoaAdapter());

/**
 * Register a custom LOA adapter.
 */
export function registerLoaAdapter(name: string, adapter: LoaAdapter): void {
  adapterRegistry.set(name, adapter);
}

/**
 * Get the active LOA adapter based on LOA_ADAPTER env var.
 * Defaults to "stub".
 */
export function getLoaAdapter(): LoaAdapter {
  const adapterName = process.env.LOA_ADAPTER || 'stub';
  const adapter = adapterRegistry.get(adapterName);
  if (!adapter) {
    // Fall back to stub if the configured adapter doesn't exist
    return adapterRegistry.get('stub')!;
  }
  return adapter;
}

/**
 * List all registered adapter names.
 */
export function listLoaAdapters(): string[] {
  return Array.from(adapterRegistry.keys());
}
