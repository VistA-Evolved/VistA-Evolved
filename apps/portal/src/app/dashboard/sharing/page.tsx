/**
 * Share Records Page — Phase 31
 *
 * Allows portal users to:
 * - Create time-limited share links for health record sections
 * - View active, expired, and revoked shares
 * - Revoke active shares
 * - Configure one-time redeem option
 *
 * Sections allowed for sharing (curated): medications, allergies, problems, immunizations, labs
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { API_BASE } from '@/lib/api-config';


async function portalFetch<T = unknown>(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(`${API_BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...options.headers },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

const SHAREABLE_SECTIONS = [
  { id: "medications", label: "Medications" },
  { id: "allergies", label: "Allergies" },
  { id: "problems", label: "Active Problems" },
  { id: "immunizations", label: "Immunizations" },
  { id: "labs", label: "Lab Results" },
] as const;

const TTL_OPTIONS = [
  { value: 15, label: "15 minutes" },
  { value: 30, label: "30 minutes" },
  { value: 60, label: "1 hour (default)" },
  { value: 240, label: "4 hours" },
  { value: 1440, label: "24 hours (max)" },
] as const;

interface ShareLink {
  id: string;
  token: string;
  sections: string[];
  label: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  accessCount: number;
  locked: boolean;
  oneTimeRedeem: boolean;
}

export default function ShareRecordsPage() {
  const [shares, setShares] = useState<ShareLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);

  // Create form state
  const [selectedSections, setSelectedSections] = useState<string[]>(["medications", "allergies"]);
  const [label, setLabel] = useState("");
  const [ttlMinutes, setTtlMinutes] = useState(60);
  const [oneTimeRedeem, setOneTimeRedeem] = useState(false);
  const [newShareResult, setNewShareResult] = useState<{ token: string; accessCode: string } | null>(null);

  const loadShares = useCallback(async () => {
    try {
      const data = await portalFetch("/portal/shares");
      setShares(data.shares || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadShares(); }, [loadShares]);

  const handleCreate = async () => {
    if (selectedSections.length === 0) {
      setError("Select at least one section to share.");
      return;
    }
    setCreating(true);
    setError("");
    setNewShareResult(null);
    try {
      const data = await portalFetch("/portal/shares", {
        method: "POST",
        body: JSON.stringify({
          sections: selectedSections,
          label: label || "Shared record",
          ttlMinutes,
          oneTimeRedeem,
        }),
      });
      if (data.ok && data.share) {
        setNewShareResult({
          token: data.share.token,
          accessCode: data.share.accessCode,
        });
        setLabel("");
        await loadShares();
      } else {
        setError(data.error || "Failed to create share link.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await portalFetch(`/portal/shares/${id}/revoke`, { method: "POST" });
      await loadShares();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const toggleSection = (id: string) => {
    setSelectedSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const getStatus = (share: ShareLink): { label: string; color: string } => {
    if (share.revokedAt) return { label: "Revoked", color: "#dc3545" };
    if (share.locked) return { label: "Locked", color: "#fd7e14" };
    if (new Date(share.expiresAt) < new Date()) return { label: "Expired", color: "#6c757d" };
    return { label: "Active", color: "#28a745" };
  };

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 24 }}>
      <h1 style={{ fontSize: 24, marginBottom: 8 }}>Share Records</h1>
      <p style={{ color: "#666", marginBottom: 24 }}>
        Create secure, time-limited links to share selected health records with providers or family members.
      </p>

      {error && (
        <div style={{ background: "#fee", border: "1px solid #fcc", borderRadius: 6, padding: 12, marginBottom: 16, color: "#c33" }}>
          {error}
          <button onClick={() => setError("")} style={{ float: "right", background: "none", border: "none", cursor: "pointer" }}>x</button>
        </div>
      )}

      {/* New share result banner */}
      {newShareResult && (
        <div style={{ background: "#d4edda", border: "1px solid #c3e6cb", borderRadius: 8, padding: 16, marginBottom: 24 }}>
          <h3 style={{ margin: "0 0 8px", color: "#155724" }}>Share Link Created</h3>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>Access Code:</strong>{" "}
            <code style={{ background: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 18, letterSpacing: 2 }}>
              {newShareResult.accessCode}
            </code>
          </p>
          <p style={{ margin: "4px 0", fontSize: 14 }}>
            <strong>Share Link:</strong>{" "}
            <code style={{ background: "#fff", padding: "2px 8px", borderRadius: 4, fontSize: 12, wordBreak: "break-all" }}>
              {typeof window !== "undefined" ? `${window.location.origin}/share/${newShareResult.token}` : `(share link)`}
            </code>
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 12, color: "#856404", fontWeight: 600 }}>
            Save these now — the access code will not be shown again.
          </p>
          <button onClick={() => setNewShareResult(null)} style={{ marginTop: 8, padding: "4px 12px", cursor: "pointer" }}>
            Dismiss
          </button>
        </div>
      )}

      {/* Create share form */}
      <div style={{ background: "#f8f9fa", border: "1px solid #dee2e6", borderRadius: 8, padding: 20, marginBottom: 32 }}>
        <h2 style={{ fontSize: 18, margin: "0 0 16px" }}>Create New Share Link</h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Sections to Share</label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {SHAREABLE_SECTIONS.map((sec) => (
              <label
                key={sec.id}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                  background: selectedSections.includes(sec.id) ? "#007bff" : "#fff",
                  color: selectedSections.includes(sec.id) ? "#fff" : "#333",
                  border: "1px solid #ccc", borderRadius: 20, cursor: "pointer", fontSize: 14,
                }}
              >
                <input
                  type="checkbox"
                  checked={selectedSections.includes(sec.id)}
                  onChange={() => toggleSection(sec.id)}
                  style={{ display: "none" }}
                />
                {sec.label}
              </label>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Label (optional)</label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g., For Dr. Smith at Other Hospital"
            style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc", fontSize: 14 }}
            maxLength={200}
          />
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 16 }}>
          <div style={{ flex: 1 }}>
            <label style={{ display: "block", fontWeight: 600, marginBottom: 6 }}>Expires After</label>
            <select
              value={ttlMinutes}
              onChange={(e) => setTtlMinutes(Number(e.target.value))}
              style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #ccc", fontSize: 14 }}
            >
              {TTL_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={oneTimeRedeem}
                onChange={(e) => setOneTimeRedeem(e.target.checked)}
              />
              <span>
                <strong>One-time use</strong>
                <br />
                <span style={{ fontSize: 12, color: "#666" }}>Auto-revokes after first access</span>
              </span>
            </label>
          </div>
        </div>

        <button
          onClick={handleCreate}
          disabled={creating || selectedSections.length === 0}
          style={{
            padding: "10px 24px", borderRadius: 6, border: "none",
            background: creating ? "#6c757d" : "#007bff", color: "#fff",
            cursor: creating ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600,
          }}
        >
          {creating ? "Creating..." : "Create Share Link"}
        </button>
      </div>

      {/* Share list */}
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Your Share Links</h2>
      {loading ? (
        <p>Loading...</p>
      ) : shares.length === 0 ? (
        <p style={{ color: "#666" }}>No share links created yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {shares.map((share) => {
            const status = getStatus(share);
            const isActive = !share.revokedAt && !share.locked && new Date(share.expiresAt) >= new Date();
            return (
              <div
                key={share.id}
                style={{
                  border: "1px solid #dee2e6", borderRadius: 8, padding: 16,
                  background: isActive ? "#fff" : "#f8f8f8",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <div>
                    <strong>{share.label || "Shared record"}</strong>
                    <span
                      style={{
                        marginLeft: 8, padding: "2px 8px", borderRadius: 12,
                        background: status.color, color: "#fff", fontSize: 12,
                      }}
                    >
                      {status.label}
                    </span>
                    {share.oneTimeRedeem && (
                      <span style={{ marginLeft: 6, padding: "2px 8px", borderRadius: 12, background: "#17a2b8", color: "#fff", fontSize: 12 }}>
                        One-time
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <button
                      onClick={() => handleRevoke(share.id)}
                      style={{
                        padding: "4px 12px", borderRadius: 4, border: "1px solid #dc3545",
                        background: "#fff", color: "#dc3545", cursor: "pointer", fontSize: 12,
                      }}
                    >
                      Revoke
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, color: "#666" }}>
                  <span>Sections: {share.sections.join(", ")}</span>
                  <span style={{ margin: "0 8px" }}>|</span>
                  <span>Created: {new Date(share.createdAt).toLocaleString()}</span>
                  <span style={{ margin: "0 8px" }}>|</span>
                  <span>Expires: {new Date(share.expiresAt).toLocaleString()}</span>
                  <span style={{ margin: "0 8px" }}>|</span>
                  <span>Accessed: {share.accessCount}x</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
