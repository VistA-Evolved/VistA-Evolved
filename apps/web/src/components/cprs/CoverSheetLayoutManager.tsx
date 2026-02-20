/**
 * CoverSheetLayoutManager.tsx -- Phase 56
 *
 * Toolbar for the Cover Sheet that provides:
 * - Reset to Default layout button
 * - Current layout info (panel count, custom heights)
 *
 * Wraps above the cover sheet grid to give users explicit layout control.
 */
"use client";

import React from "react";
import { useCPRSUI } from "@/stores/cprs-ui-state";

export default function CoverSheetLayoutManager() {
  const { preferences, resetCoverSheetLayout } = useCPRSUI();
  const layout = preferences.coverSheetLayout;
  const customCount = Object.values(layout.panelHeights).filter(
    (h) => h !== 33
  ).length;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "4px 8px",
        borderBottom: "1px solid #333",
        fontSize: 12,
        color: "#999",
        fontFamily: "monospace",
      }}
    >
      <span>
        Cover Sheet: {layout.panelOrder.length} panels
        {customCount > 0 && (
          <span style={{ color: "#88c0d0" }}>
            {" "}
            ({customCount} custom height{customCount > 1 ? "s" : ""})
          </span>
        )}
      </span>
      <button
        onClick={resetCoverSheetLayout}
        style={{
          background: "#2a2a2a",
          color: "#aaa",
          border: "1px solid #444",
          borderRadius: 3,
          padding: "2px 8px",
          cursor: "pointer",
          fontSize: 11,
        }}
        title="Reset all panel heights to default"
      >
        Reset Layout
      </button>
    </div>
  );
}
