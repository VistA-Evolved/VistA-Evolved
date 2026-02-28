/**
 * FHIR R4 CapabilityStatement — Phase 178.
 *
 * Generates the FHIR CapabilityStatement (metadata) for the VistA-Evolved
 * FHIR R4 read-only gateway. This is the required self-description endpoint
 * at GET /fhir/metadata per the FHIR specification.
 *
 * Supported resource types (US Core read-only):
 *   Patient, AllergyIntolerance, Condition, Observation, MedicationRequest,
 *   DocumentReference, Encounter
 */

import type { FhirCapabilityStatement } from "./types.js";

const VERSION = "0.1.0";

export function buildCapabilityStatement(baseUrl: string): FhirCapabilityStatement {
  return {
    resourceType: "CapabilityStatement",
    id: "vista-evolved-fhir-r4",
    meta: { lastUpdated: new Date().toISOString() },
    name: "VistAEvolvedFhirR4",
    title: "VistA-Evolved FHIR R4 Gateway",
    status: "draft",
    date: new Date().toISOString().split("T")[0],
    kind: "instance",
    fhirVersion: "4.0.1",
    format: ["application/fhir+json", "json"],
    software: {
      name: "VistA-Evolved",
      version: VERSION,
    },
    implementation: {
      description: "VistA-Evolved FHIR R4 read-only gateway. Maps VistA RPC data to FHIR R4 resources via the clinical engine adapter layer.",
      url: baseUrl,
    },
    rest: [{
      mode: "server",
      resource: [
        {
          type: "Patient",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient",
          interaction: [
            { code: "read" },
            { code: "search-type" },
          ],
          searchParam: [
            { name: "name", type: "string" },
            { name: "_id", type: "token" },
            { name: "_count", type: "number" },
          ],
        },
        {
          type: "AllergyIntolerance",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-allergyintolerance",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference" },
          ],
        },
        {
          type: "Condition",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-condition-problems-health-concerns",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference" },
          ],
        },
        {
          type: "Observation",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-vital-signs",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference" },
            { name: "category", type: "token" },
          ],
        },
        {
          type: "MedicationRequest",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference" },
          ],
        },
        {
          type: "DocumentReference",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-documentreference",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference" },
          ],
        },
        {
          type: "Encounter",
          profile: "http://hl7.org/fhir/us/core/StructureDefinition/us-core-encounter",
          interaction: [
            { code: "search-type" },
          ],
          searchParam: [
            { name: "patient", type: "reference" },
          ],
        },
      ],
    }],
  };
}
