'use client';
/**
 * ClinicalProceduresPanel -- Phase 537 + Phase 581 + Phase 613
 *
 * Tabs: Results | Medicine | Consult Link
 * Results and Consult Link use live VistA reads where available.
 * Medicine remains pending until the MD package exposes useful sandbox data.
 */

import { useCallback, useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api-config';

type CpTab = 'results' | 'medicine' | 'consult-link';

interface VistaGrounding {
  vistaFiles: string[];
  targetRoutines: string[];
  targetRpcs: string[];
  migrationPath: string;
  sandboxNote: string;
}

interface PendingResponse {
  ok: boolean;
  status?: string;
  source?: string;
  count: number;
  results: any[];
  vistaGrounding?: VistaGrounding;
  hint?: string;
  rpcUsed?: string[];
}

interface CpListItem {
  id: string;
  entryType: 'tiu-clinproc' | 'consult';
  procedureName: string;
  status: string;
  datePerformed: string;
  provider: string;
  location?: string;
  service?: string;
}

interface CpResultsResponse {
  ok: boolean;
  source?: string;
  count: number;
  results: CpListItem[];
  note?: string;
  classIen?: string;
  rpcUsed?: string[];
  error?: string;
}

interface CpDetailResponse {
  ok: boolean;
  source?: string;
  entryType?: 'tiu-clinproc' | 'consult';
  text?: string;
  detail?: string;
  rpcUsed?: string[];
  error?: string;
}

interface ConsultLinkResponse {
  ok: boolean;
  source?: string;
  count: number;
  results: CpListItem[];
  selectedConsultId?: string;
  detailText?: string;
  rpcUsed?: string[];
  vistaGrounding?: VistaGrounding;
  error?: string;
}

/* ------------------------------------------------------------------ */
/* Configuration-required info card                                    */
/* ------------------------------------------------------------------ */
function PendingCard({ grounding }: { grounding: VistaGrounding }) {
  return (
    <div
      style={{
        border: '1px solid #f59e0b',
        borderRadius: 8,
        padding: 16,
        background: '#fffbeb',
        marginTop: 8,
      }}
    >
      <div style={{ fontWeight: 600, color: '#b45309', marginBottom: 8 }}>Additional Configuration Required</div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>VistA Files:</strong> {grounding.vistaFiles.join(', ')}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>Target RPCs:</strong> {grounding.targetRpcs.join(', ')}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>Routines:</strong> {grounding.targetRoutines.join(', ')}
      </div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        <strong>Migration:</strong> {grounding.migrationPath}
      </div>
      <div style={{ fontSize: 12, color: '#92400e', fontStyle: 'italic' }}>
        {grounding.sandboxNote}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Main panel                                                          */
/* ------------------------------------------------------------------ */
export default function ClinicalProceduresPanel({ dfn }: { dfn?: string }) {
  const [tab, setTab] = useState<CpTab>('results');
  const [resultsData, setResultsData] = useState<CpResultsResponse | null>(null);
  const [medicineData, setMedicineData] = useState<PendingResponse | null>(null);
  const [consultData, setConsultData] = useState<ConsultLinkResponse | null>(null);
  const [selectedResult, setSelectedResult] = useState<CpListItem | null>(null);
  const [resultDetail, setResultDetail] = useState<CpDetailResponse | null>(null);
  const [resultDetailLoading, setResultDetailLoading] = useState(false);
  const [selectedConsult, setSelectedConsult] = useState<CpListItem | null>(null);
  const [consultDetailLoading, setConsultDetailLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (endpoint: string, params: string) => {
    try {
      setLoading(true);
      setError(null);
      const resp = await fetch(`${API_BASE}${endpoint}?${params}`, {
        credentials: 'include',
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!dfn) return;
    if (tab === 'results') {
      setSelectedResult(null);
      setResultDetail(null);
      fetchData('/vista/clinical-procedures', `dfn=${dfn}`).then(setResultsData);
    } else if (tab === 'medicine') {
      fetchData('/vista/clinical-procedures/medicine', `dfn=${dfn}`).then(setMedicineData);
    } else if (tab === 'consult-link') {
      setSelectedConsult(null);
      fetchData('/vista/clinical-procedures/consult-link', `dfn=${dfn}`).then(setConsultData);
    }
  }, [dfn, tab, fetchData]);

  const handleSelectResult = useCallback(async (item: CpListItem) => {
    setSelectedResult(item);
    setResultDetail(null);
    setResultDetailLoading(true);
    try {
      const resp = await fetch(
        `${API_BASE}/vista/clinical-procedures/${encodeURIComponent(item.id)}?kind=${encodeURIComponent(item.entryType)}`,
        { credentials: 'include' }
      );
      const payload = (await resp.json()) as CpDetailResponse;
      setResultDetail(payload);
    } catch (err: any) {
      setResultDetail({ ok: false, error: err?.message || 'Failed to load clinical procedure detail' });
    } finally {
      setResultDetailLoading(false);
    }
  }, []);

  const handleSelectConsult = useCallback(
    async (item: CpListItem) => {
      if (!dfn) return;
      setSelectedConsult(item);
      setConsultDetailLoading(true);
      try {
        const payload = (await fetchData(
          '/vista/clinical-procedures/consult-link',
          `dfn=${dfn}&consultId=${encodeURIComponent(item.id)}`
        )) as ConsultLinkResponse | null;
        if (payload) setConsultData(payload);
      } finally {
        setConsultDetailLoading(false);
      }
    },
    [dfn, fetchData]
  );

  const tabs: { key: CpTab; label: string }[] = [
    { key: 'results', label: 'Results' },
    { key: 'medicine', label: 'Medicine' },
    { key: 'consult-link', label: 'Consult Link' },
  ];

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Clinical Procedures</h2>
        <span
          style={{
            background: '#dbeafe',
            color: '#1d4ed8',
            padding: '2px 8px',
            borderRadius: 4,
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          PARTIAL VISTA
        </span>
      </div>
      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 12 }}>
        Contract: TIU Clinical Procedures class + ORQQCN LIST/DETAIL; MD package remains pending where sandbox data is absent.
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid #e5e7eb', marginBottom: 12 }}>
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: tab === t.key ? '#fff' : 'transparent',
              borderBottom: tab === t.key ? '2px solid #2563eb' : '2px solid transparent',
              color: tab === t.key ? '#2563eb' : '#6b7280',
              fontWeight: tab === t.key ? 600 : 400,
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {!dfn && (
        <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
          Select a patient to view clinical procedures.
        </div>
      )}

      {loading && <div style={{ color: '#6b7280' }}>Loading...</div>}
      {error && <div style={{ color: '#ef4444' }}>Error: {error}</div>}

      {/* Results tab */}
      {tab === 'results' && dfn && resultsData && (
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
            Source: {resultsData.source || 'unknown'}
            {resultsData.classIen ? ` * TIU class ${resultsData.classIen}` : ''}
            {resultsData.rpcUsed?.length ? ` * RPCs: ${resultsData.rpcUsed.join(', ')}` : ''}
          </div>
          {resultsData.note && (
            <div
              style={{
                marginBottom: 12,
                padding: '8px 10px',
                borderRadius: 6,
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                color: '#1e3a8a',
                fontSize: 12,
              }}
            >
              {resultsData.note}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(0, 1.3fr)', gap: 12 }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>Procedure</th>
                    <th style={{ padding: 8 }}>Date</th>
                    <th style={{ padding: 8 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {resultsData.results.map((item) => (
                    <tr
                      key={`${item.entryType}-${item.id}`}
                      onClick={() => void handleSelectResult(item)}
                      style={{
                        cursor: 'pointer',
                        background:
                          selectedResult?.id === item.id && selectedResult?.entryType === item.entryType
                            ? '#eff6ff'
                            : 'transparent',
                      }}
                    >
                      <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>
                        <div style={{ fontWeight: 600 }}>{item.procedureName}</div>
                        <div style={{ color: '#6b7280', fontSize: 11 }}>{item.entryType}</div>
                      </td>
                      <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{item.datePerformed || '--'}</td>
                      <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{item.status || '--'}</td>
                    </tr>
                  ))}
                  {resultsData.results.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                        No clinical procedure records found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, minHeight: 220 }}>
              {selectedResult ? (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{selectedResult.procedureName}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                    {selectedResult.datePerformed || '--'}
                    {selectedResult.provider ? ` * ${selectedResult.provider}` : ''}
                    {selectedResult.location ? ` * ${selectedResult.location}` : ''}
                  </div>
                  {resultDetailLoading && <div style={{ color: '#6b7280' }}>Loading detail...</div>}
                  {!resultDetailLoading && resultDetail?.ok && (
                    <>
                      <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                        RPCs: {resultDetail.rpcUsed?.join(', ') || '--'}
                      </div>
                      <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.45, margin: 0 }}>
                        {resultDetail.text || '(no detail text)'}
                      </pre>
                      {resultDetail.detail && (
                        <>
                          <div style={{ fontWeight: 600, margin: '12px 0 6px' }}>Detailed Display</div>
                          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, lineHeight: 1.45, margin: 0 }}>
                            {resultDetail.detail}
                          </pre>
                        </>
                      )}
                    </>
                  )}
                  {!resultDetailLoading && resultDetail && !resultDetail.ok && (
                    <div style={{ color: '#b91c1c' }}>{resultDetail.error || 'Failed to load detail.'}</div>
                  )}
                </>
              ) : (
                <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  Select a clinical procedure entry to view detail.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Medicine tab */}
      {tab === 'medicine' && dfn && medicineData && (
        <div>
          {medicineData.status === 'requires_config' && medicineData.vistaGrounding ? (
            <PendingCard grounding={medicineData.vistaGrounding} />
          ) : (
            <div>
              {medicineData.results.length === 0 && (
                <div style={{ color: '#9ca3af' }}>No medicine data found.</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Consult Link tab */}
      {tab === 'consult-link' && dfn && consultData && (
        <div>
          <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>
            Read path: {consultData.rpcUsed?.join(', ') || 'ORQQCN LIST'}
          </div>
          {consultData.vistaGrounding && <PendingCard grounding={consultData.vistaGrounding} />}
          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(0, 1.3fr)', gap: 12, marginTop: 12 }}>
            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', textAlign: 'left' }}>
                    <th style={{ padding: 8 }}>Consult</th>
                    <th style={{ padding: 8 }}>Date</th>
                    <th style={{ padding: 8 }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {consultData.results.map((item) => (
                    <tr
                      key={item.id}
                      onClick={() => void handleSelectConsult(item)}
                      style={{
                        cursor: 'pointer',
                        background: selectedConsult?.id === item.id ? '#eff6ff' : 'transparent',
                      }}
                    >
                      <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{item.procedureName}</td>
                      <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{item.datePerformed || '--'}</td>
                      <td style={{ padding: 8, borderTop: '1px solid #f3f4f6' }}>{item.status || '--'}</td>
                    </tr>
                  ))}
                  {consultData.results.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ padding: 12, color: '#9ca3af', fontStyle: 'italic' }}>
                        No consult-backed clinical procedure links found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 12, minHeight: 220 }}>
              {selectedConsult ? (
                <>
                  <div style={{ fontWeight: 600, marginBottom: 8 }}>{selectedConsult.procedureName}</div>
                  {consultDetailLoading && <div style={{ color: '#6b7280' }}>Loading consult detail...</div>}
                  {!consultDetailLoading && consultData.detailText && (
                    <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, lineHeight: 1.45, margin: 0 }}>
                      {consultData.detailText}
                    </pre>
                  )}
                  {!consultDetailLoading && !consultData.detailText && (
                    <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>Select a consult to view detail.</div>
                  )}
                </>
              ) : (
                <div style={{ color: '#9ca3af', fontStyle: 'italic' }}>
                  Select a consult-backed entry to inspect read-only linkage detail.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
