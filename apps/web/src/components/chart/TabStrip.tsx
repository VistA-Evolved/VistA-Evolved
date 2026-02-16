'use client';

import Link from 'next/link';
import { CHART_TABS } from '@/lib/chart-types';
import styles from './TabStrip.module.css';

interface TabStripProps {
  dfn: string;
  activeTab: string;
}

export default function TabStrip({ dfn, activeTab }: TabStripProps) {
  return (
    <nav className={styles.strip} role="tablist" aria-label="Chart tabs">
      {CHART_TABS.map((tab) => (
        <Link
          key={tab.slug}
          href={`/chart/${dfn}/${tab.slug}`}
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
