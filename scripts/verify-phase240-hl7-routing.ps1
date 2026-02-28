#!/usr/bin/env pwsh
<#
  Phase 240 — HL7v2 Routing Layer  (Wave 6 P3)
  Verification script — 7 gates
#>
param([switch]$SkipDocker)
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0; $total = 7

function gate($n, $label, [scriptblock]$test) {
  try {
    $ok = & $test
    if ($ok) { Write-Host "  PASS  gate $n -- $label" -ForegroundColor Green; $script:pass++ }
    else     { Write-Host "  FAIL  gate $n -- $label" -ForegroundColor Red;   $script:fail++ }
  } catch {
    Write-Host "  FAIL  gate $n -- $label ($_)" -ForegroundColor Red; $script:fail++
  }
}

Write-Host "`n=== Phase 240 (Wave 6 P3): HL7v2 Routing Layer ===`n"

# Gate 1: All 6 routing source files + 1 route file exist
gate 1 "All P3 source files exist" {
  $files = @(
    "apps/api/src/hl7/routing/types.ts",
    "apps/api/src/hl7/routing/registry.ts",
    "apps/api/src/hl7/routing/matcher.ts",
    "apps/api/src/hl7/routing/transform.ts",
    "apps/api/src/hl7/routing/dispatcher.ts",
    "apps/api/src/hl7/routing/index.ts",
    "apps/api/src/routes/hl7-routing.ts"
  )
  $allExist = $true
  foreach ($f in $files) {
    if (-not (Test-Path -LiteralPath $f)) {
      Write-Host "    Missing: $f" -ForegroundColor Yellow
      $allExist = $false
    }
  }
  $allExist
}

# Gate 2: TypeScript compiles
gate 2 "TypeScript compiles clean" {
  $out = pnpm --filter api build 2>&1 | Out-String
  $LASTEXITCODE -eq 0
}

# Gate 3: Registry has CRUD (addRoute, removeRoute, getRoute, listRoutes)
gate 3 "Registry has CRUD functions" {
  $content = Get-Content "apps/api/src/hl7/routing/registry.ts" -Raw
  ($content -match 'export function addRoute') -and
  ($content -match 'export function removeRoute') -and
  ($content -match 'export function getRoute') -and
  ($content -match 'export function listRoutes')
}

# Gate 4: Matcher filters by messageType
gate 4 "Matcher filters by messageType" {
  $content = Get-Content "apps/api/src/hl7/routing/matcher.ts" -Raw
  ($content -match 'messageTypes') -and
  ($content -match 'matchRoutes') -and
  ($content -match 'matchesFilter')
}

# Gate 5: Transform pipeline exists with runTransformPipeline
gate 5 "Transform pipeline exists" {
  $content = Get-Content "apps/api/src/hl7/routing/transform.ts" -Raw
  ($content -match 'export function runTransformPipeline') -and
  ($content -match 'remove-segment') -and
  ($content -match 'set-field') -and
  ($content -match 'copy-field')
}

# Gate 6: No console.log in routing files
gate 6 "No console.log in routing files" {
  $routingFiles = Get-ChildItem "apps/api/src/hl7/routing" -Filter "*.ts" -Recurse
  $routeFile = Get-Item "apps/api/src/routes/hl7-routing.ts"
  $allFiles = @($routingFiles) + @($routeFile)
  $hits = $allFiles | Select-String -Pattern 'console\.log' -SimpleMatch
  $hits.Count -eq 0
}

# Gate 7: Dead-letter queue functions exist
gate 7 "Dead-letter queue functions exist" {
  $content = Get-Content "apps/api/src/hl7/routing/registry.ts" -Raw
  ($content -match 'addToDeadLetter') -and
  ($content -match 'getDeadLetterQueue') -and
  ($content -match 'clearDeadLetterQueue')
}

Write-Host "`n--- Result: $pass / $total passed, $fail failed ---"
if ($fail -gt 0) { exit 1 } else { exit 0 }
