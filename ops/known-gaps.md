# Phase 11 — CPRS Web Replica v1 — Known Gaps

> Generated: 2026-02-16
> Verification: 82 PASS / 0 FAIL / 0 WARN

## Panels Using Mock Data (Not Wired to VistA RPCs)

| Screen ID | Panel | Why Missing | Planned Phase |
|-----------|-------|-------------|---------------|
| `CT_CONSULTS` | ConsultsPanel | `ORQQCN LIST` RPC not yet wired in API | Phase 12 |
| `CT_SURGERY` | SurgeryPanel | `ORWSR RPTLIST` RPC not yet wired in API | Phase 12 |
| `CT_DCSUMM` | DCSummPanel | `ORWCS LIST` RPC not yet wired in API | Phase 12 |
| `CT_LABS` | LabsPanel | `ORWLRR INTERIM` RPC not yet wired in API | Phase 12 |
| `CT_REPORTS` | ReportsPanel | Report framework RPCs not yet wired | Phase 12 |

These panels render with hardcoded sample data and interactive list/detail UIs.
They have the full contract tab slots and will be wired to real VistA RPCs
when the API endpoints are implemented.

## Dialogs with Local-Only Persistence

| Dialog | Limitation | Why | Planned Fix |
|--------|-----------|-----|-------------|
| EditProblemDialog | Saves to local data-cache only | `ORQQPL EDIT SAVE` RPC not wired | Phase 12 — wire to API |
| AddProblemDialog | Falls back to local draft on API failure | ICD/LEX search `ORWLEX` not wired | Phase 12 — add ICD lookup |
| AddMedicationDialog (manual mode) | Local draft only | Manual entry needs order-check RPCs | Phase 12 — `ORWDX SAVE` |

## Menu Items — Integration Pending

| Menu Item | Current State | Why | Planned Fix |
|-----------|--------------|-----|-------------|
| Tools → Graphing | Opens modal with placeholder | Graphing engine not built | Phase 13+ |
| Tools → Legacy Console | Opens modal with static text | Needs RPC raw-call interface | Phase 13+ |
| Tools → Remote Data Viewer | Disabled (greyed out) | External data viewer not scoped | Phase 13+ |
| Edit → Copy | Uses modern clipboard API with legacy fallback | Full-featured but limited to selected text | Low priority |

## Routes Not Implemented

| Route | Reason | Status |
|-------|--------|--------|
| `/cprs/provider` | Mentioned in verify prompt but not in original build spec | Not planned — login flow goes direct to patient-search |

## Login Page

The login page collects access/verify codes but does **not** authenticate against
VistA. It only pings the API for connectivity. This is intentional for the v1
sandbox prototype. Real authentication requires wiring `XUS SIGNON SETUP` +
`XUS AV CODE` RPCs through the web tier, which is out of scope for Phase 11.

## Order Signing

The Orders tab has an order composer that creates draft orders and a "Sign" button
that toggles order status locally. Real order signing requires `ORWDX SAVE` +
`ORWDXC SESSION` RPCs and is planned for Phase 12+.
