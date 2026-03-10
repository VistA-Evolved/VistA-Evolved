/**
 * Clinical types barrel -- re-exports all canonical clinical types.
 */

export type {
  Patient,
  PatientSummary,
  PatientCreateRequest,
  PatientUpdateRequest,
  PatientDemographics,
  PatientRecord,
  PatientSearchResult,
} from './patient.js';

export type { Allergy, AllergyRecord } from './allergy.js';
export type { Vital, VitalRecord } from './vital.js';
export type { Note, NoteRecord } from './note.js';
export type { Medication, MedicationRecord } from './medication.js';
export type { Problem, ProblemRecord } from './problem.js';
