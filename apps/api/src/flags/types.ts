/**
 * Feature Flag Provider — Type definitions (Phase 285)
 *
 * Provider-agnostic feature flag evaluation layer. DB provider is the
 * default (reads from tenant_feature_flag table with rollout_percentage
 * support). Unleash provider is optional for self-hosted OSS flag management.
 */

// ─── Flag Context ──────────────────────────────────────────────
/** Context passed to every flag evaluation. */
export interface FlagContext {
  tenantId: string;
  /** Provider DUZ — used for deterministic hash rollout and user targeting. */
  userId?: string;
  /** Additional properties for custom targeting rules (e.g., role, module). */
  properties?: Record<string, string>;
}

// ─── Flag Evaluation Result ────────────────────────────────────
export interface FlagEvaluationResult {
  /** Whether the flag is enabled for this context. */
  enabled: boolean;
  /** Optional variant name (for A/B or multivariate flags). */
  variant?: string;
  /** Source of the evaluation (db, unleash, fallback). */
  source: 'db' | 'unleash' | 'fallback';
}

// ─── User Targeting Rule ───────────────────────────────────────
export interface UserTargetingRule {
  /** Field to match in FlagContext (userId, or a properties key). */
  field: string;
  /** Operator for the match. */
  operator: 'eq' | 'neq' | 'in' | 'not_in' | 'contains';
  /** Value(s) to match against. */
  values: string[];
}

// ─── Provider Interface ────────────────────────────────────────
export interface FeatureFlagProvider {
  readonly providerType: FeatureFlagProviderType;

  /**
   * Evaluate a single flag for the given context.
   * Returns { enabled: false, source: "fallback" } if flag doesn't exist.
   */
  isEnabled(flagKey: string, context: FlagContext): Promise<FlagEvaluationResult>;

  /**
   * Get variant for a flag (for A/B testing).
   * Returns undefined variant if not configured.
   */
  getVariant(flagKey: string, context: FlagContext): Promise<FlagEvaluationResult>;

  /**
   * Bulk-evaluate multiple flags for the same context.
   */
  evaluateAll(
    flagKeys: string[],
    context: FlagContext
  ): Promise<Record<string, FlagEvaluationResult>>;

  /** Health check — returns true if provider is operational. */
  healthCheck(): Promise<boolean>;

  /** Graceful shutdown (close connections, stop polling). */
  destroy(): Promise<void>;
}

// ─── Provider Type ─────────────────────────────────────────────
export type FeatureFlagProviderType = 'db' | 'unleash';

// ─── Provider Registry (singleton) ─────────────────────────────
let _flagProvider: FeatureFlagProvider | null = null;

export function setFeatureFlagProvider(p: FeatureFlagProvider): void {
  _flagProvider = p;
}

export function getFeatureFlagProvider(): FeatureFlagProvider | null {
  return _flagProvider;
}
