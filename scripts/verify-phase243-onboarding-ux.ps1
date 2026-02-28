<# Phase 243 -- Onboarding UX Wizard (Wave 6 P6) #>
param([switch]$Verbose)
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0
function Test-Gate([string]$name, [scriptblock]$test) {
  try { $r = & $test; if ($r) { Write-Host "  PASS  $name" -F Green; $script:pass++ } else { Write-Host "  FAIL  $name" -F Red; $script:fail++ } }
  catch { Write-Host "  FAIL  $name -- $_" -F Red; $script:fail++ }
}

$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path (Join-Path $root "apps") "api"
$web = Join-Path (Join-Path $root "apps") "web"

Write-Host "`n=== Phase 243: Onboarding UX Wizard ===`n" -F Cyan

Test-Gate "onboarding-store.ts exists" {
  Test-Path -LiteralPath (Join-Path $api "src/config/onboarding-store.ts")
}

Test-Gate "onboarding-routes.ts exists" {
  Test-Path -LiteralPath (Join-Path $api "src/routes/onboarding-routes.ts")
}

Test-Gate "onboarding-store exports createOnboarding + advanceStep" {
  $c = Get-Content (Join-Path $api "src/config/onboarding-store.ts") -Raw
  ($c -match 'export\s+function\s+createOnboarding') -and ($c -match 'export\s+function\s+advanceStep')
}

Test-Gate "onboarding-routes has POST/GET/PATCH endpoints" {
  $c = Get-Content (Join-Path $api "src/routes/onboarding-routes.ts") -Raw
  ($c -match 'server\.post.*admin/onboarding') -and ($c -match 'server\.get.*admin/onboarding') -and ($c -match 'server\.patch.*admin/onboarding')
}

Test-Gate "Routes registered in register-routes.ts" {
  $c = Get-Content (Join-Path $api "src/server/register-routes.ts") -Raw
  $c -match 'onboardingRoutes'
}

Test-Gate "Wizard page exists" {
  Test-Path -LiteralPath (Join-Path $web "src/app/cprs/admin/onboarding/page.tsx")
}

Test-Gate "Admin layout has Onboarding nav" {
  $c = Get-Content (Join-Path $web "src/app/cprs/admin/layout.tsx") -Raw
  $c -match 'Onboarding'
}

Test-Gate "Steps cover tenant + vista-probe + modules + users + complete" {
  $c = Get-Content (Join-Path $api "src/config/onboarding-store.ts") -Raw
  ($c -match '"tenant"') -and ($c -match '"vista-probe"') -and ($c -match '"modules"') -and ($c -match '"users"') -and ($c -match '"complete"')
}

Test-Gate "TypeScript compiles" {
  Push-Location $root
  $out = pnpm --filter api build 2>&1 | Out-String
  Pop-Location
  $LASTEXITCODE -eq 0
}

Test-Gate "No console.log in new files" {
  $files = @(
    (Join-Path $api "src/config/onboarding-store.ts"),
    (Join-Path $api "src/routes/onboarding-routes.ts")
  )
  $found = $false
  foreach ($f in $files) {
    if (Select-String -Path $f -Pattern 'console\.(log|warn|error)' -Quiet) { $found = $true }
  }
  -not $found
}

Write-Host "`n--- Results: $pass PASS / $fail FAIL ---" -F $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) { exit 1 }
