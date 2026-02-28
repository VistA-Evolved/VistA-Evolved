<# Phase 245 -- Data Exports v2 (Wave 6 P8) #>
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0
function Test-Gate([string]$name, [scriptblock]$test) {
  try { $r = & $test; if ($r) { Write-Host "  PASS  $name" -F Green; $script:pass++ } else { Write-Host "  FAIL  $name" -F Red; $script:fail++ } }
  catch { Write-Host "  FAIL  $name -- $_" -F Red; $script:fail++ }
}

$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path (Join-Path $root "apps") "api"
$web = Join-Path (Join-Path $root "apps") "web"

Write-Host "`n=== Phase 245: Data Exports v2 ===`n" -F Cyan

Test-Gate "export-engine.ts exists" {
  Test-Path -LiteralPath (Join-Path $api "src/exports/export-engine.ts")
}

Test-Gate "export-formats.ts exists" {
  Test-Path -LiteralPath (Join-Path $api "src/exports/export-formats.ts")
}

Test-Gate "export-sources.ts exists" {
  Test-Path -LiteralPath (Join-Path $api "src/exports/export-sources.ts")
}

Test-Gate "export-engine exports createExportJob + getExportJob + listExportJobs" {
  $c = Get-Content (Join-Path $api "src/exports/export-engine.ts") -Raw
  ($c -match 'export\s+async\s+function\s+createExportJob') -and
  ($c -match 'export\s+function\s+getExportJob') -and
  ($c -match 'export\s+function\s+listExportJobs')
}

Test-Gate "export-formats exports formatCsv + formatJson + formatJsonl" {
  $c = Get-Content (Join-Path $api "src/exports/export-formats.ts") -Raw
  ($c -match 'export\s+function\s+formatCsv') -and
  ($c -match 'export\s+function\s+formatJson\b') -and
  ($c -match 'export\s+function\s+formatJsonl')
}

Test-Gate "export-sources exports registerSource + getSources" {
  $c = Get-Content (Join-Path $api "src/exports/export-sources.ts") -Raw
  ($c -match 'export\s+function\s+registerSource') -and
  ($c -match 'export\s+function\s+getSources')
}

Test-Gate "export-routes.ts exists with GET/POST endpoints" {
  $c = Get-Content (Join-Path $api "src/routes/export-routes.ts") -Raw
  ($c -match 'server\.get.*admin/exports') -and ($c -match 'server\.post.*admin/exports')
}

Test-Gate "Routes registered in register-routes.ts" {
  $c = Get-Content (Join-Path $api "src/server/register-routes.ts") -Raw
  $c -match 'exportV2Routes'
}

Test-Gate "Exports page exists" {
  Test-Path -LiteralPath (Join-Path $web "src/app/cprs/admin/exports/page.tsx")
}

Test-Gate "Admin layout has Exports nav item" {
  $c = Get-Content (Join-Path $web "src/app/cprs/admin/layout.tsx") -Raw
  $c -match 'Exports'
}

Test-Gate "TypeScript compiles" {
  Push-Location $root
  $out = pnpm --filter api build 2>&1 | Out-String
  Pop-Location
  $LASTEXITCODE -eq 0
}

Test-Gate "No console.log in new files" {
  $files = @(
    (Join-Path $api "src/exports/export-engine.ts"),
    (Join-Path $api "src/exports/export-formats.ts"),
    (Join-Path $api "src/exports/export-sources.ts"),
    (Join-Path $api "src/routes/export-routes.ts")
  )
  $found = $false
  foreach ($f in $files) {
    if (Select-String -Path $f -Pattern 'console\.(log|warn|error)' -Quiet) { $found = $true }
  }
  -not $found
}

Write-Host "`n--- Results: $pass PASS / $fail FAIL ---" -F $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) { exit 1 }
