'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCPRSUI, type DensityMode, type LayoutMode } from '@/stores/cprs-ui-state';
import { useSession } from '@/stores/session-context';
import { useFacilityDefaults } from '@/stores/tenant-context';
import styles from '@/components/cprs/cprs.module.css';

/**
 * Preferences page -- matches frmFrame "Tools > Options" in CPRS Delphi.
 * Phase 13G: adds layout mode and extended density options.
 * Phase 17D: adds "Reset to facility defaults" button.
 */
export default function CPRSPreferencesPage() {
  const router = useRouter();
  const { preferences, updatePreferences } = useCPRSUI();
  const { ready, authenticated } = useSession();
  const facilityDefaults = useFacilityDefaults();
  const canResetToFacilityDefaults = Boolean(facilityDefaults);

  useEffect(() => {
    if (ready && !authenticated) {
      router.replace('/cprs/login?redirect=%2Fcprs%2Fsettings%2Fpreferences');
    }
  }, [authenticated, ready, router]);

  const handleResetToFacilityDefaults = () => {
    if (!facilityDefaults) return;
    updatePreferences({
      theme: facilityDefaults.theme,
      density: facilityDefaults.density,
      layoutMode: facilityDefaults.layoutMode,
      initialTab: facilityDefaults.initialTab,
      enableDragReorder: facilityDefaults.enableDragReorder,
    });
  };

  if (!ready || !authenticated) {
    return (
      <div
        className={styles.shell}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}
      >
        <p style={{ color: 'var(--cprs-text-muted)' }}>Checking session...</p>
      </div>
    );
  }

  return (
    <div
      className={styles.shell}
      style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}
    >
      <div className={styles.menuBar}>
        <span style={{ fontWeight: 600, fontSize: 13 }}>EHR &mdash; Evolved</span>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--cprs-text-muted)' }}>
          Settings &rarr; Preferences
        </span>
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
                onChange={(e) =>
                  updatePreferences({ theme: e.target.value as 'light' | 'dark' | 'system' })
                }
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
                onChange={(e) => updatePreferences({ density: e.target.value as DensityMode })}
              >
                <option value="comfortable">Comfortable</option>
                <option value="compact">Compact</option>
                <option value="balanced">Balanced (Modern)</option>
                <option value="dense">Dense (Legacy)</option>
              </select>
              <p style={{ fontSize: 10, color: 'var(--cprs-text-muted)', margin: '2px 0 0' }}>
                Controls spacing and font scaling across all views.
              </p>
            </div>
            <div className={styles.formGroup}>
              <label>Layout Mode</label>
              <select
                className={styles.formSelect}
                value={preferences.layoutMode}
                onChange={(e) => updatePreferences({ layoutMode: e.target.value as LayoutMode })}
              >
                <option value="cprs">Classic CPRS</option>
                <option value="modern">Modern</option>
              </select>
              <p style={{ fontSize: 10, color: 'var(--cprs-text-muted)', margin: '2px 0 0' }}>
                Classic preserves the CPRS workflow and menu bar. Modern uses a sidebar navigation
                with card-based layouts. Both modes use identical workflows and screen IDs.
              </p>
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
        {!canResetToFacilityDefaults && (
          <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 8 }}>
            Facility defaults are unavailable on this stack, so reset uses only local browser preferences.
          </p>
        )}
        <button
          onClick={handleResetToFacilityDefaults}
          disabled={!canResetToFacilityDefaults}
          style={{
            marginTop: 12,
            padding: '6px 16px',
            fontSize: 12,
            cursor: canResetToFacilityDefaults ? 'pointer' : 'not-allowed',
            background: 'var(--cprs-surface, #f5f5f5)',
            border: '1px solid var(--cprs-border, #ccc)',
            borderRadius: 4,
            opacity: canResetToFacilityDefaults ? 1 : 0.6,
          }}
        >
          Reset to Facility Defaults
        </button>
      </div>
    </div>
  );
}
