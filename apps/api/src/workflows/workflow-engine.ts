/**
 * Phase 160: Department Workflow Engine
 * In-memory store for workflow definitions and instances with step lifecycle.
 */
import { randomUUID } from 'node:crypto';
import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowStepInstance,
  WorkflowInstanceStatus,
  WorkflowStepStatus,
  DepartmentPack,
} from './types.js';
import { getAllDepartmentPacks } from './department-packs.js';

// -- In-memory stores ------------------------------------------------
const MAX_DEFINITIONS = 2000;
const MAX_INSTANCES = 10000;
const definitionStore = new Map<string, WorkflowDefinition>();
const instanceStore = new Map<string, WorkflowInstance>();

function evictOldest<T>(store: Map<string, T>, max: number): void {
  if (store.size <= max) return;
  const excess = store.size - max;
  const keys = store.keys();
  for (let i = 0; i < excess; i++) {
    const k = keys.next().value;
    if (k !== undefined) store.delete(k);
  }
}

// -- Definitions CRUD ------------------------------------------------

export function createDefinition(
  input: Omit<
    WorkflowDefinition,
    'id' | 'tenantId' | 'version' | 'status' | 'createdAt' | 'updatedAt'
  >,
  tenantId: string = 'default',
  createdBy?: string
): WorkflowDefinition {
  const def: WorkflowDefinition = {
    ...input,
    id: randomUUID(),
    tenantId,
    version: 1,
    status: 'draft',
    createdBy,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  definitionStore.set(def.id, def);
  evictOldest(definitionStore, MAX_DEFINITIONS);
  return def;
}

export function activateDefinition(defId: string): WorkflowDefinition | null {
  const def = definitionStore.get(defId);
  if (!def) return null;
  def.status = 'active';
  def.updatedAt = new Date().toISOString();
  return def;
}

export function archiveDefinition(defId: string): WorkflowDefinition | null {
  const def = definitionStore.get(defId);
  if (!def) return null;
  def.status = 'archived';
  def.updatedAt = new Date().toISOString();
  return def;
}

export function getDefinition(defId: string): WorkflowDefinition | undefined {
  return definitionStore.get(defId);
}

export function listDefinitions(
  tenantId: string = 'default',
  department?: string
): WorkflowDefinition[] {
  return Array.from(definitionStore.values())
    .filter((d) => d.tenantId === tenantId && (!department || d.department === department))
    .sort((a, b) => a.department.localeCompare(b.department));
}

// -- Instance lifecycle ----------------------------------------------

export function startWorkflow(
  definitionId: string,
  patientDfn: string,
  tenantId: string = 'default',
  startedBy?: string,
  encounterRef?: string,
  queueTicketId?: string
): WorkflowInstance | null {
  const def = definitionStore.get(definitionId);
  if (!def) return null;

  const steps: WorkflowStepInstance[] = def.steps.map((s) => ({
    stepId: s.id,
    name: s.name,
    status: 'pending' as WorkflowStepStatus,
  }));

  // Auto-activate first step
  if (steps.length > 0) steps[0].status = 'active';

  const inst: WorkflowInstance = {
    id: randomUUID(),
    tenantId,
    definitionId,
    department: def.department,
    patientDfn,
    encounterRef,
    queueTicketId,
    status: 'in_progress',
    steps,
    startedAt: new Date().toISOString(),
    startedBy,
  };
  instanceStore.set(inst.id, inst);
  evictOldest(instanceStore, MAX_INSTANCES);
  return inst;
}

export function advanceStep(
  instanceId: string,
  stepId: string,
  action: 'complete' | 'skip',
  actorDuz?: string,
  notes?: string
): WorkflowInstance | null {
  const inst = instanceStore.get(instanceId);
  if (!inst || inst.status !== 'in_progress') return null;

  const stepIndex = inst.steps.findIndex((s) => s.stepId === stepId);
  if (stepIndex === -1) return null;

  const step = inst.steps[stepIndex];
  if (step.status !== 'active' && step.status !== 'pending') return null;

  if (action === 'complete') {
    step.status = 'completed';
    step.completedAt = new Date().toISOString();
    step.completedBy = actorDuz;
    if (notes) step.notes = notes;
  } else {
    step.status = 'skipped';
    step.skippedReason = notes || 'Skipped';
  }

  // Auto-activate next pending step
  const nextPending = inst.steps.find((s) => s.status === 'pending');
  if (nextPending) {
    nextPending.status = 'active';
  } else {
    // All steps done
    const allDone = inst.steps.every((s) => s.status === 'completed' || s.status === 'skipped');
    if (allDone) {
      inst.status = 'completed';
      inst.completedAt = new Date().toISOString();
    }
  }

  return inst;
}

export function cancelWorkflow(instanceId: string): WorkflowInstance | null {
  const inst = instanceStore.get(instanceId);
  if (!inst || inst.status === 'completed' || inst.status === 'cancelled') return null;
  inst.status = 'cancelled';
  inst.completedAt = new Date().toISOString();
  return inst;
}

export function getInstance(instanceId: string): WorkflowInstance | undefined {
  return instanceStore.get(instanceId);
}

export function listInstances(
  tenantId: string = 'default',
  department?: string,
  status?: WorkflowInstanceStatus
): WorkflowInstance[] {
  return Array.from(instanceStore.values())
    .filter(
      (i) =>
        i.tenantId === tenantId &&
        (!department || i.department === department) &&
        (!status || i.status === status)
    )
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime());
}

// -- Seed department packs -------------------------------------------

export function seedDepartmentPacks(tenantId: string = 'default'): {
  seeded: number;
  departments: number;
} {
  const packs = getAllDepartmentPacks();
  let seeded = 0;

  for (const pack of packs) {
    for (const wf of pack.workflows) {
      // Check if already exists
      const existing = Array.from(definitionStore.values()).find(
        (d) => d.tenantId === tenantId && d.department === pack.department && d.name === wf.name
      );
      if (existing) continue;

      const def = createDefinition(
        {
          department: pack.department,
          name: wf.name,
          description: wf.description,
          steps: wf.steps,
          tags: wf.tags,
        },
        tenantId,
        'system'
      );
      // Auto-activate seeded definitions
      activateDefinition(def.id);
      seeded++;
    }
  }

  return { seeded, departments: packs.length };
}

export function getDepartmentPacks(): DepartmentPack[] {
  const packs = getAllDepartmentPacks();
  return packs.map((p) => ({
    department: p.department,
    displayName: p.displayName,
    description: p.description,
    workflows: listDefinitions('default', p.department),
  }));
}

export function getWorkflowStats(tenantId: string = 'default'): {
  totalDefinitions: number;
  activeDefinitions: number;
  totalInstances: number;
  inProgress: number;
  completed: number;
  byDepartment: Record<string, number>;
} {
  const defs = Array.from(definitionStore.values()).filter((d) => d.tenantId === tenantId);
  const insts = Array.from(instanceStore.values()).filter((i) => i.tenantId === tenantId);

  const byDept: Record<string, number> = {};
  for (const d of defs) byDept[d.department] = (byDept[d.department] || 0) + 1;

  return {
    totalDefinitions: defs.length,
    activeDefinitions: defs.filter((d) => d.status === 'active').length,
    totalInstances: insts.length,
    inProgress: insts.filter((i) => i.status === 'in_progress').length,
    completed: insts.filter((i) => i.status === 'completed').length,
    byDepartment: byDept,
  };
}

// -- Store reset -----------------------------------------------------
export function resetWorkflowStore(): void {
  definitionStore.clear();
  instanceStore.clear();
}
