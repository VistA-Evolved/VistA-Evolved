# Phase 269 — VERIFY — Security Verification Gauntlet

## Gates

| # | Gate | Pass Criteria |
|---|------|---------------|
| 1 | Gauntlet runner exists | `scripts/security/gauntlet.mjs` present |
| 2 | Dependency scan | Runs and produces results |
| 3 | SAST scan | Runs and produces results |
| 4 | Container scan | Runs and produces results (or documents skip) |
| 5 | IaC scan | Runs and produces results |
| 6 | Fix-forward | Top severity findings addressed |
| 7 | Summary report | `security-scan-summary.md` generated |
| 8 | Evidence captured | `evidence/wave-8/P4-security-gauntlet/` populated |
