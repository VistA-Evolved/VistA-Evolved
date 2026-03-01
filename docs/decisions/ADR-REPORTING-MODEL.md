# ADR: Reporting Model

## Status
Accepted

## Context
Operational and clinical dashboards need a delivery mechanism. Options:

1. **External BI embed (Metabase iframe / Superset embed)** — rich
   visualizations but requires deploying and securing an additional service.
2. **In-app reporting API + lightweight UI** — less visual fidelity but
   zero additional infrastructure, fully tenant-scoped, and auditable.
3. **Static report generation (PDF/CSV scheduled jobs)** — simple but
   lacks interactivity and real-time filtering.

## Decision

- **In-app reporting API** serves pre-defined report definitions with
  parameterized filters (tenant, time range, facility, etc.).
- **Report definitions** are code-defined objects (not user-editable SQL)
  to prevent injection and ensure auditability.
- **UI dashboards** are React pages in the admin section with chart
  components consuming the reporting API.
- **CSV/JSON export** is audited (who exported what, when) and
  permissioned (analytics_admin for raw exports, analytics_viewer for
  summary views).
- **External BI embed** remains a future enhancement — the reporting API
  returns structured JSON that any BI tool can consume via REST.

## Consequences

- Report definitions must be maintained in code, not in a GUI builder.
  This limits self-service but ensures change tracking via git.
- The UI uses simple table/chart components, not a full BI toolkit.
  Organizations needing advanced visualizations should connect Metabase
  or Superset to the ROcto SQL endpoint (Phase 25D).
- Export audit trail enables compliance review of data access patterns.
