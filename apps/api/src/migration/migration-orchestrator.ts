/**
 * migration-orchestrator.ts -- Migration Orchestrator (Phase 281)
 *
 * Provides dependency-ordered batch migration planning and execution.
 * Ensures patients are imported before dependent entities (problems,
 * medications, allergies, appointments).
 *
 * All operations support dry-run mode for safe pre-flight validation.
 */

import type { ImportEntityType } from './types.js';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export type MigrationStepStatus = 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';

export interface MigrationStep {
  /** Entity type to import */
  entityType: ImportEntityType;
  /** Display label */
  label: string;
  /** Which entity types must complete before this step */
  dependsOn: ImportEntityType[];
  /** Number of records to import in this step */
  recordCount: number;
  /** Current status */
  status: MigrationStepStatus;
  /** Progress within this step */
  progress: { current: number; total: number };
  /** Results after execution */
  result?: {
    successCount: number;
    failureCount: number;
    skippedCount: number;
    errors: string[];
  };
}

export interface MigrationPlan {
  /** Unique plan ID */
  id: string;
  /** When the plan was created */
  createdAt: string;
  /** Source description */
  sourceDescription: string;
  /** Whether this is a dry-run plan */
  dryRun: boolean;
  /** Ordered steps (dependency-resolved) */
  steps: MigrationStep[];
  /** Overall status */
  status: MigrationStepStatus;
  /** Batch size for chunked processing */
  batchSize: number;
}

export interface MigrationEntityBatch {
  entityType: ImportEntityType;
  records: Record<string, string>[];
}

export type ImportHandler = (
  entityType: ImportEntityType,
  records: Record<string, string>[],
  dryRun: boolean
) => Promise<{
  successCount: number;
  failureCount: number;
  skippedCount: number;
  errors: string[];
}>;

/* ------------------------------------------------------------------ */
/* Dependency graph                                                    */
/* ------------------------------------------------------------------ */

const ENTITY_DEPENDENCIES: Record<ImportEntityType, ImportEntityType[]> = {
  patient: [],
  problem: ['patient'],
  medication: ['patient'],
  allergy: ['patient'],
  appointment: ['patient'],
  note: ['patient'],
};

const ENTITY_LABELS: Record<ImportEntityType, string> = {
  patient: 'Patients',
  problem: 'Problems / Conditions',
  medication: 'Medications',
  allergy: 'Allergies',
  appointment: 'Appointments / Encounters',
  note: 'Notes / Documents',
};

/**
 * Topological sort of entity types based on dependencies.
 */
function topologicalSort(types: ImportEntityType[]): ImportEntityType[] {
  const sorted: ImportEntityType[] = [];
  const visited = new Set<ImportEntityType>();
  const visiting = new Set<ImportEntityType>();

  function visit(type: ImportEntityType) {
    if (visited.has(type)) return;
    if (visiting.has(type)) throw new Error(`Circular dependency: ${type}`);

    visiting.add(type);
    for (const dep of ENTITY_DEPENDENCIES[type] ?? []) {
      if (types.includes(dep)) {
        visit(dep);
      }
    }
    visiting.delete(type);
    visited.add(type);
    sorted.push(type);
  }

  for (const type of types) {
    visit(type);
  }

  return sorted;
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Create a migration plan from entity batches.
 * Steps are ordered by dependency (patients first).
 */
export function createMigrationPlan(
  batches: MigrationEntityBatch[],
  options?: {
    dryRun?: boolean;
    batchSize?: number;
    sourceDescription?: string;
  }
): MigrationPlan {
  const dryRun = options?.dryRun ?? true;
  const batchSize = options?.batchSize ?? 100;

  // Collect entity types that have data
  const typeSet = new Set(batches.map((b) => b.entityType));
  const ordered = topologicalSort([...typeSet]);

  // Build record count map
  const countMap = new Map<ImportEntityType, number>();
  for (const batch of batches) {
    countMap.set(batch.entityType, (countMap.get(batch.entityType) ?? 0) + batch.records.length);
  }

  const steps: MigrationStep[] = ordered.map((entityType) => ({
    entityType,
    label: ENTITY_LABELS[entityType] ?? entityType,
    dependsOn: ENTITY_DEPENDENCIES[entityType].filter((d) => typeSet.has(d)),
    recordCount: countMap.get(entityType) ?? 0,
    status: 'pending' as MigrationStepStatus,
    progress: { current: 0, total: countMap.get(entityType) ?? 0 },
  }));

  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);

  return {
    id: `plan-${ts}-${rand}`,
    createdAt: new Date().toISOString(),
    sourceDescription: options?.sourceDescription ?? 'Unknown source',
    dryRun,
    steps,
    status: 'pending',
    batchSize,
  };
}

/**
 * Execute a migration plan step-by-step in dependency order.
 *
 * The importHandler callback is called for each entity type with
 * the records to import. In dry-run mode, the handler should
 * validate/simulate without persisting.
 */
export async function executeMigrationPlan(
  plan: MigrationPlan,
  batches: MigrationEntityBatch[],
  importHandler: ImportHandler,
  options?: {
    onStepStart?: (step: MigrationStep) => void;
    onStepComplete?: (step: MigrationStep) => void;
    stopOnFailure?: boolean;
  }
): Promise<MigrationPlan> {
  const stopOnFailure = options?.stopOnFailure ?? true;

  // Index batches by entity type
  const batchMap = new Map<ImportEntityType, Record<string, string>[]>();
  for (const batch of batches) {
    const existing = batchMap.get(batch.entityType) ?? [];
    existing.push(...batch.records);
    batchMap.set(batch.entityType, existing);
  }

  plan.status = 'in-progress';

  for (const step of plan.steps) {
    // Check dependencies are met
    const depsOk = step.dependsOn.every((dep) => {
      const depStep = plan.steps.find((s) => s.entityType === dep);
      return depStep?.status === 'completed';
    });

    if (!depsOk) {
      step.status = 'skipped';
      step.result = {
        successCount: 0,
        failureCount: 0,
        skippedCount: step.recordCount,
        errors: ['Dependency not met'],
      };
      continue;
    }

    step.status = 'in-progress';
    options?.onStepStart?.(step);

    const records = batchMap.get(step.entityType) ?? [];

    try {
      // Process in batches
      let totalSuccess = 0;
      let totalFailure = 0;
      let totalSkipped = 0;
      const allErrors: string[] = [];

      for (let i = 0; i < records.length; i += plan.batchSize) {
        const chunk = records.slice(i, i + plan.batchSize);
        const result = await importHandler(step.entityType, chunk, plan.dryRun);

        totalSuccess += result.successCount;
        totalFailure += result.failureCount;
        totalSkipped += result.skippedCount;
        allErrors.push(...result.errors);

        step.progress.current = Math.min(i + plan.batchSize, records.length);
      }

      step.result = {
        successCount: totalSuccess,
        failureCount: totalFailure,
        skippedCount: totalSkipped,
        errors: allErrors,
      };

      step.status = totalFailure > 0 && stopOnFailure ? 'failed' : 'completed';
    } catch (err) {
      step.status = 'failed';
      step.result = {
        successCount: 0,
        failureCount: step.recordCount,
        skippedCount: 0,
        errors: [err instanceof Error ? err.message : String(err)],
      };
    }

    options?.onStepComplete?.(step);

    if (step.status === 'failed' && stopOnFailure) {
      // Skip remaining steps
      for (const remaining of plan.steps) {
        if (remaining.status === 'pending') {
          remaining.status = 'skipped';
          remaining.result = {
            successCount: 0,
            failureCount: 0,
            skippedCount: remaining.recordCount,
            errors: ['Skipped due to earlier failure'],
          };
        }
      }
      break;
    }
  }

  // Set overall status
  const hasFailure = plan.steps.some((s) => s.status === 'failed');
  const allDone = plan.steps.every((s) => s.status === 'completed' || s.status === 'skipped');
  plan.status = hasFailure ? 'failed' : allDone ? 'completed' : 'in-progress';

  return plan;
}

/**
 * List the dependency order for a set of entity types.
 */
export function getDependencyOrder(
  types: ImportEntityType[]
): { entityType: ImportEntityType; dependsOn: ImportEntityType[] }[] {
  const ordered = topologicalSort(types);
  return ordered.map((t) => ({
    entityType: t,
    dependsOn: ENTITY_DEPENDENCIES[t].filter((d) => types.includes(d)),
  }));
}
