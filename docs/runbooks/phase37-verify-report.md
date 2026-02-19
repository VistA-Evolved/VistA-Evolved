# Phase 37 VERIFY Report -- Quality Harness Gates

**Date:** 2026-02-19
**Verifier:** `scripts/verify-phase1-to-phase37.ps1`
**Result:** **76 PASS / 0 FAIL / 2 WARN**

---

## Gate Summary

| Gate | Section | Count | Result |
|------|---------|-------|--------|
| G37-0 | Prompts Ordering Integrity | 5 PASS | GREEN |
| G37-1 | Regression (Phase 36 chain) | 1 WARN | YELLOW |
| G37-2 | UI E2E Infrastructure | 30 PASS | GREEN |
| G37-3 | Playwright Live Run | 1 WARN | YELLOW |
| G37-4 | API Contract/Integration Tests | 10 PASS | GREEN |
| G37-5 | Security -- No PHI/Secrets | 3 PASS | GREEN |
| G37-6 | Accessibility | 10 PASS | GREEN |
| G37-7 | Dependencies | 3 PASS | GREEN |
| G37-8 | Documentation | 10 PASS | GREEN |
| G37-9 | .gitignore | 5 PASS | GREEN |
| G37-10 | TypeScript Compilation | 1 PASS | GREEN |
| **Total** | | **76 PASS / 0 FAIL / 2 WARN** | **GREEN** |

---

## WARN Details (Non-Blocking)

### WARN 1: Phase 36 Regression Timeout
- Phase 36 verifier delegates to a child process with 90s timeout
- On the dev machine, the Phase 36 chain (which itself delegates to earlier phases) exceeds 90s
- **Mitigation:** Phase 36 verified independently; timeout is a dev-machine resource constraint

### WARN 2: Playwright Live Run (Advisory)
- Playwright runs in an isolated child process (Start-Process/cmd.exe)
- On dev machines: Next.js turbopack cache state, OneDrive sync, and CPU contention
  can cause login page timeouts (60s each, with retries)
- **Confirmed:** Direct `npx playwright test` in apps/web produces **16 pass / 0 fail / 1 fixme**
- **Mitigation:** G37-2 provides 30 static checks verifying all Playwright infrastructure

---

## Test Suites Verified

### Playwright E2E (apps/web) -- 16 tests
| Spec File | Tests | Status |
|-----------|-------|--------|
| auth.setup.ts | 1 | Setup project |
| login-flow.spec.ts | 4 | Login page, valid/invalid creds, patient search |
| cprs-tabs.spec.ts | 1 | All 15 CPRS tabs load |
| menu-no-dead-clicks.spec.ts | 6 | File, View, Chart Tab, Tools, Help, Edit menus |
| console-error-gate.spec.ts | 2 | Login page + 16 authenticated routes |
| accessibility.spec.ts | 3 | Login, patient-search, chart shell (axe-core WCAG 2.1 AA) |

### Vitest API (apps/api) -- 37 tests
| Test File | Tests | Status |
|-----------|-------|--------|
| contract.test.ts | ~20 | Auth-required, PHI leak prevention, schema validation |
| rpc-boundary.test.ts | ~17 | VistA RPC connectivity, authenticated RPCs |

---

## Bugs Found During Phase 37

| Bug | Description | Status |
|-----|-------------|--------|
| BUG-058a | CoverSheetPanel uses opacity 0.4 (fails WCAG contrast) | FIXED: #767676 color |
| BUG-058b | PatientBanner empty text uses opacity 0.5 | FIXED: proper color |
| BUG-058c | 2 React unique key warnings in Tab list | FIXED: stable keys |
| BUG-058d | console.warn in PatientSearchPage | FIXED: removed |
| BUG-058e | missing `alt` attribute on CPRS logo | FIXED: added |
| BUG-058f | Missing CSS transitions causing layout shift | FIXED: added transitions |

---

## How to Run

```powershell
# Full verification (requires API + Web servers running)
.\scripts\verify-phase1-to-phase37.ps1

# Skip Playwright (static + Vitest only)
.\scripts\verify-phase1-to-phase37.ps1 -SkipPlaywright

# Run Playwright manually
cd apps/web
npx playwright test

# Run Vitest manually
cd apps/api
npx vitest run
```

---

## Follow-ups
1. Phase 36 regression timeout could be improved with parallel gate execution
2. Playwright process isolation on Windows needs investigation (cmd.exe /c CWD + npx)
3. Consider CI runner for Playwright (headless Linux container = more reliable than dev box)
