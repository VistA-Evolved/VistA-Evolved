'use client';

/**
 * Admin Layout — Phase 76, enhanced Phase 135 (deep-link protection).
 *
 * Shared layout for all /cprs/admin/* pages. Provides a sidebar
 * navigation linking to admin consoles. Module-gated: links to
 * disabled module admin pages are hidden. Deep-links to disabled
 * module areas redirect to the module-disabled page.
 */

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTenant } from '@/stores/tenant-context';
import styles from '@/components/cprs/cprs.module.css';

interface AdminNavItem {
  label: string;
  href: string;
  /** System-level module ID for gating (undefined = always visible) */
  moduleId?: string;
}

const ADMIN_NAV: AdminNavItem[] = [
  { label: 'Onboarding',    href: '/cprs/admin/onboarding' },
  { label: 'Modules',       href: '/cprs/admin/modules' },
  { label: 'Integrations',  href: '/cprs/admin/integrations',  moduleId: 'interop' },
  { label: 'Analytics',     href: '/cprs/admin/analytics',     moduleId: 'analytics' },
  { label: 'RCM / Billing', href: '/cprs/admin/rcm',           moduleId: 'rcm' },
  { label: 'PayerOps',      href: '/cprs/admin/payerops',      moduleId: 'rcm' },
  { label: 'LOA Queue',     href: '/cprs/admin/loa-queue',     moduleId: 'rcm' },
  { label: 'Payer Directory', href: '/cprs/admin/payer-directory', moduleId: 'rcm' },
  { label: 'Capability Matrix', href: '/cprs/admin/capability-matrix', moduleId: 'rcm' },
  { label: 'PH Setup',      href: '/cprs/admin/philhealth-setup', moduleId: 'rcm' },
  { label: 'PH Claims',     href: '/cprs/admin/philhealth-claims', moduleId: 'rcm' },
  { label: 'Claims Queue',  href: '/cprs/admin/claims-queue',     moduleId: 'rcm' },
  { label: 'Denials',       href: '/cprs/admin/denials',          moduleId: 'rcm' },
  { label: 'Payments',      href: '/cprs/admin/payments',          moduleId: 'rcm' },
  { label: 'Payer Intel',   href: '/cprs/admin/payer-intelligence', moduleId: 'rcm' },
  { label: 'PH HMO Console', href: '/cprs/admin/ph-hmo-console', moduleId: 'rcm' },
  { label: 'LOA Workbench', href: '/cprs/admin/loa-workbench', moduleId: 'rcm' },
  { label: 'Claims Workbench', href: '/cprs/admin/claims-workbench', moduleId: 'rcm' },
  { label: 'Remittance Intake', href: '/cprs/admin/remittance-intake', moduleId: 'rcm' },
  { label: 'Payer Registry', href: '/cprs/admin/payer-registry', moduleId: 'rcm' },
  { label: 'Payer DB',       href: '/cprs/admin/payer-db',       moduleId: 'rcm' },
  { label: 'QA Dashboard',   href: '/cprs/admin/qa-dashboard' },
  { label: 'eClaims 3.0',   href: '/cprs/admin/philhealth-eclaims3', moduleId: 'rcm' },
  { label: 'HMO Portal',    href: '/cprs/admin/hmo-portal',          moduleId: 'rcm' },
  { label: 'PH Market',     href: '/cprs/admin/ph-market',           moduleId: 'rcm' },
  { label: 'Contracting',   href: '/cprs/admin/contracting-hub',     moduleId: 'rcm' },
  { label: 'Audit Viewer',  href: '/cprs/admin/audit-viewer',  moduleId: 'iam' },
  { label: 'Break-Glass',   href: '/cprs/admin/break-glass',   moduleId: 'iam' },
  { label: 'RPC Debug',     href: '/cprs/admin/rpc-debug' },
  { label: 'Reports',       href: '/cprs/admin/reports' },
  { label: 'Migration',     href: '/cprs/admin/migration' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isModuleEnabled, tenant } = useTenant();

  const visibleItems = ADMIN_NAV.filter((item) => {
    if (!item.moduleId) return true;
    return isModuleEnabled(item.moduleId);
  });

  // Phase 135: Deep-link protection — if the current page belongs to a
  // disabled module, show the module-disabled page instead of the content.
  const matchingItem = ADMIN_NAV.find(
    (item) => item.moduleId && pathname && (pathname === item.href || pathname.startsWith(item.href + '/'))
  );
  const isBlockedModule = matchingItem?.moduleId && tenant && !isModuleEnabled(matchingItem.moduleId);
  const blockedModuleName = matchingItem?.label;

  return (
    <div className={styles.cprsPage} style={{ display: 'flex', height: '100%' }}>
      <nav
        style={{
          width: 200,
          minWidth: 200,
          borderRight: '1px solid var(--cprs-border, #d1d5db)',
          background: 'var(--cprs-surface, #f8f9fa)',
          padding: '12px 0',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
        aria-label="Admin navigation"
      >
        <div style={{ padding: '4px 16px 12px', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--cprs-text-muted, #6b7280)', letterSpacing: '0.05em' }}>
          Admin Console
        </div>
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname?.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              style={{
                display: 'block',
                padding: '8px 16px',
                fontSize: 13,
                textDecoration: 'none',
                color: active ? 'var(--cprs-text, #1f2937)' : 'var(--cprs-text-muted, #6b7280)',
                background: active ? 'var(--cprs-selected, #e5e7eb)' : 'transparent',
                fontWeight: active ? 600 : 400,
                borderLeft: active ? '3px solid var(--cprs-accent, #2563eb)' : '3px solid transparent',
              }}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
      <main style={{ flex: 1, overflow: 'auto' }}>
        {isBlockedModule ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <div style={{ textAlign: 'center', maxWidth: 480, padding: 32, border: '1px solid var(--cprs-border, #d1d5db)', borderRadius: 8, background: 'var(--cprs-surface, #f8f9fa)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>&#128274;</div>
              <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Module Not Enabled</h1>
              <p style={{ fontSize: 14, color: 'var(--cprs-text-muted, #6b7280)', margin: '0 0 16px' }}>
                <strong>{blockedModuleName}</strong> is not enabled for your facility.
                Contact your system administrator to enable this module.
              </p>
              <Link href="/cprs/admin/modules" style={{ display: 'inline-block', padding: '8px 20px', fontSize: 13, fontWeight: 600, color: '#fff', background: 'var(--cprs-accent, #2563eb)', borderRadius: 6, textDecoration: 'none' }}>
                Module Administration
              </Link>
            </div>
          </div>
        ) : children}
      </main>
    </div>
  );
}
