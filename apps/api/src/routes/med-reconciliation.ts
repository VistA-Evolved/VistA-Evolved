/**
 * Medication Reconciliation Routes -- VistA RPC-first
 *
 * Endpoints call custom VE MEDREC RPCs (ZVEMEDREC.m) for reconciliation
 * decisions, combined med lists, history, and outside-provider medications.
 *
 * RPCs used:
 *   - VE MEDREC RECONCILE (write: save reconciliation decision)
 *   - VE MEDREC MEDLIST   (read:  combined med list File 100 + File 52)
 *   - VE MEDREC HISTORY   (read:  reconciliation decision history)
 *   - VE MEDREC OUTSRC    (write: record outside/community medication)
 */

import type { FastifyInstance } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { safeCallRpc } from '../lib/rpc-resilience.js';
import { immutableAudit } from '../lib/immutable-audit.js';
import { safeErr } from '../lib/safe-error.js';

// -- Legacy types (re-exported for discharge-workflow.ts) ---------

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
  type: 'missing-inpatient' | 'missing-outpatient' | 'dose-mismatch' | 'duplicate-therapy' | 'new-admission';
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

const medRecSessions = new Map<string, MedRecSession>();

export function getMedRecSessionCount(): number {
  return medRecSessions.size;
}

export function getMedRecSessionById(id: string): MedRecSession | undefined {
  return medRecSessions.get(id);
}

export function buildMedRecSummaryText(
  medRec: MedRecSession,
  additionalNote?: string,
): string {
  const lines: string[] = [
    'MEDICATION RECONCILIATION SUMMARY',
    '',
    `Patient DFN: ${medRec.patientDfn}`,
    `Reconciliation Session: ${medRec.id}`,
    `Status: ${medRec.status}`,
    `Created: ${medRec.createdAt}`,
  ];
  if (medRec.completedAt) lines.push(`Completed: ${medRec.completedAt}`);

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
    for (const disc of medRec.discrepancies) {
      const dec = medRec.decisions.find((d) => d.discrepancyId === disc.id);
      lines.push(`- ${disc.medication}: ${disc.description}`);
      lines.push(`  Severity: ${disc.severity}; Type: ${disc.type}`);
      if (dec) {
        lines.push(`  Decision: ${dec.decision} by ${dec.decidedBy} at ${dec.decidedAt}`);
        if (dec.rationale) lines.push(`  Rationale: ${dec.rationale}`);
      } else {
        lines.push('  Decision: pending');
      }
    }
  }

  if (additionalNote?.trim()) {
    lines.push('', 'CLINICIAN NOTE', additionalNote.trim());
  }
  return lines.join('\n');
}

// -- New RPC route helpers ----------------------------------------

type ReconcileAction = 'CONTINUE' | 'DISCONTINUE' | 'MODIFY' | 'NEW' | 'HOLD';

const VALID_ACTIONS: ReconcileAction[] = ['CONTINUE', 'DISCONTINUE', 'MODIFY', 'NEW', 'HOLD'];

function isDfnValid(dfn: unknown): dfn is string {
  return typeof dfn === 'string' && /^\d+$/.test(dfn);
}

function parseStatusLine(lines: string[]): { ok: boolean; errorText?: string } {
  const first = (lines[0] || '').trim();
  if (first.startsWith('1')) return { ok: true };
  if (first.startsWith('-1')) return { ok: false, errorText: first.substring(2).trim() || 'RPC returned error' };
  return { ok: true };
}

function parseDataLines(lines: string[]): Array<Record<string, string>> {
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const parts = line.split('|');
      return parts.reduce<Record<string, string>>((acc, part, idx) => {
        acc[`field${idx}`] = part.trim();
        return acc;
      }, {});
    });
}

function parseMedList(lines: string[]) {
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const p = line.split('|');
      return {
        medIen: p[0]?.trim() || '',
        name: p[1]?.trim() || '',
        dose: p[2]?.trim() || '',
        route: p[3]?.trim() || '',
        frequency: p[4]?.trim() || '',
        status: p[5]?.trim() || '',
        source: p[6]?.trim() || '',
        lastReconciled: p[7]?.trim() || '',
        decision: p[8]?.trim() || '',
      };
    });
}

function parseHistory(lines: string[]) {
  return lines
    .slice(1)
    .filter((l) => l.trim())
    .map((line) => {
      const p = line.split('|');
      return {
        dateTime: p[0]?.trim() || '',
        medIen: p[1]?.trim() || '',
        medName: p[2]?.trim() || '',
        action: p[3]?.trim() || '',
        reason: p[4]?.trim() || '',
        provider: p[5]?.trim() || '',
        notes: p[6]?.trim() || '',
      };
    });
}

export default async function medReconciliationRoutes(server: FastifyInstance): Promise<void> {
  /* ----------------------------------------------------------------
   * POST /vista/medrec/reconcile
   * RPC: VE MEDREC RECONCILE
   * ---------------------------------------------------------------- */
  server.post('/vista/medrec/reconcile', async (request, reply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { dfn, medIen, action, reason, notes } = body;

    if (!isDfnValid(dfn))
      return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });
    if (!medIen)
      return reply.code(400).send({ ok: false, error: 'medIen is required' });
    if (!action || !VALID_ACTIONS.includes(action))
      return reply
        .code(400)
        .send({ ok: false, error: `action must be one of: ${VALID_ACTIONS.join(', ')}` });

    const rpcUsed = ['VE MEDREC RECONCILE'];

    try {
      const lines = await safeCallRpc(
        'VE MEDREC RECONCILE',
        [String(dfn), String(medIen), String(action), String(reason || ''), String(notes || '')],
        { idempotent: false },
      );

      const status = parseStatusLine(lines);
      if (!status.ok) {
        return reply.code(502).send({
          ok: false,
          error: status.errorText,
          rpcUsed,
          source: 'vista',
        });
      }

      immutableAudit('medrec.reconcile', 'success', {
        sub: session.duz,
        name: session.userName,
      }, {
        detail: { action, medIen, rpc: 'VE MEDREC RECONCILE' },
      });

      return {
        ok: true,
        action,
        medIen,
        data: parseDataLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      immutableAudit('medrec.reconcile', 'error', {
        sub: session.duz,
        name: session.userName,
      }, {
        detail: { action, medIen, error: safeErr(err) },
      });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        rpcUsed,
        source: 'vista',
      });
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/medrec/medlist?dfn=N
   * RPC: VE MEDREC MEDLIST
   * ---------------------------------------------------------------- */
  server.get('/vista/medrec/medlist', async (request, reply) => {
    const session = await requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;

    if (!isDfnValid(dfn))
      return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });

    const rpcUsed = ['VE MEDREC MEDLIST'];

    try {
      const lines = await safeCallRpc('VE MEDREC MEDLIST', [String(dfn)]);
      const status = parseStatusLine(lines);

      if (!status.ok) {
        return reply.code(502).send({
          ok: false,
          error: status.errorText,
          rpcUsed,
          source: 'vista',
        });
      }

      const meds = parseMedList(lines);
      return {
        ok: true,
        count: meds.length,
        meds,
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        rpcUsed,
        source: 'vista',
      });
    }
  });

  /* ----------------------------------------------------------------
   * GET /vista/medrec/history?dfn=N
   * RPC: VE MEDREC HISTORY
   * ---------------------------------------------------------------- */
  server.get('/vista/medrec/history', async (request, reply) => {
    const session = await requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;

    if (!isDfnValid(dfn))
      return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });

    const rpcUsed = ['VE MEDREC HISTORY'];

    try {
      const lines = await safeCallRpc('VE MEDREC HISTORY', [String(dfn)]);
      const status = parseStatusLine(lines);

      if (!status.ok) {
        return reply.code(502).send({
          ok: false,
          error: status.errorText,
          rpcUsed,
          source: 'vista',
        });
      }

      const history = parseHistory(lines);
      return {
        ok: true,
        count: history.length,
        history,
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        rpcUsed,
        source: 'vista',
      });
    }
  });

  /* ----------------------------------------------------------------
   * POST /vista/medrec/outside-med
   * RPC: VE MEDREC OUTSRC
   * ---------------------------------------------------------------- */
  server.post('/vista/medrec/outside-med', async (request, reply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const { dfn, medName, dose, freq, route, startDt, prescriber } = body;

    if (!isDfnValid(dfn))
      return reply.code(400).send({ ok: false, error: 'Missing or non-numeric dfn' });
    if (!medName)
      return reply.code(400).send({ ok: false, error: 'medName is required' });

    const rpcUsed = ['VE MEDREC OUTSRC'];

    try {
      const lines = await safeCallRpc(
        'VE MEDREC OUTSRC',
        [
          String(dfn),
          String(medName),
          String(dose || ''),
          String(freq || ''),
          String(route || ''),
          String(startDt || ''),
          String(prescriber || ''),
        ],
        { idempotent: false },
      );

      const status = parseStatusLine(lines);
      if (!status.ok) {
        return reply.code(502).send({
          ok: false,
          error: status.errorText,
          rpcUsed,
          source: 'vista',
        });
      }

      immutableAudit('medrec.outside_med', 'success', {
        sub: session.duz,
        name: session.userName,
      }, {
        detail: { medName, rpc: 'VE MEDREC OUTSRC' },
      });

      return {
        ok: true,
        medName,
        data: parseDataLines(lines),
        rpcUsed,
        source: 'vista',
      };
    } catch (err: any) {
      immutableAudit('medrec.outside_med', 'error', {
        sub: session.duz,
        name: session.userName,
      }, {
        detail: { medName, error: safeErr(err) },
      });
      return reply.code(502).send({
        ok: false,
        error: safeErr(err),
        rpcUsed,
        source: 'vista',
      });
    }
  });
}
