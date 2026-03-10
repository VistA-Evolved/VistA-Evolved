/**
 * DbFeatureFlagProvider -- Database-backed feature flag evaluation (Phase 285)
 *
 * Reads from tenant_feature_flag table. Supports:
 * - Boolean on/off flags
 * - Percentage rollout via deterministic hash (murmur-like)
 * - User targeting rules (JSONB in user_targeting column)
 * - Fallback to false for unknown flags
 */

import { createHash } from 'node:crypto';
import type {
  FeatureFlagProvider,
  FlagContext,
  FlagEvaluationResult,
  UserTargetingRule,
} from './types.js';
import {
  getTenantFeatureFlag,
  listTenantFeatureFlags,
  type TenantFeatureFlagRow,
} from '../platform/pg/repo/module-repo.js';

// --- Deterministic Hash Rollout --------------------------------

/**
 * Produce a deterministic number 0-99 from (flagKey, userId/tenantId).
 * Uses SHA-256 for uniform distribution.
 */
function rolloutBucket(flagKey: string, seed: string): number {
  const hash = createHash('sha256').update(`${flagKey}:${seed}`).digest();
  // Use first 4 bytes as uint32, mod 100
  const val = hash.readUInt32BE(0);
  return val % 100;
}

// --- Targeting Evaluation --------------------------------------

function evaluateTargetingRules(rules: UserTargetingRule[], context: FlagContext): boolean {
  if (!rules.length) return true; // No rules = pass

  for (const rule of rules) {
    const contextValue =
      rule.field === 'userId' ? context.userId : context.properties?.[rule.field];

    if (contextValue === undefined) {
      // If context doesn't have the field, rule fails
      return false;
    }

    switch (rule.operator) {
      case 'eq':
        if (contextValue !== rule.values[0]) return false;
        break;
      case 'neq':
        if (contextValue === rule.values[0]) return false;
        break;
      case 'in':
        if (!rule.values.includes(contextValue)) return false;
        break;
      case 'not_in':
        if (rule.values.includes(contextValue)) return false;
        break;
      case 'contains':
        if (!rule.values.some((v) => contextValue.includes(v))) return false;
        break;
    }
  }
  return true; // All rules passed
}

// --- Provider Implementation -----------------------------------

export class DbFeatureFlagProvider implements FeatureFlagProvider {
  readonly providerType = 'db' as const;

  async isEnabled(flagKey: string, context: FlagContext): Promise<FlagEvaluationResult> {
    const row = await getTenantFeatureFlag(context.tenantId, flagKey);
    if (!row) {
      return { enabled: false, source: 'fallback' };
    }
    return this.evaluateRow(row, context);
  }

  async getVariant(flagKey: string, context: FlagContext): Promise<FlagEvaluationResult> {
    const row = await getTenantFeatureFlag(context.tenantId, flagKey);
    if (!row) {
      return { enabled: false, source: 'fallback' };
    }
    const result = await this.evaluateRow(row, context);
    // Variant is the flagValue itself (e.g., "control", "treatment-a")
    if (result.enabled && row.flagValue !== 'true' && row.flagValue !== 'false') {
      result.variant = row.flagValue;
    }
    return result;
  }

  async evaluateAll(
    flagKeys: string[],
    context: FlagContext
  ): Promise<Record<string, FlagEvaluationResult>> {
    // Batch-load all flags for tenant, then evaluate locally
    const allFlags = await listTenantFeatureFlags(context.tenantId);
    const flagMap = new Map(allFlags.map((f) => [f.flagKey, f]));
    const results: Record<string, FlagEvaluationResult> = {};

    for (const key of flagKeys) {
      const row = flagMap.get(key);
      if (!row) {
        results[key] = { enabled: false, source: 'fallback' };
      } else {
        results[key] = this.evaluateRow(row, context);
      }
    }
    return results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      await listTenantFeatureFlags('default');
      return true;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    // No-op: DB connections managed externally
  }

  // --- Internal ----------------------------------------------

  private evaluateRow(row: TenantFeatureFlagRow, context: FlagContext): FlagEvaluationResult {
    // 1. Basic on/off check
    if (row.flagValue === 'false') {
      return { enabled: false, source: 'db' };
    }

    // 2. User targeting rules (if present)
    const targeting = (row as any).userTargeting as UserTargetingRule[] | null | undefined;
    if (targeting && Array.isArray(targeting) && targeting.length > 0) {
      if (!evaluateTargetingRules(targeting, context)) {
        return { enabled: false, source: 'db' };
      }
    }

    // 3. Percentage rollout (if present)
    const rolloutPct = (row as any).rolloutPercentage as number | null | undefined;
    if (rolloutPct !== null && rolloutPct !== undefined && rolloutPct < 100) {
      const seed = context.userId || context.tenantId;
      const bucket = rolloutBucket(row.flagKey, seed);
      if (bucket >= rolloutPct) {
        return { enabled: false, source: 'db' };
      }
    }

    return { enabled: true, source: 'db' };
  }
}
