'use client';

/**
 * Admin Browser Terminal page
 * Phase 534 (Wave 39 P4)
 *
 * Admin-only page for VistA MUMPS interaction via xterm.js.
 */

import { Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useEffect, useState } from 'react';
import { API_BASE } from '@/lib/api-config';

const BrowserTerminal = dynamic(() => import('../../../../components/terminal/BrowserTerminal'), {
  ssr: false,
  loading: () => <div style={{ color: '#94a3b8', padding: 24 }}>Loading terminal...</div>,
});

class TerminalBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TerminalBootstrapError';
  }
}

export default function AdminTerminalPage() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const res = await fetch(`${API_BASE}/terminal/health`, { credentials: 'include' });
        const data = await res.json().catch(() => null);
        if (!res.ok || !data?.ok) {
          throw new TerminalBootstrapError(data?.error || 'Unable to load terminal health');
        }
        if (!cancelled) {
          setReady(true);
          setError(null);
        }
      } catch (err) {
        if (!cancelled) {
          setReady(false);
          setError(err instanceof Error ? err.message : 'Unable to load terminal');
        }
      }
    }

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto', color: '#e2e8f0' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Browser Terminal</h1>
      <p style={{ color: '#94a3b8', marginBottom: 16 }}>
        Phase 534 -- Direct VistA MUMPS console via xterm.js over WebSocket.
      </p>

      {/* RPC blocklist warning */}
      <div
        style={{
          background: '#422006',
          border: '1px solid #f59e0b',
          borderRadius: 8,
          padding: 12,
          marginBottom: 16,
          fontSize: 13,
          color: '#fbbf24',
        }}
      >
        <strong>Security Notice:</strong> The WebSocket console gateway blocks
        <code
          style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4, margin: '0 4px' }}
        >
          XUS AV CODE
        </code>
        and
        <code
          style={{ background: '#1e293b', padding: '2px 6px', borderRadius: 4, margin: '0 4px' }}
        >
          XUS SET VISITOR
        </code>
        RPCs to prevent credential theft or privilege escalation through this console. All commands
        are logged to the immutable audit trail.
      </div>

      {error ? (
        <div
          style={{
            background: '#450a0a',
            border: '1px solid #dc2626',
            borderRadius: 8,
            padding: 16,
            color: '#fecaca',
          }}
        >
          Unable to load terminal. {error}
        </div>
      ) : !ready ? (
        <div style={{ color: '#94a3b8', padding: 24 }}>Loading terminal...</div>
      ) : (
        <Suspense fallback={<div style={{ color: '#94a3b8' }}>Loading terminal...</div>}>
          <div
            style={{ height: 500, border: '1px solid #334155', borderRadius: 8, overflow: 'hidden' }}
          >
            <BrowserTerminal showStatus />
          </div>
        </Suspense>
      )}
    </div>
  );
}
