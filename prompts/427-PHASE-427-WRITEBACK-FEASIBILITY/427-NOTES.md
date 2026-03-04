# Phase 427 Notes

## Decisions

- Report is doc-only (no code changes) — pure analysis artifact
- 12 domains assessed: 4 READY, 6 PARTIAL, 2 BLOCKED
- ClinicalEngineAdapter write-method gap is the biggest architectural finding
- W27 readiness matrix directly feeds phase planning for 431-438

## Key Findings

- Only `MessagingAdapter` has write methods; all other writes bypass adapters
- `ORQQPL EDIT SAVE` is genuinely absent from WorldVistA Docker (only blocked RPC)
- Billing/RCM writes fully blocked at VistA level (empty IB/PRCA/AR globals)
- PSB/BCMA (MAR/eMAR) RPCs absent from sandbox — inpatient pharmacy blocked
- 80+ SDES scheduling RPCs installed but return empty without seed data
