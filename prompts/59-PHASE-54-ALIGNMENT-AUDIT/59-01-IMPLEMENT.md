# Phase 54 — Full Alignment Audit v2 (Offline + Integration) + Triage Generator (IMPLEMENT)

## Mission

Prove or disprove fragmentation with deterministic audits.
No new features. Only auditing, triage, and minimal fixes to make audits accurate.

## Definition of Done

1. One command produces a complete audit summary in `/artifacts/audit/**`
2. Audit covers: prompts integrity, dead clicks, action-endpoint-RPC mapping, auth regression, smoke perf, RPC gating, secret scan, PHI log scan
3. Audit runs in OFFLINE mode; INTEGRATION mode runs when VistA is available
4. Audit results are NOT committed (artifacts only)

## Implementation

### A) Single Entrypoint

- `scripts/audit/run-audit.ts` with `--mode=offline|integration`
- PS wrapper: `scripts/audit/run-audit.ps1`
- Outputs: `/artifacts/audit/audit-summary.json` + `.txt`

### B) Audit Modules (9 total)

1. promptsAudit — calls auditPrompts.ts
2. docsPolicyAudit — calls checkDocsPolicy.ts
3. rpcGatingAudit — all RPC calls via rpcRegistry + Vivian
4. actionTraceAudit — actionId→endpoint→RPC mapping completeness
5. deadClickAudit — classify click targets (NAVIGATE|MODAL|ACTION|PENDING|DEAD)
6. authRegressionAudit — login, bad creds, RBAC, session (integration only)
7. perfSmokeAudit — p95 latency for key endpoints (integration only)
8. secretScanAudit + phiLogScanAudit
9. integrationOnlyAudit — live VistA checks (integration only)

### C) Triage Generator

- `scripts/audit/generate-triage.ts`
- Reads audit-summary.json → `/artifacts/audit/triage.md`
- Severity rubric, repro steps, selectors, expected vs actual, fix hints

### D) No-Fake-Success Assertion

- Flag any handler returning ok:true without state change
- Flag error-swallowing patterns

## Files

- `scripts/audit/run-audit.ts` (new)
- `scripts/audit/run-audit.ps1` (new)
- `scripts/audit/modules/*.ts` (new, 9 modules)
- `scripts/audit/generate-triage.ts` (new)
- `prompts/59-PHASE-54-ALIGNMENT-AUDIT/59-01-IMPLEMENT.md` (this file)
- `prompts/59-PHASE-54-ALIGNMENT-AUDIT/59-99-VERIFY.md`
- `scripts/verify-phase54-audit.ps1` (new)
