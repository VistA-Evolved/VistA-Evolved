# Phase 573 — VERIFY

## Gates

| #   | Gate               | Check                                            |
| --- | ------------------ | ------------------------------------------------ |
| 1   | Workflow exists    | `Test-Path .github/workflows/ci-vehu-smoke.yml`  |
| 2   | Not on PR          | File must not contain `pull_request` trigger     |
| 3   | Has dispatch       | File contains `workflow_dispatch`                |
| 4   | Has schedule       | File contains `schedule:` + `cron:`              |
| 5   | Uses VEHU image    | File contains `worldvista/vehu`                  |
| 6   | Runs verify:vista  | File contains `verify:vista`                     |
| 7   | Runs clinic-day    | File contains `clinic-day-runner`                |
| 8   | Uploads on failure | File contains `if: always()` + `upload-artifact` |
| 9   | Gauntlet passes    | `pnpm qa:gauntlet:fast` — 0 FAIL                 |
