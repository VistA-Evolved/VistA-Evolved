/**
 * Security Alert Rules -- Phase 344 (W16-P8).
 *
 * Configurable alert rules that trigger on SIEM event patterns.
 * Rules: brute-force detection, privilege escalation, break-glass use,
 * data exfiltration patterns, etc.
 */

import { emitSiemEvent, type SiemSeverity } from './siem-sink.js';
import { log } from '../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface AlertRule {
  /** Rule ID. */
  id: string;
  /** Human-readable name. */
  name: string;
  /** Description. */
  description: string;
  /** Event category to watch. */
  category: string;
  /** Event action pattern (regex). */
  actionPattern: RegExp;
  /** Threshold: N events in M milliseconds. */
  threshold: number;
  /** Time window in milliseconds. */
  windowMs: number;
  /** Alert severity when triggered. */
  severity: SiemSeverity;
  /** Whether the rule is enabled. */
  enabled: boolean;
}

export interface AlertTrigger {
  ruleId: string;
  ruleName: string;
  severity: SiemSeverity;
  triggeredAt: string;
  eventCount: number;
  windowMs: number;
  actorId: string;
  tenantId: string;
  detail: Record<string, unknown>;
}

/* ------------------------------------------------------------------ */
/* In-memory tracking                                                  */
/* ------------------------------------------------------------------ */

const alertRules: AlertRule[] = [];
const alertTriggers: AlertTrigger[] = [];
const MAX_TRIGGERS = 5000;
const MAX_WINDOW_COUNTER_KEYS = 10000;

/** Sliding window event counts: ruleId:actorId -> timestamps[] */
const windowCounters = new Map<string, number[]>();

// Prune stale window counter keys every 5 min
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of windowCounters) {
    const maxWindow = 300_000; // 5 min (longest built-in rule window)
    const fresh = timestamps.filter((t) => now - t < maxWindow);
    if (fresh.length === 0) windowCounters.delete(key);
    else windowCounters.set(key, fresh);
  }
}, 300_000).unref();

/* ------------------------------------------------------------------ */
/* Built-in Rules                                                      */
/* ------------------------------------------------------------------ */

export function initDefaultAlertRules(): void {
  registerAlertRule({
    id: 'brute-force-login',
    name: 'Brute Force Login',
    description: 'Detect repeated failed login attempts',
    category: 'auth',
    actionPattern: /login\.failed/,
    threshold: 5,
    windowMs: 300_000, // 5 minutes
    severity: 'high',
    enabled: true,
  });

  registerAlertRule({
    id: 'privilege-escalation',
    name: 'Privilege Escalation',
    description: 'Detect attempts to access admin resources without admin role',
    category: 'access',
    actionPattern: /admin\..*denied/,
    threshold: 3,
    windowMs: 60_000,
    severity: 'critical',
    enabled: true,
  });

  registerAlertRule({
    id: 'break-glass-usage',
    name: 'Break-Glass Access',
    description: 'Alert on any break-glass access',
    category: 'access',
    actionPattern: /break-glass/,
    threshold: 1,
    windowMs: 1,
    severity: 'high',
    enabled: true,
  });

  registerAlertRule({
    id: 'mass-data-export',
    name: 'Mass Data Export',
    description: 'Detect excessive data export requests',
    category: 'admin',
    actionPattern: /export/,
    threshold: 10,
    windowMs: 600_000, // 10 minutes
    severity: 'medium',
    enabled: true,
  });

  registerAlertRule({
    id: 'after-hours-admin',
    name: 'After-Hours Admin Access',
    description: 'Admin actions outside business hours',
    category: 'admin',
    actionPattern: /admin\./,
    threshold: 3,
    windowMs: 60_000,
    severity: 'medium',
    enabled: true,
  });

  registerAlertRule({
    id: 'sensitivity-access-spike',
    name: 'Sensitivity Tag Access Spike',
    description: 'Excessive access to sensitivity-tagged records',
    category: 'privacy',
    actionPattern: /access-reason/,
    threshold: 20,
    windowMs: 300_000,
    severity: 'high',
    enabled: true,
  });
}

/* ------------------------------------------------------------------ */
/* Rule CRUD                                                           */
/* ------------------------------------------------------------------ */

export function registerAlertRule(rule: AlertRule): void {
  const existing = alertRules.findIndex((r) => r.id === rule.id);
  if (existing >= 0) {
    alertRules[existing] = rule;
  } else {
    alertRules.push(rule);
  }
}

export function getAlertRules(): AlertRule[] {
  return alertRules.map((r) => ({ ...r, actionPattern: r.actionPattern }));
}

export function enableAlertRule(id: string, enabled: boolean): boolean {
  const rule = alertRules.find((r) => r.id === id);
  if (!rule) return false;
  rule.enabled = enabled;
  return true;
}

export function getAlertTriggers(filters?: {
  ruleId?: string;
  severity?: SiemSeverity;
  limit?: number;
}): AlertTrigger[] {
  let results = [...alertTriggers];
  if (filters?.ruleId) results = results.filter((t) => t.ruleId === filters.ruleId);
  if (filters?.severity) results = results.filter((t) => t.severity === filters.severity);
  if (filters?.limit) results = results.slice(-filters.limit);
  return results;
}

/* ------------------------------------------------------------------ */
/* Evaluation                                                          */
/* ------------------------------------------------------------------ */

/**
 * Evaluate an event against all alert rules.
 * Returns triggered alerts (if any).
 */
export function evaluateAlertRules(event: {
  category: string;
  action: string;
  actorId: string;
  tenantId: string;
  detail?: Record<string, unknown>;
}): AlertTrigger[] {
  const triggered: AlertTrigger[] = [];
  const now = Date.now();

  for (const rule of alertRules) {
    if (!rule.enabled) continue;
    if (rule.category !== event.category) continue;
    if (!rule.actionPattern.test(event.action)) continue;

    // Update sliding window
    const windowKey = `${rule.id}:${event.actorId}`;
    const timestamps = windowCounters.get(windowKey) || [];
    timestamps.push(now);

    // Prune old timestamps
    const cutoff = now - rule.windowMs;
    const pruned = timestamps.filter((t) => t > cutoff);
    windowCounters.set(windowKey, pruned);

    // Enforce total key cap to prevent OOM from many unique actors
    if (windowCounters.size > MAX_WINDOW_COUNTER_KEYS) {
      const iter = windowCounters.keys();
      const oldest = iter.next().value;
      if (oldest != null) windowCounters.delete(oldest);
    }

    // Check threshold
    if (pruned.length >= rule.threshold) {
      const trigger: AlertTrigger = {
        ruleId: rule.id,
        ruleName: rule.name,
        severity: rule.severity,
        triggeredAt: new Date().toISOString(),
        eventCount: pruned.length,
        windowMs: rule.windowMs,
        actorId: event.actorId,
        tenantId: event.tenantId,
        detail: event.detail || {},
      };

      alertTriggers.push(trigger);
      if (alertTriggers.length > MAX_TRIGGERS) alertTriggers.shift();

      // Emit as SIEM event
      emitSiemEvent({
        category: 'alert',
        action: `alert.triggered.${rule.id}`,
        severity: rule.severity,
        actorId: event.actorId,
        actorName: '',
        tenantId: event.tenantId,
        detail: {
          ruleId: rule.id,
          ruleName: rule.name,
          eventCount: pruned.length,
          threshold: rule.threshold,
        },
        alertTriggered: true,
      });

      log.warn('Security alert triggered', {
        ruleId: rule.id,
        severity: rule.severity,
        eventCount: pruned.length,
      });

      // Clear window after trigger to avoid repeated alerts
      windowCounters.set(windowKey, []);

      triggered.push(trigger);
    }
  }

  return triggered;
}

/**
 * Get alert statistics.
 */
export function getAlertStats(): {
  totalRules: number;
  enabledRules: number;
  totalTriggers: number;
  triggersBySeverity: Record<string, number>;
} {
  const triggersBySeverity: Record<string, number> = {};
  for (const t of alertTriggers) {
    triggersBySeverity[t.severity] = (triggersBySeverity[t.severity] || 0) + 1;
  }

  return {
    totalRules: alertRules.length,
    enabledRules: alertRules.filter((r) => r.enabled).length,
    totalTriggers: alertTriggers.length,
    triggersBySeverity,
  };
}
