/**
 * Clinical Writeback Command Bus — Feature Gates
 *
 * Phase 300 (W12-P2): Tenant-scoped feature gates for writeback.
 *
 * All writeback features DEFAULT OFF. Must be explicitly enabled per-tenant.
 * Dry-run mode defaults ON (records transcript without executing RPC).
 */

import type { WritebackDomain, WritebackGateConfig } from './types.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Environment variable mapping                                        */
/* ------------------------------------------------------------------ */

const GATE_ENV_MAP: Record<WritebackDomain, string> = {
  TIU: 'WRITEBACK_NOTES_ENABLED',
  ORDERS: 'WRITEBACK_ORDERS_ENABLED',
  PHARM: 'WRITEBACK_PHARMACY_ENABLED',
  LAB: 'WRITEBACK_LABS_ENABLED',
  ADT: 'WRITEBACK_ADT_ENABLED',
  IMG: 'WRITEBACK_IMAGING_ENABLED',
};

function envBool(key: string, fallback: boolean): boolean {
  const v = process.env[key];
  if (v === undefined || v === '') return fallback;
  return v === 'true' || v === '1';
}

/* ------------------------------------------------------------------ */
/* Gate resolution                                                     */
/* ------------------------------------------------------------------ */

/**
 * Resolve the effective writeback gate configuration.
 * In production, this would also check tenant_feature_flag table.
 * For now, reads from env vars with safe defaults.
 */
export function resolveGateConfig(_tenantId?: string): WritebackGateConfig {
  const globalEnabled = envBool('WRITEBACK_ENABLED', false);
  const dryRunMode = envBool('WRITEBACK_DRYRUN', true);

  const domainGates = {} as Record<WritebackDomain, boolean>;
  for (const [domain, envKey] of Object.entries(GATE_ENV_MAP)) {
    domainGates[domain as WritebackDomain] = envBool(envKey, false);
  }

  return { globalEnabled, domainGates, dryRunMode };
}

/**
 * Check if a writeback command is allowed for the given domain.
 * Returns { allowed, reason, dryRun }.
 */
export function checkWritebackGate(
  domain: WritebackDomain,
  tenantId?: string,
  forceDryRun?: boolean
): { allowed: boolean; reason?: string; dryRun: boolean } {
  const config = resolveGateConfig(tenantId);

  if (!config.globalEnabled) {
    return {
      allowed: false,
      reason: 'Writeback globally disabled (WRITEBACK_ENABLED=false)',
      dryRun: true,
    };
  }

  if (!config.domainGates[domain]) {
    return {
      allowed: false,
      reason: `Writeback disabled for domain ${domain} (${GATE_ENV_MAP[domain]}=false)`,
      dryRun: true,
    };
  }

  const dryRun = forceDryRun || config.dryRunMode;

  if (dryRun) {
    log.debug(`Writeback gate: domain=${domain} allowed=true dryRun=true`);
  }

  return { allowed: true, dryRun };
}

/**
 * Check if supervised-mode review is enabled.
 * When ON, supervised-tier RPCs require clinical review before execution.
 * When OFF, supervised-tier RPCs execute like safe-harbor (dev convenience).
 * Phase 437.
 */
export function isSupervisedModeEnabled(): boolean {
  return envBool('WRITEBACK_SUPERVISED_MODE', true);
}

/**
 * Get a summary of all writeback gate states.
 * Useful for /posture and admin endpoints.
 */
export function getWritebackGateSummary(tenantId?: string): {
  globalEnabled: boolean;
  dryRunMode: boolean;
  supervisedMode: boolean;
  domains: Record<WritebackDomain, boolean>;
} {
  const config = resolveGateConfig(tenantId);
  return {
    globalEnabled: config.globalEnabled,
    dryRunMode: config.dryRunMode,
    supervisedMode: isSupervisedModeEnabled(),
    domains: config.domainGates,
  };
}
