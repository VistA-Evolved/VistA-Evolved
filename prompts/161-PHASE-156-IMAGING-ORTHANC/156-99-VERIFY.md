# Phase 156 — VERIFY: Imaging Operationalization

## Verification Gates

### Tier 1: Sanity (S1-S4)

- S1: API TypeCheck clean (`pnpm -C apps/api exec tsc --noEmit` exit 0)
- S2: Web build passes
- S3: No hardcoded credentials in new/changed files
- S4: No PHI logged in imaging health endpoint

### Tier 2: Feature Integrity (F1-F7)

- F1: `/imaging/health` endpoint exists and returns structured health
- F2: Orthanc probe returns reachable/unreachable correctly
- F3: OHIF probe returns reachable/unreachable correctly
- F4: Imaging env vars documented in `.env.example`
- F5: CI workflow file exists and references Orthanc service
- F6: AUTH_RULE for imaging health is session-level
- F7: Imaging compose profile unchanged (still `profiles: [imaging]`)

### Tier 3: Regression (R1-R4)

- R1: Existing imaging proxy routes unchanged
- R2: Existing imaging audit routes unchanged
- R3: No clinical route files modified
- R4: Gauntlet fast+rc pass (4 PASS / 1 WARN baseline)
