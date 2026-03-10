/**
 * apps/api/src/migration/rollback-executor.ts
 *
 * Phase 462 (W30-P7). Rollback execution engine.
 * Manages the sequence of rollback steps, timing each one,
 * and producing a drill report.
 */

import { randomBytes } from 'crypto';

// -- Types ----------------------------------------------------------

export type RollbackStepStatus = 'pending' | 'running' | 'completed' | 'failed' | 'skipped';

export interface RollbackStep {
  id: string;
  order: number;
  name: string;
  description: string;
  status: RollbackStepStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  error?: string;
}

export interface RollbackDrill {
  id: string;
  type: 'drill' | 'actual';
  status: 'pending' | 'running' | 'completed' | 'failed';
  createdAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  createdBy: string;
  steps: RollbackStep[];
  report?: RollbackReport;
}

export interface RollbackReport {
  drillId: string;
  totalSteps: number;
  completedSteps: number;
  failedSteps: number;
  totalDurationMs: number;
  meetsRto: boolean; // RTO = Recovery Time Objective
  rtoTargetMs: number;
  stepTimings: Array<{ name: string; durationMs: number }>;
}

// -- In-memory store ------------------------------------------------

const drills = new Map<string, RollbackDrill>();

// -- Default rollback steps -----------------------------------------

function createDefaultSteps(): RollbackStep[] {
  return [
    {
      id: 'rs1',
      order: 1,
      name: 'halt-traffic',
      description: 'Stop routing traffic to VistA-Evolved',
      status: 'pending',
    },
    {
      id: 'rs2',
      order: 2,
      name: 'verify-vista-health',
      description: 'Confirm VistA instance is healthy and accessible',
      status: 'pending',
    },
    {
      id: 'rs3',
      order: 3,
      name: 'switch-dns',
      description: 'Point DNS/load balancer back to VistA-only endpoints',
      status: 'pending',
    },
    {
      id: 'rs4',
      order: 4,
      name: 'verify-vista-reads',
      description: 'Validate core VistA read operations work',
      status: 'pending',
    },
    {
      id: 'rs5',
      order: 5,
      name: 'verify-vista-writes',
      description: 'Validate VistA write operations work',
      status: 'pending',
    },
    {
      id: 'rs6',
      order: 6,
      name: 'notify-users',
      description: 'Send rollback notification to clinical users',
      status: 'pending',
    },
    {
      id: 'rs7',
      order: 7,
      name: 'archive-logs',
      description: 'Archive VistA-Evolved logs for post-mortem',
      status: 'pending',
    },
    {
      id: 'rs8',
      order: 8,
      name: 'final-verification',
      description: 'Run post-rollback smoke tests',
      status: 'pending',
    },
  ];
}

// -- Executor -------------------------------------------------------

const RTO_TARGET_MS = 30 * 60 * 1000; // 30 minutes default RTO

export class RollbackExecutor {
  createDrill(userId: string, type: 'drill' | 'actual' = 'drill'): RollbackDrill {
    const id = `rb-${randomBytes(6).toString('hex')}`;
    const drill: RollbackDrill = {
      id,
      type,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: userId,
      steps: createDefaultSteps(),
    };
    drills.set(id, drill);
    return drill;
  }

  getDrill(id: string): RollbackDrill | undefined {
    return drills.get(id);
  }

  listDrills(): RollbackDrill[] {
    return Array.from(drills.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  /**
   * Start executing a rollback drill.
   */
  startDrill(drillId: string): boolean {
    const drill = drills.get(drillId);
    if (!drill || drill.status !== 'pending') return false;
    drill.status = 'running';
    return true;
  }

  /**
   * Mark a step as started.
   */
  startStep(drillId: string, stepId: string): boolean {
    const drill = drills.get(drillId);
    if (!drill || drill.status !== 'running') return false;
    const step = drill.steps.find((s) => s.id === stepId);
    if (!step || step.status !== 'pending') return false;
    step.status = 'running';
    step.startedAt = new Date().toISOString();
    return true;
  }

  /**
   * Mark a step as completed (or failed).
   */
  completeStep(drillId: string, stepId: string, passed: boolean, error?: string): boolean {
    const drill = drills.get(drillId);
    if (!drill) return false;
    const step = drill.steps.find((s) => s.id === stepId);
    if (!step) return false;

    step.status = passed ? 'completed' : 'failed';
    step.completedAt = new Date().toISOString();
    step.durationMs = step.startedAt
      ? new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()
      : 0;
    if (error) step.error = error;

    // If all steps done, generate report
    const allDone = drill.steps.every(
      (s) => s.status === 'completed' || s.status === 'failed' || s.status === 'skipped'
    );
    if (allDone) {
      drill.status = drill.steps.some((s) => s.status === 'failed') ? 'failed' : 'completed';
      drill.completedAt = new Date().toISOString();
      drill.totalDurationMs =
        new Date(drill.completedAt).getTime() - new Date(drill.createdAt).getTime();
      drill.report = this.generateReport(drill);
    }

    return true;
  }

  private generateReport(drill: RollbackDrill): RollbackReport {
    const timings = drill.steps
      .filter((s) => s.durationMs !== undefined)
      .map((s) => ({ name: s.name, durationMs: s.durationMs! }));

    const totalMs = drill.totalDurationMs || 0;

    return {
      drillId: drill.id,
      totalSteps: drill.steps.length,
      completedSteps: drill.steps.filter((s) => s.status === 'completed').length,
      failedSteps: drill.steps.filter((s) => s.status === 'failed').length,
      totalDurationMs: totalMs,
      meetsRto: totalMs <= RTO_TARGET_MS,
      rtoTargetMs: RTO_TARGET_MS,
      stepTimings: timings,
    };
  }
}

export const rollbackExecutor = new RollbackExecutor();
