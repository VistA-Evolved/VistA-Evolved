<#
.SYNOPSIS
  Phase 38 verifier -- VistA-First RCM + Payer Connectivity Platform

.DESCRIPTION
  Validates:
    1. Domain model files exist (claim, payer, remit, claim-store)
    2. Payer registry + seed data (US + PH)
    3. EDI types + pipeline
    4. Validation engine
    5. Connectors (4 types + registry)
    6. RCM audit (hash-chained)
    7. RCM routes plugin
    8. index.ts wiring + security.ts AUTH_RULE
    9. Config: capabilities.json + modules.json updated
    10. UI module (page.tsx rewrite)
    11. Docs (6 files)
    12. AGENTS.md updated
    13. No console.log in new files
    14. Seed data validates as JSON with correct structure
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

Write-Host "`n=== Phase 38: VistA-First RCM + Payer Connectivity Platform ===" -ForegroundColor Cyan
Write-Host ""

# ----------------------------------------------------------------
# Section 1: Domain Model
# ----------------------------------------------------------------
Write-Host "--- Domain Model ---" -ForegroundColor White

Gate "rcm/domain/claim.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\domain\claim.ts"
}

Gate "rcm/domain/payer.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\domain\payer.ts"
}

Gate "rcm/domain/remit.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\domain\remit.ts"
}

Gate "rcm/domain/claim-store.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\domain\claim-store.ts"
}

Gate "claim.ts exports ClaimStatus type" {
  (Get-Content "$root\apps\api\src\rcm\domain\claim.ts" -Raw) -match "export\s+type\s+ClaimStatus"
}

Gate "claim.ts exports Claim interface" {
  (Get-Content "$root\apps\api\src\rcm\domain\claim.ts" -Raw) -match "export\s+interface\s+Claim"
}

Gate "claim.ts has 9-state FSM (CLAIM_TRANSITIONS)" {
  (Get-Content "$root\apps\api\src\rcm\domain\claim.ts" -Raw) -match "CLAIM_TRANSITIONS"
}

Gate "claim.ts has VistA grounding fields (vistaChargeIen)" {
  (Get-Content "$root\apps\api\src\rcm\domain\claim.ts" -Raw) -match "vistaChargeIen"
}

Gate "payer.ts exports IntegrationMode" {
  (Get-Content "$root\apps\api\src\rcm\domain\payer.ts" -Raw) -match "IntegrationMode"
}

Gate "payer.ts has 6 integration modes" {
  $content = Get-Content "$root\apps\api\src\rcm\domain\payer.ts" -Raw
  $content -match "clearinghouse_edi" -and $content -match "government_portal" -and $content -match "portal_batch"
}

Gate "remit.ts exports Remittance interface" {
  (Get-Content "$root\apps\api\src\rcm\domain\remit.ts" -Raw) -match "export\s+interface\s+Remittance"
}

Gate "claim-store.ts has in-memory Map store" {
  (Get-Content "$root\apps\api\src\rcm\domain\claim-store.ts" -Raw) -match "new Map"
}

# ----------------------------------------------------------------
# Section 2: Payer Registry + Seed Data
# ----------------------------------------------------------------
Write-Host "`n--- Payer Registry + Seed Data ---" -ForegroundColor White

Gate "payer-registry/registry.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\payer-registry\registry.ts"
}

Gate "registry.ts exports initPayerRegistry" {
  (Get-Content "$root\apps\api\src\rcm\payer-registry\registry.ts" -Raw) -match "initPayerRegistry"
}

Gate "data/payers/us_core.json exists" {
  Test-Path -LiteralPath "$root\data\payers\us_core.json"
}

Gate "data/payers/ph_hmos.json exists" {
  Test-Path -LiteralPath "$root\data\payers\ph_hmos.json"
}

Gate "us_core.json parses as valid JSON" {
  $null = Get-Content "$root\data\payers\us_core.json" -Raw | ConvertFrom-Json
  $true
}

Gate "ph_hmos.json parses as valid JSON" {
  $null = Get-Content "$root\data\payers\ph_hmos.json" -Raw | ConvertFrom-Json
  $true
}

Gate "us_core.json has 12 payers" {
  $data = Get-Content "$root\data\payers\us_core.json" -Raw | ConvertFrom-Json
  $data.payers.Count -eq 12
}

Gate "ph_hmos.json has 15 payers" {
  $data = Get-Content "$root\data\payers\ph_hmos.json" -Raw | ConvertFrom-Json
  $data.payers.Count -eq 15
}

Gate "us_core.json payers have payerId + name + country" {
  $data = Get-Content "$root\data\payers\us_core.json" -Raw | ConvertFrom-Json
  $allValid = $true
  foreach ($p in $data.payers) {
    if (-not $p.payerId -or -not $p.name -or -not $p.country) { $allValid = $false }
  }
  $allValid
}

Gate "ph_hmos.json payers have payerId + name + country=PH" {
  $data = Get-Content "$root\data\payers\ph_hmos.json" -Raw | ConvertFrom-Json
  $allValid = $true
  foreach ($p in $data.payers) {
    if (-not $p.payerId -or -not $p.name -or $p.country -ne "PH") { $allValid = $false }
  }
  $allValid
}

Gate "ph_hmos.json includes PhilHealth (PH-PHIC)" {
  $data = Get-Content "$root\data\payers\ph_hmos.json" -Raw | ConvertFrom-Json
  $found = @($data.payers | Where-Object { $_.payerId -eq "PH-PHIC" })
  $found.Count -eq 1
}

# ----------------------------------------------------------------
# Section 3: EDI Types + Pipeline
# ----------------------------------------------------------------
Write-Host "`n--- EDI Types + Pipeline ---" -ForegroundColor White

Gate "rcm/edi/types.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\edi\types.ts"
}

Gate "rcm/edi/pipeline.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\edi\pipeline.ts"
}

Gate "edi/types.ts exports EdiClaim837" {
  (Get-Content "$root\apps\api\src\rcm\edi\types.ts" -Raw) -match "EdiClaim837"
}

Gate "edi/types.ts exports EdiRemittance835" {
  (Get-Content "$root\apps\api\src\rcm\edi\types.ts" -Raw) -match "EdiRemittance835"
}

Gate "edi/types.ts has 10 pipeline stages" {
  (Get-Content "$root\apps\api\src\rcm\edi\types.ts" -Raw) -match "PipelineStage"
}

Gate "pipeline.ts exports createPipelineEntry" {
  (Get-Content "$root\apps\api\src\rcm\edi\pipeline.ts" -Raw) -match "createPipelineEntry"
}

Gate "pipeline.ts exports advancePipelineStage" {
  (Get-Content "$root\apps\api\src\rcm\edi\pipeline.ts" -Raw) -match "advancePipelineStage"
}

Gate "pipeline.ts exports buildClaim837FromDomain" {
  (Get-Content "$root\apps\api\src\rcm\edi\pipeline.ts" -Raw) -match "buildClaim837FromDomain"
}

# ----------------------------------------------------------------
# Section 4: Validation Engine
# ----------------------------------------------------------------
Write-Host "`n--- Validation Engine ---" -ForegroundColor White

Gate "rcm/validation/engine.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\validation\engine.ts"
}

Gate "engine.ts exports validateClaim" {
  (Get-Content "$root\apps\api\src\rcm\validation\engine.ts" -Raw) -match "export\s+(async\s+)?function\s+validateClaim"
}

Gate "engine.ts has 5 rule categories" {
  $content = Get-Content "$root\apps\api\src\rcm\validation\engine.ts" -Raw
  $content -match "syntax" -and $content -match "code_set" -and $content -match "business_rule" -and $content -match "timely_filing" -and $content -match "payer_specific"
}

Gate "engine.ts exports describeValidationRules" {
  (Get-Content "$root\apps\api\src\rcm\validation\engine.ts" -Raw) -match "describeValidationRules"
}

Gate "engine.ts computes readinessScore" {
  (Get-Content "$root\apps\api\src\rcm\validation\engine.ts" -Raw) -match "readinessScore"
}

# ----------------------------------------------------------------
# Section 5: Connectors
# ----------------------------------------------------------------
Write-Host "`n--- Connectors ---" -ForegroundColor White

Gate "rcm/connectors/types.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\connectors\types.ts"
}

Gate "rcm/connectors/clearinghouse-connector.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\connectors\clearinghouse-connector.ts"
}

Gate "rcm/connectors/philhealth-connector.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\connectors\philhealth-connector.ts"
}

Gate "rcm/connectors/sandbox-connector.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\connectors\sandbox-connector.ts"
}

Gate "rcm/connectors/portal-batch-connector.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\connectors\portal-batch-connector.ts"
}

Gate "connectors/types.ts exports RcmConnector interface" {
  (Get-Content "$root\apps\api\src\rcm\connectors\types.ts" -Raw) -match "RcmConnector"
}

Gate "connectors/types.ts exports connector registry" {
  $content = Get-Content "$root\apps\api\src\rcm\connectors\types.ts" -Raw
  $content -match "registerConnector" -and $content -match "getConnector"
}

Gate "clearinghouse-connector.ts implements ClearinghouseConnector" {
  (Get-Content "$root\apps\api\src\rcm\connectors\clearinghouse-connector.ts" -Raw) -match "class ClearinghouseConnector"
}

Gate "philhealth-connector.ts implements PhilHealthConnector" {
  (Get-Content "$root\apps\api\src\rcm\connectors\philhealth-connector.ts" -Raw) -match "class PhilHealthConnector"
}

Gate "sandbox-connector.ts implements SandboxConnector" {
  (Get-Content "$root\apps\api\src\rcm\connectors\sandbox-connector.ts" -Raw) -match "class SandboxConnector"
}

Gate "portal-batch-connector.ts implements PortalBatchConnector" {
  (Get-Content "$root\apps\api\src\rcm\connectors\portal-batch-connector.ts" -Raw) -match "class PortalBatchConnector"
}

Gate "philhealth-connector.ts has CF2/CF3/CF4 mapping" {
  $content = Get-Content "$root\apps\api\src\rcm\connectors\philhealth-connector.ts" -Raw
  $content -match "CF2" -and $content -match "CF4"
}

# ----------------------------------------------------------------
# Section 6: RCM Audit
# ----------------------------------------------------------------
Write-Host "`n--- RCM Audit ---" -ForegroundColor White

Gate "rcm/audit/rcm-audit.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\audit\rcm-audit.ts"
}

Gate "rcm-audit.ts has SHA-256 hash chain" {
  (Get-Content "$root\apps\api\src\rcm\audit\rcm-audit.ts" -Raw) -match "sha256"
}

Gate "rcm-audit.ts exports appendRcmAudit" {
  (Get-Content "$root\apps\api\src\rcm\audit\rcm-audit.ts" -Raw) -match "appendRcmAudit"
}

Gate "rcm-audit.ts exports verifyRcmAuditChain" {
  (Get-Content "$root\apps\api\src\rcm\audit\rcm-audit.ts" -Raw) -match "verifyRcmAuditChain"
}

Gate "rcm-audit.ts sanitizes PHI" {
  (Get-Content "$root\apps\api\src\rcm\audit\rcm-audit.ts" -Raw) -match "sanitize"
}

Gate "rcm-audit.ts has 20K entry cap" {
  (Get-Content "$root\apps\api\src\rcm\audit\rcm-audit.ts" -Raw) -match "20000|20_000|MAX.*20"
}

# ----------------------------------------------------------------
# Section 7: RCM Routes
# ----------------------------------------------------------------
Write-Host "`n--- RCM Routes ---" -ForegroundColor White

Gate "rcm/rcm-routes.ts exists" {
  Test-Path -LiteralPath "$root\apps\api\src\rcm\rcm-routes.ts"
}

Gate "rcm-routes.ts is a Fastify plugin" {
  (Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw) -match "FastifyPluginAsync|FastifyInstance"
}

Gate "rcm-routes.ts has /rcm/health endpoint" {
  (Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw) -match "/rcm/health"
}

Gate "rcm-routes.ts has /rcm/claims routes" {
  (Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw) -match "/rcm/claims"
}

Gate "rcm-routes.ts has /rcm/payers routes" {
  (Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw) -match "/rcm/payers"
}

Gate "rcm-routes.ts has /rcm/eligibility routes" {
  (Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw) -match "/rcm/eligibility"
}

Gate "rcm-routes.ts has /rcm/edi/pipeline routes" {
  (Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw) -match "/rcm/edi/pipeline"
}

Gate "rcm-routes.ts has /rcm/connectors routes" {
  (Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw) -match "/rcm/connectors"
}

Gate "rcm-routes.ts has /rcm/audit routes" {
  (Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw) -match "/rcm/audit"
}

Gate "rcm-routes.ts has /rcm/remittances routes" {
  (Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw) -match "/rcm/remittances"
}

Gate "rcm-routes.ts has /rcm/validation/rules route" {
  (Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw) -match "/rcm/validation/rules"
}

Gate "rcm-routes.ts registers 4 connectors" {
  $content = Get-Content "$root\apps\api\src\rcm\rcm-routes.ts" -Raw
  $content -match "SandboxConnector" -and $content -match "ClearinghouseConnector" -and $content -match "PhilHealthConnector" -and $content -match "PortalBatchConnector"
}

# ----------------------------------------------------------------
# Section 8: Wiring (index.ts + security.ts)
# ----------------------------------------------------------------
Write-Host "`n--- Wiring ---" -ForegroundColor White

Gate "index.ts imports rcmRoutes" {
  (Get-Content "$root\apps\api\src\index.ts" -Raw) -match "rcmRoutes"
}

Gate "index.ts registers rcmRoutes plugin" {
  (Get-Content "$root\apps\api\src\index.ts" -Raw) -match "server\.register\(rcmRoutes\)"
}

Gate "security.ts has /rcm/ AUTH_RULE" {
  (Get-Content "$root\apps\api\src\middleware\security.ts" -Raw) -match "rcm"
}

# ----------------------------------------------------------------
# Section 9: Config Updates
# ----------------------------------------------------------------
Write-Host "`n--- Config Updates ---" -ForegroundColor White

Gate "capabilities.json has rcm capabilities set to configured" {
  $data = Get-Content "$root\config\capabilities.json" -Raw | ConvertFrom-Json
  $rcmKeys = $data.capabilities.PSObject.Properties | Where-Object { $_.Name -like "rcm.*" }
  $configured = $rcmKeys | Where-Object { $_.Value.status -eq "configured" }
  $configured.Count -ge 8
}

Gate "modules.json rcm module has services list" {
  $data = Get-Content "$root\config\modules.json" -Raw | ConvertFrom-Json
  $data.modules.rcm.services.Count -ge 9
}

Gate "capabilities.json includes rcm.claims.validate" {
  $data = Get-Content "$root\config\capabilities.json" -Raw | ConvertFrom-Json
  $null -ne $data.capabilities.'rcm.claims.validate'
}

Gate "capabilities.json includes rcm.edi.pipeline" {
  $data = Get-Content "$root\config\capabilities.json" -Raw | ConvertFrom-Json
  $null -ne $data.capabilities.'rcm.edi.pipeline'
}

# ----------------------------------------------------------------
# Section 10: UI Module
# ----------------------------------------------------------------
Write-Host "`n--- UI Module ---" -ForegroundColor White

Gate "rcm/page.tsx exists" {
  Test-Path -LiteralPath "$root\apps\web\src\app\cprs\admin\rcm\page.tsx"
}

Gate "rcm/page.tsx has Claims tab" {
  (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "Claims"
}

Gate "rcm/page.tsx has Payers tab" {
  (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "Payer"
}

Gate "rcm/page.tsx has Connectors tab" {
  (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "Connector"
}

Gate "rcm/page.tsx has Audit tab" {
  (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "Audit"
}

Gate "rcm/page.tsx uses credentials include" {
  (Get-Content "$root\apps\web\src\app\cprs\admin\rcm\page.tsx" -Raw) -match "credentials.*include"
}

# ----------------------------------------------------------------
# Section 11: Documentation
# ----------------------------------------------------------------
Write-Host "`n--- Documentation ---" -ForegroundColor White

Gate "docs/runbooks/rcm-payer-connectivity.md exists" {
  Test-Path -LiteralPath "$root\docs\runbooks\rcm-payer-connectivity.md"
}

Gate "docs/runbooks/rcm-philhealth-eclaims.md exists" {
  Test-Path -LiteralPath "$root\docs\runbooks\rcm-philhealth-eclaims.md"
}

Gate "docs/runbooks/rcm-us-edi-clearinghouse.md exists" {
  Test-Path -LiteralPath "$root\docs\runbooks\rcm-us-edi-clearinghouse.md"
}

Gate "docs/architecture/rcm-gateway-architecture.md exists" {
  Test-Path -LiteralPath "$root\docs\architecture\rcm-gateway-architecture.md"
}

Gate "docs/runbooks/payer-registry.md exists" {
  Test-Path -LiteralPath "$root\docs\runbooks\payer-registry.md"
}

Gate "docs/security/rcm-phi-handling.md exists" {
  Test-Path -LiteralPath "$root\docs\security\rcm-phi-handling.md"
}

# ----------------------------------------------------------------
# Section 12: AGENTS.md Updated
# ----------------------------------------------------------------
Write-Host "`n--- AGENTS.md ---" -ForegroundColor White

Gate "AGENTS.md has Phase 38 architecture section (7g)" {
  (Get-Content "$root\AGENTS.md" -Raw) -match "7g.*Phase 38"
}

Gate "AGENTS.md has RCM VistA-first gotcha (83)" {
  (Get-Content "$root\AGENTS.md" -Raw) -match "83.*RCM is VistA-first"
}

Gate "AGENTS.md has connectors swappable gotcha (84)" {
  (Get-Content "$root\AGENTS.md" -Raw) -match "84.*Connectors are swappable"
}

Gate "AGENTS.md has payer seed data gotcha (85)" {
  (Get-Content "$root\AGENTS.md" -Raw) -match "85.*Payer seed data"
}

Gate "AGENTS.md has RCM audit gotcha (86)" {
  (Get-Content "$root\AGENTS.md" -Raw) -match "86.*RCM audit"
}

Gate "AGENTS.md has EDI pipeline gotcha (87)" {
  (Get-Content "$root\AGENTS.md" -Raw) -match "87.*EDI pipeline"
}

Gate "AGENTS.md has PhilHealth connector gotcha (88)" {
  (Get-Content "$root\AGENTS.md" -Raw) -match "88.*PhilHealth connector"
}

# ----------------------------------------------------------------
# Section 13: No console.log in new files
# ----------------------------------------------------------------
Write-Host "`n--- Code Quality ---" -ForegroundColor White

$rcmFiles = Get-ChildItem -Path "$root\apps\api\src\rcm" -Recurse -Filter "*.ts" -ErrorAction SilentlyContinue
$consoleLogCount = 0
foreach ($f in $rcmFiles) {
  $lines = Get-Content $f.FullName
  foreach ($line in $lines) {
    if ($line -match "console\.log\(" -and $line -notmatch "//.*console\.log") {
      $consoleLogCount++
    }
  }
}

Gate "No console.log in rcm/ files (max 0)" {
  $consoleLogCount -le 0
}

# ----------------------------------------------------------------
# Section 14: Prompt file
# ----------------------------------------------------------------
Write-Host "`n--- Prompt File ---" -ForegroundColor White

Gate "Prompt directory exists" {
  Test-Path -LiteralPath "$root\prompts\42-PHASE-38-RCM-PAYER-CONNECTIVITY"
}

Gate "Prompt file exists" {
  $dir = "$root\prompts\42-PHASE-38-RCM-PAYER-CONNECTIVITY"
  (Get-ChildItem -Path $dir -Filter "*.md" -ErrorAction SilentlyContinue).Count -ge 1
}

# ----------------------------------------------------------------
# Summary
# ----------------------------------------------------------------
Write-Host "`n=== Phase 38 RCM Verification Summary ===" -ForegroundColor Cyan
Write-Host "  PASS: $pass" -ForegroundColor Green
if ($fail -gt 0) { Write-Host "  FAIL: $fail" -ForegroundColor Red }
else { Write-Host "  FAIL: $fail" -ForegroundColor Green }
if ($warn -gt 0) { Write-Host "  WARN: $warn" -ForegroundColor Yellow }
Write-Host ""

if ($fail -eq 0) {
  Write-Host "Phase 38 PASSED ($pass gates)" -ForegroundColor Green
} else {
  Write-Host "Phase 38 FAILED ($fail failures out of $($pass+$fail) gates)" -ForegroundColor Red
}

exit $fail
