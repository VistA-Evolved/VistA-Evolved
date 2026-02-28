/**
 * Export Data Sources — Phase 245: Data Exports v2
 *
 * Pluggable data source registry. Each source provides a name,
 * a category, and a fetch function that returns rows.
 * Sources register at module load time; the export engine
 * queries this registry to resolve what data to export.
 */

import { log } from "../lib/logger.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type ExportSourceCategory =
  | "analytics"
  | "audit"
  | "clinical"
  | "rcm"
  | "platform"
  | "imaging";

export interface ExportSourceDescriptor {
  /** Unique source identifier */
  id: string;
  /** Human-readable label for the UI */
  label: string;
  /** Category for grouping */
  category: ExportSourceCategory;
  /** Brief description */
  description: string;
  /** Estimated row count (cheap estimate, not exact) */
  estimateRows: () => number;
  /** Fetch rows with optional filters. Must return plain objects. */
  fetchRows: (filters?: Record<string, unknown>) => Promise<Record<string, unknown>[]>;
  /** Maximum rows this source can return (0 = unlimited) */
  maxRows?: number;
  /** Whether this source contains PHI (gated by EXPORT_ALLOW_PHI) */
  containsPhi?: boolean;
}

/* ------------------------------------------------------------------ */
/* Registry                                                            */
/* ------------------------------------------------------------------ */

const sourceRegistry = new Map<string, ExportSourceDescriptor>();

/**
 * Register a data source. Idempotent — re-registering replaces the previous.
 */
export function registerSource(source: ExportSourceDescriptor): void {
  sourceRegistry.set(source.id, source);
  log.debug("Export source registered", { sourceId: source.id, category: source.category });
}

/**
 * Get a registered source by ID.
 */
export function getSource(id: string): ExportSourceDescriptor | undefined {
  return sourceRegistry.get(id);
}

/**
 * List all registered sources.
 */
export function getSources(): ExportSourceDescriptor[] {
  return Array.from(sourceRegistry.values());
}

/**
 * List sources filtered by category.
 */
export function getSourcesByCategory(category: ExportSourceCategory): ExportSourceDescriptor[] {
  return Array.from(sourceRegistry.values()).filter((s) => s.category === category);
}

/**
 * Get a summary of all registered sources (for the admin UI).
 */
export function getSourcesSummary(): Array<{
  id: string;
  label: string;
  category: ExportSourceCategory;
  description: string;
  estimatedRows: number;
  containsPhi: boolean;
}> {
  return Array.from(sourceRegistry.values()).map((s) => ({
    id: s.id,
    label: s.label,
    category: s.category,
    description: s.description,
    estimatedRows: s.estimateRows(),
    containsPhi: s.containsPhi ?? false,
  }));
}

/* ------------------------------------------------------------------ */
/* Built-in sources (registered at import time)                        */
/* ------------------------------------------------------------------ */

// Platform audit source
registerSource({
  id: "platform-audit",
  label: "Platform Audit Trail",
  category: "audit",
  description: "Immutable audit events from the platform audit trail",
  estimateRows: () => 0, // lazy — actual count depends on runtime
  fetchRows: async (filters) => {
    // Delegate to audit query — import lazily to avoid circular deps
    try {
      const { queryAuditEvents } = await import("../lib/audit.js");
      const events = queryAuditEvents({
        actionPrefix: filters?.actionPrefix as string | undefined,
        limit: Math.min(Number(filters?.limit) || 10000, 50000),
      });
      return events.map((e: any) => ({
        id: e.id,
        action: e.action,
        outcome: e.outcome,
        actorDuz: e.actor?.duz ?? "",
        timestamp: e.timestamp,
        detail: JSON.stringify(e.detail ?? {}),
      }));
    } catch {
      return [];
    }
  },
  maxRows: 50000,
  containsPhi: false,
});

// Analytics events source
registerSource({
  id: "analytics-events",
  label: "Analytics Events",
  category: "analytics",
  description: "Raw analytics events (de-identified, no PHI)",
  estimateRows: () => 0,
  fetchRows: async (filters) => {
    try {
      const { queryAnalyticsEvents } = await import("../services/analytics-store.js");
      const { events } = queryAnalyticsEvents({
        category: filters?.category as any,
        metric: filters?.metric as string | undefined,
        limit: Math.min(Number(filters?.limit) || 10000, 1000),
      });
      return events.map((e: any) => ({
        id: e.id,
        category: e.category,
        metric: e.metric,
        value: e.value,
        timestamp: e.timestamp,
        tags: JSON.stringify(e.tags ?? {}),
      }));
    } catch {
      return [];
    }
  },
  maxRows: 100000,
  containsPhi: false,
});

// Analytics aggregated metrics source
registerSource({
  id: "analytics-aggregated",
  label: "Analytics Aggregated Metrics",
  category: "analytics",
  description: "Hourly/daily aggregated metric buckets",
  estimateRows: () => 0,
  fetchRows: async (filters) => {
    try {
      const { queryAggregatedMetrics } = await import("../services/analytics-aggregator.js");
      const { buckets } = queryAggregatedMetrics({
        period: (filters?.period as "hourly" | "daily") || "daily",
        limit: Math.min(Number(filters?.limit) || 5000, 5000),
      });
      return buckets.map((b: any) => ({
        id: b.id,
        period: b.period,
        periodStart: b.periodStart,
        periodEnd: b.periodEnd,
        metric: b.metric,
        category: b.category,
        count: b.count,
        sum: b.sum,
        avg: b.avg,
        min: b.min,
        max: b.max,
        p50: b.p50,
        p95: b.p95,
        p99: b.p99,
      }));
    } catch {
      return [];
    }
  },
  maxRows: 50000,
  containsPhi: false,
});
