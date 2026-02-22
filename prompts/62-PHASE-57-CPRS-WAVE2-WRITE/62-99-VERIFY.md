# Phase 57 — VERIFY: CPRS Parity Wave 2 (WRITE) Safety + Capability Detection

## Gates

| Gate | Description |
|------|-------------|
| G57-1 | wave57-plan.json exists (artifact only) |
| G57-2 | Each write dialog is real or honest-pending with target RPC(s) |
| G57-3 | No fake success — no hardcoded ok:true without real RPC call |
| G57-4 | Audit events emitted (no PHI in detail) |
| G57-5 | Dead clicks = 0 on write dialogs |
| G57-6 | verify-latest + PHI scan + secret scan pass |

## Verification Steps

1. Confirm `artifacts/cprs/wave57-plan.json` exists and contains writeActions array
2. Inspect all 4 new write dialog components + 3 existing for honest behavior
3. Inspect wave2-routes.ts — no route returns `{ok:true}` without calling safeCallRpc or createDraft
4. Confirm audit.ts has Phase 57 action types, and auditWrite in wave2-routes.ts never logs input args
5. Every submit button in write dialogs calls fetch or shows integration-pending
6. Run verify-latest.ps1, scan for PHI (SSN/DOB patterns), scan for hardcoded secrets

## Files Touched
- `scripts/verify-phase57-verify.ps1` (new)
- `prompts/62-PHASE-57-CPRS-WAVE2-WRITE/57-99-VERIFY.md` (this file)
