# Phase 580 — Notes

> Wave 42: Production Remediation | Phase 580

## Why This Phase Exists

Phase 4 of the remediation plan: 76 stub routes (37 labs + 39 reports) must call real ORWLRR/ORWDLR and ORWRP RPCs. Labs and reports are critical for clinical decision support.

## Key Decisions

- **LR ORDER**: Lab order write may not work in sandbox; wire for production VistA.
- **clinical-reports.ts**: Already has ORWRP REPORT TEXT pipeline; ensure reports routes don't duplicate or conflict.
- **ORWRP2 HS**: Health summary components need structured parsing; follow existing patterns.

## Deferred Items

- Lab HL7 inbound (Phase 433) — separate from RPC wiring.
- Report template customization — API wiring first.
