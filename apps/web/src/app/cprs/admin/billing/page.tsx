"use client";

import React, { useEffect, useState } from "react";
import { API_BASE as API } from '@/lib/api-config';

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Plan {
  id: string;
  name: string;
  tier: string;
  basePriceCents: number;
  includedPhysicians: number;
  perPhysicianCents: number;
  apiCallLimit: number;
  modulesIncluded: string[];
  description: string;
}

interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  status: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

interface UsageCounters {
  api_call: number;
  rpc_call: number;
  physician_active: number;
  patient_record_access: number;
  storage_mb: number;
  fhir_request: number;
  hl7_message: number;
  report_generated: number;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */


async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  return res.json();
}

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`;
}

/* ------------------------------------------------------------------ */
/* Tabs                                                                */
/* ------------------------------------------------------------------ */

type TabId = "plans" | "subscription" | "usage" | "health";

const TABS: { id: TabId; label: string }[] = [
  { id: "plans", label: "Plans" },
  { id: "subscription", label: "Subscription" },
  { id: "usage", label: "Usage" },
  { id: "health", label: "Health" },
];

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function BillingPage() {
  const [tab, setTab] = useState<TabId>("plans");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<UsageCounters | null>(null);
  const [health, setHealth] = useState<any>(null);
  const [tenantId, setTenantId] = useState("default");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (tab === "plans") loadPlans();
    if (tab === "subscription") loadSubscription();
    if (tab === "usage") loadUsage();
    if (tab === "health") loadHealth();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, tenantId]);

  async function loadPlans() {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/billing/plans");
      setPlans(data.plans || []);
    } catch { setPlans([]); }
    setLoading(false);
  }

  async function loadSubscription() {
    setLoading(true);
    try {
      const data = await apiFetch(`/admin/billing/subscriptions/${tenantId}`);
      setSubscription(data.subscription || null);
    } catch { setSubscription(null); }
    setLoading(false);
  }

  async function loadUsage() {
    setLoading(true);
    try {
      const data = await apiFetch(`/admin/billing/usage/${tenantId}`);
      setUsage(data.counters || null);
    } catch { setUsage(null); }
    setLoading(false);
  }

  async function loadHealth() {
    setLoading(true);
    try {
      const data = await apiFetch("/admin/billing/health");
      setHealth(data);
    } catch (e: any) { setHealth({ ok: false, error: e.message }); }
    setLoading(false);
  }

  async function subscribe(planId: string) {
    setMsg("");
    try {
      const data = await apiFetch("/admin/billing/subscriptions", {
        method: "POST",
        body: JSON.stringify({ tenantId, planId }),
      });
      setMsg(data.ok ? "Subscribed!" : data.error || "Failed");
      loadSubscription();
    } catch (e: any) { setMsg(e.message); }
  }

  async function cancelSub() {
    setMsg("");
    try {
      const data = await apiFetch(`/admin/billing/subscriptions/${tenantId}`, {
        method: "DELETE",
        body: JSON.stringify({ cancelAtPeriodEnd: true }),
      });
      setMsg(data.ok ? "Cancellation scheduled" : data.error || "Failed");
      loadSubscription();
    } catch (e: any) { setMsg(e.message); }
  }

  /* ---- Render ---- */

  const tabStyle = (id: TabId) => ({
    padding: "8px 16px",
    cursor: "pointer" as const,
    borderBottom: tab === id ? "2px solid var(--accent-primary, #0078d4)" : "2px solid transparent",
    fontWeight: tab === id ? 600 : 400,
    background: "transparent",
    border: "none",
    borderBottomWidth: "2px",
    borderBottomStyle: "solid" as const,
    borderBottomColor: tab === id ? "var(--accent-primary, #0078d4)" : "transparent",
    color: tab === id ? "var(--text-primary, #333)" : "var(--text-secondary, #666)",
  });

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: "0 auto" }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Billing & Metering</h1>
      <p style={{ color: "var(--text-secondary, #666)", marginBottom: 16 }}>
        SaaS subscription management, plan configuration, and usage metering.
      </p>

      {/* Tenant selector */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ marginRight: 8, fontWeight: 500 }}>Tenant ID:</label>
        <input
          value={tenantId}
          onChange={(e) => setTenantId(e.target.value)}
          style={{ padding: "4px 8px", border: "1px solid #ccc", borderRadius: 4, width: 200 }}
        />
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 4, borderBottom: "1px solid #eee", marginBottom: 16 }}>
        {TABS.map((t) => (
          <button key={t.id} style={tabStyle(t.id)} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>

      {msg && (
        <div style={{ padding: 8, marginBottom: 12, background: "#e8f5e9", borderRadius: 4, fontSize: 14 }}>
          {msg}
        </div>
      )}

      {loading && <p style={{ color: "#999" }}>Loading...</p>}

      {/* Plans Tab */}
      {tab === "plans" && !loading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 16 }}>
          {plans.map((p) => (
            <div
              key={p.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: 8,
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 600, margin: 0 }}>{p.name}</h3>
              <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-primary, #0078d4)" }}>
                {p.basePriceCents === 0 ? "Free" : formatCents(p.basePriceCents)}
                {p.basePriceCents > 0 && <span style={{ fontSize: 14, fontWeight: 400 }}>/mo</span>}
              </div>
              <p style={{ fontSize: 13, color: "#666", margin: 0 }}>{p.description}</p>
              <ul style={{ fontSize: 13, margin: 0, paddingLeft: 16 }}>
                <li>{p.includedPhysicians} physicians included</li>
                {p.perPhysicianCents > 0 && <li>{formatCents(p.perPhysicianCents)}/additional physician</li>}
                <li>{p.apiCallLimit === 0 ? "Unlimited" : p.apiCallLimit.toLocaleString()} API calls</li>
                <li>{p.modulesIncluded.length} modules</li>
              </ul>
              <button
                onClick={() => subscribe(p.id)}
                style={{
                  marginTop: "auto",
                  padding: "8px 16px",
                  background: "var(--accent-primary, #0078d4)",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Subscribe
              </button>
            </div>
          ))}
          {plans.length === 0 && <p>No plans available.</p>}
        </div>
      )}

      {/* Subscription Tab */}
      {tab === "subscription" && !loading && (
        <div>
          {subscription ? (
            <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
              <h3 style={{ margin: "0 0 8px" }}>Current Subscription</h3>
              <table style={{ fontSize: 14 }}>
                <tbody>
                  <tr><td style={{ fontWeight: 500, paddingRight: 16 }}>ID</td><td>{subscription.id}</td></tr>
                  <tr><td style={{ fontWeight: 500, paddingRight: 16 }}>Plan</td><td>{subscription.planId}</td></tr>
                  <tr><td style={{ fontWeight: 500, paddingRight: 16 }}>Status</td><td>
                    <span style={{
                      padding: "2px 8px",
                      borderRadius: 4,
                      background: subscription.status === "active" ? "#e8f5e9" : "#fff3e0",
                      color: subscription.status === "active" ? "#2e7d32" : "#e65100",
                      fontWeight: 600,
                      fontSize: 12,
                    }}>{subscription.status}</span>
                  </td></tr>
                  <tr><td style={{ fontWeight: 500, paddingRight: 16 }}>Period</td>
                    <td>{new Date(subscription.currentPeriodStart).toLocaleDateString()} - {new Date(subscription.currentPeriodEnd).toLocaleDateString()}</td>
                  </tr>
                  {subscription.cancelAtPeriodEnd && (
                    <tr><td colSpan={2} style={{ color: "#e65100", fontStyle: "italic" }}>Cancels at period end</td></tr>
                  )}
                </tbody>
              </table>
              <button
                onClick={cancelSub}
                style={{
                  marginTop: 12,
                  padding: "6px 12px",
                  background: "#d32f2f",
                  color: "#fff",
                  border: "none",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                Cancel Subscription
              </button>
            </div>
          ) : (
            <p style={{ color: "#999" }}>No subscription for tenant &quot;{tenantId}&quot;. Subscribe from the Plans tab.</p>
          )}
        </div>
      )}

      {/* Usage Tab */}
      {tab === "usage" && !loading && (
        <div>
          {usage ? (
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  <th style={{ textAlign: "left", padding: 8 }}>Meter</th>
                  <th style={{ textAlign: "right", padding: 8 }}>Count</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(usage).map(([key, val]) => (
                  <tr key={key} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 8 }}>{key.replace(/_/g, " ")}</td>
                    <td style={{ textAlign: "right", padding: 8, fontFamily: "monospace" }}>
                      {(val as number).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p style={{ color: "#999" }}>No usage data for tenant &quot;{tenantId}&quot;.</p>
          )}
        </div>
      )}

      {/* Health Tab */}
      {tab === "health" && !loading && health && (
        <div style={{ border: "1px solid #ddd", borderRadius: 8, padding: 16 }}>
          <h3 style={{ margin: "0 0 8px" }}>Billing Provider Health</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <span style={{
              width: 12, height: 12, borderRadius: "50%",
              background: health.ok ? "#4caf50" : "#f44336",
              display: "inline-block",
            }} />
            <span style={{ fontWeight: 600 }}>{health.ok ? "Healthy" : "Unhealthy"}</span>
          </div>
          <pre style={{ fontSize: 13, background: "#f5f5f5", padding: 12, borderRadius: 4, overflow: "auto" }}>
            {JSON.stringify(health, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
