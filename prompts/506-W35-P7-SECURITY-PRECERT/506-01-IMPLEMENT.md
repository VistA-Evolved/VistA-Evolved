# Phase 506 — Security Pre-Cert Pack + Evidence

## Objective
Create a security pre-certification script that validates:
1. No hardcoded credentials outside login page
2. Console.log budget (<=6)
3. PHI redaction patterns in audit emitters
4. CSRF protection wired
5. Auth rules coverage
6. Rate limiter presence
7. Hash-chained audit integrity

## Files
- `scripts/security/run-precert.ps1` — Security pre-cert runner

## Verification
- run-precert.ps1 exits 0 when all checks pass
