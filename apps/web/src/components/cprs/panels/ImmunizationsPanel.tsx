'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';
import { correlatedGet } from '@/lib/fetch-with-correlation';

interface Immunization {
  ien: string;
  name: string;
  dateTime: string;
  rawDateTime?: string;
  reaction: string;
  inverseDt: string;
}

interface ImmunizationResponse {
  ok: boolean;
  source?: string;
  count: number;
  results: Immunization[];
  rpcUsed: string[];
  pendingTargets: string[];
  _integration?: string;
}

interface ImmunizationCatalogEntry {
  ien: string;
  name: string;
}

interface ImmunizationCatalogResponse {
  ok: boolean;
  source?: string;
  count: number;
  results: ImmunizationCatalogEntry[];
  rpcUsed: string[];
  pendingTargets: string[];
  _integration?: string;
}

interface Props {
  dfn: string;
}

type PanelView = 'history' | 'catalog' | 'posture';

type CatalogKind = 'IMM' | 'CDC' | 'GROUP' | 'OTHER';

interface NormalizedCatalogEntry {
  id: string;
  kind: CatalogKind;
  label: string;
}

const VIEW_OPTIONS: Array<{ key: PanelView; label: string }> = [
  { key: 'history', label: 'History' },
  { key: 'catalog', label: 'Catalog' },
  { key: 'posture', label: 'Add Workflow' },
];

const KIND_OPTIONS: Array<{ key: CatalogKind | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'All' },
  { key: 'IMM', label: 'Imm IDs' },
  { key: 'CDC', label: 'Brands' },
  { key: 'GROUP', label: 'Groups' },
  { key: 'OTHER', label: 'Other' },
];

function normalizeCatalogKind(value: string): CatalogKind {
  if (value === 'IMM' || value === 'CDC' || value === 'GROUP') return value;
  return 'OTHER';
}

function kindLabel(kind: CatalogKind): string {
  if (kind === 'IMM') return 'Imm ID';
  if (kind === 'CDC') return 'Brand';
  if (kind === 'GROUP') return 'Group';
  return 'Other';
}

function fmtDate(value?: string | null): string {
  if (!value) return '--';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map((part) => Number(part));
    return new Date(year, month - 1, day).toLocaleDateString();
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
}

function kindTone(kind: CatalogKind): string {
  if (kind === 'GROUP') return styles.active;
  if (kind === 'CDC') return styles.draft;
  if (kind === 'IMM') return styles.queued;
  return styles.inactive;
}

function buildImmunizationRowKey(index: number, values: Array<unknown>): string {
  const parts = values
    .map((value) => String(value ?? '').trim())
    .filter(Boolean);
  return parts.length > 0 ? `${parts.join('|')}|${index}` : `immunization-${index}`;
}

function StatusCard({
  title,
  value,
  note,
}: {
  title: string;
  value: string;
  note: string;
}) {
  return (
    <div
      style={{
        border: '1px solid var(--cprs-border)',
        borderRadius: 4,
        padding: '8px 10px',
        background: 'var(--cprs-content-bg)',
      }}
    >
      <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginTop: 4 }}>{note}</div>
    </div>
  );
}

export default function ImmunizationsPanel({ dfn }: Props) {
  const [activeView, setActiveView] = useState<PanelView>('history');
  const [data, setData] = useState<ImmunizationResponse | null>(null);
  const [catalog, setCatalog] = useState<ImmunizationCatalogResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(true);
  const [selected, setSelected] = useState<Immunization | null>(null);
  const [selectedCatalogId, setSelectedCatalogId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState('');
  const [catalogKind, setCatalogKind] = useState<CatalogKind | 'ALL'>('ALL');

  const fetchImmunizations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const json = await correlatedGet<ImmunizationResponse>(`${API_BASE}/vista/immunizations?dfn=${dfn}`);
      setData(json);
    } catch (err: any) {
      setError(err.message || 'Failed to load immunizations');
    } finally {
      setLoading(false);
    }
  }, [dfn]);

  const fetchCatalog = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const json = await correlatedGet<ImmunizationCatalogResponse>(`${API_BASE}/vista/immunizations/catalog`);
      setCatalog(json);
    } catch (err: any) {
      setCatalogError(err.message || 'Failed to load immunization catalog');
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  const refreshAll = useCallback(() => {
    void fetchImmunizations();
    void fetchCatalog();
  }, [fetchCatalog, fetchImmunizations]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const normalizedCatalog = useMemo<NormalizedCatalogEntry[]>(() => {
    return (catalog?.results || []).map((entry, index) => ({
      id: `${entry.ien}-${index}`,
      kind: normalizeCatalogKind(entry.ien),
      label: entry.name,
    }));
  }, [catalog]);

  const filteredCatalog = useMemo(() => {
    const query = catalogQuery.trim().toLowerCase();
    return normalizedCatalog.filter((entry) => {
      if (catalogKind !== 'ALL' && entry.kind !== catalogKind) return false;
      if (!query) return true;
      return entry.label.toLowerCase().includes(query) || kindLabel(entry.kind).toLowerCase().includes(query);
    });
  }, [catalogKind, catalogQuery, normalizedCatalog]);

  const selectedCatalog =
    filteredCatalog.find((entry) => entry.id === selectedCatalogId) ||
    normalizedCatalog.find((entry) => entry.id === selectedCatalogId) ||
    null;

  const isPending = data?._integration === 'pending';
  const immunizations = data?.results || [];
  const catalogPending = catalog?._integration === 'pending';

  useEffect(() => {
    if (!selected && immunizations.length > 0) {
      setSelected(immunizations[0]);
    }
  }, [immunizations, selected]);

  useEffect(() => {
    if (!selectedCatalog && filteredCatalog.length > 0) {
      setSelectedCatalogId(filteredCatalog[0].id);
    }
  }, [filteredCatalog, selectedCatalog]);

  return (
    <div>
      <div className={styles.panelTitle}>Immunizations</div>
      <div className={styles.panelToolbar}>
        {VIEW_OPTIONS.map((view) => (
          <button
            key={view.key}
            className={activeView === view.key ? styles.btnPrimary : styles.btn}
            onClick={() => setActiveView(view.key)}
          >
            {view.label}
          </button>
        ))}
        <button className={styles.btn} onClick={() => setActiveView('posture')}>
          + Add Immunization
        </button>
        <button className={styles.btn} onClick={refreshAll} disabled={loading || catalogLoading} title={loading || catalogLoading ? 'Immunization data is still loading.' : undefined}>
          Refresh
        </button>
        {activeView === 'history' && data?.rpcUsed && data.rpcUsed.length > 0 && (
          <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
            RPC: {data.rpcUsed.join(', ')}
          </span>
        )}
        {activeView === 'catalog' && catalog?.rpcUsed && catalog.rpcUsed.length > 0 && (
          <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>
            RPC: {catalog.rpcUsed.join(', ')}
          </span>
        )}
      </div>

      {activeView === 'history' && isPending && (
        <div
          style={{
            background: '#2a2200',
            border: '1px solid #665500',
            padding: '8px 12px',
            margin: '8px 0',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          <strong style={{ color: '#ffcc00' }}>VistA RPC Unavailable</strong>
          <span style={{ color: '#d9c9a3', marginLeft: 8 }}>
            VistA RPC unavailable -- target: ORQQPX IMMUN LIST
          </span>
        </div>
      )}

      {activeView === 'catalog' && catalogPending && (
        <div
          style={{
            background: '#2a2200',
            border: '1px solid #665500',
            padding: '8px 12px',
            margin: '8px 0',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          <strong style={{ color: '#ffcc00' }}>Catalog Pending</strong>
          <span style={{ color: '#d9c9a3', marginLeft: 8 }}>
            Immunization type picker unavailable -- target: PXVIMM IMM SHORT LIST
          </span>
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 8,
          margin: '8px 0 12px',
        }}
      >
        <StatusCard
          title="Patient History"
          value={loading ? '...' : String(immunizations.length)}
          note={isPending ? 'History route awaiting VistA connection.' : 'Live VistA patient history response.'}
        />
        <StatusCard
          title="Catalog Entries"
          value={catalogLoading ? '...' : String(catalog?.count || 0)}
          note={catalogPending ? 'Catalog route awaiting VistA connection.' : 'Live VistA type-picker rows.'}
        />
        <StatusCard
          title="Write Posture"
          value="Pending"
          note="PX SAVE DATA still requires encounter context, route, and site metadata."
        />
      </div>

      {activeView === 'history' && (
        <div className={styles.splitPane}>
          <div className={styles.splitLeft}>
            {loading && <p className={styles.loadingText}>Loading immunizations...</p>}
            {error && <p style={{ color: '#ff6666', fontSize: 12, padding: 8 }}>{error}</p>}
            {!loading && !error && immunizations.length === 0 && !isPending && (
              <p className={styles.emptyText}>No immunizations on record for this patient in VEHU.</p>
            )}
            {!loading && immunizations.length > 0 && (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Immunization</th>
                    <th>Date</th>
                    <th>Reaction</th>
                  </tr>
                </thead>
                <tbody>
                  {immunizations.map((imm, index) => (
                    <tr
                      key={buildImmunizationRowKey(index, [imm.ien, imm.name, imm.dateTime, imm.reaction])}
                      onClick={() => setSelected(imm)}
                      style={selected?.ien === imm.ien ? { background: 'var(--cprs-selected)' } : undefined}
                    >
                      <td>{imm.name || imm.ien}</td>
                      <td>{fmtDate(imm.dateTime)}</td>
                      <td>{imm.reaction || 'None'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className={styles.splitRight}>
            {selected ? (
              <div style={{ padding: 8, fontSize: 12 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>{selected.name}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '4px 8px' }}>
                  <span style={{ color: '#888' }}>IEN:</span>
                  <span>{selected.ien}</span>
                  <span style={{ color: '#888' }}>Date:</span>
                  <span>{fmtDate(selected.dateTime)}</span>
                  {selected.rawDateTime && selected.rawDateTime !== selected.dateTime && (
                    <>
                      <span style={{ color: '#888' }}>VistA Raw Date:</span>
                      <span>{selected.rawDateTime}</span>
                    </>
                  )}
                  <span style={{ color: '#888' }}>Reaction:</span>
                  <span>{selected.reaction || 'None'}</span>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: '#666' }}>
                  This panel is reading directly from VistA immunization history. Writeback remains a separate pending workflow.
                </div>
              </div>
            ) : (
              <p className={styles.emptyText}>Select an immunization to view details</p>
            )}
          </div>
        </div>
      )}

      {activeView === 'catalog' && (
        <div className={styles.splitPane}>
          <div className={styles.splitLeft}>
            <div className={styles.formGroup}>
              <label>Search catalog</label>
              <input
                className={styles.formInput}
                value={catalogQuery}
                onChange={(e) => setCatalogQuery(e.target.value)}
                placeholder="Search brand or group"
              />
            </div>
            <div className={styles.formGroup}>
              <label>Catalog section</label>
              <select
                className={styles.formSelect}
                value={catalogKind}
                onChange={(e) => setCatalogKind(e.target.value as CatalogKind | 'ALL')}
              >
                {KIND_OPTIONS.map((option) => (
                  <option key={option.key} value={option.key}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {catalogLoading && <p className={styles.loadingText}>Loading immunization catalog...</p>}
            {catalogError && <p style={{ color: '#ff6666', fontSize: 12, padding: 8 }}>{catalogError}</p>}
            {!catalogLoading && !catalogError && filteredCatalog.length === 0 && (
              <p className={styles.emptyText}>No catalog entries match the current filter.</p>
            )}
            {!catalogLoading && filteredCatalog.length > 0 && (
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    <th>Type</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCatalog.slice(0, 150).map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedCatalogId(entry.id)}
                      style={selectedCatalog?.id === entry.id ? { background: 'var(--cprs-selected)' } : undefined}
                    >
                      <td>
                        <span className={`${styles.badge} ${kindTone(entry.kind)}`}>{kindLabel(entry.kind)}</span>
                      </td>
                      <td>{entry.label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            {!catalogLoading && filteredCatalog.length > 150 && (
              <div style={{ fontSize: 11, color: '#666', marginTop: 8 }}>
                Showing first 150 filtered rows of {filteredCatalog.length}. Refine the search to narrow the list.
              </div>
            )}
          </div>

          <div className={styles.splitRight}>
            {selectedCatalog ? (
              <div style={{ padding: 8, fontSize: 12 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13 }}>{selectedCatalog.label}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: '4px 8px' }}>
                  <span style={{ color: '#888' }}>Catalog Type:</span>
                  <span>{kindLabel(selectedCatalog.kind)}</span>
                  <span style={{ color: '#888' }}>Source:</span>
                  <span>PXVIMM IMM SHORT LIST</span>
                  <span style={{ color: '#888' }}>Use:</span>
                  <span>
                    {selectedCatalog.kind === 'GROUP'
                      ? 'Clinical grouping used to organize vaccine families.'
                      : selectedCatalog.kind === 'CDC'
                        ? 'Brand or CDC vaccine label available in the sandbox catalog.'
                        : 'Immunization catalog identifier exposed by VistA.'}
                  </span>
                </div>
                <div style={{ marginTop: 12, fontSize: 11, color: '#666' }}>
                  The add workflow is not wired yet, but clinicians can already inspect the live catalog that the future PX SAVE DATA workflow will depend on.
                </div>
              </div>
            ) : (
              <p className={styles.emptyText}>Select a catalog entry to view details</p>
            )}
          </div>
        </div>
      )}

      {activeView === 'posture' && (
        <div style={{ border: '1px solid var(--cprs-border)', borderRadius: 4, padding: 12 }}>
          <h4 style={{ margin: '0 0 10px', fontSize: 13 }}>Immunization Writeback Posture</h4>
          <div style={{ display: 'grid', gridTemplateColumns: '180px 1fr', gap: '8px 12px', fontSize: 12 }}>
            <span style={{ color: '#888' }}>Current state</span>
            <span>Write not available. No write call is attempted from this panel.</span>
            <span style={{ color: '#888' }}>Read routes already live</span>
            <span>
              Patient history via ORQQPX IMMUN LIST and type picker via PXVIMM IMM SHORT LIST.
            </span>
            <span style={{ color: '#888' }}>Pending write RPC</span>
            <span>PX SAVE DATA</span>
            <span style={{ color: '#888' }}>Required context</span>
            <span>Encounter or visit IEN, immunization IEN, administration route, site, and source details.</span>
            <span style={{ color: '#888' }}>Sandbox note</span>
            <span>VEHU exposes the immunization catalog, but safe PCE writeback still needs explicit grounding and live proof.</span>
          </div>
          <div
            style={{
              marginTop: 12,
              background: '#fef3c7',
              border: '1px solid #f59e0b',
              borderRadius: 4,
              padding: '8px 10px',
              fontSize: 12,
              color: '#92400e',
            }}
          >
            Clicking Add Immunization now routes clinicians to this posture view instead of presenting a dead control. The write path will only become active after PX SAVE DATA is grounded against live encounter context.
          </div>
        </div>
      )}
    </div>
  );
}
