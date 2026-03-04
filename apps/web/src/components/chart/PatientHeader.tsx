'use client';

import { useEffect, useState } from 'react';
import { fetchDemographics } from '@/lib/api';
import type { PatientDemographics } from '@/lib/chart-types';
import styles from './PatientHeader.module.css';

interface PatientHeaderProps {
  dfn: string;
}

export default function PatientHeader({ dfn }: PatientHeaderProps) {
  const [patient, setPatient] = useState<PatientDemographics | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchDemographics(dfn)
      .then((p) => {
        if (!cancelled) setPatient(p);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [dfn]);

  if (error) {
    return (
      <div className={styles.header}>
        <span className={styles.error}>
          Patient {dfn} — Error: {error}
        </span>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className={styles.header}>
        <span className={styles.loading}>Loading patient {dfn}...</span>
      </div>
    );
  }

  return (
    <div className={styles.header}>
      <span className={styles.name}>{patient.name}</span>
      <span className={styles.detail}>DOB: {patient.dob}</span>
      <span className={styles.detail}>Sex: {patient.sex}</span>
      <span className={styles.detail}>DFN: {patient.dfn}</span>
    </div>
  );
}
