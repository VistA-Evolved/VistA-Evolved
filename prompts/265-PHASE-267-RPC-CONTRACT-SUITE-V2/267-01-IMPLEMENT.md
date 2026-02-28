# Phase 267 — RPC Contract Test Suite v2 (W8-P2)

## User Request
Stop "things not calling/communicating with VistA" from ever shipping again.

## Implementation Steps
1. Create `scripts/rpc-contract-ci.mjs` — CI runner producing JSON + JUnit reports
2. Add missing RPC fixtures for broader coverage
3. Create evidence report generators
4. Create prompt files

## Verification Steps
- CI job produces rpc-contract-report.json
- CI job produces rpc-contract-junit.xml
- Deliberate break triggers failure, fix restores pass
- Evidence captured

## Files Touched
- scripts/rpc-contract-ci.mjs (new)
- apps/api/tests/fixtures/vista/ (new fixtures)
- evidence/wave-8/P2-rpc-contracts/ (new)
