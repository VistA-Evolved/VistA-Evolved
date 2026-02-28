# Phase 248 -- Wave 7 Manifest + Build-vs-Buy Ledger + Entry Gate

## Implementation Steps

1. Created Wave 7 manifest at `docs/waves/WAVE7-MANIFEST.md`
   - Lists all 9 phases (248-256) with folder mappings and status
   - Documents dependency graph between phases
   - Catalogs existing foundations inherited from prior waves
2. Created Build-vs-Buy ledger at `docs/build-vs-buy.md`
   - OSS-first policy documented
   - 5 category tables: Supply Chain, Testing, Infrastructure, Build, Rejected
   - All tools have license + rationale + existing-in-repo status
3. Created entry gate script at `scripts/wave7-entry-gate.ps1`
   - Validates prompt structure (count, max prefix)
   - Validates evidence directory tree
   - Validates manifest + build-vs-buy existence
   - Detects required tooling (node, pnpm, docker, git)
   - Detects optional tooling (k6, playwright, trivy, grype, syft)
   - Validates existing CI workflow presence
   - Prints planned phase IDs
4. Created evidence directory structure: `evidence/wave-7/P1..P9/`

## Files Touched

- `docs/waves/WAVE7-MANIFEST.md` (new)
- `docs/build-vs-buy.md` (new)
- `scripts/wave7-entry-gate.ps1` (new)
- `evidence/wave-7/P1/` through `evidence/wave-7/P9/` (new dirs)
- `prompts/245-PHASE-248-WAVE7-MANIFEST/248-01-IMPLEMENT.md` (this file)
- `prompts/245-PHASE-248-WAVE7-MANIFEST/248-99-VERIFY.md`
- `prompts/245-PHASE-248-WAVE7-MANIFEST/248-NOTES.md`

## Decisions

- Phase numbers 248-256 (prompt prefixes 245-253) continue from Wave 6 max (247/244)
- Build-vs-buy defaults match user request (Scorecard, Trivy, Syft, Grype, Playwright, k6, Argo Rollouts, Velero)
- Entry gate is PowerShell for consistency with existing verify scripts
- Evidence goes to `/evidence/wave-7/P<n>/` (per Wave 7 convention)
