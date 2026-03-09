# verify-admin-domains.ps1
# Comprehensive verification for all 12 VistA admin domains + provisioning
# Tests every API endpoint against the live VEHU sandbox

param(
  [switch]$SkipDocker,
  [switch]$SkipWrite,
  [string]$ApiBase = "http://127.0.0.1:3001"
)

$ErrorActionPreference = "Continue"
$pass = 0; $fail = 0; $warn = 0; $skip = 0

function Gate([string]$name, [scriptblock]$test) {
  try {
    $result = & $test
    if ($result -eq "PASS") {
      Write-Host "  [PASS] $name" -ForegroundColor Green
      $script:pass++
    } elseif ($result -eq "WARN") {
      Write-Host "  [WARN] $name" -ForegroundColor Yellow
      $script:warn++
    } elseif ($result -eq "SKIP") {
      Write-Host "  [SKIP] $name" -ForegroundColor Cyan
      $script:skip++
    } else {
      Write-Host "  [FAIL] $name -- $result" -ForegroundColor Red
      $script:fail++
    }
  } catch {
    Write-Host "  [FAIL] $name -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

Write-Host "`n=== VistA-Evolved Admin Domain Verification ===" -ForegroundColor Cyan
Write-Host "API: $ApiBase"
Write-Host "Date: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')`n"

# --- Gate 1: Docker + API reachable ---
Write-Host "--- Infrastructure ---" -ForegroundColor Cyan

if (-not $SkipDocker) {
  Gate "Docker containers running" {
    $out = docker ps --format "{{.Names}}" 2>$null
    if ($out -match "vehu") { "PASS" } else { "FAIL: vehu container not found" }
  }
}

Gate "API reachable" {
  try {
    $r = curl.exe -s "$ApiBase/vista/ping" 2>$null | ConvertFrom-Json
    if ($r.ok -eq $true) { "PASS" } else { "FAIL: ping not ok" }
  } catch { "FAIL: API not reachable" }
}

# --- Login ---
Write-Host "`n--- Authentication ---" -ForegroundColor Cyan

$cookieFile = Join-Path $env:TEMP "ve-admin-verify-cookies.txt"
$loginBody = Join-Path $env:TEMP "ve-admin-verify-login.json"
Set-Content -Path $loginBody -Value '{"accessCode":"PRO1234","verifyCode":"PRO1234!!"}' -NoNewline -Encoding ASCII

Gate "Login with PRO1234" {
  $r = curl.exe -s -c $cookieFile -X POST "$ApiBase/auth/login" -H "Content-Type: application/json" -d "@$loginBody" 2>$null | ConvertFrom-Json
  if ($r.ok -eq $true) { "PASS" } else { "FAIL: $($r.error)" }
}

function AdminGet([string]$path) {
  $raw = curl.exe -s -b $cookieFile "$ApiBase$path" 2>$null
  return ($raw | ConvertFrom-Json)
}

# --- Domain 1: Users ---
Write-Host "`n--- Domain 1: Users & Accounts ---" -ForegroundColor Cyan

Gate "GET /admin/vista/users" {
  $r = AdminGet "/admin/vista/users"
  if ($r.ok -and $r.data.Count -gt 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/users/87" {
  $r = AdminGet "/admin/vista/users/87"
  if ($r.ok -and $r.data) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/keys" {
  $r = AdminGet "/admin/vista/keys"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/menus?search=OR" {
  $r = AdminGet "/admin/vista/menus?search=OR"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 2: Facilities ---
Write-Host "`n--- Domain 2: Facilities ---" -ForegroundColor Cyan

Gate "GET /admin/vista/institutions" {
  $r = AdminGet "/admin/vista/institutions"
  if ($r.ok -and $r.data.Count -gt 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/divisions" {
  $r = AdminGet "/admin/vista/divisions"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/services" {
  $r = AdminGet "/admin/vista/services"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/stop-codes" {
  $r = AdminGet "/admin/vista/stop-codes"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/specialties" {
  $r = AdminGet "/admin/vista/specialties"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/site-parameters" {
  $r = AdminGet "/admin/vista/site-parameters"
  if ($r.ok -and $r.data) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 3: Clinics ---
Write-Host "`n--- Domain 3: Clinics ---" -ForegroundColor Cyan

Gate "GET /admin/vista/clinics" {
  $r = AdminGet "/admin/vista/clinics"
  if ($r.ok -and $r.data.Count -gt 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/appointment-types" {
  $r = AdminGet "/admin/vista/appointment-types"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 4: Wards ---
Write-Host "`n--- Domain 4: Wards & Beds ---" -ForegroundColor Cyan

Gate "GET /admin/vista/wards" {
  $r = AdminGet "/admin/vista/wards"
  if ($r.ok -and $r.data.Count -gt 0) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 5: Pharmacy ---
Write-Host "`n--- Domain 5: Pharmacy ---" -ForegroundColor Cyan

Gate "GET /admin/vista/drugs" {
  $r = AdminGet "/admin/vista/drugs"
  if ($r.ok -and $r.data.Count -gt 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/drug-classes" {
  $r = AdminGet "/admin/vista/drug-classes"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 6: Laboratory ---
Write-Host "`n--- Domain 6: Laboratory ---" -ForegroundColor Cyan

Gate "GET /admin/vista/lab-tests" {
  $r = AdminGet "/admin/vista/lab-tests"
  if ($r.ok -and $r.data.Count -gt 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/lab-locations" {
  $r = AdminGet "/admin/vista/lab-locations"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 7: Radiology ---
Write-Host "`n--- Domain 7: Radiology ---" -ForegroundColor Cyan

Gate "GET /admin/vista/radiology/procedures" {
  $r = AdminGet "/admin/vista/radiology/procedures"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/radiology/imaging-locations" {
  $r = AdminGet "/admin/vista/radiology/imaging-locations"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/radiology/division-params" {
  $r = AdminGet "/admin/vista/radiology/division-params"
  if ($r.ok) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 8: Billing ---
Write-Host "`n--- Domain 8: Billing & Insurance ---" -ForegroundColor Cyan

Gate "GET /admin/vista/insurance-companies" {
  $r = AdminGet "/admin/vista/insurance-companies"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/rate-types" {
  $r = AdminGet "/admin/vista/rate-types"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 9: Inventory ---
Write-Host "`n--- Domain 9: Inventory & Supply ---" -ForegroundColor Cyan

Gate "GET /admin/vista/inventory/items" {
  $r = AdminGet "/admin/vista/inventory/items"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/inventory/vendors" {
  $r = AdminGet "/admin/vista/inventory/vendors"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/inventory/purchase-orders" {
  $r = AdminGet "/admin/vista/inventory/purchase-orders"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 10: Workforce ---
Write-Host "`n--- Domain 10: Workforce ---" -ForegroundColor Cyan

Gate "GET /admin/vista/workforce/providers" {
  $r = AdminGet "/admin/vista/workforce/providers"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/workforce/person-classes" {
  $r = AdminGet "/admin/vista/workforce/person-classes"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 11: Quality ---
Write-Host "`n--- Domain 11: Quality & Compliance ---" -ForegroundColor Cyan

Gate "GET /admin/vista/quality/reminders" {
  $r = AdminGet "/admin/vista/quality/reminders"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/quality/qa-site-params" {
  $r = AdminGet "/admin/vista/quality/qa-site-params"
  if ($r.ok) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Domain 12: Clinical App Setup ---
Write-Host "`n--- Domain 12: Clinical Application Setup ---" -ForegroundColor Cyan

Gate "GET /admin/vista/clinical-setup/order-sets" {
  $r = AdminGet "/admin/vista/clinical-setup/order-sets"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/clinical-setup/consult-services" {
  $r = AdminGet "/admin/vista/clinical-setup/consult-services"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/clinical-setup/tiu-definitions" {
  $r = AdminGet "/admin/vista/clinical-setup/tiu-definitions"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/clinical-setup/tiu-templates" {
  $r = AdminGet "/admin/vista/clinical-setup/tiu-templates"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/clinical-setup/health-summary-types" {
  $r = AdminGet "/admin/vista/clinical-setup/health-summary-types"
  if ($r.ok -and $r.data.Count -ge 0) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- System Admin ---
Write-Host "`n--- System Administration ---" -ForegroundColor Cyan

Gate "GET /admin/vista/system/status" {
  $r = AdminGet "/admin/vista/system/status"
  if ($r.ok) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/system/taskman" {
  $r = AdminGet "/admin/vista/system/taskman"
  if ($r.ok) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/system/errors" {
  $r = AdminGet "/admin/vista/system/errors"
  if ($r.ok) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/vista/system/parameters" {
  $r = AdminGet "/admin/vista/system/parameters"
  if ($r.ok) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Dashboard ---
Write-Host "`n--- Operational Dashboard ---" -ForegroundColor Cyan

Gate "GET /admin/vista/dashboard/operational" {
  $r = AdminGet "/admin/vista/dashboard/operational"
  if ($r.ok -and $r.data) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- Provisioning ---
Write-Host "`n--- SaaS Provisioning ---" -ForegroundColor Cyan

Gate "GET /admin/provisioning/entity-types" {
  $r = AdminGet "/admin/provisioning/entity-types"
  if ($r.ok -and $r.entityTypes) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/provisioning/skus" {
  $r = AdminGet "/admin/provisioning/skus"
  if ($r.ok -and $r.skus) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/provisioning/tenants" {
  $r = AdminGet "/admin/provisioning/tenants"
  if ($r.ok) { "PASS" } else { "FAIL: $($r.error)" }
}
Gate "GET /admin/provisioning/country-configs" {
  $r = AdminGet "/admin/provisioning/country-configs"
  if ($r.ok -and $r.countries) { "PASS" } else { "FAIL: $($r.error)" }
}

# --- File structure checks ---
Write-Host "`n--- File Structure ---" -ForegroundColor Cyan

$mRoutines = @("ZVEUSER", "ZVEFAC", "ZVECLIN", "ZVEWARD", "ZVEPHAR", "ZVELAB", "ZVEBILL", "ZVESYS", "ZVERAD", "ZVEINV", "ZVEWRKF", "ZVEQUAL", "ZVECAPP", "ZVECTX")
foreach ($r in $mRoutines) {
  Gate "M routine $r.m exists" {
    if (Test-Path -LiteralPath "services\vista\$r.m") { "PASS" } else { "FAIL: not found" }
  }
}

$apiRoutes = @("vista-users", "vista-facilities", "vista-clinics", "vista-wards", "vista-pharmacy", "vista-lab", "vista-billing-config", "vista-system", "vista-radiology", "vista-inventory", "vista-workforce", "vista-quality", "vista-clinical-setup", "vista-dashboard", "provisioning")
foreach ($r in $apiRoutes) {
  Gate "API route $r.ts exists" {
    if (Test-Path -LiteralPath "apps\api\src\routes\admin\$r.ts") { "PASS" } else { "FAIL: not found" }
  }
}

$uiPages = @("users", "facilities", "clinics", "wards", "pharmacy", "lab", "billing", "system", "radiology", "inventory", "workforce", "quality", "clinical-setup", "dashboard")
foreach ($p in $uiPages) {
  Gate "UI page vista/$p/page.tsx exists" {
    if (Test-Path -LiteralPath "apps\web\src\app\cprs\admin\vista\$p\page.tsx") { "PASS" } else { "FAIL: not found" }
  }
}

# --- Cleanup ---
Remove-Item $cookieFile, $loginBody -ErrorAction SilentlyContinue

# --- Summary ---
Write-Host "`n=== RESULTS ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor Yellow
Write-Host "  SKIP: $skip" -ForegroundColor Cyan
$total = $pass + $fail + $warn + $skip
Write-Host "  TOTAL: $total"

if ($fail -eq 0) {
  Write-Host "`nAll gates passed!" -ForegroundColor Green
  exit 0
} else {
  Write-Host "`n$fail gate(s) failed." -ForegroundColor Red
  exit 1
}
