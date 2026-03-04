'use client';

import { use } from 'react';
import { notFound } from 'next/navigation';
import { tabBySlug } from '@/lib/chart-types';
import MenuBar from '@/components/chart/MenuBar';
import PatientHeader from '@/components/chart/PatientHeader';
import TabStrip from '@/components/chart/TabStrip';
import {
  CoverSheetPanel,
  ProblemsPanel,
  MedsPanel,
  NotesPanel,
  PlaceholderPanel,
} from '@/components/chart/panels';
import styles from './page.module.css';

interface ChartPageProps {
  params: Promise<{ dfn: string; tab: string }>;
}

function TabContent({ dfn, tab }: { dfn: string; tab: string }) {
  switch (tab) {
    case 'cover':
      return <CoverSheetPanel dfn={dfn} />;
    case 'problems':
      return <ProblemsPanel dfn={dfn} />;
    case 'meds':
      return <MedsPanel dfn={dfn} />;
    case 'notes':
      return <NotesPanel dfn={dfn} />;
    default: {
      const tabDef = tabBySlug(tab);
      return <PlaceholderPanel tabLabel={tabDef?.label ?? tab} />;
    }
  }
}

export default function ChartPage({ params }: ChartPageProps) {
  const { dfn, tab } = use(params);

  // Validate tab slug
  const tabDef = tabBySlug(tab);
  if (!tabDef) {
    notFound();
  }

  return (
    <div className={styles.shell}>
      <MenuBar dfn={dfn} />
      <PatientHeader dfn={dfn} />
      <main className={styles.content}>
        <TabContent dfn={dfn} tab={tab} />
      </main>
      <TabStrip dfn={dfn} activeTab={tab} />
    </div>
  );
}
