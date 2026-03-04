/**
 * Capability Service — Phase 37C.
 *
 * Resolves effective capabilities for a tenant based on:
 *   1. Module enablement (from module registry)
 *   2. Adapter availability (from adapter loader)
 *   3. Static capability definitions (from config/capabilities.json)
 *
 * The resolved capabilities drive both API behavior (route guards) and
 * UI rendering (feature toggles, "integration pending" badges).
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { log } from '../lib/logger.js';
import { isModuleEnabled } from './module-registry.js';
import { getAdapter } from '../adapters/adapter-loader.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type CapabilityStatus = 'live' | 'pending' | 'disabled' | 'external';

export interface CapabilityDefinition {
  status: CapabilityStatus;
  module: string;
  adapter: string | null;
  targetRpc: string | null;
  targetPackage: string | null;
  description: string;
}

export interface ResolvedCapability {
  /** The canonical capability name */
  name: string;
  /** Effective status after module/adapter resolution */
  effectiveStatus: CapabilityStatus;
  /** Original status from config */
  configuredStatus: CapabilityStatus;
  /** Why the status was changed (if different from configured) */
  reason?: string;
  /** Module that owns this capability */
  module: string;
  /** Target RPC for VistA-backed capabilities */
  targetRpc: string | null;
  /** Target VistA package namespace */
  targetPackage: string | null;
  /** Human-readable description */
  description: string;
}

/* ------------------------------------------------------------------ */
/* State                                                               */
/* ------------------------------------------------------------------ */

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const CONFIG_ROOT = join(__dirname, '..', '..', '..', '..', 'config');

let capabilityDefinitions: Record<string, CapabilityDefinition> = {};

/* ------------------------------------------------------------------ */
/* Initialization                                                      */
/* ------------------------------------------------------------------ */

export function initCapabilityService(): void {
  try {
    const capsPath = join(CONFIG_ROOT, 'capabilities.json');
    const capsData = JSON.parse(readFileSync(capsPath, 'utf-8'));
    capabilityDefinitions = capsData.capabilities || {};

    log.info('Capability service initialized', {
      capabilityCount: Object.keys(capabilityDefinitions).length,
    });
  } catch (err: any) {
    log.warn('Failed to load capabilities.json, using empty set', {
      error: err.message,
    });
    capabilityDefinitions = {};
  }
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/** Get raw capability definitions. */
export function getCapabilityDefinitions(): Record<string, CapabilityDefinition> {
  return capabilityDefinitions;
}

/**
 * Resolve effective capabilities for a tenant.
 *
 * Resolution logic:
 * 1. If module is disabled → capability is "disabled"
 * 2. If adapter is required but unavailable → capability is "pending"
 * 3. Otherwise → use configured status
 */
export function resolveCapabilities(tenantId: string = 'default'): ResolvedCapability[] {
  const results: ResolvedCapability[] = [];

  for (const [name, def] of Object.entries(capabilityDefinitions)) {
    let effectiveStatus: CapabilityStatus = def.status;
    let reason: string | undefined;

    // 1. Check module enablement
    if (!isModuleEnabled(def.module, tenantId)) {
      effectiveStatus = 'disabled';
      reason = `Module '${def.module}' is not enabled for tenant '${tenantId}'`;
    }
    // 2. Check adapter availability (only if module is enabled)
    else if (def.adapter) {
      const adapter = getAdapter(def.adapter);
      if (!adapter) {
        effectiveStatus = 'pending';
        reason = `Adapter '${def.adapter}' is not loaded`;
      } else if (adapter._isStub) {
        // Stub adapter → mark as pending unless already pending
        if (effectiveStatus === 'live') {
          effectiveStatus = 'pending';
          reason = `Adapter '${def.adapter}' is using stub implementation`;
        }
      }
    }

    results.push({
      name,
      effectiveStatus,
      configuredStatus: def.status,
      reason,
      module: def.module,
      targetRpc: def.targetRpc,
      targetPackage: def.targetPackage,
      description: def.description,
    });
  }

  return results;
}

/**
 * Check if a specific capability is available (live or external) for a tenant.
 */
export function isCapabilityAvailable(
  capabilityName: string,
  tenantId: string = 'default'
): boolean {
  const def = capabilityDefinitions[capabilityName];
  if (!def) return false;

  // Quick check: module must be enabled
  if (!isModuleEnabled(def.module, tenantId)) return false;

  // Check adapter
  if (def.adapter) {
    const adapter = getAdapter(def.adapter);
    if (!adapter || adapter._isStub) return false;
  }

  return def.status === 'live' || def.status === 'external';
}

/**
 * Get capabilities grouped by module (for UI rendering).
 */
export function getCapabilitiesByModule(
  tenantId: string = 'default'
): Record<string, ResolvedCapability[]> {
  const all = resolveCapabilities(tenantId);
  const grouped: Record<string, ResolvedCapability[]> = {};

  for (const cap of all) {
    if (!grouped[cap.module]) grouped[cap.module] = [];
    grouped[cap.module].push(cap);
  }

  return grouped;
}

/**
 * Get summary stats for capabilities (admin dashboard).
 */
export function getCapabilitySummary(tenantId: string = 'default'): {
  total: number;
  live: number;
  pending: number;
  disabled: number;
  external: number;
  byModule: Record<string, { live: number; pending: number; disabled: number }>;
} {
  const all = resolveCapabilities(tenantId);
  const summary = {
    total: all.length,
    live: 0,
    pending: 0,
    disabled: 0,
    external: 0,
    byModule: {} as Record<string, { live: number; pending: number; disabled: number }>,
  };

  for (const cap of all) {
    summary[cap.effectiveStatus]++;
    if (!summary.byModule[cap.module]) {
      summary.byModule[cap.module] = { live: 0, pending: 0, disabled: 0 };
    }
    if (cap.effectiveStatus === 'live' || cap.effectiveStatus === 'external') {
      summary.byModule[cap.module].live++;
    } else if (cap.effectiveStatus === 'pending') {
      summary.byModule[cap.module].pending++;
    } else {
      summary.byModule[cap.module].disabled++;
    }
  }

  return summary;
}
