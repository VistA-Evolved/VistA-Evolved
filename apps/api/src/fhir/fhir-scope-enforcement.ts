/**
 * SMART Scope Enforcement — Phase 232 (Wave 5 Q232).
 *
 * Enforces SMART-on-FHIR scopes on FHIR resource access.
 * Bearer token requests must have appropriate scopes.
 * Session-authenticated requests get implicit user/*.read (bypass).
 *
 * Scope format: <context>/<resourceType>.<permission>
 *   - patient/Patient.read
 *   - patient/*.read       (wildcard — all patient-context resources)
 *   - user/Patient.read    (user-level — broader than patient)
 *   - user/*.read          (wildcard user-level)
 *   - system/*.read        (system-level — backend services)
 *
 * Patient-level scopes additionally restrict access to the patient in
 * the launch context (fhirPrincipal.patientContext).
 */

import type { FastifyRequest, FastifyReply } from "fastify";
import type { FhirPrincipal } from "./fhir-bearer-auth.js";
import type { FhirOperationOutcome } from "./types.js";
import { log } from "../lib/logger.js";

/* ================================================================== */
/* Types                                                                */
/* ================================================================== */

/** FHIR resource types we serve. */
export type FhirResourceType =
  | "Patient"
  | "AllergyIntolerance"
  | "Condition"
  | "Observation"
  | "MedicationRequest"
  | "DocumentReference"
  | "Encounter";

/** Scope context levels in SMART. */
type ScopeContext = "patient" | "user" | "system";

/** Parsed SMART scope. */
interface ParsedScope {
  context: ScopeContext;
  resourceType: string; // Resource type or "*"
  permission: string;   // "read", "write", or "*"
}

/* ================================================================== */
/* Scope parsing                                                        */
/* ================================================================== */

/**
 * Parse a SMART scope string into structured form.
 * E.g. "patient/Patient.read" -> { context: "patient", resourceType: "Patient", permission: "read" }
 */
export function parseScope(scope: string): ParsedScope | null {
  const match = scope.match(/^(patient|user|system)\/([A-Za-z*]+)\.(\w+|\*)$/);
  if (!match) return null;
  return {
    context: match[1] as ScopeContext,
    resourceType: match[2],
    permission: match[3],
  };
}

/**
 * Check if a set of scopes grants read access to a specific FHIR resource type.
 * Returns the most specific matching scope context, or null if no match.
 */
export function checkScopeAccess(
  scopes: string[],
  resourceType: FhirResourceType,
): { granted: boolean; context: ScopeContext | null; matchedScope: string | null } {
  let bestMatch: { context: ScopeContext; scope: string } | null = null;

  for (const scope of scopes) {
    const parsed = parseScope(scope);
    if (!parsed) continue;

    // Must grant read or wildcard permission
    if (parsed.permission !== "read" && parsed.permission !== "*") continue;

    // Must match resource type or be wildcard
    if (parsed.resourceType !== "*" && parsed.resourceType !== resourceType) continue;

    // Prefer exact resource match over wildcard
    if (!bestMatch || parsed.resourceType === resourceType) {
      bestMatch = { context: parsed.context, scope };
    }
  }

  if (bestMatch) {
    return { granted: true, context: bestMatch.context, matchedScope: bestMatch.scope };
  }
  return { granted: false, context: null, matchedScope: null };
}

/* ================================================================== */
/* Scope enforcement middleware                                          */
/* ================================================================== */

const FHIR_CONTENT_TYPE = "application/fhir+json; charset=utf-8";

function scopeOperationOutcome(resourceType: string, scopes: string[]): FhirOperationOutcome {
  return {
    resourceType: "OperationOutcome",
    issue: [{
      severity: "error",
      code: "forbidden",
      diagnostics: `Insufficient scope for ${resourceType}. Required: patient/${resourceType}.read or user/${resourceType}.read. Granted scopes: ${scopes.join(" ")}`,
    }],
  };
}

function patientContextOutcome(patientDfn: string, context: string): FhirOperationOutcome {
  return {
    resourceType: "OperationOutcome",
    issue: [{
      severity: "error",
      code: "forbidden",
      diagnostics: `Patient-level scope restricts access to patient ${context}; requested patient ${patientDfn}`,
    }],
  };
}

/**
 * Enforce SMART scopes for a FHIR resource access.
 *
 * Call at the top of each FHIR route handler (after auth).
 * Returns true if access is allowed; sends 403 and returns false if denied.
 *
 * @param request   - Fastify request with fhirPrincipal
 * @param reply     - Fastify reply (used to send 403 if denied)
 * @param resourceType - The FHIR resource being accessed
 * @param patientDfn   - The patient DFN being accessed (for patient-scope enforcement)
 */
export function enforceFhirScope(
  request: FastifyRequest,
  reply: FastifyReply,
  resourceType: FhirResourceType,
  patientDfn?: string | null,
): boolean {
  const principal = request.fhirPrincipal;

  // No principal = session auth fallback (handled by security.ts), allow
  if (!principal) return true;

  // Session-authenticated users get implicit user/*.read — always allowed
  if (principal.authMethod === "session") return true;

  const { granted, context, matchedScope } = checkScopeAccess(principal.scopes, resourceType);

  if (!granted) {
    log.warn("FHIR scope denied", {
      sub: principal.sub,
      resourceType,
      scopes: principal.scopes,
    });
    reply
      .status(403)
      .header("content-type", FHIR_CONTENT_TYPE)
      .send(scopeOperationOutcome(resourceType, principal.scopes));
    return false;
  }

  // Patient-level scope: restrict to launch patient context
  if (context === "patient" && patientDfn) {
    if (principal.patientContext && principal.patientContext !== patientDfn) {
      log.warn("FHIR patient context mismatch", {
        sub: principal.sub,
        requested: patientDfn,
        context: principal.patientContext,
      });
      reply
        .status(403)
        .header("content-type", FHIR_CONTENT_TYPE)
        .send(patientContextOutcome(patientDfn, principal.patientContext));
      return false;
    }
  }

  log.debug("FHIR scope granted", { sub: principal.sub, resourceType, scope: matchedScope });
  return true;
}
