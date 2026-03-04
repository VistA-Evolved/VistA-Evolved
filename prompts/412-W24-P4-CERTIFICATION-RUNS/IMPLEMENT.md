# Phase 412 — W24-P4: Pilot Integration Certification Runs — IMPLEMENT

## Objective

Create a per-customer certification runner that validates archetype alignment,
readiness gates, environment configs, intake source, security posture,
interop connectivity, and module availability.

## Deliverables

1. `scripts/certify-pilot-customer.ps1` -- certification runner
   - 8 sections, 24 gates (3 live-skippable)
   - Supports `-CustomerName`, `-Archetype`, `-ApiBase`, `-SkipLive` params
   - Outputs per-customer evidence JSON to `evidence/wave-24/412-certification/`

## Sections

| #   | Section                 | Gates    |
| --- | ----------------------- | -------- |
| 1   | Archetype Validation    | 3        |
| 2   | Readiness Gates         | 2        |
| 3   | Reference Environments  | 4        |
| 4   | Integration Intake      | 5        |
| 5   | Security Posture        | 2        |
| 6   | Interop Connectivity    | 3 (live) |
| 7   | Archetype Module Checks | 4        |
| 8   | Evidence Pack           | 1        |
