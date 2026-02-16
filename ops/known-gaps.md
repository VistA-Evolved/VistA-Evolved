# Phase 12 — CPRS Parity Wiring — Known Gaps

> Updated: 2026-02-17
> Verification: 128 PASS / 0 FAIL / 0 WARN (verify-phase1-to-phase12-parity.ps1)

## Resolved in Phase 12

| Gap | Resolution |
|-----|-----------|
| ConsultsPanel mock data | Wired to ORQQCN LIST + ORQQCN DETAIL RPCs |
| SurgeryPanel mock data | Wired to ORWSR LIST RPC |
| DCSummPanel mock data | Wired to TIU DOCUMENTS BY CONTEXT (class 244) + TIU GET RECORD TEXT |
| LabsPanel mock data | Wired to ORWLRR INTERIM RPC with structured parsing |
| ReportsPanel mock data | Wired to ORWRP REPORT LISTS + ORWRP REPORT TEXT |
| EditProblemDialog local-only | Now API-first (POST /vista/problems); local fallback with sync banner |
| AddProblemDialog no ICD search | ICD lexicon search via ORQQPL4 LEX wired |
| AddMedicationDialog hardcoded URL | Uses NEXT_PUBLIC_API_URL env var |
| Tools → Graphing placeholder | Real SVG vitals chart from data-cache |
| Tools → Legacy Console static | Working RPC console (fetches any API path) |
| Tools → Remote Data disabled | Enabled; shows architecture docs |

## Remaining Gaps

### Write-Back RPCs (Read-Only in Phase 12)

| Screen ID | Tab/Dialog | Missing RPC(s) | Reason | Next Step |
|-----------|-----------|-----------------|--------|-----------|
| `CT_CONSULTS` | ConsultsPanel | `ORQQCN ADDCMT`, `GMRCACT` | No consult request/action RPCs wired | Phase 13: wire consult ordering |
| `CT_SURGERY` | SurgeryPanel | `ORWSR SAVE` | No surgery write-back wired | Phase 13: wire surgery scheduling |
| `CT_LABS` | LabsPanel | `ORWLRR ACK` | Acknowledge is local-only | Phase 13: wire lab acknowledge RPC |
| `CT_LABS` | LabsPanel | `ORWLRR CHART`, `ORWLRR CUMULATIVE` | Only INTERIM view wired; no chart/cumulative | Phase 13: add lab views |
| `CT_REPORTS` | ReportsPanel | `RA DETAILED REPORT`, `MAG4 IMAGE LIST` | Imaging report viewer is placeholder | Phase 13: DICOM integration |

### Order System

| Screen ID | Tab/Dialog | Missing RPC(s) | Reason | Next Step |
|-----------|-----------|-----------------|--------|-----------|
| `CT_ORDERS` | OrdersPanel | `ORWDX SAVE`, `ORWDXC SESSION` | Order signing is local-only | Phase 13: real order signing |
| `CT_ORDERS` | AddMedicationDialog (manual) | `ORWDX SAVE` + order-check RPCs | Manual med entry saves as local draft | Phase 13: full OERR integration |
| `CT_PROBLEMS` | AddProblemDialog | `ORQQPL ADD SAVE` | POST endpoint returns honest blocker (complex validation); falls back to local | Phase 13: complete ORQQPL ADD SAVE |
| `CT_PROBLEMS` | EditProblemDialog | `ORQQPL EDIT SAVE` | Same as AddProblem — complex validation | Phase 13: wire ORQQPL EDIT SAVE |

### Authentication & Security

| Screen ID | Page | Missing RPC(s) | Reason | Next Step |
|-----------|------|-----------------|--------|-----------|
| `LOGIN` | /cprs/login | `XUS SIGNON SETUP`, `XUS AV CODE` | Login pings API but does not authenticate against VistA | Phase 13: real VistA auth |

### Remote Data Integration

| Screen ID | Feature | Missing RPC(s) | Reason | Next Step |
|-----------|---------|-----------------|--------|-----------|
| `REMOTE_DATA` | Remote Data Viewer | `ORWCIRN FACLIST`, `ORWCIRN HDRA` | Docker sandbox has no remote facilities; architectural hook only | Phase 13: VHIE/FHIR bridge |

### Data Limitations (Docker Sandbox)

The WorldVistA Docker sandbox has limited clinical data for test patients (DFN 1/2/3):
- Consults: 0 records
- Surgery: 0 records 
- D/C Summaries: 0 records
- Labs: 0 records ("No Data Found")
- Reports: 23 report types available (catalog works; some report texts are empty)

All RPCs return `ok: true` with empty result sets. The wiring is correct and will
return real data when patients have clinical records.
