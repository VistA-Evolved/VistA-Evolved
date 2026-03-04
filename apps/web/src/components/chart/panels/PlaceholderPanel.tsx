/**
 * PlaceholderPanel — shown for legacy /chart tabs not yet wired.
 * Dead-click audit: Phase 568 — all interactions wired or labeled.
 * Shows integration-pending status with target VistA RPCs per tab.
 */
import styles from './panels.module.css';

const TAB_RPC_MAP: Record<string, { rpcs: string[]; vistaFiles: string }> = {
  Orders:           { rpcs: ['ORWORB FASTUSER', 'ORWDX SEND'],             vistaFiles: 'OE/RR (100)' },
  Consults:         { rpcs: ['ORQQCN LIST', 'ORQQCN DETAIL'],              vistaFiles: 'Request/Consultation (123)' },
  Surgery:          { rpcs: ['ORWSR RPTLIST', 'ORWSR SHOW SURGERY TAB'],   vistaFiles: 'Surgery (130)' },
  'D/C Summ':       { rpcs: ['TIU DOCUMENTS BY CONTEXT', 'ORWCS LIST'],    vistaFiles: 'TIU Document (8925)' },
  Labs:             { rpcs: ['ORWLRR INTERIMG', 'ORWLRR CHART'],           vistaFiles: 'Lab Data (63)' },
  Reports:          { rpcs: ['ORWRP REPORT TEXT', 'ORWRP2 HS REPORT TEXT'],vistaFiles: 'Report (101.24)' },
};

interface PlaceholderPanelProps {
  tabLabel: string;
}

export default function PlaceholderPanel({ tabLabel }: PlaceholderPanelProps) {
  const info = TAB_RPC_MAP[tabLabel];
  return (
    <div className={styles.placeholder}>
      <h2>{tabLabel}</h2>
      <div style={{
        background: '#2d2006',
        border: '1px solid #92600a',
        borderRadius: 6,
        padding: '12px 16px',
        marginTop: 8,
        color: '#ffb347',
        fontFamily: 'monospace',
        fontSize: 13,
      }}>
        <strong>Integration Pending</strong>
        {info ? (
          <>
            <p style={{ margin: '8px 0 4px', color: '#ccc' }}>Target RPCs:</p>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#e0e0e0' }}>
              {info.rpcs.map(r => <li key={r}>{r}</li>)}
            </ul>
            <p style={{ margin: '6px 0 0', color: '#888', fontSize: 11 }}>VistA files: {info.vistaFiles}</p>
          </>
        ) : (
          <p style={{ margin: '6px 0 0', color: '#ccc' }}>Use the CPRS chart at /cprs/chart for wired panels.</p>
        )}
      </div>
    </div>
  );
}
