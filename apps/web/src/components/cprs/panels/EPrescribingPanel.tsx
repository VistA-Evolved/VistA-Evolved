'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { API_BASE } from '@/lib/api-config';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';

interface EPrescribingPanelProps {
  dfn: string;
}

interface DrugResult {
  ien: string;
  name: string;
  drugClass: string;
  schedule?: string;
  route?: string;
  form?: string;
}

interface Prescription {
  id: string;
  drugName: string;
  drugClass: string;
  sig: string;
  quantity: number;
  refills: number;
  route: string;
  schedule: string;
  status: string;
  prescriber: string;
  dateWritten: string;
  dateExpires?: string;
  pharmacy?: string;
  daysSupply?: number;
}

type ActiveTab = 'prescribe' | 'history';
type RxStatus = 'active' | 'discontinued' | 'expired' | 'pending' | 'on-hold';

const ROUTES = [
  'Oral', 'Sublingual', 'Buccal', 'Rectal', 'Vaginal',
  'Topical', 'Inhalation', 'Nasal', 'Ophthalmic', 'Otic',
  'Intravenous', 'Intramuscular', 'Subcutaneous', 'Intradermal',
  'Transdermal', 'Other',
];

const SCHEDULES = [
  'QD (Daily)', 'BID (Twice Daily)', 'TID (Three Times Daily)',
  'QID (Four Times Daily)', 'Q4H (Every 4 Hours)', 'Q6H (Every 6 Hours)',
  'Q8H (Every 8 Hours)', 'Q12H (Every 12 Hours)', 'QHS (At Bedtime)',
  'QAM (Every Morning)', 'QPM (Every Evening)', 'PRN (As Needed)',
  'STAT (Immediately)', 'QOD (Every Other Day)', 'QWeek (Weekly)',
];

function statusColor(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active') return '#16a34a';
  if (s === 'discontinued') return '#dc2626';
  if (s === 'expired') return '#9ca3af';
  if (s === 'pending') return '#d97706';
  if (s === 'on-hold') return '#7c3aed';
  return 'var(--cprs-text-muted)';
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 10,
      fontSize: 11,
      fontWeight: 600,
      color: '#fff',
      background: statusColor(status),
      textTransform: 'capitalize',
    }}>
      {status}
    </span>
  );
}

const EMPTY_FORM = {
  drugIen: '',
  drugName: '',
  sig: '',
  quantity: 30,
  refills: 0,
  route: 'Oral',
  schedule: 'QD (Daily)',
  daysSupply: 30,
  pharmacy: '',
  notes: '',
};

export default function EPrescribingPanel({ dfn }: EPrescribingPanelProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>('prescribe');

  // Drug search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DrugResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  // Prescription form state
  const [form, setForm] = useState(EMPTY_FORM);
  const [prescribing, setPrescribing] = useState(false);
  const [prescribeError, setPrescribeError] = useState('');
  const [prescribeSuccess, setPrescribeSuccess] = useState('');

  // History state
  const [history, setHistory] = useState<Prescription[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');
  const [selectedRx, setSelectedRx] = useState<Prescription | null>(null);
  const [historyFilter, setHistoryFilter] = useState<'all' | RxStatus>('all');

  // Action state
  const [actionLoading, setActionLoading] = useState('');

  const handleDrugSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    setSearchError('');
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const r = await fetch(
        `${API_BASE}/vista/erx/drug-search?query=${encodeURIComponent(query)}`,
        { credentials: 'include' },
      );
      const d = await r.json();
      if (d.ok) {
        setSearchResults(d.data ?? d.results ?? []);
      } else {
        setSearchError(d.error ?? 'Drug search failed');
        setSearchResults([]);
      }
    } catch (e: any) {
      setSearchError(e.message ?? 'Network error');
      setSearchResults([]);
    }
    setSearching(false);
  }, []);

  const selectDrug = useCallback((drug: DrugResult) => {
    setForm(f => ({
      ...f,
      drugIen: drug.ien,
      drugName: drug.name,
      route: drug.route ?? f.route,
      schedule: drug.schedule ? `${drug.schedule}` : f.schedule,
    }));
    setSearchResults([]);
    setSearchQuery(drug.name);
  }, []);

  const handlePrescribe = useCallback(async () => {
    if (!form.drugName.trim()) { setPrescribeError('Select a drug first'); return; }
    if (!form.sig.trim()) { setPrescribeError('SIG (directions) is required'); return; }
    if (form.quantity < 1) { setPrescribeError('Quantity must be at least 1'); return; }
    setPrescribing(true);
    setPrescribeError('');
    setPrescribeSuccess('');
    try {
      const r = await fetch(`${API_BASE}/vista/erx/prescribe`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ dfn, ...form }),
      });
      const d = await r.json();
      if (d.ok) {
        setPrescribeSuccess(`Prescription for ${form.drugName} created successfully`);
        setForm(EMPTY_FORM);
        setSearchQuery('');
        fetchHistory();
      } else {
        setPrescribeError(d.error ?? d.message ?? 'Failed to create prescription');
      }
    } catch (e: any) {
      setPrescribeError(e.message ?? 'Network error');
    }
    setPrescribing(false);
  }, [form, dfn]);

  const fetchHistory = useCallback(async () => {
    setHistoryLoading(true);
    setHistoryError('');
    try {
      const r = await fetch(
        `${API_BASE}/vista/erx/history?dfn=${encodeURIComponent(dfn)}`,
        { credentials: 'include' },
      );
      const d = await r.json();
      if (d.ok) {
        setHistory(d.data ?? []);
      } else {
        setHistoryError(d.error ?? 'Failed to load prescription history');
      }
    } catch (e: any) {
      setHistoryError(e.message ?? 'Network error');
    }
    setHistoryLoading(false);
  }, [dfn]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleRenew = useCallback(async (rx: Prescription) => {
    setActionLoading(`renew-${rx.id}`);
    try {
      const r = await fetch(`${API_BASE}/vista/erx/renew`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ dfn, prescriptionId: rx.id }),
      });
      const d = await r.json();
      if (d.ok) {
        fetchHistory();
      }
    } catch { /* handled by refresh */ }
    setActionLoading('');
  }, [dfn, fetchHistory]);

  const handleCancel = useCallback(async (rx: Prescription) => {
    setActionLoading(`cancel-${rx.id}`);
    try {
      const r = await fetch(`${API_BASE}/vista/erx/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({ dfn, prescriptionId: rx.id }),
      });
      const d = await r.json();
      if (d.ok) {
        fetchHistory();
        if (selectedRx?.id === rx.id) setSelectedRx(null);
      }
    } catch { /* handled by refresh */ }
    setActionLoading('');
  }, [dfn, fetchHistory, selectedRx]);

  const filteredHistory = useMemo(() => {
    if (historyFilter === 'all') return history;
    return history.filter(rx => rx.status.toLowerCase() === historyFilter);
  }, [history, historyFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { active: 0, discontinued: 0, expired: 0, pending: 0 };
    history.forEach(rx => {
      const s = rx.status.toLowerCase();
      counts[s] = (counts[s] ?? 0) + 1;
    });
    return counts;
  }, [history]);

  return (
    <div className={styles.content} style={{ padding: 16 }}>
      <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          e-Prescribing
          {history.length > 0 && (
            <span style={{ marginLeft: 8, fontSize: 12, fontWeight: 400, color: 'var(--cprs-text-muted)' }}>
              ({history.length} prescriptions)
            </span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => fetchHistory()} className={styles.toolbarBtn}>Refresh</button>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className={styles.subTabs} style={{ marginBottom: 16 }}>
        <button
          className={`${styles.subTab} ${activeTab === 'prescribe' ? styles.active : ''}`}
          onClick={() => setActiveTab('prescribe')}
        >
          New Prescription
        </button>
        <button
          className={`${styles.subTab} ${activeTab === 'history' ? styles.active : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Prescription History
          {history.length > 0 && (
            <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--cprs-accent)', color: '#fff', borderRadius: 8, padding: '1px 6px' }}>
              {history.length}
            </span>
          )}
        </button>
      </div>

      {/* PRESCRIBE TAB */}
      {activeTab === 'prescribe' && (
        <div>
          {prescribeSuccess && (
            <div style={{ padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 6, marginBottom: 12, fontSize: 12, color: '#166534' }}>
              {prescribeSuccess}
            </div>
          )}

          <div className={styles.sectionCard}>
            <div className={styles.sectionCardHeader}>
              <span>Drug Search</span>
            </div>
            <div className={styles.sectionCardBody}>
              <input
                className={styles.formInput}
                placeholder="Search drug name, NDC, or class..."
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); handleDrugSearch(e.target.value); }}
                style={{ width: '100%', marginBottom: 4 }}
              />
              {searching && <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>Searching formulary...</div>}
              {searchError && <div className={styles.errorText} style={{ fontSize: 11 }}>{searchError}</div>}
              {searchResults.length > 0 && (
                <div style={{
                  maxHeight: 200,
                  overflowY: 'auto',
                  border: '1px solid var(--cprs-border-light)',
                  borderRadius: 4,
                  marginTop: 4,
                  background: 'var(--cprs-surface)',
                }}>
                  {searchResults.map((drug, i) => (
                    <div
                      key={drug.ien || i}
                      onClick={() => selectDrug(drug)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--cprs-border-light)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--cprs-selected)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{drug.name}</div>
                        {drug.form && <span style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>{drug.form}</span>}
                      </div>
                      <span style={{
                        fontSize: 10,
                        padding: '2px 8px',
                        borderRadius: 8,
                        background: 'var(--cprs-border-light)',
                        color: 'var(--cprs-text-muted)',
                        fontWeight: 500,
                      }}>
                        {drug.drugClass}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {form.drugName && (
            <div className={styles.sectionCard} style={{ marginTop: 12 }}>
              <div className={styles.sectionCardHeader}>
                <span>Prescription Details — {form.drugName}</span>
              </div>
              <div className={styles.sectionCardBody}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      SIG (Patient Directions) *
                    </label>
                    <textarea
                      className={styles.formTextarea}
                      placeholder="e.g. Take 1 tablet by mouth once daily with food"
                      value={form.sig}
                      onChange={e => setForm(f => ({ ...f, sig: e.target.value }))}
                      rows={2}
                      style={{ width: '100%', resize: 'vertical' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Route
                    </label>
                    <select
                      className={styles.formSelect}
                      value={form.route}
                      onChange={e => setForm(f => ({ ...f, route: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      {ROUTES.map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Schedule
                    </label>
                    <select
                      className={styles.formSelect}
                      value={form.schedule}
                      onChange={e => setForm(f => ({ ...f, schedule: e.target.value }))}
                      style={{ width: '100%' }}
                    >
                      {SCHEDULES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Quantity
                    </label>
                    <input
                      className={styles.formInput}
                      type="number"
                      min={1}
                      value={form.quantity}
                      onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 1 }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Refills
                    </label>
                    <input
                      className={styles.formInput}
                      type="number"
                      min={0}
                      max={11}
                      value={form.refills}
                      onChange={e => setForm(f => ({ ...f, refills: parseInt(e.target.value) || 0 }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Days Supply
                    </label>
                    <input
                      className={styles.formInput}
                      type="number"
                      min={1}
                      value={form.daysSupply}
                      onChange={e => setForm(f => ({ ...f, daysSupply: parseInt(e.target.value) || 1 }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Pharmacy (optional)
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="Preferred pharmacy"
                      value={form.pharmacy}
                      onChange={e => setForm(f => ({ ...f, pharmacy: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                  <div style={{ gridColumn: '1 / -1' }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--cprs-text-muted)', display: 'block', marginBottom: 4 }}>
                      Pharmacist Notes (optional)
                    </label>
                    <input
                      className={styles.formInput}
                      placeholder="Additional notes for pharmacist"
                      value={form.notes}
                      onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                      style={{ width: '100%' }}
                    />
                  </div>
                </div>

                {prescribeError && <div className={styles.errorText} style={{ marginTop: 8 }}>{prescribeError}</div>}

                <div style={{ marginTop: 16, display: 'flex', gap: 8, borderTop: '1px solid var(--cprs-border-light)', paddingTop: 12 }}>
                  <button
                    className={styles.btn}
                    onClick={handlePrescribe}
                    disabled={prescribing}
                    style={{ background: 'var(--cprs-accent)', color: '#fff', border: 'none', borderRadius: 6, padding: '8px 20px', fontWeight: 600 }}
                  >
                    {prescribing ? 'Submitting...' : 'Submit Prescription'}
                  </button>
                  <button
                    className={styles.toolbarBtn}
                    onClick={() => { setForm(EMPTY_FORM); setSearchQuery(''); setPrescribeError(''); }}
                  >
                    Clear Form
                  </button>
                </div>
              </div>
            </div>
          )}

          {!form.drugName && !searchQuery && (
            <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--cprs-text-muted)' }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>Rx</div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Search for a drug to begin prescribing</div>
              <div style={{ fontSize: 12, marginTop: 4 }}>
                Enter a drug name, NDC code, or therapeutic class above
              </div>
            </div>
          )}
        </div>
      )}

      {/* HISTORY TAB */}
      {activeTab === 'history' && (
        <div>
          {historyLoading && <div className={styles.loadingText}>Loading prescription history...</div>}
          {historyError && <div className={styles.errorText}>{historyError}</div>}

          {!historyLoading && history.length > 0 && (
            <div className={styles.dashCardGrid} style={{ marginBottom: 16 }}>
              <div
                className={styles.dashCard}
                style={{ cursor: 'pointer', borderColor: historyFilter === 'all' ? 'var(--cprs-accent)' : undefined }}
                onClick={() => setHistoryFilter('all')}
              >
                <div className={styles.dashCardTitle}>Total</div>
                <div className={styles.dashCardCount}>{history.length}</div>
              </div>
              <div
                className={styles.dashCard}
                style={{ cursor: 'pointer', borderColor: historyFilter === 'active' ? '#16a34a' : undefined }}
                onClick={() => setHistoryFilter('active')}
              >
                <div className={styles.dashCardTitle} style={{ color: '#16a34a' }}>Active</div>
                <div className={styles.dashCardCount} style={{ color: '#16a34a' }}>{statusCounts.active ?? 0}</div>
              </div>
              <div
                className={styles.dashCard}
                style={{ cursor: 'pointer', borderColor: historyFilter === 'pending' ? '#d97706' : undefined }}
                onClick={() => setHistoryFilter('pending')}
              >
                <div className={styles.dashCardTitle} style={{ color: '#d97706' }}>Pending</div>
                <div className={styles.dashCardCount} style={{ color: '#d97706' }}>{statusCounts.pending ?? 0}</div>
              </div>
              <div
                className={styles.dashCard}
                style={{ cursor: 'pointer', borderColor: historyFilter === 'discontinued' ? '#dc2626' : undefined }}
                onClick={() => setHistoryFilter('discontinued')}
              >
                <div className={styles.dashCardTitle} style={{ color: '#dc2626' }}>D/C</div>
                <div className={styles.dashCardCount} style={{ color: '#dc2626' }}>{statusCounts.discontinued ?? 0}</div>
              </div>
            </div>
          )}

          {!historyLoading && (
            <div className={styles.splitPane}>
              <div className={styles.splitLeft} style={{ minWidth: 360 }}>
                {filteredHistory.length === 0 && (
                  <div className={styles.emptyText}>
                    {history.length === 0 ? 'No prescriptions on file' : `No ${historyFilter} prescriptions`}
                  </div>
                )}
                {filteredHistory.map(rx => (
                  <div
                    key={rx.id}
                    className={`${styles.tableRow} ${selectedRx?.id === rx.id ? styles.selected : ''}`}
                    onClick={() => setSelectedRx(rx)}
                    style={{
                      padding: '10px 14px',
                      cursor: 'pointer',
                      borderBottom: '1px solid var(--cprs-border-light)',
                      borderLeft: rx.status.toLowerCase() === 'active' ? '3px solid #16a34a' :
                        rx.status.toLowerCase() === 'pending' ? '3px solid #d97706' : '3px solid transparent',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>{rx.drugName}</div>
                        <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 2 }}>{rx.sig}</div>
                        <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)', marginTop: 2 }}>
                          Qty: {rx.quantity} | Refills: {rx.refills} | {rx.dateWritten}
                        </div>
                      </div>
                      <StatusBadge status={rx.status} />
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.splitRight} style={{ padding: 16 }}>
                {selectedRx ? (
                  <div>
                    <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700 }}>{selectedRx.drugName}</h3>
                    <div style={{ fontSize: 12, color: 'var(--cprs-text-muted)', marginBottom: 16 }}>
                      {selectedRx.drugClass}
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                      <div className={styles.dashCard}>
                        <div className={styles.dashCardTitle}>Status</div>
                        <div style={{ marginTop: 4 }}><StatusBadge status={selectedRx.status} /></div>
                      </div>
                      <div className={styles.dashCard}>
                        <div className={styles.dashCardTitle}>Rx ID</div>
                        <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{selectedRx.id}</div>
                      </div>
                    </div>

                    <div className={styles.sectionCard}>
                      <div className={styles.sectionCardHeader}><span>Prescription Details</span></div>
                      <div className={styles.sectionCardBody}>
                        <table style={{ width: '100%', fontSize: 12 }}>
                          <tbody>
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)', width: 120 }}>SIG</td><td style={{ padding: '4px 0' }}>{selectedRx.sig}</td></tr>
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Route</td><td style={{ padding: '4px 0' }}>{selectedRx.route}</td></tr>
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Schedule</td><td style={{ padding: '4px 0' }}>{selectedRx.schedule}</td></tr>
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Quantity</td><td style={{ padding: '4px 0' }}>{selectedRx.quantity}</td></tr>
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Refills</td><td style={{ padding: '4px 0' }}>{selectedRx.refills}</td></tr>
                            {selectedRx.daysSupply && <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Days Supply</td><td style={{ padding: '4px 0' }}>{selectedRx.daysSupply}</td></tr>}
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Prescriber</td><td style={{ padding: '4px 0' }}>{selectedRx.prescriber}</td></tr>
                            <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Written</td><td style={{ padding: '4px 0' }}>{selectedRx.dateWritten}</td></tr>
                            {selectedRx.dateExpires && <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Expires</td><td style={{ padding: '4px 0' }}>{selectedRx.dateExpires}</td></tr>}
                            {selectedRx.pharmacy && <tr><td style={{ fontWeight: 600, padding: '4px 8px 4px 0', color: 'var(--cprs-text-muted)' }}>Pharmacy</td><td style={{ padding: '4px 0' }}>{selectedRx.pharmacy}</td></tr>}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                      {(selectedRx.status.toLowerCase() === 'active' || selectedRx.status.toLowerCase() === 'expired') && (
                        <button
                          className={styles.btn}
                          onClick={() => handleRenew(selectedRx)}
                          disabled={!!actionLoading}
                          style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px' }}
                        >
                          {actionLoading === `renew-${selectedRx.id}` ? 'Renewing...' : 'Renew'}
                        </button>
                      )}
                      {selectedRx.status.toLowerCase() !== 'discontinued' && selectedRx.status.toLowerCase() !== 'expired' && (
                        <button
                          className={styles.btn}
                          onClick={() => handleCancel(selectedRx)}
                          disabled={!!actionLoading}
                          style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px' }}
                        >
                          {actionLoading === `cancel-${selectedRx.id}` ? 'Cancelling...' : 'Discontinue'}
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptyText}>
                    Select a prescription to view details
                  </div>
                )}
              </div>
            </div>
          )}

          {!historyLoading && history.length === 0 && (
            <div style={{ textAlign: 'center', padding: '40px 16px' }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.5 }}>Rx</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--cprs-text-muted)' }}>
                No Prescription History
              </div>
              <div style={{ fontSize: 12, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
                No e-prescriptions found for this patient
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
