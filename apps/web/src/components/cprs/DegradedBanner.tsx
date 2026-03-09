'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { API_BASE } from '@/lib/api-config';

const CHECK_INTERVAL = 30_000; // 30 seconds
const TIMEOUT_MS = 5_000;

export type SystemStatus = 'ok' | 'degraded' | 'unreachable';

interface ReadyResponse {
  ok: boolean;
  vista?: string;
  circuitBreaker?: string;
}

function classifyReadyState(data: ReadyResponse): { status: SystemStatus; detail: string } {
  if (data.ok && data.vista === 'reachable') {
    return { status: 'ok', detail: '' };
  }

  if (data.vista === 'reachable') {
    if (data.circuitBreaker === 'open') {
      return {
        status: 'degraded',
        detail: 'VistA is reachable, but the RPC circuit breaker is open. Some live requests are temporarily blocked and writes remain disabled.',
      };
    }

    return {
      status: 'degraded',
      detail: 'VistA is reachable, but the system is reporting degraded readiness. Writes remain disabled until health recovers.',
    };
  }

  return {
    status: 'degraded',
    detail: 'VistA EHR is unreachable. Read-only mode - writes are blocked.',
  };
}

/**
 * Phase 16: Degraded mode banner.
 *
 * Polls /ready every 30s. Shows a warning banner when the API or VistA
 * is unreachable or degraded. Blocks unsafe write actions when degraded.
 */
export function DegradedBanner() {
  const [status, setStatus] = useState<SystemStatus>('ok');
  const [detail, setDetail] = useState('');
  const [dismissed, setDismissed] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const checkHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const res = await fetch(`${API_BASE}/ready`, {
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!res.ok) {
        setStatus('unreachable');
        setDetail('API returned an error.');
        setDismissed(false);
        return;
      }

      const data: ReadyResponse = await res.json();
      const next = classifyReadyState(data);
      setStatus(next.status);
      setDetail(next.detail);
      if (next.status !== 'ok') setDismissed(false);
    } catch {
      setStatus('unreachable');
      setDetail('Cannot reach API server.');
      setDismissed(false);
    }
  }, []);

  useEffect(() => {
    checkHealth();
    intervalRef.current = setInterval(checkHealth, CHECK_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [checkHealth]);

  if (status === 'ok' || dismissed) return null;

  const bgColor = status === 'unreachable' ? '#dc3545' : '#ffc107';
  const textColor = status === 'unreachable' ? '#fff' : '#333';

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        padding: '8px 16px',
        background: bgColor,
        color: textColor,
        fontSize: 13,
        fontWeight: 600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
    >
      <span>
        {status === 'unreachable' ? '⚠ System Unreachable' : '⚠ Degraded Mode'}
        {detail && ` — ${detail}`}
      </span>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button
          onClick={checkHealth}
          style={{
            background: 'transparent',
            border: `1px solid ${textColor}`,
            color: textColor,
            borderRadius: 4,
            padding: '2px 8px',
            cursor: 'pointer',
            fontSize: 12,
          }}
        >
          Retry
        </button>
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'transparent',
            border: 'none',
            color: textColor,
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
          }}
          aria-label="Dismiss banner"
        >
          ×
        </button>
      </div>
    </div>
  );
}

/**
 * Hook to check system status for write guards.
 * Usage: const { canWrite, status } = useSystemStatus();
 */
export function useSystemStatus(): { status: SystemStatus; canWrite: boolean } {
  const [status, setStatus] = useState<SystemStatus>('ok');

  useEffect(() => {
    async function check() {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
        const res = await fetch(`${API_BASE}/ready`, {
          credentials: 'include',
          signal: controller.signal,
        });
        clearTimeout(timeout);
        const data: ReadyResponse = await res.json();
        setStatus(classifyReadyState(data).status);
      } catch {
        setStatus('unreachable');
      }
    }
    check();
    const interval = setInterval(check, CHECK_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return { status, canWrite: status === 'ok' };
}
