'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

interface DashboardData {
  users: { total: number; active: number; inactive: number };
  facilities: { divisions: number; services: number; specialties: number; stopCodes: number };
  clinics: { total: number };
  wards: { total: number; totalBeds: number; occupancy: number };
  census: { totalPatients: number; wardsWithPatients: number };
  pharmacy: { drugs: number; routes: number; schedules: number };
  lab: { tests: number };
  billing: { insuranceCompanies: number; claimsSummary?: Record<string, string> };
  radiology: { procedures: number };
  inventory: { items: number; vendors: number };
  workforce: { providers: number; personClasses: number };
  quality: { reminders: number };
  clinicalSetup: { orderSets: number; consultServices: number; tiuDefinitions: number; tiuTemplates: number; healthSummaryTypes: number };
  system: Record<string, any>;
  generatedAt: string;
}

const CARD_BG: Record<string, string> = {
  blue: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
  green: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
  purple: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
  amber: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
  rose: 'linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%)',
  slate: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
};

function KpiCard({ value, label, variant }: { value: number | string; label: string; variant: string }) {
  return (
    <div style={{
      padding: 20, borderRadius: 12, background: CARD_BG[variant] || CARD_BG.slate,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)', minHeight: 90,
      display: 'flex', flexDirection: 'column', justifyContent: 'center',
    }}>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#111', lineHeight: 1.2 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4, fontWeight: 500 }}>{label}</div>
    </div>
  );
}

export default function VistaDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback((silent = false) => {
    if (!silent) { setLoading(true); setError(''); }
    fetch(`${API_BASE}/admin/vista/dashboard/operational`, { credentials: 'include' })
      .then(r => r.json())
      .then(json => { if (json.ok) setData(json.data); else if (!silent) setError(json.error); })
      .catch(e => { if (!silent) setError(e.message); })
      .finally(() => { if (!silent) setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => load(true), 60_000);
    return () => clearInterval(id);
  }, [data, load]);

  const gridStyle: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 };
  const sectionStyle: React.CSSProperties = { marginBottom: 28 };
  const titleStyle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: '#374151', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.04em' };

  if (loading && !data) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>VistA Operational Dashboard</h1>
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading metrics from all 12 VistA domains...</div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div style={{ padding: 32, fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 24 }}>VistA Operational Dashboard</h1>
        <div style={{ padding: 20, background: '#fef2f2', color: '#dc2626', borderRadius: 8 }}>{error}</div>
      </div>
    );
  }

  const d = data!;

  return (
    <div style={{ padding: '24px 32px', fontFamily: 'system-ui, sans-serif', maxWidth: 1400, margin: '0 auto', background: '#f8fafc', minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: '#1e293b' }}>VistA Operational Dashboard</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>All 12 administrative domains - auto-refreshes every 60s</p>
        </div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          {d.generatedAt ? new Date(d.generatedAt).toLocaleString() : ''}
        </div>
      </div>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Users & Security (Domain 1)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.users?.total ?? 0} label="Total Users" variant="blue" />
          <KpiCard value={d.users?.active ?? 0} label="Active Users" variant="blue" />
          <KpiCard value={d.users?.inactive ?? 0} label="Inactive Users" variant="slate" />
          <KpiCard value={d.users?.total ? `${Math.round((d.users.active / d.users.total) * 100)}%` : '0%'} label="Active Rate" variant="blue" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Facilities (Domain 2)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.facilities?.divisions ?? 0} label="Divisions" variant="green" />
          <KpiCard value={d.facilities?.services ?? 0} label="Services/Sections" variant="green" />
          <KpiCard value={d.facilities?.specialties ?? 0} label="Specialties" variant="green" />
          <KpiCard value={d.facilities?.stopCodes ?? 0} label="Stop Codes" variant="green" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Clinics & Scheduling (Domain 3)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.clinics?.total ?? 0} label="Clinics" variant="green" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Wards & Beds (Domain 4)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.wards?.total ?? 0} label="Wards" variant="purple" />
          <KpiCard value={d.wards?.totalBeds ?? 0} label="Total Beds" variant="purple" />
          <KpiCard value={d.census?.totalPatients ?? 0} label="Patients Admitted" variant="purple" />
          <KpiCard value={`${d.wards?.occupancy ?? 0}%`} label="Bed Occupancy" variant="purple" />
          <KpiCard value={d.census?.wardsWithPatients ?? 0} label="Wards With Patients" variant="purple" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Pharmacy (Domain 5)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.pharmacy?.drugs ?? 0} label="Formulary Items" variant="amber" />
          <KpiCard value={d.pharmacy?.routes ?? 0} label="Med Routes" variant="amber" />
          <KpiCard value={d.pharmacy?.schedules ?? 0} label="Med Schedules" variant="amber" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Laboratory (Domain 6)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.lab?.tests ?? 0} label="Lab Tests" variant="purple" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Radiology (Domain 7)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.radiology?.procedures ?? 0} label="Rad Procedures" variant="rose" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Billing & Revenue (Domain 8)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.billing?.insuranceCompanies ?? 0} label="Insurance Companies" variant="amber" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Inventory (Domain 9)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.inventory?.items ?? 0} label="Inventory Items" variant="slate" />
          <KpiCard value={d.inventory?.vendors ?? 0} label="Vendors" variant="slate" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Workforce (Domain 10)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.workforce?.providers ?? 0} label="Providers" variant="blue" />
          <KpiCard value={d.workforce?.personClasses ?? 0} label="Person Classes" variant="blue" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Quality & Compliance (Domain 11)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.quality?.reminders ?? 0} label="Clinical Reminders" variant="green" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>Clinical Application Setup (Domain 12)</h2>
        <div style={gridStyle}>
          <KpiCard value={d.clinicalSetup?.orderSets ?? 0} label="Order Sets" variant="purple" />
          <KpiCard value={d.clinicalSetup?.consultServices ?? 0} label="Consult Services" variant="purple" />
          <KpiCard value={d.clinicalSetup?.tiuDefinitions ?? 0} label="TIU Definitions" variant="purple" />
          <KpiCard value={d.clinicalSetup?.tiuTemplates ?? 0} label="TIU Templates" variant="purple" />
          <KpiCard value={d.clinicalSetup?.healthSummaryTypes ?? 0} label="Health Summary Types" variant="purple" />
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={titleStyle}>System Health</h2>
        <div style={gridStyle}>
          <KpiCard value={d.system?.taskmanTasks ?? 0} label="TaskMan Tasks" variant="slate" />
          <KpiCard value={d.system?.recentErrors ?? 0} label="Recent Errors" variant={d.system?.recentErrors > 0 ? 'rose' : 'slate'} />
          <KpiCard value={d.system?.parameters ?? 0} label="System Parameters" variant="slate" />
          <KpiCard value={d.system?.LOGGED_IN_USERS ?? '0'} label="Logged-in Users" variant="blue" />
        </div>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {d.system?.OS && <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>OS: </span><span style={{ fontWeight: 600 }}>{d.system.OS}</span>
          </div>}
          {d.system?.DOMAIN && <div style={{ padding: 12, background: '#fff', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <span style={{ color: '#64748b' }}>Domain: </span><span style={{ fontWeight: 600 }}>{d.system.DOMAIN}</span>
          </div>}
        </div>
      </section>
    </div>
  );
}
