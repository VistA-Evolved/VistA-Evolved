"use client";

import React, { useEffect, useState, useCallback } from "react";
import { API_BASE as API } from '@/lib/api-config';

/* ================================================================== */
/*  Phase 162 — Performance + UX Speed Pass Admin Dashboard            */
/* ================================================================== */

type Tab = "summary" | "profiles" | "budgets" | "slow";

interface PerfSummary {
  totalRoutes: number;
  systemP95Ms: number;
  systemAvgMs: number;
  slowRouteCount: number;
  budgetCount: number;
  budgetViolations: number;
  budgetWarnings: number;
  healthScore: number;
}

interface RouteProfile {
  route: string;
  method: string;
  count: number;
  avgMs: number;
  p95Ms: number;
  maxMs: number;
  minMs: number;
  avgBytes: number;
  budgetStatus: string;
}

interface PerfBudget {
  id: string;
  routePattern: string;
  method: string;
  maxMs: number;
  warningThreshold: number;
  maxBytes: number;
  enforce: boolean;
}

interface SlowQuery {
  route: string;
  method: string;
  durationMs: number;
  timestamp: string;
}


async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, { credentials: "include", ...opts });
  return res.json();
}

/* ------------------------------------------------------------------ */
/*  Summary Tab                                                        */
/* ------------------------------------------------------------------ */
function SummaryTab() {
  const [summary, setSummary] = useState<PerfSummary | null>(null);

  const load = useCallback(async () => {
    const data = await apiFetch("/admin/performance/summary");
    if (data.ok) setSummary(data.summary);
  }, []);

  useEffect(() => { load(); }, [load]);

  if (!summary) return <p className="p-4 text-sm text-gray-500">Loading...</p>;

  const scoreColor =
    summary.healthScore >= 80 ? "text-green-600" :
    summary.healthScore >= 50 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="p-4 space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Health Score" value={`${summary.healthScore}/100`} className={scoreColor} />
        <StatCard label="System P95" value={`${summary.systemP95Ms.toFixed(0)} ms`} />
        <StatCard label="System Avg" value={`${summary.systemAvgMs.toFixed(0)} ms`} />
        <StatCard label="Routes Profiled" value={String(summary.totalRoutes)} />
        <StatCard label="Slow Routes" value={String(summary.slowRouteCount)} className={summary.slowRouteCount > 0 ? "text-yellow-600" : ""} />
        <StatCard label="Budget Violations" value={String(summary.budgetViolations)} className={summary.budgetViolations > 0 ? "text-red-600" : ""} />
        <StatCard label="Budget Warnings" value={String(summary.budgetWarnings)} className={summary.budgetWarnings > 0 ? "text-yellow-600" : ""} />
        <StatCard label="Budgets Defined" value={String(summary.budgetCount)} />
      </div>
      <button onClick={load} className="px-3 py-1 bg-blue-600 text-white rounded text-sm">Refresh</button>
    </div>
  );
}

function StatCard({ label, value, className = "" }: { label: string; value: string; className?: string }) {
  return (
    <div className="border rounded p-3">
      <div className="text-xs text-gray-500 uppercase">{label}</div>
      <div className={`text-xl font-bold ${className}`}>{value}</div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Profiles Tab                                                       */
/* ------------------------------------------------------------------ */
function ProfilesTab() {
  const [profiles, setProfiles] = useState<RouteProfile[]>([]);

  const load = useCallback(async () => {
    const data = await apiFetch("/admin/performance/profiles");
    if (data.ok) setProfiles(data.profiles ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold">Route Profiles</h3>
        <button onClick={load} className="px-2 py-0.5 bg-gray-200 rounded text-xs">Refresh</button>
      </div>
      {profiles.length === 0 ? (
        <p className="text-sm text-gray-500">No route profiles recorded yet. Profiles appear as API requests are made.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-xs border">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-2 text-left">Route</th>
                <th className="p-2 text-left">Method</th>
                <th className="p-2 text-right">Count</th>
                <th className="p-2 text-right">Avg (ms)</th>
                <th className="p-2 text-right">P95 (ms)</th>
                <th className="p-2 text-right">Max (ms)</th>
                <th className="p-2 text-right">Avg Size</th>
                <th className="p-2 text-left">Budget</th>
              </tr>
            </thead>
            <tbody>
              {profiles.map((p, i) => (
                <tr key={i} className="border-t">
                  <td className="p-2 font-mono">{p.route}</td>
                  <td className="p-2">{p.method}</td>
                  <td className="p-2 text-right">{p.count}</td>
                  <td className="p-2 text-right">{p.avgMs.toFixed(1)}</td>
                  <td className="p-2 text-right">{p.p95Ms.toFixed(1)}</td>
                  <td className="p-2 text-right">{p.maxMs.toFixed(1)}</td>
                  <td className="p-2 text-right">{formatBytes(p.avgBytes)}</td>
                  <td className="p-2">
                    <BudgetBadge status={p.budgetStatus} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function BudgetBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    within: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    exceeded: "bg-red-100 text-red-800",
  };
  return (
    <span className={`px-2 py-0.5 rounded text-xs ${colors[status] ?? "bg-gray-100 text-gray-600"}`}>
      {status}
    </span>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/* ------------------------------------------------------------------ */
/*  Budgets Tab                                                        */
/* ------------------------------------------------------------------ */
function BudgetsTab() {
  const [budgets, setBudgets] = useState<PerfBudget[]>([]);
  const [form, setForm] = useState({ routePattern: "", method: "*", maxMs: "2000", maxBytes: "0" });

  const load = useCallback(async () => {
    const data = await apiFetch("/admin/performance/budgets");
    if (data.ok) setBudgets(data.budgets ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    await apiFetch("/admin/performance/budgets/seed", { method: "POST" });
    load();
  };

  const addBudget = async () => {
    if (!form.routePattern) return;
    await apiFetch("/admin/performance/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        routePattern: form.routePattern,
        method: form.method,
        maxMs: Number(form.maxMs),
        maxBytes: Number(form.maxBytes),
      }),
    });
    setForm({ routePattern: "", method: "*", maxMs: "2000", maxBytes: "0" });
    load();
  };

  const remove = async (id: string) => {
    await apiFetch(`/admin/performance/budgets/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2">
        <h3 className="text-sm font-semibold">Performance Budgets</h3>
        <button onClick={seed} className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs">Seed Defaults</button>
        <button onClick={load} className="px-2 py-0.5 bg-gray-200 rounded text-xs">Refresh</button>
      </div>
      <div className="flex items-end gap-2 text-xs">
        <label>
          Pattern
          <input value={form.routePattern} onChange={(e) => setForm({ ...form, routePattern: e.target.value })} className="block border rounded px-2 py-1 w-48" placeholder="/vista/" />
        </label>
        <label>
          Method
          <input value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })} className="block border rounded px-2 py-1 w-20" />
        </label>
        <label>
          Max Ms
          <input value={form.maxMs} onChange={(e) => setForm({ ...form, maxMs: e.target.value })} className="block border rounded px-2 py-1 w-20" type="number" />
        </label>
        <label>
          Max Bytes
          <input value={form.maxBytes} onChange={(e) => setForm({ ...form, maxBytes: e.target.value })} className="block border rounded px-2 py-1 w-24" type="number" />
        </label>
        <button onClick={addBudget} className="px-3 py-1 bg-green-600 text-white rounded">Add</button>
      </div>
      {budgets.length === 0 ? (
        <p className="text-sm text-gray-500">No budgets defined. Click &quot;Seed Defaults&quot; to create standard budgets.</p>
      ) : (
        <table className="min-w-full text-xs border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Pattern</th>
              <th className="p-2 text-left">Method</th>
              <th className="p-2 text-right">Max (ms)</th>
              <th className="p-2 text-right">Warning %</th>
              <th className="p-2 text-right">Max Bytes</th>
              <th className="p-2 text-left">Enforce</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody>
            {budgets.map((b) => (
              <tr key={b.id} className="border-t">
                <td className="p-2 font-mono">{b.routePattern}</td>
                <td className="p-2">{b.method}</td>
                <td className="p-2 text-right">{b.maxMs}</td>
                <td className="p-2 text-right">{(b.warningThreshold * 100).toFixed(0)}%</td>
                <td className="p-2 text-right">{formatBytes(b.maxBytes)}</td>
                <td className="p-2">{b.enforce ? "Yes" : "No"}</td>
                <td className="p-2">
                  <button onClick={() => remove(b.id)} className="text-red-600 hover:underline">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Slow Queries Tab                                                   */
/* ------------------------------------------------------------------ */
function SlowQueriesTab() {
  const [queries, setQueries] = useState<SlowQuery[]>([]);

  const load = useCallback(async () => {
    const data = await apiFetch("/admin/performance/slow-queries");
    if (data.ok) setQueries(data.queries ?? []);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-4">
      <div className="flex items-center gap-2 mb-3">
        <h3 className="text-sm font-semibold">Slow Query Log</h3>
        <button onClick={load} className="px-2 py-0.5 bg-gray-200 rounded text-xs">Refresh</button>
      </div>
      {queries.length === 0 ? (
        <p className="text-sm text-gray-500">No slow queries recorded.</p>
      ) : (
        <table className="min-w-full text-xs border">
          <thead className="bg-gray-50">
            <tr>
              <th className="p-2 text-left">Timestamp</th>
              <th className="p-2 text-left">Route</th>
              <th className="p-2 text-left">Method</th>
              <th className="p-2 text-right">Duration (ms)</th>
            </tr>
          </thead>
          <tbody>
            {queries.map((q, i) => (
              <tr key={i} className="border-t">
                <td className="p-2">{new Date(q.timestamp).toLocaleString()}</td>
                <td className="p-2 font-mono">{q.route}</td>
                <td className="p-2">{q.method}</td>
                <td className="p-2 text-right font-bold text-red-600">{q.durationMs.toFixed(0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */
export default function PerformanceDashboardPage() {
  const [tab, setTab] = useState<Tab>("summary");

  const tabs: { key: Tab; label: string }[] = [
    { key: "summary", label: "Summary" },
    { key: "profiles", label: "Route Profiles" },
    { key: "budgets", label: "Budgets" },
    { key: "slow", label: "Slow Queries" },
  ];

  return (
    <div className="max-w-7xl mx-auto py-6 px-4">
      <h1 className="text-xl font-bold mb-4">Performance Dashboard</h1>
      <p className="text-sm text-gray-500 mb-4">
        Phase 162 -- Route profiling, performance budgets, and slow query monitoring.
      </p>
      <div className="flex gap-1 border-b mb-4">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium border-b-2 ${
              tab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "summary" && <SummaryTab />}
      {tab === "profiles" && <ProfilesTab />}
      {tab === "budgets" && <BudgetsTab />}
      {tab === "slow" && <SlowQueriesTab />}
    </div>
  );
}
