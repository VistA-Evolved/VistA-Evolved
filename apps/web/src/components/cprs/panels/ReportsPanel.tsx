'use client';

/**
 * Reports Panel — Phase 18C enhanced.
 *
 * Shows report types + text viewer (original Phase 14B).
 * Phase 18 adds:
 *   - Imaging status indicator (connected/not available)
 *   - Patient study list from /vista/imaging/studies
 *   - Viewer launch button (OHIF / external PACS URL)
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { DomainFetchMeta, ReportDef } from '../../../stores/data-cache';
import styles from '../cprs.module.css';
import { API_BASE } from '@/lib/api-config';
import CachePendingBanner from './CachePendingBanner';

interface Props {
  dfn: string;
}

interface ImagingStudy {
  studyId: string;
  studyDate: string;
  modality: string;
  description: string;
  imageCount: number;
  status: string;
  source: string;
  studyInstanceUid?: string;
}

interface ImagingStatus {
  viewerEnabled: boolean;
  capabilities: {
    vistaImaging: { available: boolean };
    radiology: { available: boolean };
    registryEntries: Array<{ id: string; label: string; type: string; status: string }>;
  };
}

interface ReportQualifierOption {
  id: string;
  label: string;
  raw: string;
}

interface ReportsCatalogResponse {
  ok: boolean;
  reports?: ReportDef[];
  dateRangeOptions?: ReportQualifierOption[];
  hsTypeOptions?: ReportQualifierOption[];
  error?: string;
}

interface SelectedReportState {
  report: ReportDef;
  qualifier?: ReportQualifierOption;
}

const REPORT_CATALOG_TARGETS = ['ORWRP REPORT LISTS', 'ORWRP REPORT TEXT'];

function emptyReportsMeta(): DomainFetchMeta {
  return {
    fetched: false,
    ok: true,
    pending: false,
    status: undefined,
    pendingTargets: [],
    pendingNote: undefined,
    error: undefined,
    rpcUsed: [],
  };
}

function normalizeReports(reports: ReportDef[]): ReportDef[] {
  const seen = new Set<string>();
  const normalized: ReportDef[] = [];

  for (const report of reports) {
    if (!report?.id || !report?.name) continue;
    const key = `${report.sectionLabel || 'Clinical Reports'}|${report.id}|${report.name}`;
    if (seen.has(key)) continue;
    seen.add(key);
    normalized.push(report);
  }

  return normalized;
}

function normalizeQualifierOptions(options: ReportQualifierOption[]): ReportQualifierOption[] {
  const labelCounts = new Map<string, number>();

  for (const option of options) {
    if (!option?.id || !option?.label) continue;
    const labelKey = option.label.trim().toLowerCase();
    labelCounts.set(labelKey, (labelCounts.get(labelKey) || 0) + 1);
  }

  const seen = new Set<string>();
  const normalized: ReportQualifierOption[] = [];

  for (const option of options) {
    if (!option?.id || !option?.label) continue;
    const key = option.id.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const labelKey = option.label.trim().toLowerCase();
    const hasDuplicateLabel = (labelCounts.get(labelKey) || 0) > 1;
    normalized.push({
      ...option,
      label: hasDuplicateLabel ? `${option.label} (${option.id.toUpperCase()})` : option.label,
    });
  }

  return normalized;
}

export default function ReportsPanel({ dfn }: Props) {
  const [selectedReport, setSelectedReport] = useState<SelectedReportState | null>(null);
  const [reportText, setReportText] = useState<string>('');
  const [textLoading, setTextLoading] = useState(false);
  const [catalogReports, setCatalogReports] = useState<ReportDef[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogMeta, setCatalogMeta] = useState<DomainFetchMeta>(emptyReportsMeta);
  const [dateRangeOptions, setDateRangeOptions] = useState<ReportQualifierOption[]>([]);
  const [hsTypeOptions, setHsTypeOptions] = useState<ReportQualifierOption[]>([]);
  const [selectedDateRangeId, setSelectedDateRangeId] = useState('');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [healthSummaryExpanded, setHealthSummaryExpanded] = useState(true);
  const catalogRetryRef = useRef(0);

  // Phase 18C: Imaging integration state
  const [imagingStatus, setImagingStatus] = useState<ImagingStatus | null>(null);
  const [studies, setStudies] = useState<ImagingStudy[]>([]);
  const [studiesLoading, setStudiesLoading] = useState(false);
  const [showStudies, setShowStudies] = useState(false);

  useEffect(() => {
    setSelectedReport(null);
    setReportText('');
    setCatalogReports([]);
    setCatalogLoading(false);
    setCatalogMeta(emptyReportsMeta());
    setDateRangeOptions([]);
    setHsTypeOptions([]);
    setSelectedDateRangeId('');
    setCustomStartDate('');
    setCustomEndDate('');
    catalogRetryRef.current = 0;

    let cancelled = false;

    async function loadCatalog() {
      if (cancelled) return;
      setCatalogLoading(true);

      try {
        const res = await fetch(`${API_BASE}/vista/reports?dfn=${dfn}`, { credentials: 'include' });
        const data = (await res.json()) as ReportsCatalogResponse;
        if (!res.ok || !data.ok) {
          const error = data.error || `API ${res.status}: ${res.statusText}`;
          const err = new Error(error) as Error & { status?: number };
          err.status = res.status;
          throw err;
        }
        if (cancelled) return;
        setCatalogReports(normalizeReports(data.reports || []));
        setDateRangeOptions(normalizeQualifierOptions(data.dateRangeOptions || []));
        setHsTypeOptions(normalizeQualifierOptions(data.hsTypeOptions || []));
        setCatalogMeta({
          fetched: true,
          ok: true,
          pending: false,
          status: 'ok',
          pendingTargets: [],
          pendingNote: undefined,
          error: undefined,
          rpcUsed: ['ORWRP REPORT LISTS'],
        });
      } catch (error) {
        const status = typeof error === 'object' && error && 'status' in error ? Number((error as any).status) : 0;
        const message = error instanceof Error ? error.message : 'Request failed';
        if (!cancelled && (status === 429 || status >= 500 || status === 0) && catalogRetryRef.current < 2) {
          const delayMs = 500 * (catalogRetryRef.current + 1);
          catalogRetryRef.current += 1;
          window.setTimeout(() => {
            if (!cancelled) {
              void loadCatalog();
            }
          }, delayMs);
          return;
        }
        if (cancelled) return;
        setCatalogMeta({
          fetched: true,
          ok: false,
          pending: true,
          status: 'request-failed',
          pendingTargets: ['ORWRP REPORT LISTS'],
          pendingNote: undefined,
          error: message,
          rpcUsed: [],
        });
      } finally {
        if (!cancelled) {
          setCatalogLoading(false);
        }
      }
    }

    void loadCatalog();

    return () => {
      cancelled = true;
    };
  }, [dfn]);

  // Fetch imaging status once
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/vista/imaging/status`, { credentials: 'include' });
        const data = await res.json();
        if (data.ok) setImagingStatus(data);
      } catch {
        /* ignore */
      }
    })();
  }, []);

  const reports = useMemo(() => normalizeReports(catalogReports), [catalogReports]);
  const loading = catalogLoading;
  const reportsMeta = catalogMeta;
  const showPendingBanner =
    !loading && reports.length === 0 && reportsMeta.fetched && (reportsMeta.pending || reportsMeta.ok !== true);

  const normalizedDateRangeOptions = useMemo(
    () => normalizeQualifierOptions(dateRangeOptions),
    [dateRangeOptions]
  );
  const normalizedHsTypeOptions = useMemo(
    () => normalizeQualifierOptions(hsTypeOptions),
    [hsTypeOptions]
  );

  const groupedReports = useMemo(() => {
    const groups = new Map<string, ReportDef[]>();
    for (const report of reports) {
      const key = report.sectionLabel || 'Clinical Reports';
      const current = groups.get(key) || [];
      current.push(report);
      groups.set(key, current);
    }
    return Array.from(groups.entries());
  }, [reports]);

  const selectedDateRange = normalizedDateRangeOptions.find((option) => option.id === selectedDateRangeId);
  const selectedReportId = selectedReport?.report.id;

  useEffect(() => {
    if (!selectedReport) return;

    const freshReport = reports.find((report) => report.id === selectedReport.report.id) || null;
    if (!freshReport) {
      setSelectedReport(null);
      setReportText('');
      setTextLoading(false);
      setSelectedDateRangeId('');
      setCustomStartDate('');
      setCustomEndDate('');
      return;
    }

    let nextQualifier = selectedReport.qualifier;
    if (selectedReport.qualifier) {
      if (freshReport.qualifierType === 1) {
        const freshOption = normalizedHsTypeOptions.find((option) => option.id === selectedReport.qualifier?.id) || null;
        if (!freshOption) {
          nextQualifier = undefined;
          setReportText('');
          setTextLoading(false);
        } else if (freshOption !== selectedReport.qualifier) {
          nextQualifier = freshOption;
        }
      } else if (freshReport.qualifierType === 2) {
        const freshOption = normalizedDateRangeOptions.find((option) => option.id === selectedReport.qualifier?.id) || null;
        if (!freshOption) {
          nextQualifier = undefined;
          setSelectedDateRangeId('');
          setCustomStartDate('');
          setCustomEndDate('');
          setReportText('');
          setTextLoading(false);
        } else {
          nextQualifier = freshOption;
          if (selectedDateRangeId && selectedDateRangeId !== freshOption.id) {
            setSelectedDateRangeId(freshOption.id);
          }
        }
      }
    }

    if (selectedReport.report !== freshReport || selectedReport.qualifier !== nextQualifier) {
      setSelectedReport({ report: freshReport, qualifier: nextQualifier });
    }
  }, [normalizedDateRangeOptions, normalizedHsTypeOptions, reports, selectedDateRangeId, selectedReport]);

  async function loadReport(
    report: ReportDef,
    options?: { qualifier?: ReportQualifierOption; alpha?: string; omega?: string }
  ) {
    setSelectedReport({ report, qualifier: options?.qualifier });
    setReportText('');
    setTextLoading(true);

    try {
      const params = new URLSearchParams({ dfn, id: report.id });
      if (options?.qualifier?.raw) params.set('qualifier', options.qualifier.raw);
      if (options?.alpha) params.set('alpha', options.alpha);
      if (options?.omega) params.set('omega', options.omega);

      const res = await fetch(`${API_BASE}/vista/reports/text?${params.toString()}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) {
        const nextText = typeof data.text === 'string' ? data.text : '';
        setReportText(
          nextText.trim().length > 0
            ? nextText
            : 'No report text was returned from VistA for this report in this environment.'
        );
      } else {
        setReportText(`Error: ${data.error ?? 'unknown'}`);
      }
    } catch {
      setReportText('Network error loading report');
    } finally {
      setTextLoading(false);
    }
  }

  async function handleSelect(report: ReportDef, qualifier?: ReportQualifierOption) {
    setSelectedDateRangeId('');
    if (report.localOnly) {
      setSelectedReport({ report, qualifier });
      setReportText(
        'Local-only report. This entry is present in the live VistA catalog, but report text is not exposed through ORWRP REPORT TEXT in this environment.'
      );
      return;
    }
    if (report.qualifierType === 1 && !qualifier) {
      setSelectedReport({ report });
      setReportText('Select a Health Summary type from the tree to load a VistA report.');
      return;
    }
    if (report.qualifierType === 2 && !qualifier) {
      setSelectedReport({ report });
      setReportText('Select a date range to load this report.');
      return;
    }
    await loadReport(report, qualifier ? { qualifier } : undefined);
  }

  async function handleDateRangeChange(report: ReportDef, nextId: string) {
    setSelectedDateRangeId(nextId);
    const option = normalizedDateRangeOptions.find((entry) => entry.id === nextId);
    if (!option) return;
    if (option.id.toLowerCase() === 'ds') {
      setSelectedReport({ report, qualifier: option });
      setReportText('Choose a start and end date, then load the report.');
      return;
    }
    await loadReport(report, { qualifier: option });
  }

  async function handleCustomDateRangeLoad() {
    if (!selectedReport) return;
    if (!customStartDate || !customEndDate) {
      setReportText('Enter both a start date and an end date.');
      return;
    }
    await loadReport(selectedReport.report, {
      qualifier: { id: 'ds', label: 'Custom Date Range', raw: 'dS^Date Range...' },
      alpha: customStartDate,
      omega: customEndDate,
    });
  }

  const canLoadCustomDateRange = Boolean(customStartDate && customEndDate);

  async function handleLoadStudies() {
    setShowStudies(true);
    setStudiesLoading(true);
    try {
      const res = await fetch(`${API_BASE}/vista/imaging/studies?dfn=${dfn}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.ok) setStudies(data.studies || []);
    } catch {
      /* ignore */
    }
    setStudiesLoading(false);
  }

  async function handleViewerLaunch(studyUid: string) {
    try {
      const res = await fetch(
        `${API_BASE}/vista/imaging/viewer-url?studyUid=${encodeURIComponent(studyUid)}`,
        { credentials: 'include' }
      );
      const data = await res.json();
      if (data.ok && data.viewer?.url) {
        window.open(data.viewer.url, '_blank', 'noopener');
      }
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className={styles.panelTitle}>Reports</div>
      <p style={{ fontSize: 11, color: 'var(--cprs-text-muted)', margin: '2px 0 8px' }}>
        Contract: ORWRP REPORT LISTS / ORWRP REPORT TEXT &bull; Data source: live RPC
      </p>

      <div className={styles.splitPane}>
        <div className={styles.splitLeft} style={{ maxWidth: 280 }}>
          <div style={{ fontWeight: 600, marginBottom: 4, fontSize: 12 }}>
            {loading ? 'Loading reports...' : `${reports.length} report type(s)`}
          </div>
          {showPendingBanner && (
            <div style={{ marginBottom: 8 }}>
              <CachePendingBanner
                title="Report catalog pending"
                noun="report-catalog"
                meta={reportsMeta}
                defaultTargets={REPORT_CATALOG_TARGETS}
              />
            </div>
          )}
          {!showPendingBanner && groupedReports.map(([sectionLabel, sectionReports]) => (
            <div key={sectionLabel} style={{ marginBottom: 10 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0.4,
                  color: 'var(--cprs-text-muted)',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                  padding: '0 2px',
                }}
              >
                {sectionLabel}
              </div>
              {sectionReports.map((report) => {
                const isHealthSummary = report.qualifierType === 1;
                const isSelected = selectedReportId === report.id;
                return (
                  <div key={`${sectionLabel}:${report.id}`} style={{ marginBottom: 2 }}>
                    <button
                      className={styles.btn}
                      onClick={() => {
                        if (isHealthSummary) {
                          setHealthSummaryExpanded((prev) => !prev);
                          void handleSelect(report);
                          return;
                        }
                        void handleSelect(report);
                      }}
                      style={{
                        width: '100%',
                        textAlign: 'left',
                        fontSize: 12,
                        padding: '4px 8px',
                        background: isSelected ? 'var(--cprs-selected)' : 'var(--cprs-content-bg)',
                        borderColor: isSelected ? 'var(--cprs-primary)' : 'var(--cprs-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                      }}
                    >
                      <span>{report.name}</span>
                      <span style={{ fontSize: 10, color: 'var(--cprs-text-muted)' }}>
                        {isHealthSummary ? (healthSummaryExpanded ? 'Hide types' : 'Show types') : report.qualifierType === 2 ? 'Choose range' : report.localOnly ? 'Local only' : ''}
                      </span>
                    </button>
                    {isHealthSummary && healthSummaryExpanded && normalizedHsTypeOptions.length > 0 && (
                      <div
                        style={{
                          marginTop: 4,
                          marginLeft: 12,
                          paddingLeft: 8,
                          borderLeft: '2px solid var(--cprs-border-light)',
                          display: 'grid',
                          gap: 4,
                        }}
                      >
                        {normalizedHsTypeOptions.map((option) => (
                          <button
                            key={`${option.id}|${option.raw}`}
                            className={styles.btn}
                            onClick={() => void handleSelect(report, option)}
                            style={{
                              textAlign: 'left',
                              fontSize: 11,
                              padding: '3px 8px',
                              background:
                                selectedReportId === report.id && selectedReport?.qualifier?.id === option.id
                                  ? 'var(--cprs-selected)'
                                  : 'var(--cprs-content-bg)',
                            }}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
          {!loading && !showPendingBanner && reports.length === 0 && (
            <p className={styles.emptyText}>No report types available</p>
          )}

          {/* Phase 18C: Imaging status and study list */}
          <div
            style={{
              marginTop: 12,
              padding: 8,
              border: `1px ${imagingStatus?.viewerEnabled ? 'solid' : 'dashed'} var(--cprs-border)`,
              borderRadius: 4,
              fontSize: 11,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: imagingStatus?.viewerEnabled ? '#16a34a' : '#6b7280',
                }}
              />
              <strong>Imaging</strong>
              <span style={{ color: 'var(--cprs-text-muted)' }}>
                {imagingStatus?.viewerEnabled ? 'Active' : 'Not Available'}
              </span>
            </div>

            {imagingStatus && (
              <div style={{ fontSize: 10, color: 'var(--cprs-text-muted)', marginBottom: 4 }}>
                MAG4: {imagingStatus.capabilities.vistaImaging.available ? 'yes' : 'no'}
                {' | '}RA: {imagingStatus.capabilities.radiology.available ? 'yes' : 'no'}
                {imagingStatus.capabilities.registryEntries.length > 0 && (
                  <> | {imagingStatus.capabilities.registryEntries.length} external</>
                )}
              </div>
            )}

            <button
              className={styles.btn}
              onClick={handleLoadStudies}
              style={{ fontSize: 11, padding: '2px 8px', width: '100%' }}
            >
              {studiesLoading
                ? 'Loading...'
                : showStudies
                  ? 'Refresh Studies'
                  : 'Load Patient Studies'}
            </button>

            {showStudies && !studiesLoading && (
              <div style={{ marginTop: 4 }}>
                {studies.length === 0 ? (
                  <p style={{ fontSize: 10, color: 'var(--cprs-text-muted)', margin: '4px 0 0' }}>
                    No imaging studies found for this patient.
                  </p>
                ) : (
                  studies.map((s) => (
                    <div
                      key={s.studyId}
                      style={{
                        padding: '3px 0',
                        borderBottom: '1px solid var(--cprs-border)',
                        fontSize: 10,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <strong>{s.modality}</strong> {s.description}
                        <br />
                        {s.studyDate} &bull; {s.imageCount} img &bull; {s.source}
                      </div>
                      {s.studyInstanceUid && (
                        <button
                          className={styles.btn}
                          onClick={() => handleViewerLaunch(s.studyInstanceUid!)}
                          style={{ fontSize: 9, padding: '1px 4px', flexShrink: 0 }}
                        >
                          View
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {selectedReport ? (
            <div
              style={{
                padding: 8,
                border: '1px solid var(--cprs-border)',
                borderRadius: 4,
                background: 'var(--cprs-bg)',
              }}
            >
              <div className={styles.panelTitle}>{selectedReport.qualifier ? `${selectedReport.report.name} — ${selectedReport.qualifier.label}` : selectedReport.report.name}</div>
              <div style={{ fontSize: 11, color: 'var(--cprs-text-muted)', marginBottom: 8 }}>
                {selectedReport.report.sectionLabel || 'Clinical Reports'}
                {selectedReport.report.qualifierType === 2 && ' • Date-range report'}
                {selectedReport.report.qualifierType === 1 && ' • Health Summary report'}
                {selectedReport.report.localOnly && ' • Local only'}
              </div>

              {selectedReport.report.qualifierType === 2 && (
                <div
                  style={{
                    display: 'grid',
                    gap: 8,
                    marginBottom: 10,
                    padding: 8,
                    border: '1px solid var(--cprs-border)',
                    borderRadius: 4,
                    background: 'var(--cprs-content-bg)',
                  }}
                >
                  <label style={{ fontSize: 12, fontWeight: 600 }}>
                    Date Range
                    <select
                      className={styles.formSelect}
                      value={selectedDateRangeId}
                      onChange={(event) => handleDateRangeChange(selectedReport.report, event.target.value)}
                      style={{ marginTop: 4 }}
                    >
                      <option value="">Select a date range...</option>
                      {normalizedDateRangeOptions.map((option) => (
                        <option key={`${option.id}|${option.raw}`} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  {selectedDateRange?.id.toLowerCase() === 'ds' && (
                    <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>
                        Start Date
                        <input
                          type="date"
                          className={styles.formInput}
                          value={customStartDate}
                          onChange={(event) => setCustomStartDate(event.target.value)}
                          style={{ marginTop: 4 }}
                        />
                      </label>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>
                        End Date
                        <input
                          type="date"
                          className={styles.formInput}
                          value={customEndDate}
                          onChange={(event) => setCustomEndDate(event.target.value)}
                          style={{ marginTop: 4 }}
                        />
                      </label>
                      <button
                        className={styles.btn}
                        onClick={handleCustomDateRangeLoad}
                        disabled={textLoading || !canLoadCustomDateRange}
                        style={{ cursor: textLoading || !canLoadCustomDateRange ? 'not-allowed' : 'pointer' }}
                      >
                        Load Custom Range
                      </button>
                    </div>
                  )}
                </div>
              )}

              <pre
                style={{
                  fontFamily: 'monospace',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  margin: 0,
                  minHeight: 60,
                }}
              >
                {textLoading ? 'Loading report...' : reportText}
              </pre>
            </div>
          ) : (
            <p className={styles.emptyText}>
              Select a report from the grouped tree, then view the VistA report for this patient.
            </p>
          )}
        </div>
      </div>

    </div>
  );
}
