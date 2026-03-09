/**
 * Health Records — Multi-section view of clinical data from VistA.
 * Fetches real EHR data via portal health proxy routes.
 * PDF download buttons for each section and full record.
 *
 * VistA RPCs backing this page:
 *   ORQQAL LIST, ORWCH PROBLEM LIST, ORQQVI VITALS,
 *   ORWPS ACTIVE, ORWPT SELECT,
 *   ORWLRR INTERIM (pending), ORQQCN LIST (pending),
 *   ORWSR LIST (pending), TIU DOCUMENTS BY CONTEXT (pending)
 */

'use client';

import { useEffect, useState } from 'react';
import { DataSourceBadge } from '@/components/data-source-badge';
import {
  fetchAllergies,
  fetchProblems,
  fetchVitals,
  fetchMedications,
  fetchDemographics,
  fetchLabs,
  fetchConsults,
  fetchSurgery,
  fetchDischargeSummaries,
  exportSectionUrl,
  exportFullRecordUrl,
} from '@/lib/api';

interface SectionState {
  loading: boolean;
  data: any;
  error?: string;
}

function resolveSectionSource(data: any): 'ehr' | 'pending' | 'local' {
  if (data?._integration === 'pending') return 'pending';
  if (data?.source === 'vista' || data?.rpcUsed) return 'ehr';
  return 'local';
}

function DownloadButton({ url, label }: { url: string; label: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-block',
        padding: '0.25rem 0.5rem',
        fontSize: '0.75rem',
        background: '#2563eb',
        color: '#fff',
        borderRadius: 4,
        textDecoration: 'none',
        cursor: 'pointer',
      }}
    >
      {label}
    </a>
  );
}

export default function HealthRecordsPage() {
  const [allergies, setAllergies] = useState<SectionState>({ loading: true, data: null });
  const [problems, setProblems] = useState<SectionState>({ loading: true, data: null });
  const [vitals, setVitals] = useState<SectionState>({ loading: true, data: null });
  const [_medications, setMeds] = useState<SectionState>({ loading: true, data: null });
  const [demographics, setDemo] = useState<SectionState>({ loading: true, data: null });
  const [labs, setLabs] = useState<SectionState>({ loading: true, data: null });
  const [consults, setConsults] = useState<SectionState>({ loading: true, data: null });
  const [surgery, setSurgery] = useState<SectionState>({ loading: true, data: null });
  const [dcSummaries, setDcSummaries] = useState<SectionState>({ loading: true, data: null });

  useEffect(() => {
    fetchAllergies().then((r) => setAllergies({ loading: false, data: r.data }));
    fetchProblems().then((r) => setProblems({ loading: false, data: r.data }));
    fetchVitals().then((r) => setVitals({ loading: false, data: r.data }));
    fetchMedications().then((r) => setMeds({ loading: false, data: r.data }));
    fetchDemographics().then((r) => setDemo({ loading: false, data: r.data }));
    fetchLabs().then((r) => setLabs({ loading: false, data: r.data }));
    fetchConsults().then((r) => setConsults({ loading: false, data: r.data }));
    fetchSurgery().then((r) => setSurgery({ loading: false, data: r.data }));
    fetchDischargeSummaries().then((r) => setDcSummaries({ loading: false, data: r.data }));
  }, []);

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
          <h1 style={{ fontSize: '1.5rem', marginBottom: '0.25rem' }}>Health Records</h1>
          <p style={{ color: 'var(--portal-text-muted)', fontSize: '0.875rem' }}>
            Health information available through the portal
          </p>
        </div>
        <DownloadButton url={exportFullRecordUrl()} label="Download Full Record (PDF)" />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Demographics */}
        <HealthSection
          title="Demographics"
          loading={demographics.loading}
          data={demographics.data}
          source={resolveSectionSource(demographics.data)}
          downloadUrl={exportSectionUrl('demographics')}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No demographic data available</p>;
            const p = results[0];
            return (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem' }}>
                <div>
                  <strong>Name:</strong> {p.name}
                </div>
                <div>
                  <strong>Sex:</strong> {p.sex}
                </div>
                <div>
                  <strong>DOB:</strong> {p.dob}
                </div>
              </div>
            );
          }}
        />

        {/* Allergies */}
        <HealthSection
          title="Allergies"
          loading={allergies.loading}
          data={allergies.data}
          source={resolveSectionSource(allergies.data)}
          downloadUrl={exportSectionUrl('allergies')}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No known allergies</p>;
            return (
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Allergen</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Severity</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Reactions</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((a: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{a.allergen}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{a.severity || '—'}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{a.reactions || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />

        {/* Problems */}
        <HealthSection
          title="Problem List"
          loading={problems.loading}
          data={problems.data}
          source={resolveSectionSource(problems.data)}
          downloadUrl={exportSectionUrl('problems')}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No problems on file</p>;
            return (
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Problem</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Onset</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((p: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{p.text}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '0.125rem 0.375rem',
                            borderRadius: 4,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            background: p.status === 'active' ? '#dcfce7' : '#f1f5f9',
                            color: p.status === 'active' ? '#166534' : '#64748b',
                          }}
                        >
                          {p.status}
                        </span>
                      </td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{p.onset || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />

        {/* Vitals */}
        <HealthSection
          title="Vital Signs"
          loading={vitals.loading}
          data={vitals.data}
          source={resolveSectionSource(vitals.data)}
          downloadUrl={exportSectionUrl('vitals')}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No vitals recorded</p>;
            return (
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Type</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Value</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Taken At</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((v: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{v.type}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{v.value}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{v.takenAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />

        {/* Labs (Phase 61: wired to ORWLRR INTERIM) */}
        <HealthSection
          title="Lab Results"
          loading={labs.loading}
          data={labs.data}
          source={resolveSectionSource(labs.data)}
          downloadUrl={exportSectionUrl('labs')}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) {
              return d.rawText ? (
                <pre
                  style={{
                    whiteSpace: 'pre-wrap',
                    fontSize: '0.8rem',
                    color: '#475569',
                    maxHeight: 200,
                    overflow: 'auto',
                  }}
                >
                  {d.rawText}
                </pre>
              ) : (
                <p>No lab results on file</p>
              );
            }
            return (
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Test</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Result</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Units</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Ref Range</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Flag</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((r: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{r.testName}</td>
                      <td
                        style={{
                          padding: '0.25rem 0.5rem',
                          fontWeight: r.flag ? 600 : 400,
                          color: r.flag ? '#dc2626' : 'inherit',
                        }}
                      >
                        {r.result}
                      </td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{r.units || '--'}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{r.refRange || '--'}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>
                        {r.flag ? (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>{r.flag}</span>
                        ) : (
                          '--'
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />

        {/* Consults (Phase 61: wired to ORQQCN LIST) */}
        <HealthSection
          title="Consult History"
          loading={consults.loading}
          data={consults.data}
          source={resolveSectionSource(consults.data)}
          downloadUrl={exportSectionUrl('consults')}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No consults on file</p>;
            return (
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Service</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Status</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Date</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Type</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((c: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{c.service}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{c.status}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{c.date}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{c.type}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />

        {/* Surgery (Phase 61: wired to ORWSR LIST) */}
        <HealthSection
          title="Surgery History"
          loading={surgery.loading}
          data={surgery.data}
          source={resolveSectionSource(surgery.data)}
          downloadUrl={exportSectionUrl('surgery')}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No surgical history on file</p>;
            return (
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Procedure</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Date</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Surgeon</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((s: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{s.procedure}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{s.date}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{s.surgeon || '--'}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{s.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />

        {/* Discharge Summaries (Phase 61: wired to TIU DOCUMENTS BY CONTEXT) */}
        <HealthSection
          title="Discharge Summaries"
          loading={dcSummaries.loading}
          data={dcSummaries.data}
          source={resolveSectionSource(dcSummaries.data)}
          downloadUrl={exportSectionUrl('dc-summaries')}
          renderData={(d) => {
            const results = d.results || [];
            if (!results.length) return <p>No discharge summaries on file</p>;
            return (
              <table style={{ width: '100%', fontSize: '0.875rem', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #e2e8f0', textAlign: 'left' }}>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Title</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Date</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Author</th>
                    <th style={{ padding: '0.25rem 0.5rem' }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((dc: any, i: number) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{dc.title}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{dc.date}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{dc.author || '--'}</td>
                      <td style={{ padding: '0.25rem 0.5rem' }}>{dc.status || '--'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
          }}
        />
      </div>
    </div>
  );
}

function HealthSection({
  title,
  loading,
  data,
  source,
  downloadUrl,
  renderData,
}: {
  title: string;
  loading: boolean;
  data: any;
  source: 'ehr' | 'pending' | 'local';
  downloadUrl?: string;
  renderData: (data: any) => React.ReactNode;
}) {
  return (
    <div className="card">
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '0.5rem',
        }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {downloadUrl && <DownloadButton url={downloadUrl} label="PDF" />}
          <DataSourceBadge source={source} />
        </div>
      </div>
      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Loading...</p>
      ) : (
        renderData(data || {})
      )}
    </div>
  );
}
