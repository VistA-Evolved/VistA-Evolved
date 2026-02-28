/**
 * Feature Flag Provider — Barrel export + initialization (Phase 285)
 */

export type {
  FeatureFlagProvider,
  FeatureFlagProviderType,
  FlagContext,
  FlagEvaluationResult,
  UserTargetingRule,
} from "./types.js";

export {
  setFeatureFlagProvider,
  getFeatureFlagProvider,
} from "./types.js";

export { DbFeatureFlagProvider } from "./db-provider.js";
export { UnleashFeatureFlagProvider } from "./unleash-provider.js";

import { setFeatureFlagProvider } from "./types.js";
import { DbFeatureFlagProvider } from "./db-provider.js";
import { UnleashFeatureFlagProvider } from "./unleash-provider.js";

/**
 * Initialize the feature flag provider based on FEATURE_FLAG_PROVIDER env var.
 * - "db"      (default) — database-backed with rollout + targeting
 * - "unleash" — self-hosted Unleash with DB fallback
 */
export function initFeatureFlagProvider(): void {
  const providerType = (
    process.env.FEATURE_FLAG_PROVIDER || "db"
  ).toLowerCase();

  switch (providerType) {
    case "unleash": {
      const provider = new UnleashFeatureFlagProvider();
      setFeatureFlagProvider(provider);
      break;
    }
    case "db":
    default: {
      const provider = new DbFeatureFlagProvider();
      setFeatureFlagProvider(provider);
      break;
    }
  }
}
