'use client';

/**
 * RpcDebugPanel.tsx -- Admin/dev-only debug panel showing RPC action mappings.
 *
 * Shows:
 *   - Current screen's actions and their RPC mapping
 *   - Whether each RPC is present in the live VistA instance
 *   - Items requiring configuration with target RPC name and next steps
 *
 * Only rendered when NODE_ENV !== "production" or user has admin role.
 */

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/*  Types (mirrored from actionRegistry to avoid cross-app import)    */
/* ------------------------------------------------------------------ */

type ActionStatus = 'wired' | 'requires_config' | 'unsupported-in-sandbox' | 'stub';

interface CprsAction {
  actionId: string;
  label: string;
  location: string;
  capability: string;
  rpcs: string[];
  status: ActionStatus;
  pendingNote?: string;
}

interface RpcCatalogEntry {
  ien: string;
  name: string;
  present: boolean;
}

interface RpcRegistryEntry {
  name: string;
  domain: string;
  tag: string;
  description: string;
}

interface RpcDebugActionsResponse {
  ok: boolean;
  actions?: CprsAction[];
  count?: number;
  error?: string;
}

interface RpcCatalogResponse {
  ok: boolean;
  catalog?: RpcCatalogEntry[];
  count?: number;
  hint?: string;
  error?: string;
}

interface RpcDebugRegistryResponse {
  ok: boolean;
  registry?: RpcRegistryEntry[];
  exceptions?: Array<{ name: string; reason: string }>;
  count?: number;
  error?: string;
}

/* ------------------------------------------------------------------ */
/*  Status badge                                                       */
/* ------------------------------------------------------------------ */

function StatusBadge({ status }: { status: ActionStatus }) {
  const colors: Record<ActionStatus, string> = {
    wired: 'bg-green-100 text-green-800 border-green-300',
    requires_config: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    'unsupported-in-sandbox': 'bg-blue-100 text-blue-800 border-blue-300',
    stub: 'bg-orange-100 text-orange-800 border-orange-300',
  };
  return <span className={`text-xs px-2 py-0.5 rounded border ${colors[status]}`}>{status}</span>;
}

function RpcPresenceDot({ present }: { present: boolean | undefined }) {
  if (present === undefined) return <span className="text-gray-400 text-xs">?</span>;
  return present ? (
    <span className="text-green-600 text-xs" title="Present in VistA">
      &#9679;
    </span>
  ) : (
    <span className="text-red-500 text-xs" title="Not in VistA instance">
      &#9675;
    </span>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Panel                                                         */
/* ------------------------------------------------------------------ */

export default function RpcDebugPanel() {
  const [actions, setActions] = useState<CprsAction[]>([]);
  const [catalog, setCatalog] = useState<Map<string, boolean>>(new Map());
  const [registry, setRegistry] = useState<RpcRegistryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'wired' | 'pending' | 'unsupported' | 'stub'>('all');
  const [locationFilter, setLocationFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);

  const fetchJsonStrict = useCallback(async <T extends { ok?: boolean; error?: string }>(path: string) => {
    const response = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
    const text = await response.text();
    let data: T | null = null;

    try {
      data = text ? (JSON.parse(text) as T) : null;
    } catch {
      throw new Error(`Unexpected response from ${path}`);
    }

    if (!response.ok || !data?.ok) {
      throw new Error(data?.error || `Request failed for ${path}`);
    }

    return data;
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [actionsData, catalogData, registryData] = await Promise.all([
        fetchJsonStrict<RpcDebugActionsResponse>('/vista/rpc-debug/actions'),
        fetchJsonStrict<RpcCatalogResponse>('/vista/rpc-catalog'),
        fetchJsonStrict<RpcDebugRegistryResponse>('/vista/rpc-debug/registry'),
      ]);

      setActions(actionsData.actions || []);

      const map = new Map<string, boolean>();
      (catalogData.catalog || []).forEach((entry) => {
        map.set(entry.name.toUpperCase(), true);
      });
      setCatalog(map);

      setRegistry(registryData.registry || []);
    } catch (err) {
      setActions([]);
      setCatalog(new Map());
      setRegistry([]);
      setError(err instanceof Error ? err.message : 'Failed to load RPC debug data');
    } finally {
      setLoading(false);
    }
  }, [fetchJsonStrict]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const locations = [...new Set(actions.map((a) => a.location))].sort();

  const filtered = actions.filter((a) => {
    if (filter === 'pending' && a.status !== 'requires_config') return false;
    if (filter === 'unsupported' && a.status !== 'unsupported-in-sandbox') return false;
    if (filter === 'wired' && a.status !== 'wired') return false;
    if (filter === 'stub' && a.status !== 'stub') return false;
    if (locationFilter !== 'all' && a.location !== locationFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        a.actionId.toLowerCase().includes(term) ||
        a.label.toLowerCase().includes(term) ||
        a.rpcs.some((r) => r.toLowerCase().includes(term))
      );
    }
    return true;
  });

  const stats = {
    total: actions.length,
    wired: actions.filter((a) => a.status === 'wired').length,
    pending: actions.filter((a) => a.status === 'requires_config').length,
    unsupported: actions.filter((a) => a.status === 'unsupported-in-sandbox').length,
    stub: actions.filter((a) => a.status === 'stub').length,
    rpcsCatalogSize: catalog.size,
    registrySize: registry.length,
  };

  if (loading) {
    return <div className="p-4 text-sm text-gray-500">Loading RPC debug data...</div>;
  }

  if (error) {
    return (
      <div className="space-y-4">
        <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-red-700">
          {error}
        </div>
        <button className="text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={fetchData}>
          Refresh
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        <Stat label="Total Actions" value={stats.total} />
        <Stat label="Wired" value={stats.wired} color="green" />
        <Stat label="Pending" value={stats.pending} color="yellow" />
        <Stat label="Unsupported" value={stats.unsupported} color="blue" />
        <Stat label="Stub" value={stats.stub} color="orange" />
        <Stat label="Registry" value={stats.registrySize} color="purple" />
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          className="text-xs border rounded px-2 py-1"
          value={filter}
          onChange={(e) => setFilter(e.target.value as any)}
        >
          <option value="all">All Status</option>
          <option value="wired">Wired</option>
          <option value="pending">Pending</option>
          <option value="unsupported">Unsupported</option>
          <option value="stub">Stub</option>
        </select>
        <select
          className="text-xs border rounded px-2 py-1"
          value={locationFilter}
          onChange={(e) => setLocationFilter(e.target.value)}
        >
          <option value="all">All Locations</option>
          {locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        <input
          className="text-xs border rounded px-2 py-1 flex-1 min-w-[200px]"
          placeholder="Search actions or RPCs..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button className="text-xs px-2 py-1 border rounded hover:bg-gray-50" onClick={fetchData}>
          Refresh
        </button>
      </div>

      {/* Action Table */}
      <div className="border rounded overflow-auto max-h-[500px]">
        <table className="w-full text-xs">
          <thead className="bg-gray-50 sticky top-0">
            <tr>
              <th className="text-left p-2">Action</th>
              <th className="text-left p-2">Location</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">RPC(s)</th>
              <th className="text-left p-2">In VistA?</th>
              <th className="text-left p-2">Notes</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((action) => (
              <tr key={action.actionId} className="border-t hover:bg-gray-50">
                <td className="p-2">
                  <div className="font-medium">{action.label}</div>
                  <div className="text-gray-400">{action.actionId}</div>
                </td>
                <td className="p-2 text-gray-600">{action.location}</td>
                <td className="p-2">
                  <StatusBadge status={action.status} />
                </td>
                <td className="p-2">
                  {action.rpcs.map((rpc) => (
                    <div key={rpc} className="flex items-center gap-1">
                      <RpcPresenceDot present={catalog.has(rpc.toUpperCase()) ? true : undefined} />
                      <code className="text-[10px]">{rpc}</code>
                    </div>
                  ))}
                </td>
                <td className="p-2">
                  {action.rpcs.map((rpc) => (
                    <div key={rpc}>
                      {catalog.has(rpc.toUpperCase()) ? (
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-gray-400">--</span>
                      )}
                    </div>
                  ))}
                </td>
                <td className="p-2 text-gray-500">{action.pendingNote || ''}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="p-4 text-center text-gray-400">
                  No actions match current filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Stat card                                                          */
/* ------------------------------------------------------------------ */

function Stat({ label, value, color = 'gray' }: { label: string; value: number; color?: string }) {
  const colorMap: Record<string, string> = {
    gray: 'bg-gray-50 border-gray-200',
    green: 'bg-green-50 border-green-200',
    yellow: 'bg-yellow-50 border-yellow-200',
    orange: 'bg-orange-50 border-orange-200',
    blue: 'bg-blue-50 border-blue-200',
    purple: 'bg-purple-50 border-purple-200',
  };
  return (
    <div className={`border rounded p-2 text-center ${colorMap[color] || colorMap.gray}`}>
      <div className="text-lg font-bold">{value}</div>
      <div className="text-[10px] text-gray-500">{label}</div>
    </div>
  );
}
