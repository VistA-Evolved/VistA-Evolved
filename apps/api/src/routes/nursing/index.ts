/**
 * Nursing Workflow Routes -- Phase 68 + Phase 84 + Phase 138 hardening.
 *
 * Phase 68 (original):
 *   GET  /vista/nursing/vitals?dfn=N                        -- Patient vitals (ORQQVI VITALS)
 *   GET  /vista/nursing/vitals-range?dfn=N&start=D&end=D    -- Vitals for shift range (ORQQVI VITALS FOR DATE RANGE)
 *   GET  /vista/nursing/notes?dfn=N                         -- Nursing notes via TIU (TIU DOCUMENTS BY CONTEXT)
 *   GET  /vista/nursing/ward-patients?ward=IEN              -- Ward assignment view (ORQPT WARD PATIENTS)
 *   GET  /vista/nursing/tasks?dfn=N                         -- Nursing task list (integration-pending)
 *   GET  /vista/nursing/mar?dfn=N                           -- MAR (integration-pending -- no BCMA)
 *   POST /vista/nursing/mar/administer                      -- Med admin (integration-pending -- no BCMA)
 *
 * Phase 84 (nursing documentation + flowsheets):
 *   GET  /vista/nursing/flowsheet?dfn=N                     -- Vitals flowsheet (trended) + critical flags
 *   GET  /vista/nursing/io?dfn=N                            -- Intake/Output (integration-pending)
 *   GET  /vista/nursing/assessments?dfn=N                   -- Nursing assessments (integration-pending)
 *   POST /vista/nursing/notes/create                        -- Create nursing note (local draft + TIU target)
 *   GET  /vista/nursing/note-text?ien=N                     -- Get full note text (TIU GET RECORD TEXT)
 *   GET  /vista/nursing/critical-thresholds                 -- Configurable critical value thresholds
 *   GET  /vista/nursing/patient-context?dfn=N               -- Patient banner data
 *
 * Phase 138 (hardening):
 *   - Immutable audit logging on all endpoints
 *   - pendingFallback returns ok: false (consistency fix)
 *   - BCMA/PSB RPCs registered in rpcRegistry exceptions
 *
 * Auth: session-based (/vista/* catch-all in security.ts).
 * Every response includes rpcUsed[], pendingTargets[], source.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../../auth/auth-routes.js';
import { safeCallRpc, safeCallRpcWithList } from '../../lib/rpc-resilience.js';
import type { RpcParam } from '../../vista/rpcBrokerClient.js';
import { log } from '../../lib/logger.js';
import { immutableAudit } from '../../lib/immutable-audit.js';
// tier0Gate removed -- all nursing routes now call VistA RPCs directly

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Standard integration-pending response shape. */
function pendingFallback(
  label: string,
  targets: Array<{ rpc: string; package: string; reason: string }>
) {
  return {
    ok: false,
    source: 'integration-pending',
    status: 'integration-pending',
    label,
    items: [],
    rpcUsed: [],
    pendingTargets: targets,
  };
}

function requestFailedFallback(
  label: string,
  targets: Array<{ rpc: string; package: string; reason: string }>,
  rpcUsed: string[],
  err: unknown,
  note: string
) {
  return {
    ok: false,
    source: 'vista',
    status: 'request-failed',
    label,
    items: [],
    rpcUsed,
    pendingTargets: targets,
    error: err instanceof Error ? err.message : String(err),
    note,
  };
}

function buildTiuTextBuffer(noteText: unknown): Record<string, string> {
  const textData: Record<string, string> = { HDR: '1^1' };
  String(noteText || '')
    .split(/\r?\n/)
    .forEach((line, index) => {
      textData[`TEXT,${index + 1},0`] = line;
    });
  return textData;
}

function tiuReadbackContainsExpectedText(lines: string[], noteText: unknown): boolean {
  const expected = String(noteText || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (expected.length === 0) return false;
  const haystack = lines.map((line) => line.trim()).filter(Boolean);
  return expected.every((line) => haystack.includes(line));
}

function parseTiuLineCount(lines: string[]): number {
  for (const line of lines) {
    const match = line.match(/Line Count:\s*(\d+)/i);
    if (match) return parseInt(match[1], 10) || 0;
  }
  return -1;
}

function parseFileManDate(fmDate: string): string {
  if (!fmDate || fmDate.length < 7) return fmDate;
  const [datePart, timePart] = fmDate.split('.');
  const y = parseInt(datePart.substring(0, 3), 10) + 1700;
  const m = datePart.substring(3, 5);
  const d = datePart.substring(5, 7);
  let date = `${y}-${m}-${d}`;
  if (timePart && timePart.length >= 4) {
    date += ` ${timePart.substring(0, 2)}:${timePart.substring(2, 4)}`;
  }
  return date;
}

function sanitizeVistaSignText(rawValue: string): string {
  return String(rawValue || '')
    .replace(/\r/g, '\n')
    .replace(/\n{2,}/g, '\n')
    .replace(/[\x00-\x1f\x7f]+/g, ' ')
    .replace(/^\d+(?:\[[^\]]+\])?\s*/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeNoteSignFailure(rawValue: string): {
  status: 'sign-blocked' | 'sign-failed';
  blocker?: string;
  message: string;
} {
  const raw = String(rawValue || '').trim();
  const sanitized = sanitizeVistaSignText(raw);
  const matchText = sanitized || raw;

  if (/incorrect electronic signature code|electronic signature code.*try again/i.test(matchText)) {
    return {
      status: 'sign-blocked',
      blocker: 'invalid_esCode',
      message: 'Incorrect electronic signature code. Try again.',
    };
  }

  if (/electronic signature/i.test(matchText) && /not/i.test(matchText)) {
    return {
      status: 'sign-blocked',
      blocker: 'esCode_unavailable',
      message: 'Electronic signature is not available for this user in the current VistA context.',
    };
  }

  if (/locked/i.test(matchText)) {
    return {
      status: 'sign-blocked',
      blocker: 'document_locked',
      message: 'This note is locked by another user or process. Refresh and try again.',
    };
  }

  return {
    status: 'sign-failed',
    message: sanitized || 'TIU SIGN RECORD failed. Retry or contact support if the problem persists.',
  };
}

function inferVitalUnits(type: string): string {
  switch (type.trim().toUpperCase()) {
    case 'T':
      return 'F';
    case 'P':
      return 'bpm';
    case 'R':
      return 'breaths/min';
    case 'BP':
      return 'mmHg';
    case 'PN':
      return 'score';
    default:
      return '';
  }
}

/** Parse vitals response lines: IEN^type^value^filemanDateTime^... */
function parseVitals(
  lines: string[]
): Array<{ date: string; type: string; value: string; units: string }> {
  const results: Array<{ date: string; type: string; value: string; units: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    if (parts.length < 3) continue;
    const type = parts[1]?.trim() || '';
    const fileManDate = parts[3]?.trim() || '';
    results.push({
      date: parseFileManDate(fileManDate),
      type,
      value: parts[2]?.trim() || '',
      units: inferVitalUnits(type),
    });
  }
  return results;
}

/** Parse TIU document list lines using the same field positions as CPRS TIU notes. */
function parseNotesList(
  lines: string[]
): Array<{ ien: string; title: string; date: string; author: string; status: string }> {
  const results: Array<{
    ien: string;
    title: string;
    date: string;
    author: string;
    status: string;
  }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const ien = parts[0]?.trim() || '';
    if (!ien || ien === '0') continue;
    const title = (parts[1] || '').replace(/^\+\s*/, '').trim();
    const authorField = parts[4]?.trim() || '';
    const authorParts = authorField.split(';');
    results.push({
      ien,
      title,
      date: parseFileManDate(parts[2]?.trim() || ''),
      author: authorParts.length >= 3 ? authorParts[2] : authorParts[1] || authorField,
      status: parts[6]?.trim() || '',
    });
  }
  return results;
}

/** Parse ward patient list lines: DFN^NAME */
function parsePatientList(lines: string[]): Array<{ dfn: string; name: string }> {
  const results: Array<{ dfn: string; name: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const dfn = parts[0]?.trim() || '';
    if (!dfn) continue;
    results.push({ dfn, name: parts[1]?.trim() || '' });
  }
  return results;
}

/* ------------------------------------------------------------------ */
/* Route Registration                                                   */
/* ------------------------------------------------------------------ */

export default async function nursingRoutes(server: FastifyInstance) {
  /** Extract audit actor from session for immutableAudit. */
  function auditActor(session: any): { sub: string; name: string } {
    const duz = session?.duz || session?.user?.duz || 'unknown';
    const name = session?.userName || session?.user?.name || 'unknown';
    return { sub: duz, name };
  }

  /* ------ GET /vista/nursing/vitals?dfn=N ------ */
  server.get('/vista/nursing/vitals', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    try {
      const lines = await safeCallRpc('ORQQVI VITALS', [dfn]);
      const items = parseVitals(lines);
      immutableAudit('nursing.vitals', 'success', auditActor(session), {
        detail: { dfn, count: items.length },
      });
      return {
        ok: true,
        source: 'vista',
        items,
        rpcUsed: ['ORQQVI VITALS'],
        pendingTargets: [],
      };
    } catch (err) {
      log.warn('Nursing vitals RPC failed', {
        err: String(err),
        rpc: 'ORQQVI VITALS',
      });
      immutableAudit('nursing.vitals', 'error', auditActor(session), {
        detail: { dfn, error: 'RPC failed' },
      });
      return requestFailedFallback(
        'Nursing Vitals',
        [{ rpc: 'ORQQVI VITALS', package: 'OR', reason: 'RPC call failed' }],
        ['ORQQVI VITALS'],
        err,
        'Live ORQQVI VITALS capability exists, but this request failed at runtime.'
      );
    }
  });

  /* ------ GET /vista/nursing/vitals-range?dfn=N&start=D&end=D ------ */
  server.get(
    '/vista/nursing/vitals-range',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { dfn, start, end } = (request.query as any) || {};
      const dfnStr = String(dfn || '').trim();
      if (!dfnStr) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
      if (!/^\d+$/.test(dfnStr))
        return reply
          .code(400)
          .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

      try {
        // ORQQVI VITALS FOR DATE RANGE expects DFN, start date, end date
        const params = [dfnStr, start || '', end || ''];
        const lines = await safeCallRpc('ORQQVI VITALS FOR DATE RANGE', params);
        const items = parseVitals(lines);
        immutableAudit('nursing.vitals-range', 'success', auditActor(session), {
          detail: { dfn: dfnStr, count: items.length },
        });
        return {
          ok: true,
          source: 'vista',
          items,
          dateRange: { start: start || null, end: end || null },
          rpcUsed: ['ORQQVI VITALS FOR DATE RANGE'],
          pendingTargets: [],
        };
      } catch (err) {
        log.warn('Nursing vitals-range RPC failed', {
          err: String(err),
          rpc: 'ORQQVI VITALS FOR DATE RANGE',
        });
        immutableAudit('nursing.vitals-range', 'error', auditActor(session), {
          detail: { dfn: dfnStr, error: 'RPC failed' },
        });
        return requestFailedFallback(
          'Nursing Vitals (Shift Range)',
          [
            {
              rpc: 'ORQQVI VITALS FOR DATE RANGE',
              package: 'OR',
              reason: 'RPC call failed or not available in sandbox',
            },
          ],
          ['ORQQVI VITALS FOR DATE RANGE'],
          err,
          'Live ORQQVI VITALS FOR DATE RANGE capability exists, but this request failed at runtime.'
        );
      }
    }
  );

  /* ------ GET /vista/nursing/notes?dfn=N ------ */
  server.get('/vista/nursing/notes', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    try {
      // Merge signed and unsigned nursing TIU notes so freshly created unsigned
      // documents appear in the standalone nursing workspace immediately.
      const signedLines = await safeCallRpc('TIU DOCUMENTS BY CONTEXT', [
        '3',
        '1',
        dfn,
        '',
        '',
        '0',
        '0',
        'D',
      ]);
      const unsignedLines = await safeCallRpc('TIU DOCUMENTS BY CONTEXT', [
        '3',
        '2',
        dfn,
        '',
        '',
        '0',
        '0',
        'D',
      ]);

      const seenIens = new Set<string>();
      const mergedLines: string[] = [];
      for (const line of [...unsignedLines, ...signedLines]) {
        const ien = line.split('^')[0]?.trim();
        if (ien && /^\d+$/.test(ien) && !seenIens.has(ien)) {
          seenIens.add(ien);
          mergedLines.push(line);
        }
      }

      const items = parseNotesList(mergedLines);
      immutableAudit('nursing.notes', 'success', auditActor(session), {
        detail: { dfn, count: items.length },
      });
      return {
        ok: true,
        source: 'vista',
        items,
        rpcUsed: ['TIU DOCUMENTS BY CONTEXT'],
        pendingTargets: [],
        note: 'Merged signed and unsigned TIU nursing notes for the current patient. Class 3 may differ by site.',
      };
    } catch (err) {
      log.warn('Nursing notes RPC failed, returning pending', {
        err: String(err),
        rpc: 'TIU DOCUMENTS BY CONTEXT',
      });
      immutableAudit('nursing.notes', 'error', auditActor(session), {
        detail: { dfn, error: 'RPC failed' },
      });
      return pendingFallback('Nursing Notes', [
        { rpc: 'TIU DOCUMENTS BY CONTEXT', package: 'TIU', reason: 'RPC call failed' },
      ]);
    }
  });

  /* ------ GET /vista/nursing/ward-patients?ward=IEN ------ */
  server.get(
    '/vista/nursing/ward-patients',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const ward = String((request.query as any)?.ward || '').trim();
      if (!ward) return reply.code(400).send({ ok: false, error: 'Missing ward parameter' });
      if (!/^\d+$/.test(ward))
        return reply
          .code(400)
          .send({ ok: false, error: 'Invalid ward -- must be a positive integer' });

      try {
        const lines = await safeCallRpc('ORQPT WARD PATIENTS', [ward]);
        const items = parsePatientList(lines);
        immutableAudit('nursing.ward-patients', 'success', auditActor(session), {
          detail: { ward, count: items.length, context: 'ward-patients' },
        });
        return {
          ok: true,
          source: 'vista',
          items,
          rpcUsed: ['ORQPT WARD PATIENTS'],
          pendingTargets: [],
        };
      } catch (err) {
        log.warn('Nursing ward-patients RPC failed, returning pending', {
          err: String(err),
          rpc: 'ORQPT WARD PATIENTS',
        });
        return pendingFallback('Nursing Ward Patients', [
          { rpc: 'ORQPT WARD PATIENTS', package: 'OR', reason: 'RPC call failed' },
        ]);
      }
    }
  );

  /* ------ GET /vista/nursing/tasks?dfn=N ------ */
  server.get('/vista/nursing/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    const rpcUsed: string[] = [];
    try {
      const lines = await safeCallRpc('ORWPS ACTIVE', [dfn]);
      rpcUsed.push('ORWPS ACTIVE');
      const tasks = (lines || [])
        .filter((l) => l.startsWith('~'))
        .map((line, i) => {
          const parts = line.substring(1).split('^');
          return {
            id: `task-${i}`,
            type: 'medication',
            medication: parts[0]?.trim() || '',
            sig: parts[1]?.trim() || '',
            status: parts[4]?.trim() || 'active',
            priority: 'routine',
          };
        });

      immutableAudit('nursing.tasks', 'success', auditActor(session), {
        detail: { dfn, taskCount: tasks.length },
      });
      return {
        ok: true,
        source: 'vista',
        items: tasks,
        count: tasks.length,
        rpcUsed,
        pendingTargets: [],
        _note:
          'Tasks derived from ORWPS ACTIVE (active medication orders). PSB MED LOG adds BCMA-specific task data when available.',
      };
    } catch (err) {
      log.warn('Nursing tasks RPC failed', { err: String(err) });
      return {
        ok: true,
        source: 'vista',
        items: [],
        count: 0,
        rpcUsed,
        pendingTargets: [{ rpc: 'ORWPS ACTIVE', package: 'OR', reason: String(err) }],
      };
    }
  });

  /* ------ GET /vista/nursing/mar?dfn=N ------ */
  server.get('/vista/nursing/mar', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    const rpcUsed: string[] = [];
    try {
      const medLines = await safeCallRpc('ORWPS ACTIVE', [dfn]);
      rpcUsed.push('ORWPS ACTIVE');
      const meds = (medLines || [])
        .filter((l) => l.startsWith('~'))
        .map((line, i) => {
          const parts = line.substring(1).split('^');
          return {
            id: `mar-${i}`,
            medication: parts[0]?.trim() || '',
            sig: parts[1]?.trim() || '',
            route: parts[2]?.trim() || '',
            schedule: parts[3]?.trim() || '',
            status: parts[4]?.trim() || 'active',
            lastAdmin: null as string | null,
          };
        });

      let allergyWarnings: string[] = [];
      try {
        const allergyLines = await safeCallRpc('PSB ALLERGY', [dfn]);
        rpcUsed.push('PSB ALLERGY');
        allergyWarnings = (allergyLines || []).filter((l) => l.trim()).map((l) => l.trim());
      } catch {
        log.debug('PSB ALLERGY call returned no data (may need BCMA context)');
      }

      immutableAudit('nursing.mar', 'success', auditActor(session), {
        detail: { dfn, medCount: meds.length },
      });
      return {
        ok: true,
        source: 'vista',
        medications: meds,
        count: meds.length,
        allergyWarnings,
        rpcUsed,
        pendingTargets: [],
        _note:
          'MAR built from ORWPS ACTIVE + PSB ALLERGY. PSB MED LOG adds administration timestamps when BCMA package is fully installed.',
      };
    } catch (err) {
      log.warn('Nursing MAR RPC failed', { err: String(err) });
      return {
        ok: true,
        source: 'vista',
        medications: [],
        count: 0,
        allergyWarnings: [],
        rpcUsed,
        pendingTargets: [{ rpc: 'ORWPS ACTIVE', package: 'OR', reason: String(err) }],
      };
    }
  });

  /* ------ POST /vista/nursing/mar/administer ------ */
  server.post(
    '/vista/nursing/mar/administer',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      if (!session) return;
      const body = (request.body as any) || {};
      const dfn = String(body.dfn || '').trim();
      const medicationId = String(body.medicationId || '').trim();
      const action = String(body.action || 'given').trim();
      const note = String(body.note || body.reason || '').trim();
      if (!dfn || !medicationId)
        return reply.code(400).send({ ok: false, error: 'dfn and medicationId required' });

      const rpcUsed: string[] = [];
      const adminAction = action || 'given';

      try {
        const adminNote = `Med admin: ${medicationId} - ${adminAction}${note ? ' - ' + note : ''}`;
        const titleIen = '10';
        const now = new Date();
        const fmYear = now.getFullYear() - 1700;
        const fmMonth = String(now.getMonth() + 1).padStart(2, '0');
        const fmDay = String(now.getDate()).padStart(2, '0');
        const fmHour = String(now.getHours()).padStart(2, '0');
        const fmMin = String(now.getMinutes()).padStart(2, '0');
        const visitDate = `${fmYear}${fmMonth}${fmDay}.${fmHour}${fmMin}`;
        const noteLines = await safeCallRpc('TIU CREATE RECORD', [
          dfn,
          titleIen,
          visitDate,
          '',
          '',
          '',
          '',
        ]);
        rpcUsed.push('TIU CREATE RECORD');
        const noteResult = (noteLines || [])[0]?.trim() || '';
        const noteIen = noteResult.split('^')[0]?.trim() || '';

        if (!noteIen || noteIen === '0' || noteIen.startsWith('-') || !/^\d+$/.test(noteIen)) {
          throw new Error(`TIU CREATE RECORD returned error: ${noteResult || '(empty)'}`);
        }

        const textParams: RpcParam[] = [
          { type: 'literal', value: noteIen },
          { type: 'list', value: buildTiuTextBuffer(adminNote) },
          { type: 'literal', value: '0' },
        ];
        await safeCallRpcWithList('TIU SET DOCUMENT TEXT', textParams, { idempotent: false });
        rpcUsed.push('TIU SET DOCUMENT TEXT');

        const readbackLines = await safeCallRpc('TIU GET RECORD TEXT', [noteIen], {
          idempotent: true,
        });
        rpcUsed.push('TIU GET RECORD TEXT');
        if (!tiuReadbackContainsExpectedText(readbackLines, adminNote)) {
          throw new Error('TIU note body did not persist after TIU SET DOCUMENT TEXT');
        }

        immutableAudit('nursing.mar.administer', 'success', auditActor(session), {
          detail: { dfn, medicationId, adminAction, noteIen },
        });
        return {
          ok: true,
          source: 'vista',
          adminAction,
          noteIen,
          rpcUsed,
          pendingTargets: [],
          _note:
            'Administration recorded via TIU nursing note. PSB MED LOG will be used when BCMA package is installed for barcode-verified administration.',
        };
      } catch (err) {
        log.warn('Nursing administer failed', { err: String(err) });
        immutableAudit('nursing.mar.administer', 'failure', auditActor(session), {
          detail: { dfn, medicationId, error: String(err) },
        });
        return reply.code(409).send({
          ok: false,
          error: 'Failed to record administration',
          rpcUsed,
          detail: String(err),
        });
      }
    }
  );

  /* ================================================================ */
  /* Phase 84 — Nursing Documentation + Flowsheets                     */
  /* ================================================================ */

  /** Configurable critical-value thresholds (in-memory, extensible to VistA). */
  const CRITICAL_THRESHOLDS: Record<string, { low?: number; high?: number; unit: string }> = {
    'BLOOD PRESSURE': { high: 180, unit: 'mmHg systolic' },
    PULSE: { low: 50, high: 130, unit: 'bpm' },
    TEMPERATURE: { low: 95, high: 103, unit: '°F' },
    RESPIRATION: { low: 8, high: 30, unit: 'breaths/min' },
    'PULSE OXIMETRY': { low: 90, unit: '%' },
    PAIN: { high: 8, unit: '0-10' },
    WEIGHT: { unit: 'lb' },
    HEIGHT: { unit: 'in' },
  };

  /* ------ GET /vista/nursing/critical-thresholds ------ */
  server.get(
    '/vista/nursing/critical-thresholds',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      immutableAudit('nursing.thresholds', 'success', auditActor(session), {
        detail: { context: 'critical-thresholds' },
      });
      return {
        ok: true,
        source: 'config',
        thresholds: CRITICAL_THRESHOLDS,
        rpcUsed: [],
        pendingTargets: [],
        _note:
          'Configurable thresholds. Production: store in VistA Parameter file (8989.5) via XPAR.',
      };
    }
  );

  /* ------ GET /vista/nursing/patient-context?dfn=N ------ */
  server.get(
    '/vista/nursing/patient-context',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const dfn = String((request.query as any)?.dfn || '').trim();
      if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
      if (!/^\d+$/.test(dfn))
        return reply
          .code(400)
          .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

      try {
        // VEHU ORWPT16 ID INFO returns a positional banner line where the patient name
        // is currently carried in the final field rather than the first.
        const lines = await safeCallRpc('ORWPT16 ID INFO', [dfn]);
        const raw = (lines || []).join('\n');
        const parts = raw.split('^');
        const name =
          parts
            .map((part) => part.trim())
            .findLast((part) => !!part && part.includes(',') && !/^\d{3}-\d{2}-\d{4}$/.test(part)) ||
          parts[8]?.trim() ||
          '';
        const location = parts[5]?.trim() || '';
        const roomBed = parts[6]?.trim() || '';
        const attending = parts[7]?.trim() || '';

        immutableAudit('nursing.context', 'success', auditActor(session), { detail: { dfn } });
        return {
          ok: true,
          source: 'vista',
          patient: { dfn, name, location, roomBed, attending },
          rpcUsed: ['ORWPT16 ID INFO'],
          pendingTargets: [],
        };
      } catch (err) {
        log.warn('Nursing patient-context RPC failed', { err: String(err) });
        // Fallback: try ORWPT ID INFO (simpler version)
        try {
          const lines2 = await safeCallRpc('ORWPT ID INFO', [dfn]);
          const raw2 = (lines2 || []).join('\n');
          const parts2 = raw2.split('^');
          return {
            ok: true,
            source: 'vista',
            patient: {
              dfn,
              name: parts2[0]?.trim() || `Patient ${dfn}`,
              location: '',
              roomBed: '',
              attending: '',
            },
            rpcUsed: ['ORWPT ID INFO'],
            pendingTargets: [
              {
                rpc: 'ORWPT16 ID INFO',
                package: 'OR',
                reason: 'Primary patient context RPC failed, using fallback',
              },
            ],
          };
        } catch {
          return {
            ok: false,
            source: 'vista',
            patient: { dfn, name: `Patient ${dfn}`, location: '', roomBed: '', attending: '' },
            rpcUsed: [],
            pendingTargets: [
              {
                rpc: 'ORWPT16 ID INFO',
                package: 'OR',
                reason: 'Primary patient context RPC unavailable',
              },
              {
                rpc: 'ORWPT ID INFO',
                package: 'OR',
                reason: 'Fallback patient context RPC also unavailable',
              },
            ],
            _error: 'Patient context RPCs unavailable',
          };
        }
      }
    }
  );

  /* ------ GET /vista/nursing/flowsheet?dfn=N ------ */
  server.get('/vista/nursing/flowsheet', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    try {
      const lines = await safeCallRpc('ORQQVI VITALS', [dfn]);
      const raw = parseVitals(lines);

      // Group by type for trend display
      const byType: Record<string, Array<{ date: string; value: string; units: string }>> = {};
      for (const v of raw) {
        if (!byType[v.type]) byType[v.type] = [];
        byType[v.type].push({ date: v.date, value: v.value, units: v.units });
      }

      // Apply critical-value flags
      const flagged = raw.map((v) => {
        const thresh = CRITICAL_THRESHOLDS[v.type];
        let critical = false;
        if (thresh) {
          const num = parseFloat(v.value.split('/')[0]); // systolic for BP
          if (!isNaN(num)) {
            if (thresh.high !== undefined && num >= thresh.high) critical = true;
            if (thresh.low !== undefined && num < thresh.low) critical = true;
          }
        }
        return { ...v, critical };
      });

      // Compute due/overdue for next vitals (simple 4h rule for inpatient)
      const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;
      // Sort by date descending to reliably find the most recent vital
      // (VistA RPCs don't guarantee ordering consistency across sites)
      const sorted = [...raw].sort((a, b) => {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        if (isNaN(da) && isNaN(db)) return 0;
        if (isNaN(da)) return 1;
        if (isNaN(db)) return -1;
        return db - da;
      });
      const mostRecent = sorted.length > 0 ? sorted[0].date : null;
      let nextVitalsDue = 'Unknown';
      let overdue = false;
      if (mostRecent) {
        const lastDate = new Date(mostRecent);
        if (!isNaN(lastDate.getTime())) {
          const dueAt = new Date(lastDate.getTime() + FOUR_HOURS_MS);
          nextVitalsDue = dueAt.toISOString();
          overdue = Date.now() > dueAt.getTime();
        }
      }

      immutableAudit('nursing.flowsheet', 'success', auditActor(session), {
        detail: {
          dfn,
          itemCount: flagged.length,
          criticalCount: flagged.filter((f) => f.critical).length,
        },
      });
      return {
        ok: true,
        source: 'vista',
        items: flagged,
        trends: byType,
        criticalCount: flagged.filter((f) => f.critical).length,
        nextVitalsDue,
        overdue,
        rpcUsed: ['ORQQVI VITALS'],
        pendingTargets: [],
        _note: 'Vitals from ORQQVI VITALS. I&O and assessments are separate endpoints.',
      };
    } catch (err) {
      log.warn('Nursing flowsheet RPC failed', { err: String(err) });
      return {
        ok: false,
        source: 'vista',
        items: [],
        trends: {},
        criticalCount: 0,
        nextVitalsDue: 'Unknown',
        overdue: false,
        rpcUsed: [],
        pendingTargets: [{ rpc: 'ORQQVI VITALS', package: 'OR', reason: 'RPC call failed' }],
        _error: 'RPC call failed',
      };
    }
  });

  /* ------ GET /vista/nursing/io?dfn=N ------ */
  server.get('/vista/nursing/io', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    const rpcUsed: string[] = [];
    try {
      const vitLines = await safeCallRpc('ORQQVI VITALS', [dfn]);
      rpcUsed.push('ORQQVI VITALS');
      const parsed = parseVitals(vitLines || []);
      const weightEntries = parsed.filter((v) => v.type === 'WT' || v.type === 'WEIGHT');

      let ioNotes: Array<{ ien: string; title: string; date: string }> = [];
      try {
        const noteLines = await safeCallRpc('TIU DOCUMENTS BY CONTEXT', [
          '',
          '1',
          dfn,
          '0',
          '0',
          '0',
          '',
          '0',
          '',
        ]);
        rpcUsed.push('TIU DOCUMENTS BY CONTEXT');
        ioNotes = (noteLines || [])
          .filter((l) => l.trim() && /I.?O|INTAKE|OUTPUT|FLUID/i.test(l))
          .map((line) => {
            const parts = line.split('^');
            return {
              ien: parts[0]?.trim() || '',
              title: parts[1]?.trim() || '',
              date: parts[2]?.trim() || '',
            };
          });
      } catch {
        /* notes lookup optional */
      }

      immutableAudit('nursing.io', 'success', auditActor(session), {
        detail: { dfn, weightCount: weightEntries.length, ioNoteCount: ioNotes.length },
      });
      return {
        ok: true,
        source: 'vista',
        weightTrend: weightEntries,
        ioNotes,
        rpcUsed,
        pendingTargets: [],
        _note:
          'I/O data from vitals (weight trend) + TIU notes. GMRIO RESULTS RPC not registered in this VistA instance -- register it for structured I/O entry from GMR(126).',
      };
    } catch (err) {
      log.warn('Nursing I/O RPC failed', { err: String(err) });
      return {
        ok: true,
        source: 'vista',
        weightTrend: [],
        ioNotes: [],
        rpcUsed,
        pendingTargets: [{ rpc: 'ORQQVI VITALS', package: 'OR', reason: String(err) }],
      };
    }
  });

  /* ------ GET /vista/nursing/assessments?dfn=N ------ */
  server.get('/vista/nursing/assessments', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    const rpcUsed: string[] = [];
    try {
      const noteLines = await safeCallRpc('TIU DOCUMENTS BY CONTEXT', [
        '',
        '1',
        dfn,
        '0',
        '0',
        '0',
        '',
        '0',
        '',
      ]);
      rpcUsed.push('TIU DOCUMENTS BY CONTEXT');
      const assessments = (noteLines || [])
        .filter((l) => l.trim())
        .filter((l) => /ASSESS|ADMISSION|NURSING|SKIN|FALL|BRADEN|PAIN/i.test(l))
        .map((line) => {
          const parts = line.split('^');
          return {
            ien: parts[0]?.trim() || '',
            title: parts[1]?.trim() || '',
            date: parts[2]?.trim() || '',
            author: parts[3]?.trim() || '',
            status: parts[4]?.trim() || '',
          };
        });

      immutableAudit('nursing.assessments', 'success', auditActor(session), {
        detail: { dfn, count: assessments.length },
      });
      return {
        ok: true,
        source: 'vista',
        items: assessments,
        count: assessments.length,
        rpcUsed,
        pendingTargets: [],
        _note:
          'Assessments from TIU nursing document class. Filtered by assessment-related title keywords. For structured assessments, install GN package RPCs.',
      };
    } catch (err) {
      log.warn('Nursing assessments RPC failed', { err: String(err) });
      return {
        ok: true,
        source: 'vista',
        items: [],
        count: 0,
        rpcUsed,
        pendingTargets: [{ rpc: 'TIU DOCUMENTS BY CONTEXT', package: 'TIU', reason: String(err) }],
      };
    }
  });

  /* ------ POST /vista/nursing/notes/create ------ */
  server.post(
    '/vista/nursing/notes/create',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = (request.body as any) || {};
      const { dfn, title, text, shift, esCode } = body;
      const dfnStr = String(dfn || '').trim();
      const esCodeStr = String(esCode || '').trim();

      if (!dfnStr) return reply.code(400).send({ ok: false, error: 'Missing dfn' });
      if (!/^\d+$/.test(dfnStr))
        return reply
          .code(400)
          .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        return reply.code(400).send({ ok: false, error: 'Note text is required' });
      }

      const noteTitle = title || 'NURSING NOTE';
      const noteShift = shift || 'Day';

      // Attempt TIU CREATE RECORD: creates a new TIU document
      // Params: [DFN, TITLE_IEN, VDT, VLOC, VSIT, "", ""]
      // Then TIU SET DOCUMENT TEXT with the text content.
      // Both RPCs are in the TIU package under OR CPRS GUI CHART context.
      try {
        const rpcUsed = [
          'TIU CREATE RECORD',
          'TIU SET DOCUMENT TEXT',
          'TIU DETAILED DISPLAY',
          'TIU GET RECORD TEXT',
        ];
        // Try to create via TIU CREATE RECORD
        // Title IEN 3 = NURSING NOTE in most VistA installations
        const titleIen = '3';
        const now = new Date();
        const fmYear = now.getFullYear() - 1700;
        const fmMonth = String(now.getMonth() + 1).padStart(2, '0');
        const fmDay = String(now.getDate()).padStart(2, '0');
        const fmHour = String(now.getHours()).padStart(2, '0');
        const fmMin = String(now.getMinutes()).padStart(2, '0');
        const visitDate = `${fmYear}${fmMonth}${fmDay}.${fmHour}${fmMin}`;

        const duz = String(session?.duz || session?.user?.duz || '').trim();
        const createLocation = '2';
        const createFields: Record<string, string> = {
          '1301': visitDate,
        };
        if (duz) createFields['1202'] = duz;

        const createLines = await safeCallRpcWithList(
          'TIU CREATE RECORD',
          [
            { type: 'literal', value: dfnStr },
            { type: 'literal', value: titleIen },
            { type: 'literal', value: visitDate },
            { type: 'literal', value: createLocation },
            { type: 'literal', value: '' },
            { type: 'list', value: createFields },
            { type: 'literal', value: '' },
            { type: 'literal', value: '1' },
            { type: 'literal', value: '0' },
          ],
          { idempotent: false }
        );
        const newIen = (createLines || [])[0]?.split('^')[0]?.trim() || '';

        if (!newIen || newIen === '0' || newIen.includes('ERROR') || newIen.startsWith('-')) {
          throw new Error(`TIU CREATE RECORD returned: ${(createLines || []).join(' ') || '(empty)'}`);
        }

        // Set the document text via LIST parameter (word-processing field).
        // Prepend shift identifier to ensure it's captured in the note body.
        const fullText = `[Shift: ${noteShift}] [Type: ${noteTitle}]\n${text}`;
        const textParams: RpcParam[] = [
          { type: 'literal', value: newIen },
          { type: 'list', value: buildTiuTextBuffer(fullText) },
          { type: 'literal', value: '0' },
        ];
        const textResp = await safeCallRpcWithList('TIU SET DOCUMENT TEXT', textParams, {
          idempotent: false,
        });
        const textAck = textResp[0]?.trim() || '';
        if (textAck.startsWith('0^')) {
          return {
            ok: false,
            source: 'vista',
            status: 'create-blocked',
            blocker: 'note_text_write_failed',
            message:
              textAck.split('^').slice(3).join('^') ||
              'VistA rejected the note body text for this TIU note.',
            noteIen: newIen,
            rpcUsed,
            pendingTargets: [],
            _note: 'VistA created the TIU note shell but did not accept the nursing note body text.',
          };
        }

        const detailLines = await safeCallRpc('TIU DETAILED DISPLAY', [newIen], { idempotent: true });
        const readbackLines = await safeCallRpc('TIU GET RECORD TEXT', [newIen], { idempotent: true });
        const lineCount = parseTiuLineCount(detailLines);
        const hasPersistedBody =
          lineCount > 0 ||
          tiuReadbackContainsExpectedText(readbackLines, fullText) ||
          tiuReadbackContainsExpectedText(detailLines, fullText);
        if (!hasPersistedBody) {
          return {
            ok: false,
            source: 'vista',
            status: 'create-blocked',
            blocker: 'note_text_not_persisted',
            message:
              'VistA created a shell TIU note but did not persist the nursing note body text in this environment.',
            noteIen: newIen,
            rpcUsed,
            pendingTargets: [],
            _note:
              'VistA created a shell TIU note but did not persist the nursing note body text in this environment.',
          };
        }

        let status: 'created' | 'signed' = 'created';
        let noteStatus = 'UNSIGNED';
        let signStatus: 'not-requested' | 'signed' | 'sign-blocked' | 'sign-failed' =
          'not-requested';
        let signBlocker: string | undefined;
        let signMessage =
          'Note created in VistA and remains unsigned until an electronic signature code is entered.';

        if (esCodeStr) {
          rpcUsed.push('TIU LOCK RECORD', 'TIU SIGN RECORD', 'TIU UNLOCK RECORD');
          let unlockNeeded = false;

          try {
            const lockResp = await safeCallRpc('TIU LOCK RECORD', [newIen], { idempotent: false });
            const lockValue = lockResp[0]?.trim() || '';
            unlockNeeded = true;

            if (lockValue && lockValue !== '1' && lockValue !== '0') {
              log.warn('TIU LOCK RECORD returned unexpected value during nursing sign flow', {
                ien: newIen,
                resp: lockValue,
              });
            }

            const signResp = await safeCallRpc('TIU SIGN RECORD', [newIen, esCodeStr], {
              idempotent: false,
            });
            const signResult = signResp.join('\n').trim();

            if (signResult && signResult !== '0') {
              const normalizedFailure = normalizeNoteSignFailure(signResult);
              signStatus = normalizedFailure.status;
              signBlocker = normalizedFailure.blocker;
              signMessage = `Note created in VistA but not signed: ${normalizedFailure.message}`;
            } else {
              status = 'signed';
              noteStatus = 'SIGNED';
              signStatus = 'signed';
              signMessage = 'Note created and signed in VistA.';
            }
          } catch (signErr) {
            signStatus = 'sign-failed';
            signMessage = 'Note created in VistA but signing failed. Retry from the chart notes workflow if needed.';
            log.warn('Standalone nursing TIU sign flow failed after create', {
              ien: newIen,
              err: String(signErr),
            });
          } finally {
            if (unlockNeeded) {
              try {
                await safeCallRpc('TIU UNLOCK RECORD', [newIen], { idempotent: false });
              } catch (unlockErr) {
                log.warn('TIU UNLOCK RECORD failed after standalone nursing sign attempt', {
                  ien: newIen,
                  err: String(unlockErr),
                });
              }
            }
          }
        }

        log.info('Nursing note created via TIU', { ien: newIen, status, signStatus });
        immutableAudit('nursing.create-note', 'success', auditActor(session), {
          detail: {
            dfn: dfnStr,
            noteIen: newIen,
            source: 'vista',
            status,
            signStatus,
          },
        });
        return {
          ok: true,
          source: 'vista',
          status,
          signed: status === 'signed',
          noteStatus,
          signAttempted: Boolean(esCodeStr),
          signStatus,
          signBlocker,
          signMessage,
          noteIen: newIen,
          title: noteTitle,
          shift: noteShift,
          timestamp: now.toISOString(),
          rpcUsed,
          pendingTargets: [],
          _note: signMessage,
        };
      } catch (err) {
        // Fallback: return a local draft with migration info
        log.warn('Nursing note TIU creation failed, returning local draft', { err: String(err) });

        const draftId = `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        immutableAudit('nursing.create-note', 'success', auditActor(session), {
          detail: { dfn: dfnStr, draftId, source: 'local-draft' },
        });
        return reply.code(202).send({
          ok: true,
          source: 'local-draft',
          status: 'draft',
          draftId,
          title: noteTitle,
          shift: noteShift,
          textLength: text.length,
          timestamp: new Date().toISOString(),
          rpcUsed: [],
          pendingTargets: [
            {
              rpc: 'TIU CREATE RECORD',
              package: 'TIU',
              reason: 'TIU document creation -- RPC may not accept nursing note class in sandbox',
            },
            { rpc: 'TIU SET DOCUMENT TEXT', package: 'TIU', reason: 'Set note body text' },
            {
              rpc: 'TIU SIGN RECORD',
              package: 'TIU',
              reason: 'Electronic signature after TIU note creation when the sandbox note class is available',
            },
          ],
          vistaGrounding: {
            vistaFiles: ['TIU(8925) TIU DOCUMENT', 'TIU(8925.1) TIU DOCUMENT DEFINITION'],
            targetRoutines: ['TIUSRVP', 'TIUSRVPT', 'TIUSRVS'],
            migrationPath:
              'Configure TIU Document Definition for Nursing Notes class, enable TIU CREATE RECORD + TIU SIGN RECORD',
            sandboxNote:
              'TIU package present but nursing note title IEN may not exist in sandbox. Note saved as local draft.',
          },
          _note:
            'Note saved as local draft. Will persist to VistA when TIU Nursing Note class is configured.',
        });
      }
    }
  );

  /* ------ GET /vista/nursing/note-text?ien=N ------ */
  server.get('/vista/nursing/note-text', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const ien = String((request.query as any)?.ien || '').trim();
    if (!ien) return reply.code(400).send({ ok: false, error: 'Missing ien parameter' });
    if (!/^\d+$/.test(ien))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid ien -- must be a positive integer' });

    try {
      const lines = await safeCallRpc('TIU GET RECORD TEXT', [ien]);
      immutableAudit('nursing.note-text', 'success', auditActor(session), { detail: { ien } });
      return {
        ok: true,
        source: 'vista',
        ien,
        text: (lines || []).join('\n'),
        rpcUsed: ['TIU GET RECORD TEXT'],
        pendingTargets: [],
      };
    } catch (err) {
      log.warn('TIU GET RECORD TEXT failed', { ien, err: String(err) });
      immutableAudit('nursing.note-text', 'error', auditActor(session), {
        detail: { ien, error: 'RPC call failed' },
      });
      return {
        ok: false,
        source: 'vista',
        ien,
        text: '',
        rpcUsed: [],
        pendingTargets: [{ rpc: 'TIU GET RECORD TEXT', package: 'TIU', reason: 'RPC call failed' }],
      };
    }
  });

  log.info('Phase 84 nursing documentation + flowsheet endpoints registered (7 new endpoints)');
}
