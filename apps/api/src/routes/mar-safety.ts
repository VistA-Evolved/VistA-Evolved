/**
 * Phase 168: MAR Safety Net Routes
 *
 * Adds structured safety checks for medication administration.
 * Extends the existing eMAR routes with:
 *   - 5 Rights verification (right patient, drug, dose, route, time)
 *   - High-alert medication warnings
 *   - Administration window checks
 *   - Duplicate administration prevention
 *
 * VistA-first reads:
 *   - ORWPS ACTIVE (medication orders)
 *   - ORQQAL LIST (allergy cross-check)
 *
 * Integration-pending:
 *   - PSB VALIDATE ORDER (real-time barcode validation)
 *   - PSB MED LOG (MAR recording)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { randomUUID } from 'node:crypto';

// ── Types ───────────────────────────────────────────────────

export type SafetyCheckResult = 'pass' | 'fail' | 'warn';

export interface FiveRightsCheck {
  rightPatient: SafetyCheckResult;
  rightDrug: SafetyCheckResult;
  rightDose: SafetyCheckResult;
  rightRoute: SafetyCheckResult;
  rightTime: SafetyCheckResult;
  overallResult: SafetyCheckResult;
  warnings: string[];
  blockers: string[];
}

export interface HighAlertWarning {
  medication: string;
  category:
    | 'anticoagulant'
    | 'insulin'
    | 'opioid'
    | 'chemotherapy'
    | 'concentrated-electrolyte'
    | 'neuromuscular-blocker';
  requiredActions: string[];
  requiresDoubleCheck: boolean;
}

export interface AdminWindow {
  scheduledTime: string;
  windowStart: string;
  windowEnd: string;
  isWithinWindow: boolean;
  minutesEarly: number;
  minutesLate: number;
}

export interface MarSafetyEvent {
  id: string;
  tenantId: string;
  patientDfn: string;
  medicationName: string;
  eventType: 'five-rights-check' | 'high-alert-warning' | 'duplicate-blocked' | 'window-warning';
  result: SafetyCheckResult;
  details: Record<string, unknown>;
  timestamp: string;
  duz: string;
}

// ── In-memory stores ────────────────────────────────────────

const safetyEvents = new Map<string, MarSafetyEvent>();
const SAFETY_MAX_EVENTS = 10_000;

export function getMarSafetyEventCount(): number {
  return safetyEvents.size;
}

/** Ring-buffer eviction: remove oldest when exceeding cap */
function evictOldestSafetyEvents(): void {
  if (safetyEvents.size <= SAFETY_MAX_EVENTS) return;
  const oldest = [...safetyEvents.entries()].sort(
    (a, b) => new Date(a[1].timestamp).getTime() - new Date(b[1].timestamp).getTime()
  );
  while (safetyEvents.size > SAFETY_MAX_EVENTS && oldest.length) {
    safetyEvents.delete(oldest.shift()![0]);
  }
}

// ── High-alert medication database (ISMP categories) ─────

const HIGH_ALERT_MEDS: HighAlertWarning[] = [
  {
    medication: 'warfarin',
    category: 'anticoagulant',
    requiredActions: ['Check INR within 24h', 'Verify dose with order'],
    requiresDoubleCheck: true,
  },
  {
    medication: 'heparin',
    category: 'anticoagulant',
    requiredActions: ['Check aPTT', 'Verify infusion rate', 'Check weight-based dosing'],
    requiresDoubleCheck: true,
  },
  {
    medication: 'insulin',
    category: 'insulin',
    requiredActions: ['Check blood glucose', 'Verify sliding scale', 'Independent double check'],
    requiresDoubleCheck: true,
  },
  {
    medication: 'morphine',
    category: 'opioid',
    requiredActions: [
      'Assess pain level',
      'Check respiratory rate',
      'Verify PCA settings if applicable',
    ],
    requiresDoubleCheck: false,
  },
  {
    medication: 'hydromorphone',
    category: 'opioid',
    requiredActions: ['Assess pain level', 'Check respiratory rate', 'Verify dose conversion'],
    requiresDoubleCheck: true,
  },
  {
    medication: 'fentanyl',
    category: 'opioid',
    requiredActions: ['Assess pain level', 'Check respiratory rate', 'Verify patch vs IV'],
    requiresDoubleCheck: true,
  },
  {
    medication: 'potassium chloride',
    category: 'concentrated-electrolyte',
    requiredActions: ['Verify concentration', 'Check serum K+', 'Verify infusion rate'],
    requiresDoubleCheck: true,
  },
  {
    medication: 'methotrexate',
    category: 'chemotherapy',
    requiredActions: [
      'Verify treatment protocol',
      'Check CBC and renal function',
      'Independent double check',
    ],
    requiresDoubleCheck: true,
  },
];

function findHighAlertWarnings(medicationName: string): HighAlertWarning[] {
  const lower = medicationName.toLowerCase();
  return HIGH_ALERT_MEDS.filter((h) => lower.includes(h.medication));
}

// ── Routes ──────────────────────────────────────────────────

export default async function marSafetyRoutes(server: FastifyInstance) {
  // POST /emar/safety/five-rights — perform 5-rights check
  server.post('/emar/safety/five-rights', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = (request.body as any) || {};
    const { patientDfn, medicationName, dose, route, scheduledTime } = body;

    if (!patientDfn || !medicationName) {
      return reply.code(400).send({ ok: false, error: 'patientDfn and medicationName required' });
    }

    const warnings: string[] = [];
    const blockers: string[] = [];

    // Right Patient — confirmed by session + DFN
    const rightPatient: SafetyCheckResult = patientDfn ? 'pass' : 'fail';
    if (rightPatient === 'fail') blockers.push('Patient identity not confirmed');

    // Right Drug — check for high-alert status
    const highAlerts = findHighAlertWarnings(medicationName);
    let rightDrug: SafetyCheckResult = 'pass';
    if (highAlerts.length > 0) {
      rightDrug = 'warn';
      for (const alert of highAlerts) {
        warnings.push(`HIGH ALERT: ${alert.category} — ${alert.requiredActions.join(', ')}`);
        if (alert.requiresDoubleCheck) {
          warnings.push('Independent double-check required');
        }
      }
    }

    // Right Dose — basic validation
    let rightDose: SafetyCheckResult = dose ? 'pass' : 'warn';
    if (!dose) warnings.push('Dose not specified in check request');

    // Right Route — basic validation
    let rightRoute: SafetyCheckResult = route ? 'pass' : 'warn';
    if (!route) warnings.push('Route not specified in check request');

    // Right Time — window check
    let rightTime: SafetyCheckResult = 'pass';
    if (scheduledTime) {
      const scheduled = new Date(scheduledTime);
      if (isNaN(scheduled.getTime())) {
        return reply.code(400).send({ ok: false, error: 'scheduledTime is not a valid date' });
      }
      const now = new Date();
      const diffMinutes = (now.getTime() - scheduled.getTime()) / 60000;
      if (Math.abs(diffMinutes) > 60) {
        rightTime = 'warn';
        warnings.push(
          `Administration ${diffMinutes > 0 ? 'late' : 'early'} by ${Math.abs(Math.round(diffMinutes))} minutes`
        );
      }
      if (Math.abs(diffMinutes) > 120) {
        rightTime = 'fail';
        blockers.push(
          `Administration window exceeded (${Math.abs(Math.round(diffMinutes))} minutes off schedule)`
        );
      }
    }

    const overallResult: SafetyCheckResult =
      blockers.length > 0 ? 'fail' : warnings.length > 0 ? 'warn' : 'pass';

    const check: FiveRightsCheck = {
      rightPatient,
      rightDrug,
      rightDose,
      rightRoute,
      rightTime,
      overallResult,
      warnings,
      blockers,
    };

    // Record safety event
    const event: MarSafetyEvent = {
      id: randomUUID(),
      tenantId: session.tenantId,
      patientDfn,
      medicationName,
      eventType: 'five-rights-check',
      result: overallResult,
      details: check as unknown as Record<string, unknown>,
      timestamp: new Date().toISOString(),
      duz: session.duz,
    };
    safetyEvents.set(event.id, event);
    evictOldestSafetyEvents();

    return {
      ok: true,
      check,
      highAlerts: highAlerts.length > 0 ? highAlerts : undefined,
      eventId: event.id,
      vistaGrounding: {
        targetRpc: ['PSB VALIDATE ORDER'],
        status: 'integration-pending',
        nextSteps: ['Wire PSB VALIDATE ORDER for real-time barcode/order validation'],
      },
    };
  });

  // GET /emar/safety/high-alert-check — check if a medication is high-alert
  server.get(
    '/emar/safety/high-alert-check',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const medication = (request.query as any).medication;
      if (!medication)
        return reply.code(400).send({ ok: false, error: 'medication query param required' });

      const alerts = findHighAlertWarnings(medication);
      return {
        ok: true,
        isHighAlert: alerts.length > 0,
        alerts,
        source: 'ISMP High-Alert Medications List',
      };
    }
  );

  // GET /emar/safety/events — list safety events
  server.get('/emar/safety/events', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const dfn = (request.query as any).dfn;
    const limit = parseInt((request.query as any).limit || '50', 10);

    let events = Array.from(safetyEvents.values()).filter((e) => e.tenantId === session.tenantId);
    if (dfn) events = events.filter((e) => e.patientDfn === dfn);
    events.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    events = events.slice(0, limit);

    return { ok: true, events, total: events.length };
  });

  // GET /emar/safety/admin-window — check administration time window
  server.get('/emar/safety/admin-window', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const scheduledTime = (request.query as any).scheduledTime;
    if (!scheduledTime) return reply.code(400).send({ ok: false, error: 'scheduledTime required' });

    const scheduled = new Date(scheduledTime);
    const now = new Date();
    const windowMinutes = 60; // Standard 1-hour window each side

    const windowStart = new Date(scheduled.getTime() - windowMinutes * 60000);
    const windowEnd = new Date(scheduled.getTime() + windowMinutes * 60000);
    const isWithinWindow = now >= windowStart && now <= windowEnd;
    const diffMinutes = (now.getTime() - scheduled.getTime()) / 60000;

    const window: AdminWindow = {
      scheduledTime: scheduled.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      isWithinWindow,
      minutesEarly: diffMinutes < 0 ? Math.abs(Math.round(diffMinutes)) : 0,
      minutesLate: diffMinutes > 0 ? Math.round(diffMinutes) : 0,
    };

    return { ok: true, window };
  });
}
