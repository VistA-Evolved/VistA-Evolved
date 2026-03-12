'use client';

import { useState, useEffect, useCallback } from 'react';
import { API_BASE } from '@/lib/api-config';

type Tab = 'items' | 'vendors' | 'purchase-orders';

const tabStyle = {
  padding: '12px 20px',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  borderTop: 'none',
  borderRight: 'none',
  borderBottom: '2px solid transparent',
  borderLeft: 'none',
  background: 'transparent',
} as const;

const activeTabStyle = {
  ...tabStyle,
  color: '#2563eb',
  borderBottom: '2px solid #2563eb',
  marginBottom: -2,
} as const;

const inactiveTabStyle = {
  ...tabStyle,
  color: '#64748b',
  marginBottom: -2,
} as const;

export default function InventoryAdminPage() {
  const [tab, setTab] = useState<Tab>('items');
  const [items, setItems] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');

  const fetchList = useCallback(async (endpoint: string, setter: (d: any) => void) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}${endpoint}`, { credentials: 'include' });
      const json = await res.json();
      setter(json.data || []);
    } catch { setter([]); }
    setLoading(false);
  }, []);

  useEffect(() => {
    setSelected(null);
    if (tab === 'items') fetchList('/admin/vista/inventory/items', setItems);
    if (tab === 'vendors') fetchList('/admin/vista/inventory/vendors', setVendors);
    if (tab === 'purchase-orders') fetchList('/admin/vista/inventory/purchase-orders', setPurchaseOrders);
  }, [tab, fetchList]);

  const fetchDetail = async (ien: string) => {
    try {
      const res = await fetch(`${API_BASE}/admin/vista/inventory/items/${ien}`, { credentials: 'include' });
      const json = await res.json();
      setSelected(json.data || null);
    } catch { setSelected(null); }
  };

  const tabs: { id: Tab; label: string }[] = [
    { id: 'items', label: 'Item Master' },
    { id: 'vendors', label: 'Vendors' },
    { id: 'purchase-orders', label: 'Purchase Orders' },
  ];

  const filteredItems = items.filter((i: any) => {
    if (!search) return true;
    const query = search.toLowerCase();
    return [i.name, i.nsn, i.unitOfIssue].some((value: any) => String(value || '').toLowerCase().includes(query));
  });
  const filteredVendors = vendors.filter((v: any) => !search || (v.name || '').toLowerCase().includes(search.toLowerCase()));

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f, #0f2744)', color: '#fff', padding: '28px 32px 20px' }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0 }}>Inventory & Supply Chain</h1>
        <p style={{ fontSize: 14, color: '#94a3b8', margin: '4px 0 0' }}>Item master, vendors, and purchase orders (IFCAP)</p>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #e2e8f0', background: '#fff', padding: '0 32px' }}>
        {tabs.map(t => (
          <button key={t.id} onClick={() => { setTab(t.id); setSearch(''); }} style={tab === t.id ? activeTabStyle : inactiveTabStyle}>{t.label}</button>
        ))}
      </div>

      <div style={{ padding: '24px 32px', maxWidth: 1200, margin: '0 auto' }}>
        {(tab === 'items' || tab === 'vendors') && (
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder={`Search ${tab}...`}
            style={{ width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, marginBottom: 16 }} />
        )}
        {loading && <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading...</div>}

        {!loading && tab === 'items' && (
          <div style={{ display: 'flex', gap: 20 }}>
            <div style={{ flex: 1, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead><tr style={{ background: '#f8fafc' }}>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>IEN</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Name</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>NSN</th>
                  <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Unit of Issue</th>
                </tr></thead>
                <tbody>
                  {filteredItems.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No items found</td></tr>}
                  {filteredItems.map((item: any) => (
                    <tr key={item.ien} onClick={() => fetchDetail(item.ien)} style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 14px', color: '#64748b' }}>{item.ien}</td>
                      <td style={{ padding: '8px 14px', fontWeight: 600 }}>{item.name}</td>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace' }}>{item.nsn || '-'}</td>
                      <td style={{ padding: '8px 14px' }}>{item.unitOfIssue || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {selected && (
              <div style={{ width: 340, background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', padding: 20 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Item Detail</h3>
                {Object.entries(selected).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>{k.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>{String(v) || 'N/A'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && tab === 'vendors' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>IEN</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Vendor Name</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>Phone</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>City</th>
              </tr></thead>
              <tbody>
                {filteredVendors.length === 0 && <tr><td colSpan={4} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No vendors found</td></tr>}
                {filteredVendors.map((v: any) => (
                  <tr key={v.ien} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#64748b' }}>{v.ien}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600 }}>{v.name}</td>
                    <td style={{ padding: '8px 14px' }}>{v.phone || '-'}</td>
                    <td style={{ padding: '8px 14px' }}>{v.city || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && tab === 'purchase-orders' && (
          <div style={{ background: '#fff', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#f8fafc' }}>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>IEN</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>0 Node Name</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>0 Node Piece 2</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>0 Node Piece 3</th>
                <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 600, borderBottom: '1px solid #e2e8f0' }}>0 Node Piece 4</th>
              </tr></thead>
              <tbody>
                {purchaseOrders.length === 0 && <tr><td colSpan={5} style={{ padding: 20, textAlign: 'center', color: '#94a3b8' }}>No purchase orders found</td></tr>}
                {purchaseOrders.map((po: any) => (
                  <tr key={po.ien} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#64748b' }}>{po.ien}</td>
                    <td style={{ padding: '8px 14px', fontWeight: 600 }}>{po.file0Name}</td>
                    <td style={{ padding: '8px 14px' }}>{po.file0Piece2}</td>
                    <td style={{ padding: '8px 14px' }}>{po.file0Piece3}</td>
                    <td style={{ padding: '8px 14px' }}>{po.file0Piece4}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
