'use client';

import { useEffect, useState, useCallback } from 'react';
import { API_BASE as API } from '@/lib/api-config';

/* ================================================================== */
/*  Phase 163 -- Modular Packaging Validation Dashboard                 */
/* ================================================================== */

type Tab = 'report' | 'dependencies' | 'boundaries' | 'coverage';

interface ValidationIssue {
  code: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  subject?: string;
  suggestion?: string;
}

interface ValidationCategory {
  category: string;
  label: string;
  issues: ValidationIssue[];
  durationMs: number;
}

interface ValidationReport {
  generatedAt: string;
  passed: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  categories: ValidationCategory[];
  activeSku: string;
  tenantId: string;
}

interface ApiResult<T> {
  ok?: boolean;
  error?: string;
  report?: T;
  category?: T;
}

async function apiFetch<T>(path: string): Promise<ApiResult<T>> {
  const res = await fetch(`${API}${path}`, { credentials: 'include' });
  const payload = (await res.json().catch(() => null)) as ApiResult<T> | null;
  if (!res.ok || !payload?.ok) {
    if (res.status === 401) throw new Error('Authentication required');
    throw new Error(payload?.error || `Request failed (${res.status})`);
  }
  return payload;
}

/* ------------------------------------------------------------------ */
/*  Report Tab                                                         */
/* ------------------------------------------------------------------ */
function ReportTab() {
  const [report, setReport] = useState<ValidationReport | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await apiFetch<ValidationReport>('/admin/module-validation/report');
      setReport(data.report ?? null);
    } catch (error) {
      setReport(null);
      setLoadError(error instanceof Error ? error.message : 'Unable to load validation report');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) {
    return <p className="p-4 text-sm text-red-600">Unable to load validation report. {loadError}</p>;
  }

  if (!report) return <p className="p-4 text-sm text-gray-500">Loading...</p>;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-4">
        <span className={`text-2xl font-bold ${report.passed ? 'text-green-600' : 'text-red-600'}`}>
          {report.passed ? 'PASSED' : 'FAILED'}
        </span>
        <span className="text-sm text-gray-500">
          SKU: {report.activeSku} | Tenant: {report.tenantId}
        </span>
        <button onClick={load} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">
          Re-run
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500 uppercase">Errors</div>
          <div
            className={`text-xl font-bold ${report.errorCount > 0 ? 'text-red-600' : 'text-green-600'}`}
          >
            {report.errorCount}
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500 uppercase">Warnings</div>
          <div
            className={`text-xl font-bold ${report.warningCount > 0 ? 'text-yellow-600' : 'text-green-600'}`}
          >
            {report.warningCount}
          </div>
        </div>
        <div className="border rounded p-3">
          <div className="text-xs text-gray-500 uppercase">Info</div>
          <div className="text-xl font-bold text-blue-600">{report.infoCount}</div>
        </div>
      </div>
      {report.categories.map((cat) => (
        <CategoryCard key={cat.category} category={cat} />
      ))}
    </div>
  );
}

function CategoryCard({ category }: { category: ValidationCategory }) {
  const errors = category.issues.filter((i) => i.severity === 'error').length;
  const warnings = category.issues.filter((i) => i.severity === 'warning').length;

  return (
    <div className="border rounded p-3">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-semibold">{category.label}</h3>
        <span className="text-xs text-gray-400">{category.durationMs}ms</span>
        {errors > 0 && (
          <span className="px-2 py-0.5 rounded text-xs bg-red-100 text-red-800">
            {errors} errors
          </span>
        )}
        {warnings > 0 && (
          <span className="px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-800">
            {warnings} warnings
          </span>
        )}
      </div>
      <div className="space-y-1">
        {category.issues.map((issue, i) => (
          <IssueRow key={i} issue={issue} />
        ))}
      </div>
    </div>
  );
}

function IssueRow({ issue }: { issue: ValidationIssue }) {
  const colors: Record<string, string> = {
    error: 'text-red-700 bg-red-50 border-red-200',
    warning: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    info: 'text-blue-700 bg-blue-50 border-blue-200',
  };

  return (
    <div className={`text-xs p-2 rounded border ${colors[issue.severity] ?? ''}`}>
      <div className="flex items-center gap-2">
        <span className="font-mono font-bold">{issue.code}</span>
        {issue.subject && <span className="text-gray-500">[{issue.subject}]</span>}
      </div>
      <div>{issue.message}</div>
      {issue.suggestion && <div className="text-gray-500 mt-1">Fix: {issue.suggestion}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Category Tabs (reuse same pattern)                                 */
/* ------------------------------------------------------------------ */
function SingleCategoryTab({ endpoint, label }: { endpoint: string; label: string }) {
  const [category, setCategory] = useState<ValidationCategory | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoadError(null);
      const data = await apiFetch<ValidationCategory>(endpoint);
      setCategory(data.category ?? null);
    } catch (error) {
      setCategory(null);
      setLoadError(error instanceof Error ? error.message : `Unable to load ${label}`);
    }
  }, [endpoint]);

  useEffect(() => {
    load();
  }, [load]);

  if (loadError) {
    return <p className="p-4 text-sm text-red-600">Unable to load {label}. {loadError}</p>;
  }

  if (!category) return <p className="p-4 text-sm text-gray-500">Loading {label}...</p>;

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold">{category.label}</h3>
        <span className="text-xs text-gray-400">{category.durationMs}ms</span>
        <button onClick={load} className="px-2 py-0.5 bg-gray-200 rounded text-xs">
          Refresh
        </button>
      </div>
      <div className="space-y-1">
        {category.issues.map((issue, i) => (
          <IssueRow key={i} issue={issue} />
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function ModuleValidationPage() {
  const [tab, setTab] = useState<Tab>('report');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'report', label: 'Full Report' },
    { key: 'dependencies', label: 'Dependencies' },
    { key: 'boundaries', label: 'Boundaries' },
    { key: 'coverage', label: 'Coverage' },
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <h1 className="text-xl font-bold mb-4">Module Packaging Validation</h1>
      <p className="text-sm text-gray-500 mb-4">
        Phase 163 -- Validates module dependencies, boundaries, route patterns, adapter consistency,
        and capability coverage.
      </p>
      <div className="flex gap-1 border-b mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              tab === t.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'report' && <ReportTab />}
      {tab === 'dependencies' && (
        <SingleCategoryTab endpoint="/admin/module-validation/dependencies" label="Dependencies" />
      )}
      {tab === 'boundaries' && (
        <SingleCategoryTab endpoint="/admin/module-validation/boundaries" label="Boundaries" />
      )}
      {tab === 'coverage' && (
        <SingleCategoryTab endpoint="/admin/module-validation/coverage" label="Coverage" />
      )}
    </div>
  );
}
