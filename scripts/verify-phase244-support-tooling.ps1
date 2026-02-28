<# Phase 244 -- Support Tooling (Wave 6 P7) #>
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0
function Test-Gate([string]$name, [scriptblock]$test) {
  try { $r = & $test; if ($r) { Write-Host "  PASS  $name" -F Green; $script:pass++ } else { Write-Host "  FAIL  $name" -F Red; $script:fail++ } }
  catch { Write-Host "  FAIL  $name -- $_" -F Red; $script:fail++ }
}

$root = Split-Path -Parent $PSScriptRoot
$api = Join-Path (Join-Path $root "apps") "api"
$web = Join-Path (Join-Path $root "apps") "web"

Write-Host "`n=== Phase 244: Support Tooling ===`n" -F Cyan

Test-Gate "diagnostics.ts exists" {
  Test-Path -LiteralPath (Join-Path $api "src/support/diagnostics.ts")
}

Test-Gate "ticket-store.ts exists" {
  Test-Path -LiteralPath (Join-Path $api "src/support/ticket-store.ts")
}

Test-Gate "support-routes.ts exists" {
  Test-Path -LiteralPath (Join-Path $api "src/routes/support-routes.ts")
}

Test-Gate "diagnostics exports collectDiagnostics" {
  $c = Get-Content (Join-Path $api "src/support/diagnostics.ts") -Raw
  $c -match 'export\s+async\s+function\s+collectDiagnostics'
}

Test-Gate "ticket-store exports createTicket + getTicket + listTickets" {
  $c = Get-Content (Join-Path $api "src/support/ticket-store.ts") -Raw
  ($c -match 'export\s+function\s+createTicket') -and ($c -match 'export\s+function\s+getTicket') -and ($c -match 'export\s+function\s+listTickets')
}

Test-Gate "support-routes has GET/POST endpoints" {
  $c = Get-Content (Join-Path $api "src/routes/support-routes.ts") -Raw
  ($c -match 'server\.get.*admin/support') -and ($c -match 'server\.post.*admin/support')
}

Test-Gate "Routes registered in register-routes.ts" {
  $c = Get-Content (Join-Path $api "src/server/register-routes.ts") -Raw
  $c -match 'supportRoutes'
}

Test-Gate "Support page exists" {
  Test-Path -LiteralPath (Join-Path $web "src/app/cprs/admin/support/page.tsx")
}

Test-Gate "TypeScript compiles" {
  Push-Location $root
  $out = pnpm --filter api build 2>&1 | Out-String
  Pop-Location
  $LASTEXITCODE -eq 0
}

Test-Gate "No console.log in new files" {
  $files = @(
    (Join-Path $api "src/support/diagnostics.ts"),
    (Join-Path $api "src/support/ticket-store.ts"),
    (Join-Path $api "src/routes/support-routes.ts")
  )
  $found = $false
  foreach ($f in $files) {
    if (Select-String -Path $f -Pattern 'console\.(log|warn|error)' -Quiet) { $found = $true }
  }
  -not $found
}

Write-Host "`n--- Results: $pass PASS / $fail FAIL ---" -F $(if ($fail -eq 0) { 'Green' } else { 'Red' })
if ($fail -gt 0) { exit 1 }
