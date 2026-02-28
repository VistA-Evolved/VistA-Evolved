/**
 * UnleashFeatureFlagProvider — Self-hosted Unleash adapter (Phase 285)
 *
 * Optional provider that connects to a self-hosted Unleash server.
 * Uses vanilla Node.js fetch (no SDK dependency) with local cache
 * and fail-safe fallback to DB provider.
 *
 * Env vars:
 *   UNLEASH_URL       - Unleash API URL (e.g., http://localhost:4242/api)
 *   UNLEASH_API_KEY   - Client API token
 *   UNLEASH_APP_NAME  - Application name (default: "vista-evolved")
 *   UNLEASH_REFRESH_INTERVAL_MS - Cache refresh interval (default: 15000)
 */

import type {
  FeatureFlagProvider,
  FlagContext,
  FlagEvaluationResult,
} from "./types.js";
import { DbFeatureFlagProvider } from "./db-provider.js";

// ─── Types ─────────────────────────────────────────────────────

interface UnleashToggle {
  name: string;
  enabled: boolean;
  variant?: {
    name: string;
    enabled: boolean;
    payload?: { type: string; value: string };
  };
  strategies?: Array<{
    name: string;
    parameters?: Record<string, string>;
    constraints?: Array<{
      contextName: string;
      operator: string;
      values: string[];
    }>;
  }>;
}

interface UnleashClientFeaturesResponse {
  version: number;
  features: UnleashToggle[];
}

// ─── Provider Implementation ───────────────────────────────────

export class UnleashFeatureFlagProvider implements FeatureFlagProvider {
  readonly providerType = "unleash" as const;

  private readonly apiUrl: string;
  private readonly apiKey: string;
  private readonly appName: string;
  private readonly refreshMs: number;

  /** Local toggle cache, refreshed periodically. */
  private cache = new Map<string, UnleashToggle>();
  private refreshTimer: ReturnType<typeof setInterval> | null = null;
  private lastRefresh = 0;

  /** Fallback provider when Unleash is unreachable. */
  private readonly fallback = new DbFeatureFlagProvider();

  constructor(opts?: {
    apiUrl?: string;
    apiKey?: string;
    appName?: string;
    refreshMs?: number;
  }) {
    this.apiUrl =
      opts?.apiUrl || process.env.UNLEASH_URL || "http://localhost:4242/api";
    this.apiKey = opts?.apiKey || process.env.UNLEASH_API_KEY || "";
    this.appName =
      opts?.appName || process.env.UNLEASH_APP_NAME || "vista-evolved";
    this.refreshMs =
      opts?.refreshMs ||
      Number(process.env.UNLEASH_REFRESH_INTERVAL_MS) ||
      15_000;

    // Start polling
    this.startRefresh();
  }

  // ─── Public API ────────────────────────────────────────────

  async isEnabled(
    flagKey: string,
    context: FlagContext,
  ): Promise<FlagEvaluationResult> {
    const toggle = this.cache.get(flagKey);
    if (!toggle) {
      // Not in Unleash cache — try DB fallback
      return this.fallback.isEnabled(flagKey, context);
    }
    return {
      enabled: toggle.enabled,
      source: "unleash",
    };
  }

  async getVariant(
    flagKey: string,
    context: FlagContext,
  ): Promise<FlagEvaluationResult> {
    const toggle = this.cache.get(flagKey);
    if (!toggle) {
      return this.fallback.getVariant(flagKey, context);
    }
    return {
      enabled: toggle.enabled,
      variant: toggle.variant?.name,
      source: "unleash",
    };
  }

  async evaluateAll(
    flagKeys: string[],
    context: FlagContext,
  ): Promise<Record<string, FlagEvaluationResult>> {
    const results: Record<string, FlagEvaluationResult> = {};
    for (const key of flagKeys) {
      results[key] = await this.isEnabled(key, context);
    }
    return results;
  }

  async healthCheck(): Promise<boolean> {
    try {
      const res = await fetch(`${this.apiUrl}/client/features`, {
        method: "GET",
        headers: this.headers(),
        signal: AbortSignal.timeout(5_000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }

  async destroy(): Promise<void> {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  // ─── Internal ──────────────────────────────────────────────

  private headers(): Record<string, string> {
    return {
      Authorization: this.apiKey,
      Accept: "application/json",
      "Unleash-AppName": this.appName,
      "Unleash-InstanceId": `${this.appName}-api`,
    };
  }

  private startRefresh(): void {
    // Initial eager fetch
    void this.refreshCache();

    this.refreshTimer = setInterval(() => {
      void this.refreshCache();
    }, this.refreshMs);

    // Don't keep process alive just for polling
    if (this.refreshTimer && typeof this.refreshTimer.unref === "function") {
      this.refreshTimer.unref();
    }
  }

  private async refreshCache(): Promise<void> {
    try {
      const res = await fetch(`${this.apiUrl}/client/features`, {
        method: "GET",
        headers: this.headers(),
        signal: AbortSignal.timeout(10_000),
      });

      if (!res.ok) return; // Keep stale cache on failure

      const data = (await res.json()) as UnleashClientFeaturesResponse;
      const newCache = new Map<string, UnleashToggle>();
      for (const toggle of data.features) {
        newCache.set(toggle.name, toggle);
      }
      this.cache = newCache;
      this.lastRefresh = Date.now();
    } catch {
      // Network error — keep stale cache, DB provider is the fallback
    }
  }
}
