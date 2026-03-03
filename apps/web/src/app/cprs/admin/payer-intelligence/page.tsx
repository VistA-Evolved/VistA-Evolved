'use client';

/**
 * Payer Intelligence Dashboard — Phase 92
 *
 * Admin page for payer performance analytics:
 *  - Payer KPI table (avg days, denial rate, underpayment rate)
 *  - Aging summary
 *  - Period filter
 *  - CSV export
 *
 * Uses /payerops/analytics/* endpoints.
 */

import React, { useEffect, useState } from 'react';
import { API_BASE as API } from '@/lib/api-config';


/* ── Types ────────────────────────────────────────────────────── */

interface PayerKPI {
  payerId: string;
  payerName: string;
  totalClaims: number;
  totalPaid: number;
  totalDenied: number;
  totalUnderpaid: number;
  avgDaysToPayment: number | null;
  medianDaysToPayment: number | null;
  denialRate: number;
  returnRate: number;
  underpaymentRate: number;
  periodStart: string;
  periodEnd: string;
}

interface AgingBucket {
  label: string;
  claimCount: number;
  totalOutstanding: number;
}

interface AgingReport {
  buckets: AgingBucket[];
  totalOutstanding: number;
  totalClaims: number;
  generatedAt: string;
  tenantId: string;
}

interface IntelReport {
  payers: PayerKPI[];
  periodStart?: string;
  periodEnd?: string;
  generatedAt: string;
  tenantId: string;
}

/* ── Section Type ──────────────────────────────────────────── */

type Section = 'kpi' | 'aging';

/* ── Component ─────────────────────────────────────────────── */

export default function PayerIntelligencePage() {
  const [section, setSection] = useState<Section>('kpi');
  const [kpiReport, setKpiReport] = useState<IntelReport | null>(null);
  const [agingReport, setAgingReport] = useState<AgingReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Period filter
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');

  // Sort
  const [sortField, setSortField] = useState<keyof PayerKPI>('avgDaysToPayment');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchAll();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchAll = async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (periodStart) params.set('periodStart', new Date(periodStart).toISOString());
      if (periodEnd) params.set('periodEnd', new Date(periodEnd).toISOString());
      const qs = params.toString() ? `?${params.toString()}` : '';

      const [kpiRes, agingRes] = await Promise.all([
        fetch(`${API}/payerops/analytics/payer-intelligence${qs}`, { credentials: 'include' }),
        fetch(`${API}/payerops/analytics/aging`, { credentials: 'include' }),
      ]);

      const kpiData = await kpiRes.json();
      const agingData = await agingRes.json();

      if (kpiData.ok) setKpiReport(kpiData.report);
      else setError(kpiData.error || 'Failed to load payer intelligence');

      if (agingData.ok) setAgingReport(agingData.report);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  };

  const formatCurrency = (cents: number) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);

  const formatPercent = (val: number) => `${(val * 100).toFixed(1)}%`;

  const sortedPayers = (): PayerKPI[] => {
    if (!kpiReport?.payers) return [];
    return [...kpiReport.payers].sort((a, b) => {
      const av = a[sortField] ?? 0;
      const bv = b[sortField] ?? 0;
      if (typeof av === 'string' && typeof bv === 'string') {
        return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === 'asc' ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  };

  const handleSort = (field: keyof PayerKPI) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const exportCsv = () => {
    const payers = sortedPayers();
    if (!payers.length) return;
    const header = 'Payer ID,Payer Name,Claims,Paid Claims,Denied,Underpaid,Avg Days,Denial Rate,Return Rate,Underpayment Rate';
    const rows = payers.map(p =>
      [p.payerId, `"${p.payerName}"`, p.totalClaims,
       p.totalPaid, p.totalDenied, p.totalUnderpaid,
       (p.avgDaysToPayment ?? 0).toFixed(1), formatPercent(p.denialRate),
       formatPercent(p.returnRate), formatPercent(p.underpaymentRate)].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `payer-intelligence-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const BUCKET_COLORS = ['#059669', '#2563eb', '#d97706', '#dc2626', '#7c3aed'];

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Payer Intelligence</h1>
        <button onClick={exportCsv}
          style={{ padding: '6px 16px', fontSize: 12, border: '1px solid #d1d5db', borderRadius: 4, background: '#fff', cursor: 'pointer' }}>
          Export CSV
        </button>
      </div>

      {/* Period Filter */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 16, fontSize: 12 }}>
        <label>From:
          <input type="date" value={periodStart} onChange={e => setPeriodStart(e.target.value)}
            style={{ marginLeft: 4, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 3, fontSize: 12 }} />
        </label>
        <label>To:
          <input type="date" value={periodEnd} onChange={e => setPeriodEnd(e.target.value)}
            style={{ marginLeft: 4, padding: '3px 6px', border: '1px solid #d1d5db', borderRadius: 3, fontSize: 12 }} />
        </label>
        <button onClick={fetchAll} style={{ padding: '4px 12px', fontSize: 12, background: '#2563eb', color: '#fff', border: 'none', borderRadius: 3, cursor: 'pointer' }}>
          Apply
        </button>
      </div>

      {/* Section Toggle */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 16, borderBottom: '2px solid #e5e7eb' }}>
        {(['kpi', 'aging'] as Section[]).map(s => (
          <button key={s} onClick={() => setSection(s)}
            style={{
              padding: '6px 16px', fontSize: 12, fontWeight: section === s ? 700 : 400,
              border: 'none', borderBottom: section === s ? '2px solid #2563eb' : '2px solid transparent',
              background: 'none', cursor: 'pointer', color: section === s ? '#2563eb' : '#6b7280',
              textTransform: 'uppercase', marginBottom: -2,
            }}>
            {s === 'kpi' ? 'Payer KPIs' : 'Aging Summary'}
          </button>
        ))}
      </div>

      {error && <div style={{ color: '#dc2626', marginBottom: 8, fontSize: 13 }}>{error}</div>}
      {loading && <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>Loading analytics...</div>}

      {!loading && section === 'kpi' && <KpiSection payers={sortedPayers()} sortField={sortField} sortDir={sortDir} onSort={handleSort} formatCurrency={formatCurrency} formatPercent={formatPercent} />}
      {!loading && section === 'aging' && <AgingSection report={agingReport} formatCurrency={formatCurrency} bucketColors={BUCKET_COLORS} />}
    </div>
  );
}

/* ── KPI Section ───────────────────────────────────────────── */

function KpiSection({
  payers, sortField, sortDir, onSort, formatCurrency, formatPercent,
}: {
  payers: PayerKPI[];
  sortField: keyof PayerKPI;
  sortDir: 'asc' | 'desc';
  onSort: (f: keyof PayerKPI) => void;
  formatCurrency: (c: number) => string;
  formatPercent: (v: number) => string;
}) {
  const sortArrow = (field: keyof PayerKPI) =>
    sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '';

  if (payers.length === 0) {
    return <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No payer data in selected period.</div>;
  }

  // Summary
  const totalClaims = payers.reduce((s, p) => s + p.totalClaims, 0);
  const totalPaidClaims = payers.reduce((s, p) => s + p.totalPaid, 0);
  const totalDenied = payers.reduce((s, p) => s + p.totalDenied, 0);
  const avgDays = payers.length > 0 ? payers.reduce((s, p) => s + (p.avgDaysToPayment ?? 0), 0) / payers.length : 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <StatCard label="Total Payers" value={payers.length} />
        <StatCard label="Total Claims" value={totalClaims} />
        <StatCard label="Paid Claims" value={totalPaidClaims} color="#059669" />
        <StatCard label="Denied" value={totalDenied} color="#dc2626" />
        <StatCard label="Avg Days to Pay" value={avgDays.toFixed(1)} color={avgDays > 30 ? '#dc2626' : '#059669'} />
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            <SortTh label="Payer" field="payerName" onClick={onSort} arrow={sortArrow('payerName')} />
            <SortTh label="Claims" field="totalClaims" onClick={onSort} arrow={sortArrow('totalClaims')} />
            <SortTh label="Paid" field="totalPaid" onClick={onSort} arrow={sortArrow('totalPaid')} />
            <SortTh label="Denied" field="totalDenied" onClick={onSort} arrow={sortArrow('totalDenied')} />
            <SortTh label="Avg Days" field="avgDaysToPayment" onClick={onSort} arrow={sortArrow('avgDaysToPayment')} />
            <SortTh label="Denial %" field="denialRate" onClick={onSort} arrow={sortArrow('denialRate')} />
            <SortTh label="Underpay %" field="underpaymentRate" onClick={onSort} arrow={sortArrow('underpaymentRate')} />
          </tr>
        </thead>
        <tbody>
          {payers.map(p => (
            <tr key={p.payerId} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '6px 8px', fontWeight: 500 }}>{p.payerName || p.payerId}</td>
              <td style={{ padding: '6px 8px' }}>{p.totalClaims}</td>
              <td style={{ padding: '6px 8px', color: '#059669' }}>{p.totalPaid}</td>
              <td style={{ padding: '6px 8px', color: '#dc2626' }}>{p.totalDenied}</td>
              <td style={{ padding: '6px 8px', color: (p.avgDaysToPayment ?? 0) > 30 ? '#dc2626' : '#059669', fontWeight: 600 }}>
                {(p.avgDaysToPayment ?? 0).toFixed(1)}d
              </td>
              <td style={{ padding: '6px 8px' }}>
                <RateBar value={p.denialRate} color="#dc2626" />
              </td>
              <td style={{ padding: '6px 8px' }}>
                <RateBar value={p.underpaymentRate} color="#f59e0b" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ── Aging Section ──────────────────────────────────────────── */

function AgingSection({ report, formatCurrency, bucketColors }: { report: AgingReport | null; formatCurrency: (c: number) => string; bucketColors: string[] }) {
  if (!report) return <div style={{ padding: 24, textAlign: 'center', color: '#6b7280', fontSize: 13 }}>No aging data.</div>;

  const maxAmount = Math.max(...report.buckets.map(b => b.totalOutstanding), 1);

  return (
    <div>
      <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
        <StatCard label="Total Outstanding" value={formatCurrency(report.totalOutstanding)} color="#dc2626" />
        <StatCard label="Total Claims" value={report.totalClaims} />
      </div>

      {/* Bar chart */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', height: 160, marginBottom: 24
      }}>
        {report.buckets.map((b, i) => {
          const height = maxAmount > 0 ? (b.totalOutstanding / maxAmount) * 140 : 0;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 10, fontWeight: 600, color: '#374151' }}>{formatCurrency(b.totalOutstanding)}</div>
              <div style={{
                width: '100%', maxWidth: 60, height, borderRadius: '4px 4px 0 0',
                background: bucketColors[i] || '#6b7280',
              }} />
              <div style={{ fontSize: 10, color: '#6b7280', textAlign: 'center' }}>{b.label}</div>
              <div style={{ fontSize: 9, color: '#9ca3af' }}>{b.claimCount} claims</div>
            </div>
          );
        })}
      </div>

      {/* Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            <th style={{ padding: '8px' }}>Bucket</th>
            <th style={{ padding: '8px' }}>Claims</th>
            <th style={{ padding: '8px' }}>Outstanding</th>
            <th style={{ padding: '8px' }}>% of Total</th>
          </tr>
        </thead>
        <tbody>
          {report.buckets.map((b, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
              <td style={{ padding: '8px' }}>
                <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 2, background: bucketColors[i], marginRight: 6, verticalAlign: 'middle' }} />
                {b.label}
              </td>
              <td style={{ padding: '8px' }}>{b.claimCount}</td>
              <td style={{ padding: '8px', fontFamily: 'monospace' }}>{formatCurrency(b.totalOutstanding)}</td>
              <td style={{ padding: '8px', color: '#6b7280' }}>
                {report.totalOutstanding > 0 ? Math.round((b.totalOutstanding / report.totalOutstanding) * 100) : 0}%
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 8 }}>
        Generated: {new Date(report.generatedAt).toLocaleString()}
      </div>
    </div>
  );
}

/* ── Sub-Components ────────────────────────────────────────── */

function SortTh({ label, field, onClick, arrow }: { label: string; field: keyof PayerKPI; onClick: (f: keyof PayerKPI) => void; arrow: string }) {
  return (
    <th style={{ padding: '6px 8px', cursor: 'pointer', userSelect: 'none' }}
      onClick={() => onClick(field)}>
      {label}{arrow}
    </th>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ padding: '8px 16px', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 6, minWidth: 120 }}>
      <div style={{ fontSize: 11, color: '#6b7280' }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: color || '#1f2937' }}>{value}</div>
    </div>
  );
}

function RateBar({ value, color }: { value: number; color: string }) {
  const pct = Math.round(value * 100);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <div style={{ width: 50, height: 6, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ width: `${Math.min(pct, 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
      </div>
      <span style={{ fontSize: 10, color: '#6b7280' }}>{pct}%</span>
    </div>
  );
}
