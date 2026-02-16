'use client';

import { useCPRSUI } from '@/stores/cprs-ui-state';
import { AddProblemDialog, EditProblemDialog, AddMedicationDialog } from './dialogs';
import styles from './cprs.module.css';

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
          <button className={styles.closeBtn} onClick={onClose}>&times;</button>
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
        <label><input type="checkbox" defaultChecked /> Current View</label>
      </div>
      <div className={styles.formGroup}>
        <label><input type="checkbox" /> Full Patient Summary</label>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={() => { window.print(); onClose(); }}>Print</button>
        <button className={styles.btn} onClick={onClose}>Cancel</button>
      </div>
    </Modal>
  );
}

function PrintSetupModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Print Setup" onClose={onClose}>
      <p>Print setup options are controlled by the browser&apos;s print dialog.</p>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={onClose}>OK</button>
      </div>
    </Modal>
  );
}

function GraphingModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Graphing" onClose={onClose} wide>
      <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px dashed var(--cprs-border)`, borderRadius: 6 }}>
        <div style={{ textAlign: 'center' }}>
          <p style={{ fontSize: 16, fontWeight: 600 }}>Vitals &amp; Lab Graphing</p>
          <p className={styles.pendingText}>
            Interactive charting integration pending.<br />
            Contract ID: fGraphing / ORWGRPC ITEMS
          </p>
        </div>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function LegacyConsoleModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Legacy Console" onClose={onClose} wide>
      <div style={{ background: '#0a0a0a', color: '#0f0', padding: 12, fontFamily: 'monospace', borderRadius: 4, minHeight: 200, fontSize: 12 }}>
        <p>&gt; Legacy RPC Console</p>
        <p>&gt; This interface will provide raw RPC call/response inspection.</p>
        <p>&gt; Integration pending — use API endpoints directly for now.</p>
        <p>&gt; _</p>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={onClose}>Close</button>
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
        <thead><tr><th>Key</th><th>Action</th></tr></thead>
        <tbody>
          {shortcuts.map(([key, action]) => (
            <tr key={key}><td><code>{key}</code></td><td>{action}</td></tr>
          ))}
        </tbody>
      </table>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function AboutModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="About EHR — Evolved" onClose={onClose}>
      <div style={{ textAlign: 'center', padding: 16 }}>
        <h2 style={{ fontSize: 18, margin: '0 0 8px' }}>EHR — Evolved</h2>
        <p>CPRS Web Replica v1.0</p>
        <p style={{ color: 'var(--cprs-text-muted)', fontSize: 12 }}>
          Built from CPRS Delphi source contracts.<br />
          Phase 11 — Full end-to-end wiring.
        </p>
        <p style={{ marginTop: 12, fontSize: 11, color: 'var(--cprs-text-muted)' }}>
          975 RPCs cataloged &bull; 10 chart tabs &bull; 1688 menu items extracted
        </p>
      </div>
      <div className={styles.modalFooter}>
        <button className={styles.btn} onClick={onClose}>OK</button>
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
    case 'print': return <PrintModal onClose={closeModal} />;
    case 'printSetup': return <PrintSetupModal onClose={closeModal} />;
    case 'graphing': return <GraphingModal onClose={closeModal} />;
    case 'legacyConsole': return <LegacyConsoleModal onClose={closeModal} />;
    case 'keyboardShortcuts': return <KeyboardShortcutsModal onClose={closeModal} />;
    case 'about': return <AboutModal onClose={closeModal} />;
    case 'addProblem': return <AddProblemDialog />;
    case 'editProblem': return <EditProblemDialog />;
    case 'addMedication': return <AddMedicationDialog />;
    default: return null;
  }
}
