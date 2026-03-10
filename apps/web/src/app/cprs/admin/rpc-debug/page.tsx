'use client';

/**
 * RPC Debug -- Admin page that surfaces the RpcDebugPanel.
 * Phase 41 built the panel but it was orphaned (never imported).
 * Phase 87 audit wires it into the admin console.
 */

import RpcDebugPanel from '@/components/cprs/panels/RpcDebugPanel';

export default function RpcDebugPage() {
  return (
    <div style={{ padding: 16 }}>
      <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>RPC Debug Console</h2>
      <RpcDebugPanel />
    </div>
  );
}
