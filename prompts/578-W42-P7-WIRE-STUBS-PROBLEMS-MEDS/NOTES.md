# Phase 578 — Notes

> Wave 42: Production Remediation | Phase 578

## Why This Phase Exists

Phase 4 of the remediation plan: 86 stub routes (26 problems + 60 meds) return "Not implemented". These must call real VistA RPCs so clinical workflows work end-to-end.

## Key Decisions

- **Sandbox may return empty**: WorldVistA Docker may lack problem/med data; empty array is valid.
- **ORWDPS dialog helpers**: Many meds stubs are order-entry helpers; wire even if UI doesn't use them yet.
- **GMPL vs ORQQPL**: Some problem RPCs may be in GMPL package; add to registry with correct domain.

## Deferred Items

- Problem list write-back validation (e.g., duplicate prevention) — can be added later.
- Meds order dialog full UI integration — this phase wires the API; UI may follow.
