'use client';

import { useCPRSUI } from '@/stores/cprs-ui-state';
import styles from '@/components/cprs/cprs.module.css';

/**
 * Preferences page — matches frmFrame "Tools > Options" in CPRS Delphi.
 */
export default function CPRSPreferencesPage() {
  const { preferences, updatePreferences } = useCPRSUI();

  return (
    <div className={styles.shell} style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <div className={styles.menuBar}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>EHR &mdash; Evolved</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--cprs-text-muted)' }}>Settings &rarr; Preferences</span>
      </div>

      <div style={{ flex: 1, padding: 24, maxWidth: 600, margin: '0 auto', width: '100%' }}>
        <h2 style={{ fontSize: 18, margin: '0 0 16px' }}>Preferences</h2>

        <div className={styles.prefsGrid}>
          <section className={styles.prefsSection}>
            <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Appearance</h3>
            <div className={styles.formGroup}>
              <label>Theme</label>
              <select
                className={styles.formSelect}
                value={preferences.theme}
                onChange={(e) => updatePreferences({ theme: e.target.value as 'light' | 'dark' | 'system' })}
              >
                <option value="light">Light</option>
                <option value="dark">Dark</option>
                <option value="system">System</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Density</label>
              <select
                className={styles.formSelect}
                value={preferences.density}
                onChange={(e) => updatePreferences({ density: e.target.value as 'comfortable' | 'compact' })}
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
              </select>
            </div>
          </section>

          <section className={styles.prefsSection}>
            <h3 style={{ fontSize: 14, margin: '0 0 8px' }}>Chart Options</h3>
            <div className={styles.formGroup}>
              <label>Initial Tab</label>
              <select
                className={styles.formSelect}
                value={preferences.initialTab}
                onChange={(e) => updatePreferences({ initialTab: e.target.value })}
              >
                <option value="cover">Cover Sheet</option>
                <option value="problems">Problems</option>
                <option value="meds">Medications</option>
                <option value="orders">Orders</option>
                <option value="notes">Notes</option>
                <option value="labs">Labs</option>
                <option value="reports">Reports</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>
                <input
                  type="checkbox"
                  checked={preferences.enableDragReorder}
                  onChange={(e) => updatePreferences({ enableDragReorder: e.target.checked })}
                />{' '}
                Enable drag-to-reorder Cover Sheet panels
              </label>
            </div>
          </section>
        </div>

        <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 16 }}>
          Preferences are saved to browser localStorage and persist across sessions.
        </p>
      </div>
    </div>
  );
}
