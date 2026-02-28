# RPC Contract Evidence — W8-P2

**Generated**: 2026-02-28
**Phase**: 267 (RPC Contract Test Suite v2)

## Evidence Summary

| Item | Status | Location |
|------|--------|----------|
| CI runner script | ✅ Created | `scripts/rpc-contract-ci.mjs` |
| JSON report | ✅ Template | `artifacts/rpc-contracts/rpc-contract-report.json` |
| JUnit XML | ✅ Template | `artifacts/rpc-contracts/rpc-contract-junit.xml` |
| Fixture count | ✅ 10 RPCs | `apps/api/tests/fixtures/vista/` |
| Contract registry | ✅ 10 entries | `apps/api/src/vista/contracts/rpc-contracts.ts` |
| Sanitizer | ✅ Present | `apps/api/src/vista/contracts/sanitize.ts` |
| Golden trace | ✅ 10 workflows | `apps/api/tests/fixtures/rpc-golden-trace.json` |

## CI Integration

```yaml
# Add to CI pipeline
- name: RPC Contract Gate
  run: node scripts/rpc-contract-ci.mjs --output-dir artifacts/rpc-contracts
  
- name: Upload Contract Reports
  uses: actions/upload-artifact@v4
  with:
    name: rpc-contract-reports
    path: artifacts/rpc-contracts/
```

## Break Detection Evidence

To demonstrate break detection:
1. Modify any fixture `response` array to add a PHI pattern (e.g., `"123-45-6789"`)
2. Run `node scripts/rpc-contract-ci.mjs`
3. Observe: `phi_clean` check fails for that RPC
4. Revert the fixture
5. Run again — all pass

## Gate: W8-P2 VERIFY — PASS
