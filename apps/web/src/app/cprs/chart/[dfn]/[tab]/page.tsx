'use client';

import { use, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { usePatient } from '@/stores/patient-context';
import { useDataCache } from '@/stores/data-cache';
import { useCPRSUI } from '@/stores/cprs-ui-state';
import { getTabIdMap } from '@/lib/contracts/loader';
import CPRSMenuBar from '@/components/cprs/CPRSMenuBar';
import PatientBanner from '@/components/cprs/PatientBanner';
import CPRSTabStrip from '@/components/cprs/CPRSTabStrip';
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
    default:
      return (
        <div style={{ padding: 24 }}>
          <h3>Tab: {tab}</h3>
          <p className={styles.emptyText}>This tab is not yet implemented.</p>
        </div>
      );
  }
}

const VALID_TABS = new Set(['cover', 'problems', 'meds', 'orders', 'notes', 'consults', 'surgery', 'dcsumm', 'labs', 'reports']);

export default function CPRSChartPage({ params }: ChartPageProps) {
  const { dfn, tab } = use(params);
  const { dfn: currentDfn, selectPatient } = usePatient();
  const { fetchAll } = useDataCache();
  const { preferences } = useCPRSUI();

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

  const densityClass = preferences.density === 'compact' ? styles.compact : '';

  return (
    <div className={`${styles.shell} ${densityClass}`}>
      <CPRSMenuBar />
      <PatientBanner />
      <CPRSTabStrip dfn={dfn} activeTab={tab} />
      <main className={styles.content} style={{ flex: 1, overflow: 'auto', padding: 8 }}>
        <TabContent dfn={dfn} tab={tab} />
      </main>
    </div>
  );
}
