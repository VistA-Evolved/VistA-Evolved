/**
 * PlaceholderPanel -- shown for legacy /chart tabs not yet wired.
 * Dead-click audit: Phase 568 -- all interactions wired or labeled.
 * Directs users to the CPRS chart for fully wired panels.
 */
import styles from './panels.module.css';

interface PlaceholderPanelProps {
  tabLabel: string;
}

export default function PlaceholderPanel({ tabLabel }: PlaceholderPanelProps) {
  return (
    <div className={styles.placeholder}>
      <h2>{tabLabel}</h2>
      <div
        style={{
          background: '#1e1e2e',
          border: '1px solid #444',
          borderRadius: 6,
          padding: '12px 16px',
          marginTop: 8,
          color: '#aaa',
          fontFamily: 'monospace',
          fontSize: 13,
        }}
      >
        <strong>No data available</strong>
        <p style={{ margin: '6px 0 0', color: '#ccc' }}>
          Use the CPRS chart at /cprs/chart for this panel.
        </p>
      </div>
    </div>
  );
}
