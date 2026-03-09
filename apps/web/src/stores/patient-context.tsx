'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, type ReactNode } from 'react';
import { API_BASE } from '@/lib/api-config';
import type { PatientDemographics } from '@vista-evolved/shared-types';

/* ------------------------------------------------------------------ */
/* Types — PatientDemographics now imported from shared-types          */
/* ------------------------------------------------------------------ */

export type { PatientDemographics };

export interface PatientContextValue {
  /** Currently selected patient DFN (empty = none) */
  dfn: string;
  /** Patient demographics (null until loaded) */
  demographics: PatientDemographics | null;
  /** Whether demographics are loading */
  loading: boolean;
  /** Last demographics load error, if any */
  error: string | null;
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
  const [error, setError] = useState<string | null>(null);
  const retryCount = useRef(0);
  const [providerDuz, setProviderDuz] = useState('87'); // Default provider (DUZ 87)
  const [locationIen, setLocationIen] = useState('2');
  const [locationName, setLocationName] = useState('DR OFFICE');

  const loadPatient = useCallback(async (patientDfn: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/vista/patient-demographics?dfn=${patientDfn}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok && data.patient) {
        setDemographics(data.patient);
        setError(null);
      } else {
        setDemographics(null);
        setError(data.error || 'Unable to load patient demographics.');
      }
    } catch {
      setDemographics(null);
      setError('Unable to load patient demographics.');
    } finally {
      setLoading(false);
    }
  }, []);

  const selectPatient = useCallback((newDfn: string) => {
    retryCount.current = 0;
    setDfn(newDfn);
    setDemographics(null);
    setError(null);
    void loadPatient(newDfn);
  }, [loadPatient]);

  useEffect(() => {
    if (!dfn || demographics || loading || retryCount.current >= 2) return;

    retryCount.current += 1;
    const retryTimer = window.setTimeout(() => {
      void loadPatient(dfn);
    }, 1000);

    return () => window.clearTimeout(retryTimer);
  }, [demographics, dfn, loadPatient, loading]);

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
        dfn,
        demographics,
        loading,
        error,
        providerDuz,
        locationIen,
        locationName,
        selectPatient,
        clearPatient,
        setProvider,
        setLocation,
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
