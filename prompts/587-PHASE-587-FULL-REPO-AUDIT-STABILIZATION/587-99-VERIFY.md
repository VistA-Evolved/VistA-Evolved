# Phase 587 - Full Repo Audit Stabilization - VERIFY

## Verification Steps
1. Confirm Docker status with `docker ps` and verify `vehu` and `ve-platform-db` are healthy.
2. Confirm API runtime health:
   - `curl.exe -s http://127.0.0.1:3001/vista/ping`
   - `curl.exe -s http://127.0.0.1:3001/health`
3. Run live authenticated route checks with VEHU credentials and DFN 46.
4. Execute latest orchestrated verification:
   - `scripts/verify-latest.ps1`
5. Execute targeted gate checks for integrity and posture:
   - `node qa/gauntlet/cli.mjs --suite fast --ci`
   - `node scripts/qa-gates/prod-posture.mjs`
6. Run TypeScript validation on changed app surfaces.
7. Confirm no new critical errors in modified files.
8. Capture findings and fix evidence in ops artifacts.

## Acceptance Criteria
- Live VistA connectivity verified with real API responses.
- Audit conclusions cite concrete repository evidence.
- High-severity findings are either fixed or explicitly tracked with actionable remediation.
- Verification commands executed and outcomes recorded.
- Handover output includes architecture blueprint, gap analysis, and execution roadmap.
- No claim of completion without command-backed evidence.

## Files Touched
- prompts/587-PHASE-587-FULL-REPO-AUDIT-STABILIZATION/587-01-IMPLEMENT.md
- prompts/587-PHASE-587-FULL-REPO-AUDIT-STABILIZATION/587-99-VERIFY.md
- ops/summary.md
- ops/notion-update.json
