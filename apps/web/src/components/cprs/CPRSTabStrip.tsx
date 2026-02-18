'use client';

import Link from 'next/link';
import { getChartTabs } from '@/lib/contracts/loader';
import { useTenant } from '@/stores/tenant-context';
import styles from './cprs.module.css';

/** Map tab slug to module ID for feature gating. */
const TAB_TO_MODULE: Record<string, string> = {
  cover: 'cover',
  problems: 'problems',
  meds: 'meds',
  orders: 'orders',
  notes: 'notes',
  consults: 'consults',
  surgery: 'surgery',
  dcsumm: 'dcsumm',
  labs: 'labs',
  reports: 'reports',
  intake: 'intake',
  telehealth: 'telehealth',
};

interface CPRSTabStripProps {
  dfn: string;
  activeTab: string;
}

export default function CPRSTabStrip({ dfn, activeTab }: CPRSTabStripProps) {
  const tabs = getChartTabs();
  const { isModuleEnabled } = useTenant();

  return (
    <nav className={styles.tabStrip} role="tablist" aria-label="Chart tabs">
      {tabs
        .filter((tab) => {
          const moduleId = TAB_TO_MODULE[tab.slug];
          return !moduleId || isModuleEnabled(moduleId);
        })
        .map((tab) => (
          <Link
            key={tab.slug}
            href={`/cprs/chart/${dfn}/${tab.slug}`}
            role="tab"
            aria-selected={tab.slug === activeTab}
            className={`${styles.tab} ${tab.slug === activeTab ? styles.active : ''}`}
          >
            {tab.label}
          </Link>
        ))}
    </nav>
  );
}
