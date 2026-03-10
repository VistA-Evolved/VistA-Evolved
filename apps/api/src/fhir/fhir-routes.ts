/**
 * FHIR R4 Gateway Routes -- Phase 178.
 *
 * Read-only FHIR R4 endpoints that map VistA clinical data to standard
 * FHIR R4 resources via the clinical engine adapter layer.
 *
 * Endpoints:
 *   GET  /fhir/metadata                        -- CapabilityStatement
 *   GET  /fhir/Patient/:id                      -- Patient read
 *   GET  /fhir/Patient?name=X                   -- Patient search
 *   GET  /fhir/AllergyIntolerance?patient=N     -- Allergies by patient
 *   GET  /fhir/Condition?patient=N              -- Problems by patient
 *   GET  /fhir/Observation?patient=N&category=  -- Vitals or labs by patient
 *   GET  /fhir/MedicationRequest?patient=N      -- Medications by patient
 *   GET  /fhir/DocumentReference?patient=N      -- Notes by patient
 *   GET  /fhir/Encounter?patient=N              -- Encounters by patient (Phase 179)
 *
 * Auth: session cookie or SMART Bearer JWT (/fhir/* routes use "fhir" AuthLevel in security.ts).
 * Content-Type: application/fhir+json for all FHIR responses.
 *
 * All data flows through the ClinicalEngineAdapter -- no direct RPC calls.
 * Adapter result.ok=false -> OperationOutcome with integration-pending.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { requireSession } from '../auth/auth-routes.js';
import { getAdapter } from '../adapters/adapter-loader.js';
import type { ClinicalEngineAdapter } from '../adapters/clinical-engine/interface.js';
import { log } from '../lib/logger.js';
import { safeCallRpc, safeCallRpcWithList } from '../lib/rpc-resilience.js';
import { safeErr } from '../lib/safe-error.js';

import { buildCapabilityStatement } from './capability-statement.js';
import { registerFhirCache } from './fhir-cache.js';
import {
  toFhirPatient,
  toFhirAllergyIntolerance,
  toFhirCondition,
  toFhirVitalObservation,
  toFhirLabObservation,
  toFhirMedicationRequest,
  toFhirDocumentReference,
  toFhirEncounter,
  toPagedSearchBundle,
} from './mappers.js';
import type { FhirOperationOutcome, FhirResource } from './types.js';
import { enforceFhirScope } from './fhir-scope-enforcement.js';
import {
  filterEncounters,
  filterObservations,
  filterMedicationRequests,
  filterConditions,
  filterAllergyIntolerances,
  filterDocumentReferences,
} from './fhir-search-params.js';

/* ================================================================== */
/* Helpers                                                              */
/* ================================================================== */

const FHIR_CONTENT_TYPE = 'application/fhir+json; charset=utf-8';

/**
 * Extract paging parameters from query string (Phase 234).
 */
function extractPaging(query: Record<string, string | undefined>): {
  offset: number;
  count: number;
} {
  const offset = Math.max(parseInt(query._offset || '', 10) || 0, 0);
  const count = Math.min(Math.max(parseInt(query._count || '', 10) || 20, 1), 100);
  return { offset, count };
}

/**
 * Build a query string for paging links, preserving search params but excluding _offset/_count.
 */
function buildSearchQueryString(query: Record<string, string | undefined>): string {
  return Object.entries(query)
    .filter(([k, v]) => v !== undefined && k !== '_offset' && k !== '_count')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
    .join('&');
}

/**
 * Send a FHIR response. Returns the body so the caller can `return fhirReply()`
 * and let Fastify handle the actual send via the return-value path. This avoids
 * the ERR_HTTP_HEADERS_SENT crash that occurs when reply.send() is called inside
 * an async handler alongside Fastify's internal onSendEnd processing (BUG-071).
 */
function fhirReply(reply: FastifyReply, status: number, body: unknown): unknown {
  if (reply.sent) return;
  reply.status(status).header('content-type', FHIR_CONTENT_TYPE);
  return body;
}

function operationOutcome(
  severity: 'error' | 'warning' | 'information',
  code: string,
  diagnostics: string
): FhirOperationOutcome {
  return {
    resourceType: 'OperationOutcome',
    issue: [{ severity, code, diagnostics }],
  };
}

function getClinicalAdapter(): ClinicalEngineAdapter | null {
  const adapter = getAdapter('clinical-engine');
  if (!adapter) return null;
  return adapter as unknown as ClinicalEngineAdapter;
}

function getBaseUrl(request: FastifyRequest): string {
  const rawProto = request.headers['x-forwarded-proto'];
  // L1: handle array or comma-separated x-forwarded-proto
  const proto = Array.isArray(rawProto)
    ? rawProto[0]
    : typeof rawProto === 'string'
      ? rawProto.split(',')[0].trim()
      : 'http';
  const host = request.headers['x-forwarded-host'] || request.headers.host || 'localhost:3001';
  return `${proto}://${host}`;
}

/**
 * Extract patient DFN from FHIR "patient" search param.
 * Accepts: "3", "Patient/3", or just the number.
 * L2: Validates DFN is purely numeric.
 */
function extractPatientDfn(patientParam: string | undefined): string | null {
  if (!patientParam) return null;
  const cleaned = patientParam.replace(/^Patient\//, '');
  if (!cleaned || !/^\d+$/.test(cleaned)) return null;
  return cleaned;
}

/* ================================================================== */
/* Route Plugin                                                         */
/* ================================================================== */

export default async function fhirRoutes(server: FastifyInstance): Promise<void> {
  // Register FHIR response cache with ETag support (Phase 179 Q194)
  registerFhirCache(server);

  /* ---------------------------------------------------------------- */
  /* GET /fhir/metadata -- CapabilityStatement (public per FHIR spec) */
  /* ---------------------------------------------------------------- */
  server.get('/fhir/metadata', async (request: FastifyRequest, reply: FastifyReply) => {
    const baseUrl = getBaseUrl(request);
    const cs = buildCapabilityStatement(baseUrl);
    return fhirReply(reply, 200, cs);
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/Patient/:id -- Patient read                            */
  /* ---------------------------------------------------------------- */
  server.get('/fhir/Patient/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    await requireSession(request, reply);
    if (reply.sent) return;
    const { id } = request.params as { id: string };
    if (!enforceFhirScope(request, reply, 'Patient', id)) return;

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(
          reply,
          503,
          operationOutcome('error', 'transient', 'Clinical engine adapter not available')
        );
      }

      const result = await adapter.getPatient(id);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(
            reply,
            503,
            operationOutcome(
              'error',
              'transient',
              `Integration pending: ${result.target || 'patient demographics'}`
            )
          );
        }
        return fhirReply(
          reply,
          404,
          operationOutcome('error', 'not-found', result.error || `Patient/${id} not found`)
        );
      }

      const resource = toFhirPatient(result.data);
      return fhirReply(reply, 200, resource);
    } catch (err: unknown) {
      log.error('FHIR Patient read error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fhirReply(reply, 500, operationOutcome('error', 'exception', 'Internal server error'));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/Patient?name=X -- Patient search                      */
  /* ---------------------------------------------------------------- */
  server.get('/fhir/Patient', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    await requireSession(request, reply);
    if (reply.sent) return;
    if (!enforceFhirScope(request, reply, 'Patient')) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);

    try {
      // Search by _id (single patient read via search)
      if (query._id) {
        const adapter = getClinicalAdapter();
        if (!adapter) {
          return fhirReply(
            reply,
            503,
            operationOutcome('error', 'transient', 'Clinical engine adapter not available')
          );
        }
        const result = await adapter.getPatient(query._id);
        if (!result.ok || !result.data) {
          return fhirReply(reply, 200, toPagedSearchBundle([], baseUrl, 'Patient'));
        }
        const resource = toFhirPatient(result.data);
        return fhirReply(reply, 200, toPagedSearchBundle([resource], baseUrl, 'Patient'));
      }

      // Search by name
      const name = query.name;
      if (!name) {
        return fhirReply(
          reply,
          400,
          operationOutcome(
            'error',
            'required',
            'At least one search parameter required: name or _id'
          )
        );
      }

      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(
          reply,
          503,
          operationOutcome('error', 'transient', 'Clinical engine adapter not available')
        );
      }

      const { offset, count } = extractPaging(query);
      const result = await adapter.searchPatients(name, count);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(
            reply,
            503,
            operationOutcome(
              'error',
              'transient',
              `Integration pending: ${result.target || 'patient search'}`
            )
          );
        }
        return fhirReply(reply, 200, toPagedSearchBundle([], baseUrl, 'Patient'));
      }

      const resources = result.data.map(toFhirPatient);
      return fhirReply(
        reply,
        200,
        toPagedSearchBundle(resources, baseUrl, 'Patient', {
          offset,
          count,
          queryString: buildSearchQueryString(query),
        })
      );
    } catch (err: unknown) {
      log.error('FHIR Patient search error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fhirReply(reply, 500, operationOutcome('error', 'exception', 'Internal server error'));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/AllergyIntolerance?patient=N                          */
  /* ---------------------------------------------------------------- */
  server.get('/fhir/AllergyIntolerance', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(
        reply,
        400,
        operationOutcome('error', 'required', 'Required search parameter: patient (numeric DFN)')
      );
    }
    if (!enforceFhirScope(request, reply, 'AllergyIntolerance', dfn)) return;

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(
          reply,
          503,
          operationOutcome('error', 'transient', 'Clinical engine adapter not available')
        );
      }

      const result = await adapter.getAllergies(dfn);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(
            reply,
            503,
            operationOutcome(
              'error',
              'transient',
              `Integration pending: ${result.target || 'allergies'}`
            )
          );
        }
        return fhirReply(reply, 200, toPagedSearchBundle([], baseUrl, 'AllergyIntolerance'));
      }

      const resources = result.data.map((a) => toFhirAllergyIntolerance(a, dfn));
      const filtered = filterAllergyIntolerances(resources, {
        'clinical-status': query['clinical-status'],
      });
      const { offset, count } = extractPaging(query);
      return fhirReply(
        reply,
        200,
        toPagedSearchBundle(filtered, baseUrl, 'AllergyIntolerance', {
          offset,
          count,
          queryString: buildSearchQueryString(query),
        })
      );
    } catch (err: unknown) {
      log.error('FHIR AllergyIntolerance error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fhirReply(reply, 500, operationOutcome('error', 'exception', 'Internal server error'));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/Condition?patient=N                                   */
  /* ---------------------------------------------------------------- */
  server.get('/fhir/Condition', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(
        reply,
        400,
        operationOutcome('error', 'required', 'Required search parameter: patient (numeric DFN)')
      );
    }
    if (!enforceFhirScope(request, reply, 'Condition', dfn)) return;

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(
          reply,
          503,
          operationOutcome('error', 'transient', 'Clinical engine adapter not available')
        );
      }

      const result = await adapter.getProblems(dfn);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(
            reply,
            503,
            operationOutcome(
              'error',
              'transient',
              `Integration pending: ${result.target || 'problems'}`
            )
          );
        }
        return fhirReply(reply, 200, toPagedSearchBundle([], baseUrl, 'Condition'));
      }

      const resources = result.data.map((p) => toFhirCondition(p, dfn));
      const filtered = filterConditions(resources, { 'clinical-status': query['clinical-status'] });
      const { offset, count } = extractPaging(query);
      return fhirReply(
        reply,
        200,
        toPagedSearchBundle(filtered, baseUrl, 'Condition', {
          offset,
          count,
          queryString: buildSearchQueryString(query),
        })
      );
    } catch (err: unknown) {
      log.error('FHIR Condition error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fhirReply(reply, 500, operationOutcome('error', 'exception', 'Internal server error'));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/Observation?patient=N&category=vital-signs|laboratory */
  /* ---------------------------------------------------------------- */
  server.get('/fhir/Observation', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(
        reply,
        400,
        operationOutcome('error', 'required', 'Required search parameter: patient (numeric DFN)')
      );
    }
    if (!enforceFhirScope(request, reply, 'Observation', dfn)) return;

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(
          reply,
          503,
          operationOutcome('error', 'transient', 'Clinical engine adapter not available')
        );
      }

      const category = query.category || '';
      const resources: FhirResource[] = [];

      // If category is "laboratory" or unset, include lab results
      if (!category || category === 'laboratory') {
        const labResult = await adapter.getLabs(dfn);
        if (labResult.ok && labResult.data) {
          resources.push(...labResult.data.map((l) => toFhirLabObservation(l, dfn)));
        }
      }

      // If category is "vital-signs" or unset, include vitals
      if (!category || category === 'vital-signs') {
        const vitalResult = await adapter.getVitals(dfn);
        if (vitalResult.ok && vitalResult.data) {
          resources.push(...vitalResult.data.map((v) => toFhirVitalObservation(v, dfn)));
        }
      }

      const filtered = filterObservations(resources, { code: query.code, date: query.date });
      const { offset, count } = extractPaging(query);
      return fhirReply(
        reply,
        200,
        toPagedSearchBundle(filtered, baseUrl, 'Observation', {
          offset,
          count,
          queryString: buildSearchQueryString(query),
        })
      );
    } catch (err: unknown) {
      log.error('FHIR Observation error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fhirReply(reply, 500, operationOutcome('error', 'exception', 'Internal server error'));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/MedicationRequest?patient=N                           */
  /* ---------------------------------------------------------------- */
  server.get('/fhir/MedicationRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(
        reply,
        400,
        operationOutcome('error', 'required', 'Required search parameter: patient (numeric DFN)')
      );
    }
    if (!enforceFhirScope(request, reply, 'MedicationRequest', dfn)) return;

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(
          reply,
          503,
          operationOutcome('error', 'transient', 'Clinical engine adapter not available')
        );
      }

      const result = await adapter.getMedications(dfn);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(
            reply,
            503,
            operationOutcome(
              'error',
              'transient',
              `Integration pending: ${result.target || 'medications'}`
            )
          );
        }
        return fhirReply(reply, 200, toPagedSearchBundle([], baseUrl, 'MedicationRequest'));
      }

      const resources = result.data.map((m) => toFhirMedicationRequest(m, dfn));
      const filtered = filterMedicationRequests(resources, { status: query.status });
      const { offset, count } = extractPaging(query);
      return fhirReply(
        reply,
        200,
        toPagedSearchBundle(filtered, baseUrl, 'MedicationRequest', {
          offset,
          count,
          queryString: buildSearchQueryString(query),
        })
      );
    } catch (err: unknown) {
      log.error('FHIR MedicationRequest error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fhirReply(reply, 500, operationOutcome('error', 'exception', 'Internal server error'));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/DocumentReference?patient=N                           */
  /* ---------------------------------------------------------------- */
  server.get('/fhir/DocumentReference', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(
        reply,
        400,
        operationOutcome('error', 'required', 'Required search parameter: patient (numeric DFN)')
      );
    }
    if (!enforceFhirScope(request, reply, 'DocumentReference', dfn)) return;

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(
          reply,
          503,
          operationOutcome('error', 'transient', 'Clinical engine adapter not available')
        );
      }

      const result = await adapter.getNotes(dfn);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(
            reply,
            503,
            operationOutcome(
              'error',
              'transient',
              `Integration pending: ${result.target || 'notes'}`
            )
          );
        }
        return fhirReply(reply, 200, toPagedSearchBundle([], baseUrl, 'DocumentReference'));
      }

      const resources = result.data.map((n) => toFhirDocumentReference(n, dfn));
      const filtered = filterDocumentReferences(resources, { date: query.date });
      const { offset, count } = extractPaging(query);
      return fhirReply(
        reply,
        200,
        toPagedSearchBundle(filtered, baseUrl, 'DocumentReference', {
          offset,
          count,
          queryString: buildSearchQueryString(query),
        })
      );
    } catch (err: unknown) {
      log.error('FHIR DocumentReference error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fhirReply(reply, 500, operationOutcome('error', 'exception', 'Internal server error'));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/Encounter?patient=N -- Encounters by patient           */
  /* ---------------------------------------------------------------- */
  server.get('/fhir/Encounter', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(
        reply,
        400,
        operationOutcome('error', 'required', 'Required search parameter: patient (numeric DFN)')
      );
    }
    if (!enforceFhirScope(request, reply, 'Encounter', dfn)) return;

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(
          reply,
          503,
          operationOutcome('error', 'transient', 'Clinical engine adapter not available')
        );
      }

      const result = await adapter.getEncounters(dfn);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(
            reply,
            503,
            operationOutcome(
              'error',
              'transient',
              `Integration pending: ${result.target || 'encounters'}`
            )
          );
        }
        return fhirReply(reply, 200, toPagedSearchBundle([], baseUrl, 'Encounter'));
      }

      const resources = result.data.map((e) => toFhirEncounter(e));
      const filtered = filterEncounters(resources, { date: query.date, status: query.status });
      const { offset, count } = extractPaging(query);
      return fhirReply(
        reply,
        200,
        toPagedSearchBundle(filtered, baseUrl, 'Encounter', {
          offset,
          count,
          queryString: buildSearchQueryString(query),
        })
      );
    } catch (err: unknown) {
      log.error('FHIR Encounter error', {
        error: err instanceof Error ? err.message : String(err),
      });
      return fhirReply(reply, 500, operationOutcome('error', 'exception', 'Internal server error'));
    }
  });

  /* ================================================================== */
  /* FHIR Write Endpoints (POST = create)                                */
  /* Each tries the target VistA RPC, returns OperationOutcome on        */
  /* success or failure. rpcUsed + source included in every response.    */
  /* ================================================================== */

  /* ---------------------------------------------------------------- */
  /* POST /fhir/Patient -- Create patient via VE PAT REGISTER          */
  /* ---------------------------------------------------------------- */
  server.post('/fhir/Patient', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    const session = await requireSession(request, reply);
    if (reply.sent) return;

    const body = (request.body as any) || {};
    const rpcUsed: string[] = [];

    if (body.resourceType !== 'Patient') {
      return fhirReply(reply, 400, operationOutcome('error', 'invalid', 'resourceType must be Patient'));
    }

    try {
      const name = body.name?.[0];
      const family = name?.family || '';
      const given = name?.given?.[0] || '';
      if (!family) {
        return fhirReply(reply, 400, operationOutcome('error', 'required', 'Patient.name.family is required'));
      }

      const dob = body.birthDate || '';
      const sex = body.gender === 'male' ? 'M' : body.gender === 'female' ? 'F' : '';
      const ssn = body.identifier?.find(
        (id: any) => id.system === 'http://hl7.org/fhir/sid/us-ssn'
      )?.value || '';

      const params: Record<string, string> = {
        NAME: `${family},${given}`.toUpperCase(),
        DOB: dob,
        SEX: sex,
        SSN: ssn,
        REGISTRAR: session.duz,
      };

      if (body.telecom) {
        const phone = body.telecom.find((t: any) => t.system === 'phone');
        if (phone?.value) params['PHONE'] = phone.value;
      }
      if (body.address?.[0]) {
        const addr = body.address[0];
        if (addr.line?.[0]) params['STREET1'] = addr.line[0];
        if (addr.city) params['CITY'] = addr.city;
        if (addr.state) params['STATE'] = addr.state;
        if (addr.postalCode) params['ZIP'] = addr.postalCode;
      }

      rpcUsed.push('VE PAT REGISTER');
      const lines = await safeCallRpcWithList(
        'VE PAT REGISTER',
        [{ type: 'list' as const, value: params }],
        { idempotent: false }
      );
      const result = lines.join('\n').trim();

      if (result.startsWith('ok') || result.match(/^\d+/)) {
        const dfn = result.replace(/^ok\^?/, '').split('^')[0] || '';
        return fhirReply(reply, 201, {
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'information', code: 'informational', diagnostics: `Patient created: DFN=${dfn}` }],
          source: 'vista',
          rpcUsed,
          createdId: dfn ? `Patient/${dfn}` : undefined,
        });
      }

      return fhirReply(reply, 422, {
        ...operationOutcome('error', 'processing', `VistA rejected: ${result}`),
        source: 'vista',
        rpcUsed,
      });
    } catch (err: unknown) {
      log.error('FHIR Patient create error', { error: err instanceof Error ? err.message : String(err) });
      return fhirReply(reply, 500, {
        ...operationOutcome('error', 'exception', safeErr(err)),
        rpcUsed,
      });
    }
  });

  /* ---------------------------------------------------------------- */
  /* POST /fhir/AllergyIntolerance -- Create via ORWDAL32 SAVE ALLERGY */
  /* ---------------------------------------------------------------- */
  server.post('/fhir/AllergyIntolerance', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    const session = await requireSession(request, reply);
    if (reply.sent) return;

    const body = (request.body as any) || {};
    const rpcUsed: string[] = [];

    if (body.resourceType !== 'AllergyIntolerance') {
      return fhirReply(reply, 400, operationOutcome('error', 'invalid', 'resourceType must be AllergyIntolerance'));
    }

    const patientRef = body.patient?.reference || '';
    const dfn = patientRef.replace(/^Patient\//, '');
    if (!dfn || !/^\d+$/.test(dfn)) {
      return fhirReply(reply, 400, operationOutcome('error', 'required', 'AllergyIntolerance.patient reference with numeric DFN is required'));
    }

    const allergen = body.code?.text || body.code?.coding?.[0]?.display || '';
    if (!allergen) {
      return fhirReply(reply, 400, operationOutcome('error', 'required', 'AllergyIntolerance.code (allergen name) is required'));
    }

    try {
      const category = body.category?.[0] || 'other';
      const categoryMap: Record<string, string> = {
        food: 'F',
        medication: 'D',
        environment: 'O',
        biologic: 'O',
      };
      const vistaCategory = categoryMap[category] || 'O';

      const reactions = (body.reaction || [])
        .flatMap((r: any) =>
          (r.manifestation || []).map((m: any) => m.text || m.coding?.[0]?.display || '')
        )
        .filter(Boolean);

      const severity = body.criticality === 'high' ? 'SEVERE' : body.criticality === 'low' ? 'MILD' : 'MODERATE';
      const originatorDuz = session.duz;

      const allergyParams = [
        dfn,
        `${allergen}^^${vistaCategory}`,
        severity,
        reactions.join(';') || 'UNKNOWN',
        new Date().toLocaleDateString('en-US'),
        originatorDuz,
      ];

      rpcUsed.push('ORWDAL32 SAVE ALLERGY');
      const lines = await safeCallRpc('ORWDAL32 SAVE ALLERGY', allergyParams, { idempotent: false });
      const result = lines.join('\n').trim();

      if (!result.includes('error') && !result.startsWith('-1')) {
        return fhirReply(reply, 201, {
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'information', code: 'informational', diagnostics: `Allergy recorded for Patient/${dfn}: ${allergen}` }],
          source: 'vista',
          rpcUsed,
        });
      }

      return fhirReply(reply, 422, {
        ...operationOutcome('error', 'processing', `VistA rejected: ${result}`),
        source: 'vista',
        rpcUsed,
      });
    } catch (err: unknown) {
      log.error('FHIR AllergyIntolerance create error', { error: err instanceof Error ? err.message : String(err) });
      return fhirReply(reply, 500, {
        ...operationOutcome('error', 'exception', safeErr(err)),
        rpcUsed,
      });
    }
  });

  /* ---------------------------------------------------------------- */
  /* POST /fhir/Condition -- Create via VE PROBLEM ADD                  */
  /* ---------------------------------------------------------------- */
  server.post('/fhir/Condition', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    const session = await requireSession(request, reply);
    if (reply.sent) return;

    const body = (request.body as any) || {};
    const rpcUsed: string[] = [];

    if (body.resourceType !== 'Condition') {
      return fhirReply(reply, 400, operationOutcome('error', 'invalid', 'resourceType must be Condition'));
    }

    const patientRef = body.subject?.reference || '';
    const dfn = patientRef.replace(/^Patient\//, '');
    if (!dfn || !/^\d+$/.test(dfn)) {
      return fhirReply(reply, 400, operationOutcome('error', 'required', 'Condition.subject reference with numeric DFN is required'));
    }

    const description = body.code?.text || body.code?.coding?.[0]?.display || '';
    if (!description) {
      return fhirReply(reply, 400, operationOutcome('error', 'required', 'Condition.code (problem description) is required'));
    }

    try {
      const icdCode = body.code?.coding?.find(
        (c: any) => c.system === 'http://hl7.org/fhir/sid/icd-10-cm'
      )?.code || '';

      const clinicalStatus = body.clinicalStatus?.coding?.[0]?.code || 'active';
      const statusMap: Record<string, string> = { active: 'A', inactive: 'I', resolved: 'R' };
      const vistaStatus = statusMap[clinicalStatus] || 'A';

      const onset = body.onsetDateTime || '';
      const providerDuz = session.duz;

      const params: Record<string, string> = {
        DFN: dfn,
        PROBLEM: description,
        ICD: icdCode,
        STATUS: vistaStatus,
        ONSET: onset,
        PROVIDER: providerDuz,
      };

      rpcUsed.push('VE PROBLEM ADD');
      const lines = await safeCallRpcWithList(
        'VE PROBLEM ADD',
        [{ type: 'list' as const, value: params }],
        { idempotent: false }
      );
      const result = lines.join('\n').trim();

      if (result.startsWith('ok') || result.match(/^\d+/)) {
        const problemIen = result.replace(/^ok\^?/, '').split('^')[0] || '';
        return fhirReply(reply, 201, {
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'information', code: 'informational', diagnostics: `Problem added for Patient/${dfn}: ${description}` }],
          source: 'vista',
          rpcUsed,
          createdId: problemIen ? `Condition/condition-${problemIen}` : undefined,
        });
      }

      return fhirReply(reply, 422, {
        ...operationOutcome('error', 'processing', `VistA rejected: ${result}`),
        source: 'vista',
        rpcUsed,
      });
    } catch (err: unknown) {
      log.error('FHIR Condition create error', { error: err instanceof Error ? err.message : String(err) });
      return fhirReply(reply, 500, {
        ...operationOutcome('error', 'exception', safeErr(err)),
        rpcUsed,
      });
    }
  });

  /* ---------------------------------------------------------------- */
  /* POST /fhir/MedicationRequest -- Create via VE ERX NEWRX            */
  /* ---------------------------------------------------------------- */
  server.post('/fhir/MedicationRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    const session = await requireSession(request, reply);
    if (reply.sent) return;

    const body = (request.body as any) || {};
    const rpcUsed: string[] = [];

    if (body.resourceType !== 'MedicationRequest') {
      return fhirReply(reply, 400, operationOutcome('error', 'invalid', 'resourceType must be MedicationRequest'));
    }

    const patientRef = body.subject?.reference || '';
    const dfn = patientRef.replace(/^Patient\//, '');
    if (!dfn || !/^\d+$/.test(dfn)) {
      return fhirReply(reply, 400, operationOutcome('error', 'required', 'MedicationRequest.subject reference with numeric DFN is required'));
    }

    const medName =
      body.medicationCodeableConcept?.text ||
      body.medicationCodeableConcept?.coding?.[0]?.display ||
      '';
    if (!medName) {
      return fhirReply(reply, 400, operationOutcome('error', 'required', 'MedicationRequest.medicationCodeableConcept (drug name) is required'));
    }

    try {
      const dosage = body.dosageInstruction?.[0] || {};
      const dose = dosage.doseAndRate?.[0]?.doseQuantity?.value
        ? `${dosage.doseAndRate[0].doseQuantity.value} ${dosage.doseAndRate[0].doseQuantity.unit || ''}`
        : dosage.text || '';
      const route = dosage.route?.text || dosage.route?.coding?.[0]?.display || '';
      const schedule = dosage.timing?.code?.text || dosage.timing?.code?.coding?.[0]?.display || '';
      const quantity = body.dispenseRequest?.quantity?.value
        ? String(body.dispenseRequest.quantity.value)
        : '';
      const refills = body.dispenseRequest?.numberOfRepeatsAllowed != null
        ? String(body.dispenseRequest.numberOfRepeatsAllowed)
        : '';
      const providerDuz = session.duz;

      const params: Record<string, string> = {
        DFN: dfn,
        DRUG: medName,
        DOSE: dose,
        ROUTE: route,
        SCHEDULE: schedule,
        QUANTITY: quantity,
        REFILLS: refills,
        PROVIDER: providerDuz,
      };

      rpcUsed.push('VE ERX NEWRX');
      const lines = await safeCallRpcWithList(
        'VE ERX NEWRX',
        [{ type: 'list' as const, value: params }],
        { idempotent: false }
      );
      const result = lines.join('\n').trim();

      if (result.startsWith('ok') || result.match(/^\d+/)) {
        const rxIen = result.replace(/^ok\^?/, '').split('^')[0] || '';
        return fhirReply(reply, 201, {
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'information', code: 'informational', diagnostics: `Prescription created for Patient/${dfn}: ${medName}` }],
          source: 'vista',
          rpcUsed,
          createdId: rxIen ? `MedicationRequest/med-${rxIen}` : undefined,
        });
      }

      return fhirReply(reply, 422, {
        ...operationOutcome('error', 'processing', `VistA rejected: ${result}`),
        source: 'vista',
        rpcUsed,
      });
    } catch (err: unknown) {
      log.error('FHIR MedicationRequest create error', { error: err instanceof Error ? err.message : String(err) });
      return fhirReply(reply, 500, {
        ...operationOutcome('error', 'exception', safeErr(err)),
        rpcUsed,
      });
    }
  });

  /* ---------------------------------------------------------------- */
  /* POST /fhir/Immunization -- Create via VE PCE IMM GIVE              */
  /* ---------------------------------------------------------------- */
  server.post('/fhir/Immunization', async (request: FastifyRequest, reply: FastifyReply) => {
    if (reply.sent) return;
    const session = await requireSession(request, reply);
    if (reply.sent) return;

    const body = (request.body as any) || {};
    const rpcUsed: string[] = [];

    if (body.resourceType !== 'Immunization') {
      return fhirReply(reply, 400, operationOutcome('error', 'invalid', 'resourceType must be Immunization'));
    }

    const patientRef = body.patient?.reference || '';
    const dfn = patientRef.replace(/^Patient\//, '');
    if (!dfn || !/^\d+$/.test(dfn)) {
      return fhirReply(reply, 400, operationOutcome('error', 'required', 'Immunization.patient reference with numeric DFN is required'));
    }

    const vaccineName =
      body.vaccineCode?.text ||
      body.vaccineCode?.coding?.[0]?.display ||
      '';
    if (!vaccineName) {
      return fhirReply(reply, 400, operationOutcome('error', 'required', 'Immunization.vaccineCode is required'));
    }

    try {
      const cvxCode = body.vaccineCode?.coding?.find(
        (c: any) => c.system === 'http://hl7.org/fhir/sid/cvx'
      )?.code || '';

      const occurrenceDate = body.occurrenceDateTime || new Date().toISOString();
      const lotNumber = body.lotNumber || '';
      const site = body.site?.text || body.site?.coding?.[0]?.display || '';
      const route = body.route?.text || body.route?.coding?.[0]?.display || '';
      const providerDuz = session.duz;

      const params: Record<string, string> = {
        DFN: dfn,
        VACCINE: vaccineName,
        CVX: cvxCode,
        DATE: occurrenceDate,
        LOT: lotNumber,
        SITE: site,
        ROUTE: route,
        PROVIDER: providerDuz,
      };

      rpcUsed.push('VE PCE IMM GIVE');
      const lines = await safeCallRpcWithList(
        'VE PCE IMM GIVE',
        [{ type: 'list' as const, value: params }],
        { idempotent: false }
      );
      const result = lines.join('\n').trim();

      if (result.startsWith('ok') || result.match(/^\d+/)) {
        const immIen = result.replace(/^ok\^?/, '').split('^')[0] || '';
        return fhirReply(reply, 201, {
          resourceType: 'OperationOutcome',
          issue: [{ severity: 'information', code: 'informational', diagnostics: `Immunization recorded for Patient/${dfn}: ${vaccineName}` }],
          source: 'vista',
          rpcUsed,
          createdId: immIen ? `Immunization/${immIen}` : undefined,
        });
      }

      return fhirReply(reply, 422, {
        ...operationOutcome('error', 'processing', `VistA rejected: ${result}`),
        source: 'vista',
        rpcUsed,
      });
    } catch (err: unknown) {
      log.error('FHIR Immunization create error', { error: err instanceof Error ? err.message : String(err) });
      return fhirReply(reply, 500, {
        ...operationOutcome('error', 'exception', safeErr(err)),
        rpcUsed,
      });
    }
  });

  log.info('FHIR R4 gateway registered: 15 endpoints (7 read resource types + 5 write + metadata + search)');
}
