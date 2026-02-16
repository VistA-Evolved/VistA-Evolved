'use client';

import { usePatient } from '@/stores/patient-context';
import styles from './cprs.module.css';

export default function PatientBanner() {
  const { dfn, demographics, loading } = usePatient();

  if (!dfn) {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerEmpty}>No patient selected — use File → Select Patient</span>
      </div>
    );
  }

  if (loading || !demographics) {
    return (
      <div className={styles.banner}>
        <span className={styles.bannerLoading}>Loading patient {dfn}...</span>
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
