/**
 * API client for chart data. All calls go to the Fastify API server.
 *
 * Phase 77: Uses correlatedGet for automatic X-Request-Id propagation.
 */

import { API_BASE } from './chart-types';
import { correlatedGet } from './fetch-with-correlation';
import type {
  PatientDemographics,
  Allergy,
  Vital,
  Note,
  Medication,
  Problem,
  Patient,
} from './chart-types';

/* ------------------------------------------------------------------ */
/* Generic fetcher (Phase 77: correlation ID propagation)              */
/* ------------------------------------------------------------------ */

async function get<T>(path: string): Promise<T> {
  return correlatedGet<T>(path);
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

export async function fetchDefaultPatientList(): Promise<Patient[]> {
  const data = await get<{ ok: boolean; results: Patient[] }>(
    '/vista/default-patient-list'
  );
  return data.results ?? [];
}

export async function fetchPatientSearch(query: string): Promise<Patient[]> {
  const data = await get<{ ok: boolean; results: Patient[] }>(
    `/vista/patient-search?q=${encodeURIComponent(query)}`
  );
  return data.results ?? [];
}

export async function fetchDemographics(dfn: string): Promise<PatientDemographics | null> {
  const data = await get<{ ok: boolean; patient?: PatientDemographics }>(
    `/vista/patient-demographics?dfn=${dfn}`
  );
  return data.patient ?? null;
}

export async function fetchAllergies(dfn: string): Promise<Allergy[]> {
  const data = await get<{ ok: boolean; results?: Allergy[] }>(
    `/vista/allergies?dfn=${dfn}`
  );
  return data.results ?? [];
}

export async function fetchVitals(dfn: string): Promise<Vital[]> {
  const data = await get<{ ok: boolean; results?: Vital[] }>(
    `/vista/vitals?dfn=${dfn}`
  );
  return data.results ?? [];
}

export async function fetchNotes(dfn: string): Promise<Note[]> {
  const data = await get<{ ok: boolean; results?: Note[] }>(
    `/vista/notes?dfn=${dfn}`
  );
  return data.results ?? [];
}

export async function fetchMedications(dfn: string): Promise<Medication[]> {
  const data = await get<{ ok: boolean; results?: Medication[] }>(
    `/vista/medications?dfn=${dfn}`
  );
  return data.results ?? [];
}

export async function fetchProblems(dfn: string): Promise<Problem[]> {
  const data = await get<{ ok: boolean; results?: Problem[] }>(
    `/vista/problems?dfn=${dfn}`
  );
  return data.results ?? [];
}
