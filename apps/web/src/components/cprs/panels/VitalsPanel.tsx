'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useDataCache, type Vital } from '@/stores/data-cache';
import { API_BASE } from '@/lib/api-config';
import styles from '../cprs.module.css';

interface VitalsPanelProps {
  dfn: string;
}

interface VitalReading {
  type: string;
  value: string;
  numericValue: number | null;
  unit: string;
  takenAt: string;
  flag?: 'H' | 'L' | 'C';
}

interface VitalTrend {
  type: string;
  label: string;
  unit: string;
  readings: { value: number; date: string }[];
  current: number | null;
  normalRange?: { low: number; high: number };
}

const VITAL_CONFIG: Record<string, { label: string; unit: string; normalRange?: { low: number; high: number }; criticalRange?: { low: number; high: number } }> = {
  T: { label: 'Temperature', unit: '°F', normalRange: { low: 97.0, high: 99.5 }, criticalRange: { low: 95.0, high: 104.0 } },
  P: { label: 'Pulse', unit: 'bpm', normalRange: { low: 60, high: 100 }, criticalRange: { low: 40, high: 150 } },
  R: { label: 'Respiration', unit: '/min', normalRange: { low: 12, high: 20 }, criticalRange: { low: 8, high: 35 } },
  BP: { label: 'Blood Pressure', unit: 'mmHg' },
  WT: { label: 'Weight', unit: 'kg' },
  HT: { label: 'Height', unit: 'cm' },
  PO2: { label: 'SpO₂', unit: '%', normalRange: { low: 95, high: 100 }, criticalRange: { low: 90, high: 100 } },
  BMI: { label: 'BMI', unit: 'kg/m²', normalRange: { low: 18.5, high: 24.9 } },
  PAIN: { label: 'Pain Scale', unit: '/10', normalRange: { low: 0, high: 3 } },
};

function parseVitalType(type: string): string {
  const normalized = type.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (normalized.includes('TEMP') || normalized === 'T') return 'T';
  if (normalized.includes('PULSE') || normalized === 'P' || normalized === 'HR') return 'P';
  if (normalized.includes('RESP') || normalized === 'R' || normalized === 'RR') return 'R';
  if (normalized.includes('BP') || normalized.includes('BLOOD')) return 'BP';
  if (normalized.includes('WT') || normalized.includes('WEIGHT')) return 'WT';
  if (normalized.includes('HT') || normalized.includes('HEIGHT')) return 'HT';
  if (normalized.includes('PO2') || normalized.includes('SPO2') || normalized.includes('O2SAT')) return 'PO2';
  if (normalized.includes('BMI')) return 'BMI';
  if (normalized.includes('PAIN')) return 'PAIN';
  return type;
}

function parseNumericValue(value: string): number | null {
  const cleaned = value.replace(/[^\d.\-/]/g, '');
  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    return parseFloat(parts[0]);
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

function getVitalFlag(type: string, numVal: number | null): 'H' | 'L' | 'C' | undefined {
  if (numVal === null) return undefined;
  const config = VITAL_CONFIG[type];
  if (!config) return undefined;
  if (config.criticalRange) {
    if (numVal <= config.criticalRange.low || numVal >= config.criticalRange.high) return 'C';
  }
  if (config.normalRange) {
    if (numVal > config.normalRange.high) return 'H';
    if (numVal < config.normalRange.low) return 'L';
  }
  return undefined;
}

function Sparkline({ data, normalRange, width = 120, height = 36 }: {
  data: number[];
  normalRange?: { low: number; high: number };
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data) * 0.95;
  const max = Math.max(...data) * 1.05;
  const range = max - min || 1;
  const padX = 4;
  const padY = 4;
  const w = width - padX * 2;
  const h = height - padY * 2;

  const points = data.map((v, i) => {
    const x = padX + (i / (data.length - 1)) * w;
    const y = padY + h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  let normalBand = null;
  if (normalRange) {
    const yLow = padY + h - ((normalRange.high - min) / range) * h;
    const yHigh = padY + h - ((normalRange.low - min) / range) * h;
    normalBand = (
      <rect x={padX} y={Math.max(padY, yLow)} width={w} height={Math.min(h, yHigh - yLow)}
        fill="rgba(34,197,94,0.1)" stroke="none" />
    );
  }

  return (
    <svg className={styles.sparklineSvg} viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none" style={{ width, height }}>
      {normalBand}
      <polyline points={points} fill="none" stroke="var(--cprs-accent)" strokeWidth="1.5"
        strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points.split(' ').pop()?.split(',')[0]}
        cy={points.split(' ').pop()?.split(',')[1]}
        r="2.5" fill="var(--cprs-accent)" />
    </svg>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  } catch { return iso; }
}

type ViewMode = 'cards' | 'flowsheet' | 'trends';

export default function VitalsPanel({ dfn }: VitalsPanelProps) {
  const { fetchDomain, getDomain, getDomainMeta, isLoading } = useDataCache();
  const [view, setView] = useState<ViewMode>('cards');
  const [flowsheetData, setFlowsheetData] = useState<any[]>([]);
  const [flowErr, setFlowErr] = useState('');
  const loading = isLoading(dfn, 'vitals');

  useEffect(() => {
    if (dfn) fetchDomain(dfn, 'vitals');
  }, [dfn, fetchDomain]);

  useEffect(() => {
    if (!dfn || view !== 'flowsheet') return;
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/vista/nursing/flowsheet?dfn=${dfn}`, { credentials: 'include' });
        if (!r.ok) throw new Error(`${r.status}`);
        const d = await r.json();
        if (!cancelled) setFlowsheetData(d.data ?? d.results ?? []);
      } catch (e: any) {
        if (!cancelled) setFlowErr(e.message);
      }
    })();
    return () => { cancelled = true; };
  }, [dfn, view]);

  const rawVitals = (getDomain(dfn, 'vitals') as Vital[]) ?? [];
  const meta = getDomainMeta(dfn, 'vitals');

  const readings = useMemo<VitalReading[]>(() => {
    return rawVitals.map(v => {
      const type = parseVitalType(v.type);
      const numVal = parseNumericValue(v.value);
      const config = VITAL_CONFIG[type];
      return {
        type,
        value: v.value,
        numericValue: numVal,
        unit: config?.unit ?? '',
        takenAt: v.takenAt,
        flag: getVitalFlag(type, numVal),
      };
    });
  }, [rawVitals]);

  const latestByType = useMemo(() => {
    const map = new Map<string, VitalReading>();
    for (const r of readings) {
      const existing = map.get(r.type);
      if (!existing || new Date(r.takenAt) > new Date(existing.takenAt)) {
        map.set(r.type, r);
      }
    }
    return map;
  }, [readings]);

  const trends = useMemo<VitalTrend[]>(() => {
    const grouped = new Map<string, VitalReading[]>();
    for (const r of readings) {
      if (r.numericValue === null) continue;
      const arr = grouped.get(r.type) ?? [];
      arr.push(r);
      grouped.set(r.type, arr);
    }
    return Array.from(grouped.entries())
      .filter(([, arr]) => arr.length >= 2)
      .map(([type, arr]) => {
        const sorted = [...arr].sort((a, b) => new Date(a.takenAt).getTime() - new Date(b.takenAt).getTime());
        const config = VITAL_CONFIG[type];
        return {
          type,
          label: config?.label ?? type,
          unit: config?.unit ?? '',
          readings: sorted.map(r => ({ value: r.numericValue!, date: r.takenAt })),
          current: sorted[sorted.length - 1]?.numericValue ?? null,
          normalRange: config?.normalRange,
        };
      });
  }, [readings]);

  const handleRefresh = useCallback(() => {
    fetchDomain(dfn, 'vitals');
  }, [dfn, fetchDomain]);

  const vitalOrder = ['T', 'P', 'R', 'BP', 'PO2', 'WT', 'HT', 'BMI', 'PAIN'];
  const sortedLatest = useMemo(() => {
    const ordered: VitalReading[] = [];
    for (const key of vitalOrder) {
      const v = latestByType.get(key);
      if (v) ordered.push(v);
    }
    latestByType.forEach((v, key) => {
      if (!vitalOrder.includes(key)) ordered.push(v);
    });
    return ordered;
  }, [latestByType]);

  const hasCritical = sortedLatest.some(v => v.flag === 'C');

  return (
    <div className={styles.content} style={{ padding: 16 }}>
      <div className={styles.panelTitle} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>
          Vitals
          {hasCritical && <span style={{ color: '#dc2626', marginLeft: 8, fontSize: 12 }}>CRITICAL VALUES</span>}
        </span>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {(['cards', 'flowsheet', 'trends'] as ViewMode[]).map(m => (
            <button key={m} onClick={() => setView(m)}
              className={styles.toolbarBtn}
              style={view === m ? { background: 'var(--cprs-accent)', color: '#fff', borderColor: 'var(--cprs-accent)' } : {}}>
              {m === 'cards' ? 'Cards' : m === 'flowsheet' ? 'Flowsheet' : 'Trends'}
            </button>
          ))}
          <button onClick={handleRefresh} className={styles.toolbarBtn}>Refresh</button>
        </div>
      </div>

      {meta?.pending && (
        <div className={styles.pendingText}>
          Awaiting VistA configuration — target RPCs: {meta.pendingTargets?.join(', ')}
        </div>
      )}

      {loading && <div className={styles.loadingText}>Loading vitals...</div>}

      {!loading && readings.length === 0 && (
        <div className={styles.emptyText}>No vitals recorded for this patient.</div>
      )}

      {/* === CARDS VIEW === */}
      {view === 'cards' && !loading && sortedLatest.length > 0 && (
        <>
          {hasCritical && (
            <div className={styles.allergyBanner}>
              <span className={styles.allergyBannerIcon}>⚠</span>
              <strong>Critical vital signs detected — immediate clinical review required</strong>
            </div>
          )}
          <div className={styles.vitalGrid}>
            {sortedLatest.map(v => {
              const config = VITAL_CONFIG[v.type];
              const isCritical = v.flag === 'C';
              const isAbnormal = v.flag === 'H' || v.flag === 'L';
              return (
                <div key={v.type} className={isCritical ? styles.vitalCardCritical : styles.vitalCard}>
                  <div className={styles.vitalLabel}>{config?.label ?? v.type}</div>
                  <div className={styles.vitalValue} style={{
                    color: isCritical ? '#dc2626' : isAbnormal ? '#d97706' : 'var(--cprs-text)'
                  }}>
                    {v.value}
                    {v.flag === 'H' && <span style={{ fontSize: 12, marginLeft: 4 }}>↑</span>}
                    {v.flag === 'L' && <span style={{ fontSize: 12, marginLeft: 4 }}>↓</span>}
                    {v.flag === 'C' && <span style={{ fontSize: 12, marginLeft: 4 }}>!!</span>}
                  </div>
                  <div className={styles.vitalUnit}>{v.unit}</div>
                  <div className={styles.vitalDate}>{formatDate(v.takenAt)}</div>
                  {trends.find(t => t.type === v.type) && (
                    <Sparkline
                      data={trends.find(t => t.type === v.type)!.readings.map(r => r.value)}
                      normalRange={config?.normalRange}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Full history table */}
          <div className={styles.sectionCard}>
            <div className={styles.sectionCardHeader}>
              <span>Vital Signs History</span>
              <span className={styles.sectionCardBadge}>{readings.length}</span>
            </div>
            <div className={styles.sectionCardBody} style={{ padding: 0 }}>
              <table className={`${styles.dataTable} ${styles.enhanced}`} style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Flag</th>
                    <th>Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {[...readings].sort((a, b) => new Date(b.takenAt).getTime() - new Date(a.takenAt).getTime()).map((r, i) => (
                    <tr key={i} className={r.flag === 'C' ? styles.criticalRow : ''}>
                      <td style={{ fontWeight: 600 }}>{VITAL_CONFIG[r.type]?.label ?? r.type}</td>
                      <td className={
                        r.flag === 'C' ? styles.criticalValue
                          : r.flag === 'H' ? styles.abnormalHigh
                            : r.flag === 'L' ? styles.abnormalLow
                              : styles.normalValue
                      }>
                        {r.value} {r.unit}
                      </td>
                      <td>
                        {r.flag === 'C' && <span className={`${styles.severityBadge} ${styles.severitySevere}`}>CRITICAL</span>}
                        {r.flag === 'H' && <span className={`${styles.statusPill} ${styles.statusPending}`}>HIGH</span>}
                        {r.flag === 'L' && <span className={`${styles.statusPill} ${styles.statusInfo}`}>LOW</span>}
                        {!r.flag && <span className={`${styles.statusPill} ${styles.statusActive}`}>Normal</span>}
                      </td>
                      <td>{formatDate(r.takenAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* === TRENDS VIEW === */}
      {view === 'trends' && !loading && (
        <>
          {trends.length === 0 && (
            <div className={styles.emptyText}>Not enough data points for trend analysis.</div>
          )}
          {trends.map(t => (
            <div key={t.type} className={styles.trendChart}>
              <div className={styles.trendChartTitle}>
                {t.label}
                {t.current !== null && (
                  <span style={{ marginLeft: 12, fontSize: 16, fontWeight: 700 }}>
                    {t.current} {t.unit}
                  </span>
                )}
                {t.normalRange && (
                  <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--cprs-text-muted)' }}>
                    (Normal: {t.normalRange.low}–{t.normalRange.high})
                  </span>
                )}
              </div>
              <Sparkline
                data={t.readings.map(r => r.value)}
                normalRange={t.normalRange}
                width={600}
                height={80}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--cprs-text-muted)', marginTop: 4 }}>
                <span>{formatDate(t.readings[0].date)}</span>
                <span>{formatDate(t.readings[t.readings.length - 1].date)}</span>
              </div>
            </div>
          ))}
        </>
      )}

      {/* === FLOWSHEET VIEW === */}
      {view === 'flowsheet' && !loading && (
        <>
          {flowErr && <div className={styles.errorText}>Flowsheet error: {flowErr}</div>}
          {flowsheetData.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table className={`${styles.dataTable} ${styles.enhanced}`} style={{ width: '100%' }}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Value</th>
                    <th>Date/Time</th>
                  </tr>
                </thead>
                <tbody>
                  {flowsheetData.map((row: any, i: number) => (
                    <tr key={i}>
                      <td style={{ fontWeight: 600 }}>{row.type ?? row.name ?? '—'}</td>
                      <td>{row.value ?? '—'}</td>
                      <td>{row.takenAt ?? row.date ?? row.dateTime ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : !flowErr && (
            <div className={styles.emptyText}>No flowsheet data available. Try Cards or Trends view.</div>
          )}
        </>
      )}

      {meta?.rpcUsed && meta.rpcUsed.length > 0 && (
        <div style={{ marginTop: 16, fontSize: 10, color: 'var(--cprs-text-muted)' }}>
          RPCs: {meta.rpcUsed.join(', ')}
        </div>
      )}
    </div>
  );
}
