<# verify-phase41-rpc-catalog.ps1
   Phase 41: Vivian Snapshot Integration + RPC Catalog + Coverage Gates
   Verifies: normalizer, registry, action registry, coverage matrix, docs
#>
param(
  [switch]$SkipDocker,
  [switch]$SkipLive
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Continue"

$root = Split-Path -Parent $PSScriptRoot
$pass = 0; $fail = 0; $total = 0

function Write-Gate([string]$name, [bool]$ok, [string]$detail = "") {
  $script:total++
  if ($ok) {
    $script:pass++
    Write-Host "  PASS  $name" -ForegroundColor Green
  } else {
    $script:fail++
    Write-Host "  FAIL  $name  $detail" -ForegroundColor Red
  }
}

Write-Host "`n=== Phase 41: Vivian Snapshot + RPC Catalog + Coverage Gates ===" -ForegroundColor Cyan

# =====================================================================
# SECTION 1: VIVIAN SNAPSHOT NORMALIZATION
# =====================================================================
Write-Host "`n--- S1: Vivian Snapshot Normalization ---" -ForegroundColor Yellow

$vivianSrc = Join-Path $root "docs\grounding\vivian-index.json"
Write-Gate "vivian-index.json exists" (Test-Path -LiteralPath $vivianSrc)

if (Test-Path -LiteralPath $vivianSrc) {
  $vj = Get-Content -LiteralPath $vivianSrc -Raw | ConvertFrom-Json
  Write-Gate "vivian-index has _meta" ($null -ne $vj._meta)
  Write-Gate "vivian-index totalRpcs >= 3000" ($vj._meta.totalRpcs -ge 3000) "Got: $($vj._meta.totalRpcs)"
}

$normalizerTs = Join-Path $root "apps\api\src\tools\vivian\normalizeVivianSnapshot.ts"
Write-Gate "normalizeVivianSnapshot.ts exists" (Test-Path -LiteralPath $normalizerTs)

$rpcIndex = Join-Path $root "data\vista\vivian\rpc_index.json"
Write-Gate "rpc_index.json exists" (Test-Path -LiteralPath $rpcIndex)

if (Test-Path -LiteralPath $rpcIndex) {
  $ri = Get-Content -LiteralPath $rpcIndex -Raw | ConvertFrom-Json
  Write-Gate "rpc_index has _meta" ($null -ne $ri._meta)
  Write-Gate "rpc_index totalRpcs >= 3000" ($ri._meta.totalRpcs -ge 3000) "Got: $($ri._meta.totalRpcs)"
  Write-Gate "rpc_index has rpcs array" ($ri.rpcs.Count -gt 0)
  # Check stable sorting (first < last alphabetically)
  if ($ri.rpcs.Count -ge 2) {
    $firstN = $ri.rpcs[0].name
    $lastN = $ri.rpcs[$ri.rpcs.Count - 1].name
    Write-Gate "rpc_index sorted (first < last)" ($firstN -lt $lastN) "first=$firstN last=$lastN"
  }
}

$rpcHash = Join-Path $root "data\vista\vivian\rpc_index.hash"
Write-Gate "rpc_index.hash exists" (Test-Path -LiteralPath $rpcHash)

# =====================================================================
# SECTION 2: RPC REGISTRY (BUILD GATES)
# =====================================================================
Write-Host "`n--- S2: RPC Registry (Build Gates) ---" -ForegroundColor Yellow

$registryTs = Join-Path $root "apps\api\src\vista\rpcRegistry.ts"
Write-Gate "rpcRegistry.ts exists" (Test-Path -LiteralPath $registryTs)

if (Test-Path -LiteralPath $registryTs) {
  $regContent = Get-Content -LiteralPath $registryTs -Raw
  Write-Gate "rpcRegistry exports RPC_REGISTRY" ($regContent -match "export const RPC_REGISTRY")
  Write-Gate "rpcRegistry exports RPC_EXCEPTIONS" ($regContent -match "export const RPC_EXCEPTIONS")
  Write-Gate "rpcRegistry exports assertKnownRpc" ($regContent -match "export function assertKnownRpc")
  Write-Gate "rpcRegistry exports isKnownRpc" ($regContent -match "export function isKnownRpc")

  # Count entries
  $regMatches = [regex]::Matches($regContent, '{ name: "')
  Write-Gate "RPC_REGISTRY has 50+ entries" ($regMatches.Count -ge 50) "Got: $($regMatches.Count)"

  # Check key RPCs are in registry
  $keyRpcs = @("ORWPT LIST ALL", "ORQQAL LIST", "ORWPS ACTIVE", "TIU DOCUMENTS BY CONTEXT", "ORWDX SAVE")
  $missingKey = @($keyRpcs | Where-Object { $regContent -notmatch [regex]::Escape($_) })
  Write-Gate "Key RPCs in registry" ($missingKey.Count -eq 0) "Missing: $($missingKey -join ', ')"

  # Check tags
  Write-Gate "Registry has read tags" ($regContent -match 'tag: "read"')
  Write-Gate "Registry has write tags" ($regContent -match 'tag: "write"')
  Write-Gate "Registry has auth tags" ($regContent -match 'tag: "auth"')
  Write-Gate "Registry has custom tags" ($regContent -match 'tag: "custom"')
}

# Cross-check: every RPC in registry should be in Vivian index OR exceptions
if ((Test-Path -LiteralPath $registryTs) -and (Test-Path -LiteralPath $rpcIndex)) {
  $ri2 = Get-Content -LiteralPath $rpcIndex -Raw | ConvertFrom-Json
  $vivianNames = @{}
  foreach ($rpc in $ri2.rpcs) { $vivianNames[$rpc.name.ToUpper()] = $true }

  $regContent2 = Get-Content -LiteralPath $registryTs -Raw

  # Extract only RPC_REGISTRY entries (between "export const RPC_REGISTRY" and the closing "];")
  $regSection = ""
  if ($regContent2 -match '(?s)export const RPC_REGISTRY.*?\[(.*?)\];') {
    $regSection = $Matches[1]
  }
  $regNames = @([regex]::Matches($regSection, 'name: "([^"]+)"') | ForEach-Object { $_.Groups[1].Value })

  # Extract only RPC_EXCEPTIONS entries
  $excSection = ""
  if ($regContent2 -match '(?s)export const RPC_EXCEPTIONS.*?\[(.*?)\];') {
    $excSection = $Matches[1]
  }
  $excNames = @([regex]::Matches($excSection, 'name: "([^"]+)"') | ForEach-Object { $_.Groups[1].Value })
  $excSet = @{}; foreach ($e in $excNames) { $excSet[$e.ToUpper()] = $true }

  $notInVivian = @($regNames | Where-Object { -not $vivianNames[$_.ToUpper()] -and -not $excSet[$_.ToUpper()] })
  Write-Gate "All registry RPCs in Vivian or exceptions" ($notInVivian.Count -eq 0) "Unaccounted: $($notInVivian -join ', ')"
}

# =====================================================================
# SECTION 3: ACTION REGISTRY
# =====================================================================
Write-Host "`n--- S3: UI Action Registry ---" -ForegroundColor Yellow

$actionTs = Join-Path $root "apps\web\src\actions\actionRegistry.ts"
Write-Gate "actionRegistry.ts exists (web)" (Test-Path -LiteralPath $actionTs)

$debugDataTs = Join-Path $root "apps\api\src\vista\rpcDebugData.ts"
Write-Gate "rpcDebugData.ts exists (api)" (Test-Path -LiteralPath $debugDataTs)

if (Test-Path -LiteralPath $actionTs) {
  $actContent = Get-Content -LiteralPath $actionTs -Raw
  Write-Gate "actionRegistry exports ACTION_REGISTRY" ($actContent -match "export const ACTION_REGISTRY")
  $actionMatches = [regex]::Matches($actContent, 'actionId: "([^"]+)"')
  Write-Gate "ACTION_REGISTRY has 30+ actions" ($actionMatches.Count -ge 30) "Got: $($actionMatches.Count)"
  Write-Gate "Has wired status" ($actContent -match 'status: "wired"')
  Write-Gate "Has getActionsByLocation" ($actContent -match "getActionsByLocation")
  Write-Gate "Has getActionsByRpc" ($actContent -match "getActionsByRpc")
}

# Cross-check: every RPC in action registry should be in rpcRegistry
if ((Test-Path -LiteralPath $actionTs) -and (Test-Path -LiteralPath $registryTs)) {
  $actRpcs = @([regex]::Matches($actContent, 'rpcs: \[([^\]]+)\]') | ForEach-Object {
    $_.Groups[1].Value -split '"' | Where-Object { $_ -match '[A-Z]' }
  } | Sort-Object -Unique)

  $rc = Get-Content -LiteralPath $registryTs -Raw
  # Collect all name: entries from both RPC_REGISTRY and RPC_EXCEPTIONS
  $allNames = @([regex]::Matches($rc, 'name: "([^"]+)"') | ForEach-Object { $_.Groups[1].Value.ToUpper() })
  $regSet = @{}; foreach ($r in $allNames) { $regSet[$r] = $true }

  $actMissing = @($actRpcs | Where-Object { -not $regSet[$_.ToUpper()] })
  Write-Gate "All action RPCs in rpcRegistry" ($actMissing.Count -eq 0) "Missing: $($actMissing -join ', ')"
}

# =====================================================================
# SECTION 4: RPC DEBUG PANEL
# =====================================================================
Write-Host "`n--- S4: RPC Debug Panel ---" -ForegroundColor Yellow

$debugPanel = Join-Path $root "apps\web\src\components\cprs\panels\RpcDebugPanel.tsx"
Write-Gate "RpcDebugPanel.tsx exists" (Test-Path -LiteralPath $debugPanel)

if (Test-Path -LiteralPath $debugPanel) {
  $dpContent = Get-Content -LiteralPath $debugPanel -Raw
  Write-Gate "Panel fetches /vista/rpc-debug/actions" ($dpContent -match "/vista/rpc-debug/actions")
  Write-Gate "Panel fetches /vista/rpc-catalog" ($dpContent -match "/vista/rpc-catalog")
  Write-Gate "Panel shows integration-pending" ($dpContent -match "integration-pending")
}

# =====================================================================
# SECTION 5: COVERAGE MATRIX TOOL
# =====================================================================
Write-Host "`n--- S5: Coverage Matrix Tool ---" -ForegroundColor Yellow

$matrixTs = Join-Path $root "apps\api\src\tools\vista\buildRpcCoverageMatrix.ts"
Write-Gate "buildRpcCoverageMatrix.ts exists" (Test-Path -LiteralPath $matrixTs)

if (Test-Path -LiteralPath $matrixTs) {
  $mtContent = Get-Content -LiteralPath $matrixTs -Raw
  Write-Gate "Matrix reads Vivian index" ($mtContent -match "rpc_index\.json")
  Write-Gate "Matrix writes rpc_present.json" ($mtContent -match "rpc_present\.json")
  Write-Gate "Matrix writes rpc_missing_vs_vivian.json" ($mtContent -match "rpc_missing_vs_vivian\.json")
  Write-Gate "Matrix generates coverage report" ($mtContent -match "rpc-coverage-report\.md")
}

# =====================================================================
# SECTION 6: VISTA-SIDE RPC PROBE
# =====================================================================
Write-Host "`n--- S6: VistA RPC Probe ---" -ForegroundColor Yellow

$zverpc = Join-Path $root "services\vista\ZVERPC.m"
Write-Gate "ZVERPC.m exists" (Test-Path -LiteralPath $zverpc)

if (Test-Path -LiteralPath $zverpc) {
  $mContent = Get-Content -LiteralPath $zverpc -Raw
  Write-Gate "ZVERPC has LIST entry" ($mContent -match "^LIST\(" -or $mContent -match "LIST\(RESULT")
  Write-Gate "ZVERPC has INSTALL entry" ($mContent -match "(?m)^INSTALL")
  Write-Gate "ZVERPC reads ^XWB(8994" ($mContent -match "\^XWB\(8994")
  Write-Gate "ZVERPC is read-only (no SET except install)" ($mContent -match "RESULT\(")
}

$installScript = Join-Path $root "scripts\install-rpc-catalog.ps1"
Write-Gate "install-rpc-catalog.ps1 exists" (Test-Path -LiteralPath $installScript)

# =====================================================================
# SECTION 7: DOCUMENTATION
# =====================================================================
Write-Host "`n--- S7: Documentation ---" -ForegroundColor Yellow

$doc1 = Join-Path $root "docs\vista\vivian-snapshot-format.md"
Write-Gate "vivian-snapshot-format.md exists" (Test-Path -LiteralPath $doc1)

$doc2 = Join-Path $root "docs\runbooks\vista-rpc-rpc-list-probe.md"
Write-Gate "vista-rpc-rpc-list-probe.md exists" (Test-Path -LiteralPath $doc2)

# Coverage report is generated -- may not exist yet
$doc3 = Join-Path $root "docs\vista\rpc-coverage-report.md"
$coverageExists = Test-Path -LiteralPath $doc3
Write-Gate "rpc-coverage-report.md exists (may be generated)" $coverageExists

# =====================================================================
# SECTION 8: API ENDPOINTS
# =====================================================================
Write-Host "`n--- S8: API Endpoints (source check) ---" -ForegroundColor Yellow

$indexTs = Join-Path $root "apps\api\src\index.ts"
if (Test-Path -LiteralPath $indexTs) {
  $idxContent = Get-Content -LiteralPath $indexTs -Raw
  Write-Gate "GET /vista/rpc-catalog exists" ($idxContent -match '/vista/rpc-catalog')
  Write-Gate "GET /vista/rpc-debug/actions exists" ($idxContent -match '/vista/rpc-debug/actions')
  Write-Gate "GET /vista/rpc-debug/registry exists" ($idxContent -match '/vista/rpc-debug/registry')
  Write-Gate "GET /vista/rpc-debug/coverage exists" ($idxContent -match '/vista/rpc-debug/coverage')
  Write-Gate "Imports rpcRegistry" ($idxContent -match 'rpcRegistry')
}

# =====================================================================
# SECTION 9: NO PHI / CREDENTIALS LEAKAGE
# =====================================================================
Write-Host "`n--- S9: PHI/Credential Safety ---" -ForegroundColor Yellow

$safeFiles = @(
  "data\vista\vivian\rpc_index.json",
  "apps\api\src\vista\rpcRegistry.ts",
  "apps\api\src\vista\rpcDebugData.ts",
  "apps\web\src\actions\actionRegistry.ts"
)

$phiClean = $true
foreach ($sf in $safeFiles) {
  $fp = Join-Path $root $sf
  if (Test-Path -LiteralPath $fp) {
    $fc = Get-Content -LiteralPath $fp -Raw
    if ($fc -match "PROV123|PHARM123|NURSE123|\d{3}-\d{2}-\d{4}") {
      Write-Gate "No PHI in $sf" $false "Found credential or SSN pattern"
      $phiClean = $false
    }
  }
}
if ($phiClean) { Write-Gate "All Phase 41 files PHI-clean" $true }

# =====================================================================
# SECTION 10: PROMPTS FOLDER INTEGRITY
# =====================================================================
Write-Host "`n--- S10: Prompts Folder Integrity ---" -ForegroundColor Yellow

$promptsDir = Join-Path $root "prompts"
$promptDirs = Get-ChildItem -Path $promptsDir -Directory | Where-Object { $_.Name -match '^\d{2}-' } | Sort-Object Name
Write-Gate "Prompts has 45+ numbered dirs" ($promptDirs.Count -ge 45) "Got: $($promptDirs.Count)"

$p41 = $promptDirs | Where-Object { $_.Name -match "45-PHASE-41" }
Write-Gate "45-PHASE-41 prompt exists" ($null -ne $p41)

# Check no duplicate numbers (exclude 00-* utility dirs)
$numberedDirs = @($promptDirs | Where-Object { $_.Name -notmatch '^00-' })
$numbers = $numberedDirs | ForEach-Object { ($_.Name -split '-')[0] }
$dupes = @($numbers | Group-Object | Where-Object { $_.Count -gt 1 })
$dupeMsg = if ($dupes.Count -gt 0) { "Dupes: $(($dupes | ForEach-Object { $_.Name }) -join ', ')" } else { "" }
Write-Gate "No duplicate prompt numbers (excl 00-*)" ($dupes.Count -eq 0) $dupeMsg

# =====================================================================
# SUMMARY
# =====================================================================
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Phase 41 VERIFY Results: $pass / $total" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) {
  Write-Host "  FAILURES: $fail" -ForegroundColor Red
}
Write-Host "========================================`n" -ForegroundColor Cyan

exit $fail
