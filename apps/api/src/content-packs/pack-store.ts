/**
 * Phase 390 (W22-P2): Content Pack Store — In-memory stores for pack content
 *
 * Manages order sets, flowsheets, inbox rules, dashboards, CDS rules, and
 * pack installation events. All stores follow the established Map pattern
 * with tenant scoping and FIFO eviction.
 */

import { randomUUID } from "node:crypto";
import type {
  OrderSet,
  Flowsheet,
  InboxRule,
  Dashboard,
  CdsRule,
  PackInstallEvent,
  ContentPackV2,
  PackInstallPreview,
  PackInstallAction,
} from "./types.js";

// ─── Stores ─────────────────────────────────────────────────────

const MAX_ITEMS = 5000;

const orderSetStore = new Map<string, OrderSet>();
const flowsheetStore = new Map<string, Flowsheet>();
const inboxRuleStore = new Map<string, InboxRule>();
const dashboardStore = new Map<string, Dashboard>();
const cdsRuleStore = new Map<string, CdsRule>();
const installEventStore: PackInstallEvent[] = [];
const installedPacks = new Map<string, { packId: string; version: string; tenantId: string; installedAt: string }>();

// ─── Helpers ────────────────────────────────────────────────────

function tenantPackKey(tenantId: string, packId: string): string {
  return `${tenantId}:${packId}`;
}

function evict<T>(store: Map<string, T>): void {
  if (store.size >= MAX_ITEMS) {
    const firstKey = store.keys().next().value;
    if (firstKey) store.delete(firstKey);
  }
}

// ─── Order Set CRUD ─────────────────────────────────────────────

export function createOrderSet(
  tenantId: string,
  input: Omit<OrderSet, "id" | "tenantId" | "createdAt" | "updatedAt">,
): OrderSet {
  evict(orderSetStore);
  const now = new Date().toISOString();
  const os: OrderSet = { id: randomUUID(), tenantId, ...input, createdAt: now, updatedAt: now };
  orderSetStore.set(os.id, os);
  return os;
}

export function getOrderSet(id: string): OrderSet | undefined {
  return orderSetStore.get(id);
}

export function listOrderSets(tenantId: string, specialty?: string): OrderSet[] {
  return Array.from(orderSetStore.values()).filter(
    (os) => os.tenantId === tenantId && os.status !== "archived" && (!specialty || os.specialty === specialty),
  );
}

export function updateOrderSet(
  id: string,
  patch: Partial<Pick<OrderSet, "name" | "description" | "items" | "tags" | "status">>,
): OrderSet | undefined {
  const existing = orderSetStore.get(id);
  if (!existing) return undefined;
  const updated: OrderSet = { ...existing, ...patch, forked: existing.packId ? true : existing.forked, updatedAt: new Date().toISOString() };
  orderSetStore.set(id, updated);
  return updated;
}

// ─── Flowsheet CRUD ─────────────────────────────────────────────

export function createFlowsheet(
  tenantId: string,
  input: Omit<Flowsheet, "id" | "tenantId" | "createdAt" | "updatedAt">,
): Flowsheet {
  evict(flowsheetStore);
  const now = new Date().toISOString();
  const fs: Flowsheet = { id: randomUUID(), tenantId, ...input, createdAt: now, updatedAt: now };
  flowsheetStore.set(fs.id, fs);
  return fs;
}

export function getFlowsheet(id: string): Flowsheet | undefined {
  return flowsheetStore.get(id);
}

export function listFlowsheets(tenantId: string, specialty?: string): Flowsheet[] {
  return Array.from(flowsheetStore.values()).filter(
    (fs) => fs.tenantId === tenantId && fs.status !== "archived" && (!specialty || fs.specialty === specialty),
  );
}

export function updateFlowsheet(
  id: string,
  patch: Partial<Pick<Flowsheet, "name" | "description" | "columns" | "defaultFrequency" | "tags" | "status">>,
): Flowsheet | undefined {
  const existing = flowsheetStore.get(id);
  if (!existing) return undefined;
  const updated: Flowsheet = { ...existing, ...patch, forked: existing.packId ? true : existing.forked, updatedAt: new Date().toISOString() };
  flowsheetStore.set(id, updated);
  return updated;
}

// ─── Inbox Rule CRUD ────────────────────────────────────────────

export function createInboxRule(
  tenantId: string,
  input: Omit<InboxRule, "id" | "tenantId" | "createdAt" | "updatedAt">,
): InboxRule {
  evict(inboxRuleStore);
  const now = new Date().toISOString();
  const rule: InboxRule = { id: randomUUID(), tenantId, ...input, createdAt: now, updatedAt: now };
  inboxRuleStore.set(rule.id, rule);
  return rule;
}

export function listInboxRules(tenantId: string): InboxRule[] {
  return Array.from(inboxRuleStore.values()).filter((r) => r.tenantId === tenantId && r.status === "active");
}

// ─── Dashboard CRUD ─────────────────────────────────────────────

export function createDashboard(
  tenantId: string,
  input: Omit<Dashboard, "id" | "tenantId" | "createdAt" | "updatedAt">,
): Dashboard {
  evict(dashboardStore);
  const now = new Date().toISOString();
  const db: Dashboard = { id: randomUUID(), tenantId, ...input, createdAt: now, updatedAt: now };
  dashboardStore.set(db.id, db);
  return db;
}

export function listDashboards(tenantId: string, specialty?: string): Dashboard[] {
  return Array.from(dashboardStore.values()).filter(
    (d) => d.tenantId === tenantId && d.status !== "archived" && (!specialty || d.specialty === specialty),
  );
}

// ─── CDS Rule CRUD ──────────────────────────────────────────────

export function createCdsRule(
  tenantId: string,
  input: Omit<CdsRule, "id" | "tenantId" | "createdAt" | "updatedAt">,
): CdsRule {
  evict(cdsRuleStore);
  const now = new Date().toISOString();
  const rule: CdsRule = { id: randomUUID(), tenantId, ...input, createdAt: now, updatedAt: now };
  cdsRuleStore.set(rule.id, rule);
  return rule;
}

export function getCdsRule(id: string): CdsRule | undefined {
  return cdsRuleStore.get(id);
}

export function listCdsRules(tenantId: string, hook?: string): CdsRule[] {
  return Array.from(cdsRuleStore.values()).filter(
    (r) => r.tenantId === tenantId && r.enabled && (!hook || r.hook === hook),
  );
}

// ─── Pack Install / Rollback ────────────────────────────────────

export function previewPackInstall(tenantId: string, pack: ContentPackV2): PackInstallPreview {
  const existing = installedPacks.get(tenantPackKey(tenantId, pack.packId));
  const action: PackInstallAction = existing ? "upgrade" : "install";

  const missingDependencies: string[] = [];
  for (const dep of pack.requires ?? []) {
    if (!installedPacks.has(tenantPackKey(tenantId, dep))) {
      missingDependencies.push(dep);
    }
  }

  return {
    packId: pack.packId,
    packVersion: pack.version,
    action,
    templates: (pack.templates ?? []).map((t) => ({ name: t.name, action: "create" as const })),
    orderSets: (pack.orderSets ?? []).map((o) => ({ name: o.name, action: "create" as const })),
    flowsheets: (pack.flowsheets ?? []).map((f) => ({ name: f.name, action: "create" as const })),
    inboxRules: (pack.inboxRules ?? []).map((r) => ({ name: r.name, action: "create" as const })),
    dashboards: (pack.dashboards ?? []).map((d) => ({ name: d.name, action: "create" as const })),
    cdsRules: (pack.cdsRules ?? []).map((c) => ({ name: c.name, action: "create" as const })),
    missingDependencies,
    warnings: missingDependencies.length > 0 ? [`Missing prerequisites: ${missingDependencies.join(", ")}`] : [],
  };
}

export function installPack(tenantId: string, pack: ContentPackV2, actor: string): PackInstallEvent {
  const now = new Date().toISOString();
  let itemsCreated = 0;

  // Install order sets
  for (const osInput of pack.orderSets ?? []) {
    createOrderSet(tenantId, { ...osInput, packId: pack.packId, packVersion: pack.version, forked: false });
    itemsCreated++;
  }

  // Install flowsheets
  for (const fsInput of pack.flowsheets ?? []) {
    createFlowsheet(tenantId, { ...fsInput, packId: pack.packId, packVersion: pack.version, forked: false });
    itemsCreated++;
  }

  // Install inbox rules
  for (const ruleInput of pack.inboxRules ?? []) {
    createInboxRule(tenantId, { ...ruleInput, packId: pack.packId, packVersion: pack.version });
    itemsCreated++;
  }

  // Install dashboards
  for (const dbInput of pack.dashboards ?? []) {
    createDashboard(tenantId, { ...dbInput, packId: pack.packId, packVersion: pack.version });
    itemsCreated++;
  }

  // Install CDS rules
  for (const cdsInput of pack.cdsRules ?? []) {
    createCdsRule(tenantId, { ...cdsInput, packId: pack.packId, packVersion: pack.version });
    itemsCreated++;
  }

  // Record installation
  installedPacks.set(tenantPackKey(tenantId, pack.packId), {
    packId: pack.packId,
    version: pack.version,
    tenantId,
    installedAt: now,
  });

  const event: PackInstallEvent = {
    id: randomUUID(),
    tenantId,
    packId: pack.packId,
    packVersion: pack.version,
    action: "install",
    actor,
    itemsCreated,
    itemsUpdated: 0,
    itemsRemoved: 0,
    status: "success",
    createdAt: now,
  };
  installEventStore.push(event);
  return event;
}

export function rollbackPack(tenantId: string, packId: string, actor: string): PackInstallEvent {
  const now = new Date().toISOString();
  let itemsRemoved = 0;

  // Remove non-forked items from this pack
  for (const [id, os] of orderSetStore) {
    if (os.tenantId === tenantId && os.packId === packId && !os.forked) {
      orderSetStore.delete(id);
      itemsRemoved++;
    }
  }
  for (const [id, fs] of flowsheetStore) {
    if (fs.tenantId === tenantId && fs.packId === packId && !fs.forked) {
      flowsheetStore.delete(id);
      itemsRemoved++;
    }
  }
  for (const [id, rule] of inboxRuleStore) {
    if (rule.tenantId === tenantId && rule.packId === packId) {
      inboxRuleStore.delete(id);
      itemsRemoved++;
    }
  }
  for (const [id, db] of dashboardStore) {
    if (db.tenantId === tenantId && db.packId === packId) {
      dashboardStore.delete(id);
      itemsRemoved++;
    }
  }
  for (const [id, rule] of cdsRuleStore) {
    if (rule.tenantId === tenantId && rule.packId === packId) {
      cdsRuleStore.delete(id);
      itemsRemoved++;
    }
  }

  const existing = installedPacks.get(tenantPackKey(tenantId, packId));
  installedPacks.delete(tenantPackKey(tenantId, packId));

  const event: PackInstallEvent = {
    id: randomUUID(),
    tenantId,
    packId,
    packVersion: existing?.version ?? "unknown",
    action: "rollback",
    actor,
    previousVersion: existing?.version,
    itemsCreated: 0,
    itemsUpdated: 0,
    itemsRemoved,
    status: "success",
    createdAt: now,
  };
  installEventStore.push(event);
  return event;
}

// ─── Queries ────────────────────────────────────────────────────

export function listInstalledPacks(tenantId: string): Array<{ packId: string; version: string; installedAt: string }> {
  return Array.from(installedPacks.values()).filter((p) => p.tenantId === tenantId);
}

export function listInstallEvents(tenantId: string, limit = 50): PackInstallEvent[] {
  return installEventStore.filter((e) => e.tenantId === tenantId).slice(-limit);
}

export function getPackStats(tenantId: string): {
  installedPacks: number;
  orderSets: number;
  flowsheets: number;
  inboxRules: number;
  dashboards: number;
  cdsRules: number;
} {
  return {
    installedPacks: listInstalledPacks(tenantId).length,
    orderSets: listOrderSets(tenantId).length,
    flowsheets: listFlowsheets(tenantId).length,
    inboxRules: listInboxRules(tenantId).length,
    dashboards: listDashboards(tenantId).length,
    cdsRules: listCdsRules(tenantId).length,
  };
}

// ─── Reset (for tests) ─────────────────────────────────────────

export function _resetContentPackStores(): void {
  orderSetStore.clear();
  flowsheetStore.clear();
  inboxRuleStore.clear();
  dashboardStore.clear();
  cdsRuleStore.clear();
  installEventStore.length = 0;
  installedPacks.clear();
}
