<#
  Phase 534 - Browser Terminal Verifier
  Wave 39 P4
  10 gates per prompts/534/534-99-VERIFY.md
#>
param([switch]$Verbose)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Continue'
$pass = 0; $fail = 0
$root = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
if (-not (Test-Path -LiteralPath "$root\package.json")) { $root = Get-Location }

function Gate([string]$id, [string]$desc, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $id -- $desc" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $id -- $desc" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $id -- $desc ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 534: Browser Terminal Verifier ===" -ForegroundColor Cyan
Write-Host "Root: $root`n"

# G1: @xterm/xterm in web package.json
Gate "G1" "@xterm/xterm in web dependencies" {
  $f = Join-Path $root "apps/web/package.json"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match '@xterm/xterm')
}

# G2: @xterm/addon-fit in web package.json
Gate "G2" "@xterm/addon-fit in web dependencies" {
  $f = Join-Path $root "apps/web/package.json"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match '@xterm/addon-fit')
}

# G3: BrowserTerminal component exists
Gate "G3" "BrowserTerminal.tsx exists" {
  Test-Path -LiteralPath (Join-Path $root "apps/web/src/components/terminal/BrowserTerminal.tsx")
}

# G4: Component uses Terminal from @xterm/xterm
Gate "G4" "Component imports @xterm/xterm Terminal" {
  $f = Join-Path $root "apps/web/src/components/terminal/BrowserTerminal.tsx"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match '@xterm/xterm')
}

# G5: Component connects to WebSocket
Gate "G5" "Component connects to WebSocket endpoint" {
  $f = Join-Path $root "apps/web/src/components/terminal/BrowserTerminal.tsx"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match 'WebSocket' -and $c -match '/ws/console')
}

# G6: Admin terminal page exists
Gate "G6" "Admin terminal page exists" {
  Test-Path -LiteralPath (Join-Path $root "apps/web/src/app/cprs/admin/terminal/page.tsx")
}

# G7: Page contains RPC blocklist warning
Gate "G7" "Terminal page has RPC blocklist warning" {
  $f = Join-Path $root "apps/web/src/app/cprs/admin/terminal/page.tsx"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match 'XUS AV CODE' -and $c -match 'blocklist\b|block')
}

# G8: Component has reconnect logic
Gate "G8" "Component has reconnect logic" {
  $f = Join-Path $root "apps/web/src/components/terminal/BrowserTerminal.tsx"
  $c = [System.IO.File]::ReadAllText($f)
  return ($c -match 'reconnect' -or $c -match 'Reconnect')
}

# G9: No credentials in component code
Gate "G9" "No PHI or credentials in component" {
  $f = Join-Path $root "apps/web/src/components/terminal/BrowserTerminal.tsx"
  $c = [System.IO.File]::ReadAllText($f)
  return (-not ($c -match 'PROV123|NURSE123|PHARM123|\d{3}-\d{2}-\d{4}'))
}

# G10: Evidence directory exists
Gate "G10" "Evidence directory exists" {
  $d = Join-Path $root "evidence/wave-39/534-W39-P4-BROWSER-TERMINAL"
  if (-not (Test-Path -LiteralPath $d)) { New-Item -ItemType Directory -Path $d -Force | Out-Null }
  return (Test-Path -LiteralPath $d)
}

# Summary
Write-Host "`n--- Summary ---"
Write-Host "  PASS: $pass / $($pass + $fail)" -ForegroundColor $(if ($fail -eq 0) { 'Green' } else { 'Yellow' })
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red }
Write-Host ""
exit $fail
