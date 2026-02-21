<# Phase 71 - Interop Monitor v2 Verification
   Checks that all interop RPCs are grounded to real VistA globals,
   capabilities are aligned, and no fake counts exist. #>
param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0
$RepoRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)

function Gate([string]$name, [bool]$ok) {
    $script:total++
    if ($ok) { $script:pass++; Write-Host "  PASS  $name" -ForegroundColor Green }
    else     { $script:fail++; Write-Host "  FAIL  $name" -ForegroundColor Red   }
}

Write-Host "`n=== Phase 71 -- Interop Monitor v2 Verification ===" -ForegroundColor Cyan

# --- M Routine checks ---
Write-Host "`n-- ZVEMIOP.m (6 RPCs) --" -ForegroundColor Yellow
$zvemiop = Get-Content (Join-Path $RepoRoot "services\vista\ZVEMIOP.m") -Raw
Gate "ZVEMIOP has LINKS entry" ($zvemiop -match "(?m)^LINKS\(")
Gate "ZVEMIOP has MSGS entry" ($zvemiop -match "(?m)^MSGS\(")
Gate "ZVEMIOP has HLOSTAT entry" ($zvemiop -match "(?m)^HLOSTAT\(")
Gate "ZVEMIOP has QLENGTH entry" ($zvemiop -match "(?m)^QLENGTH\(")
Gate "ZVEMIOP has MSGLIST entry" ($zvemiop -match "(?m)^MSGLIST\(")
Gate "ZVEMIOP has MSGDETL entry" ($zvemiop -match "(?m)^MSGDETL\(")
Gate "ZVEMIOP reads ^HLCS(870)" ($zvemiop -match "\^HLCS\(870")
Gate "ZVEMIOP reads ^HLMA" ($zvemiop -match "\^HLMA")
Gate "ZVEMIOP reads ^HLD(779" ($zvemiop -match "\^HLD\(779")
Gate "ZVEMIOP reads ^HL(772)" ($zvemiop -match "\^HL\(772")

Write-Host "`n-- VEMCTX3.m (context registration) --" -ForegroundColor Yellow
$vemctx3 = Get-Content (Join-Path $RepoRoot "services\vista\VEMCTX3.m") -Raw
Gate "VEMCTX3 includes MSG LIST" ($vemctx3 -match "VE INTEROP MSG LIST")
Gate "VEMCTX3 includes MSG DETAIL" ($vemctx3 -match "VE INTEROP MSG DETAIL")
Gate "VEMCTX3 loops 6 RPCs" ($vemctx3 -match "F I=1:1:6")

Write-Host "`n-- install-interop-rpcs.ps1 --" -ForegroundColor Yellow
$installer = Get-Content (Join-Path $RepoRoot "scripts\install-interop-rpcs.ps1") -Raw
Gate "Installer copies VEMCTX3.m" ($installer -match "VEMCTX3\.m")
Gate "Installer runs VEMCTX3" ($installer -match "mumps -run VEMCTX3")

# --- capabilities.json ---
Write-Host "`n-- capabilities.json --" -ForegroundColor Yellow
$caps = Get-Content (Join-Path $RepoRoot "config\capabilities.json") -Raw
Gate "No VEMHL typo" (-not ($caps -match "VEMHL LINKS"))
Gate "Has interop.hl7.monitor" ($caps -match '"interop\.hl7\.monitor"')
Gate "Has interop.hl7.read" ($caps -match '"interop\.hl7\.read"')
Gate "Has interop.hlo.read" ($caps -match '"interop\.hlo\.read"')
Gate "Has interop.queue.read" ($caps -match '"interop\.queue\.read"')
Gate "Has interop.msg.list" ($caps -match '"interop\.msg\.list"')
Gate "Has interop.msg.detail" ($caps -match '"interop\.msg\.detail"')
Gate "hl7.monitor targetRpc correct" ($caps -match '"VE INTEROP HL7 LINKS"')

# --- actionRegistry.ts ---
Write-Host "`n-- actionRegistry.ts --" -ForegroundColor Yellow
$actions = Get-Content (Join-Path $RepoRoot "apps\web\src\actions\actionRegistry.ts") -Raw
Gate "Has interop.hl7-links action" ($actions -match '"interop\.hl7-links"')
Gate "Has interop.hl7-msgs action" ($actions -match '"interop\.hl7-msgs"')
Gate "Has interop.hlo-status action" ($actions -match '"interop\.hlo-status"')
Gate "Has interop.queue-depth action" ($actions -match '"interop\.queue-depth"')
Gate "Has interop.msg-list action" ($actions -match '"interop\.msg-list"')
Gate "Has interop.msg-detail action" ($actions -match '"interop\.msg-detail"')
Gate "All 6 interop actions wired" (([regex]::Matches($actions, '"interop\.')).Count -ge 6)

# --- API routes (no fake counts) ---
Write-Host "`n-- vista-interop.ts (no fake counts) --" -ForegroundColor Yellow
$interopTs = Get-Content (Join-Path $RepoRoot "apps\api\src\routes\vista-interop.ts") -Raw
Gate "No hardcoded fake queue counts" (-not ($interopTs -match "pending:\s*\d{2,}|error:\s*\d{2,}"))
Gate "Uses cachedRpc or resilientRpc" ($interopTs -match "cachedRpc|resilientRpc")
Gate "Uses VE INTEROP HL7 LINKS RPC" ($interopTs -match "VE INTEROP HL7 LINKS")
Gate "Uses VE INTEROP HLO STATUS RPC" ($interopTs -match "VE INTEROP HLO STATUS")
Gate "Uses VE INTEROP MSG LIST RPC" ($interopTs -match "VE INTEROP MSG LIST")
Gate "Uses VE INTEROP MSG DETAIL RPC" ($interopTs -match "VE INTEROP MSG DETAIL")

# --- TypeScript compile check ---
Write-Host "`n-- TypeScript compile --" -ForegroundColor Yellow
Push-Location (Join-Path $RepoRoot "apps\web")
$tscWeb = & pnpm exec tsc --noEmit 2>&1
$webOk = $LASTEXITCODE -eq 0
Gate "apps/web TSC clean" $webOk
if (-not $webOk) { $tscWeb | Select-Object -First 10 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkRed } }
Pop-Location

# --- Summary ---
Write-Host "`n=== Phase 71 Results: $pass/$total passed ===" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })
if ($fail -gt 0) { exit 1 }
