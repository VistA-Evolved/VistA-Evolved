import { and, asc, desc, eq } from 'drizzle-orm';
import { getPgDb } from '../pg-db.js';
import { pgWorkflowDefinition, pgWorkflowInstance } from '../pg-schema.js';
import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowInstanceStatus,
  WorkflowStepDef,
  WorkflowStepInstance,
} from '../../../workflows/types.js';

type WorkflowDefinitionRow = typeof pgWorkflowDefinition.$inferSelect;
type WorkflowInstanceRow = typeof pgWorkflowInstance.$inferSelect;

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

function mapDefinition(row: WorkflowDefinitionRow): WorkflowDefinition {
  return {
    id: row.id,
    tenantId: row.tenantId,
    department: row.department,
    name: row.name,
    description: row.description || '',
    version: row.version,
    status: row.status as WorkflowDefinition['status'],
    steps: ((row.stepsJson as WorkflowStepDef[] | null) || []) as WorkflowStepDef[],
    tags: ((row.tagsJson as string[] | null) || []) as string[],
    createdBy: row.createdBy || undefined,
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
  };
}

function mapInstance(row: WorkflowInstanceRow): WorkflowInstance {
  return {
    id: row.id,
    tenantId: row.tenantId,
    definitionId: row.definitionId,
    department: row.department,
    patientDfn: row.patientDfn,
    encounterRef: row.encounterRef || undefined,
    queueTicketId: row.queueTicketId || undefined,
    status: row.status as WorkflowInstanceStatus,
    steps: ((row.stepsJson as WorkflowStepInstance[] | null) || []) as WorkflowStepInstance[],
    startedBy: row.startedBy || undefined,
    startedAt: toIso(row.startedAt)!,
    completedAt: toIso(row.completedAt),
  };
}

export async function findWorkflowDefinitionByName(
  tenantId: string,
  department: string,
  name: string
): Promise<WorkflowDefinition | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgWorkflowDefinition)
    .where(
      and(
        eq(pgWorkflowDefinition.tenantId, tenantId),
        eq(pgWorkflowDefinition.department, department),
        eq(pgWorkflowDefinition.name, name)
      )
    );
  return rows[0] ? mapDefinition(rows[0]) : undefined;
}

export async function insertWorkflowDefinition(data: {
  id: string;
  tenantId: string;
  department: string;
  name: string;
  description?: string;
  version: number;
  status: WorkflowDefinition['status'];
  steps: WorkflowStepDef[];
  tags: string[];
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}): Promise<WorkflowDefinition> {
  const db = getPgDb();
  await db.insert(pgWorkflowDefinition).values({
    id: data.id,
    tenantId: data.tenantId,
    department: data.department,
    name: data.name,
    description: data.description || null,
    version: data.version,
    status: data.status,
    stepsJson: data.steps,
    tagsJson: data.tags,
    createdBy: data.createdBy || null,
    createdAt: new Date(data.createdAt),
    updatedAt: new Date(data.updatedAt),
  });
  return (await findWorkflowDefinitionById(data.id, data.tenantId))!;
}

export async function updateWorkflowDefinition(
  id: string,
  tenantId: string,
  updates: Partial<{
    status: WorkflowDefinition['status'];
    description: string;
    steps: WorkflowStepDef[];
    tags: string[];
    updatedAt: string;
  }>
): Promise<WorkflowDefinition | undefined> {
  const db = getPgDb();
  const values: Record<string, unknown> = {};
  if (updates.status !== undefined) values.status = updates.status;
  if (updates.description !== undefined) values.description = updates.description;
  if (updates.steps !== undefined) values.stepsJson = updates.steps;
  if (updates.tags !== undefined) values.tagsJson = updates.tags;
  values.updatedAt = new Date(updates.updatedAt || new Date().toISOString());
  await db
    .update(pgWorkflowDefinition)
    .set(values as any)
    .where(and(eq(pgWorkflowDefinition.id, id), eq(pgWorkflowDefinition.tenantId, tenantId)));
  return findWorkflowDefinitionById(id, tenantId);
}

export async function findWorkflowDefinitionById(
  id: string,
  tenantId: string
): Promise<WorkflowDefinition | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgWorkflowDefinition)
    .where(and(eq(pgWorkflowDefinition.id, id), eq(pgWorkflowDefinition.tenantId, tenantId)));
  return rows[0] ? mapDefinition(rows[0]) : undefined;
}

export async function listWorkflowDefinitions(
  tenantId: string,
  department?: string
): Promise<WorkflowDefinition[]> {
  const db = getPgDb();
  const filters = [eq(pgWorkflowDefinition.tenantId, tenantId)];
  if (department) filters.push(eq(pgWorkflowDefinition.department, department));
  const rows = await db
    .select()
    .from(pgWorkflowDefinition)
    .where(and(...filters))
    .orderBy(asc(pgWorkflowDefinition.department), asc(pgWorkflowDefinition.name));
  return rows.map(mapDefinition);
}

export async function insertWorkflowInstance(data: {
  id: string;
  tenantId: string;
  definitionId: string;
  department: string;
  patientDfn: string;
  encounterRef?: string;
  queueTicketId?: string;
  status: WorkflowInstanceStatus;
  steps: WorkflowStepInstance[];
  startedBy?: string;
  startedAt: string;
  completedAt?: string;
}): Promise<WorkflowInstance> {
  const db = getPgDb();
  await db.insert(pgWorkflowInstance).values({
    id: data.id,
    tenantId: data.tenantId,
    definitionId: data.definitionId,
    department: data.department,
    patientDfn: data.patientDfn,
    encounterRef: data.encounterRef || null,
    queueTicketId: data.queueTicketId || null,
    status: data.status,
    stepsJson: data.steps,
    startedBy: data.startedBy || null,
    startedAt: new Date(data.startedAt),
    completedAt: data.completedAt ? new Date(data.completedAt) : null,
  });
  return (await findWorkflowInstanceById(data.id, data.tenantId))!;
}

export async function updateWorkflowInstance(
  id: string,
  tenantId: string,
  updates: Partial<{
    status: WorkflowInstanceStatus;
    steps: WorkflowStepInstance[];
    completedAt: string | null;
  }>
): Promise<WorkflowInstance | undefined> {
  const db = getPgDb();
  const values: Record<string, unknown> = {};
  if (updates.status !== undefined) values.status = updates.status;
  if (updates.steps !== undefined) values.stepsJson = updates.steps;
  if (updates.completedAt !== undefined) {
    values.completedAt = updates.completedAt ? new Date(updates.completedAt) : null;
  }
  await db
    .update(pgWorkflowInstance)
    .set(values as any)
    .where(and(eq(pgWorkflowInstance.id, id), eq(pgWorkflowInstance.tenantId, tenantId)));
  return findWorkflowInstanceById(id, tenantId);
}

export async function findWorkflowInstanceById(
  id: string,
  tenantId: string
): Promise<WorkflowInstance | undefined> {
  const db = getPgDb();
  const rows = await db
    .select()
    .from(pgWorkflowInstance)
    .where(and(eq(pgWorkflowInstance.id, id), eq(pgWorkflowInstance.tenantId, tenantId)));
  return rows[0] ? mapInstance(rows[0]) : undefined;
}

export async function listWorkflowInstances(
  tenantId: string,
  department?: string,
  status?: WorkflowInstanceStatus
): Promise<WorkflowInstance[]> {
  const db = getPgDb();
  const filters = [eq(pgWorkflowInstance.tenantId, tenantId)];
  if (department) filters.push(eq(pgWorkflowInstance.department, department));
  if (status) filters.push(eq(pgWorkflowInstance.status, status));
  const rows = await db
    .select()
    .from(pgWorkflowInstance)
    .where(and(...filters))
    .orderBy(desc(pgWorkflowInstance.startedAt));
  return rows.map(mapInstance);
}