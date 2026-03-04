# 12-99 — Phase 10: FULL VERIFY

## Scope

End-to-end verification of all Phase 10 subphases:

- 10A: CPRS Inventory Extraction
- 10B: CPRS Contract Generation
- 10C: CPRS Replica Shell (Web UI)
- 10D: API Scaffold Generator

## Quick verification sequence

```powershell
# ── Phase 10A: Extraction scripts ──────────────────────────
Write-Host "Phase 10A: Extraction scripts..."
@(
  "tools/cprs-extract/extract-tabs.mjs",
  "tools/cprs-extract/extract-menus.mjs",
  "tools/cprs-extract/extract-forms.mjs",
  "tools/cprs-extract/extract-rpcs.mjs",
  "tools/cprs-extract/run-all.mjs",
  "tools/cprs-extract/lib/paths.mjs"
) | ForEach-Object { if (!(Test-Path $_)) { Write-Host "FAIL: $_ missing" } }

# ── Phase 10B: Contracts ──────────────────────────────────
Write-Host "Phase 10B: Contracts..."
@(
  "design/contracts/cprs/v1/tabs.json",
  "design/contracts/cprs/v1/menus.json",
  "design/contracts/cprs/v1/forms.json",
  "design/contracts/cprs/v1/rpc_catalog.json",
  "design/contracts/cprs/v1/screen_registry.json",
  "design/contracts/cprs/v1/coverage_report.md"
) | ForEach-Object { if (!(Test-Path $_)) { Write-Host "FAIL: $_ missing" } }

# ── Phase 10C: Web UI shell ──────────────────────────────
Write-Host "Phase 10C: Web build..."
pnpm -C apps/web build
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: web build" }

# ── Phase 10D: API scaffold ──────────────────────────────
Write-Host "Phase 10D: API scaffold..."
pnpm run cprs:generate-stubs
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: generate-stubs" }
pnpm -C apps/api build
if ($LASTEXITCODE -ne 0) { Write-Host "FAIL: api build" }

@(
  "apps/api/src/routes/index.ts",
  "apps/api/src/routes/problems.ts",
  "apps/api/src/routes/meds.ts",
  "apps/api/src/routes/notes.ts",
  "apps/api/src/routes/orders.ts",
  "apps/api/src/routes/labs.ts",
  "apps/api/src/routes/reports.ts"
) | ForEach-Object { if (!(Test-Path $_)) { Write-Host "FAIL: $_ missing" } }

Write-Host "Phase 10 FULL VERIFY complete."
```

## Pass criteria

All file checks pass. Both `pnpm -C apps/web build` and `pnpm -C apps/api build` exit 0.
Generator script runs without errors.
