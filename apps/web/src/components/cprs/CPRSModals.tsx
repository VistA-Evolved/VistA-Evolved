'use client';

import { useState, useEffect } from 'react';
import { useCPRSUI } from '@/stores/cprs-ui-state';
import { usePatient } from '@/stores/patient-context';
import { useSession } from '@/stores/session-context';
import { useDataCache, type Vital } from '@/stores/data-cache';
import {
  AddProblemDialog,
  EditProblemDialog,
  AddMedicationDialog,
  CreateNoteDialog,
  AddVitalDialog,
  AddAllergyDialog,
  AcknowledgeLabDialog,
} from './dialogs';
import styles from './cprs.module.css';
import { API_BASE, WS_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Modal shell                                                         */
/* ------------------------------------------------------------------ */

function Modal({
  title,
  children,
  onClose,
  wide,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  wide?: boolean;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        style={wide ? { minWidth: 600 } : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <span>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}>
            &times;
          </button>
        </div>
        <div className={styles.modalBody}>{children}</div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Individual modals                                                   */
/* ------------------------------------------------------------------ */

function PrintModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Print" onClose={onClose}>
      <p>Select the content to print:</p>
      <div className={styles.formGroup}>
        <label>
          <input type="checkbox" defaultChecked /> Current View
        </label>
      </div>
      <div className={styles.formGroup}>
        <label>
          <input type="checkbox" /> Full Patient Summary
        </label>
      </div>
      <div className={styles.modalFooter}>
        <button
          className={styles.btn}
          onClick={() => {
            window.print();
            onClose();
          }}
        >
          Print
        </button>
        <button className={styles.btn} onClick={onClose}>
          Cancel
        </button>
      </div>
    </Modal>
  );
}

function PrintSetupModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Print Setup" onClose={onClose}>
      <p>Print setup options are controlled by the browser&apos;s print dialog.</p>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={onClose}>
          OK
        </button>
      </div>
    </Modal>
  );
}

function GraphingModal({ onClose }: { onClose: () => void }) {
  const { dfn } = usePatient();
  const { fetchDomain, getDomain, isLoading } = useDataCache();
  const [vitalType, setVitalType] = useState('');

  const patientDfn = dfn || '1';

  useEffect(() => {
    fetchDomain(patientDfn, 'vitals');
  }, [patientDfn, fetchDomain]);

  const vitals = getDomain(patientDfn, 'vitals');
  const loading = isLoading(patientDfn, 'vitals');

  // Group vitals by type
  const vitalTypes = [...new Set(vitals.map((v: Vital) => v.type))];
  const selectedType = vitalType || vitalTypes[0] || '';
  const filteredVitals = vitals
    .filter((v: Vital) => v.type === selectedType)
    .sort((a: Vital, b: Vital) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());

  // SVG chart dimensions
  const W = 560,
    H = 200,
    PAD = 40;

  function renderChart() {
    if (filteredVitals.length === 0) {
      return (
        <text x={W / 2} y={H / 2} textAnchor="middle" fill="var(--cprs-text-muted)" fontSize={13}>
          No data points for {selectedType}
        </text>
      );
    }

    const nums = filteredVitals.map((v: Vital) => {
      const match = v.value.match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    });
    const minV = Math.min(...nums);
    const maxV = Math.max(...nums);
    const range = maxV - minV || 1;

    const points = nums.map((n: number, i: number) => {
      const x = PAD + (i / Math.max(filteredVitals.length - 1, 1)) * (W - PAD * 2);
      const y = H - PAD - ((n - minV) / range) * (H - PAD * 2);
      return { x, y, val: n, label: filteredVitals[i].takenAt.split('T')[0] ?? '' };
    });

    const polyline = points.map((p) => `${p.x},${p.y}`).join(' ');

    return (
      <>
        {/* Y axis labels */}
        <text x={PAD - 4} y={PAD} textAnchor="end" fontSize={10} fill="var(--cprs-text-muted)">
          {maxV}
        </text>
        <text x={PAD - 4} y={H - PAD} textAnchor="end" fontSize={10} fill="var(--cprs-text-muted)">
          {minV}
        </text>
        {/* Grid lines */}
        <line x1={PAD} y1={PAD} x2={PAD} y2={H - PAD} stroke="var(--cprs-border)" strokeWidth={1} />
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
          stroke="var(--cprs-border)"
          strokeWidth={1}
        />
        {/* Data line */}
        <polyline fill="none" stroke="#2563eb" strokeWidth={2} points={polyline} />
        {/* Data points + labels */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="#2563eb" />
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize={9} fill="var(--cprs-text)">
              {p.val}
            </text>
            {i % Math.max(1, Math.floor(points.length / 6)) === 0 && (
              <text
                x={p.x}
                y={H - PAD + 14}
                textAnchor="middle"
                fontSize={8}
                fill="var(--cprs-text-muted)"
              >
                {p.label}
              </text>
            )}
          </g>
        ))}
      </>
    );
  }

  return (
    <Modal title="Graphing" onClose={onClose} wide>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Vital Type:</label>
        <select
          className={styles.formSelect}
          value={selectedType}
          onChange={(e) => setVitalType(e.target.value)}
          style={{ width: 'auto' }}
        >
          {vitalTypes.map((t: string) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
          {vitalTypes.length === 0 && <option value="">No vitals</option>}
        </select>
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>
          {loading ? 'Loading...' : `${filteredVitals.length} data point(s)`}
        </span>
      </div>

      <svg
        width={W}
        height={H}
        style={{
          border: '1px solid var(--cprs-border)',
          borderRadius: 4,
          background: 'var(--cprs-bg)',
        }}
      >
        {renderChart()}
      </svg>

      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
        Contract: ORWGRPC ITEMS &bull; Data source: live vitals RPC
      </p>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

function LegacyConsoleModal({ onClose }: { onClose: () => void }) {
  const { authenticated, hasRole } = useSession();
  const [output, setOutput] = useState<string[]>([
    '> Legacy RPC Console -- Phase 13 (WebSocket)',
    '> Type a command and press Enter.',
    '> Modes: "rpc RPC_NAME param1 param2" or "api /vista/ping"',
    '> _',
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [wsRef, setWsRef] = useState<WebSocket | null>(null);
  const [connected, setConnected] = useState(false);

  // Connect WebSocket on mount
  useEffect(() => {
    if (!authenticated) {
      setOutput((prev) => [...prev, '[ERROR] Not authenticated. Please log in first.']);
      return;
    }
    if (!hasRole('provider', 'admin')) {
      setOutput((prev) => [...prev, '[ACCESS DENIED] Console requires provider or admin role.']);
      return;
    }

    let ws: WebSocket;
    try {
      // Cookie is sent automatically by the browser on WS upgrade request
      const wsUrl = WS_BASE + '/ws/console';
      ws = new WebSocket(wsUrl);
    } catch {
      setOutput((prev) => [...prev, '[ERROR] Failed to create WebSocket connection.']);
      return;
    }

    ws.onopen = () => {
      setConnected(true);
      setOutput((prev) => [...prev, '[WS] Connected to console gateway.']);
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        const ts = msg.ts?.split('T')[1]?.slice(0, 8) ?? '';
        if (msg.type === 'info') {
          setOutput((prev) => [...prev, `[${ts}] ${msg.message}`]);
        } else if (msg.type === 'result') {
          setOutput((prev) => [
            ...prev,
            `[${ts}] RPC ${msg.rpcName} -> ${msg.count} line(s)`,
            ...msg.lines.map((l: string) => `  ${l}`),
            '> _',
          ]);
        } else if (msg.type === 'api_result') {
          const body = typeof msg.body === 'string' ? msg.body : JSON.stringify(msg.body, null, 2);
          setOutput((prev) => [...prev, `[${ts}] ${msg.status} ${msg.path}`, body, '> _']);
        } else if (msg.type === 'error') {
          setOutput((prev) => [...prev, `[${ts}] ERROR: ${msg.message}`, '> _']);
        } else if (msg.type === 'pong') {
          setOutput((prev) => [...prev, `[${ts}] PONG`]);
        }
      } catch {
        setOutput((prev) => [...prev, `[RAW] ${event.data}`]);
      }
      setLoading(false);
    };

    ws.onclose = () => {
      setConnected(false);
      setOutput((prev) => [...prev, '[WS] Disconnected.']);
    };

    ws.onerror = () => {
      setOutput((prev) => [...prev, '[WS] Connection error. Falling back to HTTP mode.']);
    };

    setWsRef(ws);
    return () => {
      ws.close();
    };
  }, [authenticated, hasRole]);

  async function handleExecute() {
    const cmd = input.trim();
    if (!cmd) return;
    setInput('');
    setLoading(true);

    const ts = new Date().toISOString().split('T')[1]?.slice(0, 8) ?? '';
    setOutput((prev) => [...prev, `[${ts}] $ ${cmd}`]);

    if (wsRef && connected) {
      // WebSocket mode
      if (cmd.startsWith('rpc ')) {
        const parts = cmd.substring(4).split(/\s+/);
        const rpcName = parts[0];
        const params = parts.slice(1);
        wsRef.send(JSON.stringify({ type: 'rpc', name: rpcName, params }));
      } else if (cmd.startsWith('api ')) {
        const path = cmd.substring(4).trim();
        wsRef.send(JSON.stringify({ type: 'api', path }));
      } else if (cmd === 'ping') {
        wsRef.send(JSON.stringify({ type: 'ping' }));
      } else if (cmd === 'clear') {
        setOutput(['> Console cleared.', '> _']);
        setLoading(false);
      } else if (cmd === 'help') {
        setOutput((prev) => [
          ...prev,
          '  rpc <RPC_NAME> [param1] [param2] ...  -- Execute a VistA RPC',
          '  api <path>                              -- Execute a local API GET',
          '  ping                                    -- Test WebSocket',
          '  clear                                   -- Clear console',
          '  help                                    -- Show this help',
          '> _',
        ]);
        setLoading(false);
      } else {
        // Default: treat as API path
        wsRef.send(
          JSON.stringify({ type: 'api', path: cmd.startsWith('/') ? cmd : `/vista/${cmd}` })
        );
      }
    } else {
      // HTTP fallback
      try {
        const url = cmd.startsWith('/') ? cmd : `/vista/${cmd}`;
        const res = await fetch(`${API_BASE}${url}`, { credentials: 'include' });
        const text = await res.text();
        try {
          const obj = JSON.parse(text);
          setOutput((prev) => [
            ...prev,
            `[${ts}] ${res.status} OK`,
            JSON.stringify(obj, null, 2),
            '> _',
          ]);
        } catch {
          setOutput((prev) => [...prev, `[${ts}] ${res.status}`, text.slice(0, 2000), '> _']);
        }
      } catch (err: unknown) {
        setOutput((prev) => [
          ...prev,
          `[${ts}] ERROR: ${err instanceof Error ? err.message : String(err)}`,
          '> _',
        ]);
      } finally {
        setLoading(false);
      }
    }
  }

  return (
    <Modal title="Legacy Console" onClose={onClose} wide>
      <div style={{ display: 'flex', gap: 4, marginBottom: 4, alignItems: 'center' }}>
        <span style={{ fontSize: 10, color: connected ? '#28a745' : '#dc3545', fontWeight: 600 }}>
          {connected ? 'WS' : 'HTTP'}
        </span>
        <input
          className={styles.formInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleExecute()}
          placeholder={connected ? 'rpc ORWPT LIST ALL SMI 1' : '/vista/ping'}
          style={{ flex: 1, fontFamily: 'monospace', fontSize: 12 }}
        />
        <button
          className={`${styles.btn} ${styles.btnPrimary}`}
          onClick={handleExecute}
          disabled={loading}
        >
          {loading ? '...' : 'Execute'}
        </button>
      </div>
      <div
        style={{
          background: '#0a0a0a',
          color: '#0f0',
          padding: 12,
          fontFamily: 'monospace',
          borderRadius: 4,
          minHeight: 250,
          maxHeight: 400,
          overflowY: 'auto',
          fontSize: 11,
          whiteSpace: 'pre-wrap',
        }}
      >
        {output.map((line, i) => (
          <div key={i}>{line}</div>
        ))}
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={() => setOutput(['> Console cleared.', '> _'])}>
          Clear
        </button>
        <button className={styles.btn} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

function RemoteDataModal({ onClose }: { onClose: () => void }) {
  const { dfn } = usePatient();
  const [facilities, setFacilities] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a production system, this would query VHIE/FHIR endpoints for remote facilities.
    // In the Docker sandbox, no remote facilities exist, so we show the architectural hook.
    const timer = setTimeout(() => {
      setFacilities([]);
      setLoading(false);
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <Modal title="Remote Data Viewer" onClose={onClose} wide>
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 12, fontWeight: 600 }}>Patient DFN: {dfn || '(none)'}</p>
        <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>
          Contract: ORWCIRN FACLIST / ORWCIRN HDRA &bull; Remote facility data integration
        </p>
      </div>

      {loading ? (
        <p style={{ fontSize: 12 }}>Querying remote facilities...</p>
      ) : facilities.length === 0 ? (
        <div
          style={{
            padding: 16,
            textAlign: 'center',
            border: '1px dashed var(--cprs-border)',
            borderRadius: 6,
          }}
        >
          <p style={{ fontSize: 14, fontWeight: 600 }}>No Remote Facilities Connected</p>
          <p
            style={{
              fontSize: 12,
              color: 'var(--cprs-text-muted)',
              maxWidth: 400,
              margin: '8px auto',
            }}
          >
            The Docker sandbox does not have remote facility connections. In a production
            environment, this viewer would display clinical data from other facilities via VHIE
            (Health Information Exchange) or FHIR bridges.
          </p>
          <div
            style={{
              marginTop: 12,
              padding: 8,
              background: 'var(--cprs-bg)',
              borderRadius: 4,
              fontSize: 11,
              textAlign: 'left',
            }}
          >
            <strong>Architecture:</strong>
            <ul style={{ margin: '4px 0', paddingLeft: 20 }}>
              <li>ORWCIRN FACLIST -- Lists connected remote facilities</li>
              <li>ORWCIRN HDRA -- Retrieves remote patient data by facility</li>
              <li>Remote correlation via ICN (Integration Control Number)</li>
              <li>FHIR R4 bridge for modern interoperability</li>
            </ul>
          </div>
        </div>
      ) : (
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th>Facility</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {facilities.map((f, i) => (
              <tr key={i}>
                <td>{f}</td>
                <td>Connected</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

function KeyboardShortcutsModal({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    ['Ctrl+O', 'Select Patient'],
    ['F5', 'Refresh Patient Data'],
    ['Ctrl+P', 'Print'],
    ['Shift+S', 'Cover Sheet'],
    ['Shift+P', 'Problem List'],
    ['Shift+M', 'Medications'],
    ['Shift+O', 'Orders'],
    ['Shift+N', 'Progress Notes'],
    ['Shift+T', 'Consults'],
    ['Shift+U', 'Surgery'],
    ['Shift+D', 'Discharge Summaries'],
    ['Shift+L', 'Laboratory'],
    ['Shift+R', 'Reports'],
    ['F1', 'Help / Keyboard Shortcuts'],
  ];
  return (
    <Modal title="Keyboard Shortcuts" onClose={onClose}>
      <table className={styles.dataTable}>
        <thead>
          <tr>
            <th>Key</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody>
          {shortcuts.map(([key, action]) => (
            <tr key={key}>
              <td>
                <code>{key}</code>
              </td>
              <td>{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={onClose}>
          Close
        </button>
      </div>
    </Modal>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="About EHR -- Evolved" onClose={onClose}>
      <div style={{ textAlign: 'center', padding: 16 }}>
        <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>EHR -- Evolved</h2>
        <p>CPRS Web Replica v2.0</p>
        <p style={{ color: 'var(--cprs-text-muted)', fontSize: 12 }}>
          Built from CPRS Delphi source contracts.
          <br />
          Phase 13 -- CPRS Operationalization.
        </p>
        <p style={{ marginTop: 12, fontSize: 11, color: 'var(--cprs-text-muted)' }}>
          975 RPCs cataloged &bull; 10 chart tabs &bull; 27+ API endpoints &bull; 12 data domains
          <br />
          Session auth &bull; Inbox &bull; Order state machine &bull; Results workflow
          <br />
          WebSocket console &bull; Modern UI toggle &bull; Remote data viewer
        </p>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={onClose}>
          OK
        </button>
      </div>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Router                                                              */
/* ------------------------------------------------------------------ */

export default function CPRSModals() {
  const { activeModal, closeModal } = useCPRSUI();

  if (!activeModal) return null;

  switch (activeModal) {
    case 'print':
      return <PrintModal onClose={closeModal} />;
    case 'printSetup':
      return <PrintSetupModal onClose={closeModal} />;
    case 'graphing':
      return <GraphingModal onClose={closeModal} />;
    case 'legacyConsole':
      return <LegacyConsoleModal onClose={closeModal} />;
    case 'remoteData':
      return <RemoteDataModal onClose={closeModal} />;
    case 'keyboardShortcuts':
      return <KeyboardShortcutsModal onClose={closeModal} />;
    case 'about':
      return <AboutModal onClose={closeModal} />;
    case 'addProblem':
      return <AddProblemDialog />;
    case 'editProblem':
      return <EditProblemDialog />;
    case 'addMedication':
      return <AddMedicationDialog />;
    case 'createNote':
      return <CreateNoteDialog />;
    case 'addVital':
      return <AddVitalDialog />;
    case 'addAllergy':
      return <AddAllergyDialog />;
    case 'ackLab':
      return <AcknowledgeLabDialog />;
    default:
      return null;
  }
}
