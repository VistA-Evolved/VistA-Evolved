<#
.SYNOPSIS
  Phase 37C verifier -- Product Modularity (SKUs, capability registry, adapters, module toggles)

.DESCRIPTION
  Validates:
    1. Config files exist (modules.json, skus.json, capabilities.json)
    2. Module registry service exists and has correct exports
    3. Capability service exists and has correct exports
    4. Adapter layer: all 5 adapter types have interface + vista + stub
    5. Adapter loader exists with initAdapters + getAdapter exports
    6. Module guard middleware exists
    7. Module-capability routes exist
    8. index.ts wires all Phase 37C components
    9. Architecture doc exists
    10. Security.ts has /api/* auth rules
    11. JSON manifests parse and have valid structure
    12. SKU profiles reference only known modules
    13. Capabilities reference only known modules + adapters
    14. No console.log in new files (structured logger only)
#>

param(
  [switch]$SkipDocker
)

$ErrorActionPreference = "Continue"
$root = Split-Path $PSScriptRoot -Parent

$pass = 0; $fail = 0; $warn = 0

function Gate([string]$name, [scriptblock]$test) {
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
    Write-Host "  FAIL  $name -- $($_.Exception.Message)" -ForegroundColor Red
    $script:fail++
  }
}

function Warn([string]$name, [string]$msg) {
  Write-Host "  WARN  $name -- $msg" -ForegroundColor Yellow
  $script:warn++
}

Write-Host "`n=== Phase 37C: Product Modularity Verification ===" -ForegroundColor Cyan
Write-Host ""

# ----------------------------------------------------------------
# Section 1: Config manifests
# ----------------------------------------------------------------
Write-Host "--- Config Manifests ---" -ForegroundColor White

Gate "config/modules.json exists" {
  Test-Path -LiteralPath "$root\config\modules.json"
}

Gate "config/skus.json exists" {
  Test-Path -LiteralPath "$root\config\skus.json"
}

Gate "config/capabilities.json exists" {
  Test-Path -LiteralPath "$root\config\capabilities.json"
}

Gate "modules.json parses as valid JSON" {
  $null = Get-Content "$root\config\modules.json" -Raw | ConvertFrom-Json
  $true
}

Gate "skus.json parses as valid JSON" {
  $null = Get-Content "$root\config\skus.json" -Raw | ConvertFrom-Json
  $true
}

Gate "capabilities.json parses as valid JSON" {
  $null = Get-Content "$root\config\capabilities.json" -Raw | ConvertFrom-Json
  $true
}

# Structural checks
Gate "modules.json has 12 modules" {
  $m = Get-Content "$root\config\modules.json" -Raw | ConvertFrom-Json
  $count = ($m.modules | Get-Member -MemberType NoteProperty).Count
  $count -ge 12
}

Gate "skus.json has 7 SKU profiles" {
  $s = Get-Content "$root\config\skus.json" -Raw | ConvertFrom-Json
  $count = ($s.skus | Get-Member -MemberType NoteProperty).Count
  $count -ge 7
}

Gate "capabilities.json has 50+ capabilities" {
  $c = Get-Content "$root\config\capabilities.json" -Raw | ConvertFrom-Json
  $count = ($c.capabilities | Get-Member -MemberType NoteProperty).Count
  $count -ge 50
}

Gate "kernel module has alwaysEnabled=true" {
  $m = Get-Content "$root\config\modules.json" -Raw | ConvertFrom-Json
  $m.modules.kernel.alwaysEnabled -eq $true
}

# Cross-referential checks
Gate "SKU profiles reference only known modules" {
  $m = Get-Content "$root\config\modules.json" -Raw | ConvertFrom-Json
  $s = Get-Content "$root\config\skus.json" -Raw | ConvertFrom-Json
  $knownModules = ($m.modules | Get-Member -MemberType NoteProperty).Name
  $valid = $true
  foreach ($skuName in ($s.skus | Get-Member -MemberType NoteProperty).Name) {
    foreach ($mod in $s.skus.$skuName.modules) {
      if ($mod -notin $knownModules) {
        Write-Host "    SKU '$skuName' references unknown module '$mod'" -ForegroundColor Red
        $valid = $false
      }
    }
  }
  $valid
}

Gate "Capabilities reference only known modules" {
  $m = Get-Content "$root\config\modules.json" -Raw | ConvertFrom-Json
  $c = Get-Content "$root\config\capabilities.json" -Raw | ConvertFrom-Json
  $knownModules = ($m.modules | Get-Member -MemberType NoteProperty).Name
  $valid = $true
  foreach ($capName in ($c.capabilities | Get-Member -MemberType NoteProperty).Name) {
    $cap = $c.capabilities.$capName
    if ($cap.module -notin $knownModules) {
      Write-Host "    Capability '$capName' references unknown module '$($cap.module)'" -ForegroundColor Red
      $valid = $false
    }
  }
  $valid
}

# ----------------------------------------------------------------
# Section 2: Module registry service
# ----------------------------------------------------------------
Write-Host "`n--- Module Registry ---" -ForegroundColor White

Gate "module-registry.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\modules\module-registry.ts"
}

Gate "module-registry exports initModuleRegistry" {
  (Get-Content "$root\apps\api\src\modules\module-registry.ts" -Raw) -match "export function initModuleRegistry"
}

Gate "module-registry exports isModuleEnabled" {
  (Get-Content "$root\apps\api\src\modules\module-registry.ts" -Raw) -match "export function isModuleEnabled"
}

Gate "module-registry exports isRouteAllowed" {
  (Get-Content "$root\apps\api\src\modules\module-registry.ts" -Raw) -match "export function isRouteAllowed"
}

Gate "module-registry exports getModuleStatus" {
  (Get-Content "$root\apps\api\src\modules\module-registry.ts" -Raw) -match "export function getModuleStatus"
}

# ----------------------------------------------------------------
# Section 3: Capability service
# ----------------------------------------------------------------
Write-Host "`n--- Capability Service ---" -ForegroundColor White

Gate "capability-service.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\modules\capability-service.ts"
}

Gate "capability-service exports initCapabilityService" {
  (Get-Content "$root\apps\api\src\modules\capability-service.ts" -Raw) -match "export function initCapabilityService"
}

Gate "capability-service exports resolveCapabilities" {
  (Get-Content "$root\apps\api\src\modules\capability-service.ts" -Raw) -match "export function resolveCapabilities"
}

Gate "capability-service exports isCapabilityAvailable" {
  (Get-Content "$root\apps\api\src\modules\capability-service.ts" -Raw) -match "export function isCapabilityAvailable"
}

# ----------------------------------------------------------------
# Section 4: Adapter layer
# ----------------------------------------------------------------
Write-Host "`n--- Adapter Layer ---" -ForegroundColor White

$adapterTypes = @("clinical-engine", "scheduling", "billing", "imaging", "messaging")
foreach ($type in $adapterTypes) {
  Gate "adapters/$type/interface.ts exists" {
    Test-Path -LiteralPath "$root\apps\api\src\adapters\$type\interface.ts"
  }
  Gate "adapters/$type/vista-adapter.ts exists" {
    Test-Path -LiteralPath "$root\apps\api\src\adapters\$type\vista-adapter.ts"
  }
  Gate "adapters/$type/stub-adapter.ts exists" {
    Test-Path -LiteralPath "$root\apps\api\src\adapters\$type\stub-adapter.ts"
  }
}

Gate "adapters/types.ts (base types) exists" {
  Test-Path -LiteralPath "$root\apps\api\src\adapters\types.ts"
}

Gate "adapter-loader.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\adapters\adapter-loader.ts"
}

Gate "adapter-loader exports initAdapters" {
  (Get-Content "$root\apps\api\src\adapters\adapter-loader.ts" -Raw) -match "export async function initAdapters"
}

Gate "adapter-loader exports getAdapter" {
  (Get-Content "$root\apps\api\src\adapters\adapter-loader.ts" -Raw) -match "export function getAdapter"
}

Gate "adapter-loader exports getAdapterHealth" {
  (Get-Content "$root\apps\api\src\adapters\adapter-loader.ts" -Raw) -match "export async function getAdapterHealth"
}

# ----------------------------------------------------------------
# Section 5: Module guard middleware
# ----------------------------------------------------------------
Write-Host "`n--- Module Guard ---" -ForegroundColor White

Gate "module-guard.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\middleware\module-guard.ts"
}

Gate "module-guard exports moduleGuardHook" {
  (Get-Content "$root\apps\api\src\middleware\module-guard.ts" -Raw) -match "export async function moduleGuardHook"
}

# ----------------------------------------------------------------
# Section 6: API routes
# ----------------------------------------------------------------
Write-Host "`n--- API Routes ---" -ForegroundColor White

Gate "module-capability-routes.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\routes\module-capability-routes.ts"
}

Gate "Routes: GET /api/capabilities" {
  (Get-Content "$root\apps\api\src\routes\module-capability-routes.ts" -Raw) -match '"/api/capabilities"'
}

Gate "Routes: GET /api/modules/status" {
  (Get-Content "$root\apps\api\src\routes\module-capability-routes.ts" -Raw) -match '"/api/modules/status"'
}

Gate "Routes: GET /api/adapters/health" {
  (Get-Content "$root\apps\api\src\routes\module-capability-routes.ts" -Raw) -match '"/api/adapters/health"'
}

Gate "Routes: POST /api/modules/override" {
  (Get-Content "$root\apps\api\src\routes\module-capability-routes.ts" -Raw) -match '"/api/modules/override"'
}

# ----------------------------------------------------------------
# Section 7: index.ts integration
# ----------------------------------------------------------------
Write-Host "`n--- index.ts Integration ---" -ForegroundColor White

$indexContent = Get-Content "$root\apps\api\src\index.ts" -Raw

Gate "index.ts imports initModuleRegistry" {
  $indexContent -match "initModuleRegistry"
}

Gate "index.ts imports initCapabilityService" {
  $indexContent -match "initCapabilityService"
}

Gate "index.ts imports initAdapters" {
  $indexContent -match "initAdapters"
}

Gate "index.ts imports moduleGuardHook" {
  $indexContent -match "moduleGuardHook"
}

Gate "index.ts registers moduleCapabilityRoutes" {
  $indexContent -match "moduleCapabilityRoutes"
}

Gate "index.ts calls initModuleRegistry()" {
  $indexContent -match "initModuleRegistry\(\)"
}

Gate "index.ts calls initCapabilityService()" {
  $indexContent -match "initCapabilityService\(\)"
}

Gate "index.ts calls await initAdapters()" {
  $indexContent -match "await initAdapters\(\)"
}

Gate "index.ts adds moduleGuardHook to onRequest" {
  $indexContent -match 'addHook\("onRequest", moduleGuardHook\)'
}

# ----------------------------------------------------------------
# Section 8: Security rules
# ----------------------------------------------------------------
Write-Host "`n--- Security Rules ---" -ForegroundColor White

$secContent = Get-Content "$root\apps\api\src\middleware\security.ts" -Raw

Gate "security.ts has /api/capabilities auth rule" {
  $secContent -match "api.*capabilities"
}

Gate "security.ts has /api/modules auth rule" {
  $secContent -match "api.*modules"
}

Gate "security.ts has /api/adapters auth rule" {
  $secContent -match "api.*adapters"
}

# ----------------------------------------------------------------
# Section 9: Architecture doc
# ----------------------------------------------------------------
Write-Host "`n--- Documentation ---" -ForegroundColor White

Gate "Architecture doc exists" {
  Test-Path -LiteralPath "$root\docs\architecture\product-modularity-v1.md"
}

Gate "Prompt file exists" {
  Test-Path -LiteralPath "$root\prompts\41-PHASE-37C-PRODUCT-MODULARITY\IMPLEMENT.md"
}

# ----------------------------------------------------------------
# Section 10: Code quality
# ----------------------------------------------------------------
Write-Host "`n--- Code Quality ---" -ForegroundColor White

$newFiles = @(
  "apps\api\src\modules\module-registry.ts",
  "apps\api\src\modules\capability-service.ts",
  "apps\api\src\adapters\adapter-loader.ts",
  "apps\api\src\adapters\types.ts",
  "apps\api\src\middleware\module-guard.ts",
  "apps\api\src\routes\module-capability-routes.ts"
)

$consoleLogCount = 0
foreach ($f in $newFiles) {
  $fp = "$root\$f"
  if (Test-Path -LiteralPath $fp) {
    $hits = Select-String -LiteralPath $fp -Pattern "console\.(log|warn|error)" -AllMatches
    if ($hits) { $consoleLogCount += $hits.Count }
  }
}

Gate "No console.log in new Phase 37C files" {
  $consoleLogCount -eq 0
}

Gate "All adapter stubs have _isStub = true" {
  $valid = $true
  foreach ($type in $adapterTypes) {
    $stubFile = "$root\apps\api\src\adapters\$type\stub-adapter.ts"
    if (Test-Path -LiteralPath $stubFile) {
      $content = Get-Content $stubFile -Raw
      if ($content -notmatch "_isStub\s*=\s*true") {
        Write-Host "    $type/stub-adapter.ts missing _isStub = true" -ForegroundColor Red
        $valid = $false
      }
    }
  }
  $valid
}

Gate "All VistA adapters have _isStub = false" {
  $valid = $true
  foreach ($type in $adapterTypes) {
    $vistaFile = "$root\apps\api\src\adapters\$type\vista-adapter.ts"
    if (Test-Path -LiteralPath $vistaFile) {
      $content = Get-Content $vistaFile -Raw
      if ($content -notmatch "_isStub\s*=\s*false") {
        Write-Host "    $type/vista-adapter.ts missing _isStub = false" -ForegroundColor Red
        $valid = $false
      }
    }
  }
  $valid
}

# ----------------------------------------------------------------
# Summary
# ----------------------------------------------------------------
Write-Host "`n=== Phase 37C Verification Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
Write-Host "  FAIL: $fail" -ForegroundColor $(if ($fail -gt 0) { "Red" } else { "Green" })
Write-Host "  WARN: $warn" -ForegroundColor $(if ($warn -gt 0) { "Yellow" } else { "Green" })
Write-Host ""

if ($fail -gt 0) {
  Write-Host "Phase 37C INCOMPLETE -- $fail gate(s) failed." -ForegroundColor Red
  exit 1
} else {
  Write-Host "Phase 37C VERIFIED -- all gates passed." -ForegroundColor Green
  exit 0
}
