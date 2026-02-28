/**
 * FHIR R4 CapabilityStatement -- Phase 178, updated Phase 235 (Wave 5 Q235).
 *
 * Generates the FHIR CapabilityStatement (metadata) for the VistA-Evolved
 * FHIR R4 read-only gateway. This is the required self-description endpoint
 * at GET /fhir/metadata per the FHIR specification.
 *
 * Phase 235 additions:
 *   - SMART security posture (when OIDC enabled)
 *   - Expanded search parameters (identifier, date, status, code, clinical-status)
 *   - _offset paging support advertised
 *   - _count on all search-type resources
 *
 * Supported resource types (US Core read-only):
 *   Patient, AllergyIntolerance, Condition, Observation, MedicationRequest,
 *   DocumentReference, Encounter
 */

import type { FhirCapabilityStatement } from "./types.js";
import { getOidcConfig } from "../auth/oidc-provider.js";

const VERSION = "0.2.0";

type CapabilitySecurity = NonNullable<NonNullable<FhirCapabilityStatement["rest"]>[number]["security"]>;

export function buildCapabilityStatement(baseUrl: string): FhirCapabilityStatement {
  const oidc = getOidcConfig();

  // Phase 235: SMART security extension (only when OIDC is enabled)
  const security: CapabilitySecurity = {
    cors: true,
    service: [{
      coding: [{
        system: "http://terminology.hl7.org/CodeSystem/restful-security-service",
        code: "SMART-on-FHIR",
        display: "SMART on FHIR",
      }],
      text: "OAuth2 using SMART-on-FHIR profile (see http://docs.smarthealthit.org)",
    }],
  };

  if (oidc.enabled) {
    security.extension = [{
      url: "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris",
      extension: [
        { url: "authorize", valueUri: `${oidc.issuer}/protocol/openid-connect/auth` },
        { url: "token", valueUri: `${oidc.issuer}/protocol/openid-connect/token` },
        { url: "revoke", valueUri: `${oidc.issuer}/protocol/openid-connect/revoke` },
      ],
    }];
    security.description = "SMART-on-FHIR OAuth2 with OIDC bearer token support. Session cookie auth also accepted.";
  } else {
    security.description = "Session-based authentication. OIDC/SMART bearer token support available when OIDC_ENABLED=true.";
  }

  return {
    resourceType: "CapabilityStatement",
    id: "vista-evolved-fhir-r4",
    meta: { lastUpdated: new Date().toISOString() },
    name: "VistAEvolvedFhirR4",
    title: "VistA-Evolved FHIR R4 Gateway",
    status: "active",
    date: new Date().toISOString().split("T")[0],
    kind: "instance",
    fhirVersion: "4.0.1",
    format: ["application/fhir+json", "json"],
    software: {
      name: "VistA-Evolved",
      version: VERSION,
    },
    implementation: {
      description: "VistA-Evolved FHIR R4 read-only gateway. Maps VistA RPC data to FHIR R4 resources via the clinical engine adapter layer. Supports SMART-on-FHIR bearer token and session cookie authentication.",
      url: baseUrl,
    },
    rest: [{
      mode: "server",
      security,
      resource: [
        {
          type: "Patient",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          interaction: [
            { code: "read" },
            { code: "search-type" },
          ],
          searchParam: [
            { name: "name", type: "string", documentation: "Patient name (partial match)" },
            { name: "_id", type: "token", documentation: "Patient DFN (logical ID)" },
            { name: "identifier", type: "token", documentation: "Patient identifier (DFN)" },
            { name: "_count", type: "number", documentation: "Page size (1-100, default 20)" },
            { name: "_offset", type: "number", documentation: "Paging offset (0-based)" },
          ],
        },
        {
          type: "AllergyIntolerance",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference", documentation: "Patient DFN" },
            { name: "clinical-status", type: "token", documentation: "active | inactive | resolved" },
            { name: "_count", type: "number" },
            { name: "_offset", type: "number" },
          ],
        },
        {
          type: "Condition",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference", documentation: "Patient DFN" },
            { name: "clinical-status", type: "token", documentation: "active | resolved | inactive" },
            { name: "_count", type: "number" },
            { name: "_offset", type: "number" },
          ],
        },
        {
          type: "Observation",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-vital-signs",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference", documentation: "Patient DFN" },
            { name: "category", type: "token", documentation: "vital-signs | laboratory" },
            { name: "code", type: "token", documentation: "LOINC code or display name" },
            { name: "date", type: "date", documentation: "Observation date (supports prefixes: eq, gt, lt, ge, le)" },
            { name: "_count", type: "number" },
            { name: "_offset", type: "number" },
          ],
        },
        {
          type: "MedicationRequest",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference", documentation: "Patient DFN" },
            { name: "status", type: "token", documentation: "active | stopped | completed" },
            { name: "_count", type: "number" },
            { name: "_offset", type: "number" },
          ],
        },
        {
          type: "DocumentReference",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference", documentation: "Patient DFN" },
            { name: "date", type: "date", documentation: "Document date (supports prefixes)" },
            { name: "_count", type: "number" },
            { name: "_offset", type: "number" },
          ],
        },
        {
          type: "Encounter",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference", documentation: "Patient DFN" },
            { name: "date", type: "date", documentation: "Encounter date (supports prefixes: eq, gt, lt, ge, le)" },
            { name: "status", type: "token", documentation: "planned | in-progress | finished | cancelled" },
            { name: "_count", type: "number" },
            { name: "_offset", type: "number" },
          ],
        },
      ],
    }],
  };
}
