'use client';

/**
 * Module Not Enabled -- Phase 135.
 *
 * Catch-all page shown when a user deep-links to a disabled module's
 * admin area. Displays a clear message with the module name and
 * contact administrator guidance.
 */

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import styles from '@/components/cprs/cprs.module.css';

export default function ModuleDisabledPage() {
  const searchParams = useSearchParams();
  const moduleName = searchParams?.get('module') || 'Requested module';

  return (
    <div
      className={styles.cprsPage}
      style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}
    >
      <div
        style={{
          textAlign: 'center',
          maxWidth: 480,
          padding: 32,
          border: '1px solid var(--cprs-border, #d1d5db)',
          borderRadius: 8,
          background: 'var(--cprs-surface, #f8f9fa)',
        }}
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>&#128274;</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: '0 0 8px' }}>Module Not Enabled</h1>
        <p style={{ fontSize: 14, color: 'var(--cprs-text-muted, #6b7280)', margin: '0 0 16px' }}>
          <strong>{moduleName}</strong> is not enabled for your facility. Contact your system
          administrator to enable this module.
        </p>
        <Link
          href="/cprs/admin/modules"
          style={{
            display: 'inline-block',
            padding: '8px 20px',
            fontSize: 13,
            fontWeight: 600,
            color: '#fff',
            background: 'var(--cprs-accent, #2563eb)',
            borderRadius: 6,
            textDecoration: 'none',
          }}
        >
          Module Administration
        </Link>
        <div style={{ marginTop: 12 }}>
          <Link
            href="/cprs"
            style={{
              fontSize: 13,
              color: 'var(--cprs-text-muted, #6b7280)',
              textDecoration: 'underline',
            }}
          >
            Return to CPRS
          </Link>
        </div>
      </div>
    </div>
  );
}
