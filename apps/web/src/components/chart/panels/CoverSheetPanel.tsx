'use client';

import { useEffect, useState } from 'react';
import {
  fetchDemographics,
  fetchAllergies,
  fetchProblems,
  fetchVitals,
  fetchMedications,
} from '@/lib/api';
import type { PatientDemographics, Allergy, Problem, Vital, Medication } from '@/lib/chart-types';
import styles from './panels.module.css';

interface CoverSheetPanelProps {
  dfn: string;
}

function Section({
  title,
  loading,
  error,
  children,
}: {
  title: string;
  loading: boolean;
  error: string | null;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.coverSection}>
      <h3>{title}</h3>
      {loading && <p className={styles.loadingText}>Loading...</p>}
      {error && <p className={styles.errorText}>{error}</p>}
      {!loading && !error && children}
    </div>
  );
}

export default function CoverSheetPanel({ dfn }: CoverSheetPanelProps) {
  const [_demo, setDemo] = useState<PatientDemographics | null>(null);
  const [_demoLoading, setDemoLoading] = useState(true);
  const [_demoError, setDemoError] = useState<string | null>(null);

  const [allergies, setAllergies] = useState<Allergy[]>([]);
  const [allergyLoading, setAllergyLoading] = useState(true);
  const [allergyError, setAllergyError] = useState<string | null>(null);

  const [problems, setProblems] = useState<Problem[]>([]);
  const [probLoading, setProbLoading] = useState(true);
  const [probError, setProbError] = useState<string | null>(null);

  const [vitals, setVitals] = useState<Vital[]>([]);
  const [vitalLoading, setVitalLoading] = useState(true);
  const [vitalError, setVitalError] = useState<string | null>(null);

  const [meds, setMeds] = useState<Medication[]>([]);
  const [medLoading, setMedLoading] = useState(true);
  const [medError, setMedError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetchDemographics(dfn)
      .then((d) => {
        if (!cancelled) {
          setDemo(d);
          setDemoLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setDemoError(e.message);
          setDemoLoading(false);
        }
      });

    fetchAllergies(dfn)
      .then((a) => {
        if (!cancelled) {
          setAllergies(a);
          setAllergyLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setAllergyError(e.message);
          setAllergyLoading(false);
        }
      });

    fetchProblems(dfn)
      .then((p) => {
        if (!cancelled) {
          setProblems(p);
          setProbLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setProbError(e.message);
          setProbLoading(false);
        }
      });

    fetchVitals(dfn)
      .then((v) => {
        if (!cancelled) {
          setVitals(v);
          setVitalLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setVitalError(e.message);
          setVitalLoading(false);
        }
      });

    fetchMedications(dfn)
      .then((m) => {
        if (!cancelled) {
          setMeds(m);
          setMedLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setMedError(e.message);
          setMedLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [dfn]);

  return (
    <div className={styles.coverGrid}>
      {/* Top-left: Active Problems */}
      <Section title="Active Problems" loading={probLoading} error={probError}>
        {problems.length === 0 ? (
          <p className={styles.emptyText}>No active problems</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Problem</th>
                <th>Status</th>
                <th>Onset</th>
              </tr>
            </thead>
            <tbody>
              {problems.map((p) => (
                <tr key={p.id}>
                  <td>{p.text}</td>
                  <td>{p.status}</td>
                  <td>{p.onset || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Top-right: Allergies */}
      <Section title="Allergies / Adverse Reactions" loading={allergyLoading} error={allergyError}>
        {allergies.length === 0 ? (
          <p className={styles.emptyText}>No known allergies</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Allergen</th>
                <th>Severity</th>
                <th>Reactions</th>
              </tr>
            </thead>
            <tbody>
              {allergies.map((a) => (
                <tr key={a.id}>
                  <td>{a.allergen}</td>
                  <td>{a.severity}</td>
                  <td>{a.reactions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Bottom-left: Medications */}
      <Section title="Active Medications" loading={medLoading} error={medError}>
        {meds.length === 0 ? (
          <p className={styles.emptyText}>No active medications</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Medication</th>
                <th>Sig</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {meds.map((m) => (
                <tr key={m.id}>
                  <td>{m.name}</td>
                  <td>{m.sig}</td>
                  <td>{m.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Bottom-right: Vitals */}
      <Section title="Vitals / Measurements" loading={vitalLoading} error={vitalError}>
        {vitals.length === 0 ? (
          <p className={styles.emptyText}>No recent vitals</p>
        ) : (
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Type</th>
                <th>Value</th>
                <th>Taken</th>
              </tr>
            </thead>
            <tbody>
              {vitals.map((v, i) => (
                <tr key={i}>
                  <td>{v.type}</td>
                  <td>{v.value}</td>
                  <td>{v.takenAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}
