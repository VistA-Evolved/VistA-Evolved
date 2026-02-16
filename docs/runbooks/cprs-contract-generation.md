# Runbook: CPRS Contract Generation (Phase 10B)

## Purpose

Validate and cross-reference the extracted CPRS contracts to ensure schema
stability before downstream consumers (UI shell, API scaffolds) depend on them.
This phase confirms that every RPC referenced in screen mappings exists in the
catalog, and that all JSON files conform to expected structure.

## Inputs

| Input | Path | Notes |
|-------|------|-------|
| Extraction output | `design/contracts/cprs/v1/` | Produced by Phase 10A (`pnpm run cprs:extract`) |

## Commands

```powershell
# Regenerate contracts from source (ensures freshness)
pnpm run cprs:extract

# Then validate — no separate script; use the checks below
```

> There is no standalone `cprs:contract` script. Contract generation is part of
> the extraction pipeline. Validation is manual (see below).

## Expected Outputs

The same 6 files from Phase 10A, now validated for schema correctness:

| File | Required top-level keys |
|------|------------------------|
| `tabs.json` | `_meta`, `tabs`, `summary` |
| `menus.json` | `_meta`, `menus`, `summary` |
| `forms.json` | `_meta`, `forms`, `summary` |
| `rpc_catalog.json` | `_meta`, `rpcs`, `summary` |
| `screen_registry.json` | `_meta`, `screens`, `summary` |
| `coverage_report.md` | Non-empty markdown |

## Validation

### Schema check

```powershell
$files = @(
  @{ path="design/contracts/cprs/v1/tabs.json"; keys=@("_meta","tabs","summary") },
  @{ path="design/contracts/cprs/v1/menus.json"; keys=@("_meta","menus","summary") },
  @{ path="design/contracts/cprs/v1/forms.json"; keys=@("_meta","forms","summary") },
  @{ path="design/contracts/cprs/v1/rpc_catalog.json"; keys=@("_meta","rpcs","summary") },
  @{ path="design/contracts/cprs/v1/screen_registry.json"; keys=@("_meta","screens","summary") }
)
foreach ($f in $files) {
  $json = Get-Content $f.path | ConvertFrom-Json
  $missing = $f.keys | Where-Object { $null -eq $json.$_ }
  if ($missing) { Write-Host "FAIL: $($f.path) missing keys: $missing" }
  else { Write-Host "PASS: $($f.path)" }
}
```

### Cross-reference check

```powershell
$catalog = (Get-Content design/contracts/cprs/v1/rpc_catalog.json | ConvertFrom-Json)
$catalogNames = $catalog.rpcs | ForEach-Object { $_.name }
$registry = (Get-Content design/contracts/cprs/v1/screen_registry.json | ConvertFrom-Json)
$registryRpcs = $registry.screens.PSObject.Properties | ForEach-Object {
  $_.Value.rpcs.PSObject.Properties.Name
} | Sort-Object -Unique
$missing = $registryRpcs | Where-Object { $_ -notin $catalogNames }
Write-Host "Cross-ref: $($registryRpcs.Count) screen RPCs, $($missing.Count) missing from catalog"
```

## Common Failures

| Symptom | Cause | Fix |
|---------|-------|-----|
| Missing `_meta` key | Extraction script outdated | Re-run `pnpm run cprs:extract` |
| Cross-ref RPCs missing | Screen references RPC not in `.pas` files | May be context RPCs or aliased names — document as known gaps |
| JSON parse error | Malformed extraction output | Check extraction script for encoding issues |

## No VA Terminology Check

Contract files contain CPRS-native identifiers (RPC names, MUMPS routines,
Delphi form names). These are technical references, not VA branding.

## Related Prompts

- [12-03-Phase10B-CPRS-Contract-Generation-IMPLEMENT.md](../../prompts/12-PHASE-10-CPRS-EXTRACT/12-03-Phase10B-CPRS-Contract-Generation-IMPLEMENT.md)
- [12-04-Phase10B-CPRS-Contract-Generation-VERIFY.md](../../prompts/12-PHASE-10-CPRS-EXTRACT/12-04-Phase10B-CPRS-Contract-Generation-VERIFY.md)
