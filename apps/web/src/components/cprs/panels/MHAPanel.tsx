'use client';

import { useEffect, useState, useCallback } from 'react';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';
import { csrfHeaders } from '@/lib/csrf';

/* ------------------------------------------------------------------ */
/* Types                                                                */
/* ------------------------------------------------------------------ */

interface InstrumentSummary {
  id: string;
  name: string;
  title: string;
  itemCount: number;
  status: string;
}

interface ScoreResult {
  instrumentId: string;
  totalScore: number;
  maxScore: number;
  severity: string;
  interpretation: string;
  redFlag: boolean;
  redFlagReason?: string;
}

interface Administration {
  id: string;
  instrumentId: string;
  score: ScoreResult;
  administeredAt: string;
  vistaFiled: boolean;
}

interface LocalResult {
  id: string;
  instrumentId: string;
  totalScore: number;
  maxScore: number;
  severity: string;
  interpretation: string;
  redFlag: boolean;
  administeredAt: string;
  vistaFiled: boolean;
}

interface FhirAnswerOption {
  valueCoding: { code: string; display: string };
}

interface FhirItem {
  linkId: string;
  text: string;
  type: string;
  required?: boolean;
  answerOption?: FhirAnswerOption[];
}

interface FhirQuestionnaire {
  id: string;
  name: string;
  title: string;
  description?: string;
  item: FhirItem[];
}

interface Props {
  dfn: string;
}

/* ------------------------------------------------------------------ */
/* Constants                                                            */
/* ------------------------------------------------------------------ */

const SEVERITY_COLORS: Record<string, string> = {
  minimal: '#4caf50',
  mild: '#8bc34a',
  moderate: '#ff9800',
  'moderately-severe': '#ff5722',
  severe: '#f44336',
  'below-threshold': '#4caf50',
  borderline: '#ff9800',
  'probable-ptsd': '#f44336',
  'no-risk': '#4caf50',
  low: '#8bc34a',
  'low-risk': '#4caf50',
  'at-risk-female': '#ff9800',
  'at-risk': '#ff9800',
  'high-risk': '#f44336',
  high: '#f44336',
};

/* ------------------------------------------------------------------ */
/* Component                                                            */
/* ------------------------------------------------------------------ */

type Tab = 'instruments' | 'administer' | 'history';

export default function MHAPanel({ dfn }: Props) {
  const [tab, setTab] = useState<Tab>('instruments');
  const [instruments, setInstruments] = useState<InstrumentSummary[]>([]);
  const [selectedInstrument, setSelectedInstrument] = useState<FhirQuestionnaire | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [lastResult, setLastResult] = useState<Administration | null>(null);
  const [history, setHistory] = useState<LocalResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* ---------------------------------------------------------------- */
  /* Fetch instruments                                                  */
  /* ---------------------------------------------------------------- */
  const fetchInstruments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/mha/instruments`, { credentials: 'include' });
      const json = await res.json();
      setInstruments(json.instruments || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load instruments');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /* Fetch history                                                      */
  /* ---------------------------------------------------------------- */
  const fetchHistory = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/mha/results?dfn=${dfn}`, {
        credentials: 'include',
      });
      const json = await res.json();
      setHistory(json.localResults || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load history');
    } finally {
      setLoading(false);
    }
  }, [dfn]);

  /* ---------------------------------------------------------------- */
  /* Start administration                                               */
  /* ---------------------------------------------------------------- */
  const startAdministration = useCallback(async (id: string) => {
    setLoading(true);
    setLastResult(null);
    try {
      const res = await fetch(`${API_BASE}/vista/mha/instruments/${id}`, {
        credentials: 'include',
      });
      const json = await res.json();
      if (json.ok && json.instrument) {
        setSelectedInstrument(json.instrument);
        setAnswers({});
        setTab('administer');
      } else {
        setError(json.error || 'Failed to load instrument');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load instrument');
    } finally {
      setLoading(false);
    }
  }, []);

  /* ---------------------------------------------------------------- */
  /* Submit administration                                              */
  /* ---------------------------------------------------------------- */
  const submitAdministration = useCallback(async () => {
    if (!selectedInstrument) return;
    setSubmitting(true);
    setError(null);
    try {
      const answerArray = Object.entries(answers).map(([linkId, value]) => ({ linkId, value }));
      const res = await fetch(`${API_BASE}/vista/mha/administer`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        body: JSON.stringify({
          instrumentId: selectedInstrument.id,
          dfn,
          answers: answerArray,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        setLastResult(json.administration);
      } else {
        setError(json.error || 'Failed to submit');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit');
    } finally {
      setSubmitting(false);
    }
  }, [selectedInstrument, answers, dfn]);

  /* ---------------------------------------------------------------- */
  /* Effects                                                            */
  /* ---------------------------------------------------------------- */
  useEffect(() => {
    fetchInstruments();
  }, [fetchInstruments]);

  useEffect(() => {
    if (tab === 'history') fetchHistory();
  }, [tab, fetchHistory]);

  /* ---------------------------------------------------------------- */
  /* Helpers                                                            */
  /* ---------------------------------------------------------------- */
  const allAnswered = selectedInstrument
    ? selectedInstrument.item.every((item) => answers[item.linkId] !== undefined)
    : false;

  /* ---------------------------------------------------------------- */
  /* Render                                                             */
  /* ---------------------------------------------------------------- */
  return (
    <div>
      <div className={styles.panelTitle}>Mental Health Assessment</div>
      <div className={styles.panelToolbar}>
        {(['instruments', 'administer', 'history'] as Tab[]).map((t) => (
          <button
            key={t}
            className={styles.btn}
            onClick={() => setTab(t)}
            style={{
              fontWeight: tab === t ? 700 : 400,
              textDecoration: tab === t ? 'underline' : 'none',
            }}
          >
            {t === 'instruments' ? 'Instruments' : t === 'administer' ? 'Administer' : 'History'}
          </button>
        ))}
      </div>

      {error && (
        <div
          style={{
            background: '#3a0000',
            border: '1px solid #880000',
            padding: '8px 12px',
            margin: '8px 0',
            borderRadius: 4,
            fontSize: 12,
            color: '#ff8888',
          }}
        >
          {error}
          <button
            onClick={() => setError(null)}
            style={{
              marginLeft: 12,
              fontSize: 11,
              cursor: 'pointer',
              background: 'none',
              border: '1px solid #666',
              color: '#ccc',
              borderRadius: 3,
              padding: '2px 8px',
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {loading && <div style={{ color: '#888', padding: 12, fontSize: 13 }}>Loading...</div>}

      {/* ----- Instruments tab ----- */}
      {tab === 'instruments' && !loading && (
        <div style={{ padding: '8px 0' }}>
          <div
            style={{
              background: '#2a2200',
              border: '1px solid #665500',
              padding: '8px 12px',
              margin: '0 0 8px',
              borderRadius: 4,
              fontSize: 12,
            }}
          >
            <strong style={{ color: '#ffcc00' }}>Source Note</strong>
            <span style={{ color: '#d9c9a3', marginLeft: 8 }}>
              Instruments loaded from local FHIR Questionnaire definitions. VistA YTT/YTQZ
              RPCs not yet configured.
            </span>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #444' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#aaa' }}>Instrument</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#aaa' }}>Items</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#aaa' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {instruments.map((inst) => (
                <tr key={inst.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '6px 8px' }}>
                    <strong>{inst.name}</strong>
                    <div style={{ fontSize: 11, color: '#888' }}>{inst.title}</div>
                  </td>
                  <td style={{ padding: '6px 8px', color: '#ccc' }}>{inst.itemCount}</td>
                  <td style={{ padding: '6px 8px' }}>
                    <button
                      className={styles.btn}
                      onClick={() => startAdministration(inst.id)}
                      style={{ fontSize: 12 }}
                    >
                      Administer
                    </button>
                  </td>
                </tr>
              ))}
              {instruments.length === 0 && (
                <tr>
                  <td colSpan={3} style={{ padding: 12, color: '#888' }}>
                    No instruments loaded
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ----- Administer tab ----- */}
      {tab === 'administer' && !loading && (
        <div style={{ padding: '8px 0' }}>
          {lastResult ? (
            <div style={{ padding: 12 }}>
              <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>
                {selectedInstrument?.title} -- Completed
              </h3>
              <div
                style={{
                  background: '#1a1a2e',
                  border: `2px solid ${SEVERITY_COLORS[lastResult.score.severity] || '#666'}`,
                  borderRadius: 8,
                  padding: 16,
                  marginBottom: 12,
                }}
              >
                <div
                  style={{
                    fontSize: 28,
                    fontWeight: 700,
                    color: SEVERITY_COLORS[lastResult.score.severity] || '#ccc',
                  }}
                >
                  {lastResult.score.totalScore} / {lastResult.score.maxScore}
                </div>
                <div style={{ fontSize: 14, color: '#ccc', marginTop: 4 }}>
                  {lastResult.score.interpretation}
                </div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                  Severity: {lastResult.score.severity}
                </div>
                {lastResult.score.redFlag && (
                  <div
                    style={{
                      background: '#4a0000',
                      border: '1px solid #ff0000',
                      borderRadius: 4,
                      padding: '8px 12px',
                      marginTop: 8,
                      color: '#ff4444',
                      fontSize: 13,
                    }}
                  >
                    RED FLAG: {lastResult.score.redFlagReason || 'Safety concern identified'}
                  </div>
                )}
                {!lastResult.vistaFiled && (
                  <div style={{ fontSize: 11, color: '#aa8800', marginTop: 8 }}>
                    VistA write-back pending (Phase 536)
                  </div>
                )}
              </div>
              <button
                className={styles.btn}
                onClick={() => {
                  setLastResult(null);
                  setSelectedInstrument(null);
                  setTab('instruments');
                }}
              >
                Back to Instruments
              </button>
            </div>
          ) : selectedInstrument ? (
            <div>
              <h3 style={{ margin: '0 0 4px', fontSize: 15 }}>{selectedInstrument.title}</h3>
              {selectedInstrument.description && (
                <p style={{ color: '#aaa', fontSize: 12, margin: '0 0 12px' }}>
                  {selectedInstrument.description}
                </p>
              )}
              {selectedInstrument.item.map((item, idx) => (
                <div
                  key={item.linkId}
                  style={{ marginBottom: 16, padding: '8px 0', borderBottom: '1px solid #333' }}
                >
                  <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                    {idx + 1}. {item.text}
                  </div>
                  {item.answerOption && (
                    <div
                      style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingLeft: 16 }}
                    >
                      {item.answerOption.map((opt) => (
                        <label
                          key={opt.valueCoding.code}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 8,
                            fontSize: 13,
                            cursor: 'pointer',
                          }}
                        >
                          <input
                            type="radio"
                            name={item.linkId}
                            value={opt.valueCoding.code}
                            checked={answers[item.linkId] === opt.valueCoding.code}
                            onChange={() =>
                              setAnswers((prev) => ({
                                ...prev,
                                [item.linkId]: opt.valueCoding.code,
                              }))
                            }
                          />
                          <span
                            style={{
                              color:
                                answers[item.linkId] === opt.valueCoding.code ? '#fff' : '#bbb',
                            }}
                          >
                            {opt.valueCoding.display}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button
                  className={styles.btn}
                  onClick={submitAdministration}
                  disabled={!allAnswered || submitting}
                  style={{ fontWeight: 700 }}
                >
                  {submitting ? 'Submitting...' : 'Submit & Score'}
                </button>
                <button
                  className={styles.btn}
                  onClick={() => {
                    setSelectedInstrument(null);
                    setTab('instruments');
                  }}
                >
                  Cancel
                </button>
                {!allAnswered && (
                  <span style={{ fontSize: 11, color: '#888', alignSelf: 'center' }}>
                    Answer all {selectedInstrument.item.length} questions to submit
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div style={{ color: '#888', padding: 12 }}>
              Select an instrument from the Instruments tab to begin.
            </div>
          )}
        </div>
      )}

      {/* ----- History tab ----- */}
      {tab === 'history' && !loading && (
        <div style={{ padding: '8px 0' }}>
          <button className={styles.btn} onClick={fetchHistory} style={{ marginBottom: 8 }}>
            Refresh
          </button>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #444' }}>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#aaa' }}>Date</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#aaa' }}>Instrument</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#aaa' }}>Score</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#aaa' }}>Severity</th>
                <th style={{ textAlign: 'left', padding: '6px 8px', color: '#aaa' }}>VistA</th>
              </tr>
            </thead>
            <tbody>
              {history.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid #333' }}>
                  <td style={{ padding: '6px 8px', fontSize: 12 }}>
                    {new Date(r.administeredAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '6px 8px' }}>{r.instrumentId.toUpperCase()}</td>
                  <td style={{ padding: '6px 8px' }}>
                    {r.totalScore}/{r.maxScore}
                    {r.redFlag && <span style={{ color: '#ff4444', marginLeft: 4 }}>!</span>}
                  </td>
                  <td style={{ padding: '6px 8px' }}>
                    <span style={{ color: SEVERITY_COLORS[r.severity] || '#ccc' }}>
                      {r.severity}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '6px 8px',
                      fontSize: 11,
                      color: r.vistaFiled ? '#4caf50' : '#aa8800',
                    }}
                  >
                    {r.vistaFiled ? 'Filed' : 'Pending'}
                  </td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr>
                  <td colSpan={5} style={{ padding: 12, color: '#888' }}>
                    No MH assessment history for this patient
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
