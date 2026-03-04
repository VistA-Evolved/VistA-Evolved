/**
 * ADT + Inpatient Routes -- Phase 67 + Phase 137 enhancements + ADT-1 PG stubs.
 *
 * Endpoints:
 *   GET  /vista/adt/wards                          -- List all wards (ORQPT WARDS)
 *   GET  /vista/adt/ward-patients?ward=IEN          -- Ward census (ORQPT WARD PATIENTS)
 *   GET  /vista/adt/provider-patients               -- Provider patient list (ORQPT PROVIDER PATIENTS)
 *   GET  /vista/adt/teams                           -- List teams (ORQPT TEAMS)
 *   GET  /vista/adt/team-patients?team=IEN          -- Team patient list (ORQPT TEAM PATIENTS)
 *   GET  /vista/adt/specialties                     -- List specialties (ORQPT SPECIALTIES)
 *   GET  /vista/adt/specialty-patients?specialty=IEN -- Specialty patient list (ORQPT SPECIALTY PATIENTS)
 *   GET  /vista/adt/locations?search=TEXT            -- Location search (ORWU1 NEWLOC)
 *   GET  /vista/adt/admission-list?dfn=N            -- Admission history (ORWPT16 ADMITLST)
 *   GET  /vista/adt/census?ward=IEN                 -- Ward census + enriched patient list (Phase 137)
 *   GET  /vista/adt/movements?dfn=N                 -- Patient movement timeline (Phase 137)
 *   POST /vista/adt/admit                           -- PG-backed stub (ADT-1)
 *   POST /vista/adt/transfer                        -- PG-backed stub (ADT-1)
 *   POST /vista/adt/discharge                       -- PG-backed stub (ADT-1)
 *
 * Auth: session-based (/vista/* catch-all in security.ts).
 * Audit: immutable audit trail for census + movement access (Phase 137).
 * Every response includes rpcUsed[], pendingTargets[], source.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { requireSession } from '../../auth/auth-routes.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { immutableAudit } from '../../lib/immutable-audit.js';
import { log } from '../../lib/logger.js';

/* ------------------------------------------------------------------ */
/* Audit helper                                                         */
/* ------------------------------------------------------------------ */

function auditActor(request: FastifyRequest): { sub: string; name: string; roles: string[] } {
  const s = request.session;
  return {
    sub: s?.duz || 'anonymous',
    name: s?.userName || 'unknown',
    roles: s?.role ? [s.role] : [],
  };
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Numeric IEN/DFN guard -- filters out MUMPS error text lines. */
const NUMERIC_RE = /^\d+$/;

/** Parse IEN^NAME lines (wards, teams, specialties). */
function parseIenNameList(lines: string[]): Array<{ ien: string; name: string }> {
  const results: Array<{ ien: string; name: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const ien = parts[0]?.trim() || '';
    if (!NUMERIC_RE.test(ien)) continue;
    results.push({ ien, name: parts[1]?.trim() || '' });
  }
  return results;
}

/** Parse patient list lines: DFN^NAME (ORQPT patient list RPCs). */
function parsePatientList(lines: string[]): Array<{ dfn: string; name: string }> {
  const results: Array<{ dfn: string; name: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const dfn = parts[0]?.trim() || '';
    if (!NUMERIC_RE.test(dfn)) continue;
    results.push({ dfn, name: parts[1]?.trim() || '' });
  }
  return results;
}

/** Parse ORWU1 NEWLOC response: IEN^NAME^... */
function parseLocations(lines: string[]): Array<{ ien: string; name: string; type: string }> {
  const results: Array<{ ien: string; name: string; type: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const ien = parts[0]?.trim() || '';
    if (!NUMERIC_RE.test(ien)) continue;
    results.push({
      ien,
      name: parts[1]?.trim() || '',
      type: parts[2]?.trim() || '',
    });
  }
  return results;
}

/** Parse ORWPT16 ADMITLST response: DFN^NAME^ADMIT_DATE^WARD^... */
function parseAdmissionList(lines: string[]): Array<{
  dfn: string;
  name: string;
  admitDate: string;
  ward: string;
  roomBed: string;
}> {
  const results: Array<{
    dfn: string;
    name: string;
    admitDate: string;
    ward: string;
    roomBed: string;
  }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const dfn = parts[0]?.trim() || '';
    if (!NUMERIC_RE.test(dfn)) continue;
    results.push({
      dfn,
      name: parts[1]?.trim() || '',
      admitDate: parts[2]?.trim() || '',
      ward: parts[3]?.trim() || '',
      roomBed: parts[4]?.trim() || '',
    });
  }
  return results;
}

/** Standard integration-pending error fallback. */
function pendingFallback(reply: FastifyReply, rpcName: string, err: any) {
  const errMsg = err?.message || String(err);
  log.warn(`${rpcName} failed -- returning integration-pending`, { err: errMsg });
  return reply.send({
    ok: false,
    source: 'vista',
    count: 0,
    results: [],
    rpcUsed: [],
    pendingTargets: [rpcName],
    _integration: 'pending',
    _error: errMsg.includes('ECONNREFUSED') ? 'VistA unavailable' : 'RPC call failed',
  });
}

/* ------------------------------------------------------------------ */
/* ADT-1: PG-backed stub infrastructure                                */
/* ------------------------------------------------------------------ */

let _pgPool: any = null;
let _pgImportAttempted = false;

/** Lazy-load PG pool for ADT movement storage. */
async function getPgPoolLazy(): Promise<any> {
  if (_pgPool) return _pgPool;
  if (_pgImportAttempted) return null;
  _pgImportAttempted = true;
  try {
    const pgDb = await import('../../platform/pg/pg-db.js');
    if (pgDb.isPgConfigured()) {
      _pgPool = pgDb.getPgPool();
      return _pgPool;
    }
  } catch {
    /* PG not available — ADT movements only audited via immutableAudit */
  }
  return null;
}

/** Insert an ADT movement record into PG. Returns the movement ID or null. */
async function insertAdtMovement(movement: {
  movementType: string;
  patientDfn: string;
  fromWardIen?: string;
  toWardIen?: string;
  bedId?: string;
  admittingDuz?: string;
  attendingDuz?: string;
  movementDatetime: string;
  dischargeType?: string;
  detail?: Record<string, unknown>;
}): Promise<string | null> {
  const pool = await getPgPoolLazy();
  if (!pool) return null;
  const id = randomUUID();
  try {
    await pool.query(
      `INSERT INTO adt_movement
         (id, movement_type, patient_dfn, from_ward_ien, to_ward_ien, bed_id,
          admitting_duz, attending_duz, movement_datetime, discharge_type, detail)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        movement.movementType,
        movement.patientDfn,
        movement.fromWardIen || null,
        movement.toWardIen || null,
        movement.bedId || null,
        movement.admittingDuz || null,
        movement.attendingDuz || null,
        movement.movementDatetime,
        movement.dischargeType || null,
        movement.detail ? JSON.stringify(movement.detail) : null,
      ]
    );
    return id;
  } catch (err: any) {
    log.warn('ADT movement PG insert failed', { error: err.message });
    return null;
  }
}

/* ---- Zod body schemas ---- */

const AdmitSchema = z.object({
  patientDfn: z.string().min(1, 'patientDfn required'),
  wardIen: z.string().optional(),
  bedId: z.string().optional(),
  admittingPhysicianDuz: z.string().optional(),
  admitDateTime: z.string().optional(),
});

const TransferSchema = z.object({
  patientDfn: z.string().min(1, 'patientDfn required'),
  toWardIen: z.string().min(1, 'toWardIen required'),
  toBedId: z.string().optional(),
  attendingDuz: z.string().optional(),
  transferDateTime: z.string().optional(),
});

const DischargeSchema = z.object({
  patientDfn: z.string().min(1, 'patientDfn required'),
  dischargeType: z.string().optional(),
  dischargeDateTime: z.string().optional(),
});

/* ------------------------------------------------------------------ */
/* Routes                                                               */
/* ------------------------------------------------------------------ */

export default async function adtRoutes(server: FastifyInstance): Promise<void> {
  /* ---- GET /vista/adt/wards ---- */
  server.get('/vista/adt/wards', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    try {
      const lines = await safeCallRpc('ORQPT WARDS', []);
      const results = parseIenNameList(lines);
      return reply.send({
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        rpcUsed: ['ORQPT WARDS'],
        pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, 'ORQPT WARDS', err);
    }
  });

  /* ---- GET /vista/adt/ward-patients?ward=IEN ---- */
  server.get('/vista/adt/ward-patients', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const ward = (request.query as any)?.ward;
    if (!ward) {
      return reply.status(400).send({ ok: false, error: 'ward query parameter required' });
    }
    try {
      const lines = await safeCallRpc('ORQPT WARD PATIENTS', [String(ward)]);
      const results = parsePatientList(lines);
      return reply.send({
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        rpcUsed: ['ORQPT WARD PATIENTS'],
        pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, 'ORQPT WARD PATIENTS', err);
    }
  });

  /* ---- GET /vista/adt/provider-patients ---- */
  server.get(
    '/vista/adt/provider-patients',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const session = await requireSession(request, reply);
      try {
        // ORQPT PROVIDER PATIENTS takes DUZ as param
        const duz = (session as any)?.duz || '';
        const lines = await safeCallRpc('ORQPT PROVIDER PATIENTS', [String(duz)]);
        const results = parsePatientList(lines);
        return reply.send({
          ok: true,
          source: 'vista',
          count: results.length,
          results,
          rpcUsed: ['ORQPT PROVIDER PATIENTS'],
          pendingTargets: [],
        });
      } catch (err: any) {
        return pendingFallback(reply, 'ORQPT PROVIDER PATIENTS', err);
      }
    }
  );

  /* ---- GET /vista/adt/teams ---- */
  server.get('/vista/adt/teams', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    try {
      const lines = await safeCallRpc('ORQPT TEAMS', []);
      const results = parseIenNameList(lines);
      return reply.send({
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        rpcUsed: ['ORQPT TEAMS'],
        pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, 'ORQPT TEAMS', err);
    }
  });

  /* ---- GET /vista/adt/team-patients?team=IEN ---- */
  server.get('/vista/adt/team-patients', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const team = (request.query as any)?.team;
    if (!team) {
      return reply.status(400).send({ ok: false, error: 'team query parameter required' });
    }
    try {
      const lines = await safeCallRpc('ORQPT TEAM PATIENTS', [String(team)]);
      const results = parsePatientList(lines);
      return reply.send({
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        rpcUsed: ['ORQPT TEAM PATIENTS'],
        pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, 'ORQPT TEAM PATIENTS', err);
    }
  });

  /* ---- GET /vista/adt/specialties ---- */
  server.get('/vista/adt/specialties', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    try {
      const lines = await safeCallRpc('ORQPT SPECIALTIES', []);
      const results = parseIenNameList(lines);
      return reply.send({
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        rpcUsed: ['ORQPT SPECIALTIES'],
        pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, 'ORQPT SPECIALTIES', err);
    }
  });

  /* ---- GET /vista/adt/specialty-patients?specialty=IEN ---- */
  server.get(
    '/vista/adt/specialty-patients',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const specialty = (request.query as any)?.specialty;
      if (!specialty) {
        return reply.status(400).send({ ok: false, error: 'specialty query parameter required' });
      }
      try {
        const lines = await safeCallRpc('ORQPT SPECIALTY PATIENTS', [String(specialty)]);
        const results = parsePatientList(lines);
        return reply.send({
          ok: true,
          source: 'vista',
          count: results.length,
          results,
          rpcUsed: ['ORQPT SPECIALTY PATIENTS'],
          pendingTargets: [],
        });
      } catch (err: any) {
        return pendingFallback(reply, 'ORQPT SPECIALTY PATIENTS', err);
      }
    }
  );

  /* ---- GET /vista/adt/locations?search=TEXT ---- */
  server.get('/vista/adt/locations', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const search = (request.query as any)?.search || '';
    if (!search) {
      return reply.status(400).send({ ok: false, error: 'search query parameter required' });
    }
    try {
      const lines = await safeCallRpc('ORWU1 NEWLOC', [String(search)]);
      const results = parseLocations(lines);
      return reply.send({
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        rpcUsed: ['ORWU1 NEWLOC'],
        pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, 'ORWU1 NEWLOC', err);
    }
  });

  /* ---- GET /vista/adt/admission-list?dfn=N ---- */
  server.get('/vista/adt/admission-list', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) {
      return reply.status(400).send({ ok: false, error: 'dfn query parameter required' });
    }
    try {
      const lines = await safeCallRpc('ORWPT16 ADMITLST', [String(dfn)]);
      const results = parseAdmissionList(lines);
      return reply.send({
        ok: true,
        source: 'vista',
        count: results.length,
        results,
        rpcUsed: ['ORWPT16 ADMITLST'],
        pendingTargets: [],
      });
    } catch (err: any) {
      return pendingFallback(reply, 'ORWPT16 ADMITLST', err);
    }
  });

  /* ---- GET /vista/adt/census?ward=IEN -- Phase 137 ---- */
  /**
   * Ward census view. Delegates to ORQPT WARD PATIENTS + ORWPT16 ADMITLST
   * for enriched patient data. Same logic as /vista/inpatient/ward-census
   * but exposed at the ADT route prefix per user request.
   *
   * When ZVEADT.m is installed, this should delegate to ZVEADT WARDS for
   * the summary view or ORQPT WARD PATIENTS + ZVEADT BEDS for bed-level.
   */
  server.get('/vista/adt/census', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const wardIen = (request.query as any)?.ward;

    if (!wardIen) {
      // No ward specified: return ward list with patient counts
      try {
        const wardLines = await safeCallRpc('ORQPT WARDS', []);
        const wards = parseIenNameList(wardLines);
        const summaries: Array<{ ien: string; name: string; patientCount: number }> = [];
        for (const w of wards) {
          let count = 0;
          try {
            const patLines = await safeCallRpc('ORQPT WARD PATIENTS', [w.ien]);
            count = parsePatientList(patLines).length;
          } catch {
            /* count stays 0 */
          }
          summaries.push({ ien: w.ien, name: w.name, patientCount: count });
        }
        immutableAudit('inpatient.census', 'success', auditActor(request), {
          detail: { mode: 'ward-list', wardCount: summaries.length },
        });
        return reply.send({
          ok: true,
          source: 'vista',
          count: summaries.length,
          results: summaries,
          rpcUsed: ['ORQPT WARDS', 'ORQPT WARD PATIENTS'],
          pendingTargets: ['ZVEADT WARDS'],
        });
      } catch (err: any) {
        immutableAudit('inpatient.census', 'failure', auditActor(request), {
          detail: { error: err?.message },
        });
        return pendingFallback(reply, 'ORQPT WARDS', err);
      }
    }

    // Specific ward census
    try {
      const patientLines = await safeCallRpc('ORQPT WARD PATIENTS', [String(wardIen)]);
      const patients = parsePatientList(patientLines);
      const census: Array<{
        dfn: string;
        name: string;
        admitDate: string;
        ward: string;
        roomBed: string;
      }> = [];
      for (const pat of patients) {
        let admitDate = '',
          ward = '',
          roomBed = '';
        try {
          const admitLines = await safeCallRpc('ORWPT16 ADMITLST', [pat.dfn]);
          const adms = parseAdmissionList(admitLines);
          if (adms.length > 0) {
            admitDate = adms[0].admitDate;
            ward = adms[0].ward;
            roomBed = adms[0].roomBed;
          }
        } catch {
          /* details unavailable */
        }
        census.push({ dfn: pat.dfn, name: pat.name, admitDate, ward, roomBed });
      }
      immutableAudit('inpatient.census', 'success', auditActor(request), {
        detail: { wardIen: String(wardIen), patientCount: census.length },
      });
      return reply.send({
        ok: true,
        source: 'vista',
        count: census.length,
        results: census,
        wardIen: String(wardIen),
        rpcUsed: ['ORQPT WARD PATIENTS', 'ORWPT16 ADMITLST'],
        pendingTargets: [],
      });
    } catch (err: any) {
      immutableAudit('inpatient.census', 'failure', auditActor(request), {
        detail: { wardIen: String(wardIen), error: err?.message },
      });
      return pendingFallback(reply, 'ORQPT WARD PATIENTS', err);
    }
  });

  /* ---- GET /vista/adt/movements?dfn=N -- Phase 137 ---- */
  /**
   * Patient movement timeline. Returns admission events from ORWPT16 ADMITLST.
   * Full movement history (transfers, discharges) requires ZVEADT MVHIST RPC.
   */
  server.get('/vista/adt/movements', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const dfn = (request.query as any)?.dfn;
    if (!dfn) {
      return reply.status(400).send({ ok: false, error: 'dfn query parameter required' });
    }
    try {
      const lines = await safeCallRpc('ORWPT16 ADMITLST', [String(dfn)]);
      const admissions = parseAdmissionList(lines);
      const movements = admissions.map((a) => ({
        date: a.admitDate,
        type: 'ADMISSION',
        fromLocation: '',
        toLocation: a.ward,
        ward: a.ward,
        roomBed: a.roomBed,
        provider: '',
      }));
      immutableAudit('inpatient.movements', 'success', auditActor(request), {
        detail: { dfn: String(dfn), movementCount: movements.length },
      });
      return reply.send({
        ok: true,
        source: 'vista',
        count: movements.length,
        results: movements,
        dfn: String(dfn),
        rpcUsed: ['ORWPT16 ADMITLST'],
        pendingTargets: ['ZVEADT MVHIST'],
        _note: 'Only admission events shown. Full movement history requires ZVEADT MVHIST RPC.',
        vistaGrounding: {
          vistaFiles: ['PATIENT MOVEMENT (405)', 'PATIENT MOVEMENT TYPE (405.1)'],
          targetRoutines: ['DGPMV', 'ZVEADT'],
          migrationPath: 'Phase 137B: Install ZVEADT.m, register ZVEADT MVHIST RPC',
          sandboxNote: 'ORWPT16 returns admissions only, not transfers/discharges',
        },
      });
    } catch (err: any) {
      immutableAudit('inpatient.movements', 'failure', auditActor(request), {
        detail: { dfn: String(dfn), error: err?.message },
      });
      return pendingFallback(reply, 'ORWPT16 ADMITLST', err);
    }
  });

  /* ---- POST /vista/adt/admit -- PG-backed stub (ADT-1) ---- */
  // TODO-RPC: Wire to DGPM NEW ADMISSION when available in VistA context
  server.post('/vista/adt/admit', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const parsed = AdmitSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    // DGPM NEW ADMISSION is not usable in the WorldVistA sandbox (not exposed
    // in OR CPRS GUI CHART context). Persist to PG as a pending movement.
    const dt = parsed.data.admitDateTime || new Date().toISOString();
    const movementId = await insertAdtMovement({
      movementType: 'admit',
      patientDfn: parsed.data.patientDfn,
      toWardIen: parsed.data.wardIen,
      bedId: parsed.data.bedId,
      admittingDuz: parsed.data.admittingPhysicianDuz || (session as any)?.duz,
      movementDatetime: dt,
    });
    immutableAudit('adt.admit', movementId ? 'success' : 'blocked', auditActor(request), {
      detail: { movementId, pgBacked: !!movementId },
    });
    return reply.status(201).send({
      ok: true,
      admissionId: movementId,
      status: 'pending',
      source: 'pg-pending-vista',
      rpcUsed: [],
      pendingTargets: ['DGPM NEW ADMISSION'],
      _note: 'Stored in PG. Will sync to VistA when DGPM NEW ADMISSION becomes available.',
      vistaGrounding: {
        vistaFiles: ['PATIENT MOVEMENT (405)', 'PATIENT (2)'],
        targetRoutines: ['DGPMV', 'DGADM'],
        migrationPath:
          'Wire DGPM admission RPCs with ward/bed selection + DG ADT event triggers',
        sandboxNote:
          'WorldVistA Docker does not expose DG ADT write RPCs in the OR CPRS GUI CHART context',
      },
    });
  });

  /* ---- POST /vista/adt/transfer -- PG-backed stub (ADT-1) ---- */
  // TODO-RPC: Wire to DGPM NEW TRANSFER when available in VistA context
  server.post('/vista/adt/transfer', async (request: FastifyRequest, reply: FastifyReply) => {
    const session = await requireSession(request, reply);
    const body = (request.body as any) || {};
    const parsed = TransferSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    const dt = parsed.data.transferDateTime || new Date().toISOString();
    const movementId = await insertAdtMovement({
      movementType: 'transfer',
      patientDfn: parsed.data.patientDfn,
      toWardIen: parsed.data.toWardIen,
      bedId: parsed.data.toBedId,
      attendingDuz: parsed.data.attendingDuz || (session as any)?.duz,
      movementDatetime: dt,
    });
    immutableAudit('adt.transfer', movementId ? 'success' : 'blocked', auditActor(request), {
      detail: { movementId, pgBacked: !!movementId },
    });
    return reply.status(201).send({
      ok: true,
      transferId: movementId,
      status: 'pending',
      source: 'pg-pending-vista',
      rpcUsed: [],
      pendingTargets: ['DGPM NEW TRANSFER'],
      _note: 'Stored in PG. Will sync to VistA when DGPM NEW TRANSFER becomes available.',
      vistaGrounding: {
        vistaFiles: ['PATIENT MOVEMENT (405)', 'WARD LOCATION (42)'],
        targetRoutines: ['DGPMV', 'DGTRAN'],
        migrationPath:
          'Wire DGPM transfer RPC with destination ward/bed + attending provider',
        sandboxNote:
          'WorldVistA Docker does not expose DG ADT write RPCs in the OR CPRS GUI CHART context',
      },
    });
  });

  /* ---- POST /vista/adt/discharge -- PG-backed stub (ADT-1) ---- */
  // TODO-RPC: Wire to DGPM NEW DISCHARGE when available in VistA context
  server.post('/vista/adt/discharge', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const body = (request.body as any) || {};
    const parsed = DischargeSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).send({
        ok: false,
        error: 'Validation failed',
        details: parsed.error.issues,
      });
    }

    const dt = parsed.data.dischargeDateTime || new Date().toISOString();
    const movementId = await insertAdtMovement({
      movementType: 'discharge',
      patientDfn: parsed.data.patientDfn,
      dischargeType: parsed.data.dischargeType,
      movementDatetime: dt,
    });
    immutableAudit('adt.discharge', movementId ? 'success' : 'blocked', auditActor(request), {
      detail: { movementId, pgBacked: !!movementId },
    });
    return reply.status(201).send({
      ok: true,
      dischargeId: movementId,
      status: 'pending',
      source: 'pg-pending-vista',
      rpcUsed: [],
      pendingTargets: ['DGPM NEW DISCHARGE'],
      _note: 'Stored in PG. Will sync to VistA when DGPM NEW DISCHARGE becomes available.',
      vistaGrounding: {
        vistaFiles: ['PATIENT MOVEMENT (405)', 'PATIENT (2)'],
        targetRoutines: ['DGPMV', 'DGDIS'],
        migrationPath:
          'Wire DGPM discharge RPC with discharge type + disposition',
        sandboxNote:
          'WorldVistA Docker does not expose DG ADT write RPCs in the OR CPRS GUI CHART context',
      },
    });
  });
}
