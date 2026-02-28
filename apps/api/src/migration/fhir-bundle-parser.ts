/**
 * fhir-bundle-parser.ts -- FHIR R4 Bundle Import Parser (Phase 281)
 *
 * Parses FHIR R4 JSON Bundles and extracts clinical resources into
 * the internal migration domain types. This completes the import
 * direction that Phase 50 left as a placeholder.
 *
 * Supported resource types:
 *   Patient, AllergyIntolerance, Condition, Observation,
 *   MedicationRequest, Encounter, Appointment, DocumentReference
 */

import { createHash } from "crypto";
import type { ImportEntityType, ValidationIssue } from "./types.js";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface FhirResource {
  resourceType: string;
  id?: string;
  [key: string]: unknown;
}

export interface FhirBundleEntry {
  fullUrl?: string;
  resource?: FhirResource;
}

export interface FhirBundleInput {
  resourceType: "Bundle";
  type?: string;
  total?: number;
  entry?: FhirBundleEntry[];
  [key: string]: unknown;
}

export interface ParsedEntity {
  /** Which entity type this maps to */
  entityType: ImportEntityType;
  /** Original FHIR resource type */
  fhirResourceType: string;
  /** FHIR resource ID */
  sourceId: string;
  /** Flattened key-value fields for downstream mapping */
  fields: Record<string, string>;
  /** SHA-256 hash of the source resource for reconciliation */
  contentHash: string;
  /** Raw resource preserved for audit */
  rawResource: FhirResource;
}

export interface FhirImportResult {
  ok: boolean;
  bundleType: string;
  totalEntries: number;
  parsed: ParsedEntity[];
  skipped: { resourceType: string; reason: string }[];
  warnings: ValidationIssue[];
}

/* ------------------------------------------------------------------ */
/* Supported resource types                                            */
/* ------------------------------------------------------------------ */

const RESOURCE_TO_ENTITY: Record<string, ImportEntityType> = {
  Patient: "patient",
  AllergyIntolerance: "allergy",
  Condition: "problem",
  Observation: "note", // vitals/labs → note entity
  MedicationRequest: "medication",
  Encounter: "appointment", // closest mapping
  Appointment: "appointment",
  DocumentReference: "note",
};

export function listSupportedFhirResourceTypes(): string[] {
  return Object.keys(RESOURCE_TO_ENTITY);
}

/* ------------------------------------------------------------------ */
/* Content hashing                                                     */
/* ------------------------------------------------------------------ */

function hashResource(resource: FhirResource): string {
  return createHash("sha256")
    .update(JSON.stringify(resource))
    .digest("hex");
}

/* ------------------------------------------------------------------ */
/* Resource-specific field extractors                                   */
/* ------------------------------------------------------------------ */

function extractPatientFields(r: FhirResource): Record<string, string> {
  const fields: Record<string, string> = {};
  const name = Array.isArray(r.name) ? r.name[0] : undefined;
  if (name) {
    fields.familyName = String(name.family ?? "");
    fields.givenName = Array.isArray(name.given) ? name.given.join(" ") : "";
  }
  if (r.birthDate) fields.dob = String(r.birthDate);
  if (r.gender) fields.gender = String(r.gender);
  if (r.id) fields.sourcePatientId = String(r.id);

  const telecom = Array.isArray(r.telecom) ? r.telecom : [];
  const phone = telecom.find((t: any) => t.system === "phone");
  if (phone) fields.phone = String(phone.value ?? "");
  const email = telecom.find((t: any) => t.system === "email");
  if (email) fields.email = String(email.value ?? "");

  const addr = Array.isArray(r.address) ? r.address[0] : undefined;
  if (addr) {
    fields.streetAddress = Array.isArray(addr.line) ? addr.line.join(", ") : "";
    fields.city = String(addr.city ?? "");
    fields.state = String(addr.state ?? "");
    fields.postalCode = String(addr.postalCode ?? "");
  }
  const ssn = Array.isArray(r.identifier)
    ? r.identifier.find((i: any) =>
        String(i.system ?? "").includes("social-security") ||
        String(i.system ?? "").includes("ssn"))
    : undefined;
  if (ssn) fields.ssn = String(ssn.value ?? "");

  return fields;
}

function extractAllergyFields(r: FhirResource): Record<string, string> {
  const fields: Record<string, string> = {};
  const code = (r.code as any)?.coding?.[0];
  if (code) {
    fields.allergenName = String(code.display ?? code.code ?? "");
    fields.allergenCode = String(code.code ?? "");
    fields.allergenSystem = String(code.system ?? "");
  }
  if (r.type) fields.type = String(r.type);
  if (r.category) {
    fields.category = Array.isArray(r.category)
      ? r.category.join(",")
      : String(r.category);
  }
  if (r.criticality) fields.criticality = String(r.criticality);
  if (r.onsetDateTime) fields.onsetDate = String(r.onsetDateTime);
  const patient = (r.patient as any)?.reference;
  if (patient) fields.patientRef = String(patient);
  return fields;
}

function extractConditionFields(r: FhirResource): Record<string, string> {
  const fields: Record<string, string> = {};
  const code = (r.code as any)?.coding?.[0];
  if (code) {
    fields.conditionName = String(code.display ?? code.code ?? "");
    fields.icdCode = String(code.code ?? "");
    fields.codeSystem = String(code.system ?? "");
  }
  if (r.onsetDateTime) fields.onsetDate = String(r.onsetDateTime);
  const clinStatus = (r.clinicalStatus as any)?.coding?.[0]?.code;
  if (clinStatus) fields.clinicalStatus = String(clinStatus);
  const verStatus = (r.verificationStatus as any)?.coding?.[0]?.code;
  if (verStatus) fields.verificationStatus = String(verStatus);
  const subject = (r.subject as any)?.reference;
  if (subject) fields.patientRef = String(subject);
  return fields;
}

function extractObservationFields(r: FhirResource): Record<string, string> {
  const fields: Record<string, string> = {};
  const code = (r.code as any)?.coding?.[0];
  if (code) {
    fields.observationName = String(code.display ?? code.code ?? "");
    fields.loincCode = String(code.code ?? "");
  }
  if (r.effectiveDateTime) fields.effectiveDate = String(r.effectiveDateTime);
  if (r.status) fields.status = String(r.status);
  const vq = r.valueQuantity as any;
  if (vq) {
    fields.value = String(vq.value ?? "");
    fields.unit = String(vq.unit ?? "");
  }
  const subject = (r.subject as any)?.reference;
  if (subject) fields.patientRef = String(subject);
  return fields;
}

function extractMedicationRequestFields(r: FhirResource): Record<string, string> {
  const fields: Record<string, string> = {};
  const med = (r.medicationCodeableConcept as any)?.coding?.[0];
  if (med) {
    fields.medicationName = String(med.display ?? med.code ?? "");
    fields.rxnormCode = String(med.code ?? "");
  }
  if (r.status) fields.status = String(r.status);
  if (r.intent) fields.intent = String(r.intent);
  if (r.authoredOn) fields.authoredOn = String(r.authoredOn);
  const dosage = Array.isArray(r.dosageInstruction)
    ? r.dosageInstruction[0]
    : undefined;
  if (dosage) {
    fields.dosageText = String((dosage as any).text ?? "");
  }
  const subject = (r.subject as any)?.reference;
  if (subject) fields.patientRef = String(subject);
  return fields;
}

function extractEncounterFields(r: FhirResource): Record<string, string> {
  const fields: Record<string, string> = {};
  if (r.status) fields.status = String(r.status);
  const cls = r.class as any;
  if (cls?.code) fields.class = String(cls.code);
  const type = Array.isArray(r.type) ? (r.type[0] as any)?.coding?.[0] : undefined;
  if (type) fields.encounterType = String(type.display ?? type.code ?? "");
  const period = r.period as any;
  if (period?.start) fields.startDate = String(period.start);
  if (period?.end) fields.endDate = String(period.end);
  const subject = (r.subject as any)?.reference;
  if (subject) fields.patientRef = String(subject);
  return fields;
}

function extractAppointmentFields(r: FhirResource): Record<string, string> {
  const fields: Record<string, string> = {};
  if (r.status) fields.status = String(r.status);
  if (r.start) fields.startDate = String(r.start);
  if (r.end) fields.endDate = String(r.end);
  if (r.description) fields.description = String(r.description);
  const type = Array.isArray(r.appointmentType)
    ? undefined
    : (r.appointmentType as any)?.coding?.[0];
  if (type) fields.appointmentType = String(type.display ?? type.code ?? "");
  const participant = Array.isArray(r.participant) ? r.participant[0] : undefined;
  if (participant) {
    const ref = (participant as any)?.actor?.reference;
    if (ref) fields.patientRef = String(ref);
  }
  return fields;
}

function extractDocumentReferenceFields(r: FhirResource): Record<string, string> {
  const fields: Record<string, string> = {};
  if (r.status) fields.status = String(r.status);
  const type = (r.type as any)?.coding?.[0];
  if (type) {
    fields.documentType = String(type.display ?? type.code ?? "");
    fields.typeCode = String(type.code ?? "");
  }
  if (r.date) fields.date = String(r.date);
  if (r.description) fields.description = String(r.description);
  const subject = (r.subject as any)?.reference;
  if (subject) fields.patientRef = String(subject);
  return fields;
}

const EXTRACTORS: Record<string, (r: FhirResource) => Record<string, string>> = {
  Patient: extractPatientFields,
  AllergyIntolerance: extractAllergyFields,
  Condition: extractConditionFields,
  Observation: extractObservationFields,
  MedicationRequest: extractMedicationRequestFields,
  Encounter: extractEncounterFields,
  Appointment: extractAppointmentFields,
  DocumentReference: extractDocumentReferenceFields,
};

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

/**
 * Parse a FHIR R4 Bundle JSON into internal migration entities.
 */
export function parseFhirBundle(input: unknown): FhirImportResult {
  const warnings: ValidationIssue[] = [];
  const parsed: ParsedEntity[] = [];
  const skipped: { resourceType: string; reason: string }[] = [];

  // Validate top-level structure
  if (!input || typeof input !== "object") {
    return {
      ok: false,
      bundleType: "unknown",
      totalEntries: 0,
      parsed: [],
      skipped: [],
      warnings: [
        {
          severity: "error",
          code: "INVALID_INPUT",
          message: "Input is not a valid object",
        },
      ],
    };
  }

  const bundle = input as FhirBundleInput;

  if (bundle.resourceType !== "Bundle") {
    return {
      ok: false,
      bundleType: "unknown",
      totalEntries: 0,
      parsed: [],
      skipped: [],
      warnings: [
        {
          severity: "error",
          code: "NOT_A_BUNDLE",
          message: `Expected resourceType "Bundle", got "${bundle.resourceType}"`,
        },
      ],
    };
  }

  const entries = bundle.entry ?? [];
  const bundleType = String(bundle.type ?? "unknown");

  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    const resource = entry?.resource;

    if (!resource) {
      skipped.push({ resourceType: "unknown", reason: "No resource in entry" });
      warnings.push({
        row: i,
        severity: "warning",
        code: "EMPTY_ENTRY",
        message: `Entry ${i} has no resource`,
      });
      continue;
    }

    if (!resource.resourceType) {
      skipped.push({ resourceType: "unknown", reason: "Missing resourceType" });
      warnings.push({
        row: i,
        severity: "warning",
        code: "MISSING_RESOURCE_TYPE",
        message: `Entry ${i} resource has no resourceType`,
      });
      continue;
    }

    const entityType = RESOURCE_TO_ENTITY[resource.resourceType];
    if (!entityType) {
      skipped.push({
        resourceType: resource.resourceType,
        reason: "Unsupported resource type",
      });
      continue;
    }

    const extractor = EXTRACTORS[resource.resourceType];
    const fields = extractor ? extractor(resource) : {};

    parsed.push({
      entityType,
      fhirResourceType: resource.resourceType,
      sourceId: String(resource.id ?? entry.fullUrl ?? `entry-${i}`),
      fields,
      contentHash: hashResource(resource),
      rawResource: resource,
    });
  }

  return {
    ok: warnings.filter((w) => w.severity === "error").length === 0,
    bundleType,
    totalEntries: entries.length,
    parsed,
    skipped,
    warnings,
  };
}

/**
 * Convenience: extract only Patient resources from a bundle.
 */
export function extractPatientsFromBundle(input: unknown): ParsedEntity[] {
  const result = parseFhirBundle(input);
  return result.parsed.filter((e) => e.entityType === "patient");
}

/**
 * Convenience: extract entities by type.
 */
export function extractEntitiesByType(
  input: unknown,
  entityType: ImportEntityType,
): ParsedEntity[] {
  const result = parseFhirBundle(input);
  return result.parsed.filter((e) => e.entityType === entityType);
}
