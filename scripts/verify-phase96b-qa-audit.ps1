<#
.SYNOPSIS
  Phase 96B -- QA/Audit OS v1.1 verifier.
.DESCRIPTION
  Validates the QA infrastructure: RPC trace, flow catalog, routes,
  Playwright specs, admin UI, and documentation.
#>

param(
  [switch]$Verbose
)

$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent
$pass = 0
$fail = 0
$warnings = 0
$results = @()

function Gate([string]$name, [scriptblock]$check) {
  try {
    $ok = & $check
    if ($ok) {
      $results += "PASS: $name"
      $script:pass++
    } else {
      $results += "FAIL: $name"
      $script:fail++
    }
  } catch {
    $results += "FAIL: $name -- $_"
    $script:fail++
  }
}

Write-Host "`n=== Phase 96B QA/Audit OS v1.1 Verifier ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# ── Gate 1: QA module files ──────────────────────────────────
Gate "qa/types.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\qa\types.ts"
}

Gate "qa/rpc-trace.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\qa\rpc-trace.ts"
}

Gate "qa/flow-catalog.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\qa\flow-catalog.ts"
}

Gate "qa/index.ts barrel exists" {
  Test-Path -LiteralPath "$root\apps\api\src\qa\index.ts"
}

# ── Gate 2: RPC trace features ──────────────────────────────
Gate "rpc-trace.ts has ring buffer" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\qa\rpc-trace.ts" -Raw
  ($content -match 'MAX_BUFFER_SIZE') -and ($content -match 'recordRpcTrace')
}

Gate "rpc-trace.ts has PHI sanitization" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\qa\rpc-trace.ts" -Raw
  ($content -match 'hashDuz') -and ($content -match 'sanitizeParams')
}

Gate "rpc-trace.ts has stats" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\qa\rpc-trace.ts" -Raw
  ($content -match 'getRpcTraceStats') -and ($content -match 'p95DurationMs')
}

# ── Gate 3: Flow catalog features ────────────────────────────
Gate "flow-catalog.ts has loader" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\qa\flow-catalog.ts" -Raw
  ($content -match 'loadFlowCatalog') -and ($content -match 'qa-flows')
}

Gate "flow-catalog.ts has runner" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\qa\flow-catalog.ts" -Raw
  ($content -match 'executeFlow') -and ($content -match 'resolveTemplate')
}

Gate "flow-catalog.ts has BOM strip" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\qa\flow-catalog.ts" -Raw
  $content -match '0xfeff'
}

# ── Gate 4: QA routes ───────────────────────────────────────
Gate "qa-routes.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\routes\qa-routes.ts"
}

Gate "qa-routes.ts has NODE_ENV guard" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\routes\qa-routes.ts" -Raw
  ($content -match 'NODE_ENV') -and ($content -match 'QA_ROUTES_ENABLED')
}

Gate "qa-routes.ts has trace endpoints" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\routes\qa-routes.ts" -Raw
  ($content -match '/qa/traces') -and ($content -match '/qa/traces/stats')
}

Gate "qa-routes.ts has flow endpoints" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\routes\qa-routes.ts" -Raw
  ($content -match '/qa/flows') -and ($content -match '/qa/flows/:flowId/run')
}

Gate "qa-routes.ts has dead-click endpoints" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\routes\qa-routes.ts" -Raw
  $content -match '/qa/dead-clicks'
}

# ── Gate 5: QA flow JSON files ──────────────────────────────
Gate "config/qa-flows directory exists" {
  Test-Path -LiteralPath "$root\config\qa-flows"
}

$flowFiles = Get-ChildItem -LiteralPath "$root\config\qa-flows" -Filter "*.json" -ErrorAction SilentlyContinue
Gate "15+ QA flow JSON files exist (plus schema)" {
  ($flowFiles | Where-Object { $_.Name -ne 'schema.json' }).Count -ge 15
}

# Validate each flow has required fields
foreach ($f in $flowFiles) {
  if ($f.Name -eq 'schema.json') { continue }
  Gate "flow $($f.Name) has valid structure" {
    $raw = Get-Content -LiteralPath $f.FullName -Raw
    $json = $raw | ConvertFrom-Json
    ($json.id -ne $null) -and ($json.name -ne $null) -and ($json.steps -ne $null)
  }
}

# Check priority distribution
Gate "flows include smoke priority" {
  $hasSmoke = $false
  foreach ($f in $flowFiles) {
    $json = Get-Content -LiteralPath $f.FullName -Raw | ConvertFrom-Json
    if ($json.priority -eq "smoke") { $hasSmoke = $true }
  }
  $hasSmoke
}

Gate "flows include regression priority" {
  $hasRegression = $false
  foreach ($f in $flowFiles) {
    $json = Get-Content -LiteralPath $f.FullName -Raw | ConvertFrom-Json
    if ($json.priority -eq "regression") { $hasRegression = $true }
  }
  $hasRegression
}

Gate "flows include deep priority" {
  $hasDeep = $false
  foreach ($f in $flowFiles) {
    $json = Get-Content -LiteralPath $f.FullName -Raw | ConvertFrom-Json
    if ($json.priority -eq "deep") { $hasDeep = $true }
  }
  $hasDeep
}

# ── Gate 6: Playwright specs ────────────────────────────────
Gate "phase-replay.spec.ts exists" {
  Test-Path -LiteralPath "$root\apps\web\e2e\phase-replay.spec.ts"
}

Gate "dead-click-crawler.spec.ts exists" {
  Test-Path -LiteralPath "$root\apps\web\e2e\dead-click-crawler.spec.ts"
}

Gate "phase-replay spec tests flow execution" {
  $content = Get-Content -LiteralPath "$root\apps\web\e2e\phase-replay.spec.ts" -Raw
  ($content -match 'smoke-health') -and ($content -match 'qa/flows')
}

Gate "dead-click-crawler detects dead clicks" {
  $content = Get-Content -LiteralPath "$root\apps\web\e2e\dead-click-crawler.spec.ts" -Raw
  ($content -match 'findDeadClicks') -and ($content -match 'CRAWL_PAGES')
}

# ── Gate 7: Admin UI ────────────────────────────────────────
Gate "qa-dashboard page.tsx exists" {
  Test-Path -LiteralPath "$root\apps\web\src\app\cprs\admin\qa-dashboard\page.tsx"
}

Gate "qa-dashboard has 4 tabs" {
  $content = Get-Content -LiteralPath "$root\apps\web\src\app\cprs\admin\qa-dashboard\page.tsx" -Raw
  ($content -match 'traces') -and ($content -match 'flows') -and ($content -match 'results') -and ($content -match 'deadclicks')
}

# ── Gate 8: Wired into index.ts ──────────────────────────────
Gate "index.ts imports qa-routes" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\index.ts" -Raw
  $content -match 'qa-routes'
}

Gate "index.ts imports loadFlowCatalog" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\index.ts" -Raw
  $content -match 'loadFlowCatalog'
}

Gate "index.ts registers qaRoutes" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\index.ts" -Raw
  $content -match 'server\.register\(qaRoutes\)'
}

# ── Gate 9: Auth rules ──────────────────────────────────────
Gate "security.ts has QA auth rule" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\middleware\security.ts" -Raw
  ($content -match 'pattern.*qa') -and ($content -match 'Phase 96B.*QA routes')
}

Gate "security.ts has __test__ auth rule" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\middleware\security.ts" -Raw
  $content -match '__test__'
}

# ── Gate 10: Admin layout nav ───────────────────────────────
Gate "layout.tsx has QA Dashboard nav" {
  $content = Get-Content -LiteralPath "$root\apps\web\src\app\cprs\admin\layout.tsx" -Raw
  $content -match 'qa-dashboard'
}

# ── Gate 11: Documentation ──────────────────────────────────
Gate "ADR exists" {
  Test-Path -LiteralPath "$root\docs\decisions\phase96b-qa-audit-os.md"
}

Gate "Runbook exists" {
  Test-Path -LiteralPath "$root\docs\runbooks\qa-audit-os.md"
}

Gate "Prompt file exists" {
  Test-Path -LiteralPath "$root\prompts\101-PHASE-96B-QA-AUDIT-OS\96B-01-IMPLEMENT.md"
}

# ── Gate 12: No console.log in new API files ─────────────────
$qaApiFiles = @(
  "$root\apps\api\src\qa\types.ts",
  "$root\apps\api\src\qa\rpc-trace.ts",
  "$root\apps\api\src\qa\flow-catalog.ts",
  "$root\apps\api\src\qa\index.ts",
  "$root\apps\api\src\routes\qa-routes.ts"
)
$consoleLogCount = 0
foreach ($f in $qaApiFiles) {
  if (Test-Path -LiteralPath $f) {
    $lines = Get-Content -LiteralPath $f
    foreach ($line in $lines) {
      if ($line -match 'console\.log') { $consoleLogCount++ }
    }
  }
}
Gate "No console.log in Phase 96B API files" {
  $consoleLogCount -eq 0
}

# ── Gate 13: Types completeness ──────────────────────────────
Gate "types.ts has RpcTraceEntry" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\qa\types.ts" -Raw
  $content -match 'RpcTraceEntry'
}

Gate "types.ts has QaFlow" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\qa\types.ts" -Raw
  $content -match 'QaFlow'
}

Gate "types.ts has DeadClickEntry" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\qa\types.ts" -Raw
  $content -match 'DeadClickEntry'
}

# ── Gate 14: RPC trace call-site in resilient layer ──────────
Gate "rpcBrokerClient.ts imports recordRpcTrace" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\vista\rpcBrokerClient.ts" -Raw
  $content -match 'recordRpcTrace'
}

Gate "rpcBrokerClient.ts calls recordRpcTrace on success" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\vista\rpcBrokerClient.ts" -Raw
  $content -match 'recordRpcTrace\(\{[^}]*success:\s*true'
}

Gate "rpcBrokerClient.ts calls recordRpcTrace on failure" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\vista\rpcBrokerClient.ts" -Raw
  $content -match 'recordRpcTrace\(\{[^}]*success:\s*false'
}

# ── Gate 15: __test__/rpc-traces endpoint ────────────────────
Gate "qa-routes.ts has __test__/rpc-traces endpoint" {
  $content = Get-Content -LiteralPath "$root\apps\api\src\routes\qa-routes.ts" -Raw
  $content -match '__test__/rpc-traces'
}

# ── Gate 16: Schema and expectedRpcs ─────────────────────────
Gate "config/qa-flows/schema.json exists" {
  Test-Path -LiteralPath "$root\config\qa-flows\schema.json"
}

Gate "schema.json validates flow structure" {
  $content = Get-Content -LiteralPath "$root\config\qa-flows\schema.json" -Raw
  ($content -match 'expectedRpcs') -and ($content -match 'uiRoute') -and ($content -match 'json-schema')
}

Gate "all flows have expectedRpcs field" {
  $allHaveField = $true
  foreach ($f in $flowFiles) {
    if ($f.Name -eq 'schema.json') { continue }
    $json = Get-Content -LiteralPath $f.FullName -Raw | ConvertFrom-Json
    if ($null -eq $json.expectedRpcs) { $allHaveField = $false; break }
  }
  $allHaveField
}

Gate "all flows have uiRoute field" {
  $allHaveField = $true
  foreach ($f in $flowFiles) {
    if ($f.Name -eq 'schema.json') { continue }
    $json = Get-Content -LiteralPath $f.FullName -Raw | ConvertFrom-Json
    if (-not ($json.PSObject.Properties.Name -contains 'uiRoute')) { $allHaveField = $false; break }
  }
  $allHaveField
}

# ── Gate 17: qa:phase-replay script ──────────────────────────
Gate "root package.json has qa:phase-replay script" {
  $content = Get-Content -LiteralPath "$root\package.json" -Raw
  $content -match 'qa:phase-replay'
}

# ── Gate 18: Playwright spec checks __test__ endpoint ────────
Gate "phase-replay spec tests __test__/rpc-traces" {
  $content = Get-Content -LiteralPath "$root\apps\web\e2e\phase-replay.spec.ts" -Raw
  $content -match '__test__/rpc-traces'
}

# ── Summary ──────────────────────────────────────────────────
Write-Host ""
foreach ($r in $results) {
  if ($r -match '^PASS') { Write-Host $r -ForegroundColor Green }
  elseif ($r -match '^FAIL') { Write-Host $r -ForegroundColor Red }
  else { Write-Host $r -ForegroundColor Yellow }
}

Write-Host "`n--- Summary ---" -ForegroundColor Cyan
Write-Host "PASS: $pass  FAIL: $fail  WARN: $warnings" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
Write-Host "Total gates: $($pass + $fail)"

if ($fail -eq 0) {
  Write-Host "`nPhase 96B: ALL GATES PASSED" -ForegroundColor Green
} else {
  Write-Host "`nPhase 96B: $fail gate(s) FAILED" -ForegroundColor Red
}

exit $fail
