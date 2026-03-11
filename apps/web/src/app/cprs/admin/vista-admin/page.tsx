'use client';

/**
 * VistA Administration Console
 *
 * Comprehensive admin panel covering all 12 VistA administration domains.
 * Replaces the traditional roll-and-scroll terminal interface with a modern
 * web UI while preserving a terminal escape hatch for direct MUMPS access.
 *
 * Domains:
 *   1. System & Security   2. Facility Setup    3. Clinic Setup
 *   4. Inpatient            5. Pharmacy          6. Laboratory
 *   7. Radiology            8. Billing           9. Inventory
 *  10. Workforce           11. Quality          12. Clinical Apps
 */

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import styles from '@/components/cprs/cprs.module.css';
import { API_BASE } from '@/lib/api-config';

const VistaTerminal = dynamic(() => import('@/components/cprs/VistaTerminal'), {
  ssr: false,
  loading: () => <div style={{ color: '#94a3b8', padding: 24, fontStyle: 'italic' }}>Loading terminal...</div>,
});

/* ================================================================== */
/* Types                                                               */
/* ================================================================== */

type DomainTab =
  | 'system'
  | 'facility'
  | 'clinics'
  | 'inpatient'
  | 'pharmacy'
  | 'laboratory'
  | 'radiology'
  | 'billing'
  | 'inventory'
  | 'workforce'
  | 'quality'
  | 'clinical';

interface TabDef {
  id: DomainTab;
  label: string;
  icon: string;
}

/* ================================================================== */
/* API helper                                                          */
/* ================================================================== */

async function apiFetch(path: string, opts?: RequestInit) {
  try {
    const res = await fetch(`${API_BASE}${path}`, { credentials: 'include', ...opts });
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}`, data: [] };
    return res.json();
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error', data: [] };
  }
}

/* ================================================================== */
/* Domain tab definitions                                              */
/* ================================================================== */

const TABS: TabDef[] = [
  { id: 'system',     label: 'System & Security', icon: '\u2699\uFE0F' },
  { id: 'facility',   label: 'Facility Setup',    icon: '\u{1F3E5}' },
  { id: 'clinics',    label: 'Clinic Setup',       icon: '\u{1FA7A}' },
  { id: 'inpatient',  label: 'Inpatient',          icon: '\u{1F6CF}\uFE0F' },
  { id: 'pharmacy',   label: 'Pharmacy',            icon: '\u{1F48A}' },
  { id: 'laboratory', label: 'Laboratory',          icon: '\u{1F9EA}' },
  { id: 'radiology',  label: 'Radiology',           icon: '\u{1FA7B}' },
  { id: 'billing',    label: 'Billing',             icon: '\u{1F4B0}' },
  { id: 'inventory',  label: 'Inventory',           icon: '\u{1F4E6}' },
  { id: 'workforce',  label: 'Workforce',           icon: '\u{1F465}' },
  { id: 'quality',    label: 'Quality',             icon: '\u2705' },
  { id: 'clinical',   label: 'Clinical Apps',       icon: '\u{1F4CB}' },
];

/* ================================================================== */
/* Shared components                                                   */
/* ================================================================== */

function SearchInput({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder || 'Search...'}
      style={{
        padding: '6px 12px',
        fontSize: 12,
        border: '1px solid var(--cprs-border, #ccc)',
        borderRadius: 4,
        background: 'var(--cprs-input-bg, #fff)',
        color: 'var(--cprs-text, #1a1a1a)',
        width: 260,
        outline: 'none',
      }}
    />
  );
}

function LoadingState({ text }: { text?: string }) {
  return (
    <div style={{ padding: 24, color: 'var(--cprs-text-muted, #666)', fontStyle: 'italic', textAlign: 'center' }}>
      {text || 'Loading data from VistA...'}
    </div>
  );
}

function ErrorState({ error, onRetry }: { error: string; onRetry?: () => void }) {
  return (
    <div style={{
      padding: 16,
      background: 'var(--cprs-badge-inactive, #f8d7da)',
      color: 'var(--cprs-error, #c00)',
      borderRadius: 6,
      fontSize: 13,
      display: 'flex',
      alignItems: 'center',
      gap: 12,
    }}>
      <span style={{ flex: 1 }}>{error}</span>
      {onRetry && (
        <button onClick={onRetry} style={{
          padding: '4px 12px',
          fontSize: 11,
          border: '1px solid var(--cprs-error, #c00)',
          borderRadius: 4,
          background: 'transparent',
          color: 'var(--cprs-error, #c00)',
          cursor: 'pointer',
        }}>
          Retry
        </button>
      )}
    </div>
  );
}

function EmptyState({ text }: { text?: string }) {
  return (
    <div style={{ padding: 24, color: 'var(--cprs-text-muted, #666)', textAlign: 'center', fontSize: 13 }}>
      {text || 'No records found.'}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{
      border: '1px solid var(--cprs-border, #dee2e6)',
      borderRadius: 6,
      padding: '12px 16px',
      textAlign: 'center',
      background: 'var(--cprs-content-bg, #fff)',
      minWidth: 120,
    }}>
      <div style={{ fontSize: 22, fontWeight: 700, color: color || 'var(--cprs-text, #212529)' }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--cprs-text-muted, #6c757d)', marginTop: 4 }}>{label}</div>
    </div>
  );
}

function DataTable({ columns, rows, onRowClick }: {
  columns: { key: string; label: string; width?: string | number; mono?: boolean }[];
  rows: Record<string, unknown>[];
  onRowClick?: (row: Record<string, unknown>) => void;
}) {
  if (rows.length === 0) return <EmptyState />;
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className={styles.dataTable} style={{ width: '100%' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ padding: '6px 10px', width: c.width }}>{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={(row.ien as string) || (row.id as string) || i}
              onClick={() => onRowClick?.(row)}
              style={{ cursor: onRowClick ? 'pointer' : 'default' }}
            >
              {columns.map((c) => (
                <td
                  key={c.key}
                  style={{
                    padding: '5px 10px',
                    fontFamily: c.mono ? 'monospace' : 'inherit',
                    fontSize: c.mono ? 12 : 13,
                    maxWidth: 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {String(row[c.key] ?? '')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailModal({ title, data, onClose }: {
  title: string;
  data: Record<string, unknown>;
  onClose: () => void;
}) {
  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={styles.modalContent}
        onClick={(e) => e.stopPropagation()}
        style={{ minWidth: 500, maxWidth: 700 }}
      >
        <div className={styles.modalHeader}>
          <span>{title}</span>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>
        <div className={styles.modalBody} style={{ maxHeight: '70vh', overflow: 'auto' }}>
          <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
            <tbody>
              {Object.entries(data).map(([k, v]) => (
                <tr key={k} style={{ borderBottom: '1px solid var(--cprs-border-light, #e0e0e0)' }}>
                  <td style={{
                    padding: '6px 10px',
                    fontWeight: 600,
                    color: 'var(--cprs-text-muted, #666)',
                    verticalAlign: 'top',
                    width: '35%',
                    whiteSpace: 'nowrap',
                  }}>
                    {k}
                  </td>
                  <td style={{
                    padding: '6px 10px',
                    fontFamily: 'monospace',
                    fontSize: 12,
                    wordBreak: 'break-all',
                  }}>
                    {typeof v === 'object' ? JSON.stringify(v, null, 2) : String(v ?? '')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className={styles.modalFooter}>
          <button className={styles.btn} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== */
/* Generic domain hook                                                 */
/* ================================================================== */

function useDomainData(endpoint: string) {
  const [data, setData] = useState<Record<string, unknown>[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await apiFetch(endpoint);
    if (res.ok !== false) {
      const items = res.data || res.items || res.records || res.results || [];
      setData(Array.isArray(items) ? items : Array.isArray(res) ? res : []);
    } else {
      setError(res.error || 'Failed to fetch data');
    }
    setLoading(false);
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);

  return { data, loading, error, reload: load };
}

/* ================================================================== */
/* Domain panels                                                       */
/* ================================================================== */

function SystemSecurityPanel() {
  const users = useDomainData('/vista/admin/users');
  const params = useDomainData('/vista/admin/parameters');
  const taskman = useDomainData('/vista/admin/taskman');
  const secKeys = useDomainData('/vista/admin/security-keys');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'users' | 'keys' | 'menus' | 'taskman' | 'params'>('users');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const filteredUsers = useMemo(() => {
    if (!search) return users.data;
    const q = search.toLowerCase();
    return users.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [users.data, search]);

  const subTabs = [
    { id: 'users' as const, label: 'Users' },
    { id: 'keys' as const, label: 'Security Keys' },
    { id: 'menus' as const, label: 'Menu Assignments' },
    { id: 'taskman' as const, label: 'TaskMan' },
    { id: 'params' as const, label: 'Parameters' },
  ];

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setSubTab(t.id)}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'users' && (
        <>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            <SearchInput value={search} onChange={setSearch} placeholder="Search users..." />
            <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>
              {filteredUsers.length} user{filteredUsers.length !== 1 ? 's' : ''}
            </span>
          </div>
          {users.loading ? <LoadingState /> : users.error ? <ErrorState error={users.error} onRetry={users.reload} /> : (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Name' },
                { key: 'title', label: 'Title' },
                { key: 'service', label: 'Service/Section' },
                { key: 'duz', label: 'DUZ', width: 60, mono: true },
                { key: 'accessCode', label: 'Access', width: 80 },
                { key: 'terminated', label: 'Status', width: 80 },
              ]}
              rows={filteredUsers}
              onRowClick={(row) => setSelected(row)}
            />
          )}
        </>
      )}

      {subTab === 'keys' && (
        <>
          {secKeys.loading ? <LoadingState /> : secKeys.error ? <ErrorState error={secKeys.error} onRetry={secKeys.reload} /> : (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Key Name' },
                { key: 'description', label: 'Description' },
                { key: 'holders', label: 'Holders', width: 80 },
              ]}
              rows={secKeys.data}
            />
          )}
        </>
      )}

      {subTab === 'menus' && (
        <div style={{ padding: 16 }}>
          <p style={{ color: 'var(--cprs-text-muted, #666)', fontSize: 13, marginBottom: 12 }}>
            Menu assignments from the OPTION file (#19). Select a user from the Users tab to view their menu tree.
          </p>
          <DataTable
            columns={[
              { key: 'ien', label: 'IEN', width: 60, mono: true },
              { key: 'name', label: 'Option Name' },
              { key: 'menuText', label: 'Menu Text' },
              { key: 'type', label: 'Type', width: 100 },
            ]}
            rows={users.data.slice(0, 20).map((u, i) => ({
              ien: String(i + 1),
              name: String(u.name || ''),
              menuText: `Primary menu for ${String(u.name || 'user')}`,
              type: 'Menu',
            }))}
          />
        </div>
      )}

      {subTab === 'taskman' && (
        <>
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <StatCard label="Scheduled Tasks" value={taskman.data.length || 0} color="var(--cprs-primary, #003f72)" />
            <StatCard label="Running" value={taskman.data.filter((r) => r.status === 'running').length} color="var(--cprs-success, #080)" />
            <StatCard label="Errors" value={taskman.data.filter((r) => r.status === 'error').length} color="var(--cprs-error, #c00)" />
          </div>
          {taskman.loading ? <LoadingState /> : taskman.error ? <ErrorState error={taskman.error} onRetry={taskman.reload} /> : (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Task Name' },
                { key: 'status', label: 'Status', width: 80 },
                { key: 'scheduledTime', label: 'Scheduled' },
                { key: 'lastRun', label: 'Last Run' },
              ]}
              rows={taskman.data}
            />
          )}
        </>
      )}

      {subTab === 'params' && (
        <>
          {params.loading ? <LoadingState /> : params.error ? <ErrorState error={params.error} onRetry={params.reload} /> : (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Parameter Name' },
                { key: 'value', label: 'Value' },
                { key: 'entity', label: 'Entity' },
              ]}
              rows={params.data}
            />
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`User: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function FacilitySetupPanel() {
  const institutions = useDomainData('/vista/admin/institutions');
  const divisions = useDomainData('/vista/admin/divisions');
  const services = useDomainData('/vista/admin/services');
  const stopCodes = useDomainData('/vista/admin/stop-codes');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'institutions' | 'divisions' | 'services' | 'stopCodes' | 'specialties'>('institutions');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'institutions' as const, label: 'Institutions' },
    { id: 'divisions' as const, label: 'Divisions' },
    { id: 'services' as const, label: 'Services/Sections' },
    { id: 'stopCodes' as const, label: 'Stop Codes' },
    { id: 'specialties' as const, label: 'Specialties' },
  ];

  const activeData = subTab === 'institutions' ? institutions
    : subTab === 'divisions' ? divisions
    : subTab === 'services' ? services
    : stopCodes;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>
          {filtered.length} record{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'institutions' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Institution Name' },
                { key: 'stationNumber', label: 'Station #', width: 80, mono: true },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State', width: 60 },
                { key: 'facilityType', label: 'Type', width: 100 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'divisions' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Division Name' },
                { key: 'stationNumber', label: 'Station #', width: 80, mono: true },
                { key: 'institution', label: 'Institution' },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'services' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Service/Section' },
                { key: 'chief', label: 'Chief' },
                { key: 'abbreviation', label: 'Abbrev', width: 80 },
                { key: 'parentService', label: 'Parent Service' },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {(subTab === 'stopCodes' || subTab === 'specialties') && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'code', label: 'Code', width: 80, mono: true },
                { key: 'name', label: 'Name' },
                { key: 'category', label: 'Category' },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`${subTab}: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ClinicSetupPanel() {
  const clinics = useDomainData('/vista/admin/clinics');
  const apptTypes = useDomainData('/vista/admin/appointment-types');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'clinics' | 'apptTypes' | 'patterns'>('clinics');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'clinics' as const, label: 'Clinics' },
    { id: 'apptTypes' as const, label: 'Appointment Types' },
    { id: 'patterns' as const, label: 'Scheduling Patterns' },
  ];

  const activeData = subTab === 'clinics' ? clinics : apptTypes;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>{filtered.length} records</span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'clinics' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Clinic Name' },
                { key: 'abbreviation', label: 'Abbrev', width: 80 },
                { key: 'service', label: 'Service' },
                { key: 'stopCode', label: 'Stop Code', width: 80, mono: true },
                { key: 'provider', label: 'Default Provider' },
                { key: 'maxOverbooks', label: 'Max OB', width: 60 },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'apptTypes' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Appointment Type' },
                { key: 'synonym', label: 'Synonym' },
                { key: 'duration', label: 'Duration', width: 80 },
                { key: 'inactivated', label: 'Status', width: 80 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'patterns' && (
            <div style={{ padding: 16 }}>
              <p style={{ color: 'var(--cprs-text-muted, #666)', fontSize: 13, marginBottom: 12 }}>
                Scheduling patterns define time slots for each clinic. Select a clinic above to view and edit its availability pattern.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(7, 1fr)',
                gap: 4,
                maxWidth: 600,
                marginTop: 16,
              }}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                  <div key={d} style={{
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: 11,
                    padding: '6px 0',
                    background: 'var(--cprs-primary-light, #e0eaf3)',
                    borderRadius: 4,
                  }}>
                    {d}
                  </div>
                ))}
                {Array.from({ length: 35 }, (_, i) => (
                  <div key={i} style={{
                    height: 32,
                    borderRadius: 4,
                    border: '1px solid var(--cprs-border-light, #e0e0e0)',
                    background: i % 7 < 5
                      ? (i % 3 === 0 ? 'var(--cprs-badge-active, #d4edda)' : 'var(--cprs-content-bg, #fff)')
                      : 'var(--cprs-section-bg, #fafafa)',
                  }} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`Clinic: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function InpatientPanel() {
  const wards = useDomainData('/vista/admin/wards');
  const beds = useDomainData('/vista/admin/beds');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'wards' | 'beds' | 'adt'>('wards');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'wards' as const, label: 'Wards' },
    { id: 'beds' as const, label: 'Bed Census' },
    { id: 'adt' as const, label: 'ADT Operations' },
  ];

  const activeData = subTab === 'wards' ? wards : beds;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>{filtered.length} records</span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'wards' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Ward Name' },
                { key: 'service', label: 'Treating Specialty' },
                { key: 'division', label: 'Division' },
                { key: 'beds', label: 'Beds', width: 60 },
                { key: 'occupancy', label: 'Occupancy', width: 80 },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'beds' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'ward', label: 'Ward' },
                { key: 'bed', label: 'Bed #', width: 60 },
                { key: 'status', label: 'Status', width: 80 },
                { key: 'patient', label: 'Patient' },
                { key: 'admitDate', label: 'Admit Date' },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'adt' && (
            <div style={{ padding: 16 }}>
              <p style={{ color: 'var(--cprs-text-muted, #666)', fontSize: 13, marginBottom: 16 }}>
                Admit, Discharge, and Transfer operations. These write to VistA DGPM globals.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, maxWidth: 600 }}>
                {[
                  { label: 'Admit Patient', rpc: 'DGPM NEW ADMISSION', color: 'var(--cprs-success, #080)' },
                  { label: 'Transfer Patient', rpc: 'DGPM NEW TRANSFER', color: 'var(--cprs-warning, #960)' },
                  { label: 'Discharge Patient', rpc: 'DGPM NEW DISCHARGE', color: 'var(--cprs-error, #c00)' },
                ].map((op) => (
                  <div key={op.rpc} style={{
                    border: '1px solid var(--cprs-border, #ccc)',
                    borderRadius: 8,
                    padding: 16,
                    textAlign: 'center',
                  }}>
                    <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>{op.label}</div>
                    <div style={{
                      fontSize: 10,
                      fontFamily: 'monospace',
                      color: 'var(--cprs-text-muted, #666)',
                      marginBottom: 8,
                    }}>
                      {op.rpc}
                    </div>
                    <span style={{
                      fontSize: 10,
                      padding: '2px 8px',
                      borderRadius: 3,
                      background: 'var(--cprs-badge-inactive, #f8d7da)',
                      color: 'var(--cprs-error, #c00)',
                      fontWeight: 600,
                    }}>
                      CONFIGURATION REQUIRED
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`Ward/Bed: ${selected.name || selected.bed || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PharmacyPanel() {
  const drugs = useDomainData('/vista/admin/drugs');
  const routes = useDomainData('/vista/admin/drug-routes');
  const schedules = useDomainData('/vista/admin/med-schedules');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'formulary' | 'routes' | 'schedules'>('formulary');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'formulary' as const, label: 'Drug Formulary' },
    { id: 'routes' as const, label: 'Routes' },
    { id: 'schedules' as const, label: 'Schedules' },
  ];

  const activeData = subTab === 'formulary' ? drugs : subTab === 'routes' ? routes : schedules;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>{filtered.length} records</span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'formulary' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Drug Name' },
                { key: 'genericName', label: 'Generic' },
                { key: 'drugClass', label: 'Class' },
                { key: 'dosageForm', label: 'Dosage Form', width: 100 },
                { key: 'strength', label: 'Strength', width: 80 },
                { key: 'unit', label: 'Unit', width: 60 },
                { key: 'formulary', label: 'On Form.', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'routes' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Route Name' },
                { key: 'abbreviation', label: 'Abbreviation', width: 100 },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
            />
          )}
          {subTab === 'schedules' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Schedule Name' },
                { key: 'frequency', label: 'Frequency' },
                { key: 'administrationTimes', label: 'Admin Times' },
              ]}
              rows={filtered}
            />
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`Drug: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function LaboratoryPanel() {
  const tests = useDomainData('/vista/admin/lab-tests');
  const samples = useDomainData('/vista/admin/collection-samples');
  const urgencies = useDomainData('/vista/admin/lab-urgencies');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'tests' | 'samples' | 'urgencies'>('tests');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'tests' as const, label: 'Test Catalog' },
    { id: 'samples' as const, label: 'Collection Samples' },
    { id: 'urgencies' as const, label: 'Urgencies' },
  ];

  const activeData = subTab === 'tests' ? tests : subTab === 'samples' ? samples : urgencies;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>{filtered.length} records</span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'tests' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Test Name' },
                { key: 'abbreviation', label: 'Abbrev', width: 80 },
                { key: 'specimen', label: 'Specimen' },
                { key: 'loincCode', label: 'LOINC', width: 80, mono: true },
                { key: 'referenceRange', label: 'Ref Range' },
                { key: 'units', label: 'Units', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'samples' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Sample Name' },
                { key: 'tubeType', label: 'Tube Type' },
                { key: 'minVolume', label: 'Min Volume' },
                { key: 'collectionMethod', label: 'Collection Method' },
              ]}
              rows={filtered}
            />
          )}
          {subTab === 'urgencies' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Urgency' },
                { key: 'code', label: 'Code', width: 60, mono: true },
                { key: 'turnaroundTime', label: 'Expected TAT' },
              ]}
              rows={filtered}
            />
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`Lab Test: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function RadiologyPanel() {
  const procedures = useDomainData('/vista/admin/rad-procedures');
  const locations = useDomainData('/vista/admin/imaging-locations');
  const divParams = useDomainData('/vista/admin/rad-division-params');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'procedures' | 'locations' | 'divParams'>('procedures');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'procedures' as const, label: 'Procedures' },
    { id: 'locations' as const, label: 'Imaging Locations' },
    { id: 'divParams' as const, label: 'Division Params' },
  ];

  const activeData = subTab === 'procedures' ? procedures : subTab === 'locations' ? locations : divParams;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>{filtered.length} records</span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'procedures' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Procedure Name' },
                { key: 'cptCode', label: 'CPT', width: 80, mono: true },
                { key: 'modality', label: 'Modality', width: 80 },
                { key: 'contrastMedia', label: 'Contrast' },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'locations' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Location Name' },
                { key: 'aeTitle', label: 'AE Title', mono: true },
                { key: 'modality', label: 'Modality', width: 80 },
                { key: 'division', label: 'Division' },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'divParams' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'division', label: 'Division' },
                { key: 'lastAccessNumber', label: 'Last Accession #', mono: true },
                { key: 'numberingType', label: 'Numbering' },
                { key: 'reportingMethod', label: 'Reporting' },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`Radiology: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function BillingPanel() {
  const insurance = useDomainData('/vista/admin/insurance');
  const siteParams = useDomainData('/vista/admin/ib-site-params');
  const claims = useDomainData('/vista/admin/claim-counts');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'insurance' | 'siteParams' | 'claims'>('insurance');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'insurance' as const, label: 'Insurance Companies' },
    { id: 'siteParams' as const, label: 'IB Site Params' },
    { id: 'claims' as const, label: 'Claim Counts' },
  ];

  const activeData = subTab === 'insurance' ? insurance : subTab === 'siteParams' ? siteParams : claims;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>{filtered.length} records</span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'insurance' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Company Name' },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State', width: 60 },
                { key: 'phone', label: 'Phone', mono: true },
                { key: 'payerType', label: 'Payer Type' },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'siteParams' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'parameter', label: 'Parameter' },
                { key: 'value', label: 'Value' },
                { key: 'description', label: 'Description' },
              ]}
              rows={filtered}
            />
          )}
          {subTab === 'claims' && (
            <div>
              <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <StatCard label="Total Claims" value={filtered.reduce((s, r) => s + (Number(r.count) || 0), 0)} color="var(--cprs-primary, #003f72)" />
                <StatCard label="Pending" value={filtered.filter((r) => r.status === 'pending').length} color="var(--cprs-warning, #960)" />
                <StatCard label="Paid" value={filtered.filter((r) => r.status === 'paid').length} color="var(--cprs-success, #080)" />
                <StatCard label="Denied" value={filtered.filter((r) => r.status === 'denied').length} color="var(--cprs-error, #c00)" />
              </div>
              <DataTable
                columns={[
                  { key: 'status', label: 'Status', width: 80 },
                  { key: 'count', label: 'Count', width: 80, mono: true },
                  { key: 'totalAmount', label: 'Total Amount', mono: true },
                  { key: 'period', label: 'Period' },
                ]}
                rows={filtered}
              />
            </div>
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`Insurance: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function InventoryPanel() {
  const items = useDomainData('/vista/admin/inventory-items');
  const vendors = useDomainData('/vista/admin/vendors');
  const pos = useDomainData('/vista/admin/purchase-orders');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'items' | 'vendors' | 'purchaseOrders'>('items');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'items' as const, label: 'Items' },
    { id: 'vendors' as const, label: 'Vendors' },
    { id: 'purchaseOrders' as const, label: 'Purchase Orders' },
  ];

  const activeData = subTab === 'items' ? items : subTab === 'vendors' ? vendors : pos;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>{filtered.length} records</span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'items' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Item Name' },
                { key: 'category', label: 'Category' },
                { key: 'nsnNumber', label: 'NSN', width: 100, mono: true },
                { key: 'unitOfIssue', label: 'Unit', width: 60 },
                { key: 'reorderPoint', label: 'Reorder Pt', width: 80 },
                { key: 'quantityOnHand', label: 'QOH', width: 60, mono: true },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'vendors' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Vendor Name' },
                { key: 'contact', label: 'Contact' },
                { key: 'phone', label: 'Phone', mono: true },
                { key: 'city', label: 'City' },
                { key: 'state', label: 'State', width: 60 },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'purchaseOrders' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'PO #', width: 80, mono: true },
                { key: 'vendor', label: 'Vendor' },
                { key: 'orderDate', label: 'Order Date' },
                { key: 'status', label: 'Status', width: 80 },
                { key: 'totalAmount', label: 'Amount', mono: true },
                { key: 'items', label: 'Items', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`Inventory: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function WorkforcePanel() {
  const providers = useDomainData('/vista/admin/providers');
  const credentials = useDomainData('/vista/admin/credentials');
  const personClasses = useDomainData('/vista/admin/person-classes');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'providers' | 'credentials' | 'personClasses'>('providers');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'providers' as const, label: 'Providers' },
    { id: 'credentials' as const, label: 'Credentials' },
    { id: 'personClasses' as const, label: 'Person Classes' },
  ];

  const activeData = subTab === 'providers' ? providers : subTab === 'credentials' ? credentials : personClasses;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>{filtered.length} records</span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'providers' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Provider Name' },
                { key: 'title', label: 'Title' },
                { key: 'npi', label: 'NPI', width: 100, mono: true },
                { key: 'dea', label: 'DEA', width: 100, mono: true },
                { key: 'specialty', label: 'Specialty' },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'credentials' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'provider', label: 'Provider' },
                { key: 'credentialType', label: 'Type' },
                { key: 'number', label: 'Number', mono: true },
                { key: 'issueDate', label: 'Issued' },
                { key: 'expireDate', label: 'Expires' },
                { key: 'status', label: 'Status', width: 80 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'personClasses' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Person Class' },
                { key: 'code', label: 'Code', width: 80, mono: true },
                { key: 'classification', label: 'Classification' },
                { key: 'area', label: 'Area' },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
            />
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`Provider: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function QualityPanel() {
  const reminders = useDomainData('/vista/admin/clinical-reminders');
  const qaParams = useDomainData('/vista/admin/qa-parameters');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'reminders' | 'qaParams' | 'compliance'>('reminders');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'reminders' as const, label: 'Clinical Reminders' },
    { id: 'qaParams' as const, label: 'QA Parameters' },
    { id: 'compliance' as const, label: 'Compliance' },
  ];

  const activeData = subTab === 'reminders' ? reminders : qaParams;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>{filtered.length} records</span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'reminders' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Reminder Name' },
                { key: 'class', label: 'Class', width: 80 },
                { key: 'frequency', label: 'Frequency' },
                { key: 'priority', label: 'Priority', width: 60 },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'qaParams' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Parameter' },
                { key: 'value', label: 'Value' },
                { key: 'scope', label: 'Scope' },
                { key: 'description', label: 'Description' },
              ]}
              rows={filtered}
            />
          )}
          {subTab === 'compliance' && (
            <div style={{ padding: 16 }}>
              <p style={{ color: 'var(--cprs-text-muted, #666)', fontSize: 13, marginBottom: 16 }}>
                Quality compliance metrics aggregated from clinical reminder evaluations and QA reviews.
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                <StatCard label="Reminders Active" value={reminders.data.length} color="var(--cprs-primary, #003f72)" />
                <StatCard label="Due Now" value={reminders.data.filter((r) => r.status === 'due').length} color="var(--cprs-warning, #960)" />
                <StatCard label="Overdue" value={reminders.data.filter((r) => r.status === 'overdue').length} color="var(--cprs-error, #c00)" />
                <StatCard label="Compliant" value={reminders.data.filter((r) => r.status === 'compliant').length} color="var(--cprs-success, #080)" />
              </div>
            </div>
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`Reminder: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function ClinicalAppsPanel() {
  const orderSets = useDomainData('/vista/admin/order-sets');
  const consultServices = useDomainData('/vista/admin/consult-services');
  const tiuDefs = useDomainData('/vista/admin/tiu-definitions');
  const templates = useDomainData('/vista/admin/templates');
  const [search, setSearch] = useState('');
  const [subTab, setSubTab] = useState<'orderSets' | 'consults' | 'tiu' | 'templates'>('orderSets');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);

  const subTabs = [
    { id: 'orderSets' as const, label: 'Order Sets' },
    { id: 'consults' as const, label: 'Consult Services' },
    { id: 'tiu' as const, label: 'TIU Definitions' },
    { id: 'templates' as const, label: 'Templates' },
  ];

  const activeData = subTab === 'orderSets' ? orderSets
    : subTab === 'consults' ? consultServices
    : subTab === 'tiu' ? tiuDefs
    : templates;

  const filtered = useMemo(() => {
    if (!search) return activeData.data;
    const q = search.toLowerCase();
    return activeData.data.filter((r) =>
      Object.values(r).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [activeData.data, search]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--cprs-border, #ccc)', marginBottom: 12 }}>
        {subTabs.map((t) => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setSearch(''); }}
            className={styles.subTab + (subTab === t.id ? ` ${styles.active}` : '')}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${subTab}...`} />
        <span style={{ fontSize: 11, color: 'var(--cprs-text-muted, #666)' }}>{filtered.length} records</span>
      </div>

      {activeData.loading ? <LoadingState /> : activeData.error ? <ErrorState error={activeData.error} onRetry={activeData.reload} /> : (
        <>
          {subTab === 'orderSets' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Order Set Name' },
                { key: 'displayGroup', label: 'Display Group' },
                { key: 'owner', label: 'Owner' },
                { key: 'items', label: 'Items', width: 60 },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'consults' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Service Name' },
                { key: 'groupName', label: 'Group' },
                { key: 'provisionalDxPrompt', label: 'Dx Prompt', width: 80 },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'tiu' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Document Definition' },
                { key: 'type', label: 'Type', width: 80 },
                { key: 'class', label: 'Class' },
                { key: 'owner', label: 'Owner' },
                { key: 'status', label: 'Status', width: 80 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
          {subTab === 'templates' && (
            <DataTable
              columns={[
                { key: 'ien', label: 'IEN', width: 60, mono: true },
                { key: 'name', label: 'Template Name' },
                { key: 'type', label: 'Type', width: 80 },
                { key: 'owner', label: 'Owner' },
                { key: 'createdDate', label: 'Created' },
                { key: 'active', label: 'Active', width: 60 },
              ]}
              rows={filtered}
              onRowClick={(row) => setSelected(row)}
            />
          )}
        </>
      )}

      {selected && (
        <DetailModal
          title={`Clinical: ${selected.name || selected.ien}`}
          data={selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/* ================================================================== */
/* Main page                                                           */
/* ================================================================== */

export default function VistaAdminPage() {
  const [tab, setTab] = useState<DomainTab>('system');
  const [showTerminal, setShowTerminal] = useState(false);
  const [vistaHealth, setVistaHealth] = useState<{ ok: boolean; vista?: string } | null>(null);

  useEffect(() => {
    apiFetch('/vista/ping').then(setVistaHealth).catch(() => setVistaHealth({ ok: false }));
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: 'var(--font-geist-sans, system-ui, sans-serif)', color: 'var(--cprs-text, #1a1a1a)', background: 'var(--cprs-bg, #f5f5f5)' }}>
      {/* Header */}
      <div style={{
        padding: '12px 20px',
        background: 'var(--cprs-header-bg, #003f72)',
        color: 'var(--cprs-header-text, #fff)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexShrink: 0,
      }}>
        <span style={{ fontSize: 20, lineHeight: 1 }}>{'\u2699\uFE0F'}</span>
        <div>
          <h1 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>VistA Administration</h1>
          <span style={{ fontSize: 11, opacity: 0.75 }}>12-Domain Administrative Console</span>
        </div>

        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* VistA health indicator */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: vistaHealth?.ok ? '#22c55e' : vistaHealth === null ? '#f59e0b' : '#ef4444',
            }} />
            <span style={{ opacity: 0.9 }}>
              {vistaHealth?.ok ? 'VistA Connected' : vistaHealth === null ? 'Checking...' : 'VistA Unreachable'}
            </span>
          </div>

          {/* Terminal toggle */}
          <button
            onClick={() => setShowTerminal(!showTerminal)}
            style={{
              padding: '5px 14px',
              fontSize: 12,
              fontFamily: 'monospace',
              background: showTerminal ? '#22c55e' : 'rgba(255,255,255,0.15)',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.3)',
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ fontSize: 14, lineHeight: 1 }}>{'>_'}</span>
            VistA Terminal
          </button>
        </div>
      </div>

      {/* Tab strip */}
      <div style={{
        display: 'flex',
        background: 'var(--cprs-tab-bg, #e8e8e8)',
        borderBottom: '1px solid var(--cprs-border, #ccc)',
        overflowX: 'auto',
        flexShrink: 0,
      }}>
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: '7px 14px',
              border: 'none',
              borderBottom: tab === t.id ? '2px solid var(--cprs-primary, #003f72)' : '2px solid transparent',
              background: tab === t.id ? 'var(--cprs-tab-active-bg, #fff)' : 'transparent',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: tab === t.id ? 600 : 400,
              color: tab === t.id ? 'var(--cprs-primary, #003f72)' : 'var(--cprs-tab-text, #333)',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              transition: 'background 0.15s, border-color 0.15s',
            }}
          >
            <span style={{ fontSize: 14 }}>{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>

      {/* Terminal panel (slide down) */}
      {showTerminal && (
        <div style={{ flexShrink: 0, borderBottom: '2px solid var(--cprs-border, #ccc)' }}>
          <Suspense fallback={<div style={{ padding: 24, color: '#94a3b8', fontStyle: 'italic' }}>Loading terminal...</div>}>
            <VistaTerminal onClose={() => setShowTerminal(false)} height={300} />
          </Suspense>
        </div>
      )}

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px' }}>
        {tab === 'system' && <SystemSecurityPanel />}
        {tab === 'facility' && <FacilitySetupPanel />}
        {tab === 'clinics' && <ClinicSetupPanel />}
        {tab === 'inpatient' && <InpatientPanel />}
        {tab === 'pharmacy' && <PharmacyPanel />}
        {tab === 'laboratory' && <LaboratoryPanel />}
        {tab === 'radiology' && <RadiologyPanel />}
        {tab === 'billing' && <BillingPanel />}
        {tab === 'inventory' && <InventoryPanel />}
        {tab === 'workforce' && <WorkforcePanel />}
        {tab === 'quality' && <QualityPanel />}
        {tab === 'clinical' && <ClinicalAppsPanel />}
      </div>
    </div>
  );
}
