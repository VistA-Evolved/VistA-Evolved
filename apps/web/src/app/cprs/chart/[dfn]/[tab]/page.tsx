'use client';

import { use, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { usePatient } from '@/stores/patient-context';
import { useDataCache } from '@/stores/data-cache';
import { useCPRSUI } from '@/stores/cprs-ui-state';
import { useTenant } from '@/stores/tenant-context';
import { getTabIdMap } from '@/lib/contracts/loader';
import CPRSMenuBar from '@/components/cprs/CPRSMenuBar';
import PatientBanner from '@/components/cprs/PatientBanner';
import CPRSTabStrip from '@/components/cprs/CPRSTabStrip';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import {
  CoverSheetPanel,
  ProblemsPanel,
  MedsPanel,
  OrdersPanel,
  NotesPanel,
  ConsultsPanel,
  SurgeryPanel,
  DCSummPanel,
  LabsPanel,
  ReportsPanel,
  ImagingPanel,
  IntakePanel,
  TelehealthPanel,
  MessagingTasksPanel,
} from '@/components/cprs/panels';
import styles from '@/components/cprs/cprs.module.css';

interface ChartPageProps {
  params: Promise<{ dfn: string; tab: string }>;
}

/* Map tab slugs → components */
function TabContent({ dfn, tab }: { dfn: string; tab: string }) {
  switch (tab) {
    case 'cover':      return <CoverSheetPanel dfn={dfn} />;
    case 'problems':   return <ProblemsPanel   dfn={dfn} />;
    case 'meds':       return <MedsPanel       dfn={dfn} />;
    case 'orders':     return <OrdersPanel     dfn={dfn} />;
    case 'notes':      return <NotesPanel      dfn={dfn} />;
    case 'consults':   return <ConsultsPanel   dfn={dfn} />;
    case 'surgery':    return <SurgeryPanel    dfn={dfn} />;
    case 'dcsumm':     return <DCSummPanel     dfn={dfn} />;
    case 'labs':       return <LabsPanel       dfn={dfn} />;
    case 'reports':    return <ReportsPanel    dfn={dfn} />;
    case 'imaging':    return <ImagingPanel    dfn={dfn} />;
    case 'intake':     return <IntakePanel     dfn={dfn} />;
    case 'telehealth': return <TelehealthPanel dfn={dfn} />;
    case 'tasks':      return <MessagingTasksPanel dfn={dfn} />;
    default:
      return (
        <div style={{ padding: 24 }}>
          <h3>Tab: {tab}</h3>
          <p className={styles.emptyText}>This tab is not yet implemented.</p>
        </div>
      );
  }
}

const VALID_TABS = new Set(['cover', 'problems', 'meds', 'orders', 'notes', 'consults', 'surgery', 'dcsumm', 'labs', 'reports', 'imaging', 'intake', 'telehealth', 'tasks']);

export default function CPRSChartPage({ params }: ChartPageProps) {
  const { dfn, tab } = use(params);
  const { dfn: currentDfn, selectPatient } = usePatient();
  const { fetchAll } = useDataCache();
  const { preferences } = useCPRSUI();
  const { isModuleEnabled } = useTenant();

  // Validate tab
  if (!VALID_TABS.has(tab)) {
    // Also check contract tab map
    const tabMap = getTabIdMap();
    if (!tabMap[tab]) {
      notFound();
    }
  }

  // Auto-select patient if not already loaded
  useEffect(() => {
    if (dfn && currentDfn !== dfn) {
      selectPatient(dfn);
    }
  }, [dfn, currentDfn, selectPatient]);

  // Pre-fetch all clinical data for this patient
  useEffect(() => {
    if (dfn) {
      fetchAll(dfn);
    }
  }, [dfn, fetchAll]);

  const densityClass = preferences.density === 'compact' || preferences.density === 'dense' ? styles.compact : '';
  const isModern = preferences.layoutMode === 'modern';

  return (
    <div className={`${styles.shell} ${densityClass}`}>
      <CPRSMenuBar />
      <PatientBanner />
      {!isModern && <CPRSTabStrip dfn={dfn} activeTab={tab} />}
      <div style={isModern ? { display: 'flex', flex: 1, overflow: 'hidden' } : { display: 'contents' }}>
        {isModern && (
          <nav style={{
            width: 180,
            borderRight: '1px solid var(--cprs-border)',
            padding: '8px 0',
            overflowY: 'auto',
            background: 'var(--cprs-surface)',
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}>
            {['cover', 'problems', 'meds', 'orders', 'notes', 'consults', 'surgery', 'dcsumm', 'labs', 'reports', 'imaging']
              .filter((t) => isModuleEnabled(t))
              .map((t) => (
              <a
                key={t}
                href={`/cprs/chart/${dfn}/${t}`}
                style={{
                  display: 'block',
                  padding: '6px 16px',
                  fontSize: 12,
                  textDecoration: 'none',
                  color: t === tab ? 'var(--cprs-text)' : 'var(--cprs-text-muted)',
                  background: t === tab ? 'var(--cprs-selected)' : 'transparent',
                  fontWeight: t === tab ? 600 : 400,
                  borderLeft: t === tab ? '3px solid var(--cprs-accent, #2563eb)' : '3px solid transparent',
                }}
              >
                {t === 'cover' ? 'Cover Sheet' : t === 'dcsumm' ? 'DC Summaries' : t.charAt(0).toUpperCase() + t.slice(1)}
              </a>
            ))}
          </nav>
        )}
        <main className={styles.content} style={{ flex: 1, overflow: 'auto', padding: isModern ? 16 : 8 }}>
          <ErrorBoundary name={`Tab: ${tab}`}>
            {!isModuleEnabled(tab) ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--cprs-text-muted)' }}>
                <h3 style={{ fontSize: 16, margin: '0 0 8px' }}>Module Disabled</h3>
                <p style={{ fontSize: 13 }}>
                  This module has been disabled by your facility administrator.
                </p>
              </div>
            ) : (
              <TabContent dfn={dfn} tab={tab} />
            )}
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
