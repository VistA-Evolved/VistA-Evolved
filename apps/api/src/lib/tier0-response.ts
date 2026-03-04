/**
 * Tier-0 Capability-Driven Response Helpers -- Phase 482 (W33-P2).
 *
 * Standardizes the response envelope for hospital-critical Tier-0 write
 * paths. Each endpoint probes the target RPC via the capability cache and
 * returns one of:
 *   - `{ ok: true, source: "vista" }` -- real writeback succeeded
 *   - `{ ok: false, status: "unsupported-in-sandbox", capabilityProbe }` -- RPC confirmed absent
 *   - `{ ok: false, status: "integration-pending", capabilityProbe }` -- probe indeterminate
 *
 * Usage in route handlers:
 *   const probe = probeTier0Rpc("DGPM NEW ADMISSION", "adt");
 *   if (!probe.available) {
 *     return reply.status(202).send(tier0UnsupportedResponse(probe, { ... }));
 *   }
 *   // ... attempt real RPC call ...
 */

import { optionalRpc, getCapabilities } from '../vista/rpcCapabilities.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface Tier0ProbeResult {
  rpcName: string;
  available: boolean;
  error?: string;
  domain: string;
  probedAt: string;
  /** True if this RPC was never expected to work in the sandbox */
  expectedMissing: boolean;
  /** Whether the capability cache has been populated */
  cachePopulated: boolean;
}

export interface Tier0VistaGrounding {
  vistaFiles: string[];
  targetRoutines: string[];
  migrationPath: string;
  sandboxNote: string;
}

export interface Tier0UnsupportedResponse {
  ok: false;
  status: 'unsupported-in-sandbox';
  message: string;
  rpcUsed: string[];
  pendingTargets: string[];
  capabilityProbe: Tier0ProbeResult;
  vistaGrounding: Tier0VistaGrounding;
}

export interface Tier0PendingResponse {
  ok: false;
  status: 'integration-pending';
  message: string;
  rpcUsed: string[];
  pendingTargets: string[];
  capabilityProbe: Tier0ProbeResult;
  vistaGrounding?: Tier0VistaGrounding;
}

/* ------------------------------------------------------------------ */
/* Known missing RPCs in WorldVistA Docker sandbox                      */
/* ------------------------------------------------------------------ */

/**
 * RPCs that are known to be absent from the WorldVistA Docker sandbox.
 * These will be marked `expectedMissing: true` in probe results.
 */
const SANDBOX_EXPECTED_MISSING: string[] = [
  // ADT write RPCs -- DGPM package not exposed in OR CPRS GUI CHART context
  'DGPM NEW ADMISSION',
  'DGPM NEW TRANSFER',
  'DGPM NEW DISCHARGE',
  // BCMA/PSB -- separate package, not in sandbox
  'PSB MED LOG',
  'PSB ALLERGY',
  'PSB VALIDATE ORDER',
  'PSJBCMA',
  // Nursing -- NURS package not in sandbox
  'NURS TASK LIST',
  'NURS ASSESSMENTS',
  // Lab write -- LR package not exposed via broker context
  'LR VERIFY',
  // Phase 484 (W33-P4): Nursing I/O + assessment RPCs
  'GMRIO RESULTS',
  'GMRIO ADD',
  'ZVENAS LIST',
  'ZVENAS SAVE',
];

/* ------------------------------------------------------------------ */
/* Probe helper                                                         */
/* ------------------------------------------------------------------ */

/**
 * Probe a Tier-0 RPC via the capability cache. Returns a structured result
 * indicating whether the RPC is available and evidence of the probe.
 *
 * If the cache is not populated, returns `available: true` (optimistic) with
 * `cachePopulated: false` so callers know to attempt the RPC call.
 */
export function probeTier0Rpc(rpcName: string, domain: string): Tier0ProbeResult {
  const caps = getCapabilities();
  const cachePopulated = caps !== null;
  const check = optionalRpc(rpcName);

  return {
    rpcName,
    available: check.available,
    error: check.error,
    domain,
    probedAt: cachePopulated
      ? caps!.discoveredAt || new Date().toISOString()
      : new Date().toISOString(),
    expectedMissing: SANDBOX_EXPECTED_MISSING.includes(rpcName),
    cachePopulated,
  };
}

/**
 * Probe multiple Tier-0 RPCs. Returns all probe results.
 * `allAvailable` is true only if every RPC is available.
 */
export function probeTier0Rpcs(rpcs: Array<{ name: string; domain: string }>): {
  probes: Tier0ProbeResult[];
  allAvailable: boolean;
  anyAvailable: boolean;
} {
  const probes = rpcs.map((r) => probeTier0Rpc(r.name, r.domain));
  return {
    probes,
    allAvailable: probes.every((p) => p.available),
    anyAvailable: probes.some((p) => p.available),
  };
}

/* ------------------------------------------------------------------ */
/* Response builders                                                    */
/* ------------------------------------------------------------------ */

/**
 * Build a standardized "unsupported-in-sandbox" response.
 * Use when the RPC probe confirms the target RPC is absent.
 */
export function tier0UnsupportedResponse(
  probe: Tier0ProbeResult,
  grounding: Tier0VistaGrounding,
  opts?: { message?: string }
): Tier0UnsupportedResponse {
  return {
    ok: false,
    status: 'unsupported-in-sandbox',
    message:
      opts?.message ||
      `RPC "${probe.rpcName}" is not available in this VistA sandbox. ${grounding.sandboxNote}`,
    rpcUsed: [],
    pendingTargets: [probe.rpcName],
    capabilityProbe: probe,
    vistaGrounding: grounding,
  };
}

/**
 * Build a standardized "integration-pending" response WITH capability evidence.
 * Use when the probe is indeterminate (cache not populated) or when the
 * endpoint is not yet wired to probe.
 */
export function tier0PendingResponse(
  probe: Tier0ProbeResult,
  grounding?: Tier0VistaGrounding,
  opts?: { message?: string }
): Tier0PendingResponse {
  return {
    ok: false,
    status: 'integration-pending',
    message:
      opts?.message ||
      `RPC "${probe.rpcName}" capability probe indeterminate. Feature integration pending.`,
    rpcUsed: [],
    pendingTargets: [probe.rpcName],
    capabilityProbe: probe,
    ...(grounding ? { vistaGrounding: grounding } : {}),
  };
}

/**
 * Convenience: probe a Tier-0 RPC and return the appropriate response
 * (unsupported or pending), or null if the RPC is available.
 *
 * Usage:
 *   const blocked = tier0Gate("DGPM NEW ADMISSION", "adt", grounding);
 *   if (blocked) return reply.status(202).send(blocked);
 *   // ... attempt real RPC call ...
 */
export function tier0Gate(
  rpcName: string,
  domain: string,
  grounding: Tier0VistaGrounding,
  opts?: { message?: string }
): Tier0UnsupportedResponse | Tier0PendingResponse | null {
  const probe = probeTier0Rpc(rpcName, domain);

  if (probe.available) {
    return null; // RPC available -- proceed with real call
  }

  // RPC confirmed unavailable with cache evidence
  if (probe.cachePopulated) {
    return tier0UnsupportedResponse(probe, grounding, opts);
  }

  // Cache not populated -- return pending with probe info
  return tier0PendingResponse(probe, grounding, opts);
}
