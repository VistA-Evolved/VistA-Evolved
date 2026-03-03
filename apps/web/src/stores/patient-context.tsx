'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { API_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface PatientDemographics {
  dfn: string;
  name: string;
  dob: string;
  sex: string;
  ssn?: string;
}

export interface PatientContextValue {
  /** Currently selected patient DFN (empty = none) */
  dfn: string;
  /** Patient demographics (null until loaded) */
  demographics: PatientDemographics | null;
  /** Whether demographics are loading */
  loading: boolean;
  /** Provider DUZ (from API sign-on) */
  providerDuz: string;
  /** Current encounter location */
  locationIen: string;
  locationName: string;
  /** Select a patient by DFN — triggers demographics fetch */
  selectPatient: (dfn: string) => void;
  /** Clear patient selection */
  clearPatient: () => void;
  /** Set provider info */
  setProvider: (duz: string) => void;
  /** Set location */
  setLocation: (ien: string, name: string) => void;
}

const PatientContext = createContext<PatientContextValue | null>(null);

/* ------------------------------------------------------------------ */
/* Provider                                                            */
/* ------------------------------------------------------------------ */


export function PatientProvider({ children }: { children: ReactNode }) {
  const [dfn, setDfn] = useState('');
  const [demographics, setDemographics] = useState<PatientDemographics | null>(null);
  const [loading, setLoading] = useState(false);
  const [providerDuz, setProviderDuz] = useState('87'); // Default provider (DUZ 87)
  const [locationIen, setLocationIen] = useState('2');
  const [locationName, setLocationName] = useState('DR OFFICE');

  const selectPatient = useCallback(async (newDfn: string) => {
    setDfn(newDfn);
    setDemographics(null);
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/patient-demographics?dfn=${newDfn}`, { credentials: 'include' });
      const data = await res.json();
      if (data.ok && data.patient) {
        setDemographics(data.patient);
      }
    } catch {
      // keep null demographics
    } finally {
      setLoading(false);
    }
  }, []);

  const clearPatient = useCallback(() => {
    setDfn('');
    setDemographics(null);
  }, []);

  const setProvider = useCallback((duz: string) => setProviderDuz(duz), []);
  const setLocation = useCallback((ien: string, name: string) => {
    setLocationIen(ien);
    setLocationName(name);
  }, []);

  return (
    <PatientContext.Provider
      value={{
        dfn, demographics, loading, providerDuz,
        locationIen, locationName,
        selectPatient, clearPatient, setProvider, setLocation,
      }}
    >
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient(): PatientContextValue {
  const ctx = useContext(PatientContext);
  if (!ctx) throw new Error('usePatient must be inside <PatientProvider>');
  return ctx;
}
