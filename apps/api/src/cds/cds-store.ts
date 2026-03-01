/**
 * Phase 395 (W22-P7): CDS Hooks + SMART Launch -- Store
 *
 * In-memory stores for:
 *   - CDS service registry (discoverable services)
 *   - CDS rule definitions (native + CQF rules)
 *   - CDS invocation log (audit trail)
 *   - SMART app registry
 *   - SMART launch contexts (short-lived tokens)
 *   - CDS feedback log
 */

import type {
  CdsCard,
  CdsDashboardStats,
  CdsFeedback,
  CdsHookRequest,
  CdsHookResponse,
  CdsHookType,
  CdsRuleDefinition,
  CdsService,
  RuleCondition,
  SmartApp,
  SmartLaunchContext,
} from "./types.js";
import { randomBytes, createHash } from "crypto";

const MAX_ITEMS = 10_000;

// ---- CDS Service registry ----

const cdsServices = new Map<string, CdsService>();

export function listCdsServices(): CdsService[] {
  return [...cdsServices.values()];
}

export function getCdsService(id: string): CdsService | undefined {
  return cdsServices.get(id);
}

export function registerCdsService(svc: CdsService): CdsService {
  cdsServices.set(svc.id, svc);
  return svc;
}

export function unregisterCdsService(id: string): boolean {
  return cdsServices.delete(id);
}

// ---- CDS Rule definitions ----

const cdsRules = new Map<string, CdsRuleDefinition>();

export function listCdsRules(tenantId?: string): CdsRuleDefinition[] {
  const all = [...cdsRules.values()];
  return tenantId ? all.filter((r) => r.tenantId === tenantId) : all;
}

export function getCdsRule(id: string): CdsRuleDefinition | undefined {
  return cdsRules.get(id);
}

export function createCdsRule(
  rule: Omit<CdsRuleDefinition, "id" | "createdAt" | "updatedAt">
): CdsRuleDefinition {
  if (cdsRules.size >= MAX_ITEMS) {
    throw new Error("CDS rule store full");
  }
  const now = new Date().toISOString();
  const created: CdsRuleDefinition = {
    ...rule,
    id: randomBytes(12).toString("hex"),
    createdAt: now,
    updatedAt: now,
  };
  cdsRules.set(created.id, created);
  // Auto-register a CDS service for this rule if not already registered
  ensureServiceForHook(created.hook, created.tenantId);
  return created;
}

export function updateCdsRule(
  id: string,
  patch: Partial<
    Omit<CdsRuleDefinition, "id" | "createdAt" | "updatedAt" | "tenantId">
  >
): CdsRuleDefinition | undefined {
  const existing = cdsRules.get(id);
  if (!existing) return undefined;
  const updated: CdsRuleDefinition = {
    ...existing,
    ...patch,
    id: existing.id,
    tenantId: existing.tenantId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  cdsRules.set(id, updated);
  return updated;
}

export function deleteCdsRule(id: string): boolean {
  return cdsRules.delete(id);
}

// ---- Native Rule Evaluation Engine ----

function evaluateCondition(
  cond: RuleCondition,
  context: Record<string, unknown>
): boolean {
  const fieldValue = context[cond.field];
  switch (cond.operator) {
    case "equals":
      return fieldValue === cond.value;
    case "not_equals":
      return fieldValue !== cond.value;
    case "greater_than":
      return typeof fieldValue === "number" && typeof cond.value === "number"
        ? fieldValue > cond.value
        : false;
    case "less_than":
      return typeof fieldValue === "number" && typeof cond.value === "number"
        ? fieldValue < cond.value
        : false;
    case "contains":
      return typeof fieldValue === "string" && typeof cond.value === "string"
        ? fieldValue.includes(cond.value)
        : false;
    case "not_contains":
      return typeof fieldValue === "string" && typeof cond.value === "string"
        ? !fieldValue.includes(cond.value)
        : false;
    case "in":
      return Array.isArray(cond.value) ? cond.value.includes(fieldValue) : false;
    case "not_in":
      return Array.isArray(cond.value)
        ? !cond.value.includes(fieldValue)
        : false;
    case "exists":
      return fieldValue !== undefined && fieldValue !== null;
    case "not_exists":
      return fieldValue === undefined || fieldValue === null;
    case "regex":
      return typeof fieldValue === "string" && typeof cond.value === "string"
        ? new RegExp(cond.value).test(fieldValue)
        : false;
    default:
      return false;
  }
}

export function evaluateNativeRules(
  hook: CdsHookType,
  context: Record<string, unknown>,
  tenantId: string
): CdsCard[] {
  const rules = listCdsRules(tenantId)
    .filter((r) => r.hook === hook && r.enabled && r.engine === "native")
    .sort((a, b) => a.priority - b.priority);

  const cards: CdsCard[] = [];
  for (const rule of rules) {
    const allMatch = rule.conditions.every((c) =>
      evaluateCondition(c, context)
    );
    if (allMatch) {
      cards.push({
        ...rule.cardTemplate,
        uuid: randomBytes(8).toString("hex"),
      });
    }
  }
  return cards;
}

// ---- CQF Ruler Adapter (stub -- external CQL evaluation) ----

export interface CqfRulerConfig {
  baseUrl: string;
  enabled: boolean;
}

let cqfConfig: CqfRulerConfig = {
  baseUrl: process.env.CQF_RULER_URL || "http://localhost:8080/cqf-ruler-r4",
  enabled: process.env.CQF_RULER_ENABLED === "true",
};

export function getCqfRulerConfig(): CqfRulerConfig {
  return { ...cqfConfig };
}

export function setCqfRulerConfig(cfg: Partial<CqfRulerConfig>): void {
  cqfConfig = { ...cqfConfig, ...cfg };
}

/**
 * Evaluate CQL rules via CQF Ruler sidecar (stub implementation).
 * In production: POST to CQF Ruler $cql-evaluate endpoint.
 */
export async function evaluateCqfRules(
  hook: CdsHookType,
  context: Record<string, unknown>,
  tenantId: string
): Promise<CdsCard[]> {
  if (!cqfConfig.enabled) {
    return [];
  }

  const cqfRules = listCdsRules(tenantId).filter(
    (r) => r.hook === hook && r.enabled && r.engine === "cqf"
  );

  // Stub: return integration-pending cards for each CQF rule
  return cqfRules.map((rule) => ({
    uuid: randomBytes(8).toString("hex"),
    summary: `[CQF Pending] ${rule.name}`,
    detail: `CQL library: ${rule.cqlLibraryName || "unset"} v${rule.cqlLibraryVersion || "0"}. CQF Ruler integration pending.`,
    indicator: "info" as const,
    source: { label: "CQF Ruler (pending)" },
  }));
}

// ---- Invocation log ----

interface InvocationLogEntry {
  id: string;
  serviceId: string;
  hook: CdsHookType;
  hookInstance: string;
  cardsReturned: number;
  tenantId: string;
  userDuz: string;
  timestamp: string;
}

const invocationLog: InvocationLogEntry[] = [];

function logInvocation(entry: Omit<InvocationLogEntry, "id" | "timestamp">): void {
  if (invocationLog.length >= MAX_ITEMS) {
    invocationLog.splice(0, invocationLog.length - MAX_ITEMS + 1000);
  }
  invocationLog.push({
    ...entry,
    id: randomBytes(8).toString("hex"),
    timestamp: new Date().toISOString(),
  });
}

export function getInvocationLog(limit = 100): InvocationLogEntry[] {
  return invocationLog.slice(-limit);
}

// ---- CDS Feedback log ----

const feedbackLog: Array<CdsFeedback & { id: string; userDuz: string; tenantId: string }> = [];

export function logFeedback(
  fb: CdsFeedback,
  userDuz: string,
  tenantId: string
): void {
  if (feedbackLog.length >= MAX_ITEMS) {
    feedbackLog.splice(0, feedbackLog.length - MAX_ITEMS + 1000);
  }
  feedbackLog.push({
    ...fb,
    id: randomBytes(8).toString("hex"),
    userDuz,
    tenantId,
  });
}

export function getFeedbackLog(limit = 100) {
  return feedbackLog.slice(-limit);
}

// ---- Invoke Hook (orchestrator) ----

export async function invokeHook(
  serviceId: string,
  req: CdsHookRequest,
  tenantId: string,
  userDuz: string
): Promise<CdsHookResponse> {
  const svc = cdsServices.get(serviceId);
  if (!svc) {
    return { cards: [] };
  }

  // Evaluate native rules
  const nativeCards = evaluateNativeRules(svc.hook, req.context, tenantId);

  // Evaluate CQF rules (async)
  const cqfCards = await evaluateCqfRules(svc.hook, req.context, tenantId);

  const cards = [...nativeCards, ...cqfCards];

  // Log invocation
  logInvocation({
    serviceId,
    hook: svc.hook,
    hookInstance: req.hookInstance,
    cardsReturned: cards.length,
    tenantId,
    userDuz,
  });

  return { cards };
}

// ---- SMART App Registry ----

const smartApps = new Map<string, SmartApp>();

export function listSmartApps(tenantId?: string): SmartApp[] {
  const all = [...smartApps.values()];
  return tenantId ? all.filter((a) => a.tenantId === tenantId) : all;
}

export function getSmartApp(id: string): SmartApp | undefined {
  return smartApps.get(id);
}

export function createSmartApp(
  app: Omit<SmartApp, "id" | "clientId" | "createdAt" | "updatedAt">
): SmartApp {
  if (smartApps.size >= MAX_ITEMS) {
    throw new Error("SMART app store full");
  }
  const now = new Date().toISOString();
  const created: SmartApp = {
    ...app,
    id: randomBytes(12).toString("hex"),
    clientId: `smart-${randomBytes(16).toString("hex")}`,
    createdAt: now,
    updatedAt: now,
  };
  smartApps.set(created.id, created);
  return created;
}

export function updateSmartApp(
  id: string,
  patch: Partial<Omit<SmartApp, "id" | "clientId" | "createdAt" | "updatedAt" | "tenantId">>
): SmartApp | undefined {
  const existing = smartApps.get(id);
  if (!existing) return undefined;
  const updated: SmartApp = {
    ...existing,
    ...patch,
    id: existing.id,
    clientId: existing.clientId,
    tenantId: existing.tenantId,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  smartApps.set(id, updated);
  return updated;
}

export function deleteSmartApp(id: string): boolean {
  return smartApps.delete(id);
}

// ---- SMART Launch Contexts (short-lived tokens) ----

const launchContexts = new Map<string, SmartLaunchContext>();

const LAUNCH_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function createLaunchContext(
  ctx: Omit<SmartLaunchContext, "launch" | "createdAt" | "expiresAt">
): SmartLaunchContext {
  // Garbage collect expired contexts
  const now = Date.now();
  for (const [k, v] of launchContexts) {
    if (new Date(v.expiresAt).getTime() < now) {
      launchContexts.delete(k);
    }
  }

  const launch = randomBytes(24).toString("hex");
  const created: SmartLaunchContext = {
    ...ctx,
    launch,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(now + LAUNCH_TTL_MS).toISOString(),
  };
  launchContexts.set(launch, created);
  return created;
}

export function resolveLaunchContext(
  launch: string
): SmartLaunchContext | undefined {
  const ctx = launchContexts.get(launch);
  if (!ctx) return undefined;
  if (new Date(ctx.expiresAt).getTime() < Date.now()) {
    launchContexts.delete(launch);
    return undefined;
  }
  return ctx;
}

export function consumeLaunchContext(
  launch: string
): SmartLaunchContext | undefined {
  const ctx = resolveLaunchContext(launch);
  if (ctx) {
    launchContexts.delete(launch);
  }
  return ctx;
}

// ---- Auto-register service for hook ----

function ensureServiceForHook(hook: CdsHookType, tenantId: string): void {
  const svcId = `auto-${hook}`;
  if (!cdsServices.has(svcId)) {
    cdsServices.set(svcId, {
      id: svcId,
      hook,
      title: `Auto-registered ${hook} service`,
      description: `Evaluates all rules for the ${hook} hook`,
    });
  }
}

// ---- Dashboard Stats ----

export function getCdsDashboardStats(tenantId: string): CdsDashboardStats {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();

  const todayInvocations = invocationLog.filter(
    (i) => new Date(i.timestamp).getTime() >= todayMs
  );
  const todayFeedback = feedbackLog.filter(
    (f) => new Date(f.outcomeTimestamp).getTime() >= todayMs
  );

  const allRules = listCdsRules(tenantId);

  return {
    totalServices: cdsServices.size,
    totalRules: allRules.length,
    enabledRules: allRules.filter((r) => r.enabled).length,
    invocationsToday: todayInvocations.length,
    cardsGeneratedToday: todayInvocations.reduce(
      (sum, i) => sum + i.cardsReturned,
      0
    ),
    overridesToday: todayFeedback.filter((f) => f.outcome === "overridden")
      .length,
    smartAppsRegistered: listSmartApps(tenantId).length,
    smartLaunchesToday: 0, // TODO: track launches
  };
}
