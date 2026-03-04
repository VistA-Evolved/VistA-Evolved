/**
 * ActionInspector.tsx -- Phase 56
 *
 * Developer-only overlay that shows action -> endpoint -> RPC mappings
 * for the current page/tab. Toggled via keyboard shortcut or dev toolbar.
 *
 * Shows:
 * - All actions for the current location
 * - Their endpoint, status, and RPC assignments
 * - Integration-pending items highlighted
 *
 * Only renders when NODE_ENV !== 'production'.
 */
'use client';

import { useState, useEffect } from 'react';
import {
  ACTION_REGISTRY,
  getActionsByLocation,
  getActionRegistryStats,
  type CprsAction,
} from '@/actions/actionRegistry';

interface ActionInspectorProps {
  /** Current tab/location to filter actions. If empty, shows all. */
  location?: string;
}

export default function ActionInspector({ location }: ActionInspectorProps) {
  const [visible, setVisible] = useState(false);
  const [filterLocation, setFilterLocation] = useState(location || '');

  // Toggle with Ctrl+Shift+I (not conflicting with browser DevTools on most setups)
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        setVisible((v) => !v);
      }
    }
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Don't render in production
  if (process.env.NODE_ENV === 'production') return null;
  if (!visible) return null;

  const actions: CprsAction[] = filterLocation
    ? getActionsByLocation(filterLocation)
    : ACTION_REGISTRY;

  const stats = getActionRegistryStats();

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        right: 0,
        width: 480,
        height: '100vh',
        background: '#111',
        borderLeft: '2px solid #444',
        zIndex: 10000,
        overflowY: 'auto',
        padding: 16,
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#ccc',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        <h3 style={{ margin: 0, color: '#88c0d0' }}>Action Inspector</h3>
        <button
          onClick={() => setVisible(false)}
          style={{
            background: 'none',
            border: '1px solid #555',
            color: '#aaa',
            cursor: 'pointer',
            padding: '2px 8px',
            borderRadius: 3,
          }}
        >
          Close
        </button>
      </div>

      {/* Stats bar */}
      <div
        style={{
          display: 'flex',
          gap: 12,
          marginBottom: 12,
          padding: '6px 0',
          borderBottom: '1px solid #333',
        }}
      >
        <span>Total: {stats.total}</span>
        <span style={{ color: '#a3d9a3' }}>Wired: {stats.wired}</span>
        <span style={{ color: '#d9c9a3' }}>Pending: {stats.pending}</span>
        <span style={{ color: '#a3c4d9' }}>Unsupported: {stats.unsupported}</span>
        <span style={{ color: '#d9a3a3' }}>Stub: {stats.stub}</span>
        <span>RPCs: {stats.uniqueRpcs}</span>
      </div>

      {/* Location filter */}
      <div style={{ marginBottom: 12 }}>
        <label style={{ marginRight: 8 }}>Filter location:</label>
        <select
          value={filterLocation}
          onChange={(e) => setFilterLocation(e.target.value)}
          style={{
            background: '#222',
            color: '#ccc',
            border: '1px solid #444',
            padding: '2px 4px',
            borderRadius: 3,
          }}
        >
          <option value="">All</option>
          {stats.locations.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
      </div>

      {/* Actions table */}
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          fontSize: 11,
        }}
      >
        <thead>
          <tr style={{ borderBottom: '1px solid #444', color: '#888' }}>
            <th style={{ textAlign: 'left', padding: 4 }}>Action</th>
            <th style={{ textAlign: 'left', padding: 4 }}>Endpoint</th>
            <th style={{ textAlign: 'left', padding: 4 }}>RPCs</th>
            <th style={{ textAlign: 'left', padding: 4 }}>Status</th>
          </tr>
        </thead>
        <tbody>
          {actions.map((a) => (
            <tr
              key={a.actionId}
              style={{
                borderBottom: '1px solid #222',
                background:
                  a.status === 'integration-pending'
                    ? '#2a2518'
                    : a.status === 'unsupported-in-sandbox'
                      ? '#182a2a'
                      : a.status === 'stub'
                        ? '#251818'
                        : 'transparent',
              }}
            >
              <td style={{ padding: 4 }}>
                <div>{a.actionId}</div>
                <div style={{ fontSize: 10, color: '#777' }}>{a.label}</div>
              </td>
              <td style={{ padding: 4, color: '#88c0d0' }}>{a.endpoint || '-'}</td>
              <td style={{ padding: 4, fontSize: 10 }}>{a.rpcs.join(', ') || '-'}</td>
              <td style={{ padding: 4 }}>
                <StatusBadge status={a.status} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p
        style={{
          marginTop: 16,
          fontSize: 10,
          color: '#555',
          textAlign: 'center',
        }}
      >
        Ctrl+Shift+J to toggle | Phase 56
      </p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    wired: { bg: '#2d4a2d', text: '#a3d9a3' },
    'integration-pending': { bg: '#4a3d2d', text: '#d9c9a3' },
    'unsupported-in-sandbox': { bg: '#2d3d4a', text: '#a3c4d9' },
    stub: { bg: '#4a2d2d', text: '#d9a3a3' },
  };
  const c = colors[status] || { bg: '#333', text: '#888' };
  return (
    <span
      style={{
        display: 'inline-block',
        background: c.bg,
        color: c.text,
        padding: '1px 5px',
        borderRadius: 3,
        fontSize: 10,
      }}
    >
      {status}
    </span>
  );
}
