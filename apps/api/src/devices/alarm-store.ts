/**
 * Device Alarms Pipeline — Store
 *
 * Phase 384 (W21-P7): In-memory alarm store with routing rules,
 * acknowledgment, escalation, and audit trail.
 */

import * as crypto from "node:crypto";
import type {
  DeviceAlarm,
  AlarmRoutingRule,
  AlarmAcknowledgment,
  AlarmPriority,
  AlarmState,
  AlarmSource,
  AlarmStats,
} from "./alarm-types.js";

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const MAX_ALARMS = 10000;
const MAX_ACK_LOG = 5000;
const MAX_ROUTING_RULES = 200;
const MAX_AUDIT_LOG = 20000;

/** Priority numeric ordering for comparison */
const PRIORITY_ORDER: Record<AlarmPriority, number> = {
  low: 0,
  medium: 1,
  high: 2,
  crisis: 3,
};

// ---------------------------------------------------------------------------
// Stores (keyed by tenantId)
// ---------------------------------------------------------------------------

const alarms = new Map<string, Map<string, DeviceAlarm>>();
const routingRules = new Map<string, Map<string, AlarmRoutingRule>>();
const acknowledgments = new Map<string, AlarmAcknowledgment[]>();

// Global audit log (all tenants)
interface AlarmAuditEntry {
  id: string;
  tenantId: string;
  alarmId: string;
  action: string;
  actor?: string;
  detail?: string;
  timestamp: string;
}
const auditLog: AlarmAuditEntry[] = [];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function generateId(prefix: string): string {
  return `${prefix}-${crypto.randomBytes(8).toString("hex")}`;
}

function now(): string {
  return new Date().toISOString();
}

function getTenantAlarms(tenantId: string): Map<string, DeviceAlarm> {
  if (!alarms.has(tenantId)) alarms.set(tenantId, new Map());
  return alarms.get(tenantId)!;
}

function getTenantRules(tenantId: string): Map<string, AlarmRoutingRule> {
  if (!routingRules.has(tenantId)) routingRules.set(tenantId, new Map());
  return routingRules.get(tenantId)!;
}

function getTenantAcks(tenantId: string): AlarmAcknowledgment[] {
  if (!acknowledgments.has(tenantId)) acknowledgments.set(tenantId, []);
  return acknowledgments.get(tenantId)!;
}

function writeAudit(tenantId: string, alarmId: string, action: string, actor?: string, detail?: string): void {
  auditLog.push({
    id: generateId("alm-aud"),
    tenantId,
    alarmId,
    action,
    actor,
    detail,
    timestamp: now(),
  });
  if (auditLog.length > MAX_AUDIT_LOG) auditLog.shift();
}

function evictOldest(map: Map<string, any>, max: number): void {
  while (map.size > max) {
    const firstKey = map.keys().next().value;
    if (firstKey !== undefined) map.delete(firstKey);
  }
}

// ---------------------------------------------------------------------------
// Alarm CRUD
// ---------------------------------------------------------------------------

export function createAlarm(
  tenantId: string,
  input: {
    deviceSerial: string;
    gatewayId?: string;
    code: string;
    codingSystem?: string;
    displayText: string;
    priority: AlarmPriority;
    source: AlarmSource;
    patientId?: string;
    location?: string;
    triggerValue?: string;
    triggerUnit?: string;
    threshold?: string;
    metadata?: Record<string, unknown>;
  }
): DeviceAlarm {
  const store = getTenantAlarms(tenantId);
  evictOldest(store, MAX_ALARMS);

  const alarm: DeviceAlarm = {
    id: generateId("alm"),
    tenantId,
    deviceSerial: input.deviceSerial,
    gatewayId: input.gatewayId,
    code: input.code,
    codingSystem: input.codingSystem || "MDC",
    displayText: input.displayText,
    priority: input.priority,
    state: "active",
    source: input.source,
    patientId: input.patientId,
    location: input.location,
    triggerValue: input.triggerValue,
    triggerUnit: input.triggerUnit,
    threshold: input.threshold,
    activatedAt: now(),
    updatedAt: now(),
    escalationLevel: 0,
    metadata: input.metadata,
  };

  store.set(alarm.id, alarm);
  writeAudit(tenantId, alarm.id, "alarm_created", undefined, `${alarm.priority} ${alarm.code}`);

  // Run routing rules
  routeAlarm(tenantId, alarm);

  return alarm;
}

export function getAlarm(tenantId: string, alarmId: string): DeviceAlarm | undefined {
  return getTenantAlarms(tenantId).get(alarmId);
}

export function listAlarms(
  tenantId: string,
  filters?: {
    state?: AlarmState;
    priority?: AlarmPriority;
    deviceSerial?: string;
    patientId?: string;
  }
): DeviceAlarm[] {
  let result = Array.from(getTenantAlarms(tenantId).values());
  if (filters?.state) result = result.filter((a) => a.state === filters.state);
  if (filters?.priority) result = result.filter((a) => a.priority === filters.priority);
  if (filters?.deviceSerial) result = result.filter((a) => a.deviceSerial === filters.deviceSerial);
  if (filters?.patientId) result = result.filter((a) => a.patientId === filters.patientId);
  return result.sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority]);
}

export function updateAlarmState(
  tenantId: string,
  alarmId: string,
  newState: AlarmState,
  actor?: string
): DeviceAlarm | undefined {
  const alarm = getTenantAlarms(tenantId).get(alarmId);
  if (!alarm) return undefined;

  const oldState = alarm.state;
  alarm.state = newState;
  alarm.updatedAt = now();

  if (newState === "acknowledged") alarm.acknowledgedAt = now();
  if (newState === "acknowledged" && actor) alarm.acknowledgedBy = actor;
  if (newState === "resolved") alarm.resolvedAt = now();

  writeAudit(tenantId, alarmId, `state_change:${oldState}->${newState}`, actor);
  return alarm;
}

// ---------------------------------------------------------------------------
// Acknowledgment
// ---------------------------------------------------------------------------

export function acknowledgeAlarm(
  tenantId: string,
  alarmId: string,
  userId: string,
  reason?: string,
  silencesEscalation = true
): AlarmAcknowledgment | undefined {
  const alarm = getTenantAlarms(tenantId).get(alarmId);
  if (!alarm) return undefined;

  alarm.state = "acknowledged";
  alarm.acknowledgedAt = now();
  alarm.acknowledgedBy = userId;
  alarm.updatedAt = now();

  const ack: AlarmAcknowledgment = {
    id: generateId("ack"),
    alarmId,
    userId,
    reason,
    silencesEscalation,
    timestamp: now(),
  };

  const acks = getTenantAcks(tenantId);
  acks.push(ack);
  if (acks.length > MAX_ACK_LOG) acks.shift();

  writeAudit(tenantId, alarmId, "acknowledged", userId, reason);
  return ack;
}

// ---------------------------------------------------------------------------
// Routing Rules
// ---------------------------------------------------------------------------

export function addRoutingRule(tenantId: string, rule: Omit<AlarmRoutingRule, "id" | "createdAt">): AlarmRoutingRule {
  const store = getTenantRules(tenantId);
  evictOldest(store, MAX_ROUTING_RULES);

  const fullRule: AlarmRoutingRule = {
    ...rule,
    id: generateId("rule"),
    createdAt: now(),
  };
  store.set(fullRule.id, fullRule);
  writeAudit(tenantId, "N/A", "routing_rule_created", undefined, fullRule.name);
  return fullRule;
}

export function listRoutingRules(tenantId: string): AlarmRoutingRule[] {
  return Array.from(getTenantRules(tenantId).values()).sort(
    (a, b) => a.rulePriority - b.rulePriority
  );
}

export function deleteRoutingRule(tenantId: string, ruleId: string): boolean {
  const deleted = getTenantRules(tenantId).delete(ruleId);
  if (deleted) writeAudit(tenantId, "N/A", "routing_rule_deleted", undefined, ruleId);
  return deleted;
}

function routeAlarm(tenantId: string, alarm: DeviceAlarm): void {
  const rules = listRoutingRules(tenantId).filter((r) => r.enabled);

  for (const rule of rules) {
    if (!matchesRule(alarm, rule)) continue;

    // Log routing match
    writeAudit(tenantId, alarm.id, "routed", undefined, `rule=${rule.name} targets=${rule.notifyTargets.join(",")}`);

    // If auto-escalate configured, set escalation target
    if (rule.autoEscalateAfterSec && rule.escalationChain && rule.escalationChain.length > 0) {
      alarm.escalationTarget = rule.escalationChain[0];
    }

    // First matching rule wins (priority-ordered)
    break;
  }
}

function matchesRule(alarm: DeviceAlarm, rule: AlarmRoutingRule): boolean {
  if (rule.codePattern) {
    try {
      if (!new RegExp(rule.codePattern, "i").test(alarm.code)) return false;
    } catch {
      return false;
    }
  }
  if (rule.minPriority && PRIORITY_ORDER[alarm.priority] < PRIORITY_ORDER[rule.minPriority]) {
    return false;
  }
  if (rule.devicePattern) {
    try {
      if (!new RegExp(rule.devicePattern, "i").test(alarm.deviceSerial)) return false;
    } catch {
      return false;
    }
  }
  if (rule.locationPattern) {
    try {
      if (!new RegExp(rule.locationPattern, "i").test(alarm.location || "")) return false;
    } catch {
      return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Escalation
// ---------------------------------------------------------------------------

export function escalateAlarm(
  tenantId: string,
  alarmId: string,
  target?: string
): DeviceAlarm | undefined {
  const alarm = getTenantAlarms(tenantId).get(alarmId);
  if (!alarm) return undefined;

  alarm.state = "escalated";
  alarm.escalationLevel++;
  alarm.updatedAt = now();
  if (target) alarm.escalationTarget = target;

  writeAudit(tenantId, alarmId, "escalated", undefined, `level=${alarm.escalationLevel} target=${target || "auto"}`);
  return alarm;
}

// ---------------------------------------------------------------------------
// Statistics
// ---------------------------------------------------------------------------

export function getAlarmStats(tenantId: string): AlarmStats {
  const all = Array.from(getTenantAlarms(tenantId).values());

  const stats: AlarmStats = {
    totalActive: 0,
    totalLatched: 0,
    totalAcknowledged: 0,
    totalResolved: 0,
    totalEscalated: 0,
    byPriority: { low: 0, medium: 0, high: 0, crisis: 0 },
    bySource: {},
  };

  for (const a of all) {
    if (a.state === "active") stats.totalActive++;
    if (a.state === "latched") stats.totalLatched++;
    if (a.state === "acknowledged") stats.totalAcknowledged++;
    if (a.state === "resolved") stats.totalResolved++;
    if (a.state === "escalated") stats.totalEscalated++;
    stats.byPriority[a.priority]++;
    stats.bySource[a.source] = (stats.bySource[a.source] || 0) + 1;
  }

  const active = all.filter((a) => a.state === "active");
  if (active.length > 0) {
    stats.oldestActiveAt = active.reduce((oldest, a) =>
      a.activatedAt < oldest ? a.activatedAt : oldest, active[0].activatedAt);
  }

  return stats;
}

// ---------------------------------------------------------------------------
// Audit
// ---------------------------------------------------------------------------

export function getAlarmAudit(tenantId: string, limit = 100): AlarmAuditEntry[] {
  return auditLog
    .filter((e) => e.tenantId === tenantId)
    .slice(-limit)
    .reverse();
}
