<#
.SYNOPSIS
  Phase 21 verifier — VistA HL7/HLO Interop Telemetry (hardened)
.DESCRIPTION
  Checks all Phase 21 deliverables: interop routes with cachedRpc/circuit breaker,
  Zod validation, role gating, graceful shutdown disconnect, AUTH_RULES update,
  plus regression checks for TypeScript compilation and prior phase gates.
#>

param([switch]$SkipDocker)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0
$repoRoot = Split-Path $PSScriptRoot -Parent

function Assert-Check {
  param([string]$Label, [bool]$Condition)
  if ($Condition) { Write-Host "  PASS  $Label" -ForegroundColor Green; $script:pass++ }
  else           { Write-Host "  FAIL  $Label" -ForegroundColor Red;   $script:fail++ }
}

function Assert-Warn {
  param([string]$Label, [bool]$Condition)
  if ($Condition) { Write-Host "  PASS  $Label" -ForegroundColor Green; $script:pass++ }
  else           { Write-Host "  WARN  $Label" -ForegroundColor Yellow; $script:warn++ }
}

Write-Host "`n=== Phase 21: VistA HL7/HLO Interop Telemetry (Hardened) Verifier ===" -ForegroundColor Cyan
Write-Host ""

# ─── Section A: Route file structure ────────────────────────────────

Write-Host "--- A: Interop route file structure ---" -ForegroundColor White

$interopFile = "$repoRoot\apps\api\src\routes\vista-interop.ts"
Assert-Check "vista-interop.ts exists" (Test-Path $interopFile)

$interopSrc = if (Test-Path $interopFile) { Get-Content $interopFile -Raw } else { "" }

Assert-Check "Imports cachedRpc from rpc-resilience" ($interopSrc -match "cachedRpc.*rpc-resilience")
Assert-Check "Imports CircuitOpenError from rpc-resilience" ($interopSrc -match "CircuitOpenError.*rpc-resilience")
Assert-Check "Imports RpcTimeoutError from rpc-resilience" ($interopSrc -match "RpcTimeoutError.*rpc-resilience")
Assert-Check "Imports requireRole from auth-routes" ($interopSrc -match "requireRole.*auth-routes")
Assert-Check "Imports zod (z)" ($interopSrc -match "import.*z.*from.*zod")
Assert-Check "Imports validate from validation" ($interopSrc -match "validate.*validation")
Assert-Check "INTEROP_CACHE_TTL_MS defined" ($interopSrc -match "INTEROP_CACHE_TTL_MS")
Assert-Check "INTEROP_CACHE_TTL_MS env-configurable" ($interopSrc -match "process\.env\.INTEROP_CACHE_TTL_MS")

Write-Host ""

# ─── Section B: Zod query schemas ───────────────────────────────────

Write-Host "--- B: Zod query validation ---" -ForegroundColor White

Assert-Check "Hl7LinksQuerySchema defined" ($interopSrc -match "Hl7LinksQuerySchema")
Assert-Check "Hl7MessagesQuerySchema defined" ($interopSrc -match "Hl7MessagesQuerySchema")
Assert-Check "validate() called for links query" ($interopSrc -match "validate\(Hl7LinksQuerySchema")
Assert-Check "validate() called for messages query" ($interopSrc -match "validate\(Hl7MessagesQuerySchema")
Assert-Check "No untyped (request.query as any)" (-not ($interopSrc -match "request\.query as any"))

Write-Host ""

# ─── Section C: Circuit breaker + caching ───────────────────────────

Write-Host "--- C: Circuit breaker + response caching ---" -ForegroundColor White

Assert-Check "callInteropRpcCached helper defined" ($interopSrc -match "callInteropRpcCached")
Assert-Check "Uses cachedRpc() wrapper" ($interopSrc -match "return cachedRpc\(")
Assert-Check "handleRpcError helper defined" ($interopSrc -match "function handleRpcError")
Assert-Check "503 for CircuitOpenError" ($interopSrc -match "503")
Assert-Check "504 for RpcTimeoutError" ($interopSrc -match "504")
Assert-Check "502 for generic RPC failure" ($interopSrc -match "502")
Assert-Check "No raw callInteropRpc (old helper removed)" (-not ($interopSrc -match "function callInteropRpc\b[^C]"))

Write-Host ""

# ─── Section D: Role gating ─────────────────────────────────────────

Write-Host "--- D: Admin/provider role gating ---" -ForegroundColor White

# Count requireRole calls — should be 5 (one per handler)
$roleCallCount = ([regex]::Matches($interopSrc, "requireRole\(session")).Count
Assert-Check "requireRole called in all 5 handlers (count=$roleCallCount)" ($roleCallCount -ge 5)
Assert-Check "Role includes admin" ($interopSrc -match 'requireRole\(session,\s*\["admin"')
Assert-Check "Role includes provider" ($interopSrc -match '"provider"')

Write-Host ""

# ─── Section E: Security middleware ─────────────────────────────────

Write-Host "--- E: Security middleware (AUTH_RULES + shutdown) ---" -ForegroundColor White

$securityFile = "$repoRoot\apps\api\src\middleware\security.ts"
$secSrc = if (Test-Path $securityFile) { Get-Content $securityFile -Raw } else { "" }

Assert-Check "AUTH_RULES has /vista/interop/ admin rule" ($secSrc -match 'vista\\/interop\\/.*admin')
Assert-Check "Interop rule before generic /vista/ rule" ($secSrc -match 'interop.*\n.*\{ pattern.*vista\\/.*session')
Assert-Check "Imports disconnect from rpcBrokerClient" ($secSrc -match "disconnect.*rpcBrokerClient")
Assert-Check "Graceful shutdown calls disconnect" ($secSrc -match "disconnectRpcBroker\(\)")

Write-Host ""

# ─── Section F: TypeScript compilation ──────────────────────────────

Write-Host "--- F: TypeScript compilation ---" -ForegroundColor White

Push-Location $repoRoot
$apiTsc = & pnpm -C apps/api exec tsc --noEmit 2>&1
$apiOk = $LASTEXITCODE -eq 0
Assert-Check "API TypeScript compiles (exit $LASTEXITCODE)" $apiOk

$webTsc = & pnpm -C apps/web exec tsc --noEmit 2>&1
$webOk = $LASTEXITCODE -eq 0
Assert-Check "Web TypeScript compiles (exit $LASTEXITCODE)" $webOk
Pop-Location

Write-Host ""

# ─── Section G: M Routine + RPC registration (Docker) ──────────────

Write-Host "--- G: VistA Docker gates (M routine + RPCs) ---" -ForegroundColor White

if ($SkipDocker) {
  Write-Host "  SKIP  Docker gates (--SkipDocker)" -ForegroundColor Yellow
  $warn += 4
} else {
  # G0: M routine installed
  $mCheck = docker exec wv mumps -run %XCMD 'D LINKS^ZVEMIOP(.R,20) W $O(R(""))' 2>&1
  Assert-Warn "G0: ZVEMIOP M routine responds" ($mCheck -match "1")

  # G1: RPCs registered
  $rpcCheck = docker exec wv mumps -run %XCMD 'S X="" F  S X=$O(^DIC(8994,"B",X)) Q:X=""  I X["VE INTEROP" W X,!' 2>&1
  $rpcStr = $rpcCheck -join " "
  Assert-Warn "G1: VE INTEROP HL7 LINKS registered" ($rpcStr -match "VE INTEROP HL7 LINKS")
  Assert-Warn "G1: VE INTEROP HL7 MSGS registered" ($rpcStr -match "VE INTEROP HL7 MSGS")
  Assert-Warn "G1: VE INTEROP HLO STATUS registered" ($rpcStr -match "VE INTEROP HLO STATUS")
  Assert-Warn "G1: VE INTEROP QUEUE DEPTH registered" ($rpcStr -match "VE INTEROP QUEUE DEPTH")
}

Write-Host ""

# ─── Section H: Regression gates ────────────────────────────────────

Write-Host "--- H: Regression gates ---" -ForegroundColor White

Assert-Check "EADDRINUSE handling in index.ts" ((Get-Content "$repoRoot\apps\api\src\index.ts" -Raw) -match "EADDRINUSE")
Assert-Check "CI verify.yml exists" (Test-Path "$repoRoot\.github\workflows\verify.yml")
Assert-Warn "Interop tab in UI" ((Get-Content "$repoRoot\apps\web\src\app\cprs\admin\integrations\page.tsx" -Raw) -match "hl7hlo")
Assert-Check "rpc-resilience.ts exists" (Test-Path "$repoRoot\apps\api\src\lib\rpc-resilience.ts")

Write-Host ""

# ─── Summary ────────────────────────────────────────────────────────

Write-Host "=== Phase 21 Verifier Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($warn -gt 0) { Write-Host "  WARN: $warn" -ForegroundColor Yellow }
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red }
Write-Host ""

if ($fail -gt 0) {
  Write-Host "RESULT: FAIL ($fail gate(s) failed)" -ForegroundColor Red
  exit 1
} elseif ($warn -gt 0) {
  Write-Host "RESULT: PASS with warnings ($warn)" -ForegroundColor Yellow
  exit 0
} else {
  Write-Host "RESULT: ALL GATES PASS" -ForegroundColor Green
  exit 0
}
