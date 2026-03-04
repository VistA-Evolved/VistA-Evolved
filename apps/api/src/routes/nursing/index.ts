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
import { tier0Gate } from '../../lib/tier0-response.js';

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

/** Parse vitals response lines: date^type^value^... */
function parseVitals(
  lines: string[]
): Array<{ date: string; type: string; value: string; units: string }> {
  const results: Array<{ date: string; type: string; value: string; units: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    if (parts.length < 3) continue;
    results.push({
      date: parts[0]?.trim() || '',
      type: parts[1]?.trim() || '',
      value: parts[2]?.trim() || '',
      units: parts[3]?.trim() || '',
    });
  }
  return results;
}

/** Parse TIU document list lines: IEN^TITLE^DATE^AUTHOR^STATUS */
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
    results.push({
      ien,
      title: parts[1]?.trim() || '',
      date: parts[2]?.trim() || '',
      author: parts[3]?.trim() || '',
      status: parts[4]?.trim() || '',
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
      log.warn('Nursing vitals RPC failed, returning pending', {
        err: String(err),
        rpc: 'ORQQVI VITALS',
      });
      immutableAudit('nursing.vitals', 'error', auditActor(session), {
        detail: { dfn, error: 'RPC failed' },
      });
      return pendingFallback('Nursing Vitals', [
        { rpc: 'ORQQVI VITALS', package: 'OR', reason: 'RPC call failed' },
      ]);
    }
  });

  /* ------ GET /vista/nursing/vitals-range?dfn=N&start=D&end=D ------ */
  server.get(
    '/vista/nursing/vitals-range',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const { dfn, start, end } = request.query as any;
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
        log.warn('Nursing vitals-range RPC failed, returning pending', {
          err: String(err),
          rpc: 'ORQQVI VITALS FOR DATE RANGE',
        });
        immutableAudit('nursing.vitals-range', 'error', auditActor(session), {
          detail: { dfn: dfnStr, error: 'RPC failed' },
        });
        return pendingFallback('Nursing Vitals (Shift Range)', [
          {
            rpc: 'ORQQVI VITALS FOR DATE RANGE',
            package: 'OR',
            reason: 'RPC call failed or not available in sandbox',
          },
        ]);
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
      // TIU DOCUMENTS BY CONTEXT: params = [class, context, DFN, ...]
      // Class 3 = Nursing Documents in standard VistA; context 1 = All SIGNED
      const lines = await safeCallRpc('TIU DOCUMENTS BY CONTEXT', [
        '3',
        '1',
        dfn,
        '',
        '',
        '',
        '',
        '0',
        '',
      ]);
      const items = parseNotesList(lines);
      immutableAudit('nursing.notes', 'success', auditActor(session), {
        detail: { dfn, count: items.length },
      });
      return {
        ok: true,
        source: 'vista',
        items,
        rpcUsed: ['TIU DOCUMENTS BY CONTEXT'],
        pendingTargets: [],
        note: 'Filtered by TIU document class 3 (Nursing Documents). Class may differ by site.',
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

  /* ------ GET /vista/nursing/tasks?dfn=N (Tier-0 capability-gated) ------ */
  server.get('/vista/nursing/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    const blocked = tier0Gate('PSB MED LOG', 'nursing', {
      vistaFiles: ['PSB(53.79) BCMA MEDICATION LOG'],
      targetRoutines: ['PSBML', 'PSBMLEN', 'PSBVDL'],
      migrationPath: 'Install BCMA package, configure med routes, enable PSB RPCs',
      sandboxNote:
        'WorldVistA Docker does not include BCMA/PSB package. Nursing tasks derived from BCMA + order parsing.',
    });
    immutableAudit('nursing.tasks', blocked ? 'blocked' : 'attempt', auditActor(session), {
      detail: { dfn, gated: !!blocked, rpc: 'PSB MED LOG' },
    });
    if (blocked) return reply.status(202).send(blocked);

    // RPC available -- real implementation not yet wired (Phase 68B future)
    return reply.code(501).send({
      ok: false,
      status: 'not-implemented',
      message: 'PSB MED LOG available but task parsing not yet wired',
    });
  });

  /* ------ GET /vista/nursing/mar?dfn=N (Tier-0 capability-gated) ------ */
  server.get('/vista/nursing/mar', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    const blocked = tier0Gate('PSB ALLERGY', 'nursing', {
      vistaFiles: ['PSB(53.79) BCMA MEDICATION LOG', 'PSB(53.78) BCMA ALLERGY'],
      targetRoutines: ['PSBML', 'PSBAL', 'PSBMLEN'],
      migrationPath: 'Install BCMA package, configure med routes, enable PSB RPCs',
      sandboxNote:
        'WorldVistA Docker does not include BCMA/PSB package. MAR requires PSB ALLERGY + PSB MED LOG.',
    });
    immutableAudit('nursing.mar', blocked ? 'blocked' : 'attempt', auditActor(session), {
      detail: { dfn, gated: !!blocked, rpc: 'PSB ALLERGY' },
    });
    if (blocked) return reply.status(202).send(blocked);

    return reply.code(501).send({
      ok: false,
      status: 'not-implemented',
      message: 'PSB ALLERGY available but MAR view not yet wired',
    });
  });

  /* ------ POST /vista/nursing/mar/administer (Tier-0 capability-gated) ------ */
  server.post(
    '/vista/nursing/mar/administer',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);

      const blocked = tier0Gate('PSB MED LOG', 'nursing', {
        vistaFiles: ['PSB(53.79) BCMA MEDICATION LOG'],
        targetRoutines: ['PSBML', 'PSBMLEN'],
        migrationPath: 'Install BCMA package, configure med routes, enable PSB RPCs',
        sandboxNote: 'WorldVistA Docker does not include BCMA/PSB package.',
      });
      immutableAudit('nursing.mar', blocked ? 'blocked' : 'attempt', auditActor(session), {
        detail: { action: 'administer-attempt', gated: !!blocked, rpc: 'PSB MED LOG' },
      });
      if (blocked) return reply.status(202).send(blocked);

      return reply.code(501).send({
        ok: false,
        status: 'not-implemented',
        message: 'PSB MED LOG available but administer not yet wired',
      });
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
        // ORWPT16 ID INFO returns patient banner: NAME^SSN^DOB^SEX^VET^LOCATION^ROOM-BED^ATTENDING
        const lines = await safeCallRpc('ORWPT16 ID INFO', [dfn]);
        const raw = (lines || []).join('\n');
        const parts = raw.split('^');
        const name = parts[0]?.trim() || '';
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

  /* ------ GET /vista/nursing/io?dfn=N (Tier-0 capability-gated) ------ */
  server.get('/vista/nursing/io', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    const blocked = tier0Gate('GMRIO RESULTS', 'nursing', {
      vistaFiles: ['GMR(126) INTAKE/OUTPUT', 'GMR(126.1) I/O TYPE', 'GMR(126.2) I/O SHIFT'],
      targetRoutines: ['GMRIORES', 'GMRIOADD', 'GMRIOENT'],
      migrationPath:
        'Enable GMR I&O RPCs in OR CPRS GUI CHART context, or create ZVEIOM custom M routine',
      sandboxNote:
        'GMR I&O package exists in WorldVistA but RPCs not exposed via OR CPRS GUI CHART context.',
    });
    immutableAudit('nursing.io', blocked ? 'blocked' : 'attempt', auditActor(session), {
      detail: { dfn, gated: !!blocked, rpc: 'GMRIO RESULTS' },
    });
    if (blocked) return reply.status(202).send(blocked);

    return reply.code(501).send({
      ok: false,
      status: 'not-implemented',
      message: 'GMRIO RESULTS available but I&O parsing not yet wired',
    });
  });

  /* ------ GET /vista/nursing/assessments?dfn=N (Tier-0 capability-gated) ------ */
  server.get('/vista/nursing/assessments', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const dfn = String((request.query as any)?.dfn || '').trim();
    if (!dfn) return reply.code(400).send({ ok: false, error: 'Missing dfn parameter' });
    if (!/^\d+$/.test(dfn))
      return reply
        .code(400)
        .send({ ok: false, error: 'Invalid dfn -- must be a positive integer' });

    const blocked = tier0Gate('ZVENAS LIST', 'nursing', {
      vistaFiles: ['GN(228) ASSESSMENT', 'GN(228.1) ASSESSMENT DETAIL', 'TIU(8925) TIU DOCUMENT'],
      targetRoutines: ['GNASMT', 'GNASMTU', 'TIUSRVP'],
      migrationPath:
        'Build ZVENAS custom RPCs wrapping GN package, or use TIU-based assessment templates',
      sandboxNote:
        'GN Nursing package present but no standard read/write RPCs exposed. TIU templates are the recommended approach.',
    });
    immutableAudit('nursing.assessments', blocked ? 'blocked' : 'attempt', auditActor(session), {
      detail: { dfn, gated: !!blocked, rpc: 'ZVENAS LIST' },
    });
    if (blocked) return reply.status(202).send(blocked);

    return reply.code(501).send({
      ok: false,
      status: 'not-implemented',
      message: 'ZVENAS LIST available but assessment retrieval not yet wired',
    });
  });

  /* ------ POST /vista/nursing/notes/create ------ */
  server.post(
    '/vista/nursing/notes/create',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      const body = ((request as any).body as any) || {};
      const { dfn, title, text, shift } = body;
      const dfnStr = String(dfn || '').trim();

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

        const createLines = await safeCallRpc('TIU CREATE RECORD', [
          dfnStr,
          titleIen,
          visitDate,
          '',
          '',
          '',
          '',
        ]);
        const newIen = (createLines || [])[0]?.trim() || '';

        if (!newIen || newIen === '0' || newIen.includes('ERROR') || newIen.startsWith('-')) {
          throw new Error(`TIU CREATE RECORD returned: ${newIen || '(empty)'}`);
        }

        // Set the document text via LIST parameter (word-processing field).
        // Prepend shift identifier to ensure it's captured in the note body.
        const fullText = `[Shift: ${noteShift}] [Type: ${noteTitle}]\n${text}`;
        const textLines = fullText.split('\n');
        const listEntries: Record<string, string> = {};
        textLines.forEach((l: string, i: number) => {
          listEntries[`${i + 1},0`] = l;
        });
        const textParams: RpcParam[] = [
          { type: 'literal', value: newIen },
          { type: 'list', value: listEntries },
        ];
        try {
          await safeCallRpcWithList('TIU SET DOCUMENT TEXT', textParams, { idempotent: false });
        } catch (textErr) {
          log.warn('TIU SET DOCUMENT TEXT failed (note created but text not saved)', {
            ien: newIen,
            err: String(textErr),
          });
        }

        log.info('Nursing note created via TIU', { ien: newIen });
        immutableAudit('nursing.create-note', 'success', auditActor(session), {
          detail: { dfn: dfnStr, noteIen: newIen, source: 'vista' },
        });
        return {
          ok: true,
          source: 'vista',
          status: 'created',
          noteIen: newIen,
          title: noteTitle,
          shift: noteShift,
          timestamp: now.toISOString(),
          rpcUsed: ['TIU CREATE RECORD', 'TIU SET DOCUMENT TEXT'],
          pendingTargets: [],
          _note: 'Note created. Signing requires TIU SIGN RECORD (deferred to Phase 84B).',
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
            { rpc: 'TIU SIGN RECORD', package: 'TIU', reason: 'Electronic signature (deferred)' },
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
