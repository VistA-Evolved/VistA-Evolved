# Phase 86 -- Shift Handoff + Signout Verifier
# Usage: .\scripts\verify-phase86-shift-handoff.ps1

param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $total = 0

function Gate([string]$name, [scriptblock]$test) {
  $script:total++
  try {
    $result = & $test
    if ($result) {
      Write-Host "  PASS  $name" -ForegroundColor Green
      $script:pass++
    } else {
      Write-Host "  FAIL  $name" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  FAIL  $name ($_)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== Phase 86: Shift Handoff + Signout Verifier ===" -ForegroundColor Cyan
Write-Host ""

# ---- Section 1: File existence ----
Write-Host "--- Section 1: File Existence ---" -ForegroundColor Yellow

Gate "Handoff store file exists" {
  Test-Path -LiteralPath "apps/api/src/routes/handoff/handoff-store.ts"
}

Gate "API route file exists" {
  Test-Path -LiteralPath "apps/api/src/routes/handoff/index.ts"
}

Gate "Web page exists" {
  Test-Path -LiteralPath "apps/web/src/app/cprs/handoff/page.tsx"
}

Gate "Runbook exists" {
  Test-Path -LiteralPath "docs/runbooks/phase86-shift-handoff.md"
}

Gate "Grounding doc exists" {
  Test-Path -LiteralPath "docs/runbooks/handoff-grounding.md"
}

Gate "Prompt file exists" {
  Test-Path -LiteralPath "prompts/91-PHASE-86-SHIFT-HANDOFF/91-01-IMPLEMENT.md"
}

# ---- Section 2: Handoff Store Content ----
Write-Host "`n--- Section 2: Handoff Store ---" -ForegroundColor Yellow

$store = Get-Content "apps/api/src/routes/handoff/handoff-store.ts" -Raw -ErrorAction SilentlyContinue

Gate "Store has SbarNote type" {
  $store -match 'SbarNote'
}

Gate "Store has TodoItem type" {
  $store -match 'TodoItem'
}

Gate "Store has RiskFlag type" {
  $store -match 'RiskFlag'
}

Gate "Store has HandoffReport type" {
  $store -match 'HandoffReport'
}

Gate "Store has draft -> submitted -> accepted -> archived lifecycle" {
  ($store -match 'draft') -and ($store -match 'submitted') -and ($store -match 'accepted') -and ($store -match 'archived')
}

Gate "Store has createHandoffReport function" {
  $store -match 'createHandoffReport'
}

Gate "Store has submitHandoffReport function" {
  $store -match 'submitHandoffReport'
}

Gate "Store has acceptHandoffReport function" {
  $store -match 'acceptHandoffReport'
}

Gate "Store has archiveHandoffReport function" {
  $store -match 'archiveHandoffReport'
}

Gate "Store has CRHD migration documentation" {
  $store -match 'CRHD'
}

Gate "Store uses Map for in-memory storage" {
  $store -match 'Map<'
}

# ---- Section 3: API Route Content ----
Write-Host "`n--- Section 3: API Route Content ---" -ForegroundColor Yellow

$route = Get-Content "apps/api/src/routes/handoff/index.ts" -Raw -ErrorAction SilentlyContinue

Gate "Route has GET /handoff/ward-patients" {
  $route -match '/handoff/ward-patients'
}

Gate "Route has GET /handoff/reports" {
  $route -match "GET.*handoff/reports|/handoff/reports.*GET"
}

Gate "Route has POST /handoff/reports" {
  $route -match "POST.*handoff/reports|/handoff/reports.*POST"
}

Gate "Route has PUT /handoff/reports/:id" {
  $route -match '/handoff/reports/:id'
}

Gate "Route has submit endpoint" {
  $route -match '/handoff/reports/:id/submit'
}

Gate "Route has accept endpoint" {
  $route -match '/handoff/reports/:id/accept'
}

Gate "Route has archive endpoint" {
  $route -match '/handoff/reports/:id/archive'
}

Gate "Route uses ORQPT WARD PATIENTS RPC" {
  $route -match 'ORQPT WARD PATIENTS'
}

Gate "Route uses ORWPS ACTIVE RPC" {
  $route -match 'ORWPS ACTIVE'
}

Gate "Route uses ORQQAL LIST RPC" {
  $route -match 'ORQQAL LIST'
}

Gate "Route uses safeCallRpc (not raw callRpc)" {
  $route -match 'safeCallRpc'
}

Gate "Route uses requireSession" {
  $route -match 'requireSession'
}

Gate "Route has pendingTargets in responses" {
  $route -match 'pendingTargets'
}

Gate "Route has vistaGrounding in responses" {
  $route -match 'vistaGrounding'
}

Gate "Route has CRHD migration targets" {
  $route -match 'CRHD_MIGRATION_TARGETS'
}

Gate "Route has audit logging" {
  $route -match 'audit\('
}

Gate "Route exports default async function" {
  $route -match 'export default async function'
}

# ---- Section 4: Web Page Content ----
Write-Host "`n--- Section 4: Web Page Content ---" -ForegroundColor Yellow

$page = Get-Content "apps/web/src/app/cprs/handoff/page.tsx" -Raw -ErrorAction SilentlyContinue

Gate "Page is client component" {
  $page -match "'use client'"
}

Gate "Page has Suspense boundary" {
  $page -match 'Suspense'
}

Gate "Page has Active tab" {
  $page -match '[Aa]ctive'
}

Gate "Page has Create tab" {
  $page -match '[Cc]reate'
}

Gate "Page has Accept tab" {
  $page -match '[Aa]ccept'
}

Gate "Page has Archive tab" {
  $page -match '[Aa]rchive'
}

Gate "Page has SBAR form fields" {
  ($page -match '[Ss]ituation') -and ($page -match '[Bb]ackground') -and ($page -match '[Aa]ssessment') -and ($page -match '[Rr]ecommendation')
}

Gate "Page has risk flags" {
  $page -match '[Rr]isk.*[Ff]lag'
}

Gate "Page has todo items" {
  $page -match '[Tt]odo'
}

Gate "Page has ward selector" {
  $page -match '[Ww]ard'
}

Gate "Page fetches /handoff/ward-patients" {
  $page -match '/handoff/ward-patients'
}

Gate "Page fetches /handoff/reports" {
  $page -match '/handoff/reports'
}

Gate "Page has credentials include" {
  $page -match "credentials.*include"
}

Gate "Page has Back to Inpatient nav" {
  $page -match 'Back to Inpatient'
}

Gate "Page has ARIA roles" {
  ($page -match 'role=') -or ($page -match 'aria-')
}

Gate "Page uses useSearchParams" {
  $page -match 'useSearchParams'
}

Gate "Page has local-store or integration-pending banner" {
  ($page -match '[Ll]ocal.*[Ss]tore') -or ($page -match 'integration-pending') -or ($page -match 'StorageBanner')
}

# ---- Section 5: Integration Points ----
Write-Host "`n--- Section 5: Integration Points ---" -ForegroundColor Yellow

$indexTs = Get-Content "apps/api/src/index.ts" -Raw -ErrorAction SilentlyContinue

Gate "index.ts imports handoffRoutes" {
  $indexTs -match 'import handoffRoutes'
}

Gate "index.ts registers handoffRoutes" {
  $indexTs -match 'server.register\(handoffRoutes\)'
}

$securityTs = Get-Content "apps/api/src/middleware/security.ts" -Raw -ErrorAction SilentlyContinue

Gate "AUTH_RULES has /handoff/ pattern" {
  $securityTs -match 'handoff'
}

$auditTs = Get-Content "apps/api/src/lib/audit.ts" -Raw -ErrorAction SilentlyContinue

Gate "Audit has clinical.handoff-create action" {
  $auditTs -match 'clinical\.handoff-create'
}

Gate "Audit has clinical.handoff-accept action" {
  $auditTs -match 'clinical\.handoff-accept'
}

Gate "Audit has clinical.handoff-view action" {
  $auditTs -match 'clinical\.handoff-view'
}

$menuBar = Get-Content "apps/web/src/components/cprs/CPRSMenuBar.tsx" -Raw -ErrorAction SilentlyContinue

Gate "CPRSMenuBar has Shift Handoff menu item" {
  $menuBar -match 'Shift Handoff'
}

Gate "CPRSMenuBar has handoff action handler" {
  $menuBar -match "action === 'handoff'"
}

Gate "CPRSMenuBar routes to /cprs/handoff" {
  $menuBar -match '/cprs/handoff'
}

# ---- Section 6: Anti-Pattern Checks ----
Write-Host "`n--- Section 6: Anti-Pattern Checks ---" -ForegroundColor Yellow

Gate "No console.log in handoff routes" {
  -not ($route -match 'console\.log')
}

Gate "No hardcoded credentials in handoff routes" {
  -not ($route -match 'PROV123|PHARM123|NURSE123')
}

Gate "No console.log in handoff page" {
  -not ($page -match 'console\.log')
}

Gate "No hardcoded credentials in handoff page" {
  -not ($page -match 'PROV123|PHARM123|NURSE123')
}

Gate "No console.log in handoff store" {
  -not ($store -match 'console\.log')
}

# ---- Summary ----
Write-Host "`n=== Phase 86 Shift Handoff + Signout Verifier Results ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass / $total" -ForegroundColor $(if ($pass -eq $total) { "Green" } else { "Yellow" })
Write-Host "  FAIL: $fail / $total" -ForegroundColor $(if ($fail -eq 0) { "Green" } else { "Red" })

if ($fail -eq 0) {
  Write-Host "`n  ALL GATES PASSED" -ForegroundColor Green
} else {
  Write-Host "`n  $fail GATE(S) FAILED -- review above" -ForegroundColor Red
}

exit $fail
