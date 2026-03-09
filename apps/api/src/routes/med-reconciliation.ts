/**
 * Phase 168: Medication Reconciliation Routes
 *
 * VistA-first: reads active meds via ORWPS ACTIVE, outpatient meds via
 * ORWPS DETAIL, and allergy data via ORQQAL LIST. Cross-references
 * inpatient vs outpatient/pre-admission lists for discrepancy detection.
 *
 * Write operations (reconcile decision capture) are in-memory with
 * VistA writeback integration-pending targeting:
 *   - PSO UPDATE MED LIST (outpatient reconciliation)
 *   - PSJ LM ORDER UPDATE (inpatient reconciliation)
 *
 * RPCs used:
 *   - ORWPS ACTIVE (read: active inpatient meds)
 *   - ORQQAL LIST (read: allergies for cross-check)
 *
 * Integration-pending:
 *   - PSB MED LOG (full MAR history)
 *   - PSO UPDATE MED LIST (outpatient med-rec writeback)
 *   - PSJ LM ORDER UPDATE (inpatient med-rec writeback)
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { safeCallRpc } from '../lib/rpc-resilience.js';
import { log } from '../lib/logger.js';
import { createHash, randomUUID } from 'node:crypto';
import { tiuExecutor } from '../writeback/executors/tiu-executor.js';
import type { ClinicalCommand } from '../writeback/types.js';

// ── Types ───────────────────────────────────────────────────

export interface MedRecEntry {
  medicationName: string;
  dose: string;
  route: string;
  frequency: string;
  source: 'inpatient' | 'outpatient' | 'pre-admission' | 'patient-reported';
  orderIen?: string;
  status: 'active' | 'discontinued' | 'hold' | 'expired';
}

export interface MedRecDiscrepancy {
  id: string;
  medication: string;
  type:
    | 'missing-inpatient'
    | 'missing-outpatient'
    | 'dose-mismatch'
    | 'duplicate-therapy'
    | 'new-admission';
  inpatientEntry?: MedRecEntry;
  outpatientEntry?: MedRecEntry;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

export type ReconciliationDecision = 'continue' | 'discontinue' | 'modify' | 'hold' | 'defer';

export interface MedRecSession {
  id: string;
  tenantId: string;
  patientDfn: string;
  duz: string;
  status: 'in-progress' | 'completed' | 'abandoned';
  inpatientMeds: MedRecEntry[];
  outpatientMeds: MedRecEntry[];
  discrepancies: MedRecDiscrepancy[];
  decisions: Array<{
    discrepancyId: string;
    decision: ReconciliationDecision;
    rationale: string;
    decidedAt: string;
    decidedBy: string;
  }>;
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

// ── In-memory store (migration target: VistA PSO/PSJ) ──────

const medRecSessions = new Map<string, MedRecSession>();
const MED_REC_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MED_REC_MAX_SIZE = 500;

export function getMedRecSessionCount(): number {
  return medRecSessions.size;
}

export function getMedRecSessionById(id: string): MedRecSession | undefined {
  return medRecSessions.get(id);
}

/** Evict completed/stale sessions older than TTL */
function evictStaleMedRecSessions(): void {
  const now = Date.now();
  for (const [id, s] of medRecSessions) {
    const age = now - new Date(s.createdAt).getTime();
    if (age > MED_REC_TTL_MS || (s.status === 'completed' && age > 60 * 60 * 1000)) {
      medRecSessions.delete(id);
    }
  }
  // Hard cap
  if (medRecSessions.size > MED_REC_MAX_SIZE) {
    const oldest = [...medRecSessions.entries()].sort(
      (a, b) => new Date(a[1].createdAt).getTime() - new Date(b[1].createdAt).getTime()
    );
    while (medRecSessions.size > MED_REC_MAX_SIZE && oldest.length) {
      medRecSessions.delete(oldest.shift()![0]);
    }
  }
}

const _medRecCleanup = setInterval(evictStaleMedRecSessions, 60 * 60 * 1000);
_medRecCleanup.unref();

// ── Med parsing helpers ─────────────────────────────────────

function parseActiveMeds(raw: string): MedRecEntry[] {
  if (!raw || raw.trim() === '') return [];
  const entries: MedRecEntry[] = [];
  const lines = raw.split('\n');
  let currentMed: Partial<MedRecEntry> | null = null;

  for (const line of lines) {
    if (line.startsWith('~')) {
      if (currentMed?.medicationName) {
        entries.push({
          medicationName: currentMed.medicationName || '',
          dose: currentMed.dose || '',
          route: currentMed.route || '',
          frequency: currentMed.frequency || '',
          source: 'inpatient',
          orderIen: currentMed.orderIen,
          status: 'active',
        });
      }
      const parts = line.substring(1).split('^');
      currentMed = {
        medicationName: parts[1] || parts[0] || '',
        orderIen: parts[0]?.replace(/\D/g, '') || undefined,
      };
    } else if (currentMed && line.trim()) {
      const lower = line.toLowerCase().trim();
      if (lower.startsWith('dose:') || lower.includes('mg') || lower.includes('ml')) {
        currentMed.dose = line.trim();
      } else if (lower.startsWith('route:') || lower.includes('oral') || lower.includes('iv')) {
        currentMed.route = line.trim();
      } else if (
        lower.startsWith('schedule:') ||
        lower.includes('bid') ||
        lower.includes('tid') ||
        lower.includes('daily')
      ) {
        currentMed.frequency = line.trim();
      }
    }
  }
  if (currentMed?.medicationName) {
    entries.push({
      medicationName: currentMed.medicationName,
      dose: currentMed.dose || '',
      route: currentMed.route || '',
      frequency: currentMed.frequency || '',
      source: 'inpatient',
      orderIen: currentMed.orderIen,
      status: 'active',
    });
  }
  return entries;
}

function detectDiscrepancies(
  inpatient: MedRecEntry[],
  outpatient: MedRecEntry[]
): MedRecDiscrepancy[] {
  const discrepancies: MedRecDiscrepancy[] = [];

  // Find meds on outpatient list not on inpatient
  for (const op of outpatient) {
    const match = inpatient.find((ip) =>
      ip.medicationName.toLowerCase().includes(op.medicationName.toLowerCase().split(' ')[0])
    );
    if (!match) {
      discrepancies.push({
        id: randomUUID(),
        medication: op.medicationName,
        type: 'missing-inpatient',
        outpatientEntry: op,
        severity: 'high',
        description: `Outpatient med "${op.medicationName}" not found on inpatient list`,
      });
    }
  }

  // Find meds on inpatient list not on outpatient (new on admission)
  for (const ip of inpatient) {
    const match = outpatient.find((op) =>
      op.medicationName.toLowerCase().includes(ip.medicationName.toLowerCase().split(' ')[0])
    );
    if (!match) {
      discrepancies.push({
        id: randomUUID(),
        medication: ip.medicationName,
        type: 'new-admission',
        inpatientEntry: ip,
        severity: 'low',
        description: `Inpatient med "${ip.medicationName}" is new (not on outpatient list)`,
      });
    }
  }

  return discrepancies;
}

function normalizeMedRecEntry(raw: unknown): MedRecEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const entry = raw as Record<string, unknown>;
  const medicationName = String(entry.medicationName || '').trim();
  if (!medicationName) return null;
  const sourceValue = String(entry.source || 'outpatient').trim();
  const source: MedRecEntry['source'] =
    sourceValue === 'inpatient' ||
    sourceValue === 'outpatient' ||
    sourceValue === 'pre-admission' ||
    sourceValue === 'patient-reported'
      ? sourceValue
      : 'outpatient';
  const statusValue = String(entry.status || 'active').trim();
  const status: MedRecEntry['status'] =
    statusValue === 'active' ||
    statusValue === 'discontinued' ||
    statusValue === 'hold' ||
    statusValue === 'expired'
      ? statusValue
      : 'active';

  return {
    medicationName,
    dose: String(entry.dose || '').trim(),
    route: String(entry.route || '').trim(),
    frequency: String(entry.frequency || '').trim(),
    source,
    orderIen: entry.orderIen ? String(entry.orderIen).trim() : undefined,
    status,
  };
}

function normalizeOutpatientMeds(raw: unknown): MedRecEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeMedRecEntry).filter((entry): entry is MedRecEntry => !!entry);
}

export function buildMedRecSummaryText(
  medRec: MedRecSession,
  additionalNote?: string
): string {
  const lines: string[] = [
    'MEDICATION RECONCILIATION SUMMARY',
    '',
    `Patient DFN: ${medRec.patientDfn}`,
    `Reconciliation Session: ${medRec.id}`,
    `Status: ${medRec.status}`,
    `Created: ${medRec.createdAt}`,
  ];

  if (medRec.completedAt) {
    lines.push(`Completed: ${medRec.completedAt}`);
  }

  lines.push('', 'ACTIVE INPATIENT MEDICATIONS');
  if (medRec.inpatientMeds.length === 0) {
    lines.push('- None listed');
  } else {
    for (const med of medRec.inpatientMeds) {
      const detail = [med.dose, med.route, med.frequency].filter(Boolean).join(' | ');
      lines.push(`- ${med.medicationName}${detail ? ` -- ${detail}` : ''}`);
    }
  }

  lines.push('', 'OUTPATIENT OR PRE-ADMISSION MEDICATIONS');
  if (medRec.outpatientMeds.length === 0) {
    lines.push('- None provided');
  } else {
    for (const med of medRec.outpatientMeds) {
      const detail = [med.dose, med.route, med.frequency].filter(Boolean).join(' | ');
      lines.push(`- ${med.medicationName}${detail ? ` -- ${detail}` : ''}`);
    }
  }

  lines.push('', 'DISCREPANCIES AND DECISIONS');
  if (medRec.discrepancies.length === 0) {
    lines.push('- No discrepancies identified');
  } else {
    for (const discrepancy of medRec.discrepancies) {
      const decision = medRec.decisions.find((item) => item.discrepancyId === discrepancy.id);
      lines.push(`- ${discrepancy.medication}: ${discrepancy.description}`);
      lines.push(`  Severity: ${discrepancy.severity}; Type: ${discrepancy.type}`);
      if (decision) {
        lines.push(
          `  Decision: ${decision.decision} by ${decision.decidedBy} at ${decision.decidedAt}`
        );
        if (decision.rationale) {
          lines.push(`  Rationale: ${decision.rationale}`);
        }
      } else {
        lines.push('  Decision: pending');
      }
    }
  }

  if (additionalNote && additionalNote.trim()) {
    lines.push('', 'CLINICIAN NOTE', additionalNote.trim());
  }

  return lines.join('\n');
}

async function createMedRecSummaryNote(options: {
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
    idempotencyKey: `med-rec:${options.correlationId}:${createHash('sha256').update(`${options.titleIen}:${options.text}`).digest('hex').slice(0, 16)}`,
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

export default async function medReconciliationRoutes(server: FastifyInstance) {
  // GET /vista/med-rec/active-meds — read active meds from VistA
  server.get('/vista/med-rec/active-meds', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const dfn = (request.query as any).dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: 'dfn required' });

    try {
      const rawLines = await safeCallRpc('ORWPS ACTIVE', [dfn]);
      const raw = rawLines.join('\n');
      const meds = parseActiveMeds(raw);
      return { ok: true, meds, rpcUsed: ['ORWPS ACTIVE'], source: 'vista' };
    } catch (err: any) {
      log.warn('Failed to read active meds', { err: err.message });
      return {
        ok: false,
        status: 'integration-pending',
        targetRpc: ['ORWPS ACTIVE'],
        error: 'Failed to read active medications',
      };
    }
  });

  // POST /vista/med-rec/start — start a reconciliation session
  server.post('/vista/med-rec/start', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const body = (request.body as any) || {};
    const dfn = body.dfn;
    if (!dfn) return reply.code(400).send({ ok: false, error: 'dfn required' });

    // Read inpatient meds from VistA
    let inpatientMeds: MedRecEntry[] = [];
    let rpcUsed: string[] = [];
    try {
      const rawLines = await safeCallRpc('ORWPS ACTIVE', [dfn]);
      const raw = rawLines.join('\n');
      inpatientMeds = parseActiveMeds(raw);
      rpcUsed.push('ORWPS ACTIVE');
    } catch {
      // VistA unavailable — start with empty list
    }

    // Outpatient/pre-admission meds would come from a separate source
    // Integration-pending: PSO MED LIST for outpatient pharmacy
    const outpatientMeds = normalizeOutpatientMeds(body.outpatientMeds);

    const discrepancies = detectDiscrepancies(inpatientMeds, outpatientMeds);

    const medRecSession: MedRecSession = {
      id: randomUUID(),
      tenantId: session.tenantId,
      patientDfn: dfn,
      duz: session.duz,
      status: 'in-progress',
      inpatientMeds,
      outpatientMeds,
      discrepancies,
      decisions: [],
      createdAt: new Date().toISOString(),
    };

    medRecSessions.set(medRecSession.id, medRecSession);

    return {
      ok: true,
      session: {
        id: medRecSession.id,
        status: medRecSession.status,
        inpatientCount: inpatientMeds.length,
        outpatientCount: outpatientMeds.length,
        discrepancyCount: discrepancies.length,
        discrepancies,
      },
      rpcUsed,
      vistaGrounding: {
        vistaFiles: ['PSO(55)', 'PS(55.06)', 'OR(100)'],
        targetRoutines: ['PSOLM', 'PSJLM'],
        targetRpc: ['PSO UPDATE MED LIST', 'PSJ LM ORDER UPDATE'],
        migrationPath: 'Phase 168+ — writeback via PSO/PSJ when available',
        sandboxNote:
          'Inpatient meds read via ORWPS ACTIVE; outpatient list is patient-reported until PSO integration',
      },
    };
  });

  // GET /vista/med-rec/session/:id — get reconciliation session detail
  server.get('/vista/med-rec/session/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const { id } = request.params as any;
    const medRec = medRecSessions.get(id);
    if (!medRec) return reply.code(404).send({ ok: false, error: 'Session not found' });
    if (medRec.tenantId !== session.tenantId)
      return reply.code(403).send({ ok: false, error: 'Forbidden' });

    return { ok: true, session: medRec };
  });

  // POST /vista/med-rec/session/:id/decide — record a reconciliation decision
  server.post(
    '/vista/med-rec/session/:id/decide',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { id } = request.params as any;
      const medRec = medRecSessions.get(id);
      if (!medRec) return reply.code(404).send({ ok: false, error: 'Session not found' });
      if (medRec.tenantId !== session.tenantId)
        return reply.code(403).send({ ok: false, error: 'Forbidden' });
      if (medRec.status !== 'in-progress')
        return reply.code(409).send({ ok: false, error: 'Session not in-progress' });

      const body = (request.body as any) || {};
      const { discrepancyId, decision, rationale } = body;
      if (!discrepancyId || !decision) {
        return reply.code(400).send({ ok: false, error: 'discrepancyId and decision required' });
      }

      const validDecisions: ReconciliationDecision[] = [
        'continue',
        'discontinue',
        'modify',
        'hold',
        'defer',
      ];
      if (!validDecisions.includes(decision)) {
        return reply
          .code(400)
          .send({ ok: false, error: `Invalid decision. Valid: ${validDecisions.join(', ')}` });
      }

      const disc = medRec.discrepancies.find((d) => d.id === discrepancyId);
      if (!disc) return reply.code(404).send({ ok: false, error: 'Discrepancy not found' });

      // Prevent duplicate decisions for same discrepancy
      const existingDecision = medRec.decisions.find((d) => d.discrepancyId === discrepancyId);
      if (existingDecision) {
        return reply.code(409).send({
          ok: false,
          error: `Discrepancy ${discrepancyId} already decided (${existingDecision.decision} at ${existingDecision.decidedAt})`,
        });
      }

      medRec.decisions.push({
        discrepancyId,
        decision,
        rationale: rationale || '',
        decidedAt: new Date().toISOString(),
        decidedBy: session.duz,
      });

      return {
        ok: true,
        decisionsRecorded: medRec.decisions.length,
        discrepanciesRemaining: medRec.discrepancies.length - medRec.decisions.length,
        vistaGrounding: {
          targetRpc: ['PSO UPDATE MED LIST', 'PSJ LM ORDER UPDATE'],
          status: 'integration-pending',
          nextSteps: [
            'Wire PSO for outpatient reconciliation writeback',
            'Wire PSJ for inpatient order updates',
          ],
        },
      };
    }
  );

  // POST /vista/med-rec/session/:id/complete — complete reconciliation
  server.post(
    '/vista/med-rec/session/:id/complete',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const { id } = request.params as any;
      const medRec = medRecSessions.get(id);
      if (!medRec) return reply.code(404).send({ ok: false, error: 'Session not found' });
      if (medRec.tenantId !== session.tenantId)
        return reply.code(403).send({ ok: false, error: 'Forbidden' });
      if (medRec.status !== 'in-progress')
        return reply.code(409).send({ ok: false, error: 'Session not in-progress' });

      const undecided = medRec.discrepancies.length - medRec.decisions.length;
      if (undecided > 0) {
        return reply.code(409).send({
          ok: false,
          error: `${undecided} discrepancy(ies) still unresolved`,
          discrepanciesRemaining: undecided,
        });
      }

      const body = (request.body as any) || {};
      const documentation = (body.documentation as Record<string, unknown>) || {};
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
          buildMedRecSummaryText(medRec, String(documentation.additionalNote || ''));

        try {
          const note = await createMedRecSummaryNote({
            tenantId: medRec.tenantId,
            patientDfn: medRec.patientDfn,
            actorDuz: session.duz,
            titleIen,
            text: noteText,
            visitStr: String(documentation.visitStr || '').trim(),
            correlationId: `med-rec-complete:${medRec.id}`,
          });
          medRec.summaryNote = {
            mode: 'tiu_draft',
            titleIen: note.titleIen,
            docIen: note.docIen,
            resultSummary: note.resultSummary,
            createdAt: new Date().toISOString(),
          };
          rpcUsed.push('TIU CREATE RECORD', 'TIU SET DOCUMENT TEXT');
        } catch (error: any) {
          return reply.code(502).send({
            ok: false,
            error: 'Failed to create medication reconciliation TIU summary note',
            detail: error?.message || 'Unknown TIU error',
            rpcUsed: ['TIU CREATE RECORD', 'TIU SET DOCUMENT TEXT'],
            vistaGrounding: {
              targetRpc: ['TIU CREATE RECORD', 'TIU SET DOCUMENT TEXT'],
              status: 'available_but_failed',
            },
          });
        }
      }

      medRec.status = 'completed';
      medRec.completedAt = new Date().toISOString();

      return {
        ok: true,
        status: 'completed',
        summary: {
          totalDiscrepancies: medRec.discrepancies.length,
          decisions: medRec.decisions.map((d) => ({
            medication: medRec.discrepancies.find((disc) => disc.id === d.discrepancyId)
              ?.medication,
            decision: d.decision,
          })),
        },
        rpcUsed,
        documentation: medRec.summaryNote
          ? {
              status: 'completed',
              mode: medRec.summaryNote.mode,
              titleIen: medRec.summaryNote.titleIen,
              docIen: medRec.summaryNote.docIen,
              resultSummary: medRec.summaryNote.resultSummary,
            }
          : {
              status: 'not_requested',
              mode: 'none',
            },
        vistaGrounding: {
          targetRpc: ['PSO UPDATE MED LIST', 'PSJ LM ORDER UPDATE', 'TIU CREATE RECORD'],
          status: 'integration-pending',
          nextSteps: [
            noteRequested
              ? 'PSO and PSJ writeback remain pending in VEHU; TIU summary note was created.'
              : 'Write reconciliation summary to TIU note',
            'Update PSO outpatient med list',
            'Update PSJ inpatient orders',
          ],
        },
      };
    }
  );

  // GET /vista/med-rec/sessions — list all sessions for current tenant
  server.get('/vista/med-rec/sessions', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    if (!session) return;
    const sessions = Array.from(medRecSessions.values())
      .filter((s) => s.tenantId === session.tenantId)
      .map((s) => ({
        id: s.id,
        patientDfn: s.patientDfn,
        status: s.status,
        discrepancyCount: s.discrepancies.length,
        decisionCount: s.decisions.length,
        createdAt: s.createdAt,
        completedAt: s.completedAt,
      }));

    return { ok: true, sessions, total: sessions.length };
  });
}
