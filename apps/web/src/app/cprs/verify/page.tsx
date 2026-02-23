'use client';

import { useState, useEffect, useCallback } from 'react';
import styles from '@/components/cprs/cprs.module.css';

/** Fetch helper that always sends session cookie */
function apiFetch(url: string, init?: RequestInit): Promise<Response> {
  return fetch(url, { credentials: 'include', ...init });
}

interface Check {
  id: string;
  label: string;
  status: 'pending' | 'pass' | 'fail' | 'warn';
  detail: string;
}

const CHECKS: { id: string; label: string; fn: () => Promise<{ ok: boolean; detail: string }> }[] = [
  {
    id: 'api-health',
    label: 'API /health responds',
    fn: async () => {
      const r = await apiFetch(`/health`);
      const d = await r.json();
      return { ok: d.status === 'ok', detail: JSON.stringify(d) };
    },
  },
  {
    id: 'vista-ping',
    label: 'VistA ping (TCP)',
    fn: async () => {
      const r = await apiFetch(`/vista/ping`);
      const d = await r.json();
      return { ok: d.ok === true, detail: JSON.stringify(d) };
    },
  },
  {
    id: 'patient-search',
    label: 'Patient search RPC',
    fn: async () => {
      const r = await apiFetch(`/vista/patient-search?q=CARTER`);
      const d = await r.json();
      return { ok: d.ok === true && Array.isArray(d.results), detail: `${d.results?.length ?? 0} result(s)` };
    },
  },
  {
    id: 'demographics',
    label: 'Patient demographics RPC',
    fn: async () => {
      const r = await apiFetch(`/vista/patient-demographics?dfn=1`);
      const d = await r.json();
      return { ok: d.ok === true, detail: d.name ?? 'N/A' };
    },
  },
  {
    id: 'allergies',
    label: 'Allergies endpoint',
    fn: async () => {
      const r = await apiFetch(`/vista/allergies?dfn=1`);
      const d = await r.json();
      return { ok: d.ok === true, detail: `${d.allergies?.length ?? 0} allergy(s)` };
    },
  },
  {
    id: 'vitals',
    label: 'Vitals endpoint',
    fn: async () => {
      const r = await apiFetch(`/vista/vitals?dfn=1`);
      const d = await r.json();
      return { ok: d.ok === true, detail: `${d.vitals?.length ?? 0} vital(s)` };
    },
  },
  {
    id: 'notes',
    label: 'Notes endpoint',
    fn: async () => {
      const r = await apiFetch(`/vista/notes?dfn=1`);
      const d = await r.json();
      return { ok: d.ok === true, detail: `${d.notes?.length ?? 0} note(s)` };
    },
  },
  {
    id: 'medications',
    label: 'Medications endpoint',
    fn: async () => {
      const r = await apiFetch(`/vista/medications?dfn=1`);
      const d = await r.json();
      return { ok: d.ok === true, detail: `${d.medications?.length ?? 0} med(s)` };
    },
  },
  {
    id: 'problems',
    label: 'Problems endpoint',
    fn: async () => {
      const r = await apiFetch(`/vista/problems?dfn=1`);
      const d = await r.json();
      return { ok: d.ok === true, detail: `${d.problems?.length ?? 0} problem(s)` };
    },
  },
  // --- Phase 12 endpoints ---
  {
    id: 'icd-search',
    label: 'ICD lexicon search (Phase 12)',
    fn: async () => {
      const r = await apiFetch(`/vista/icd-search?q=diabetes`);
      const d = await r.json();
      return { ok: d.ok === true && Array.isArray(d.results), detail: `${d.results?.length ?? 0} result(s)` };
    },
  },
  {
    id: 'consults',
    label: 'Consults endpoint (Phase 12)',
    fn: async () => {
      const r = await apiFetch(`/vista/consults?dfn=1`);
      const d = await r.json();
      return { ok: d.ok === true, detail: `${d.results?.length ?? 0} consult(s)` };
    },
  },
  {
    id: 'surgery',
    label: 'Surgery endpoint (Phase 12)',
    fn: async () => {
      const r = await apiFetch(`/vista/surgery?dfn=1`);
      const d = await r.json();
      return { ok: d.ok === true, detail: `${d.results?.length ?? 0} case(s)` };
    },
  },
  {
    id: 'dc-summaries',
    label: 'D/C Summaries endpoint (Phase 12)',
    fn: async () => {
      const r = await apiFetch(`/vista/dc-summaries?dfn=1`);
      const d = await r.json();
      return { ok: d.ok === true, detail: `${d.results?.length ?? 0} summary(s)` };
    },
  },
  {
    id: 'labs',
    label: 'Labs endpoint (Phase 12)',
    fn: async () => {
      const r = await apiFetch(`/vista/labs?dfn=1`);
      const d = await r.json();
      return { ok: d.ok === true, detail: `${d.results?.length ?? 0} result(s)` };
    },
  },
  {
    id: 'reports',
    label: 'Reports catalog (Phase 12)',
    fn: async () => {
      const r = await apiFetch(`/vista/reports`);
      const d = await r.json();
      return { ok: d.ok === true && Array.isArray(d.reports), detail: `${d.reports?.length ?? 0} report type(s)` };
    },
  },
  // --- End Phase 12 endpoints ---
  {
    id: 'contract-tabs',
    label: 'Contract tabs.json loaded',
    fn: async () => {
      // Dynamic import to verify contract loader works
      const { getChartTabs } = await import('@/lib/contracts/loader');
      const tabs = getChartTabs();
      return { ok: tabs.length >= 10, detail: `${tabs.length} tabs loaded` };
    },
  },
  {
    id: 'contract-menus',
    label: 'Contract menus.json loaded',
    fn: async () => {
      const { getFrameMenu } = await import('@/lib/contracts/loader');
      const menus = getFrameMenu();
      return { ok: menus.length > 0, detail: `${menus.length} top-level menu items` };
    },
  },
  {
    id: 'route-login',
    label: '/cprs/login route',
    fn: async () => {
      const r = await fetch('/cprs/login', { redirect: 'manual' });
      return { ok: r.status < 400, detail: `HTTP ${r.status}` };
    },
  },
  {
    id: 'route-patient-search',
    label: '/cprs/patient-search route',
    fn: async () => {
      const r = await fetch('/cprs/patient-search', { redirect: 'manual' });
      return { ok: r.status < 400, detail: `HTTP ${r.status}` };
    },
  },
  {
    id: 'route-chart',
    label: '/cprs/chart/100/cover route',
    fn: async () => {
      const r = await fetch('/cprs/chart/100/cover', { redirect: 'manual' });
      return { ok: r.status < 400, detail: `HTTP ${r.status}` };
    },
  },
  {
    id: 'route-preferences',
    label: '/cprs/settings/preferences route',
    fn: async () => {
      const r = await fetch('/cprs/settings/preferences', { redirect: 'manual' });
      return { ok: r.status < 400, detail: `HTTP ${r.status}` };
    },
  },
];

export default function CPRSVerifyPage() {
  const [checks, setChecks] = useState<Check[]>(
    CHECKS.map((c) => ({ id: c.id, label: c.label, status: 'pending', detail: '' }))
  );
  const [running, setRunning] = useState(false);

  const runChecks = useCallback(async () => {
    setRunning(true);
    const updated: Check[] = CHECKS.map((c) => ({ id: c.id, label: c.label, status: 'pending' as const, detail: '' }));
    setChecks([...updated]);

    for (let i = 0; i < CHECKS.length; i++) {
      try {
        const result = await CHECKS[i].fn();
        updated[i] = { ...updated[i], status: result.ok ? 'pass' : 'fail', detail: result.detail };
      } catch (err: unknown) {
        updated[i] = { ...updated[i], status: 'fail', detail: err instanceof Error ? err.message : String(err) };
      }
      setChecks([...updated]);
    }
    setRunning(false);
  }, []);

  useEffect(() => {
    runChecks();
  }, [runChecks]);

  const passed = checks.filter((c) => c.status === 'pass').length;
  const failed = checks.filter((c) => c.status === 'fail').length;
  const total = checks.length;

  return (
    <div className={styles.shell} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className={styles.menuBar}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>EHR &mdash; Evolved</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--cprs-text-muted)' }}>Phase 12 Verification</span>
      </div>

      <div style={{ flex: 1, padding: 24, maxWidth: 700, margin: '0 auto', width: '100%' }}>
        <h2 style={{ fontSize: 18, margin: '0 0 4px' }}>CPRS Web Replica â€” Verification</h2>
        <p style={{ fontSize: 12, color: 'var(--cprs-text-muted)', margin: '0 0 16px' }}>
          {running ? 'Running checks...' : `${passed}/${total} passed, ${failed} failed`}
        </p>

        <table className={styles.dataTable}>
          <thead>
            <tr><th style={{ width: 40 }}>#</th><th>Check</th><th style={{ width: 60 }}>Status</th><th>Detail</th></tr>
          </thead>
          <tbody>
            {checks.map((c, i) => (
              <tr key={c.id}>
                <td>{i + 1}</td>
                <td>{c.label}</td>
                <td>
                  {c.status === 'pass' && <span className={`${styles.badge} ${styles.active}`}>PASS</span>}
                  {c.status === 'fail' && <span className={`${styles.badge} ${styles.inactive}`}>FAIL</span>}
                  {c.status === 'pending' && <span className={`${styles.badge} ${styles.draft}`}>...</span>}
                  {c.status === 'warn' && <span className={`${styles.badge} ${styles.unsigned}`}>WARN</span>}
                </td>
                <td style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>{c.detail}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div style={{ marginTop: 16, display: 'flex', gap: 8 }}>
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={runChecks} disabled={running}>
            {running ? 'Running...' : 'Re-run All Checks'}
          </button>
          <button className={styles.btn} onClick={() => window.history.back()}>Back</button>
        </div>
      </div>
    </div>
  );
}
