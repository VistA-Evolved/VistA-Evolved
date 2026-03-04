/**
 * apps/api/src/migration/cutover-tracker.ts
 *
 * Phase 461 (W30-P6). Cutover state machine for migration transition.
 * Tracks the cutover lifecycle from planning through completion,
 * enforcing gate checks at each transition.
 */

import { randomBytes } from 'crypto';

// ── Types ──────────────────────────────────────────────────────────

export type CutoverPhase =
  | 'planning'
  | 'pre-validation'
  | 'data-freeze'
  | 'final-sync'
  | 'cutover-active'
  | 'post-validation'
  | 'completed'
  | 'rolled-back';

export interface CutoverGate {
  id: string;
  phase: CutoverPhase;
  name: string;
  description: string;
  required: boolean;
  passed: boolean;
  checkedAt?: string;
  checkedBy?: string;
  notes?: string;
}

export interface CutoverEvent {
  timestamp: string;
  phase: CutoverPhase;
  action: string;
  userId: string;
  details?: string;
}

export interface CutoverPlan {
  id: string;
  status: CutoverPhase;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  targetDate?: string;
  gates: CutoverGate[];
  events: CutoverEvent[];
  rollbackReason?: string;
}

// ── Phase transitions ──────────────────────────────────────────────

const VALID_TRANSITIONS: Record<CutoverPhase, CutoverPhase[]> = {
  planning: ['pre-validation'],
  'pre-validation': ['data-freeze', 'planning'],
  'data-freeze': ['final-sync', 'planning'],
  'final-sync': ['cutover-active', 'data-freeze'],
  'cutover-active': ['post-validation', 'rolled-back'],
  'post-validation': ['completed', 'rolled-back'],
  completed: [],
  'rolled-back': ['planning'],
};

// ── Default gates ──────────────────────────────────────────────────

function createDefaultGates(): CutoverGate[] {
  return [
    // Pre-validation gates
    {
      id: 'g1',
      phase: 'pre-validation',
      name: 'recon-clean',
      description: 'All recon discrepancies resolved or accepted',
      required: true,
      passed: false,
    },
    {
      id: 'g2',
      phase: 'pre-validation',
      name: 'dual-run-stable',
      description: 'Dual-run match rate >99% for 24h',
      required: true,
      passed: false,
    },
    {
      id: 'g3',
      phase: 'pre-validation',
      name: 'backup-verified',
      description: 'Full VistA backup verified and tested',
      required: true,
      passed: false,
    },
    {
      id: 'g4',
      phase: 'pre-validation',
      name: 'rollback-tested',
      description: 'Rollback procedure tested successfully',
      required: true,
      passed: false,
    },
    // Data-freeze gates
    {
      id: 'g5',
      phase: 'data-freeze',
      name: 'write-freeze',
      description: 'VistA writes paused (read-only mode)',
      required: true,
      passed: false,
    },
    {
      id: 'g6',
      phase: 'data-freeze',
      name: 'queue-drained',
      description: 'All pending HL7 messages processed',
      required: false,
      passed: false,
    },
    // Final-sync gates
    {
      id: 'g7',
      phase: 'final-sync',
      name: 'delta-sync',
      description: 'Final delta sync completed',
      required: true,
      passed: false,
    },
    {
      id: 'g8',
      phase: 'final-sync',
      name: 'count-match',
      description: 'Record counts match within tolerance',
      required: true,
      passed: false,
    },
    // Post-validation gates
    {
      id: 'g9',
      phase: 'post-validation',
      name: 'smoke-test',
      description: 'Core workflow smoke tests pass',
      required: true,
      passed: false,
    },
    {
      id: 'g10',
      phase: 'post-validation',
      name: 'user-acceptance',
      description: 'Key users validated core functions',
      required: false,
      passed: false,
    },
  ];
}

// ── Tracker ────────────────────────────────────────────────────────

const cutoverPlans = new Map<string, CutoverPlan>();

export class CutoverTracker {
  createPlan(userId: string, targetDate?: string): CutoverPlan {
    const id = `cutover-${randomBytes(6).toString('hex')}`;
    const now = new Date().toISOString();
    const plan: CutoverPlan = {
      id,
      status: 'planning',
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      targetDate,
      gates: createDefaultGates(),
      events: [{ timestamp: now, phase: 'planning', action: 'plan-created', userId }],
    };
    cutoverPlans.set(id, plan);
    return plan;
  }

  getPlan(id: string): CutoverPlan | undefined {
    return cutoverPlans.get(id);
  }

  listPlans(): CutoverPlan[] {
    return Array.from(cutoverPlans.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  /**
   * Advance to the next phase. Validates that all required gates
   * for the current phase are passed before allowing transition.
   */
  advancePhase(
    planId: string,
    targetPhase: CutoverPhase,
    userId: string
  ): { ok: boolean; error?: string } {
    const plan = cutoverPlans.get(planId);
    if (!plan) return { ok: false, error: 'Plan not found' };

    const valid = VALID_TRANSITIONS[plan.status];
    if (!valid.includes(targetPhase)) {
      return { ok: false, error: `Cannot transition from ${plan.status} to ${targetPhase}` };
    }

    // Check required gates for current phase
    const requiredGates = plan.gates.filter((g) => g.phase === plan.status && g.required);
    const unblockedGates = requiredGates.filter((g) => !g.passed);
    if (unblockedGates.length > 0 && targetPhase !== 'rolled-back' && targetPhase !== 'planning') {
      return {
        ok: false,
        error: `Required gates not passed: ${unblockedGates.map((g) => g.name).join(', ')}`,
      };
    }

    plan.status = targetPhase;
    plan.updatedAt = new Date().toISOString();
    plan.events.push({
      timestamp: plan.updatedAt,
      phase: targetPhase,
      action: `phase-advanced-to-${targetPhase}`,
      userId,
    });

    return { ok: true };
  }

  /**
   * Update a gate's status.
   */
  updateGate(
    planId: string,
    gateId: string,
    passed: boolean,
    userId: string,
    notes?: string
  ): boolean {
    const plan = cutoverPlans.get(planId);
    if (!plan) return false;

    const gate = plan.gates.find((g) => g.id === gateId);
    if (!gate) return false;

    gate.passed = passed;
    gate.checkedAt = new Date().toISOString();
    gate.checkedBy = userId;
    if (notes) gate.notes = notes;

    plan.updatedAt = new Date().toISOString();
    plan.events.push({
      timestamp: plan.updatedAt,
      phase: plan.status,
      action: `gate-${gateId}-${passed ? 'passed' : 'failed'}`,
      userId,
      details: notes,
    });

    return true;
  }

  /**
   * Rollback: transition to rolled-back state.
   */
  rollback(planId: string, userId: string, reason: string): boolean {
    const plan = cutoverPlans.get(planId);
    if (!plan) return false;

    const valid = VALID_TRANSITIONS[plan.status];
    if (!valid.includes('rolled-back')) return false;

    plan.status = 'rolled-back';
    plan.rollbackReason = reason;
    plan.updatedAt = new Date().toISOString();
    plan.events.push({
      timestamp: plan.updatedAt,
      phase: 'rolled-back',
      action: 'rollback',
      userId,
      details: reason,
    });

    return true;
  }
}

export const cutoverTracker = new CutoverTracker();
