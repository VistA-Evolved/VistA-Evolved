# Phase 267 — VERIFY — RPC Contract Test Suite v2

## Gates

| # | Gate | Pass Criteria |
|---|------|---------------|
| 1 | Contract CI script exists | `scripts/rpc-contract-ci.mjs` present |
| 2 | JSON report generated | `rpc-contract-report.json` produced with pass/fail per RPC |
| 3 | JUnit XML generated | `rpc-contract-junit.xml` valid JUnit format |
| 4 | All 10+ RPCs contracted | Contract registry has ≥10 entries |
| 5 | Fixtures sanitized | All fixtures have `sanitized: true` |
| 6 | PHI scan clean | No SSN/DOB/patient-name patterns in fixtures |
| 7 | Break detection | Deliberate schema change caught by test |
| 8 | Evidence captured | `evidence/wave-8/P2-rpc-contracts/` populated |
