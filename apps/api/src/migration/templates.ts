/**
 * templates.ts -- Built-in Mapping Templates (Phase 50)
 *
 * Provides ready-to-use mapping configurations for common source formats:
 *   - Generic CSV (flat patient/problem/med/allergy/appointment)
 *   - OpenEMR-style export CSV (structure only -- no code copy)
 *   - FHIR Bundle placeholder (future)
 *
 * Each template defines source->target field mappings, transforms, and
 * validation rules. Templates are registered at startup.
 */

import type { MappingTemplate } from './types.js';
import { registerTemplate } from './migration-store.js';

/* ------------------------------------------------------------------ */
/* Generic CSV templates                                               */
/* ------------------------------------------------------------------ */

const GENERIC_PATIENT: MappingTemplate = {
  id: 'generic-csv-patient',
  name: 'Generic CSV -- Patients',
  sourceFormat: 'generic-csv',
  entityType: 'patient',
  version: '1.0.0',
  description:
    'Import patients from a flat CSV with standard columns (last_name, first_name, dob, ssn, sex, etc.)',
  fields: [
    {
      source: 'last_name',
      target: 'lastName',
      required: true,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
    },
    {
      source: 'first_name',
      target: 'firstName',
      required: true,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
    },
    {
      source: 'dob',
      target: 'dateOfBirth',
      required: true,
      transforms: [{ fn: 'date-iso8601' }],
      validationPattern: '.',
    },
    {
      source: 'ssn',
      target: 'ssn',
      required: false,
      transforms: [{ fn: 'trim' }],
      validationPattern: '^\\d{3}-?\\d{2}-?\\d{4}$',
    },
    {
      source: 'sex',
      target: 'sex',
      required: true,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
      validationPattern: '^[MF]$',
    },
    { source: 'street', target: 'address.street', required: false, transforms: [{ fn: 'trim' }] },
    { source: 'city', target: 'address.city', required: false, transforms: [{ fn: 'trim' }] },
    {
      source: 'state',
      target: 'address.state',
      required: false,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
    },
    {
      source: 'zip',
      target: 'address.zip',
      required: false,
      transforms: [{ fn: 'trim' }],
      validationPattern: '^\\d{5}(-\\d{4})?$',
    },
    { source: 'phone', target: 'phone', required: false, transforms: [{ fn: 'trim' }] },
    {
      source: 'email',
      target: 'email',
      required: false,
      transforms: [{ fn: 'lowercase' }, { fn: 'trim' }],
    },
  ],
};

const GENERIC_PROBLEM: MappingTemplate = {
  id: 'generic-csv-problem',
  name: 'Generic CSV -- Problems',
  sourceFormat: 'generic-csv',
  entityType: 'problem',
  version: '1.0.0',
  description:
    'Import problems/diagnoses from a flat CSV (patient_id, icd_code, description, onset_date, status)',
  fields: [
    { source: 'patient_id', target: 'patientId', required: true, transforms: [{ fn: 'trim' }] },
    {
      source: 'icd_code',
      target: 'icdCode',
      required: true,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
    },
    { source: 'description', target: 'description', required: true, transforms: [{ fn: 'trim' }] },
    {
      source: 'onset_date',
      target: 'onsetDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    {
      source: 'status',
      target: 'status',
      required: false,
      transforms: [{ fn: 'lowercase' }, { fn: 'trim' }],
      description: 'active, inactive, resolved',
    },
    { source: 'provider', target: 'provider', required: false, transforms: [{ fn: 'trim' }] },
  ],
};

const GENERIC_MEDICATION: MappingTemplate = {
  id: 'generic-csv-medication',
  name: 'Generic CSV -- Medications',
  sourceFormat: 'generic-csv',
  entityType: 'medication',
  version: '1.0.0',
  description:
    'Import medications from a flat CSV (patient_id, drug_name, dosage, route, frequency, start_date)',
  fields: [
    { source: 'patient_id', target: 'patientId', required: true, transforms: [{ fn: 'trim' }] },
    { source: 'drug_name', target: 'drugName', required: true, transforms: [{ fn: 'trim' }] },
    { source: 'dosage', target: 'dosage', required: false, transforms: [{ fn: 'trim' }] },
    {
      source: 'route',
      target: 'route',
      required: false,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
    },
    { source: 'frequency', target: 'frequency', required: false, transforms: [{ fn: 'trim' }] },
    {
      source: 'start_date',
      target: 'startDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    {
      source: 'end_date',
      target: 'endDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'prescriber', target: 'prescriber', required: false, transforms: [{ fn: 'trim' }] },
    { source: 'status', target: 'status', required: false, transforms: [{ fn: 'lowercase' }] },
  ],
};

const GENERIC_ALLERGY: MappingTemplate = {
  id: 'generic-csv-allergy',
  name: 'Generic CSV -- Allergies',
  sourceFormat: 'generic-csv',
  entityType: 'allergy',
  version: '1.0.0',
  description:
    'Import allergies from a flat CSV (patient_id, allergen, reaction, severity, onset_date)',
  fields: [
    { source: 'patient_id', target: 'patientId', required: true, transforms: [{ fn: 'trim' }] },
    { source: 'allergen', target: 'allergen', required: true, transforms: [{ fn: 'trim' }] },
    { source: 'reaction', target: 'reaction', required: false, transforms: [{ fn: 'trim' }] },
    {
      source: 'severity',
      target: 'severity',
      required: false,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
      description: 'MILD, MODERATE, SEVERE',
    },
    {
      source: 'type',
      target: 'allergyType',
      required: false,
      transforms: [{ fn: 'lowercase' }],
      description: 'drug, food, environmental, other',
    },
    {
      source: 'onset_date',
      target: 'onsetDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'status', target: 'status', required: false, transforms: [{ fn: 'lowercase' }] },
  ],
};

const GENERIC_APPOINTMENT: MappingTemplate = {
  id: 'generic-csv-appointment',
  name: 'Generic CSV -- Appointments',
  sourceFormat: 'generic-csv',
  entityType: 'appointment',
  version: '1.0.0',
  description:
    'Import appointments from a flat CSV (patient_id, date, time, provider, clinic, type, status)',
  fields: [
    { source: 'patient_id', target: 'patientId', required: true, transforms: [{ fn: 'trim' }] },
    {
      source: 'date',
      target: 'appointmentDate',
      required: true,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'time', target: 'appointmentTime', required: false, transforms: [{ fn: 'trim' }] },
    { source: 'provider', target: 'provider', required: false, transforms: [{ fn: 'trim' }] },
    { source: 'clinic', target: 'clinic', required: false, transforms: [{ fn: 'trim' }] },
    { source: 'type', target: 'appointmentType', required: false, transforms: [{ fn: 'trim' }] },
    {
      source: 'duration_min',
      target: 'durationMinutes',
      required: false,
      transforms: [{ fn: 'number' }],
    },
    { source: 'status', target: 'status', required: false, transforms: [{ fn: 'lowercase' }] },
    { source: 'notes', target: 'notes', required: false, transforms: [{ fn: 'trim' }] },
  ],
};

/* ------------------------------------------------------------------ */
/* OpenEMR-style CSV templates (structure only)                        */
/* ------------------------------------------------------------------ */

const OPENEMR_PATIENT: MappingTemplate = {
  id: 'openemr-csv-patient',
  name: 'OpenEMR-style CSV -- Patients',
  sourceFormat: 'openemr-csv',
  entityType: 'patient',
  version: '1.0.0',
  description:
    'Map OpenEMR patient export columns (lname, fname, DOB, sex, street, etc.) to VistA-Evolved fields',
  fields: [
    {
      source: 'lname',
      target: 'lastName',
      required: true,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
    },
    {
      source: 'fname',
      target: 'firstName',
      required: true,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
    },
    {
      source: 'mname',
      target: 'middleName',
      required: false,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
    },
    { source: 'DOB', target: 'dateOfBirth', required: true, transforms: [{ fn: 'date-iso8601' }] },
    {
      source: 'ss',
      target: 'ssn',
      required: false,
      transforms: [{ fn: 'trim' }],
      validationPattern: '^\\d{3}-?\\d{2}-?\\d{4}$',
    },
    {
      source: 'sex',
      target: 'sex',
      required: true,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
      description: 'Male->M, Female->F',
    },
    { source: 'street', target: 'address.street', required: false, transforms: [{ fn: 'trim' }] },
    { source: 'city', target: 'address.city', required: false, transforms: [{ fn: 'trim' }] },
    {
      source: 'state',
      target: 'address.state',
      required: false,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
    },
    { source: 'postal_code', target: 'address.zip', required: false, transforms: [{ fn: 'trim' }] },
    { source: 'phone_home', target: 'phone', required: false, transforms: [{ fn: 'trim' }] },
    {
      source: 'email',
      target: 'email',
      required: false,
      transforms: [{ fn: 'lowercase' }, { fn: 'trim' }],
    },
    { source: 'race', target: 'race', required: false, transforms: [{ fn: 'trim' }] },
    { source: 'ethnicity', target: 'ethnicity', required: false, transforms: [{ fn: 'trim' }] },
    {
      source: 'language',
      target: 'preferredLanguage',
      required: false,
      transforms: [{ fn: 'trim' }],
    },
  ],
};

const OPENEMR_ALLERGY: MappingTemplate = {
  id: 'openemr-csv-allergy',
  name: 'OpenEMR-style CSV -- Allergies',
  sourceFormat: 'openemr-csv',
  entityType: 'allergy',
  version: '1.0.0',
  description:
    'Map OpenEMR allergy export columns (pid, title, reaction, severity) to VistA-Evolved fields',
  fields: [
    { source: 'pid', target: 'patientId', required: true, transforms: [{ fn: 'trim' }] },
    { source: 'title', target: 'allergen', required: true, transforms: [{ fn: 'trim' }] },
    { source: 'reaction', target: 'reaction', required: false, transforms: [{ fn: 'trim' }] },
    {
      source: 'severity_al',
      target: 'severity',
      required: false,
      transforms: [{ fn: 'uppercase' }, { fn: 'trim' }],
    },
    { source: 'type', target: 'allergyType', required: false, transforms: [{ fn: 'lowercase' }] },
    {
      source: 'begdate',
      target: 'onsetDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'enddate', target: 'endDate', required: false, transforms: [{ fn: 'date-iso8601' }] },
  ],
};

/* ------------------------------------------------------------------ */
/* FHIR R4 Bundle -- real templates (match fhir-bundle-parser.ts)       */
/* ------------------------------------------------------------------ */

const FHIR_PATIENT: MappingTemplate = {
  id: 'fhir-bundle-patient',
  name: 'FHIR R4 Bundle -- Patients',
  sourceFormat: 'fhir-bundle',
  entityType: 'patient',
  version: '2.0.0',
  description: 'Maps FHIR R4 Patient resource fields as extracted by fhir-bundle-parser.ts',
  fields: [
    { source: 'lastName', target: 'lastName', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'firstName', target: 'firstName', required: true, transforms: [{ fn: 'uppercase' }] },
    {
      source: 'dateOfBirth',
      target: 'dateOfBirth',
      required: true,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'sex', target: 'sex', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'ssn', target: 'ssn', required: false },
    { source: 'phone', target: 'phone', required: false },
    { source: 'email', target: 'email', required: false, transforms: [{ fn: 'lowercase' }] },
    { source: 'address.line', target: 'streetAddress', required: false },
    { source: 'address.city', target: 'city', required: false },
    {
      source: 'address.state',
      target: 'state',
      required: false,
      transforms: [{ fn: 'uppercase' }],
    },
    { source: 'address.postalCode', target: 'zip', required: false },
    { source: 'maritalStatus', target: 'maritalStatus', required: false },
  ],
};

const FHIR_ALLERGY: MappingTemplate = {
  id: 'fhir-bundle-allergy',
  name: 'FHIR R4 Bundle -- Allergies',
  sourceFormat: 'fhir-bundle',
  entityType: 'allergy',
  version: '2.0.0',
  description: 'Maps FHIR R4 AllergyIntolerance resource fields',
  fields: [
    { source: 'patientRef', target: 'patientId', required: true },
    { source: 'allergen', target: 'allergen', required: true, transforms: [{ fn: 'trim' }] },
    { source: 'clinicalStatus', target: 'status', required: false },
    {
      source: 'category',
      target: 'allergyType',
      required: false,
      transforms: [{ fn: 'lowercase' }],
    },
    {
      source: 'criticality',
      target: 'severity',
      required: false,
      transforms: [{ fn: 'uppercase' }],
    },
    { source: 'reaction', target: 'reaction', required: false },
    {
      source: 'onsetDateTime',
      target: 'onsetDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
  ],
};

const FHIR_CONDITION: MappingTemplate = {
  id: 'fhir-bundle-condition',
  name: 'FHIR R4 Bundle -- Problems/Conditions',
  sourceFormat: 'fhir-bundle',
  entityType: 'problem',
  version: '2.0.0',
  description: 'Maps FHIR R4 Condition resource fields',
  fields: [
    { source: 'patientRef', target: 'patientId', required: true },
    { source: 'code', target: 'icdCode', required: false },
    { source: 'display', target: 'problemText', required: true, transforms: [{ fn: 'trim' }] },
    { source: 'clinicalStatus', target: 'status', required: false },
    {
      source: 'onsetDateTime',
      target: 'onsetDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    {
      source: 'abatementDateTime',
      target: 'resolvedDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'category', target: 'category', required: false },
  ],
};

const FHIR_OBSERVATION: MappingTemplate = {
  id: 'fhir-bundle-observation',
  name: 'FHIR R4 Bundle -- Observations/Vitals',
  sourceFormat: 'fhir-bundle',
  entityType: 'problem',
  version: '2.0.0',
  description:
    'Maps FHIR R4 Observation (vital signs, lab results) to the problem entity until a dedicated vitals entity is added',
  fields: [
    { source: 'patientRef', target: 'patientId', required: true },
    { source: 'code', target: 'icdCode', required: false, description: 'LOINC code' },
    { source: 'display', target: 'problemText', required: true },
    { source: 'value', target: 'value', required: false },
    { source: 'unit', target: 'unit', required: false },
    {
      source: 'effectiveDateTime',
      target: 'onsetDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'status', target: 'status', required: false },
  ],
};

const FHIR_MEDICATION_REQUEST: MappingTemplate = {
  id: 'fhir-bundle-medication-request',
  name: 'FHIR R4 Bundle -- Medication Requests',
  sourceFormat: 'fhir-bundle',
  entityType: 'medication',
  version: '2.0.0',
  description: 'Maps FHIR R4 MedicationRequest resource fields',
  fields: [
    { source: 'patientRef', target: 'patientId', required: true },
    {
      source: 'medicationDisplay',
      target: 'drugName',
      required: true,
      transforms: [{ fn: 'trim' }],
    },
    { source: 'status', target: 'status', required: false },
    { source: 'intent', target: 'orderType', required: false },
    {
      source: 'authoredOn',
      target: 'startDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'dosageInstruction', target: 'sig', required: false },
    { source: 'dispenseQuantity', target: 'quantity', required: false },
    { source: 'numberOfRepeats', target: 'refills', required: false },
  ],
};

const FHIR_ENCOUNTER: MappingTemplate = {
  id: 'fhir-bundle-encounter',
  name: 'FHIR R4 Bundle -- Encounters',
  sourceFormat: 'fhir-bundle',
  entityType: 'appointment',
  version: '2.0.0',
  description: 'Maps FHIR R4 Encounter resource to appointment entity (closest match)',
  fields: [
    { source: 'patientRef', target: 'patientId', required: true },
    { source: 'class', target: 'visitType', required: false },
    { source: 'type', target: 'reasonForVisit', required: false },
    { source: 'status', target: 'status', required: false },
    {
      source: 'periodStart',
      target: 'appointmentDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    {
      source: 'periodEnd',
      target: 'endDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'location', target: 'clinic', required: false },
  ],
};

const FHIR_APPOINTMENT: MappingTemplate = {
  id: 'fhir-bundle-appointment',
  name: 'FHIR R4 Bundle -- Appointments',
  sourceFormat: 'fhir-bundle',
  entityType: 'appointment',
  version: '2.0.0',
  description: 'Maps FHIR R4 Appointment resource fields',
  fields: [
    { source: 'patientRef', target: 'patientId', required: true },
    { source: 'status', target: 'status', required: false },
    { source: 'appointmentType', target: 'visitType', required: false },
    { source: 'description', target: 'reasonForVisit', required: false },
    {
      source: 'start',
      target: 'appointmentDate',
      required: true,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'end', target: 'endDate', required: false, transforms: [{ fn: 'date-iso8601' }] },
    { source: 'participant', target: 'provider', required: false },
  ],
};

const FHIR_DOCUMENT_REFERENCE: MappingTemplate = {
  id: 'fhir-bundle-document-reference',
  name: 'FHIR R4 Bundle -- Document References (Notes)',
  sourceFormat: 'fhir-bundle',
  entityType: 'note',
  version: '2.0.0',
  description: 'Maps FHIR R4 DocumentReference to note entity',
  fields: [
    { source: 'patientRef', target: 'patientId', required: true },
    { source: 'type', target: 'noteTitle', required: false },
    { source: 'date', target: 'noteDate', required: false, transforms: [{ fn: 'date-iso8601' }] },
    { source: 'content', target: 'noteBody', required: false },
    { source: 'status', target: 'status', required: false },
    { source: 'author', target: 'author', required: false },
  ],
};

/* ------------------------------------------------------------------ */
/* Vendor C-CDA profiles                                               */
/* ------------------------------------------------------------------ */

const EPIC_CCDA_PATIENT: MappingTemplate = {
  id: 'epic-ccda-patient',
  name: 'Epic C-CDA -- Patients',
  sourceFormat: 'epic-ccda',
  entityType: 'patient',
  version: '1.0.0',
  description:
    'Epic CCD exports using templateId 2.16.840.1.113883.10.20.22.1.2. Uses recordTarget/patientRole. Epic embeds MRN under id with root 1.2.840.114350.1.13.*.',
  fields: [
    { source: 'lastName', target: 'lastName', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'firstName', target: 'firstName', required: true, transforms: [{ fn: 'uppercase' }] },
    {
      source: 'dateOfBirth',
      target: 'dateOfBirth',
      required: true,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'sex', target: 'sex', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'ssn', target: 'ssn', required: false },
    { source: 'phone', target: 'phone', required: false },
    { source: 'streetAddress', target: 'streetAddress', required: false },
    { source: 'city', target: 'city', required: false },
    { source: 'state', target: 'state', required: false, transforms: [{ fn: 'uppercase' }] },
    { source: 'zip', target: 'zip', required: false },
    {
      source: 'race',
      target: 'race',
      required: false,
      description: 'Epic includes raceCode in sdtc:raceCode extension',
    },
    { source: 'ethnicity', target: 'ethnicity', required: false },
  ],
};

const EPIC_CCDA_PROBLEM: MappingTemplate = {
  id: 'epic-ccda-problem',
  name: 'Epic C-CDA -- Problems',
  sourceFormat: 'epic-ccda',
  entityType: 'problem',
  version: '1.0.0',
  description:
    'Epic Problem List section (LOINC 11450-4). Uses SNOMED CT codes in value/@code. Epic may include ICD-10 translations.',
  fields: [
    { source: 'patientId', target: 'patientId', required: true },
    {
      source: 'icdCode',
      target: 'icdCode',
      required: false,
      description: 'SNOMED CT or ICD-10 from translation',
    },
    { source: 'problemText', target: 'problemText', required: true },
    { source: 'status', target: 'status', required: false },
    {
      source: 'onsetDate',
      target: 'onsetDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
    {
      source: 'resolvedDate',
      target: 'resolvedDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
  ],
};

const CERNER_CCDA_PATIENT: MappingTemplate = {
  id: 'cerner-ccda-patient',
  name: 'Cerner/Oracle Health C-CDA -- Patients',
  sourceFormat: 'cerner-ccda',
  entityType: 'patient',
  version: '1.0.0',
  description:
    'Cerner Millennium CCD using templateId 2.16.840.1.113883.10.20.22.1.2. Cerner embeds FIN under id with root 2.16.840.1.113883.3.787.0.0.',
  fields: [
    { source: 'lastName', target: 'lastName', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'firstName', target: 'firstName', required: true, transforms: [{ fn: 'uppercase' }] },
    {
      source: 'dateOfBirth',
      target: 'dateOfBirth',
      required: true,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'sex', target: 'sex', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'ssn', target: 'ssn', required: false },
    { source: 'phone', target: 'phone', required: false },
    { source: 'streetAddress', target: 'streetAddress', required: false },
    { source: 'city', target: 'city', required: false },
    { source: 'state', target: 'state', required: false, transforms: [{ fn: 'uppercase' }] },
    { source: 'zip', target: 'zip', required: false },
  ],
};

const CERNER_CCDA_ALLERGY: MappingTemplate = {
  id: 'cerner-ccda-allergy',
  name: 'Cerner/Oracle Health C-CDA -- Allergies',
  sourceFormat: 'cerner-ccda',
  entityType: 'allergy',
  version: '1.0.0',
  description:
    'Cerner Allergy section (LOINC 48765-2). Uses RxNorm codes for drug allergies, UNII for substance allergies.',
  fields: [
    { source: 'patientId', target: 'patientId', required: true },
    { source: 'allergen', target: 'allergen', required: true, transforms: [{ fn: 'trim' }] },
    { source: 'reaction', target: 'reaction', required: false },
    { source: 'severity', target: 'severity', required: false, transforms: [{ fn: 'uppercase' }] },
    { source: 'allergyType', target: 'allergyType', required: false },
    { source: 'status', target: 'status', required: false },
    {
      source: 'onsetDate',
      target: 'onsetDate',
      required: false,
      transforms: [{ fn: 'date-iso8601' }],
    },
  ],
};

const ATHENA_CCDA_PATIENT: MappingTemplate = {
  id: 'athena-ccda-patient',
  name: 'athenahealth C-CDA -- Patients',
  sourceFormat: 'athena-ccda',
  entityType: 'patient',
  version: '1.0.0',
  description:
    'athenahealth CCD export. Uses standard C-CDA demographics. Enterprise ID in id with root 2.16.840.1.113883.3.564.*.',
  fields: [
    { source: 'lastName', target: 'lastName', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'firstName', target: 'firstName', required: true, transforms: [{ fn: 'uppercase' }] },
    {
      source: 'dateOfBirth',
      target: 'dateOfBirth',
      required: true,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'sex', target: 'sex', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'ssn', target: 'ssn', required: false },
    { source: 'phone', target: 'phone', required: false },
    { source: 'streetAddress', target: 'streetAddress', required: false },
    { source: 'city', target: 'city', required: false },
    { source: 'state', target: 'state', required: false, transforms: [{ fn: 'uppercase' }] },
    { source: 'zip', target: 'zip', required: false },
  ],
};

const ECW_CCDA_PATIENT: MappingTemplate = {
  id: 'ecw-ccda-patient',
  name: 'eClinicalWorks C-CDA -- Patients',
  sourceFormat: 'ecw-ccda',
  entityType: 'patient',
  version: '1.0.0',
  description:
    'eClinicalWorks CCD export. Non-standard: may omit telecom, uses custom OIDs for facility IDs.',
  fields: [
    { source: 'lastName', target: 'lastName', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'firstName', target: 'firstName', required: true, transforms: [{ fn: 'uppercase' }] },
    {
      source: 'dateOfBirth',
      target: 'dateOfBirth',
      required: true,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'sex', target: 'sex', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'ssn', target: 'ssn', required: false },
    { source: 'streetAddress', target: 'streetAddress', required: false },
    { source: 'city', target: 'city', required: false },
    { source: 'state', target: 'state', required: false, transforms: [{ fn: 'uppercase' }] },
    { source: 'zip', target: 'zip', required: false },
  ],
};

const PRACTICEFUSION_CCDA_PATIENT: MappingTemplate = {
  id: 'practicefusion-ccda-patient',
  name: 'Practice Fusion C-CDA -- Patients',
  sourceFormat: 'practicefusion-ccda',
  entityType: 'patient',
  version: '1.0.0',
  description:
    'Practice Fusion CCD export. Standard C-CDA demographics. Practice Fusion uses root OID 2.16.840.1.113883.3.3761.*.',
  fields: [
    { source: 'lastName', target: 'lastName', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'firstName', target: 'firstName', required: true, transforms: [{ fn: 'uppercase' }] },
    {
      source: 'dateOfBirth',
      target: 'dateOfBirth',
      required: true,
      transforms: [{ fn: 'date-iso8601' }],
    },
    { source: 'sex', target: 'sex', required: true, transforms: [{ fn: 'uppercase' }] },
    { source: 'ssn', target: 'ssn', required: false },
    { source: 'phone', target: 'phone', required: false },
    { source: 'email', target: 'email', required: false, transforms: [{ fn: 'lowercase' }] },
    { source: 'streetAddress', target: 'streetAddress', required: false },
    { source: 'city', target: 'city', required: false },
    { source: 'state', target: 'state', required: false, transforms: [{ fn: 'uppercase' }] },
    { source: 'zip', target: 'zip', required: false },
  ],
};

/* ------------------------------------------------------------------ */
/* Registration                                                        */
/* ------------------------------------------------------------------ */

const ALL_TEMPLATES: MappingTemplate[] = [
  // Generic CSV
  GENERIC_PATIENT,
  GENERIC_PROBLEM,
  GENERIC_MEDICATION,
  GENERIC_ALLERGY,
  GENERIC_APPOINTMENT,
  // OpenEMR CSV
  OPENEMR_PATIENT,
  OPENEMR_ALLERGY,
  // FHIR R4 Bundle
  FHIR_PATIENT,
  FHIR_ALLERGY,
  FHIR_CONDITION,
  FHIR_OBSERVATION,
  FHIR_MEDICATION_REQUEST,
  FHIR_ENCOUNTER,
  FHIR_APPOINTMENT,
  FHIR_DOCUMENT_REFERENCE,
  // Vendor C-CDA profiles
  EPIC_CCDA_PATIENT,
  EPIC_CCDA_PROBLEM,
  CERNER_CCDA_PATIENT,
  CERNER_CCDA_ALLERGY,
  ATHENA_CCDA_PATIENT,
  ECW_CCDA_PATIENT,
  PRACTICEFUSION_CCDA_PATIENT,
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
