'use client';

import { use, useEffect, useRef } from 'react';
import { notFound, useRouter } from 'next/navigation';
import { usePatient } from '@/stores/patient-context';
import { useSession } from '@/stores/session-context';
import { useDataCache } from '@/stores/data-cache';
import { useCPRSUI } from '@/stores/cprs-ui-state';
import { useTenant } from '@/stores/tenant-context';
import { getTabIdMap } from '@/lib/contracts/loader';
import CPRSMenuBar from '@/components/cprs/CPRSMenuBar';
import PatientBanner from '@/components/cprs/PatientBanner';
import CPRSTabStrip from '@/components/cprs/CPRSTabStrip';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import type { ClinicalData } from '@/stores/data-cache';
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
  ImmunizationsPanel,
  IntakePanel,
  TelehealthPanel,
  MessagingTasksPanel,
  AIAssistPanel,
  ADTPanel,
  NursingPanel,
  VitalsPanel,
  AllergiesPanel,
  MedReconciliationPanel,
  EPrescribingPanel,
  EncountersPanel,
} from '@/components/cprs/panels';
import ActionInspector from '@/components/cprs/ActionInspector';
import styles from '@/components/cprs/cprs.module.css';

interface ChartPageProps {
  params: Promise<{ dfn: string; tab: string }>;
}

/* Map tab slugs -> components */
const TAB_LOCATION_MAP: Record<string, string> = {
  cover: 'CoverSheet',
  problems: 'Problems',
  meds: 'Meds',
  orders: 'Orders',
  notes: 'Notes',
  consults: 'Consults',
  surgery: 'Surgery',
  dcsumm: 'DCSumm',
  labs: 'Labs',
  reports: 'Reports',
  imaging: 'Imaging',
  immunizations: 'Immunizations',
  intake: 'Intake',
  telehealth: 'Telehealth',
  tasks: 'Tasks',
  aiassist: 'AIAssist',
  adt: 'ADT',
  nursing: 'Nursing',
  vitals: 'Vitals',
  allergies: 'Allergies',
  medrec: 'MedRec',
  erx: 'ePrescribing',
  encounters: 'Encounters',
};

const TAB_DOMAIN_PREFETCH: Partial<Record<string, keyof ClinicalData>> = {
  problems: 'problems',
  meds: 'medications',
  notes: 'notes',
  consults: 'consults',
  surgery: 'surgery',
  dcsumm: 'dcSummaries',
  labs: 'labs',
  vitals: 'vitals',
  allergies: 'allergies',
};

const TAB_ALIASES: Record<string, string> = {
  'cover-sheet': 'cover',
  'dc-summaries': 'dcsumm',
  'dc-summ': 'dcsumm',
  'ai-assist': 'aiassist',
  'tele-health': 'telehealth',
  'med-rec': 'medrec',
  'med-reconciliation': 'medrec',
  'e-prescribing': 'erx',
  'eprescribing': 'erx',
};

function normalizeTabSlug(tab: string): string {
  return TAB_ALIASES[tab] ?? tab;
}

function TabContent({ dfn, tab }: { dfn: string; tab: string }) {
  switch (tab) {
    case 'cover':
      return <CoverSheetPanel dfn={dfn} />;
    case 'problems':
      return <ProblemsPanel dfn={dfn} />;
    case 'meds':
      return <MedsPanel dfn={dfn} />;
    case 'orders':
      return <OrdersPanel dfn={dfn} />;
    case 'notes':
      return <NotesPanel dfn={dfn} />;
    case 'consults':
      return <ConsultsPanel dfn={dfn} />;
    case 'surgery':
      return <SurgeryPanel dfn={dfn} />;
    case 'dcsumm':
      return <DCSummPanel dfn={dfn} />;
    case 'labs':
      return <LabsPanel dfn={dfn} />;
    case 'reports':
      return <ReportsPanel dfn={dfn} />;
    case 'imaging':
      return <ImagingPanel dfn={dfn} />;
    case 'immunizations':
      return <ImmunizationsPanel dfn={dfn} />;
    case 'intake':
      return <IntakePanel dfn={dfn} />;
    case 'telehealth':
      return <TelehealthPanel dfn={dfn} />;
    case 'tasks':
      return <MessagingTasksPanel dfn={dfn} />;
    case 'aiassist':
      return <AIAssistPanel dfn={dfn} />;
    case 'adt':
      return <ADTPanel dfn={dfn} />;
    case 'nursing':
      return <NursingPanel dfn={dfn} />;
    case 'vitals':
      return <VitalsPanel dfn={dfn} />;
    case 'allergies':
      return <AllergiesPanel dfn={dfn} />;
    case 'medrec':
      return <MedReconciliationPanel dfn={dfn} />;
    case 'erx':
      return <EPrescribingPanel dfn={dfn} />;
    case 'encounters':
      return <EncountersPanel dfn={dfn} />;
    default:
      return (
        <div style={{ padding: 24 }}>
          <h3>Tab: {tab}</h3>
          <p className={styles.emptyText}>This tab is not yet implemented.</p>
        </div>
      );
  }
}

const VALID_TABS = new Set([
  'cover',
  'problems',
  'meds',
  'orders',
  'notes',
  'consults',
  'surgery',
  'dcsumm',
  'labs',
  'reports',
  'imaging',
  'immunizations',
  'intake',
  'telehealth',
  'tasks',
  'aiassist',
  'adt',
  'nursing',
  'vitals',
  'allergies',
  'medrec',
  'erx',
  'encounters',
]);

export default function CPRSChartPage({ params }: ChartPageProps) {
  const { dfn, tab } = use(params);
  const canonicalTab = normalizeTabSlug(tab);
  const router = useRouter();
  const { dfn: currentDfn, demographics, loading: patientLoading, selectPatient } = usePatient();
  const { ready: sessionReady, authenticated } = useSession();
  const { fetchDomain } = useDataCache();
  const { preferences } = useCPRSUI();
  const { isModuleEnabled } = useTenant();
  const patientRecoveryAttemptedRef = useRef('');

  // Validate tab
  if (!VALID_TABS.has(canonicalTab)) {
    // Also check contract tab map
    const tabMap = getTabIdMap();
    if (!tabMap[canonicalTab]) {
      notFound();
    }
  }

  useEffect(() => {
    if (sessionReady && !authenticated) {
      const redirect = encodeURIComponent(`/cprs/chart/${dfn}/${canonicalTab}`);
      router.replace(`/cprs/login?redirect=${redirect}`);
    }
  }, [authenticated, canonicalTab, dfn, router, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !authenticated) return;
    if (canonicalTab !== tab) {
      router.replace(`/cprs/chart/${dfn}/${canonicalTab}`);
    }
  }, [authenticated, canonicalTab, dfn, router, sessionReady, tab]);

  useEffect(() => {
    patientRecoveryAttemptedRef.current = '';
  }, [dfn, canonicalTab]);

  // Auto-select patient if not already loaded
  useEffect(() => {
    if (!sessionReady || !authenticated) return;
    if (dfn && currentDfn !== dfn) {
      patientRecoveryAttemptedRef.current = dfn;
      selectPatient(dfn);
      return;
    }

    if (
      dfn &&
      currentDfn === dfn &&
      !demographics &&
      !patientLoading &&
      patientRecoveryAttemptedRef.current !== dfn
    ) {
      patientRecoveryAttemptedRef.current = dfn;
      selectPatient(dfn);
    }
  }, [authenticated, currentDfn, demographics, dfn, patientLoading, selectPatient, sessionReady]);

  // Pre-fetch only the active domain; panels own their deeper fetch lifecycle.
  useEffect(() => {
    const domain = TAB_DOMAIN_PREFETCH[canonicalTab];
    if (!domain) return;
    if (sessionReady && authenticated && dfn && currentDfn === dfn && demographics) {
      void fetchDomain(dfn, domain);
    }
  }, [authenticated, canonicalTab, currentDfn, demographics, dfn, fetchDomain, sessionReady]);

  const densityClass =
    preferences.density === 'compact' || preferences.density === 'dense' ? styles.compact : '';
  const isModern = preferences.layoutMode === 'modern';

  if (!sessionReady || !authenticated) {
    return (
      <div
        className={`${styles.shell} ${densityClass}`}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}
      >
        <p style={{ color: 'var(--cprs-text-muted)' }}>Checking session...</p>
      </div>
    );
  }

  return (
    <div className={`${styles.shell} ${densityClass}`}>
      <CPRSMenuBar />
      <PatientBanner />
      {!isModern && <CPRSTabStrip dfn={dfn} activeTab={canonicalTab} />}
      <div
        style={
          isModern ? { display: 'flex', flex: 1, overflow: 'hidden' } : { display: 'contents' }
        }
      >
        {isModern && (
          <nav
            style={{
              width: 180,
              borderRight: '1px solid var(--cprs-border)',
              padding: '8px 0',
              overflowY: 'auto',
              background: 'var(--cprs-surface)',
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {[
              'cover',
              'problems',
              'meds',
              'orders',
              'notes',
              'consults',
              'surgery',
              'dcsumm',
              'labs',
              'reports',
              'imaging',
              'immunizations',
              'adt',
              'nursing',
              'intake',
              'telehealth',
              'tasks',
              'aiassist',
              'medrec',
              'erx',
              'encounters',
            ]
              .filter((t) => isModuleEnabled(t))
              .map((t) => {
                const label =
                  (
                    {
                      cover: 'Cover Sheet',
                      dcsumm: 'DC Summaries',
                      adt: 'ADT',
                      aiassist: 'AI Assist',
                      medrec: 'Med Rec',
                      erx: 'e-Prescribing',
                      encounters: 'Encounters',
                    } as Record<string, string>
                  )[t] ?? t.charAt(0).toUpperCase() + t.slice(1);
                return (
                  <a
                    key={t}
                    href={`/cprs/chart/${dfn}/${t}`}
                    style={{
                      display: 'block',
                      padding: '6px 16px',
                      fontSize: 12,
                      textDecoration: 'none',
                      color: t === canonicalTab ? 'var(--cprs-text)' : 'var(--cprs-text-muted)',
                      background: t === canonicalTab ? 'var(--cprs-selected)' : 'transparent',
                      fontWeight: t === canonicalTab ? 600 : 400,
                      borderLeft:
                        t === canonicalTab
                          ? '3px solid var(--cprs-accent, #2563eb)'
                          : '3px solid transparent',
                    }}
                  >
                    {label}
                  </a>
                );
              })}
          </nav>
        )}
        <main
          className={styles.content}
          style={{ flex: 1, overflow: 'auto', padding: isModern ? 16 : 8 }}
        >
          <ErrorBoundary name={`Tab: ${canonicalTab}`}>
            {!isModuleEnabled(canonicalTab) ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--cprs-text-muted)' }}>
                <h3 style={{ fontSize: 16, margin: '0 0 8px' }}>Module Disabled</h3>
                <p style={{ fontSize: 13 }}>
                  This module has been disabled by your facility administrator.
                </p>
              </div>
            ) : (
              <TabContent dfn={dfn} tab={canonicalTab} />
            )}
          </ErrorBoundary>
        </main>
      </div>
      <ActionInspector location={TAB_LOCATION_MAP[canonicalTab]} />
    </div>
  );
}
