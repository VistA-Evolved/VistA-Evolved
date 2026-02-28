# Phase 248 -- Notes

## Edge Cases

- Prompt linter (`scripts/lint-prompts.mjs`) may not exist in all environments;
  entry gate warns but does not fail.
- Optional tools (k6, trivy, grype, syft) are not installed in most dev environments;
  entry gate warns but does not fail.
- Phase numbering assumes continuous increment from Wave 6's max phase 247.

## Follow-ups

- Update `verify-latest.ps1` to delegate to Wave 7 certification once P9 is complete
- Enable cosign signing in supply-chain-attest.yml (currently disabled)
- Consider adding a `pnpm wave7:gate` script alias in root package.json

## Gotchas

- PowerShell 5.1 on Windows may have encoding issues with non-ASCII chars;
  all scripts use ASCII only (per BUG-055)
- `Test-Path -LiteralPath` used for all bracket-containing paths (per BUG-056)
