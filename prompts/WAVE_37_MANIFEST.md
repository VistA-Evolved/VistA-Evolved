# Wave 37 -- International Revenue Cycle + Billing + Payer Ops v2

**Phases 513-521 (K=9)**
**Objective:** Extend apps/api/src/rcm with integration readiness scanning,
payer dossiers, PhilHealth transport hardening, US X12 ingest v2, clearinghouse
adapter v2, denials hardening, and global pack expansion.

## Phase Map

| Phase | Slug | Title |
|-------|------|-------|
| 513 | W37-P1-RCM-READINESS-SCAN | RCM Reality Scan + Integration Readiness Matrix |
| 514 | W37-P2-PAYER-DOSSIERS | Payer Dossiers + Ops Onboarding Workflow |
| 515 | W37-P3-PHILHEALTH-TRANSPORT | PhilHealth eClaims Transport Skeleton |
| 516 | W37-P4-PHILHEALTH-EXPORT-V2 | PhilHealth Claim Pack Export v2 |
| 517 | W37-P5-PH-HMO-OPS-V2 | PH HMO Ops v2 |
| 518 | W37-P6-US-X12-INGEST-V2 | US X12 Ingest v2 |
| 519 | W37-P7-CLEARINGHOUSE-V2 | Clearinghouse Adapter v2 |
| 520 | W37-P8-DENIALS-HARDENING | Denials/Appeals + Remittance Posting Hardening |
| 521 | W37-P9-GLOBAL-PACK-EXPANSION | Global Pack Expansion + Conformance Runner |

## Definition of Done

- RCM readiness scan produces accurate matrix from code analysis
- Payer dossiers DB-backed with onboarding tasks
- PhilHealth transport layer architected with mock/live mode
- Claim pack export produces PDF + zip bundles
- HMO ops has auditable checklist + LOA workflow
- US X12 ingest uses OSS parser with fixtures
- Clearinghouse adapter has record/replay harness
- Denials pipeline maps 835 to tasks with staging
- Country pack template + conformance runner working
- All phases pass their respective VERIFY gates

## Commit Log

| Phase | Commit | Title |
|-------|--------|-------|
| 513 | (pending) | RCM Reality Scan |
| 514 | (pending) | Payer Dossiers |
| 515 | (pending) | PhilHealth Transport |
| 516 | (pending) | PhilHealth Export v2 |
| 517 | (pending) | PH HMO Ops v2 |
| 518 | (pending) | US X12 Ingest v2 |
| 519 | (pending) | Clearinghouse v2 |
| 520 | (pending) | Denials Hardening |
| 521 | (pending) | Global Pack Expansion |
