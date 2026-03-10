/**
 * Phase 160: Workflow Routes -- Department Workflow Packs
 */
import { createHash, randomUUID } from 'node:crypto';
import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { requireRole, requireSession } from '../auth/auth-routes.js';
import { isPgConfigured } from '../platform/pg/pg-db.js';
import * as pgWorkflowRepo from '../platform/pg/repo/pg-workflow-repo.js';
import { tiuExecutor } from '../writeback/executors/tiu-executor.js';
import type { ClinicalCommand } from '../writeback/types.js';
import { getAllDepartmentPacks } from './department-packs.js';
import { safeErr } from '../lib/safe-error.js';
import {
  createDefinition,
  activateDefinition,
  archiveDefinition,
  getDefinition,
  listDefinitions,
  startWorkflow,
  advanceStep,
  cancelWorkflow,
  getInstance,
  listInstances,
  seedDepartmentPacks,
} from './workflow-engine.js';
import type {
  WorkflowDefinition,
  WorkflowInstance,
  WorkflowInstanceStatus,
  WorkflowStepDef,
  WorkflowStepIntegrationOutcome,
  WorkflowStepInstance,
} from './types.js';

function resolveTenantId(request: FastifyRequest, session?: any): string | null {
  const sessionTenantId =
    typeof session?.tenantId === 'string' && session.tenantId.trim().length > 0
      ? session.tenantId.trim()
      : undefined;
  const requestTenantId =
    typeof (request as any).tenantId === 'string' && (request as any).tenantId.trim().length > 0
      ? (request as any).tenantId.trim()
      : undefined;
  const headerTenantId = request.headers['x-tenant-id'];
  const headerTenant =
    typeof headerTenantId === 'string' && headerTenantId.trim().length > 0
      ? headerTenantId.trim()
      : undefined;
  return sessionTenantId || requestTenantId || headerTenant || null;
}

function requireTenantId(
  request: FastifyRequest,
  reply: FastifyReply,
  session?: any
): string | null {
  const tenantId = resolveTenantId(request, session);
  if (tenantId) return tenantId;
  reply.code(403).send({ ok: false, code: 'TENANT_REQUIRED', error: 'Tenant context missing' });
  return null;
}

function buildPackSummaries(): Array<{
  department: string;
  name: string;
  description: string;
  stepCount: number;
  tags: string[];
  vistaReferences: number;
}> {
  return getAllDepartmentPacks().map((pack) => {
    const tags = Array.from(new Set(pack.workflows.flatMap((workflow) => workflow.tags || [])));
    const stepCount = pack.workflows.reduce((count, workflow) => count + workflow.steps.length, 0);
    const vistaReferences = pack.workflows.reduce(
      (count, workflow) =>
        count + workflow.steps.filter((step) => step.vistaIntegration?.targetRpc).length,
      0
    );
    return {
      department: pack.department,
      name: pack.displayName,
      description: pack.description,
      stepCount,
      tags,
      vistaReferences,
    };
  });
}

async function ensureSeededDefinitions(tenantId: string): Promise<number> {
  if (isPgConfigured()) {
    const existing = await pgWorkflowRepo.listWorkflowDefinitions(tenantId);
    if (existing.length > 0) return existing.length;

    let seeded = 0;
    const now = new Date().toISOString();
    for (const pack of getAllDepartmentPacks()) {
      for (const workflow of pack.workflows) {
        const found = await pgWorkflowRepo.findWorkflowDefinitionByName(
          tenantId,
          pack.department,
          workflow.name
        );
        if (found) continue;
        await pgWorkflowRepo.insertWorkflowDefinition({
          id: randomUUID(),
          tenantId,
          department: pack.department,
          name: workflow.name,
          description: workflow.description,
          version: 1,
          status: 'active',
          steps: workflow.steps,
          tags: workflow.tags,
          createdBy: 'system',
          createdAt: now,
          updatedAt: now,
        });
        seeded++;
      }
    }
    return seeded;
  }

  const existing = listDefinitions(tenantId);
  if (existing.length === 0) {
    seedDepartmentPacks(tenantId);
  }
  return listDefinitions(tenantId).length;
}

function buildWorkflowStatsPayload(
  definitions: WorkflowDefinition[],
  instances: WorkflowInstance[]
): {
  totalDefinitions: number;
  activeDefinitions: number;
  totalInstances: number;
  byDepartment: Record<string, number>;
  byStatus: Record<string, number>;
} {
  const byDepartment: Record<string, number> = {};
  for (const definition of definitions) {
    byDepartment[definition.department] = (byDepartment[definition.department] || 0) + 1;
  }

  const byStatus: Record<string, number> = {};
  for (const instance of instances) {
    byStatus[instance.status] = (byStatus[instance.status] || 0) + 1;
  }

  return {
    totalDefinitions: definitions.length,
    activeDefinitions: definitions.filter((definition) => definition.status === 'active').length,
    totalInstances: instances.length,
    byDepartment,
    byStatus,
  };
}

function buildRuntimeSteps(definition: WorkflowDefinition): WorkflowStepInstance[] {
  const steps: WorkflowStepInstance[] = definition.steps.map((step) => ({
    stepId: step.id,
    name: step.name,
    status: 'pending',
  }));
  if (steps.length > 0) steps[0].status = 'active';
  return steps;
}

function getStepDefinition(
  definition: WorkflowDefinition | undefined,
  stepId: string
): WorkflowStepDef | undefined {
  return definition?.steps.find((step) => step.id === stepId);
}

async function executeStepIntegration(
  definition: WorkflowDefinition | undefined,
  instance: WorkflowInstance,
  stepId: string,
  actorDuz: string,
  body: Record<string, any>
): Promise<WorkflowStepIntegrationOutcome | undefined> {
  const stepDef = getStepDefinition(definition, stepId);
  const targetRpc = stepDef?.vistaIntegration?.targetRpc;
  if (!targetRpc) return undefined;

  if (targetRpc !== 'TIU CREATE RECORD') {
    return {
      mode: 'rpc_delegated',
      status: 'delegated',
      targetRpc,
      message: `${targetRpc} will be called via safeCallRpc. Ensure the RPC is registered in rpcRegistry.ts and installed in VistA.`,
    };
  }

  const tiu = body.integration?.tiu || {};
  const titleIen = String(tiu.titleIen || '').trim();
  const text = String(tiu.text || '').trim();
  const visitStr = String(tiu.visitStr || body.visitStr || instance.encounterRef || '').trim();
  if (!titleIen || !text) {
    return {
      mode: 'tiu_draft',
      status: 'not_requested',
      targetRpc,
      message: 'TIU draft support is available for this step. Provide a title and note text to create a VistA draft note.',
    };
  }

  try {
    const command: ClinicalCommand = {
      id: randomUUID(),
      tenantId: instance.tenantId,
      patientRefHash: createHash('sha256').update(instance.patientDfn).digest('hex'),
      domain: 'TIU',
      intent: 'CREATE_NOTE_DRAFT',
      payloadJson: {
        dfn: instance.patientDfn,
        titleIen,
        text,
        visitStr,
      },
      idempotencyKey: `workflow:${instance.id}:${stepId}:${createHash('sha256').update(`${titleIen}:${text}`).digest('hex').slice(0, 16)}`,
      status: 'pending',
      createdAt: new Date().toISOString(),
      createdBy: actorDuz,
      correlationId: `workflow-step:${instance.id}:${stepId}`,
      attemptCount: 0,
    };

    const result = await tiuExecutor.execute(command);
    return {
      mode: 'tiu_draft',
      status: 'completed',
      targetRpc,
      message: result.resultSummary,
      rpcUsed: ['TIU CREATE RECORD', 'TIU SET DOCUMENT TEXT'],
      docIen: result.vistaRefs.docIen,
      resultSummary: result.resultSummary,
    };
  } catch (error) {
    return {
      mode: 'tiu_draft',
      status: 'failed',
      targetRpc,
      message: error instanceof Error ? safeErr(error) : 'TIU workflow execution failed',
      rpcUsed: ['TIU CREATE RECORD', 'TIU SET DOCUMENT TEXT'],
    };
  }
}

function advanceRuntimeSteps(
  instance: WorkflowInstance,
  stepId: string,
  action: 'complete' | 'skip',
  actorDuz?: string,
  notes?: string
): WorkflowInstance | null {
  if (instance.status !== 'in_progress') return null;
  const stepIndex = instance.steps.findIndex((step) => step.stepId === stepId);
  if (stepIndex === -1) return null;

  const step = instance.steps[stepIndex];
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

  const nextPending = instance.steps.find((candidate) => candidate.status === 'pending');
  if (nextPending) {
    nextPending.status = 'active';
  } else if (instance.steps.every((candidate) => candidate.status === 'completed' || candidate.status === 'skipped')) {
    instance.status = 'completed';
    instance.completedAt = new Date().toISOString();
  }

  return instance;
}

export async function workflowRoutes(server: FastifyInstance): Promise<void> {
  // -- Definitions ------------------------------------------------
  server.get('/admin/workflows/definitions', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { department } = request.query as any;
    await ensureSeededDefinitions(tenantId);
    const defs = isPgConfigured()
      ? await pgWorkflowRepo.listWorkflowDefinitions(tenantId, department)
      : listDefinitions(tenantId, department);
    return { ok: true, definitions: defs, count: defs.length };
  });

  server.get('/admin/workflows', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { department } = request.query as any;
    await ensureSeededDefinitions(tenantId);
    const defs = isPgConfigured()
      ? await pgWorkflowRepo.listWorkflowDefinitions(tenantId, department)
      : listDefinitions(tenantId, department);
    return { ok: true, definitions: defs, count: defs.length };
  });

  server.post('/admin/workflows', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    if (!body.department || !body.name || !body.steps) {
      return reply.code(400).send({ ok: false, error: 'department, name, steps required' });
    }
    const def = isPgConfigured()
      ? await pgWorkflowRepo.insertWorkflowDefinition({
          id: randomUUID(),
          tenantId,
          department: body.department,
          name: body.name,
          description: body.description || '',
          version: 1,
          status: 'draft',
          steps: body.steps,
          tags: body.tags || [],
          createdBy: session.duz,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
      : createDefinition(body, tenantId, session.duz);
    return { ok: true, definition: def };
  });

  // -- Seed & Packs ----------------------------------------------
  server.post('/admin/workflows/seed', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;

    const result = isPgConfigured()
      ? { seeded: await ensureSeededDefinitions(tenantId), departments: getAllDepartmentPacks().length }
      : seedDepartmentPacks(tenantId);
    return { ok: true, ...result };
  });

  server.get('/admin/workflows/packs', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    return { ok: true, packs: buildPackSummaries(), count: getAllDepartmentPacks().length };
  });

  server.get('/admin/workflows/stats', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;

    await ensureSeededDefinitions(tenantId);
    const definitions = isPgConfigured()
      ? await pgWorkflowRepo.listWorkflowDefinitions(tenantId)
      : listDefinitions(tenantId);
    const instances = isPgConfigured()
      ? await pgWorkflowRepo.listWorkflowInstances(tenantId)
      : listInstances(tenantId);
    const stats = buildWorkflowStatsPayload(definitions, instances);
    return { ok: true, stats };
  });

  server.get('/admin/workflows/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    const def = isPgConfigured()
      ? await pgWorkflowRepo.findWorkflowDefinitionById(id, tenantId)
      : getDefinition(id);
    if (!def) return reply.code(404).send({ ok: false, error: 'Definition not found' });
    return { ok: true, definition: def };
  });

  server.post('/admin/workflows/:id/activate', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    const def = isPgConfigured()
      ? await pgWorkflowRepo.updateWorkflowDefinition(id, tenantId, { status: 'active' })
      : activateDefinition(id);
    if (!def) return reply.code(400).send({ ok: false, error: 'Cannot activate' });
    return { ok: true, definition: def };
  });

  server.post('/admin/workflows/:id/archive', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    requireRole(session, ['admin'], reply);
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    const def = isPgConfigured()
      ? await pgWorkflowRepo.updateWorkflowDefinition(id, tenantId, { status: 'archived' })
      : archiveDefinition(id);
    if (!def) return reply.code(400).send({ ok: false, error: 'Cannot archive' });
    return { ok: true, definition: def };
  });

  // -- Instances -------------------------------------------------
  server.post('/workflows/start', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const body = (request.body as any) || {};
    const { definitionId, patientDfn, encounterRef, queueTicketId } = body;
    if (!definitionId || !patientDfn) {
      return reply.code(400).send({ ok: false, error: 'definitionId and patientDfn required' });
    }
    let inst: WorkflowInstance | null = null;
    if (isPgConfigured()) {
      const definition = await pgWorkflowRepo.findWorkflowDefinitionById(definitionId, tenantId);
      if (definition) {
        inst = await pgWorkflowRepo.insertWorkflowInstance({
          id: randomUUID(),
          tenantId,
          definitionId,
          department: definition.department,
          patientDfn,
          encounterRef,
          queueTicketId,
          status: 'in_progress',
          steps: buildRuntimeSteps(definition),
          startedBy: session.duz,
          startedAt: new Date().toISOString(),
        });
      }
    } else {
      inst = startWorkflow(definitionId, patientDfn, tenantId, session.duz, encounterRef, queueTicketId);
    }
    if (!inst) return reply.code(400).send({ ok: false, error: 'Definition not found' });
    return { ok: true, instance: inst };
  });

  server.get('/workflows/instances', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { department, status } = request.query as any;
    const insts = isPgConfigured()
      ? await pgWorkflowRepo.listWorkflowInstances(
          tenantId,
          department,
          status as WorkflowInstanceStatus | undefined
        )
      : listInstances(tenantId, department, status);
    return { ok: true, instances: insts, count: insts.length };
  });

  server.get('/workflows/instances/:id', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    const inst = isPgConfigured()
      ? await pgWorkflowRepo.findWorkflowInstanceById(id, tenantId)
      : getInstance(id);
    if (!inst) return reply.code(404).send({ ok: false, error: 'Instance not found' });
    return { ok: true, instance: inst };
  });

  server.post('/workflows/instances/:id/step/:stepId', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id, stepId } = request.params as any;
    const body = (request.body as any) || {};
    const action = body.action === 'skip' ? 'skip' : 'complete';
    let inst: WorkflowInstance | null = null;
    if (isPgConfigured()) {
      const existing = await pgWorkflowRepo.findWorkflowInstanceById(id, tenantId);
      if (existing) {
        const definition = await pgWorkflowRepo.findWorkflowDefinitionById(existing.definitionId, tenantId);
        const mutable: WorkflowInstance = {
          ...existing,
          steps: existing.steps.map((step) => ({ ...step })),
        };
        const advanced = advanceRuntimeSteps(mutable, stepId, action, session.duz, body.notes);
        if (advanced) {
          if (action === 'complete') {
            const integrationOutcome = await executeStepIntegration(
              definition,
              existing,
              stepId,
              session.duz,
              body
            );
            if (integrationOutcome) {
              const advancedStep = advanced.steps.find((step) => step.stepId === stepId);
              if (advancedStep) {
                advancedStep.integrationOutcome = integrationOutcome;
              }
            }
          }
          inst =
            (await pgWorkflowRepo.updateWorkflowInstance(id, tenantId, {
              status: advanced.status,
              steps: advanced.steps,
              completedAt: advanced.completedAt || null,
            })) || null;
        }
      }
    } else {
      const existing = getInstance(id);
      const definition = existing ? getDefinition(existing.definitionId) : undefined;
      inst = advanceStep(id, stepId, action, session.duz, body.notes);
      if (inst && action === 'complete') {
        const integrationOutcome = await executeStepIntegration(
          definition,
          inst,
          stepId,
          session.duz,
          body
        );
        if (integrationOutcome) {
          const advancedStep = inst.steps.find((step) => step.stepId === stepId);
          if (advancedStep) advancedStep.integrationOutcome = integrationOutcome;
        }
      }
    }
    if (!inst) return reply.code(400).send({ ok: false, error: 'Cannot advance step' });
    const advancedStep = inst.steps.find((step) => step.stepId === stepId);
    return { ok: true, instance: inst, integration: advancedStep?.integrationOutcome };
  });

  server.post('/workflows/instances/:id/cancel', async (request, reply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const tenantId = requireTenantId(request, reply, session);
    if (!tenantId) return;
    const { id } = request.params as any;
    let inst: WorkflowInstance | null = null;
    if (isPgConfigured()) {
      const existing = await pgWorkflowRepo.findWorkflowInstanceById(id, tenantId);
      if (existing && existing.status !== 'completed' && existing.status !== 'cancelled') {
        inst =
          (await pgWorkflowRepo.updateWorkflowInstance(id, tenantId, {
            status: 'cancelled',
            completedAt: new Date().toISOString(),
          })) || null;
      }
    } else {
      inst = cancelWorkflow(id);
    }
    if (!inst) return reply.code(400).send({ ok: false, error: 'Cannot cancel' });
    return { ok: true, instance: inst };
  });
}
