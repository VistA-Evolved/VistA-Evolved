'use client';

/**
 * VistaAlignmentBanner.tsx -- Dev-mode banner showing VistA wiring status per panel.
 *
 * Only renders when NODE_ENV !== 'production'.
 * Shows a small indicator:
 *   - Green badge: "Wired to VistA" (all RPCs have live call sites)
 *   - Yellow badge: "Partially wired" (some RPCs live, some pending)
 *   - Gray badge: "No VistA RPCs" (panel doesn't use VistA)
 *   - Red badge: "Integration pending" with target RPCs
 *
 * Generated metadata in: apps/web/src/lib/vista-panel-wiring.ts
 * Regenerate with: node tools/rpc-extract/build-coverage-map.mjs
 */

import { useMemo } from 'react';
import { getPanelWiring, type PanelWiring } from '@/lib/vista-panel-wiring';

interface Props {
  /** Panel component name, e.g. "CoverSheetPanel" */
  panelName: string;
}

export default function VistaAlignmentBanner({ panelName }: Props) {
  // useMemo must be called unconditionally (Rules of Hooks)
  const wiring = useMemo(() => getPanelWiring(panelName), [panelName]);

  // Only render in development
  if (process.env.NODE_ENV === 'production') return null;
  if (!wiring) return null;

  const { label, color, bg, detail } = getStatusDisplay(wiring);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '2px 8px',
        fontSize: '11px',
        fontFamily: 'monospace',
        borderRadius: '4px',
        backgroundColor: bg,
        color,
        opacity: 0.85,
        userSelect: 'none',
      }}
      title={detail}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
      {wiring.pendingRpcs.length > 0 && (
        <span style={{ opacity: 0.7 }}>
          {' '}
          | target: {wiring.pendingRpcs.slice(0, 2).join(', ')}
          {wiring.pendingRpcs.length > 2 ? ` +${wiring.pendingRpcs.length - 2}` : ''}
        </span>
      )}
    </div>
  );
}

function getStatusDisplay(w: PanelWiring): {
  label: string;
  color: string;
  bg: string;
  detail: string;
} {
  if (w.noVista) {
    return {
      label: 'no VistA RPCs',
      color: '#888',
      bg: 'rgba(128,128,128,0.08)',
      detail: `${w.panel}: no VistA RPC dependency`,
    };
  }
  if (w.wiredToVista) {
    return {
      label: `wired_to_vista: true (${w.wiredRpcs}/${w.totalRpcs})`,
      color: '#16a34a',
      bg: 'rgba(22,163,74,0.08)',
      detail: `${w.panel}: all ${w.totalRpcs} RPCs have live call sites`,
    };
  }
  if (w.partiallyWired) {
    return {
      label: `wired_to_vista: partial (${w.wiredRpcs}/${w.totalRpcs})`,
      color: '#ca8a04',
      bg: 'rgba(202,138,4,0.08)',
      detail: `${w.panel}: ${w.pendingRpcs.length} RPCs pending: ${w.pendingRpcs.join(', ')}`,
    };
  }
  return {
    label: `wired_to_vista: false (0/${w.totalRpcs})`,
    color: '#dc2626',
    bg: 'rgba(220,38,38,0.08)',
    detail: `${w.panel}: all ${w.totalRpcs} RPCs pending: ${w.pendingRpcs.join(', ')}`,
  };
}
