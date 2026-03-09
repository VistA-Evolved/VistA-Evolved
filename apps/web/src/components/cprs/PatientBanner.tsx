'use client';

import { usePatient } from '@/stores/patient-context';
import styles from './cprs.module.css';

export default function PatientBanner() {
  const { dfn, demographics, loading, error } = usePatient();

  if (!dfn) {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerEmpty}>No patient selected — use File → Select Patient</span>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerLoading}>Loading patient {dfn}...</span>
      </div>
    );
  }

  if (!demographics) {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerLoading}>{error || `Patient ${dfn} is unavailable.`}</span>
      </div>
    );
  }

  const { name, dob, sex } = demographics;

  return (
    <div className={styles.banner}>
      <span className={styles.bannerName}>{name}</span>
      <span className={styles.bannerDetail}>DOB: {dob}</span>
      <span className={styles.bannerDetail}>Sex: {sex}</span>
      <span className={styles.bannerDetail}>DFN: {dfn}</span>
    </div>
  );
}
