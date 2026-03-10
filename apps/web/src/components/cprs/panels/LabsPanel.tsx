'use client';

import { useEffect, useMemo, useState } from 'react';
import { useDataCache, type LabResult } from '@/stores/data-cache';
import { csrfHeaders } from '@/lib/csrf';
import { API_BASE } from '@/lib/api-config';
import styles from '../cprs.module.css';

interface Props {
  dfn: string;
}

type LabView = 'results' | 'history' | 'orders' | 'specimens' | 'alerts' | 'posture';

type LabOrderStatus =
  | 'pending'
  | 'collected'
  | 'in_process'
  | 'resulted'
  | 'reviewed'
  | 'verified'
  | 'final'
  | 'cancelled'
  | 'on_hold';

type SpecimenStatus =
  | 'ordered'
  | 'collected'
  | 'in_transit'
  | 'received'
  | 'processing'
  | 'completed'
  | 'rejected'
  | 'lost';

type AlertStatus = 'active' | 'acknowledged' | 'escalated' | 'resolved';

interface LabOrder {
  id: string;
  patientDfn: string;
  status: LabOrderStatus;
  testName: string;
  specimenType: string;
  priority: string;
  collectionInstructions: string;
  orderingProviderName: string;
  vistaOrderIen: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SpecimenSample {
  id: string;
  labOrderId: string;
  patientDfn: string;
  accessionNumber: string;
  specimenType: string;
  status: SpecimenStatus;
  collectionSite: string | null;
  containerType: string | null;
  rejectReason: string | null;
  collectedAt: string | null;
  receivedAt: string | null;
  deviceObservationIds: string[];
}

interface DeepLabResult {
  id: string;
  labOrderId: string;
  patientDfn: string;
  analyteName: string;
  value: string;
  units: string | null;
  referenceRange: string | null;
  flag: string;
  status: string;
  comment: string | null;
  source: string;
  resultedAt: string;
}

interface CriticalAlert {
  id: string;
  labResultId: string;
  labOrderId: string;
  patientDfn: string;
  analyteName: string;
  value: string;
  units: string | null;
  flag: string;
  threshold: string;
  status: AlertStatus;
  notifyProviderName: string;
  acknowledgedByName: string | null;
  acknowledgedAt: string | null;
  readBackVerified: boolean;
  escalationMinutes: number;
  createdAt: string;
}

interface LabDashboardStats {
  pendingOrders: number;
  specimensInTransit: number;
  resultsAwaitingReview: number;
  activeCriticalAlerts: number;
  completedToday: number;
  averageTurnaroundMinutes: number | null;
}

interface LabWritebackPostureEntry {
  rpc: string;
  status: 'available' | 'requires_config';
  note: string;
}

interface LabWritebackPosture {
  orderPlace: LabWritebackPostureEntry;
  resultAck: LabWritebackPostureEntry;
  resultVerify: LabWritebackPostureEntry;
  specimenCollect: LabWritebackPostureEntry;
  labReport: LabWritebackPostureEntry;
}

const ORDER_STATUSES: LabOrderStatus[] = [
  'pending',
  'collected',
  'in_process',
  'resulted',
  'reviewed',
  'verified',
  'final',
  'cancelled',
  'on_hold',
];

const SPECIMEN_STATUSES: SpecimenStatus[] = [
  'ordered',
  'collected',
  'in_transit',
  'received',
  'processing',
  'completed',
  'rejected',
  'lost',
];

const RESULT_STATUSES = ['preliminary', 'final', 'corrected', 'amended', 'cancelled'] as const;

const LAB_VIEWS: Array<{ key: LabView; label: string }> = [
  { key: 'results', label: 'Results' },
  { key: 'history', label: 'History' },
  { key: 'orders', label: 'Orders' },
  { key: 'specimens', label: 'Specimens' },
  { key: 'alerts', label: 'Critical Alerts' },
  { key: 'posture', label: 'Writeback Posture' },
];

const LAB_VIEW_STORAGE_PREFIX = 'cprs.labs.activeView';

function isLabView(value: string | null | undefined): value is LabView {
  return LAB_VIEWS.some((view) => view.key === value);
}

function getLabViewStorageKey(dfn: string): string {
  return `${LAB_VIEW_STORAGE_PREFIX}:${dfn}`;
}

function readStoredLabView(dfn: string): LabView {
  if (typeof window === 'undefined') return 'results';
  try {
    const stored = window.sessionStorage.getItem(getLabViewStorageKey(dfn));
    return isLabView(stored) ? stored : 'results';
  } catch {
    return 'results';
  }
}

function fmtDate(value?: string | null): string {
  if (!value) return '--';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function badgeTone(status: string): string {
  const normalized = status.toLowerCase();
  if (
    normalized === 'final' ||
    normalized === 'completed' ||
    normalized === 'verified' ||
    normalized === 'reviewed' ||
    normalized === 'available'
  ) {
    return 'active';
  }
  if (
    normalized === 'cancelled' ||
    normalized === 'rejected' ||
    normalized === 'lost' ||
    normalized === 'critical_high' ||
    normalized === 'critical_low'
  ) {
    return 'inactive';
  }
  if (
    normalized === 'pending' ||
    normalized === 'ordered' ||
    normalized === 'in_process' ||
    normalized === 'in_transit' ||
    normalized === 'processing' ||
    normalized === 'active' ||
    normalized === 'acknowledged' ||
    normalized === 'escalated'
  ) {
    return 'draft';
  }
  return 'queued';
}

function StatusBadge({ status }: { status: string }) {
  const tone = badgeTone(status);
  return <span className={`${styles.badge} ${styles[tone]}`}>{status.replace(/_/g, ' ')}</span>;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  return res.json();
}

async function sendJson<T>(path: string, method: 'POST' | 'PATCH', body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...csrfHeaders(),
    },
    credentials: 'include',
    body: JSON.stringify(body),
  });
  return res.json();
}

export default function LabsPanel({ dfn }: Props) {
  const { fetchDomain, getDomain, getDomainMeta, isLoading, acknowledgeLabs, createLabOrder } =
    useDataCache();

  const [activeView, setActiveView] = useState<LabView>(() => readStoredLabView(dfn));
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null);
  const [selectedAckIds, setSelectedAckIds] = useState<string[]>([]);
  const [ackMessage, setAckMessage] = useState<string | null>(null);
  const [ackLoading, setAckLoading] = useState(false);

  const [orders, setOrders] = useState<LabOrder[]>([]);
  const [specimens, setSpecimens] = useState<SpecimenSample[]>([]);
  const [workflowResults, setWorkflowResults] = useState<DeepLabResult[]>([]);
  const [alerts, setAlerts] = useState<CriticalAlert[]>([]);
  const [dashboard, setDashboard] = useState<LabDashboardStats | null>(null);
  const [posture, setPosture] = useState<LabWritebackPosture | null>(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [workflowError, setWorkflowError] = useState<string | null>(null);
  const [workflowMessage, setWorkflowMessage] = useState<string | null>(null);
  const [orderTransitionSelections, setOrderTransitionSelections] = useState<Record<string, string>>({});
  const [specimenTransitionSelections, setSpecimenTransitionSelections] = useState<Record<string, string>>({});

  const [labHistory, setLabHistory] = useState<any[]>([]);
  const [labHistoryLoading, setLabHistoryLoading] = useState(false);
  const [labStatus, setLabStatus] = useState<any[]>([]);
  const [labStatusLoading, setLabStatusLoading] = useState(false);

  const [quickLabTest, setQuickLabTest] = useState('');
  const [quickLabMessage, setQuickLabMessage] = useState<string | null>(null);
  const [quickLabMessageTone, setQuickLabMessageTone] = useState<'success' | 'info' | 'error'>('info');
  const [quickLabLoading, setQuickLabLoading] = useState(false);

  const [newOrder, setNewOrder] = useState({
    testName: '',
    specimenType: 'Serum',
    priority: 'routine',
    collectionInstructions: '',
  });
  const [newSpecimen, setNewSpecimen] = useState({
    labOrderId: '',
    accessionNumber: '',
    specimenType: 'Serum',
    collectionSite: '',
    containerType: '',
  });
  const [newResult, setNewResult] = useState({
    labOrderId: '',
    analyteName: '',
    value: '',
    units: '',
    referenceRange: '',
    comment: '',
    status: 'preliminary',
  });

  const results = getDomain(dfn, 'labs');
  const labsMeta = getDomainMeta(dfn, 'labs');
  const resultsLoading = isLoading(dfn, 'labs');
  const selectedResult = results.find((entry) => entry.id === selectedResultId) || null;
  const canAcknowledge = selectedAckIds.length > 0;
  const canSubmitVistaRequest = quickLabTest.trim().length > 0;
  const canCreateWorkflowOrder = newOrder.testName.trim().length > 0;
  const canCreateSpecimen = Boolean(newSpecimen.labOrderId && newSpecimen.accessionNumber.trim());
  const canCreateResult = Boolean(
    newResult.labOrderId && newResult.analyteName.trim() && newResult.value.trim()
  );

  const sortedOrders = useMemo(
    () => [...orders].sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
    [orders]
  );
  const patientSpecimens = useMemo(
    () => specimens.filter((entry) => entry.patientDfn === dfn),
    [specimens, dfn]
  );
  const patientWorkflowResults = useMemo(
    () => workflowResults.filter((entry) => entry.patientDfn === dfn),
    [workflowResults, dfn]
  );
  const patientAlerts = useMemo(
    () => alerts.filter((entry) => entry.patientDfn === dfn),
    [alerts, dfn]
  );

  useEffect(() => {
    fetchDomain(dfn, 'labs');
  }, [dfn, fetchDomain]);

  useEffect(() => {
    setActiveView(readStoredLabView(dfn));
  }, [dfn]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      window.sessionStorage.setItem(getLabViewStorageKey(dfn), activeView);
    } catch {
      // Ignore storage failures and preserve in-memory behavior.
    }
  }, [dfn, activeView]);

  useEffect(() => {
    setSelectedResultId((current) => {
      if (results.length === 0) return null;
      if (current && results.some((entry) => entry.id === current)) return current;
      return results[0].id;
    });

    setSelectedAckIds((current) => {
      if (results.length === 0) return current.length === 0 ? current : [];
      const validAckIds = new Set(results.map((entry) => entry.ackId || entry.id));
      const next = current.filter((ackId) => validAckIds.has(ackId));
      return next.length === current.length ? current : next;
    });
  }, [results]);

  async function loadLabHistory() {
    setLabHistoryLoading(true);
    try {
      const res = await getJson<{ ok: boolean; results?: any[]; history?: any[] }>(`/vista/labs/history?dfn=${dfn}`);
      setLabHistory(res.results || res.history || []);
    } catch {
      setLabHistory([]);
    } finally {
      setLabHistoryLoading(false);
    }
  }

  async function loadLabStatus() {
    setLabStatusLoading(true);
    try {
      const res = await getJson<{ ok: boolean; results?: any[]; statuses?: any[] }>(`/vista/labs/status?dfn=${dfn}`);
      setLabStatus(res.results || res.statuses || []);
    } catch {
      setLabStatus([]);
    } finally {
      setLabStatusLoading(false);
    }
  }

  async function loadWorkflow() {
    setWorkflowLoading(true);
    setWorkflowError(null);
    try {
      const [dashboardRes, ordersRes, specimensRes, resultsRes, alertsRes, postureRes] =
        await Promise.all([
          getJson<{ ok: boolean; stats: LabDashboardStats }>('/lab/dashboard'),
          getJson<{ ok: boolean; orders: LabOrder[] }>(`/lab/orders?dfn=${dfn}`),
          getJson<{ ok: boolean; specimens: SpecimenSample[] }>(`/lab/specimens?dfn=${dfn}`),
          getJson<{ ok: boolean; results: DeepLabResult[] }>(`/lab/results?dfn=${dfn}`),
          getJson<{ ok: boolean; alerts: CriticalAlert[] }>(`/lab/critical-alerts?dfn=${dfn}`),
          getJson<{ ok: boolean; posture: LabWritebackPosture }>('/lab/writeback-posture'),
        ]);
      setDashboard(dashboardRes.stats);
      setOrders(ordersRes.orders || []);
      setSpecimens(specimensRes.specimens || []);
      setWorkflowResults(resultsRes.results || []);
      setAlerts(alertsRes.alerts || []);
      setPosture(postureRes.posture || null);
    } catch (error: unknown) {
      setWorkflowError((error as Error)?.message || 'Failed to load deep lab workflow data');
    } finally {
      setWorkflowLoading(false);
    }
  }

  useEffect(() => {
    void loadWorkflow();
    void loadLabHistory();
    void loadLabStatus();
  }, [dfn]);

  function toggleAckSelection(result: LabResult) {
    const ackId = result.ackId || result.id;
    setAckMessage(null);
    setSelectedAckIds((current) =>
      current.includes(ackId) ? current.filter((item) => item !== ackId) : [...current, ackId]
    );
  }

  async function handleAcknowledge() {
    if (selectedAckIds.length === 0) {
      setAckMessage('Select one or more results to acknowledge.');
      return;
    }
    setAckLoading(true);
    setAckMessage(null);
    try {
      const result = await acknowledgeLabs(dfn, selectedAckIds, 'CPRS_USER');
      setAckMessage(
        result.mode === 'real'
          ? `${result.count} result(s) acknowledged in VistA.`
          : result.mode === 'draft'
            ? `${result.count} acknowledgement(s) stored server-side as draft.`
            : `${result.count} acknowledgement(s) captured locally; VistA sync remains pending.`
      );
      setSelectedAckIds([]);
      await fetchDomain(dfn, 'labs');
    } catch (error: unknown) {
      setAckMessage((error as Error)?.message || 'Failed to acknowledge results.');
    } finally {
      setAckLoading(false);
    }
  }

  async function handleQuickLabOrder() {
    if (!quickLabTest.trim()) return;
    setQuickLabLoading(true);
    setQuickLabMessage(null);
    setQuickLabMessageTone('info');
    try {
      const result = await createLabOrder(dfn, quickLabTest.trim());
      if (result.ok) {
        setQuickLabMessageTone('success');
        setQuickLabMessage(
          result.mode === 'real'
            ? `VistA lab request submitted: ${result.labTest || quickLabTest.trim()}`
            : `Lab request captured as draft: ${result.message || 'awaiting VistA sync'}`
        );
      } else if (
        result.mode === 'draft' ||
        result.status === 'unsupported-in-sandbox' ||
        result.status === 'sync-pending'
      ) {
        setQuickLabMessageTone('info');
        setQuickLabMessage(result.message || result.pendingNote || 'Lab request captured as draft.');
      } else {
        setQuickLabMessageTone('error');
        setQuickLabMessage(result.error || result.message || result.pendingNote || 'Lab request failed');
      }
      setQuickLabTest('');
    } catch (error: unknown) {
      setQuickLabMessageTone('error');
      setQuickLabMessage((error as Error)?.message || 'Failed to submit lab request');
    } finally {
      setQuickLabLoading(false);
    }
  }

  async function handleCreateOrder() {
    if (!newOrder.testName.trim()) return;
    setWorkflowMessage(null);
    setWorkflowError(null);
    try {
      const response = await sendJson<{ ok: boolean; order?: LabOrder; error?: string }>(
        '/lab/orders',
        'POST',
        {
          dfn,
          testName: newOrder.testName.trim(),
          specimenType: newOrder.specimenType,
          priority: newOrder.priority,
          collectionInstructions: newOrder.collectionInstructions.trim() || undefined,
        }
      );
      if (!response.ok) throw new Error(response.error || 'Order creation failed');
      setWorkflowMessage(`Workflow lab order created for ${newOrder.testName.trim()}.`);
      setNewOrder({ testName: '', specimenType: 'Serum', priority: 'routine', collectionInstructions: '' });
      await loadWorkflow();
    } catch (error: unknown) {
      setWorkflowError((error as Error)?.message || 'Failed to create workflow order');
    }
  }

  async function handleOrderTransition(orderId: string, status: LabOrderStatus) {
    setWorkflowMessage(null);
    setWorkflowError(null);
    try {
      const response = await sendJson<{ ok: boolean; error?: string }>(
        `/lab/orders/${orderId}/transition`,
        'POST',
        { status }
      );
      if (!response.ok) throw new Error(response.error || 'Order transition failed');
      setWorkflowMessage(`Order moved to ${status.replace(/_/g, ' ')}.`);
      await loadWorkflow();
    } catch (error: unknown) {
      setWorkflowError((error as Error)?.message || 'Failed to transition order');
    } finally {
      setOrderTransitionSelections((current) => ({ ...current, [orderId]: '' }));
    }
  }

  async function handleCreateSpecimen() {
    if (!newSpecimen.labOrderId || !newSpecimen.accessionNumber.trim()) return;
    setWorkflowMessage(null);
    setWorkflowError(null);
    try {
      const response = await sendJson<{ ok: boolean; error?: string }>(
        '/lab/specimens',
        'POST',
        {
          dfn,
          labOrderId: newSpecimen.labOrderId,
          accessionNumber: newSpecimen.accessionNumber.trim(),
          specimenType: newSpecimen.specimenType,
          collectionSite: newSpecimen.collectionSite.trim() || undefined,
          containerType: newSpecimen.containerType.trim() || undefined,
        }
      );
      if (!response.ok) throw new Error(response.error || 'Specimen creation failed');
      setWorkflowMessage(`Specimen ${newSpecimen.accessionNumber.trim()} created.`);
      setNewSpecimen({
        labOrderId: '',
        accessionNumber: '',
        specimenType: 'Serum',
        collectionSite: '',
        containerType: '',
      });
      await loadWorkflow();
    } catch (error: unknown) {
      setWorkflowError((error as Error)?.message || 'Failed to create specimen');
    }
  }

  async function handleSpecimenTransition(id: string, status: SpecimenStatus) {
    setWorkflowMessage(null);
    setWorkflowError(null);
    try {
      const response = await sendJson<{ ok: boolean; error?: string }>(
        `/lab/specimens/${id}/transition`,
        'POST',
        { status }
      );
      if (!response.ok) throw new Error(response.error || 'Specimen transition failed');
      setWorkflowMessage(`Specimen moved to ${status.replace(/_/g, ' ')}.`);
      await loadWorkflow();
    } catch (error: unknown) {
      setWorkflowError((error as Error)?.message || 'Failed to transition specimen');
    } finally {
      setSpecimenTransitionSelections((current) => ({ ...current, [id]: '' }));
    }
  }

  async function handleCreateResult() {
    if (!newResult.labOrderId || !newResult.analyteName.trim() || !newResult.value.trim()) return;
    setWorkflowMessage(null);
    setWorkflowError(null);
    try {
      const response = await sendJson<{ ok: boolean; criticalAlert?: CriticalAlert; error?: string }>(
        '/lab/results',
        'POST',
        {
          dfn,
          labOrderId: newResult.labOrderId,
          analyteName: newResult.analyteName.trim(),
          value: newResult.value.trim(),
          units: newResult.units.trim() || undefined,
          referenceRange: newResult.referenceRange.trim() || undefined,
          comment: newResult.comment.trim() || undefined,
          status: newResult.status,
        }
      );
      if (!response.ok) throw new Error(response.error || 'Result recording failed');
      setWorkflowMessage(
        response.criticalAlert
          ? `Result recorded and critical alert opened for ${newResult.analyteName.trim()}.`
          : `Result recorded for ${newResult.analyteName.trim()}.`
      );
      setNewResult({
        labOrderId: '',
        analyteName: '',
        value: '',
        units: '',
        referenceRange: '',
        comment: '',
        status: 'preliminary',
      });
      await loadWorkflow();
      await fetchDomain(dfn, 'labs');
    } catch (error: unknown) {
      setWorkflowError((error as Error)?.message || 'Failed to record result');
    }
  }

  async function handleAlertAck(id: string, readBackVerified: boolean) {
    setWorkflowMessage(null);
    setWorkflowError(null);
    try {
      const response = await sendJson<{ ok: boolean; error?: string }>(
        `/lab/critical-alerts/${id}/ack`,
        'POST',
        { readBackVerified }
      );
      if (!response.ok) throw new Error(response.error || 'Critical alert acknowledgement failed');
      setWorkflowMessage(
        readBackVerified
          ? 'Critical alert acknowledged with read-back verification.'
          : 'Critical alert acknowledged.'
      );
      await loadWorkflow();
    } catch (error: unknown) {
      setWorkflowError((error as Error)?.message || 'Failed to acknowledge critical alert');
    }
  }

  async function handleAlertResolve(id: string) {
    setWorkflowMessage(null);
    setWorkflowError(null);
    try {
      const response = await sendJson<{ ok: boolean; error?: string }>(
        `/lab/critical-alerts/${id}/resolve`,
        'POST',
        {}
      );
      if (!response.ok) throw new Error(response.error || 'Critical alert resolution failed');
      setWorkflowMessage('Critical alert resolved.');
      await loadWorkflow();
    } catch (error: unknown) {
      setWorkflowError((error as Error)?.message || 'Failed to resolve critical alert');
    }
  }

  return (
    <div>
      <div className={styles.panelTitle}>Laboratory</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 10px' }}>
        Live VistA lab results, workflow orders, specimens, critical alerts, and writeback posture.
      </p>

      <div className={styles.panelToolbar} style={{ flexWrap: 'wrap' }}>
        {LAB_VIEWS.map((view) => (
          <button
            key={view.key}
            className={activeView === view.key ? styles.btnPrimary : styles.btn}
            onClick={() => setActiveView(view.key)}
          >
            {view.label}
          </button>
        ))}
        <button className={styles.btn} onClick={() => void loadWorkflow()}>
          Refresh Workflow
        </button>
        <button className={styles.btn} onClick={() => void fetchDomain(dfn, 'labs')}>
          Refresh VistA Results
        </button>
      </div>

      {workflowError && <div className={styles.errorText}>{workflowError}</div>}
      {workflowMessage && <div style={{ color: 'var(--cprs-success)', padding: '6px 0' }}>{workflowMessage}</div>}

      {activeView === 'results' && (
        <div>

          <div className={styles.panelToolbar} style={{ alignItems: 'center', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
              {resultsLoading ? 'Loading live lab results...' : `${results.length} live result(s)`}
            </span>
            <button className={styles.btnPrimary} onClick={handleAcknowledge} disabled={ackLoading || !canAcknowledge} title={ackLoading ? 'Lab acknowledgement is already in progress.' : !canAcknowledge ? 'Select one or more lab results to acknowledge.' : undefined}>
              {ackLoading ? 'Acknowledging...' : `Acknowledge ${selectedAckIds.length || ''}`.trim()}
            </button>
          </div>

          {ackMessage && (
            <div style={{ color: ackMessage.toLowerCase().includes('failed') ? 'var(--cprs-danger)' : 'var(--cprs-success)', padding: '4px 0 10px' }}>
              {ackMessage}
            </div>
          )}

          <div className={styles.splitPane}>
            <div className={styles.splitLeft} style={{ maxWidth: 420 }}>
              {results.length === 0 ? (
                <p className={styles.emptyText}>No lab results available for this patient.</p>
              ) : (
                <table className={styles.dataTable}>
                  <thead>
                    <tr>
                      <th>Ack</th>
                      <th>Test</th>
                      <th>Value</th>
                      <th>Date</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((result) => {
                      const ackId = result.ackId || result.id;
                      const selected = selectedResultId === result.id;
                      return (
                        <tr
                          key={result.id}
                          onClick={() => setSelectedResultId(result.id)}
                          style={{ background: selected ? 'var(--cprs-hover-bg)' : undefined }}
                        >
                          <td>
                            <input
                              type="checkbox"
                              checked={selectedAckIds.includes(ackId)}
                              onChange={() => toggleAckSelection(result)}
                              onClick={(event) => event.stopPropagation()}
                            />
                          </td>
                          <td>{result.name}</td>
                          <td>
                            {result.value}
                            {result.units ? ` ${result.units}` : ''}
                          </td>
                          <td>{fmtDate(result.date)}</td>
                          <td>
                            <StatusBadge status={result.flag || result.status || 'resulted'} />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className={styles.splitRight}>
              {selectedResult ? (
                <div>
                  <h3 style={{ margin: '0 0 8px', fontSize: 15 }}>{selectedResult.name}</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(160px, 1fr))', gap: 8, marginBottom: 12 }}>
                    <div>
                      <strong>Value:</strong> {selectedResult.value} {selectedResult.units || ''}
                    </div>
                    <div>
                      <strong>Date:</strong> {fmtDate(selectedResult.date)}
                    </div>
                    <div>
                      <strong>Status:</strong> <StatusBadge status={selectedResult.status || 'resulted'} />
                    </div>
                    <div>
                      <strong>Flag:</strong> {selectedResult.flag || 'normal'}
                    </div>
                    <div>
                      <strong>Reference Range:</strong> {selectedResult.refRange || '--'}
                    </div>
                    <div>
                      <strong>Specimen:</strong> {selectedResult.specimen || '--'}
                    </div>
                  </div>
                  <div style={{ padding: 12, border: '1px solid var(--cprs-border)', borderRadius: 4, background: 'var(--cprs-section-bg)' }}>
                    <div style={{ fontWeight: 600, marginBottom: 6 }}>Read Posture</div>
                    <div style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
                      Live VistA results are served through the cache-backed labs domain. Result acknowledgement uses the ORWLRR ACK write path when available and falls back honestly when sandbox write depth is limited.
                    </div>
                  </div>
                </div>
              ) : (
                <p className={styles.emptyText}>Select a lab result to view details.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {activeView === 'history' && (
        <div>
          <div className={styles.panelToolbar} style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
              {labHistoryLoading ? 'Loading lab history...' : `${labHistory.length} historical result(s)`}
            </span>
            <button className={styles.btn} onClick={() => void loadLabHistory()}>Refresh History</button>
          </div>
          {labHistory.length === 0 && !labHistoryLoading ? (
            <p className={styles.emptyText}>No lab history available for this patient.</p>
          ) : (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Value</th>
                  <th>Units</th>
                  <th>Flag</th>
                  <th>Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {labHistory.map((item: any, i: number) => (
                  <tr key={item.id || i}>
                    <td>{item.name || item.testName || item.analyteName || '--'}</td>
                    <td>{item.value || '--'}</td>
                    <td>{item.units || ''}</td>
                    <td>{item.flag || ''}</td>
                    <td>{fmtDate(item.date || item.resultedAt || item.collectedAt)}</td>
                    <td>{item.status ? <StatusBadge status={item.status} /> : '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <h3 style={{ fontSize: 15, marginTop: 16 }}>Order Status</h3>
          <div className={styles.panelToolbar} style={{ alignItems: 'center' }}>
            <span style={{ fontSize: 12, color: 'var(--cprs-text-muted)' }}>
              {labStatusLoading ? 'Loading...' : `${labStatus.length} order(s)`}
            </span>
            <button className={styles.btn} onClick={() => void loadLabStatus()}>Refresh Status</button>
          </div>
          {labStatus.length === 0 && !labStatusLoading ? (
            <p className={styles.emptyText}>No lab order status available.</p>
          ) : (
            <table className={styles.dataTable}>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Status</th>
                  <th>Ordered</th>
                  <th>Provider</th>
                </tr>
              </thead>
              <tbody>
                {labStatus.map((item: any, i: number) => (
                  <tr key={item.id || i}>
                    <td>{item.testName || item.name || '--'}</td>
                    <td>{item.status ? <StatusBadge status={item.status} /> : '--'}</td>
                    <td>{fmtDate(item.orderedAt || item.createdAt)}</td>
                    <td>{item.provider || item.orderingProviderName || '--'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {activeView === 'orders' && (
        <div className={styles.splitPane}>
          <div className={styles.splitLeft} style={{ maxWidth: 400 }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Lab Request</h3>
            <div className={styles.formGroup}>
              <label>VistA Lab Test Request</label>
              <input className={styles.formInput} value={quickLabTest} onChange={(e) => setQuickLabTest(e.target.value)} placeholder="CBC, CMP, Troponin..." />
            </div>
            <button className={styles.btnPrimary} onClick={handleQuickLabOrder} disabled={quickLabLoading || !canSubmitVistaRequest} title={quickLabLoading ? 'Lab request submission is already in progress.' : !canSubmitVistaRequest ? 'Enter a VistA lab test request before submitting.' : undefined}>
              {quickLabLoading ? 'Submitting...' : 'Submit VistA Request'}
            </button>
            {quickLabMessage && (
              <div
                style={{
                  paddingTop: 8,
                  color:
                    quickLabMessageTone === 'error'
                      ? 'var(--cprs-danger)'
                      : quickLabMessageTone === 'success'
                        ? 'var(--cprs-success)'
                        : 'var(--cprs-text-muted)',
                }}
              >
                {quickLabMessage}
              </div>
            )}

            <hr style={{ margin: '14px 0' }} />

            <h3 style={{ fontSize: 15 }}>Workflow Order</h3>
            <div className={styles.formGroup}>
              <label>Test Name</label>
              <input className={styles.formInput} value={newOrder.testName} onChange={(e) => setNewOrder((current) => ({ ...current, testName: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Specimen Type</label>
              <input className={styles.formInput} value={newOrder.specimenType} onChange={(e) => setNewOrder((current) => ({ ...current, specimenType: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Priority</label>
              <select className={styles.formSelect} value={newOrder.priority} onChange={(e) => setNewOrder((current) => ({ ...current, priority: e.target.value }))}>
                <option value="routine">routine</option>
                <option value="stat">stat</option>
                <option value="asap">asap</option>
                <option value="timed">timed</option>
                <option value="preop">preop</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Collection Instructions</label>
              <textarea className={styles.formTextarea} value={newOrder.collectionInstructions} onChange={(e) => setNewOrder((current) => ({ ...current, collectionInstructions: e.target.value }))} />
            </div>
            <button className={styles.btnPrimary} onClick={handleCreateOrder} disabled={!canCreateWorkflowOrder} title={!canCreateWorkflowOrder ? 'Enter a test name to create a workflow order.' : undefined}>
              Create Workflow Order
            </button>
          </div>

          <div className={styles.splitRight}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Patient Orders</h3>
            {workflowLoading ? (
              <p className={styles.loadingText}>Loading workflow orders...</p>
            ) : sortedOrders.length === 0 ? (
              <p className={styles.emptyText}>No workflow lab orders recorded for this patient.</p>
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Test</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Provider</th>
                    <th>VistA</th>
                    <th>Advance</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <div>{order.testName}</div>
                        <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>
                          {order.specimenType} | {fmtDate(order.createdAt)}
                        </div>
                      </td>
                      <td>{order.priority}</td>
                      <td><StatusBadge status={order.status} /></td>
                      <td>{order.orderingProviderName}</td>
                      <td>{order.vistaOrderIen || 'workflow-only'}</td>
                      <td>
                        <select
                          className={styles.formSelect}
                          value={orderTransitionSelections[order.id] || ''}
                          onChange={(e) => {
                            const nextStatus = e.target.value;
                            setOrderTransitionSelections((current) => ({ ...current, [order.id]: nextStatus }));
                            if (nextStatus) void handleOrderTransition(order.id, nextStatus as LabOrderStatus);
                          }}
                        >
                          <option value="">Transition...</option>
                          {ORDER_STATUSES.filter((status) => status !== order.status).map((status) => (
                            <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeView === 'specimens' && (
        <div className={styles.splitPane}>
          <div className={styles.splitLeft} style={{ maxWidth: 400 }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Create Specimen</h3>
            <div className={styles.formGroup}>
              <label>Order</label>
              <select className={styles.formSelect} value={newSpecimen.labOrderId} onChange={(e) => setNewSpecimen((current) => ({ ...current, labOrderId: e.target.value }))}>
                <option value="">Select order</option>
                {sortedOrders.map((order) => (
                  <option key={order.id} value={order.id}>{order.testName} ({order.status})</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Accession Number</label>
              <input className={styles.formInput} value={newSpecimen.accessionNumber} onChange={(e) => setNewSpecimen((current) => ({ ...current, accessionNumber: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Specimen Type</label>
              <input className={styles.formInput} value={newSpecimen.specimenType} onChange={(e) => setNewSpecimen((current) => ({ ...current, specimenType: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Collection Site</label>
              <input className={styles.formInput} value={newSpecimen.collectionSite} onChange={(e) => setNewSpecimen((current) => ({ ...current, collectionSite: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Container Type</label>
              <input className={styles.formInput} value={newSpecimen.containerType} onChange={(e) => setNewSpecimen((current) => ({ ...current, containerType: e.target.value }))} />
            </div>
            <button className={styles.btnPrimary} onClick={handleCreateSpecimen} disabled={!canCreateSpecimen} title={!canCreateSpecimen ? 'Select an order and enter an accession number to create a specimen.' : undefined}>
              Create Specimen
            </button>
          </div>

          <div className={styles.splitRight}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Specimen Lifecycle</h3>
            {workflowLoading ? (
              <p className={styles.loadingText}>Loading specimen workflow...</p>
            ) : patientSpecimens.length === 0 ? (
              <p className={styles.emptyText}>No specimens tracked for this patient.</p>
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Accession</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Site</th>
                    <th>Device Links</th>
                    <th>Advance</th>
                  </tr>
                </thead>
                <tbody>
                  {patientSpecimens.map((specimen) => (
                    <tr key={specimen.id}>
                      <td>{specimen.accessionNumber}</td>
                      <td>{specimen.specimenType}</td>
                      <td><StatusBadge status={specimen.status} /></td>
                      <td>{specimen.collectionSite || '--'}</td>
                      <td>{specimen.deviceObservationIds.length || '0'}</td>
                      <td>
                        <select
                          className={styles.formSelect}
                          value={specimenTransitionSelections[specimen.id] || ''}
                          onChange={(e) => {
                            const nextStatus = e.target.value;
                            setSpecimenTransitionSelections((current) => ({ ...current, [specimen.id]: nextStatus }));
                            if (nextStatus) void handleSpecimenTransition(specimen.id, nextStatus as SpecimenStatus);
                          }}
                        >
                          <option value="">Transition...</option>
                          {SPECIMEN_STATUSES.filter((status) => status !== specimen.status).map((status) => (
                            <option key={status} value={status}>{status.replace(/_/g, ' ')}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeView === 'alerts' && (
        <div className={styles.splitPane}>
          <div className={styles.splitLeft} style={{ maxWidth: 400 }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Record Result</h3>
            <div className={styles.formGroup}>
              <label>Order</label>
              <select className={styles.formSelect} value={newResult.labOrderId} onChange={(e) => setNewResult((current) => ({ ...current, labOrderId: e.target.value }))}>
                <option value="">Select order</option>
                {sortedOrders.map((order) => (
                  <option key={order.id} value={order.id}>{order.testName}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Analyte</label>
              <input className={styles.formInput} value={newResult.analyteName} onChange={(e) => setNewResult((current) => ({ ...current, analyteName: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Value</label>
              <input className={styles.formInput} value={newResult.value} onChange={(e) => setNewResult((current) => ({ ...current, value: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Units</label>
              <input className={styles.formInput} value={newResult.units} onChange={(e) => setNewResult((current) => ({ ...current, units: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Reference Range</label>
              <input className={styles.formInput} value={newResult.referenceRange} onChange={(e) => setNewResult((current) => ({ ...current, referenceRange: e.target.value }))} />
            </div>
            <div className={styles.formGroup}>
              <label>Status</label>
              <select className={styles.formSelect} value={newResult.status} onChange={(e) => setNewResult((current) => ({ ...current, status: e.target.value }))}>
                {RESULT_STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>
            <div className={styles.formGroup}>
              <label>Comment</label>
              <textarea className={styles.formTextarea} value={newResult.comment} onChange={(e) => setNewResult((current) => ({ ...current, comment: e.target.value }))} />
            </div>
            <button className={styles.btnPrimary} onClick={handleCreateResult} disabled={!canCreateResult} title={!canCreateResult ? 'Select an order and enter the analyte name and value to record a result.' : undefined}>
              Record Result
            </button>

            {patientWorkflowResults.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <h3 style={{ fontSize: 15 }}>Recent Workflow Results</h3>
                <div style={{ maxHeight: 220, overflow: 'auto', border: '1px solid var(--cprs-border)', borderRadius: 4 }}>
                  <table className={styles.dataTable}>
                    <thead>
                      <tr>
                        <th>Analyte</th>
                        <th>Value</th>
                        <th>Flag</th>
                      </tr>
                    </thead>
                    <tbody>
                      {patientWorkflowResults.slice(0, 8).map((result) => (
                        <tr key={result.id}>
                          <td>{result.analyteName}</td>
                          <td>{result.value} {result.units || ''}</td>
                          <td><StatusBadge status={result.flag} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className={styles.splitRight}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Critical Alerts</h3>
            {workflowLoading ? (
              <p className={styles.loadingText}>Loading critical alerts...</p>
            ) : patientAlerts.length === 0 ? (
              <p className={styles.emptyText}>No active or historical critical alerts for this patient.</p>
            ) : (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Analyte</th>
                    <th>Value</th>
                    <th>Status</th>
                    <th>Read Back</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patientAlerts.map((alert) => (
                    <tr key={alert.id}>
                      <td>
                        <div>{alert.analyteName}</div>
                        <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)' }}>{alert.threshold}</div>
                      </td>
                      <td>{alert.value} {alert.units || ''}</td>
                      <td><StatusBadge status={alert.status} /></td>
                      <td>{alert.readBackVerified ? 'Verified' : 'Not verified'}</td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        {alert.status === 'active' || alert.status === 'escalated' ? (
                          <>
                            <button className={styles.btn} onClick={() => void handleAlertAck(alert.id, false)}>Ack</button>{' '}
                            <button className={styles.btn} onClick={() => void handleAlertAck(alert.id, true)}>Ack + Read Back</button>{' '}
                          </>
                        ) : null}
                        {alert.status !== 'resolved' ? (
                          <button className={styles.btnDanger} onClick={() => void handleAlertResolve(alert.id)}>Resolve</button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {activeView === 'posture' && (
        <div className={styles.splitPane}>
          <div className={styles.splitLeft} style={{ maxWidth: 360 }}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Dashboard</h3>
            {dashboard ? (
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ padding: 10, border: '1px solid var(--cprs-border)', borderRadius: 4 }}>
                  <strong>Pending Orders:</strong> {dashboard.pendingOrders}
                </div>
                <div style={{ padding: 10, border: '1px solid var(--cprs-border)', borderRadius: 4 }}>
                  <strong>Specimens In Transit:</strong> {dashboard.specimensInTransit}
                </div>
                <div style={{ padding: 10, border: '1px solid var(--cprs-border)', borderRadius: 4 }}>
                  <strong>Results Awaiting Review:</strong> {dashboard.resultsAwaitingReview}
                </div>
                <div style={{ padding: 10, border: '1px solid var(--cprs-border)', borderRadius: 4 }}>
                  <strong>Active Critical Alerts:</strong> {dashboard.activeCriticalAlerts}
                </div>
                <div style={{ padding: 10, border: '1px solid var(--cprs-border)', borderRadius: 4 }}>
                  <strong>Completed Today:</strong> {dashboard.completedToday}
                </div>
                <div style={{ padding: 10, border: '1px solid var(--cprs-border)', borderRadius: 4 }}>
                  <strong>Average Turnaround:</strong> {dashboard.averageTurnaroundMinutes == null ? '--' : `${dashboard.averageTurnaroundMinutes} min`}
                </div>
              </div>
            ) : (
              <p className={styles.emptyText}>Lab dashboard stats unavailable.</p>
            )}
          </div>

          <div className={styles.splitRight}>
            <h3 style={{ marginTop: 0, fontSize: 15 }}>Writeback Posture</h3>
            {posture ? (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Capability</th>
                    <th>RPC</th>
                    <th>Status</th>
                    <th>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(posture).map(([key, entry]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{entry.rpc}</td>
                      <td><StatusBadge status={entry.status} /></td>
                      <td>{entry.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className={styles.emptyText}>Writeback posture unavailable.</p>
            )}

          </div>
        </div>
      )}
    </div>
  );
}