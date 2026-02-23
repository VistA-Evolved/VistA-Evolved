# Phase 96 — PhilHealth eClaims 3.0 Adapter Skeleton (VERIFY)

## Verification Gates

### V1 — Claim Packet Builder E2E
- ClaimPacket builder works from PhilHealthClaimDraft → ClaimPacket
- Validation catches missing required fields
- SHA-256 content hash is deterministic

### V2 — Export Generators
- JSON export is deterministic (same input → same output)
- PDF text export contains CF1-CF4 sections + manual submission footer
- XML placeholder returns `ok: false` with reason + placeholder XML
- No PHI leaks into console.log or structured logger at info level

### V3 — Submission Tracker FSM
- Cannot advance to accepted/denied without manual staff confirmation
- FSM transitions match documented state machine
- Stats endpoint returns correct counts

### V4 — No Fake Success
- XML generator returns `ok: false, specBased: false`
- Status endpoint reports `automatedSubmission: false`
- Export bundle `specCompliant` is false

### V5 — Route Wiring
- All 12 endpoints reachable (import + register in index.ts)
- Auth: session-level via /rcm/ catch-all
- No dead routes

### V6 — UI Functional
- All 4 tabs render (Build & Export, Submissions, Denials, Spec Gates)
- No dead clicks — buttons invoke real API calls
- Warning banner visible ("Manual Submission Mode")

### V7 — Payer Registry Evidence
- PH-PHIC exists in seed data with eClaims 3.0 notes
- Spec gates documented in runbook

### V8 — Security + PHI
- No hardcoded credentials
- No PHI in log statements
- Audit sanitization applies to eClaims operations

### V9 — Regression
- Phase 90 PhilHealth routes still intact
- Phase 95 payer registry still intact
- Phase 38/40 RCM domain intact
- index.ts registration order correct

### V10 — Build
- `npx tsc --noEmit` clean in apps/api
- `npx tsc --noEmit` clean in apps/web

## Files Checked
- All files from 96-01-IMPLEMENT.md
- Cross-references to Phase 90/95 modules
