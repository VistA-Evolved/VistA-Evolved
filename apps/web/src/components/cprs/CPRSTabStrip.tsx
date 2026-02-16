'use client';

import Link from 'next/link';
import { getChartTabs } from '@/lib/contracts/loader';
import styles from './cprs.module.css';

interface CPRSTabStripProps {
  dfn: string;
  activeTab: string;
}

export default function CPRSTabStrip({ dfn, activeTab }: CPRSTabStripProps) {
  const tabs = getChartTabs();

  return (
    <nav className={styles.tabStrip} role="tablist" aria-label="Chart tabs">
      {tabs.map((tab) => (
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
