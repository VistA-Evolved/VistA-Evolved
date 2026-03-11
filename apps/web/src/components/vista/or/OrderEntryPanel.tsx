'use client';

import { useState, useEffect, useCallback } from 'react';

const API = typeof window !== 'undefined'
  ? `${window.location.protocol}//${window.location.hostname}:3001`
  : 'http://127.0.0.1:3001';

interface Order {
  id: string;
  text: string;
  status: string;
  type: string;
  startDate: string;
  provider: string;
}

export default function OrderEntryPanel({ dfn = '46' }: { dfn?: string }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rpc, setRpc] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/vista/cprs/orders?dfn=${dfn}`, { credentials: 'include' });
      const json = await res.json();
      if (json.ok) {
        setOrders(json.orders || json.data || json.results || []);
        setRpc(Array.isArray(json.rpcUsed) ? json.rpcUsed.join(', ') : json.rpcUsed || '');
      } else {
        setError(json.error || 'Failed to load orders');
      }
    } catch (e: unknown) {
      setError((e as Error).message);
    }
    setLoading(false);
  }, [dfn]);

  useEffect(() => { loadData(); }, [loadData]);

  const statuses = ['all', ...new Set(orders.map(o => o.status).filter(Boolean))];
  const filtered = statusFilter === 'all' ? orders : orders.filter(o => o.status === statusFilter);

  const statusColor = (status: string) => {
    const s = (status || '').toLowerCase();
    if (s.includes('active') || s.includes('pend')) return 'bg-blue-100 text-blue-800';
    if (s.includes('complete') || s.includes('done')) return 'bg-green-100 text-green-800';
    if (s.includes('dc') || s.includes('cancel') || s.includes('expire')) return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-600';
  };

  if (loading) return <div className="animate-pulse p-6">Loading orders from VistA...</div>;
  if (error) return <div className="text-red-500 p-6">Error: {error} <button onClick={loadData} className="ml-2 underline">Retry</button></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold">Orders (CPOE)</h2>
          <p className="text-sm text-muted-foreground">DFN: {dfn} &middot; {orders.length} order(s)</p>
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="text-xs px-2 py-1 border rounded bg-background"
          >
            {statuses.map(s => <option key={s} value={s}>{s === 'all' ? 'All statuses' : s}</option>)}
          </select>
          <button onClick={loadData} className="px-3 py-1 text-xs rounded border hover:bg-muted">Refresh</button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
          No orders found
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">Order</th>
                <th className="px-4 py-2.5 text-left font-medium w-24">Status</th>
                <th className="px-4 py-2.5 text-left font-medium w-24">Type</th>
                <th className="px-4 py-2.5 text-left font-medium w-28">Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map(o => (
                <tr key={o.id} className="border-t hover:bg-muted/50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium">{o.text}</div>
                    {o.provider && <div className="text-xs text-muted-foreground mt-0.5">{o.provider}</div>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor(o.status)}`}>{o.status}</span>
                  </td>
                  <td className="px-4 py-3 text-xs">{o.type}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{o.startDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 50 && (
            <div className="px-4 py-2 text-xs text-muted-foreground bg-muted border-t">
              Showing 50 of {filtered.length} orders
            </div>
          )}
        </div>
      )}

      <div className="text-xs text-muted-foreground border-t pt-2 flex justify-between">
        <span>RPC: {rpc}</span>
        <span>Source: VistA VEHU</span>
      </div>
    </div>
  );
}
