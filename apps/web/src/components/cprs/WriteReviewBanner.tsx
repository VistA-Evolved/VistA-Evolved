'use client';

/**
 * WriteReviewBanner -- Phase 437.
 *
 * Displays a supervised-mode review banner when a writeback command
 * is awaiting clinical review before execution. Shows the dry-run
 * transcript and provides approve/reject actions.
 *
 * Usage:
 *   <WriteReviewBanner commandId={id} onResolved={() => refetch()} />
 */

import { useState } from 'react';
import { csrfHeaders } from '@/lib/csrf';

export interface WriteReviewBannerProps {
  /** The writeback command ID awaiting review */
  commandId: string;
  /** Dry-run transcript preview */
  preview?: {
    rpcName: string;
    params: Record<string, unknown>;
    simulatedResult: string;
  };
  /** Safe-harbor tier badge (e.g. "supervised", "experimental") */
  tier?: string;
  /** Callback after approve/reject completes */
  onResolved?: (decision: 'approve' | 'reject', result: any) => void;
}

export function WriteReviewBanner({
  commandId,
  preview,
  tier,
  onResolved,
}: WriteReviewBannerProps) {
  const [loading, setLoading] = useState(false);
  const [reason, setReason] = useState('');
  const [result, setResult] = useState<{ ok: boolean; status?: string; error?: string } | null>(
    null
  );

  const handleDecision = async (decision: 'approve' | 'reject') => {
    setLoading(true);
    try {
      const resp = await fetch(`/api/writeback/commands/${commandId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...csrfHeaders() },
        credentials: 'include',
        body: JSON.stringify({ decision, reason: reason || undefined }),
      });
      const data = await resp.json();
      setResult(data);
      onResolved?.(decision, data);
    } catch (err: any) {
      setResult({ ok: false, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div
        style={{
          padding: '12px 16px',
          margin: '8px 0',
          borderRadius: '6px',
          backgroundColor: result.ok ? '#ecfdf5' : '#fef2f2',
          border: result.ok ? '1px solid #86efac' : '1px solid #fca5a5',
          fontSize: '13px',
        }}
      >
        {result.ok
          ? `Command ${result.status === 'completed' ? 'executed' : 'approved'} successfully.`
          : `Review failed: ${result.error || 'Unknown error'}`}
      </div>
    );
  }

  return (
    <div
      style={{
        padding: '16px',
        margin: '8px 0',
        borderRadius: '6px',
        backgroundColor: '#fffbeb',
        border: '1px solid #fcd34d',
        fontSize: '13px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
        <span style={{ fontWeight: 600, color: '#92400e' }}>Supervised Review Required</span>
        {tier && (
          <span
            style={{
              fontSize: '11px',
              padding: '2px 6px',
              borderRadius: '4px',
              backgroundColor: tier === 'supervised' ? '#fef3c7' : '#fee2e2',
              color: tier === 'supervised' ? '#78350f' : '#991b1b',
              fontWeight: 500,
            }}
          >
            {tier.toUpperCase()}
          </span>
        )}
      </div>

      {preview && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '12px',
            backgroundColor: '#f8fafc',
            borderRadius: '4px',
            fontFamily: 'monospace',
            fontSize: '12px',
            lineHeight: '1.5',
            overflowX: 'auto',
          }}
        >
          <div>
            <strong>RPC:</strong> {preview.rpcName}
          </div>
          <div>
            <strong>Params:</strong> {JSON.stringify(preview.params, null, 2).slice(0, 300)}
          </div>
          <div>
            <strong>Expected:</strong> {preview.simulatedResult}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="text"
          placeholder="Reason (optional for approve, recommended for reject)"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          disabled={loading}
          style={{
            flex: '1 1 200px',
            padding: '6px 10px',
            borderRadius: '4px',
            border: '1px solid #d1d5db',
            fontSize: '13px',
          }}
        />
        <button
          onClick={() => handleDecision('approve')}
          disabled={loading}
          style={{
            padding: '6px 16px',
            borderRadius: '4px',
            backgroundColor: '#059669',
            color: 'white',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {loading ? '...' : 'Approve'}
        </button>
        <button
          onClick={() => handleDecision('reject')}
          disabled={loading}
          style={{
            padding: '6px 16px',
            borderRadius: '4px',
            backgroundColor: '#dc2626',
            color: 'white',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            fontSize: '13px',
            fontWeight: 500,
          }}
        >
          {loading ? '...' : 'Reject'}
        </button>
      </div>
    </div>
  );
}
