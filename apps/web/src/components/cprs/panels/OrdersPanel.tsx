'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useDataCache, type DraftOrder } from '@/stores/data-cache';
import { usePatient } from '@/stores/patient-context';
import { SESSION_EXPIRED_EVENT, useSession } from '@/stores/session-context';
import { csrfHeaders } from '@/lib/csrf';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';

interface Props {
  dfn: string;
}

const ORDER_TYPES = ['med', 'lab', 'imaging', 'consult'] as const;
type OrderType = (typeof ORDER_TYPES)[number];

/* ------------------------------------------------------------------ */
/* Quick-order drug list (matches API backend Phase 8B)                */
/* ------------------------------------------------------------------ */
const QUICK_DRUGS = [
  'ASPIRIN',
  'ATENOLOL',
  'ATORVASTATIN',
  'BENAZEPRIL',
  'CANDESARTAN',
  'CAPTOPRIL',
  'CARVEDILOL',
  'ENALAPRIL',
  'FLUVASTATIN',
  'LISINOPRIL',
  'LOSARTAN',
  'LOVASTATIN',
  'METOPROLOL',
  'NADOLOL',
  'CLOPIDOGREL',
  'PRAVASTATIN',
  'PROPRANOLOL',
  'ROSUVASTATIN',
  'SIMVASTATIN',
  'WARFARIN',
];

/* ------------------------------------------------------------------ */
/* VistA order from API (GET /vista/cprs/orders)                       */
/* ------------------------------------------------------------------ */
interface VistaOrder {
  id: string;
  ien: string;
  name: string;
  details: string;
  status: string;
  startDate?: string;
  stopDate?: string;
  displayGroup?: string;
  provider?: string;
  packageRef?: string;
  orderType?: OrderType;
  textSource?: string;
  raw?: string;
  rawDetail?: string[];
}

type SelectedOrder = DraftOrder | VistaOrder;

function isVistaOrder(order: SelectedOrder | null): order is VistaOrder {
  return !!order && 'ien' in order && 'textSource' in order;
}

function isDraftOrder(order: SelectedOrder | null): order is DraftOrder {
  return !!order && 'createdAt' in order && 'type' in order && !('textSource' in order);
}

function selectedOrderKey(order: SelectedOrder | null): string | null {
  if (!order) return null;
  return isVistaOrder(order) ? `vista:${order.ien}` : `draft:${order.id}`;
}

function formatFilemanDate(value?: string): string | undefined {
  if (!value || !/^\d{7}(?:\.\d+)?$/.test(value)) return undefined;
  const [datePart] = value.split('.');
  const year = parseInt(datePart.slice(0, 3), 10) + 1700;
  const month = datePart.slice(3, 5);
  const day = datePart.slice(5, 7);
  return `${year}-${month}-${day}`;
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
  const { dfn: patientDfn, demographics } = usePatient();
  const { ready: sessionReady, authenticated } = useSession();
  const pendingRetryCount = useRef(0);
  const [activeType, setActiveType] = useState<OrderType>('med');
  const [showComposer, setShowComposer] = useState(false);
  const [selected, setSelected] = useState<SelectedOrder | null>(null);

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

  // Sign state (Phase 154: esCode required for real signing)
  const [signLoading, setSignLoading] = useState(false);
  const [signMsg, setSignMsg] = useState<string | null>(null);
  const [esCode, setEsCode] = useState('');

  // Verify / flag state
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [flagLoading, setFlagLoading] = useState(false);
  const [flagMsg, setFlagMsg] = useState<string | null>(null);
  const [flagReason, setFlagReason] = useState('Review requested');

  // Discontinue state
  const [dcLoading, setDcLoading] = useState(false);
  const [dcMsg, setDcMsg] = useState<string | null>(null);

  // Saving state for lab/imaging/consult
  const [orderSaving, setOrderSaving] = useState(false);

  const draftOrders = cache.getDomain(dfn, 'orders');
  const filteredDrafts = draftOrders.filter((o) => o.type === activeType);
  const filteredVistaOrders = vistaOrders.filter(
    (order) => !order.orderType || order.orderType === activeType
  );
  const selectedVistaOrderIen = selected
    ? isVistaOrder(selected)
      ? selected.ien
      : selected.vistaOrderIen
    : undefined;
  const selectedHasVistaActions = !!selectedVistaOrderIen && !!selected && (isVistaOrder(selected) || selected.source === 'vista');
  const selectedCanRunOrderChecks =
    !!selected &&
    selectedHasVistaActions &&
    (!isVistaOrder(selected) || selected.status === 'unsigned' || selected.status === 'pending');

  /* ---------------------------------------------------------------- */
  /* Fetch VistA orders on mount + after order placement               */
  /* ---------------------------------------------------------------- */
  const fetchVistaOrders = useCallback(async () => {
    if (!sessionReady || !authenticated) {
      return;
    }

    setVistaLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/orders?dfn=${dfn}`, {
        credentials: 'include',
      });

      if (!res.ok) {
        setVistaOrders([]);
        if (res.status === 401) {
          window.dispatchEvent(new Event(SESSION_EXPIRED_EVENT));
          setVistaSource('session-expired');
          return;
        }
        setVistaSource(`http-${res.status}`);
        return;
      }

      const data = await res.json();
      if (data.ok && data.source === 'vista') {
        const normalized = (data.orders ?? []).map((order: any) => ({
          id: String(order.id ?? order.ien ?? ''),
          ien: String(order.ien ?? order.id ?? ''),
          name: String(order.name ?? order.text ?? order.raw ?? order.id ?? 'Unnamed order'),
          details: String(order.details ?? order.name ?? order.text ?? order.raw ?? ''),
          status: String(order.status || 'active'),
          startDate: order.startDate ?? formatFilemanDate(order.timestamp),
          stopDate: order.stopDate ?? undefined,
          displayGroup: order.displayGroup ?? '',
          provider: order.provider ?? '',
          packageRef: order.packageRef ?? '',
          orderType: order.orderType ?? undefined,
          textSource: order.textSource ?? 'ORWORR AGET',
          raw: order.raw ?? '',
          rawDetail: Array.isArray(order.rawDetail) ? order.rawDetail : [],
        }));
        setVistaOrders(normalized);
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
  }, [authenticated, dfn, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !authenticated) return;
    fetchVistaOrders();
  }, [authenticated, fetchVistaOrders, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !authenticated) return;
    if (patientDfn !== dfn || !demographics) return;
    fetchVistaOrders();
  }, [authenticated, demographics, dfn, fetchVistaOrders, patientDfn, sessionReady]);

  useEffect(() => {
    if (!sessionReady || !authenticated) return;

    if (vistaSource === 'vista') {
      pendingRetryCount.current = 0;
      return;
    }

    if (vistaLoading || vistaSource !== 'pending' || pendingRetryCount.current >= 2) return;

    pendingRetryCount.current += 1;

    const retryTimer = window.setTimeout(() => {
      fetchVistaOrders();
    }, 1000);

    return () => window.clearTimeout(retryTimer);
  }, [authenticated, fetchVistaOrders, sessionReady, vistaLoading, vistaSource]);

  useEffect(() => {
    pendingRetryCount.current = 0;
  }, [dfn]);

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
        const orderName = data.quickOrder || drug;
        if (data.orderIEN) {
          setMedMsg(`Order created: ${orderName}`);
          cache.addDraftOrder(dfn, {
            id: `vista-med-${data.orderIEN}`,
            type: 'med',
            name: orderName,
            status: 'unsigned',
            details: 'Medication order created in VistA.',
            createdAt: new Date().toISOString(),
            source: 'vista',
            vistaOrderIen: String(data.orderIEN),
          });
        } else if (data.mode === 'draft' || data.syncPending || data.status === 'sync-pending') {
          cache.addDraftOrder(dfn, {
            id: data.draftId || `med-${Date.now()}`,
            type: 'med',
            name: orderName,
            status: 'draft',
            details: data.message || 'Medication order saved as draft and is awaiting VistA sync.',
            createdAt: new Date().toISOString(),
            source: 'server-draft',
          });
          setMedMsg(data.message || `Medication order saved as draft -- sync pending (${orderName})`);
        } else {
          setMedMsg(data.message || `Medication order processed: ${orderName}`);
        }
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
          'Idempotency-Key': `${type}-${dfn}-${Date.now()}`,
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

      if (data.ok && data.orderIEN) {
        cache.addDraftOrder(dfn, {
          id: `vista-${type}-${data.orderIEN}`,
          type,
          name: draftName.trim(),
          status: data.status === 'unsigned' ? 'unsigned' : 'draft',
          details: data.message || 'Order placed via VistA.',
          createdAt: new Date().toISOString(),
          source: 'vista',
          vistaOrderIen: String(data.orderIEN),
        });
        setMedMsg(`${type} order placed successfully`);
        fetchVistaOrders();
      } else if (data.mode === 'draft' || data.integrationPending || data.status === 'unsupported-in-sandbox') {
        cache.addDraftOrder(dfn, {
          id: data.draftId || `${type}-${Date.now()}`,
          type,
          name: draftName.trim(),
          status: 'draft',
          details: data.message || data.pendingNote || 'Integration pending',
          createdAt: new Date().toISOString(),
          source: 'server-draft',
        });
        setMedMsg(`${type} order saved as draft -- integration pending`);
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
        setOrderChecks([
          { type: 'info', message: 'Order checks -- integration pending', level: 'info' },
        ]);
      } else {
        setOrderChecks([{ type: 'info', message: 'No order checks found', level: 'info' }]);
      }
    } catch {
      setOrderChecks([
        { type: 'error', message: 'Failed to retrieve order checks', level: 'error' },
      ]);
    } finally {
      setCheckLoading(false);
    }
  }

  async function handleVerifyOrder(localOrderId: string | undefined, vistaOrderIen: string) {
    setVerifyLoading(true);
    setVerifyMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/orders/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, orderId: vistaOrderIen, verifyAction: 'E' }),
      });
      const data = await res.json();
      if (data.ok && data.status === 'verified') {
        setVerifyMsg('Order verification completed.');
        if (localOrderId) {
          cache.updateOrderStatus(dfn, localOrderId, 'released');
        }
        fetchVistaOrders();
        return;
      }
      if (data.ok && data.syncPending) {
        setVerifyMsg(data.message || 'Order verification stored as draft and marked sync-pending.');
        return;
      }
      setVerifyMsg(data.message || data.error || 'Order verification did not complete.');
    } catch (e: unknown) {
      setVerifyMsg(`Verify error: ${(e as Error).message}`);
    } finally {
      setVerifyLoading(false);
    }
  }

  async function handleFlagOrder(vistaOrderIen: string) {
    if (!flagReason.trim()) {
      setFlagMsg('Flag reason is required.');
      return;
    }
    setFlagLoading(true);
    setFlagMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/orders/flag`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, orderId: vistaOrderIen, flagReason: flagReason.trim() }),
      });
      const data = await res.json();
      if (data.ok) {
        setFlagMsg(data.message || 'Order flag submitted.');
        fetchVistaOrders();
        return;
      }
      setFlagMsg(data.message || data.error || 'Order flag did not complete.');
    } catch (e: unknown) {
      setFlagMsg(`Flag error: ${(e as Error).message}`);
    } finally {
      setFlagLoading(false);
    }
  }

  /* ---------------------------------------------------------------- */
  /* Sign order (Phase 59 / Phase 154: requires esCode)                */
  /* ---------------------------------------------------------------- */
  async function handleSignOrder(localOrderId: string | undefined, vistaOrderIen: string) {
    if (!esCode.trim()) {
      setSignMsg('E-signature code is required to sign orders.');
      return;
    }
    setSignLoading(true);
    setSignMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/orders/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': `sign-${vistaOrderIen}-${Date.now()}`,
          ...csrfHeaders(),
        },
        credentials: 'include',
        body: JSON.stringify({ dfn, orderIds: [vistaOrderIen], esCode: esCode.trim() }),
      });
      const data = await res.json();
      if (data.ok && data.status === 'signed') {
        setSignMsg('Order signed successfully');
        setEsCode('');
        if (localOrderId) {
          cache.updateOrderStatus(dfn, localOrderId, 'signed');
        }
        fetchVistaOrders();
      } else if (data.status === 'sign-blocked') {
        setSignMsg(`Signing blocked: ${data.message || 'e-signature verification failed'}`);
      } else if (data.status === 'sign-failed') {
        setSignMsg(
          `Signing failed: ${data.message || data.error || 'RPC call failed — retry or contact support'}`
        );
      } else if (
        data.status === 'integration-pending' ||
        data.status === 'unsupported-in-sandbox'
      ) {
        const label =
          data.status === 'unsupported-in-sandbox'
            ? 'unsupported in sandbox'
            : 'integration pending';
        setSignMsg(
          `Signing -- ${label}: ${data.pendingNote || data.message || 'ORWOR1 SIG not available'}`
        );
      } else if (data.ok) {
        setSignMsg(data.message || 'Order sign processed');
        fetchVistaOrders();
      } else {
        setSignMsg(`Sign failed: ${data.message || data.error || 'unknown error'}`);
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
  async function handleDiscontinue(localOrderId: string | undefined, vistaOrderIen: string) {
    setDcLoading(true);
    setDcMsg(null);
    try {
      const res = await fetch(`${API_BASE}/vista/cprs/orders/dc`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ dfn, orderId: vistaOrderIen }),
      });
      const data = await res.json();
      if (data.ok && data.mode === 'real') {
        setDcMsg('Order discontinued via ORWDXA DC');
        if (localOrderId) {
          cache.updateOrderStatus(dfn, localOrderId, 'discontinued');
        }
        fetchVistaOrders();
      } else if (data.ok && data.syncPending) {
        setDcMsg(
          `Discontinue stored as draft -- sync pending (${data.message || 'ORWDXA DC draft'})`
        );
          fetchVistaOrders();
      } else if (data.ok) {
        setDcMsg(data.message || 'Order discontinue processed');
        if (localOrderId) {
          cache.updateOrderStatus(dfn, localOrderId, 'discontinued');
        }
        fetchVistaOrders();
      } else {
        setDcMsg(`Discontinue failed: ${data.error || 'unknown error'}`);
      }
    } catch {
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
    const cls =
      s === 'active'
        ? styles.signed
        : s === 'pending' || s === 'unsigned'
          ? styles.unsigned
          : s === 'discontinued' || s === 'expired'
            ? styles.discontinued
            : s === 'draft'
              ? styles.draft
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
        <button
          className={styles.btn}
          onClick={fetchVistaOrders}
          disabled={vistaLoading}
          style={{ marginLeft: 8 }}
        >
          {vistaLoading ? 'Loading...' : 'Refresh'}
        </button>
        {vistaSource && (
          <span style={{ fontSize: 11, color: 'var(--cprs-muted)', marginLeft: 8 }}>
            Source: {vistaSource}
          </span>
        )}
      </div>

      {medMsg && (
        <p
          style={{
            color: medMsg.startsWith('Error') ? 'var(--cprs-danger)' : 'var(--cprs-success)',
            fontSize: 12,
            margin: '4px 0',
          }}
        >
          {medMsg}
        </p>
      )}
      {vistaSource === 'session-expired' && (
        <p
          style={{
            color: 'var(--cprs-warning, orange)',
            fontSize: 12,
            margin: '4px 0',
          }}
        >
          Session expired. Re-authenticate to resume live VistA order loading.
        </p>
      )}
      {signMsg && (
        <p
          style={{
            color:
              signMsg.includes('pending') || signMsg.includes('failed') || signMsg.includes('error')
                ? 'var(--cprs-warning, orange)'
                : 'var(--cprs-success)',
            fontSize: 12,
            margin: '4px 0',
          }}
        >
          {signMsg}
        </p>
      )}
      {verifyMsg && (
        <p
          style={{
            color: verifyMsg.includes('error') ? 'var(--cprs-danger)' : 'var(--cprs-success)',
            fontSize: 12,
            margin: '4px 0',
          }}
        >
          {verifyMsg}
        </p>
      )}
      {flagMsg && (
        <p
          style={{
            color:
              flagMsg.includes('error') || flagMsg.includes('required')
                ? 'var(--cprs-danger)'
                : 'var(--cprs-success)',
            fontSize: 12,
            margin: '4px 0',
          }}
        >
          {flagMsg}
        </p>
      )}

      {/* Order Composer */}
      {showComposer && (
        <div
          style={{
            border: '1px solid var(--cprs-border)',
            padding: 12,
            marginBottom: 8,
            borderRadius: 4,
          }}
        >
          <div className={styles.subTabs}>
            {ORDER_TYPES.map((t) => (
              <button
                key={t}
                className={`${styles.subTab} ${activeType === t ? styles.active : ''}`}
                onClick={() => setActiveType(t)}
              >
                {t === 'med'
                  ? 'Medication'
                  : t === 'lab'
                    ? 'Laboratory'
                    : t === 'imaging'
                      ? 'Imaging'
                      : 'Consult'}
              </button>
            ))}
          </div>

          {activeType === 'med' && (
            <div>
              <div className={styles.formGroup}>
                <label>Drug Name (quick-order match)</label>
                <input
                  className={styles.formInput}
                  value={drug}
                  onChange={(e) => setDrug(e.target.value)}
                  placeholder="e.g. ASPIRIN, LISINOPRIL"
                  list="drug-list"
                />
                <datalist id="drug-list">
                  {QUICK_DRUGS.map((d) => (
                    <option key={d} value={d} />
                  ))}
                </datalist>
              </div>
              <button
                className={styles.btnPrimary}
                onClick={handleMedOrder}
                disabled={medSaving || !drug.trim()}
              >
                {medSaving ? 'Ordering...' : 'Place Medication Order'}
              </button>
            </div>
          )}

          {activeType !== 'med' && (
            <div>
              <div className={styles.formGroup}>
                <label>
                  {activeType === 'lab'
                    ? 'Lab Test'
                    : activeType === 'imaging'
                      ? 'Imaging Study'
                      : 'Consult Service'}
                </label>
                <input
                  className={styles.formInput}
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  placeholder={`Enter ${activeType} name...`}
                />
              </div>
              <div className={styles.formGroup}>
                <label>Details / Instructions</label>
                <textarea
                  className={styles.formTextarea}
                  value={draftDetails}
                  onChange={(e) => setDraftDetails(e.target.value)}
                  rows={3}
                />
              </div>
              <p className={styles.pendingText}>
                Order will be placed via VistA if backend is available.
                <br />
                Otherwise saved as draft with integration-pending status.
              </p>
              <button
                className={styles.btnPrimary}
                onClick={() => handleTypedOrder(activeType)}
                disabled={orderSaving || !draftName.trim()}
              >
                {orderSaving
                  ? 'Placing...'
                  : `Place ${activeType === 'lab' ? 'Lab' : activeType === 'imaging' ? 'Imaging' : 'Consult'} Order`}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Order type tabs */}
      <div className={styles.subTabs}>
        {ORDER_TYPES.map((t) => {
          const draftCount = draftOrders.filter((o) => o.type === t).length;
          const vistaCount = vistaOrders.filter((o) => !o.orderType || o.orderType === t).length;
          return (
            <button
              key={t}
              className={`${styles.subTab} ${activeType === t ? styles.active : ''}`}
              onClick={() => {
                setActiveType(t);
                setSelected(null);
                setOrderChecks([]);
                setSignMsg(null);
                setVerifyMsg(null);
                setFlagMsg(null);
              }}
            >
              {t === 'med'
                ? 'Medication'
                : t === 'lab'
                  ? 'Laboratory'
                  : t === 'imaging'
                    ? 'Imaging'
                    : 'Consult'}{' '}
              ({draftCount + vistaCount})
            </button>
          );
        })}
      </div>

      {/* VistA Active Orders (from API) */}
      {filteredVistaOrders.length > 0 && (
        <div style={{ marginBottom: 8 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 4,
              color: 'var(--cprs-accent, #336)',
            }}
          >
            VistA Active Orders ({filteredVistaOrders.length})
          </div>
          <table className={styles.dataTable}>
            <thead>
              <tr>
                <th>Order</th>
                <th>Status</th>
                <th>Start</th>
                <th>Stop</th>
                <th>Provider</th>
              </tr>
            </thead>
            <tbody>
              {filteredVistaOrders.map((vo) => (
                <tr
                  key={vo.ien}
                  onClick={() => {
                    setSelected(vo);
                    setOrderChecks([]);
                    setSignMsg(null);
                    setVerifyMsg(null);
                    setFlagMsg(null);
                  }}
                  style={
                    selectedOrderKey(selected) === `vista:${vo.ien}`
                      ? { background: 'var(--cprs-selected)' }
                      : undefined
                  }
                >
                  <td>{vo.name}</td>
                  <td>{statusBadge(vo.status)}</td>
                  <td>{vo.startDate || '--'}</td>
                  <td>{vo.stopDate || '--'}</td>
                  <td>{vo.provider || '--'}</td>
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
            <p className={styles.emptyText}>
              {vistaSource === 'session-expired'
                ? 'Session expired before the live VistA order list could be refreshed.'
                : filteredVistaOrders.length > 0
                ? `No ${activeType} draft orders in local cache. Live VistA ${activeType} orders are shown above.`
                : `No ${activeType} draft orders in local cache.`}
            </p>
          ) : (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredDrafts.map((o) => (
                  <tr
                    key={o.id}
                    onClick={() => {
                      setSelected(o);
                      setOrderChecks([]);
                      setSignMsg(null);
                    }}
                    style={
                      selected?.id === o.id ? { background: 'var(--cprs-selected)' } : undefined
                    }
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
              <div className={styles.formGroup}>
                <label>Name</label>
                <div>{selected.name}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Type</label>
                <div>{isVistaOrder(selected) ? selected.orderType || 'unknown' : selected.type}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Status</label>
                <div>{statusBadge(selected.status)}</div>
              </div>
              <div className={styles.formGroup}>
                <label>Source</label>
                <div>{isVistaOrder(selected) ? 'vista-active-order' : selected.source || 'local'}</div>
              </div>
              {selectedVistaOrderIen && (
                <div className={styles.formGroup}>
                  <label>VistA Order IEN</label>
                  <div>{selectedVistaOrderIen}</div>
                </div>
              )}
              {isVistaOrder(selected) && (
                <>
                  <div className={styles.formGroup}>
                    <label>Text Source</label>
                    <div>{selected.textSource || 'ORWORR AGET'}</div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Display Group</label>
                    <div>{selected.displayGroup || '--'}</div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Provider</label>
                    <div>{selected.provider || '--'}</div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Package</label>
                    <div>{selected.packageRef || '--'}</div>
                  </div>
                  <div className={styles.formGroup}>
                    <label>Start / Stop</label>
                    <div>
                      {selected.startDate || '--'} / {selected.stopDate || '--'}
                    </div>
                  </div>
                </>
              )}
              <div className={styles.formGroup}>
                <label>Details</label>
                <div style={{ whiteSpace: 'pre-wrap' }}>
                  {isVistaOrder(selected)
                    ? selected.details || selected.raw || 'No detail text resolved from VistA.'
                    : selected.details}
                </div>
              </div>
              {isDraftOrder(selected) ? (
                <div className={styles.formGroup}>
                  <label>Created</label>
                  <div>{new Date(selected.createdAt).toLocaleString()}</div>
                </div>
              ) : null}

              {/* Order Checks display */}
              {orderChecks.length > 0 && (
                <div
                  style={{
                    border: '1px solid var(--cprs-warning, orange)',
                    padding: 8,
                    borderRadius: 4,
                    marginTop: 8,
                    background: 'rgba(255,165,0,0.05)',
                  }}
                >
                  <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>Order Checks</div>
                  {orderChecks.map((c, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12,
                        padding: '2px 0',
                        color:
                          c.level === 'error'
                            ? 'var(--cprs-danger)'
                            : c.level === 'warning'
                              ? 'var(--cprs-warning, orange)'
                              : 'inherit',
                      }}
                    >
                      [{c.type}] {c.message}
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {!selectedHasVistaActions && (
                  <div style={{ fontSize: 12, color: 'var(--cprs-warning, orange)' }}>
                    VistA follow-up actions are disabled until this order has a real VistA order IEN.
                  </div>
                )}
                {selectedHasVistaActions && !selectedCanRunOrderChecks && (
                  <div style={{ fontSize: 12, color: 'var(--cprs-warning, orange)' }}>
                    Order checks are available during new or unsigned order workflows. This active VistA order does not have the CPRS order-check session context required by the sandbox route.
                  </div>
                )}
                {/* Order Checks button */}
                {selectedCanRunOrderChecks && (
                  <button
                    className={styles.btn}
                    onClick={() => handleOrderChecks(selectedVistaOrderIen)}
                    disabled={checkLoading}
                  >
                    {checkLoading ? 'Checking...' : 'Run Order Checks'}
                  </button>
                )}
                {selectedHasVistaActions && (
                  <button
                    className={styles.btn}
                    onClick={() =>
                      handleVerifyOrder(isDraftOrder(selected) ? selected.id : undefined, selectedVistaOrderIen)
                    }
                    disabled={verifyLoading}
                  >
                    {verifyLoading ? 'Verifying...' : 'Verify Order'}
                  </button>
                )}
                {/* Sign button + esCode input (Phase 154) */}
                {selectedHasVistaActions && selected.status === 'unsigned' && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="password"
                      placeholder="E-Signature Code"
                      value={esCode}
                      onChange={(e) => setEsCode(e.target.value)}
                      style={{
                        width: 140,
                        padding: '4px 8px',
                        fontSize: 12,
                        borderRadius: 4,
                        border: '1px solid var(--cprs-border)',
                      }}
                      disabled={signLoading}
                      aria-label="Electronic signature code"
                    />
                    <button
                      className={styles.btnPrimary}
                      onClick={() =>
                        handleSignOrder(isDraftOrder(selected) ? selected.id : undefined, selectedVistaOrderIen)
                      }
                      disabled={signLoading || !esCode.trim()}
                    >
                      {signLoading ? 'Signing...' : 'Sign Order'}
                    </button>
                  </div>
                )}
                {/* Discontinue button */}
                {selectedHasVistaActions &&
                  selected.status !== 'discontinued' &&
                  selected.status !== 'cancelled' && (
                  <button
                    className={styles.btnDanger}
                    onClick={() =>
                      handleDiscontinue(isDraftOrder(selected) ? selected.id : undefined, selectedVistaOrderIen)
                    }
                    disabled={dcLoading}
                  >
                    {dcLoading ? 'Processing...' : 'Discontinue'}
                  </button>
                  )}
                {selectedHasVistaActions && (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <input
                      type="text"
                      placeholder="Flag reason"
                      value={flagReason}
                      onChange={(e) => setFlagReason(e.target.value)}
                      style={{
                        width: 160,
                        padding: '4px 8px',
                        fontSize: 12,
                        borderRadius: 4,
                        border: '1px solid var(--cprs-border)',
                      }}
                      disabled={flagLoading}
                    />
                    <button
                      className={styles.btn}
                      onClick={() => handleFlagOrder(selectedVistaOrderIen)}
                      disabled={flagLoading || !flagReason.trim()}
                    >
                      {flagLoading ? 'Flagging...' : 'Flag Order'}
                    </button>
                  </div>
                )}
              </div>

              {/* Discontinue status message */}
              {dcMsg && (
                <div
                  style={{
                    marginTop: 8,
                    padding: '6px 10px',
                    borderRadius: 4,
                    fontSize: 12,
                    background: dcMsg.includes('pending')
                      ? 'rgba(255,165,0,0.08)'
                      : dcMsg.includes('failed')
                        ? 'rgba(220,53,69,0.08)'
                        : 'rgba(40,167,69,0.08)',
                    border: `1px solid ${dcMsg.includes('pending') ? 'orange' : dcMsg.includes('failed') ? '#dc3545' : '#28a745'}`,
                    color: dcMsg.includes('pending')
                      ? '#856404'
                      : dcMsg.includes('failed')
                        ? '#721c24'
                        : '#155724',
                  }}
                >
                  {dcMsg}
                  {dcMsg.includes('pending') && (
                    <div style={{ fontSize: 10, marginTop: 4, color: 'var(--cprs-text-muted)' }}>
                      Target RPC: ORWDXA DC | VistA discontinue write-back requires active VistA
                      connection
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
