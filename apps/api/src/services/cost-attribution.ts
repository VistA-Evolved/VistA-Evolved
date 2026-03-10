/**
 * cost-attribution.ts -- Cost Attribution & Budget Service
 *
 * Phase 332 (W15-P6)
 *
 * Per-tenant cost tracking, daily roll-ups, budget tiers with alerting,
 * OpenCost integration model, and supplementary cost ingestion. Cost
 * data is NOT PHI -- no patient data involved.
 *
 * Decision: ADR-COST-ATTRIBUTION (Option A: OpenCost + supplementary layer)
 */

import { randomUUID } from "node:crypto";

// --- Types ------------------------------------------------------------------

export type CostSource = "opencost" | "manual" | "cloud-billing" | "supplementary";
export type BudgetTier = "starter" | "professional" | "enterprise" | "custom";
export type AlertSeverity = "info" | "warning" | "critical";
export type AlertStatus = "active" | "acknowledged" | "resolved";

export interface TenantCostDaily {
  id: string;
  tenantId: string;
  date: string;             // YYYY-MM-DD
  region: string;
  cpuCostUsd: number;
  ramCostUsd: number;
  pvCostUsd: number;
  networkCostUsd: number;
  vistaCostUsd: number;
  storageCostUsd: number;
  otherCostUsd: number;
  totalCostUsd: number;     // derived sum
  source: CostSource;
  createdAt: string;
}

export interface TenantBudget {
  id: string;
  tenantId: string;
  tier: BudgetTier;
  monthlyBudgetUsd: number;
  alertThresholdPct: number;  // 0-1, e.g., 0.8 = 80%
  hardLimitPct: number;       // e.g., 1.2 = 120%; notify-only, no throttling
  currentMonthSpend: number;
  lastUpdated: string;
  metadata: Record<string, string>;
}

export interface BudgetAlert {
  id: string;
  tenantId: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  message: string;
  thresholdPct: number;       // threshold that triggered
  actualPct: number;          // actual spend percentage
  monthlyBudgetUsd: number;
  currentSpendUsd: number;
  firedAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
}

export interface CostBreakdown {
  tenantId: string;
  period: string;             // "2026-03" or "2026-03-15"
  region: string | "all";
  cpu: number;
  ram: number;
  pv: number;
  network: number;
  vista: number;
  storage: number;
  other: number;
  total: number;
}

export interface CostAnomaly {
  id: string;
  tenantId: string;
  date: string;
  region: string;
  expectedDailyUsd: number;
  actualDailyUsd: number;
  deviationPct: number;
  detectedAt: string;
}

export interface OpenCostConfig {
  enabled: boolean;
  endpoint: string;
  scrapeIntervalSec: number;
  labelMapping: {
    tenantLabel: string;      // k8s label for tenant, e.g., "app.kubernetes.io/tenant"
    regionLabel: string;
  };
}

// --- Budget Tier Defaults ---------------------------------------------------

const TIER_DEFAULTS: Record<BudgetTier, { monthlyBudgetUsd: number; alertThresholdPct: number; hardLimitPct: number }> = {
  starter: { monthlyBudgetUsd: 500, alertThresholdPct: 0.8, hardLimitPct: 1.2 },
  professional: { monthlyBudgetUsd: 2000, alertThresholdPct: 0.8, hardLimitPct: 1.5 },
  enterprise: { monthlyBudgetUsd: 10000, alertThresholdPct: 0.8, hardLimitPct: 2.0 },
  custom: { monthlyBudgetUsd: 0, alertThresholdPct: 0.8, hardLimitPct: 2.0 },
};

// --- In-Memory Stores -------------------------------------------------------

const MAX_COST_RECORDS = 50_000;
const MAX_TENANT_DATE_KEYS = 10_000;

const costStore = new Map<string, TenantCostDaily>();           // id -> cost record
const costByTenantDate = new Map<string, Set<string>>();        // `${tenantId}:${date}` -> record IDs
const budgetStore = new Map<string, TenantBudget>();            // tenantId -> budget
const alertStore = new Map<string, BudgetAlert>();              // id -> alert
const anomalyStore = new Map<string, CostAnomaly>();            // id -> anomaly

const auditLog: Array<{ ts: string; action: string; actor: string; detail: Record<string, unknown> }> = [];
const MAX_AUDIT = 10_000;

// --- OpenCost Config --------------------------------------------------------

let openCostConfig: OpenCostConfig = {
  enabled: process.env.OPENCOST_ENABLED === "true",
  endpoint: process.env.OPENCOST_ENDPOINT || "http://opencost.opencost:9003",
  scrapeIntervalSec: parseInt(process.env.OPENCOST_SCRAPE_INTERVAL || "300", 10),
  labelMapping: {
    tenantLabel: process.env.OPENCOST_TENANT_LABEL || "app.kubernetes.io/tenant",
    regionLabel: process.env.OPENCOST_REGION_LABEL || "topology.kubernetes.io/region",
  },
};

export function getOpenCostConfig(): OpenCostConfig {
  return { ...openCostConfig };
}

export function updateOpenCostConfig(partial: Partial<OpenCostConfig>, actor: string): OpenCostConfig {
  openCostConfig = { ...openCostConfig, ...partial };
  appendAudit("opencost.config.updated", actor, { config: openCostConfig });
  return { ...openCostConfig };
}

// --- Cost Ingestion ---------------------------------------------------------

export function ingestCostRecord(input: {
  tenantId: string;
  date: string;
  region: string;
  cpuCostUsd?: number;
  ramCostUsd?: number;
  pvCostUsd?: number;
  networkCostUsd?: number;
  vistaCostUsd?: number;
  storageCostUsd?: number;
  otherCostUsd?: number;
  source: CostSource;
}, actor: string): TenantCostDaily {
  const cpu = input.cpuCostUsd ?? 0;
  const ram = input.ramCostUsd ?? 0;
  const pv = input.pvCostUsd ?? 0;
  const network = input.networkCostUsd ?? 0;
  const vista = input.vistaCostUsd ?? 0;
  const storage = input.storageCostUsd ?? 0;
  const other = input.otherCostUsd ?? 0;

  const record: TenantCostDaily = {
    id: randomUUID(),
    tenantId: input.tenantId,
    date: input.date,
    region: input.region,
    cpuCostUsd: cpu,
    ramCostUsd: ram,
    pvCostUsd: pv,
    networkCostUsd: network,
    vistaCostUsd: vista,
    storageCostUsd: storage,
    otherCostUsd: other,
    totalCostUsd: cpu + ram + pv + network + vista + storage + other,
    source: input.source,
    createdAt: new Date().toISOString(),
  };

  costStore.set(record.id, record);
  while (costStore.size > MAX_COST_RECORDS) {
    const oldest = costStore.keys().next().value as string;
    costStore.delete(oldest);
  }

  const tdKey = `${record.tenantId}:${record.date}`;
  if (!costByTenantDate.has(tdKey)) costByTenantDate.set(tdKey, new Set());
  costByTenantDate.get(tdKey)!.add(record.id);
  while (costByTenantDate.size > MAX_TENANT_DATE_KEYS) {
    const oldest = costByTenantDate.keys().next().value as string;
    costByTenantDate.delete(oldest);
  }

  // Update current month spend on the tenant budget
  checkAndUpdateBudgetSpend(record.tenantId);

  appendAudit("cost.ingested", actor, {
    tenantId: record.tenantId,
    date: record.date,
    region: record.region,
    total: record.totalCostUsd,
    source: record.source,
  });

  return record;
}

export function getCostRecord(id: string, tenantId?: string): TenantCostDaily | undefined {
  const record = costStore.get(id);
  if (!record) return undefined;
  if (tenantId && record.tenantId !== tenantId) return undefined;
  return record;
}

export function listCostRecords(filters?: {
  tenantId?: string;
  dateFrom?: string;
  dateTo?: string;
  region?: string;
  source?: CostSource;
}, limit = 200): TenantCostDaily[] {
  let results = Array.from(costStore.values());
  if (filters?.tenantId) results = results.filter((r) => r.tenantId === filters.tenantId);
  if (filters?.dateFrom) results = results.filter((r) => r.date >= filters.dateFrom!);
  if (filters?.dateTo) results = results.filter((r) => r.date <= filters.dateTo!);
  if (filters?.region) results = results.filter((r) => r.region === filters.region);
  if (filters?.source) results = results.filter((r) => r.source === filters.source);
  return results.sort((a, b) => b.date.localeCompare(a.date) || a.tenantId.localeCompare(b.tenantId)).slice(0, limit);
}

// --- Cost Breakdown ---------------------------------------------------------

export function getCostBreakdown(tenantId: string, period: string, region?: string): CostBreakdown {
  const records = Array.from(costStore.values()).filter((r) => {
    if (r.tenantId !== tenantId) return false;
    if (region && r.region !== region) return false;
    return r.date.startsWith(period);
  });

  const breakdown: CostBreakdown = {
    tenantId,
    period,
    region: region || "all",
    cpu: 0,
    ram: 0,
    pv: 0,
    network: 0,
    vista: 0,
    storage: 0,
    other: 0,
    total: 0,
  };

  for (const r of records) {
    breakdown.cpu += r.cpuCostUsd;
    breakdown.ram += r.ramCostUsd;
    breakdown.pv += r.pvCostUsd;
    breakdown.network += r.networkCostUsd;
    breakdown.vista += r.vistaCostUsd;
    breakdown.storage += r.storageCostUsd;
    breakdown.other += r.otherCostUsd;
    breakdown.total += r.totalCostUsd;
  }

  // Round to 4 decimals
  for (const key of ["cpu", "ram", "pv", "network", "vista", "storage", "other", "total"] as const) {
    breakdown[key] = Math.round(breakdown[key] * 10000) / 10000;
  }

  return breakdown;
}

// --- Budget Management ------------------------------------------------------

export function setBudget(input: {
  tenantId: string;
  tier: BudgetTier;
  monthlyBudgetUsd?: number;
  alertThresholdPct?: number;
  hardLimitPct?: number;
  metadata?: Record<string, string>;
}, actor: string): TenantBudget {
  const validTiers: BudgetTier[] = ["starter", "professional", "enterprise", "custom"];
  if (!validTiers.includes(input.tier)) {
    throw Object.assign(new Error(`Invalid tier: ${input.tier}. Must be one of: ${validTiers.join(", ")}`), { statusCode: 400 });
  }
  const defaults = TIER_DEFAULTS[input.tier];
  const budget: TenantBudget = {
    id: randomUUID(),
    tenantId: input.tenantId,
    tier: input.tier,
    monthlyBudgetUsd: input.monthlyBudgetUsd ?? defaults.monthlyBudgetUsd,
    alertThresholdPct: input.alertThresholdPct ?? defaults.alertThresholdPct,
    hardLimitPct: input.hardLimitPct ?? defaults.hardLimitPct,
    currentMonthSpend: 0,
    lastUpdated: new Date().toISOString(),
    metadata: input.metadata || {},
  };

  budgetStore.set(input.tenantId, budget);

  // Recalculate current spend
  checkAndUpdateBudgetSpend(input.tenantId);

  appendAudit("budget.set", actor, { tenantId: input.tenantId, tier: input.tier, monthlyBudgetUsd: budget.monthlyBudgetUsd });
  return budgetStore.get(input.tenantId)!;
}

export function getBudget(tenantId: string): TenantBudget | undefined {
  return budgetStore.get(tenantId);
}

export function listBudgets(tenantId?: string): TenantBudget[] {
  const budgets = Array.from(budgetStore.values()).filter((budget) => !tenantId || budget.tenantId === tenantId);
  return budgets.sort((a, b) => a.tenantId.localeCompare(b.tenantId));
}

/**
 * Recalculate current month spend from cost records and fire alerts if needed.
 */
function checkAndUpdateBudgetSpend(tenantId: string): void {
  const budget = budgetStore.get(tenantId);
  if (!budget) return;

  const now = new Date();
  const monthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

  const records = Array.from(costStore.values()).filter(
    (r) => r.tenantId === tenantId && r.date.startsWith(monthPrefix),
  );

  budget.currentMonthSpend = records.reduce((sum, r) => sum + r.totalCostUsd, 0);
  budget.currentMonthSpend = Math.round(budget.currentMonthSpend * 10000) / 10000;
  budget.lastUpdated = new Date().toISOString();
  budgetStore.set(tenantId, budget);

  // Check thresholds
  if (budget.monthlyBudgetUsd <= 0) return;

  const spendPct = budget.currentMonthSpend / budget.monthlyBudgetUsd;

  if (spendPct >= budget.hardLimitPct) {
    fireAlert(tenantId, "critical", "Hard limit reached",
      `Tenant ${tenantId} is at ${(spendPct * 100).toFixed(1)}% of monthly budget ($${budget.currentMonthSpend.toFixed(2)} / $${budget.monthlyBudgetUsd.toFixed(2)})`,
      budget.hardLimitPct, spendPct, budget);
  } else if (spendPct >= budget.alertThresholdPct) {
    fireAlert(tenantId, "warning", "Budget threshold reached",
      `Tenant ${tenantId} is at ${(spendPct * 100).toFixed(1)}% of monthly budget ($${budget.currentMonthSpend.toFixed(2)} / $${budget.monthlyBudgetUsd.toFixed(2)})`,
      budget.alertThresholdPct, spendPct, budget);
  }
}

// --- Alerts -----------------------------------------------------------------

function fireAlert(
  tenantId: string,
  severity: AlertSeverity,
  title: string,
  message: string,
  thresholdPct: number,
  actualPct: number,
  budget: TenantBudget,
): void {
  // Don't duplicate active alerts for same tenant+severity
  for (const a of alertStore.values()) {
    if (a.tenantId === tenantId && a.severity === severity && a.status === "active") return;
  }

  const alert: BudgetAlert = {
    id: randomUUID(),
    tenantId,
    severity,
    status: "active",
    title,
    message,
    thresholdPct,
    actualPct,
    monthlyBudgetUsd: budget.monthlyBudgetUsd,
    currentSpendUsd: budget.currentMonthSpend,
    firedAt: new Date().toISOString(),
    acknowledgedAt: null,
    resolvedAt: null,
  };

  alertStore.set(alert.id, alert);
  appendAudit("alert.fired", "system", { alertId: alert.id, tenantId, severity, actualPct });
}

export function acknowledgeAlert(alertId: string, actor: string, tenantId?: string): BudgetAlert {
  const alert = alertStore.get(alertId);
  if (!alert) throw Object.assign(new Error("Alert not found"), { statusCode: 404 });
  if (tenantId && alert.tenantId !== tenantId) {
    throw Object.assign(new Error("Alert not found"), { statusCode: 404 });
  }
  if (alert.status !== "active") throw Object.assign(new Error("Alert not active"), { statusCode: 400 });
  alert.status = "acknowledged";
  alert.acknowledgedAt = new Date().toISOString();
  alertStore.set(alertId, alert);
  appendAudit("alert.acknowledged", actor, { alertId, tenantId: alert.tenantId });
  return alert;
}

export function resolveAlert(alertId: string, actor: string, tenantId?: string): BudgetAlert {
  const alert = alertStore.get(alertId);
  if (!alert) throw Object.assign(new Error("Alert not found"), { statusCode: 404 });
  if (tenantId && alert.tenantId !== tenantId) {
    throw Object.assign(new Error("Alert not found"), { statusCode: 404 });
  }
  alert.status = "resolved";
  alert.resolvedAt = new Date().toISOString();
  alertStore.set(alertId, alert);
  appendAudit("alert.resolved", actor, { alertId, tenantId: alert.tenantId });
  return alert;
}

export function listAlerts(filters?: {
  tenantId?: string;
  status?: AlertStatus;
  severity?: AlertSeverity;
}, limit = 100): BudgetAlert[] {
  let results = Array.from(alertStore.values());
  if (filters?.tenantId) results = results.filter((a) => a.tenantId === filters.tenantId);
  if (filters?.status) results = results.filter((a) => a.status === filters.status);
  if (filters?.severity) results = results.filter((a) => a.severity === filters.severity);
  return results.sort((a, b) => b.firedAt.localeCompare(a.firedAt)).slice(0, limit);
}

// --- Anomaly Detection ------------------------------------------------------

/**
 * Detect anomalies using 7-day rolling average as baseline.
 * Per ADR: don't use instantaneous comparison.
 */
export function detectAnomalies(tenantId: string, thresholdDeviationPct = 0.5): CostAnomaly[] {
  const allRecords = Array.from(costStore.values())
    .filter((r) => r.tenantId === tenantId)
    .sort((a, b) => a.date.localeCompare(b.date));

  if (allRecords.length < 8) return []; // need at least 7 days + 1 to check

  // Group by date -> total daily cost
  const dailyTotals = new Map<string, number>();
  for (const r of allRecords) {
    dailyTotals.set(r.date, (dailyTotals.get(r.date) || 0) + r.totalCostUsd);
  }

  const dates = Array.from(dailyTotals.keys()).sort();
  const anomalies: CostAnomaly[] = [];

  for (let i = 7; i < dates.length; i++) {
    // 7-day rolling average
    let sum = 0;
    for (let j = i - 7; j < i; j++) sum += dailyTotals.get(dates[j]) || 0;
    const avg = sum / 7;

    const actual = dailyTotals.get(dates[i]) || 0;
    if (avg === 0) continue;

    const deviation = (actual - avg) / avg;
    if (Math.abs(deviation) >= thresholdDeviationPct) {
      const anomaly: CostAnomaly = {
        id: randomUUID(),
        tenantId,
        date: dates[i],
        region: "all",
        expectedDailyUsd: Math.round(avg * 10000) / 10000,
        actualDailyUsd: Math.round(actual * 10000) / 10000,
        deviationPct: Math.round(deviation * 10000) / 10000,
        detectedAt: new Date().toISOString(),
      };
      anomalyStore.set(anomaly.id, anomaly);
      anomalies.push(anomaly);
    }
  }

  return anomalies;
}

export function listAnomalies(filters?: { tenantId?: string }, limit = 100): CostAnomaly[] {
  let results = Array.from(anomalyStore.values());
  if (filters?.tenantId) results = results.filter((a) => a.tenantId === filters.tenantId);
  return results.sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)).slice(0, limit);
}

// --- Summary ----------------------------------------------------------------

export function getCostSummary(tenantId?: string): {
  totalRecords: number;
  totalSpendUsd: number;
  tenantCount: number;
  budgetCount: number;
  activeAlerts: number;
  anomalies: number;
  openCostEnabled: boolean;
} {
  let totalSpend = 0;
  const tenants = new Set<string>();
  const records = Array.from(costStore.values()).filter((record) => !tenantId || record.tenantId === tenantId);
  for (const r of records) {
    totalSpend += r.totalCostUsd;
    tenants.add(r.tenantId);
  }

  let activeAlerts = 0;
  for (const a of alertStore.values()) {
    if (a.status === "active" && (!tenantId || a.tenantId === tenantId)) activeAlerts++;
  }

  const scopedBudgets = Array.from(budgetStore.values()).filter((budget) => !tenantId || budget.tenantId === tenantId);
  const scopedAnomalies = Array.from(anomalyStore.values()).filter((anomaly) => !tenantId || anomaly.tenantId === tenantId);

  return {
    totalRecords: records.length,
    totalSpendUsd: Math.round(totalSpend * 10000) / 10000,
    tenantCount: tenants.size,
    budgetCount: scopedBudgets.length,
    activeAlerts,
    anomalies: scopedAnomalies.length,
    openCostEnabled: openCostConfig.enabled,
  };
}

// --- Audit ------------------------------------------------------------------

function appendAudit(action: string, actor: string, detail: Record<string, unknown>): void {
  auditLog.push({ ts: new Date().toISOString(), action, actor, detail });
  if (auditLog.length > MAX_AUDIT) auditLog.splice(0, auditLog.length - MAX_AUDIT);
}

export function getCostAuditLog(limit = 100, offset = 0, tenantId?: string): typeof auditLog {
  const scopedEntries = tenantId
    ? auditLog.filter((entry) => entry.detail?.tenantId === tenantId)
    : auditLog;
  return scopedEntries.slice().reverse().slice(offset, offset + limit);
}
