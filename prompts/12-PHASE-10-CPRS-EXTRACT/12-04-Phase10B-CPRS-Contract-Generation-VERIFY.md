# 12-04 — Phase 10B: CPRS Contract Generation — VERIFY

## What to verify

Phase 10B ensures the extracted CPRS contracts are valid, cross-referenced,
and ready for downstream consumption by the UI shell and API scaffolds.

## Automated checks

```powershell
# 1. Contract files exist with correct structure
$tabs = Get-Content design/contracts/cprs/v1/tabs.json | ConvertFrom-Json
$tabs._meta | Should-Not-Be-Null
$tabs.tabs.Count -ge 10

$menus = Get-Content design/contracts/cprs/v1/menus.json | ConvertFrom-Json
$menus._meta | Should-Not-Be-Null
$menus.menus.Count -ge 5

$forms = Get-Content design/contracts/cprs/v1/forms.json | ConvertFrom-Json
$forms._meta | Should-Not-Be-Null
$forms.forms.Count -ge 300

$catalog = Get-Content design/contracts/cprs/v1/rpc_catalog.json | ConvertFrom-Json
$catalog._meta | Should-Not-Be-Null
$catalog.rpcs.Count -ge 900

$registry = Get-Content design/contracts/cprs/v1/screen_registry.json | ConvertFrom-Json
$registry._meta | Should-Not-Be-Null
($registry.screens | Get-Member -MemberType NoteProperty).Count -ge 80

# 2. Coverage report exists and is non-empty
(Get-Item design/contracts/cprs/v1/coverage_report.md).Length -gt 100
```

## Cross-reference check

Every RPC referenced in `screen_registry.json` should exist in `rpc_catalog.json`.

```powershell
$catalogNames = $catalog.rpcs | ForEach-Object { $_.name }
$registryRpcs = $registry.screens.PSObject.Properties | ForEach-Object {
  $_.Value.rpcs.PSObject.Properties.Name
} | Sort-Object -Unique
$missing = $registryRpcs | Where-Object { $_ -notin $catalogNames }
# $missing should be empty or contain only context RPCs
```

## Pass criteria
All contract files valid. Cross-reference has zero unexpected missing RPCs.
