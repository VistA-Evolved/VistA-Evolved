/**
 * Inpatient Operations Routes — Phase 83: Census + Bedboard + ADT + Movement
 *
 * Extends Phase 67 ADT layer with enterprise inpatient views.
 * VistA-first: leverages ORQPT WARDS, ORQPT WARD PATIENTS, ORWPT16 ADMITLST.
 * Where VistA RPCs lack detail (bed assignment, movement history), endpoints
 * return structured integration-pending blockers with exact FileMan targets.
 *
 * Endpoints:
 *   GET  /vista/inpatient/wards                   — Ward list with census counts
 *   GET  /vista/inpatient/ward-census?ward=IEN     — Enriched census for a ward
 *   GET  /vista/inpatient/bedboard?ward=IEN        — Bed-level occupancy grid
 *   GET  /vista/inpatient/patient-movements?dfn=N  — Patient movement timeline
 *   POST /vista/inpatient/admit                    — (integration-pending)
 *   POST /vista/inpatient/transfer                 — (integration-pending)
 *   POST /vista/inpatient/discharge                — (integration-pending)
 *
 * Auth: session-based (/vista/* catch-all in security.ts).
 * RBAC: read endpoints require session; write stubs note role requirements.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../../auth/auth-routes.js';
import { safeCallRpc } from '../../lib/rpc-resilience.js';
import { immutableAudit } from '../../lib/immutable-audit.js';
import { log } from '../../lib/logger.js';
// tier0Gate removed -- ADT writes redirect to /vista/adt/* which has PG tracking

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
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface WardSummary {
  ien: string;
  name: string;
  patientCount: number;
}

interface CensusPatient {
  dfn: string;
  name: string;
  admitDate: string;
  ward: string;
  roomBed: string;
}

interface BedSlot {
  ward: string;
  wardIen: string;
  roomBed: string;
  status: 'occupied' | 'empty';
  patientDfn: string | null;
  patientName: string | null;
  patientInitials: string | null;
  admitDate: string | null;
}

interface MovementEvent {
  date: string;
  type: string;
  fromLocation: string;
  toLocation: string;
  ward: string;
  roomBed: string;
  provider: string;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                              */
/* ------------------------------------------------------------------ */

/** Numeric IEN/DFN guard -- filters out MUMPS error text lines. */
const NUMERIC_RE = /^\d+$/;

/** FileMan date/time guard used by ORWPT16 ADMITLST. */
const FILEMAN_DATE_RE = /^\d+(?:\.\d+)?$/;

/** Parse IEN^NAME lines from ORQPT WARDS */
function parseWardList(lines: string[]): Array<{ ien: string; name: string }> {
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

/** Parse DFN^NAME from ORQPT WARD PATIENTS */
function parsePatientList(lines: string[]): Array<{ dfn: string; name: string }> {
  return parseWardPatientList(lines).map(({ dfn, name }) => ({ dfn, name }));
}

/** Parse DFN^NAME^ROOM/BED from ORQPT WARD PATIENTS */
function parseWardPatientList(lines: string[]): Array<{ dfn: string; name: string; roomBed: string }> {
  const results: Array<{ dfn: string; name: string; roomBed: string }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const dfn = parts[0]?.trim() || '';
    if (!NUMERIC_RE.test(dfn)) continue;
    results.push({
      dfn,
      name: parts[1]?.trim() || '',
      roomBed: parts[2]?.trim() || '',
    });
  }
  return results;
}

function parseMovementLocation(locationText: string): {
  fromLocation: string;
  toLocation: string;
  ward: string;
} {
  const text = locationText.trim();
  if (!text) {
    return { fromLocation: '', toLocation: '', ward: '' };
  }
  const toMatch = text.match(/^TO:\s*(.+)$/i);
  if (toMatch) {
    const value = toMatch[1].trim();
    return { fromLocation: '', toLocation: value, ward: value };
  }
  const fromMatch = text.match(/^FROM:\s*(.+)$/i);
  if (fromMatch) {
    const value = fromMatch[1].trim();
    return { fromLocation: value, toLocation: '', ward: value };
  }
  return { fromLocation: '', toLocation: text, ward: text };
}

/** Parse ORWPT16 ADMITLST: FM_DATE^MOVEMENT_IEN^DISPLAY_DATE^TYPE^LOCATION */
function parseAdmissionList(lines: string[]): Array<{
  movementDateTime: string;
  movementIen: string;
  admitDate: string;
  movementType: string;
  locationText: string;
  fromLocation: string;
  toLocation: string;
  ward: string;
}> {
  const results: Array<{
    movementDateTime: string;
    movementIen: string;
    admitDate: string;
    movementType: string;
    locationText: string;
    fromLocation: string;
    toLocation: string;
    ward: string;
  }> = [];
  for (const line of lines) {
    if (!line?.trim()) continue;
    const parts = line.split('^');
    const movementDateTime = parts[0]?.trim() || '';
    if (!FILEMAN_DATE_RE.test(movementDateTime)) continue;
    const locationText = parts[4]?.trim() || '';
    const movementLocation = parseMovementLocation(locationText);
    results.push({
      movementDateTime,
      movementIen: parts[1]?.trim() || '',
      admitDate: parts[2]?.trim() || '',
      movementType: parts[3]?.trim() || '',
      locationText,
      fromLocation: movementLocation.fromLocation,
      toLocation: movementLocation.toLocation,
      ward: movementLocation.ward,
    });
  }
  return results;
}

/** Extract initials from patient name (LAST,FIRST -> FL) */
function getInitials(name: string): string {
  if (!name) return '';
  const parts = name.split(',').map((s) => s.trim());
  const last = parts[0]?.[0] || '';
  const first = parts[1]?.[0] || '';
  return (first + last).toUpperCase();
}

/** Standard integration-pending response */
function pendingFallback(reply: FastifyReply, rpcName: string, err: any) {
  const errMsg = err?.message || String(err);
  log.warn(`Inpatient ${rpcName} failed -- returning integration-pending`, {
    err: errMsg,
  });
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
/* Routes                                                               */
/* ------------------------------------------------------------------ */

export default async function inpatientRoutes(server: FastifyInstance): Promise<void> {
  /**
   * GET /vista/inpatient/wards
   * Returns ward list with census counts (patients per ward).
   * Uses: ORQPT WARDS + ORQPT WARD PATIENTS (per ward).
   *
   * For large installations, consider caching ward census counts
   * or using a custom ZVE* RPC that returns counts in a single call.
   */
  server.get('/vista/inpatient/wards', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    try {
      const wardLines = await safeCallRpc('ORQPT WARDS', []);
      const wards = parseWardList(wardLines);

      // Build ward summaries with patient counts
      // For each ward, call ORQPT WARD PATIENTS to get the count.
      // This is N+1; a production ZVE* RPC would batch this.
      const summaries: WardSummary[] = [];
      for (const w of wards) {
        let count = 0;
        try {
          const patLines = await safeCallRpc('ORQPT WARD PATIENTS', [w.ien]);
          count = parsePatientList(patLines).length;
        } catch {
          // Ward may have no patients; count stays 0.
        }
        summaries.push({ ien: w.ien, name: w.name, patientCount: count });
      }

      immutableAudit('inpatient.wards', 'success', auditActor(request), {
        detail: { wardCount: summaries.length },
      });

      return reply.send({
        ok: true,
        source: 'vista',
        count: summaries.length,
        results: summaries,
        rpcUsed: ['ORQPT WARDS', 'ORQPT WARD PATIENTS'],
        pendingTargets: [],
        _note: 'patientCount uses N+1 ward queries; production should use ZVEADT WARDS RPC',
      });
    } catch (err: any) {
      immutableAudit('inpatient.wards', 'failure', auditActor(request), {
        detail: { error: err?.message },
      });
      return pendingFallback(reply, 'ORQPT WARDS', err);
    }
  });

  /**
   * GET /vista/inpatient/ward-census?ward=IEN
   * Returns enriched patient list for a specific ward.
   * Uses: ORQPT WARD PATIENTS for patient list,
   *       ORWPT16 ADMITLST per patient for admit details.
   */
  server.get(
    '/vista/inpatient/ward-census',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const wardIen = (request.query as any)?.ward;
      if (!wardIen) {
        return reply.status(400).send({ ok: false, error: 'ward query parameter required' });
      }

      try {
        // Get patient list for ward
        const patientLines = await safeCallRpc('ORQPT WARD PATIENTS', [String(wardIen)]);
        const patients = parseWardPatientList(patientLines);
        let selectedWardName = '';
        try {
          const wardLines = await safeCallRpc('ORQPT WARDS', []);
          selectedWardName = parseWardList(wardLines).find((ward) => ward.ien === String(wardIen))?.name || '';
        } catch {
          /* ward name unavailable */
        }

        // Enrich each patient with admission info
        const census: CensusPatient[] = [];
        for (const pat of patients) {
          let admitDate = '';
          let ward = selectedWardName;
          try {
            const admitLines = await safeCallRpc('ORWPT16 ADMITLST', [pat.dfn]);
            const admissions = parseAdmissionList(admitLines);
            // Most recent admission is typically first
            if (admissions.length > 0) {
              const matchingAdmission = admissions.find((entry) => entry.ward === selectedWardName) || admissions[0];
              admitDate = matchingAdmission.admitDate || matchingAdmission.movementDateTime;
              ward = matchingAdmission.toLocation || matchingAdmission.ward || ward;
            }
          } catch {
            // Admission details unavailable; patient still appears in census
          }
          census.push({
            dfn: pat.dfn,
            name: pat.name,
            admitDate,
            ward,
            roomBed: pat.roomBed,
          });
        }

        immutableAudit('inpatient.census', 'success', auditActor(request), {
          detail: { wardIen: String(wardIen), patientCount: census.length },
        });

        return reply.send({
          ok: true,
          source: 'vista',
          count: census.length,
          results: census,
          rpcUsed: ['ORQPT WARD PATIENTS', 'ORWPT16 ADMITLST', 'ORQPT WARDS'],
          pendingTargets: [],
          wardIen: String(wardIen),
        });
      } catch (err: any) {
        immutableAudit('inpatient.census', 'failure', auditActor(request), {
          detail: { wardIen: String(wardIen), error: err?.message },
        });
        return pendingFallback(reply, 'ORQPT WARD PATIENTS', err);
      }
    }
  );

  /**
   * GET /vista/inpatient/bedboard?ward=IEN
   * Returns bed-level occupancy for a ward.
   *
   * VistA bed data lives in ROOM-BED (405.4) cross-referenced from
   * WARD LOCATION (42). The ORQPT RPCs don't expose bed-level data.
   * This endpoint enriches ORQPT WARD PATIENTS results with admission
   * room/bed from ORWPT16.
   *
   * For true bed management (empty beds, OOS beds), a custom ZVEBED* RPC
   * reading ^DIC(42.4) Room-Bed file would be needed.
   */
  server.get('/vista/inpatient/bedboard', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    const wardIen = (request.query as any)?.ward;
    if (!wardIen) {
      return reply.status(400).send({ ok: false, error: 'ward query parameter required' });
    }

    try {
      // Get patients in ward
      const patientLines = await safeCallRpc('ORQPT WARD PATIENTS', [String(wardIen)]);
      const patients = parseWardPatientList(patientLines);

      // Get ward name from ORQPT WARDS (for display)
      let wardName = `Ward ${wardIen}`;
      try {
        const wardLines = await safeCallRpc('ORQPT WARDS', []);
        const wards = parseWardList(wardLines);
        const found = wards.find((w) => w.ien === String(wardIen));
        if (found) wardName = found.name;
      } catch {
        // Fall back to generic name
      }

      // Build occupied bed slots from admission data
      const beds: BedSlot[] = [];
      for (const pat of patients) {
        let admitDate = '';
        try {
          const admitLines = await safeCallRpc('ORWPT16 ADMITLST', [pat.dfn]);
          const admissions = parseAdmissionList(admitLines);
          if (admissions.length > 0) {
            admitDate = admissions[0].admitDate || admissions[0].movementDateTime || '';
          }
        } catch {
          // Bed info unavailable
        }
        beds.push({
          ward: wardName,
          wardIen: String(wardIen),
          roomBed: pat.roomBed || 'Unassigned',
          status: 'occupied',
          patientDfn: pat.dfn,
          patientName: pat.name,
          patientInitials: getInitials(pat.name),
          admitDate,
        });
      }

      immutableAudit('inpatient.bedboard', 'success', auditActor(request), {
        detail: { wardIen: String(wardIen), wardName, bedCount: beds.length },
      });

      return reply.send({
        ok: true,
        source: 'vista',
        count: beds.length,
        results: beds,
        wardName,
        wardIen: String(wardIen),
        rpcUsed: ['ORQPT WARD PATIENTS', 'ORWPT16 ADMITLST', 'ORQPT WARDS'],
        pendingTargets: ['ZVEADT BEDS'],
        _note:
          'Only occupied beds shown. Empty/OOS bed data requires ZVEADT BEDS RPC reading ROOM-BED (405.4) / WARD LOCATION (42).',
      });
    } catch (err: any) {
      immutableAudit('inpatient.bedboard', 'failure', auditActor(request), {
        detail: { wardIen: String(wardIen), error: err?.message },
      });
      return pendingFallback(reply, 'ORQPT WARD PATIENTS', err);
    }
  });

  /**
   * GET /vista/inpatient/patient-movements?dfn=N
   * Returns movement timeline for a patient.
   *
   * ORWPT16 ADMITLST returns admission episodes but NOT individual
   * movements (transfers between wards/beds). Full movement history
   * lives in PATIENT MOVEMENT (405) file, which requires either:
   *   - DG REGISTRATION MOVEMENT RPC (if available in context), or
   *   - Custom ZVEADTM LIST RPC reading ^DGPM(405,D0,...)
   *
   * This endpoint returns admission episodes from ORWPT16 as partial
   * movement data + a structured pending target for full movement history.
   */
  server.get(
    '/vista/inpatient/patient-movements',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      const dfn = (request.query as any)?.dfn;
      if (!dfn) {
        return reply.status(400).send({ ok: false, error: 'dfn query parameter required' });
      }

      try {
        const admitLines = await safeCallRpc('ORWPT16 ADMITLST', [String(dfn)]);
        const admissions = parseAdmissionList(admitLines);

        // Convert admissions to movement events
        const movements: MovementEvent[] = admissions.map((adm) => ({
          date: adm.admitDate || adm.movementDateTime,
          type: adm.movementType || 'ADMISSION',
          fromLocation: adm.fromLocation,
          toLocation: adm.toLocation,
          ward: adm.ward,
          roomBed: '',
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
          _note:
            'Only admission events shown. Transfer/discharge movements require ZVEADT MVHIST RPC reading PATIENT MOVEMENT (405).',
          vistaGrounding: {
            vistaFiles: ['PATIENT MOVEMENT (405)', 'PATIENT MOVEMENT TYPE (405.1)'],
            targetRoutines: ['DGPMV', 'DGPMU', 'ZVEADT'],
            migrationPath:
              'Phase 137B: Install ZVEADT.m and register ZVEADT MVHIST RPC to read ^DGPM(405) movement chain',
            sandboxNote:
              'ORWPT16 ADMITLST returns admission episodes only, not inter-ward transfers or discharges',
          },
        });
      } catch (err: any) {
        immutableAudit('inpatient.movements', 'failure', auditActor(request), {
          detail: { dfn: String(dfn), error: err?.message },
        });
        return pendingFallback(reply, 'ORWPT16 ADMITLST', err);
      }
    }
  );

  /**
   * POST /vista/inpatient/admit
   * DGPM NEW ADMISSION is NOT registered in VistA File 8994 (confirmed via ZVEPROB.m).
   * Use /vista/adt/admit for the PG-tracked ADT workflow until DGPM RPCs are registered.
   */
  server.post('/vista/inpatient/admit', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    immutableAudit('inpatient.admit', 'redirect', auditActor(request), {
      detail: { redirect: '/vista/adt/admit', reason: 'DGPM NEW ADMISSION not in File 8994' },
    });
    return reply.status(307).header('location', '/vista/adt/admit').send({
      ok: false,
      redirect: '/vista/adt/admit',
      reason:
        'DGPM NEW ADMISSION RPC not registered in this VistA instance. Use /vista/adt/admit which tracks ADT events and will call DGPM when the RPC is registered.',
      vistaAction: 'Register DGPM NEW ADMISSION in File 8994 and add to OR CPRS GUI CHART context',
    });
  });

  /**
   * POST /vista/inpatient/transfer
   * DGPM NEW TRANSFER is NOT registered in VistA File 8994.
   */
  server.post('/vista/inpatient/transfer', async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    immutableAudit('inpatient.transfer', 'redirect', auditActor(request), {
      detail: { redirect: '/vista/adt/transfer', reason: 'DGPM NEW TRANSFER not in File 8994' },
    });
    return reply.status(307).header('location', '/vista/adt/transfer').send({
      ok: false,
      redirect: '/vista/adt/transfer',
      reason:
        'DGPM NEW TRANSFER RPC not registered in this VistA instance. Use /vista/adt/transfer.',
      vistaAction: 'Register DGPM NEW TRANSFER in File 8994 and add to OR CPRS GUI CHART context',
    });
  });

  /**
   * POST /vista/inpatient/discharge
   * DGPM NEW DISCHARGE is NOT registered in VistA File 8994.
   */
  server.post(
    '/vista/inpatient/discharge',
    async (request: FastifyRequest, reply: FastifyReply) => {
      await requireSession(request, reply);
      immutableAudit('inpatient.discharge', 'redirect', auditActor(request), {
        detail: { redirect: '/vista/adt/discharge', reason: 'DGPM NEW DISCHARGE not in File 8994' },
      });
      return reply.status(307).header('location', '/vista/adt/discharge').send({
        ok: false,
        redirect: '/vista/adt/discharge',
        reason:
          'DGPM NEW DISCHARGE RPC not registered in this VistA instance. Use /vista/adt/discharge.',
        vistaAction:
          'Register DGPM NEW DISCHARGE in File 8994 and add to OR CPRS GUI CHART context',
      });
    }
  );

  log.info('Phase 83+137 inpatient routes registered (7 endpoints, HIPAA audit)');
}
