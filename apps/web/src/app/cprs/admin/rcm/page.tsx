'use client';

/**
 * RCM (Revenue Cycle Management) Placeholder — Phase 19D.
 *
 * Feature-flagged placeholder for future billing/coding surfaces.
 * Gated by "rcm.enabled" feature flag (default: false).
 *
 * When RCM is disabled, shows an informational message.
 * When enabled, shows placeholder panels for future implementation.
 *
 * Accessible at /cprs/admin/rcm. Requires admin role.
 */

import { useState, useEffect } from 'react';
import { useSession } from '@/stores/session-context';
import styles from '@/components/cprs/cprs.module.css';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

export default function RcmPage() {
  const { user, hasRole } = useSession();
  const [rcmEnabled, setRcmEnabled] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check feature flag
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/admin/my-tenant`, { credentials: 'include' });
        const data = await res.json();
        if (data.ok && data.tenant?.featureFlags?.['rcm.enabled']) {
          setRcmEnabled(true);
        }
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  if (!user) {
    return <div className={styles.cprsPage}><p style={{ padding: 24 }}>Please log in.</p></div>;
  }

  if (!hasRole('admin')) {
    return <div className={styles.cprsPage}><p style={{ padding: 24 }}>Admin role required to access RCM surfaces.</p></div>;
  }

  if (loading) {
    return <div className={styles.cprsPage}><p style={{ padding: 24, color: '#6c757d' }}>Loading RCM configuration…</p></div>;
  }

  if (!rcmEnabled) {
    return (
      <div className={styles.cprsPage}>
        <div style={{ padding: '16px 24px', borderBottom: '1px solid #dee2e6' }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>Revenue Cycle Management</h2>
        </div>
        <div style={{ padding: 24 }}>
          <div style={{ padding: 20, background: '#fff3cd', border: '1px solid #ffc107', borderRadius: 6, maxWidth: 600 }}>
            <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>RCM Module Disabled</h3>
            <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
              Revenue Cycle Management surfaces are currently disabled for this tenant.
              To enable, set the <code>rcm.enabled</code> feature flag to <code>true</code> in
              the tenant configuration via <strong>Admin → Integrations</strong> or the API.
            </p>
            <p style={{ margin: '12px 0 0', fontSize: 12, color: '#856404' }}>
              When enabled, this page will show placeholder panels for:
            </p>
            <ul style={{ fontSize: 12, color: '#856404', margin: '4px 0 0', paddingLeft: 20 }}>
              <li>Encounter coding queue</li>
              <li>Charge capture dashboard</li>
              <li>Claims submission status</li>
              <li>Billing analytics</li>
              <li>Denial management</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  /* ── RCM Enabled: show placeholder panels ────────────────────── */

  return (
    <div className={styles.cprsPage}>
      <div style={{ padding: '16px 24px', borderBottom: '1px solid #dee2e6' }}>
        <h2 style={{ margin: 0, fontSize: 18 }}>Revenue Cycle Management</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12, color: '#6c757d' }}>
          Phase 19D — Placeholder surfaces for future RCM/billing integration.
        </p>
      </div>

      <div style={{ padding: 24, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <PlaceholderCard
          title="Encounter Coding Queue"
          description="Queue of encounters pending CPT/ICD-10 coding. Integrates with VistA Problem List and Notes."
        />
        <PlaceholderCard
          title="Charge Capture Dashboard"
          description="Track charges captured from clinical encounters. Links to VistA orders and procedures."
        />
        <PlaceholderCard
          title="Claims Submission Status"
          description="Monitor outbound claims to payers. Track submission, acknowledgment, and remittance."
        />
        <PlaceholderCard
          title="Billing Analytics"
          description="Revenue trends, denial rates, days in AR, and collection efficiency metrics."
        />
        <PlaceholderCard
          title="Denial Management"
          description="Track denied claims, manage appeals, and identify denial patterns by payer/code."
        />
        <PlaceholderCard
          title="Fee Schedule Management"
          description="Maintain fee schedules, modifier rules, and contract rates by payer."
        />
      </div>
    </div>
  );
}

function PlaceholderCard({ title, description }: { title: string; description: string }) {
  return (
    <div style={{
      padding: 20,
      background: '#f8f9fa',
      border: '1px dashed #adb5bd',
      borderRadius: 6,
    }}>
      <h3 style={{ margin: '0 0 8px', fontSize: 14, color: '#495057' }}>{title}</h3>
      <p style={{ margin: 0, fontSize: 12, color: '#6c757d', lineHeight: 1.5 }}>{description}</p>
      <p style={{ margin: '12px 0 0', fontSize: 11, color: '#adb5bd', fontStyle: 'italic' }}>
        Not yet implemented — placeholder for future development.
      </p>
    </div>
  );
}
