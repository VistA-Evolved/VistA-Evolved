# Phase 120 — Full System Audit + Evidence-Based Gap Matrix (VERIFY)

## Gates
1. `pnpm audit:system` exits 0
2. `artifacts/system-audit.json` is valid JSON with all 9 sections
3. `qa/gauntlet/system-gap-matrix.json` is valid JSON with 19+ domains
4. `docs/audits/system-audit.md` exists and is non-empty
5. No new `/reports` folder created
6. `artifacts/` remains gitignored
7. Prompts ordering gate passes
8. QA Gauntlet FAST still passes (no regression)
9. G10 gate runs in RC suite without crashing
