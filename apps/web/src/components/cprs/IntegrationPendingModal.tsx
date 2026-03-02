/**
 * IntegrationPendingModal.tsx -- Phase 56
 *
 * Standardized modal shown when user clicks an action that is "integration-pending".
 * Shows target RPCs, Vivian presence, and next steps. NO dead clicks -- every
 * pending action surfaces this instead of silently failing.
 */
"use client";

import React from "react";

export interface PendingActionInfo {
  actionId: string;
  label: string;
  rpcs: string[];
  pendingNote?: string;
  pendingTargets?: string[];
  vivianPresence?: Record<string, string>;
  /** API status -- "integration-pending" or "unsupported-in-sandbox" */
  status?: string;
}

interface IntegrationPendingModalProps {
  action: PendingActionInfo;
  onClose: () => void;
}

export default function IntegrationPendingModal({
  action,
  onClose,
}: IntegrationPendingModalProps) {
  const targets = action.pendingTargets ?? action.rpcs;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#1e1e1e",
          border: "1px solid #555",
          borderRadius: 8,
          padding: "24px",
          maxWidth: 520,
          width: "90%",
          color: "#e0e0e0",
          fontFamily: "monospace",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: "0 0 12px", color: "#ffb347" }}>
          {action.status === "unsupported-in-sandbox"
            ? "Unsupported in Sandbox"
            : "Integration Pending"}
        </h3>
        <p style={{ margin: "0 0 8px", fontSize: 14 }}>
          <strong>{action.label}</strong> ({action.actionId})
        </p>

        {action.pendingNote && (
          <p style={{ margin: "0 0 12px", fontSize: 13, color: "#aaa" }}>
            {action.pendingNote}
          </p>
        )}

        <h4 style={{ margin: "12px 0 6px", fontSize: 13, color: "#88c0d0" }}>
          Target RPCs
        </h4>
        <table style={{ width: "100%", fontSize: 12, borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #444" }}>
              <th style={{ textAlign: "left", padding: 4 }}>RPC Name</th>
              <th style={{ textAlign: "left", padding: 4 }}>Vivian</th>
            </tr>
          </thead>
          <tbody>
            {targets.length === 0 ? (
              <tr>
                <td colSpan={2} style={{ padding: 4, color: "#888" }}>
                  No specific RPCs identified yet
                </td>
              </tr>
            ) : (
              targets.map((rpc) => (
                <tr key={rpc} style={{ borderBottom: "1px solid #333" }}>
                  <td style={{ padding: 4, fontFamily: "monospace" }}>{rpc}</td>
                  <td style={{ padding: 4 }}>
                    <VivianBadge
                      status={action.vivianPresence?.[rpc] ?? "unknown"}
                    />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div style={{ marginTop: 16, textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              background: "#333",
              color: "#e0e0e0",
              border: "1px solid #555",
              borderRadius: 4,
              padding: "6px 16px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function VivianBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    present: { bg: "#2d4a2d", text: "#a3d9a3" },
    absent: { bg: "#4a2d2d", text: "#d9a3a3" },
    exception: { bg: "#4a3d2d", text: "#d9c9a3" },
    unknown: { bg: "#333", text: "#888" },
  };
  const c = colors[status] ?? colors.unknown;
  return (
    <span
      style={{
        display: "inline-block",
        background: c.bg,
        color: c.text,
        padding: "1px 6px",
        borderRadius: 3,
        fontSize: 11,
      }}
    >
      {status}
    </span>
  );
}
