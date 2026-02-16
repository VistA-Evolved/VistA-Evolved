'use client';

import { useState } from 'react';
import { useDataCache, type DraftOrder } from '@/stores/data-cache';
import styles from '../cprs.module.css';

interface Props { dfn: string; }

const ORDER_TYPES = ['med', 'lab', 'imaging', 'consult'] as const;
type OrderType = typeof ORDER_TYPES[number];

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://127.0.0.1:3001';

/* ------------------------------------------------------------------ */
/* Quick-order drug list (matches API backend Phase 8B)                */
/* ------------------------------------------------------------------ */
const QUICK_DRUGS = [
  'ASPIRIN', 'ATENOLOL', 'ATORVASTATIN', 'BENAZEPRIL', 'CANDESARTAN',
  'CAPTOPRIL', 'CARVEDILOL', 'ENALAPRIL', 'FLUVASTATIN', 'LISINOPRIL',
  'LOSARTAN', 'LOVASTATIN', 'METOPROLOL', 'NADOLOL', 'CLOPIDOGREL',
  'PRAVASTATIN', 'PROPRANOLOL', 'ROSUVASTATIN', 'SIMVASTATIN', 'WARFARIN',
];

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

  const orders = cache.getDomain(dfn, 'orders');

  const filteredOrders = orders.filter((o) => o.type === activeType);

  async function handleMedOrder() {
    if (!drug.trim()) return;
    setMedSaving(true);
    setMedMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/medications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      } else {
        setMedMsg(`Error: ${data.error}`);
      }
    } catch (e: unknown) {
      setMedMsg(`Error: ${(e as Error).message}`);
    } finally {
      setMedSaving(false);
    }
  }

  function handleDraftOrder(type: OrderType) {
    if (!draftName.trim()) return;
    cache.addDraftOrder(dfn, {
      id: `${type}-${Date.now()}`,
      type,
      name: draftName.trim(),
      status: 'draft',
      details: draftDetails.trim() || 'Draft order — backend integration pending',
      createdAt: new Date().toISOString(),
    });
    setDraftName('');
    setDraftDetails('');
    setShowComposer(false);
  }

  return (
    <div>
      <div className={styles.panelTitle}>Orders</div>
      <div className={styles.panelToolbar}>
        <button className={styles.btn} onClick={() => setShowComposer(!showComposer)}>
          {showComposer ? 'Close Composer' : '+ New Order'}
        </button>
      </div>

      {medMsg && <p style={{ color: medMsg.startsWith('Error') ? 'var(--cprs-danger)' : 'var(--cprs-success)', fontSize: 12, margin: '4px 0' }}>{medMsg}</p>}

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
                <textarea className={styles.formTextarea} value={draftDetails} onChange={(e) => setDraftDetails(e.target.value)} rows={4} />
              </div>
              <p className={styles.pendingText}>
                Backend integration pending for {activeType} orders.<br />
                Draft will be saved locally.
              </p>
              <button className={styles.btn} onClick={() => handleDraftOrder(activeType)} disabled={!draftName.trim()}>
                Save as Draft
              </button>
            </div>
          )}
        </div>
      )}

      {/* Orders List */}
      <div className={styles.subTabs}>
        {ORDER_TYPES.map((t) => (
          <button
            key={t}
            className={`${styles.subTab} ${activeType === t ? styles.active : ''}`}
            onClick={() => setActiveType(t)}
          >
            {t === 'med' ? 'Medication' : t === 'lab' ? 'Laboratory' : t === 'imaging' ? 'Imaging' : 'Consult'}
            {' '}({orders.filter((o) => o.type === t).length})
          </button>
        ))}
      </div>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft}>
          {filteredOrders.length === 0 ? (
            <p className={styles.emptyText}>No {activeType} orders</p>
          ) : (
            <table className={styles.dataTable}>
              <thead><tr><th>Order</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                {filteredOrders.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => setSelected(o)}
                    style={selected?.id === o.id ? { background: 'var(--cprs-selected)' } : undefined}
                  >
                    <td>{o.name}</td>
                    <td><span className={`${styles.badge} ${styles[o.status] || ''}`}>{o.status}</span></td>
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
              <div className={styles.formGroup}><label>Status</label><div><span className={`${styles.badge} ${styles[selected.status] || ''}`}>{selected.status}</span></div></div>
              <div className={styles.formGroup}><label>Details</label><div>{selected.details}</div></div>
              <div className={styles.formGroup}><label>Created</label><div>{new Date(selected.createdAt).toLocaleString()}</div></div>
              <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                {(selected.status === 'draft' || selected.status === 'unsigned') && (
                  <button className={styles.btn} onClick={() => cache.updateOrderStatus(dfn, selected.id, 'signed')}>
                    Sign Order
                  </button>
                )}
                {selected.status !== 'discontinued' && (
                  <button className={styles.btnDanger} onClick={() => cache.updateOrderStatus(dfn, selected.id, 'discontinued')}>
                    Discontinue
                  </button>
                )}
              </div>
            </div>
          ) : (
            <p className={styles.emptyText}>Select an order to view details</p>
          )}
        </div>
      </div>
    </div>
  );
}
