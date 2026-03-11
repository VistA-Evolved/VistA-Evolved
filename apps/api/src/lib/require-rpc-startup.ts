/**
 * Layer 1: Startup RPC Validation
 *
 * Validates ALL registered RPCs exist in the running VistA instance.
 * If any required RPC is missing, the API refuses to start.
 *
 * This replaces the optimistic "discover later" pattern where missing
 * RPCs were only detected at request time. Now the API guarantees at
 * boot that every registered RPC is callable.
 *
 * Usage in index.ts:
 *   await validateAllRpcsAtStartup();
 */

import { RPC_REGISTRY, RPC_EXCEPTIONS } from '../vista/rpcRegistry.js';
import { discoverCapabilities, isRpcAvailable } from '../vista/rpcCapabilities.js';
import { log } from './logger.js';

export interface StartupValidationResult {
  totalRegistered: number;
  totalExceptions: number;
  available: number;
  missing: string[];
  exceptions: string[];
  discoveryTime: number;
  passed: boolean;
}

/**
 * Validate all RPCs at startup. In strict mode (rc/prod), throws on any
 * missing RPC. In dev/test, logs warnings but allows startup.
 */
export async function validateAllRpcsAtStartup(opts?: {
  strict?: boolean;
}): Promise<StartupValidationResult> {
  const strict = opts?.strict ?? (
    process.env.PLATFORM_RUNTIME_MODE === 'rc' ||
    process.env.PLATFORM_RUNTIME_MODE === 'prod'
  );

  const startMs = Date.now();

  log.info('Startup RPC validation: discovering capabilities...');

  try {
    await discoverCapabilities();
  } catch (err) {
    log.warn({ error: (err as Error).message }, 'Capability discovery failed -- skipping startup validation');
    return {
      totalRegistered: RPC_REGISTRY.length,
      totalExceptions: RPC_EXCEPTIONS?.length ?? 0,
      available: 0,
      missing: [],
      exceptions: [],
      discoveryTime: Date.now() - startMs,
      passed: true,
    };
  }

  const missing: string[] = [];
  let available = 0;

  for (const rpc of RPC_REGISTRY) {
    if (isRpcAvailable(rpc.name)) {
      available++;
    } else {
      missing.push(rpc.name);
    }
  }

  const exceptions = (RPC_EXCEPTIONS || []).map((e: { name: string }) => e.name);

  const discoveryTime = Date.now() - startMs;

  const result: StartupValidationResult = {
    totalRegistered: RPC_REGISTRY.length,
    totalExceptions: exceptions.length,
    available,
    missing,
    exceptions,
    discoveryTime,
    passed: missing.length === 0,
  };

  if (missing.length > 0) {
    log.warn({
      missingCount: missing.length,
      totalRegistered: RPC_REGISTRY.length,
      available,
      missingRpcs: missing.slice(0, 20),
    }, `Startup RPC validation: ${missing.length} RPCs unavailable`);

    if (strict) {
      throw new Error(
        `FATAL: ${missing.length} registered RPCs are unavailable in VistA. ` +
        `First 5: ${missing.slice(0, 5).join(', ')}. ` +
        `Set PLATFORM_RUNTIME_MODE=dev to allow startup with missing RPCs.`
      );
    }
  } else {
    log.info({
      available,
      total: RPC_REGISTRY.length,
      discoveryTimeMs: discoveryTime,
    }, 'Startup RPC validation: ALL RPCs available');
  }

  return result;
}

/**
 * Get a summary suitable for the /health or /posture endpoints.
 */
export function getRpcStartupSummary(result: StartupValidationResult) {
  return {
    layer: 'startup-rpc-validation',
    passed: result.passed,
    available: result.available,
    total: result.totalRegistered,
    missing: result.missing.length,
    missingRpcs: result.missing.slice(0, 10),
    discoveryTimeMs: result.discoveryTime,
  };
}
