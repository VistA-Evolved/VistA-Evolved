/**
 * @vista-evolved/shared-types -- root barrel.
 *
 * Re-exports all canonical types for the VistA-Evolved monorepo.
 * Import via:
 *   import type { Patient, Allergy } from '@vista-evolved/shared-types';
 *   import type { Patient } from '@vista-evolved/shared-types/clinical';
 *   import type { UserRole } from '@vista-evolved/shared-types';
 */

export type {
  Patient,
  PatientSummary,
  PatientCreateRequest,
  PatientUpdateRequest,
  PatientDemographics,
  PatientRecord,
  PatientSearchResult,
  Allergy,
  AllergyRecord,
  Vital,
  VitalRecord,
  Note,
  NoteRecord,
  Medication,
  MedicationRecord,
  Problem,
  ProblemRecord,
} from './clinical/index.js';

export type { UserRole } from './auth/index.js';
