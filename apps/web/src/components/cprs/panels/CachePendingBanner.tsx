'use client';

import type { DomainFetchMeta } from '@/stores/data-cache';

interface Props {
  title: string;
  noun: string;
  meta: DomainFetchMeta;
  defaultTargets: string[];
}

export default function CachePendingBanner({ title, noun, meta, defaultTargets }: Props) {
  const statusLabel = meta.status || (meta.ok ? 'ok' : 'request-failed');
  const targetRpcs = meta.pendingTargets.length > 0 ? meta.pendingTargets : defaultTargets;

  return (
    <div
      style={{
        border: '1px solid #f59e0b',
        borderRadius: 6,
        padding: 12,
        background: '#fffbeb',
        color: '#92400e',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 13, marginBottom: 6 }}>
        {meta.error
          ? `The latest ${noun} fetch failed: ${meta.error}`
          : meta.pendingNote ||
            `The latest ${noun} fetch did not return a trustworthy live VistA result.`}
      </div>
      <div style={{ fontSize: 12, marginBottom: 4 }}>
        <strong>Status:</strong> {statusLabel}
      </div>
      {meta.rpcUsed.length > 0 && (
        <div style={{ fontSize: 12, marginBottom: 4 }}>
          <strong>RPC attempted:</strong> {meta.rpcUsed.join(', ')}
        </div>
      )}
      <div style={{ fontSize: 12 }}>
        <strong>Target RPCs:</strong> {targetRpcs.join(', ')}
      </div>
    </div>
  );
}