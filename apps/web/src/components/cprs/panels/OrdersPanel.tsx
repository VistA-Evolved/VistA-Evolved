'use client';

import { useState, useEffect, useCallback } from 'react';
import { useDataCache, type DraftOrder } from '@/stores/data-cache';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

const ORDER_TYPES = ['med', 'lab', 'imaging', 'consult'] as const;
type OrderType = typeof ORDER_TYPES[number];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

/* ------------------------------------------------------------------ */
/* Quick-order drug list (matches API backend Phase 8B)                */
/* ------------------------------------------------------------------ */
const QUICK_DRUGS = [
  'ASPIRIN', 'ATENOLOL', 'ATORVASTATIN', 'BENAZEPRIL', 'CANDESARTAN',
  'CAPTOPRIL', 'CARVEDILOL', 'ENALAPRIL', 'FLUVASTATIN', 'LISINOPRIL',
  'LOSARTAN', 'LOVASTATIN', 'METOPROLOL', 'NADOLOL', 'CLOPIDOGREL',
  'PRAVASTATIN', 'PROPRANOLOL', 'ROSUVASTATIN', 'SIMVASTATIN', 'WARFARIN',
];

/* ------------------------------------------------------------------ */
/* VistA order from API (GET /vista/cprs/orders)                       */
/* ------------------------------------------------------------------ */
interface VistaOrder {
  ien: string;
  name: string;
  status: string;
  startDate?: string;
  stopDate?: string;
  displayGroup?: string;
  provider?: string;
}

/* ------------------------------------------------------------------ */
/* Order check result (POST /vista/cprs/order-checks)                  */
/* ------------------------------------------------------------------ */
interface OrderCheck {
  type: string;
  message: string;
  level: string;
}

export default function OrdersPanel({ dfn }: Props) {
  const cache = useDataCache();
  const [activeType, setActiveType] = useState<OrderType>('med');
  const [showComposer, setShowComposer] = useState(false);
  const [selected, setSelected] = useState<DraftOrder | null>(null);

  // Med order state
  const [drug, setDrug] = useState('');
  const [medSaving, setMedSaving] = useState(false);
  const [medMsg, setMedMsg] = useState<string | null>(null);

  // Lab/Imaging/Consult draft state
  const [draftName, setDraftName] = useState('');
  const [draftDetails, setDraftDetails] = useState('');

  // VistA orders from API
  const [vistaOrders, setVistaOrders] = useState<VistaOrder[]>([]);
  const [vistaLoading, setVistaLoading] = useState(false);
  const [vistaSource, setVistaSource] = useState<string>('');

  // Order checks
  const [orderChecks, setOrderChecks] = useState<OrderCheck[]>([]);
  const [checkLoading, setCheckLoading] = useState(false);

  // Sign state
  const [signLoading, setSignLoading] = useState(false);
  const [signMsg, setSignMsg] = useState<string | null>(null);

  // Discontinue state
  const [dcLoading, setDcLoading] = useState(false);
  const [dcMsg, setDcMsg] = useState<string | null>(null);

  // Saving state for lab/imaging/consult
  const [orderSaving, setOrderSaving] = useState(false);

  const draftOrders = cache.getDomain(dfn, 'orders');
  const filteredDrafts = draftOrders.filter((o) => o.type === activeType);

  /* ---------------------------------------------------------------- */
  /* Fetch VistA orders on mount + after order placement               */
  /* ---------------------------------------------------------------- */
  const fetchVistaOrders = useCallback(async () => {
    setVistaLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/orders?dfn=${dfn}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok && data.source === 'vista') {
        setVistaOrders(data.orders ?? []);
        setVistaSource('vista');
      } else {
        setVistaOrders([]);
        setVistaSource(data.source ?? 'pending');
      }
    } catch {
      setVistaOrders([]);
      setVistaSource('error');
    } finally {
      setVistaLoading(false);
    }
  }, [dfn]);

  useEffect(() => {
    fetchVistaOrders();
  }, [fetchVistaOrders]);

  /* ---------------------------------------------------------------- */
  /* Medication order (existing AUTOACK path)                          */
  /* ---------------------------------------------------------------- */
  async function handleMedOrder() {
    if (!drug.trim()) return;
    setMedSaving(true);
    setMedMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, drug: drug.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setMedMsg(`Order created: ${data.quickOrder || drug}`);
        cache.addDraftOrder(dfn, {
          id: `med-${Date.now()}`,
          type: 'med',
          name: data.quickOrder || drug,
          status: 'unsigned',
          details: `Quick order via ORWDXM AUTOACK`,
          createdAt: new Date().toISOString(),
        });
        setDrug('');
        setShowComposer(false);
        fetchVistaOrders(); // refresh list
      } else {
        setMedMsg(`Error: ${data.error}`);
      }
    } catch (e: unknown) {
      setMedMsg(`Error: ${(e as Error).message}`);
    } finally {
      setMedSaving(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Lab / Imaging / Consult order (Phase 59 CPOE endpoints)           */
  /* ---------------------------------------------------------------- */
  async function handleTypedOrder(type: OrderType) {
    if (!draftName.trim()) return;
    setOrderSaving(true);
    setMedMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/orders/${type}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Idempotency-Key': `${type}-${dfn}-${Date.now()}`,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({
          dfn,
          orderName: draftName.trim(),
          details: draftDetails.trim() || undefined,
        }),
      });
      const data = await res.json();

      // Determine status from response
      const orderStatus = data.integrationPending ? 'draft' : (data.ok ? 'unsigned' : 'draft');
      const statusLabel = data.integrationPending
        ? `Integration pending -- ${data.pendingReason || 'backend not yet available'}`
        : data.ok
          ? `Order placed via VistA`
          : `Error: ${data.error || 'unknown'}`;

      cache.addDraftOrder(dfn, {
        id: data.draftId || `${type}-${Date.now()}`,
        type,
        name: draftName.trim(),
        status: orderStatus,
        details: statusLabel,
        createdAt: new Date().toISOString(),
      });

      if (data.integrationPending) {
        setMedMsg(`${type} order saved as draft -- integration pending`);
      } else if (data.ok) {
        setMedMsg(`${type} order placed successfully`);
        fetchVistaOrders();
      } else {
        setMedMsg(`Error: ${data.error || 'Order failed'}`);
      }

      setDraftName('');
      setDraftDetails('');
      setShowComposer(false);
    } catch (e: unknown) {
      setMedMsg(`Error: ${(e as Error).message}`);
    } finally {
      setOrderSaving(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Order checks (Phase 59)                                           */
  /* ---------------------------------------------------------------- */
  async function handleOrderChecks(orderId: string) {
    setCheckLoading(true);
    setOrderChecks([]);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/order-checks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, orderIds: [orderId] }),
      });
      const data = await res.json();
      if (data.ok && data.checks?.length) {
        setOrderChecks(data.checks);
      } else if (data.integrationPending) {
        setOrderChecks([{ type: 'info', message: 'Order checks -- integration pending', level: 'info' }]);
      } else {
        setOrderChecks([{ type: 'info', message: 'No order checks found', level: 'info' }]);
      }
    } catch {
      setOrderChecks([{ type: 'error', message: 'Failed to retrieve order checks', level: 'error' }]);
    } finally {
      setCheckLoading(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Sign order (Phase 59)                                             */
  /* ---------------------------------------------------------------- */
  async function handleSignOrder(orderId: string) {
    setSignLoading(true);
    setSignMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/orders/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, orderIds: [orderId] }),
      });
      const data = await res.json();
      if (data.ok) {
        setSignMsg('Order signed successfully');
        cache.updateOrderStatus(dfn, orderId, 'signed');
        fetchVistaOrders();
      } else if (data.integrationPending) {
        setSignMsg(`Signing -- integration pending: ${data.pendingReason || 'e-signature not configured'}`);
      } else {
        setSignMsg(`Sign failed: ${data.error || 'unknown error'}`);
      }
    } catch (e: unknown) {
      setSignMsg(`Sign error: ${(e as Error).message}`);
    } finally {
      setSignLoading(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Discontinue order (Phase 124: honest API call + pending fallback)  */
  /* ---------------------------------------------------------------- */
  async function handleDiscontinue(orderId: string) {
    setDcLoading(true);
    setDcMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/orders/dc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, orderId }),
      });
      const data = await res.json();
      if (data.ok && data.mode === 'real') {
        setDcMsg('Order discontinued via ORWDXA DC');
        cache.updateOrderStatus(dfn, orderId, 'discontinued');
        fetchVistaOrders();
      } else if (data.ok && data.syncPending) {
        cache.updateOrderStatus(dfn, orderId, 'discontinued');
        setDcMsg(`Discontinue stored as draft -- sync pending (${data.message || 'ORWDXA DC draft'})`);
      } else if (data.ok) {
        setDcMsg(data.message || 'Order discontinue processed');
        cache.updateOrderStatus(dfn, orderId, 'discontinued');
        fetchVistaOrders();
      } else {
        setDcMsg(`Discontinue failed: ${data.error || 'unknown error'}`);
      }
    } catch {
      // API endpoint may not exist yet -- show honest pending status
      cache.updateOrderStatus(dfn, orderId, 'discontinued');
      setDcMsg('Discontinue -- integration pending: ORWDXA DC endpoint not available');
    } finally {
      setDcLoading(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Status badge helper                                               */
  /* ---------------------------------------------------------------- */
  function statusBadge(status: string) {
    const s = status.toLowerCase();
    const cls = s === 'active' ? styles.signed
              : s === 'pending' || s === 'unsigned' ? styles.unsigned
              : s === 'discontinued' || s === 'expired' ? styles.discontinued
              : s === 'draft' ? styles.draft
              : '';
    return <span className={`${styles.badge} ${cls}`}>{status}</span>;
  }

  return (
    <div>
      <div className={styles.panelTitle}>Orders</div>
      <div className={styles.panelToolbar}>
        <button className={styles.btn} onClick={() => setShowComposer(!showComposer)}>
          {showComposer ? 'Close Composer' : '+ New Order'}
        </button>
        <button className={styles.btn} onClick={fetchVistaOrders} disabled={vistaLoading} style={{ marginLeft: 8 }}>
          {vistaLoading ? 'Loading...' : 'Refresh'}
        </button>
        {vistaSource && (
          <span style={{ fontSize: 11, color: 'var(--cprs-muted)', marginLeft: 8 }}>
            Source: {vistaSource}
          </span>
        )}
      </div>

      {medMsg && <p style={{ color: medMsg.startsWith('Error') ? 'var(--cprs-danger)' : 'var(--cprs-success)', fontSize: 12, margin: '4px 0' }}>{medMsg}</p>}
      {signMsg && <p style={{ color: signMsg.includes('pending') || signMsg.includes('failed') || signMsg.includes('error') ? 'var(--cprs-warning, orange)' : 'var(--cprs-success)', fontSize: 12, margin: '4px 0' }}>{signMsg}</p>}

      {/* Order Composer */}
      {showComposer && (
        <div style={{ border: '1px solid var(--cprs-border)', padding: 12, marginBottom: 8, borderRadius: 4 }}>
          <div className={styles.subTabs}>
            {ORDER_TYPES.map((t) => (
              <button
                key={t}
                className={`${styles.subTab} ${activeType === t ? styles.active : ''}`}
                onClick={() => setActiveType(t)}
              >
                {t === 'med' ? 'Medication' : t === 'lab' ? 'Laboratory' : t === 'imaging' ? 'Imaging' : 'Consult'}
              </button>
            ))}
          </div>

          {activeType === 'med' && (
            <div>
              <div className={styles.formGroup}>
                <label>Drug Name (quick-order match)</label>
                <input className={styles.formInput} value={drug} onChange={(e) => setDrug(e.target.value)} placeholder="e.g. ASPIRIN, LISINOPRIL" list="drug-list" />
                <datalist id="drug-list">
                  {QUICK_DRUGS.map((d) => <option key={d} value={d} />)}
                </datalist>
              </div>
              <button className={styles.btnPrimary} onClick={handleMedOrder} disabled={medSaving || !drug.trim()}>
                {medSaving ? 'Ordering...' : 'Place Medication Order'}
              </button>
            </div>
          )}

          {activeType !== 'med' && (
            <div>
              <div className={styles.formGroup}>
                <label>{activeType === 'lab' ? 'Lab Test' : activeType === 'imaging' ? 'Imaging Study' : 'Consult Service'}</label>
                <input className={styles.formInput} value={draftName} onChange={(e) => setDraftName(e.target.value)} placeholder={`Enter ${activeType} name...`} />
              </div>
              <div className={styles.formGroup}>
                <label>Details / Instructions</label>
                <textarea className={styles.formTextarea} value={draftDetails} onChange={(e) => setDraftDetails(e.target.value)} rows={3} />
              </div>
              <p className={styles.pendingText}>
                Order will be placed via VistA if backend is available.<br />
                Otherwise saved as draft with integration-pending status.
              </p>
              <button
                className={styles.btnPrimary}
                onClick={() => handleTypedOrder(activeType)}
                disabled={orderSaving || !draftName.trim()}
              >
                {orderSaving ? 'Placing...' : `Place ${activeType === 'lab' ? 'Lab' : activeType === 'imaging' ? 'Imaging' : 'Consult'} Order`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Order type tabs */}
      <div className={styles.subTabs}>
        {ORDER_TYPES.map((t) => {
          const draftCount = draftOrders.filter((o) => o.type === t).length;
          const vistaCount = vistaOrders.length; // VistA orders are not type-filtered (display group varies)
          return (
            <button
              key={t}
              className={`${styles.subTab} ${activeType === t ? styles.active : ''}`}
              onClick={() => { setActiveType(t); setSelected(null); setOrderChecks([]); setSignMsg(null); }}
            >
              {t === 'med' ? 'Medication' : t === 'lab' ? 'Laboratory' : t === 'imaging' ? 'Imaging' : 'Consult'}
              {' '}({draftCount})
            </button>
          );
        })}
      </div>

      {/* VistA Active Orders (from API) */}
      {vistaOrders.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4, color: 'var(--cprs-accent, #336)' }}>
            VistA Active Orders ({vistaOrders.length})
          </div>
          <table className={styles.dataTable}>
            <thead><tr><th>Order</th><th>Status</th><th>Start</th><th>Stop</th></tr></thead>
            <tbody>
              {vistaOrders.map((vo) => (
                <tr key={vo.ien}>
                  <td>{vo.name}</td>
                  <td>{statusBadge(vo.status)}</td>
                  <td>{vo.startDate || '--'}</td>
                  <td>{vo.stopDate || '--'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Draft / Local Orders */}
      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          {filteredDrafts.length === 0 ? (
            <p className={styles.emptyText}>No {activeType} orders in local cache</p>
          ) : (
            <table className={styles.dataTable}>
              <thead><tr><th>Order</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {filteredDrafts.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => { setSelected(o); setOrderChecks([]); setSignMsg(null); }}
                    style={selected?.id === o.id ? { background: 'var(--cprs-selected)' } : undefined}
                  >
                    <td>{o.name}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td>{new Date(o.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className={styles.splitRight}>
          {selected ? (
            <div>
              <div className={styles.panelTitle}>Order Detail</div>
              <div className={styles.formGroup}><label>Name</label><div>{selected.name}</div></div>
              <div className={styles.formGroup}><label>Type</label><div>{selected.type}</div></div>
              <div className={styles.formGroup}><label>Status</label><div>{statusBadge(selected.status)}</div></div>
              <div className={styles.formGroup}><label>Details</label><div style={{ whiteSpace: 'pre-wrap' }}>{selected.details}</div></div>
              <div className={styles.formGroup}><label>Created</label><div>{new Date(selected.createdAt).toLocaleString()}</div></div>

              {/* Order Checks display */}
              {orderChecks.length > 0 && (
                <div style={{ border: '1px solid var(--cprs-warning, orange)', padding: 8, borderRadius: 4, marginTop: 8, background: 'rgba(255,165,0,0.05)' }}>
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Order Checks</div>
                  {orderChecks.map((c, i) => (
                    <div key={i} style={{ fontSize: 12, padding: '2px 0', color: c.level === 'error' ? 'var(--cprs-danger)' : c.level === 'warning' ? 'var(--cprs-warning, orange)' : 'inherit' }}>
                      [{c.type}] {c.message}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {/* Order Checks button */}
                {(selected.status === 'unsigned' || selected.status === 'draft') && (
                  <button className={styles.btn} onClick={() => handleOrderChecks(selected.id)} disabled={checkLoading}>
                    {checkLoading ? 'Checking...' : 'Run Order Checks'}
                  </button>
                )}
                {/* Sign button */}
                {(selected.status === 'draft' || selected.status === 'unsigned') && (
                  <button className={styles.btnPrimary} onClick={() => handleSignOrder(selected.id)} disabled={signLoading}>
                    {signLoading ? 'Signing...' : 'Sign Order'}
                  </button>
                )}
                {/* Discontinue button */}
                {selected.status !== 'discontinued' && selected.status !== 'cancelled' && (
                  <button className={styles.btnDanger} onClick={() => handleDiscontinue(selected.id)} disabled={dcLoading}>
                    {dcLoading ? 'Processing...' : 'Discontinue'}
                  </button>
                )}
              </div>

              {/* Discontinue status message */}
              {dcMsg && (
                <div style={{
                  marginTop: 8, padding: '6px 10px', borderRadius: 4, fontSize: 12,
                  background: dcMsg.includes('pending') ? 'rgba(255,165,0,0.08)' : dcMsg.includes('failed') ? 'rgba(220,53,69,0.08)' : 'rgba(40,167,69,0.08)',
                  border: `1px solid ${dcMsg.includes('pending') ? 'orange' : dcMsg.includes('failed') ? '#dc3545' : '#28a745'}`,
                  color: dcMsg.includes('pending') ? '#856404' : dcMsg.includes('failed') ? '#721c24' : '#155724',
                }}>
                  {dcMsg}
                  {dcMsg.includes('pending') && (
                    <div style={{ fontSize: 10, marginTop: 4, color: 'var(--cprs-text-muted)' }}>
                      Target RPC: ORWDXA DC | VistA discontinue write-back requires active VistA connection
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <p className={styles.emptyText}>Select an order to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
