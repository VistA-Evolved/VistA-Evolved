/**
 * Immunizations Page -- Patient immunization history from VistA via ORQQPX IMMUN LIST.
 * Phase 65: VistA-first. Real data with PDF download.
 */

'use client';

import { useEffect, useState } from 'react';
import { DataSourceBadge } from '@/components/data-source-badge';
import { fetchImmunizations, exportSectionUrl } from '@/lib/api';

interface Immunization {
  ien: string;
  name: string;
  dateTime: string;
  reaction: string;
}

export default function ImmunizationsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    fetchImmunizations()
      .then((r) => {
        setData(r.data);
      })
      .catch(() => {
        setData({ _integration: 'pending', results: [], pendingTargets: ['ORQQPX IMMUN LIST'] });
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const results: Immunization[] = data?.results || [];
  const isPending = data?._integration === 'pending';

  return (
    <div className="container">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '1.5rem',
        }}
      >
        <div>
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>My Immunizations</h1>
          <p style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem' }}>
            Vaccination history from your health record
          </p>
        </div>
        <a
          href={exportSectionUrl('immunizations')}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-block',
            padding: '0.375rem 0.75rem',
            fontSize: '0.8125rem',
            background: '#2563eb',
            color: '#fff',
            borderRadius: 4,
            textDecoration: 'none',
          }}
        >
          Download PDF
        </a>
      </div>

      <div className="card" style={{ marginBottom: '1rem' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '0.5rem',
          }}
        >
          <h3 style={{ margin: 0 }}>Immunization History</h3>
          <DataSourceBadge source={isPending ? 'pending' : 'ehr'} />
        </div>

        {loading ? (
          <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading immunizations...</p>
        ) : results.length === 0 ? (
          <div className="empty-state" style={{ padding: '1.5rem' }}>
            <p>
              {isPending
                ? 'Immunization data pending -- VistA integration in progress'
                : 'No immunizations on file'}
            </p>
            {isPending && data?.pendingTargets?.length > 0 && (
              <p style={{ fontSize: '0.75rem', color: '#888', marginTop: '0.5rem' }}>
                Target RPCs: {data.pendingTargets.join(', ')}
              </p>
            )}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--portal-border, #e2e8f0)' }}>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>
                  Immunization
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>
                  Date
                </th>
                <th style={{ textAlign: 'left', padding: '0.5rem 0.75rem', fontWeight: 600 }}>
                  Reaction
                </th>
              </tr>
            </thead>
            <tbody>
              {results.map((imm) => (
                <tr
                  key={imm.ien}
                  style={{ borderBottom: '1px solid var(--portal-border, #f1f5f9)' }}
                >
                  <td style={{ padding: '0.5rem 0.75rem' }}>{imm.name || imm.ien}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{imm.dateTime || '\u2014'}</td>
                  <td style={{ padding: '0.5rem 0.75rem' }}>{imm.reaction || 'None'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data?.rpcUsed?.length > 0 && (
        <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.5rem' }}>
          Source: VistA via {data.rpcUsed.join(', ')}
        </p>
      )}
    </div>
  );
}
