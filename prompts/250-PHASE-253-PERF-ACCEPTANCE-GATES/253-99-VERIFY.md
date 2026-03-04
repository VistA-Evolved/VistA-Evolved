# Phase 253 -- VERIFY -- Performance Acceptance Gates

## Verification Script

```powershell
.\scripts\verify-phase253-perf-gates.ps1
```

## Gates (17)

| Gate | Check              | Criteria                         |
| ---- | ------------------ | -------------------------------- |
| G01  | config file        | perf-acceptance-config.ts exists |
| G02  | smoke scenarios    | SMOKE_SCENARIOS defined          |
| G03  | load scenarios     | LOAD_SCENARIOS defined           |
| G04  | >= 5 scenarios     | Total scenario count             |
| G05  | thresholds defined | >= 5 threshold metrics           |
| G06  | CI workflow        | perf-acceptance-gate.yml exists  |
| G07  | smoke CI job       | perf-smoke job defined           |
| G08  | load CI job        | perf-load job defined            |
| G09  | artifact upload    | upload-artifact step             |
| G10  | local runner       | run-acceptance-gate.ps1 exists   |
| G11  | k6 check           | Runner checks k6 installed       |
| G12  | health check       | Runner checks API health         |
| G13  | existing scripts   | 4 core k6 scripts intact         |
| G14  | prompt folder      | Exists                           |
| G15  | IMPLEMENT prompt   | 253-01-IMPLEMENT.md              |
| G16  | VERIFY prompt      | 253-99-VERIFY.md                 |
| G17  | evidence dir       | evidence/wave-7/P6               |

## Expected Output

```
PASS: 17  FAIL: 0  WARN: 0
VERDICT: PASS
```
