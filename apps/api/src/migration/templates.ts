/**
 * templates.ts -- Built-in Mapping Templates (Phase 50)
 *
 * Provides ready-to-use mapping configurations for common source formats:
 *   - Generic CSV (flat patient/problem/med/allergy/appointment)
 *   - OpenEMR-style export CSV (structure only -- no code copy)
 *   - FHIR Bundle placeholder (future)
 *
 * Each template defines source→target field mappings, transforms, and
 * validation rules. Templates are registered at startup.
 */

import type { MappingTemplate } from "./types.js";
import { registerTemplate } from "./migration-store.js";

/* ------------------------------------------------------------------ */
/* Generic CSV templates                                               */
/* ------------------------------------------------------------------ */

const GENERIC_PATIENT: MappingTemplate = {
  id: "generic-csv-patient",
  name: "Generic CSV -- Patients",
  sourceFormat: "generic-csv",
  entityType: "patient",
  version: "1.0.0",
  description: "Import patients from a flat CSV with standard columns (last_name, first_name, dob, ssn, sex, etc.)",
  fields: [
    { source: "last_name", target: "lastName", required: true, transforms: [{ fn: "uppercase" }, { fn: "trim" }] },
    { source: "first_name", target: "firstName", required: true, transforms: [{ fn: "uppercase" }, { fn: "trim" }] },
    { source: "dob", target: "dateOfBirth", required: true, transforms: [{ fn: "date-iso8601" }], validationPattern: "." },
    { source: "ssn", target: "ssn", required: false, transforms: [{ fn: "trim" }], validationPattern: "^\\d{3}-?\\d{2}-?\\d{4}$" },
    { source: "sex", target: "sex", required: true, transforms: [{ fn: "uppercase" }, { fn: "trim" }], validationPattern: "^[MF]$" },
    { source: "street", target: "address.street", required: false, transforms: [{ fn: "trim" }] },
    { source: "city", target: "address.city", required: false, transforms: [{ fn: "trim" }] },
    { source: "state", target: "address.state", required: false, transforms: [{ fn: "uppercase" }, { fn: "trim" }] },
    { source: "zip", target: "address.zip", required: false, transforms: [{ fn: "trim" }], validationPattern: "^\\d{5}(-\\d{4})?$" },
    { source: "phone", target: "phone", required: false, transforms: [{ fn: "trim" }] },
    { source: "email", target: "email", required: false, transforms: [{ fn: "lowercase" }, { fn: "trim" }] },
  ],
};

const GENERIC_PROBLEM: MappingTemplate = {
  id: "generic-csv-problem",
  name: "Generic CSV -- Problems",
  sourceFormat: "generic-csv",
  entityType: "problem",
  version: "1.0.0",
  description: "Import problems/diagnoses from a flat CSV (patient_id, icd_code, description, onset_date, status)",
  fields: [
    { source: "patient_id", target: "patientId", required: true, transforms: [{ fn: "trim" }] },
    { source: "icd_code", target: "icdCode", required: true, transforms: [{ fn: "uppercase" }, { fn: "trim" }] },
    { source: "description", target: "description", required: true, transforms: [{ fn: "trim" }] },
    { source: "onset_date", target: "onsetDate", required: false, transforms: [{ fn: "date-iso8601" }] },
    { source: "status", target: "status", required: false, transforms: [{ fn: "lowercase" }, { fn: "trim" }], description: "active, inactive, resolved" },
    { source: "provider", target: "provider", required: false, transforms: [{ fn: "trim" }] },
  ],
};

const GENERIC_MEDICATION: MappingTemplate = {
  id: "generic-csv-medication",
  name: "Generic CSV -- Medications",
  sourceFormat: "generic-csv",
  entityType: "medication",
  version: "1.0.0",
  description: "Import medications from a flat CSV (patient_id, drug_name, dosage, route, frequency, start_date)",
  fields: [
    { source: "patient_id", target: "patientId", required: true, transforms: [{ fn: "trim" }] },
    { source: "drug_name", target: "drugName", required: true, transforms: [{ fn: "trim" }] },
    { source: "dosage", target: "dosage", required: false, transforms: [{ fn: "trim" }] },
    { source: "route", target: "route", required: false, transforms: [{ fn: "uppercase" }, { fn: "trim" }] },
    { source: "frequency", target: "frequency", required: false, transforms: [{ fn: "trim" }] },
    { source: "start_date", target: "startDate", required: false, transforms: [{ fn: "date-iso8601" }] },
    { source: "end_date", target: "endDate", required: false, transforms: [{ fn: "date-iso8601" }] },
    { source: "prescriber", target: "prescriber", required: false, transforms: [{ fn: "trim" }] },
    { source: "status", target: "status", required: false, transforms: [{ fn: "lowercase" }] },
  ],
};

const GENERIC_ALLERGY: MappingTemplate = {
  id: "generic-csv-allergy",
  name: "Generic CSV -- Allergies",
  sourceFormat: "generic-csv",
  entityType: "allergy",
  version: "1.0.0",
  description: "Import allergies from a flat CSV (patient_id, allergen, reaction, severity, onset_date)",
  fields: [
    { source: "patient_id", target: "patientId", required: true, transforms: [{ fn: "trim" }] },
    { source: "allergen", target: "allergen", required: true, transforms: [{ fn: "trim" }] },
    { source: "reaction", target: "reaction", required: false, transforms: [{ fn: "trim" }] },
    { source: "severity", target: "severity", required: false, transforms: [{ fn: "uppercase" }, { fn: "trim" }], description: "MILD, MODERATE, SEVERE" },
    { source: "type", target: "allergyType", required: false, transforms: [{ fn: "lowercase" }], description: "drug, food, environmental, other" },
    { source: "onset_date", target: "onsetDate", required: false, transforms: [{ fn: "date-iso8601" }] },
    { source: "status", target: "status", required: false, transforms: [{ fn: "lowercase" }] },
  ],
};

const GENERIC_APPOINTMENT: MappingTemplate = {
  id: "generic-csv-appointment",
  name: "Generic CSV -- Appointments",
  sourceFormat: "generic-csv",
  entityType: "appointment",
  version: "1.0.0",
  description: "Import appointments from a flat CSV (patient_id, date, time, provider, clinic, type, status)",
  fields: [
    { source: "patient_id", target: "patientId", required: true, transforms: [{ fn: "trim" }] },
    { source: "date", target: "appointmentDate", required: true, transforms: [{ fn: "date-iso8601" }] },
    { source: "time", target: "appointmentTime", required: false, transforms: [{ fn: "trim" }] },
    { source: "provider", target: "provider", required: false, transforms: [{ fn: "trim" }] },
    { source: "clinic", target: "clinic", required: false, transforms: [{ fn: "trim" }] },
    { source: "type", target: "appointmentType", required: false, transforms: [{ fn: "trim" }] },
    { source: "duration_min", target: "durationMinutes", required: false, transforms: [{ fn: "number" }] },
    { source: "status", target: "status", required: false, transforms: [{ fn: "lowercase" }] },
    { source: "notes", target: "notes", required: false, transforms: [{ fn: "trim" }] },
  ],
};

/* ------------------------------------------------------------------ */
/* OpenEMR-style CSV templates (structure only)                        */
/* ------------------------------------------------------------------ */

const OPENEMR_PATIENT: MappingTemplate = {
  id: "openemr-csv-patient",
  name: "OpenEMR-style CSV -- Patients",
  sourceFormat: "openemr-csv",
  entityType: "patient",
  version: "1.0.0",
  description: "Map OpenEMR patient export columns (lname, fname, DOB, sex, street, etc.) to VistA-Evolved fields",
  fields: [
    { source: "lname", target: "lastName", required: true, transforms: [{ fn: "uppercase" }, { fn: "trim" }] },
    { source: "fname", target: "firstName", required: true, transforms: [{ fn: "uppercase" }, { fn: "trim" }] },
    { source: "mname", target: "middleName", required: false, transforms: [{ fn: "uppercase" }, { fn: "trim" }] },
    { source: "DOB", target: "dateOfBirth", required: true, transforms: [{ fn: "date-iso8601" }] },
    { source: "ss", target: "ssn", required: false, transforms: [{ fn: "trim" }], validationPattern: "^\\d{3}-?\\d{2}-?\\d{4}$" },
    { source: "sex", target: "sex", required: true, transforms: [{ fn: "uppercase" }, { fn: "trim" }], description: "Male→M, Female→F" },
    { source: "street", target: "address.street", required: false, transforms: [{ fn: "trim" }] },
    { source: "city", target: "address.city", required: false, transforms: [{ fn: "trim" }] },
    { source: "state", target: "address.state", required: false, transforms: [{ fn: "uppercase" }, { fn: "trim" }] },
    { source: "postal_code", target: "address.zip", required: false, transforms: [{ fn: "trim" }] },
    { source: "phone_home", target: "phone", required: false, transforms: [{ fn: "trim" }] },
    { source: "email", target: "email", required: false, transforms: [{ fn: "lowercase" }, { fn: "trim" }] },
    { source: "race", target: "race", required: false, transforms: [{ fn: "trim" }] },
    { source: "ethnicity", target: "ethnicity", required: false, transforms: [{ fn: "trim" }] },
    { source: "language", target: "preferredLanguage", required: false, transforms: [{ fn: "trim" }] },
  ],
};

const OPENEMR_ALLERGY: MappingTemplate = {
  id: "openemr-csv-allergy",
  name: "OpenEMR-style CSV -- Allergies",
  sourceFormat: "openemr-csv",
  entityType: "allergy",
  version: "1.0.0",
  description: "Map OpenEMR allergy export columns (pid, title, reaction, severity) to VistA-Evolved fields",
  fields: [
    { source: "pid", target: "patientId", required: true, transforms: [{ fn: "trim" }] },
    { source: "title", target: "allergen", required: true, transforms: [{ fn: "trim" }] },
    { source: "reaction", target: "reaction", required: false, transforms: [{ fn: "trim" }] },
    { source: "severity_al", target: "severity", required: false, transforms: [{ fn: "uppercase" }, { fn: "trim" }] },
    { source: "type", target: "allergyType", required: false, transforms: [{ fn: "lowercase" }] },
    { source: "begdate", target: "onsetDate", required: false, transforms: [{ fn: "date-iso8601" }] },
    { source: "enddate", target: "endDate", required: false, transforms: [{ fn: "date-iso8601" }] },
  ],
};

/* ------------------------------------------------------------------ */
/* FHIR Bundle placeholder                                             */
/* ------------------------------------------------------------------ */

const FHIR_PATIENT: MappingTemplate = {
  id: "fhir-bundle-patient",
  name: "FHIR Bundle -- Patients (placeholder)",
  sourceFormat: "fhir-bundle",
  entityType: "patient",
  version: "0.1.0",
  description: "Placeholder for FHIR R4 Bundle import. CSV field names represent flattened FHIR paths. Full FHIR JSON import is a future enhancement.",
  fields: [
    { source: "name.family", target: "lastName", required: true, transforms: [{ fn: "uppercase" }] },
    { source: "name.given", target: "firstName", required: true, transforms: [{ fn: "uppercase" }] },
    { source: "birthDate", target: "dateOfBirth", required: true, transforms: [{ fn: "date-iso8601" }] },
    { source: "gender", target: "sex", required: true, transforms: [{ fn: "uppercase" }], description: "male→M, female→F" },
    { source: "identifier.value", target: "ssn", required: false },
    { source: "telecom.phone", target: "phone", required: false },
    { source: "telecom.email", target: "email", required: false, transforms: [{ fn: "lowercase" }] },
  ],
};

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

const ALL_TEMPLATES: MappingTemplate[] = [
  GENERIC_PATIENT,
  GENERIC_PROBLEM,
  GENERIC_MEDICATION,
  GENERIC_ALLERGY,
  GENERIC_APPOINTMENT,
  OPENEMR_PATIENT,
  OPENEMR_ALLERGY,
  FHIR_PATIENT,
];

/**
 * Register all built-in templates. Called at startup.
 */
export function registerBuiltinTemplates(): void {
  for (const tpl of ALL_TEMPLATES) {
    registerTemplate(tpl);
  }
}

export { ALL_TEMPLATES };
