/**
 * FHIR R4 Gateway Routes — Phase 178.
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
 * Auth: session-based (/fhir/* added to AUTH_RULES in security.ts).
 * Content-Type: application/fhir+json for all FHIR responses.
 *
 * All data flows through the ClinicalEngineAdapter — no direct RPC calls.
 * Adapter result.ok=false → OperationOutcome with integration-pending.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { requireSession } from "../auth/auth-routes.js";
import { getAdapter } from "../adapters/adapter-loader.js";
import type { ClinicalEngineAdapter } from "../adapters/clinical-engine/interface.js";
import { log } from "../lib/logger.js";

import { buildCapabilityStatement } from "./capability-statement.js";
import { registerFhirCache } from "./fhir-cache.js";
import {
  toFhirPatient,
  toFhirAllergyIntolerance,
  toFhirCondition,
  toFhirVitalObservation,
  toFhirLabObservation,
  toFhirMedicationRequest,
  toFhirDocumentReference,
  toFhirEncounter,
  toSearchBundle,
} from "./mappers.js";
import type { FhirOperationOutcome, FhirResource } from "./types.js";

/* ================================================================== */
/* Helpers                                                              */
/* ================================================================== */

const FHIR_CONTENT_TYPE = "application/fhir+json; charset=utf-8";

function fhirReply(reply: FastifyReply, status: number, body: unknown): void {
  if (reply.sent) return; // M3: guard against double-send
  reply.status(status).header("content-type", FHIR_CONTENT_TYPE).send(body);
}

function operationOutcome(
  severity: "error" | "warning" | "information",
  code: string,
  diagnostics: string,
): FhirOperationOutcome {
  return {
    resourceType: "OperationOutcome",
    issue: [{ severity, code, diagnostics }],
  };
}

function getClinicalAdapter(): ClinicalEngineAdapter | null {
  const adapter = getAdapter("clinical-engine");
  if (!adapter) return null;
  return adapter as unknown as ClinicalEngineAdapter;
}

function getBaseUrl(request: FastifyRequest): string {
  const rawProto = request.headers["x-forwarded-proto"];
  // L1: handle array or comma-separated x-forwarded-proto
  const proto = Array.isArray(rawProto)
    ? rawProto[0]
    : typeof rawProto === "string"
      ? rawProto.split(",")[0].trim()
      : "http";
  const host = request.headers["x-forwarded-host"] || request.headers.host || "localhost:3001";
  return `${proto}://${host}`;
}

/**
 * Extract patient DFN from FHIR "patient" search param.
 * Accepts: "3", "Patient/3", or just the number.
 * L2: Validates DFN is purely numeric.
 */
function extractPatientDfn(patientParam: string | undefined): string | null {
  if (!patientParam) return null;
  const cleaned = patientParam.replace(/^Patient\//, "");
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
  /* GET /fhir/metadata — CapabilityStatement (public per FHIR spec) */
  /* ---------------------------------------------------------------- */
  server.get("/fhir/metadata", async (request: FastifyRequest, reply: FastifyReply) => {
    const baseUrl = getBaseUrl(request);
    const cs = buildCapabilityStatement(baseUrl);
    fhirReply(reply, 200, cs);
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/Patient/:id — Patient read                            */
  /* ---------------------------------------------------------------- */
  server.get("/fhir/Patient/:id", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    if (reply.sent) return;
    const { id } = request.params as { id: string };

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(reply, 503, operationOutcome("error", "transient", "Clinical engine adapter not available"));
      }

      const result = await adapter.getPatient(id);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(reply, 503, operationOutcome("error", "transient",
            `Integration pending: ${result.target || "patient demographics"}`));
        }
        return fhirReply(reply, 404, operationOutcome("error", "not-found",
          result.error || `Patient/${id} not found`));
      }

      const resource = toFhirPatient(result.data);
      fhirReply(reply, 200, resource);
    } catch (err: unknown) {
      log.error("FHIR Patient read error", { error: err instanceof Error ? err.message : String(err) });
      fhirReply(reply, 500, operationOutcome("error", "exception", "Internal server error"));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/Patient?name=X — Patient search                      */
  /* ---------------------------------------------------------------- */
  server.get("/fhir/Patient", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);

    try {
      // Search by _id (single patient read via search)
      if (query._id) {
        const adapter = getClinicalAdapter();
        if (!adapter) {
          return fhirReply(reply, 503, operationOutcome("error", "transient", "Clinical engine adapter not available"));
        }
        const result = await adapter.getPatient(query._id);
        if (!result.ok || !result.data) {
          return fhirReply(reply, 200, toSearchBundle([], 0, baseUrl, "Patient"));
        }
        const resource = toFhirPatient(result.data);
        return fhirReply(reply, 200, toSearchBundle([resource], 1, baseUrl, "Patient"));
      }

      // Search by name
      const name = query.name;
      if (!name) {
        return fhirReply(reply, 400, operationOutcome("error", "required",
          "At least one search parameter required: name or _id"));
      }

      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(reply, 503, operationOutcome("error", "transient", "Clinical engine adapter not available"));
      }

      const count = Math.min(Math.max(parseInt(query._count || "", 10) || 20, 1), 100);
      const result = await adapter.searchPatients(name, count);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(reply, 503, operationOutcome("error", "transient",
            `Integration pending: ${result.target || "patient search"}`));
        }
        return fhirReply(reply, 200, toSearchBundle([], 0, baseUrl, "Patient"));
      }

      const resources = result.data.map(toFhirPatient);
      fhirReply(reply, 200, toSearchBundle(resources, resources.length, baseUrl, "Patient"));
    } catch (err: unknown) {
      log.error("FHIR Patient search error", { error: err instanceof Error ? err.message : String(err) });
      fhirReply(reply, 500, operationOutcome("error", "exception", "Internal server error"));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/AllergyIntolerance?patient=N                          */
  /* ---------------------------------------------------------------- */
  server.get("/fhir/AllergyIntolerance", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(reply, 400, operationOutcome("error", "required",
        "Required search parameter: patient (numeric DFN)"));
    }

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(reply, 503, operationOutcome("error", "transient", "Clinical engine adapter not available"));
      }

      const result = await adapter.getAllergies(dfn);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(reply, 503, operationOutcome("error", "transient",
            `Integration pending: ${result.target || "allergies"}`));
        }
        return fhirReply(reply, 200, toSearchBundle([], 0, baseUrl, "AllergyIntolerance"));
      }

      const resources = result.data.map((a) => toFhirAllergyIntolerance(a, dfn));
      fhirReply(reply, 200, toSearchBundle(resources, resources.length, baseUrl, "AllergyIntolerance"));
    } catch (err: unknown) {
      log.error("FHIR AllergyIntolerance error", { error: err instanceof Error ? err.message : String(err) });
      fhirReply(reply, 500, operationOutcome("error", "exception", "Internal server error"));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/Condition?patient=N                                   */
  /* ---------------------------------------------------------------- */
  server.get("/fhir/Condition", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(reply, 400, operationOutcome("error", "required",
        "Required search parameter: patient (numeric DFN)"));
    }

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(reply, 503, operationOutcome("error", "transient", "Clinical engine adapter not available"));
      }

      const result = await adapter.getProblems(dfn);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(reply, 503, operationOutcome("error", "transient",
            `Integration pending: ${result.target || "problems"}`));
        }
        return fhirReply(reply, 200, toSearchBundle([], 0, baseUrl, "Condition"));
      }

      const resources = result.data.map((p) => toFhirCondition(p, dfn));
      fhirReply(reply, 200, toSearchBundle(resources, resources.length, baseUrl, "Condition"));
    } catch (err: unknown) {
      log.error("FHIR Condition error", { error: err instanceof Error ? err.message : String(err) });
      fhirReply(reply, 500, operationOutcome("error", "exception", "Internal server error"));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/Observation?patient=N&category=vital-signs|laboratory */
  /* ---------------------------------------------------------------- */
  server.get("/fhir/Observation", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(reply, 400, operationOutcome("error", "required",
        "Required search parameter: patient (numeric DFN)"));
    }

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(reply, 503, operationOutcome("error", "transient", "Clinical engine adapter not available"));
      }

      const category = query.category || "";
      const resources: FhirResource[] = [];

      // If category is "laboratory" or unset, include lab results
      if (!category || category === "laboratory") {
        const labResult = await adapter.getLabs(dfn);
        if (labResult.ok && labResult.data) {
          resources.push(...labResult.data.map((l) => toFhirLabObservation(l, dfn)));
        }
      }

      // If category is "vital-signs" or unset, include vitals
      if (!category || category === "vital-signs") {
        const vitalResult = await adapter.getVitals(dfn);
        if (vitalResult.ok && vitalResult.data) {
          resources.push(...vitalResult.data.map((v) => toFhirVitalObservation(v, dfn)));
        }
      }

      fhirReply(reply, 200, toSearchBundle(resources, resources.length, baseUrl, "Observation"));
    } catch (err: unknown) {
      log.error("FHIR Observation error", { error: err instanceof Error ? err.message : String(err) });
      fhirReply(reply, 500, operationOutcome("error", "exception", "Internal server error"));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/MedicationRequest?patient=N                           */
  /* ---------------------------------------------------------------- */
  server.get("/fhir/MedicationRequest", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(reply, 400, operationOutcome("error", "required",
        "Required search parameter: patient (numeric DFN)"));
    }

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(reply, 503, operationOutcome("error", "transient", "Clinical engine adapter not available"));
      }

      const result = await adapter.getMedications(dfn);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(reply, 503, operationOutcome("error", "transient",
            `Integration pending: ${result.target || "medications"}`));
        }
        return fhirReply(reply, 200, toSearchBundle([], 0, baseUrl, "MedicationRequest"));
      }

      const resources = result.data.map((m) => toFhirMedicationRequest(m, dfn));
      fhirReply(reply, 200, toSearchBundle(resources, resources.length, baseUrl, "MedicationRequest"));
    } catch (err: unknown) {
      log.error("FHIR MedicationRequest error", { error: err instanceof Error ? err.message : String(err) });
      fhirReply(reply, 500, operationOutcome("error", "exception", "Internal server error"));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/DocumentReference?patient=N                           */
  /* ---------------------------------------------------------------- */
  server.get("/fhir/DocumentReference", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(reply, 400, operationOutcome("error", "required",
        "Required search parameter: patient (numeric DFN)"));
    }

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(reply, 503, operationOutcome("error", "transient", "Clinical engine adapter not available"));
      }

      const result = await adapter.getNotes(dfn);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(reply, 503, operationOutcome("error", "transient",
            `Integration pending: ${result.target || "notes"}`));
        }
        return fhirReply(reply, 200, toSearchBundle([], 0, baseUrl, "DocumentReference"));
      }

      const resources = result.data.map((n) => toFhirDocumentReference(n, dfn));
      fhirReply(reply, 200, toSearchBundle(resources, resources.length, baseUrl, "DocumentReference"));
    } catch (err: unknown) {
      log.error("FHIR DocumentReference error", { error: err instanceof Error ? err.message : String(err) });
      fhirReply(reply, 500, operationOutcome("error", "exception", "Internal server error"));
    }
  });

  /* ---------------------------------------------------------------- */
  /* GET /fhir/Encounter?patient=N — Encounters by patient           */
  /* ---------------------------------------------------------------- */
  server.get("/fhir/Encounter", async (request: FastifyRequest, reply: FastifyReply) => {
    await requireSession(request, reply);
    if (reply.sent) return;
    const query = request.query as Record<string, string | undefined>;
    const baseUrl = getBaseUrl(request);
    const dfn = extractPatientDfn(query.patient);

    if (!dfn) {
      return fhirReply(reply, 400, operationOutcome("error", "required",
        "Required search parameter: patient (numeric DFN)"));
    }

    try {
      const adapter = getClinicalAdapter();
      if (!adapter) {
        return fhirReply(reply, 503, operationOutcome("error", "transient", "Clinical engine adapter not available"));
      }

      const result = await adapter.getEncounters(dfn);
      if (!result.ok || !result.data) {
        if (result.pending) {
          return fhirReply(reply, 503, operationOutcome("error", "transient",
            `Integration pending: ${result.target || "encounters"}`));
        }
        return fhirReply(reply, 200, toSearchBundle([], 0, baseUrl, "Encounter"));
      }

      const resources = result.data.map((e) => toFhirEncounter(e));
      fhirReply(reply, 200, toSearchBundle(resources, resources.length, baseUrl, "Encounter"));
    } catch (err: unknown) {
      log.error("FHIR Encounter error", { error: err instanceof Error ? err.message : String(err) });
      fhirReply(reply, 500, operationOutcome("error", "exception", "Internal server error"));
    }
  });

  log.info("FHIR R4 gateway registered: 10 endpoints (7 resource types + metadata + search)");
}
