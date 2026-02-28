<#
  Phase 246 -- Pilot Hospital Hardening  (Wave 6 P9)
  10 gates
#>
param([switch]$Verbose)
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0
$root = Split-Path -Parent $PSScriptRoot
$api  = Join-Path (Join-Path $root "apps") "api"
$web  = Join-Path (Join-Path $root "apps") "web"

function Test-Gate([string]$name, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) { Write-Host "  PASS  $name" -ForegroundColor Green; $script:pass++ }
    else         { Write-Host "  FAIL  $name" -ForegroundColor Red;   $script:fail++ }
  } catch       { Write-Host "  FAIL  $name ($_)" -ForegroundColor Red; $script:fail++ }
}

Write-Host "`n=== Phase 246: Pilot Hospital Hardening ===" -ForegroundColor Cyan

# Gate 1: site-config.ts exists with SiteConfig type
Test-Gate "site-config.ts exists with SiteConfig" {
  $f = Join-Path $api "src\pilot\site-config.ts"
  (Test-Path -LiteralPath $f) -and (Select-String -Path $f -Pattern "SiteConfig" -Quiet)
}

# Gate 2: preflight.ts exists with runPreflightChecks
Test-Gate "preflight.ts exists with runPreflightChecks" {
  $f = Join-Path $api "src\pilot\preflight.ts"
  (Test-Path -LiteralPath $f) -and (Select-String -Path $f -Pattern "runPreflightChecks" -Quiet)
}

# Gate 3: pilot-routes.ts exists with GET and POST handlers
Test-Gate "pilot-routes.ts exists with route handlers" {
  $f = Join-Path $api "src\routes\pilot-routes.ts"
  (Test-Path -LiteralPath $f) -and
    (Select-String -Path $f -Pattern "server\.get" -Quiet) -and
    (Select-String -Path $f -Pattern "server\.post" -Quiet)
}

# Gate 4: pilotRoutes registered in register-routes.ts
Test-Gate "pilotRoutes registered in register-routes.ts" {
  $f = Join-Path $api "src\server\register-routes.ts"
  (Select-String -Path $f -Pattern "pilotRoutes" -Quiet)
}

# Gate 5: Pilot admin page exists
Test-Gate "Pilot admin page.tsx exists" {
  $f = Join-Path $web "src\app\cprs\admin\pilot\page.tsx"
  Test-Path -LiteralPath $f
}

# Gate 6: Admin layout has Pilot nav item
Test-Gate "Admin layout has Pilot nav" {
  $f = Join-Path $web "src\app\cprs\admin\layout.tsx"
  (Select-String -Path $f -Pattern "Pilot" -Quiet)
}

# Gate 7: SiteStatus includes go-live
Test-Gate "SiteStatus includes go-live" {
  $f = Join-Path $api "src\pilot\site-config.ts"
  (Select-String -Path $f -Pattern "go-live" -Quiet)
}

# Gate 8: Preflight has 12 checks
Test-Gate "Preflight has 12 checks" {
  $f = Join-Path $api "src\pilot\preflight.ts"
  $m = Select-String -Path $f -Pattern "makeCheck\(" -AllMatches
  $count = 0; foreach ($line in $m) { $count += $line.Matches.Count }
  $count -ge 12
}

# Gate 9: TypeScript compiles
Test-Gate "TypeScript compiles" {
  Push-Location $api
  $out = pnpm build 2>&1
  Pop-Location
  $LASTEXITCODE -eq 0
}

# Gate 10: No console.log in pilot source
Test-Gate "No console.log in pilot source" {
  $dir = Join-Path $api "src\pilot"
  if (-not (Test-Path -LiteralPath $dir)) { $true; return }
  $files = Get-ChildItem -LiteralPath $dir -Filter "*.ts" -Recurse -ErrorAction SilentlyContinue
  if (-not $files) { $true; return }
  $found = $false
  foreach ($file in $files) {
    if (Select-String -LiteralPath $file.FullName -Pattern "console\.log" -Quiet) { $found = $true }
  }
  -not $found
}

Write-Host "`n--- Results: $pass PASS / $fail FAIL ---" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Red' })
exit $fail
