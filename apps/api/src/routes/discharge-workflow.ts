/**
 * Phase 168: Discharge Workflow Routes
 *
 * Structured discharge planning that pulls data from multiple VistA
 * subsystems and assembles a discharge checklist. Integrates with
 * existing ADT routes for census/movement data.
 *
 * VistA-first reads:
 *   - ORWPS ACTIVE (active meds for discharge med list)
 *   - ORQQAL LIST (allergies for discharge summary)
 *   - ORQQVI VITALS (last vitals for stability check)
 *   - TIU DOCUMENTS BY CONTEXT (existing notes)
 *
 * Integration-pending writes:
 *   - DG ADT DISCHARGE (VistA ADT movement)
 *   - TIU CREATE RECORD (discharge summary note)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { safeCallRpc } from '../lib/rpc-resilience.js';
import { log } from '../lib/logger.js';
import { createHash, randomUUID } from 'node:crypto';
import { tiuExecutor } from '../writeback/executors/tiu-executor.js';
import type { ClinicalCommand } from '../writeback/types.js';
import {
  buildMedRecSummaryText,
  getMedRecSessionById,
  type MedRecSession,
} from './med-reconciliation.js';

// ── Types ───────────────────────────────────────────────────

export type DischargeChecklistItemStatus = 'pending' | 'completed' | 'not-applicable' | 'blocked';

export interface DischargeChecklistItem {
  id: string;
  category: 'medication' | 'follow-up' | 'education' | 'documentation' | 'safety';
  title: string;
  description: string;
  status: DischargeChecklistItemStatus;
  completedBy?: string;
  completedAt?: string;
  vistaRpc?: string;
  vistaStatus?: 'live' | 'integration-pending';
}

export interface DischargePlan {
  id: string;
  tenantId: string;
  patientDfn: string;
  duz: string;
  status: 'planning' | 'ready' | 'completed' | 'cancelled';
  admissionDate?: string;
  targetDischargeDate?: string;
  dischargeDisposition?: string;
  checklist: DischargeChecklistItem[];
  medRecSessionId?: string;
  followUpInstructions: string[];
  patientEducation: string[];
  summaryNote?: {
    mode: 'tiu_draft';
    titleIen: string;
    docIen: string;
    resultSummary: string;
    createdAt: string;
  };
  createdAt: string;
  completedAt?: string;
}

// ── In-memory store (migration target: VistA DG ADT) ────────

const dischargePlans = new Map<string, DischargePlan>();
const DISCHARGE_TTL_MS = 24 * 60 * 60 * 1000; // 24h
const DISCHARGE_MAX_SIZE = 500;

export function getDischargePlanCount(): number {
  return dischargePlans.size;
}

/** Evict completed/stale plans older than TTL */
function evictStaleDischargePlans(): void {
  const now = Date.now();
  for (const [id, p] of dischargePlans) {
    const age = now - new Date(p.createdAt).getTime();
    if (age > DISCHARGE_TTL_MS || (p.status === 'completed' && age > 60 * 60 * 1000)) {
      dischargePlans.delete(id);
    }
  }
  if (dischargePlans.size > DISCHARGE_MAX_SIZE) {
    const oldest = [...dischargePlans.entries()].sort(
      (a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime()
    );
    while (dischargePlans.size > DISCHARGE_MAX_SIZE && oldest.length) {
      dischargePlans.delete(oldest.shift()![0]);
    }
  }
}

const _dischCleanup = setInterval(evictStaleDischargePlans, 60 * 60 * 1000);
_dischCleanup.unref();

// ── Default checklist template ──────────────────────────────

function buildDefaultChecklist(): DischargeChecklistItem[] {
  return [
    {
      id: randomUUID(),
      category: 'medication',
      title: 'Medication Reconciliation',
      description: 'Complete inpatient-to-outpatient medication reconciliation',
      status: 'pending',
      vistaRpc: 'PSO UPDATE MED LIST',
      vistaStatus: 'integration-pending',
    },
    {
      id: randomUUID(),
      category: 'medication',
      title: 'Discharge Prescriptions',
      description: 'E-prescribe or print discharge medications',
      status: 'pending',
      vistaRpc: 'ORWDX SAVE',
      vistaStatus: 'integration-pending',
    },
    {
      id: randomUUID(),
      category: 'follow-up',
      title: 'Follow-up Appointment',
      description: 'Schedule follow-up appointment within 7-14 days',
      status: 'pending',
      vistaRpc: 'SDES CREATE APPOINTMENT',
      vistaStatus: 'integration-pending',
    },
    {
      id: randomUUID(),
      category: 'follow-up',
      title: 'Specialist Referrals',
      description: 'Complete any pending specialist referrals',
      status: 'pending',
    },
    {
      id: randomUUID(),
      category: 'documentation',
      title: 'Discharge Summary',
      description: 'Complete discharge summary TIU note',
      status: 'pending',
      vistaRpc: 'TIU CREATE RECORD',
      vistaStatus: 'integration-pending',
    },
    {
      id: randomUUID(),
      category: 'documentation',
      title: 'Final Vitals',
      description: 'Record final set of vitals before discharge',
      status: 'pending',
      vistaRpc: 'GMV ADD VM',
      vistaStatus: 'live',
    },
    {
      id: randomUUID(),
      category: 'education',
      title: 'Patient Education',
      description: 'Provide disease-specific education materials',
      status: 'pending',
    },
    {
      id: randomUUID(),
      category: 'education',
      title: 'Medication Instructions',
      description: 'Review new and changed medications with patient',
      status: 'pending',
    },
    {
      id: randomUUID(),
      category: 'safety',
      title: 'Fall Risk Assessment',
      description: 'Complete discharge fall risk assessment',
      status: 'pending',
    },
    {
      id: randomUUID(),
      category: 'safety',
      title: 'Transport Arranged',
      description: 'Confirm patient transportation is arranged',
      status: 'pending',
    },
  ];
}

function getChecklistItem(plan: DischargePlan, title: string): DischargeChecklistItem | undefined {
  return plan.checklist.find((item) => item.title === title);
}

function getScopedMedRecSession(
  medRecSessionId: string | undefined,
  tenantId: string,
  patientDfn: string
): MedRecSession | undefined {
  if (!medRecSessionId) return undefined;
  const medRec = getMedRecSessionById(medRecSessionId);
  if (!medRec) return undefined;
  if (medRec.tenantId !== tenantId || medRec.patientDfn !== patientDfn) return undefined;
  return medRec;
}

function syncMedRecChecklist(plan: DischargePlan): { linked: boolean; completed: boolean } {
  const medRec = getScopedMedRecSession(plan.medRecSessionId, plan.tenantId, plan.patientDfn);
  const item = getChecklistItem(plan, 'Medication Reconciliation');
  if (!item || !medRec) {
    return { linked: false, completed: false };
  }
  if (medRec.status === 'completed' && item.status !== 'completed') {
    item.status = 'completed';
    item.completedAt = medRec.completedAt || new Date().toISOString();
    item.completedBy = medRec.duz;
  }
  return { linked: true, completed: item.status === 'completed' };
}

function buildDischargeSummaryText(
  plan: DischargePlan,
  medRec: MedRecSession | undefined,
  additionalNote?: string
): string {
  const lines: string[] = [
    'DISCHARGE PREPARATION SUMMARY',
    '',
    `Patient DFN: ${plan.patientDfn}`,
    `Plan ID: ${plan.id}`,
    `Status: ${plan.status}`,
  ];

  if (plan.targetDischargeDate) {
    lines.push(`Target Discharge Date: ${plan.targetDischargeDate}`);
  }
  if (plan.dischargeDisposition) {
    lines.push(`Disposition: ${plan.dischargeDisposition}`);
  }

  lines.push('', 'CHECKLIST STATUS');
  for (const item of plan.checklist) {
    lines.push(`- [${item.status}] ${item.title}: ${item.description}`);
  }

  lines.push('', 'FOLLOW-UP INSTRUCTIONS');
  if (plan.followUpInstructions.length === 0) {
    lines.push('- None recorded');
  } else {
    for (const instruction of plan.followUpInstructions) {
      lines.push(`- ${instruction}`);
    }
  }

  lines.push('', 'PATIENT EDUCATION');
  if (plan.patientEducation.length === 0) {
    lines.push('- None recorded');
  } else {
    for (const education of plan.patientEducation) {
      lines.push(`- ${education}`);
    }
  }

  if (medRec) {
    lines.push('', buildMedRecSummaryText(medRec));
  }

  if (additionalNote && additionalNote.trim()) {
    lines.push('', 'CLINICIAN NOTE', additionalNote.trim());
  }

  return lines.join('\n');
}

async function createDischargeSummaryNote(options: {
  tenantId: string;
  patientDfn: string;
  actorDuz: string;
  titleIen: string;
  text: string;
  visitStr?: string;
  correlationId: string;
}): Promise<{ docIen: string; resultSummary: string; titleIen: string }> {
  const command: ClinicalCommand = {
    id: randomUUID(),
    tenantId: options.tenantId,
    patientRefHash: createHash('sha256').update(options.patientDfn).digest('hex'),
    domain: 'TIU',
    intent: 'CREATE_NOTE_DRAFT',
    payloadJson: {
      dfn: options.patientDfn,
      titleIen: options.titleIen,
      text: options.text,
      visitStr: options.visitStr || '',
    },
    idempotencyKey: `discharge:${options.correlationId}:${createHash('sha256').update(`${options.titleIen}:${options.text}`).digest('hex').slice(0, 16)}`,
    status: 'pending',
    createdAt: new Date().toISOString(),
    createdBy: options.actorDuz,
    correlationId: options.correlationId,
    attemptCount: 0,
  };

  const result = await tiuExecutor.execute(command);
  return {
    docIen: String(result.vistaRefs.docIen || ''),
    resultSummary: result.resultSummary,
    titleIen: options.titleIen,
  };
}

// ── Routes ──────────────────────────────────────────────────

export default async function dischargeWorkflowRoutes(server: FastifyInstance) {
  // POST /vista/discharge/plan — create a discharge plan
  server.post('/vista/discharge/plan', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = (request.body as any) || {};
    const dfn = body.dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: 'dfn required' });
    const medRecSessionId = body.medRecSessionId ? String(body.medRecSessionId).trim() : undefined;
    if (medRecSessionId) {
      const medRec = getScopedMedRecSession(medRecSessionId, session.tenantId, dfn);
      if (!medRec) {
        return reply.code(404).send({
          ok: false,
          error: 'Medication reconciliation session not found for this patient and tenant',
        });
      }
    }

    // Pull current VistA data for plan context
    const rpcUsed: string[] = [];
    try {
      await safeCallRpc('ORQQVI VITALS', [dfn]);
      rpcUsed.push('ORQQVI VITALS');
    } catch {
      /* VistA unavailable */
    }

    const plan: DischargePlan = {
      id: randomUUID(),
      tenantId: session.tenantId,
      patientDfn: dfn,
      duz: session.duz,
      status: 'planning',
      targetDischargeDate: body.targetDate || undefined,
      dischargeDisposition: body.disposition || undefined,
      checklist: buildDefaultChecklist(),
      medRecSessionId,
      followUpInstructions: [],
      patientEducation: [],
      createdAt: new Date().toISOString(),
    };

    const medRecStatus = syncMedRecChecklist(plan);

    dischargePlans.set(plan.id, plan);

    return {
      ok: true,
      plan: {
        id: plan.id,
        status: plan.status,
        medRecLinked: medRecStatus.linked,
        medRecCompleted: medRecStatus.completed,
        checklistCount: plan.checklist.length,
        checklistPending: plan.checklist.filter((c) => c.status === 'pending').length,
      },
      rpcUsed,
      vistaGrounding: {
        vistaFiles: ['DG(405)', 'DG(405.1)'],
        targetRoutines: ['DGADT', 'DGPMV'],
        targetRpc: ['DG ADT DISCHARGE'],
        migrationPath: 'Phase 168+ — DG ADT DISCHARGE when ADT write RPCs confirmed',
        sandboxNote: 'Discharge plan is local; VistA ADT movement is integration-pending',
      },
    };
  });

  // GET /vista/discharge/plan/:id — get discharge plan detail
  server.get('/vista/discharge/plan/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const plan = dischargePlans.get(id);
    if (!plan) return reply.code(404).send({ ok: false, error: 'Plan not found' });
    if (plan.tenantId !== session.tenantId)
      return reply.code(403).send({ ok: false, error: 'Forbidden' });
    const medRecStatus = syncMedRecChecklist(plan);
    return {
      ok: true,
      plan,
      medRecStatus,
    };
  });

  // PATCH /vista/discharge/plan/:id — update discharge planning metadata
  server.patch('/vista/discharge/plan/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const plan = dischargePlans.get(id);
    if (!plan) return reply.code(404).send({ ok: false, error: 'Plan not found' });
    if (plan.tenantId !== session.tenantId) {
      return reply.code(403).send({ ok: false, error: 'Forbidden' });
    }

    const body = (request.body as any) || {};
    if (body.targetDate !== undefined) {
      plan.targetDischargeDate = body.targetDate ? String(body.targetDate).trim() : undefined;
    }
    if (body.disposition !== undefined) {
      plan.dischargeDisposition = body.disposition ? String(body.disposition).trim() : undefined;
    }
    if (Array.isArray(body.followUpInstructions)) {
      plan.followUpInstructions = body.followUpInstructions
        .map((item: unknown) => String(item || '').trim())
        .filter(Boolean);
    }
    if (Array.isArray(body.patientEducation)) {
      plan.patientEducation = body.patientEducation
        .map((item: unknown) => String(item || '').trim())
        .filter(Boolean);
    }
    if (body.medRecSessionId !== undefined) {
      const medRecSessionId = body.medRecSessionId ? String(body.medRecSessionId).trim() : undefined;
      if (medRecSessionId) {
        const medRec = getScopedMedRecSession(medRecSessionId, session.tenantId, plan.patientDfn);
        if (!medRec) {
          return reply.code(404).send({
            ok: false,
            error: 'Medication reconciliation session not found for this patient and tenant',
          });
        }
        plan.medRecSessionId = medRecSessionId;
      } else {
        plan.medRecSessionId = undefined;
      }
    }

    const medRecStatus = syncMedRecChecklist(plan);
    return { ok: true, plan, medRecStatus };
  });

  // PUT /vista/discharge/plan/:id/checklist/:itemId — update checklist item
  server.put(
    '/vista/discharge/plan/:id/checklist/:itemId',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { id, itemId } = request.params as any;
      const plan = dischargePlans.get(id);
      if (!plan) return reply.code(404).send({ ok: false, error: 'Plan not found' });
      if (plan.tenantId !== session.tenantId)
        return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const body = (request.body as any) || {};
      const item = plan.checklist.find((c) => c.id === itemId);
      if (!item) return reply.code(404).send({ ok: false, error: 'Checklist item not found' });

      const validStatuses: DischargeChecklistItemStatus[] = [
        'pending',
        'completed',
        'not-applicable',
        'blocked',
      ];
      if (body.status && !validStatuses.includes(body.status)) {
        return reply
          .code(400)
          .send({ ok: false, error: `Invalid status. Valid: ${validStatuses.join(', ')}` });
      }

      if (body.status) {
        item.status = body.status;
        if (body.status === 'completed') {
          item.completedBy = session.duz;
          item.completedAt = new Date().toISOString();
        }
      }

      syncMedRecChecklist(plan);

      const pending = plan.checklist.filter((c) => c.status === 'pending').length;
      const completed = plan.checklist.filter((c) => c.status === 'completed').length;

      return {
        ok: true,
        item,
        summary: { pending, completed, total: plan.checklist.length },
      };
    }
  );

  // POST /vista/discharge/plan/:id/ready — mark plan as ready for discharge
  server.post(
    '/vista/discharge/plan/:id/ready',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { id } = request.params as any;
      const plan = dischargePlans.get(id);
      if (!plan) return reply.code(404).send({ ok: false, error: 'Plan not found' });
      if (plan.tenantId !== session.tenantId)
        return reply.code(403).send({ ok: false, error: 'Forbidden' });

      const blocked = plan.checklist.filter((c) => c.status === 'blocked');
      const pending = plan.checklist.filter((c) => c.status === 'pending');
      const medRecStatus = syncMedRecChecklist(plan);

      if (!medRecStatus.completed) {
        return reply.code(409).send({
          ok: false,
          error: 'Medication reconciliation must be completed before discharge can be marked ready',
          medRecStatus,
        });
      }

      if (blocked.length > 0) {
        return reply.code(409).send({
          ok: false,
          error: 'Cannot mark ready — blocked items exist',
          blockedItems: blocked.map((b) => b.title),
        });
      }

      if (pending.length > 0) {
        // Warning but allow — some items may be intentionally deferred
        log.warn('Discharge plan marked ready with pending items', {
          planId: id,
          pendingCount: pending.length,
        });
      }

      plan.status = 'ready';

      return {
        ok: true,
        status: 'ready',
        warnings: pending.length > 0 ? [`${pending.length} item(s) still pending`] : [],
        medRecStatus,
        vistaGrounding: {
          targetRpc: ['DG ADT DISCHARGE'],
          status: 'integration-pending',
          nextSteps: ['Execute VistA ADT discharge movement when ready'],
        },
      };
    }
  );

  // POST /vista/discharge/plan/:id/complete — complete discharge
  server.post(
    '/vista/discharge/plan/:id/complete',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { id } = request.params as any;
      const plan = dischargePlans.get(id);
      if (!plan) return reply.code(404).send({ ok: false, error: 'Plan not found' });
      if (plan.tenantId !== session.tenantId)
        return reply.code(403).send({ ok: false, error: 'Forbidden' });

      if (plan.status !== 'ready') {
        return reply
          .code(409)
          .send({ ok: false, error: "Plan must be in 'ready' state to complete" });
      }

      const medRec = getScopedMedRecSession(plan.medRecSessionId, plan.tenantId, plan.patientDfn);
      const documentation = (request.body as any)?.documentation || {};
      const noteRequested =
        documentation.createNote === true ||
        documentation.titleIen !== undefined ||
        documentation.text !== undefined ||
        documentation.additionalNote !== undefined ||
        documentation.visitStr !== undefined;
      const rpcUsed: string[] = [];

      if (noteRequested) {
        const titleIen = String(documentation.titleIen || '10').trim() || '10';
        const noteText =
          String(documentation.text || '').trim() ||
          buildDischargeSummaryText(plan, medRec, String(documentation.additionalNote || ''));

        try {
          const note = await createDischargeSummaryNote({
            tenantId: plan.tenantId,
            patientDfn: plan.patientDfn,
            actorDuz: session.duz,
            titleIen,
            text: noteText,
            visitStr: String(documentation.visitStr || '').trim(),
            correlationId: `discharge-complete:${plan.id}`,
          });
          plan.summaryNote = {
            mode: 'tiu_draft',
            titleIen: note.titleIen,
            docIen: note.docIen,
            resultSummary: note.resultSummary,
            createdAt: new Date().toISOString(),
          };
          const summaryItem = getChecklistItem(plan, 'Discharge Summary');
          if (summaryItem) {
            summaryItem.status = 'completed';
            summaryItem.completedBy = session.duz;
            summaryItem.completedAt = plan.summaryNote.createdAt;
          }
          rpcUsed.push('TIU CREATE RECORD', 'TIU SET DOCUMENT TEXT');
        } catch (error: any) {
          return reply.code(502).send({
            ok: false,
            error: 'Failed to create discharge TIU summary note',
            detail: error?.message || 'Unknown TIU error',
            rpcUsed: ['TIU CREATE RECORD', 'TIU SET DOCUMENT TEXT'],
          });
        }
      }

      plan.status = 'completed';
      plan.completedAt = new Date().toISOString();

      return {
        ok: true,
        status: 'completed',
        completedAt: plan.completedAt,
        rpcUsed,
        documentation: plan.summaryNote
          ? {
              status: 'completed',
              mode: plan.summaryNote.mode,
              titleIen: plan.summaryNote.titleIen,
              docIen: plan.summaryNote.docIen,
              resultSummary: plan.summaryNote.resultSummary,
            }
          : {
              status: 'not_requested',
              mode: 'none',
            },
        vistaGrounding: {
          targetRpc: ['DG ADT DISCHARGE', 'TIU CREATE RECORD'],
          status: 'integration-pending',
          nextSteps: [
            'Record VistA ADT discharge movement',
            noteRequested
              ? 'TIU discharge-prep note created; DG ADT discharge movement remains pending in VEHU.'
              : 'Auto-generate discharge summary TIU note',
          ],
        },
      };
    }
  );

  // GET /vista/discharge/plans — list discharge plans
  server.get('/vista/discharge/plans', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const dfn = (request.query as any).dfn;

    let plans = Array.from(dischargePlans.values()).filter((p) => p.tenantId === session.tenantId);
    if (dfn) plans = plans.filter((p) => p.patientDfn === dfn);

    return {
      ok: true,
      plans: plans.map((p) => ({
        id: p.id,
        status: p.status,
        pending: p.checklist.filter((c) => c.status === 'pending').length,
        completed: p.checklist.filter((c) => c.status === 'completed').length,
        createdAt: p.createdAt,
      })),
      total: plans.length,
    };
  });
}
